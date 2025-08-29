import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ImageBackground,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rollD20 } from "../utils/diceRoller";
import { queryAI } from "../utils/aiService";
import rollHelper from "../utils/rollHelper";
import { useTheme } from "../theme/ThemeProvider";
import ErrorBoundary from "../components/ErrorBoundary";
import {
  saveSessionLog,
  loadSessionLog,
  clearSessionLog,
} from "../utils/sessionLog";
// Session management using local state - sessionManager removed to avoid circular imports
import MapGrid from "../components/MapGrid";
import MapPanel from "../components/panels/MapPanel";
import DiceRollerPanel from "../components/panels/DiceRollerPanel";
import InventoryPanel from "../components/panels/InventoryPanel";
import { getShadowStyle, getTextStyle } from "../theme/themeUtils";
import QuickActionBar from "../components/QuickActionBar";
import { TutorialOverlay } from "../components/TutorialOverlay";
import { SessionPacingManager } from "../utils/sessionPacing";
import { AchievementSystem } from "../utils/achievementSystem";
import sessionAnalytics from "../utils/sessionAnalytics";

import * as ImagePicker from "expo-image-picker";

const RefinedGameSession = ({ navigation, route }) => {
  // Enhanced theme integration
  const { theme, setThemeKey } = useTheme();

  // State management
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isContinuing, setIsContinuing] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Map and token management
  const [tokens, setTokens] = useState([]);
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [pendingCell, setPendingCell] = useState(null);
  const [tokenPromptType, setTokenPromptType] = useState("player");
  const [tokenPromptLabel, setTokenPromptLabel] = useState("");
  const [tokenPromptImageUri, setTokenPromptImageUri] = useState(null);

  // Panel state management
  const [mapPanelVisible, setMapPanelVisible] = useState(false);
  const [dicePanelVisible, setDicePanelVisible] = useState(false);
  const [inventoryPanelVisible, setInventoryPanelVisible] = useState(false);

  // Session management
  const [sessionId, setSessionId] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [sessionTimeInfo, setSessionTimeInfo] = useState(null);
  const [sessionExports, setSessionExports] = useState(0);

  // Enhanced inventory with better structure
  const [inventory, setInventory] = useState([
    {
      id: "1",
      name: "Short Sword",
      type: "Weapon",
      description: "A basic steel sword with a leather-bound hilt.",
      quantity: 1,
      weight: 2,
      value: 10,
    },
    {
      id: "2",
      name: "Health Potion",
      type: "Consumable",
      description: "Restores 2d4 + 2 hit points when drunk.",
      quantity: 3,
      weight: 0.5,
      value: 50,
    },
  ]);

  // Session timer with enhanced features
  const config = route.params?.config || {};
  const sessionMinutes = config.sessionTime || 30;
  const [secondsLeft, setSecondsLeft] = useState(sessionMinutes * 60);
  const [timerActive, setTimerActive] = useState(true);
  const [timerInterval, setTimerInterval] = useState(null);
  const [timerPacingStage, setTimerPacingStage] = useState(0);

  // Enhanced session management
  const saveLog = useCallback(async () => {
    const logData = {
      messages,
      tokens,
      config,
      character: route.params?.character,
      timestamp: Date.now(),
      themeKey: theme?.key,
    };
    await saveSessionLog(logData);
  }, [messages, tokens, config, route.params?.character, theme?.key]);

  // Initialize systems
  const [pacingManager] = useState(
    () => new SessionPacingManager(sessionMinutes),
  );
  const [achievementSystem] = useState(() => new AchievementSystem());

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
      // Initialize analytics
      sessionAnalytics.startSession(`session_${Date.now()}`);

      // Check if first time player
      const hasPlayedBefore = await AsyncStorage.getItem("has_played_before");
      if (!hasPlayedBefore) {
        setShowTutorial(true);
        await AsyncStorage.setItem("has_played_before", "true");
      }

      if (route.params?.continueSession) {
        const log = await loadSessionLog();
        if (log) {
          setMessages(log.messages || []);
          setTokens(log.tokens || []);
          if (log.themeKey) setThemeKey(log.themeKey);
        }
      } else {
        const config = route.params?.config || {};
        const character = route.params?.character || {};
        if (config.theme) setThemeKey(config.theme);

        const initialMessage = `Welcome to your ${config.theme || "fantasy"} adventure! As a ${character.race || "brave"} ${character.class || "adventurer"}, you find yourself in a mysterious setting. What do you do?`;
        setMessages([{ id: "1", text: initialMessage, isDM: true }]);
      }
      setSessionLoaded(true);
    };

    loadSession();
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [route.params, setThemeKey, timerInterval]);

  // Initialize theme from route params
  useEffect(() => {
    const config = route.params?.config || {};
    if (config.theme) {
      console.log("[GameSession] Setting theme:", config.theme);
      setThemeKey(config.theme);
    }
  }, [route.params?.config?.theme, setThemeKey]);
  // Initialize session with basic state management
  useEffect(() => {
    const initializeSession = () => {
      try {
        // Generate session ID
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);

        // Initialize session stats
        setSessionStats({
          totalPlayTime: 0,
          encountersCompleted: 0,
          xpEarned: 0,
          locationsVisited: 0,
          levelsGained: 0,
        });

        console.log("[GameSession] Session initialized:", newSessionId);
      } catch (error) {
        console.error("[GameSession] Session initialization error:", error);
      }
    };

    if (!sessionId) {
      initializeSession();
    }
  }, [sessionId]);

  // Update session time info periodically
  useEffect(() => {
    const updateTimeInfo = () => {
      const sessionTime = route.params?.config?.sessionTime || 60;
      const timeRemaining = Math.max(
        0,
        sessionTime * 60 - (Math.floor(Date.now() / 1000) % (sessionTime * 60)),
      );

      setSessionTimeInfo({
        timeLimit: sessionTime,
        timeRemaining: timeRemaining,
        timeRemainingMinutes: Math.floor(timeRemaining / 60),
        sessionProgress: 0, // Will be updated with actual progress
        warnings: [],
      });
    };

    updateTimeInfo();
    const interval = setInterval(updateTimeInfo, 1000);
    return () => clearInterval(interval);
  }, [route.params?.config?.sessionTime]);

  // Auto-save session data
  useEffect(() => {
    if (sessionId) {
      const autoSave = async () => {
        try {
          // Save session data using existing session log system
          const sessionData = {
            id: sessionId,
            messages,
            tokens,
            character: route.params?.character || {},
            config: route.params?.config || {},
            lastModified: Date.now(),
            conversationHistory: messages,
            totalPlayTime: Math.floor(Date.now() / 1000 / 60), // Simple play time calculation
          };

          // Store in AsyncStorage for persistence
          const AsyncStorage =
            require("@react-native-async-storage/async-storage").default;
          await AsyncStorage.setItem(
            `the_construct_session_${sessionId}`,
            JSON.stringify(sessionData),
          );

          console.log("[GameSession] Session auto-saved");
        } catch (error) {
          console.error("[GameSession] Auto-save error:", error);
        }
      };

      autoSave();
    }
  }, [messages, tokens, sessionId]);

  // Handle manual save with export option
  const handleSaveSession = useCallback(
    async (format = "json") => {
      try {
        if (!sessionId) {
          console.warn("[GameSession] No active session to save");
          return;
        }

        const sessionData = {
          id: sessionId,
          messages,
          tokens,
          character: route.params?.character || {},
          config: route.params?.config || {},
          exportedAt: Date.now(),
          format,
          conversationHistory: messages,
          sessionStats: sessionStats,
        };

        // For now, save to AsyncStorage and log
        const AsyncStorage =
          require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.setItem(
          `the_construct_export_${sessionId}`,
          JSON.stringify(sessionData),
        );

        setSessionExports((prev) => prev + 1);
        console.log(
          `[GameSession] Session exported as ${format}:`,
          sessionData,
        );

        // Basic console export for testing
        if (format === "json") {
          console.log("Session JSON:", JSON.stringify(sessionData, null, 2));
        }
      } catch (error) {
        console.error("[GameSession] Save error:", error);
      }
    },
    [sessionId, messages, tokens, sessionStats],
  );

  // Enhanced timer logic
  useEffect(() => {
    if (!timerActive || !sessionLoaded) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 0) {
          setTimerActive(false);
          setTimerPacingStage(4);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimerInterval(interval);
    return () => clearInterval(interval);
  }, [timerActive, sessionLoaded]);

  // AI message handling with better error handling
  const handleSubmit = async (actionData = null) => {
    const actionText = actionData?.text || inputText;
    if (!actionText.trim() && !inputText.trim()) return;

    const config = route.params?.config || {};
    const character = route.params?.character || {};

    // Track action in analytics
    sessionAnalytics.trackAction({
      type: actionData?.type || "custom",
      text: actionText || inputText,
      success: null,
    });

    const newMessages = [
      ...messages,
      { id: `${Date.now()}`, text: actionText || inputText, isDM: false },
    ];
    setMessages(newMessages);
    if (!actionData) setInputText("");
    setIsContinuing(true);

    // Get contextual help for rolls if needed
    const rollHelp = rollHelper.getContextualRollHelp(
      actionText || inputText,
      character,
    );

    try {
      const aiResponse = await queryAI(
        actionText,
        config,
        {
          ...character,
          lastAction: actionData?.type || "custom",
          rollHelp: rollHelp,
          context: actionData?.context || {},
        },
        messages.slice(-5),
      );

      const responseMessage = {
        id: `${Date.now()}`,
        text: aiResponse,
        isDM: true,
        timestamp: Date.now(),
        rollHelp: rollHelp,
        quickAction: actionData?.quickAction,
        actionType: actionData?.type,
      };

      newMessages.push(responseMessage);
      setMessages([...newMessages]);

      // Check achievements
      const unlockedAchievements = achievementSystem.checkAchievement(
        "message_sent",
        {
          messageCount: newMessages.filter((m) => !m.isDM).length,
        },
      );

      if (unlockedAchievements.length > 0) {
        showAchievementNotification(unlockedAchievements[0]);
      }
    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage = {
        id: `${Date.now()}`,
        text: "I apologize, but I encountered an error processing your request. Please try again.",
        isDM: true,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsContinuing(false);
    }
  };

  // Enhanced token management
  const handlePlaceToken = useCallback((x, y) => {
    setPendingCell({ x, y });
    setShowTokenPrompt(true);
  }, []);

  const handleMoveToken = useCallback((tokenId, x, y) => {
    setTokens((prev) =>
      prev.map((token) => (token.id === tokenId ? { ...token, x, y } : token)),
    );
    setSelectedTokenId(null);
  }, []);

  const createToken = useCallback(() => {
    if (!pendingCell) return;

    const newToken = {
      id: `${Date.now()}`,
      type: tokenPromptType,
      x: pendingCell.x,
      y: pendingCell.y,
      label: tokenPromptLabel || undefined,
      imageUri: tokenPromptImageUri || undefined,
    };

    setTokens((prev) => [...prev, newToken]);
    setShowTokenPrompt(false);
    setPendingCell(null);
    setTokenPromptLabel("");
    setTokenPromptImageUri(null);
  }, [pendingCell, tokenPromptType, tokenPromptLabel, tokenPromptImageUri]);

  // Pick image for token
  const pickTokenImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setTokenPromptImageUri(result.assets[0].uri);
    }
  }, []);

  // Quick d20 roll
  const handleRollD20 = useCallback(() => {
    const result = rollD20();
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        text: `🎲 You rolled a d20: ${result}`,
        isDM: false,
        isDiceRoll: true,
        dice: {
          label: "d20",
          sides: 20,
          count: 1,
          rolls: [result],
          total: result,
        },
      },
    ]);

    // Track dice roll and get guidance
    const rollContext = rollHelper.analyzeRollType("quick d20 roll");
    const guidance = rollHelper.generateRollGuidance(
      rollContext || { type: "general" },
      { base: 0 },
    );

    sessionAnalytics.trackRoll({
      label: "d20",
      sides: 20,
      count: 1,
      rolls: [result],
      total: result,
      context: "quick_roll",
      guidance: guidance,
    });

    // Check for critical achievements
    const achievements = achievementSystem.checkAchievement("roll_result", {
      roll: result,
    });
    if (achievements.length > 0) {
      showAchievementNotification(achievements[0]);
    }
  }, []);

  // Achievement notification
  const showAchievementNotification = (achievement) => {
    Alert.alert(
      "🏆 Achievement Unlocked!",
      `${achievement.name}: ${achievement.description}`,
      [{ text: "Awesome!", style: "default" }],
    );
  };

  // Enhanced message rendering
  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.message,
        {
          alignSelf: item.isDM ? "flex-start" : "flex-end",
          backgroundColor: item.isDM
            ? theme?.card || "#232946"
            : theme?.accent || "#7f9cf5",
          ...getShadowStyle(theme || {}),
        },
      ]}
    >
      {/* Main message */}
      <Text
        style={[
          styles.messageText,
          {
            color: item.isDM
              ? theme?.text || "#fff"
              : theme?.buttonText || "#fff",
          },
        ]}
      >
        {item.text}
      </Text>

      {/* Roll guidance if available */}
      {item.rollHelp && (
        <View style={styles.rollGuidance}>
          <Text
            style={[styles.rollFormula, { color: theme?.accent || "#7f9cf5" }]}
          >
            🎲 {item.rollHelp.rollFormula}
          </Text>
          {item.rollHelp.details?.map((detail, index) => (
            <Text
              key={index}
              style={[styles.rollDetail, { color: theme?.text || "#eaeaea" }]}
            >
              {detail}
            </Text>
          ))}
        </View>
      )}

      {/* Quick action indicator */}
      {item.quickAction && (
        <View style={styles.actionBadge}>
          <Text
            style={[
              styles.actionBadgeText,
              { color: theme?.buttonText || "#fff" },
            ]}
          >
            {item.actionType || "Action"}
          </Text>
        </View>
      )}
    </View>
  );

  // Theme background handling
  const renderBackground = () => {
    if (!theme?.background) {
      return (
        <View
          style={[styles.backgroundImage, { backgroundColor: "#232946" }]}
        />
      );
    }

    const background = theme.background;

    if (background.type === "image" && background.image) {
      return (
        <ImageBackground
          source={background.image}
          style={styles.backgroundImage}
          imageStyle={{ resizeMode: "cover", opacity: 0.3 }}
        />
      );
    } else if (background.type === "gradient" && background.colors) {
      return (
        <LinearGradient
          colors={background.colors}
          style={styles.backgroundGradient}
        />
      );
    }

    // Fallback to solid color
    return (
      <View
        style={[
          styles.backgroundImage,
          { backgroundColor: background.fallback || "#232946" },
        ]}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        {/* Theme background */}
        {renderBackground()}

        {/* Tutorial overlay */}
        {showTutorial && (
          <TutorialOverlay
            step={tutorialStep}
            onNext={() => {
              if (tutorialStep < 3) {
                setTutorialStep(tutorialStep + 1);
              } else {
                setShowTutorial(false);
              }
            }}
            onSkip={() => setShowTutorial(false)}
          />
        )}

        {/* Enhanced timer display with session management */}
        <View style={[styles.timerContainer, getShadowStyle(theme || {})]}>
          <Text
            style={[styles.timerText, { color: theme?.accent || "#7f9cf5" }]}
          >
            {sessionTimeInfo
              ? `${sessionTimeInfo.timeRemainingMinutes}:${String(Math.floor(sessionTimeInfo.timeRemaining % 60)).padStart(2, "0")}`
              : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
          </Text>
          <Text style={[styles.timerLabel, { color: theme?.text || "#fff" }]}>
            Session Time
          </Text>
          <TouchableOpacity
            style={[
              styles.timerButton,
              { backgroundColor: theme?.button || "#7f9cf5" },
            ]}
            onPress={() => setTimerActive(!timerActive)}
          >
            <Text
              style={[
                styles.timerButtonText,
                { color: theme?.buttonText || "#fff" },
              ]}
            >
              {timerActive ? "⏸️ Pause" : "▶️ Resume"}
            </Text>
          </TouchableOpacity>

          {/* Session management buttons */}
          <TouchableOpacity
            style={[
              styles.sessionButton,
              { backgroundColor: theme?.button || "#7f9cf5" },
            ]}
            onPress={() => handleSaveSession("json")}
          >
            <Text
              style={[
                styles.sessionButtonText,
                { color: theme?.buttonText || "#fff" },
              ]}
            >
              💾 Save ({sessionExports})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          contentContainerStyle={{ paddingBottom: 20 }}
        />

        {/* Quick Action Bar */}
        <QuickActionBar
          onAction={handleSubmit}
          context={{ combatActive: false }}
          theme={theme}
          character={route.params?.character}
          visible={!showTutorial}
        />

        {/* Session info and export options */}
        {sessionTimeInfo && sessionTimeInfo.timeRemainingMinutes <= 5 && (
          <View style={[styles.sessionAlert, getShadowStyle(theme || {})]}>
            <Text
              style={[
                styles.sessionAlertText,
                { color: theme?.accent || "#7f9cf5" },
              ]}
            >
              ⏰ {sessionTimeInfo.timeRemainingMinutes} minute
              {sessionTimeInfo.timeRemainingMinutes !== 1 ? "s" : ""} remaining!
              Consider saving your progress.
            </Text>
            <TouchableOpacity
              style={[
                styles.quickSaveButton,
                { backgroundColor: theme?.button || "#7f9cf5" },
              ]}
              onPress={() => handleSaveSession("json")}
            >
              <Text
                style={[
                  styles.quickSaveText,
                  { color: theme?.buttonText || "#fff" },
                ]}
              >
                Quick Save
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input area */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme?.card || "#232946",
              borderColor: theme?.border || "#393e6e",
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                color: theme?.text || "#fff",
                borderColor: theme?.border || "#393e6e",
                backgroundColor: theme?.card || "#232946",
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Enter your action..."
            placeholderTextColor={`${theme?.text || "#fff"}80`}
            multiline
            maxLength={500}
            onSubmitEditing={handleSubmit}
            editable={!isContinuing}
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: isContinuing
                  ? "#666"
                  : theme?.button || "#7f9cf5",
              },
            ]}
            onPress={handleSubmit}
            disabled={isContinuing || !inputText.trim()}
          >
            <Text style={{ color: theme?.buttonText || "#fff" }}>
              {isContinuing ? "..." : "Send"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.diceButton,
              { backgroundColor: theme?.button || "#7f9cf5" },
            ]}
            onPress={handleRollD20}
          >
            <Text style={{ color: theme?.buttonText || "#fff" }}>d20</Text>
          </TouchableOpacity>
        </View>

        {/* Map Panel */}
        <MapPanel
          visible={mapPanelVisible}
          onClose={() => setMapPanelVisible(false)}
          onOpen={() => setMapPanelVisible(true)}
          panelPosition="right"
          anyPanelOpen={dicePanelVisible || inventoryPanelVisible}
          theme={theme || {}}
        >
          <View style={styles.mapContent}>
            {showTokenPrompt && pendingCell && (
              <View style={styles.tokenPromptOverlay}>
                <View
                  style={[
                    styles.tokenPromptBox,
                    { backgroundColor: theme?.card || "#232946" },
                  ]}
                >
                  <Text
                    style={getTextStyle(theme || {}, { variant: "subheader" })}
                  >
                    Place Token at ({pendingCell.x + 1}, {pendingCell.y + 1})
                  </Text>

                  {/* Token type selection */}
                  <View style={styles.tokenTypeRow}>
                    {["player", "npc", "monster"].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.tokenTypeButton,
                          {
                            backgroundColor:
                              tokenPromptType === type
                                ? theme?.accent || "#7f9cf5"
                                : theme?.button || "#7f9cf5",
                          },
                        ]}
                        onPress={() => setTokenPromptType(type)}
                      >
                        <Text style={{ color: theme?.buttonText || "#fff" }}>
                          {type.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Quick token buttons */}
                  <View style={styles.quickTokensRow}>
                    <TouchableOpacity
                      style={[
                        styles.quickToken,
                        { backgroundColor: theme?.accent || "#7f9cf5" },
                      ]}
                      onPress={() => {
                        setTokenPromptType("player");
                        createToken();
                      }}
                    >
                      <Text style={{ color: theme?.buttonText || "#fff" }}>
                        Player
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.quickToken,
                        { backgroundColor: theme?.accent || "#7f9cf5" },
                      ]}
                      onPress={() => {
                        setTokenPromptType("monster");
                        setTokenPromptLabel("Goblin");
                        createToken();
                      }}
                    >
                      <Text style={{ color: theme?.buttonText || "#fff" }}>
                        Goblin
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[
                        styles.button,
                        { backgroundColor: theme?.accent || "#7f9cf5" },
                      ]}
                      onPress={pickTokenImage}
                    >
                      <Text style={{ color: theme?.buttonText || "#fff" }}>
                        Pick Image
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.button,
                        { backgroundColor: theme?.accent || "#7f9cf5" },
                      ]}
                      onPress={createToken}
                    >
                      <Text style={{ color: theme?.buttonText || "#fff" }}>
                        Place Token
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: "#b23b3b" }]}
                      onPress={() => {
                        setShowTokenPrompt(false);
                        setPendingCell(null);
                      }}
                    >
                      <Text style={{ color: "#fff" }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <MapGrid
              tokens={tokens}
              onPlaceToken={handlePlaceToken}
              onMoveToken={handleMoveToken}
              selectedTokenId={selectedTokenId}
              onTokenSelect={setSelectedTokenId}
              theme={theme || {}}
              style={styles.mapGrid}
            />
          </View>
        </MapPanel>

        {/* Dice Roller Panel */}
        <DiceRollerPanel
          visible={dicePanelVisible}
          onClose={() => setDicePanelVisible(false)}
          onOpen={() => setDicePanelVisible(true)}
          onRoll={async (result) => {
            // Add roll to conversation
            setMessages((prev) => [
              ...prev,
              {
                id: `${Date.now()}`,
                text: `🎲 You rolled ${result.count > 1 ? result.count + result.label : result.label}: ${result.rolls.join(", ")} (Total: ${result.total})`,
                isDM: false,
                isDiceRoll: true,
                dice: result,
              },
            ]);

            // Update session stats with roll count
            setSessionStats((prev) => ({
              ...prev,
              rollCount: (prev.rollCount || 0) + 1,
              lastRoll: result,
            }));
          }}
          theme={theme || {}}
          panelPosition="right"
          anyPanelOpen={mapPanelVisible || inventoryPanelVisible}
        />

        {/* Inventory Panel */}
        <InventoryPanel
          visible={inventoryPanelVisible}
          onClose={() => setInventoryPanelVisible(false)}
          onOpen={() => setInventoryPanelVisible(true)}
          inventory={inventory}
          theme={theme || {}}
          panelPosition="right"
          anyPanelOpen={mapPanelVisible || dicePanelVisible}
          onUseItem={(item) => {
            setInventory((prev) =>
              prev
                .map((i) =>
                  i.id === item.id
                    ? { ...i, quantity: i.quantity > 1 ? i.quantity - 1 : 0 }
                    : i,
                )
                .filter((i) => i.quantity > 0),
            );
            setMessages((prev) => [
              ...prev,
              {
                id: `${Date.now()}`,
                text: `🧰 You used ${item.name}.`,
                isDM: false,
                isInventory: true,
                item,
              },
            ]);
          }}
          onDropItem={(item) => {
            setInventory((prev) => prev.filter((i) => i.id !== item.id));
            setMessages((prev) => [
              ...prev,
              {
                id: `${Date.now()}`,
                text: `🧰 You dropped ${item.name}.`,
                isDM: false,
                isInventory: true,
                item,
              },
            ]);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  rollGuidance: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 8,
  },
  rollFormula: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  rollDetail: {
    fontSize: 14,
    opacity: 0.9,
    marginLeft: 8,
  },
  actionBadge: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "#7f9cf5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    position: "relative",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -2,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -2,
  },
  timerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    marginBottom: 8,
  },
  timerText: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  timerLabel: {
    fontSize: 14,
    marginTop: 2,
    textAlign: "center",
    opacity: 0.8,
  },
  timerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timerButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sessionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  sessionButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  message: {
    padding: 16,
    borderRadius: 16,
    marginVertical: 8,
    maxWidth: "80%",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 2,
    alignItems: "flex-end",
  },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    fontSize: 16,
    minHeight: 44,
    maxHeight: 120,
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
  },
  diceButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginLeft: 8,
  },
  mapContent: {
    flex: 1,
    position: "relative",
  },
  mapGrid: {
    margin: 16,
  },
  tokenPromptOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  tokenPromptBox: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    width: "80%",
    maxWidth: 320,
    alignItems: "center",
  },
  tokenTypeRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginVertical: 16,
  },
  tokenTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
  },
  quickTokensRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 16,
  },
  quickToken: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  sessionAlert: {
    backgroundColor: "rgba(127, 156, 245, 0.1)",
    borderColor: "#7f9cf5",
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionAlertText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  quickSaveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 12,
  },
  quickSaveText: {
    fontSize: 12,
    fontWeight: "700",
  },
});

export default RefinedGameSession;
