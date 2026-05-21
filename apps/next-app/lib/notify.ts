"use client";

type NotifyOptions = {
  description?: string;
  action?: unknown;
};

const showMessage = (title: string, options?: NotifyOptions) => {
  const description = options?.description ? `\n${options.description}` : "";
  if (typeof window !== "undefined") {
    window.alert(`${title}${description}`);
  }
};

export const notify = {
  error: showMessage,
  success: showMessage,
  info: showMessage,
};
