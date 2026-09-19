# English and Simplified Chinese routing

Pixal3D serves English at clean canonical URLs and Simplified Chinese below `/zh-CN`.

| Language | Home | Blog |
| --- | --- | --- |
| English | `/` | `/blog` |
| Simplified Chinese | `/zh-CN` | `/zh-CN/blog` |

The internal App Router still renders English through the `[lang]` segment. Middleware rewrites clean English requests to `/en/*` internally, while public links, canonical metadata, and browser URLs remain clean. Public `/en/*` requests redirect back to the clean equivalent.

## Locale negotiation

For requests without an explicit locale prefix, middleware resolves the locale in this order:

1. A valid `NEXT_LOCALE` cookie created by a manual language choice.
2. The weighted `Accept-Language` request header.
3. A `CN` country code from `CF-IPCountry`, `X-Vercel-IP-Country`, or `CloudFront-Viewer-Country` when the browser language is unsupported.
4. English.

Any Chinese browser language variant currently maps to the available Simplified Chinese experience. Country is deliberately a weak fallback: a user whose browser explicitly asks for English remains on English even when the request originates in China.

Signal-dependent redirects and rewrites return `Cache-Control: private, no-store` and vary on the cookie, language, and supported country headers. This prevents a CDN from serving one visitor's negotiated language to another visitor.

Automatic detection never creates a preference cookie. A manual choice calls `POST /api/locale`, which validates the locale and sets an HttpOnly, SameSite=Lax, one-year cookie for `/` (Secure in production).

## Translation ownership

`libs/i18n/locales/en.ts` is the source dictionary. `libs/i18n/locales/zh-CN.ts` is a complete standalone dictionary and must not spread or import English as a runtime fallback. Unit tests compare both dictionary shapes and representative product areas.

Static blog articles provide complete English and Chinese content. Database articles use the existing `blog_post.metadata` JSON field:

```json
{
  "locales": {
    "zh-CN": {
      "title": "中文标题",
      "excerpt": "中文摘要",
      "content": "中文正文"
    }
  }
}
```

A database article without a complete, valid Chinese entry is omitted from Chinese pagination and returns 404 on a Chinese detail URL. Its sitemap entry also omits the unavailable Chinese alternate.

## SEO rules

Indexable home, pricing, blog listing, and blog detail pages publish locale-specific canonicals, reciprocal `hreflang` links, `x-default`, and Open Graph locale fields. English canonicals use clean URLs. Sign-in, sign-up, dashboard, asset library, and payment result pages are `noindex,nofollow` and do not publish bilingual alternates.

