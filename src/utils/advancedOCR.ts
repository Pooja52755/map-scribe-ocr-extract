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

    this.worker = await Tesseract.createWorker('eng', 1, {
      logger: m => console.log('OCR Progress:', m),
      errorHandler: err => console.error('OCR Error:', err)
    });

    // Optimize Tesseract parameters for cadastral maps
    await this.worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,. ',
      tessjs_create_hocr: '1',
      tessjs_create_tsv: '1',
      tessjs_create_box: '1'
    });

    // Set PSM and OEM separately using the recognize options
  }

  async processImage(imageElement: HTMLImageElement, progressCallback?: (progress: number) => void): Promise<DetectedText[]> {
    await this.initializeWorker();
    if (!this.worker) throw new Error('Failed to initialize OCR worker');

    progressCallback?.(10);

    // Preprocess image for better OCR accuracy
    const processedImageData = await this.preprocessor.processImage(imageElement);
    progressCallback?.(30);

    // Perform OCR with high accuracy settings
    const { data } = await this.worker.recognize(processedImageData, {
      rectangle: undefined
    });

    progressCallback?.(70);

    console.log('OCR Raw Data:', data);
    console.log('OCR Text:', data.text);

    // Extract and classify detected text
    const detectedTexts = this.extractAndClassifyText(data);
    progressCallback?.(90);

    console.log('Detected texts before post-processing:', detectedTexts);

    // Post-process results for better accuracy
    const refinedResults = this.postProcessResults(detectedTexts);
    progressCallback?.(100);

    console.log('Final refined results:', refinedResults);

    return refinedResults;
  }

  private extractAndClassifyText(data: Tesseract.Page): DetectedText[] {
    const results: DetectedText[] = [];
    
    console.log('Processing OCR data structure:', data);
    
    // First, try to extract from the main text if available
    if (data.text && data.text.trim().length > 0) {
      const lines = data.text.split('\n').filter(line => line.trim().length > 0);
      console.log('Found text lines:', lines);
      
      lines.forEach(line => {
        const words = line.trim().split(/\s+/).filter(word => word.length > 0);
        words.forEach(word => {
          const cleanWord = word.replace(/[^\w\s,.-]/g, '').trim();
          if (cleanWord.length > 0) {
            const isNumber = /^\d+$/.test(cleanWord);
            const isCharacter = /^[a-zA-Z\s,.-]+$/.test(cleanWord) && cleanWord.length > 1;
            
            if (isNumber || isCharacter) {
              results.push({
                text: cleanWord,
                confidence: 75, // Default confidence when extracting from main text
                bbox: { x0: 0, y0: 0, x1: 0, y1: 0 }, // Default bbox
                type: isNumber ? 'number' : 'character'
              });
            }
          }
        });
      });
    }
    
    // Also try to extract from blocks structure if available
    if (data.blocks && data.blocks.length > 0) {
      console.log('Processing blocks structure:', data.blocks.length, 'blocks');
      
      for (const block of data.blocks) {
        if (block.paragraphs) {
          for (const paragraph of block.paragraphs) {
            if (paragraph.lines) {
              for (const line of paragraph.lines) {
                if (line.words) {
                  for (const word of line.words) {
                    if (word.confidence > 30 && word.text.trim().length > 0) {
                      const text = word.text.trim();
                      const isNumber = /^\d+$/.test(text);
                      const isCharacter = /^[a-zA-Z\s,.-]+$/.test(text) && text.length > 1;
                      
                      if (isNumber || isCharacter) {
                        results.push({
                          text: text,
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

    console.log('Extracted results:', results);
    return results;
  }

  private postProcessResults(detectedTexts: DetectedText[]): DetectedText[] {
    // Remove duplicates and merge nearby text
    const refined: DetectedText[] = [];
    const processed = new Set<string>();

    for (const item of detectedTexts) {
      const key = `${item.text}_${item.type}`;
      if (!processed.has(key) && item.confidence > 20) { // Lower threshold for better detection
        // Clean up text
        let cleanText = item.text
          .replace(/[^\w\s,.-]/g, '') // Remove special characters except basic punctuation
          .replace(/\s+/g, ' ')       // Normalize whitespace
          .trim();

        if (cleanText.length > 0) {
          refined.push({
            ...item,
            text: cleanText,
            confidence: Math.min(item.confidence, 99) // Cap confidence at 99%
          });
          processed.add(key);
        }
      }
    }

    // Sort by confidence (highest first)
    return refined.sort((a, b) => b.confidence - a.confidence);
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
