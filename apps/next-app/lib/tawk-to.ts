function normalizeTawkPathSegment(value: string | undefined): string {
  return (value ?? "").trim().replace(/^\/+|\/+$/g, "");
}

export function buildTawkToEmbedUrl(
  propertyId = process.env.NEXT_PUBLIC_TAWK_TO_PROPERTY_ID,
  widgetId = process.env.NEXT_PUBLIC_TAWK_TO_WIDGET_ID,
): string | null {
  const normalizedPropertyId = normalizeTawkPathSegment(propertyId);
  const normalizedWidgetId = normalizeTawkPathSegment(widgetId);

  if (!normalizedPropertyId || !normalizedWidgetId) {
    return null;
  }

  return `https://embed.tawk.to/${normalizedPropertyId}/${normalizedWidgetId}`;
}
