/**
 * 自动检测 Flow URL
 * 
 * 优先级：
 * 1. Chrome CDP 自动探测（检查调试 Chrome 中是否打开了 Flow 页面）
 * 2. 全局系统设置中手动配置的 flowUrl
 * 3. .env 中的 FLOW_URL 环境变量
 * 
 * 如果所有途径均未找到，返回 null。
 */

const CDP_URL = 'http://127.0.0.1:9222';
const FLOW_URL_PATTERN = /tools\/flow/;

/**
 * 从 Chrome DevTools Protocol 端点查询所有打开的标签页，
 * 返回第一个匹配 `tools/flow/project` 的页面 URL。
 */
async function detectFromChromeCDP(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${CDP_URL}/json`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const tabs: { url: string; type: string }[] = await res.json();
    for (const tab of tabs) {
      if (tab.type === 'page' && FLOW_URL_PATTERN.test(tab.url)) {
        // 清理 URL：去掉 tracking 参数，只保留核心路径
        const url = new URL(tab.url);
        // 去掉 Google Ads 跟踪参数
        ['gad_source', 'gad_campaignid', 'gbraid', 'gclid'].forEach(p => url.searchParams.delete(p));
        return url.toString();
      }
    }
    return null;
  } catch {
    // Chrome 没在跑、网络不通等
    return null;
  }
}

/**
 * 从数据库 SystemState 表获取手动配置的 flowUrl。
 * 这里走内部 API 路由，避免直接 import 数据库依赖（保证客户端安全）。
 */
async function detectFromGlobalSettings(baseUrl?: string): Promise<string | null> {
  try {
    // 服务端内部调用，用 localhost
    const origin = baseUrl || `http://127.0.0.1:${process.env.PORT || 3000}`;
    const res = await fetch(`${origin}/api/system-state`);
    const data = await res.json();
    if (data.success && data.data?.flowUrl) {
      return data.data.flowUrl;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 主函数：按优先级尝试所有来源，返回可用的 Flow URL 或 null。
 */
export async function resolveFlowUrl(explicitUrl?: string | null): Promise<string | null> {
  // 0. 如果调用方已经显式传了 flowUrl，直接用
  if (explicitUrl?.trim()) return explicitUrl.trim();

  // 1. 从 Chrome CDP 自动探测
  const cdpUrl = await detectFromChromeCDP();
  if (cdpUrl) return cdpUrl;

  // 2. 从全局设置读取
  const settingsUrl = await detectFromGlobalSettings();
  if (settingsUrl) return settingsUrl;

  // 3. 从环境变量读取
  if (process.env.FLOW_URL?.trim()) return process.env.FLOW_URL.trim();

  return null;
}
