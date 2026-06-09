/**
 * Bad word filter utility.
 *
 * Loads a list of profane words from `src/badwords.json` and provides a
 * `cleanText` function that replaces any occurrence of a bad word with a
 * string of asterisks of the same length. Matching is case‑insensitive and
 * works for both Latin and Arabic characters present in the supplied list.
 */

const fs = require('fs');
const path = require('path');

// Load bad words once at module initialization. The JSON file contains an
// array of strings. We normalise each entry to lower‑case for case‑insensitive
// comparison.
let badWords = [];
try {
  const badWordsPath = path.resolve(__dirname, '..', 'badwords.json');
  const raw = fs.readFileSync(badWordsPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    badWords = parsed.map((w) => w.toLowerCase());
  }
} catch (err) {
  // If the file cannot be read we fail silently – the filter will simply do
  // nothing. This mirrors typical production behaviour where the service
  // should not crash the whole app because of a missing optional file.
  console.error('Failed to load badwords.json:', err.message);
}

/**
 * Replace each bad word in the supplied text with asterisks.
 *
 * @param {string} text - Input text that may contain profanities.
 * @returns {string} - The cleaned text.
 */
function cleanText(text) {
  if (typeof text !== 'string' || badWords.length === 0) return text;

  // Build a regular expression that matches any of the bad words.
  // We escape special regex characters in each word to avoid unintended
  // patterns, then join them with the alternation operator '|'.
  const escaped = badWords
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const regex = new RegExp(`\\b(${escaped})\\b`, 'gi');

  // Replace each match with asterisks of the same length.
  return text.replace(regex, (match) => '*'.repeat(match.length));
}

module.exports = {
  cleanText,
};
