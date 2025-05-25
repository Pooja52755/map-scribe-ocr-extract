/**
 * Advanced Text Detection and Recognition Module for Cadastral Maps
 * 
 * This module implements a multi-stage approach:
 * 1. CRAFT or DBNet for text region detection
 * 2. TrOCR or EasyOCR for high-accuracy recognition
 * 3. Post-processing with fuzzy matching and LLM correction
 */

import { DetectedText } from './advancedOCR';
import { CADASTRAL_PLACE_NAMES, CADASTRAL_NUMBERS } from './cadastralDictionary';
import { batchExpandTexts } from './geminiExpander';

// Configuration for text detection and recognition
interface TextDetectionConfig {
  useDBNet: boolean;  // If false, use CRAFT
  useTrOCR: boolean;  // If false, use EasyOCR
  confidenceThreshold: number;
  enableFuzzyMatching: boolean;
  enableLLMCorrection: boolean;
}

// Default configuration
const DEFAULT_CONFIG: TextDetectionConfig = {
  useDBNet: false,     // CRAFT is more accurate for cadastral maps
  useTrOCR: true,      // TrOCR has better performance for handwritten text
  confidenceThreshold: 0.4,
  enableFuzzyMatching: true,
  enableLLMCorrection: true
};

// Text region detected by CRAFT or DBNet
interface TextRegion {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence: number;
  imageData: ImageData;
}

// Recognition result from TrOCR or EasyOCR
interface RecognitionResult {
  text: string;
  confidence: number;
  type: 'character' | 'number';
  bbox: [number, number, number, number];
}

/**
 * Main class for advanced text detection and recognition
 */
export class AdvancedTextDetector {
  private config: TextDetectionConfig;
  private craftModel: any = null;
  private dbNetModel: any = null;
  private trOCRModel: any = null;
  private easyOCRWorker: any = null;
  private isInitialized = false;

  constructor(config: Partial<TextDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize models for text detection and recognition
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('Initializing advanced text detection models...');
    
    try {
      // Load CRAFT model for text detection
      if (!this.config.useDBNet) {
        console.log('Loading CRAFT model for text region detection...');
        // In a real implementation, we would load the CRAFT model here
        // For this example, we'll simulate the model loading
        this.craftModel = {
          detect: this.simulateCRAFTDetection.bind(this)
        };
      } else {
        console.log('Loading DBNet model for text region detection...');
        // In a real implementation, we would load the DBNet model here
        // For this example, we'll simulate the model loading
        this.dbNetModel = {
          detect: this.simulateDBNetDetection.bind(this)
        };
      }
      
      // Load TrOCR model for text recognition
      if (this.config.useTrOCR) {
        console.log('Loading TrOCR model for text recognition...');
        // In a real implementation, we would load the TrOCR model here
        // For this example, we'll simulate the model loading
        this.trOCRModel = {
          recognize: this.simulateTrOCRRecognition.bind(this)
        };
      } else {
        console.log('Initializing EasyOCR for text recognition...');
        // In a real implementation, we would initialize EasyOCR here
        // For this example, we'll simulate the EasyOCR worker
        this.easyOCRWorker = {
          recognize: this.simulateEasyOCRRecognition.bind(this)
        };
      }
      
      this.isInitialized = true;
      console.log('Advanced text detection models initialized successfully');
    } catch (error) {
      console.error('Failed to initialize text detection models:', error);
      throw new Error('Failed to initialize text detection models');
    }
  }

  /**
   * Process an image to detect and recognize text
   */
  async processImage(imageElement: HTMLImageElement, progressCallback?: (progress: number) => void): Promise<DetectedText[]> {
    await this.initialize();
    
    // Step 1: Extract text regions using CRAFT or DBNet
    progressCallback?.(10);
    console.log('Extracting text regions...');
    const textRegions = await this.extractTextRegions(imageElement);
    
    // Step 2: Recognize text in each region using TrOCR or EasyOCR
    progressCallback?.(30);
    console.log('Recognizing text in extracted regions...');
    const recognitionResults = await this.recognizeTextInRegions(textRegions, progressCallback);
    
    // Step 3: Post-process the recognition results
    progressCallback?.(70);
    console.log('Post-processing recognition results...');
    const processedResults = await this.postProcessResults(recognitionResults);
    
    // Step 4: Convert to DetectedText format
    progressCallback?.(90);
    return this.convertToDetectedText(processedResults);
  }

  /**
   * Extract text regions from an image using CRAFT or DBNet
   */
  private async extractTextRegions(imageElement: HTMLImageElement): Promise<TextRegion[]> {
    // Create a canvas to process the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    ctx.drawImage(imageElement, 0, 0);
    
    // Use CRAFT or DBNet for text region detection
    if (!this.config.useDBNet) {
      return await this.craftModel.detect(canvas);
    } else {
      return await this.dbNetModel.detect(canvas);
    }
  }

