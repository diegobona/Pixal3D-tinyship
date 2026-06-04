"use client";

import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GlbPreviewDialog } from "@/components/glb-preview-dialog";
import {
  PIXAL3D_PROGRESS_STEPS,
  createPixal3DProgressPlan,
  getPixal3DProgressSnapshot,
  type Pixal3DProgressPlanStep,
  type Pixal3DProgressSnapshot,
  type Pixal3DProgressStepKey,
  type Pixal3DProgressStatus,
} from "@/lib/pixal3d-progress";
import {
  get3DPlanEntitlement,
  type ThreeDPlanEntitlement,
} from "@libs/ai/3d-entitlements";
import { Button } from "@libs/react-shared/ui/button";
import { Input } from "@libs/react-shared/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import { authClientReact } from "@libs/auth/authClient";
import { dispatchCreditBalanceUpdated } from "@/lib/credit-balance-events";
import { getPixal3DGenerateDisabledReason } from "@/lib/pixal3d-generate-disabled-reason";
import {
  Pixal3DGenerationStatusUnknownError,
  isPixal3DGenerationStatusUnknownError,
} from "@/lib/pixal3d-generation-errors";

type TaskStatus = "idle" | "upload-ready" | "processing" | "checking" | "succeeded" | "failed";
type ResolutionOption = 1024 | 1536;
type TextureSizeOption = 1024 | 2048 | 4096;
type PageNoticeType = "error" | "info" | "success";

interface PageNotice {
  type: PageNoticeType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface Pixal3DSettings {
  resolution: ResolutionOption;
  textureSize: TextureSizeOption;
  decimationTarget: number;
  maxNumTokens: number;
  meshScale: number;
  sparseStructureGuidanceStrength: number;
  sparseStructureGuidanceRescale: number;
  sparseStructureSteps: number;
  sparseStructureRescaleT: number;
  shapeGuidanceStrength: number;
  shapeGuidanceRescale: number;
  shapeSteps: number;
  shapeRescaleT: number;
  textureGuidanceStrength: number;
  textureSteps: number;
  textureRescaleT: number;
  remesh: boolean;
}

interface SampleImage {
  id: string;
  name: string;
  src: string;
  transparentSrc?: string;
  modelUrl?: string;
}

interface GenerateResponse {
  success: boolean;
  data?: {
    taskId: string;
    status: "processing";
    provider: string;
    model: string;
    providerTaskId?: string;
  };
  error?: string;
  message?: string;
  credits?: {
    consumed?: number;
    remaining?: number;
  };
}

interface StatusResponse {
  success: boolean;
  data?: {
    id: string;
    status: "processing" | "succeeded" | "failed";
    result?: {
      modelUrl: string;
      format: "glb";
      provider: string;
      model: string;
      thumbnailUrl?: string;
    };
    errorMessage?: string;
  };
  error?: string;
  message?: string;
}

interface HfInstanceResponse {
  success: boolean;
  data?: {
    selected: {
      index: number;
      url: string;
      queueSize: number | null;
      available: boolean;
    };
  };
  usage?: {
    used: number;
    remaining: number;
    limit: number;
  };
  error?: string;
  message?: string;
}

interface CreditStatusResponse {
  credits?: {
    balance?: number;
  };
  subscription?: {
    planId?: string;
  } | null;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;
const FREE_TRIAL_DURATION_SECONDS = 15 * 60;
const RESOLUTION_OPTIONS: ResolutionOption[] = [1024, 1536];
const TEXTURE_SIZE_OPTIONS: TextureSizeOption[] = [1024, 2048, 4096];
const RESOLUTION_CREDIT_COST: Record<ResolutionOption, number> = {
  1024: 1000,
  1536: 1500,
};
const DEFAULT_PIXAL3D_SETTINGS: Pixal3DSettings = {
  resolution: 1024,
  textureSize: 1024,
  decimationTarget: 200000,
  maxNumTokens: 49152,
  meshScale: 1,
  sparseStructureGuidanceStrength: 7.5,
  sparseStructureGuidanceRescale: 0.7,
  sparseStructureSteps: 12,
  sparseStructureRescaleT: 5,
  shapeGuidanceStrength: 7.5,
  shapeGuidanceRescale: 0.5,
  shapeSteps: 12,
  shapeRescaleT: 3,
  textureGuidanceStrength: 1,
  textureSteps: 12,
  textureRescaleT: 3,
  remesh: true,
};
const ADVANCED_SETTING_FIELDS = [
  { key: "decimationTarget", min: 5000, max: 2000000, step: 1000 },
  { key: "maxNumTokens", min: 4096, max: 131072, step: 1024 },
  { key: "meshScale", min: 0.1, max: 10, step: 0.1 },
  { key: "sparseStructureGuidanceStrength", min: 0, max: 10, step: 0.1 },
  { key: "sparseStructureGuidanceRescale", min: 0, max: 1, step: 0.1 },
  { key: "sparseStructureSteps", min: 1, max: 50, step: 1 },
  { key: "sparseStructureRescaleT", min: 1, max: 6, step: 0.1 },
  { key: "shapeGuidanceStrength", min: 0, max: 10, step: 0.1 },
  { key: "shapeGuidanceRescale", min: 0, max: 1, step: 0.1 },
  { key: "shapeSteps", min: 1, max: 50, step: 1 },
  { key: "shapeRescaleT", min: 1, max: 6, step: 0.1 },
  { key: "textureGuidanceStrength", min: 0, max: 10, step: 0.1 },
  { key: "textureSteps", min: 1, max: 50, step: 1 },
  { key: "textureRescaleT", min: 1, max: 6, step: 0.1 },
] as const;
const PIXAL3D_REFERENCE_ASSET_BASE = "https://ldyang694.github.io/projects/pixal3d";
const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: "keyboard",
    name: "Retro terminal",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/image/keyboard.jpg`,
  },
  {
    id: "treehouse",
    name: "Treehouse",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/image/treehouse.png`,
  },
  {
    id: "result-21",
    name: "Dessert scene",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/results/21_img.png`,
  },
  {
    id: "result-10",
    name: "Creature concept",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/results/10_img.webp`,
  },
];
const INSPIRATION_IMAGES: SampleImage[] = [
  {
    id: "chair",
    name: "Stylized chair",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/image/chair.png`,
    modelUrl: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/pixal3d/chair.glb`,
  },
  {
    id: "city",
    name: "Floating city",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/image/city.jpg`,
    modelUrl: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/pixal3d/city.glb`,
  },
  {
    id: "keyboard",
    name: "Retro computer",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/image/keyboard.jpg`,
    transparentSrc: "/samples/retro-computer-transparent.png",
    modelUrl: "/samples/keyboard-preview.glb",
  },
  {
    id: "picnic",
    name: "Picnic basket",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/image/picnic.jpg`,
    modelUrl: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/pixal3d/picnic.glb`,
  },
  {
    id: "pizza",
    name: "Pizza slice",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/image/pizza.png`,
    modelUrl: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/pixal3d/pizza.glb`,
  },
  {
    id: "treehouse",
    name: "Treehouse",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/image/treehouse.png`,
    modelUrl: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/pixal3d/treehouse.glb`,
  },
  {
    id: "windhouse",
    name: "Windmill house",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/image/windhouse.png`,
    modelUrl: `${PIXAL3D_REFERENCE_ASSET_BASE}/compa/pixal3d/windhouse.glb`,
  },
  {
    id: "result-0",
    name: "Armored turtle",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/results/0_img.png`,
    modelUrl: `${PIXAL3D_REFERENCE_ASSET_BASE}/results/0_mesh.glb`,
  },
  {
    id: "result-1",
    name: "Fantasy relic",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/results/1_img.png`,
    modelUrl: `${PIXAL3D_REFERENCE_ASSET_BASE}/results/1_mesh.glb`,
  },
  {
    id: "result-10",
    name: "Creature concept",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/results/10_img.webp`,
    modelUrl: `${PIXAL3D_REFERENCE_ASSET_BASE}/results/10_mesh.glb`,
  },
  {
    id: "result-12",
    name: "Fantasy building",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/results/12_img.png`,
    modelUrl: `${PIXAL3D_REFERENCE_ASSET_BASE}/results/12_mesh.glb`,
  },
  {
    id: "result-21",
    name: "Scene concept",
    src: `${PIXAL3D_REFERENCE_ASSET_BASE}/results/21_img.png`,
    modelUrl: `${PIXAL3D_REFERENCE_ASSET_BASE}/results/21_mesh.glb`,
  },
];
const DEFAULT_EXAMPLE_RESULT =
  INSPIRATION_IMAGES.find((item) => item.id === "keyboard") ?? INSPIRATION_IMAGES[0];
