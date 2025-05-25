/**
 * Multi-Engine OCR Module with Improved Performance
 * 
 * Combines multiple OCR engines with optimized settings:
 * - PaddleOCR with angle classification
 * - EasyOCR with custom settings
 * - Tesseract with PSM 11
 * - High confidence filtering
 */

import { DetectedText } from './advancedOCR';
import { removeDuplicates, isDuplicate } from './blackTextExtraction';
import { CADASTRAL_PLACE_NAMES, CADASTRAL_NUMBERS } from './cadastralDictionary';

// Configuration for multi-engine OCR
export interface MultiEngineOCRConfig {
  usePaddleOCR: boolean;
  useEasyOCR: boolean;
  useTesseract: boolean;
  confidenceThreshold: number;
  paddleOCRUseAngleClassification: boolean;
  tesseractPSM: number;
  filterByConfidence: boolean;
  applyFuzzyMatching: boolean;
}

// Default configuration
export const DEFAULT_CONFIG: MultiEngineOCRConfig = {
  usePaddleOCR: true,
  useEasyOCR: true,
  useTesseract: true,
  confidenceThreshold: 0.85, // High confidence threshold as recommended
  paddleOCRUseAngleClassification: true, // For rotated text
  tesseractPSM: 11, // PSM 11 as recommended
  filterByConfidence: true,
  applyFuzzyMatching: true
};

/**
 * Process an image with multiple OCR engines
 */
export async function processWithMultipleEngines(
  imageBase64: string,
  config: Partial<MultiEngineOCRConfig> = {}
): Promise<DetectedText[]> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const results: DetectedText[] = [];
  
  try {
    // Run OCR engines in parallel
    const promises: Promise<DetectedText[]>[] = [];
    
    if (fullConfig.usePaddleOCR) {
      promises.push(processWithPaddleOCR(imageBase64, fullConfig.paddleOCRUseAngleClassification));
    }
    
    if (fullConfig.useEasyOCR) {
      promises.push(processWithEasyOCR(imageBase64));
    }
    
    if (fullConfig.useTesseract) {
      promises.push(processWithTesseract(imageBase64, fullConfig.tesseractPSM));
    }
    
    // Wait for all OCR engines to complete
    const allResults = await Promise.all(promises);
    
    // Combine results
    for (const engineResults of allResults) {
      results.push(...engineResults);
    }
    
    // Filter by confidence if enabled
    const filteredResults = fullConfig.filterByConfidence
      ? results.filter(result => result.confidence >= fullConfig.confidenceThreshold * 100)
      : results;
    
    // Apply fuzzy matching if enabled
    if (fullConfig.applyFuzzyMatching) {
      return applyFuzzyMatching(filteredResults);
    }
    
    return filteredResults;
  } catch (error) {
    console.error('Error in multi-engine OCR:', error);
    return [];
  }
}

/**
 * Process an image with PaddleOCR
 */
async function processWithPaddleOCR(
  imageBase64: string,
  useAngleClassification: boolean = true
): Promise<DetectedText[]> {
  // In a real implementation, we would call PaddleOCR API here
  // For this example, we'll simulate PaddleOCR results
  console.log('Processing with PaddleOCR (use_angle_cls=' + useAngleClassification + ')...');
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return simulateOCRResults('PaddleOCR', 90, 95);
}

/**
 * Process an image with EasyOCR
 */
async function processWithEasyOCR(imageBase64: string): Promise<DetectedText[]> {
  // In a real implementation, we would call EasyOCR API here
  // For this example, we'll simulate EasyOCR results
  console.log('Processing with EasyOCR...');
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 700));
  
  return simulateOCRResults('EasyOCR', 85, 92);
}

/**
 * Process an image with Tesseract (PSM 11)
 */
async function processWithTesseract(
  imageBase64: string,
  psm: number = 11
): Promise<DetectedText[]> {
  // In a real implementation, we would call Tesseract API here
  // For this example, we'll simulate Tesseract results
  console.log('Processing with Tesseract (PSM ' + psm + ')...');
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  return simulateOCRResults('Tesseract', 80, 90);
}

/**
 * Simulate OCR results for demonstration purposes
 */
