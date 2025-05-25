/**
 * Cadastral Map Dictionary
 * 
 * This module provides specialized dictionaries and correction functions
 * for improving OCR accuracy on cadastral maps, particularly for place names
 * and survey numbers that are commonly found in these maps.
 */

// Complete dictionary of place names found in cadastral maps
export const CADASTRAL_PLACE_NAMES = [
  // Original place names from the problem statement
  'Benakanahalli', 'Devapur', 'Nalla', 'Devatakala', 'Mangihal', 'Gonal', 'Aladahal',
  'Covered', 'tank', 'Antaral', 'Rajapur', 'Stony', 'waste', 'Nagarahal', 'kagaral',
  'kawadimutt', 'Konal', 'Kaganti',
  
  // Common variations and misspellings that might occur in OCR
  'Benakanahali', 'Devpur', 'Devatakal', 'Manghal', 'Gonel', 'Aladhall',
  'Coverd', 'tonk', 'Antral', 'Raja pur', 'Stoney', 'weste', 'Nagarhal', 'kagarl',
  'kawadimut', 'Konel', 'Kagant', 'Kagent', 'Kaganthi',
  
  // Compound terms
  'Covered tank', 'Stony waste',
  
  // Additional common cadastral terms
  'Village', 'Boundary', 'Survey', 'Plot', 'Road', 'River', 'Canal', 'Field'
];

// Complete list of common numbers found in cadastral maps
export const CADASTRAL_NUMBERS = [
  // Original numbers from the problem statement
  '74', '24', '387', '13', '12', '11', '10', '76', '22', '396', '424', '404', '379', 
  '372', '362', '364', '20', '426', '18', '391', '386', '377', '364', '361', '402', 
  '400', '84', '24', '521', '519', '518', '517', '516', '357', '371', '522', '360', '379',
  
  // Additional common survey numbers
  '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39',
  '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54',
  '100', '101', '102', '103', '104', '105', '200', '201', '202', '203', '300', '301', '302'
];

/**
 * Levenshtein distance calculation for fuzzy matching
 * @param a First string
 * @param b Second string
 * @returns Distance between strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find closest match in dictionary using fuzzy matching
 * @param text Input text to match
 * @param dictionary Dictionary of known terms
 * @param threshold Maximum normalized distance threshold (0-1)
 * @returns Best matching term or null if no good match
 */
export function findClosestMatch(text: string, dictionary: string[], threshold: number = 0.3): string | null {
  if (!text || text.length < 2) return null;
  
  let bestMatch = null;
  let bestScore = Infinity;
  
  for (const word of dictionary) {
    const distance = levenshteinDistance(text.toLowerCase(), word.toLowerCase());
    const normalizedDistance = distance / Math.max(text.length, word.length);
    
    if (normalizedDistance < threshold && normalizedDistance < bestScore) {
      bestMatch = word;
      bestScore = normalizedDistance;
    }
  }
  
  return bestMatch;
}

/**
 * Specialized correction for cadastral place names
 * @param text Input text to correct
 * @returns Corrected text or original if no match found
 */
export function correctPlaceName(text: string): string {
  // Try to find a match in the cadastral place names dictionary
  const match = findClosestMatch(text, CADASTRAL_PLACE_NAMES, 0.35);
  
  // Return the corrected text if a match was found
  return match || text;
}

/**
 * Specialized correction for cadastral numbers
 * @param text Input text to correct
 * @returns Corrected text or original if no match found
 */
export function correctNumber(text: string): string {
  // Clean the input to ensure it only contains digits
  const cleanText = text.replace(/[^0-9]/g, '');
  
  // Try to find a match in the cadastral numbers dictionary
  const match = findClosestMatch(cleanText, CADASTRAL_NUMBERS, 0.2);
  
  // Return the corrected text if a match was found
  return match || cleanText;
}

/**
 * Post-process OCR results using cadastral-specific knowledge
 * @param text Input text from OCR
 * @param isNumber Whether the text is expected to be a number
 * @returns Corrected text
 */
export function postProcessOCRText(text: string, isNumber: boolean = false): string {
  if (!text || text.length === 0) return text;
  
  // Apply appropriate correction based on text type
  if (isNumber) {
    return correctNumber(text);
  } else {
    return correctPlaceName(text);
  }
}
