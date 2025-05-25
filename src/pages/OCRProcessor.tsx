
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ocr/ImageUpload';
import ImagePreview from '@/components/ocr/ImagePreview';
import ResultsDisplay from '@/components/ocr/ResultsDisplay';
import ProcessingStatus from '@/components/ocr/ProcessingStatus';
import { AdvancedOCREngine, DetectedText } from '@/utils/advancedOCR';

export interface OCRResult {
  characters: string[];
  numbers: string[];
  processingTime: number;
  confidence: number;
  detailedResults: DetectedText[];
}

const OCRProcessor = () => {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [ocrResults, setOcrResults] = useState<OCRResult | null>(null);
  const [ocrEngine] = useState(() => new AdvancedOCREngine());
  const { toast } = useToast();

  const handleImageUpload = (file: File) => {
    setUploadedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string;
      setImagePreview(imageSrc);
      
      // Create image element for OCR processing
      const img = new Image();
      img.onload = () => setImageElement(img);
      img.src = imageSrc;
    };
    reader.readAsDataURL(file);
    setOcrResults(null);
  };

  const processImage = async () => {
    if (!uploadedImage || !imageElement) {
      toast({
        title: "No Image Selected",
        description: "Please upload a cadastral map image first.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    const startTime = Date.now();

    try {
      console.log('Starting advanced OCR processing...');
      
      // Process image with advanced OCR engine
      const detectedTexts = await ocrEngine.processImage(
        imageElement,
        (progress) => setProcessingProgress(progress)
      );

      const processingTime = Date.now() - startTime;

      // Separate characters and numbers
      const characters = detectedTexts
        .filter(item => item.type === 'character')
        .map(item => item.text)
        .filter(text => text.length > 2); // Filter out very short texts

      const numbers = detectedTexts
        .filter(item => item.type === 'number')
        .map(item => item.text);

      // Calculate average confidence
      const avgConfidence = detectedTexts.length > 0 
        ? detectedTexts.reduce((sum, item) => sum + item.confidence, 0) / detectedTexts.length
        : 0;

      const results: OCRResult = {
        characters,
        numbers,
        processingTime,
        confidence: Math.round(avgConfidence * 10) / 10,
        detailedResults: detectedTexts
      };

      setOcrResults(results);
      
      console.log('OCR Results:', results);
      
      toast({
        title: "Processing Complete!",
        description: `Extracted ${characters.length} text items and ${numbers.length} numbers with ${results.confidence.toFixed(1)}% confidence.`
      });

    } catch (error) {
      console.error('OCR Processing Error:', error);
      toast({
        title: "Processing Failed",
        description: `OCR processing encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  // Cleanup OCR engine on unmount
  React.useEffect(() => {
    return () => {
      ocrEngine.terminate();
    };
  }, [ocrEngine]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Advanced Cadastral Map OCR System
          </h1>
          <p className="text-lg text-gray-600">
            High-accuracy character and number extraction using advanced machine learning
          </p>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Enhanced Features:</strong> Image preprocessing, adaptive thresholding, 
              Gaussian blur noise reduction, contrast enhancement, and LSTM neural network OCR
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Upload and Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Cadastral Map</CardTitle>
                <CardDescription>
                  Select a high-resolution cadastral map image for advanced OCR processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload onImageUpload={handleImageUpload} />
              </CardContent>
            </Card>

            {imagePreview && (
              <Card>
                <CardHeader>
                  <CardTitle>Image Preview</CardTitle>
                  <CardDescription>
                    Original image ready for processing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImagePreview imageSrc={imagePreview} />
                </CardContent>
              </Card>
            )}

            {imagePreview && (
              <Card>
                <CardHeader>
                  <CardTitle>Advanced OCR Processing</CardTitle>
                  <CardDescription>
                    Process with ML-enhanced OCR engine featuring preprocessing and neural networks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={processImage} 
                    disabled={isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? 'Processing with Advanced OCR...' : 'Start Advanced OCR Processing'}
                  </Button>
                  
                  {isProcessing && (
                    <div className="mt-4">
                      <Progress value={processingProgress} className="w-full" />
                      <p className="text-sm text-gray-600 mt-2 text-center">
                        Advanced Processing: {Math.round(processingProgress)}%
                      </p>
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {processingProgress < 30 && "Applying image preprocessing..."}
                        {processingProgress >= 30 && processingProgress < 70 && "Running neural network OCR..."}
                        {processingProgress >= 70 && processingProgress < 90 && "Extracting and classifying text..."}
                        {processingProgress >= 90 && "Post-processing results..."}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Processing Status and Results */}
          <div className="space-y-6">
            <ProcessingStatus 
              isProcessing={isProcessing}
              progress={processingProgress}
              results={ocrResults}
            />
            
            {ocrResults && (
              <ResultsDisplay results={ocrResults} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OCRProcessor;
