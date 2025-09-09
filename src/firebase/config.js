// Firebase configuration file
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
// For security purposes, these values should ideally be stored in environment variables
// For now, these will be placeholder values the user will need to replace with their own
const firebaseConfig = {
  apiKey: "AIzaSyB6wZZeoCNmwxDsJHM4n2UJu63EXiIAdDU",
  authDomain: "thedndconstruct.firebaseapp.com",
  databaseURL: "https://thedndconstruct-default-rtdb.firebaseio.com",
  projectId: "thedndconstruct",
  storageBucket: "thedndconstruct.firebasestorage.app",
  messagingSenderId: "430303008051",
  appId: "1:430303008051:web:3b910712a55867329c1a46",
  measurementId: "G-1168LL9N9D",
};

// Check if Firebase is already initialized to avoid duplicate initialization
let app;
let db;
let auth;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  auth = getAuth(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

// Function to check if Firebase is configured
const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId !== "your-project-id"
  );
};

// Function to save Firebase config to AsyncStorage
const saveFirebaseConfig = async (config) => {
  try {
    await AsyncStorage.setItem("firebaseConfig", JSON.stringify(config));
    return true;
  } catch (error) {
    console.error("Error saving Firebase config:", error);
    return false;
  }
};

// Function to load Firebase config from AsyncStorage
const loadFirebaseConfig = async () => {
  try {
    const configStr = await AsyncStorage.getItem("firebaseConfig");
    if (configStr) {
      return JSON.parse(configStr);
    }
    return null;
  } catch (error) {
    console.error("Error loading Firebase config:", error);
    return null;
  }
};

export {
  app,
  db,
  auth,
  isFirebaseConfigured,
  saveFirebaseConfig,
  loadFirebaseConfig,
};
