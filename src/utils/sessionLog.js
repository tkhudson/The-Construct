import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * Key used for storing the session log.
 */
const SESSION_LOG_KEY = "theConstruct_sessionLog";

/**
 * Save the session log (messages, character, config, timestamp).
 * Uses SecureStore on native, AsyncStorage on web.
 * @param {Object} log - The session log object to save.
 * @returns {Promise<void>}
 */
export async function saveSessionLog(log) {
  const data = JSON.stringify({
    ...log,
    timestamp: Date.now(),
  });
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(SESSION_LOG_KEY, data);
  } else {
    await SecureStore.setItemAsync(SESSION_LOG_KEY, data);
  }
}

/**
 * Load the session log.
 * @returns {Promise<Object|null>} The session log object, or null if not found.
 */
export async function loadSessionLog() {
  let data;
  if (Platform.OS === "web") {
    data = await AsyncStorage.getItem(SESSION_LOG_KEY);
  } else {
    data = await SecureStore.getItemAsync(SESSION_LOG_KEY);
  }
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

/**
 * Clear the saved session log.
 * @returns {Promise<void>}
 */
export async function clearSessionLog() {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(SESSION_LOG_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_LOG_KEY);
  }
}

/**
 * Check if a session log exists.
 * @returns {Promise<boolean>}
 */
export async function sessionLogExists() {
  if (Platform.OS === "web") {
    const data = await AsyncStorage.getItem(SESSION_LOG_KEY);
    return !!data;
  } else {
    const data = await SecureStore.getItemAsync(SESSION_LOG_KEY);
    return !!data;
  }
}
