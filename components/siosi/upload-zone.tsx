'use client';

import { useCallback, useState } from 'react';
import { useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('upload');
  const tHome = useTranslations('home');

  const validateFile = useCallback((file: File): boolean => {
    if (file.size > maxSize) {
      setError(t('file_too_large'));
      return false;
    }

    const acceptedTypes = accept.split(',').map((s) => s.trim());
    if (!acceptedTypes.includes(file.type)) {
      setError(t('invalid_format'));
      return false;
    }

    setError(null);
    return true;
  }, [maxSize, accept, t]);

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        onFileSelect(file);
        // Revoke previous preview URL if any before creating a new one
        setPreviewUrl(prev => {
          if (prev) {
            try { URL.revokeObjectURL(prev); } catch {}
          }
          return URL.createObjectURL(file);
        });
      }
    },
    [onFileSelect, validateFile]
  );

  // If a selectedFile is provided from outside (for example restored from
  // sessionStorage in the analyze page), create an object URL so the
  // preview can be shown. Clean up the object URL on change/unmount.
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

  if (selectedFile && previewUrl) {
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
    <div>
      <label
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative block w-full cursor-pointer
          border-2 border-dashed rounded-sm
          transition-all duration-200
          ${isDragging
            ? 'border-[#0A0A0A] bg-[#F9FAFB]'
            : 'border-[#D1D5DB] hover:border-[#6B7280] bg-white'
          }
          ${error ? 'border-[#EF4444]' : ''}
        `}
      >
        <input
          type="file"
          className="sr-only"
          accept={accept}
          onChange={handleInputChange}
        />
        <div className="py-12 px-6 text-center">
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-[#0A0A0A]' : 'text-[#6B7280]'}`} />
          <p className="text-base font-medium text-[#0A0A0A] mb-2">
            {t('drag_drop')}
          </p>
          <p className="text-sm text-[#6B7280]">
            {tHome('supported_formats')}
          </p>
        </div>
      </label>
      {error && (
        <p className="mt-2 text-sm text-[#EF4444]">{error}</p>
      )}
    </div>
  );
}
