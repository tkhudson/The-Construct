// Session Pacing Manager - Dynamically adjusts session flow and story intensity
// Provides phase-based guidance and timing for different session lengths

export class SessionPacingManager {
  constructor(sessionMinutes) {
    this.sessionMinutes = sessionMinutes;
    this.phases = this.calculatePhases();
    this.currentPhase = 0;
    this.startTime = Date.now();
    this.lastUpdate = Date.now();
    this.phaseStartTimes = [];
    this.phaseHistory = [];
    this.phaseCallbacks = new Map();
  }

  /**
   * Calculate session phases based on duration
   * @returns {Array} Array of phase objects
   */
  calculatePhases() {
    const phases = [];

    if (this.sessionMinutes <= 30) {
      // Quick session: Hook -> Action -> Climax
      phases.push(
        { name: 'hook', duration: 0.2, intensity: 'medium', description: 'Establish immediate conflict or goal' },
        { name: 'action', duration: 0.5, intensity: 'high', description: 'Drive toward main objective' },
        { name: 'climax', duration: 0.3, intensity: 'maximum', description: 'Resolve central conflict' }
      );
    } else if (this.sessionMinutes <= 60) {
      // Standard session: Introduction -> Development -> Climax -> Resolution
      phases.push(
        { name: 'introduction', duration: 0.2, intensity: 'low', description: 'Set scene and introduce key elements' },
        { name: 'development', duration: 0.4, intensity: 'medium', description: 'Build tension and complexity' },
        { name: 'climax', duration: 0.3, intensity: 'high', description: 'Major confrontation or challenge' },
        { name: 'resolution', duration: 0.1, intensity: 'medium', description: 'Wrap up and consequences' }
      );
    } else {
      // Long session: Full narrative arc
      phases.push(
        { name: 'introduction', duration: 0.15, intensity: 'low', description: 'Rich world-building and character introduction' },
        { name: 'exploration', duration: 0.25, intensity: 'medium', description: 'Deep environment and lore exploration' },
        { name: 'rising_action', duration: 0.25, intensity: 'medium-high', description: 'Escalating challenges and reveals' },
        { name: 'climax', duration: 0.25, intensity: 'high', description: 'Epic confrontation or challenge' },
        { name: 'resolution', duration: 0.1, intensity: 'low', description: 'Satisfying conclusion and future hooks' }
      );
    }

    // Add start times and target durations
    let timeOffset = 0;
    phases.forEach(phase => {
      phase.startTime = timeOffset;
      phase.targetDuration = phase.duration * this.sessionMinutes * 60 * 1000; // in milliseconds
      timeOffset += phase.targetDuration;
    });

    return phases;
  }

  /**
   * Get current phase guidance
   * @returns {object} Phase information and suggestions
   */
  getCurrentPhaseGuidance() {
    const phase = this.phases[this.currentPhase];
    const elapsedTime = Date.now() - this.startTime;
    const phaseTimeRemaining = phase.targetDuration - (elapsedTime - phase.startTime);
    const sessionTimeRemaining = (this.sessionMinutes * 60 * 1000) - elapsedTime;

    const guidance = {
      phase: phase.name,
      intensity: phase.intensity,
      description: phase.description,
      timeRemaining: {
        phase: Math.max(0, Math.floor(phaseTimeRemaining / 1000)),
        session: Math.max(0, Math.floor(sessionTimeRemaining / 1000))
      },
      suggestions: this.getPhaseSuggestions(phase),
      pacing: this.getPacingRecommendation(phase, phaseTimeRemaining)
    };

    return guidance;
  }

