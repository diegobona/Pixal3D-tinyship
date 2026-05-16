"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  ChevronDown,
  CircleHelp,
  Download,
  ImagePlus,
  Loader2,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@libs/react-shared/ui/button";
import { Textarea } from "@libs/react-shared/ui/textarea";
import { Input } from "@libs/react-shared/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import { ModelViewer } from "@/components/pixal3d/model-viewer";

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

const POLL_INTERVAL_MS = 1200;
const POLL_TIMEOUT_MS = 30000;

export default function Home() {
  const { t, locale } = useTranslation();
  const [prompt, setPrompt] = useState(t.pixal3d.generator.defaultPrompt);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("idle");
  const [taskMessage, setTaskMessage] = useState(t.pixal3d.generator.status.idle);
  const [modelUrl, setModelUrl] = useState("");
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);

  const canGenerate = useMemo(() => {
    return Boolean(imageDataUrl && prompt.trim() && taskStatus !== "processing" && !isReadingFile);
  }, [imageDataUrl, prompt, taskStatus, isReadingFile]);

  useEffect(() => {
    setPrompt(t.pixal3d.generator.defaultPrompt);
    setTaskMessage(t.pixal3d.generator.status.idle);
  }, [t.pixal3d.generator.defaultPrompt, t.pixal3d.generator.status.idle]);

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
      setModelUrl("");
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
    if (!prompt.trim()) {
      toast.error(t.pixal3d.generator.errors.promptRequired);
      return;
    }

    setTaskStatus("processing");
    setTaskMessage(t.pixal3d.generator.status.creating);
    setModelUrl("");

    try {
      const response = await fetch("/api/3d-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageDataUrl,
          prompt: prompt.trim(),
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
                window.location.href = `/${locale}/signup`;
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
                window.location.href = `/${locale}/pricing`;
              },
            },
          });
          setTaskStatus("failed");
          setTaskMessage(t.pixal3d.generator.errors.insufficientCredits);
          return;
        }
        throw new Error(data.message || t.pixal3d.generator.errors.generationFailed);
      }

      const generatedModelUrl = await pollTask(data.data.taskId);
      setModelUrl(generatedModelUrl);
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
                        setModelUrl("");
                      }}
                      aria-label={t.pixal3d.generator.removeImage}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <p className="max-w-[520px] truncate text-2xl font-bold text-[#d9dfef]">{imageName}</p>
                    <p className="mt-2 text-base text-[#828aa4]">{t.pixal3d.generator.imageHint}</p>
                  </div>
                </div>
              ) : (
                <>
                  <ImagePlus className="h-16 w-16 text-[#aeb6ca]" strokeWidth={1.8} />
                  <p className="mt-9 text-3xl font-extrabold text-[#b7bdce]">{t.pixal3d.generator.uploadButton}</p>
                  <p className="mt-5 text-xl font-medium text-[#757f9b]">{t.pixal3d.generator.dragDropPaste}</p>
                  <Button
                    type="button"
                    className="mt-24 h-16 w-full max-w-[390px] rounded-full border border-[#313b59] bg-[#141b31] text-2xl font-bold text-[#dbe1f2] hover:bg-[#1a2440]"
                    disabled={isReadingFile}
                  >
                    {isReadingFile ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
                    {t.pixal3d.generator.selectFileButton}
                  </Button>
                </>
              )}
            </div>

            <div className="mt-7 border-t border-[#303a59] pt-6">
              <Textarea
                id="pixal3d-prompt"
                data-testid="pixal3d-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={t.pixal3d.generator.promptPlaceholder}
                className="min-h-[88px] resize-none rounded-md border-[#303a59] bg-[#0b1329] text-base text-[#dbe1f2] placeholder:text-[#727b96] focus-visible:ring-[#48bdff]/30"
              />
            </div>

            <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex h-12 items-center gap-3 rounded-full bg-[#48bdff] px-6 text-lg font-extrabold text-[#051021]">
                  {t.pixal3d.generator.stylePreset}
                  <X className="h-4 w-4" />
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

              <Button
                data-testid="pixal3d-generate-button"
                size="lg"
                className="h-14 rounded-full bg-gradient-to-r from-[#48bdff] to-[#00f08a] px-8 text-xl font-extrabold text-[#051021] shadow-[0_18px_55px_rgba(0,240,138,0.18)] hover:brightness-110 disabled:opacity-50"
                disabled={!canGenerate}
                onClick={handleGenerate}
              >
                {taskStatus === "processing" ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <WandSparkles className="h-6 w-6" />
                )}
                {taskStatus === "processing" ? t.pixal3d.generator.generatingButton : t.pixal3d.generator.generateButton}
              </Button>
            </div>
          </div>

          <div className="mt-7 flex w-full max-w-[1420px] items-center justify-between px-5 text-lg font-bold text-[#dbe1f2]">
            <button
              type="button"
              className="inline-flex items-center gap-3 transition-colors hover:text-[#48bdff]"
              onClick={() => setShowAdvanced((value) => !value)}
            >
              {t.pixal3d.generator.advanced}
              <ChevronDown className={`h-5 w-5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            </button>
            <a className="inline-flex items-center gap-3 transition-colors hover:text-[#48bdff]" href={`/${locale}/blog`}>
              <CircleHelp className="h-5 w-5" />
              {t.pixal3d.generator.howToUse}
            </a>
          </div>

          {showAdvanced && (
            <div className="mt-5 w-full max-w-[1420px] rounded-lg border border-[#25314f] bg-[#0a1430]/70 p-5 text-sm leading-6 text-[#aeb6ca]">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p>{t.pixal3d.generator.trialDescription}</p>
                <p data-testid="pixal3d-task-status" className="font-semibold text-[#dbe1f2]">
                  {taskMessage}
                </p>
              </div>
            </div>
          )}

          <div className="mt-10 w-full max-w-[1420px] border-t border-[#25314f] pt-10">
            <div className="mb-7 flex flex-col gap-4 text-center md:flex-row md:items-end md:justify-between md:text-left">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#48bdff]">{t.pixal3d.generator.previewTitle}</p>
                <h2 className="mt-2 text-3xl font-extrabold text-white">{t.pixal3d.generator.previewHeading}</h2>
              </div>
              {modelUrl && (
                <Button asChild className="rounded-full bg-[#48bdff] text-[#051021] hover:bg-[#72ceff]">
                  <a data-testid="pixal3d-download-link" href={modelUrl} download target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" />
                    {t.pixal3d.generator.downloadButton}
                  </a>
                </Button>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="min-h-[420px] rounded-xl border border-[#25314f] bg-[#0c1737] p-3">
                <ModelViewer
                  modelUrl={modelUrl}
                  idleLabel={t.pixal3d.generator.viewer.idle}
                  loadingLabel={t.pixal3d.generator.viewer.loading}
                  errorLabel={t.pixal3d.generator.viewer.error}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-xl border border-[#25314f] bg-[#0c1737] p-5">
                  <Sparkles className="h-8 w-8 text-[#48bdff]" />
                  <h3 className="mt-5 text-xl font-extrabold text-white">{t.pixal3d.generator.trialTitle}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#aeb6ca]">{t.pixal3d.generator.trialDescription}</p>
                </div>
                <div className="rounded-xl border border-[#25314f] bg-[#0c1737] p-5">
                  <Box className="h-8 w-8 text-[#00f08a]" />
                  <h3 className="mt-5 text-xl font-extrabold text-white">{t.pixal3d.generator.outputTitle}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#aeb6ca]">{t.pixal3d.generator.outputDescription}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
