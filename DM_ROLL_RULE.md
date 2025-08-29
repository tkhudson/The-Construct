# DM Roll Rule Implementation Guide

## Overview
This document explains the implementation of the critical DM rule in The Construct: **The AI DM NEVER rolls dice for player characters**. This maintains player agency and follows traditional tabletop RPG best practices.

## Rule Enforcement

### Core Principle
```
❌ NEVER: AI DM rolls dice for players
✅ ALWAYS: AI DM guides players through their own rolls
✅ OK: AI DM rolls for NPCs, monsters, and environmental effects
```

### Implementation Architecture

#### 1. Roll Request Detection (`aiService.js`)
The system uses `analyzeRollRequest()` function to detect when players request rolls:

```javascript
function analyzeRollRequest(playerAction) {
  // Detects keywords like "roll", "attack", "saving throw", "initiative"
  // Returns specific guidance for each roll type
  return { needsRoll: boolean, guidance: string|null };
}
```

#### 2. AI Prompt Enforcement
The system prompt explicitly forbids rolling for players:

```javascript
const systemMessage = `
IMPORTANT DM RULE: You NEVER roll dice for the player character. 
The player ALWAYS rolls their own dice (attack rolls, ability checks, saving throws, initiative, damage, etc.). 

When a player needs to make a roll, tell them exactly what to roll...
`;
```

#### 3. Response Patterns

##### ✅ Correct AI DM Responses
```javascript
// Player: "I attack the goblin"
// AI DM: "Roll a d20 and add your Strength modifier + proficiency bonus"

// Player: "I cast fireball"  
// AI DM: "For the spell attack, roll your d20 and add your spellcasting modifier"

// Player: "I try to hide"
// AI DM: "Make a Stealth check - roll d20 + Dexterity modifier + proficiency if proficient"
```

##### ❌ Incorrect Responses (NEVER DO)
```javascript
// Player: "I attack the goblin"
// AI DM: "You rolled 15 - miss!"  ← WRONG: DM rolled for player

// Player: "Saving throw!"
// AI DM: "You rolled 12 - failed!" ← WRONG: DM rolled for player
```

### Roll Types Handled

#### Player Rolls (Always Player-Rolled)
- ✅ **Attack Rolls**: Melee, ranged, spell attacks
- ✅ **Ability Checks**: Strength, Dexterity, etc.
- ✅ **Saving Throws**: Against spells/effects
- ✅ **Skill Checks**: Perception, Stealth, etc.
- ✅ **Initiative**: Combat turn order
- ✅ **Death Saves**: When reduced to 0 HP
- ✅ **Spell Casting**: Attack rolls for spells
- ✅ **Concentration**: Maintaining concentration

#### DM Rolls (AI-Can-Roll)
- ✅ **NPC Attacks**: Monster/NPC attack rolls
- ✅ **NPC Damage**: Monster/NPC damage rolls
- ✅ **Saving Throws**: NPC saving throws
- ✅ **Environmental**: Trap damage, falling, etc.

### Code Implementation

#### AI Service Integration
```javascript
// In aiService.js - buildPrompt function
const rollAnalysis = analyzeRollRequest(playerAction);
const systemMessage = `
IMPORTANT DM RULE: You NEVER roll dice for the player character...
${rollAnalysis.needsRoll ? `ROLL REQUEST DETECTED: ${rollAnalysis.guidance}` : ""}
`;
```

#### Combat System Integration
```javascript
// In combatManager.js - processAttack function
if (attacker.isPlayer) {
  return {
    playerRollRequired: true,
    guidance: "Please roll your attack roll...",
    weapon: weapon,
    target: target
  };
}
```

#### Dice Roller Integration
```javascript
// In diceRoller.js - App-level integration
export function requestPlayerRoll(rollType, options) {
  // This function can integrate with the chat system
  // to prompt players for their rolls
}
```

### UI Integration

#### Chat System
When players mention rolls, show helpful guidance:
```
🎲 Player: "I attack the orc"
🤖 DM: "Please roll a d20 and add your Strength modifier + proficiency bonus. Tell me the result!"

📝 Player: "I rolled 17"
🤖 DM: "Great! You hit the orc. Now roll your damage: 1d8 + Strength modifier."
```

#### Combat Panel
The combat panel shows whose turn it is and what actions are available:
```
🔄 Combat Turn: Player's Turn
⚔️ Available Actions:
- Attack (you roll the dice)
- Cast Spell (you roll attack/save)
- Use Ability (you roll any checks)
- End Turn
```

### Testing and Verification

#### Manual Testing Checklist
1. ✅ Player says "I attack the goblin"
   - AI responds with roll instructions
   - No automatic roll performed

2. ✅ Player says "Saving throw"
   - AI explains what to roll and add
   - No dice rolled by AI

3. ✅ Player says "Perception check"
   - AI provides specific roll guidance
   - AI doesn't perform the roll

#### Automated Testing
```javascript
// Test function available in aiService.js
import { testDMRollRule } from './utils/aiService';
testDMRollRule(); // Logs test results to console
```

### Benefits of This Implementation

#### 1. Player Agency
- Players maintain complete control over their character's fate
- No "unfair" rolls by the AI
- Builds trust in the DM system

#### 2. Educational Value
- Players learn proper D&D mechanics
- Understand their character abilities
- Develop dice rolling habits

#### 3. Traditional RPG Experience
- Follows tabletop RPG conventions
- Maintains suspense and excitement
- Preserves player choice

#### 4. Technical Benefits
- Cleaner AI prompt responses
- Predictable interaction patterns
- Easier to debug and maintain

### Configuration Options

#### Theme-Based Variations
The roll guidance can adapt based on theme:
```javascript
// Fantasy theme
"Please roll your d20 + Strength modifier"

// Star Wars theme  
"Please roll your d20 + Brawling skill modifier"

// Modern theme
"Please roll your d20 + Firearms skill modifier"
```

#### Difficulty Adjustments
```javascript
// Normal mode: Standard guidance
"Please roll a d20 + Strength modifier"

// Tutorial mode: Extra explanation
"Please roll 1d20 and add your Strength modifier. If your Strength is 16, add +3."
```

### Error Handling

#### Invalid Roll Requests
```javascript
// Player says "Roll for damage"
// AI responds: "I need to know which weapon you're using for the correct damage dice."
```

#### Missing Information
```javascript
// Player says "I attack"
// AI responds: "Which target are you attacking? Also, what weapon are you using?"
```

### Future Enhancements

#### 1. Roll History Integration
```javascript
// Track player rolls for session logging
const rollHistory = {
  timestamp: Date.now(),
  playerRoll: true, // Important flag
  rollType: "attack",
  weapon: "longsword",
  result: 17,
  modifier: 5,
  total: 22
};
```

#### 2. Advanced Guidance
```javascript
// Provide tactical advice without rolling
"Please roll Perception (d20 + Wisdom + proficiency)."
"Remember: You have advantage on this roll due to your Elven heritage."
```

#### 3. Character Sheet Integration
```javascript
// Display relevant modifiers automatically
"Roll d20 + 5 (Strength) for your attack roll"
```

### Conclusion

This DM roll rule implementation ensures that The Construct maintains the core principles of tabletop RPGs while providing an enhanced digital experience. By never rolling for players, we preserve player agency, teach proper mechanics, and create a more authentic and engaging gaming experience.

The rule is enforced at multiple levels:
- AI prompt engineering
- Code-level validation  
- User interface design
- Error handling and recovery

This creates a robust system that players can trust and enjoy.