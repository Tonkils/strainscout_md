/**
 * Basic profanity filter for user-generated content.
 * Uses a word list + pattern matching approach.
 * Returns { clean: boolean, flaggedWords: string[] }.
 *
 * Design decisions:
 * - Cannabis-related terms are NOT flagged (this is a cannabis app)
 * - Only flags clearly offensive/hateful/spam content
 * - Checks for common evasion patterns (l33t speak, spacing)
 * - Returns flagged words for moderation context
 */

// Offensive words list — kept short and focused on clearly unacceptable content.
// Cannabis terms (weed, bud, dank, etc.) are intentionally excluded.
const BLOCKED_WORDS = [
  // Slurs and hate speech (abbreviated patterns to match variations)
  "nigger", "nigga", "faggot", "retard", "tranny",
  "kike", "spic", "chink", "wetback", "beaner",
  // Extreme profanity
  "fuck", "shit", "cunt", "bitch", "asshole",
  "motherfucker", "cocksucker", "bullshit",
  // Spam/scam patterns
  "buy now", "click here", "free money", "act now",
  "limited time offer", "congratulations you won",
];

// L33t speak substitutions for evasion detection
const LEET_MAP: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s",
  "7": "t", "@": "a", "$": "s", "!": "i",
};

/**
 * Normalize text for comparison:
 * - Lowercase
 * - Replace l33t speak characters
 * - Remove repeated characters (e.g., "fuuuck" → "fuck")
 * - Remove spaces between single characters (e.g., "f u c k" → "fuck")
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();

  // Replace l33t speak
  for (const [leet, char] of Object.entries(LEET_MAP)) {
    normalized = normalized.replaceAll(leet, char);
  }

  // Remove common separator characters used to evade filters
  normalized = normalized.replace(/[.\-_*#]/g, "");

  // Collapse repeated characters (3+ → 1)
  normalized = normalized.replace(/(.)\1{2,}/g, "$1");

  return normalized;
}

/**
 * Check if text contains single-character-spaced words (e.g., "f u c k")
 */
function checkSpacedWords(text: string): string[] {
  const flagged: string[] = [];
  // Remove all spaces and check against blocked words
  const noSpaces = text.toLowerCase().replace(/\s+/g, "");
  for (const word of BLOCKED_WORDS) {
    const cleanWord = word.replace(/\s+/g, "");
    if (noSpaces.includes(cleanWord)) {
      flagged.push(word);
    }
  }
  return flagged;
}

export interface ProfanityResult {
  /** Whether the content is clean (no profanity detected) */
  clean: boolean;
  /** List of flagged words/patterns found */
  flaggedWords: string[];
  /** The original content */
  original: string;
}

/**
 * Check text content for profanity.
 * Returns clean=true if no issues found.
 */
export function checkProfanity(text: string): ProfanityResult {
  if (!text || text.trim().length === 0) {
    return { clean: true, flaggedWords: [], original: text };
  }

  const flaggedWords: Set<string> = new Set();
  const normalized = normalizeText(text);

  // Check each blocked word against normalized text
  for (const word of BLOCKED_WORDS) {
    const normalizedWord = normalizeText(word);
    // Word boundary check — look for the word not embedded in a longer word
    // Use a simple includes check for multi-word phrases
    if (word.includes(" ")) {
      if (normalized.includes(normalizedWord)) {
        flaggedWords.add(word);
      }
    } else {
      // For single words, check with rough word boundaries
      const regex = new RegExp(`(?:^|[^a-z])${normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z]|$)`);
      if (regex.test(normalized)) {
        flaggedWords.add(word);
      }
    }
  }

  // Also check for spaced-out evasion patterns
  const spacedFlags = checkSpacedWords(text);
  for (const w of spacedFlags) {
    flaggedWords.add(w);
  }

  return {
    clean: flaggedWords.size === 0,
    flaggedWords: Array.from(flaggedWords),
    original: text,
  };
}

/**
 * Sanitize text by replacing flagged words with asterisks.
 * Useful for displaying content that was flagged but approved by a moderator.
 */
export function sanitizeText(text: string): string {
  let sanitized = text;
  for (const word of BLOCKED_WORDS) {
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi");
    sanitized = sanitized.replace(regex, "*".repeat(word.length));
  }
  return sanitized;
}
