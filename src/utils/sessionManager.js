// Session Manager - Handles session progress, saving, exporting, and time management
// Integrates with character progression, quest system, and AI service

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { Share } from "react-native"; // For mobile sharing
import * as FileSystem from "expo-file-system"; // For file operations
import characterProgression from "./characterProgression";
import questSystem from "./questSystem";

class SessionManager {
  constructor(aiService) {
    this.aiService = aiService;
    this.activeSession = null;
    this.sessionHistory = [];
    this.sessionTimers = new Map();

    // Session storage keys
    this.ACTIVE_SESSION_KEY = "the_construct_active_session";
    this.SESSION_HISTORY_KEY = "the_construct_session_history";
    this.CHARACTER_SAVES_KEY = "the_construct_character_saves";

    this.initialize();
  }

  /**
   * Initialize session manager and load any existing session data
   */
  async initialize() {
    try {
      await this.loadSessionHistory();
      await this.checkForActiveSession();
    } catch (error) {
      console.error("Session manager initialization error:", error);
    }
  }

  /**
   * Create a new game session
   * @param {Object} config - Session configuration
   * @param {Object} character - Player character
   * @returns {Object} New session data
   */
  async createSession(config, character) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newSession = {
      id: sessionId,
      config: { ...config },
      character: { ...character },

      // Session metadata
      createdAt: Date.now(),
      lastModified: Date.now(),
      totalPlayTime: 0,
      sessionNumber: this.sessionHistory.length + 1,

      // Session state
      currentLocation: "Starting Area",
      currentObjective: "Begin your adventure",
      quests: [],
      combatLog: [],
      explorationLog: [],
      dialogueHistory: [],

      // Progress tracking
      xpEarned: 0,
      levelsGained: 0,
      encountersCompleted: 0,
      locationsVisited: ["Starting Area"],
      charactersMet: [],
      itemsFound: [],

      // Time management
      timeLimit: parseInt(config.sessionTime) || 60,
      timeRemaining: (parseInt(config.sessionTime) || 60) * 60 * 1000, // Convert to milliseconds
      pacingStage: 0,
      timeWarnings: [],

      // AI integration
      aiPromptContext: [],
      conversationHistory: [],

      // Export data
      exportCount: 0,
      lastExported: null,

      // Session status
      status: "active",
      version: "2.0.0",
    };

    // Generate initial quest using the quest system
    const initialQuest = await questSystem.generateQuest(character, config);

    if (initialQuest) {
      newSession.quests = [initialQuest];
      newSession.currentObjective =
        initialQuest.objectives?.[0] || "Begin your adventure";
    }

    this.activeSession = newSession;
    await this.saveActiveSession();

