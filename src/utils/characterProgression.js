TheConstruct/src/utils/characterProgression.js
// Character Progression System - Handles leveling, experience, and character development
// Integrates with the enhanced game data for structured progression

import enhancedGameData from '../data/enhancedGameData.json';

class CharacterProgression {
  constructor() {
    this.xpTable = enhancedGameData.progression.experience;
    this.featChoices = enhancedGameData.progression.featChoices;
  }

  /**
   * Calculate current level based on experience points
   * @param {number} xp - Current experience points
   * @returns {number} Character level (1-20)
   */
  calculateLevel(xp) {
    for (let level = 20; level >= 1; level--) {
      if (xp >= this.xpTable[level]) {
        return level;
      }
    }
    return 1;
  }

  /**
   * Calculate experience needed for next level
   * @param {number} currentXp - Current experience points
   * @returns {Object} Next level info and XP needed
   */
  getNextLevelInfo(currentXp) {
    const currentLevel = this.calculateLevel(currentXp);

    if (currentLevel >= 20) {
      return {
        nextLevel: 20,
        xpNeeded: 0,
        xpToNext: 0,
        message: "Maximum level reached!"
      };
    }

    const nextLevel = currentLevel + 1;
    const xpForNextLevel = this.xpTable[nextLevel];
    const xpNeeded = xpForNextLevel - currentXp;

    return {
      currentLevel,
      nextLevel,
      xpNeeded,
      xpToNext: xpNeeded,
      xpForNextLevel,
      progress: ((currentXp - this.xpTable[currentLevel]) / (xpForNextLevel - this.xpTable[currentLevel])) * 100
    };
  }

  /**
   * Process a level up for the character
   * @param {Object} character - Current character object
   * @param {number} newXp - New experience points
   * @returns {Object} Updated character with level-up changes
   */
  async levelUp(character, newXp) {
    const oldLevel = this.calculateLevel(character.xp || 0);
    const newLevel = this.calculateLevel(newXp);

    if (newLevel <= oldLevel) {
      return {
        character: { ...character, xp: newXp },
        leveledUp: false,
        message: "No level up"
      };
    }

    // Apply multiple level-ups if needed
    let updatedCharacter = { ...character, xp: newXp };

    for (let level = oldLevel + 1; level <= newLevel; level++) {
      updatedCharacter = await this.applyLevelUp(updatedCharacter, level);
    }

    return {
      character: updatedCharacter,
      leveledUp: true,
      oldLevel,
      newLevel,
      levelsGained: newLevel - oldLevel,
      message: `Leveled up from ${oldLevel} to ${newLevel}!`
    };
  }

  /**
   * Apply level-up benefits for a specific level
   * @param {Object} character - Character object
   * @param {number} newLevel - New level being reached
   * @returns {Object} Updated character
   */
  async applyLevelUp(character, newLevel) {
    const updatedCharacter = { ...character };

    // Update basic level info
    updatedCharacter.level = newLevel;

    // Hit point increase
    const hitDie = this.getClassHitDie(character.class);
    const averageHp = Math.floor(hitDie / 2) + 1;
    const constitutionMod = Math.floor((character.abilityScores?.constitution - 10) / 2);

    if (newLevel === 1) {
      // First level gets maximum hit points
      updatedCharacter.maxHp = hitDie + constitutionMod;
      updatedCharacter.currentHp = updatedCharacter.maxHp;
    } else {
      // Subsequent levels get average + con modifier
      const hpIncrease = averageHp + constitutionMod;
      updatedCharacter.maxHp += Math.max(1, hpIncrease);
      updatedCharacter.currentHp = Math.min(updatedCharacter.currentHp + hpIncrease, updatedCharacter.maxHp);
    }

    // Class-specific features
    const classFeatures = this.getClassFeatures(character.class, newLevel);
    updatedCharacter.features = updatedCharacter.features || [];
    updatedCharacter.features.push(...classFeatures.new);

    // Spell progression for spellcasters
    if (this.isSpellcaster(character.class)) {
      updatedCharacter.spellSlots = this.calculateSpellSlots(character.class, newLevel);
    }

    // Ability Score Improvement every 4 levels
    if (newLevel % 4 === 0) {
      await this.handleAbilityScoreImprovement(updatedCharacter);
    }

    // Proficiency bonus update
    updatedCharacter.proficiencyBonus = Math.floor((newLevel - 1) / 4) + 2;

    return updatedCharacter;
  }

