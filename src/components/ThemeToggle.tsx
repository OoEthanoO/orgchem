"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/**
 * The blocking script in the document head owns the initial theme, so <html>
 * is the source of truth and this subscribes to it rather than keeping a
 * second copy in React state.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light",
  );

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("orgchem-theme", next);
    } catch {
      // Private browsing: the choice just will not persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg border border-border bg-surface p-2 text-text-dim transition-colors hover:border-border-strong hover:text-text"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light theme" : "Dark theme"}
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="3.5" />
          <path
            d="M10 2v2m0 12v2M2 10h2m12 0h2M4.6 4.6l1.4 1.4m8 8 1.4 1.4m0-10.8-1.4 1.4m-8 8-1.4 1.4"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9Z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
