export type IntentPageSlug = "image-to-3d-model-free-download" | "image-to-3d";
export type ComparisonModelId = "pixal3d" | "rodin" | "trellis" | "hunyuan3d";
export type EmbeddedComparisonModelId = Exclude<ComparisonModelId, "rodin">;

export interface IntentTextBlock {
  title: string;
  body: string;
}

export interface IntentFaq {
  question: string;
  answer: string;
}

export interface IntentModelCopy {
  name: string;
  shortName: string;
  focus: string;
  accessBadge: string;
  access: string;
  quickFacts: { formats: string; memory: string; time: string; quality: string; avoid: string };
  version?: string;
  summary: string;
  suitable: string;
  avoid: string;
  quality: string;
  formats: string;
  runtime: string;
  memory: string;
  time: string;
  sourceLabels: string[];
}

export interface IntentPageCopy {
  title: string;
  description: string;
  summary: string;
  eyebrow: string;
  relatedTitle: string;
}

export interface ImageTo3DTranslations {
  common: {
    home: string;
    reviewed: string;
    workspaceTitle: string;
    sources: string;
    details: string;
    formats: string;
    suitable: string;
    avoid: string;
    quality: string;
    runtime: string;
    memory: string;
    time: string;
    compareLink: string;
    downloadLink: string;
    homeLinksTitle: string;
    homeLinksDescription: string;
    homeMultiModel: {
      action: string;
    };
  };
  download: IntentPageCopy & {
    jump: string;
    workspaceSteps: string[];
    downloadFallbackHint: string;
    exportHint: string;
    downloadConditions: string;
    resultLabel: string;
    resultAlt: string;
    fileNotes: Record<"GLB" | "OBJ" | "STL", string>;
    libraryTitle: string;
    libraryIntro: string;
    libraryEmptyTitle: string;
    libraryEmptyBody: string;
    downloadLabel: string;
    referenceLabel: string;
    provenanceLabel: string;
    licenseLabel: string;
    workflowTitle: string;
    workflow: IntentTextBlock[];
    formatsTitle: string;
    formatHeaders: string[];
    formatRows: { name: string; use: string; limits: string }[];
    faqTitle: string;
    faq: IntentFaq[];
  };
  comparison: IntentPageCopy & {
    jump: string;
    modelNavigation: string;
    workspaceTitle: string;
    noScriptSwitch: string;
    tryHere: string;
    openOnline: string;
    localSetup: string;
    accessLabel: string;
    modelsTitle: string;
    models: Record<ComparisonModelId, IntentModelCopy>;
    selectionTitle: string;
    selection: IntentTextBlock[];
    faqTitle: string;
    faq: IntentFaq[];
  };
  samples: Record<string, { name: string; description: string; provenance: string; license: string; referenceAlt: string }>;
}

/** Only approved, existing files may be included in the public download manifest. */
export interface PublicModelSample {
  id: string;
  referenceImage: string;
  previewImage?: string;
  sourceUrl: string;
  licenseUrl: string;
  files: {
    format: "GLB" | "STL" | "OBJ";
    path: string;
    filename: string;
    bytes: number;
    sha256: string;
  }[];
}
