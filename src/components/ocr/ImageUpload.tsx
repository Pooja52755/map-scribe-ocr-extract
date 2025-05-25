
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageUpload(acceptedFiles[0]);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.tiff', '.bmp']
    },
    multiple: false
  });

  return (
    <Card className={`border-2 border-dashed transition-colors cursor-pointer ${
      isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
    }`}>
      <div {...getRootProps()} className="p-8 text-center">
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          {isDragActive ? (
            <Upload className="h-12 w-12 text-blue-500" />
          ) : (
            <ImageIcon className="h-12 w-12 text-gray-400" />
          )}
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragActive ? 'Drop the image here' : 'Upload cadastral map'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop or click to select an image file
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports: JPEG, PNG, TIFF, BMP
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ImageUpload;