  /**
   * Get suggestions for current phase
   * @param {object} phase - Current phase object
   * @returns {array} Array of suggestions
   */
  getPhaseSuggestions(phase) {
    const suggestions = {
      hook: [
        "Present immediate danger or intrigue",
        "Introduce a time-sensitive element",
        "Give players a clear initial goal"
      ],
      introduction: [
        "Establish the scene and atmosphere",
        "Introduce key NPCs or locations",
        "Present the main quest hook"
      ],
      exploration: [
        "Reveal interesting environment details",
        "Present opportunities for character development",
        "Drop hints about future challenges"
      ],
      development: [
        "Escalate existing conflicts",
        "Introduce complications",
        "Deepen character relationships"
      ],
      rising_action: [
        "Increase stakes and tension",
        "Present difficult choices",
        "Reveal plot twists"
      ],
      action: [
        "Keep combat dynamic and interesting",
        "Use environment in encounters",
        "Create urgency through time pressure"
      ],
      climax: [
        "Make the final challenge epic",
        "Tie together previous events",
        "Give each player a moment to shine"
      ],
      resolution: [
        "Provide satisfying conclusion",
        "Show consequences of choices",
        "Plant hooks for future sessions"
      ]
    };

    return suggestions[phase.name] || [];
  }

  /**
   * Get pacing recommendation
   * @param {object} phase - Current phase
   * @param {number} timeRemaining - Time remaining in phase
   * @returns {string} Pacing recommendation
   */
  getPacingRecommendation(phase, timeRemaining) {
    const progress = 1 - (timeRemaining / phase.targetDuration);

    if (progress < 0.3) {
      return "You have time to develop this phase fully. Focus on rich details and player engagement.";
    } else if (progress < 0.7) {
      return "Maintain current pacing. Ensure key phase elements are being addressed.";
    } else if (progress < 0.9) {
      return "Begin wrapping up this phase. Prepare for transition to next phase.";
    } else {
      return "Quickly conclude current phase elements. Ready for phase transition.";
    }
  }

  /**
   * Update phase based on elapsed time
   * @returns {object} Phase transition info if phase changed
   */
  updatePhase() {
    const now = Date.now();
    const elapsedTime = now - this.startTime;

    // Find current phase based on elapsed time
    let newPhase = this.currentPhase;
    for (let i = 0; i < this.phases.length; i++) {
      const phase = this.phases[i];
      if (elapsedTime >= phase.startTime &&
          (i === this.phases.length - 1 || elapsedTime < this.phases[i + 1].startTime)) {
        newPhase = i;
        break;
      }
    }

    // Handle phase transition
    if (newPhase !== this.currentPhase) {
      const oldPhase = this.phases[this.currentPhase];
      const newPhaseData = this.phases[newPhase];

      // Record phase completion
      this.phaseHistory.push({
        phase: oldPhase.name,
        duration: now - this.phaseStartTimes[this.currentPhase],
        targetDuration: oldPhase.targetDuration
      });

      // Update current phase
      this.currentPhase = newPhase;
      this.phaseStartTimes[newPhase] = now;

      // Trigger callbacks
      if (this.phaseCallbacks.has('phaseChange')) {
        this.phaseCallbacks.get('phaseChange')(oldPhase, newPhaseData);
      }

      return {
        transitioned: true,
        from: oldPhase.name,
        to: newPhaseData.name,
        guidance: this.getCurrentPhaseGuidance()
      };
    }

    this.lastUpdate = now;
    return { transitioned: false };
  }

  /**
   * Register callback for phase changes
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  onPhaseChange(callback) {
    this.phaseCallbacks.set('phaseChange', callback);
  }

  /**
   * Get session progress stats
   * @returns {object} Session statistics
   */
  getSessionStats() {
    const elapsedTime = Date.now() - this.startTime;
    return {
      elapsedTime,
      totalTime: this.sessionMinutes * 60 * 1000,
      currentPhase: this.phases[this.currentPhase].name,
      progress: (elapsedTime / (this.sessionMinutes * 60 * 1000)) * 100,
      phaseHistory: this.phaseHistory,
      timeRemaining: Math.max(0, (this.sessionMinutes * 60 * 1000) - elapsedTime)
    };
  }
}

export default SessionPacingManager;
