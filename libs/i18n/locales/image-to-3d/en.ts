import type { ImageTo3DTranslations } from "../../../ai3d/intent-pages";
import { downloadEn } from "./download-en";
import { comparisonEn } from "./comparison-en";

const sampleDefaults = {
  provenance: "victor/pixal3d-studio · original vector input",
  license: "Free non-commercial evaluation",
};

export const imageTo3DEn: ImageTo3DTranslations = {
  common: {
    home: "Home",
    reviewed: "Sources reviewed",
    workspaceTitle: "Generate from your own image",
    details: "Details & sources",
    sources: "Sources",
    formats: "Output formats",
    suitable: "When to try it",
    avoid: "Before using it",
    quality: "What to inspect",
    runtime: "Where it runs",
    memory: "GPU memory",
    time: "Generation time",
    compareLink: "Choose a model and generate 3D",
    downloadLink: "Download 3D models for free",
    homeLinksTitle: "3D model download & usage guide",
    homeLinksDescription: "Learn how to generate and export a 3D model, and choose a file format for editing, games or 3D printing.",
    homeMultiModel: {
      action: "More AI 3D Generators",
    },
  },
  download: downloadEn,
  comparison: comparisonEn,
  samples: {
    mushroom: { ...sampleDefaults, name: "Red-capped mushroom", description: "Generated from the original illustration shown here. GLB retains its exported material; STL and OBJ contain geometry only. Check the cap and underside before reuse.", referenceAlt: "Original input illustration of a red-capped mushroom on white" },
    teapot: { ...sampleDefaults, name: "Green ceramic teapot", description: "Generated from the original illustration shown here. Compare the spout and handle with the input. STL and OBJ contain geometry only, without textures.", referenceAlt: "Original input illustration of a green ceramic teapot on white" },
    chair: { ...sampleDefaults, name: "Wooden chair", description: "Generated from the original blue-seat chair illustration shown here. Check the back and leg connections on import. STL and OBJ contain geometry only.", referenceAlt: "Original input illustration of a wooden chair with a blue seat on white" },
    crate: { ...sampleDefaults, name: "Wooden crate", description: "Generated from the original unbranded crate illustration shown here. Check the planks and hidden surfaces. STL and OBJ contain geometry only.", referenceAlt: "Original input illustration of an unbranded wooden crate on white" },
  },
};
