import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildTawkToEmbedUrl } from "../../../apps/next-app/lib/tawk-to";

describe("tawk.to widget config", () => {
  it("builds the official embed URL when both ids are configured", () => {
    expect(buildTawkToEmbedUrl("property123", "widget456")).toBe(
      "https://embed.tawk.to/property123/widget456",
    );
  });

  it("does not build a widget URL from partial config", () => {
    expect(buildTawkToEmbedUrl("property123", "")).toBeNull();
    expect(buildTawkToEmbedUrl("", "widget456")).toBeNull();
  });

  it("mounts the widget from the shared app wrapper", () => {
    const wrapperSource = readFileSync(
      join(process.cwd(), "apps", "next-app", "components", "shared-app-wrapper.tsx"),
      "utf8",
    );

    expect(wrapperSource).toContain("TawkToWidget");
  });

  it("loads tawk.to as a normal third-party script without forcing CORS", () => {
    const widgetSource = readFileSync(
      join(process.cwd(), "apps", "next-app", "components", "tawk-to-widget.tsx"),
      "utf8",
    );

    expect(widgetSource).toContain('src={tawkToEmbedUrl}');
    expect(widgetSource).not.toContain("crossOrigin");
  });
});
