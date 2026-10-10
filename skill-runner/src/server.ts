import Fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAgentRuntime, type AgentRuntime } from './agent/index.js';
import { createCommandRunner, type CommandRunner } from './command/runner.js';
import { loadConfig, type SkillRunnerConfig } from './config.js';
import { createProvider, GuardedProvider, ProviderError, type ImageProvider } from './providers/index.js';
import { resolveOutputDir, PathSafetyError } from './render/files.js';
import { AgentError } from './skills/agent-skill.js';
import { getHandler, SKILL_HANDLERS } from './skills/registry.js';
import { InputError } from './skills/prompts.js';
import { SKILL_NAMES, type SkillDeps, type SkillName } from './skills/types.js';
import { registerOpenAIImagesShim } from './shim/openai-images.js';

export const renderBodySchema = z.object({
  skill: z.enum(SKILL_NAMES),
  inputs: z.record(z.unknown()).default({}),
  aspect: z.string().optional(),
  output_dir: z.string().optional(),
});

export interface ServerDeps {
  provider: ImageProvider;
  runner: CommandRunner;
  agent: AgentRuntime;
}

export function createDeps(config: SkillRunnerConfig, overrides: Partial<ServerDeps> = {}): SkillDeps {
  const runner = overrides.runner ?? createCommandRunner();
  const rawProvider = overrides.provider ?? createProvider(config);
  return {
    config,
    // 成本闸对直连与 shim/agent 所有路径统一生效（ADR-0006）。
    provider: new GuardedProvider(rawProvider, config.maxImagesPerRender, config.concurrency),
    runner,
    agent: overrides.agent ?? createAgentRuntime(config, runner),
  };
}

export function buildServer(config: SkillRunnerConfig, deps?: Partial<ServerDeps>): FastifyInstance {
  const skillDeps = createDeps(config, deps);
  const app = Fastify({ logger: false });

  app.get('/health', async () => ({
    status: 'ok',
    skills: SKILL_NAMES,
    image: {
      configured: config.image.configured,
      model: config.image.model,
      baseUrl: config.image.baseUrl,
      apiStyle: config.image.apiStyle,
    },
    agent: {
      runtime: config.agent.runtime,
      bin: config.agent.bin,
      model: config.agent.model,
      skillsDir: config.agent.skillsDir,
      timeoutMs: config.agent.timeoutMs,
    },
    outputRoot: config.outputRoot,
    limits: {
      maxImagesPerRender: config.maxImagesPerRender,
      concurrency: config.concurrency,
      retentionDays: config.retentionDays,
    },
  }));

  app.post('/render', async (request, reply) => {
    const body = renderBodySchema.parse(request.body ?? {});
    const handler = getHandler(body.skill);
    if (!handler) {
      return reply.code(404).send({ error: `unknown skill: ${body.skill}` });
    }
    const outputDir = resolveOutputDir(body.output_dir, config.outputRoot);
    const result = await handler.render({
      skill: body.skill as SkillName,
      inputs: body.inputs,
      aspect: body.aspect,
      outputDir,
      deps: skillDeps,
    });
    return reply.send({ skill: body.skill, files: result.files, meta: result.meta });
  });

  registerOpenAIImagesShim(app, skillDeps.provider, config);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: 'invalid request', issues: error.issues });
    }
    if (error instanceof InputError) {
      return reply.code(400).send({ error: error.message });
    }
    if (error instanceof PathSafetyError) {
      return reply.code(400).send({ error: error.message });
    }
    if (error instanceof ProviderError) {
      return reply.code(502).send({ error: error.message, code: error.code });
    }
    if (error instanceof AgentError) {
      return reply.code(502).send({ error: error.message, code: 'agent_failed' });
    }
    const message = error instanceof Error ? error.message : String(error);
    return reply.code(500).send({ error: message });
  });

  return app;
}

export function buildServerFromEnv(env: NodeJS.ProcessEnv = process.env): FastifyInstance {
  return buildServer(loadConfig(env));
}
