// Simple dice roller utility for The Construct
// Provides functions for common D&D 5e rolls, using Math.random for simulation
// In a production app, consider using a secure RNG library like 'random-js' for true randomness

/**
 * Rolls a single die with the given number of sides.
 * @param {number} sides - Number of sides on the die (e.g., 20 for d20).
 * @returns {number} The result of the roll (1 to sides).
 */
function rollDie(sides) {
  if (sides < 1) throw new Error('Sides must be at least 1');
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Rolls multiple dice and sums them.
 * @param {number} count - Number of dice to roll.
 * @param {number} sides - Sides per die.
 * @returns {number} Sum of all rolls.
 */
function rollDice(count, sides) {
  let sum = 0;
  for (let i = 0; i < count; i++) {
    sum += rollDie(sides);
  }
  return sum;
}

/**
 * Rolls a d20 with an optional modifier (e.g., for skill checks or attacks).
 * @param {number} [modifier=0] - Bonus or penalty to add to the roll.
 * @returns {number} The total result (d20 + modifier).
 */
function rollD20(modifier = 0) {
  return rollDie(20) + modifier;
}

/**
 * Rolls initiative (d20 + Dexterity modifier).
 * @param {number} dexModifier - The Dexterity modifier.
 * @returns {number} Initiative roll result.
 */
function rollInitiative(dexModifier) {
  return rollD20(dexModifier);
}

export { rollDie, rollDice, rollD20, rollInitiative };
