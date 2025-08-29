// Session Analytics - Track and analyze gameplay patterns for better DM responses
import AsyncStorage from '@react-native-async-storage/async-storage';

export class SessionAnalytics {
  constructor() {
    this.currentSession = {
      sessionId: null,
      startTime: null,
      actions: [],
      rollResults: [],
      encounters: [],
      decisions: [],
      achievements: [],
      pacing: {
        actionRate: 0,
        combatTime: 0,
        explorationTime: 0,
        roleplayTime: 0
      }
    };
    this.patterns = {
      preferredActionTypes: new Map(),
      commonRollTypes: new Map(),
      decisionTendencies: {
        aggressive: 0,
        diplomatic: 0,
        cautious: 0,
        creative: 0
      }
    };
  }

  /**
   * Initialize a new session
   * @param {string} sessionId - Unique session identifier
   */
  startSession(sessionId) {
    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      actions: [],
      rollResults: [],
      encounters: [],
      decisions: [],
      achievements: [],
      pacing: {
        actionRate: 0,
        combatTime: 0,
        explorationTime: 0,
        roleplayTime: 0
      }
    };
  }

  /**
   * Track a player action
   * @param {object} action - Action details
   */
  trackAction(action) {
    const actionData = {
      timestamp: Date.now(),
      type: action.type,
      text: action.text,
      category: this.categorizeAction(action.text),
      success: action.success || null
    };

    this.currentSession.actions.push(actionData);
    this.updatePatterns(actionData);
    this.updatePacing();
  }

  /**
   * Track dice roll results
   * @param {object} roll - Roll details
   */
  trackRoll(roll) {
    const rollData = {
      timestamp: Date.now(),
      type: roll.label,
      result: roll.total,
      rolls: roll.rolls,
      critical: roll.rolls.includes(20),
      criticalFail: roll.rolls.includes(1),
      context: roll.context || 'general'
    };

    this.currentSession.rollResults.push(rollData);
    this.updateRollPatterns(rollData);
  }

  /**
   * Track combat encounters
   * @param {object} encounter - Encounter details
   */
  trackEncounter(encounter) {
    this.currentSession.encounters.push({
      timestamp: Date.now(),
      type: encounter.type,
      enemies: encounter.enemies,
      outcome: encounter.outcome,
      duration: encounter.duration,
      playerHealth: encounter.playerHealth,
      tacticsUsed: encounter.tactics || []
    });
  }

  /**
   * Track major decisions
   * @param {object} decision - Decision details
   */
  trackDecision(decision) {
    const decisionData = {
      timestamp: Date.now(),
      situation: decision.situation,
      choice: decision.choice,
      category: this.categorizeDecision(decision.choice),
      consequences: decision.consequences || []
    };

    this.currentSession.decisions.push(decisionData);
    this.updateDecisionTendencies(decisionData);
  }

  /**
   * Categorize an action based on keywords
   * @param {string} actionText - The action text
   * @returns {string} Action category
   */
  categorizeAction(actionText) {
    const text = actionText.toLowerCase();

    if (text.includes('attack') || text.includes('fight') || text.includes('strike')) {
      return 'combat';
    } else if (text.includes('talk') || text.includes('persuade') || text.includes('negotiate')) {
      return 'social';
    } else if (text.includes('search') || text.includes('investigate') || text.includes('look')) {
      return 'exploration';
    } else if (text.includes('sneak') || text.includes('hide') || text.includes('stealth')) {
      return 'stealth';
    } else if (text.includes('cast') || text.includes('spell') || text.includes('magic')) {
      return 'magic';
    }

    return 'other';
  }

  /**
   * Categorize a decision
   * @param {string} choice - The choice made
   * @returns {string} Decision category
   */
  categorizeDecision(choice) {
    const text = choice.toLowerCase();

    if (text.includes('attack') || text.includes('fight')) {
      return 'aggressive';
    } else if (text.includes('talk') || text.includes('negotiate')) {
      return 'diplomatic';
    } else if (text.includes('flee') || text.includes('avoid')) {
      return 'cautious';
    } else if (text.includes('trick') || text.includes('creative')) {
      return 'creative';
    }

    return 'neutral';
  }

  /**
   * Update action patterns
   * @param {object} actionData - Action data
   */
  updatePatterns(actionData) {
    const count = this.patterns.preferredActionTypes.get(actionData.category) || 0;
    this.patterns.preferredActionTypes.set(actionData.category, count + 1);
  }

  /**
   * Update roll patterns
   * @param {object} rollData - Roll data
   */
  updateRollPatterns(rollData) {
    const count = this.patterns.commonRollTypes.get(rollData.type) || 0;
    this.patterns.commonRollTypes.set(rollData.type, count + 1);
  }

  /**
   * Update decision tendencies
   * @param {object} decisionData - Decision data
   */
  updateDecisionTendencies(decisionData) {
    if (this.patterns.decisionTendencies[decisionData.category] !== undefined) {
      this.patterns.decisionTendencies[decisionData.category]++;
    }
  }

  /**
   * Update pacing metrics
   */
  updatePacing() {
    const now = Date.now();
    const sessionDuration = (now - this.currentSession.startTime) / 1000 / 60; // in minutes

    if (sessionDuration > 0) {
      this.currentSession.pacing.actionRate = this.currentSession.actions.length / sessionDuration;
    }

    // Calculate time spent in different activities
    const categories = this.currentSession.actions.map(a => a.category);
    const combatActions = categories.filter(c => c === 'combat').length;
    const socialActions = categories.filter(c => c === 'social').length;
    const explorationActions = categories.filter(c => c === 'exploration').length;

    const total = categories.length || 1;
    this.currentSession.pacing.combatTime = (combatActions / total) * 100;
    this.currentSession.pacing.roleplayTime = (socialActions / total) * 100;
    this.currentSession.pacing.explorationTime = (explorationActions / total) * 100;
  }

  /**
   * Get player preferences and tendencies
   * @returns {object} Player profile
   */
  getPlayerProfile() {
    const topActions = Array.from(this.patterns.preferredActionTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);

    const topDecisionStyle = Object.entries(this.patterns.decisionTendencies)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      preferredActions: topActions,
      decisionStyle: topDecisionStyle ? topDecisionStyle[0] : 'balanced',
      actionRate: this.currentSession.pacing.actionRate,
      playstyleBreakdown: {
        combat: this.currentSession.pacing.combatTime,
        roleplay: this.currentSession.pacing.roleplayTime,
        exploration: this.currentSession.pacing.explorationTime
      },
      rollStatistics: this.getRollStatistics()
    };
  }

  /**
   * Get roll statistics
   * @returns {object} Roll statistics
   */
  getRollStatistics() {
    const rolls = this.currentSession.rollResults;
    if (rolls.length === 0) return null;

    const d20Rolls = rolls.filter(r => r.type === 'd20').map(r => r.rolls[0]);
    const criticals = rolls.filter(r => r.critical).length;
    const criticalFails = rolls.filter(r => r.criticalFail).length;

    return {
      totalRolls: rolls.length,
      averageD20: d20Rolls.length > 0 ? d20Rolls.reduce((a, b) => a + b, 0) / d20Rolls.length : 0,
      criticalRate: rolls.length > 0 ? (criticals / rolls.length) * 100 : 0,
      criticalFailRate: rolls.length > 0 ? (criticalFails / rolls.length) * 100 : 0,
      luckyStreak: this.calculateLuckyStreak(d20Rolls),
      unluckyStreak: this.calculateUnluckyStreak(d20Rolls)
    };
  }

  /**
   * Calculate lucky streak (consecutive high rolls)
   * @param {array} rolls - D20 rolls
   * @returns {number} Longest lucky streak
   */
  calculateLuckyStreak(rolls) {
    let maxStreak = 0;
    let currentStreak = 0;

    rolls.forEach(roll => {
      if (roll >= 15) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return maxStreak;
  }

  /**
   * Calculate unlucky streak (consecutive low rolls)
   * @param {array} rolls - D20 rolls
   * @returns {number} Longest unlucky streak
   */
  calculateUnluckyStreak(rolls) {
    let maxStreak = 0;
    let currentStreak = 0;

    rolls.forEach(roll => {
      if (roll <= 5) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return maxStreak;
  }

  /**
   * Get session summary
   * @returns {object} Session summary
   */
  getSessionSummary() {
    const duration = (Date.now() - this.currentSession.startTime) / 1000 / 60; // in minutes
    const profile = this.getPlayerProfile();

    return {
      sessionId: this.currentSession.sessionId,
      duration: Math.round(duration),
      totalActions: this.currentSession.actions.length,
      encounters: this.currentSession.encounters.length,
      majorDecisions: this.currentSession.decisions.length,
      achievements: this.currentSession.achievements,
      playerProfile: profile,
      highlights: this.generateHighlights(),
      recommendations: this.generateRecommendations(profile)
    };
  }

  /**
   * Generate session highlights
   * @returns {array} List of highlights
   */
  generateHighlights() {
    const highlights = [];

    // Check for epic moments
    const criticals = this.currentSession.rollResults.filter(r => r.critical);
    if (criticals.length > 0) {
      highlights.push(`🎯 Rolled ${criticals.length} critical hit${criticals.length > 1 ? 's' : ''}!`);
    }

    // Check for close calls
    const lowHealthEncounters = this.currentSession.encounters.filter(e => e.playerHealth < 25);
    if (lowHealthEncounters.length > 0) {
      highlights.push('💀 Survived a near-death experience!');
    }

    // Check for diplomatic solutions
    const diplomaticDecisions = this.currentSession.decisions.filter(d => d.category === 'diplomatic');
    if (diplomaticDecisions.length >= 2) {
      highlights.push('🤝 Master negotiator - resolved conflicts peacefully');
    }

    // Check for exploration
    if (this.currentSession.pacing.explorationTime > 40) {
      highlights.push('🔍 Thorough explorer - left no stone unturned');
    }

    return highlights;
  }

  /**
   * Generate recommendations based on player profile
   * @param {object} profile - Player profile
   * @returns {array} List of recommendations
   */
  generateRecommendations(profile) {
    const recommendations = [];

    // Action variety recommendation
    if (profile.playstyleBreakdown.combat > 70) {
      recommendations.push({
        type: 'variety',
        message: 'Try incorporating more roleplay or exploration for a richer experience'
      });
    }

    // Roll luck recommendations
    if (profile.rollStatistics && profile.rollStatistics.averageD20 < 8) {
      recommendations.push({
        type: 'encouragement',
        message: 'Your dice have been cold - remember, luck always turns around!'
      });
    }

    // Pacing recommendations
    if (profile.actionRate > 5) {
      recommendations.push({
        type: 'pacing',
        message: 'Consider taking time to explore and interact with the world'
      });
    } else if (profile.actionRate < 1) {
      recommendations.push({
        type: 'pacing',
        message: 'Don\'t be afraid to take action - fortune favors the bold!'
      });
    }

    // Decision style recommendations
    if (profile.decisionStyle === 'aggressive' && profile.playstyleBreakdown.combat < 50) {
      recommendations.push({
        type: 'strategy',
        message: 'Your aggressive nature could benefit from more combat encounters'
      });
    }

    return recommendations;
  }

  /**
   * Save analytics data
   * @returns {Promise<void>}
   */
  async saveAnalytics() {
    try {
      const summary = this.getSessionSummary();
      const key = `analytics_${this.currentSession.sessionId}`;
      await AsyncStorage.setItem(key, JSON.stringify(summary));

      // Update lifetime stats
      await this.updateLifetimeStats(summary);
    } catch (error) {
      console.error('Failed to save analytics:', error);
    }
  }

  /**
   * Update lifetime statistics
   * @param {object} sessionSummary - Current session summary
   */
  async updateLifetimeStats(sessionSummary) {
    try {
      const lifetimeKey = 'lifetime_analytics';
      const existing = await AsyncStorage.getItem(lifetimeKey);
      const lifetime = existing ? JSON.parse(existing) : {
        totalSessions: 0,
        totalPlayTime: 0,
        totalActions: 0,
        totalEncounters: 0,
        favoriteActionType: null,
        preferredDecisionStyle: null
      };

      lifetime.totalSessions++;
      lifetime.totalPlayTime += sessionSummary.duration;
      lifetime.totalActions += sessionSummary.totalActions;
      lifetime.totalEncounters += sessionSummary.encounters;

      await AsyncStorage.setItem(lifetimeKey, JSON.stringify(lifetime));
    } catch (error) {
      console.error('Failed to update lifetime stats:', error);
    }
  }
}

// Singleton instance
const sessionAnalytics = new SessionAnalytics();
export default sessionAnalytics;
