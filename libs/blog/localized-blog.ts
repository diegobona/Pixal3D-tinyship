export type BlogLocale = "en" | "zh-CN";

type LocalizableBlogPost = {
  title: string;
  excerpt?: string | null;
  content?: string;
  metadata?: unknown;
};

type LocalizedBlogFields = {
  title: string;
  excerpt: string | null;
  content: string;
};

function readChineseTranslation(metadata: unknown): LocalizedBlogFields | null {
  if (!metadata || typeof metadata !== "object") return null;
  const locales = (metadata as Record<string, unknown>).locales;
  if (!locales || typeof locales !== "object") return null;
  const chinese = (locales as Record<string, unknown>)["zh-CN"];
  if (!chinese || typeof chinese !== "object") return null;

  const candidate = chinese as Record<string, unknown>;
  if (typeof candidate.title !== "string" || !candidate.title.trim()) return null;
  if (typeof candidate.content !== "string" || !candidate.content.trim()) return null;
  if (candidate.excerpt !== undefined && candidate.excerpt !== null && typeof candidate.excerpt !== "string") return null;

  return {
    title: candidate.title,
    excerpt: candidate.excerpt ?? null,
    content: candidate.content,
  };
}

export function localizeDatabaseBlogPost<T extends LocalizableBlogPost>(
  post: T,
  locale: BlogLocale,
): T | null {
  if (locale === "en") return post;
  const localized = readChineseTranslation(post.metadata);
  return localized ? { ...post, ...localized } : null;
}

export function getAvailableBlogLocales(metadata: unknown): BlogLocale[] {
  return readChineseTranslation(metadata) ? ["en", "zh-CN"] : ["en"];
}