  /**
   * Handle Ability Score Improvement (ASI) or feat selection
   * @param {Object} character - Character object
   * @returns {Object} Updated character with ASI/feat
   */
  async handleAbilityScoreImprovement(character) {
    // For now, we'll automatically assign +2 to the lowest ability score
    // In a real implementation, this would prompt the user for choice
    const scores = character.abilityScores || {
      strength: 10, dexterity: 10, constitution: 10,
      intelligence: 10, wisdom: 10, charisma: 10
    };

    const lowestScore = Object.entries(scores).reduce((lowest, [ability, score]) =>
      score < lowest.score ? { ability, score } : lowest
    , { ability: 'strength', score: 99 });

    scores[lowestScore.ability] += 2;
    character.abilityScores = scores;

    return character;
  }

  /**
   * Get hit die for a character class
   * @param {string} characterClass - Character's class
   * @returns {number} Hit die value
   */
  getClassHitDie(characterClass) {
    const classData = enhancedGameData.character.classes.find(c => c.name === characterClass);
    return classData?.hitDie || 8; // Default to d8 if not found
  }

  /**
   * Check if a class is a spellcaster
   * @param {string} characterClass - Character's class
   * @returns {boolean} True if spellcaster
   */
  isSpellcaster(characterClass) {
    const spellcasters = ['Wizard', 'Cleric', 'Druid', 'Bard', 'Sorcerer', 'Warlock', 'Paladin', 'Ranger'];
    return spellcasters.includes(characterClass);
  }

  /**
   * Calculate spell slots for spellcasters
   * @param {string} characterClass - Character's class
   * @param {number} level - Character level
   * @returns {Object} Spell slots by level
   */
  calculateSpellSlots(characterClass, level) {
    // Simplified spell slot calculation
    const spellProgression = {
      'Wizard': {
        1: { 1: 2 }, 2: { 1: 3 }, 3: { 1: 4, 2: 2 }, 4: { 1: 4, 2: 3 },
        5: { 1: 4, 2: 3, 3: 2 }, 6: { 1: 4, 2: 3, 3: 3 }, 7: { 1: 4, 2: 3, 3: 3, 4: 1 },
        // ... continues for higher levels
      },
      'Cleric': {
        1: { 1: 2 }, 2: { 1: 3 }, 3: { 1: 4, 2: 2 }, 4: { 1: 4, 2: 3 },
        // Similar progression
      }
      // Add other spellcasters as needed
    };

    return spellProgression[characterClass]?.[level] || {};
  }

  /**
   * Get new class features for a level
   * @param {string} characterClass - Character's class
   * @param {number} level - Level being reached
   * @returns {Object} New features for this level
   */
  getClassFeatures(characterClass, level) {
    const classData = enhancedGameData.character.classes.find(c => c.name === characterClass);

    if (!classData?.features) {
      return { new: [], existing: [] };
    }

    // This is a simplified version - in reality, you'd track which features
    // the character already has and only return new ones
    const newFeatures = [];

    // Add class-specific features based on level
    if (level === 1) {
      // All level 1 features
      Object.keys(classData.features).forEach(feature => {
        newFeatures.push(feature);
      });
    } else if (level === 2) {
      // Action Surge for Fighter
      if (characterClass === 'Fighter') {
        newFeatures.push('Action Surge');
      }
    }
    // Add more level-specific features as needed

    return {
      new: newFeatures,
      existing: Object.keys(classData.features)
    };
  }

  /**
   * Calculate proficiency bonus
   * @param {number} level - Character level
   * @returns {number} Proficiency bonus
   */
  getProficiencyBonus(level) {
    return Math.floor((level - 1) / 4) + 2;
  }

  /**
   * Calculate saving throw modifier
   * @param {number} abilityScore - Ability score value
   * @param {boolean} proficient - Whether proficient in this save
   * @param {number} level - Character level
   * @returns {number} Saving throw modifier
   */
  getSavingThrowModifier(abilityScore, proficient, level) {
    const abilityMod = Math.floor((abilityScore - 10) / 2);
    const proficiencyBonus = proficient ? this.getProficiencyBonus(level) : 0;
    return abilityMod + proficiencyBonus;
  }

