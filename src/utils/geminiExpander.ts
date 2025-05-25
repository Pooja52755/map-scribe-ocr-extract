/**
 * Gemini API Text Expander for Cadastral Maps
 * 
 * This module uses Google's Gemini API to expand short text fragments
 * into full cadastral map terminology.
 */

// Cadastral map dictionary for local expansion (faster than API calls)
import { CADASTRAL_PLACE_NAMES, CADASTRAL_NUMBERS } from './cadastralDictionary';

// API key for Gemini
const GEMINI_API_KEY = 'AIzaSyBe283Q5Jl4TsLtIR-hYBxa1wCa-kDz3Kw';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Cache for previous expansions to avoid redundant API calls
const expansionCache = new Map<string, string>();

// Initialize cache with known cadastral terms
function initializeCache() {
  // Add all known place names to cache
  CADASTRAL_PLACE_NAMES.forEach(name => {
    // Add full name
    expansionCache.set(name.toLowerCase(), name);
    
    // Add first 3 letters as key
    if (name.length > 3) {
      expansionCache.set(name.substring(0, 3).toLowerCase(), name);
    }
  });
  
  // Add all known numbers to cache
  CADASTRAL_NUMBERS.forEach(num => {
    expansionCache.set(num, num);
  });
  
  // Add common abbreviations and variations
  const commonMappings: Record<string, string> = {
    'ben': 'Benakanahalli',
    'dev': 'Devapur',
    'nal': 'Nalla',
    'man': 'Mangihal',
    'gon': 'Gonal',
    'ala': 'Aladahal',
    'cov': 'Covered tank',
    'ant': 'Antaral',
    'raj': 'Rajapur',
    'sto': 'Stony waste',
    'nag': 'Nagarahal',
    'kag': 'Kaganti',
    'kaw': 'kawadimutt',
    'kon': 'Konal',
    'deva': 'Devatakala',
  };
  
  // Add all common mappings to cache
  Object.entries(commonMappings).forEach(([abbr, full]) => {
    expansionCache.set(abbr, full);
  });
}

// Initialize cache on module load
initializeCache();

/**
 * Expand text using local cache (fast)
 */
function expandWithLocalCache(text: string): string | null {
  // Check if we have this exact text in cache
  const lowerText = text.toLowerCase();
  if (expansionCache.has(lowerText)) {
    return expansionCache.get(lowerText)!;
  }
  
  // Try to find the best match in the cache
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [key, value] of expansionCache.entries()) {
    // Check if the text starts with the key or vice versa
    if (lowerText.startsWith(key) || key.startsWith(lowerText)) {
      const score = Math.min(lowerText.length, key.length) / Math.max(lowerText.length, key.length);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = value;
      }
    }
  }
  
  // Return best match if score is good enough
  if (bestScore > 0.5) {
    return bestMatch;
  }
  
  return null;
}

/**
 * Expand text using Gemini API (slower but more accurate)
 */
async function expandWithGemini(text: string): Promise<string> {
  try {
    // Prepare the prompt for Gemini
    const prompt = `
You are a specialized cadastral map text expander. Your task is to expand abbreviated or incomplete text from cadastral maps into their full form.

The text is from a cadastral map in India and might be a place name or a number. Here are examples of full cadastral terms:
- Place names: Benakanahalli, Devapur, Nalla, Devatakala, Mangihal, Gonal, Aladahal, Covered tank, Antaral, Rajapur, Stony waste, Nagarahal, kagaral, kawadimutt, Konal, Kaganti
- Numbers: 74, 24, 387, 13, 12, 11, 10, 76, 22, 396, 424, 404, 379, 372, 362, 364, 20, 426, 18, 391, 386, 377, 364, 361, 402, 400

Given the text fragment "${text}", what is the most likely full cadastral term it represents? 
Return ONLY the expanded term with no explanation or additional text. If you're not confident, return the original text.
`;

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 20,
        }
      })
    });

    // Parse response
    const data = await response.json();
    
    // Extract the generated text
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || text;
    
    // Clean up the response (remove quotes, extra spaces, etc.)
    const cleanText = generatedText.trim().replace(/^["']|["']$/g, '');
    
    // Cache the result for future use
    expansionCache.set(text.toLowerCase(), cleanText);
    
    return cleanText;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return text; // Return original text on error
  }
}

/**
 * Batch expand multiple texts at once (more efficient)
 */
export async function batchExpandTexts(texts: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const apiCalls: Array<Promise<void>> = [];
  
  // First try local cache for all texts
  for (const text of texts) {
    // Skip very short texts or numbers
    if (text.length < 2 || /^\d+$/.test(text)) {
      results[text] = text;
      continue;
    }
    
    // Try local cache first
    const localExpansion = expandWithLocalCache(text);
    if (localExpansion) {
      results[text] = localExpansion;
    } else {
      // Need to use API
      apiCalls.push(
        expandWithGemini(text).then(expanded => {
          results[text] = expanded;
        })
      );
    }
  }
  
  // Wait for all API calls to complete
  if (apiCalls.length > 0) {
    await Promise.all(apiCalls);
  }
  
  return results;
}

/**
 * Expand a single text (convenience method)
 */
export async function expandText(text: string): Promise<string> {
  // Try local cache first (fast)
  const localExpansion = expandWithLocalCache(text);
  if (localExpansion) {
    return localExpansion;
  }
  
  // Fall back to API
  return expandWithGemini(text);
}

/**
 * Optimize the expansion process to reduce processing time
 * This is a synchronous version that only uses the local cache
 */
export function fastExpandText(text: string): string {
  // For numbers, just return as is
  if (/^\d+$/.test(text)) {
    return text;
  }
  
  // For very short texts, try local expansion
  const localExpansion = expandWithLocalCache(text);
  if (localExpansion) {
    return localExpansion;
  }
  
  // If no match, return original
  return text;
}
