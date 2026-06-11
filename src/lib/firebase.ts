import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC1OH5zGCyyibYiCngt8TTWYqmYZnczCFI",
  authDomain: "studio-161651395-a9ed9.firebaseapp.com",
  projectId: "studio-161651395-a9ed9",
  storageBucket: "studio-161651395-a9ed9.firebasestorage.app",
  messagingSenderId: "239369169208",
  appId: "1:239369169208:web:ec01008e9a93d56d89b9cd"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
