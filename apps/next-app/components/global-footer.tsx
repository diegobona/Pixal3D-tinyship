"use client";

import { useTranslation } from "@/hooks/use-translation";

export default function GlobalFooter() {
  const { t } = useTranslation();

  return (
    <footer
      data-testid="global-footer"
      className="border-t border-[#25314f] bg-[#071027] px-4 py-7 text-center sm:px-6"
    >
      <a
        href="https://anyposes.com"
        target="_blank"
        rel="noreferrer noopener"
        data-testid="anyposes-footer-link"
        className="inline-flex items-center gap-2 rounded-full border border-[#48bdff]/25 bg-[#0b1832] px-5 py-3 text-sm font-bold text-[#c4cce0] transition hover:-translate-y-0.5 hover:border-[#48bdff]/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#48bdff]"
      >
        <span>{t.siteFooter.anyposesTip}</span>
        <span aria-hidden="true" className="text-[#00f08a]">↗</span>
      </a>
    </footer>
  );
}
