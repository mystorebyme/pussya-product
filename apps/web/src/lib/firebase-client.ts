"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Firebase web config (client ke liye public hoti hai — koi secret nahi).
 * Setup: docs/07-security/phone-otp.md
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId);

let cached: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null;
  if (cached) return cached;
  cached = getApps().length ? getApp() : initializeApp(config as Required<typeof config>);
  return cached;
}

export function getFirebaseAuthClient(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}
