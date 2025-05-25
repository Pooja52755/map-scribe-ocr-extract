
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

  // Apply contrast enhancement
  enhanceContrast(imageData: ImageData, factor: number = 1.5): ImageData {
    const data = imageData.data;
    const contrast = (factor - 1) * 128;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] * factor + contrast));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor + contrast));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor + contrast));
    }
    return imageData;
  }

  // Apply Gaussian blur for noise reduction
  gaussianBlur(imageData: ImageData, radius: number = 1): ImageData {
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
    const size = 2 * radius + 1;
    const kernel: number[][] = [];
    const sigma = radius / 3;
    let sum = 0;
    
    for (let y = 0; y < size; y++) {
      kernel[y] = [];
      for (let x = 0; x < size; x++) {
        const dx = x - radius;
        const dy = y - radius;
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

  // Apply sharpening filter
  sharpen(imageData: ImageData): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const kernel = [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0]
    ];
    
    const output = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;
        
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const pixelY = y + ky - 1;
            const pixelX = x + kx - 1;
            const pixelIndex = (pixelY * width + pixelX) * 4;
            const weight = kernel[ky][kx];
            
            r += data[pixelIndex] * weight;
            g += data[pixelIndex + 1] * weight;
            b += data[pixelIndex + 2] * weight;
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

  // Adaptive thresholding for better text separation
  adaptiveThreshold(imageData: ImageData, blockSize: number = 15, C: number = 10): ImageData {
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
            sum += data[pixelIndex]; // Using red channel for grayscale
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

  // Process image with all enhancement techniques
  async processImage(imageElement: HTMLImageElement): Promise<string> {
    this.canvas.width = imageElement.naturalWidth;
    this.canvas.height = imageElement.naturalHeight;
    
    // Draw original image
    this.ctx.drawImage(imageElement, 0, 0);
    let imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply preprocessing pipeline
    imageData = this.toGrayscale(imageData);
    imageData = this.gaussianBlur(imageData, 1);
    imageData = this.enhanceContrast(imageData, 1.3);
    imageData = this.sharpen(imageData);
    imageData = this.adaptiveThreshold(imageData, 15, 8);
    
    // Put processed image back to canvas
    this.ctx.putImageData(imageData, 0, 0);
    
    return this.canvas.toDataURL('image/png');
  }
}
