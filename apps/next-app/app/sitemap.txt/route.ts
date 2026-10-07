import sitemap from "../sitemap";

export async function GET() {
  const entries = await sitemap();

  return new Response(`${entries.map((entry) => entry.url).join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
