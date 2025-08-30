import * as SecureStore from "expo-secure-store";
import axios from "axios";

import fiveEData from "../data/5eData.json";

/**
 * Supported AI Providers:
 * - OpenAI (ChatGPT)
 * - Anthropic Claude
 * - Grok (X.ai)
 *
 * Add new providers by extending the queryAI function and updating the Settings UI.
 */

/**
 * Helper function to detect player roll requests and provide proper guidance
 * @param {string} playerAction - The player's input
 * @returns {Object} - {needsRoll: boolean, guidance: string|null}
 */
function analyzeRollRequest(playerAction) {
  const lowerAction = playerAction.toLowerCase();

  // Common roll-related keywords and patterns
  const rollKeywords = [
    "roll",
    "dice",
    "check",
    "saving throw",
    "initiative",
    "attack",
    "cast",
    "spell",
    "concentration",
    "death save",
  ];

  const containsRollKeyword = rollKeywords.some((keyword) =>
    lowerAction.includes(keyword),
  );

  if (!containsRollKeyword) {
    return { needsRoll: false, guidance: null };
  }

  // Detect specific types of rolls
  if (lowerAction.includes("saving throw") || lowerAction.includes("save")) {
    return {
      needsRoll: true,
      guidance:
        "Please make your saving throw. Roll a d20 and add the appropriate ability modifier (e.g., for a Wisdom saving throw, add your Wisdom modifier). Tell me the result and I'll determine the outcome.",
    };
  }

  if (lowerAction.includes("initiative")) {
    return {
      needsRoll: true,
      guidance:
        "Please roll for initiative. Roll a d20 and add your Dexterity modifier. I'll use this to determine turn order in combat.",
    };
  }

  if (lowerAction.includes("attack")) {
    return {
      needsRoll: true,
      guidance:
        "For your attack, roll a d20 and add your attack modifier (Strength or Dexterity + proficiency bonus if applicable). If it's a spell attack, use your spellcasting ability modifier instead.",
    };
  }

  if (lowerAction.includes("spell") || lowerAction.includes("cast")) {
    return {
      needsRoll: true,
      guidance:
        "For spellcasting, I need to know what you're casting. Some spells require attack rolls or saving throws. Please roll your d20 + spellcasting modifier and tell me the result.",
    };
  }

  if (lowerAction.includes("concentration")) {
    return {
      needsRoll: true,
      guidance:
        "For concentration, roll a d20 and add your Constitution modifier. You need a 10 or higher to maintain concentration.",
    };
  }

  if (
    lowerAction.includes("death save") ||
    lowerAction.includes("death saving")
  ) {
    return {
      needsRoll: true,
      guidance:
        "For death saving throws, roll a d20. A result of 10 or higher is a success, 1-9 is a failure, and a 1 is two failures (critical fail).",
    };
  }

  // Generic roll guidance
  return {
    needsRoll: true,
    guidance:
      "I see you want to make a roll! As your DM, I never roll dice for you. Please roll your d20 and add the appropriate modifier from your character sheet, then tell me the result. I'll then describe what happens next.",
  };
}

// Basic stub response function (fallback if no API key or error)
function generateStubResponse(
  playerAction,
  config,
  character = {},
  history = [],
) {
  // Use the helper function to analyze roll requests
  const rollAnalysis = analyzeRollRequest(playerAction);

  if (rollAnalysis.needsRoll) {
    return rollAnalysis.guidance;
  }

  // Ensure character data has default values
  const characterRace = character?.race || "brave adventurer";
  const characterClass = character?.class || "wanderer";

  return `The DM narrates: As a ${characterRace} ${characterClass}, you ${playerAction}. The world responds to your actions. What would you like to do next?`;
}

// Function to retrieve stored AI settings (cross-platform: SecureStore for native, AsyncStorage for web)
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

async function getAISettings() {
  try {
    let provider, apiKey;
    if (Platform.OS === "web") {
      provider = (await AsyncStorage.getItem("aiProvider")) || "OpenAI";
      apiKey = await AsyncStorage.getItem("aiApiKey");
    } else {
      provider = (await SecureStore.getItemAsync("aiProvider")) || "OpenAI";
      apiKey = await SecureStore.getItemAsync("aiApiKey");
    }
    return { provider, apiKey };
  } catch (error) {
    console.error("Error retrieving AI settings:", error);
    return { provider: "OpenAI", apiKey: null };
  }
}

