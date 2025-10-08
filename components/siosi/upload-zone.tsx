'use client';

import { useCallback, useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Dynamic import to prevent SSR
let validateFacePhoto: any = null;
let loadFaceDetectionModels: any = null;

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  selectedFile?: File | null;
  onClearFile?: () => void;
}

export function UploadZone({
  onFileSelect,
  accept = 'image/jpeg,image/png,image/heic',
  maxSize = 10 * 1024 * 1024,
  selectedFile,
  onClearFile,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  
  const t = useTranslations('upload');
  const tHome = useTranslations('home');

  // Load face detection module client-side only
  useEffect(() => {
    if (typeof window === 'undefined') return;

    import('@/lib/face-detection').then((module) => {
      validateFacePhoto = module.validateFacePhoto;
      loadFaceDetectionModels = module.loadFaceDetectionModels;

      // Load models immediately
      module.loadFaceDetectionModels()
        .then(() => {
          setModelsReady(true);
          console.log('✓ Face detection ready');
        })
        .catch((err) => {
          console.error('Failed to load face detection:', err);
          setError('Failed to initialize face detection. Please refresh.');
        });
    });
  }, []);

  // Clean up preview URL when selectedFile changes
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const validateFile = async (file: File): Promise<boolean> => {
    // Basic file validation
    if (file.size > maxSize) {
      setError(t('file_too_large'));
      return false;
    }

    const acceptedTypes = accept.split(',').map(t => t.trim());
    if (!acceptedTypes.includes(file.type)) {
      setError(t('invalid_format'));
      return false;
    }

    // Face detection validation
    if (!modelsReady || !validateFacePhoto) {
      setError('Face detection is still loading. Please wait.');
      return false;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await validateFacePhoto(file);

      if (!result.valid) {
        setError(result.error || 'Invalid photo');
        setIsValidating(false);
        return false;
      }

      console.log('✓ Face validation passed:', {
        faceCount: result.faceCount,
        confidence: result.confidence
      });

      setIsValidating(false);
      return true;

    } catch (err) {
      console.error('Validation error:', err);
      setError('Failed to validate photo. Please try again.');
      setIsValidating(false);
      return false;
    }
  };

  const handleFile = useCallback(
    async (file: File) => {
      const isValid = await validateFile(file);
      
      if (isValid) {
        onFileSelect(file);
      }
    },
    [onFileSelect, modelsReady]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setError(null);
    if (onClearFile) {
      onClearFile();
    }
  };

  // Show preview if file selected and validated
  if (selectedFile && previewUrl && !isValidating) {
    return (
      <div className="relative bg-white border border-[#E5E7EB] rounded-sm p-4">
        <button
          onClick={handleClear}
          className="absolute top-2 right-2 z-10 p-1.5 bg-white border border-[#E5E7EB] rounded-full hover:bg-[#F9FAFB] transition-colors"
          aria-label="Clear file"
        >
          <X className="w-4 h-4 text-[#0A0A0A]" />
        </button>
        <div className="aspect-video relative overflow-hidden rounded">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm text-[#6B7280] truncate">{selectedFile.name}</span>
          <span className="text-xs text-[#9CA3AF]">
            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative block w-full cursor-pointer
          border-2 border-dashed rounded-sm
          transition-all duration-200
          ${!modelsReady || isValidating ? 'pointer-events-none opacity-60' : ''}
          ${isDragging ? 'border-[#0A0A0A] bg-[#F9FAFB]' : 'border-[#D1D5DB] hover:border-[#6B7280] bg-white'}
          ${error ? 'border-[#EF4444]' : ''}
        `}
      >
        <input
          type="file"
          className="sr-only"
          accept={accept}
          onChange={handleInputChange}
          disabled={!modelsReady || isValidating}
        />
        <div className="py-12 px-6 text-center">
          {!modelsReady ? (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-[#6B7280] animate-spin" />
              <p className="text-base font-medium text-[#0A0A0A] mb-2">
                Loading face detection...
              </p>
              <p className="text-sm text-[#6B7280]">
                Just a moment
              </p>
            </>
          ) : isValidating ? (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-[#6B7280] animate-spin" />
              <p className="text-base font-medium text-[#0A0A0A] mb-2">
                Validating photo...
              </p>
              <p className="text-sm text-[#6B7280]">
                Checking face detection
              </p>
            </>
          ) : (
            <>
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-[#0A0A0A]' : 'text-[#6B7280]'}`} />
              <p className="text-base font-medium text-[#0A0A0A] mb-2">
                {t('drag_drop')}
              </p>
              <p className="text-sm text-[#6B7280]">
                {tHome('supported_formats')}
              </p>
            </>
          )}
        </div>
      </label>
      
      {error && (
        <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-sm">
          <p className="text-sm text-[#991B1B] font-medium">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}