function simulateOCRResults(
  engine: string,
  minConfidence: number,
  maxConfidence: number
): DetectedText[] {
  const results: DetectedText[] = [];
  
  // Add some place names
  for (let i = 0; i < Math.floor(Math.random() * 5) + 5; i++) {
    const randomIndex = Math.floor(Math.random() * CADASTRAL_PLACE_NAMES.length);
    const placeName = CADASTRAL_PLACE_NAMES[randomIndex];
    
    results.push({
      text: placeName,
      confidence: minConfidence + Math.random() * (maxConfidence - minConfidence),
      type: 'character',
      bbox: {
        x0: Math.random() * 500,
        y0: Math.random() * 500,
        x1: Math.random() * 500 + 500,
        y1: Math.random() * 500 + 500
      }
    });
  }
  
  // Add some numbers
  for (let i = 0; i < Math.floor(Math.random() * 8) + 8; i++) {
    const randomIndex = Math.floor(Math.random() * CADASTRAL_NUMBERS.length);
    const number = CADASTRAL_NUMBERS[randomIndex];
    
    results.push({
      text: number,
      confidence: minConfidence + Math.random() * (maxConfidence - minConfidence),
      type: 'number',
      bbox: {
        x0: Math.random() * 500,
        y0: Math.random() * 500,
        x1: Math.random() * 500 + 500,
        y1: Math.random() * 500 + 500
      }
    });
  }
  
  return results;
}

/**
 * Apply fuzzy matching to OCR results
 */
function applyFuzzyMatching(results: DetectedText[]): DetectedText[] {
  const matchedResults: DetectedText[] = [];
  
  for (const result of results) {
    if (result.type === 'character') {
      // Try to match with known place names
      const bestMatch = findBestMatch(result.text, CADASTRAL_PLACE_NAMES);
      
      if (bestMatch) {
        matchedResults.push({
          ...result,
          text: bestMatch,
          confidence: Math.min(result.confidence + 5, 100) // Boost confidence slightly
        });
      } else {
        matchedResults.push(result);
      }
    } else if (result.type === 'number') {
      // Try to match with known numbers
      const bestMatch = findBestMatch(result.text, CADASTRAL_NUMBERS);
      
      if (bestMatch) {
        matchedResults.push({
          ...result,
          text: bestMatch,
          confidence: Math.min(result.confidence + 5, 100) // Boost confidence slightly
        });
      } else {
        // Ensure it's a valid number
        if (/^\d+$/.test(result.text)) {
          matchedResults.push(result);
        }
      }
    }
  }
  
  // Remove duplicates
  const uniqueResults: DetectedText[] = [];
  const seenTexts = new Set<string>();
  
  for (const result of matchedResults) {
    const key = `${result.text.toLowerCase()}_${result.type}`;
    
    if (!seenTexts.has(key)) {
      seenTexts.add(key);
      uniqueResults.push(result);
    }
  }
  
  return uniqueResults;
}

/**
 * Find the best match for a text in a list of known terms
 */
function findBestMatch(text: string, knownTerms: string[]): string | null {
  if (!text || text.length < 2) return null;
  
  // Normalize the text
  const normalizedText = text.toLowerCase().trim();
  
  // Check for exact match
  for (const term of knownTerms) {
    if (term.toLowerCase() === normalizedText) {
      return term;
    }
  }
  
  // Check for partial match
  for (const term of knownTerms) {
    if (term.toLowerCase().includes(normalizedText) || 
        normalizedText.includes(term.toLowerCase())) {
      return term;
    }
  }
  
  // Check for fuzzy match
  let bestMatch = null;
  let bestScore = 0.7; // Minimum threshold for a match
  
  for (const term of knownTerms) {
    const score = calculateSimilarity(normalizedText, term.toLowerCase());
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = term;
    }
  }
  
  return bestMatch;
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  // Use Levenshtein distance for similarity
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  
  // Convert distance to similarity (0-1)
  return 1 - distance / maxLength;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create distance matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return dp[m][n];
}

/**
 * Process image tiles with multiple OCR engines
 */
export async function processTilesWithMultipleEngines(
  tiles: HTMLCanvasElement[],
  config: Partial<MultiEngineOCRConfig> = {}
): Promise<DetectedText[]> {
  const allResults: DetectedText[] = [];
  
  // Process each tile
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    
    // Convert tile to base64
    const base64 = tile.toDataURL('image/png').split(',')[1];
    
    // Process with multiple engines
    const tileResults = await processWithMultipleEngines(base64, config);
    
    // Adjust bounding box coordinates to account for tile position
    // (In a real implementation, we would need to track tile positions)
    
    // Add to results
    allResults.push(...tileResults);
  }
  
  // Remove duplicates across tiles
  const uniqueResults: DetectedText[] = [];
  const seenTexts = new Set<string>();
  
  for (const result of allResults) {
    const key = `${result.text.toLowerCase()}_${result.type}`;
    
    if (!seenTexts.has(key)) {
      seenTexts.add(key);
      uniqueResults.push(result);
    }
  }
  
  return uniqueResults;
}
