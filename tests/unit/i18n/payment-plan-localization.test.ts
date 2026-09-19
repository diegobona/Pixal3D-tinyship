import { describe, expect, it } from "vitest";
import { paymentConfig } from "../../../config/payment";

describe("payment plan localization", () => {
  it("provides native Simplified Chinese descriptions and feature lists", () => {
    for (const plan of Object.values(paymentConfig.plans)) {
      expect(plan.i18n["zh-CN"].description).toMatch(/[\u3400-\u9fff]/);
      for (const feature of plan.i18n["zh-CN"].features) {
        expect(feature).toMatch(/[\u3400-\u9fff]/);
      }
    }
  });
});
