type NegotiatedLocale = "en" | "zh-CN";

export interface LocaleSignals {
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
  countryCode?: string | null;
}

function normalizeStoredLocale(value?: string | null): NegotiatedLocale | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "en") return "en";
  if (normalized === "zh-cn") return "zh-CN";
  return null;
}

function mapLanguageTag(value: string): NegotiatedLocale | null {
  const tag = value.trim().toLowerCase();
  if (tag === "en" || tag.startsWith("en-")) return "en";
  if (tag === "zh" || tag.startsWith("zh-")) return "zh-CN";
  return null;
}

export function parseAcceptLanguage(header?: string | null): NegotiatedLocale | null {
  if (!header?.trim()) return null;

  const candidates = header.split(",").map((entry, index) => {
    const [rawTag, ...parameters] = entry.trim().split(";");
    let quality = 1;

    for (const parameter of parameters) {
      const match = parameter.trim().match(/^q\s*=\s*(.+)$/i);
      if (!match) continue;
      const rawQuality = match[1].trim();
      const isValidQuality = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(rawQuality);
      quality = isValidQuality ? Number(rawQuality) : 0;
      break;
    }

    return { index, locale: mapLanguageTag(rawTag), quality };
  });

  candidates.sort((left, right) => right.quality - left.quality || left.index - right.index);
  return candidates.find((candidate) => candidate.quality > 0 && candidate.locale)?.locale ?? null;
}

export function resolvePreferredLocale(signals: LocaleSignals): NegotiatedLocale {
  const storedLocale = normalizeStoredLocale(signals.cookieLocale);
  if (storedLocale) return storedLocale;

  const browserLocale = parseAcceptLanguage(signals.acceptLanguage);
  if (browserLocale) return browserLocale;

  return signals.countryCode?.trim().toUpperCase() === "CN" ? "zh-CN" : "en";
}
