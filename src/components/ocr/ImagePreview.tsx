
import React from 'react';
import { Card } from '@/components/ui/card';

interface ImagePreviewProps {
  imageSrc: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ imageSrc }) => {
  return (
    <div className="w-full">
      <Card className="overflow-hidden">
        <div className="relative">
          <img 
            src={imageSrc} 
            alt="Cadastral Map Preview" 
            className="w-full h-auto max-h-96 object-contain"
          />
          <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
            Preview
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ImagePreview;
