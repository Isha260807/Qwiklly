/**
 * Firebase Configuration
 * Initialize Firebase for push notifications
 */

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getDatabase } from 'firebase/database';

// Firebase configuration must come from the Vite environment.
// Do not add fallback project values here: a missing/mismatched environment
// must fail loudly instead of registering tokens with the wrong Firebase app.
const firebaseConfig = Object.freeze({
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
  authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
  storageBucket: String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
  messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
  measurementId: String(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '').trim(),
  databaseURL: String(import.meta.env.VITE_FIREBASE_DATABASE_URL || '').trim()
});

const requiredFirebaseConfigKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];

const missingFirebaseConfigKeys = requiredFirebaseConfigKeys.filter(
  (key) => !firebaseConfig[key]
);

// Initialize Firebase
let app;
let messaging;
let db;

if (missingFirebaseConfigKeys.length > 0) {
  console.error(`[Firebase] Missing frontend env variables: ${missingFirebaseConfigKeys.join(', ')}`);
} else {
try {
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
  db = getDatabase(app);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}

}

export { app, messaging, db, firebaseConfig, getToken, onMessage };
