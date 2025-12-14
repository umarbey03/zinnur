// firebase-config.js
// Minimal config for frontend (safe with proper security rules)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js";

// Firebase config (frontend exposure is normal)
// Security handled via Firestore and Storage rules
const firebaseConfig = {
  apiKey: "AIzaSyCfS6NqstlzVtcd_wLBKDSOtg5X0LAH-UM",
  authDomain: "zin-nur.firebaseapp.com",
  projectId: "zin-nur",
  storageBucket: "zin-nur.firebasestorage.app",
  messagingSenderId: "5862519402",
  appId: "1:5862519402:web:fc23d7291e3772f7921013"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exports
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
