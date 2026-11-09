"use client";

import { useState, type InputHTMLAttributes } from "react";

/** Password field with a show/hide (eye) toggle. Use inside a <label>. */
export default function PasswordInput({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative mt-1 block">
      <input {...props} type={visible ? "text" : "password"} className={`${className} mt-0! pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-ink/50 transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </span>
  );
}
