// src/app/api/ai/suggest/route.ts (server-side)

import { NextResponse } from "next/server";

// Add at the top of EVERY route.ts that uses Firebase Admin
export const dynamic = 'force-dynamic';

// Use dynamic import
const { adminAuth, adminDB } = await import('@/lib/firebase-admin');

export async function POST(req: Request) {
  const { prompt } = await req.json();
  // Call your AI provider here securely
  // e.g. fetch(OPENAI_URL, { headers: { Authorization: `Bearer ${process.env.OPENAI_KEY}` }, body: ... })
  // return the suggestions
  return NextResponse.json({ suggestions: ["input*2", "input*input"] });
}
