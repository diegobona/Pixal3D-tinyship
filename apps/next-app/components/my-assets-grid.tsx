"use client";

import { useMemo, useState } from "react";
import { GlbPreviewDialog } from "@/components/glb-preview-dialog";

type AssetStatus = "processing" | "succeeded" | "failed";

export interface MyAssetItem {
  id: string;
  prompt: string;
  inputImageUrl: string;
  previewImageUrl: string;
  modelUrl?: string;
  status: AssetStatus;
  resolution: number;
  textureSize: number;
  createdAtLabel: string;
}

interface MyAssetsGridProps {
  items: MyAssetItem[];
  labels: {
    createdAt: string;
    targetResolution: string;
    textureSize: string;
    preview3DModel: string;
    previewTitle: string;
    closePreview: string;
    downloadGlb: string;
    status: Record<AssetStatus, string>;
  };
}

function getStatusClasses(status: AssetStatus) {
  if (status === "succeeded") {
    return "border-[#1de9a6]/35 bg-[#0c2f28] text-[#1de9a6]";
  }

  if (status === "failed") {
    return "border-[#ff6b81]/35 bg-[#34161f] text-[#ff9dad]";
  }

  return "border-[#48bdff]/35 bg-[#102848] text-[#7bd7ff]";
}

export function MyAssetsGrid({ items, labels }: MyAssetsGridProps) {
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const previewItem = useMemo(
    () => items.find((item) => item.id === previewingId && item.modelUrl),
    [items, previewingId]
  );

  return (
    <>
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" data-testid="my-assets-grid">
        {items.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-[24px] border border-[#263653] bg-[#0a1530] shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
            data-testid="my-assets-card"
            data-task-id={item.id}
            data-task-status={item.status}
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[#0d1a38]">
              <img
                src={item.previewImageUrl}
                alt={item.prompt || "Pixal3D asset"}
                className="h-full w-full object-cover"
                data-testid="my-assets-preview-image"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07101f] via-[#07101f]/65 to-transparent px-4 pb-4 pt-10">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">{labels.createdAt}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-white">{item.createdAtLabel}</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(item.status)}`}
                    data-testid="my-assets-status"
                  >
                    {labels.status[item.status]}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                    {labels.targetResolution}
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">{item.resolution}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                    {labels.textureSize}
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">{item.textureSize}</p>
                </div>
              </div>

              {item.modelUrl ? (
                <button
                  type="button"
                  onClick={() => setPreviewingId(item.id)}
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#48bdff] px-4 py-2.5 text-sm font-bold text-[#04101e] transition hover:bg-[#72ceff]"
                  data-testid="my-assets-preview-button"
                >
                  {labels.preview3DModel}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      {previewItem?.modelUrl ? (
        <GlbPreviewDialog
          open={true}
          modelUrl={previewItem.modelUrl}
          title={labels.previewTitle}
          closeLabel={labels.closePreview}
          downloadLabel={labels.downloadGlb}
          onClose={() => setPreviewingId(null)}
        />
      ) : null}
    </>
  );
}
