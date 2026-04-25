/**
 * 🍞 全局 Toast 通知系统
 * 
 * 替代 alert() 的统一通知组件。支持 success / error / warning / info 四种级别。
 * 使用方式：
 *   import { toast } from '@/lib/toast';
 *   toast.error('操作失败: ' + e.message);
 *   toast.success('保存成功！');
 *   toast.warning('请先填写提示词');
 * 
 * ⚠️ 纯内存事件驱动，不依赖 React Context，任何地方都能调用（包括 hooks）。
 */

type ToastLevel = 'success' | 'error' | 'warning' | 'info';

interface ToastEvent {
  id: number;
  level: ToastLevel;
  message: string;
}

type ToastListener = (event: ToastEvent) => void;

let _id = 0;
const _listeners: Set<ToastListener> = new Set();

function emit(level: ToastLevel, message: string) {
  const event: ToastEvent = { id: ++_id, level, message };
  _listeners.forEach(fn => fn(event));
}

/** 全局 Toast API — 在任何 .ts/.tsx 文件中直接调用 */
export const toast = {
  success: (msg: string) => emit('success', msg),
  error: (msg: string) => emit('error', msg),
  warning: (msg: string) => emit('warning', msg),
  info: (msg: string) => emit('info', msg),
};

/** 订阅/退订（供 <ToastContainer> 组件使用） */
export function onToast(fn: ToastListener) {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

export type { ToastEvent, ToastLevel };
