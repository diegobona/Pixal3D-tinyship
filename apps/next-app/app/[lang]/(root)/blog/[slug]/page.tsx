import Link from "next/link";

import { notFound } from "next/navigation";
import { db, blogPost, user } from "@libs/database";
import { blogPostStatus } from "@libs/database/schema/blog-post";
import { eq, and } from "drizzle-orm";
import { translations } from "@libs/i18n";
import type { Metadata } from "next";
import { getStaticBlogPostBySlug, type StaticBlogSection } from "@/lib/static-blog-posts";

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const t = translations[lang as keyof typeof translations];
  const staticPost = getStaticBlogPostBySlug(slug);

  if (staticPost) {
    return {
      title: `${staticPost.title} - ${t.blog.title}`,
      description: staticPost.excerpt || t.blog.metadata.description,
      keywords: t.blog.metadata.keywords,
    };
  }

  const [post] = await db
    .select({
      title: blogPost.title,
      excerpt: blogPost.excerpt,
    })
    .from(blogPost)
    .where(and(eq(blogPost.slug, slug), eq(blogPost.status, blogPostStatus.PUBLISHED)))
    .limit(1);

  if (!post) {
    return {
      title: t.blog.title,
    };
  }

  return {
    title: `${post.title} - ${t.blog.title}`,
    description: post.excerpt || t.blog.metadata.description,
    keywords: t.blog.metadata.keywords,
  };
}

function renderStaticSection(section: StaticBlogSection, index: number) {
  if (section.type === "paragraphs") {
    return (
      <section key={`${section.heading || "paragraphs"}-${index}`} className="space-y-5">
        {section.heading ? (
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {section.heading}
          </h2>
        ) : null}
        {section.paragraphs.map((paragraph, paragraphIndex) => (
          <p key={`${index}-${paragraphIndex}`} className="text-base leading-8 text-foreground/90">
            {paragraph}
          </p>
        ))}
      </section>
    );
  }

  if (section.type === "list") {
    return (
      <section key={`${section.heading}-${index}`} className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {section.heading}
        </h2>
        <ul className="space-y-3 pl-6 text-base leading-8 text-foreground/90">
          {section.items.map((item, itemIndex) => (
            <li key={`${index}-${itemIndex}`} className="list-disc">
              {item}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section key={`${section.heading}-${index}`} className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {section.heading}
      </h2>
      <div className="space-y-4">
        {section.items.map((item, itemIndex) => (
          <div key={`${index}-${itemIndex}`} className="rounded-xl border border-border bg-card/70 p-5">
            <h3 className="text-lg font-semibold text-foreground">{item.question}</h3>
            <p className="mt-2 text-base leading-7 text-foreground/80">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function BlogDetailPage({ params }: Props) {
  const { lang, slug } = await params;
  const t = translations[lang as keyof typeof translations];
  const staticPost = getStaticBlogPostBySlug(slug);

  if (staticPost) {
    return (
      <div className="min-h-screen bg-[#071431]">
        <article className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
          <Link
            href={`/${lang}/blog`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <span aria-hidden="true">&lt;</span>
            {t.blog.backToBlog}
          </Link>

          <header className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {staticPost.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                {t.blog.by} {staticPost.authorName}
              </span>
              <span>
                {t.blog.publishedOn}{" "}
                {new Date(staticPost.publishedAt).toLocaleDateString(lang === "zh-CN" ? "zh-CN" : "en-US")}
              </span>
            </div>
            {staticPost.coverImage ? (
              <div className="mt-6 aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                <img
                  src={staticPost.coverImage}
                  alt={staticPost.title}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            <p className="mt-6 text-lg leading-8 text-foreground/75">{staticPost.excerpt}</p>
          </header>

          <div className="space-y-10">
            {staticPost.sections.map((section, index) => renderStaticSection(section, index))}
          </div>

          <footer className="mt-12 pt-8 border-t border-border">
            <Link
              href={`/${lang}/blog`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span aria-hidden="true">&lt;</span>
              {t.blog.backToBlog}
            </Link>
          </footer>
        </article>
      </div>
    );
  }

  const [post] = await db
    .select({
      id: blogPost.id,
      title: blogPost.title,
      slug: blogPost.slug,
      content: blogPost.content,
      excerpt: blogPost.excerpt,
      coverImage: blogPost.coverImage,
      publishedAt: blogPost.publishedAt,
      authorName: user.name,
    })
    .from(blogPost)
    .leftJoin(user, eq(blogPost.authorId, user.id))
    .where(and(eq(blogPost.slug, slug), eq(blogPost.status, blogPostStatus.PUBLISHED)))
    .limit(1);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#071431]">
      <article className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
        <Link
          href={`/${lang}/blog`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <span aria-hidden="true">&lt;</span>
          {t.blog.backToBlog}
        </Link>

        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {post.authorName && (
              <span>
                {t.blog.by} {post.authorName}
              </span>
            )}
            {post.publishedAt && (
              <span>
                {t.blog.publishedOn}{" "}
                {new Date(post.publishedAt).toLocaleDateString(lang === "zh-CN" ? "zh-CN" : "en-US")}
              </span>
            )}
          </div>
          {post.coverImage && (
            <div className="mt-6 aspect-video w-full overflow-hidden rounded-lg bg-muted">
              <img
                src={post.coverImage}
                alt={post.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </header>

        <div className="whitespace-pre-wrap text-base leading-8 text-foreground/90">
          {post.content}
        </div>

        <footer className="mt-12 pt-8 border-t border-border">
          <Link
            href={`/${lang}/blog`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span aria-hidden="true">&lt;</span>
            {t.blog.backToBlog}
          </Link>
        </footer>
      </article>
    </div>
  );
}
