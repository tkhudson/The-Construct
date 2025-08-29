TheConstruct/src/utils/questSystem.js
// Quest System - Manages structured objectives, rewards, and storyline progression
// Integrates with the AI DM to provide coherent quest experiences

import enhancedGameData from '../data/enhancedGameData.json';

class QuestSystem {
  constructor(aiService, characterProgression) {
    this.aiService = aiService;
    this.characterProgression = characterProgression;
    this.activeQuests = [];
    this.completedQuests = [];
    this.questHistory = [];
  }

  /**
   * Initialize quest system for a new session
   * @param {Object} character - Player character
   * @param {Object} config - Session configuration
   * @returns {Object} Initial quest state
   */
  async initializeSession(character, config) {
    try {
      // Generate initial quest based on character and theme
      const initialQuest = await this.generateQuest(character, config);

      this.activeQuests = [initialQuest];

      return {
        success: true,
        message: "Quest system initialized!",
        activeQuests: this.activeQuests,
        nextQuest: initialQuest
      };
    } catch (error) {
      console.error('Quest system initialization error:', error);
      return {
        success: false,
        error: 'Failed to initialize quest system'
      };
    }
  }

  /**
   * Generate a quest appropriate for character and theme
   * @param {Object} character - Player character
   * @param {Object} config - Session configuration
   * @returns {Object} Generated quest
   */
  async generateQuest(character, config) {
    const questTemplates = enhancedGameData.quests;
    const theme = config.theme || 'Classic D&D';

    // Filter quests by character level and theme appropriateness
    let suitableQuests = questTemplates.filter(quest => {
      return this.isQuestSuitable(character, quest, theme);
    });

    // If no suitable quests, create a custom one
    if (suitableQuests.length === 0) {
      return this.createCustomQuest(character, config);
    }

    // Select random quest from suitable options
    const selectedQuest = suitableQuests[Math.floor(Math.random() * suitableQuests.length)];

    // Enhance quest with character-specific details
    const enhancedQuest = await this.enhanceQuest(selectedQuest, character, config);

    return {
      id: Date.now().toString(),
      ...enhancedQuest,
      status: 'active',
      progress: [],
      startTime: Date.now(),
      npcContacts: this.generateQuestNPCs(selectedQuest),
      locations: this.generateQuestLocations(selectedQuest, theme)
    };
  }

  /**
   * Check if quest is suitable for character
   * @param {Object} character - Player character
   * @param {Object} quest - Quest template
   * @param {string} theme - Game theme
   * @returns {boolean} Whether quest is suitable
   */
  isQuestSuitable(character, quest, theme) {
    const level = character.level || 1;

    // Check difficulty level
    const questDifficulty = quest.difficulty;
    if (questDifficulty === 'Easy' && level > 5) return false;
    if (questDifficulty === 'Medium' && (level < 3 || level > 10)) return false;
    if (questDifficulty === 'Hard' && level < 7) return false;

    // Check theme compatibility
    const questType = quest.type;
    const suitableThemes = {
      'side quest': ['Classic D&D', 'Star Wars', 'Post-Apocalyptic Wasteland'],
      'main quest': ['Classic D&D', 'Modern Zombies', 'Star Wars'],
      'random': ['Classic D&D', 'Modern Zombies', 'Star Wars', 'Post-Apocalyptic Wasteland', 'Custom']
    };

    return suitableThemes[questType]?.includes(theme) || false;
  }

  /**
   * Enhance quest with character-specific details
   * @param {Object} quest - Base quest
   * @param {Object} character - Player character
   * @param {Object} config - Session config
   * @returns {Object} Enhanced quest
   */
  async enhanceQuest(quest, character, config) {
    // Use AI to generate personalized quest details
    const enhancementPrompt = `
      Enhance this quest for a ${character.level} level ${character.race} ${character.class}:

      Quest: ${quest.title}
      Description: ${quest.description}
      Objectives: ${quest.objectives.join(', ')}

      Make it more personal and engaging based on their background and class.
    `;

    try {
      const aiEnhancement = await this.aiService.queryAI(
        enhancementPrompt,
        config,
        character,
        []
      );

      return {
        ...quest,
        enhancedDescription: aiEnhancement,
        personalElements: this.addPersonalElements(quest, character)
      };
    } catch (error) {
      // Fallback to basic enhancement
      return {
        ...quest,
        enhancedDescription: quest.description,
        personalElements: []
      };
    }
  }

