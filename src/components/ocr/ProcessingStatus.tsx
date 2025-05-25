
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Target, Zap } from 'lucide-react';
import { OCRResult } from '@/pages/OCRProcessor';

interface ProcessingStatusProps {
  isProcessing: boolean;
  progress: number;
  results: OCRResult | null;
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ 
  isProcessing, 
  progress, 
  results 
}) => {
  if (!isProcessing && !results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Upload an image to start processing</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isProcessing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing in Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">Processing</Badge>
              <span className="text-sm text-gray-600">
                {Math.round(progress)}% complete
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${progress > 20 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Image preprocessing</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${progress > 40 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Text region detection</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${progress > 60 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Character segmentation</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${progress > 80 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>OCR recognition</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${progress > 95 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Post-processing</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Complete</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">Time</span>
              </div>
              <div className="text-2xl font-bold">{(results.processingTime / 1000).toFixed(1)}s</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Target className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">Confidence</span>
              </div>
              <div className="text-2xl font-bold">{results.confidence}%</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Zap className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">Items</span>
              </div>
              <div className="text-2xl font-bold">
                {results.characters.length + results.numbers.length}
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Badge variant="default" className="bg-green-500">
              Processing Successful
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default ProcessingStatus;
