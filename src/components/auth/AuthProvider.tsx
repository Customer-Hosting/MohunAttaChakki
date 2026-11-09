"use client";

// Type-only import: the Firebase SDK itself is loaded on demand (see lib/firebase/client.ts).
import type { User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { isFirebaseConfigured, loadFirebaseAuth, startAnalytics } from "@/lib/firebase/client";
import type { UserProfile } from "@/lib/types";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: Status;
  user: User | null;
  profile: UserProfile | null;
  /** Set when Firebase login worked but saving/loading the MongoDB profile failed. */
  profileError: string | null;
  signUp(input: { name: string; email: string; phone: string; password: string }): Promise<void>;
  logIn(email: string, password: string): Promise<void>;
  logOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  /** Confirms the current password, then sets a new one for the signed-in user. */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  retryProfile(): Promise<void>;
  /** fetch() with the current user's Firebase ID token attached. */
  authFetch(input: string, init?: RequestInit): Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function syncProfile(user: User, details: { name: string; phone: string } | null) {
  const token = await user.getIdToken();
  const res = await fetch("/api/auth/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(details ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load your account.");
  return data.profile as UserProfile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(isFirebaseConfigured ? "loading" : "unauthenticated");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  // Name + phone from the signup form, sent with the first sync after account creation.
  const pendingSignup = useRef<{ name: string; phone: string } | null>(null);
  const signupSync = useRef<{ resolve(): void; reject(e: unknown): void } | null>(null);

  const loadProfile = useCallback(async (firebaseUser: User) => {
    const details = pendingSignup.current;
    pendingSignup.current = null;
    try {
      setProfile(await syncProfile(firebaseUser, details));
      setProfileError(null);
      signupSync.current?.resolve();
    } catch (error) {
      pendingSignup.current = details; // keep signup details so a retry still saves them
      setProfileError(error instanceof Error ? error.message : "Could not load your account.");
      signupSync.current?.reject(error);
    } finally {
      signupSync.current = null;
    }
  }, []);

  // Optional Firebase Analytics (no-op unless NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is set).
  useEffect(() => startAnalytics(), []);

  useEffect(() => {
    // Firebase not configured — browsing still works, login is unavailable.
    if (!isFirebaseConfigured) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    loadFirebaseAuth()
      .then(({ auth, fb }) => {
        if (cancelled) return;
        unsubscribe = fb.onAuthStateChanged(auth, async (firebaseUser) => {
          setUser(firebaseUser);
          if (!firebaseUser) {
            setProfile(null);
            setProfileError(null);
            setStatus("unauthenticated");
            return;
          }
          await loadProfile(firebaseUser);
          setStatus("authenticated");
        });
      })
      .catch(() => {
        // The SDK could not be downloaded (e.g. offline). Browsing still works; logging in
        // retries the download.
        if (!cancelled) setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [loadProfile]);

  const signUp = useCallback<AuthContextValue["signUp"]>(async ({ name, email, phone, password }) => {
    pendingSignup.current = { name, phone };
    // Resolves once the MongoDB record (with name + phone) has been saved.
    const saved = new Promise<void>((resolve, reject) => {
      signupSync.current = { resolve, reject };
    });
    try {
      const { auth, fb } = await loadFirebaseAuth();
      await fb.createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      pendingSignup.current = null;
      signupSync.current = null;
      throw error;
    }
    await saved;
  }, []);

  const logIn = useCallback(async (email: string, password: string) => {
    const { auth, fb } = await loadFirebaseAuth();
    await fb.signInWithEmailAndPassword(auth, email, password);
  }, []);

  const logOut = useCallback(async () => {
    const { auth, fb } = await loadFirebaseAuth();
    await fb.signOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { auth, fb } = await loadFirebaseAuth();
    await fb.sendPasswordResetEmail(auth, email);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const { auth, fb } = await loadFirebaseAuth();
    const current = auth.currentUser;
    if (!current?.email) throw new Error("Please log in again to change your password.");
    // Firebase requires a recent login for password changes; re-checking the current password
    // also stops someone using an unattended, logged-in browser from taking over the account.
    await fb.reauthenticateWithCredential(current, fb.EmailAuthProvider.credential(current.email, currentPassword));
    await fb.updatePassword(current, newPassword);
  }, []);

  const retryProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  const authFetch = useCallback(async (input: string, init: RequestInit = {}) => {
    // Without Firebase configured there is never a signed-in user; skip loading the SDK.
    const current = isFirebaseConfigured ? ((await loadFirebaseAuth().catch(() => null))?.auth.currentUser ?? null) : null;
    const headers = new Headers(init.headers);
    if (current) headers.set("Authorization", `Bearer ${await current.getIdToken()}`);
    return fetch(input, { ...init, headers });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, profile, profileError, signUp, logIn, logOut, resetPassword, changePassword, retryProfile, authFetch }),
    [status, user, profile, profileError, signUp, logIn, logOut, resetPassword, changePassword, retryProfile, authFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