// Function to build a prompt with context
function buildPrompt(
  playerAction,
  config = {},
  character = {},
  history = [],
  maxTokens = 300,
) {
  // Extract relevant 5e data
  const raceInfo = fiveEData.races.find(
    (r) => r.name === (character?.race || "Human"),
  ) || {
    traits: [],
  };
  const classInfo = fiveEData.classes.find(
    (c) => c.name === (character?.class || "Fighter"),
  ) || { features: [] };

  // Simple keyword extraction for skills/spells in action (expand as needed)
  const mentionedSkills = fiveEData.skills.filter((s) =>
    playerAction.toLowerCase().includes(s.name.toLowerCase()),
  );
  const mentionedSpells = fiveEData.spells.filter((s) =>
    playerAction.toLowerCase().includes(s.name.toLowerCase()),
  );

  const raceDetails = raceInfo.traits.join(", ");
  const classDetails = classInfo.features.join(", ");
  const skillDetails = mentionedSkills
    .map((s) => `${s.name} (${s.ability}): ${s.description}`)
    .join("; ");
  const spellDetails = mentionedSpells
    .map((s) => `${s.name} (Level ${s.level}, ${s.school}): ${s.description}`)
    .join("; ");

  // Analyze the player's action for roll requests
  const rollAnalysis = analyzeRollRequest(playerAction);

  const systemMessage = `
You are an AI Dungeon Master for a D&D 5e game. Adhere to 5e rules: character stats (e.g., Strength, Dexterity), classes (${character.class || "Fighter"}), races (${character.race || "Human"}), skills, spells, combat (initiative, attack rolls, saving throws).
Session details: Theme - ${config.theme || "Classic Fantasy"}, Difficulty - ${config.difficulty || "Medium"}, Mode - ${config.campaignMode || "One-shot"}.
Player character: Race - ${character.race || "Human"} (Traits: ${raceDetails}), Class - ${character.class || "Fighter"} (Features: ${classDetails}), Background - ${character.background || "Acolyte"}, Backstory - ${character.backstory || "A wandering hero"}.

SESSION STORAGE: Players can save and export their progress at any time. Remind them of major milestones where saving would be beneficial (after completing major objectives, before difficult encounters, etc.).

Relevant skills: ${skillDetails || "None mentioned"}.
Relevant spells: ${spellDetails || "None mentioned"}.

Conversation history: ${history.map((msg) => `${msg.isDM ? "DM" : "Player"}: ${msg.text}`).join("\n")}.

ALWAYS keep your response concise and ensure it fits within the allowed token limit (${maxTokens}). Summarize or list only the most important details if needed. If the user asks for a list or inventory, only include the most essential items and avoid excessive detail. If you cannot fit everything, say so and offer to continue if needed.

IMPORTANT DM RULE: You NEVER roll dice for the player character. The player ALWAYS rolls their own dice (attack rolls, ability checks, saving throws, initiative, damage, etc.). When a player needs to make a roll, tell them exactly what to roll (e.g., "Make a DC 15 Dexterity saving throw" or "Roll a Perception check") and then describe the narrative outcome based on their roll result.

You may roll dice for NPCs, monsters, and environmental effects only. When describing outcomes, say things like "please roll your d20 + Strength modifier" or "make your initiative check now".

${rollAnalysis.needsRoll ? `ROLL REQUEST DETECTED: ${rollAnalysis.guidance}` : ""}

Respond narratively, guide the player through their rolls, describe outcomes based on their roll results, keep it engaging and true to 5e.
Player's current action: ${playerAction}
`;

  return [
    { role: "system", content: systemMessage },
    { role: "user", content: playerAction },
  ];
}

// Test function to demonstrate DM roll rule behavior
function testDMRollRule() {
  console.log("🧪 Testing DM Roll Rule Implementation");

  // Test cases for roll analysis
  const testCases = [
    "I want to attack the goblin",
    "Let me roll for perception",
    "I cast fireball, roll for attack",
    "Please roll my saving throw",
    "I search for traps",
    "What do I see in the room?",
  ];

  testCases.forEach((action, index) => {
    const analysis = analyzeRollRequest(action);
    console.log(`${index + 1}. "${action}"`);
    console.log(`   Needs Roll: ${analysis.needsRoll}`);
    if (analysis.guidance) {
      console.log(`   Guidance: ${analysis.guidance}`);
    }
    console.log("");
  });

  return "DM roll rule test completed - see console for results";
}

