"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GlbPreviewDialog } from "@/components/glb-preview-dialog";
import {
  mergeMyAssetStatusUpdate,
  type MyAssetStatusUpdate,
} from "@/lib/my-assets-status-updates";

type AssetStatus = "processing" | "succeeded" | "failed";

export interface MyAssetItem {
  id: string;
  prompt: string;
  modelUrl?: string;
  errorMessage?: string;
  status: AssetStatus;
  resolution: number;
  textureSize: number;
  creditsConsumed: number;
  createdAtLabel: string;
}

interface MyAssetsGridProps {
  items: MyAssetItem[];
  labels: {
    createdAt: string;
    targetResolution: string;
    textureSize: string;
    creditsUsed: string;
    pricingHint: string;
    preview3DModel: string;
    previewTitle: string;
    closePreview: string;
    downloadGlb: string;
    previewLoading: string;
    previewErrorTitle: string;
    previewErrorDescription: string;
    checkingStatus: string;
    status: Record<AssetStatus, string>;
  };
}

interface StatusResponse {
  success: boolean;
  data?: MyAssetStatusUpdate;
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
  const [assets, setAssets] = useState(items);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const assetsRef = useRef(assets);

  useEffect(() => {
    setAssets(items);
  }, [items]);

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  const processingAssetIds = useMemo(
    () => assets.filter((item) => item.status === "processing").map((item) => item.id).join("|"),
    [assets]
  );

  useEffect(() => {
    if (!processingAssetIds) return;

    let isCancelled = false;
    let isInFlight = false;

    const checkProcessingAssets = async () => {
      if (isInFlight) return;
      isInFlight = true;
      setIsCheckingStatus(true);

      const ids = assetsRef.current
        .filter((item) => item.status === "processing")
        .map((item) => item.id);

      await Promise.all(ids.map(async (taskId) => {
        try {
          const response = await fetch(`/api/3d-generate/status?taskId=${encodeURIComponent(taskId)}`, {
            cache: "no-store",
          });
          const data = (await response.json()) as StatusResponse;

          if (!isCancelled && response.ok && data.success && data.data) {
            setAssets((current) => mergeMyAssetStatusUpdate(current, data.data!));
          }
        } catch {
          // Keep the card in processing and retry on the next interval.
        }
      }));

      if (!isCancelled) {
        setIsCheckingStatus(false);
      }
      isInFlight = false;
    };

    void checkProcessingAssets();
    const intervalId = window.setInterval(checkProcessingAssets, 10000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [processingAssetIds]);

  const previewItem = useMemo(
    () => assets.find((item) => item.id === previewingId && item.modelUrl),
    [assets, previewingId]
  );

  return (
    <>
      <div className="rounded-2xl border border-[#48bdff]/20 bg-[#0d2046]/65 px-5 py-4 text-sm font-semibold leading-6 text-[#8fd7ff]">
        {labels.pricingHint}
      </div>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" data-testid="my-assets-grid">
        {assets.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-[24px] border border-[#263653] bg-[#0a1530] shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
            data-testid="my-assets-card"
            data-task-id={item.id}
            data-task-status={item.status}
          >
            <div
              className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(72,189,255,0.24),rgba(13,26,56,0.96)_52%,rgba(7,16,31,1))]"
              data-testid="my-assets-model-tile"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid h-24 w-24 place-items-center rounded-[28px] border border-[#48bdff]/25 bg-[#06132e]/70 text-2xl font-black text-[#48bdff] shadow-[0_24px_80px_rgba(72,189,255,0.16)]">
                  GLB
                </div>
              </div>
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
                <div className="col-span-2 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3" data-testid="my-assets-credits-used">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
                    {labels.creditsUsed}
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">{item.creditsConsumed.toLocaleString("en-US")}</p>
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
              {item.status === "processing" ? (
                <p
                  className="text-center text-xs font-semibold text-[#7bd7ff]"
                  data-testid="my-assets-processing-hint"
                >
                  {isCheckingStatus ? labels.checkingStatus : labels.status.processing}
                </p>
              ) : null}
              {item.status === "failed" && item.errorMessage ? (
                <p className="text-center text-xs font-semibold text-[#ff9dad]">
                  {item.errorMessage}
                </p>
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
          loadingLabel={labels.previewLoading}
          errorTitle={labels.previewErrorTitle}
          errorDescription={labels.previewErrorDescription}
          onClose={() => setPreviewingId(null)}
        />
      ) : null}
    </>
  );
}
