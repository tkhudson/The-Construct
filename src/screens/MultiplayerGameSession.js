import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ImageBackground,
  FlatList,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as HapticFeedback from "expo-haptics";

// Components
import AnimatedButton from "../components/AnimatedButton";
import ErrorBoundary from "../components/ErrorBoundary";
import MapGrid from "../components/MapGrid";
import MapPanel from "../components/panels/MapPanel";
import DiceRollerPanel from "../components/panels/DiceRollerPanel";
import InventoryPanel from "../components/panels/InventoryPanel";
import QuickActionsPanel from "../components/panels/QuickActionsPanel";
import DualChatView from "../components/multiplayer/DualChatView";

// Firebase Services
import {
  subscribeToSession,
  subscribeToMessages,
  sendMessage,
  updateMapState,
  leaveSession,
  endSession,
} from "../firebase/sessionService";

// Utils and Services
import { rollD20 } from "../utils/diceRoller";
import { queryAI } from "../utils/aiService";
import { createPressAnimation } from "../utils/animations";
import { useTheme } from "../theme/ThemeProvider";

const MultiplayerGameSession = ({ navigation, route }) => {
  // Get session parameters
  const {
    sessionCode,
    playerId,
    playerName,
    dmId,
    dmName,
    character,
    isMultiplayer = true,
    isDM = false,
  } = route.params || {};

  // Theme
  const { theme } = useTheme();

  // Session state
  const [sessionData, setSessionData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);

  // Map and UI state
  const [mapPanelVisible, setMapPanelVisible] = useState(false);
  const [dicePanelVisible, setDicePanelVisible] = useState(false);
  const [inventoryPanelVisible, setInventoryPanelVisible] = useState(false);
  const [quickActionsPanelVisible, setQuickActionsPanelVisible] =
    useState(false);
  const [tokens, setTokens] = useState([]);
  const [selectedTokenId, setSelectedTokenId] = useState(null);

  // Animations
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

  // References
  const flatListRef = useRef(null);

  // Subscribe to session data
  useEffect(() => {
    if (!sessionCode) {
      setError("No session code provided");
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToSession(sessionCode, (result) => {
      if (result.success) {
        setSessionData(result.data);
        setLoading(false);
      } else {
        setError(result.error || "Failed to load session");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [sessionCode]);

  // Subscribe to messages
  useEffect(() => {
    if (!sessionCode) return;

    const unsubscribe = subscribeToMessages(sessionCode, (result) => {
      if (result.success) {
        setMessages(result.messages);
        // Scroll to bottom when new messages arrive
        if (flatListRef.current && result.messages.length > 0) {
          setTimeout(() => {
            flatListRef.current.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    });

    return () => unsubscribe();
  }, [sessionCode]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputText.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      await sendMessage(
        sessionCode,
        isDM ? dmId : playerId,
        isDM ? dmName : playerName,
        inputText,
        isDM,
        false,
      );
      setInputText("");

      // No AI auto-responses in multiplayer mode - DM handles all responses
      // AI assistance is only available in the DM's separate AI chat panel
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle leaving the session
  const handleLeaveSession = async () => {
    Alert.alert(
      isDM ? "End Session" : "Leave Session",
      isDM
        ? "Are you sure you want to end this session for all players?"
        : "Are you sure you want to leave this session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isDM ? "End Session" : "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              if (isDM) {
                await endSession(sessionCode, dmId);
              } else {
                await leaveSession(sessionCode, playerId);
              }
              navigation.navigate("MainMenu");
            } catch (error) {
              console.error("Error leaving session:", error);
              setError("Failed to leave session");
            }
          },
        },
      ],
    );
  };

  // Handle map updates
  const handleMapUpdate = async (newTokens) => {
    if (!isDM) return; // Only DM can update map

    try {
      setTokens(newTokens);
      await updateMapState(sessionCode, { tokens: newTokens }, dmId);
    } catch (error) {
      console.error("Error updating map:", error);
    }
  };

  // Render message item
  const renderMessage = ({ item }) => {
    const isFromDM = item.isDM;
    const isAI = item.isAIMessage;
    const isSelf = item.senderId === (isDM ? dmId : playerId);

    return (
      <View
        style={[
          styles.messageContainer,
          isFromDM ? styles.dmMessageContainer : styles.playerMessageContainer,
          isSelf && styles.selfMessageContainer,
          isAI && styles.aiMessageContainer,
        ]}
      >
        <Text style={styles.messageSender}>
          {isFromDM
            ? isAI
              ? "AI DM"
              : item.senderName
            : isSelf
              ? "You"
              : item.senderName}
        </Text>
        <Text
          style={[
            styles.messageText,
            isFromDM ? styles.dmMessageText : styles.playerMessageText,
            isAI && styles.aiMessageText,
          ]}
        >
          {item.message}
        </Text>
      </View>
    );
  };

  // If in DM mode with AI assistant, show dual chat interface
  if (isDM && sessionData?.settings?.isAIDM) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorBoundary>
          <View style={styles.dualChatContainer}>
            <DualChatView
              sessionCode={sessionCode}
              dmId={dmId}
              dmName={dmName}
              config={sessionData?.settings}
              character={character}
            />
          </View>

          {/* Bottom action bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.accent }]}
              onPress={() => setMapPanelVisible(true)}
            >
              <Text style={styles.actionButtonText}>Map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.accent }]}
              onPress={() => setDicePanelVisible(true)}
            >
              <Text style={styles.actionButtonText}>Dice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#e74c3c" }]}
              onPress={handleLeaveSession}
            >
              <Text style={styles.actionButtonText}>End Session</Text>
            </TouchableOpacity>
          </View>

          {/* Map Panel */}
          {mapPanelVisible && (
            <MapPanel
              visible={mapPanelVisible}
              onClose={() => setMapPanelVisible(false)}
              tokens={tokens}
              onUpdateTokens={handleMapUpdate}
              isDM={isDM}
            />
          )}

          {/* Dice Panel */}
          {dicePanelVisible && (
            <DiceRollerPanel
              visible={dicePanelVisible}
              onClose={() => setDicePanelVisible(false)}
            />
          )}
        </ErrorBoundary>
      </SafeAreaView>
    );
  }

  // Regular player interface or DM without AI
  return (
    <SafeAreaView style={styles.container}>
      <ErrorBoundary>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Joining session...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={[styles.errorButton, { backgroundColor: theme.accent }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Session info header */}
            <View
              style={[styles.sessionHeader, { backgroundColor: theme.card }]}
            >
              <Text style={[styles.sessionTitle, { color: theme.text }]}>
                {isDM ? "Your Session" : `${dmName}'s Session`}
              </Text>
              <Text style={[styles.sessionCode, { color: theme.text + "99" }]}>
                Code: {sessionCode}
              </Text>
            </View>

            {/* Chat messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              style={styles.chatList}
            />

            {/* Input area */}
            <Animated.View style={[styles.inputArea, inputAreaStyle]}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
                style={styles.inputContainer}
              >
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.card + "90",
                    },
                  ]}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={
                    isDM
                      ? "Type your narration or response..."
                      : "What do you want to do?"
                  }
                  placeholderTextColor={theme.text + "66"}
                  multiline
                />
                <AnimatedButton
                  onPress={handleSendMessage}
                  style={[styles.sendButton, { backgroundColor: theme.accent }]}
                  disabled={sendingMessage || !inputText.trim()}
                >
                  {sendingMessage ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.sendButtonText}>Send</Text>
                  )}
                </AnimatedButton>
              </KeyboardAvoidingView>
            </Animated.View>

            {/* Bottom action bar */}
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.accent }]}
                onPress={() => setMapPanelVisible(true)}
              >
                <Text style={styles.actionButtonText}>Map</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.accent }]}
                onPress={() => setDicePanelVisible(true)}
              >
                <Text style={styles.actionButtonText}>Dice</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#e74c3c" }]}
                onPress={handleLeaveSession}
              >
                <Text style={styles.actionButtonText}>
                  {isDM ? "End Session" : "Leave"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Map Panel */}
            {mapPanelVisible && (
              <MapPanel
                visible={mapPanelVisible}
                onClose={() => setMapPanelVisible(false)}
                tokens={tokens}
                onUpdateTokens={isDM ? handleMapUpdate : undefined}
                isDM={isDM}
              />
            )}

            {/* Dice Panel */}
            {dicePanelVisible && (
              <DiceRollerPanel
                visible={dicePanelVisible}
                onClose={() => setDicePanelVisible(false)}
              />
            )}
          </>
        )}
      </ErrorBoundary>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  dualChatContainer: {
    flex: 1,
    marginBottom: 60, // Space for action bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  errorButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  sessionHeader: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    zIndex: 10,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sessionCode: {
    fontSize: 14,
  },
  chatList: {
    flex: 1,
  },
  messageList: {
    padding: 12,
    paddingBottom: 120, // Extra padding at bottom to avoid overlap with input
  },
  messageContainer: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    maxWidth: "80%",
  },
  dmMessageContainer: {
    backgroundColor: "#1E3A8A",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 2,
  },
  playerMessageContainer: {
    backgroundColor: "#4B5563",
    alignSelf: "flex-end",
    borderBottomRightRadius: 2,
  },
  selfMessageContainer: {
    backgroundColor: "#065F46",
  },
  aiMessageContainer: {
    backgroundColor: "#6D28D9",
  },
  messageSender: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#E5E7EB",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
  },
  dmMessageText: {
    color: "#F3F4F6",
  },
  playerMessageText: {
    color: "#F3F4F6",
  },
  aiMessageText: {
    color: "#D1FAE5",
  },
  inputArea: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    zIndex: 20,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#1F2937",
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  input: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  actionBar: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#1F2937",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#374151",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
});

export default MultiplayerGameSession;
