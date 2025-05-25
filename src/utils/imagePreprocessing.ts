
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
    // Scale up image for better OCR accuracy
    const scaleFactor = 2;
    this.canvas.width = imageElement.naturalWidth * scaleFactor;
    this.canvas.height = imageElement.naturalHeight * scaleFactor;
    
    // Draw original image scaled up
    this.ctx.drawImage(imageElement, 0, 0, this.canvas.width, this.canvas.height);
    let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    console.log('Starting enhanced preprocessing pipeline...');
    
    // Enhanced preprocessing pipeline for cadastral maps
    imageData = this.toGrayscale(imageData);
    console.log('Applied grayscale conversion');
    
    imageData = this.gaussianBlur(imageData, 0.8);
    console.log('Applied noise reduction');
    
    imageData = this.enhanceContrast(imageData, 2.2);
    console.log('Applied contrast enhancement');
    
    imageData = this.adaptiveThreshold(imageData, 21, 12);
    console.log('Applied adaptive thresholding');
    
    imageData = this.dilate(imageData, 2);
    console.log('Applied morphological dilation');
    
    // Put processed image back to canvas
    this.ctx.putImageData(imageData, 0, 0);
    
    const processedDataUrl = this.canvas.toDataURL('image/png');
    console.log('Preprocessing complete');
    
    return processedDataUrl;
  }
}
