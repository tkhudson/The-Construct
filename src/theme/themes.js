// Pastel dark mode theme definitions for The Construct

const themes = {
  "Classic D&D": {
    key: "Classic D&D",
    background: {
      type: "image",
      image: require("../../assets/DnDTheme.jpg"),
      fallback: "#131520", // Darker navy as fallback
    },
    accent: "#4a69bd", // Deep sapphire blue
    button: "#4a69bd",
    buttonText: "#ffffff",
    text: "#ffffff",
    card: "#1a1c2a",
    border: "#4a69bd",
    characterOptions: {
      races: ["Human", "Elf", "Dwarf", "Halfling", "Tiefling", "Dragonborn"],
      classes: ["Fighter", "Wizard", "Rogue", "Cleric", "Paladin", "Warlock"],
      backgrounds: [
        "Acolyte",
        "Criminal",
        "Folk Hero",
        "Noble",
        "Sage",
        "Soldier",
      ],
      ageRange: { min: 16, max: 80 },
      traitModifiers: (age) => {
        if (age < 20) return { wisdom: -1, strength: 0, endurance: 1 };
        if (age < 40) return { wisdom: 0, strength: 0, endurance: 0 };
        if (age < 60) return { wisdom: 1, strength: -1, endurance: -1 };
        return { wisdom: 2, strength: -2, endurance: -2 };
      },
    },
  },
  "Modern Zombies": {
    key: "Modern Zombies",
    background: {
      type: "image",
      image: require("../../assets/ModernApocalypse.jpg"),
      fallback: "#1a2111", // Dark military green if image fails
    },
    accent: "#5c8d76", // Deep forest green
    button: "#5c8d76",
    buttonText: "#ffffff",
    text: "#ffffff",
    card: "#1c2419",
    border: "#5c8d76",
    characterOptions: {
      races: ["Human"],
      classes: [
        "Mechanic",
        "Farmer",
        "Cop",
        "Doctor",
        "Student",
        "Veteran",
        "Engineer",
        "Nurse",
        "Firefighter",
        "Hunter",
        "Teacher",
      ],
      backgrounds: [
        "Survivor",
        "Prepper",
        "First Responder",
        "Civilian",
        "Ex-Military",
        "Urban Explorer",
      ],
      ageRange: { min: 12, max: 80 },
      traitModifiers: (age) => {
        if (age < 20) return { wisdom: -1, strength: 0, endurance: 1 };
        if (age < 40) return { wisdom: 0, strength: 0, endurance: 0 };
        if (age < 60) return { wisdom: 1, strength: -1, endurance: -1 };
        return { wisdom: 2, strength: -2, endurance: -2 };
      },
    },
  },
  "Star Wars": {
    key: "Star Wars",
    background: {
      type: "gradient",
      colors: ["#0f0f1a", "#2a1f36"], // Deep space black to dark purple
    },
    accent: "#6c5ce7", // Electric purple
    button: "#6c5ce7",
    buttonText: "#ffffff",
    text: "#ffffff",
    card: "#191621",
    border: "#6c5ce7",
    characterOptions: {
      races: ["Human", "Twi'lek", "Zabrak", "Droid", "Wookiee", "Rodian"],
      classes: [
        "Jedi",
        "Smuggler",
        "Bounty Hunter",
        "Soldier",
        "Engineer",
        "Medic",
      ],
      backgrounds: [
        "Outer Rim Colonist",
        "Imperial Defector",
        "Rebel",
        "Spacer",
        "Merchant",
        "Force Adept",
      ],
      ageRange: { min: 16, max: 90 },
      traitModifiers: (age) => {
        if (age < 20) return { wisdom: -1, strength: 0, endurance: 1 };
        if (age < 40) return { wisdom: 0, strength: 0, endurance: 0 };
        if (age < 60) return { wisdom: 1, strength: -1, endurance: -1 };
        return { wisdom: 2, strength: -2, endurance: -2 };
      },
    },
  },
  "Post-Apocalyptic Wasteland": {
    key: "Post-Apocalyptic Wasteland",
    background: {
      type: "gradient",
      colors: ["#1a1412", "#382f28"], // Dark wasteland colors
    },
    accent: "#c0392b", // Deep rust red
    button: "#c0392b",
    buttonText: "#ffffff",
    text: "#ffffff",
    card: "#201b15",
    border: "#c0392b",
    characterOptions: {
      races: ["Human", "Mutant", "Android"],
      classes: ["Scavenger", "Raider", "Medic", "Tinker", "Hunter", "Wanderer"],
      backgrounds: [
        "Vault Dweller",
        "Wastelander",
        "Ex-Scientist",
        "Nomad",
        "Trader",
        "Mercenary",
      ],
      ageRange: { min: 14, max: 80 },
      traitModifiers: (age) => {
        if (age < 20) return { wisdom: -1, strength: 0, endurance: 1 };
        if (age < 40) return { wisdom: 0, strength: 0, endurance: 0 };
        if (age < 60) return { wisdom: 1, strength: -1, endurance: -1 };
        return { wisdom: 2, strength: -2, endurance: -2 };
      },
    },
  },
  Custom: {
    key: "Custom",
    background: {
      type: "gradient",
      colors: ["#141e1e", "#1e3131"], // Dark teal gradient
    },
    accent: "#2d98da", // Deep ocean blue
    button: "#2d98da",
    buttonText: "#ffffff",
    text: "#ffffff",
    card: "#162121",
    border: "#2d98da",
    characterOptions: {
      races: ["Human", "Elf", "Dwarf", "Custom Race"],
      classes: ["Adventurer", "Mystic", "Inventor", "Custom Class"],
      backgrounds: ["Wanderer", "Scholar", "Outcast", "Custom Background"],
      ageRange: { min: 10, max: 100 },
      traitModifiers: (age) => {
        if (age < 20) return { wisdom: -1, strength: 0, endurance: 1 };
        if (age < 40) return { wisdom: 0, strength: 0, endurance: 0 };
        if (age < 60) return { wisdom: 1, strength: -1, endurance: -1 };
        return { wisdom: 2, strength: -2, endurance: -2 };
      },
    },
  },
};

export default themes;
