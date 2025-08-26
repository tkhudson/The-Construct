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
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";

// Sample options based on game plan
const themesList = [
  "Classic D&D",
  "Modern Zombies",
  "Star Wars",
  "Post-Apocalyptic Wasteland",
  "Custom",
];
const difficulties = ["Easy", "Medium", "Hard"];
const sessionTimes = ["10 minutes", "30 minutes", "1 hour"];
const campaignModes = ["One-shot", "Ongoing"];

const SessionSetup = ({ navigation }) => {
  const [numPlayers, setNumPlayers] = useState(1);
  const [isAIDM, setIsAIDM] = useState(true); // Default to AI DM
  const [selectedTheme, setSelectedTheme] = useState(themesList[0]);
  const [customTheme, setCustomTheme] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficulties[1]);
  const [selectedSessionTime, setSelectedSessionTime] = useState(
    sessionTimes[1],
  );
  const [selectedCampaignMode, setSelectedCampaignMode] = useState(
    campaignModes[0],
  );
  const [loading, setLoading] = useState(false);

  // Theme context
  const { theme, setThemeKey } = useTheme();

  // Set theme preview based on selection
  React.useEffect(() => {
    if (selectedTheme && themesList.includes(selectedTheme)) {
      setThemeKey(selectedTheme);
    }
    // eslint-disable-next-line
  }, [selectedTheme]);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      const config = {
        numPlayers,
        isAIDM,
        theme: selectedTheme === "Custom" ? customTheme : selectedTheme,
        difficulty: selectedDifficulty,
        sessionTime: selectedSessionTime,
        campaignMode: selectedCampaignMode,
      };
      navigation.navigate("CharacterCreation", { config });
      setLoading(false);
    }, 1200); // Simulate loading for 1.2 seconds
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

      <Text style={[styles.label, { color: theme.text }]}>Session Time:</Text>
      <Picker
        selectedValue={selectedSessionTime}
        onValueChange={(itemValue) => setSelectedSessionTime(itemValue)}
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
        {sessionTimes.map((time) => (
          <Picker.Item key={time} label={time} value={time} />
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

      {loading ? (
        <View style={{ marginVertical: 30, alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={{ marginTop: 10, fontSize: 16, color: theme.text }}>
            Starting session...
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
            Start Session
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
    minWidth: 120,
    elevation: 1,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});

export default SessionSetup;
