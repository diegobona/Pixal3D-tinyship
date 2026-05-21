"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { notify as toast } from "@/lib/notify";
import { Button } from "@libs/react-shared/ui/button";
import { Input } from "@libs/react-shared/ui/input";
import { useTranslation } from "@/hooks/use-translation";

type TaskStatus = "idle" | "upload-ready" | "processing" | "succeeded" | "failed";

interface GenerateResponse {
  success: boolean;
  data?: {
    taskId: string;
    status: "processing";
    provider: string;
    model: string;
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

const POLL_INTERVAL_MS = 1200;
const POLL_TIMEOUT_MS = 30000;
const FREE_TRIAL_DURATION_SECONDS = 10 * 60;
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
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("idle");
  const [taskMessage, setTaskMessage] = useState(t.pixal3d.generator.status.idle);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hfTrialUrl, setHfTrialUrl] = useState("");
  const [hfTrialQueueSize, setHfTrialQueueSize] = useState<number | null>(null);
  const [hfTrialSecondsLeft, setHfTrialSecondsLeft] = useState(0);
  const [hfTrialEndsAt, setHfTrialEndsAt] = useState<number | null>(null);
  const [isOpeningHfTrial, setIsOpeningHfTrial] = useState(false);
  const hfTrialPanelRef = useRef<HTMLDivElement | null>(null);

  const canGenerate = useMemo(() => {
    return Boolean(imageDataUrl && taskStatus !== "processing" && !isReadingFile);
  }, [imageDataUrl, taskStatus, isReadingFile]);

  useEffect(() => {
    setTaskMessage(t.pixal3d.generator.status.idle);
  }, [t.pixal3d.generator.status.idle]);

