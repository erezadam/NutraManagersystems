import type { FirebaseApp } from 'firebase/app';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getRuntimeEnv, hasFirebaseConfig } from '../config/env';

const env = getRuntimeEnv();

export function ensureFirebaseConfigured(): void {
  if (!hasFirebaseConfig(env)) {
    throw new Error('Firebase is not configured. Please set VITE_FIREBASE_* env vars.');
  }
}

function getFirebaseApp() {
  ensureFirebaseConfigured();

  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
  };

  return getApps().length > 0 ? getApp() : initializeApp(config);
}

let appInstance: FirebaseApp | null = null;

function app(): FirebaseApp {
  if (!appInstance) {
    appInstance = getFirebaseApp();
  }
  return appInstance;
}

export function getFirebaseAuth() {
  return getAuth(app());
}

export function getFirebaseDb() {
  return getFirestore(app());
}

export function getFirebaseStorage() {
  return getStorage(app());
}
