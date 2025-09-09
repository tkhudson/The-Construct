// Session Service for Multiplayer Functionality
import { nanoid } from 'nanoid';
import {
  ref,
  set,
  onValue,
  push,
  update,
  get,
  off,
  serverTimestamp,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';
import { db } from './config';

// Generate a random 6-character session code
export const generateSessionCode = () => {
  // Create a string of allowed characters (avoiding similar looking characters)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';

  // Generate a 6-character code
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};

// Create a new game session
export const createSession = async (dmName, theme, settings = {}) => {
  try {
    // Generate a unique session code
    const sessionCode = generateSessionCode();

    // Create a session record
    const sessionData = {
      sessionCode,
      dmId: nanoid(), // Generate unique ID for DM
      dmName,
      theme,
      settings,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      status: 'waiting', // waiting, active, ended
      players: {},
    };

    // Write to Firebase
    const sessionRef = ref(db, `sessions/${sessionCode}`);
    await set(sessionRef, sessionData);

    return {
      success: true,
      sessionCode,
      dmId: sessionData.dmId,
      ...sessionData
    };
  } catch (error) {
    console.error('Error creating session:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Join an existing session
export const joinSession = async (sessionCode, playerName) => {
  try {
    // Check if session exists
    const sessionRef = ref(db, `sessions/${sessionCode}`);
    const snapshot = await get(sessionRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    const sessionData = snapshot.val();

    // Check if session is still accepting players
    if (sessionData.status === 'ended') {
      return {
        success: false,
        error: 'This session has ended'
      };
    }

    // Generate a unique player ID
    const playerId = nanoid();

    // Add player to the session
    const playerData = {
      id: playerId,
      name: playerName,
      joinedAt: serverTimestamp(),
      isActive: true,
      character: null // Will be set later
    };

    const playerRef = ref(db, `sessions/${sessionCode}/players/${playerId}`);
    await set(playerRef, playerData);

    // Update session's lastActive timestamp
    await update(sessionRef, {
      lastActive: serverTimestamp()
    });

    return {
      success: true,
      sessionCode,
      playerId,
      dmName: sessionData.dmName,
      theme: sessionData.theme
    };
  } catch (error) {
    console.error('Error joining session:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Leave a session
export const leaveSession = async (sessionCode, playerId) => {
  try {
    const playerRef = ref(db, `sessions/${sessionCode}/players/${playerId}`);
    await update(playerRef, {
      isActive: false,
      leftAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error leaving session:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// End a session (DM only)
export const endSession = async (sessionCode, dmId) => {
  try {
    // Verify DM identity
    const sessionRef = ref(db, `sessions/${sessionCode}`);
    const snapshot = await get(sessionRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    const sessionData = snapshot.val();
    if (sessionData.dmId !== dmId) {
      return {
        success: false,
        error: 'Only the DM can end this session'
      };
    }

    // Update session status
    await update(sessionRef, {
      status: 'ended',
      endedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error ending session:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send a message in the session
export const sendMessage = async (sessionCode, senderId, senderName, message, isDM = false, isAIMessage = false) => {
  try {
    const messageData = {
      senderId,
      senderName,
      message,
      timestamp: serverTimestamp(),
      isDM,
      isAIMessage
    };

    // Use push to generate a unique key for each message
    const messagesRef = ref(db, `sessions/${sessionCode}/messages`);
    const newMessageRef = push(messagesRef);
    await set(newMessageRef, messageData);

    // Update session's lastActive timestamp
    const sessionRef = ref(db, `sessions/${sessionCode}`);
    await update(sessionRef, {
      lastActive: serverTimestamp()
    });

    return {
      success: true,
      messageId: newMessageRef.key
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send a DM-to-AI message (private, not visible to players)
export const sendDMToAIMessage = async (sessionCode, dmId, message) => {
  try {
    const messageData = {
      dmId,
      message,
      timestamp: serverTimestamp(),
      isPrivate: true
    };

    // Use push to generate a unique key for each message
    const aiMessagesRef = ref(db, `sessions/${sessionCode}/aiMessages`);
    const newMessageRef = push(aiMessagesRef);
    await set(newMessageRef, messageData);

    return {
      success: true,
      messageId: newMessageRef.key
    };
  } catch (error) {
    console.error('Error sending DM-to-AI message:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Subscribe to session updates
export const subscribeToSession = (sessionCode, callback) => {
  const sessionRef = ref(db, `sessions/${sessionCode}`);

  // Set up listener
  onValue(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({
        success: true,
        data: snapshot.val()
      });
    } else {
      callback({
        success: false,
        error: 'Session not found'
      });
    }
  });

  // Return function to unsubscribe
  return () => off(sessionRef);
};

// Subscribe to messages
export const subscribeToMessages = (sessionCode, callback) => {
  const messagesRef = ref(db, `sessions/${sessionCode}/messages`);

  // Set up listener
  onValue(messagesRef, (snapshot) => {
    if (snapshot.exists()) {
      // Convert object to array with keys as ids
      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      // Sort by timestamp (if available)
      messages.sort((a, b) => {
        if (!a.timestamp) return -1;
        if (!b.timestamp) return 1;
        return a.timestamp - b.timestamp;
      });

      callback({
        success: true,
        messages
      });
    } else {
      callback({
        success: true,
        messages: []
      });
    }
  });

  // Return function to unsubscribe
  return () => off(messagesRef);
};

// Subscribe to AI messages (DM only)
export const subscribeToDMAIMessages = (sessionCode, dmId, callback) => {
  const aiMessagesRef = ref(db, `sessions/${sessionCode}/aiMessages`);

  // Set up listener
  onValue(aiMessagesRef, (snapshot) => {
    if (snapshot.exists()) {
      // Convert object to array with keys as ids
      const messages = [];
      snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val();
        // Only include messages for this DM
        if (message.dmId === dmId) {
          messages.push({
            id: childSnapshot.key,
            ...message
          });
        }
      });

      // Sort by timestamp
      messages.sort((a, b) => {
        if (!a.timestamp) return -1;
        if (!b.timestamp) return 1;
        return a.timestamp - b.timestamp;
      });

      callback({
        success: true,
        messages
      });
    } else {
      callback({
        success: true,
        messages: []
      });
    }
  });

  // Return function to unsubscribe
  return () => off(aiMessagesRef);
};

// Update player's character
export const updatePlayerCharacter = async (sessionCode, playerId, character) => {
  try {
    const playerRef = ref(db, `sessions/${sessionCode}/players/${playerId}`);
    await update(playerRef, { character });

    return { success: true };
  } catch (error) {
    console.error('Error updating player character:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update map state
export const updateMapState = async (sessionCode, mapState, dmId) => {
  try {
    // Verify DM identity
    const sessionRef = ref(db, `sessions/${sessionCode}`);
    const snapshot = await get(sessionRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        error: 'Session not found'
      };
    }

    const sessionData = snapshot.val();
    if (sessionData.dmId !== dmId) {
      return {
        success: false,
        error: 'Only the DM can update the map'
      };
    }

    // Update map state
    const mapRef = ref(db, `sessions/${sessionCode}/mapState`);
    await set(mapRef, {
      ...mapState,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating map state:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Subscribe to map updates
export const subscribeToMapUpdates = (sessionCode, callback) => {
  const mapRef = ref(db, `sessions/${sessionCode}/mapState`);

  // Set up listener
  onValue(mapRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({
        success: true,
        mapState: snapshot.val()
      });
    } else {
      callback({
        success: true,
        mapState: null
      });
    }
  });

  // Return function to unsubscribe
  return () => off(mapRef);
};

// Find session by code
export const findSessionByCode = async (sessionCode) => {
  try {
    const sessionRef = ref(db, `sessions/${sessionCode}`);
    const snapshot = await get(sessionRef);

    if (snapshot.exists()) {
      return {
        success: true,
        session: snapshot.val()
      };
    } else {
      return {
        success: false,
        error: 'Session not found'
      };
    }
  } catch (error) {
    console.error('Error finding session:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
