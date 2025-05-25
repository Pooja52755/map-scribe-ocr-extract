
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  FileText, 
  Search, 
  Download, 
  Zap, 
  Target,
  Upload,
  BarChart3
} from 'lucide-react';

const Index = () => {
  const features = [
    {
      icon: <Upload className="h-8 w-8 text-blue-600" />,
      title: "Easy Upload",
      description: "Drag and drop cadastral map images in various formats (JPEG, PNG, TIFF, BMP)"
    },
    {
      icon: <Search className="h-8 w-8 text-green-600" />,
      title: "Advanced OCR",
      description: "State-of-the-art optical character recognition specifically tuned for cadastral maps"
    },
    {
      icon: <FileText className="h-8 w-8 text-purple-600" />,
      title: "Text Detection",
      description: "Accurately extract place names, landowner details, and administrative identifiers"
    },
    {
      icon: <Target className="h-8 w-8 text-red-600" />,
      title: "Number Recognition",
      description: "Precise detection of plot numbers, survey codes, and numerical identifiers"
    },
    {
      icon: <Download className="h-8 w-8 text-orange-600" />,
      title: "Export Results",
      description: "Download extracted data in CSV or Excel format for further analysis"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-indigo-600" />,
      title: "Analytics",
      description: "View processing statistics, confidence scores, and performance metrics"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="flex items-center space-x-3">
                <MapPin className="h-12 w-12 text-blue-600" />
                <span className="text-4xl font-bold text-gray-900">OCR</span>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Cadastral Map
              <span className="text-blue-600"> OCR System</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Extract characters and numbers from cadastral maps with precision using advanced 
              machine learning and optical character recognition technology. Perfect for 
              digitizing legacy land documents and enabling modern geospatial workflows.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/ocr">
                <Button size="lg" className="text-lg px-8 py-3">
                  <Zap className="h-5 w-5 mr-2" />
                  Start Processing
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                <FileText className="h-5 w-5 mr-2" />
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Powerful Features for Cadastral Map Processing
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our OCR system is specifically designed to handle the unique challenges 
            of cadastral map digitization with high accuracy and efficiency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  {feature.icon}
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Digitize Your Cadastral Maps?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Transform your legacy land documents into digital, searchable formats 
            with our advanced OCR technology.
          </p>
          <Link to="/ocr">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              <Upload className="h-5 w-5 mr-2" />
              Upload Your First Map
            </Button>
          </Link>
        </div>
      </div>

      {/* Technical Details */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Technical Capabilities
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Supported Input Formats</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• JPEG/JPG images</li>
                <li>• PNG images</li>
                <li>• TIFF files</li>
                <li>• BMP images</li>
                <li>• High-resolution scanned documents</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Processing Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• Image preprocessing and noise reduction</li>
                <li>• Text region detection using ML models</li>
                <li>• Character and number segmentation</li>
                <li>• OCR with confidence scoring</li>
                <li>• Post-processing and validation</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
