'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import logger from '@/lib/logger';
import { CameraCapture } from '@/components/siosi/camera-capture';

// Dynamic import to prevent SSR
let validateFacePhoto: any = null;

export interface UploadZoneHandle {
  openFileDialog: () => void;
  openCameraCapture: () => void;
}

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  selectedFile?: File | null;
  onClearFile?: () => void;
}

export const UploadZone = forwardRef<UploadZoneHandle, UploadZoneProps>(function UploadZone({
  onFileSelect,
  accept = 'image/jpeg,image/png,image/heic,image/heif,image/webp,image/avif',
  maxSize = 10 * 1024 * 1024,
  selectedFile,
  onClearFile,
}, ref) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  
  const t = useTranslations('upload');
  const tHome = useTranslations('home');

  // Load face detection module client-side only
  useEffect(() => {
    if (typeof window === 'undefined') return;

    import('@/lib/face-detection').then((module) => {
      validateFacePhoto = module.validateFacePhoto;

      // Load models immediately
      module.loadFaceDetectionModels()
        .then(() => {
          setModelsReady(true);
          logger.info('Face detection models ready');
        })
        .catch((err) => {
          logger.error('Failed to load face detection', err);
          setError('Failed to initialize face detection. Please refresh.');
        });
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.navigator?.mediaDevices?.getUserMedia) {
      setCameraAvailable(false);
    } else {
      setCameraAvailable(true);
    }
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

  const validateFile = useCallback(async (file: File): Promise<boolean> => {
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

      logger.debug('Face validation passed', {
        faceCount: result.faceCount,
        confidence: result.confidence
      });

      setIsValidating(false);
      return true;

    } catch (error) {
      logger.error('Validation error', error);
      setError('Failed to validate photo. Please try again.');
      setIsValidating(false);
      return false;
    }
  }, [accept, maxSize, modelsReady, t]);

  const handleFile = useCallback(
    async (file: File) => {
      const isValid = await validateFile(file);
      
      if (isValid) {
        onFileSelect(file);
      }
    },
    [onFileSelect, validateFile]
  );

  const handleCameraCapture = useCallback(async (blob: Blob) => {
    try {
      const fileName = `camera-capture-${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
      await handleFile(file);
    } catch (err) {
      logger.error('Camera capture handling failed', err);
      setError(t('capture_failed'));
    } finally {
      setIsCameraOpen(false);
    }
  }, [handleFile, t]);

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

    // Allow re-selecting the same file/capture consecutively
    e.target.value = '';
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setError(null);
    if (onClearFile) {
      onClearFile();
    }
  };

  const showPreview = !!selectedFile && !!previewUrl && !isValidating;

  useImperativeHandle(ref, () => ({
    openFileDialog: () => {
      if (!modelsReady || isValidating) return;
      fileInputRef.current?.click();
    },
    openCameraCapture: () => {
      if (!modelsReady || isValidating) return;
      if (cameraAvailable === false) {
        cameraInputRef.current?.click();
        return;
      }
      if (typeof window === 'undefined' || !window.navigator?.mediaDevices?.getUserMedia) {
        setCameraAvailable(false);
        cameraInputRef.current?.click();
        return;
      }
      setCameraAvailable(true);
      setIsCameraOpen(true);
    },
  }), [cameraAvailable, isValidating, modelsReady]);

  return (
    <div className="space-y-3">
      {showPreview ? (
        <div className="relative bg-white border border-[#E5E7EB] rounded-sm p-4">
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 z-10 p-1.5 bg-white border border-[#E5E7EB] rounded-full hover:bg-[#F9FAFB] transition-colors"
            aria-label="Clear file"
          >
            <X className="w-4 h-4 text-[#0A0A0A]" />
          </button>
          <div className="aspect-video relative overflow-hidden rounded">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
              unoptimized
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#6B7280]" />
            <span className="text-sm text-[#6B7280] truncate">{selectedFile?.name}</span>
            <span className="text-xs text-[#9CA3AF]">
              ({selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : '0.00'} MB)
            </span>
          </div>
        </div>
      ) : (
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
            id="siosi-upload-photo"
            name="siosi-upload-photo"
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept={accept}
            onChange={handleInputChange}
            disabled={!modelsReady || isValidating}
          />
          <input
            id="siosi-upload-photo-camera"
            name="siosi-upload-photo-camera"
            ref={cameraInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
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
      )}
      
      {error && (
        <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-sm">
          <p className="text-sm text-[#991B1B] font-medium">
            {error}
          </p>
        </div>
      )}

      <CameraCapture
        open={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
        }}
        onCapture={handleCameraCapture}
      />
    </div>
  );
});