// Roll Helper - Provides contextual guidance for dice rolls
// and integrates with character stats and modifiers

/**
 * Get contextual roll help based on action and character
 * @param {string} action - The player's action text
 * @param {object} character - Character data
 * @returns {object|null} Roll guidance if needed
 */
export function getContextualRollHelp(action, character) {
  const rollType = analyzeRollType(action);
  if (!rollType) return null;

  const modifiers = calculateRelevantModifiers(rollType, character);
  return generateRollGuidance(rollType, modifiers);
}

/**
 * Analyze what type of roll is needed
 * @param {string} action - The player's action text
 * @returns {object|null} Roll type and context
 */
function analyzeRollType(action) {
  const lowerAction = action.toLowerCase();

  // Attack rolls
  if (lowerAction.includes('attack') || lowerAction.includes('strike') || lowerAction.includes('swing')) {
    if (lowerAction.includes('sword') || lowerAction.includes('axe') || lowerAction.includes('hammer')) {
      return { type: 'attack', subtype: 'melee', stat: 'strength' };
    }
    if (lowerAction.includes('bow') || lowerAction.includes('arrow') || lowerAction.includes('throw')) {
      return { type: 'attack', subtype: 'ranged', stat: 'dexterity' };
    }
    if (lowerAction.includes('spell') || lowerAction.includes('cast')) {
      return { type: 'attack', subtype: 'spell', stat: 'spellcasting' };
    }
    return { type: 'attack', subtype: 'general' };
  }

  // Ability checks
  const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  for (const ability of abilities) {
    if (lowerAction.includes(ability)) {
      return { type: 'ability', subtype: ability };
    }
  }

  // Skill checks
  const skills = {
    'perception': 'wisdom',
    'stealth': 'dexterity',
    'persuasion': 'charisma',
    'investigation': 'intelligence',
    'athletics': 'strength',
    'acrobatics': 'dexterity'
  };

  for (const [skill, ability] of Object.entries(skills)) {
    if (lowerAction.includes(skill)) {
      return { type: 'skill', subtype: skill, stat: ability };
    }
  }

  // Saving throws
  if (lowerAction.includes('saving throw') || lowerAction.includes('save')) {
    for (const ability of abilities) {
      if (lowerAction.includes(ability)) {
        return { type: 'save', subtype: ability };
      }
    }
    return { type: 'save', subtype: 'general' };
  }

  // Initiative
  if (lowerAction.includes('initiative')) {
    return { type: 'initiative', stat: 'dexterity' };
  }

  return null;
}

/**
 * Calculate relevant modifiers for a roll
 * @param {object} rollType - The type of roll needed
 * @param {object} character - Character data
 * @returns {object} Applicable modifiers
 */
function calculateRelevantModifiers(rollType, character) {
  const modifiers = {
    base: 0,
    ability: 0,
    proficiency: 0,
    bonuses: []
  };

  if (!character) return modifiers;

  // Get ability modifier
  if (rollType.stat) {
    const abilityScore = character.abilityScores?.[rollType.stat] || 10;
    modifiers.ability = Math.floor((abilityScore - 10) / 2);
  }

  // Add proficiency if applicable
  if (character.proficiencyBonus) {
    const isProficient = checkProficiency(rollType, character);
    if (isProficient) {
      modifiers.proficiency = character.proficiencyBonus;
    }
  }

  // Add relevant bonuses
  if (character.bonuses) {
    for (const bonus of character.bonuses) {
      if (bonus.appliesTo === rollType.type || bonus.appliesTo === rollType.subtype) {
        modifiers.bonuses.push({
          value: bonus.value,
          source: bonus.source
        });
      }
    }
  }

  return modifiers;
}

/**
 * Check if character is proficient in this type of roll
 * @param {object} rollType - The type of roll
 * @param {object} character - Character data
 * @returns {boolean} Whether proficient
 */
function checkProficiency(rollType, character) {
  if (!character.proficiencies) return false;

  switch (rollType.type) {
    case 'attack':
      return character.proficiencies.weapons?.includes(rollType.subtype);
    case 'skill':
      return character.proficiencies.skills?.includes(rollType.subtype);
    case 'save':
      return character.proficiencies.savingThrows?.includes(rollType.subtype);
    default:
      return false;
  }
}

/**
 * Generate roll guidance based on roll type and modifiers
 * @param {object} rollType - The type of roll
 * @param {object} modifiers - Applicable modifiers
 * @returns {object} Roll guidance
 */
function generateRollGuidance(rollType, modifiers) {
  const totalModifier = modifiers.ability + modifiers.proficiency +
    modifiers.bonuses.reduce((sum, bonus) => sum + bonus.value, 0);

  const modifierText = totalModifier >= 0 ? `+${totalModifier}` : totalModifier;

  let guidance = {
    rollFormula: `1d20${modifierText}`,
    description: '',
    details: []
  };

  switch (rollType.type) {
    case 'attack':
      guidance.description = `Roll to attack with your ${rollType.subtype} weapon`;
      guidance.details = [
        'Roll a d20 and add your modifiers:',
        `• ${modifiers.ability} (${rollType.stat.toUpperCase()})`,
        modifiers.proficiency ? `• ${modifiers.proficiency} (proficiency)` : null,
        ...modifiers.bonuses.map(b => `• ${b.value} (${b.source})`)
      ].filter(Boolean);
      break;

    case 'skill':
      guidance.description = `Make a ${rollType.subtype.toUpperCase()} check`;
      guidance.details = [
        'Roll a d20 and add your modifiers:',
        `• ${modifiers.ability} (${rollType.stat.toUpperCase()})`,
        modifiers.proficiency ? `• ${modifiers.proficiency} (proficiency)` : null,
        ...modifiers.bonuses.map(b => `• ${b.value} (${b.source})`)
      ].filter(Boolean);
      break;

    case 'save':
      guidance.description = `Make a ${rollType.subtype.toUpperCase()} saving throw`;
      guidance.details = [
        'Roll a d20 and add your modifiers:',
        `• ${modifiers.ability} (${rollType.subtype.toUpperCase()})`,
        modifiers.proficiency ? `• ${modifiers.proficiency} (proficiency)` : null,
        ...modifiers.bonuses.map(b => `• ${b.value} (${b.source})`)
      ].filter(Boolean);
      break;

    case 'initiative':
      guidance.description = 'Roll for initiative';
      guidance.details = [
        'Roll a d20 and add your modifiers:',
        `• ${modifiers.ability} (DEX)`,
        ...modifiers.bonuses.map(b => `• ${b.value} (${b.source})`)
      ].filter(Boolean);
      break;
  }

  return guidance;
}

export default {
  getContextualRollHelp,
  analyzeRollType,
  calculateRelevantModifiers,
  generateRollGuidance
};
