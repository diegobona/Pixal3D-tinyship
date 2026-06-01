import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from '../../../libs/i18n/locales/en';

describe('Next pricing yearly discount label', () => {
  it('uses an approximate 20 percent yearly discount label', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'apps/next-app/app/[lang]/(root)/pricing/page.tsx'),
      'utf8'
    );

    expect(en.pricing.yearlyDiscountBadge).toBe('Save about 20%');
    expect(source).toContain('t.pricing.yearlyDiscountBadge');
    expect(source).not.toContain('-30%');
  });
});
