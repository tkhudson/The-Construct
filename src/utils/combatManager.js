TheConstruct / src / utils / combatManager.js;
// Combat Manager - Handles structured combat encounters for The Construct
// Provides initiative tracking, turn management, and combat mechanics

class CombatManager {
  constructor(aiService, diceRoller) {
    this.aiService = aiService;
    this.diceRoller = diceRoller;
    this.combatState = {
      isActive: false,
      round: 0,
      turn: 0,
      initiative: [],
      participants: [],
      conditions: {},
      session: null,
    };
  }

  /**
   * Initialize a new combat encounter
   * @param {Array} participants - Array of combatants [{id, name, type, initiative}]
   * @param {Object} session - Current session context
   * @param {Object} config - Combat configuration
   */
  async initializeCombat(participants, session, config = {}) {
    try {
      this.combatState.session = session;
      this.combatState.isActive = true;
      this.combatState.round = 1;
      this.combatState.turn = 0;
      this.combatState.participants = participants;
      this.combatState.conditions = {};

      // Calculate initiative for each participant
      await this.rollInitiative();

      return {
        success: true,
        message: `Combat initiated! ${this.combatState.initiative.length} participants ready.`,
        initiative: this.getInitiativeOrder(),
        currentRound: this.combatState.round,
      };
    } catch (error) {
      console.error("Combat initialization error:", error);
      return {
        success: false,
        error: "Failed to initialize combat encounter",
        details: error.message,
      };
    }
  }

  /**
   * Roll initiative for all participants
   * For players: Request they roll their own initiative
   * For NPCs/monsters: Roll automatically
   */
  async rollInitiative() {
    const initiative = [];

    for (const participant of this.combatState.participants) {
      if (participant.type === "player" || participant.isPlayer) {
        // For player characters, NEVER roll - request they roll themselves
        await this.announcePlayerInitiativeRequest(participant.name);

        // Add placeholder - will be updated when player reports their roll
        initiative.push({
          ...participant,
          initiativeRoll: null, // Will be set by player
          hasActed: false,
          awaitingRoll: true,
        });
      } else {
        // For NPCs/monsters, DM can roll
        const dieRoll = this.diceRoller.rollDice(20, 1)[0];
        const modifier =
          participant.initiativeModifier || participant.stats?.dexterity
            ? Math.floor((participant.stats.dexterity - 10) / 2)
            : 0;
        const initiativeRoll = dieRoll + modifier;

        await this.announceInitiativeRoll(
          participant.name,
          dieRoll,
          modifier,
          initiativeRoll,
        );

        initiative.push({
          ...participant,
          initiativeRoll,
          hasActed: false,
        });
      }
    }

    // Sort by initiative (highest first) - players with pending rolls go to end
    const players = initiative.filter((p) => p.awaitingRoll);
    const npcs = initiative
      .filter((p) => !p.awaitingRoll)
      .sort((a, b) => b.initiativeRoll - a.initiativeRoll);

    this.combatState.initiative = [...npcs, ...players];
  }

  /**
   * Set player initiative when they report their roll result
   */
  async setPlayerInitiative(participantId, initiativeResult) {
    const participant = this.combatState.initiative.find(
      (p) => p.id === participantId,
    );

    if (participant && participant.awaitingRoll) {
      participant.initiativeRoll = initiativeResult;
      participant.awaitingRoll = false;

      // Re-sort initiative order
      this.combatState.initiative.sort((a, b) => {
        if (!a.initiativeRoll) return 1; // No roll yet, goes to end
        if (!b.initiativeRoll) return -1;
        return b.initiativeRoll - a.initiativeRoll;
      });

      return {
        success: true,
        message: `${participant.name} rolls ${initiativeResult} for initiative.`,
        newInitiative: this.getInitiativeOrder(),
      };
    }

    return {
      success: false,
      error: "Participant not found or already has initiative roll",
    };
  }

  /**
   * Get current initiative order
   */
  getInitiativeOrder() {
    return this.combatState.initiative.map((p, index) => ({
      ...p,
      position: index + 1,
      isCurrentTurn: index === this.combatState.turn,
    }));
  }

