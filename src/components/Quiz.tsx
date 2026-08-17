"use client";

import { useEffect, useRef, useState } from "react";

import type { Category, Difficulty, Question, QuizMode, Verdict } from "@/lib/quiz";

import { Formula } from "./Formula";

/**
 * A naming drill, run in either direction: the structure is shown and you type
 * its IUPAC name, or the name is shown and you pick the structure out of four.
 *
 * Hints are revealed one at a time and on request, so the question stays a
 * question for as long as the reader wants it to.
 */

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

type Score = { correct: number; asked: number; streak: number; best: number };

const EMPTY_SCORE: Score = { correct: 0, asked: 0, streak: 0, best: 0 };

export function Quiz({
  categories,
  availability,
}: {
  categories: Category[];
  /** Question counts by "category:difficulty", with "*" meaning unfiltered. */
  availability: Record<string, number>;
}) {
  const [mode, setMode] = useState<QuizMode>("name");
  const [category, setCategory] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [checking, setChecking] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  /** Which option was clicked, so the marked-up choices can say so. */
  const [picked, setPicked] = useState<number | null>(null);
  /** Whether the answer was asked for rather than attempted. */
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState<Score>(EMPTY_SCORE);
  const seen = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Nothing to show and nothing to say means a question is on its way. Keeping
  // this derived saves a state that could disagree with the other two.
  const loading = question === null && error === null;

  // Clearing the old question belongs to whatever asked for a new one, so the
  // effect below only has to write in what comes back.
  function requestQuestion(
    nextCategory: string | null,
    nextDifficulty: Difficulty | null,
    nextMode: QuizMode = mode,
  ) {
    setMode(nextMode);
    setCategory(nextCategory);
    setDifficulty(nextDifficulty);
    setQuestion(null);
    setError(null);
    setVerdict(null);
    setAnswer("");
    setPicked(null);
    setRevealed(false);
    setHintsShown(0);
    setRound((current) => current + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ mode });
    if (category) params.set("category", category);
    if (difficulty) params.set("difficulty", difficulty);
    if (seen.current.length) params.set("seen", seen.current.slice(-40).join(","));

    fetch(`/api/quiz?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setError(body.error ?? "Could not load a question.");
          return;
        }
        seen.current.push(body.id);
        setQuestion(body as Question);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Could not reach the question server.");
      });

    return () => controller.abort();
  }, [mode, category, difficulty, round]);

  // Put the cursor where it is needed so a run can be done from the keyboard.
  useEffect(() => {
    if (question && !verdict) inputRef.current?.focus();
  }, [question, verdict]);

  // The multiple choice has nothing to type into, so without this it is the
  // one direction that needs a mouse. The number keys pick an option and Enter
  // moves on, which is what the typed direction already does with its form.
  useEffect(() => {
    if (!question || question.mode !== "structure") return;
    const options = question.choices.length;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (verdict) {
        if (event.key === "Enter") requestQuestion(category, difficulty);
        return;
      }
      const position = Number(event.key) - 1;
      if (Number.isInteger(position) && position >= 0 && position < options) {
        event.preventDefault();
        void choose(position);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // No dependency list: the handler closes over most of the state there is,
    // and a stale one would answer the previous question.
  });

  function mark(request: object): Promise<Verdict> {
    return fetch("/api/quiz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: question?.id, ...request }),
    }).then((response) => response.json() as Promise<Verdict>);
  }

  function record(result: Verdict) {
    setVerdict(result);
    setScore((current) => {
      const streak = result.correct ? current.streak + 1 : 0;
      return {
        correct: current.correct + (result.correct ? 1 : 0),
        asked: current.asked + 1,
        streak,
        best: Math.max(current.best, streak),
      };
    });
  }

  async function submit() {
    if (!question || checking || verdict || !answer.trim()) return;
    setChecking(true);
    try {
      record(await mark({ answer }));
    } catch {
      setError("Could not check that answer.");
    } finally {
      setChecking(false);
    }
  }

  /** A structure is answered by its position among the options shown. */
  async function choose(position: number) {
    if (!question || question.mode !== "structure" || checking || verdict) return;
    setPicked(position);
    setChecking(true);
    try {
      record(await mark({ choice: position, nonce: question.nonce }));
    } catch {
      setError("Could not check that answer.");
    } finally {
      setChecking(false);
    }
  }

  async function giveUp() {
    if (!question || verdict) return;
    setRevealed(true);
    setScore((current) => ({ ...current, asked: current.asked + 1, streak: 0 }));
    try {
      // A position no option has, or a blank name, asks the server to give the
      // answer away without it counting as a try.
      const result = await mark(
        question.mode === "structure"
          ? { choice: -1, nonce: question.nonce }
          : { answer: "" },
      );
      setVerdict(question.mode === "structure" ? result : { ...result, message: "Here is the name." });
    } catch {
      setError("Could not fetch the answer.");
    }
  }

  return (
    <div className="grid gap-4">
      <Filters
        categories={categories}
        mode={mode}
        category={category}
        difficulty={difficulty}
        availability={availability}
        onMode={(value) => requestQuestion(category, difficulty, value)}
        onCategory={(value) => requestQuestion(value, difficulty)}
        onDifficulty={(value) => requestQuestion(category, value)}
      />

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-sm font-medium text-text">
            {mode === "structure" ? "Which one is this?" : "Name this compound"}
          </h2>
          <p className="text-xs text-text-faint">
            {score.asked > 0
              ? `${score.correct}/${score.asked} correct · streak ${score.streak}${score.best > 1 ? ` · best ${score.best}` : ""}`
              : mode === "structure"
                ? "Pick the structure the name describes, by click or number key"
                : "Type the IUPAC name and press Enter"}
          </p>
        </header>

        {error ? (
          <p className="px-4 py-8 text-center text-sm text-text-dim sm:px-5">{error}</p>
        ) : loading || !question ? (
          <div className="flex min-h-[14rem] items-center justify-center">
            <div className="h-32 w-56 animate-pulse rounded-xl bg-surface-2" />
          </div>
        ) : (
          <>
            {question.mode === "name" ? (
              /*
                Labelled as an image so it is not read out as loose atom labels
                — but the label deliberately stops at the formula, since the
                name is the answer.
              */
              <div
                role="img"
                aria-label={`Structure to name. Molecular formula ${question.formula}.`}
                className="structure flex min-h-[14rem] items-center justify-center bg-surface p-4 sm:min-h-[16rem] sm:p-6"
                dangerouslySetInnerHTML={{ __html: question.svg }}
              />
            ) : (
              <div className="px-4 py-5 sm:px-5">
                <p className="text-center text-lg font-medium text-text sm:text-xl">
                  {question.name}
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-3">
                  {question.choices.map((choice, index) => {
                    // Once it is over, the right structure is the point: it is
                    // marked whether or not it was the one chosen, since seeing
                    // which drawing the name belonged to is the whole lesson.
                    const answered = verdict !== null;
                    const isAnswer = answered && verdict.correctChoice === index;
                    const isMistake = answered && picked === index && !isAnswer;
                    return (
                      <li key={index}>
                        <button
                          type="button"
                          disabled={answered || checking}
                          onClick={() => void choose(index)}
                          aria-label={`Option ${index + 1}${
                            isAnswer ? ", the answer" : isMistake ? ", the one you picked" : ""
                          }`}
                          className={`w-full rounded-xl border p-2 transition-colors ${
                            isAnswer
                              ? "border-accent bg-accent-soft"
                              : isMistake
                                ? "border-[var(--warn)] bg-surface-2"
                                : answered
                                  ? "border-border bg-surface-2 opacity-50"
                                  : "border-border bg-surface-2 hover:border-accent"
                          }`}
                        >
                          {/* The number the key press refers to. */}
                          <span
                            aria-hidden="true"
                            className={`block text-left text-xs tabular-nums ${
                              answered ? "text-text-faint" : "text-text-dim"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <div
                            aria-hidden="true"
                            className="structure flex h-28 items-center justify-center sm:h-32"
                            dangerouslySetInnerHTML={{ __html: choice.svg }}
                          />
                          {(isAnswer || isMistake) && (
                            <p
                              className={`pt-1 text-xs font-medium ${
                                isAnswer ? "text-accent-text" : "text-[var(--warn)]"
                              }`}
                            >
                              {isAnswer ? "The answer" : "Your pick"}
                            </p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="border-t border-border px-4 py-3 sm:px-5">
              {question.mode === "name" ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (verdict) requestQuestion(category, difficulty);
                    else void submit();
                  }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    readOnly={Boolean(verdict)}
                    placeholder="e.g. 2-methylbutan-1-ol"
                    aria-label="IUPAC name"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-base text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                  />
                  {verdict ? (
                    <button
                      type="submit"
                      className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                      Next
                    </button>
                  ) : (
                    <>
                      <button
                        type="submit"
                        disabled={checking || !answer.trim()}
                        className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        {checking ? "Checking…" : "Check"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void giveUp()}
                        className="rounded-xl border border-border px-3 py-2 text-sm text-text-dim transition-colors hover:border-border-strong hover:text-text"
                      >
                        Show me
                      </button>
                    </>
                  )}
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {verdict ? (
                    <button
                      type="button"
                      onClick={() => requestQuestion(category, difficulty)}
                      className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                      Next
                    </button>
                  ) : (
                    <>
                      <p className="flex-1 text-sm text-text-dim">
                        Pick the matching structure, or press 1–{question.choices.length}.
                      </p>
                      <button
                        type="button"
                        onClick={() => void giveUp()}
                        className="rounded-xl border border-border px-3 py-2 text-sm text-text-dim transition-colors hover:border-border-strong hover:text-text"
                      >
                        Show me
                      </button>
                    </>
                  )}
                </div>
              )}

              {!verdict && (
                <Hints
                  hints={question.hints}
                  shown={hintsShown}
                  onReveal={() => setHintsShown((current) => current + 1)}
                />
              )}

              {verdict && (
                <Feedback
                  verdict={verdict}
                  formula={question.formula}
                  mode={question.mode}
                  revealed={revealed}
                />
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Filters({
  categories,
  mode,
  category,
  difficulty,
  availability,
  onMode,
  onCategory,
  onDifficulty,
}: {
  categories: Category[];
  mode: QuizMode;
  category: string | null;
  difficulty: Difficulty | null;
  availability: Record<string, number>;
  onMode: (value: QuizMode) => void;
  onCategory: (value: string | null) => void;
  onDifficulty: (value: Difficulty | null) => void;
}) {
  const count = (c: string | null, d: Difficulty | null) => availability[`${c ?? "*"}:${d ?? "*"}`] ?? 0;
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium tracking-wide text-text-faint uppercase">
          Task
        </span>
        <Chip active={mode === "name"} onClick={() => onMode("name")}>
          Name the structure
        </Chip>
        <Chip active={mode === "structure"} onClick={() => onMode("structure")}>
          Find the structure
        </Chip>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium tracking-wide text-text-faint uppercase">
          Topic
        </span>
        <Chip active={category === null} onClick={() => onCategory(null)}>
          Everything
        </Chip>
        {categories.map((item) => {
          const available = count(item.id, difficulty);
          return (
            <Chip
              key={item.id}
              active={category === item.id}
              disabled={available === 0}
              title={
                available === 0
                  ? `No ${difficulty ?? ""} questions in ${item.label.toLowerCase()} yet`.replace(/\s+/g, " ")
                  : `${item.blurb} — ${available} question${available === 1 ? "" : "s"}`
              }
              onClick={() => onCategory(item.id)}
            >
              {item.label}
            </Chip>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium tracking-wide text-text-faint uppercase">
          Level
        </span>
        <Chip active={difficulty === null} onClick={() => onDifficulty(null)}>
          Any
        </Chip>
        {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((level) => {
          const available = count(category, level);
          return (
            <Chip
              key={level}
              active={difficulty === level}
              disabled={available === 0}
              title={
                available === 0
                  ? "Nothing at this level in the chosen topic yet"
                  : `${available} question${available === 1 ? "" : "s"}`
              }
              onClick={() => onDifficulty(level)}
            >
              {DIFFICULTY_LABELS[level]}
            </Chip>
          );
        })}
      </div>
    </section>
  );
}

function Chip({
  active,
  title,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  title?: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-accent bg-accent-soft text-accent-text"
          : "border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text"
      } disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-border disabled:hover:text-text-dim`}
    >
      {children}
    </button>
  );
}

function Hints({
  hints,
  shown,
  onReveal,
}: {
  hints: string[];
  shown: number;
  onReveal: () => void;
}) {
  return (
    <div className="mt-3">
      {hints.slice(0, shown).map((hint, index) => (
        <p key={hint} className="mt-1 text-sm text-text-dim">
          <span className="text-text-faint">Hint {index + 1}. </span>
          {hint}
        </p>
      ))}
      {shown < hints.length && (
        <button
          type="button"
          onClick={onReveal}
          className="mt-2 text-xs text-accent-text transition-opacity hover:opacity-80"
        >
          {shown === 0 ? "Stuck? Give me a hint" : `Another hint (${hints.length - shown} left)`}
        </button>
      )}
    </div>
  );
}

function Feedback({
  verdict,
  formula,
  mode,
  revealed,
}: {
  verdict: Verdict;
  formula: string;
  mode: QuizMode;
  /** The answer was asked for, so there is no attempt to judge. */
  revealed: boolean;
}) {
  const tone =
    verdict.outcome === "correct"
      ? "border-accent bg-accent-soft"
      : verdict.outcome === "wrong-configuration"
        ? "border-[var(--warn)] bg-surface-2"
        : "border-border bg-surface-2";

  return (
    <div className={`mt-3 rounded-xl border px-3 py-2.5 ${tone}`}>
      <p className="text-sm text-text">
        {!revealed && (
          <span className="font-medium">
            {verdict.outcome === "correct" ? "Correct. " : "Not quite. "}
          </span>
        )}
        {verdict.message}
      </p>
      {verdict.named && (
        <p className="mt-1 text-sm text-text-dim">
          {mode === "structure" ? "You picked " : "You named "}
          {verdict.named}.
        </p>
      )}
      {/*
        Naming a structure, the answer is the name. Finding a structure, the
        name was the question — so what is worth saying is which drawing it
        turned out to be, and the marked option says that already.
      */}
      {verdict.answer &&
        !verdict.correct &&
        (mode === "structure" ? (
          <p className="mt-1 text-sm text-text-dim">
            It is the structure marked above (<Formula formula={formula} />
            ).
          </p>
        ) : (
          <p className="mt-1 text-sm text-text-dim">
            The answer is <span className="font-medium text-text">{verdict.answer}</span> (
            <Formula formula={formula} />
            ).
          </p>
        ))}
    </div>
  );
}
