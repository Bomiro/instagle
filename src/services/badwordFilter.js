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

let badWords = [];
try {
  const badWordsPath = path.resolve(__dirname, '..', 'badwords.json');
  const raw = fs.readFileSync(badWordsPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    badWords = parsed.map((w) => w.toLowerCase());
  }
} catch (err) {
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

  // 1. هروب الحروف الخاصة بالـ Regex لحماية النمط
  const escaped = badWords
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  // 2. استخدام الـ Unicode boundaries بدلاً من \b لدعم اللغة العربية
  // فكرة النمط: تأكد أن الكلمة غير مسبوقة بحرف (\p{L}) وغير متبوعة بحرف (\p{L})
  // علم 'u' ضروري جداً لتفعيل خاصية الـ Unicode في الـ Regex
  const regex = new RegExp(`(?<!\\p{L})(${escaped})(?!\\p{L})`, 'gui');

  // Replace each match with asterisks of the same length.
  return text.replace(regex, (match) => '*'.repeat(match.length));
}

module.exports = {
  cleanText,
};