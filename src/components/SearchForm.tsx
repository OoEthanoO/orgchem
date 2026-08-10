"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The query lives in the URL, so results are shareable and survive a reload.
 * This is the only part of the page that needs to be interactive.
 */
export function SearchForm({ initialQuery }: { initialQuery: string }) {
  const [value, setValue] = useState(initialQuery);
  const [pending, setPending] = useState(false);
  const [shownQuery, setShownQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Navigating (back button, an example link) replaces the query, and the box
  // should follow it. Adjusting during render beats an effect: React re-runs
  // this component immediately instead of painting the stale value first.
  if (shownQuery !== initialQuery) {
    setShownQuery(initialQuery);
    setValue(initialQuery);
    setPending(false);
  }

  // "/" focuses the box, the way search-first tools usually behave.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function submit(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setPending(true);
    router.push(`/?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(value);
      }}
      className="group relative"
      role="search"
    >
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2 shadow-[var(--shadow)] transition-colors focus-within:border-accent sm:px-4 sm:py-3">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="size-5 shrink-0 text-text-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
        </svg>

        <input
          ref={inputRef}
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="2-methylbutan-1-ol, CH₃CH₂CH₂CH₂CH₂–, caffeine, CC(=O)O…"
          aria-label="Chemical name, formula or SMILES"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent py-1 text-base text-text placeholder:text-text-faint focus:outline-none sm:text-lg"
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            className="rounded-lg p-1.5 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
            aria-label="Clear"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
            </svg>
          </button>
        )}

        <button
          type="submit"
          disabled={pending || !value.trim()}
          className="shrink-0 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:px-4"
        >
          {pending ? "Drawing…" : "Draw"}
        </button>
      </div>
    </form>
  );
}