  /**
   * Advance to next turn in combat
   */
  async nextTurn() {
    if (!this.combatState.isActive) {
      return { success: false, error: "No active combat" };
    }

    const currentParticipant =
      this.combatState.initiative[this.combatState.turn];

    // Mark current participant as having acted
    this.combatState.initiative[this.combatState.turn].hasActed = true;

    // Move to next participant
    this.combatState.turn++;

    // Check if we've completed a round
    if (this.combatState.turn >= this.combatState.initiative.length) {
      await this.endRound();
      this.startNewRound();
    }

    const nextParticipant = this.getCurrentParticipant();

    // Clear any expired conditions
    await this.updateConditions();

    return {
      success: true,
      message: `${nextParticipant.name}'s turn begins!`,
      currentParticipant: nextParticipant,
      round: this.combatState.round,
      turn: this.combatState.turn,
    };
  }

  /**
   * Get the current participant whose turn it is
   */
  getCurrentParticipant() {
    return this.combatState.initiative[this.combatState.turn];
  }

  /**
   * End the current round and process end-of-round effects
   */
  async endRound() {
    // Process saving throws for conditions
    await this.processEndOfRoundEffects();

    // Reset hasActed flags for new round
    this.combatState.initiative.forEach((p) => (p.hasActed = false));
  }

  /**
   * Start a new round
   */
  startNewRound() {
    this.combatState.round++;
    this.combatState.turn = 0;
  }

