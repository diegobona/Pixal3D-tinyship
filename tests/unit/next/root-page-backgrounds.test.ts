import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const HOME_BACKGROUND_CLASS = 'bg-[#071431]';

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('root page backgrounds', () => {
  it('uses the home page background color on pricing and blog pages', () => {
    const home = readSource('apps/next-app/app/[lang]/(root)/page.tsx');
    const pricing = readSource('apps/next-app/app/[lang]/(root)/pricing/page.tsx');
    const blogList = readSource('apps/next-app/app/[lang]/(root)/blog/page.tsx');
    const blogDetail = readSource('apps/next-app/app/[lang]/(root)/blog/[slug]/page.tsx');

    expect(home).toContain(HOME_BACKGROUND_CLASS);
    expect(pricing).toContain(HOME_BACKGROUND_CLASS);
    expect(blogList).toContain(HOME_BACKGROUND_CLASS);
    expect(blogDetail).toContain(HOME_BACKGROUND_CLASS);
    expect(pricing).not.toContain('min-h-screen bg-background');
    expect(blogList).not.toContain('min-h-screen bg-background');
    expect(blogDetail).not.toContain('min-h-screen bg-background');
  });
});
