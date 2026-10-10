import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { z } from 'zod';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { SkillRunnerConfig } from '../config.js';
import type { ImageProvider } from '../providers/types.js';
import { dateSlug } from '../render/files.js';

export const shimBodySchema = z.object({
  prompt: z.string().min(1),
  model: z.string().optional(),
  n: z.number().int().min(1).max(10).optional(),
  size: z.string().optional(),
  aspectRatio: z.string().optional(),
  response_format: z.enum(['url', 'b64_json']).optional(),
});

export type ShimBody = z.infer<typeof shimBodySchema>;

/**
 * OpenAI 兼容同步 shim：把 `/images/generations` 的同步语义 translate 到中转站的异步任务式链路。
 * 让 baoyu-image-gen 的 openai provider（同步 /v1/images/generations）无需改上游即可复用中转站。
 *
 * 支持**渲染会话**路径 `/shim/v1/r/<renderId>/images/generations`：该次 render 的所有出图调用在
 * provider 层累计计数（成本闸）；未带 renderId 的调用为一次性会话（调用后即释放）。
 */
export function registerOpenAIImagesShim(
  app: FastifyInstance,
  provider: ImageProvider,
  config: SkillRunnerConfig,
): void {
  const handle = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = shimBodySchema.parse(request.body ?? {});
    const scoped = (request.params as { renderId?: string }).renderId;
    const renderId = scoped ?? `anon:${randomUUID()}`;
    const ephemeral = !scoped;
    const count = body.n ?? 1;
    const outputDir = join(config.outputRoot, '_shim', dateSlug());
    const data: Array<{ b64_json: string }> = [];
    try {
      for (let index = 0; index < count; index += 1) {
        const image = await provider.generate(
          {
            prompt: body.prompt,
            model: body.model,
            size: body.size,
            aspectRatio: body.aspectRatio,
            filenameHint: 'shim',
            renderId,
          },
          outputDir,
        );
        const bytes = await readFile(image.localPath);
        data.push({ b64_json: bytes.toString('base64') });
      }
      reply.code(200).send({ created: Math.floor(Date.now() / 1000), data });
    } finally {
      if (ephemeral) provider.clearRender?.(renderId);
    }
  };

  app.post('/shim/v1/images/generations', handle);
  app.post('/shim/v1/r/:renderId/images/generations', handle);
}
