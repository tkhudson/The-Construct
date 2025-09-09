import React, { useState } from "react";
import {
  View,
  Text,
  Picker,
  TextInput,
  Switch,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { createSession } from "../firebase/sessionService";

// Sample options based on game plan
const themesList = [
  "Classic D&D",
  "Modern Zombies",
  "Star Wars",
  "Post-Apocalyptic Wasteland",
  "Custom",
];
const difficulties = ["Easy", "Medium", "Hard"];
const campaignModes = ["One-shot", "Ongoing"];
const roleModes = ["Player", "Dungeon Master"];

const SessionSetup = ({ navigation }) => {
  const [numPlayers, setNumPlayers] = useState(1);
  const [isAIDM, setIsAIDM] = useState(true); // Default to AI DM
  const [selectedTheme, setSelectedTheme] = useState(themesList[0]);
  const [customTheme, setCustomTheme] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficulties[1]);
  const [selectedCampaignMode, setSelectedCampaignMode] = useState(
    campaignModes[0],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Multiplayer options
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [selectedRole, setSelectedRole] = useState(roleModes[0]);
  const [dmName, setDmName] = useState("");

  // Theme context
  const { theme, setThemeKey } = useTheme();

  // Set theme preview based on selection
  React.useEffect(() => {
    if (selectedTheme && themesList.includes(selectedTheme)) {
      setThemeKey(selectedTheme);
    }
    // eslint-disable-next-line
  }, [selectedTheme]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const themeToUse =
        selectedTheme === "Custom" ? customTheme : selectedTheme;

      // Single player mode
      if (!isMultiplayer) {
        const config = {
          numPlayers,
          isAIDM,
          theme: themeToUse,
          difficulty: selectedDifficulty,
          campaignMode: selectedCampaignMode,
        };
        navigation.navigate("CharacterCreation", { config });
      }
      // Multiplayer mode
      else {
        // Player role - go to join session screen
        if (selectedRole === "Player") {
          navigation.navigate("JoinSession");
        }
        // DM role - create a new session
        else {
          if (!dmName.trim()) {
            setError("Please enter your name as DM");
            setLoading(false);
            return;
          }

          // Create a new session
          const sessionResult = await createSession(dmName, themeToUse, {
            difficulty: selectedDifficulty,
            campaignMode: selectedCampaignMode,
            isAIDM: isAIDM,
          });

          if (sessionResult.success) {
            // Navigate to character creation (DM doesn't need a character, but uses the same flow)
            navigation.navigate("CharacterCreation", {
              config: {
                theme: themeToUse,
                difficulty: selectedDifficulty,
                campaignMode: selectedCampaignMode,
                isAIDM: isAIDM,
              },
              isMultiplayer: true,
              isDM: true,
              sessionCode: sessionResult.sessionCode,
              dmId: sessionResult.dmId,
              dmName: dmName,
            });

            // Show session code in an alert
            Alert.alert(
              "Session Created!",
              `Your session code is: ${sessionResult.sessionCode}\n\nShare this code with your players so they can join your game.`,
              [{ text: "OK" }],
            );
          } else {
            setError(sessionResult.error || "Failed to create session");
          }
        }
      }
    } catch (err) {
      setError(`Error setting up session: ${err.message}`);
      console.error("Session setup error:", err);
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
    <ScrollView style={[styles.container, gradientStyle]}>
      {backgroundElement}
      <Text style={[styles.title, { color: theme.text }]}>Session Setup</Text>

      {/* Multiplayer switch */}
      <View style={styles.switchContainer}>
        <Text style={[styles.label, { color: theme.text }]}>
          Multiplayer Mode: {isMultiplayer ? "On" : "Off"}
        </Text>
        <Switch
          value={isMultiplayer}
          onValueChange={setIsMultiplayer}
          trackColor={{ true: theme.accent, false: "#888" }}
          thumbColor={isMultiplayer ? theme.accent : "#ccc"}
        />
      </View>

      {isMultiplayer ? (
        <>
          {/* Role Selection (Player or DM) */}
          <Text style={[styles.label, { color: theme.text }]}>Your Role:</Text>
          <Picker
            selectedValue={selectedRole}
            onValueChange={(itemValue) => setSelectedRole(itemValue)}
            style={[
              styles.picker,
              {
                color: theme.text,
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
            dropdownIconColor={theme.accent}
          >
            {roleModes.map((role) => (
              <Picker.Item key={role} label={role} value={role} />
            ))}
          </Picker>

          {/* DM Name input (only shown when DM role is selected) */}
          {selectedRole === "Dungeon Master" && (
            <>
              <Text style={[styles.label, { color: theme.text }]}>
                Your Name (as DM):
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: "#23294699",
                  },
                ]}
                placeholder="Enter your name"
                placeholderTextColor={theme.text + "99"}
                value={dmName}
                onChangeText={setDmName}
              />

              {/* AI DM Assistant toggle */}
              <View style={styles.switchContainer}>
                <Text style={[styles.label, { color: theme.text }]}>
                  AI DM Assistant: {isAIDM ? "On" : "Off"}
                </Text>
                <Switch
                  value={isAIDM}
                  onValueChange={setIsAIDM}
                  trackColor={{ true: theme.accent, false: "#888" }}
                  thumbColor={isAIDM ? theme.accent : "#ccc"}
                />
              </View>
            </>
          )}
        </>
      ) : (
        <>
          {/* Single player options */}
          <Text style={[styles.label, { color: theme.text }]}>
            Number of Players (1-6):
          </Text>
          <Picker
            selectedValue={numPlayers}
            onValueChange={(itemValue) => setNumPlayers(itemValue)}
            style={[
              styles.picker,
              {
                color: theme.text,
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
            dropdownIconColor={theme.accent}
          >
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <Picker.Item key={num} label={`${num}`} value={num} />
            ))}
          </Picker>

          <View style={styles.switchContainer}>
            <Text style={[styles.label, { color: theme.text }]}>
              DM Mode: {isAIDM ? "AI" : "Player"}
            </Text>
            <Switch
              value={isAIDM}
              onValueChange={setIsAIDM}
              trackColor={{ true: theme.accent, false: "#888" }}
              thumbColor={isAIDM ? theme.accent : "#ccc"}
            />
          </View>
        </>
      )}

      <Text style={[styles.label, { color: theme.text }]}>Theme/Setting:</Text>
      <Picker
        selectedValue={selectedTheme}
        onValueChange={(itemValue) => setSelectedTheme(itemValue)}
        style={[
          styles.picker,
          {
            color: theme.text,
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
        dropdownIconColor={theme.accent}
      >
        {themesList.map((themeName) => (
          <Picker.Item key={themeName} label={themeName} value={themeName} />
        ))}
      </Picker>
      {selectedTheme === "Custom" && (
        <TextInput
          style={[
            styles.textInput,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: "#23294699",
            },
          ]}
          placeholder="Describe your custom theme..."
          placeholderTextColor={theme.text + "99"}
          value={customTheme}
          onChangeText={setCustomTheme}
        />
      )}

      <Text style={[styles.label, { color: theme.text }]}>Difficulty:</Text>
      <Picker
        selectedValue={selectedDifficulty}
        onValueChange={(itemValue) => setSelectedDifficulty(itemValue)}
        style={[
          styles.picker,
          {
            color: theme.text,
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
        dropdownIconColor={theme.accent}
      >
        {difficulties.map((diff) => (
          <Picker.Item key={diff} label={diff} value={diff} />
        ))}
      </Picker>

      <Text style={[styles.label, { color: theme.text }]}>Campaign Mode:</Text>
      <Picker
        selectedValue={selectedCampaignMode}
        onValueChange={(itemValue) => setSelectedCampaignMode(itemValue)}
        style={[
          styles.picker,
          {
            color: theme.text,
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
        dropdownIconColor={theme.accent}
      >
        {campaignModes.map((mode) => (
          <Picker.Item key={mode} label={mode} value={mode} />
        ))}
      </Picker>

      {/* Error message display */}
      {error && (
        <Text style={[styles.errorText, { marginTop: 15 }]}>{error}</Text>
      )}

      {loading ? (
        <View style={{ marginVertical: 30, alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={{ marginTop: 10, fontSize: 16, color: theme.text }}>
            {isMultiplayer && selectedRole === "Dungeon Master"
              ? "Creating session..."
              : "Starting session..."}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.button, alignSelf: "center" },
          ]}
          onPress={handleSubmit}
        >
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>
            {isMultiplayer
              ? selectedRole === "Player"
                ? "Join Session"
                : "Create Session"
              : "Start Session"}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 18,
    marginTop: 10,
    marginBottom: 5,
  },
  picker: {
    height: 50,
    width: "100%",
    marginBottom: 15,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    minHeight: 40,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    justifyContent: "space-between",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    minWidth: 150,
    elevation: 1,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  errorText: {
    color: "#e74c3c",
    textAlign: "center",
    fontSize: 16,
    marginBottom: 10,
  },
});

export default SessionSetup;
