"use client";

import { comparisonActions, isEmbeddedComparisonModel } from "@config/image-to-3d";
import type { ComparisonModelId } from "@libs/ai3d/intent-pages";
import { useModelWorkspace } from "@libs/react-shared/providers/model-workspace-context";

const actionClass = "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#46d9bd]/35 bg-[#46d9bd]/10 px-3 py-2 text-xs font-semibold text-[#9af2dc] transition-colors hover:border-[#46d9bd] hover:bg-[#46d9bd]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#48bdff] aria-pressed:border-[#70e6cc] aria-pressed:bg-[#70e6cc] aria-pressed:text-[#08201e]";

export function ModelOnlineAction({ id, name, tryHere, openOnline }: { id: ComparisonModelId; name: string; tryHere: string; openOnline: string }) {
  const { activeModel, selectModel, isInteractive } = useModelWorkspace();
  if (!isEmbeddedComparisonModel(id)) {
    return <a href={comparisonActions[id].onlineUrl} target="_blank" rel="noreferrer noopener" aria-label={`${openOnline}: ${name}`} data-testid={`model-use-${id}`} className={actionClass}>{openOnline}<span aria-hidden="true">↗</span></a>;
  }
  return <button type="button" disabled={!isInteractive} aria-pressed={activeModel === id} aria-controls="workspace-frame" aria-label={`${tryHere}: ${name}`} data-testid={`model-use-${id}`} className={`${actionClass} disabled:cursor-wait`} onClick={() => {
    selectModel(id);
    document.getElementById("workspace")?.scrollIntoView({ behavior: "instant", block: "start" });
  }}>{tryHere}<span aria-hidden="true">{activeModel === id ? "✓" : "↓"}</span></button>;
}
