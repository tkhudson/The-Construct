// Achievement System - Track and reward player accomplishments
// Provides motivation and feedback through milestone tracking

import AsyncStorage from '@react-native-async-storage/async-storage';

export class AchievementSystem {
  constructor() {
    this.achievements = new Map();
    this.unlockedAchievements = new Set();
    this.initializeAchievements();
    this.loadUnlockedAchievements();
  }

  /**
   * Initialize all available achievements
   */
  initializeAchievements() {
    // Combat achievements
    this.addAchievement('first_blood', {
      name: 'First Blood',
      description: 'Win your first combat encounter',
      icon: '⚔️',
      category: 'combat'
    });

    this.addAchievement('critical_master', {
      name: 'Critical Master',
      description: 'Roll three natural 20s in one session',
      icon: '🎯',
      category: 'combat',
      progress: { current: 0, max: 3 }
    });

    this.addAchievement('survivor', {
      name: 'Survivor',
      description: 'Win a combat with less than 25% health',
      icon: '❤️',
      category: 'combat'
    });

    // Role-playing achievements
    this.addAchievement('diplomat', {
      name: 'Master Diplomat',
      description: 'Resolve a conflict without violence',
      icon: '🤝',
      category: 'roleplay'
    });

    this.addAchievement('detective', {
      name: 'Master Detective',
      description: 'Uncover three hidden secrets',
      icon: '🔍',
      category: 'roleplay',
      progress: { current: 0, max: 3 }
    });

    this.addAchievement('silver_tongue', {
      name: 'Silver Tongue',
      description: 'Succeed on three difficult persuasion checks',
      icon: '💬',
      category: 'roleplay',
      progress: { current: 0, max: 3 }
    });

    // Exploration achievements
    this.addAchievement('explorer', {
      name: 'Master Explorer',
      description: 'Discover five unique locations',
      icon: '🗺️',
      category: 'exploration',
      progress: { current: 0, max: 5 }
    });

    this.addAchievement('treasure_hunter', {
      name: 'Treasure Hunter',
      description: 'Find three valuable artifacts',
      icon: '💎',
      category: 'exploration',
      progress: { current: 0, max: 3 }
    });

    // Session achievements
    this.addAchievement('committed', {
      name: 'Committed Adventurer',
      description: 'Complete five game sessions',
      icon: '⭐',
      category: 'session',
      progress: { current: 0, max: 5 }
    });
  }

  /**
   * Add a new achievement
   * @param {string} id - Achievement identifier
   * @param {object} achievement - Achievement details
   */
  addAchievement(id, achievement) {
    this.achievements.set(id, {
      ...achievement,
      id,
      unlocked: false,
      unlockTime: null,
      progress: achievement.progress || null
    });
  }

  /**
   * Load previously unlocked achievements
   */
  async loadUnlockedAchievements() {
    try {
      const saved = await AsyncStorage.getItem('unlockedAchievements');
      if (saved) {
        const unlocked = JSON.parse(saved);
        unlocked.forEach(id => {
          this.unlockedAchievements.add(id);
          const achievement = this.achievements.get(id);
          if (achievement) {
            achievement.unlocked = true;
          }
        });
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  }

  /**
   * Save unlocked achievements
   */
  async saveUnlockedAchievements() {
    try {
      await AsyncStorage.setItem(
        'unlockedAchievements',
        JSON.stringify(Array.from(this.unlockedAchievements))
      );
    } catch (error) {
      console.error('Failed to save achievements:', error);
    }
  }

  /**
   * Check for achievement unlock
   * @param {string} eventType - Type of event
   * @param {object} context - Event context
   * @returns {array} Newly unlocked achievements
   */
  checkAchievement(eventType, context) {
    const unlockedAchievements = [];

    switch (eventType) {
      case 'combat_victory':
        if (!this.isUnlocked('first_blood')) {
          unlockedAchievements.push(this.unlockAchievement('first_blood'));
        }
        if (context.healthPercentage <= 25 && !this.isUnlocked('survivor')) {
          unlockedAchievements.push(this.unlockAchievement('survivor'));
        }
        break;

      case 'roll_result':
        if (context.roll === 20) {
          const criticalMaster = this.achievements.get('critical_master');
          if (criticalMaster && !criticalMaster.unlocked) {
            criticalMaster.progress.current++;
            if (criticalMaster.progress.current >= criticalMaster.progress.max) {
              unlockedAchievements.push(this.unlockAchievement('critical_master'));
            }
          }
        }
        break;

      case 'peaceful_resolution':
        if (!this.isUnlocked('diplomat')) {
          unlockedAchievements.push(this.unlockAchievement('diplomat'));
        }
        break;

      case 'secret_discovered':
        const detective = this.achievements.get('detective');
        if (detective && !detective.unlocked) {
          detective.progress.current++;
          if (detective.progress.current >= detective.progress.max) {
            unlockedAchievements.push(this.unlockAchievement('detective'));
          }
        }
        break;

      case 'session_complete':
        const committed = this.achievements.get('committed');
        if (committed && !committed.unlocked) {
          committed.progress.current++;
          if (committed.progress.current >= committed.progress.max) {
            unlockedAchievements.push(this.unlockAchievement('committed'));
          }
        }
        break;
    }

    if (unlockedAchievements.length > 0) {
      this.saveUnlockedAchievements();
    }

    return unlockedAchievements;
  }

  /**
   * Unlock an achievement
   * @param {string} id - Achievement identifier
   * @returns {object} Unlocked achievement
   */
  unlockAchievement(id) {
    const achievement = this.achievements.get(id);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.unlockTime = Date.now();
      this.unlockedAchievements.add(id);
      return achievement;
    }
    return null;
  }

  /**
   * Check if achievement is unlocked
   * @param {string} id - Achievement identifier
   * @returns {boolean} Unlock status
   */
  isUnlocked(id) {
    return this.unlockedAchievements.has(id);
  }

  /**
   * Get all achievements
   * @param {string} category - Optional category filter
   * @returns {array} Array of achievements
   */
  getAchievements(category = null) {
    const achievements = Array.from(this.achievements.values());
    return category
      ? achievements.filter(a => a.category === category)
      : achievements;
  }

  /**
   * Get unlocked achievements
   * @returns {array} Array of unlocked achievements
   */
  getUnlockedAchievements() {
    return Array.from(this.achievements.values()).filter(a => a.unlocked);
  }

  /**
   * Get achievement progress
   * @returns {object} Progress statistics
   */
  getProgress() {
    const total = this.achievements.size;
    const unlocked = this.unlockedAchievements.size;

    return {
      total,
      unlocked,
      percentage: (unlocked / total) * 100,
      byCategory: this.getProgressByCategory()
    };
  }

  /**
   * Get progress breakdown by category
   * @returns {object} Category progress
   */
  getProgressByCategory() {
    const progress = {};

    for (const achievement of this.achievements.values()) {
      if (!progress[achievement.category]) {
        progress[achievement.category] = { total: 0, unlocked: 0 };
      }
      progress[achievement.category].total++;
      if (achievement.unlocked) {
        progress[achievement.category].unlocked++;
      }
    }

    return progress;
  }
}

export default AchievementSystem;
