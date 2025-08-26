import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import { rollD20 } from "../utils/diceRoller";
import { queryAI } from "../utils/aiService";
import { useTheme } from "../theme/ThemeProvider";

const GameSession = ({ navigation, route }) => {
  const config = route.params?.config || {};
  const character = route.params?.character || {};

  // Theme context
  const { theme, setThemeKey } = useTheme();

  // Set theme based on session config
  React.useEffect(() => {
    if (config.theme) setThemeKey(config.theme);
    // eslint-disable-next-line
  }, [config.theme]);

  const initialMessage = `Welcome to your ${config.theme || "fantasy"} adventure! As a ${character.race || "brave"} ${character.class || "adventurer"}, you find yourself in a mysterious setting. What do you do?`;

  const [messages, setMessages] = useState([
    { id: "1", text: initialMessage, isDM: true },
  ]);
  const [inputText, setInputText] = useState("");
  const [isContinuing, setIsContinuing] = useState(false);

  const handleSubmit = async () => {
    if (!inputText.trim()) return;

    // Add player message
    const newMessages = [
      ...messages,
      { id: `${messages.length + 1}`, text: inputText, isDM: false },
    ];

    // Debug: Confirm queryAI is about to be called
    console.log("[GS DEBUG] Calling queryAI...");
    const aiResponse = await queryAI(
      inputText,
      config,
      character,
      messages.slice(-5),
    );
    console.log("[GS DEBUG] queryAI response:", aiResponse);

    newMessages.push({
      id: `${newMessages.length + 1}`,
      text: aiResponse,
      isDM: true,
    });

    setMessages(newMessages);
    setInputText("");
  };

  // Helper: Detect if the last AI message is likely cut off
  function isCutOff(text) {
    if (!text) return false;
    // Heuristic: ends with colon, comma, "and", "or", "with", "containing", "including", "such as", or ellipsis, or incomplete markdown list
    const cutOffPatterns = [
      /[:;,]$/,
      /\b(and|or|with|containing|including|such as)$/i,
      /\.\.\.$/,
      /- $/,
      /\*\*?$/,
      /\($/,
      /\[$/,
      /:\s*$/,
      /,$/,
      /\bto be continued\b/i,
    ];
    // Also: ends mid-sentence (no period, exclamation, or question mark)
    if (!/[.!?]$/.test(text.trim()) && text.trim().length > 40) {
      return true;
    }
    return cutOffPatterns.some((pat) => pat.test(text.trim()));
  }

  // Continue handler: ask AI to continue the last message
  const handleContinue = async () => {
    setIsContinuing(true);
    const lastAIMsg = messages.filter((m) => m.isDM).slice(-1)[0];
    const newMessages = [...messages];
    // Ask AI to continue, using the same context/history
    const aiResponse = await queryAI(
      "Please continue.",
      config,
      character,
      messages.slice(-5),
    );
    newMessages.push({
      id: `${newMessages.length + 1}`,
      text:
        lastAIMsg.text +
        (lastAIMsg.text.endsWith("\n") ? "" : "\n") +
        aiResponse,
      isDM: true,
    });
    setMessages(newMessages);
    setIsContinuing(false);
  };

  const handleRollD20 = (modifier = 0) => {
    const roll = rollD20(modifier);
    const rollMessage = `Dice Roll (d20 + ${modifier}): ${roll}`;
    setMessages([
      ...messages,
      { id: `${messages.length + 1}`, text: rollMessage, isDM: false },
    ]);
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.message,
        {
          backgroundColor: item.isDM ? theme.card : theme.accent + "55", // pastel accent with transparency for player
          alignSelf: item.isDM ? "flex-start" : "flex-end",
        },
      ]}
    >
      <Text style={[styles.messageText, { color: theme.text }]}>
        {item.text}
      </Text>
    </View>
  );

  // Background: image or gradient
  let backgroundElement = null;
  if (theme.background.type === "image" && theme.background.image) {
    backgroundElement = (
      <ImageBackground
        source={theme.background.image}
        style={styles.backgroundImage}
        imageStyle={{ resizeMode: "cover", opacity: 0.5, alignSelf: "center" }}
      />
    );
  }

  // Gradient fallback (simple, vertical)
  const gradientStyle =
    theme.background.type === "gradient"
      ? {
          background: `linear-gradient(180deg, ${theme.background.colors[0]}, ${theme.background.colors[1]})`,
          backgroundColor: theme.background.colors[0],
        }
      : {
          backgroundColor: theme.background.fallback || "#232946",
        };

  return (
    <KeyboardAvoidingView
      style={[styles.container, gradientStyle]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={80}
    >
      {backgroundElement}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
      />
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: "#23294699",
            },
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Enter your action..."
          placeholderTextColor={theme.text + "99"}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.button, marginRight: 8 },
          ]}
          onPress={handleSubmit}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>
            Submit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.button }]}
          onPress={() => handleRollD20(0)}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>
            Roll d20
          </Text>
        </TouchableOpacity>
      </View>
      {/* Continue button if last AI message is cut off */}
      {messages.length > 0 &&
        isCutOff(messages[messages.length - 1].text) &&
        messages[messages.length - 1].isDM && (
          <View style={{ alignItems: "center", marginVertical: 10 }}>
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: theme.button, paddingHorizontal: 32 },
              ]}
              onPress={handleContinue}
              disabled={isContinuing}
            >
              <Text style={[styles.buttonText, { color: theme.buttonText }]}>
                {isContinuing ? "Continuing..." : "Continue"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: "#b23b3b",
            margin: 16,
            alignSelf: "center",
            paddingHorizontal: 32,
          },
        ]}
        onPress={() => navigation.navigate("MainMenu")}
      >
        <Text style={[styles.buttonText, { color: "#fff" }]}>End Session</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: "100%",
    position: "relative",
    justifyContent: "flex-end",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    justifyContent: "center",
    alignItems: "center",
  },
  chatList: {
    flex: 1,
    padding: 10,
    marginBottom: 0,
  },
  message: {
    padding: 14,
    borderRadius: 14,
    marginVertical: 6,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 14,
    borderTopWidth: 1.5,
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    fontSize: 16,
    minHeight: 40,
    maxHeight: 100,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 0,
    marginRight: 0,
    minWidth: 70,
    elevation: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});

export default GameSession;
