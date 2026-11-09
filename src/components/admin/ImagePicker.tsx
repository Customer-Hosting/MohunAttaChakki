"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { assetUrl } from "@/lib/site";
import { SITE_PHOTOS } from "@/lib/site-photos";
import { checkImageFile, uploadImage, UploadFailure } from "@/lib/upload-client";
import { MAX_UPLOAD_LABEL, type UploadFolder } from "@/lib/upload-rules";
import { btnSecondary } from "./ui";

const CONCURRENT_UPLOADS = 2;

interface PendingUpload {
  id: string;
  file: File;
  preview: string; // object URL for the local preview
  status: "queued" | "uploading" | "failed";
  progress: number;
  error?: string;
  canRetry?: boolean;
}

/**
 * Edits a list of image URLs: upload (resized in the browser, stored by the server), pick a shop photo,
 * remove, set as main.
 * `max = 1` makes it a single-image picker. Each upload has its own preview, progress, error and
 * retry; finished uploads are added to `value` immediately, so one failure never loses the others.
 */
export default function ImagePicker({
  value,
  onChange,
  folder,
  max = 8,
  label,
  onBusyChange,
}: {
  value: string[];
  onChange: (images: string[]) => void;
  folder: UploadFolder;
  max?: number;
  label: string;
  /** Called with true while uploads are queued or running (e.g. to disable the Save button). */
  onBusyChange?: (busy: boolean) => void;
}) {
  const id = useId();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  // Latest values for async callbacks (uploads finish after re-renders).
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  const queue = useRef<string[]>([]);
  const active = useRef(0);
  const files = useRef(new Map<string, File>());
  const controllers = useRef(new Map<string, AbortController>());

  const busy = pending.some((p) => p.status !== "failed");
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Abort running uploads and free previews when the picker unmounts.
  useEffect(() => {
    const running = controllers.current;
    return () => running.forEach((c) => c.abort());
  }, []);
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const patch = (itemId: string, changes: Partial<PendingUpload>) =>
    setPending((list) => list.map((p) => (p.id === itemId ? { ...p, ...changes } : p)));

  const drop = useCallback((itemId: string) => {
    setPending((list) => {
      const item = list.find((p) => p.id === itemId);
      if (item) {
        URL.revokeObjectURL(item.preview);
        previews.current.delete(item.preview);
      }
      return list.filter((p) => p.id !== itemId);
    });
    files.current.delete(itemId);
  }, []);

  function pump() {
    while (active.current < CONCURRENT_UPLOADS && queue.current.length > 0) {
      const itemId = queue.current.shift()!;
      const file = files.current.get(itemId);
      if (!file) continue;
      active.current++;
      const controller = new AbortController();
      controllers.current.set(itemId, controller);
      setPending((list) => list.map((p) => (p.id === itemId ? { ...p, status: "uploading", progress: 0, error: undefined } : p)));

      uploadImage(file, folder, () => (user ? user.getIdToken() : Promise.resolve(null)), {
        signal: controller.signal,
        onProgress: (progress) => setPending((list) => list.map((p) => (p.id === itemId ? { ...p, progress } : p))),
      })
        .then((url) => {
          if (controller.signal.aborted) return; // cancelled: don't add it
          const next = max === 1 ? [url] : [...valueRef.current, url].slice(0, max);
          valueRef.current = next;
          onChangeRef.current(next);
          drop(itemId);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          const failure =
            error instanceof UploadFailure ? error : new UploadFailure("Upload failed. Please retry.", true);
          setPending((list) =>
            list.map((p) =>
              p.id === itemId ? { ...p, status: "failed", error: failure.message, canRetry: failure.retry } : p,
            ),
          );
        })
        .finally(() => {
          controllers.current.delete(itemId);
          active.current--;
          pump();
        });
    }
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setNotice(null);
    const room = max === 1 ? (pending.length === 0 ? 1 : 0) : max - value.length - pending.length;
    const chosen = [...list];
    if (chosen.length > room) {
      setNotice(room <= 0 ? `You can add up to ${max} images.` : `Only ${room} more image${room === 1 ? "" : "s"} can be added; extra files were skipped.`);
    }

    const added: PendingUpload[] = [];
    const rejected: string[] = [];
    for (const file of chosen.slice(0, Math.max(room, 0))) {
      try {
        checkImageFile(file);
      } catch (error) {
        rejected.push(error instanceof UploadFailure ? error.message : `${file.name}: not a valid image.`);
        continue;
      }
      const itemId = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      previews.current.add(preview);
      files.current.set(itemId, file);
      queue.current.push(itemId);
      added.push({ id: itemId, file, preview, status: "queued", progress: 0 });
    }
    if (rejected.length) setNotice(rejected.join(" "));
    if (added.length) {
      setPending((current) => [...current, ...added]);
      pump();
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function retry(itemId: string) {
    patch(itemId, { status: "queued", progress: 0, error: undefined });
    queue.current.push(itemId);
    pump();
  }

  function cancel(itemId: string) {
    controllers.current.get(itemId)?.abort();
    queue.current = queue.current.filter((q) => q !== itemId);
    drop(itemId);
  }

  function setImages(next: string[]) {
    valueRef.current = next;
    onChange(next);
  }

  const room = max === 1 ? 1 : max - value.length - pending.length;

  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      {(value.length > 0 || pending.length > 0) && (
        <ul className="mt-2 flex flex-wrap gap-3">
          {value.map((src, i) => (
            <li key={src + i} className="w-24">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-neutral-100">
                <Image src={assetUrl(src)} alt={`${label} ${i + 1}`} fill sizes="96px" className="object-cover" />
                {max > 1 && i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-ink px-1 text-[10px] font-semibold text-white">Main</span>
                )}
              </div>
              <div className="mt-1 flex justify-between text-xs">
                {max > 1 && i > 0 ? (
                  <button type="button" className="underline" onClick={() => setImages([src, ...value.filter((_, j) => j !== i)])}>
                    Make main
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  className="text-red-700 underline"
                  aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
                  onClick={() => setImages(value.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}

          {pending.map((item) => (
            <li key={item.id} className="w-24">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-neutral-100">
                {/* Local preview (blob: URL) — next/image can't optimize it. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.preview} alt={`Uploading ${item.file.name}`} className={`h-full w-full object-cover ${item.status === "failed" ? "opacity-40" : "opacity-70"}`} />
                {item.status !== "failed" && (
                  <div className="absolute inset-x-1 bottom-1 h-1.5 overflow-hidden rounded bg-white/70" role="progressbar" aria-label={`Uploading ${item.file.name}`} aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-ink transition-[width]" style={{ width: `${item.status === "queued" ? 0 : Math.max(item.progress, 5)}%` }} />
                  </div>
                )}
              </div>
              <p className={`mt-1 text-xs ${item.status === "failed" ? "text-red-700" : "text-ink/60"}`} role={item.status === "failed" ? "alert" : undefined}>
                {item.status === "queued" ? "Waiting…" : item.status === "uploading" ? `Uploading ${item.progress}%` : item.error}
              </p>
              <div className="mt-0.5 flex justify-between text-xs">
                {item.status === "failed" && item.canRetry ? (
                  <button type="button" className="underline" onClick={() => retry(item.id)}>
                    Retry
                  </button>
                ) : (
                  <span />
                )}
                <button type="button" className="text-red-700 underline" onClick={() => cancel(item.id)}>
                  {item.status === "failed" ? "Remove" : "Cancel"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {room > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            id={`${id}-file`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={max > 1}
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />
          <label
            htmlFor={`${id}-file`}
            className={`${btnSecondary} cursor-pointer ${max === 1 && busy ? "pointer-events-none opacity-50" : ""}`}
          >
            {max === 1 && busy ? "Uploading…" : max === 1 && value.length ? "Upload new" : "Upload image"}
          </label>
          <label className="text-sm">
            <span className="sr-only">Choose a shop photo for {label.toLowerCase()}</span>
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                setImages(max === 1 ? [e.target.value] : [...value, e.target.value].slice(0, max));
              }}
              className="rounded-lg border border-black/20 bg-white px-2 py-2 text-sm"
            >
              <option value="">…or choose a shop photo</option>
              {SITE_PHOTOS.filter((p) => !value.includes(p.path)).map((p) => (
                <option key={p.path} value={p.path}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <p className="mt-1 text-xs text-ink/60">
        JPG, PNG or WebP, up to {MAX_UPLOAD_LABEL} each. Large photos are resized automatically.
        {max > 1 ? ` Up to ${max} images; the first is the main image.` : ""}
      </p>
      {notice && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {notice}
        </p>
      )}
    </fieldset>
  );
}
