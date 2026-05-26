export const PIXAL3D_PROGRESS_CAP = 96;

export const PIXAL3D_PROGRESS_STEPS = [
  {
    key: "submitting",
    startPercent: 0,
    endPercent: 8,
    durationRangeMs: [1000, 3000],
  },
  {
    key: "waitingForRunner",
    startPercent: 8,
    endPercent: 18,
    durationRangeMs: [2000, 8000],
  },
  {
    key: "preparingImage",
    startPercent: 18,
    endPercent: 28,
    durationRangeMs: [4000, 8000],
  },
  {
    key: "samplingSparseStructure",
    startPercent: 28,
    endPercent: 45,
    durationRangeMs: [8000, 18000],
  },
  {
    key: "samplingShapeSLat",
    startPercent: 45,
    endPercent: 65,
    durationRangeMs: [12000, 28000],
  },
  {
    key: "samplingTextureSLat",
    startPercent: 65,
    endPercent: 82,
    durationRangeMs: [10000, 25000],
  },
  {
    key: "buildingMesh",
    startPercent: 82,
    endPercent: 96,
    durationRangeMs: [8000, 18000],
  },
  {
    key: "finalizingPreview",
    startPercent: 96,
    endPercent: 96,
    durationRangeMs: [5000, 12000],
  },
] as const;

export type Pixal3DProgressStepKey = typeof PIXAL3D_PROGRESS_STEPS[number]["key"];
export type Pixal3DProgressStatus = "processing" | "succeeded" | "failed";

export interface Pixal3DProgressPlanStep {
  key: Pixal3DProgressStepKey;
  startPercent: number;
  endPercent: number;
  durationMs: number;
  startMs: number;
  endMs: number;
}

export interface Pixal3DProgressSnapshot {
  percent: number;
  currentStepIndex: number;
  currentStepKey: Pixal3DProgressStepKey;
  completedStepCount: number;
  status: Pixal3DProgressStatus;
}

function randomDuration([min, max]: readonly [number, number], random: () => number) {
  return Math.round(min + Math.min(Math.max(random(), 0), 1) * (max - min));
}

export function createPixal3DProgressPlan(random: () => number = Math.random): Pixal3DProgressPlanStep[] {
  let cursorMs = 0;

  return PIXAL3D_PROGRESS_STEPS.map((step) => {
    const durationMs = randomDuration(step.durationRangeMs, random);
    const plannedStep = {
      key: step.key,
      startPercent: step.startPercent,
      endPercent: step.endPercent,
      durationMs,
      startMs: cursorMs,
      endMs: cursorMs + durationMs,
    };
    cursorMs += durationMs;
    return plannedStep;
  });
}

export function getPixal3DProgressSnapshot(
  plan: Pixal3DProgressPlanStep[],
  elapsedMs: number,
  status: Pixal3DProgressStatus
): Pixal3DProgressSnapshot {
  const lastStep = plan[plan.length - 1];
  if (!lastStep) {
    throw new Error("Pixal3D progress plan must include at least one step.");
  }

  if (status === "succeeded") {
    return {
      percent: 100,
      currentStepIndex: plan.length - 1,
      currentStepKey: lastStep.key,
      completedStepCount: plan.length,
      status,
    };
  }

  const currentStepIndex = plan.findIndex((step) => elapsedMs < step.endMs);
  const safeCurrentStepIndex = currentStepIndex === -1 ? plan.length - 1 : Math.max(0, currentStepIndex);
  const currentStep = plan[safeCurrentStepIndex] || lastStep;
  const stepElapsedMs = Math.max(0, elapsedMs - currentStep.startMs);
  const stepRatio = currentStep.durationMs > 0 ? Math.min(1, stepElapsedMs / currentStep.durationMs) : 1;
  const rawPercent =
    currentStep.startPercent + (currentStep.endPercent - currentStep.startPercent) * stepRatio;
  const percent = Math.min(PIXAL3D_PROGRESS_CAP, Math.round(rawPercent));

  return {
    percent,
    currentStepIndex: safeCurrentStepIndex,
    currentStepKey: currentStep.key,
    completedStepCount: safeCurrentStepIndex,
    status,
  };
}
