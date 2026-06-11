import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@libs/auth";
import { db, painPointFeedback } from "@libs/database";

export const dynamic = "force-dynamic";

const PAIN_POINT_VALUES = new Set([
  "too_expensive",
  "hard_to_find_asset_packs",
  "consistent_set_takes_too_long",
  "local_setup_complicated",
  "other",
]);

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizePainPoints(payload: Record<string, unknown>) {
  const rawPainPoints = Array.isArray(payload.painPoints)
    ? payload.painPoints
    : typeof payload.painPoint === "string"
      ? [payload.painPoint]
      : [];

  return Array.from(new Set(rawPainPoints.filter((value): value is string => typeof value === "string")));
}

async function getOptionalSession(req: Request) {
  try {
    return await auth.api.getSession({ headers: new Headers(req.headers) });
  } catch (error) {
    console.warn("Pain point feedback session lookup failed; continuing as anonymous:", error);
    return null;
  }
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_feedback", message: "Invalid feedback payload." },
      { status: 400 },
    );
  }

  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const selectedPainPoints = normalizePainPoints(payload);
  const painPoint = selectedPainPoints[0] || "";

  if (!selectedPainPoints.length || selectedPainPoints.some((value) => !PAIN_POINT_VALUES.has(value))) {
    return NextResponse.json(
      { success: false, error: "invalid_feedback", message: "Choose a valid feedback option." },
      { status: 400 },
    );
  }

  const session = await getOptionalSession(req);
  const userId = session?.user?.id || null;
  const userEmail = session?.user?.email || null;

  await db.insert(painPointFeedback).values({
    id: `pain_${nanoid(16)}`,
    painPoint,
    selectedPainPoints,
    otherText: normalizeOptionalText(payload.otherText, 500),
    userId,
    userEmail,
    pageUrl: normalizeOptionalText(payload.pageUrl, 500),
    referrer: normalizeOptionalText(payload.referrer, 500) || normalizeOptionalText(req.headers.get("referer"), 500),
    userAgent: normalizeOptionalText(req.headers.get("user-agent"), 500),
  });

  return NextResponse.json({ success: true });
}