  /**
   * Create a custom quest when no suitable templates exist
   * @param {Object} character - Player character
   * @param {Object} config - Session config
   * @returns {Object} Custom quest
   */
  async createCustomQuest(character, config) {
    const customQuestPrompt = `
      Create a unique quest for a level ${character.level} ${character.race} ${character.class}.
      Theme: ${config.theme}
      Session time: ${config.sessionTime} minutes
      Difficulty: ${config.difficulty}

      Include:
      - Interesting objective
      - Fitting rewards for level
      - Engaging narrative hook
      - Appropriate encounters
    `;

    const aiResponse = await this.aiService.queryAI(
      customQuestPrompt,
      config,
      character,
      []
    );

    return {
      title: "Custom Adventure",
      description: aiResponse,
      type: "custom",
      difficulty: config.difficulty,
      objectives: ["Complete the unique adventure"],
      rewards: ["Experience points", "Treasure", "Story progression"]
    };
  }

  /**
   * Generate NPCs associated with quest
   * @param {Object} quest - Quest object
   * @returns {Array} Array of NPCs
   */
  generateQuestNPCs(quest) {
    const npcTypes = {
      'side quest': ['quest giver', 'contact', 'informant'],
      'main quest': ['patron', 'mentor', 'ally', 'antagonist'],
      'random': ['merchant', 'guard', 'villager', 'adventurer']
    };

    const selectedTypes = npcTypes[quest.type] || npcTypes.random;

    return selectedTypes.map((type, index) => ({
      id: `npc_${Date.now()}_${index}`,
      type: type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${['the Brave', 'the Wise', 'the Mysterious', 'the Helpful'][index % 4]}`,
      questRole: this.getNPCRole(type),
      disposition: 'neutral',
      lastInteraction: null
    }));
  }

  /**
   * Get NPC role description
   * @param {string} type - NPC type
   * @returns {string} Role description
   */
  getNPCRole(type) {
    const roles = {
      'quest giver': 'Provides quests and information',
      'contact': 'Has useful information about objectives',
      'informant': 'Can provide rumors and clues',
      'patron': 'Provides resources and support',
      'mentor': 'Offers advice and training',
      'ally': 'Helps in combat and exploration',
      'antagonist': 'Opposes the player\'s goals',
      'merchant': 'Buys and sells equipment',
      'guard': 'Provides protection and information',
      'villager': 'Source of rumors and local knowledge',
      'adventurer': 'Possible ally or competitor'
    };

    return roles[type] || 'General NPC';
  }

  /**
   * Generate quest locations
   * @param {Object} quest - Quest object
   * @param {string} theme - Game theme
   * @returns {Array} Array of locations
   */
  generateQuestLocations(quest, theme) {
    const themeLocations = {
      'Classic D&D': ['Ancient Temple', 'Dark Forest', 'Mountain Cave', 'Abandoned Tower', 'Hidden Valley'],
      'Modern Zombies': ['Abandoned Warehouse', 'Underground Bunker', 'City Ruins', 'Military Base', 'Subway System'],
      'Star Wars': ['Space Station', 'Desert Planet', 'Imperial Base', 'Smugglers Den', 'Ancient Ruins'],
      'Post-Apocalyptic Wasteland': ['Derelict Settlement', 'Radiation Zone', 'Military Bunker', 'Trade Outpost', 'Mutant Territory']
    };

    const locations = themeLocations[theme] || themeLocations['Classic D&D'];
    const selectedLocations = locations.slice(0, 3); // Pick 3 locations

    return selectedLocations.map((name, index) => ({
      id: `loc_${Date.now()}_${index}`,
      name: name,
      type: this.getLocationType(name),
      description: this.getLocationDescription(name, theme),
      explored: false,
      discoveries: [],
      connectedLocations: selectedLocations.filter((_, i) => i !== index).slice(0, 2)
    }));
  }

  /**
   * Get location type
   * @param {string} name - Location name
   * @returns {string} Location type
   */
  getLocationType(name) {
    const typeMap = {
      'Temple': 'religious',
      'Cave': 'natural',
      'Tower': 'military',
      'Forest': 'natural',
      'Warehouse': 'industrial',
      'Bunker': 'military',
      'Base': 'military',
      'Den': 'criminal',
      'Station': 'industrial'
    };

    return Object.entries(typeMap).find(([key]) => name.includes(key))?.[1] || 'unknown';
  }

  /**
   * Get location description
   * @param {string} name - Location name
   * @param {string} theme - Game theme
   * @returns {string} Location description
   */
  getLocationDescription(name, theme) {
    const descriptions = {
      'Ancient Temple': 'An old religious site with mysterious carvings and forgotten rituals.',
      'Dark Forest': 'A dense woodland with twisted trees and hidden dangers.',
      'Mountain Cave': 'A natural cavern system in the rugged mountains.',
      'Abandoned Tower': 'A crumbling watchtower overlooking the surrounding landscape.',
      'Hidden Valley': 'A secluded valley untouched by outside influences.',
      'Abandoned Warehouse': 'Empty industrial building with remnants of its former purpose.',
      'Underground Bunker': 'Subterranean shelter with military equipment and supplies.',
      'City Ruins': 'Collapsed urban structures overgrown with vegetation.',
      'Military Base': 'Fortified installation with security systems and vehicles.',
      'Subway System': 'Underground transit network now home to various inhabitants.'
    };

    return descriptions[name] || 'An interesting location with potential for adventure.';
  }

  /**
   * Update quest progress
   * @param {string} questId - Quest ID
   * @param {string} objectiveIndex - Objective that was completed
   * @param {Object} progress - Progress details
   * @returns {Object} Updated quest status
   */
  async updateQuestProgress(questId, objectiveIndex, progress) {
    const quest = this.activeQuests.find(q => q.id === questId);

    if (!quest) {
      return { success: false, error: 'Quest not found' };
    }

    // Record progress
    quest.progress.push({
      objectiveIndex,
      description: progress.description,
      timestamp: Date.now(),
      xpGained: progress.xpGained || 0
    });

    // Check if quest is complete
    const completedObjectives = quest.progress.map(p => p.objectiveIndex);
    const isComplete = quest.objectives.every((_, index) => completedObjectives.includes(index));

    if (isComplete) {
      return await this.completeQuest(questId);
    }

    return {
      success: true,
      message: `Progress updated: ${progress.description}`,
      quest: quest,
      completed: false
    };
  }

  /**
   * Complete a quest and provide rewards
   * @param {string} questId - Quest ID to complete
   * @returns {Object} Completion results
   */
  async completeQuest(questId) {
    const quest = this.activeQuests.find(q => q.id === questId);

    if (!quest) {
      return { success: false, error: 'Quest not found' };
    }

    // Move quest to completed
    quest.status = 'completed';
    quest.completedAt = Date.now();

    this.activeQuests = this.activeQuests.filter(q => q.id !== questId);
    this.completedQuests.push(quest);
    this.questHistory.push({
      questId,
      type: quest.type,
      difficulty: quest.difficulty,
      completedAt: quest.completedAt,
      xpGained: this.calculateQuestXP(quest)
    });

    // Generate next quest
    const nextQuest = await this.generateNextQuest(quest);

    return {
      success: true,
      message: `Quest completed: ${quest.title}!`,
      rewards: quest.rewards,
      xpGained: this.calculateQuestXP(quest),
      nextQuest: nextQuest ? { ...nextQuest, status: 'available' } : null,
      quest: quest
    };
  }

  /**
   * Calculate XP reward for completed quest
   * @param {Object} quest - Completed quest
   * @returns {number} XP amount
   */
  calculateQuestXP(quest) {
    const baseXP = {
      'Easy': 300,
      'Medium': 750,
      'Hard': 1500
    };

    const xpBonus = quest.progress.length * 50; // Bonus for thorough completion
    return (baseXP[quest.difficulty] || 500) + xpBonus;
  }

  /**
   * Generate next quest in sequence
   * @param {Object} previousQuest - Previously completed quest
   * @returns {Object} Next quest or null
   */
  async generateNextQuest(previousQuest) {
    // Generate a quest that's more challenging than the previous one
    const difficultyProgression = {
      'Easy': 'Medium',
      'Medium': 'Hard',
      'Hard': 'Hard' // Stay at hard level
    };

    const nextDifficulty = difficultyProgression[previousQuest.difficulty];

    // Select next quest type
    const nextQuestType = this.getNextQuestType(previousQuest.type);

    return await this.generateQuest({}, { theme: previousQuest.theme, difficulty: nextDifficulty });
  }

  /**
   * Determine next quest type
   * @param {string} previousType - Previous quest type
   * @returns {string} Next quest type
   */
  getNextQuestType(previousType) {
    const progression = {
      'side quest': 'main quest',
      'main quest': 'side quest',
      'random': 'side quest',
      'custom': 'random'
    };

    return progression[previousType] || 'random';
  }

  /**
   * Get quest recommendations based on character
   * @param {Object} character - Player character
   * @returns {Array} Recommended quests
   */
  getQuestRecommendations(character) {
    const questTemplates = enhancedGameData.quests;

    return questTemplates
      .filter(quest => this.isQuestSuitable(character, quest, 'Classic D&D'))
      .sort((a, b) => {
        // Sort by suitability score
        return this.calculateQuestScore(character, b) - this.calculateQuestScore(character, a);
      })
      .slice(0, 3);
  }

  /**
   * Calculate quest suitability score for character
   * @param {Object} character - Player character
   * @param {Object} quest - Quest template
   * @returns {number} Suitability score
   */
  calculateQuestScore(character, quest) {
    let score = 0;

    // Level appropriateness
    const levelDiff = Math.abs(character.level - (quest.recommendedLevel || 1));
    score += Math.max(0, 10 - levelDiff);

    // Class suitability
    const suitableClasses = quest.suitableClasses || [];
    if (suitableClasses.includes(character.class)) {
      score += 5;
    }

    // Background relevance
    if (quest.theme?.includes(character.background)) {
      score += 3;
    }

    return score;
  }

  /**
   * Add personal elements to quest
   * @param {Object} quest - Quest template
   * @param {Object} character - Player character
   * @returns {Array} Personal elements
   */
  addPersonalElements(quest, character) {
    const elements = [];

    // Add character-specific hooks
    if (character.background) {
      elements.push(`Your ${character.background} background suggests you might have connections here.`);
    }

    if (character.class === 'Cleric' && quest.objectives.some(obj => obj.includes('temple'))) {
      elements.push('As a cleric, you feel a divine connection to this sacred place.');
    }

    if (character.class === 'Rogue' && quest.objectives.some(obj => obj.includes('stealth'))) {
      elements.push('Your rogue training prepares you perfectly for this mission.');
    }

    return elements;
  }

  /**
   * Get quest statistics
   * @returns {Object} Quest system statistics
   */
  getQuestStatistics() {
    const completedByType = {};
    const completedByDifficulty = {};

    this.completedQuests.forEach(quest => {
      completedByType[quest.type] = (completedByType[quest.type] || 0) + 1;
      completedByDifficulty[quest.difficulty] = (completedByDifficulty[quest.difficulty] || 0) + 1;
    });

    return {
      totalQuests: this.activeQuests.length + this.completedQuests.length,
      activeQuests: this.activeQuests.length,
      completedQuests: this.completedQuests.length,
      averageCompletionTime: this.calculateAverageCompletionTime(),
      mostCompletedType: Object.entries(completedByType).sort(([,a], [,b]) => b - a)[0]?.[0],
      mostCompletedDifficulty: Object.entries(completedByDifficulty).sort(([,a], [,b]) => b - a)[0]?.[0],
      totalXPFromQuests: this.completedQuests.reduce((total, quest) => total + this.calculateQuestXP(quest), 0)
    };
  }

  /**
   * Calculate average quest completion time
   * @returns {number} Average completion time in minutes
   */
  calculateAverageCompletionTime() {
    if (this.completedQuests.length === 0) return 0;

    const totalTime = this.completedQuests.reduce((total, quest) => {
      if (quest.startTime && quest.completedAt) {
        return total + (quest.completedAt - quest.startTime);
      }
      return total;
    }, 0);

    return Math.round(totalTime / this.completedQuests.length / (1000 * 60)); // Convert to minutes
  }

  /**
   * Get current quest status
   * @returns {Object} Current quest status
   */
  getQuestStatus() {
    return {
      activeQuests: this.activeQuests.map(quest => ({
        id: quest.id,
        title: quest.title,
        progress: quest.progress.length / quest.objectives.length * 100,
        objectives: quest.objectives,
        completedObjectives: quest.progress.map(p => p.objectiveIndex)
      })),
      nextQuestAvailable: this.canGenerateNextQuest(),
      questHistory: this.questHistory,
      statistics: this.getQuestStatistics()
    };
  }

  /**
   * Check if next quest can be generated
   * @returns {boolean} Whether next quest can be generated
   */
  canGenerateNextQuest() {
    // Allow up to 3 active quests
    return this.activeQuests.length < 3;
  }
}

// Singleton instance
const questSystem = new QuestSystem();

export default questSystem;

// Export methods for direct use
export const {
  initializeSession,
  generateQuest,
  updateQuestProgress,
  completeQuest,
  getQuestRecommendations
} = questSystem;
