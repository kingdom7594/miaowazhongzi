/**
 * 部署在统一网关(edge)的子路径下时,Next 的 basePath 由构建期环境变量注入。
 * next/link、next/navigation 会自动带上 basePath,但 fetch() 与后端生成的
 * 绝对链接不会,因此统一用 withBasePath() 包一层,保证路径模式(/miaowazhongzi/)
 * 下单次登录后 API 与静态资源请求都落在被代理的前缀内。
 *
 * 本地开发/CI 未设置该变量时为空串,行为与未部署前缀时一致。
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return path;
  return `${BASE_PATH}${path}`;
}
