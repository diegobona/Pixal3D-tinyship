import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@libs/auth";
import { db, painPointFeedback } from "@libs/database";

export const dynamic = "force-dynamic";

const MAX_FEEDBACK_LENGTH = 3000;

function normalizeOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
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
  const rawOtherText = typeof payload.otherText === "string" ? payload.otherText.trim() : "";

  if (rawOtherText.length > MAX_FEEDBACK_LENGTH) {
    return NextResponse.json(
      { success: false, error: "feedback_too_long", message: "Feedback must not exceed 3,000 characters." },
      { status: 400 },
    );
  }

  const otherText = normalizeOptionalText(rawOtherText, MAX_FEEDBACK_LENGTH);

  if (!otherText) {
    return NextResponse.json(
      { success: false, error: "invalid_feedback", message: "Describe the 3D product you need." },
      { status: 400 },
    );
  }

  const session = await getOptionalSession(req);
  const userId = session?.user?.id || null;
  const userEmail = session?.user?.email || null;

  await db.insert(painPointFeedback).values({
    id: `pain_${nanoid(16)}`,
    painPoint: "other",
    selectedPainPoints: [],
    otherText,
    userId,
    userEmail,
    pageUrl: normalizeOptionalText(payload.pageUrl, 500),
    referrer: normalizeOptionalText(payload.referrer, 500) || normalizeOptionalText(req.headers.get("referer"), 500),
    userAgent: normalizeOptionalText(req.headers.get("user-agent"), 500),
  });

  return NextResponse.json({ success: true });
}
