import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolve } from 'node:path';
import {
  DRAFT_RENDER_SKILLS,
  imageContentFromDraft,
  isDraftRenderSkill,
  mergeImagesBySkill,
  renderDraftFiles,
  resolveRenderPath,
  skillNeedsSvg,
  toDraftImages,
  toRenderUrl,
  withImageUrls,
} from './render-draft';

afterEach(() => {
  vi.restoreAllMocks();
});

const draft = {
  titles: ['标题一', '标题二'],
  body: '这是正文',
  tags: ['#AI', '#效率'],
  coverPrompt: 'a cover',
};

describe('imageContentFromDraft', () => {
  it('assembles titles + body + tags + coverPrompt for the agent skill', () => {
    const content = imageContentFromDraft(draft);
    expect(content).toContain('标题备选');
    expect(content).toContain('标题一');
    expect(content).toContain('这是正文');
    expect(content).toContain('#AI #效率');
    expect(content).toContain('a cover');
  });

  it('throws on an empty draft (no mock fallback)', () => {
    expect(() => imageContentFromDraft({ body: '   ' })).toThrow(/无可出图内容/);
  });
});

describe('isDraftRenderSkill', () => {
  it('accepts the five wired skills and rejects others', () => {
    expect(DRAFT_RENDER_SKILLS).toHaveLength(5);
    for (const skill of DRAFT_RENDER_SKILLS) expect(isDraftRenderSkill(skill)).toBe(true);
    expect(isDraftRenderSkill('mondo')).toBe(false);
    expect(isDraftRenderSkill(undefined)).toBe(false);
  });
});

describe('skillNeedsSvg', () => {
  it('only the diagram skill needs an svg input', () => {
    expect(skillNeedsSvg('baoyu-diagram')).toBe(true);
    expect(skillNeedsSvg('baoyu-xhs-images')).toBe(false);
    expect(skillNeedsSvg('baoyu-slide-deck')).toBe(false);
  });
});

describe('toDraftImages / mergeImagesBySkill', () => {
  it('maps skill-runner files into the draft.images contract', () => {
    const images = toDraftImages('baoyu-cover-image', [{ path: '/out/a.png' }], '3:4');
    expect(images).toEqual([{ skill: 'baoyu-cover-image', path: '/out/a.png', aspect: '3:4' }]);
  });

  it('replaces only the same skill, keeping the others', () => {
    const existing = [
      { skill: 'baoyu-cover-image', path: '/out/cover.png' },
      { skill: 'baoyu-xhs-images', path: '/out/card-1.png' },
    ];
    const merged = mergeImagesBySkill(existing, 'baoyu-cover-image', [
      { skill: 'baoyu-cover-image', path: '/out/cover-2.png' },
    ]);
    expect(merged).toEqual([
      { skill: 'baoyu-xhs-images', path: '/out/card-1.png' },
      { skill: 'baoyu-cover-image', path: '/out/cover-2.png' },
    ]);
  });
});

describe('render path → url mapping', () => {
  const root = resolve('/srv/renders');

  it('maps a path under the render root to an app url', () => {
    expect(toRenderUrl('/srv/renders/2026-10-11/abc/a.png', root)).toBe(
      '/api/renders/2026-10-11/abc/a.png',
    );
  });

  it('returns null for a path outside the render root', () => {
    expect(toRenderUrl('/etc/passwd', root)).toBeNull();
    expect(toRenderUrl('/srv/renders/../secret.png', root)).toBeNull();
  });

  it('withImageUrls carries url per image', () => {
    const views = withImageUrls([{ skill: 'baoyu-cover-image', path: '/srv/renders/a.png' }], root);
    expect(views).toEqual([
      { skill: 'baoyu-cover-image', path: '/srv/renders/a.png', url: '/api/renders/a.png' },
    ]);
  });

  it('resolveRenderPath rejects traversal and accepts in-root segments', () => {
    expect(resolveRenderPath(['2026-10-11', 'abc', 'a.png'], root)).toBe(
      resolve('/srv/renders/2026-10-11/abc/a.png'),
    );
    expect(resolveRenderPath(['..', '..', 'etc', 'passwd'], root)).toBeNull();
    expect(resolveRenderPath(['a', '..', '..', 'b'], root)).toBeNull();
    expect(resolveRenderPath([], root)).toBeNull();
  });
});

describe('renderDraftFiles', () => {
  it('posts the render contract with assembled content and returns files', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          skill: 'baoyu-xhs-images',
          files: [{ path: '/srv/renders/a.png', width: 1024, height: 1365 }],
          meta: { runtime: 'opencode' },
        }),
      ),
    );
    const result = await renderDraftFiles({
      draft,
      skill: 'baoyu-xhs-images',
      aspect: '3:4',
      count: 3,
      timeoutMs: 1000,
    });
    expect(result.files).toHaveLength(1);
    const body = JSON.parse((spy.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.skill).toBe('baoyu-xhs-images');
    expect(body.aspect).toBe('3:4');
    expect(body.inputs.count).toBe(3);
    expect(body.inputs.content).toContain('这是正文');
  });

  it('propagates a skill-runner failure (no fallback)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(renderDraftFiles({ draft, skill: 'baoyu-cover-image' })).rejects.toThrow(
      /skill-runner request failed/,
    );
  });

  it('diagram sends svg (not content) via the injected svg builder', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ skill: 'baoyu-diagram', files: [{ path: '/srv/renders/d.svg', width: 1080, height: 810 }], meta: {} }),
      ),
    );
    const buildSvg = vi.fn(async () => '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    await renderDraftFiles({ draft, skill: 'baoyu-diagram', buildSvg, timeoutMs: 1000 });
    const body = JSON.parse((spy.mock.calls[0]![1] as RequestInit).body as string);
    expect(buildSvg).toHaveBeenCalledOnce();
    expect(body.inputs.svg).toContain('<svg');
    expect(body.inputs.content).toBeUndefined();
  });

  it('diagram propagates an svg-builder failure (no mock fallback)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ files: [] })));
    await expect(
      renderDraftFiles({
        draft,
        skill: 'baoyu-diagram',
        buildSvg: async () => {
          throw new Error('LLM 未返回有效 SVG');
        },
      }),
    ).rejects.toThrow(/未返回有效 SVG/);
  });
});
