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
import {
  saveSessionLog,
  loadSessionLog,
  clearSessionLog,
} from "../utils/sessionLog";
import MapGrid from "../components/MapGrid";
import MapPanel from "../components/panels/MapPanel";
import DiceRollerPanel from "../components/panels/DiceRollerPanel";
import InventoryPanel from "../components/panels/InventoryPanel";

import * as ImagePicker from "expo-image-picker";

const GameSession = ({ navigation, route }) => {
  // Theme context
  const { theme, setThemeKey } = useTheme();

  // State for session
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isContinuing, setIsContinuing] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // Map/token state
  const [tokens, setTokens] = useState([]);
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [pendingCell, setPendingCell] = useState(null);
  const [tokenPromptType, setTokenPromptType] = useState("player");
  const [tokenPromptLabel, setTokenPromptLabel] = useState("");
  const [tokenPromptImageUri, setTokenPromptImageUri] = useState(null);
  // Default icon gallery (local assets or URLs)
  const defaultTokenIcons = [
    // You can replace these URLs with local assets if desired
    "https://img.icons8.com/color/48/000000/knight.png",
    "https://img.icons8.com/color/48/000000/wizard.png",
    "https://img.icons8.com/color/48/000000/ogre.png",
    "https://img.icons8.com/color/48/000000/ghost.png",
    "https://img.icons8.com/color/48/000000/archer.png",
    "https://img.icons8.com/color/48/000000/dragon.png",
    "https://img.icons8.com/color/48/000000/treasure-chest.png",
    "https://img.icons8.com/color/48/000000/elf-male.png",
    "https://img.icons8.com/color/48/000000/robot-2.png",
  ];
  // Map panel state
  const [mapPanelVisible, setMapPanelVisible] = useState(false);
  // Dice roller panel state
  const [dicePanelVisible, setDicePanelVisible] = useState(false);
  // Inventory panel state
  const [inventoryPanelVisible, setInventoryPanelVisible] = useState(false);

  // Inventory state
  const [inventory, setInventory] = useState([
    // Example starter item
    // { id: "1", name: "Short Sword", type: "Weapon", description: "A basic sword.", quantity: 1 }
  ]);

  // Session timer state
  const config = route.params?.config || {};
  const sessionMinutes = config.sessionTime || 30;
  const [secondsLeft, setSecondsLeft] = useState(sessionMinutes * 60);
  const [timerActive, setTimerActive] = useState(true);
  const [timerInterval, setTimerInterval] = useState(null);
  const [timerPacingStage, setTimerPacingStage] = useState(0); // 0: none, 1: 50%, 2: 80%, 3: 95%, 4: ended

  // Load session log on mount (or use initial config/character)
  React.useEffect(() => {
    async function loadSession() {
      // If continuing, load session log
      if (route.params?.continueSession) {
        const log = await loadSessionLog();
        if (log && log.messages && log.character && log.config) {
          setMessages(log.messages);
          setInputText("");
          if (log.config.theme) setThemeKey(log.config.theme);
          if (log.tokens) setTokens(log.tokens);
        }
      } else {
        // New session
        const config = route.params?.config || {};
        const character = route.params?.character || {};
        if (config.theme) setThemeKey(config.theme);
        const initialMessage = `Welcome to your ${config.theme || "fantasy"} adventure! As a ${character.race || "brave"} ${character.class || "adventurer"}, you find yourself in a mysterious setting. What do you do?`;
        setMessages([{ id: "1", text: initialMessage, isDM: true }]);
        setInputText("");
        setTokens([]);
      }
      setSessionLoaded(true);
    }
    loadSession();
    // eslint-disable-next-line
  }, []);

  // Session timer effect
  React.useEffect(() => {
    if (!timerActive || sessionLoaded === false) return;
    if (timerInterval) return; // already running

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimerInterval(interval);

    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [timerActive, sessionLoaded]);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
    // eslint-disable-next-line
  }, []);

  // Save session log after each message change
  React.useEffect(() => {
    async function saveLog() {
      if (!sessionLoaded) return;
      // Save config and character from route.params (if present)
      const config = route.params?.config || {};
      const character = route.params?.character || {};
      await saveSessionLog({
        messages,
        config,
        character,
        tokens,
      });
    }
    saveLog();
    // eslint-disable-next-line
  }, [messages, tokens, sessionLoaded]);

  // Pacing logic: reminders at 50%, 80%, 95%, and auto-end at 0
  React.useEffect(() => {
    if (!timerActive || sessionLoaded === false) return;
    const thresholds = [
      {
        percent: 0.5,
        stage: 1,
        message:
          "Half your session time has passed. Consider moving the story forward!",
      },
      {
        percent: 0.8,
        stage: 2,
        message:
          "Only 20% of your session remains. Prepare for a climax or resolution soon!",
      },
      {
        percent: 0.95,
        stage: 3,
        message: "Time is almost up! The adventure is reaching its end.",
      },
    ];
    const totalSeconds = sessionMinutes * 60;
    for (const t of thresholds) {
      if (
        secondsLeft <= Math.floor(totalSeconds * (1 - t.percent)) &&
        timerPacingStage < t.stage
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${prev.length + 1}`,
            text: `⏰ [AI]: ${t.message}`,
            isDM: true,
          },
        ]);
        setTimerPacingStage(t.stage);
        break;
      }
    }
    // Auto-end session with wrap-up
    if (secondsLeft === 0 && timerPacingStage < 4) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${prev.length + 1}`,
          text: "⏰ [AI]: Time is up! The session concludes here. The DM will provide a narrative wrap-up and rewards. Thank you for playing!",
          isDM: true,
        },
      ]);
      setTimerPacingStage(4);
      setTimerActive(false);
    }
    // eslint-disable-next-line
  }, [secondsLeft, timerActive, sessionLoaded]);

  const handleSubmit = async () => {
    if (!inputText.trim()) return;

    // Use config/character from route.params (for session log consistency)
    const config = route.params?.config || {};
    const character = route.params?.character || {};

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
      {/* Session Timer UI */}
      <View style={styles.timerContainer}>
        <Text style={[styles.timerText, { color: theme.accent }]}>
          ⏳ Time Left:{" "}
          {Math.floor(secondsLeft / 60)
            .toString()
            .padStart(2, "0")}
          :{(secondsLeft % 60).toString().padStart(2, "0")}
        </Text>
      </View>
      {/* MapPanel pop-out */}
      <MapPanel
        visible={mapPanelVisible}
        onClose={() => setMapPanelVisible(false)}
        onOpen={() => setMapPanelVisible(true)}
        theme={theme}
        panelPosition="right"
        anyPanelOpen={mapPanelVisible || dicePanelVisible}
      >
        <MapGrid
          tokens={tokens}
          onPlaceToken={(x, y) => {
            setPendingCell({ x, y });
            setShowTokenPrompt(true);
            setTokenPromptType("player");
            setTokenPromptLabel("");
          }}
          onMoveToken={(tokenId, x, y) => {
            setTokens((prev) =>
              prev.map((t) => (t.id === tokenId ? { ...t, x, y } : t)),
            );
            setSelectedTokenId(null);
          }}
          selectedTokenId={selectedTokenId}
          style={{ marginBottom: 8 }}
        />
        {/* Token prompt modal (inline in panel) */}
        {showTokenPrompt && (
          <View style={styles.tokenPromptOverlay}>
            <View style={styles.tokenPromptBox}>
              <Text
                style={{
                  color: theme.text,
                  fontWeight: "bold",
                  fontSize: 16,
                  marginBottom: 8,
                }}
              >
                Place New Token
              </Text>
              <View style={{ flexDirection: "row", marginBottom: 8 }}>
                {["player", "npc", "monster"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.tokenTypeButton,
                      {
                        backgroundColor:
                          tokenPromptType === type ? "#fff" : "#232946",
                        borderColor:
                          tokenPromptType === type ? "#7f9cf5" : "#393e6e",
                      },
                    ]}
                    onPress={() => setTokenPromptType(type)}
                  >
                    <Text
                      style={{
                        color: tokenPromptType === type ? "#232946" : "#eaeaea",
                        fontWeight: "bold",
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: "#23294699",
                    marginBottom: 8,
                    minHeight: 36,
                    fontSize: 15,
                  },
                ]}
                value={tokenPromptLabel}
                onChangeText={setTokenPromptLabel}
                placeholder="Label (optional)"
                placeholderTextColor={theme.text + "99"}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: theme.button, minWidth: 80 },
                  ]}
                  onPress={() => {
                    setTokens((prev) => [
                      ...prev,
                      {
                        id: Date.now().toString(),
                        type: tokenPromptType,
                        x: pendingCell.x,
                        y: pendingCell.y,
                        label: tokenPromptLabel,
                        imageUri: tokenPromptImageUri,
                      },
                    ]);
                    setShowTokenPrompt(false);
                    setPendingCell(null);
                    setTokenPromptLabel("");
                    setTokenPromptImageUri(null);
                    setTokenPromptType("player");
                  }}
                  disabled={!tokenPromptType || !tokenPromptImageUri}
                >
                  {/* Image Picker UI & Default Icon Gallery */}
                  <View style={{ alignItems: "center", marginBottom: 8 }}>
                    {/* Always show preview if image/icon is selected */}
                    {tokenPromptImageUri && (
                      <View style={{ alignItems: "center", marginBottom: 4 }}>
                        <Image
                          source={{ uri: tokenPromptImageUri }}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            marginBottom: 2,
                            borderWidth: 3,
                            borderColor: theme.accent || "#7f9cf5",
                            backgroundColor: "#fff",
                          }}
                        />
                        <TouchableOpacity
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            backgroundColor: "#393e6e",
                            borderRadius: 8,
                            marginBottom: 2,
                          }}
                          onPress={() => setTokenPromptImageUri(null)}
                        >
                          <Text style={{ color: "#fff", fontSize: 13 }}>
                            Remove Image
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {!tokenPromptImageUri && (
                      <>
                        <TouchableOpacity
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            backgroundColor: theme.button,
                            borderRadius: 8,
                            marginBottom: 6,
                          }}
                          onPress={async () => {
                            // Ask for permission
                            const { status } =
                              await ImagePicker.requestMediaLibraryPermissionsAsync();
                            if (status !== "granted") {
                              alert(
                                "Permission to access media library is required!",
                              );
                              return;
                            }
                            let result =
                              await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsEditing: true,
                                aspect: [1, 1],
                                quality: 0.7,
                              });
                            if (
                              !result.cancelled &&
                              result.assets &&
                              result.assets.length > 0
                            ) {
                              setTokenPromptImageUri(result.assets[0].uri);
                            } else if (!result.cancelled && result.uri) {
                              setTokenPromptImageUri(result.uri);
                            }
                          }}
                        >
                          <Text
                            style={{ color: theme.buttonText, fontSize: 15 }}
                          >
                            Upload Token Image
                          </Text>
                        </TouchableOpacity>
                        {/* Default Icon Gallery */}
                        <Text
                          style={{
                            color: theme.text,
                            fontSize: 13,
                            marginBottom: 2,
                          }}
                        >
                          Or pick a default icon:
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            marginBottom: 2,
                          }}
                        >
                          {defaultTokenIcons.map((iconUri, idx) => {
                            const isSelected = tokenPromptImageUri === iconUri;
                            return (
                              <TouchableOpacity
                                key={iconUri}
                                onPress={() => setTokenPromptImageUri(iconUri)}
                                style={{
                                  margin: 3,
                                  borderWidth: isSelected ? 3 : 2,
                                  borderColor: isSelected
                                    ? theme.accent || "#7f9cf5"
                                    : "#393e6e",
                                  borderRadius: 20,
                                  padding: isSelected ? 1 : 2,
                                  backgroundColor: isSelected
                                    ? "#fff"
                                    : "#232946",
                                  shadowColor: isSelected
                                    ? theme.accent || "#7f9cf5"
                                    : undefined,
                                  shadowOpacity: isSelected ? 0.3 : 0,
                                  shadowRadius: isSelected ? 4 : 0,
                                  elevation: isSelected ? 3 : 0,
                                }}
                              >
                                <Image
                                  source={{ uri: iconUri }}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    opacity: isSelected ? 1 : 0.85,
                                  }}
                                />
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    )}
                  </View>
                  <Text
                    style={[styles.buttonText, { color: theme.buttonText }]}
                  >
                    Place
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: "#b23b3b", minWidth: 80 },
                  ]}
                  onPress={() => {
                    setShowTokenPrompt(false);
                    setPendingCell(null);
                    setTokenPromptLabel("");
                    setTokenPromptImageUri(null);
                    setTokenPromptType("player");
                  }}
                >
                  <Text style={[styles.buttonText, { color: "#fff" }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </MapPanel>
      {/* Dice Roller Panel */}
      <DiceRollerPanel
        visible={dicePanelVisible}
        onClose={() => setDicePanelVisible(false)}
        onOpen={() => setDicePanelVisible(true)}
        onRoll={(result) => {
          // Post roll result to chat/log
          setMessages((prev) => [
            ...prev,
            {
              id: `${prev.length + 1}`,
              text:
                `🎲 You rolled ${result.count > 1 ? result.count + result.label : result.label}: ` +
                `${result.rolls.join(", ")} (Total: ${result.total})`,
              isDM: false,
              isDiceRoll: true,
              dice: result,
            },
          ]);
        }}
        theme={theme}
        panelPosition="right"
        anyPanelOpen={mapPanelVisible || dicePanelVisible}
      />

      <InventoryPanel
        visible={inventoryPanelVisible}
        onClose={() => setInventoryPanelVisible(false)}
        onOpen={() => setInventoryPanelVisible(true)}
        inventory={inventory}
        theme={theme}
        panelPosition="right"
        anyPanelOpen={mapPanelVisible || dicePanelVisible || inventoryPanelVisible}
        onUseItem={(item) => {
          // Example: Remove one quantity and post to chat
          setInventory((prev) =>
            prev
              .map((i) =>
                i.id === item.id
                  ? { ...i, quantity: i.quantity > 1 ? i.quantity - 1 : 0 }
                  : i
              )
              .filter((i) => i.quantity > 0)
          );
          setMessages((prev) => [
            ...prev,
            {
              id: `${prev.length + 1}`,
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
              id: `${prev.length + 1}`,
              text: `🧰 You dropped ${item.name}.`,
              isDM: false,
              isInventory: true,
              item,
            },
          ]);
        }}
      />
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
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === "Enter" && !nativeEvent.shiftKey) {
              handleSubmit();
            }
          }}
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
      export default GameSession;
    </KeyboardAvoidingView>
);

const GameSession = (props) => {
  // ...all your logic...

  return (
    <KeyboardAvoidingView>
      {/* ...main UI... */}

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

      {/* End Session button */}
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
        onPress={async () => {
          await clearSessionLog();
          navigation.navigate("MainMenu");
        }}
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
  timerContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 0,
  },
  timerText: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
    padding: 6,
  },
  tokenPromptOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000a",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  tokenPromptBox: {
    backgroundColor: "#232946",
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: "#7f9cf5",
    width: 280,
    alignItems: "center",
    elevation: 4,
  },
  tokenTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 2,
  },
  mapTabButton: {
    position: "absolute",
    top: 90,
    right: 0,
    zIndex: 50,
    backgroundColor: "#7f9cf5",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  mapTabButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 1,
  },
});

export default GameSession;
