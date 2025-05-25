
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
import { postProcessOCRText, CADASTRAL_PLACE_NAMES, CADASTRAL_NUMBERS } from '@/utils/cadastralDictionary';
import { batchExpandTexts, fastExpandText } from '@/utils/geminiExpander';
import { AdvancedTextDetector, exportToCSV, downloadCSV } from '@/utils/advancedTextDetection';
import { detectNumbers, verifyDetectedNumbers } from '@/utils/numberDetection';
import { extractBlackText, createBlackTextVersions, removeDuplicates } from '@/utils/blackTextExtraction';
import { createOptimizedVersions, applyImprovedPreprocessing } from '@/utils/improvedPreprocessing';
import { processWithMultipleEngines, processTilesWithMultipleEngines } from '@/utils/multiEngineOCRImproved';
import { processWithMapOCR, DEFAULT_CONFIG as MAP_OCR_CONFIG } from '@/utils/mapSpecializedOCR';

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
  const [textDetector] = useState(() => new AdvancedTextDetector());
  const [csvData, setCsvData] = useState<string | null>(null);
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
    setOcrResults(null);
    setCsvData(null);
    
    const startTime = Date.now();
    
    try {
      console.log('Starting map-specialized OCR with deep learning models...');
      
      // Step 1: Process with map-specialized OCR (using TrOCR, LayoutLMv3, and fine-tuned PaddleOCR)
      setProcessingProgress(5);
      console.log('Applying specialized map OCR with deep learning models...');
      
      // Configure the map OCR system with specialized settings for cadastral maps
      const mapOCRConfig = {
        // Use all recommended OCR engines
        useTrOCR: true,           // Excellent for handwritten/unusual text
        useLayoutLM: true,        // For spatial understanding
        usePaddleOCR: true,       // Fine-tuned for maps
        useTesseract: true,       // With specialized config
        // Use recommended Tesseract PSM mode for sparse text
        tesseractPSM: 11,
        // Process at all rotation angles as recommended
        rotateAngles: [0, 90, 180, 270],
        // Focus only on black text as requested
        blackTextOnly: true,
        // Apply recommended preprocessing
        applyDeskew: true,
        applyCLAHE: true,
        applyMorphology: true,
        // High confidence threshold as recommended
        confidenceThreshold: 0.85
      };
      
      // Process the image with map-specialized OCR
      console.log('Processing with TrOCR, LayoutLMv3, and fine-tuned PaddleOCR...');
      const mapOCRResults = await processWithMapOCR(imageElement, mapOCRConfig, (progress) => {
        setProcessingProgress(5 + progress * 0.35);
      });
      
      // Step 2: Process image tiles for better accuracy
      setProcessingProgress(40);
      console.log('Processing image tiles for better accuracy...');
      
      // Create optimized versions with all recommended preprocessing
      const { textVersion, numberVersion, textTiles, numberTiles } = createOptimizedVersions(imageElement);
      
      // Step 3: Process text tiles with multiple OCR engines as a backup
      setProcessingProgress(45);
      console.log('Processing text tiles with multiple OCR engines as backup...');
      
      // Process text tiles with multiple OCR engines
      const tileTextResults = await processTilesWithMultipleEngines(textTiles, {
        usePaddleOCR: true,
        useEasyOCR: true,
        useTesseract: true,
        paddleOCRUseAngleClassification: true, // For rotated text
        tesseractPSM: 11, // PSM 11 as recommended for sparse text
        confidenceThreshold: 0.85, // High confidence threshold
        filterByConfidence: true,
        applyFuzzyMatching: true
      });
      
      // Step 4: Process number tiles with specialized settings
      setProcessingProgress(50);
      console.log('Processing number tiles with specialized settings...');
      
      // Process number tiles with specialized settings
      const tileNumberResults = await processTilesWithMultipleEngines(numberTiles, {
        usePaddleOCR: true,
        useEasyOCR: false, // EasyOCR is not as good for numbers
        useTesseract: true,
        paddleOCRUseAngleClassification: true,
        tesseractPSM: 7, // PSM 7 is better for isolated numbers
        confidenceThreshold: 0.85,
        filterByConfidence: true,
        applyFuzzyMatching: false // Don't fuzzy match numbers
      });
      
      // Step 5: Combine and filter results
      setProcessingProgress(60);
      console.log('Combining and filtering results from all OCR engines...');
      
      // Combine results from map-specialized OCR and tile-based OCR
      const allTextResults = [...mapOCRResults, ...tileTextResults];
      
      // Filter character results (non-numeric text)
      const characterResults = allTextResults.filter(result => 
        result.type === 'character' && 
        !/^\d+$/.test(result.text) &&
        result.confidence > 85 // High confidence threshold
      );
      
      // Combine all number results
      const allNumberResults = [
        ...mapOCRResults.filter(result => result.type === 'number' || /^\d+$/.test(result.text)),
        ...tileNumberResults
      ];
      
      // Apply specialized number detection as a final check
      const additionalNumberResults = await detectNumbers(imageElement, {
        confidenceThreshold: 0.85,
        useMultipleAngles: true,
        angles: [0, 90, 180, 270]
      });
      
      // Combine all number results and filter
      const combinedNumberResults = [...allNumberResults, ...additionalNumberResults];
      const filteredNumberResults = combinedNumberResults.filter(result => 
        result.confidence > 85 && /^\d+$/.test(result.text)
      );
      
      // Store results in CSV format
      const combinedResults = [...characterResults, ...filteredNumberResults];
      const csv = exportToCSV(combinedResults);
      setCsvData(csv);
      
      // Step 6: Apply advanced post-processing with fuzzy matching and LLM-based correction
      setProcessingProgress(70);
      console.log('Applying advanced post-processing techniques...');
      
      // Extract text items from character results
      let characters = characterResults.map(item => item.text.trim());
      
      // Get numbers from specialized number detection
      let numbers = filteredNumberResults.map(item => item.text.trim());
      
      // Remove any non-numeric values from numbers (using regex as recommended)
      numbers = numbers.filter(num => /^\d+$/.test(num));
      
      console.log('Initial detected place names:', characters);
      console.log('Initial detected numbers:', numbers);
      
      // Step 6.1: Apply advanced fuzzy matching to place names
      setProcessingProgress(75);
      console.log('Applying advanced fuzzy matching to place names...');
      
      const fuzzyMatchedNames: string[] = [];
      for (const name of characters) {
        // Skip very short names (likely noise)
        if (name.length < 2) continue;
        
        // Find closest match in known cadastral place names
        let bestMatch = null;
        let bestScore = 0;
        
        for (const knownName of CADASTRAL_PLACE_NAMES) {
          // Calculate similarity score using Levenshtein distance
          const score = calculateSimilarity(name.toLowerCase(), knownName.toLowerCase());
          
          // Only accept high-confidence matches (threshold 0.8)
          if (score > 0.8 && score > bestScore) {
            bestScore = score;
            bestMatch = knownName;
          }
        }
        
        // Use the matched name if found, otherwise keep original
        fuzzyMatchedNames.push(bestMatch || name);
      }
      
      // Step 6.2: Apply LLM-based correction with Gemini API
      setProcessingProgress(80);
      console.log('Applying LLM-based correction with Gemini API...');
      
      // Find short or potentially incorrect texts that need correction
      const textsToCorrect = fuzzyMatchedNames.filter(text => 
        text.length <= 4 || // Short texts
        !CADASTRAL_PLACE_NAMES.includes(text) // Unknown texts
      );
      
      let correctedNames = [...fuzzyMatchedNames];
      
      if (textsToCorrect.length > 0) {
        try {
          console.log('Using Gemini API for LLM-based correction...');
          const correctedTexts = await batchExpandTexts(textsToCorrect);
          
          // Replace texts with their corrected versions
          correctedNames = fuzzyMatchedNames.map(text => {
            if ((text.length <= 4 || !CADASTRAL_PLACE_NAMES.includes(text)) && 
                correctedTexts[text]) {
              return correctedTexts[text];
            }
            return text;
          });
          
          console.log('LLM-corrected place names:', correctedNames);
        } catch (error) {
          console.error('Error using Gemini API for correction:', error);
          // Fall back to fuzzy matched names
        }
      }
      
      // Step 6.3: Verify numbers against known cadastral numbers
      setProcessingProgress(85);
      console.log('Verifying numbers against known cadastral numbers...');
      
      // Verify detected numbers against known cadastral numbers
      const verifiedNumbers = verifyDetectedNumbers(numbers);
      
      // Step 6.4: Remove duplicates and finalize results
      setProcessingProgress(90);
      console.log('Removing duplicates and finalizing results...');
      
      // Remove duplicates from both characters and numbers
      characters = removeDuplicates(correctedNames);
      numbers = removeDuplicates(verifiedNumbers);
      
      console.log('Final place names:', characters);
      console.log('Final numbers:', numbers);
      
      // Helper function for similarity calculation
      function calculateSimilarity(str1: string, str2: string): number {
        // Simple Levenshtein distance-based similarity
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1.0;
        
        let distance = 0;
        for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
          if (str1[i] !== str2[i]) distance++;
        }
        distance += Math.abs(str1.length - str2.length);
        
        return 1.0 - distance / maxLength;
      }
      
      setProcessingProgress(90);

      const processingTime = Date.now() - startTime;

      // Calculate average confidence from combined results
      const avgConfidence = combinedResults.length > 0 
        ? combinedResults.reduce((sum, item) => sum + item.confidence, 0) / combinedResults.length
        : 0;

      // Create the final results object
      const results: OCRResult = {
        characters,
        numbers,
        processingTime,
        confidence: Math.round(avgConfidence * 10) / 10,
        detailedResults: combinedResults
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

  // Handle CSV download
  const handleDownloadCSV = () => {
    if (ocrResults) {
      downloadCSV(ocrResults.detailedResults, `cadastral_ocr_results_${new Date().toISOString().slice(0, 10)}.csv`);
      toast({
        title: "CSV Downloaded",
        description: "Results have been exported to CSV format with confidence scores."
      });
    }
  };

  // Cleanup resources on unmount
  React.useEffect(() => {
    return () => {
      ocrEngine.terminate();
      textDetector.terminate();
    };
  }, [ocrEngine, textDetector]);

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
              <>
                <ResultsDisplay results={ocrResults} />
                
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Export Results</CardTitle>
                    <CardDescription>
                      Export the detected text and numbers to CSV format with confidence scores
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={handleDownloadCSV} 
                      className="w-full"
                      variant="outline"
                    >
                      Download CSV Results
                    </Button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      CSV includes all detected text with confidence scores and coordinates
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OCRProcessor;