  /**
   * Calculate skill modifier
   * @param {number} abilityScore - Ability score value
   * @param {boolean} proficient - Whether proficient in this skill
   * @param {number} level - Character level
   * @param {boolean} expertise - Whether character has expertise in this skill
   * @returns {number} Skill modifier
   */
  getSkillModifier(abilityScore, proficient, level, expertise = false) {
    const abilityMod = Math.floor((abilityScore - 10) / 2);
    let proficiencyBonus = 0;

    if (proficient) {
      proficiencyBonus = this.getProficiencyBonus(level);
      if (expertise) {
        proficiencyBonus *= 2; // Expertise doubles proficiency bonus
      }
    }

    return abilityMod + proficiencyBonus;
  }

  /**
   * Check if character meets requirements for a feat
   * @param {Object} character - Character object
   * @param {string} featName - Name of the feat
   * @returns {boolean} Whether requirements are met
   */
  checkFeatRequirements(character, featName) {
    const feat = this.featChoices.find(f => f.name === featName);
    if (!feat) return false;

    // Most feats require specific ability scores or other prerequisites
    // This is a simplified implementation
    return character.level >= 4; // Basic requirement for most feats
  }

  /**
   * Apply a feat to character
   * @param {Object} character - Character object
   * @param {string} featName - Name of feat to apply
   * @returns {Object} Updated character with feat applied
   */
  async applyFeat(character, featName) {
    const feat = this.featChoices.find(f => f.name === featName);
    if (!feat || !this.checkFeatRequirements(character, featName)) {
      return {
        success: false,
        error: 'Feat requirements not met or feat not found'
      };
    }

    // Apply feat effects
    const updatedCharacter = { ...character };
    updatedCharacter.feats = updatedCharacter.feats || [];
    updatedCharacter.feats.push({
      name: feat.name,
      description: feat.description,
      appliedAtLevel: character.level
    });

    return {
      success: true,
      character: updatedCharacter,
      message: `Applied feat: ${feat.name}`
    };
  }

  /**
   * Generate level-up summary for display
   * @param {Object} oldCharacter - Character before leveling
   * @param {Object} newCharacter - Character after leveling
   * @returns {string} Formatted level-up summary
   */
  generateLevelUpSummary(oldCharacter, newCharacter) {
    const summary = [];

    summary.push(`🎉 Level ${oldCharacter.level} → ${newCharacter.level}`);
    summary.push(`❤️ HP: ${oldCharacter.maxHp} → ${newCharacter.maxHp} (+${newCharacter.maxHp - oldCharacter.maxHp})`);
    summary.push(`🏹 Proficiency Bonus: +${this.getProficiencyBonus(oldCharacter.level)} → +${this.getProficiencyBonus(newCharacter.level)}`);

    if (newCharacter.features?.length > (oldCharacter.features?.length || 0)) {
      summary.push(`✨ New Features: ${newCharacter.features.slice(-(newCharacter.level - oldCharacter.level)).join(', ')}`);
    }

    if (this.isSpellcaster(newCharacter.class)) {
      summary.push(`📚 Spell Slots Updated`);
    }

    return summary.join('\n');
  }

  /**
   * Validate character build integrity
   * @param {Object} character - Character object to validate
   * @returns {Object} Validation result
   */
  validateCharacter(character) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!character.name) errors.push('Character name is required');
    if (!character.race) errors.push('Character race is required');
    if (!character.class) errors.push('Character class is required');
    if (!character.level || character.level < 1) errors.push('Valid level is required');

    // Check ability scores
    if (!character.abilityScores) {
      errors.push('Ability scores are required');
    } else {
      const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
      abilities.forEach(ability => {
        const score = character.abilityScores[ability];
        if (typeof score !== 'number' || score < 1 || score > 30) {
          errors.push(`${ability} score must be between 1 and 30`);
        }
      });
    }

    // Check hit points
    if (!character.maxHp || character.maxHp < 1) {
      errors.push('Valid maximum hit points required');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      character: character
    };
  }
}

// Singleton instance for use throughout the app
const characterProgression = new CharacterProgression();

export default characterProgression;

// Export individual methods for direct use
export const {
  calculateLevel,
  getNextLevelInfo,
  levelUp,
  getProficiencyBonus,
  getSavingThrowModifier,
  getSkillModifier,
  isSpellcaster,
  validateCharacter
} = characterProgression;
