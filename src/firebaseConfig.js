// firebaseConfig.js
import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore" // Import Firestore

// Your Firebase configuration from the console
const firebaseConfig = {
    apiKey: "AIzaSyBObllcxCK8d9g-i29qQ7-yPSb6Dkgio-Q",
    authDomain: "gyroscope-3473f.firebaseapp.com",
    projectId: "gyroscope-3473f",
    storageBucket: "gyroscope-3473f.appspot.com",
    messagingSenderId: "379315740663",
    appId: "1:379315740663:web:f2c81660ce6fd83f7718f2",
    measurementId: "G-E77PNWKHFB",
}
const app = initializeApp(firebaseConfig)
const db = getFirestore(app) // Initialize Firestore

export { app, db }
