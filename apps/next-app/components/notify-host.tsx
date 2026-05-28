"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { subscribeToNotify, type NotifyItem } from "@/lib/notify";

const TOAST_STYLES: Record<NotifyItem["kind"], { badge: string; border: string; dot: string }> = {
  success: {
    badge: "Success",
    border: "border-emerald-400/35",
    dot: "bg-emerald-400 shadow-[0_0_22px_rgba(52,211,153,0.6)]",
  },
  error: {
    badge: "Error",
    border: "border-rose-400/35",
    dot: "bg-rose-400 shadow-[0_0_22px_rgba(251,113,133,0.55)]",
  },
  info: {
    badge: "Notice",
    border: "border-sky-400/35",
    dot: "bg-sky-400 shadow-[0_0_22px_rgba(56,189,248,0.55)]",
  },
};

export function NotifyHost() {
  const [items, setItems] = useState<NotifyItem[]>([]);
  const timeoutIdsRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timeoutId = timeoutIdsRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(id);
    }

    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToNotify((item) => {
      setItems((current) => [...current, item].slice(-4));

      const timeoutId = window.setTimeout(() => {
        removeToast(item.id);
      }, item.duration);

      timeoutIdsRef.current.set(item.id, timeoutId);
    });

    return () => {
      unsubscribe();
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current.clear();
    };
  }, [removeToast]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(92vw,420px)] flex-col gap-3"
      aria-live="polite"
      aria-atomic="true"
    >
      {items.map((item) => {
        const style = TOAST_STYLES[item.kind];

        return (
          <div
            key={item.id}
            role={item.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto overflow-hidden rounded-2xl border ${style.border} bg-[linear-gradient(135deg,rgba(9,19,43,0.98),rgba(6,12,27,0.98))] shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur`}
          >
            <div className="flex items-start gap-3 px-4 py-3.5">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                      {style.badge}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">{item.title}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeToast(item.id)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                    aria-label="Dismiss notification"
                  >
                    <span aria-hidden="true">x</span>
                  </button>
                </div>
                {item.description ? (
                  <p className="mt-2 pr-3 text-sm leading-6 text-[#b8c3df]">{item.description}</p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