// Documentation for DM roll rule implementation
/**
 * DM Roll Rule Implementation
 *
 * This AI service implements a strict rule that the DM (AI) NEVER rolls dice for player characters.
 * This maintains player agency and follows traditional tabletop RPG best practices.
 *
 * IMPLEMENTATION DETAILS:
 * 1. Roll Request Detection: analyzeRollRequest() identifies when players request rolls
 * 2. AI Prompt Enforcement: System prompt explicitly forbids rolling for players
 * 3. Guidance System: AI provides clear instructions on what players should roll
 * 4. NPC/Monster Rolls: AI can roll for non-player entities when appropriate
 *
 * PLAYER ROLL TYPES HANDLED:
 * - Attack rolls (melee/ranged/spell attacks)
 * - Ability checks (Strength, Dexterity, etc.)
 * - Saving throws (Dexterity saves, etc.)
 * - Initiative rolls
 * - Death saving throws
 * - Skill checks (Perception, Stealth, etc.)
 *
 * USAGE EXAMPLES:
 * ✅ Player says: "I attack the goblin"
 *    DM responds: "Roll a d20 and add your Strength modifier + proficiency bonus"
 *
 * ❌ NEVER: DM rolls for player and says "You rolled 17, hit!"
 *
 * ✅ NPC rolls: DM can say "The goblin attacks you. I rolled 12, miss!"
 */

// Main function to query AI or fallback to stub
async function queryAI(playerAction, config, character, history) {
  const { provider, apiKey } = await getAISettings();

  // Debug: Log provider and API key status (do not log the key itself for security)
  console.log("[AI DEBUG] Provider:", provider);
  console.log("[AI DEBUG] API Key present:", !!apiKey);

  if (!apiKey) {
    console.log("[AI DEBUG] No API key found, using stub response.");
    return generateStubResponse(playerAction, config, character, history);
  }

  try {
    let response;
    if (provider === "OpenAI") {
      console.log("[AI DEBUG] Attempting OpenAI API call...");
      response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: buildPrompt(playerAction, config, character, history),
          max_tokens: 300, // Adjust as needed for cost/response length
          temperature: 0.7, // For creativity
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log("[AI DEBUG] OpenAI API response:", response.data);
      const aiText = response.data.choices[0].message.content.trim();
      console.log("OpenAI API Usage:", response.data.usage);
      return aiText;
    } else if (provider === "Claude") {
      // Anthropic Claude (v1 or v2)
      // Claude expects a different prompt format and endpoint
      // See: https://docs.anthropic.com/claude/reference/complete_post
      const prompt =
        buildPrompt(playerAction, config, character, history)
          .map((msg) =>
            msg.role === "system" ? msg.content : `Human: ${msg.content}`,
          )
          .join("\n") + "\nAssistant:";
      console.log("[AI DEBUG] Attempting Claude API call...");
      response = await axios.post(
        "https://api.anthropic.com/v1/complete",
        {
          prompt,
          model: "claude-2", // or "claude-instant-1"
          max_tokens_to_sample: 300,
          temperature: 0.7,
          stop_sequences: ["\nHuman:"],
        },
        {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
        },
      );
      console.log("[AI DEBUG] Claude API response:", response.data);
      const aiText = response.data.completion.trim();
      console.log("Claude API Usage:", response.data.usage || "n/a");
      return aiText;
    } else if (provider === "Grok") {
      // Grok (X.ai) - Example endpoint and format, may need adjustment per actual docs
      // See: https://docs.x.ai/reference
      console.log("[AI DEBUG] Attempting Grok API call...");

      // Validate inputs before making API call
      if (!playerAction) {
        console.warn("[AI DEBUG] No player action provided");
        return "The DM waits for your action. What would you like to do?";
      }
      // Try grok-3 first, fallback to grok-3-mini if needed
      let grokModels = ["grok-3", "grok-3-mini"];
      let grokError = null;
      for (let model of grokModels) {
        try {
          response = await axios.post(
            "https://api.x.ai/v1/chat/completions",
            {
              model: model,
              messages: buildPrompt(playerAction, config, character, history),
              max_tokens: 300,
              temperature: 0.7,
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
            },
          );
          console.log(
            `[AI DEBUG] Grok API response for model ${model}:`,
            response.data,
          );
          const aiText = response.data.choices[0].message.content.trim();
          console.log("Grok API Usage:", response.data.usage || "n/a");
          return aiText;
        } catch (err) {
          grokError = err;
          if (
            err.response &&
            err.response.data &&
            err.response.data.error &&
            err.response.data.error.includes("does not exist")
          ) {
            console.warn(
              `[AI DEBUG] Grok model ${model} not available, trying next model...`,
            );
            continue;
          } else {
            throw err;
          }
        }
      }
      // If all models fail, throw the last error
      throw grokError;
    } else {
      console.error("[AI DEBUG] Unsupported provider:", provider);
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.error("[AI DEBUG] AI API Error:", error);
    if (error.response) {
      console.error("[AI DEBUG] Error response data:", error.response.data);
    }
    return generateStubResponse(playerAction, config, character, history); // Fallback
  }
}

// Removed pacing guidance function as it's no longer needed

export { queryAI, testDMRollRule, analyzeRollRequest };

// To add more providers, extend the queryAI function and update the Settings UI accordingly.
// Use testDMRollRule() in development to verify DM roll rule implementation.
