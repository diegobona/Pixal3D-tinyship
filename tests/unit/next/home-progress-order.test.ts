import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("home free trial modal layout", () => {
  const source = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(root)", "page.tsx"),
    "utf8",
  );

  it("renders the free trial iframe inside a modal instead of an inline page panel", () => {
    const modalIndex = source.indexOf('data-testid="pixal3d-hf-trial-modal"');
    const headerIndex = source.indexOf('data-testid="pixal3d-hf-trial-header"');
    const timerIndex = source.indexOf('data-testid="pixal3d-hf-trial-timer"');
    const modalBodyIndex = source.indexOf('data-testid="pixal3d-hf-trial-body"');
    const iframeIndex = source.indexOf('data-testid="pixal3d-hf-trial-iframe"');

    expect(source).not.toContain('data-testid="pixal3d-hf-trial-panel"');
    expect(modalIndex).toBeGreaterThan(-1);
    expect(headerIndex).toBeGreaterThan(modalIndex);
    expect(timerIndex).toBeGreaterThan(headerIndex);
    expect(modalBodyIndex).toBeGreaterThan(timerIndex);
    expect(iframeIndex).toBeGreaterThan(modalIndex);
    expect(source).toContain("setIsHfTrialModalOpen(true)");
    expect(source).toContain('role="dialog"');
    expect(source).not.toContain("event.target === event.currentTarget");
    expect(source).not.toContain("onMouseDown={(event)");
  });
});
