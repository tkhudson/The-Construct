import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import AnimatedButton from "../AnimatedButton";
import {
  subscribeToMessages,
  subscribeToDMAIMessages,
  sendMessage,
  sendDMToAIMessage,
} from "../../firebase/sessionService";
import { queryAI } from "../../utils/aiService";

const DualChatView = ({
  sessionCode,
  dmId,
  dmName,
  config = {},
  character = {},
}) => {
  // Theme
  const { theme } = useTheme();

  // State for player chat
  const [playerMessages, setPlayerMessages] = useState([]);
  const [playerInputText, setPlayerInputText] = useState("");
  const [sendingPlayerMessage, setSendingPlayerMessage] = useState(false);

  // State for AI chat
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInputText, setAiInputText] = useState("");
  const [sendingAiMessage, setSendingAiMessage] = useState(false);

  // Refs for scrolling to bottom
  const playerChatRef = useRef(null);
  const aiChatRef = useRef(null);

  // Subscribe to player chat messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages(sessionCode, (result) => {
      if (result.success) {
        setPlayerMessages(result.messages);
      }
    });

    return () => unsubscribe();
  }, [sessionCode]);

  // Subscribe to AI chat messages
  useEffect(() => {
    const unsubscribe = subscribeToDMAIMessages(sessionCode, dmId, (result) => {
      if (result.success) {
        setAiMessages(result.messages);
      }
    });

    return () => unsubscribe();
  }, [sessionCode, dmId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (playerChatRef.current && playerMessages.length > 0) {
      playerChatRef.current.scrollToEnd({ animated: true });
    }
    if (aiChatRef.current && aiMessages.length > 0) {
      aiChatRef.current.scrollToEnd({ animated: true });
    }
  }, [playerMessages, aiMessages]);

  // Send message to player chat
  const handleSendPlayerMessage = async () => {
    if (!playerInputText.trim() || sendingPlayerMessage) return;

    setSendingPlayerMessage(true);
    try {
      await sendMessage(
        sessionCode,
        dmId,
        dmName,
        playerInputText,
        true, // isDM
        false, // isAIMessage
      );
      setPlayerInputText("");
    } catch (error) {
      console.error("Error sending player message:", error);
    } finally {
      setSendingPlayerMessage(false);
    }
  };

  // Send message to AI chat and get response
  const handleSendAiMessage = async () => {
    if (!aiInputText.trim() || sendingAiMessage) return;

    setSendingAiMessage(true);
    try {
      // Send DM message to AI chat
      await sendDMToAIMessage(sessionCode, dmId, aiInputText);

      // Get response from AI
      const recentMessages = aiMessages.slice(-5).map((msg) => ({
        isDM: true,
        text: msg.message,
      }));

      const aiResponse = await queryAI(
        aiInputText,
        config,
        character,
        recentMessages,
      );

      // Send AI response to DM-AI chat
      await sendDMToAIMessage(sessionCode, dmId, `[AI] ${aiResponse}`);

      setAiInputText("");
    } catch (error) {
      console.error("Error sending AI message:", error);
      // Send error message to AI chat
      await sendDMToAIMessage(
        sessionCode,
        dmId,
        `[ERROR] Failed to get AI response: ${error.message}`,
      );
    } finally {
      setSendingAiMessage(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Render player chat message
  const renderPlayerMessage = ({ item }) => {
    const isFromDM = item.isDM || item.senderId === dmId;
    const isAI = item.isAIMessage;

    return (
      <View
        style={[
          styles.messageContainer,
          isFromDM ? styles.dmMessageContainer : styles.playerMessageContainer,
          isAI && styles.aiMessageContainer,
        ]}
      >
        <View style={styles.messageHeader}>
          <Text style={styles.messageSender}>
            {isFromDM ? (isAI ? "AI DM" : dmName) : item.senderName}
          </Text>
          <Text style={styles.messageTime}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
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

  // Render AI chat message
  const renderAiMessage = ({ item }) => {
    const isAI = item.message.startsWith("[AI]");
    const isError = item.message.startsWith("[ERROR]");

    let displayMessage = item.message;
    if (isAI) {
      displayMessage = item.message.substring(4); // Remove [AI] prefix
    } else if (isError) {
      displayMessage = item.message.substring(7); // Remove [ERROR] prefix
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isAI ? styles.aiAssistantContainer : styles.dmAiMessageContainer,
          isError && styles.errorMessageContainer,
        ]}
      >
        <View style={styles.messageHeader}>
          <Text style={styles.messageSender}>
            {isAI ? "AI Assistant" : "You"}
          </Text>
          <Text style={styles.messageTime}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        <Text
          style={[
            styles.messageText,
            isAI ? styles.aiAssistantText : styles.dmAiMessageText,
            isError && styles.errorMessageText,
          ]}
        >
          {displayMessage}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.halfContainer}>
          <View style={[styles.chatHeader, { backgroundColor: theme.card }]}>
            <Text style={[styles.headerText, { color: theme.text }]}>
              Game Session Chat
            </Text>
          </View>

          <FlatList
            ref={playerChatRef}
            data={playerMessages}
            renderItem={renderPlayerMessage}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            onContentSizeChange={() =>
              playerChatRef.current?.scrollToEnd({ animated: true })
            }
          />

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
                  backgroundColor: theme.card + "99",
                },
              ]}
              value={playerInputText}
              onChangeText={setPlayerInputText}
              placeholder="Send message to players..."
              placeholderTextColor={theme.text + "66"}
              multiline
              maxHeight={80}
            />
            <AnimatedButton
              onPress={handleSendPlayerMessage}
              style={[styles.sendButton, { backgroundColor: theme.accent }]}
              disabled={sendingPlayerMessage || !playerInputText.trim()}
            >
              {sendingPlayerMessage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </AnimatedButton>
          </KeyboardAvoidingView>
        </View>

        <View style={styles.divider} />

        <View style={styles.halfContainer}>
          <View
            style={[
              styles.chatHeader,
              { backgroundColor: theme.secondary || "#2a3950" },
            ]}
          >
            <Text style={[styles.headerText, { color: theme.text }]}>
              AI Assistant Chat
            </Text>
          </View>

          <FlatList
            ref={aiChatRef}
            data={aiMessages}
            renderItem={renderAiMessage}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            onContentSizeChange={() =>
              aiChatRef.current?.scrollToEnd({ animated: true })
            }
          />

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
                  backgroundColor: theme.card + "99",
                },
              ]}
              value={aiInputText}
              onChangeText={setAiInputText}
              placeholder="Ask AI for DM assistance..."
              placeholderTextColor={theme.text + "66"}
              multiline
              maxHeight={80}
            />
            <AnimatedButton
              onPress={handleSendAiMessage}
              style={[styles.sendButton, { backgroundColor: theme.accent }]}
              disabled={sendingAiMessage || !aiInputText.trim()}
            >
              {sendingAiMessage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Ask AI</Text>
              )}
            </AnimatedButton>
          </KeyboardAvoidingView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#111827",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#111827",
  },
  halfContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  divider: {
    width: 1,
    backgroundColor: "#374151",
    marginHorizontal: 2,
  },
  chatHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 10,
    paddingBottom: 30,
  },
  messageContainer: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: "85%",
  },
  playerMessageContainer: {
    backgroundColor: "#4B5563",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 2,
  },
  dmMessageContainer: {
    backgroundColor: "#1E3A8A",
    alignSelf: "flex-end",
    borderBottomRightRadius: 2,
  },
  aiMessageContainer: {
    backgroundColor: "#047857",
  },
  dmAiMessageContainer: {
    backgroundColor: "#2a4073",
    alignSelf: "flex-end",
    borderBottomRightRadius: 2,
  },
  aiAssistantContainer: {
    backgroundColor: "#047857",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 2,
  },
  errorMessageContainer: {
    backgroundColor: "#991B1B",
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#E5E7EB",
  },
  messageTime: {
    fontSize: 10,
    color: "#D1D5DB",
  },
  messageText: {
    fontSize: 14,
  },
  playerMessageText: {
    color: "#F3F4F6",
  },
  dmMessageText: {
    color: "#F3F4F6",
  },
  aiMessageText: {
    color: "#D1FAE5",
  },
  dmAiMessageText: {
    color: "#F3F4F6",
  },
  aiAssistantText: {
    color: "#D1FAE5",
  },
  errorMessageText: {
    color: "#FCA5A5",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#374151",
    backgroundColor: "#1F2937",
    alignItems: "center",
    position: "relative",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  input: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 14,
    maxHeight: 80,
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
});

export default DualChatView;
