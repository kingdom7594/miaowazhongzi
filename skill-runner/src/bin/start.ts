import { loadConfig } from '../config.js';
import { buildServer } from '../server.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = buildServer(config);
  try {
    await app.listen({ host: config.host, port: config.port });
    if (!config.image.configured) {
      // 启动不阻塞，但明确告警：render 会显式报错，绝不 mock 兜底。
      console.warn('[skill-runner] IMAGE_API_KEY 未注入；/health 可见，但 /render 会报 not_configured。');
    }
    console.log(`[skill-runner] listening on http://${config.host}:${config.port}`);
  } catch (err) {
    console.error('[skill-runner] failed to start:', err);
    process.exit(1);
  }
}

void main();
