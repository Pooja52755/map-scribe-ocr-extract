import Tesseract from 'tesseract.js';
import { ImagePreprocessor } from './imagePreprocessing';

export interface OCRConfig {
  language: string;
  oem: number;
  psm: number;
  tessjs_create_hocr: boolean;
  tessjs_create_tsv: boolean;
  tessjs_create_box: boolean;
  tessjs_create_unlv: boolean;
  tessjs_create_osd: boolean;
}

export interface DetectedText {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  type: 'character' | 'number';
}

export class AdvancedOCREngine {
  private preprocessor: ImagePreprocessor;
  private worker: Tesseract.Worker | null = null;

  constructor() {
    this.preprocessor = new ImagePreprocessor();
  }

  private async initializeWorker(): Promise<void> {
    if (this.worker) return;

    console.log('Initializing enhanced OCR worker...');
    this.worker = await Tesseract.createWorker('eng', 1, {
      logger: m => console.log('OCR Progress:', m),
      errorHandler: err => console.error('OCR Error:', err)
    });

    // Enhanced Tesseract parameters for cadastral maps
    await this.worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,.-() ',
      tessjs_create_hocr: '1',
      tessjs_create_tsv: '1',
      tessjs_create_box: '1',
      preserve_interword_spaces: '1',
      tessedit_do_invert: '0'
    });

    console.log('OCR worker initialized with enhanced parameters');
  }

  async processImage(imageElement: HTMLImageElement, progressCallback?: (progress: number) => void): Promise<DetectedText[]> {
    await this.initializeWorker();
    if (!this.worker) throw new Error('Failed to initialize OCR worker');

    progressCallback?.(10);

    // Enhanced preprocessing for better text detection
    const processedImageData = await this.preprocessor.processImage(imageElement);
    progressCallback?.(40);

    console.log('Starting enhanced OCR recognition...');

    // Perform OCR with multiple PSM modes for better text detection
    const recognitionResults = await Promise.all([
      this.recognizeWithPSM(processedImageData, 6), // Single uniform block
      this.recognizeWithPSM(processedImageData, 8), // Single word
      this.recognizeWithPSM(processedImageData, 7), // Single text line
    ]);

    progressCallback?.(80);

    // Combine results from different PSM modes
    const allDetectedTexts: DetectedText[] = [];
    recognitionResults.forEach((result, index) => {
      console.log(`PSM ${[6, 8, 7][index]} results:`, result.data.text);
      const extracted = this.extractAndClassifyText(result.data);
      allDetectedTexts.push(...extracted);
    });

    progressCallback?.(90);

    console.log('All detected texts before post-processing:', allDetectedTexts);

    // Enhanced post-processing for better accuracy
    const refinedResults = this.postProcessResults(allDetectedTexts);
    progressCallback?.(100);

    console.log('Final enhanced results:', refinedResults);

    return refinedResults;
  }

  private async recognizeWithPSM(imageData: string, psm: number): Promise<any> {
    if (!this.worker) throw new Error('Worker not initialized');
    
    return await this.worker.recognize(imageData, {
      rectangle: undefined,
    });
  }

  private extractAndClassifyText(data: Tesseract.Page): DetectedText[] {
    const results: DetectedText[] = [];
    
    console.log('Processing OCR data with enhanced extraction...');
    
    // Enhanced extraction from blocks structure
    if (data.blocks && data.blocks.length > 0) {
      console.log('Processing blocks structure:', data.blocks.length, 'blocks');
      
      for (const block of data.blocks) {
        if (block.paragraphs) {
          for (const paragraph of block.paragraphs) {
            if (paragraph.lines) {
              for (const line of paragraph.lines) {
                if (line.words) {
                  for (const word of line.words) {
                    if (word.confidence > 10 && word.text.trim().length > 0) {
                      const text = word.text.trim();
                      const cleanText = text.replace(/[^\w\s,.-]/g, '');
                      
                      if (cleanText.length > 0) {
                        // Enhanced classification
                        const isNumber = /^\d+$/.test(cleanText);
                        const isCharacter = /^[a-zA-Z][a-zA-Z\s,.-]*$/.test(cleanText) && cleanText.length >= 2;
                        
                        if (isNumber || isCharacter) {
                          results.push({
                            text: cleanText,
                            confidence: word.confidence,
                            bbox: word.bbox,
                            type: isNumber ? 'number' : 'character'
                          });
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Fallback: extract from main text with improved parsing
    if (results.length === 0 && data.text && data.text.trim().length > 0) {
      console.log('Using fallback text extraction');
      const lines = data.text.split('\n').filter(line => line.trim().length > 0);
      
      lines.forEach(line => {
        // Split by spaces and common delimiters
        const tokens = line.split(/[\s,]+/).filter(token => token.length > 0);
        
        tokens.forEach(token => {
          const cleanToken = token.replace(/[^\w\s,.-]/g, '').trim();
          if (cleanToken.length > 0) {
            const isNumber = /^\d+$/.test(cleanToken);
            const isCharacter = /^[a-zA-Z][a-zA-Z\s,.-]*$/.test(cleanToken) && cleanToken.length >= 2;
            
            if (isNumber || isCharacter) {
              results.push({
                text: cleanToken,
                confidence: 50, // Default confidence for fallback
                bbox: { x0: 0, y0: 0, x1: 0, y1: 0 },
                type: isNumber ? 'number' : 'character'
              });
            }
          }
        });
      });
    }

    console.log('Enhanced extraction results:', results);
    return results;
  }

  private postProcessResults(detectedTexts: DetectedText[]): DetectedText[] {
    // Enhanced duplicate removal and text merging
    const textMap = new Map<string, DetectedText>();
    
    for (const item of detectedTexts) {
      if (item.confidence > 15 && item.text.length > 0) {
        const key = `${item.text.toLowerCase()}_${item.type}`;
        
        if (!textMap.has(key) || textMap.get(key)!.confidence < item.confidence) {
          // Clean up text more thoroughly
          let cleanText = item.text
            .replace(/[^\w\s,.-]/g, '') // Remove special chars except basic punctuation
            .replace(/\s+/g, ' ')       // Normalize whitespace
            .trim();

          // Additional cleaning for names and numbers
          if (item.type === 'character') {
            cleanText = cleanText.replace(/^\W+|\W+$/g, ''); // Remove leading/trailing non-word chars
          }

          if (cleanText.length > 0) {
            textMap.set(key, {
              ...item,
              text: cleanText,
              confidence: Math.min(item.confidence, 95)
            });
          }
        }
      }
    }

    // Convert back to array and sort by confidence
    const refined = Array.from(textMap.values());
    
    // Sort by type (numbers first) then by confidence
    return refined.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'number' ? -1 : 1;
      }
      return b.confidence - a.confidence;
    });
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  // Additional method for batch processing multiple regions
  async processRegions(imageElement: HTMLImageElement, regions: Array<{x: number, y: number, width: number, height: number}>): Promise<DetectedText[]> {
    const allResults: DetectedText[] = [];
    
    for (const region of regions) {
      // Create canvas for region extraction
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = region.width;
      canvas.height = region.height;
      
      // Extract region
      ctx.drawImage(
        imageElement, 
        region.x, region.y, region.width, region.height,
        0, 0, region.width, region.height
      );
      
      // Convert to image element
      const regionImage = new Image();
      regionImage.src = canvas.toDataURL();
      
      await new Promise(resolve => {
        regionImage.onload = resolve;
      });
      
      // Process region
      const regionResults = await this.processImage(regionImage);
      
      // Adjust coordinates back to original image
      regionResults.forEach(result => {
        result.bbox.x0 += region.x;
        result.bbox.y0 += region.y;
        result.bbox.x1 += region.x;
        result.bbox.y1 += region.y;
      });
      
      allResults.push(...regionResults);
    }
    
    return this.postProcessResults(allResults);
  }
}
