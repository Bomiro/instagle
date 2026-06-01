/**
 * Utility helper functions
 */

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate hours difference between two dates
 * @param {Date} date1
 * @param {Date} date2
 * @returns {number} Hours difference
 */
const hoursBetween = (date1, date2) => {
  const diffTime = Math.abs(date2 - date1);
  return diffTime / (1000 * 60 * 60);
};

/**
 * Check if date is within hours from now
 * @param {Date} date
 * @param {number} hours
 * @returns {boolean}
 */
const isWithinHours = (date, hours) => {
  const now = new Date();
  return hoursBetween(date, now) <= hours;
};

/**
 * Add hours to current date
 * @param {number} hours
 * @returns {Date}
 */
const addHours = (hours) => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};

/**
 * Generate random ID
 * @returns {string}
 */
const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

/**
 * Safely parse JSON
 * @param {string} str
 * @param {*} defaultValue
 * @returns {*}
 */
const safeJsonParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

module.exports = {
  sleep,
  hoursBetween,
  isWithinHours,
  addHours,
  generateId,
  safeJsonParse
};