import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";

import { getStaticBlogPosts } from "@/lib/static-blog-posts";
import { PIXAL3D_SHOW_MONETIZATION_SURFACES } from "@/lib/pixal3d-surface-visibility";
import { blogPost, db } from "@libs/database";
import { blogPostStatus } from "@libs/database/schema/blog-post";
import { getAvailableBlogLocales, type BlogLocale } from "@libs/blog/localized-blog";

const DEFAULT_APP_URL = "https://pixal3d.net";
const LOCALES = ["en", "zh-CN"] as const;
const DEFAULT_LOCALE = "en";

function getAppUrl() {
  return (process.env.APP_BASE_URL || DEFAULT_APP_URL).replace(/\/$/, "");
}

function localizedPath(path: string, locale: (typeof LOCALES)[number]) {
  if (locale === DEFAULT_LOCALE) {
    return path || "/";
  }

  return `/${locale}${path === "/" ? "" : path}`;
}

function absoluteUrl(path: string, locale: (typeof LOCALES)[number]) {
  return `${getAppUrl()}${localizedPath(path, locale)}`;
}

function sitemapEntry(
  path: string,
  options: {
    lastModified?: Date | string;
    changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority?: number;
    locales?: BlogLocale[];
  } = {},
): MetadataRoute.Sitemap[number] {
  const lastModified = options.lastModified ? new Date(options.lastModified) : new Date();

  const availableLocales = options.locales ?? [...LOCALES];
  const languages: Record<string, string> = {
    en: absoluteUrl(path, "en"),
    "x-default": absoluteUrl(path, "en"),
  };
  if (availableLocales.includes("zh-CN")) {
    languages["zh-CN"] = absoluteUrl(path, "zh-CN");
  }

  return {
    url: absoluteUrl(path, DEFAULT_LOCALE),
    lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
    alternates: {
      languages,
    },
  };
}

async function getPublishedDatabaseBlogEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const posts = await db
      .select({
        slug: blogPost.slug,
        publishedAt: blogPost.publishedAt,
        updatedAt: blogPost.updatedAt,
        metadata: blogPost.metadata,
      })
      .from(blogPost)
      .where(eq(blogPost.status, blogPostStatus.PUBLISHED));

    return posts.map((post) =>
      sitemapEntry(`/blog/${post.slug}`, {
        lastModified: post.updatedAt || post.publishedAt || new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
        locales: getAvailableBlogLocales(post.metadata),
      }),
    );
  } catch (error) {
    console.warn("[sitemap] Failed to load database blog posts:", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    sitemapEntry("/", { changeFrequency: "weekly", priority: 1 }),
    ...(PIXAL3D_SHOW_MONETIZATION_SURFACES
      ? [sitemapEntry("/pricing", { changeFrequency: "monthly", priority: 0.8 })]
      : []),
    sitemapEntry("/blog", { changeFrequency: "weekly", priority: 0.7 }),
  ];

  const staticBlogEntries = getStaticBlogPosts().map((post) =>
    sitemapEntry(`/blog/${post.slug}`, {
      lastModified: post.publishedAt,
      changeFrequency: "monthly",
      priority: 0.65,
    }),
  );

  const databaseBlogEntries = await getPublishedDatabaseBlogEntries();
  const entriesByUrl = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const entry of [...staticRoutes, ...staticBlogEntries, ...databaseBlogEntries]) {
    entriesByUrl.set(entry.url, entry);
  }

  return Array.from(entriesByUrl.values());
}
