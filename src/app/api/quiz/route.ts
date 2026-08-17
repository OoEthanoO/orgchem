import { NextResponse } from "next/server";

import {
  DIFFICULTIES,
  QUIZ_MODES,
  checkAnswer,
  checkChoice,
  pickQuestion,
  type Difficulty,
  type QuizMode,
} from "@/lib/quiz";

/**
 * The practice session talks to the server for both halves, so the answer
 * never reaches the browser until the question has been attempted.
 *
 *   GET  /api/quiz?mode=structure&category=alcohols&difficulty=easy&seen=3,17
 *   POST /api/quiz   { id, answer }          a typed name
 *   POST /api/quiz   { id, choice, nonce }   a structure, by its position
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const category = params.get("category") || null;
  const difficulty = asDifficulty(params.get("difficulty"));
  const seen = (params.get("seen") ?? "")
    .split(",")
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value));

  const question = pickQuestion(asMode(params.get("mode")), category, difficulty, seen);
  if (!question) {
    return NextResponse.json({ error: "No questions match that selection." }, { status: 404 });
  }
  return NextResponse.json(question);
}

export async function POST(request: Request) {
  let body: { id?: unknown; answer?: unknown; choice?: unknown; nonce?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Pass the question id." }, { status: 400 });
  }

  // A chosen structure is marked locally; a typed name has to be resolved. The
  // choice is a position among the options, which only means anything
  // alongside the nonce those options were built from.
  if (body.choice !== undefined) {
    const choice = Number(body.choice);
    if (!Number.isInteger(choice) || typeof body.nonce !== "string") {
      return NextResponse.json({ error: "Pass the chosen structure." }, { status: 400 });
    }
    return NextResponse.json(checkChoice(id, choice, body.nonce));
  }

  const answer = typeof body.answer === "string" ? body.answer : "";
  return NextResponse.json(await checkAnswer(id, answer));
}

function asMode(value: string | null): QuizMode {
  return QUIZ_MODES.includes(value as QuizMode) ? (value as QuizMode) : "name";
}

function asDifficulty(value: string | null): Difficulty | null {
  return DIFFICULTIES.includes(value as Difficulty) ? (value as Difficulty) : null;
}
