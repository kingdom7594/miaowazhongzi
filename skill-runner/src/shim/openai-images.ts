import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
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
 */
export function registerOpenAIImagesShim(
  app: FastifyInstance,
  provider: ImageProvider,
  config: SkillRunnerConfig,
): void {
  app.post('/shim/v1/images/generations', async (request, reply) => {
    const body = shimBodySchema.parse(request.body ?? {});
    const count = body.n ?? 1;
    const outputDir = join(config.outputRoot, '_shim', dateSlug());
    const data: Array<{ b64_json: string }> = [];
    for (let index = 0; index < count; index += 1) {
      const image = await provider.generate(
        {
          prompt: body.prompt,
          model: body.model,
          size: body.size,
          aspectRatio: body.aspectRatio,
          filenameHint: 'shim',
        },
        outputDir,
      );
      const bytes = await readFile(image.localPath);
      data.push({ b64_json: bytes.toString('base64') });
    }
    reply.code(200).send({ created: Math.floor(Date.now() / 1000), data });
  });
}
