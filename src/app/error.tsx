"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-ink/70">We could not load this page. Please try again in a moment.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-full bg-brand px-6 py-3 text-sm font-semibold hover:bg-brand-dark"
      >
        Try again
      </button>
    </section>
  );
}
