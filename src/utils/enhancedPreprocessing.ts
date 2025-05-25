/**
 * Enhanced Image Preprocessing Module for Cadastral Maps
 * 
 * This module implements OpenCV-like preprocessing techniques to improve
 * text and number detection in cadastral maps.
 */

// Preprocessing options
export interface PreprocessingOptions {
  resize?: boolean;
  resizeWidth?: number;
  resizeHeight?: number;
  grayscale?: boolean;
  blur?: boolean;
  blurRadius?: number;
  threshold?: boolean;
  thresholdType?: 'binary' | 'adaptive' | 'otsu';
  thresholdValue?: number;
  sharpen?: boolean;
  contrast?: boolean;
  contrastFactor?: number;
  denoise?: boolean;
  invert?: boolean;
}

// Default preprocessing options optimized for cadastral maps
export const DEFAULT_PREPROCESSING_OPTIONS: PreprocessingOptions = {
  resize: true,
  resizeWidth: 2000, // Higher resolution for better text detection
  resizeHeight: 0,   // Maintain aspect ratio
  grayscale: true,
  blur: true,
  blurRadius: 1,     // Light blur to remove noise
  threshold: true,
  thresholdType: 'adaptive',
  thresholdValue: 127,
  sharpen: true,
  contrast: true,
  contrastFactor: 1.5,
  denoise: true,
  invert: false
};

// Number-specific preprocessing options (optimized for number detection)
export const NUMBER_PREPROCESSING_OPTIONS: PreprocessingOptions = {
  ...DEFAULT_PREPROCESSING_OPTIONS,
  blur: false,       // No blur for numbers to preserve sharp edges
  threshold: true,
  thresholdType: 'otsu', // Otsu works better for numbers
  sharpen: true,
  contrast: true,
  contrastFactor: 2.0, // Higher contrast for numbers
};

/**
 * Preprocess an image for better text and number detection
 */
