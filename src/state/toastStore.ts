import { create } from 'zustand';

import { createId } from '../core/utils/id';
import type { IconName } from '../core/ui/Icon';

export type ToastType = 'info' | 'success' | 'error' | 'invite';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  icon?: IconName;
  /** Optional action button (e.g. "Join" on an invite). */
  action?: { label: string; onPress: () => void };
  /** Auto-dismiss after ms (0 = sticky until tapped). */
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  show: (toast: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (toast) => {
    const id = createId(6);
    const duration = toast.duration ?? (toast.action ? 0 : 3500);
    set({ toasts: [...get().toasts, { ...toast, id, duration }].slice(-4) });
    if (duration > 0) setTimeout(() => get().dismiss(id), duration);
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Imperative helper for non-React call sites. */
export const toast = {
  info: (title: string, message?: string) => useToastStore.getState().show({ type: 'info', title, message }),
  success: (title: string, message?: string) => useToastStore.getState().show({ type: 'success', title, message, icon: 'checkmark-circle' }),
  error: (title: string, message?: string) => useToastStore.getState().show({ type: 'error', title, message, icon: 'alert-circle' }),
};
