
// Advanced image preprocessing utilities for better OCR accuracy
export class ImagePreprocessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  // Convert image to grayscale for better text detection
  toGrayscale(imageData: ImageData): ImageData {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;     // Red
      data[i + 1] = gray; // Green
      data[i + 2] = gray; // Blue
    }
    return imageData;
  }

  // Apply contrast enhancement - more aggressive for cadastral maps
  enhanceContrast(imageData: ImageData, factor: number = 2.0): ImageData {
    const data = imageData.data;
    const contrast = (factor - 1) * 128;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] * factor + contrast));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor + contrast));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor + contrast));
    }
    return imageData;
  }

  // Enhanced edge detection for text boundaries
  edgeDetection(imageData: ImageData): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new Uint8ClampedArray(data);
    
    // Sobel edge detection
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const pixelIndex = ((y + ky - 1) * width + (x + kx - 1)) * 4;
            const intensity = data[pixelIndex];
            gx += intensity * sobelX[ky][kx];
            gy += intensity * sobelY[ky][kx];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const outputIndex = (y * width + x) * 4;
        output[outputIndex] = magnitude;
        output[outputIndex + 1] = magnitude;
        output[outputIndex + 2] = magnitude;
      }
    }
    
    return new ImageData(output, width, height);
  }

  // Morphological operations for text enhancement
  dilate(imageData: ImageData, kernelSize: number = 3): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new Uint8ClampedArray(data);
    const half = Math.floor(kernelSize / 2);
    
    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        let maxVal = 0;
        
        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
            maxVal = Math.max(maxVal, data[pixelIndex]);
          }
        }
        
        const outputIndex = (y * width + x) * 4;
        output[outputIndex] = maxVal;
        output[outputIndex + 1] = maxVal;
        output[outputIndex + 2] = maxVal;
      }
    }
    
    return new ImageData(output, width, height);
  }

  // Apply Gaussian blur for noise reduction - optimized for text
  gaussianBlur(imageData: ImageData, radius: number = 0.8): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const kernel = this.createGaussianKernel(radius);
    const kernelSize = kernel.length;
    const half = Math.floor(kernelSize / 2);
    
    const output = new Uint8ClampedArray(data);
    
    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        let r = 0, g = 0, b = 0;
        
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const pixelY = y + ky - half;
            const pixelX = x + kx - half;
            const pixelIndex = (pixelY * width + pixelX) * 4;
            const weight = kernel[ky][kx];
            
            r += data[pixelIndex] * weight;
            g += data[pixelIndex + 1] * weight;
            b += data[pixelIndex + 2] * weight;
          }
        }
        
        const outputIndex = (y * width + x) * 4;
        output[outputIndex] = r;
        output[outputIndex + 1] = g;
        output[outputIndex + 2] = b;
      }
    }
    
    return new ImageData(output, width, height);
  }

  private createGaussianKernel(radius: number): number[][] {
    const size = 2 * Math.ceil(radius) + 1;
    const kernel: number[][] = [];
    const sigma = radius / 2;
    let sum = 0;
    
    for (let y = 0; y < size; y++) {
      kernel[y] = [];
      for (let x = 0; x < size; x++) {
        const dx = x - Math.floor(size / 2);
        const dy = y - Math.floor(size / 2);
        const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        kernel[y][x] = value;
        sum += value;
      }
    }
    
    // Normalize kernel
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        kernel[y][x] /= sum;
      }
    }
    
    return kernel;
  }

  // Improved adaptive thresholding for cadastral maps
  adaptiveThreshold(imageData: ImageData, blockSize: number = 21, C: number = 15): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new Uint8ClampedArray(data);
    const half = Math.floor(blockSize / 2);
    
    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        let sum = 0;
        let count = 0;
        
        // Calculate mean in local neighborhood
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const pixelIndex = ((y + dy) * width + (x + dx)) * 4;
            sum += data[pixelIndex];
            count++;
          }
        }
        
        const mean = sum / count;
        const threshold = mean - C;
        const pixelIndex = (y * width + x) * 4;
        const value = data[pixelIndex] > threshold ? 255 : 0;
        
        output[pixelIndex] = value;
        output[pixelIndex + 1] = value;
        output[pixelIndex + 2] = value;
      }
    }
    
    return new ImageData(output, width, height);
  }

  // Enhanced processing pipeline specifically for cadastral maps
  async processImage(imageElement: HTMLImageElement): Promise<string> {
    // Create multiple processed versions with different parameters to maximize text detection
    const processedVersions: string[] = [];
    
    // Version 1: High contrast with adaptive thresholding
    processedVersions.push(await this.createProcessedVersion(imageElement, {
      scaleFactor: 4,  // Higher scale factor for more detail
      grayscale: true,
      blur: 0.3,       // Minimal blur to preserve details
      contrast: 3.0,   // High contrast to make text stand out
      threshold: true,
      blockSize: 11,   // Small block size for fine text
      constant: 5,     // Lower constant for more sensitivity
      dilate: false,   // No dilation to avoid merging characters
      edgeEnhance: true
    }));
    
    // Version 2: Optimized for thin text
    processedVersions.push(await this.createProcessedVersion(imageElement, {
      scaleFactor: 3,
      grayscale: true,
      blur: 0,         // No blur to preserve thin lines
      contrast: 2.5,
      threshold: true,
      blockSize: 15,
      constant: 8,
      dilate: true,    // Light dilation to connect broken characters
      dilateSize: 1,
      edgeEnhance: false
    }));
    
    // Version 3: Binarization with Otsu's method
    processedVersions.push(await this.createProcessedVersion(imageElement, {
      scaleFactor: 3.5,
      grayscale: true,
      blur: 0.5,
      contrast: 2.0,
      binarize: true,  // Use binarization instead of adaptive threshold
      dilate: false,
      edgeEnhance: false
    }));
    
    // Version 4: Inverted colors (sometimes helps with certain maps)
    processedVersions.push(await this.createProcessedVersion(imageElement, {
      scaleFactor: 3,
      grayscale: true,
      blur: 0.4,
      contrast: 2.2,
      threshold: true,
      blockSize: 13,
      constant: 10,
      invert: true,    // Invert colors
      dilate: true,
      dilateSize: 1,
      edgeEnhance: false
    }));
    
    // Version 5: Minimal processing (sometimes simpler is better)
    processedVersions.push(await this.createProcessedVersion(imageElement, {
      scaleFactor: 4,
      grayscale: true,
      blur: 0,
      contrast: 2.0,
      sharpen: true,   // Add sharpening
      dilate: false,
      edgeEnhance: false
    }));
    
    console.log('Generated 5 different preprocessing versions for optimal OCR');
    
    // Return the first version as primary, but store all versions for potential use
    (window as any).__ocrProcessedVersions = processedVersions;
    
    return processedVersions[0];
  }
  
  // Create a processed version with specific parameters
  private async createProcessedVersion(imageElement: HTMLImageElement, params: {
    scaleFactor: number,
    grayscale: boolean,
    blur: number,
    contrast: number,
    threshold?: boolean,
    blockSize?: number,
    constant?: number,
    binarize?: boolean,
    invert?: boolean,
    dilate?: boolean,
    dilateSize?: number,
    edgeEnhance?: boolean,
    sharpen?: boolean
  }): Promise<string> {
    // Scale image
    this.canvas.width = imageElement.naturalWidth * params.scaleFactor;
    this.canvas.height = imageElement.naturalHeight * params.scaleFactor;
    
    // Draw original image scaled up
    this.ctx.drawImage(imageElement, 0, 0, this.canvas.width, this.canvas.height);
    let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply processing steps based on parameters
    if (params.grayscale) {
      imageData = this.toGrayscale(imageData);
    }
    
    if (params.blur > 0) {
      imageData = this.gaussianBlur(imageData, params.blur);
    }
    
    if (params.contrast > 0) {
      imageData = this.enhanceContrast(imageData, params.contrast);
    }
    
    if (params.sharpen) {
      imageData = this.sharpenImage(imageData);
    }
    
    if (params.threshold && params.blockSize) {
      imageData = this.adaptiveThreshold(imageData, params.blockSize, params.constant || 10);
    }
    
    if (params.binarize) {
      imageData = this.binarize(imageData);
    }
    
    if (params.invert) {
      imageData = this.invertColors(imageData);
    }
    
    if (params.dilate && params.dilateSize) {
      imageData = this.dilate(imageData, params.dilateSize);
    }
    
    if (params.edgeEnhance) {
      imageData = this.edgeDetection(imageData);
    }
    
    // Put processed image back to canvas
    this.ctx.putImageData(imageData, 0, 0);
    
    return this.canvas.toDataURL('image/png');
  }
  
  // Binarize image using Otsu's method
  binarize(imageData: ImageData): ImageData {
    const data = imageData.data;
    const histogram = new Array(256).fill(0);
    
    // Build histogram
    for (let i = 0; i < data.length; i += 4) {
      histogram[data[i]]++;
    }
    
    // Total number of pixels
    const total = imageData.width * imageData.height;
    
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }
    
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;
    
    // Compute Otsu's threshold
    for (let i = 0; i < 256; i++) {
      wB += histogram[i];
      if (wB === 0) continue;
      
      wF = total - wB;
      if (wF === 0) break;
      
      sumB += i * histogram[i];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);
      
      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = i;
      }
    }
    
    // Apply threshold
    for (let i = 0; i < data.length; i += 4) {
      const value = data[i] < threshold ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = value;
    }
    
    return imageData;
  }
  
  // Invert image colors
  invertColors(imageData: ImageData): ImageData {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];         // Red
      data[i + 1] = 255 - data[i + 1]; // Green
      data[i + 2] = 255 - data[i + 2]; // Blue
    }
    
    return imageData;
  }
  
  // Sharpen image
  sharpenImage(imageData: ImageData): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const output = new Uint8ClampedArray(data);
    
    // Sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            
            r += data[pixelIndex] * kernel[kernelIndex];
            g += data[pixelIndex + 1] * kernel[kernelIndex];
            b += data[pixelIndex + 2] * kernel[kernelIndex];
          }
        }
        
        const outputIndex = (y * width + x) * 4;
        output[outputIndex] = Math.max(0, Math.min(255, r));
        output[outputIndex + 1] = Math.max(0, Math.min(255, g));
        output[outputIndex + 2] = Math.max(0, Math.min(255, b));
      }
    }
    
    return new ImageData(output, width, height);
  }
}
