"use client";

import { useEffect, useState } from "react";

/** Copies a machine-readable identifier and confirms it briefly. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
      className="shrink-0 rounded-md p-1 text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
    >
      {copied ? (
        <svg viewBox="0 0 20 20" className="size-3.5 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m4 10.5 4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="7" y="7" width="9" height="9" rx="2" />
          <path d="M13 4.5H6A1.5 1.5 0 0 0 4.5 6v7" />
        </svg>
      )}
    </button>
  );
}
