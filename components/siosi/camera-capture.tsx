import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { RotateCcw, CameraOff, Sparkles } from 'lucide-react';
import logger from '@/lib/logger';

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
  facingMode?: 'user' | 'environment';
}

export function CameraCapture({ open, onClose, onCapture, facingMode = 'environment' }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const t = useTranslations('camera');

  useEffect(() => {
    setError(null);
    setHasPermission(true);
  }, [open]);

  useEffect(() => {
    async function startStream() {
      if (!open) {
        return;
      }
      setError(null);
      setIsCapturing(false);

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const stream = await window.navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err: any) {
        logger.error('Camera access failed', err);
        setHasPermission(false);
        setError(err?.message || 'Unable to access camera');
      }
    }

    startStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [open, facingMode]);

  const restartStream = async () => {
    if (!window.navigator.mediaDevices?.getUserMedia) {
      return;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setHasPermission(true);
    setError(null);
    try {
      const stream = await window.navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      logger.error('Retry camera access failed', err);
      setHasPermission(false);
      setError(err?.message || 'Unable to access camera');
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }
    try {
      setIsCapturing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas context unavailable');
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) {
        throw new Error('Failed to capture photo');
      }

      onCapture(blob);
    } catch (err: any) {
      logger.error('Capture failed', err);
      setError(err?.message || 'Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-video bg-black overflow-hidden rounded-sm">
          {!hasPermission || error ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#111827] text-white">
                <CameraOff className="w-7 h-7" />
              </div>
              <p className="text-sm text-[#FEE2E2] bg-[#7F1D1D] px-3 py-2 rounded">
                {t('error_prefix')} {error || t('permission_denied')}
              </p>
              <p className="text-xs text-[#F9FAFB]">
                {t('permission_help')}
              </p>
            </div>
          ) : (
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        <DialogFooter className="mt-4">
          <div className="flex w-full justify-between gap-3">
            <DialogClose asChild>
              <Button type="button" variant="ghost" onClick={handleClose} className="border border-[#E5E7EB]">
                {t('cancel')}
              </Button>
            </DialogClose>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={restartStream}
                disabled={isCapturing}
                className="border-[#E5E7EB]"
                title={t('retry')}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t('retry')}
              </Button>
              <Button
                type="button"
                onClick={handleCapture}
                disabled={!!error || isCapturing || !hasPermission}
                className="bg-[#0A0A0A] text-white hover:bg-[#111827] flex items-center"
              >
                {isCapturing ? (
                  t('capturing')
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('capture')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