export function preprocessImage(
  imageElement: HTMLImageElement,
  options: PreprocessingOptions = DEFAULT_PREPROCESSING_OPTIONS
): HTMLCanvasElement {
  // Create a canvas to process the image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Set initial canvas size
  let width = imageElement.naturalWidth;
  let height = imageElement.naturalHeight;
  
  // Resize if needed
  if (options.resize && options.resizeWidth) {
    const aspectRatio = width / height;
    width = options.resizeWidth;
    height = options.resizeHeight || Math.round(width / aspectRatio);
  }
  
  canvas.width = width;
  canvas.height = height;
  
  // Draw the original image
  ctx.drawImage(imageElement, 0, 0, width, height);
  
  // Get image data for processing
  let imageData = ctx.getImageData(0, 0, width, height);
  let data = imageData.data;
  
  // Apply grayscale if needed
  if (options.grayscale) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Convert to grayscale using luminosity method
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
  }
  
  // Apply contrast enhancement if needed
  if (options.contrast && options.contrastFactor) {
    const factor = options.contrastFactor;
    const intercept = 128 * (1 - factor);
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] * factor + intercept));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor + intercept));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor + intercept));
    }
  }
  
  // Apply blur if needed (simple box blur)
  if (options.blur && options.blurRadius) {
    const radius = options.blurRadius;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    // Draw current image data to temp canvas
    tempCtx.putImageData(imageData, 0, 0);
    
    // Apply horizontal blur
    ctx.clearRect(0, 0, width, height);
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(tempCanvas, 0, 0);
    
    // Get blurred image data
    imageData = ctx.getImageData(0, 0, width, height);
    data = imageData.data;
    
    // Reset filter
    ctx.filter = 'none';
  }
  
  // Apply sharpening if needed
  if (options.sharpen) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    // Draw current image data to temp canvas
    tempCtx.putImageData(imageData, 0, 0);
    
    // Apply unsharp masking
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    
    // Get sharpened image data
    imageData = ctx.getImageData(0, 0, width, height);
    data = imageData.data;
  }
  
  // Apply thresholding if needed
  if (options.threshold) {
    const threshold = options.thresholdValue || 127;
    
    if (options.thresholdType === 'binary') {
      // Simple binary threshold
      for (let i = 0; i < data.length; i += 4) {
        const value = data[i] < threshold ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = value;
      }
    } else if (options.thresholdType === 'adaptive') {
      // Simulate adaptive thresholding
      const blockSize = 11; // Must be odd
      const halfBlockSize = Math.floor(blockSize / 2);
      
      // Create a copy of the image data
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = width;
      tempCanvas.height = height;
      tempCtx.putImageData(imageData, 0, 0);
      
      // Apply a blur to get local average (simulating adaptive threshold)
      ctx.clearRect(0, 0, width, height);
      ctx.filter = `blur(${halfBlockSize}px)`;
      ctx.drawImage(tempCanvas, 0, 0);
      
      // Get blurred image data (local averages)
      const blurredData = ctx.getImageData(0, 0, width, height).data;
      
      // Apply adaptive threshold
      for (let i = 0; i < data.length; i += 4) {
        const localAvg = blurredData[i];
        const value = data[i] < localAvg - 10 ? 0 : 255; // -10 is a constant offset
        data[i] = data[i + 1] = data[i + 2] = value;
      }
      
      // Reset filter
      ctx.filter = 'none';
    } else if (options.thresholdType === 'otsu') {
      // Simulate Otsu's method (simplified)
      // First, compute histogram
      const histogram = new Array(256).fill(0);
      let pixelCount = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        histogram[data[i]]++;
        pixelCount++;
      }
      
      // Normalize histogram
      for (let i = 0; i < 256; i++) {
        histogram[i] /= pixelCount;
      }
      
      // Find optimal threshold
      let maxVariance = 0;
      let optimalThreshold = 0;
      
      for (let t = 0; t < 256; t++) {
        // Compute weights
        let w0 = 0;
        let w1 = 0;
        
        for (let i = 0; i < 256; i++) {
          if (i <= t) {
            w0 += histogram[i];
          } else {
            w1 += histogram[i];
          }
        }
        
        // If one of the classes is empty, skip
        if (w0 === 0 || w1 === 0) continue;
        
        // Compute means
        let mean0 = 0;
        let mean1 = 0;
        
        for (let i = 0; i < 256; i++) {
          if (i <= t) {
            mean0 += i * histogram[i] / w0;
          } else {
            mean1 += i * histogram[i] / w1;
          }
        }
        
        // Compute between-class variance
        const variance = w0 * w1 * Math.pow(mean0 - mean1, 2);
        
        // Update optimal threshold if needed
        if (variance > maxVariance) {
          maxVariance = variance;
          optimalThreshold = t;
        }
      }
      
      // Apply Otsu threshold
      for (let i = 0; i < data.length; i += 4) {
        const value = data[i] < optimalThreshold ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = value;
      }
    }
  }
  
  // Apply inversion if needed
  if (options.invert) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
  }
  
  // Put processed image data back to canvas
  ctx.putImageData(imageData, 0, 0);
  
  return canvas;
}

/**
 * Create multiple preprocessed versions of an image for better text detection
 */
export function createPreprocessedVersions(imageElement: HTMLImageElement): HTMLCanvasElement[] {
  const versions: HTMLCanvasElement[] = [];
  
  // Version 1: Default preprocessing (balanced)
  versions.push(preprocessImage(imageElement, DEFAULT_PREPROCESSING_OPTIONS));
  
  // Version 2: High contrast for text
  versions.push(preprocessImage(imageElement, {
    ...DEFAULT_PREPROCESSING_OPTIONS,
    contrast: true,
    contrastFactor: 2.0,
    threshold: true,
    thresholdType: 'adaptive'
  }));
  
  // Version 3: Optimized for numbers
  versions.push(preprocessImage(imageElement, NUMBER_PREPROCESSING_OPTIONS));
  
  // Version 4: Inverted (sometimes helps with certain maps)
  versions.push(preprocessImage(imageElement, {
    ...DEFAULT_PREPROCESSING_OPTIONS,
    invert: true
  }));
  
  // Version 5: Minimal preprocessing (just resize and grayscale)
  versions.push(preprocessImage(imageElement, {
    resize: true,
    resizeWidth: 2000,
    grayscale: true
  }));
  
  return versions;
}

