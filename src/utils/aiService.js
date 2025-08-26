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

// Basic stub response function (fallback if no API key or error)
function generateStubResponse(playerAction, config, character, history) {
  // Simple logic similar to previous stub
  if (
    playerAction.toLowerCase().includes("roll") ||
    playerAction.toLowerCase().includes("check")
  ) {
    const roll = Math.floor(Math.random() * 20) + 1; // Simplified d20 roll
    return `You attempt the action in the ${config.theme || "fantasy"} world... Roll result: ${roll}. ${roll >= 10 ? "Success!" : "Failure!"}`;
  }
  return `The DM narrates: As a ${character.race || "brave"} ${character.class || "adventurer"}, you ${playerAction}. Suddenly, a shadowy figure appears! What next?`;
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
  config,
  character,
  history,
  maxTokens = 300,
) {
  // Extract relevant 5e data
  const raceInfo = fiveEData.races.find((r) => r.name === character.race) || {
    traits: [],
  };
  const classInfo = fiveEData.classes.find(
    (c) => c.name === character.class,
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

  const systemMessage = `
You are an AI Dungeon Master for a D&D 5e game. Adhere to 5e rules: character stats (e.g., Strength, Dexterity), classes (${character.class || "Fighter"}), races (${character.race || "Human"}), skills, spells, combat (initiative, attack rolls, saving throws).
Session details: Theme - ${config.theme || "Classic Fantasy"}, Difficulty - ${config.difficulty || "Medium"}, Time - ${config.sessionTime || "1 hour"}, Mode - ${config.campaignMode || "One-shot"}.
Player character: Race - ${character.race || "Human"} (Traits: ${raceDetails}), Class - ${character.class || "Fighter"} (Features: ${classDetails}), Background - ${character.background || "Acolyte"}, Backstory - ${character.backstory || "A wandering hero"}.

Relevant skills: ${skillDetails || "None mentioned"}.
Relevant spells: ${spellDetails || "None mentioned"}.

Conversation history: ${history.map((msg) => `${msg.isDM ? "DM" : "Player"}: ${msg.text}`).join("\n")}.

ALWAYS keep your response concise and ensure it fits within the allowed token limit (${maxTokens}). Summarize or list only the most important details if needed. If the user asks for a list or inventory, only include the most essential items and avoid excessive detail. If you cannot fit everything, say so and offer to continue if needed.

Respond narratively, resolve actions (e.g., roll virtual dice if needed, describe outcomes based on 5e rules), keep it engaging and true to 5e.
Player's current action: ${playerAction}
`;

  return [
    { role: "system", content: systemMessage },
    { role: "user", content: playerAction },
  ];
}

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

export { queryAI };

// To add more providers, extend the queryAI function and update the Settings UI accordingly.
