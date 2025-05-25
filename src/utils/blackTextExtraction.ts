/**
 * Black Text Extraction Module for Cadastral Maps
 * 
 * This module specifically targets black text and numbers in cadastral maps
 * using color-based filtering and enhanced preprocessing.
 */

// Configuration for black text extraction
interface BlackTextExtractionConfig {
  blackThreshold: number;      // Threshold for black color (0-255)
  contrastEnhancement: number; // Factor for contrast enhancement
  removeNoise: boolean;        // Whether to apply noise removal
  morphologicalOps: boolean;   // Whether to apply morphological operations
}

// Default configuration optimized for cadastral maps
const DEFAULT_CONFIG: BlackTextExtractionConfig = {
  blackThreshold: 80,         // Pixels darker than this are considered black
  contrastEnhancement: 1.8,   // Increase contrast to make black text stand out
  removeNoise: true,          // Remove noise to improve text extraction
  morphologicalOps: true      // Apply morphological operations to enhance text
};

/**
 * Extract only black text from an image
 */
export function extractBlackText(
  imageElement: HTMLImageElement,
  config: Partial<BlackTextExtractionConfig> = {}
): HTMLCanvasElement {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Create a canvas to process the image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Set canvas size
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  
  // Draw the original image
  ctx.drawImage(imageElement, 0, 0);
  
  // Get image data for processing
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Extract black text
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Check if the pixel is black (all RGB values below threshold)
    const isBlack = r < fullConfig.blackThreshold && 
                   g < fullConfig.blackThreshold && 
                   b < fullConfig.blackThreshold;
    
    // Keep only black pixels, make everything else white
    if (isBlack) {
      // Make it pure black for better OCR
      data[i] = data[i + 1] = data[i + 2] = 0;
    } else {
      // Make it pure white
      data[i] = data[i + 1] = data[i + 2] = 255;
    }
  }
  
  // Apply contrast enhancement if needed
  if (fullConfig.contrastEnhancement > 1.0) {
    applyContrastEnhancement(data, fullConfig.contrastEnhancement);
  }
  
  // Apply noise removal if needed
  if (fullConfig.removeNoise) {
    applyNoiseRemoval(data, canvas.width, canvas.height);
  }
  
  // Apply morphological operations if needed
  if (fullConfig.morphologicalOps) {
    applyMorphologicalOperations(data, canvas.width, canvas.height);
  }
  
  // Put processed image data back to canvas
  ctx.putImageData(imageData, 0, 0);
  
  return canvas;
}

/**
 * Apply contrast enhancement to image data
 */
function applyContrastEnhancement(data: Uint8ClampedArray, factor: number): void {
  const intercept = 128 * (1 - factor);
  
  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast enhancement formula
    data[i] = Math.min(255, Math.max(0, data[i] * factor + intercept));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor + intercept));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor + intercept));
  }
}

/**
 * Apply noise removal to image data
 */
function applyNoiseRemoval(data: Uint8ClampedArray, width: number, height: number): void {
  // Create a copy of the data for processing
  const tempData = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i++) {
    tempData[i] = data[i];
  }
  
  // Apply median filter (3x3) to remove salt and pepper noise
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Get 3x3 neighborhood for each channel
      const neighborhood = [];
      
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const neighborIdx = ((y + j) * width + (x + i)) * 4;
          neighborhood.push(tempData[neighborIdx]);
        }
      }
      
      // Sort and get median
      neighborhood.sort((a, b) => a - b);
      const median = neighborhood[4]; // Middle value of 9 elements
      
      // Apply median to all channels (R, G, B)
      data[idx] = data[idx + 1] = data[idx + 2] = median;
    }
  }
}

/**
 * Apply morphological operations to enhance text
 */
function applyMorphologicalOperations(data: Uint8ClampedArray, width: number, height: number): void {
  // Create a copy of the data for processing
  const tempData = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i++) {
    tempData[i] = data[i];
  }
  
  // Apply dilation to enhance text (make it thicker)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // If the current pixel is black
      if (tempData[idx] === 0) {
        // Set all neighbors to black
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const neighborIdx = ((y + j) * width + (x + i)) * 4;
            data[neighborIdx] = data[neighborIdx + 1] = data[neighborIdx + 2] = 0;
          }
        }
      }
    }
  }
}

/**
 * Create specialized versions for text and number extraction
 */
export function createBlackTextVersions(imageElement: HTMLImageElement): {
  textVersion: HTMLCanvasElement;
  numberVersion: HTMLCanvasElement;
} {
  // Version optimized for text
  const textVersion = extractBlackText(imageElement, {
    blackThreshold: 80,
    contrastEnhancement: 1.8,
    removeNoise: true,
    morphologicalOps: true
  });
  
  // Version optimized for numbers
  const numberVersion = extractBlackText(imageElement, {
    blackThreshold: 70,  // Slightly lower threshold for numbers
    contrastEnhancement: 2.0,  // Higher contrast for numbers
    removeNoise: true,
    morphologicalOps: false  // No morphological ops for numbers to preserve shapes
  });
  
  return { textVersion, numberVersion };
}

/**
 * Check if a detected text is likely a duplicate of another
 */
export function isDuplicate(text1: string, text2: string): boolean {
  // Normalize both texts
  const normalized1 = text1.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const normalized2 = text2.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  
  // Check for exact match
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Check for substring relationship
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  // Check for high similarity
  if (normalized1.length > 0 && normalized2.length > 0) {
    const similarity = calculateSimilarity(normalized1, normalized2);
    return similarity > 0.8; // 80% similarity threshold
  }
  
  return false;
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
 * Remove duplicates from a list of detected texts
 */
export function removeDuplicates(texts: string[]): string[] {
  const result: string[] = [];
  
  for (const text of texts) {
    // Skip empty or very short texts
    if (!text || text.length < 2) continue;
    
    // Check if it's a duplicate of any existing text
    const isDup = result.some(existingText => isDuplicate(text, existingText));
    
    // Add only if not a duplicate
    if (!isDup) {
      result.push(text);
    }
  }
  
  return result;
}
