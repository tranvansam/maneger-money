// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, connectAuthEmulator, updateProfile, type Auth, type User, type UserInfo } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Your web app's Firebase configuration from .env via runtimeConfig
const firebaseConfig = {
  apiKey: "AIzaSyAmr3SW4uIE1hyxEb9CF2PcDqP7sYV-wrw",
  authDomain: "maneger-money.firebaseapp.com",
  projectId: "maneger-money",
  storageBucket: "maneger-money.appspot.com",
  messagingSenderId: "643115939406",
  appId: "1:643115939406:web:3bc790bd7d0c0bf62ab51f",
  measurementId: "G-S0B086MH8W"
};

// Initialize Firebase only on client side and only if not already initialized
let app: FirebaseApp;
let analytics;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (process.client) {
  try {
    // Check if Firebase app already initialized
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized for the first time");
    } else {
      app = getApp();
      console.log("Using existing Firebase app");
    }
    
    // Get auth and analytics instances
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    // Set tenantId to null explicitly
    if (auth) {
      auth.tenantId = null;
      
      // Uncomment this for local development if needed
      // if (process.env.NODE_ENV !== 'production') {
      //   connectAuthEmulator(auth, 'http://localhost:9099');
      // }
    }
    
    try {
      analytics = getAnalytics(app);
    } catch (error) {
      console.log("Analytics not initialized:", error);
    }
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
}

export { auth, analytics, db, storage };

// Authentication functions
export const registerUser = async (email: string, password: string) => {
  if (!auth) throw new Error("Firebase Auth is not initialized");
  try {
    console.log("Registering user with email:", email);
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Registration successful:", result.user.uid);
    return result;
  } catch (error) {
    console.error("Register error:", error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  if (!auth) throw new Error("Firebase Auth is not initialized");
  try {
    console.log("Logging in user with email:", email);
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log("Login successful:", result.user.uid);
    return result;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  if (!auth) throw new Error("Firebase Auth is not initialized");
  try {
    console.log("Logging out user");
    await signOut(auth);
    console.log("Logout successful");
    return true;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    if (!auth) {
      if (process.client) {
        console.error("Firebase Auth is not initialized");
        reject(new Error("Firebase Auth is not initialized"));
      } else {
        resolve(null); // Server-side will always return null
      }
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        unsubscribe();
        console.log("Current user:", user ? user.email : "None");
        resolve(user);
      },
      (error) => {
        unsubscribe();
        console.error("Auth state change error:", error);
        reject(error);
      }
    );
  });
};

// Add the updateUserProfile function
export const updateUserProfile = async (user: User, profile: { displayName?: string, photoURL?: string }) => {
  if (!auth) throw new Error("Firebase Auth is not initialized");
  try {
    await updateProfile(user, profile);
    console.log("Profile updated successfully:", profile);
    
    // Force a refresh to make sure the changes are applied immediately
    await user.reload();
    console.log("User data reloaded with new profile");
    
    return true;
  } catch (error) {
    console.error("Profile update error:", error);
    throw error;
  }
};

// Nuxt plugin setup
export default defineNuxtPlugin(async (nuxtApp) => {
  if (process.server) {
    // Provide empty auth objects on server
    nuxtApp.provide('auth', {
      user: null,
      login: () => Promise.reject(new Error('Cannot login on server')),
      logout: () => Promise.reject(new Error('Cannot logout on server')),
      register: () => Promise.reject(new Error('Cannot register on server')),
      getCurrentUser: () => Promise.resolve(null)
    });
    return;
  }
  
  try {
    // Wait for Firebase auth to initialize
    const user = await getCurrentUser();
    
    // Make Firebase auth available in the app
    nuxtApp.provide('auth', {
      user: user,
      login: loginUser,
      logout: logoutUser,
      register: registerUser,
      getCurrentUser
    });
  } catch (error) {
    console.error("Firebase auth initialization error:", error);
    nuxtApp.provide('auth', {
      user: null,
      login: loginUser,
      logout: logoutUser,
      register: registerUser,
      getCurrentUser
    });
  }
}); 