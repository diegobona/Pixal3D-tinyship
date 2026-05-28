"use client";

export type NotifyOptions = {
  description?: string;
  action?: unknown;
  duration?: number;
};

type NotifyKind = "success" | "error" | "info";

export type NotifyItem = {
  id: string;
  kind: NotifyKind;
  title: string;
  description?: string;
  duration: number;
};

type NotifyListener = (item: NotifyItem) => void;

const listeners = new Set<NotifyListener>();
const pendingItems: NotifyItem[] = [];
const DEFAULT_DURATION = 4200;

const emit = (kind: NotifyKind, title: string, options?: NotifyOptions) => {
  const item: NotifyItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    kind,
    title,
    description: options?.description,
    duration: options?.duration ?? DEFAULT_DURATION,
  };

  if (listeners.size === 0) {
    pendingItems.push(item);
    return;
  }

  listeners.forEach((listener) => listener(item));
};

export const subscribeToNotify = (listener: NotifyListener) => {
  listeners.add(listener);

  if (pendingItems.length > 0) {
    const queuedItems = pendingItems.splice(0, pendingItems.length);
    queuedItems.forEach((item) => listener(item));
  }

  return () => {
    listeners.delete(listener);
  };
};

const showMessage =
  (kind: NotifyKind) =>
  (title: string, options?: NotifyOptions) => {
    emit(kind, title, options);
  };

export const notify = {
  error: showMessage("error"),
  success: showMessage("success"),
  info: showMessage("info"),
};
