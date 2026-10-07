"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { EmbeddedComparisonModelId } from "@libs/ai3d/intent-pages";

interface ModelWorkspaceState {
  activeModel: EmbeddedComparisonModelId;
  visitedModels: EmbeddedComparisonModelId[];
  isInteractive: boolean;
  selectModel: (id: EmbeddedComparisonModelId) => void;
}

const ModelWorkspaceContext = createContext<ModelWorkspaceState | null>(null);

/** Selection is shared by the top controls and the model cards below the workspace. */
export function ModelWorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ activeModel: EmbeddedComparisonModelId; visitedModels: EmbeddedComparisonModelId[] }>({ activeModel: "pixal3d", visitedModels: ["pixal3d"] });
  const [isInteractive, setIsInteractive] = useState(false);
  useEffect(() => setIsInteractive(true), []);
  const selectModel = useCallback((id: EmbeddedComparisonModelId) => {
    setState((previous) => previous.activeModel === id ? previous : {
      activeModel: id,
      visitedModels: previous.visitedModels.includes(id) ? previous.visitedModels : [...previous.visitedModels, id],
    });
  }, []);
  const value = useMemo(() => ({ ...state, isInteractive, selectModel }), [state, isInteractive, selectModel]);
  return <ModelWorkspaceContext.Provider value={value}>{children}</ModelWorkspaceContext.Provider>;
}

export function useModelWorkspace() {
  const context = useContext(ModelWorkspaceContext);
  if (!context) throw new Error("Model workspace controls require ModelWorkspaceProvider");
  return context;
}
