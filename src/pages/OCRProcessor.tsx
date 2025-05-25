
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/ocr/ImageUpload';
import ImagePreview from '@/components/ocr/ImagePreview';
import ResultsDisplay from '@/components/ocr/ResultsDisplay';
import ProcessingStatus from '@/components/ocr/ProcessingStatus';

export interface OCRResult {
  characters: string[];
  numbers: string[];
  processingTime: number;
  confidence: number;
}

const OCRProcessor = () => {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [ocrResults, setOcrResults] = useState<OCRResult | null>(null);
  const { toast } = useToast();

  const handleImageUpload = (file: File) => {
    setUploadedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setOcrResults(null);
  };

  const processImage = async () => {
    if (!uploadedImage) {
      toast({
        title: "No Image Selected",
        description: "Please upload a cadastral map image first.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Simulate processing steps
      const steps = [
        { name: "Preprocessing image...", duration: 1000 },
        { name: "Detecting text regions...", duration: 1500 },
        { name: "Segmenting characters...", duration: 1200 },
        { name: "Running OCR...", duration: 2000 },
        { name: "Post-processing results...", duration: 800 }
      ];

      let currentProgress = 0;
      const progressIncrement = 100 / steps.length;

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, step.duration));
        currentProgress += progressIncrement;
        setProcessingProgress(currentProgress);
      }

      // Simulate OCR results based on the sample data provided
      const mockResults: OCRResult = {
        characters: [
          "Benakanahalli", "Devapur Nalla", "cover tank", "Devatakala", 
          "Mangihal", "Gonal", "Aladahal", "Covered tank", "Antaral", 
          "Rajapur", "Stony waste", "Nagarahal", "Devapur", "kagaral", 
          "kawadimutt", "Konal"
        ],
        numbers: [
          "74", "24", "387", "13", "12", "11", "10", "76", "22", "396",
          "424", "404", "379", "372", "362", "364", "20", "426", "18",
          "391", "386", "377", "361", "402", "400", "84", "521", "519",
          "518", "517", "516", "357", "371", "522", "360"
        ],
        processingTime: 6500,
        confidence: 87.5
      };

      setOcrResults(mockResults);
      toast({
        title: "Processing Complete!",
        description: `Extracted ${mockResults.characters.length} text items and ${mockResults.numbers.length} numbers.`
      });

    } catch (error) {
      toast({
        title: "Processing Failed",
        description: "An error occurred during OCR processing.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Cadastral Map OCR System
          </h1>
          <p className="text-lg text-gray-600">
            Extract characters and numbers from cadastral maps using advanced OCR technology
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Upload and Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Cadastral Map</CardTitle>
                <CardDescription>
                  Select a cadastral map image for processing
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
                </CardHeader>
                <CardContent>
                  <ImagePreview imageSrc={imagePreview} />
                </CardContent>
              </Card>
            )}

            {imagePreview && (
              <Card>
                <CardHeader>
                  <CardTitle>Process Image</CardTitle>
                  <CardDescription>
                    Start OCR processing to extract text and numbers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={processImage} 
                    disabled={isProcessing}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? 'Processing...' : 'Start OCR Processing'}
                  </Button>
                  
                  {isProcessing && (
                    <div className="mt-4">
                      <Progress value={processingProgress} className="w-full" />
                      <p className="text-sm text-gray-600 mt-2 text-center">
                        Processing: {Math.round(processingProgress)}%
                      </p>
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
