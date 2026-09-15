import {
  COMPLEX_CATEGORIES,
  COMPLEX_DIFFICULTIES,
  COMPLEX_QUIZ_BANK,
  COMPLEX_QUIZ_MODES,
  checkComplexAnswer,
  checkComplexChoice,
  pickComplexQuestion,
} from "../../../lib/complex-quiz";
import type { Difficulty, QuizMode } from "../../../lib/quiz";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") || "name";
  const category = params.get("category") || null;
  const difficulty = params.get("difficulty") || null;
  if (!COMPLEX_QUIZ_MODES.includes(mode as QuizMode)) return json({ error: "Choose name or structure mode." }, 400);
  if (category && !COMPLEX_CATEGORIES.some((item) => item.id === category)) return json({ error: "Unknown complex topic." }, 400);
  if (difficulty && !COMPLEX_DIFFICULTIES.includes(difficulty as Difficulty)) return json({ error: "Unknown difficulty." }, 400);
  const seenRaw = params.get("seen") || "";
  if (seenRaw.length > 2000 || (seenRaw && !/^\d+(,\d+)*$/.test(seenRaw))) return json({ error: "Invalid question history." }, 400);
  const seen = seenRaw ? seenRaw.split(",").map(Number).filter(Number.isSafeInteger).slice(-100) : [];
  const question = pickComplexQuestion(mode as QuizMode, category, difficulty as Difficulty | null, seen);
  return question ? json(question) : json({ error: "No questions match that selection." }, 404);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Expected a JSON body." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Expected a JSON object." }, 400);
  const { id, answer, choice, nonce } = body as Record<string, unknown>;
  if (typeof id !== "number" || !Number.isInteger(id) || id < 0 || id >= COMPLEX_QUIZ_BANK.length) {
    return json({ error: "Pass a valid question id." }, 400);
  }
  if (choice !== undefined) {
    if (answer !== undefined || typeof choice !== "number" || !Number.isInteger(choice) || choice < -1 || choice > 3 || typeof nonce !== "string" || !/^[a-f0-9]{32}$/.test(nonce)) {
      return json({ error: "Pass the chosen option and its question nonce." }, 400);
    }
    return json(checkComplexChoice(id, choice, nonce));
  }
  if (typeof answer !== "string" || answer.length > 300) return json({ error: "Pass a name of at most 300 characters." }, 400);
  return json(checkComplexAnswer(id, answer));
}
