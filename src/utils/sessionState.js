// Session state management utilities
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const STATE_KEYS = {
  TIMER: 'theConstruct_timerState',
  SESSION: 'theConstruct_sessionState'
};

/**
 * Clear all session-related state
 */
export async function clearAllSessionState() {
  if (Platform.OS === "web") {
    await Promise.all([
      AsyncStorage.removeItem(STATE_KEYS.TIMER),
      AsyncStorage.removeItem(STATE_KEYS.SESSION)
    ]);
  } else {
    await Promise.all([
      SecureStore.deleteItemAsync(STATE_KEYS.TIMER),
      SecureStore.deleteItemAsync(STATE_KEYS.SESSION)
    ]);
  }
}

/**
 * Initialize fresh session state
 * @param {Object} config - Session configuration
 */
export async function initializeSessionState(config) {
  const sessionState = {
    startTime: Date.now(),
    durationMinutes: config.sessionTime || 30,
    isActive: false,
    config
  };

  if (Platform.OS === "web") {
    await AsyncStorage.setItem(STATE_KEYS.SESSION, JSON.stringify(sessionState));
    await AsyncStorage.removeItem(STATE_KEYS.TIMER);
  } else {
    await SecureStore.setItemAsync(STATE_KEYS.SESSION, JSON.stringify(sessionState));
    await SecureStore.deleteItemAsync(STATE_KEYS.TIMER);
  }

  return sessionState;
}

/**
 * Get current session state
 * @returns {Promise<Object|null>} Session state or null if not found
 */
export async function getSessionState() {
  try {
    let data;
    if (Platform.OS === "web") {
      data = await AsyncStorage.getItem(STATE_KEYS.SESSION);
    } else {
      data = await SecureStore.getItemAsync(STATE_KEYS.SESSION);
    }
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting session state:', error);
    return null;
  }
}

/**
 * Check if there's an active session
 * @returns {Promise<boolean>}
 */
export async function hasActiveSession() {
  const state = await getSessionState();
  return !!state && state.isActive;
}

/**
 * End current session
 */
export async function endSession() {
  await clearAllSessionState();
}

export default {
  clearAllSessionState,
  initializeSessionState,
  getSessionState,
  hasActiveSession,
  endSession
};
