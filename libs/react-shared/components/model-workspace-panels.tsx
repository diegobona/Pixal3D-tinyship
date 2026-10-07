"use client";

import type { ComponentProps } from "react";
import type { EmbeddedComparisonModelId } from "@libs/ai3d/intent-pages";
import { useModelWorkspace } from "../providers/model-workspace-context";
import { LazyIframe } from "./lazy-iframe";

type Frame = { id: EmbeddedComparisonModelId; src: string; title: string; testId: string };

export function ModelWorkspacePanels({ frames, labels, className }: {
  frames: Frame[];
  labels: ComponentProps<typeof LazyIframe>["labels"];
  className: string;
}) {
  const { activeModel, visitedModels } = useModelWorkspace();
  return frames.filter((frame) => visitedModels.includes(frame.id)).map((frame) => (
    <div key={frame.id} id={`workspace-panel-${frame.id}`} data-testid={`workspace-panel-${frame.id}`} role="region" aria-label={frame.title} hidden={activeModel !== frame.id}>
      <LazyIframe loadImmediately testId={frame.testId} title={frame.title} src={frame.src} labels={labels} className={className} />
    </div>
  ));
}
