"use client";

import { useMemo } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = useMemo(() => {
    if (!error) return "Unknown error.";
    // Keep message short for UI, full details go to logs.
    return error.message || "Something went wrong.";
  }, [error]);

  return (
    <div className="min-h-dvh px-5 py-10 md:px-6">
      <div className="mx-auto max-w-xl rounded-2xl border border-eoi-border bg-white p-6 shadow-sm">
        <h1 className="font-syne text-2xl font-bold text-eoi-ink">
          Error
        </h1>
        <p className="mt-2 font-dm text-sm text-eoi-ink2">{message}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-[44px] rounded-full bg-eoi-ink px-5 py-2 font-dm text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

