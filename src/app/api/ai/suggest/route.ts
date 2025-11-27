// src/app/api/ai/suggest/route.ts (server-side)
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt } = await req.json();
  // Call your AI provider here securely
  // e.g. fetch(OPENAI_URL, { headers: { Authorization: `Bearer ${process.env.OPENAI_KEY}` }, body: ... })
  // return the suggestions
  return NextResponse.json({ suggestions: ["input*2", "input*input"] });
}