  useEffect(() => {
    if (!hfTrialEndsAt || !hfTrialUrl) return;

    const updateCountdown = () => {
      const nextSecondsLeft = Math.max(0, Math.ceil((hfTrialEndsAt - Date.now()) / 1000));
      setHfTrialSecondsLeft(nextSecondsLeft);

      if (nextSecondsLeft <= 0) {
        setHfTrialUrl("");
        setHfTrialQueueSize(null);
        setHfTrialEndsAt(null);
        toast.info(t.pixal3d.generator.freeTrialExpired);
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [hfTrialEndsAt, hfTrialUrl, t.pixal3d.generator.freeTrialExpired]);

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
      toast.error(t.pixal3d.generator.errors.unsupportedImage);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t.pixal3d.generator.errors.imageTooLarge);
      return;
    }

    setIsReadingFile(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("file_read_failed"));
        reader.readAsDataURL(file);
      });
      setImageDataUrl(dataUrl);
      setImageName(file.name);
      setTaskStatus("upload-ready");
      setTaskMessage(t.pixal3d.generator.status.ready);
    } catch {
      toast.error(t.pixal3d.generator.errors.uploadFailed);
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    const file = files[0];
    if (file) void readFileAsDataUrl(file);
  };

  const useSampleImage = (sample: (typeof SAMPLE_IMAGES)[number]) => {
    setImageDataUrl(`${window.location.origin}${sample.src}`);
    setImageName(sample.name);
    setTaskStatus("upload-ready");
    setTaskMessage(t.pixal3d.generator.status.ready);
  };

  const pollTask = async (taskId: string) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const response = await fetch(`/api/3d-generate/status?taskId=${encodeURIComponent(taskId)}`);
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
    if (!imageDataUrl) {
      toast.error(t.pixal3d.generator.errors.imageRequired);
      return;
    }

    setTaskStatus("processing");
    setTaskMessage(t.pixal3d.generator.status.creating);

    try {
      const response = await fetch("/api/3d-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageDataUrl,
          prompt: t.pixal3d.generator.defaultPrompt,
          quality: "standard",
        }),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.success || !data.data?.taskId) {
        if (response.status === 403 && data.error === "trial_used") {
          toast.error(t.pixal3d.generator.errors.trialUsed, {
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
          return;
        }
        if (response.status === 402) {
          toast.error(t.pixal3d.generator.errors.insufficientCredits, {
            action: {
              label: t.common.viewPlans,
              onClick: () => {
                  window.location.href = localizedPath('/pricing');
              },
            },
          });
          setTaskStatus("failed");
          setTaskMessage(t.pixal3d.generator.errors.insufficientCredits);
          return;
        }
        if (response.status === 401) {
          toast.error(t.pixal3d.generator.errors.signInRequired, {
            action: {
              label: t.common.login,
              onClick: () => {
                  window.location.href = localizedPath('/signin');
              },
            },
          });
          setTaskStatus("failed");
          setTaskMessage(t.pixal3d.generator.errors.signInRequired);
          return;
        }
        throw new Error(data.message || t.pixal3d.generator.errors.generationFailed);
      }

      await pollTask(data.data.taskId);
      setTaskStatus("succeeded");
      setTaskMessage(t.pixal3d.generator.status.succeeded);
      toast.success(t.pixal3d.generator.status.succeeded);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.pixal3d.generator.errors.generationFailed;
      setTaskStatus("failed");
      setTaskMessage(message);
      toast.error(t.pixal3d.generator.errors.generationFailed, { description: message });
    }
  };

  const handleOpenHfTrial = async () => {
    setIsOpeningHfTrial(true);

    try {
      const response = await fetch("/api/hf-pixal3d-instance", {
        method: "GET",
        headers: { accept: "application/json" },
      });
      const data = (await response.json()) as HfInstanceResponse;

      if (response.status === 429 && data.error === "free_trial_limit_reached") {
        toast.error(t.pixal3d.generator.errors.freeTrialLimitReached, {
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
      toast.success(t.pixal3d.generator.freeTrialSelected);
      window.setTimeout(() => {
        hfTrialPanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.pixal3d.generator.errors.freeTrialBusy;
      toast.error(t.pixal3d.generator.errors.freeTrialBusy, { description: message });
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

            <div className="mt-7 border-t border-[#303a59] pt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex h-12 items-center gap-3 rounded-full bg-[#48bdff] px-6 text-lg font-extrabold text-[#051021]">
                  {t.pixal3d.generator.stylePreset}
                  <span aria-hidden="true">x</span>
                </div>
                <div className="inline-flex h-12 items-center gap-3 rounded-full border border-[#313b59] bg-[#121a30] px-5 text-sm font-semibold text-[#aeb6ca]">
                  <span className="h-4 w-4 rounded-sm bg-[#123e65]" />
                  {t.pixal3d.generator.cleanTopology}
                  <span className="ml-1 inline-flex h-8 w-14 items-center justify-end rounded-full bg-[#28324f] p-1">
                    <span className="h-6 w-6 rounded-full bg-white" />
                  </span>
                </div>
                <div className="inline-flex h-12 items-center gap-3 rounded-full border border-[#313b59] bg-[#121a30] px-5 text-sm font-semibold text-[#aeb6ca]">
                  <span className="h-4 w-4 rounded-sm bg-[#304660]" />
                  {t.pixal3d.generator.pbrMaterials}
                  <span className="ml-1 inline-flex h-8 w-14 items-center justify-end rounded-full bg-[#48bdff] p-1">
                    <span className="h-6 w-6 rounded-full bg-white" />
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  data-testid="pixal3d-generate-button"
                  size="lg"
                  className="h-14 rounded-full bg-gradient-to-r from-[#48bdff] to-[#00f08a] px-8 text-xl font-extrabold text-[#051021] shadow-[0_18px_55px_rgba(0,240,138,0.18)] hover:brightness-110 disabled:opacity-50"
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
                <Button
                  data-testid="pixal3d-free-trial-button"
                  type="button"
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-full border-[#48bdff]/55 bg-[#0b1328] px-7 text-lg font-extrabold text-[#dbe1f2] hover:border-[#48bdff] hover:bg-[#132448] hover:text-white disabled:opacity-60"
                  disabled={isOpeningHfTrial}
                  onClick={handleOpenHfTrial}
                >
                  {isOpeningHfTrial ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
                  {isOpeningHfTrial ? t.pixal3d.generator.freeTrialLoading : t.pixal3d.generator.freeTrialButton}
                </Button>
              </div>
            </div>
          </div>

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

          <div className="mt-5 w-full max-w-[1420px] rounded-lg border border-[#25314f] bg-[#0a1430]/70 px-5 py-4 text-sm leading-6 text-[#aeb6ca]">
            <p>{t.pixal3d.generator.trialDescription}</p>
          </div>

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
