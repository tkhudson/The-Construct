import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { sessionLogExists } from "../utils/sessionLog";

const MainMenu = ({ navigation }) => {
  const { theme } = useTheme();
  const [canContinue, setCanContinue] = useState(false);

  // Check if a session log exists
  useEffect(() => {
    async function checkSession() {
      const exists = await sessionLogExists();
      setCanContinue(exists);
    }
    checkSession();
    // Optionally, listen for focus to update when returning to menu
    const unsubscribe = navigation.addListener("focus", checkSession);
    return unsubscribe;
    // eslint-disable-next-line
  }, [navigation]);

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
    <View style={[styles.container, gradientStyle]}>
      {backgroundElement}
      <Text style={[styles.title, { color: theme.text }]}>The Construct</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.button }]}
        onPress={() => navigation.navigate("NewGame")}
      >
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>
          New Game
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: canContinue ? theme.button : "#888" },
        ]}
        onPress={() => {
          if (canContinue)
            navigation.navigate("GameSession", { continueSession: true });
        }}
        disabled={!canContinue}
      >
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>
          Continue Session
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.button }]}
        onPress={() => navigation.navigate("Settings")}
      >
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>
          Settings
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#b23b3b" }]}
        onPress={() => {
          // Handle exit or something
        }}
      >
        <Text style={[styles.buttonText, { color: "#fff" }]}>Exit</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: "100%",
    position: "relative",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 40,
    letterSpacing: 1,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    minWidth: 220,
    elevation: 1,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});

export default MainMenu;
