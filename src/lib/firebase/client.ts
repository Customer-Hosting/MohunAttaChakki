"use client";

import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";

// These NEXT_PUBLIC_ values identify the Firebase project and are safe in the browser.
// Access control is enforced server-side by verifying ID tokens with the Admin SDK.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Local testing only (e.g. "127.0.0.1:9099"). Leave unset in production.
const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;

/** False until the NEXT_PUBLIC_FIREBASE_* values are set; login is then unavailable. */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/*
 * Performance: the Firebase SDK (~90 KB of JavaScript) is NOT part of the JavaScript every page
 * downloads up front. It is fetched on demand, after the page has rendered and become
 * interactive, the first time anything needs it (restoring the session on load, log in, etc.).
 * Every caller already waits on Firebase, so nothing behaves differently; pages just load faster.
 */

export type FirebaseAuthModule = typeof import("firebase/auth");

let appPromise: Promise<FirebaseApp> | null = null;
let authPromise: Promise<{ auth: Auth; fb: FirebaseAuthModule }> | null = null;

function loadFirebaseApp(): Promise<FirebaseApp> {
  appPromise ??= import("firebase/app").then(({ getApp, getApps, initializeApp }) =>
    getApps().length ? getApp() : initializeApp(firebaseConfig),
  );
  return appPromise;
}

/**
 * The Firebase Auth instance plus the firebase/auth functions, loaded once and shared.
 * Firebase keeps the session in browser storage (local persistence) by default,
 * so users stay logged in across refreshes.
 */
export function loadFirebaseAuth(): Promise<{ auth: Auth; fb: FirebaseAuthModule }> {
  authPromise ??= Promise.all([loadFirebaseApp(), import("firebase/auth")])
    .then(([app, fb]) => {
      const auth = fb.getAuth(app);
      if (emulatorHost) fb.connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
      return { auth, fb };
    })
    .catch((error) => {
      authPromise = null; // e.g. a network blip while fetching the chunk: allow a retry
      throw error;
    });
  return authPromise;
}

let analyticsStarted = false;

/**
 * Google Analytics for Firebase. Optional: only runs in the browser when
 * NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is set and the browser supports it. Loaded on demand so it
 * never blocks the page, and any failure is ignored (analytics must not break the shop).
 */
export function startAnalytics(): void {
  if (analyticsStarted || typeof window === "undefined" || !isFirebaseConfigured || !firebaseConfig.measurementId) return;
  analyticsStarted = true;
  Promise.all([loadFirebaseApp(), import("firebase/analytics")])
    .then(async ([app, { getAnalytics, isSupported }]) => {
      if (await isSupported()) getAnalytics(app);
    })
    .catch(() => {});
}
