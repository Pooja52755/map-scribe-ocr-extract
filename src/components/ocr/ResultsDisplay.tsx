
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Hash, Target, Brain } from 'lucide-react';
import { OCRResult } from '@/pages/OCRProcessor';
import { useToast } from '@/hooks/use-toast';

interface ResultsDisplayProps {
  results: OCRResult;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results }) => {
  const { toast } = useToast();

  const downloadCSV = () => {
    const csvContent = [
      'Type,Value,Confidence',
      ...results.detailedResults.map(item => 
        `${item.type === 'character' ? 'Character' : 'Number'},"${item.text}",${item.confidence.toFixed(1)}%`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cadastral_ocr_results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Enhanced CSV Downloaded",
      description: "OCR results with confidence scores exported to CSV file."
    });
  };

  const downloadDetailedReport = () => {
    const reportContent = [
      'Cadastral Map OCR Analysis Report',
      '=====================================',
      '',
      `Processing Date: ${new Date().toLocaleString()}`,
      `Processing Time: ${(results.processingTime / 1000).toFixed(1)} seconds`,
      `Overall Confidence: ${results.confidence.toFixed(1)}%`,
      `Total Items Detected: ${results.detailedResults.length}`,
      `Characters Found: ${results.characters.length}`,
      `Numbers Found: ${results.numbers.length}`,
      '',
      'CHARACTERS DETECTED:',
      '==================',
      ...results.characters.map((char, index) => {
        const detail = results.detailedResults.find(d => d.text === char && d.type === 'character');
        return `${index + 1}. ${char} (Confidence: ${detail?.confidence.toFixed(1) || 'N/A'}%)`;
      }),
      '',
      'NUMBERS DETECTED:',
      '================',
      ...results.numbers.map((num, index) => {
        const detail = results.detailedResults.find(d => d.text === num && d.type === 'number');
        return `${index + 1}. ${num} (Confidence: ${detail?.confidence.toFixed(1) || 'N/A'}%)`;
      }),
      '',
      'DETAILED RESULTS:',
      '================',
      ...results.detailedResults.map((item, index) => 
        `${index + 1}. ${item.text} | Type: ${item.type} | Confidence: ${item.confidence.toFixed(1)}% | Bbox: (${item.bbox.x0}, ${item.bbox.y0}) to (${item.bbox.x1}, ${item.bbox.y1})`
      )
    ].join('\n');

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cadastral_ocr_detailed_report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Detailed Report Downloaded",
      description: "Comprehensive OCR analysis report with confidence scores and coordinates."
    });
  };

  const highConfidenceItems = results.detailedResults.filter(item => item.confidence > 80);
  const mediumConfidenceItems = results.detailedResults.filter(item => item.confidence >= 60 && item.confidence <= 80);
  const lowConfidenceItems = results.detailedResults.filter(item => item.confidence < 60);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Advanced OCR Results
          </CardTitle>
          <div className="space-x-2">
            <Button onClick={downloadCSV} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Enhanced CSV
            </Button>
            <Button onClick={downloadDetailedReport} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Detailed Report
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhanced Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold text-blue-600">
              {results.characters.length}
            </div>
            <div className="text-sm text-gray-600">Characters</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Hash className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-600">
              {results.numbers.length}
            </div>
            <div className="text-sm text-gray-600">Numbers</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Target className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold text-purple-600">
              {results.confidence.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <Brain className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <div className="text-2xl font-bold text-orange-600">
              {highConfidenceItems.length}
            </div>
            <div className="text-sm text-gray-600">High Confidence</div>
          </div>
        </div>

        {/* Confidence Analysis */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Confidence Analysis
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-green-600 font-bold text-lg">{highConfidenceItems.length}</div>
              <div className="text-gray-600">High (80%+)</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-600 font-bold text-lg">{mediumConfidenceItems.length}</div>
              <div className="text-gray-600">Medium (60-80%)</div>
            </div>
            <div className="text-center">
              <div className="text-red-600 font-bold text-lg">{lowConfidenceItems.length}</div>
              <div className="text-gray-600">Low (&lt;60%)</div>
            </div>
          </div>
        </div>

        {/* Characters Section with Confidence */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Extracted Characters</h3>
            <Badge variant="secondary">{results.characters.length} items</Badge>
          </div>
          <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded">
            <div className="flex flex-wrap gap-2">
              {results.characters.map((char, index) => {
                const detail = results.detailedResults.find(d => d.text === char && d.type === 'character');
                const confidence = detail?.confidence || 0;
                const confidenceColor = confidence > 80 ? 'bg-green-100 border-green-300' : 
                                      confidence > 60 ? 'bg-yellow-100 border-yellow-300' : 
                                      'bg-red-100 border-red-300';
                return (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className={`text-sm ${confidenceColor} flex items-center gap-1`}
                    title={`Confidence: ${confidence.toFixed(1)}%`}
                  >
                    {char}
                    <span className="text-xs opacity-70">
                      {confidence.toFixed(0)}%
                    </span>
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>

        {/* Numbers Section with Confidence */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Hash className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Extracted Numbers</h3>
            <Badge variant="secondary">{results.numbers.length} items</Badge>
          </div>
          <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded">
            <div className="flex flex-wrap gap-2">
              {results.numbers.map((num, index) => {
                const detail = results.detailedResults.find(d => d.text === num && d.type === 'number');
                const confidence = detail?.confidence || 0;
                const confidenceColor = confidence > 80 ? 'bg-green-100 border-green-300' : 
                                      confidence > 60 ? 'bg-yellow-100 border-yellow-300' : 
                                      'bg-red-100 border-red-300';
                return (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className={`text-sm ${confidenceColor} flex items-center gap-1`}
                    title={`Confidence: ${confidence.toFixed(1)}%`}
                  >
                    {num}
                    <span className="text-xs opacity-70">
                      {confidence.toFixed(0)}%
                    </span>
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsDisplay;
