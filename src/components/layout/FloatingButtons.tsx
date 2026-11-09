"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { whatsappHref } from "./contact";
import { CloseIcon, SendIcon } from "./Icons";

const SHOW_AFTER_PX = 400;
const CLOSE_DELAY_MS = 250;

function WhatsAppGlyph({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.04 3C9 3 3.3 8.7 3.3 15.73c0 2.25.6 4.45 1.72 6.38L3.2 28.8l6.86-1.8a12.7 12.7 0 0 0 5.98 1.52h.01c7.03 0 12.74-5.7 12.74-12.74A12.73 12.73 0 0 0 16.04 3zm0 23.37h-.01c-1.9 0-3.77-.51-5.4-1.48l-.39-.23-4.07 1.07 1.09-3.97-.25-.41a10.56 10.56 0 0 1-1.62-5.62c0-5.84 4.75-10.6 10.6-10.6a10.6 10.6 0 0 1 10.59 10.6c0 5.85-4.75 10.64-10.54 10.64zm5.81-7.94c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.34-.5-2.56-1.58-.95-.84-1.59-1.88-1.77-2.2-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.71-1.71-.98-2.35-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65s1.14 3.08 1.3 3.29c.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.14-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37z" />
    </svg>
  );
}

/** Bottom-left: back to top (appears after scrolling down). */
function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setShow(window.scrollY > SHOW_AFTER_PX);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update); // correct state after a reload mid-page
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-30 grid h-10 w-10 place-items-center rounded-xl bg-brand text-ink shadow-lg ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:bg-brand-dark hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:bottom-6 sm:left-6 sm:h-11 sm:w-11 motion-reduce:transition-none ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}

/**
 * Bottom-right: WhatsApp button with a chat pop-up.
 * Mouse: opens on hover, closes shortly after the pointer leaves (unless a message is being typed).
 * Touch / keyboard: tap or Enter toggles it; Escape or × closes it.
 * "Send on WhatsApp" opens wa.me with the typed message — nothing is sent through this website.
 */
function WhatsAppChat({ phone, storeName }: { phone: string; storeName: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const closeTimer = useRef<number | undefined>(undefined);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const panelId = useId();

  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      // Keep it open while the visitor is typing.
      if (document.activeElement !== textRef.current && !textRef.current?.value) setOpen(false);
    }, CLOSE_DELAY_MS);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  function send(event: FormEvent) {
    event.preventDefault();
    const text = message.trim() || `Hello ${storeName}, I have a question.`;
    window.open(`${whatsappHref(phone)}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setMessage("");
    setOpen(false);
  }

  return (
    <div
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 sm:bottom-6 sm:right-6"
      // Hover only for real mouse pointers; taps use the button's click toggle.
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        cancelClose();
        setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") scheduleClose();
      }}
    >
      {/* Pop-up */}
      <div
        id={panelId}
        role="dialog"
        aria-label={`Chat with ${storeName} on WhatsApp`}
        aria-hidden={!open}
        inert={!open}
        className={`absolute bottom-full right-0 mb-3 w-[min(18rem,calc(100vw-2rem))] origin-bottom-right overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-200 motion-reduce:transition-none ${
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between gap-2 bg-[#128C7E] px-3 py-2.5 text-white">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#25D366]">
              <WhatsAppGlyph className="h-4 w-4" />
            </span>
            Welcome to {storeName}
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            tabIndex={open ? 0 : -1}
            className="rounded-md p-1 transition-colors hover:bg-white/15"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={send} className="space-y-2.5 p-3">
          <p className="inline-block rounded-2xl rounded-tl-sm bg-[#25D366]/10 px-3 py-2 text-sm text-ink">Hi, how can I help you?</p>
          <label className="block">
            <span className="sr-only">Your message</span>
            <textarea
              ref={textRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={cancelClose}
              tabIndex={open ? 0 : -1}
              rows={2}
              maxLength={1000}
              placeholder="Type your message..."
              className="block w-full resize-none rounded-xl border border-black/10 px-3 py-2 text-base outline-none transition-colors placeholder:text-ink/40 focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/30 sm:text-sm"
            />
          </label>
          <button
            type="submit"
            tabIndex={open ? 0 : -1}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white transition-all hover:brightness-95 active:scale-[0.99]"
          >
            Send on WhatsApp <SendIcon />
          </button>
        </form>
      </div>

      {/* Button */}
      <button
        type="button"
        aria-label="Chat with us on WhatsApp"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          cancelClose();
          setOpen((v) => {
            if (!v) setTimeout(() => textRef.current?.focus({ preventScroll: true }), 50);
            return !v;
          });
        }}
        className="group relative grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:h-14 sm:w-14 motion-reduce:transition-none"
      >
        {!open && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-30 motion-reduce:hidden" />}
        <WhatsAppGlyph className="relative h-7 w-7 sm:h-8 sm:w-8" />
      </button>
    </div>
  );
}

export default function FloatingButtons({ phone, storeName }: { phone: string; storeName: string }) {
  return (
    <>
      <BackToTop />
      {phone && <WhatsAppChat phone={phone} storeName={storeName} />}
    </>
  );
}
