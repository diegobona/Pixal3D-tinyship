"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type TaskStatus = "idle" | "upload-ready" | "processing" | "succeeded" | "failed";
type ResolutionOption = 1024 | 1536;
type TextureSizeOption = 1024 | 2048 | 4096 | 8192;
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
const FREE_TRIAL_DURATION_SECONDS = 10 * 60;
const RESOLUTION_OPTIONS: ResolutionOption[] = [1024, 1536];
const TEXTURE_SIZE_OPTIONS: TextureSizeOption[] = [1024, 2048, 4096, 8192];
const RESOLUTION_CREDIT_COST: Record<ResolutionOption, number> = {
  1024: 1100,
  1536: 1600,
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
const SAMPLE_IMAGES = [
  { name: "Bunny mascot", src: "/samples/pixal3d-bunny.svg" },
  { name: "Mushroom merchant", src: "/samples/pixal3d-mushroom.svg" },
  { name: "Retro console", src: "/samples/pixal3d-console.svg" },
  { name: "Fantasy dwarf", src: "/samples/pixal3d-dwarf.svg" },
];
const INSPIRATION_IMAGES = [
  SAMPLE_IMAGES[0],
  SAMPLE_IMAGES[2],
  SAMPLE_IMAGES[1],
  SAMPLE_IMAGES[3],
  SAMPLE_IMAGES[2],
  SAMPLE_IMAGES[1],
  SAMPLE_IMAGES[3],
  SAMPLE_IMAGES[0],
  SAMPLE_IMAGES[1],
  SAMPLE_IMAGES[3],
  SAMPLE_IMAGES[0],
  SAMPLE_IMAGES[2],
];
const ADVANTAGE_KEYS = [
  "faithful",
  "pixelAligned",
  "geometry",
  "pbr",
  "fast",
] as const;

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
  const [creditBalance, setCreditBalance] = useState(0);
  const [subscriptionPlanId, setSubscriptionPlanId] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<PageNotice | null>(null);
  const hfTrialPanelRef = useRef<HTMLDivElement | null>(null);

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
  const generateDisabledTooltip = !isAuthenticated || !hasEnoughCredits
    ? t.pixal3d.generator.errors.generateDisabledInsufficientCredits
    : undefined;

  const progressStepLabels = t.pixal3d.generator.progress.steps as Record<Pixal3DProgressStepKey, string>;
  const showGenerationProgress = Boolean(progressSnapshot && taskStatus !== "idle" && taskStatus !== "upload-ready");

  useEffect(() => {
    setTaskMessage(t.pixal3d.generator.status.idle);
  }, [t.pixal3d.generator.status.idle]);

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

  useEffect(() => {
    let isMounted = true;

    const loadCreditStatus = async () => {
      try {
        const response = await fetch("/api/credits/status", { cache: "no-store" });
        if (!response.ok) {
          if (isMounted) {
            setCreditBalance(0);
            setSubscriptionPlanId(null);
          }
          return;
        }

        const data = (await response.json()) as CreditStatusResponse;
        if (isMounted) {
          setCreditBalance(Number(data.credits?.balance || 0));
          setSubscriptionPlanId(data.subscription?.planId || null);
        }
      } catch {
        if (isMounted) {
          setCreditBalance(0);
          setSubscriptionPlanId(null);
        }
      }
    };

    loadCreditStatus();

    return () => {
      isMounted = false;
    };
  }, []);

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
    setHfTrialUrl("");
    setHfTrialQueueSize(null);
    setHfTrialSecondsLeft(0);
    setHfTrialEndsAt(null);
  };

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

  const useSampleImage = (sample: (typeof SAMPLE_IMAGES)[number]) => {
    clearPageNotice();
    setImageDataUrl(`${window.location.origin}${sample.src}`);
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
      const response = await fetch(`/api/3d-generate/status?${searchParams.toString()}`);
      const data = (await response.json()) as StatusResponse;

      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.message || t.pixal3d.generator.errors.statusFailed);
      }

      if (data.data.status === "succeeded" && data.data.result?.modelUrl) {
        return data.data.result.modelUrl;
      }

      if (data.data.status === "failed") {
        throw new Error(data.data.errorMessage || t.pixal3d.generator.errors.generationFailed);
      }

      setTaskMessage(t.pixal3d.generator.status.processing);
    }

    throw new Error(t.pixal3d.generator.errors.timeout);
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

      const modelUrl = await pollTask(data.data);
      setGeneratedModelUrl(modelUrl);
      completeProgress(nextProgressPlan, nextProgressStartedAt, "succeeded");
      setIsGlbPreviewOpen(true);
      setTaskStatus("succeeded");
      setTaskMessage(t.pixal3d.generator.status.succeeded);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.pixal3d.generator.errors.generationFailed;
      setTaskStatus("failed");
      setTaskMessage(message);
      completeProgress(nextProgressPlan, nextProgressStartedAt, "failed");
      showPageNotice("error", t.pixal3d.generator.errors.generationFailed, { description: message });
    }
  };

  const handleOpenHfTrial = async () => {
    setIsOpeningHfTrial(true);
    clearPageNotice();

    try {
      const response = await fetch("/api/hf-pixal3d-instance", {
        method: "GET",
        headers: { accept: "application/json" },
      });
      const data = (await response.json()) as HfInstanceResponse;

      if (response.status === 429 && data.error === "free_trial_limit_reached") {
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

      setHfTrialUrl(data.data.selected.url);
      setHfTrialQueueSize(data.data.selected.queueSize);
      setHfTrialSecondsLeft(FREE_TRIAL_DURATION_SECONDS);
      setHfTrialEndsAt(Date.now() + FREE_TRIAL_DURATION_SECONDS * 1000);
      window.setTimeout(() => {
        hfTrialPanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.pixal3d.generator.errors.freeTrialBusy;
      showPageNotice("error", t.pixal3d.generator.errors.freeTrialBusy, { description: message });
    } finally {
      setIsOpeningHfTrial(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#071431] text-white">
      <section className="relative min-h-[calc(100vh-4rem)] border-l border-r border-[#2b3657] bg-[radial-gradient(circle_at_50%_-10%,rgba(22,91,173,0.22),transparent_42%),linear-gradient(180deg,#071431_0%,#0a1737_46%,#071431_100%)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1420px] flex-col items-center">
          <div className="mb-9 text-center">
            <h1 className="bg-gradient-to-r from-[#48bdff] via-[#28e4cf] to-[#00f08a] bg-clip-text text-5xl font-extrabold tracking-normal text-transparent sm:text-6xl">
              {t.pixal3d.generator.heroTitle}
            </h1>
            <p className="mt-4 text-xl font-medium tracking-normal text-[#9ca4ba] sm:text-2xl">
              {t.pixal3d.generator.subtitle}
            </p>
          </div>

          <div className="w-full max-w-[1420px] rounded-lg border border-[#4b5575] bg-[#070d20]/92 p-6 shadow-[0_28px_120px_rgba(0,0,0,0.26)] sm:p-8">
            <div
              className={`relative flex min-h-[292px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed transition-colors ${
                isDragging ? "border-[#48bdff] bg-[#10224d]" : "border-transparent bg-transparent"
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
                    <p className="mt-2 text-base text-[#828aa4]">{t.pixal3d.generator.imageHint}</p>
                  </div>
                </div>
              ) : (
                <>
                  <span aria-hidden="true" className="text-6xl font-light text-[#aeb6ca]">+</span>
                  <p className="mt-9 text-3xl font-extrabold text-[#b7bdce]">{t.pixal3d.generator.uploadButton}</p>
                  <p className="mt-5 text-xl font-medium text-[#757f9b]">{t.pixal3d.generator.dragDropPaste}</p>
                  <Button
                    type="button"
                    className="mt-20 h-16 w-full max-w-[390px] rounded-full border border-[#313b59] bg-[#141b31] text-2xl font-bold text-[#dbe1f2] hover:bg-[#1a2440]"
                    disabled={isReadingFile}
                  >
                    {isReadingFile ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
                    {t.pixal3d.generator.selectFileButton}
                  </Button>
                  <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
                    <p className="text-xl font-semibold text-[#7f889e]">{t.pixal3d.generator.samplePrompt}</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {SAMPLE_IMAGES.map((sample) => (
                        <button
                          key={sample.src}
                          type="button"
                          className="h-[72px] w-[72px] overflow-hidden rounded-2xl border border-[#35415f] bg-[#10182d] p-1 transition hover:border-[#48bdff] hover:bg-[#172341]"
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

            <div className="mt-7 border-t border-[#303a59] pt-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className={`grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:max-w-[820px] ${
                  canEditGenerationSettings ? "" : "opacity-55"
                }`}>
                  <label className="flex min-w-0 flex-col gap-2">
                    <span className="text-sm font-extrabold text-[#d9dfef]">{t.pixal3d.generator.settings.resolution}</span>
                    <select
                      data-testid="pixal3d-resolution-select"
                      value={settings.resolution}
                      disabled={!canEditGenerationSettings}
                      onChange={(event) => updateSetting("resolution", Number(event.target.value) as ResolutionOption)}
                      className="h-12 rounded-full border border-[#313b59] bg-[#121a30] px-5 text-base font-bold text-[#dbe1f2] outline-none transition hover:border-[#48bdff] focus:border-[#48bdff] disabled:opacity-60"
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
                  </label>
                  <label className="flex min-w-0 flex-col gap-2">
                    <span className="text-sm font-extrabold text-[#d9dfef]">{t.pixal3d.generator.settings.textureSize}</span>
                    <select
                      data-testid="pixal3d-texture-size-select"
                      value={settings.textureSize}
                      disabled={!canEditGenerationSettings}
                      onChange={(event) => updateSetting("textureSize", Number(event.target.value) as TextureSizeOption)}
                      className="h-12 rounded-full border border-[#313b59] bg-[#121a30] px-5 text-base font-bold text-[#dbe1f2] outline-none transition hover:border-[#48bdff] focus:border-[#48bdff] disabled:opacity-60"
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
                  </label>
                  <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 lg:col-span-1">
                    <span className="text-sm font-extrabold text-[#d9dfef]">{t.pixal3d.generator.settings.advanceSettings}</span>
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="pixal3d-advanced-settings-toggle"
                      className={`h-12 justify-between rounded-full px-5 text-base font-bold shadow-[0_10px_32px_rgba(0,0,0,0.12)] transition hover:text-white ${
                        isAdvancedSettingsOpen
                          ? "border-[#48bdff] bg-[#113555] text-white shadow-[0_14px_38px_rgba(72,189,255,0.18)]"
                          : "border-[#313b59] bg-[#121a30] text-[#dbe1f2] hover:border-[#48bdff] hover:bg-[#172341]"
                      }`}
                      disabled={!canEditGenerationSettings}
                      aria-expanded={isAdvancedSettingsOpen}
                      onClick={() => setIsAdvancedSettingsOpen((open) => !open)}
                    >
                      <span className="flex min-w-0 flex-col items-start leading-none">
                        <span>{isAdvancedSettingsOpen ? t.pixal3d.generator.settings.hideAdvanceSettings : t.pixal3d.generator.settings.showAdvanceSettings}</span>
                        <span className="mt-1 text-xs font-semibold text-[#aeb6ca]">
                          {t.pixal3d.generator.settings.advancedSettingsSummary}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`ml-4 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xl leading-none transition ${
                          isAdvancedSettingsOpen
                            ? "border-[#48bdff] bg-[#48bdff] text-[#051021]"
                            : "border-[#3c4668] bg-[#18223d] text-[#dbe1f2]"
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
                    className="h-14 rounded-full bg-gradient-to-r from-[#48bdff] to-[#00f08a] px-8 text-xl font-extrabold text-[#051021] shadow-[0_18px_55px_rgba(0,240,138,0.18)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canGenerate}
                    onClick={handleGenerate}
                  >
                    {taskStatus === "processing" ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#051021]/30 border-t-[#051021]" />
                    ) : (
                      <span aria-hidden="true" className="text-2xl leading-none">+</span>
                    )}
                    {taskStatus === "processing" ? t.pixal3d.generator.generatingButton : t.pixal3d.generator.generateButton}
                  </Button>
                  {!canGenerate && generateDisabledTooltip ? (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 z-20 w-max max-w-[calc(100vw-48px)] -translate-x-1/2 rounded-lg border border-[#48bdff]/45 bg-[#10152a]/98 px-4 py-3 text-center text-xs font-semibold leading-5 text-[#d8f4ff] opacity-0 shadow-[0_20px_70px_rgba(72,189,255,0.18)] transition duration-200 group-focus-within:opacity-100 group-hover:opacity-100"
                    >
                      {generateDisabledTooltip}
                      <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-[#48bdff]/45 bg-[#10152a]" />
                    </div>
                  ) : null}
                </div>
                <div className="group relative flex w-full flex-col items-stretch sm:w-[300px]">
                  <Button
                    data-testid="pixal3d-free-trial-button"
                    type="button"
                    size="lg"
                    className="h-14 rounded-full border border-[#ffe08a] bg-gradient-to-r from-[#fff2a8] to-[#ffb86b] px-7 text-lg font-extrabold text-[#17111c] shadow-[0_18px_50px_rgba(255,184,107,0.22)] hover:brightness-105 disabled:opacity-60"
                    disabled={isOpeningHfTrial}
                    onClick={handleOpenHfTrial}
                  >
                    {isOpeningHfTrial ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#17111c]/30 border-t-[#17111c]" /> : null}
                    {isOpeningHfTrial ? t.pixal3d.generator.freeTrialLoading : t.pixal3d.generator.freeTrialButton}
                  </Button>
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 z-20 w-[320px] max-w-[calc(100vw-48px)] -translate-x-1/2 rounded-lg border border-[#ffe08a]/55 bg-[#10152a]/98 px-4 py-3 text-center text-xs font-semibold leading-5 text-[#f4e7c7] opacity-0 shadow-[0_20px_70px_rgba(255,184,107,0.24)] transition duration-200 group-focus-within:opacity-100 group-hover:opacity-100"
                  >
                    {t.pixal3d.generator.trialDescription}
                    <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-[#ffe08a]/55 bg-[#10152a]" />
                  </div>
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

          {showGenerationProgress && progressSnapshot && (
            <div
              data-testid="pixal3d-generation-progress"
              className={`mt-7 w-full max-w-[1420px] rounded-lg border px-5 py-5 shadow-[0_24px_90px_rgba(0,0,0,0.18)] ${
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
              onClose={() => setIsGlbPreviewOpen(false)}
            />
          )}

          {hfTrialUrl && (
            <div
              ref={hfTrialPanelRef}
              data-testid="pixal3d-hf-trial-panel"
              className="mt-7 w-full max-w-[1420px] overflow-hidden rounded-lg border border-[#25314f] bg-[#070d20]/92 shadow-[0_28px_120px_rgba(0,0,0,0.26)]"
            >
              <div className="flex flex-col gap-3 border-b border-[#25314f] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-white">{t.pixal3d.generator.hfTrialTitle}</h2>
                  {hfTrialQueueSize !== null && (
                    <p className="mt-1 text-sm text-[#aeb6ca]">
                      {t.pixal3d.generator.hfTrialQueueLabel}: {hfTrialQueueSize}
                    </p>
                  )}
                </div>
                <div className="text-sm font-bold text-[#48bdff]">
                  {t.pixal3d.generator.hfTrialTimeLeft}: {formatTrialTime(hfTrialSecondsLeft)}
                </div>
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
              <iframe
                title={t.pixal3d.generator.hfTrialTitle}
                src={hfTrialUrl}
                className="h-[860px] w-full bg-[#0b0f1a] lg:h-[960px]"
                allow="clipboard-read; clipboard-write"
                sandbox="allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
                referrerPolicy="no-referrer"
              />
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
                <button
                  key={`${item.src}-${index}`}
                  type="button"
                  className="group relative flex min-h-[112px] items-center justify-center rounded-lg outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#00f08a]"
                  onClick={() => {
                    useSampleImage(item);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  aria-label={`${t.pixal3d.inspiration.generateSimilar} ${item.name}`}
                >
                  <span className="absolute inset-x-8 bottom-3 h-10 rounded-full bg-[#00f08a]/10 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
                  <img
                    src={item.src}
                    alt=""
                    className="relative h-24 w-24 object-contain drop-shadow-[0_18px_26px_rgba(0,0,0,0.34)] transition-transform group-hover:scale-105 sm:h-28 sm:w-28"
                  />
                  {index === 1 && (
                    <span className="absolute bottom-0 left-1/2 hidden -translate-x-1/2 rounded-lg border border-[#005f4d] bg-[#06130f] px-4 py-2 text-xs font-semibold leading-5 text-[#00d884] shadow-[0_12px_30px_rgba(0,216,132,0.12)] md:inline-flex md:max-w-[190px]">
                      {t.pixal3d.inspiration.generateSimilar}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
