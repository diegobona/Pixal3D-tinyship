# Static Blog Content

Pixal3D's evergreen guides live in `libs/blog/static-posts.ts`. The catalog is merged with published database posts on the active Next.js public blog surface.

## Ordering and pagination

The shared `mergeAndPaginateBlogPosts` helper:

1. Adds localized static posts.
2. Adds database posts whose slugs do not collide with a static post.
3. Sorts the combined set by `publishedAt` in descending order.
4. Calculates totals from the combined set and applies pagination once.

Malformed or non-finite page values fall back to page 1 and the default page size.

Static posts remain readable if the database list query is temporarily unavailable. Dynamic posts return automatically when the database connection recovers.

## Localization

New localized article copy is defined under `blog.staticPosts` in:

- `libs/i18n/locales/en.ts`
- `libs/i18n/locales/zh-CN.ts`

The Next.js detail page renders typed static sections directly so headings, external-link behavior, figures, captions, and section order remain explicit. Database-authored posts continue through the existing plain-text renderer.

## Images

Public URLs use `/blog-covers/*`. Covers and inline article images live in `apps/next-app/public/blog-covers`. Blog covers are WebP; supplied screenshots remain PNG when preserving the original bytes is required.
