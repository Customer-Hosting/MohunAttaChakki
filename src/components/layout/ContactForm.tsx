"use client";

import { useState, type FormEvent } from "react";
import { normalizePhone } from "@/lib/validation";
import { whatsappHref } from "./contact";

/** Red star after a required field's label (the input's `required` tells screen readers). */
function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-red-600">
      *
    </span>
  );
}

const inputClass =
  "mt-1 block w-full rounded-lg border border-black/20 bg-white px-3 py-2.5 text-base outline-none transition-colors hover:border-ink/50 focus:border-ink focus:ring-2 focus:ring-brand";

/**
 * Contact form without a server: it opens WhatsApp (or the email app) with the message filled in.
 * Nothing is stored on the website.
 */
export default function ContactForm({ phone, email }: { phone: string; email: string }) {
  const [error, setError] = useState<string | null>(null);

  function compose(form: HTMLFormElement) {
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const phoneNumber = normalizePhone(data.get("phone"));
    const message = String(data.get("message") ?? "").trim();
    if (name.length < 2) return setError("Please enter your name."), null;
    if (!phoneNumber) return setError("Please enter a valid 10-digit mobile number."), null;
    setError(null);
    // Message is optional: without one, send a short call-back request so the shop knows why.
    const body = message || "Please contact me about your products.";
    return { name, text: `Hello Mohan Atta Chakki,\n\n${body}\n\n— ${name} (+91 ${phoneNumber})` };
  }

  function sendWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const m = compose(event.currentTarget);
    if (m) window.open(`${whatsappHref(phone)}?text=${encodeURIComponent(m.text)}`, "_blank", "noopener,noreferrer");
  }

  function sendEmail(form: HTMLFormElement | null) {
    if (!form) return;
    const m = compose(form);
    if (m) window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Enquiry from ${m.name}`)}&body=${encodeURIComponent(m.text)}`;
  }

  return (
    <form onSubmit={sendWhatsApp} className="space-y-4" noValidate aria-labelledby="contact-form-heading">
      <h2 id="contact-form-heading" className="font-display text-2xl font-semibold">
        Send us a message
      </h2>
      <p className="text-sm text-ink/70">Your message opens in WhatsApp or your email app, ready to send.</p>
      <p className="text-xs text-ink/60">
        Fields marked <span className="text-red-600">*</span> are required.
      </p>
      <label className="block text-sm font-medium">
        Your name
        <RequiredMark />
        <input name="name" autoComplete="name" required maxLength={80} className={inputClass} />
      </label>
      <label className="block text-sm font-medium">
        Mobile number
        <RequiredMark />
        <input
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="10-digit mobile number"
          required
          maxLength={14}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Message <span className="font-normal text-ink/50">(optional)</span>
        <textarea name="message" rows={5} maxLength={1000} className={inputClass} placeholder="Ask about a product, pack size, bulk order or delivery…" />
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="flex-1 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:shadow-lg hover:brightness-95 motion-reduce:hover:translate-y-0"
        >
          Send on WhatsApp
        </button>
        <button
          type="button"
          onClick={(e) => sendEmail(e.currentTarget.form)}
          className="flex-1 rounded-full border border-ink px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:bg-ink hover:text-white hover:shadow-lg motion-reduce:hover:translate-y-0"
        >
          Send by email
        </button>
      </div>
    </form>
  );
}
