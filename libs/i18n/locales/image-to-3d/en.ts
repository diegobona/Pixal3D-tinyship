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
    sources: "Sources",
    formats: "Output formats",
    suitable: "When to try it",
    avoid: "Before using it",
    quality: "What to inspect",
    runtime: "Where it runs",
    memory: "GPU memory",
    time: "Generation time",
    compareLink: "Compare image-to-3D models",
    downloadLink: "Get a free model file",
    homeLinksTitle: "Find a model or download a sample",
    homeLinksDescription: "Compare image-to-3D workflows, or get a file to test in your own software.",
  },
  download: downloadEn,
  comparison: comparisonEn,
  samples: {
    mushroom: { ...sampleDefaults, name: "Red-capped mushroom", description: "Generated from an original mushroom illustration. GLB includes its exported material; STL and OBJ contain geometry only. Inspect the cap and underside before reuse.", referenceAlt: "Original input illustration of a red-capped mushroom on white" },
    teapot: { ...sampleDefaults, name: "Green ceramic teapot", description: "Generated from an original teapot illustration. Compare the spout and handle with the source image. The STL and OBJ downloads contain geometry without textures.", referenceAlt: "Original input illustration of a green ceramic teapot on white" },
    chair: { ...sampleDefaults, name: "Wooden chair", description: "Generated from an original chair illustration with a blue seat. Check the back and leg connections when importing it. STL and OBJ contain geometry only.", referenceAlt: "Original input illustration of a wooden chair with a blue seat on white" },
    crate: { ...sampleDefaults, name: "Wooden crate", description: "Generated from an original illustration of an unbranded crate. Check the generated planks and hidden surfaces. STL and OBJ contain geometry only.", referenceAlt: "Original input illustration of an unbranded wooden crate on white" },
  },
};
