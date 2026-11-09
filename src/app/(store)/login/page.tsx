import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <div className="rounded-2xl border border-black/10 p-6 shadow-sm sm:p-8">
        {/* AuthForm reads ?next= and ?mode= from the URL. */}
        <Suspense fallback={<p className="text-center text-sm text-ink/60">Loading…</p>}>
          <AuthForm />
        </Suspense>
      </div>
    </section>
  );
}
