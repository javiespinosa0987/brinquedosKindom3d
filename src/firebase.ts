import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCDgVaPtvt-uIOBCZZnoAcCwhA-V0VE33k",
  authDomain: "lojabrinquedos3d.firebaseapp.com",
  databaseURL: "https://lojabrinquedos3d-default-rtdb.firebaseio.com",
  projectId: "lojabrinquedos3d",
  storageBucket: "lojabrinquedos3d.firebasestorage.app",
  messagingSenderId: "925368461690",
  appId: "1:925368461690:web:9204ba67b73ffef3844ec3",
  measurementId: "G-CTXQXRW108"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;