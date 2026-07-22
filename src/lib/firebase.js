import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBcY4fRbtUVrQyM2Y_IywgPmQLPV_j79-o",
  authDomain: "g-m-parts-lac7fg.firebaseapp.com",
  projectId: "g-m-parts-lac7fg",
  storageBucket: "g-m-parts-lac7fg.appspot.com",
  messagingSenderId: "192029790072",
  appId: "1:192029790072:web:09dd0119229174fcc6428d",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);