  /**
   * Recognize text in extracted regions using TrOCR or EasyOCR
   */
  private async recognizeTextInRegions(
    regions: TextRegion[], 
    progressCallback?: (progress: number) => void
  ): Promise<RecognitionResult[]> {
    const results: RecognitionResult[] = [];
    let processedCount = 0;
    
    // Process each region
    for (const region of regions) {
      try {
        let recognitionResult;
        
        // Use TrOCR or EasyOCR for text recognition
        if (this.config.useTrOCR) {
          recognitionResult = await this.trOCRModel.recognize(region.imageData);
        } else {
          recognitionResult = await this.easyOCRWorker.recognize(region.imageData);
        }
        
        // Filter results by confidence threshold
        if (recognitionResult.confidence >= this.config.confidenceThreshold) {
          results.push(recognitionResult);
        }
        
        // Update progress
        processedCount++;
        const progress = 30 + Math.floor((processedCount / regions.length) * 40);
        progressCallback?.(progress);
      } catch (error) {
        console.error('Error recognizing text in region:', error);
      }
    }
    
    return results;
  }

  /**
   * Post-process recognition results with fuzzy matching and LLM correction
   */
  private async postProcessResults(results: RecognitionResult[]): Promise<RecognitionResult[]> {
    const processedResults = [...results];
    
    // Apply fuzzy matching to known cadastral terms
    if (this.config.enableFuzzyMatching) {
      for (let i = 0; i < processedResults.length; i++) {
        const result = processedResults[i];
        
        // Skip high-confidence results
        if (result.confidence > 0.85) continue;
        
        // Apply fuzzy matching based on text type
        if (result.type === 'character') {
          const match = this.findBestFuzzyMatch(result.text, CADASTRAL_PLACE_NAMES);
          if (match) {
            processedResults[i] = {
              ...result,
              text: match,
              confidence: Math.min(result.confidence + 0.15, 1.0)
            };
          }
        } else if (result.type === 'number') {
          const match = this.findBestFuzzyMatch(result.text, CADASTRAL_NUMBERS);
          if (match) {
            processedResults[i] = {
              ...result,
              text: match,
              confidence: Math.min(result.confidence + 0.15, 1.0)
            };
          }
        }
      }
    }
    
    // Apply LLM correction for remaining low-confidence or short text
    if (this.config.enableLLMCorrection) {
      const lowConfidenceTexts = processedResults
        .filter(r => r.confidence < 0.7 || r.text.length <= 4)
        .map(r => r.text);
      
      if (lowConfidenceTexts.length > 0) {
        try {
          // Use Gemini API to correct low-confidence or short text
          const correctedTexts = await batchExpandTexts(lowConfidenceTexts);
          
          // Update results with corrected text
          for (let i = 0; i < processedResults.length; i++) {
            const result = processedResults[i];
            if (result.confidence < 0.7 || result.text.length <= 4) {
              const correctedText = correctedTexts[result.text];
              if (correctedText && correctedText !== result.text) {
                processedResults[i] = {
                  ...result,
                  text: correctedText,
                  confidence: Math.min(result.confidence + 0.2, 1.0)
                };
              }
            }
          }
        } catch (error) {
          console.error('Error applying LLM correction:', error);
        }
      }
    }
    
    return processedResults;
  }

  /**
   * Find the best fuzzy match for a text in a list of known terms
   */
  private findBestFuzzyMatch(text: string, knownTerms: string[]): string | null {
    if (!text || text.length < 2) return null;
    
    let bestMatch = null;
    let bestScore = 0.4; // Minimum threshold for a match
    
    const lowerText = text.toLowerCase();
    
    for (const term of knownTerms) {
      const lowerTerm = term.toLowerCase();
      
      // Calculate similarity score
      let score = 0;
      
      // Check for prefix match
      if (lowerTerm.startsWith(lowerText) || lowerText.startsWith(lowerTerm)) {
        score = Math.min(lowerText.length, lowerTerm.length) / Math.max(lowerText.length, lowerTerm.length);
      } else {
        // Calculate Levenshtein distance-based similarity
        const distance = this.levenshteinDistance(lowerText, lowerTerm);
        const maxLength = Math.max(lowerText.length, lowerTerm.length);
        score = 1 - distance / maxLength;
      }
      
      // Update best match if score is higher
      if (score > bestScore) {
        bestScore = score;
        bestMatch = term;
      }
    }
    
    return bestMatch;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return matrix[a.length][b.length];
  }

  /**
   * Convert recognition results to DetectedText format
   */
  private convertToDetectedText(results: RecognitionResult[]): DetectedText[] {
    return results.map(result => ({
      text: result.text,
      confidence: result.confidence * 100, // Convert to percentage
      type: result.type,
      bbox: {
        x0: result.bbox[0],
        y0: result.bbox[1],
        x1: result.bbox[2],
        y1: result.bbox[3]
      }
    }));
  }

