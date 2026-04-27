/**
 * 工具库：统一处理 Prompt 的解析与变量提取
 */

/**
 * 从 prompt 文本中提取 {@xxx} 引用列表
 * 
 * @param prompt 包含引用的提示词文本，例如 "{@角色A} 走在 {@场景B}"
 * @returns 提取出的引用关键字数组，例如 ['角色A', '场景B']
 */
export function extractRefKeywords(prompt: string): string[] {
  if (!prompt) return [];
  const refs: string[] = [];
  const regex = /\{@([^{}]+)\}/g;
  let m;
  while ((m = regex.exec(prompt)) !== null) {
    if (!refs.includes(m[1])) {
      refs.push(m[1]);
    }
  }
  return refs;
}
