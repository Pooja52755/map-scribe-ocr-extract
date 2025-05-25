
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Hash } from 'lucide-react';
import { OCRResult } from '@/pages/OCRProcessor';
import { useToast } from '@/hooks/use-toast';

interface ResultsDisplayProps {
  results: OCRResult;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results }) => {
  const { toast } = useToast();

  const downloadCSV = () => {
    const csvContent = [
      'Type,Value',
      ...results.characters.map(char => `Character,"${char}"`),
      ...results.numbers.map(num => `Number,${num}`)
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
      title: "CSV Downloaded",
      description: "OCR results have been exported to CSV file."
    });
  };

  const downloadExcel = () => {
    // For demonstration - in a real app you'd use a library like xlsx
    toast({
      title: "Excel Export",
      description: "Excel export functionality would be implemented here using libraries like xlsx."
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Extraction Results</CardTitle>
          <div className="space-x-2">
            <Button onClick={downloadCSV} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button onClick={downloadExcel} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold text-blue-600">
              {results.characters.length}
            </div>
            <div className="text-sm text-gray-600">Text Items</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Hash className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-600">
              {results.numbers.length}
            </div>
            <div className="text-sm text-gray-600">Numbers</div>
          </div>
        </div>

        {/* Characters Section */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Extracted Characters</h3>
            <Badge variant="secondary">{results.characters.length} items</Badge>
          </div>
          <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded">
            <div className="flex flex-wrap gap-2">
              {results.characters.map((char, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {char}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Numbers Section */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Hash className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Extracted Numbers</h3>
            <Badge variant="secondary">{results.numbers.length} items</Badge>
          </div>
          <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded">
            <div className="flex flex-wrap gap-2">
              {results.numbers.map((num, index) => (
                <Badge key={index} variant="outline" className="text-sm bg-green-50">
                  {num}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsDisplay;
