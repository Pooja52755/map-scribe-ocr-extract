
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
      tessedit_pageseg_mode: '6', // Uniform block of text
      tessedit_ocr_engine_mode: '1', // Neural nets LSTM engine
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,. ',
      tessjs_create_hocr: '1',
      tessjs_create_tsv: '1',
      tessjs_create_box: '1'
    });
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

    // Extract and classify detected text
    const detectedTexts = this.extractAndClassifyText(data);
    progressCallback?.(90);

    // Post-process results for better accuracy
    const refinedResults = this.postProcessResults(detectedTexts);
    progressCallback?.(100);

    return refinedResults;
  }

  private extractAndClassifyText(data: Tesseract.Page): DetectedText[] {
    const results: DetectedText[] = [];
    
    if (data.words) {
      for (const word of data.words) {
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

    return results;
  }

  private postProcessResults(detectedTexts: DetectedText[]): DetectedText[] {
    // Remove duplicates and merge nearby text
    const refined: DetectedText[] = [];
    const processed = new Set<string>();

    for (const item of detectedTexts) {
      const key = `${item.text}_${item.type}`;
      if (!processed.has(key) && item.confidence > 40) {
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