const ADVANTAGE_KEYS = [
  "faithful",
  "pixelAligned",
  "geometry",
  "pbr",
  "fast",
] as const;
const FAQ_KEYS = ["generator", "oneImage", "bestImages", "formats"] as const;

export default function Home() {
  const { t, locale, localizedPath } = useTranslation();
  const { data: session, isPending: isSessionPending } = authClientReact.useSession();
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [generatedModelUrl, setGeneratedModelUrl] = useState("");
  const [isGlbPreviewOpen, setIsGlbPreviewOpen] = useState(false);
  const [progressPlan, setProgressPlan] = useState<Pixal3DProgressPlanStep[]>(() => createPixal3DProgressPlan());
  const [progressStartedAt, setProgressStartedAt] = useState<number | null>(null);
  const [progressSnapshot, setProgressSnapshot] = useState<Pixal3DProgressSnapshot | null>(null);
  const [settings, setSettings] = useState<Pixal3DSettings>(DEFAULT_PIXAL3D_SETTINGS);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("idle");
  const [taskMessage, setTaskMessage] = useState(t.pixal3d.generator.status.idle);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hfTrialUrl, setHfTrialUrl] = useState("");
  const [hfTrialQueueSize, setHfTrialQueueSize] = useState<number | null>(null);
  const [hfTrialSecondsLeft, setHfTrialSecondsLeft] = useState(0);
  const [hfTrialEndsAt, setHfTrialEndsAt] = useState<number | null>(null);
  const [isOpeningHfTrial, setIsOpeningHfTrial] = useState(false);
  const [isHfTrialFrameLoading, setIsHfTrialFrameLoading] = useState(false);
  const [isHfTrialModalOpen, setIsHfTrialModalOpen] = useState(false);
  const [isHfTrialLimitReached, setIsHfTrialLimitReached] = useState(false);
  const [activeInspirationId, setActiveInspirationId] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [subscriptionPlanId, setSubscriptionPlanId] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<PageNotice | null>(null);
  const hfTrialRequestIdRef = useRef(0);

  const requiredCredits = RESOLUTION_CREDIT_COST[settings.resolution];
  const isAuthenticated = Boolean(session?.user);
  const hasEnoughCredits = creditBalance >= requiredCredits;
  const planEntitlement = useMemo<ThreeDPlanEntitlement | null>(
    () => get3DPlanEntitlement(subscriptionPlanId),
    [subscriptionPlanId]
  );
  const canEditGenerationSettings = taskStatus !== "processing";
  const canGenerate = useMemo(() => {
    return Boolean(
      imageDataUrl
      && isAuthenticated
      && hasEnoughCredits
      && taskStatus !== "processing"
      && !isReadingFile
      && !isSessionPending
    );
  }, [hasEnoughCredits, imageDataUrl, isAuthenticated, isReadingFile, isSessionPending, taskStatus]);
  const generateDisabledReason = getPixal3DGenerateDisabledReason({
    isSessionPending,
    isAuthenticated,
    hasImage: Boolean(imageDataUrl),
    creditBalance,
    requiredCredits,
    isReadingFile,
    isProcessing: taskStatus === "processing",
    labels: {
      signInRequired: t.pixal3d.generator.errors.generateDisabledSignIn,
      insufficientCredits: t.pixal3d.generator.errors.generateDisabledInsufficientCredits,
      imageRequired: t.pixal3d.generator.errors.generateDisabledImageRequired,
      readingImage: t.pixal3d.generator.errors.generateDisabledReadingImage,
    },
  });
  const showGenerateUpgradeShortcut = Boolean(
    !canGenerate
    && generateDisabledReason
    && isAuthenticated
    && !hasEnoughCredits
    && !isSessionPending
    && taskStatus !== "processing"
  );

  const progressStepLabels = t.pixal3d.generator.progress.steps as Record<Pixal3DProgressStepKey, string>;
  const showGenerationProgress = Boolean(progressSnapshot && taskStatus !== "idle" && taskStatus !== "upload-ready");
  const trialDescription = t.pixal3d.generator.trialDescription;
  const highlightedTrialDescription = useMemo(() => {
    const marker = "15-minute";
    const markerIndex = trialDescription.indexOf(marker);

    if (markerIndex === -1) {
      return trialDescription;
    }

    return (
      <>
        {trialDescription.slice(0, markerIndex)}
        <span className="mx-1 inline-flex items-center justify-center px-2 py-0.5 text-[1.08em] font-extrabold leading-none text-[#ffe7a8]">
          {marker}
        </span>
        {trialDescription.slice(markerIndex + marker.length)}
      </>
    );
  }, [trialDescription]);

  useEffect(() => {
    setTaskMessage(t.pixal3d.generator.status.idle);
  }, [t.pixal3d.generator.status.idle]);

  useEffect(() => {
    void import("@google/model-viewer");

    const head = document.head;
    const preconnectLink = document.createElement("link");
    preconnectLink.rel = "preconnect";
    preconnectLink.href = "https://ldyang694.github.io";
    preconnectLink.crossOrigin = "anonymous";

    const dnsPrefetchLink = document.createElement("link");
    dnsPrefetchLink.rel = "dns-prefetch";
    dnsPrefetchLink.href = "https://ldyang694.github.io";

    head.appendChild(preconnectLink);
    head.appendChild(dnsPrefetchLink);

    return () => {
      preconnectLink.remove();
      dnsPrefetchLink.remove();
    };
  }, []);

  const showPageNotice = (
    type: PageNoticeType,
    title: string,
    options?: Omit<PageNotice, "type" | "title">
  ) => {
    setPageNotice({ type, title, ...options });
  };

  const clearPageNotice = () => {
    setPageNotice(null);
  };

  const loadCreditStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/credits/status", { cache: "no-store" });
      if (!response.ok) {
        setCreditBalance(0);
        setSubscriptionPlanId(null);
        return;
      }

      const data = (await response.json()) as CreditStatusResponse;
      setCreditBalance(Number(data.credits?.balance || 0));
      setSubscriptionPlanId(data.subscription?.planId || null);
    } catch {
      setCreditBalance(0);
      setSubscriptionPlanId(null);
    }
  }, []);

  useEffect(() => {
    void loadCreditStatus();
  }, [loadCreditStatus]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadCreditStatus();
      }
    };

    window.addEventListener("focus", loadCreditStatus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", loadCreditStatus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadCreditStatus]);

  useEffect(() => {
    if (!planEntitlement) return;

    setSettings((current) => ({
      ...current,
      resolution: current.resolution > planEntitlement.maxResolution
        ? planEntitlement.maxResolution
        : current.resolution,
      textureSize: current.textureSize > planEntitlement.maxTextureSize
        ? planEntitlement.maxTextureSize
        : current.textureSize,
    }));
  }, [planEntitlement]);

  useEffect(() => {
    if (!hfTrialEndsAt || !hfTrialUrl) return;

    const updateCountdown = () => {
      const nextSecondsLeft = Math.max(0, Math.ceil((hfTrialEndsAt - Date.now()) / 1000));
      setHfTrialSecondsLeft(nextSecondsLeft);

      if (nextSecondsLeft <= 0) {
        setHfTrialUrl("");
        setHfTrialQueueSize(null);
        setHfTrialEndsAt(null);
        setIsHfTrialFrameLoading(false);
        setIsHfTrialModalOpen(false);
        showPageNotice("info", t.pixal3d.generator.freeTrialExpired);
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [hfTrialEndsAt, hfTrialUrl, t.pixal3d.generator.freeTrialExpired]);

  useEffect(() => {
    if (taskStatus !== "processing" || !progressStartedAt) return;

    const updateProgress = () => {
      setProgressSnapshot(
        getPixal3DProgressSnapshot(progressPlan, Date.now() - progressStartedAt, "processing")
      );
    };

    updateProgress();
    const timer = window.setInterval(updateProgress, 600);

    return () => {
      window.clearInterval(timer);
    };
  }, [progressPlan, progressStartedAt, taskStatus]);

  const closeHfTrial = () => {
    hfTrialRequestIdRef.current += 1;
    setIsHfTrialModalOpen(false);
    setHfTrialUrl("");
    setHfTrialQueueSize(null);
    setHfTrialSecondsLeft(0);
    setHfTrialEndsAt(null);
    setIsOpeningHfTrial(false);
    setIsHfTrialFrameLoading(false);
  };

  useEffect(() => {
    if (!isHfTrialModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeHfTrial();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHfTrialModalOpen]);

  const formatTrialTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const readFileAsDataUrl = async (file: File) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/bmp"];
    if (!allowed.includes(file.type)) {
      showPageNotice("error", t.pixal3d.generator.errors.unsupportedImage);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showPageNotice("error", t.pixal3d.generator.errors.imageTooLarge);
      return;
    }

    setIsReadingFile(true);
    clearPageNotice();
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("file_read_failed"));
        reader.readAsDataURL(file);
      });
      setImageDataUrl(dataUrl);
      setImageName(file.name);
      setGeneratedModelUrl("");
      setIsGlbPreviewOpen(false);
      setProgressSnapshot(null);
      setProgressStartedAt(null);
      setTaskStatus("upload-ready");
      setTaskMessage(t.pixal3d.generator.status.ready);
    } catch {
      showPageNotice("error", t.pixal3d.generator.errors.uploadFailed);
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    const file = files[0];
    if (file) void readFileAsDataUrl(file);
  };

  const useSampleImage = (sample: Pick<SampleImage, "name" | "src">) => {
    const resolvedImageSrc = /^https?:\/\//.test(sample.src)
      ? sample.src
      : `${window.location.origin}${sample.src}`;
    clearPageNotice();
    setImageDataUrl(resolvedImageSrc);
    setImageName(sample.name);
    setGeneratedModelUrl("");
    setIsGlbPreviewOpen(false);
    setProgressSnapshot(null);
    setProgressStartedAt(null);
    setTaskStatus("upload-ready");
    setTaskMessage(t.pixal3d.generator.status.ready);
  };

  const updateSetting = <K extends keyof Pixal3DSettings>(key: K, value: Pixal3DSettings[K]) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateNumberSetting = (key: keyof Omit<Pixal3DSettings, "remesh">, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    updateSetting(key, parsed as never);
  };

  const completeProgress = (
    plan: Pixal3DProgressPlanStep[],
    startedAt: number,
    status: Pixal3DProgressStatus
  ) => {
    setProgressSnapshot(getPixal3DProgressSnapshot(plan, Date.now() - startedAt, status));
  };

  const pollTask = async (task: GenerateResponse["data"]) => {
    if (!task) {
      throw new Error(t.pixal3d.generator.errors.statusFailed);
    }
    const startedAt = Date.now();
    const searchParams = new URLSearchParams({
      taskId: task.taskId,
      provider: task.provider,
      model: task.model,
    });
    if (task.providerTaskId) {
      searchParams.set("providerTaskId", task.providerTaskId);
    }

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      let response: Response;
      let data: StatusResponse;

      try {
        response = await fetch(`/api/3d-generate/status?${searchParams.toString()}`);
        data = (await response.json()) as StatusResponse;
      } catch {
        throw new Pixal3DGenerationStatusUnknownError(t.pixal3d.generator.errors.statusStillCheckingDescription);
      }

      if (!response.ok || !data.success || !data.data) {
        throw new Pixal3DGenerationStatusUnknownError(data.message || t.pixal3d.generator.errors.statusStillCheckingDescription);
      }

      if (data.data.status === "succeeded" && data.data.result?.modelUrl) {
        return data.data.result.modelUrl;
      }

      if (data.data.status === "failed") {
        throw new Error(data.data.errorMessage || t.pixal3d.generator.errors.generationFailed);
      }

      setTaskMessage(t.pixal3d.generator.status.processing);
    }

    throw new Pixal3DGenerationStatusUnknownError(t.pixal3d.generator.errors.timeoutStillChecking);
  };

  const handleGenerate = async () => {
    if (!hasEnoughCredits) {
      showPageNotice("error", t.pixal3d.generator.errors.insufficientCredits, {
        description: t.pixal3d.generator.errors.insufficientCreditsDescription
          .replace("{required}", String(requiredCredits))
          .replace("{balance}", String(creditBalance)),
      });
      return;
    }

    if (!imageDataUrl) {
      showPageNotice("error", t.pixal3d.generator.errors.imageRequired);
      return;
    }

    clearPageNotice();
    setTaskStatus("processing");
    setTaskMessage(t.pixal3d.generator.status.creating);
    setGeneratedModelUrl("");
    setIsGlbPreviewOpen(false);
    const nextProgressPlan = createPixal3DProgressPlan();
    const nextProgressStartedAt = Date.now();
    setProgressPlan(nextProgressPlan);
    setProgressStartedAt(nextProgressStartedAt);
    setProgressSnapshot(getPixal3DProgressSnapshot(nextProgressPlan, 0, "processing"));

    try {
      const response = await fetch("/api/3d-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageDataUrl,
          prompt: t.pixal3d.generator.defaultPrompt,
          quality: "standard",
          ...settings,
        }),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.success || !data.data?.taskId) {
        if (response.status === 403 && data.error === "trial_used") {
          showPageNotice("error", t.pixal3d.generator.errors.trialUsed, {
            description: t.pixal3d.generator.errors.trialUsedDescription,
            action: {
              label: t.actions.createAccount,
              onClick: () => {
                  window.location.href = localizedPath('/signup');
              },
            },
          });
          setTaskStatus("failed");
          setTaskMessage(t.pixal3d.generator.errors.trialUsed);
          completeProgress(nextProgressPlan, nextProgressStartedAt, "failed");
          return;
        }
        if (response.status === 402) {
          showPageNotice("error", t.pixal3d.generator.errors.insufficientCredits, {
            action: {
              label: t.common.viewPlans,
              onClick: () => {
                  window.location.href = localizedPath('/pricing');
              },
            },
          });
          setTaskStatus("failed");
          setTaskMessage(t.pixal3d.generator.errors.insufficientCredits);
          completeProgress(nextProgressPlan, nextProgressStartedAt, "failed");
          return;
        }
        if (response.status === 401) {
          showPageNotice("error", t.pixal3d.generator.errors.signInRequired, {
            action: {
              label: t.common.login,
              onClick: () => {
                  window.location.href = localizedPath('/signin');
              },
            },
          });
          setTaskStatus("failed");
          setTaskMessage(t.pixal3d.generator.errors.signInRequired);
          completeProgress(nextProgressPlan, nextProgressStartedAt, "failed");
          return;
        }
        throw new Error(data.message || t.pixal3d.generator.errors.generationFailed);
      }

      if (typeof data.credits?.remaining === "number" && Number.isFinite(data.credits.remaining)) {
        setCreditBalance(data.credits.remaining);
        dispatchCreditBalanceUpdated(data.credits.remaining);
      }

      const modelUrl = await pollTask(data.data);
      setGeneratedModelUrl(modelUrl);
      completeProgress(nextProgressPlan, nextProgressStartedAt, "succeeded");
      setIsGlbPreviewOpen(true);
      setTaskStatus("succeeded");
      setTaskMessage(t.pixal3d.generator.status.succeeded);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.pixal3d.generator.errors.generationFailed;
      if (isPixal3DGenerationStatusUnknownError(error)) {
        setTaskStatus("checking");
        setTaskMessage(t.pixal3d.generator.status.stillChecking);
        setProgressSnapshot(getPixal3DProgressSnapshot(nextProgressPlan, Date.now() - nextProgressStartedAt, "processing"));
        showPageNotice("info", t.pixal3d.generator.errors.statusStillChecking, {
          description: message,
          action: {
            label: t.header.auth.myAssets,
            onClick: () => {
              window.location.href = localizedPath('/my-assets');
            },
          },
        });
        return;
      }
      setTaskStatus("failed");
      setTaskMessage(message);
      completeProgress(nextProgressPlan, nextProgressStartedAt, "failed");
      showPageNotice("error", t.pixal3d.generator.errors.generationFailed, { description: message });
    }
  };

  const handleOpenHfTrial = async () => {
    if (isHfTrialLimitReached) return;

    const requestId = hfTrialRequestIdRef.current + 1;
    hfTrialRequestIdRef.current = requestId;
    setIsHfTrialModalOpen(true);
    setIsOpeningHfTrial(true);
    setIsHfTrialFrameLoading(false);
    clearPageNotice();

    try {
      const response = await fetch("/api/hf-pixal3d-instance", {
        method: "GET",
        headers: { accept: "application/json" },
      });
      const data = (await response.json()) as HfInstanceResponse;

      if (response.status === 429 && data.error === "free_trial_limit_reached") {
        if (requestId !== hfTrialRequestIdRef.current) return;
        setIsHfTrialLimitReached(true);
        setIsHfTrialModalOpen(false);
        showPageNotice("error", t.pixal3d.generator.errors.freeTrialLimitReached, {
          action: {
            label: t.common.viewPlans,
            onClick: () => {
                window.location.href = localizedPath('/pricing');
            },
          },
        });
        return;
      }

      if (!response.ok || !data.success || !data.data?.selected.url) {
        throw new Error(data.message || t.pixal3d.generator.errors.freeTrialBusy);
      }

      if (requestId !== hfTrialRequestIdRef.current) return;
      setHfTrialUrl(data.data.selected.url);
      setIsHfTrialFrameLoading(true);
      setHfTrialQueueSize(data.data.selected.queueSize);
      setHfTrialSecondsLeft(FREE_TRIAL_DURATION_SECONDS);
      setHfTrialEndsAt(Date.now() + FREE_TRIAL_DURATION_SECONDS * 1000);
    } catch (error) {
      if (requestId !== hfTrialRequestIdRef.current) return;
      setIsHfTrialModalOpen(false);
      const message = error instanceof Error ? error.message : t.pixal3d.generator.errors.freeTrialBusy;
      showPageNotice("error", t.pixal3d.generator.errors.freeTrialBusy, { description: message });
    } finally {
      if (requestId === hfTrialRequestIdRef.current) {
        setIsOpeningHfTrial(false);
      }
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#071431] text-white">
      <link rel="preconnect" href={PIXAL3D_REFERENCE_ASSET_BASE} crossOrigin="anonymous" />
      <link
        rel="preload"
        href={DEFAULT_EXAMPLE_RESULT.modelUrl}
        as="fetch"
        type="model/gltf-binary"
        crossOrigin="anonymous"
      />
      <section className="relative min-h-[calc(100vh-4rem)] border-l border-r border-[#2b3657] bg-[radial-gradient(circle_at_50%_-10%,rgba(22,91,173,0.22),transparent_42%),linear-gradient(180deg,#071431_0%,#0a1737_46%,#071431_100%)] px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1420px] flex-col items-center">
          <div className="mb-2 text-center">
            <h1 className="inline-block bg-gradient-to-r from-[#48bdff] via-[#28e4cf] to-[#00f08a] bg-clip-text pb-2 text-[38px] font-extrabold leading-[1.12] tracking-normal text-transparent sm:text-[56px]">
              {t.pixal3d.generator.heroTitle}
            </h1>
            <p className="mt-2 text-base font-medium tracking-normal text-[#9ca4ba] sm:text-xl">
              {t.pixal3d.generator.subtitle}
            </p>
          </div>

          <div
            data-testid="pixal3d-free-trial-callout"
            className="mt-4 w-full max-w-[1420px] overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] shadow-[0_12px_38px_rgba(0,0,0,0.12)] backdrop-blur"
          >
            <div className="flex flex-col gap-3 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="min-w-0 text-sm font-semibold leading-6 text-[#dce7ff] sm:text-base">
                {highlightedTrialDescription}
              </p>

              <Button
                data-testid="pixal3d-free-trial-button"
                type="button"
                size="lg"
                className="relative h-11 w-full overflow-hidden rounded-full border border-[#ffe08a] bg-gradient-to-r from-[#fff4b8] via-[#ffd878] to-[#ffb25f] px-7 text-base font-extrabold text-[#17111c] shadow-[0_14px_42px_rgba(255,184,107,0.24),inset_0_1px_0_rgba(255,255,255,0.58)] transition duration-300 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.72),transparent_48%)] before:opacity-45 before:transition-opacity before:duration-500 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_20px_58px_rgba(255,184,107,0.34),0_0_24px_rgba(255,232,160,0.22),inset_0_1px_0_rgba(255,255,255,0.7)] hover:before:opacity-80 disabled:translate-y-0 disabled:opacity-60 sm:w-auto sm:min-w-[240px]"
                disabled={isOpeningHfTrial || isHfTrialLimitReached}
                onClick={handleOpenHfTrial}
              >
                {isOpeningHfTrial ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#17111c]/30 border-t-[#17111c]" /> : null}
                <span className="relative z-10">{isOpeningHfTrial ? t.pixal3d.generator.freeTrialLoading : t.pixal3d.generator.freeTrialButton}</span>
              </Button>
            </div>
          </div>

          {pageNotice && (
            <div
              data-testid="pixal3d-page-notice"
              role="status"
              className={`mt-5 flex w-full max-w-[1420px] flex-col gap-3 rounded-lg border px-5 py-4 text-sm font-semibold leading-6 shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:flex-row sm:items-center sm:justify-between ${
                pageNotice.type === "error"
                  ? "border-[#ff6b6b]/55 bg-[#220f1d]/88 text-[#ffb8b8]"
                  : pageNotice.type === "success"
                    ? "border-[#2d875f]/55 bg-[#08251d]/88 text-[#8df5c2]"
                    : "border-[#48bdff]/45 bg-[#0a1430]/88 text-[#b8dfff]"
              }`}
            >
              <div className="min-w-0">
                <p className="text-base font-extrabold">{pageNotice.title}</p>
                {pageNotice.description ? (
                  <p className="mt-1 text-sm font-medium opacity-90">{pageNotice.description}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {pageNotice.action ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 rounded-full bg-[#ffb8b8] px-4 text-sm font-extrabold text-[#220f1d] hover:bg-[#ffd1d1]"
                    onClick={pageNotice.action.onClick}
                  >
                    {pageNotice.action.label}
                  </Button>
                ) : null}
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-current/25 text-base font-extrabold opacity-80 transition hover:opacity-100"
                  onClick={clearPageNotice}
                  aria-label="Dismiss message"
                >
                  x
                </button>
              </div>
            </div>
          )}

          <div data-testid="pixal3d-generator-card" className="mt-4 w-full max-w-[1420px] rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(11,20,43,0.76),rgba(7,13,32,0.9))] p-4 shadow-[0_22px_82px_rgba(0,0,0,0.18)] backdrop-blur sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(440px,0.65fr)]">
            <div
              className={`relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 transition-colors lg:min-h-[248px] lg:px-6 lg:py-6 ${
                isDragging ? "border-[#48bdff]/80 bg-[#10224d]/88" : "border-white/10 bg-[#09142d]/58 hover:border-[#48bdff]/45 hover:bg-[#0b1733]/76"
              }`}
              onClick={() => document.getElementById("pixal3d-image")?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                handleFiles(event.dataTransfer.files);
              }}
              onPaste={(event) => {
                const files = Array.from(event.clipboardData.files);
                if (files.length) handleFiles(files);
              }}
              tabIndex={0}
            >
              <Input
                id="pixal3d-image"
                data-testid="pixal3d-image-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.bmp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readFileAsDataUrl(file);
                  event.currentTarget.value = "";
                }}
              />
              {imageDataUrl ? (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="relative">
                    <img
                      src={imageDataUrl}
                      alt={t.pixal3d.generator.imagePreviewAlt}
                      className="h-36 w-36 rounded-lg border border-[#3b4668] object-cover shadow-2xl"
                    />
                    <button
                      type="button"
                      className="absolute -right-3 -top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#17223d] text-white shadow-lg transition-colors hover:bg-[#25314f]"
                      onClick={(event) => {
                        event.stopPropagation();
                        setImageDataUrl("");
                        setImageName("");
                        setGeneratedModelUrl("");
                        setIsGlbPreviewOpen(false);
                        setTaskStatus("idle");
                        setTaskMessage(t.pixal3d.generator.status.idle);
                      }}
                      aria-label={t.pixal3d.generator.removeImage}
                    >
                      <span aria-hidden="true">x</span>
                    </button>
                  </div>
                  <div>
                    <p className="max-w-[520px] truncate text-2xl font-bold text-[#d9dfef]">{imageName}</p>
                    <p className="mt-2 text-base text-[#8f9ab4]">{t.pixal3d.generator.imageHint}</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[28px] font-extrabold text-[#d4dbec]">{t.pixal3d.generator.uploadButton}</p>
                  <p className="mt-2 text-base font-medium text-[#8e99b3]">{t.pixal3d.generator.dragDropPaste}</p>
                  <div className="mt-6 flex w-full max-w-[360px] items-center gap-4">
                    <span className="h-px flex-1 bg-white/10" />
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#7f889e]">
                      {t.pixal3d.generator.orLabel}
                    </p>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                  <Button
                    type="button"
                    className="mt-6 h-14 w-full max-w-[360px] rounded-full border border-[#48bdff]/35 bg-[#101b36] text-xl font-bold text-[#e8f1ff] shadow-[0_14px_38px_rgba(72,189,255,0.08)] transition hover:border-[#48bdff]/70 hover:bg-[#152342] hover:shadow-[0_18px_48px_rgba(72,189,255,0.14)]"
                    disabled={isReadingFile}
                  >
                    {isReadingFile ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
                    {t.pixal3d.generator.selectFileButton}
                  </Button>
                  <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
                    <p className="text-lg font-semibold text-[#7f889e]">{t.pixal3d.generator.samplePrompt}</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {SAMPLE_IMAGES.map((sample) => (
                        <button
                          key={sample.src}
                          type="button"
                          className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-1 transition hover:border-[#48bdff]/70 hover:bg-[#172341]"
                          onClick={(event) => {
                            event.stopPropagation();
                            useSampleImage(sample);
                          }}
                          aria-label={`${t.pixal3d.generator.useSample} ${sample.name}`}
                        >
                          <img src={sample.src} alt="" className="h-full w-full rounded-xl object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <aside
              data-testid="pixal3d-example-result"
              className="relative flex min-h-[320px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(72,189,255,0.14),transparent_42%),linear-gradient(180deg,rgba(12,25,52,0.86),rgba(7,13,32,0.92))] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.16)] lg:min-h-[248px]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7ee7ff]">
                  {t.pixal3d.generator.exampleResultTitle}
                </p>
              </div>

              <div className="grid flex-1 grid-cols-[minmax(0,0.8fr)_auto_minmax(0,1fr)] items-center gap-3 py-4">
                <div>
                  <div className="aspect-square overflow-visible">
                    <img
                      src={DEFAULT_EXAMPLE_RESULT.transparentSrc ?? DEFAULT_EXAMPLE_RESULT.src}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>

                <div aria-hidden="true" className="mt-7 flex h-10 w-10 items-center justify-center rounded-full border border-[#00f08a]/35 bg-[#00f08a]/10 shadow-[0_0_28px_rgba(0,240,138,0.14)]">
                  <span className="relative block h-0.5 w-5 rounded-full bg-[#82ffd1]">
                    <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-r-2 border-t-2 border-[#82ffd1]" />
                  </span>
                </div>

                <div>
                  <div
                    data-testid="pixal3d-example-model-viewer-wrap"
                    className="aspect-[1.08] overflow-visible"
                  >
                    {createElement("model-viewer", {
                      "data-testid": "pixal3d-example-model-viewer",
                      src: DEFAULT_EXAMPLE_RESULT.modelUrl,
                      alt: t.pixal3d.generator.exampleModelLabel,
                      "auto-rotate": true,
                      "auto-rotate-delay": "0",
                      "rotation-per-second": "24deg",
                      "camera-orbit": "35deg 72deg auto",
                      "interaction-prompt": "none",
                      "shadow-intensity": "0.8",
                      exposure: "1",
                      "environment-image": "neutral",
                      loading: "eager",
                      className: "block h-full w-full",
                      style: { width: "100%", height: "100%", background: "transparent" },
                    })}
                  </div>
                </div>
              </div>
            </aside>
            </div>

            <div className="mt-4 rounded-xl bg-white/[0.025] px-3 py-3">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className={`grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:max-w-[820px] ${
                  canEditGenerationSettings ? "" : "opacity-55"
                }`}>
                  <label className="flex min-w-0 flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-normal text-[#8996b2]">{t.pixal3d.generator.settings.resolution}</span>
                    <div className="relative">
                      <select
                        data-testid="pixal3d-resolution-select"
                        value={settings.resolution}
                        disabled={!canEditGenerationSettings}
                        onChange={(event) => updateSetting("resolution", Number(event.target.value) as ResolutionOption)}
                        className="h-10 w-full appearance-none rounded-full border border-white/10 bg-[#0d1730]/78 pl-4 pr-11 text-sm font-semibold text-[#dbe1f2] outline-none transition hover:border-[#48bdff]/55 focus:border-[#48bdff] disabled:opacity-60"
                      >
                        {RESOLUTION_OPTIONS.map((option) => (
                          <option
                            key={option}
                            value={option}
                            disabled={Boolean(planEntitlement && option > planEntitlement.maxResolution)}
                          >
                            {option}
                          </option>
                        ))}
                      </select>
                      <span aria-hidden="true" className="pointer-events-none absolute right-5 top-1/2 h-2.5 w-2.5 -translate-y-[65%] rotate-45 border-b-2 border-r-2 border-[#dbe1f2]/78" />
                    </div>
                  </label>
                  <label className="flex min-w-0 flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-normal text-[#8996b2]">{t.pixal3d.generator.settings.textureSize}</span>
                    <div className="relative">
                      <select
                        data-testid="pixal3d-texture-size-select"
                        value={settings.textureSize}
                        disabled={!canEditGenerationSettings}
                        onChange={(event) => updateSetting("textureSize", Number(event.target.value) as TextureSizeOption)}
                        className="h-10 w-full appearance-none rounded-full border border-white/10 bg-[#0d1730]/78 pl-4 pr-11 text-sm font-semibold text-[#dbe1f2] outline-none transition hover:border-[#48bdff]/55 focus:border-[#48bdff] disabled:opacity-60"
                      >
                        {TEXTURE_SIZE_OPTIONS.map((option) => (
                          <option
                            key={option}
                            value={option}
                            disabled={Boolean(planEntitlement && option > planEntitlement.maxTextureSize)}
                          >
                            {option}
                          </option>
                        ))}
                      </select>
                      <span aria-hidden="true" className="pointer-events-none absolute right-5 top-1/2 h-2.5 w-2.5 -translate-y-[65%] rotate-45 border-b-2 border-r-2 border-[#dbe1f2]/78" />
                    </div>
                  </label>
                  <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 lg:col-span-1">
                    <span className="text-xs font-bold uppercase tracking-normal text-[#8996b2]">{t.pixal3d.generator.settings.advanceSettings}</span>
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="pixal3d-advanced-settings-toggle"
                      className={`h-10 justify-between rounded-full px-4 text-sm font-semibold shadow-none transition hover:text-white ${
                        isAdvancedSettingsOpen
                          ? "border-[#48bdff]/70 bg-[#113555]/82 text-white shadow-[0_10px_28px_rgba(72,189,255,0.12)]"
                          : "border-white/10 bg-[#0d1730]/78 text-[#dbe1f2] hover:border-[#48bdff]/55 hover:bg-[#14213e]"
                      }`}
                      disabled={!canEditGenerationSettings}
                      aria-expanded={isAdvancedSettingsOpen}
                      onClick={() => setIsAdvancedSettingsOpen((open) => !open)}
                    >
                      <span className="flex min-w-0 flex-col items-start leading-none">
                        <span>{isAdvancedSettingsOpen ? t.pixal3d.generator.settings.hideAdvanceSettings : t.pixal3d.generator.settings.showAdvanceSettings}</span>
                        <span className="mt-0.5 text-[11px] font-semibold text-[#8996b2]">
                          {t.pixal3d.generator.settings.advancedSettingsSummary}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`ml-4 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-lg leading-none transition ${
                          isAdvancedSettingsOpen
                            ? "border-[#48bdff] bg-[#48bdff] text-[#051021]"
                            : "border-white/10 bg-white/[0.04] text-[#dbe1f2]"
                        }`}
                      >
                        {isAdvancedSettingsOpen ? "-" : "+"}
                      </span>
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="group relative flex w-full flex-col items-stretch sm:w-auto">
                  <Button
                    data-testid="pixal3d-generate-button"
                    size="lg"
                    className="h-14 rounded-full bg-gradient-to-r from-[#48bdff] to-[#00f08a] px-8 text-xl font-extrabold text-[#051021] shadow-[0_20px_58px_rgba(0,240,138,0.22)] transition hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_24px_70px_rgba(0,240,138,0.28)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canGenerate}
                    aria-describedby={generateDisabledReason ? "pixal3d-generate-disabled-reason" : undefined}
                    onClick={handleGenerate}
                  >
                    {taskStatus === "processing" ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#051021]/30 border-t-[#051021]" />
                    ) : (
                      <span aria-hidden="true" className="text-2xl leading-none">+</span>
                    )}
                    {taskStatus === "processing" ? t.pixal3d.generator.generatingButton : t.pixal3d.generator.generateButton}
                  </Button>
                  {!canGenerate && generateDisabledReason ? (
                    <p
                      id="pixal3d-generate-disabled-reason"
                      data-testid="pixal3d-generate-disabled-reason"
                      className="mt-2 text-center text-sm font-bold leading-5 text-[#ffb8b8]"
                    >
                      <span>{generateDisabledReason}</span>
                      {showGenerateUpgradeShortcut ? (
                        <Link
                          href={localizedPath("/pricing")}
                          className="ml-2 inline-flex items-center rounded-full border border-[#ffb8b8]/45 px-3 py-1 text-xs font-extrabold text-[#ffd0d0] transition hover:border-[#ffdddd] hover:bg-[#ffb8b8]/12 hover:text-white"
                        >
                          Upgrade
                        </Link>
                      ) : null}
                    </p>
                  ) : null}
                </div>
                </div>
              </div>

              {isAdvancedSettingsOpen && (
                <div
                  data-testid="pixal3d-advanced-settings-panel"
                  className="mt-5 rounded-lg border border-[#48bdff]/55 bg-[#0a1430]/92 p-4 shadow-[0_20px_80px_rgba(72,189,255,0.12)]"
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {ADVANCED_SETTING_FIELDS.map((field) => (
                      <label key={field.key} className="flex min-w-0 flex-col gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-normal text-[#aeb6ca]">
                          {t.pixal3d.generator.settings.fields[field.key]}
                        </span>
                        <Input
                          data-testid={`pixal3d-setting-${field.key}`}
                          type="number"
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={settings[field.key]}
                          disabled={!canEditGenerationSettings}
                          onChange={(event) => updateNumberSetting(field.key, event.target.value)}
                          className="h-11 rounded-md border-[#313b59] bg-[#121a30] text-base font-bold text-[#dbe1f2] outline-none focus:border-[#48bdff] disabled:opacity-60"
                        />
                      </label>
                    ))}
                    <div className="flex min-w-0 flex-col gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-normal text-[#aeb6ca]">
                        {t.pixal3d.generator.settings.fields.remesh}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.remesh}
                        data-testid="pixal3d-setting-remesh"
                        disabled={!canEditGenerationSettings}
                        onClick={() => updateSetting("remesh", !settings.remesh)}
                        className={`flex h-11 items-center justify-between rounded-md border px-4 text-sm font-extrabold transition disabled:opacity-60 ${
                          settings.remesh
                            ? "border-[#48bdff] bg-[#123e65] text-white"
                            : "border-[#313b59] bg-[#121a30] text-[#aeb6ca]"
                        }`}
                      >
                        <span>{settings.remesh ? t.pixal3d.generator.settings.on : t.pixal3d.generator.settings.off}</span>
                        <span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${
                          settings.remesh ? "justify-end bg-[#48bdff]" : "justify-start bg-[#28324f]"
                        }`}>
                          <span className="h-4 w-4 rounded-full bg-white" />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {showGenerationProgress && progressSnapshot && (
            <div
              data-testid="pixal3d-generation-progress"
              className={`mt-6 w-full max-w-[1420px] rounded-lg border px-5 py-5 shadow-[0_24px_90px_rgba(0,0,0,0.18)] ${
                progressSnapshot.status === "failed"
                  ? "border-[#ff6b6b]/60 bg-[#1e0f1a]/90"
                  : "border-[#25314f] bg-[#080f24]/92"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#7fdaff]">
                    {t.pixal3d.generator.progress.title}
                  </p>
                  <h2 className={`mt-2 text-2xl font-extrabold ${
                    progressSnapshot.status === "failed" ? "text-[#ff9b9b]" : "text-[#8ea2ff]"
                  }`}>
                    {progressSnapshot.status === "succeeded"
                      ? t.pixal3d.generator.progress.completedTitle
                      : taskStatus === "checking"
                        ? t.pixal3d.generator.progress.checkingTitle
                        : progressSnapshot.status === "failed"
                          ? t.pixal3d.generator.progress.failedTitle
                          : progressStepLabels[progressSnapshot.currentStepKey]}
                  </h2>
                </div>
                <div className="text-lg font-bold text-[#aeb6ca]">
                  {progressSnapshot.status === "succeeded"
                    ? `${PIXAL3D_PROGRESS_STEPS.length}/${PIXAL3D_PROGRESS_STEPS.length}`
                    : `${progressSnapshot.currentStepIndex + 1}/${PIXAL3D_PROGRESS_STEPS.length}`}
                </div>
                {progressSnapshot.status === "succeeded" && generatedModelUrl && (
                  <Button
                    type="button"
                    data-testid="pixal3d-preview-model-button"
                    className="h-11 rounded-full bg-[#48bdff] px-5 text-sm font-extrabold text-[#051021] hover:bg-[#71ccff]"
                    onClick={() => setIsGlbPreviewOpen(true)}
                  >
                    {t.pixal3d.generator.previewModelButton}
                  </Button>
                )}
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#1a2235]">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${
                    progressSnapshot.status === "failed"
                      ? "bg-[#ff6b6b]"
                      : "bg-gradient-to-r from-[#8ea2ff] via-[#48bdff] to-[#00f08a]"
                  }`}
                  style={{ width: `${progressSnapshot.percent}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-bold text-[#828aa4]">
                <span>{progressSnapshot.percent}%</span>
                <span>
                  {progressSnapshot.status === "failed"
                    ? taskMessage
                    : taskStatus === "checking"
                      ? taskMessage
                      : progressSnapshot.status === "succeeded"
                        ? t.pixal3d.generator.progress.completedTitle
                        : progressStepLabels[progressSnapshot.currentStepKey]}
                </span>
              </div>

            </div>
          )}

          {generatedModelUrl && (
            <GlbPreviewDialog
              open={isGlbPreviewOpen}
              modelUrl={generatedModelUrl}
              title={t.pixal3d.generator.previewTitle}
              closeLabel={t.pixal3d.generator.closePreviewButton}
              downloadLabel={t.pixal3d.generator.downloadModelButton}
              loadingLabel={t.pixal3d.generator.previewLoading}
              errorTitle={t.pixal3d.generator.previewErrorTitle}
              errorDescription={t.pixal3d.generator.previewErrorDescription}
              onClose={() => setIsGlbPreviewOpen(false)}
            />
          )}

          {isHfTrialModalOpen && (
            <div
              data-testid="pixal3d-hf-trial-modal"
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#020715]/85 p-3 backdrop-blur-sm sm:p-6"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="pixal3d-hf-trial-title"
                className="flex h-[94vh] w-full max-w-[1440px] flex-col overflow-hidden rounded-lg border border-[#25314f] bg-[#070d20] shadow-[0_28px_120px_rgba(0,0,0,0.42)]"
              >
                <div
                  data-testid="pixal3d-hf-trial-header"
                  className="flex flex-col gap-4 border-b border-[#25314f] px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <h2 id="pixal3d-hf-trial-title" className="text-lg font-extrabold text-white">
                      {t.pixal3d.generator.hfTrialTitle}
                    </h2>
                    <p className="mt-1 text-sm font-medium leading-6 text-[#9ec8ff] lg:whitespace-nowrap">
                      {t.pixal3d.generator.hfTrialStartHint}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:items-center">
                    {hfTrialUrl ? (
                      <div
                        data-testid="pixal3d-hf-trial-timer"
                        className="inline-flex min-w-[220px] items-center justify-center rounded-2xl border border-[#2dd6ff]/45 bg-[linear-gradient(135deg,rgba(48,194,255,0.26),rgba(7,18,42,0.9))] px-5 py-3 shadow-[0_0_36px_rgba(72,189,255,0.2)] backdrop-blur-md"
                      >
                        <span className="text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#b5f4ff]">
                          {t.pixal3d.generator.hfTrialTimeLeft}
                        </span>
                        <span className="ml-3 text-[1.5rem] font-extrabold leading-none text-[#59e6ff] sm:text-[1.65rem]">
                          {formatTrialTime(hfTrialSecondsLeft)}
                        </span>
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10 rounded-full px-4 text-[#aeb6ca] hover:bg-white/10 hover:text-white"
                      onClick={closeHfTrial}
                    >
                      <span aria-hidden="true">x</span>
                      {t.pixal3d.generator.hfTrialClose}
                    </Button>
                  </div>
                </div>

                <div data-testid="pixal3d-hf-trial-body" className="relative min-h-0 flex-1 bg-[#0b0f1a]">
                  {hfTrialUrl ? (
                    <iframe
                      data-testid="pixal3d-hf-trial-iframe"
                      title={t.pixal3d.generator.hfTrialTitle}
                      src={hfTrialUrl}
                      className="h-full min-h-[520px] w-full bg-[#0b0f1a]"
                      allow="clipboard-read; clipboard-write"
                      sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
                      referrerPolicy="no-referrer"
                      onLoad={() => setIsHfTrialFrameLoading(false)}
                    />
                  ) : null}

                  {(isOpeningHfTrial || isHfTrialFrameLoading) && (
                    <div
                      className="absolute inset-0 z-10 flex items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(72,189,255,0.14),rgba(7,13,32,0.96)_58%,rgba(7,13,32,1))] px-6 text-center"
                      data-testid="pixal3d-hf-trial-loading"
                    >
                      <div className="w-full max-w-xl rounded-lg border border-[#48bdff]/25 bg-[#0a1530]/88 px-6 py-8 shadow-[0_24px_90px_rgba(0,0,0,0.36)]">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#48bdff]/30 bg-[#10264f] shadow-[0_0_42px_rgba(72,189,255,0.22)]">
                          <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#48bdff]/25 border-t-[#48bdff]" />
                        </div>
                        <h3 className="mt-6 text-2xl font-extrabold tracking-normal text-white">
                          {isOpeningHfTrial
                            ? t.pixal3d.generator.hfTrialFindingTitle
                            : t.pixal3d.generator.hfTrialLoadingTitle}
                        </h3>
                        <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[#aeb6ca]">
                          {isOpeningHfTrial
                            ? t.pixal3d.generator.hfTrialFindingDescription
                            : t.pixal3d.generator.hfTrialLoadingDescription}
                        </p>
                        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-[#48bdff] via-[#28e4cf] to-[#00f08a]" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div id="features" className="mt-8 w-full max-w-[1420px] scroll-mt-24 border-t border-[#25314f] pt-8">
            <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-[#aeb6ca]">
              {t.pixal3d.advantages.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-normal text-white sm:text-4xl">
              {t.pixal3d.advantages.title}
            </h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {ADVANTAGE_KEYS.map((key) => (
                <article
                  key={key}
                  className="min-h-[118px] rounded-lg border border-[#25314f] bg-[#0b1426]/88 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.14)]"
                >
                  <h3 className="text-lg font-extrabold tracking-normal text-white">
                    {t.pixal3d.advantages.items[key].title}
                  </h3>
                  <p className="mt-3 text-base leading-7 tracking-normal text-[#aeb6ca]">
                    {t.pixal3d.advantages.items[key].description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-10 w-full max-w-[1420px] border-t border-[#25314f] pt-8">
            <div className="text-center">
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#00d884]">
                {t.pixal3d.inspiration.eyebrow}
              </p>
              <h2 className="mt-4 text-xl font-medium tracking-normal text-[#c6cbda] sm:text-2xl">
                {t.pixal3d.inspiration.title}
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:gap-x-8">
              {INSPIRATION_IMAGES.map((item, index) => (
                (() => {
                  const isActive = activeInspirationId === item.id;
                  return (
                    <button
                      key={`${item.id}-${index}`}
                      type="button"
                      className="group relative flex min-h-[144px] items-center justify-center rounded-2xl outline-none transition-transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#00f08a]"
                      onMouseEnter={() => setActiveInspirationId(item.id)}
                      onMouseLeave={() => setActiveInspirationId((current) => (current === item.id ? null : current))}
                      onFocus={() => setActiveInspirationId(item.id)}
                      onBlur={() => setActiveInspirationId((current) => (current === item.id ? null : current))}
                      onClick={() => {
                        useSampleImage(item);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      aria-label={`${t.pixal3d.inspiration.generateSimilar} ${item.name}`}
                    >
                      <span className={`absolute inset-x-7 bottom-4 h-12 rounded-full blur-2xl transition-opacity ${
                        isActive ? "bg-[#48bdff]/30 opacity-100" : "bg-[#00f08a]/10 opacity-0 group-hover:opacity-100"
                      }`} />
                      <span className={`relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[28px] border shadow-[0_18px_28px_rgba(0,0,0,0.28)] transition-all sm:h-32 sm:w-32 ${
                        isActive
                          ? "border-[#48bdff]/65 bg-[#0c1831]"
                          : "border-[#22304f] bg-[#0f1831]"
                      }`}>
                        <img
                          src={item.src}
                          alt=""
                          className={`absolute inset-0 h-full w-full object-cover transition duration-300 ${
                            isActive ? "scale-[0.94] opacity-0" : "scale-100 opacity-100"
                          }`}
                        />
                        {isActive && item.modelUrl ? (
                          <span className="absolute inset-0 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_50%_18%,rgba(72,189,255,0.12),transparent_42%),#091426]">
                            {createElement("model-viewer", {
                              src: item.modelUrl,
                              "auto-rotate": true,
                              "rotation-per-second": "28deg",
                              "camera-orbit": "35deg 75deg auto",
                              "interaction-prompt": "none",
                              "shadow-intensity": "0.8",
                              exposure: "1",
                              "environment-image": "neutral",
                              loading: "eager",
                              style: { width: "100%", height: "100%", pointerEvents: "none" },
                            })}
                          </span>
                        ) : null}
                      </span>
                      {isActive ? (
                        <span className="absolute -bottom-2 left-1/2 hidden w-[184px] -translate-x-1/2 rounded-lg border border-[#2a5279] bg-[#081425] px-4 py-2 text-xs font-semibold leading-5 text-[#d8f4ff] shadow-[0_12px_30px_rgba(0,0,0,0.22)] md:inline-flex md:justify-center">
                          {t.pixal3d.inspiration.generateSimilar}
                        </span>
                      ) : null}
                    </button>
                  );
                })()
              ))}
            </div>
          </div>

          <div className="mt-12 w-full max-w-[1420px] border-t border-[#25314f] pt-10">
            <div>
              <h2 className="text-4xl font-extrabold tracking-normal text-white sm:text-5xl">
                {t.pixal3d.faq.title}
              </h2>
            </div>
            <div className="mt-6 space-y-3">
              {FAQ_KEYS.map((key) => (
                <details
                  key={key}
                  open
                  className="group overflow-hidden rounded-xl border border-[#25314f] bg-[#0b1426]/88 shadow-[0_18px_50px_rgba(0,0,0,0.14)]"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-lg font-extrabold text-white marker:hidden">
                    <span
                      aria-hidden="true"
                      className="text-sm text-white/85 transition-transform group-open:rotate-90"
                    >
                      &gt;
                    </span>
                    <span>{t.pixal3d.faq.items[key].question}</span>
                  </summary>
                  <div className="border-t border-[#1b2740] px-5 py-4 text-lg leading-8 text-[#aeb6ca]">
                    {t.pixal3d.faq.items[key].answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
