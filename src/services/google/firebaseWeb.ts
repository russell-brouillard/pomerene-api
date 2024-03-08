// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA2tdOulU73ADVdPhrnxQYt570L4ZBRQFQ",
  authDomain: "pomerene-dev.firebaseapp.com",
  projectId: "pomerene-dev",
  storageBucket: "pomerene-dev.appspot.com",
  messagingSenderId: "844147711427",
  appId: "1:844147711427:web:2386f0061923f540bdf176",
  measurementId: "G-6T3CY94SZB",
};

// Initialize Firebase
const appWeb = initializeApp(firebaseConfig);

export const authWeb = getAuth(appWeb);