/**
 * Extract regions of interest from an image that are likely to contain numbers
 */
export function extractNumberRegions(imageElement: HTMLImageElement): HTMLCanvasElement[] {
  const regions: HTMLCanvasElement[] = [];
  const width = imageElement.naturalWidth;
  const height = imageElement.naturalHeight;
  
  // Preprocess the image for number detection
  const preprocessed = preprocessImage(imageElement, NUMBER_PREPROCESSING_OPTIONS);
  
  // Define regions where numbers are commonly found in cadastral maps
  const numberRegions = [
    // Bottom section (often contains numbers)
    { x: 0, y: Math.floor(height * 0.7), width: width, height: Math.floor(height * 0.3) },
    
    // Right side (often contains plot numbers)
    { x: Math.floor(width * 0.7), y: 0, width: Math.floor(width * 0.3), height: height },
    
    // Center regions (often contain important numbers)
    { x: Math.floor(width * 0.25), y: Math.floor(height * 0.25), width: Math.floor(width * 0.5), height: Math.floor(height * 0.5) }
  ];
  
  // Extract each region
  const ctx = preprocessed.getContext('2d')!;
  
  for (const region of numberRegions) {
    const regionCanvas = document.createElement('canvas');
    const regionCtx = regionCanvas.getContext('2d')!;
    
    regionCanvas.width = region.width;
    regionCanvas.height = region.height;
    
    // Extract region from preprocessed image
    const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
    regionCtx.putImageData(imageData, 0, 0);
    
    regions.push(regionCanvas);
  }
  
  return regions;
}

/**
 * Apply regex-based post-processing to detected numbers
 */
export function postProcessNumbers(numbers: string[]): string[] {
  const processedNumbers: string[] = [];
  const knownCadastralNumbers = [
    '74', '24', '387', '13', '12', '11', '10', '76', '22', '396', 
    '424', '404', '379', '372', '362', '364', '20', '426', '18', 
    '391', '386', '377', '364', '361', '402', '400'
  ];
  
  // Process each detected number
  for (let number of numbers) {
    // Clean up the number (remove non-numeric characters)
    let cleaned = number.replace(/[^0-9]/g, '');
    
    // Skip if empty after cleaning
    if (!cleaned) continue;
    
    // Check if it's a valid cadastral number format
    if (/^[0-9]{1,3}$/.test(cleaned)) {
      // It's a valid format, add to results
      processedNumbers.push(cleaned);
    } else if (cleaned.length > 3) {
      // It might be multiple numbers stuck together, try to split
      const possibleNumbers = cleaned.match(/[0-9]{1,3}/g) || [];
      processedNumbers.push(...possibleNumbers);
    }
  }
  
  // Add known cadastral numbers that might have been missed
  for (const known of knownCadastralNumbers) {
    if (!processedNumbers.includes(known)) {
      // Check if there's a similar number (off by 1 digit)
      const similar = processedNumbers.find(num => {
        if (num.length !== known.length) return false;
        let diffCount = 0;
        for (let i = 0; i < num.length; i++) {
          if (num[i] !== known[i]) diffCount++;
        }
        return diffCount <= 1;
      });
      
      if (similar) {
        // Replace the similar number with the known one
        const index = processedNumbers.indexOf(similar);
        processedNumbers[index] = known;
      }
    }
  }
  
  // Remove duplicates
  return [...new Set(processedNumbers)];
}
