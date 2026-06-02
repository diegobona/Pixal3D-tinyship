import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from '../../../libs/i18n/locales/en';

describe('Next pricing yearly discount label', () => {
  it('uses an approximate 20 percent yearly discount label without recommendation or per-credit copy', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'apps/next-app/app/[lang]/(root)/pricing/page.tsx'),
      'utf8'
    );

    expect(en.pricing.yearlyDiscountBadge).toBe('Save about 20%');
    expect(source).toContain('t.pricing.yearlyDiscountBadge');
    expect(source).not.toContain('-30%');
    expect(source).not.toContain('Recommended');
    expect(source).not.toContain('creditPrice');
    expect(source).not.toContain('/ 100 credits');
    expect(source).not.toContain('text-5xl font-bold">{t.pricing.contactPlan.price}');
    expect(source).toContain('whitespace-nowrap');
    expect(source).not.toContain('border-yellow-400/35');
    expect(source).not.toContain('bg-card p-7');
    expect(source).not.toContain('rgba(255,205,0');
    expect(source).toContain('bg-[#070d20]/92');
  });
});
