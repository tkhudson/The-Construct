// Session timer service for managing game session timing
import { EventEmitter } from 'events';

class SessionTimer {
  constructor() {
    this.emitter = new EventEmitter();
    this.reset();
  }

  // Initialize timer with duration in minutes
  initialize(durationMinutes) {
    this.totalSeconds = durationMinutes * 60;
    this.secondsRemaining = this.totalSeconds;
    this.isActive = false;
    this.intervalId = null;
    this.pacingStage = 0;
    return this;
  }

  // Start or resume the timer
  start() {
    if (!this.isActive && this.secondsRemaining > 0) {
      this.isActive = true;
      this.intervalId = setInterval(() => this.tick(), 1000);
      this.emitter.emit('timerStart');
    }
    return this;
  }

  // Pause the timer
  pause() {
    if (this.isActive) {
      this.isActive = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.emitter.emit('timerPause');
    }
    return this;
  }

  // Reset the timer to initial state
  reset() {
    this.pause();
    this.totalSeconds = 0;
    this.secondsRemaining = 0;
    this.pacingStage = 0;
    this.emitter.emit('timerReset');
    return this;
  }

  // Internal tick function
  tick() {
    if (this.secondsRemaining > 0) {
      this.secondsRemaining--;
      this.checkPacing();
      this.emitter.emit('tick', this.getTimeLeft());

      if (this.secondsRemaining === 0) {
        this.pause();
        this.emitter.emit('timerComplete');
      }
    }
  }

  // Check pacing thresholds and emit events
  checkPacing() {
    const percentage = (this.totalSeconds - this.secondsRemaining) / this.totalSeconds;
    const thresholds = [
      { percent: 0.5, stage: 1, event: 'halfTime' },
      { percent: 0.8, stage: 2, event: 'finalPhase' },
      { percent: 0.95, stage: 3, event: 'wrapUp' }
    ];

    for (const threshold of thresholds) {
      if (percentage >= threshold.percent && this.pacingStage < threshold.stage) {
        this.pacingStage = threshold.stage;
        this.emitter.emit(threshold.event);
      }
    }
  }

  // Get current time left in formatted string
  getTimeLeft() {
    const minutes = Math.floor(this.secondsRemaining / 60);
    const seconds = this.secondsRemaining % 60;
    return {
      minutes,
      seconds,
      formatted: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      totalSeconds: this.secondsRemaining,
      percentage: (this.totalSeconds - this.secondsRemaining) / this.totalSeconds
    };
  }

  // Event subscription methods
  onTick(callback) {
    this.emitter.on('tick', callback);
    return this;
  }

  onStart(callback) {
    this.emitter.on('timerStart', callback);
    return this;
  }

  onPause(callback) {
    this.emitter.on('timerPause', callback);
    return this;
  }

  onReset(callback) {
    this.emitter.on('timerReset', callback);
    return this;
  }

  onComplete(callback) {
    this.emitter.on('timerComplete', callback);
    return this;
  }

  onHalfTime(callback) {
    this.emitter.on('halfTime', callback);
    return this;
  }

  onFinalPhase(callback) {
    this.emitter.on('finalPhase', callback);
    return this;
  }

  onWrapUp(callback) {
    this.emitter.on('wrapUp', callback);
    return this;
  }

  // Cleanup method
  destroy() {
    this.pause();
    this.emitter.removeAllListeners();
  }
}

// Create singleton instance
const sessionTimer = new SessionTimer();
export default sessionTimer;
