import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.APP_BASE_URL || "https://pixal3d.net").replace(/\/$/, "");
  const privatePaths = ["/signin", "/signup", "/dashboard", "/my-assets", "/payment-success", "/payment-cancel"];
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...privatePaths, ...privatePaths.map((path) => `/zh-CN${path}`)],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
