function normalizeTawkPathSegment(value: string | undefined): string {
  return (value ?? "").trim().replace(/^\/+|\/+$/g, "");
}

export const defaultTawkToPropertyId = "6a1cefde63b1241c2fd4e661";
export const defaultTawkToWidgetId = "1jq0gi01e";

export function buildTawkToEmbedUrl(
  propertyId = process.env.NEXT_PUBLIC_TAWK_TO_PROPERTY_ID || defaultTawkToPropertyId,
  widgetId = process.env.NEXT_PUBLIC_TAWK_TO_WIDGET_ID || defaultTawkToWidgetId,
): string | null {
  const normalizedPropertyId = normalizeTawkPathSegment(propertyId);
  const normalizedWidgetId = normalizeTawkPathSegment(widgetId);

  if (!normalizedPropertyId || !normalizedWidgetId) {
    return null;
  }

  return `https://embed.tawk.to/${normalizedPropertyId}/${normalizedWidgetId}`;
}