  /**
   * Process combat actions (attacks, spells, etc.)
   */
  async processAction(actionType, actionData) {
    const currentParticipant = this.getCurrentParticipant();

    try {
      let result;

      switch (actionType) {
        case "attack":
          result = await this.processAttack(actionData);
          break;
        case "cast_spell":
          result = await this.processSpell(actionData);
          break;
        case "use_ability":
          result = await this.processAbility(actionData);
          break;
        case "move":
          result = await this.processMovement(actionData);
          break;
        default:
          return {
            success: false,
            error: `Unknown action type: ${actionType}`,
          };
      }

      return {
        success: true,
        action: actionType,
        participant: currentParticipant.name,
        result: result,
      };
    } catch (error) {
      console.error("Action processing error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process an attack action
   * Note: For player characters, this guides the player through their roll
   * For NPCs/monsters, it performs the roll automatically
   */
  async processAttack(attackData) {
    const {
      weapon,
      target,
      advantage = false,
      disadvantage = false,
    } = attackData;
    const attacker = this.getCurrentParticipant();

    // For player characters, NEVER roll - guide them through their roll
    if (!attacker.isPlayer && !attacker.type?.includes("player")) {
      return {
        playerRollRequired: true,
        weapon: weapon,
        target: target,
        guidance: `Please roll your attack roll. Roll a d20${advantage ? " with advantage (roll twice, take higher)" : disadvantage ? " with disadvantage (roll twice, take lower)" : ""} and add your attack modifier.`,
        message: `Roll your attack against ${target.name} (AC ${target.ac || 13}).`,
      };
    }

    // For NPCs/monsters, DM can roll automatically
    const attackRoll = this.diceRoller.rollDice(20, 1)[0];
    const modifier = attacker.stats?.strength || attacker.stats?.dexterity || 0;
    const finalAttack = attackRoll + modifier;

    // Check for hit (vs target's AC)
    const targetAC = target.ac || 13;
    const isHit = finalAttack >= targetAC;

    if (isHit) {
      // For damage, we still guide players through their roll
      return {
        hit: true,
        attackRoll,
        damageRollRequired: true,
        weapon: weapon,
        message: `${attacker.name} hits! Please roll ${weapon.damage || "1d8"} for damage and add your ${weapon.finesse ? "Dexterity" : "Strength"} modifier.`,
      };
    } else {
      return {
        hit: false,
        attackRoll,
        message: `${attacker.name} misses ${target.name} (needed ${targetAC}, rolled ${finalAttack}).`,
      };
    }
  }

  /**
   * Process spell casting
   */
  async processSpell(spellData) {
    const { spell, target, level = 1 } = spellData;
    const caster = this.getCurrentParticipant();

    // Check if caster can cast the spell
    if (!caster.spells || !caster.spells.includes(spell.name)) {
      return {
        success: false,
        error: `${caster.name} doesn't know this spell`,
      };
    }

    // Process spell effects
    return {
      success: true,
      spell: spell.name,
      target: target?.name,
      message: `${caster.name} casts ${spell.name}!`,
    };
  }

  /**
   * Apply conditions to participants
   */
  async applyCondition(participantId, condition, duration = null) {
    if (!this.combatState.conditions[participantId]) {
      this.combatState.conditions[participantId] = [];
    }

    this.combatState.conditions[participantId].push({
      name: condition,
      duration: duration, // null for permanent until removed
      appliedRound: this.combatState.round,
    });

    const participant = this.combatState.participants.find(
      (p) => p.id === participantId,
    );

    return {
      success: true,
      message: `${participant.name} is now ${condition}!`,
    };
  }

  /**
   * Remove conditions from participants
   */
  async removeCondition(participantId, condition) {
    if (this.combatState.conditions[participantId]) {
      this.combatState.conditions[participantId] = this.combatState.conditions[
        participantId
      ].filter((c) => c.name !== condition);

      const participant = this.combatState.participants.find(
        (p) => p.id === participantId,
      );

      return {
        success: true,
        message: `${participant.name} is no longer ${condition}!`,
      };
    }

    return { success: false, error: "Condition not found" };
  }

  /**
   * Update condition durations at end of round
   */
  async updateConditions() {
    for (const participantId in this.combatState.conditions) {
      this.combatState.conditions[participantId] = this.combatState.conditions[
        participantId
      ].filter((condition) => {
        if (condition.duration === null) return true; // Permanent
        if (condition.duration <= 0) {
          this.announceConditionExpired(participantId, condition.name);
          return false;
        }
        condition.duration--;
        return true;
      });
    }
  }

  /**
   * End combat encounter
   */
  async endCombat(outcome = "victory") {
    const summary = {
      rounds: this.combatState.round,
      survivors: this.getSurvivingParticipants(),
      outcome: outcome,
    };

    // Reset combat state
    this.combatState = {
      isActive: false,
      round: 0,
      turn: 0,
      initiative: [],
      participants: [],
      conditions: {},
      session: null,
    };

    return {
      success: true,
      message: `Combat ended! ${outcome === "victory" ? "Victory!" : "Defeat..."} Total rounds: ${summary.rounds}`,
      summary,
    };
  }

  /**
   * Get surviving participants
   */
  getSurvivingParticipants() {
    return this.combatState.participants.filter(
      (p) => p.hp > 0 || !p.isPlayer, // Keep NPCs until explicitly defeated
    );
  }

  /**
   * Check if combat should continue
   */
  shouldContinueCombat() {
    if (!this.combatState.isActive) return false;

    const playersAlive = this.combatState.participants
      .filter((p) => p.isPlayer)
      .some((p) => p.hp > 0);

    const enemiesAlive = this.combatState.participants
      .filter((p) => !p.isPlayer)
      .some((p) => p.hp > 0);

    return playersAlive && enemiesAlive;
  }

  // Helper methods for announcements
  async announceInitiativeRoll(name, roll, modifier, total) {
    const message = `${name} rolled ${roll} + ${modifier} = ${total} for initiative.`;
    // This would typically integrate with your chat system
    console.log("[Combat]", message);
  }

  async announcePlayerInitiativeRequest(name) {
    const message = `Please roll for initiative! Roll a d20 and add your Dexterity modifier. Then tell me your result so we can establish turn order.`;
    console.log("[Combat]", `Request to ${name}:`, message);
  }

  async announceConditionExpired(participantId, condition) {
    const participant = this.combatState.participants.find(
      (p) => p.id === participantId,
    );
    const message = `${participant.name} is no longer ${condition}!`;
    console.log("[Combat]", message);
  }

  async processEndOfRoundEffects() {
    // Process any end-of-round effects (saving throws, etc.)
    for (const participantId in this.combatState.conditions) {
      // This could integrate with the AI service for saving throws
      console.log(`Processing end-of-round effects for ${participantId}`);
    }
  }

  // Get current combat status
  getStatus() {
    return {
      isActive: this.combatState.isActive,
      round: this.combatState.round,
      turn: this.combatState.turn,
      currentParticipant: this.getCurrentParticipant(),
      initiative: this.getInitiativeOrder(),
      conditions: this.combatState.conditions,
      canContinue: this.shouldContinueCombat(),
    };
  }
}

export default CombatManager;
