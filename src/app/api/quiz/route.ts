import { NextResponse } from "next/server";

import { DIFFICULTIES, checkAnswer, pickQuestion, type Difficulty } from "@/lib/quiz";

/**
 * The practice session talks to the server for both halves, so the answer
 * never reaches the browser until the question has been attempted.
 *
 *   GET  /api/quiz?category=alcohols&difficulty=easy&seen=3,17
 *   POST /api/quiz   { id, answer }
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const category = params.get("category") || null;
  const difficulty = asDifficulty(params.get("difficulty"));
  const seen = (params.get("seen") ?? "")
    .split(",")
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value));

  const question = pickQuestion(category, difficulty, seen);
  if (!question) {
    return NextResponse.json({ error: "No questions match that selection." }, { status: 404 });
  }
  return NextResponse.json(question);
}

export async function POST(request: Request) {
  let body: { id?: unknown; answer?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const id = Number(body.id);
  const answer = typeof body.answer === "string" ? body.answer : "";
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Pass the question id." }, { status: 400 });
  }

  return NextResponse.json(await checkAnswer(id, answer));
}

function asDifficulty(value: string | null): Difficulty | null {
  return DIFFICULTIES.includes(value as Difficulty) ? (value as Difficulty) : null;
}
