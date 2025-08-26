// Pastel dark mode theme definitions for The Construct

const themes = {
  "Classic D&D": {
    key: "Classic D&D",
    background: {
      type: "image",
      image: require("../../assets/DnDTheme.jpg"),
      fallback: "#232946", // Deep navy as fallback
    },
    accent: "#7f9cf5", // Pastel blue
    button: "#7f9cf5",
    buttonText: "#eaeaea",
    text: "#eaeaea",
    card: "#2a2d3e",
    border: "#7f9cf5",
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
      fallback: "#2d3a2e", // Muted green-gray if image fails
    },
    accent: "#7ed6a7", // Pastel green
    button: "#7ed6a7",
    buttonText: "#232926",
    text: "#eaeaea",
    card: "#26332a",
    border: "#7ed6a7",
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
      colors: ["#23232e", "#4e3a5a"], // Soft black to pastel purple
    },
    accent: "#b39ddb", // Pastel purple
    button: "#b39ddb",
    buttonText: "#23232e",
    text: "#eaeaea",
    card: "#2d263a",
    border: "#b39ddb",
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
      colors: ["#3a2d26", "#6e5e4e"], // Muted brown to gray
    },
    accent: "#f7c59f", // Pastel orange
    button: "#f7c59f",
    buttonText: "#3a2d26",
    text: "#eaeaea",
    card: "#3a2d26",
    border: "#f7c59f",
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
      colors: ["#233e3e", "#5ecfcf"], // Pastel teal gradient
    },
    accent: "#5ecfcf", // Pastel teal
    button: "#5ecfcf",
    buttonText: "#233e3e",
    text: "#eaeaea",
    card: "#233e3e",
    border: "#5ecfcf",
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
