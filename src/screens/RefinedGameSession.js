import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { PanGestureHandler } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as HapticFeedback from "expo-haptics";

// Components
import AnimatedButton from "../components/AnimatedButton";
import ErrorBoundary from "../components/ErrorBoundary";
import MapGrid from "../components/MapGrid";
import MapPanel from "../components/panels/MapPanel";
import DiceRollerPanel from "../components/panels/DiceRollerPanel";
import InventoryPanel from "../components/panels/InventoryPanel";
import QuickActionsPanel from "../components/panels/QuickActionsPanel";

// Utils and Services
import { rollD20 } from "../utils/diceRoller";
import { queryAI } from "../utils/aiService";
import { createPressAnimation } from "../utils/animations";
import { getShadowStyle, getTextStyle } from "../theme/themeUtils";
import {
  saveSessionLog,
  loadSessionLog,
  clearSessionLog,
} from "../utils/sessionLog";

// Theme
import { useTheme } from "../theme/ThemeProvider";

const RefinedGameSession = ({ navigation, route }) => {
  // Enhanced theme integration
  const { theme, setThemeKey } = useTheme();

  // State management
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isContinuing, setIsContinuing] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [quickActionsPanelVisible, setQuickActionsPanelVisible] =
    useState(false);
  const saveScale = useSharedValue(1);
  const saveFade = useSharedValue(1);
  const messageScale = useSharedValue(0);
  const panelSlide = useSharedValue(-300);
  const inputAreaSlide = useSharedValue(100);
  const inputAreaOpacity = useSharedValue(0);

  // Create animated styles
  const inputAreaStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: inputAreaSlide.value }],
    opacity: inputAreaOpacity.value,
  }));

  // Animate input area on mount
  useEffect(() => {
    if (!inputAreaSlide || !inputAreaOpacity) return;

    inputAreaSlide.value = withSpring(0, {
      damping: 8,
      stiffness: 50,
      useNativeDriver: false,
    });
    inputAreaOpacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    });
  }, [inputAreaSlide, inputAreaOpacity]);

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

  // Session configuration
  const config = route.params?.config || {};

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

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
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

        const initialMessage = `Welcome to your ${
          config.theme || "fantasy"
        } adventure! As a ${(character && character.race) || "brave"} ${
          (character && character.class) || "adventurer"
        }, you find yourself in a mysterious setting. What do you do?`;
        setMessages([{ id: "1", text: initialMessage, isDM: true }]);
      }
      setSessionLoaded(true);
    };

    loadSession();
    return () => {
      // Cleanup
    };
  }, [route.params, setThemeKey]);

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
        const newSessionId = `session_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
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

  // Auto-save session data
  useEffect(() => {
    if (sessionId) {
      const autoSave = async () => {
        try {
          await saveLog();
          console.log("[GameSession] Auto-saved session:", sessionId);
        } catch (error) {
          console.error("[GameSession] Auto-save error:", error);
        }
      };

      const autoSaveInterval = setInterval(autoSave, 60000); // Auto-save every minute

      return () => {
        clearInterval(autoSaveInterval);
      };
    }
  }, [sessionId, saveLog]);

  // Handle manual save with export option
  const handleSaveSession = useCallback(
    async (format = "json") => {
      try {
        await saveLog();
        console.log("[GameSession] Manual save completed");
        setSessionExports((prev) => prev + 1);
      } catch (error) {
        console.error("[GameSession] Manual save error:", error);
      }
    },
    [saveLog],
  );

  // Message handling
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isContinuing) return;

    const newMessage = {
      id: Date.now().toString(),
      text: inputText,
      isDM: false,
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputText("");

    try {
      setIsContinuing(true);
      const config = route.params?.config || {};
      const character = route.params?.character || {
        race: "adventurer",
        class: "wanderer",
        background: "mysterious traveler",
        backstory: "A brave soul seeking adventure",
      };
      const response = await queryAI(
        inputText,
        config,
        character,
        messages.slice(-5),
      );
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        isDM: true,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("[GameSession] AI query error:", error);
      const errorMessage = {
        id: Date.now().toString(),
        text: "The DM pauses for a moment to gather their thoughts. Let me rephrase that - what would you like to do?",
        isDM: true,
        isError: true,
      };
      messageScale.value = withSequence(
        withTiming(1.05, {
          duration: 100,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 100,
          easing: Easing.inOut(Easing.ease),
        }),
      );
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsContinuing(false);
    }
  }, [inputText, isContinuing, messages]);

  // Enhanced token management
  const handlePlaceToken = useCallback((x, y) => {
    setPendingCell({ x, y });
    setShowTokenPrompt(true);
  }, []);

  const handleMoveToken = useCallback((tokenId, x, y) => {
    setTokens((prev) =>
      prev.map((token) => (token.id === tokenId ? { ...token, x, y } : token)),
    );
  }, []);

  const createToken = useCallback(() => {
    if (!pendingCell) return;

    const newToken = {
      id: Date.now().toString(),
      type: tokenPromptType,
      label: tokenPromptLabel || "Token",
      imageUri: tokenPromptImageUri,
      x: pendingCell.x,
      y: pendingCell.y,
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
      quality: 0.5,
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
        id: Date.now().toString(),
        text: `🎲 Rolled a d20: ${result}`,
        isDM: true,
        isRoll: true,
      },
    ]);
  }, []);

  // Component unmount animations
  useEffect(() => {
    return () => {
      // Animate out before unmounting
      inputAreaSlide.value = withTiming(100, {
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      });
      inputAreaOpacity.value = withTiming(0, {
        duration: 150,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      });
    };
  }, [inputAreaSlide, inputAreaOpacity]);

  // Clear animations on unmount
  React.useEffect(() => {
    return () => {
      // Cleanup animations
      console.log("[GameSession] Cleaning up animations");
    };
  }, []);

  // Message rendering
  const renderMessage = ({ item }) => (
    <Animated.View
      style={[
        styles.messageContainer,
        item.isDM ? styles.dmMessage : styles.playerMessage,
        item.isError && styles.errorMessage,
        item.isRoll && styles.rollMessage,
        { backgroundColor: item.isDM ? theme.dmMessage : theme.playerMessage },
      ]}
    >
      <Text style={[styles.messageText, { color: theme.text }]}>
        {item.text}
      </Text>
    </Animated.View>
  );

  // Background rendering
  const renderBackground = () => {
    const background = theme?.background || {};

    if (background.type === "image" && background.source) {
      return (
        <ImageBackground
          source={background.source}
          style={styles.backgroundImage}
          resizeMode="cover"
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

        {/* Corner Save Button */}
        {/* Game content starts here */}

        {/* Messages */}
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          contentContainerStyle={{ paddingBottom: 20 }}
        />

        {/* Input area */}
        <Animated.View style={[styles.inputContainer, inputAreaStyle]}>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.inputBackground, color: theme.text },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="What do you do?"
              placeholderTextColor={theme.placeholder}
              multiline
            />
            <View style={styles.buttonContainer}>
              <AnimatedButton
                onPress={() => setDicePanelVisible(true)}
                style={[
                  styles.actionButton,
                  { backgroundColor: theme?.button || "#7f9cf5" },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: theme?.buttonText || "#fff" },
                  ]}
                >
                  🎲
                </Text>
              </AnimatedButton>
              <AnimatedButton
                onPress={() => setMapPanelVisible(true)}
                style={[
                  styles.actionButton,
                  { backgroundColor: theme?.button || "#7f9cf5" },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: theme?.buttonText || "#fff" },
                  ]}
                >
                  🗺️
                </Text>
              </AnimatedButton>
              <AnimatedButton
                onPress={() => setInventoryPanelVisible(true)}
                style={[
                  styles.actionButton,
                  { backgroundColor: theme?.button || "#7f9cf5" },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: theme?.buttonText || "#fff" },
                  ]}
                >
                  🎒
                </Text>
              </AnimatedButton>
              <AnimatedButton
                onPress={() => setQuickActionsPanelVisible(true)}
                style={[
                  styles.actionButton,
                  { backgroundColor: theme?.button || "#7f9cf5" },
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: theme?.buttonText || "#fff" },
                  ]}
                >
                  ⚡
                </Text>
              </AnimatedButton>
            </View>
          </View>
          <View style={styles.sendButtonContainer}>
            <AnimatedButton
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isContinuing}
              style={[
                styles.sendButton,
                {
                  backgroundColor: theme?.button || "#7f9cf5",
                  opacity: !inputText.trim() || isContinuing ? 0.5 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.sendButtonText,
                  { color: theme?.buttonText || "#fff" },
                ]}
              >
                {isContinuing ? "..." : "➤"}
              </Text>
            </AnimatedButton>
          </View>
        </Animated.View>

        {/* Map Panel */}
        <MapPanel
          visible={mapPanelVisible}
          onClose={() => setMapPanelVisible(false)}
          onOpen={() => setMapPanelVisible(true)}
          theme={theme}
          panelPosition="right"
          anyPanelOpen={
            inventoryPanelVisible ||
            dicePanelVisible ||
            quickActionsPanelVisible
          }
        >
          <MapGrid
            tokens={tokens}
            onPlaceToken={handlePlaceToken}
            onMoveToken={handleMoveToken}
            selectedTokenId={selectedTokenId}
            onSelectToken={setSelectedTokenId}
          />
          {showTokenPrompt && (
            <View
              style={[
                styles.tokenPrompt,
                { backgroundColor: theme?.card || "#2b2b2b" },
              ]}
            >
              <Text style={[styles.tokenPromptTitle, { color: theme.text }]}>
                Add Token
              </Text>
              <TextInput
                style={[
                  styles.tokenPromptInput,
                  {
                    backgroundColor: theme.inputBackground,
                    color: theme.text,
                  },
                ]}
                value={tokenPromptLabel}
                onChangeText={setTokenPromptLabel}
                placeholder="Token Label"
                placeholderTextColor={theme.placeholder}
              />
              <TouchableOpacity
                style={[
                  styles.tokenPromptButton,
                  { backgroundColor: theme?.button || "#7f9cf5" },
                ]}
                onPress={pickTokenImage}
              >
                <Text
                  style={[
                    styles.tokenPromptButtonText,
                    { color: theme?.buttonText || "#fff" },
                  ]}
                >
                  Pick Image
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tokenPromptButton,
                  { backgroundColor: theme?.button || "#7f9cf5" },
                ]}
                onPress={createToken}
              >
                <Text
                  style={[
                    styles.tokenPromptButtonText,
                    { color: theme?.buttonText || "#fff" },
                  ]}
                >
                  Create Token
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </MapPanel>

        {/* Dice Roller Panel */}
        <DiceRollerPanel
          visible={dicePanelVisible}
          onClose={() => setDicePanelVisible(false)}
          onOpen={() => setDicePanelVisible(true)}
          theme={theme}
          panelPosition="right"
          anyPanelOpen={mapPanelVisible || inventoryPanelVisible}
        />

        {/* Inventory Panel */}
        <InventoryPanel
          visible={inventoryPanelVisible}
          onClose={() => setInventoryPanelVisible(false)}
          onOpen={() => setInventoryPanelVisible(true)}
          theme={theme}
          inventory={inventory}
          panelPosition="right"
          anyPanelOpen={mapPanelVisible || dicePanelVisible}
          onUseItem={(item) => {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                text: `Used ${item.name}`,
                isDM: true,
                isInventory: true,
                item,
              },
            ]);
          }}
        />

        {/* Quick Actions Panel */}
        <QuickActionsPanel
          visible={quickActionsPanelVisible}
          onClose={() => setQuickActionsPanelVisible(false)}
          onOpen={() => setQuickActionsPanelVisible(true)}
          theme={theme}
          panelPosition="right"
          anyPanelOpen={
            mapPanelVisible || dicePanelVisible || inventoryPanelVisible
          }
          onAction={(actionText) => {
            setInputText(actionText);
            setQuickActionsPanelVisible(false);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 8,
    maxWidth: "80%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
      },
    }),
  },
  dmMessage: {
    alignSelf: "flex-start",
    marginRight: "auto",
  },
  playerMessage: {
    alignSelf: "flex-end",
    marginLeft: "auto",
  },
  errorMessage: {
    backgroundColor: "#ff6b6b",
  },
  rollMessage: {
    backgroundColor: "#4ecdc4",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  inputContainer: {
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 40,
    maxHeight: 100,
  },
  buttonContainer: {
    flexDirection: "row",
    marginLeft: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
  buttonText: {
    fontSize: 20,
  },
  sendButtonContainer: {
    alignItems: "flex-end",
    marginTop: 10,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonText: {
    fontSize: 24,
  },

  tokenPrompt: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -150 }, { translateY: -100 }],
    width: 300,
    padding: 20,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
      },
    }),
  },
  tokenPromptTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  tokenPromptInput: {
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  tokenPromptButton: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  tokenPromptButtonText: {
    textAlign: "center",
    fontSize: 16,
  },
});

export default RefinedGameSession;
