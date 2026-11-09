// Friendly messages for Firebase Auth error codes.
const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email / mobile number or password.",
  "auth/wrong-password": "Incorrect email / mobile number or password.",
  "auth/user-not-found": "Incorrect email / mobile number or password.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/missing-email": "Please enter your email address.",
  "auth/missing-password": "Please enter your password.",
  "auth/email-already-in-use": "An account with this email already exists. Please log in instead.",
  "auth/weak-password": "Password is too weak. Use at least 6 characters.",
  "auth/password-does-not-meet-requirements": "Password is too weak. Use at least 6 characters.",
  "auth/network-request-failed": "Network error. Please check your internet connection and try again.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/user-disabled": "This account has been disabled. Please contact us.",
  "auth/invalid-api-key": "Login is not available right now. Please try again later.",
  "auth/configuration-not-found": "Login is not available right now. Please try again later.",
};

export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  if (MESSAGES[code]) return MESSAGES[code];
  if (error instanceof Error && error.message && !code) return error.message;
  return "Something went wrong. Please try again.";
}