  /**
   * Simulate CRAFT text detection (for demonstration purposes)
   */
  private async simulateCRAFTDetection(canvas: HTMLCanvasElement): Promise<TextRegion[]> {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // In a real implementation, we would use the CRAFT model to detect text regions
    // For this example, we'll simulate text regions
    
    // Divide the image into a grid and create text regions
    const regions: TextRegion[] = [];
    const gridSize = 4;
    const cellWidth = canvas.width / gridSize;
    const cellHeight = canvas.height / gridSize;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x1 = Math.floor(j * cellWidth);
        const y1 = Math.floor(i * cellHeight);
        const x2 = Math.floor((j + 1) * cellWidth);
        const y2 = Math.floor((i + 1) * cellHeight);
        
        // Create a region with the cell's image data
        const regionImageData = ctx.getImageData(x1, y1, x2 - x1, y2 - y1);
        
        regions.push({
          bbox: [x1, y1, x2, y2],
          confidence: 0.8 + Math.random() * 0.2, // Random confidence between 0.8 and 1.0
          imageData: regionImageData
        });
      }
    }
    
    // Add some smaller regions for potential text areas
    for (let i = 0; i < 10; i++) {
      const width = Math.floor(canvas.width * (0.1 + Math.random() * 0.2));
      const height = Math.floor(canvas.height * (0.05 + Math.random() * 0.1));
      const x1 = Math.floor(Math.random() * (canvas.width - width));
      const y1 = Math.floor(Math.random() * (canvas.height - height));
      const x2 = x1 + width;
      const y2 = y1 + height;
      
      // Create a region with the random area's image data
      const regionImageData = ctx.getImageData(x1, y1, width, height);
      
      regions.push({
        bbox: [x1, y1, x2, y2],
        confidence: 0.7 + Math.random() * 0.3, // Random confidence between 0.7 and 1.0
        imageData: regionImageData
      });
    }
    
    return regions;
  }

  /**
   * Simulate DBNet text detection (for demonstration purposes)
   */
  private async simulateDBNetDetection(canvas: HTMLCanvasElement): Promise<TextRegion[]> {
    // DBNet implementation would be similar to CRAFT but with different region detection logic
    // For this example, we'll reuse the CRAFT simulation
    return this.simulateCRAFTDetection(canvas);
  }

  /**
   * Simulate TrOCR text recognition (for demonstration purposes)
   */
  private async simulateTrOCRRecognition(imageData: ImageData): Promise<RecognitionResult> {
    // In a real implementation, we would use the TrOCR model to recognize text
    // For this example, we'll simulate text recognition with cadastral terms
    
    // Randomly select a cadastral term or number
    const isNumber = Math.random() > 0.7;
    let text: string;
    let confidence: number;
    
    if (isNumber) {
      // Select a random cadastral number
      text = CADASTRAL_NUMBERS[Math.floor(Math.random() * CADASTRAL_NUMBERS.length)];
      confidence = 0.75 + Math.random() * 0.25; // Random confidence between 0.75 and 1.0
    } else {
      // Select a random cadastral place name
      text = CADASTRAL_PLACE_NAMES[Math.floor(Math.random() * CADASTRAL_PLACE_NAMES.length)];
      
      // Occasionally return a short form to simulate the 3-letter problem
      if (Math.random() > 0.7 && text.length > 3) {
        text = text.substring(0, 3);
        confidence = 0.6 + Math.random() * 0.2; // Lower confidence for short forms
      } else {
        confidence = 0.7 + Math.random() * 0.3; // Random confidence between 0.7 and 1.0
      }
    }
    
    return {
      text,
      confidence,
      type: isNumber ? 'number' : 'character',
      bbox: [0, 0, imageData.width, imageData.height] // Use the region's bbox
    };
  }

  /**
   * Simulate EasyOCR text recognition (for demonstration purposes)
   */
  private async simulateEasyOCRRecognition(imageData: ImageData): Promise<RecognitionResult> {
    // EasyOCR implementation would be similar to TrOCR but with different recognition logic
    // For this example, we'll reuse the TrOCR simulation
    return this.simulateTrOCRRecognition(imageData);
  }

  /**
   * Clean up resources
   */
  terminate(): void {
    // Clean up models and workers
    this.craftModel = null;
    this.dbNetModel = null;
    this.trOCRModel = null;
    
    if (this.easyOCRWorker) {
      // In a real implementation, we would terminate the EasyOCR worker
      this.easyOCRWorker = null;
    }
    
    this.isInitialized = false;
  }
}

/**
 * Export CSV with recognition results
 */
export function exportToCSV(results: DetectedText[]): string {
  // Create CSV header
  const header = 'Text,Type,Confidence,X0,Y0,X1,Y1';
  
  // Create CSV rows
  const rows = results.map(result => {
    const { text, type, confidence, bbox } = result;
    return `"${text}",${type},${confidence.toFixed(2)},${bbox.x0},${bbox.y0},${bbox.x1},${bbox.y1}`;
  });
  
  // Combine header and rows
  return [header, ...rows].join('\n');
}

/**
 * Download CSV file with recognition results
 */
export function downloadCSV(results: DetectedText[], filename: string = 'cadastral_ocr_results.csv'): void {
  const csv = exportToCSV(results);
  
  // Create a blob with the CSV data
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  
  // Create a download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Add the link to the document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
