import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Picker,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Slider,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";

const CharacterCreation = ({ navigation, route }) => {
  const config = route.params?.config || {};
  const { theme, setThemeKey } = useTheme();

  // Set theme based on session config
  React.useEffect(() => {
    if (config.theme) setThemeKey(config.theme);
    // eslint-disable-next-line
  }, [config.theme]);

  // Get character options from theme
  const characterOptions = theme.characterOptions || {
    races: ["Human"],
    classes: ["Adventurer"],
    backgrounds: ["Wanderer"],
    ageRange: { min: 10, max: 100 },
    traitModifiers: () => ({}),
  };

  // Check if DM mode (DMs don't need a character)
  const isDM = route.params?.isDM || false;

  // State for dynamic selections
  const [selectedRace, setSelectedRace] = useState(characterOptions.races[0]);
  const [selectedClass, setSelectedClass] = useState(
    characterOptions.classes[0],
  );
  const [selectedBackground, setSelectedBackground] = useState(
    characterOptions.backgrounds[0],
  );
  const [backstory, setBackstory] = useState("");
  const [age, setAge] = useState(
    Math.floor(
      (characterOptions.ageRange.min + characterOptions.ageRange.max) / 2,
    ),
  );

  // Trait modifiers based on age
  const traitMods = characterOptions.traitModifiers
    ? characterOptions.traitModifiers(age)
    : {};

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

  const handleSubmit = () => {
    const character = {
      race: selectedRace,
      class: selectedClass,
      background: selectedBackground,
      backstory,
      age,
      traitMods,
    };

    // Check if this is a multiplayer session
    const isMultiplayer = route.params?.isMultiplayer || false;
    const isDM = route.params?.isDM || false;
    const sessionCode = route.params?.sessionCode;
    const dmId = route.params?.dmId;
    const dmName = route.params?.dmName;
    const playerId = route.params?.playerId;
    const playerName = route.params?.playerName;

    if (isMultiplayer) {
      if (isDM && !sessionCode) {
        // This shouldn't happen, but just in case
        alert("Error: Missing session code for DM");
        return;
      }

      // Navigate to multiplayer game session
      navigation.navigate("MultiplayerGameSession", {
        sessionCode,
        dmId,
        dmName,
        playerId,
        playerName,
        character,
        isMultiplayer: true,
        isDM,
        config,
      });
    } else {
      // Navigate to regular game session
      navigation.navigate("GameSession", { config, character });
    }
  };

  return (
    <ScrollView style={[styles.container, gradientStyle]}>
      {backgroundElement}
      <Text style={[styles.title, { color: theme.text }]}>
        {isDM ? "Session Setup" : "Character Creation"}
      </Text>

      {isDM && (
        <View style={styles.dmInfoContainer}>
          <Text style={[styles.dmInfoText, { color: theme.accent }]}>
            Session Code: {route.params?.sessionCode}
          </Text>
          <Text style={[styles.dmInfoSubtext, { color: theme.text }]}>
            Share this code with your players
          </Text>
        </View>
      )}

      <Text style={[styles.label, { color: theme.text }]}>Race:</Text>
      <Picker
        selectedValue={selectedRace}
        onValueChange={(itemValue) => setSelectedRace(itemValue)}
        style={[
          styles.picker,
          {
            color: theme.text,
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
        enabled={characterOptions.races.length > 1}
      >
        {characterOptions.races.map((race) => (
          <Picker.Item key={race} label={race} value={race} />
        ))}
      </Picker>

      <Text style={[styles.label, { color: theme.text }]}>Class:</Text>
      <Picker
        selectedValue={selectedClass}
        onValueChange={(itemValue) => setSelectedClass(itemValue)}
        style={[
          styles.picker,
          {
            color: theme.text,
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        {characterOptions.classes.map((cls) => (
          <Picker.Item key={cls} label={cls} value={cls} />
        ))}
      </Picker>

      <Text style={[styles.label, { color: theme.text }]}>Background:</Text>
      <Picker
        selectedValue={selectedBackground}
        onValueChange={(itemValue) => setSelectedBackground(itemValue)}
        style={[
          styles.picker,
          {
            color: theme.text,
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        {characterOptions.backgrounds.map((bg) => (
          <Picker.Item key={bg} label={bg} value={bg} />
        ))}
      </Picker>

      <Text style={[styles.label, { color: theme.text }]}>Age: {age}</Text>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      >
        <Text style={{ color: theme.text, marginRight: 8 }}>
          {characterOptions.ageRange.min}
        </Text>
        <input
          type="range"
          min={characterOptions.ageRange.min}
          max={characterOptions.ageRange.max}
          value={age}
          onChange={(e) => setAge(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <Text style={{ color: theme.text, marginLeft: 8 }}>
          {characterOptions.ageRange.max}
        </Text>
      </View>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: theme.text, fontSize: 14 }}>
          {traitMods &&
            `Traits: ${traitMods.wisdom !== undefined ? `Wisdom ${traitMods.wisdom >= 0 ? "+" : ""}${traitMods.wisdom}` : ""}
            ${traitMods.strength !== undefined ? `Strength ${traitMods.strength >= 0 ? "+" : ""}${traitMods.strength}` : ""}
            ${traitMods.endurance !== undefined ? `Endurance ${traitMods.endurance >= 0 ? "+" : ""}${traitMods.endurance}` : ""}`}
        </Text>
      </View>

      <Text style={[styles.label, { color: theme.text }]}>Backstory:</Text>
      <TextInput
        style={[
          styles.textInput,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: "#23294699",
          },
        ]}
        multiline
        numberOfLines={4}
        onChangeText={(text) => setBackstory(text)}
        value={backstory}
        placeholder="Enter your character's backstory..."
        placeholderTextColor={theme.text + "99"}
      />

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: theme.button, alignSelf: "center" },
        ]}
        onPress={handleSubmit}
      >
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>
          {route.params?.isDM ? "Start Session" : "Submit Character"}
        </Text>
      </TouchableOpacity>
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
    letterSpacing: 1,
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
    minHeight: 100,
    fontSize: 16,
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
  dmInfoContainer: {
    backgroundColor: "#23294699",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#4C63B6",
  },
  dmInfoText: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 2,
  },
  dmInfoSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});

export default CharacterCreation;
