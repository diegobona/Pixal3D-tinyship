"use client";

import React from "react";
import { useEffect } from "react";
import { Button } from "@libs/react-shared/ui/button";

interface GlbPreviewDialogProps {
  open: boolean;
  modelUrl: string;
  title: string;
  closeLabel: string;
  downloadLabel: string;
  onClose: () => void;
}

export function GlbPreviewDialog({
  open,
  modelUrl,
  title,
  closeLabel,
  downloadLabel,
  onClose,
}: GlbPreviewDialogProps) {
  useEffect(() => {
    if (!open) return;
    void import("@google/model-viewer");
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020817]/82 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="pixal3d-glb-preview-dialog"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-[#48bdff]/55 bg-[#071431] shadow-[0_28px_120px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-3 border-b border-[#25314f] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-extrabold text-white">{title}</h2>
          <div className="flex items-center gap-3">
            <Button
              asChild
              type="button"
              className="h-10 rounded-full bg-[#48bdff] px-5 text-sm font-extrabold text-[#051021] hover:bg-[#71ccff]"
            >
              <a href={modelUrl} download>
                {downloadLabel}
              </a>
            </Button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#313b59] bg-[#10182d] text-lg font-bold text-[#dbe1f2] transition hover:border-[#48bdff] hover:bg-[#172341] hover:text-white"
              aria-label={closeLabel}
              onClick={onClose}
            >
              <span aria-hidden="true">x</span>
            </button>
          </div>
        </div>
        <div className="h-[68vh] min-h-[460px] bg-[radial-gradient(circle_at_50%_20%,rgba(72,189,255,0.14),transparent_42%),#050b1a]">
          {/*
            model-viewer is a custom element loaded lazily above. It provides
            native camera controls for rotate, pan, and zoom.
          */}
          {/*
            React's JSX type system does not know this custom element, so use
            createElement-compatible props through a narrow cast.
          */}
          <model-viewer
            data-testid="pixal3d-glb-model-viewer"
            src={modelUrl}
            camera-controls
            touch-action="pan-y"
            auto-rotate
            shadow-intensity="0.9"
            exposure="1"
            environment-image="neutral"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
