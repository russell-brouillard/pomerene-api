// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAuATgE9ot8hU89RuBt7--P25bJS-_5K-Y",
  authDomain: "solona-hack.firebaseapp.com",
  projectId: "solona-hack",
  storageBucket: "solona-hack.appspot.com",
  messagingSenderId: "1023623538933",
  appId: "1:1023623538933:web:0dd3bbcd5f51e129c5fdbc",
  measurementId: "G-VR2R1BBFDY"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
const analytics = getAnalytics(app);