import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { findSessionByCode, joinSession } from "../firebase/sessionService";

const JoinSession = ({ navigation }) => {
  // State management
  const [sessionCode, setSessionCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);

  // Theme context
  const { theme } = useTheme();

  // Format session code input (uppercase, remove spaces)
  const formatSessionCode = (code) => {
    return code.toUpperCase().replace(/\s/g, "");
  };

  // Check session code when it changes
  useEffect(() => {
    const checkSession = async () => {
      // Only check if we have a complete code (6 chars)
      if (sessionCode.length === 6) {
        setLoading(true);
        try {
          const result = await findSessionByCode(sessionCode);
          if (result.success) {
            setSessionInfo(result.session);
            setError(null);
          } else {
            setSessionInfo(null);
            setError("Session not found. Check the code and try again.");
          }
        } catch (err) {
          setError("Error checking session: " + err.message);
          setSessionInfo(null);
        } finally {
          setLoading(false);
        }
      } else {
        // Reset session info if code is incomplete
        setSessionInfo(null);
        setError(null);
      }
    };

    if (sessionCode.length === 6) {
      checkSession();
    }
  }, [sessionCode]);

  // Handle joining the session
  const handleJoinSession = async () => {
    if (!sessionCode || sessionCode.length !== 6) {
      setError("Please enter a valid 6-character session code");
      return;
    }

    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await joinSession(sessionCode, playerName);

      if (result.success) {
        // Navigate to character creation with session info
        navigation.navigate("CharacterCreation", {
          sessionCode: result.sessionCode,
          playerId: result.playerId,
          playerName,
          theme: result.theme,
          isMultiplayer: true,
          isDM: false,
          dmName: result.dmName,
          config: {
            theme: result.theme || "Classic D&D",
            isAIDM: false,
          },
        });
      } else {
        setError(result.error || "Failed to join session");
      }
    } catch (err) {
      setError("Error joining session: " + err.message);
    } finally {
      setLoading(false);
    }
  };

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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, gradientStyle]}
    >
      {backgroundElement}
      <Text style={[styles.title, { color: theme.text }]}>Join Session</Text>

      <View style={styles.formContainer}>
        <Text style={[styles.label, { color: theme.text }]}>
          Enter Session Code:
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.card + "AA",
            },
          ]}
          value={sessionCode}
          onChangeText={(text) => setSessionCode(formatSessionCode(text))}
          placeholder="Enter 6-character code"
          placeholderTextColor={theme.text + "88"}
          maxLength={6}
          autoCapitalize="characters"
        />

        {loading && sessionCode.length === 6 ? (
          <ActivityIndicator
            size="small"
            color={theme.accent}
            style={styles.indicator}
          />
        ) : sessionInfo ? (
          <Text style={[styles.sessionInfo, { color: theme.accent }]}>
            Found! DM: {sessionInfo.dmName} • Theme: {sessionInfo.theme}
          </Text>
        ) : error && sessionCode.length === 6 ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <Text style={[styles.label, { color: theme.text, marginTop: 20 }]}>
          Your Name:
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.card + "AA",
            },
          ]}
          value={playerName}
          onChangeText={setPlayerName}
          placeholder="Enter your name"
          placeholderTextColor={theme.text + "88"}
          maxLength={20}
        />

        {error && sessionCode.length < 6 && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: sessionInfo ? theme.button : theme.button + "88",
              opacity: sessionInfo && playerName ? 1 : 0.7,
            },
          ]}
          onPress={handleJoinSession}
          disabled={!sessionInfo || !playerName || loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.buttonText} size="small" />
          ) : (
            <Text style={[styles.buttonText, { color: theme.buttonText }]}>
              Join Game
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.backButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: theme.text }]}>
            Back to Main Menu
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  label: {
    fontSize: 18,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 2,
    textAlign: "center",
  },
  sessionInfo: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  errorText: {
    color: "#e74c3c",
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    alignSelf: "center",
    minWidth: 200,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  backButton: {
    marginTop: 20,
    padding: 10,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    textDecorationLine: "underline",
  },
  indicator: {
    marginTop: 8,
  },
});

export default JoinSession;