    return newSession;
  }

  /**
   * Load an existing session
   * @param {string} sessionId - Session ID to load
   * @returns {Object} Loaded session data
   */
  async loadSession(sessionId) {
    try {
      const sessions = await this.getAllSessions();
      const session = sessions.find((s) => s.id === sessionId);

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      this.activeSession = session;

      // Update last accessed time
      this.activeSession.lastAccessed = Date.now();
      await this.saveActiveSession();

      // Restore character data if available
      if (session.character) {
        await this.restoreCharacterProgress(session.character);
      }

      return session;
    } catch (error) {
      console.error("Error loading session:", error);
      throw error;
    }
  }

  /**
   * Save the current active session
   * @param {Object} updates - Optional updates to merge with session data
   */
  async saveActiveSession(updates = {}) {
    if (!this.activeSession) {
      console.warn("No active session to save");
      return;
    }

    try {
      this.activeSession = {
        ...this.activeSession,
        ...updates,
        lastModified: Date.now(),
      };

      // Calculate total play time
      if (this.activeSession.startTime && this.activeSession.pauseTime) {
        this.activeSession.totalPlayTime +=
          (Date.now() - this.activeSession.startTime) / 1000 / 60; // minutes
      }

      const sessionData = JSON.stringify(this.activeSession);

      // Save to AsyncStorage
      await AsyncStorage.setItem(this.ACTIVE_SESSION_KEY, sessionData);

      // Also save to history
      await this.addToSessionHistory(this.activeSession);

      console.log("Session saved successfully");
    } catch (error) {
      console.error("Error saving session:", error);
      throw error;
    }
  }

  /**
   * Pause the current session
   */
  async pauseSession() {
    if (!this.activeSession) return;

    this.activeSession.status = "paused";
    this.activeSession.pauseTime = Date.now();

    // Stop any active timers
    const timer = this.sessionTimers.get(this.activeSession.id);
    if (timer) {
      clearInterval(timer);
      this.sessionTimers.delete(this.activeSession.id);
    }

    await this.saveActiveSession();
  }

  /**
   * Resume a paused session
   */
  async resumeSession() {
    if (!this.activeSession || this.activeSession.status !== "paused") return;

    this.activeSession.status = "active";
    this.activeSession.startTime = Date.now();
    delete this.activeSession.pauseTime;

    // Restart time management
    await this.startTimeManagement();

    await this.saveActiveSession();
  }

  /**
   * End the current session
   * @param {string} outcome - Session outcome ("completed", "abandoned", "time_up")
   */
  async endSession(outcome = "completed") {
    if (!this.activeSession) return;

    // Calculate final stats
    const finalStats = await this.calculateSessionStats();

    this.activeSession.status = "completed";
    this.activeSession.outcome = outcome;
    this.activeSession.completedAt = Date.now();
    this.activeSession.finalStats = finalStats;

    // Save final character state
    if (this.activeSession.character) {
      await this.saveCharacterProgress(this.activeSession.character);
    }

    // Clean up timers
    const timer = this.sessionTimers.get(this.activeSession.id);
    if (timer) {
      clearInterval(timer);
      this.sessionTimers.delete(this.activeSession.id);
    }

    await this.saveActiveSession();

    // Create completion summary
    const summary = await this.generateSessionSummary();

    return summary;
  }

  /**
   * Export session data in various formats
   * @param {string} format - Export format ("json", "txt", "html", "share")
   * @param {Object} options - Export options
   * @returns {Object} Export result
   */
  async exportSession(format = "json", options = {}) {
    if (!this.activeSession) {
      throw new Error("No active session to export");
    }

    try {
      let exportData;

      switch (format) {
        case "json":
          exportData = await this.exportAsJSON(options);
          break;
        case "txt":
          exportData = await this.exportAsText(options);
          break;
        case "html":
          exportData = await this.exportAsHTML(options);
          break;
        case "share":
          return await this.exportForSharing(options);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Update export metadata
      this.activeSession.exportCount =
        (this.activeSession.exportCount || 0) + 1;
      this.activeSession.lastExported = Date.now();
      await this.saveActiveSession();

      return {
        success: true,
        format,
        data: exportData,
        sessionId: this.activeSession.id,
        exportedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Export error:", error);
      return {
        success: false,
        error: error.message,
        format,
      };
    }
  }

  /**
   * Export session as JSON
   */
  async exportAsJSON(options) {
    const sessionCopy = { ...this.activeSession };
    delete sessionCopy.aiPromptContext; // Don't export internal AI data

    const exportData = {
      metadata: {
        exportVersion: "2.0.0",
        exportedAt: new Date().toISOString(),
        exportFormat: "json",
        sessionVersion: sessionCopy.version,
      },
      session: sessionCopy,
    };

    return exportData;
  }

  /**
   * Export session as readable text
   */
  async exportAsText(options) {
    const session = this.activeSession;
    const lines = [
      `🎮 The Construct - Session Export`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `📋 Session Information:`,
      `• Session ID: ${session.id}`,
      `• Created: ${new Date(session.createdAt).toLocaleString()}`,
      `• Theme: ${session.config.theme || "Classic Fantasy"}`,
      `• Difficulty: ${session.config.difficulty || "Medium"}`,
      `• Session Time: ${session.timeLimit} minutes`,
      `• Status: ${session.status}`,
      ``,
      `👤 Character Information:`,
      `• Name: ${session.character.name || "Unknown"}`,
      `• Race: ${session.character.race || "Unknown"}`,
      `• Class: ${session.character.class || "Unknown"}`,
      `• Level: ${session.character.level || 1}`,
      `• Experience: ${session.character.xp || 0} XP`,
      ``,
    ];

    // Add quest progress
    if (session.quests && session.quests.length > 0) {
      lines.push(`🎯 Quest Progress:`);
      session.quests.forEach((quest, index) => {
        lines.push(`• ${quest.title} (${quest.status})`);
        if (quest.objectives) {
          quest.objectives.forEach((objective, objIndex) => {
            const progress = quest.progress?.find(
              (p) => p.objectiveIndex === objIndex,
            );
            const status = progress ? "✅" : "⬜";
            lines.push(`  ${status} ${objective}`);
          });
        }
      });
      lines.push(``);
    }

    // Add conversation history (if enabled)
    if (
      options.includeConversation &&
      session.conversationHistory?.length > 0
    ) {
      lines.push(`💬 Recent Conversation:`);
      const recentMessages = session.conversationHistory.slice(-10);
      recentMessages.forEach((message) => {
        const prefix = message.isDM ? "🤖 DM:" : "👤 Player:";
        lines.push(`${prefix} ${message.text}`);
      });
      lines.push(``);
    }

    return lines.join("\n");
  }

  /**
   * Export session as HTML for web viewing
   */
  async exportAsHTML(options) {
    const session = this.activeSession;
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Construct - Session Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a2e; color: #eaeaea; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { background: #232946; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .quest { background: #2a2d3e; padding: 10px; margin: 5px 0; border-left: 4px solid #7f9cf5; }
        .completed { border-left-color: #7ed6a7; }
        .message-dm { color: #7f9cf5; font-style: italic; }
        .message-player { color: #eaeaea; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎮 The Construct Session</h1>
        <p><strong>ID:</strong> ${session.id}</p>
        <p><strong>Theme:</strong> ${session.config.theme || "Classic Fantasy"}</p>
        <p><strong>Exported:</strong> ${new Date().toISOString()}</p>
    </div>

    <div class="section">
        <h2>👤 Character</h2>
        <p><strong>Name:</strong> ${session.character.name || "Unknown"}</p>
        <p><strong>Race:</strong> ${session.character.race || "Unknown"}</p>
        <p><strong>Class:</strong> ${session.character.class || "Unknown"}</p>
        <p><strong>Level:</strong> ${session.character.level || 1}</p>
        <p><strong>XP:</strong> ${session.character.xp || 0}</p>
    </div>

    <div class="section">
        <h2>🎯 Quests</h2>
        ${
          session.quests
            ?.map(
              (quest) => `
            <div class="quest ${quest.status === "completed" ? "completed" : ""}">
                <h3>${quest.title}</h3>
                <p><strong>Status:</strong> ${quest.status}</p>
                <ul>
                    ${
                      quest.objectives
                        ?.map((obj, index) => {
                          const progress = quest.progress?.find(
                            (p) => p.objectiveIndex === index,
                          );
                          return `<li>${progress ? "✅" : "⬜"} ${obj}</li>`;
                        })
                        .join("") || "<li>No objectives defined</li>"
                    }
                </ul>
            </div>
        `,
            )
            .join("") || "<p>No quests available</p>"
        }
    </div>

    ${
      options.includeConversation && session.conversationHistory?.length > 0
        ? `
    <div class="section">
        <h2>💬 Recent Conversation</h2>
        ${session.conversationHistory
          .slice(-20)
          .map(
            (msg) => `
            <div class="message-${msg.isDM ? "dm" : "player"}">
                <strong>${msg.isDM ? "DM:" : "Player:"}</strong> ${msg.text}
            </div>
        `,
          )
          .join("")}
    </div>
    `
        : ""
    }

    <div class="section">
        <h2>📊 Session Stats</h2>
        <p><strong>Play Time:</strong> ${Math.round(session.totalPlayTime || 0)} minutes</p>
        <p><strong>Encounters Completed:</strong> ${session.encountersCompleted || 0}</p>
        <p><strong>Locations Visited:</strong> ${session.locationsVisited?.length || 1}</p>
        <p><strong>XP Earned:</strong> ${session.xpEarned || 0}</p>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Export for sharing (native mobile sharing)
   */
  async exportForSharing(options) {
    const exportData = await this.exportAsText(options);

    if (Platform.OS === "web") {
      // For web, return the data for copying
      navigator.clipboard.writeText(exportData);
      return { success: true, message: "Session data copied to clipboard" };
    } else {
      // For mobile, use native sharing
      try {
        await Share.share({
          message: exportData,
          title: `The Construct - Session ${this.activeSession.id}`,
        });
        return { success: true, message: "Session shared successfully" };
      } catch (error) {
        return { success: false, error: "Failed to share session" };
      }
    }
  }

  /**
   * Start time management for the active session
   */
  async startTimeManagement() {
    if (!this.activeSession || this.sessionTimers.has(this.activeSession.id)) {
      return;
    }

    const timer = setInterval(() => {
      this.updateTimeRemaining();
    }, 1000); // Update every second

    this.sessionTimers.set(this.activeSession.id, timer);
    this.activeSession.startTime = Date.now();
  }

  /**
   * Update remaining session time and trigger notifications
   */
  async updateTimeRemaining() {
    if (!this.activeSession) return;

    const elapsed = Date.now() - this.activeSession.startTime;
    this.activeSession.timeRemaining = Math.max(
      0,
      this.activeSession.timeLimit * 60 * 1000 - elapsed,
    );

    // Check for time warnings
    const remainingMinutes = Math.ceil(
      this.activeSession.timeRemaining / (60 * 1000),
    );

    if (
      remainingMinutes <= 5 &&
      !this.activeSession.timeWarnings.includes("5min")
    ) {
      await this.sendTimeWarning(
        "5 minutes remaining! Consider wrapping up your current objective.",
      );
      this.activeSession.timeWarnings.push("5min");
    } else if (
      remainingMinutes <= 10 &&
      !this.activeSession.timeWarnings.includes("10min")
    ) {
      await this.sendTimeWarning("10 minutes left in your session!");
      this.activeSession.timeWarnings.push("10min");
    } else if (remainingMinutes <= 0) {
      await this.endSession("time_up");
    }

    // Update pacing stage
    this.updatePacingStage(remainingMinutes);
  }

  /**
   * Send time warning to AI for session pacing
   */
  async sendTimeWarning(message) {
    if (this.aiService && this.activeSession) {
      // Add time warning to conversation context
      const timeWarning = {
        type: "time_warning",
        message,
        timestamp: Date.now(),
        remainingTime: this.activeSession.timeRemaining,
      };

      this.activeSession.timeWarnings.push(timeWarning);

      // This would integrate with your chat system
      console.log("[Session Manager] Time Warning:", message);
    }
  }

  /**
   * Update session pacing based on remaining time
   */
  updatePacingStage(remainingMinutes) {
    const sessionTime = this.activeSession.timeLimit;

    if (remainingMinutes <= sessionTime * 0.1) {
      this.activeSession.pacingStage = 4; // Critical - wrap up immediately
    } else if (remainingMinutes <= sessionTime * 0.25) {
      this.activeSession.pacingStage = 3; // Rush to conclusion
    } else if (remainingMinutes <= sessionTime * 0.5) {
      this.activeSession.pacingStage = 2; // Accelerate pace
    } else if (remainingMinutes <= sessionTime * 0.75) {
      this.activeSession.pacingStage = 1; // Maintain normal pace
    } else {
      this.activeSession.pacingStage = 0; // Beginning - take time
    }
  }

  /**
   * Save character progress data
   */
  async saveCharacterProgress(character) {
    try {
      const existingSaves = await AsyncStorage.getItem(
        this.CHARACTER_SAVES_KEY,
      );
      const saves = existingSaves ? JSON.parse(existingSaves) : {};

      saves[character.name || "default"] = {
        ...character,
        lastSaved: Date.now(),
        sessionId: this.activeSession?.id,
      };

      await AsyncStorage.setItem(
        this.CHARACTER_SAVES_KEY,
        JSON.stringify(saves),
      );
    } catch (error) {
      console.error("Error saving character progress:", error);
    }
  }

  /**
   * Load character progress data
   */
  async loadCharacterProgress(characterName) {
    try {
      const existingSaves = await AsyncStorage.getItem(
        this.CHARACTER_SAVES_KEY,
      );
      if (existingSaves) {
        const saves = JSON.parse(existingSaves);
        return saves[characterName] || null;
      }
    } catch (error) {
      console.error("Error loading character progress:", error);
    }
    return null;
  }

  /**
   * Restore character progress from saved data
   */
  async restoreCharacterProgress(savedCharacter) {
    try {
      // This would integrate with your character progression system
      if (characterProgression) {
        // Restore character level, XP, etc.
        console.log("Restoring character progress for:", savedCharacter.name);
      }
    } catch (error) {
      console.error("Error restoring character progress:", error);
    }
  }

  /**
   * Get session time management info
   */
  getTimeInfo() {
    if (!this.activeSession) return null;

    const remainingSeconds = Math.ceil(this.activeSession.timeRemaining / 1000);
    const remainingMinutes = Math.floor(remainingSeconds / 60);

    return {
      timeLimit: this.activeSession.timeLimit,
      timeRemaining: remainingSeconds,
      timeRemainingMinutes: remainingMinutes,
      pacingStage: this.activeSession.pacingStage,
      sessionProgress:
        ((this.activeSession.timeLimit * 60 - remainingSeconds) /
          (this.activeSession.timeLimit * 60)) *
        100,
      warnings: this.activeSession.timeWarnings,
    };
  }

  // Utility methods
  async loadSessionHistory() {
    try {
      const historyData = await AsyncStorage.getItem(this.SESSION_HISTORY_KEY);
      this.sessionHistory = historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      console.error("Error loading session history:", error);
      this.sessionHistory = [];
    }
  }

  async addToSessionHistory(session) {
    const maxHistorySize = 50; // Keep last 50 sessions

    // Remove if already exists
    this.sessionHistory = this.sessionHistory.filter(
      (s) => s.id !== session.id,
    );

    // Add to beginning of history
    this.sessionHistory.unshift({
      id: session.id,
      name: `Session ${session.sessionNumber}`,
      theme: session.config.theme,
      createdAt: session.createdAt,
      lastModified: session.lastModified,
      status: session.status,
      playTime: Math.round(session.totalPlayTime || 0),
      xpEarned: session.xpEarned || 0,
    });

    // Trim history
    if (this.sessionHistory.length > maxHistorySize) {
      this.sessionHistory = this.sessionHistory.slice(0, maxHistorySize);
    }

    await AsyncStorage.setItem(
      this.SESSION_HISTORY_KEY,
      JSON.stringify(this.sessionHistory),
    );
  }

  async getAllSessions() {
    const sessions = [...this.sessionHistory];
    if (this.activeSession) {
      // Remove active session from history if present, then add it at the top
      const historyWithoutActive = sessions.filter(
        (s) => s.id !== this.activeSession.id,
      );
      return [this.activeSession, ...historyWithoutActive];
    }
    return sessions;
  }

  async checkForActiveSession() {
    try {
      const sessionData = await AsyncStorage.getItem(this.ACTIVE_SESSION_KEY);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.status === "active") {
          this.activeSession = session;
        }
      }
    } catch (error) {
      console.error("Error checking for active session:", error);
    }
  }

  calculateSessionStats() {
    if (!this.activeSession) return {};

    return {
      totalPlayTime: Math.round(this.activeSession.totalPlayTime || 0),
      questsCompleted:
        this.activeSession.quests?.filter((q) => q.status === "completed")
          .length || 0,
      locationsVisited: this.activeSession.locationsVisited?.length || 0,
      encountersCompleted: this.activeSession.encountersCompleted || 0,
      xpEarned: this.activeSession.xpEarned || 0,
      levelsGained: this.activeSession.levelsGained || 0,
      itemsFound: this.activeSession.itemsFound?.length || 0,
    };
  }

  async generateSessionSummary() {
    if (!this.activeSession) return null;

    const stats = await this.calculateSessionStats();

    return {
      sessionId: this.activeSession.id,
      character: this.activeSession.character,
      stats,
      completedQuests:
        this.activeSession.quests?.filter((q) => q.status === "completed") ||
        [],
      playTimeMinutes: stats.totalPlayTime,
      finalLocation: this.activeSession.currentLocation,
      outcome: this.activeSession.outcome || "completed",
    };
  }

  getActiveSession() {
    return this.activeSession;
  }

  hasActiveSession() {
    return this.activeSession && this.activeSession.status === "active";
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager;

// Export specific methods for convenience
export const {
  createSession,
  loadSession,
  saveActiveSession,
  exportSession,
  getTimeInfo,
  getActiveSession,
  hasActiveSession,
} = sessionManager;
