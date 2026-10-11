import { fetchImageHealth } from '@/lib/image/client';

export const runtime = 'nodejs';

/**
 * 适配器在线状态(B2/V1 · F-03):服务端代理 skill-runner `GET /health`。
 * 前端据此判断各出图技能是否在线;上游不可达返回 502(不 mock 在线)。
 */
export async function GET() {
  try {
    const health = await fetchImageHealth();
    return Response.json(health);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'skill-runner health failed';
    return Response.json({ error: message }, { status: 502 });
  }
}
