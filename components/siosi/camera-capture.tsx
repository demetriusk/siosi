import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { RotateCcw, CameraOff, Sparkles, RefreshCw } from 'lucide-react';
import logger from '@/lib/logger';
import { ensureFaceApiReady } from '@/lib/face-detection';
import type { FaceLandmarks68 } from '@vladmandic/face-api';

type FaceApiModule = typeof import('@vladmandic/face-api');

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
  facingMode?: 'user' | 'environment';
}

export function CameraCapture({ open, onClose, onCapture, facingMode = 'environment' }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceApiRef = useRef<FaceApiModule | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const isDetectingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment' | null>(null);
  const [canToggleCamera, setCanToggleCamera] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const t = useTranslations('camera');

  useEffect(() => {
    setError(null);
    setHasPermission(true);
    setCanToggleCamera(false);
  }, [open]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const query = window.matchMedia('(max-width: 768px)');

    const updateView = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsMobileView(event.matches);
    };

    updateView(query);

    const listener = (event: MediaQueryListEvent) => updateView(event);

    if (query.addEventListener) {
      query.addEventListener('change', listener);
      return () => query.removeEventListener('change', listener);
    }

    query.addListener(listener);
    return () => query.removeListener(listener);
  }, []);

  useEffect(() => {
    if (open) {
      const nextMode: 'user' | 'environment' = isMobileView ? 'user' : facingMode;
      setCurrentFacingMode((prev) => (prev === nextMode ? prev : nextMode));
    }
  }, [open, facingMode, isMobileView]);
  const clearOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      window.clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    isDetectingRef.current = false;
    clearOverlay();
  }, [clearOverlay]);

  const updateCameraToggleAvailability = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      setCanToggleCamera(false);
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((device) => device.kind === 'videoinput');
      setCanToggleCamera(videoInputs.length > 1);
    } catch (err) {
      logger.warn('Unable to enumerate camera devices', err);
      setCanToggleCamera(false);
    }
  }, []);

  const drawLandmarks = useCallback((ctx: CanvasRenderingContext2D, landmarks: FaceLandmarks68) => {
    const canvas = ctx.canvas;
    const strokeWidth = Math.max(1.2, Math.min(3, canvas.width / 640));
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = 'rgba(17, 24, 39, 0.85)';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const drawPath = (points: Array<{ x: number; y: number }>, closed = false) => {
      if (!points.length) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (closed) {
        ctx.closePath();
      }
      ctx.stroke();
    };

    drawPath(landmarks.getJawOutline());
    drawPath(landmarks.getLeftEyeBrow());
    drawPath(landmarks.getRightEyeBrow());
    drawPath(landmarks.getNose());
    drawPath(landmarks.getLeftEye(), true);
    drawPath(landmarks.getRightEye(), true);
    drawPath(landmarks.getMouth(), true);
  }, []);

  const detectLandmarks = useCallback(async () => {
    if (isDetectingRef.current) {
      return;
    }
    const faceapi = faceApiRef.current;
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;

    if (!faceapi || !video || !canvas) {
      return;
    }

    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    isDetectingRef.current = true;

    try {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 }))
        .withFaceLandmarks();

      if (detection && detection.landmarks) {
        drawLandmarks(ctx, detection.landmarks);
      }
    } catch (err) {
      logger.error('Face landmark detection failed', err);
    } finally {
      isDetectingRef.current = false;
    }
  }, [drawLandmarks]);

  const startDetectionLoop = useCallback(() => {
    if (detectionIntervalRef.current) {
      return;
    }

    detectLandmarks();
    detectionIntervalRef.current = window.setInterval(detectLandmarks, 450);
  }, [detectLandmarks]);

  const initializeStream = useCallback(
    async (mode: 'user' | 'environment') => {
      if (typeof window === 'undefined' || !window.navigator.mediaDevices?.getUserMedia) {
        setHasPermission(false);
        setError('Camera not supported');
        return;
      }

      stopDetection();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      clearOverlay();
      setError(null);
      setIsCapturing(false);
      setCanToggleCamera(false);

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: mode },
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

        setHasPermission(true);
        await updateCameraToggleAvailability();
        startDetectionLoop();
      } catch (err: any) {
        logger.error('Camera access failed', err);
        setHasPermission(false);
        setCanToggleCamera(false);
        setError(err?.message || 'Unable to access camera');
      }
    },
    [clearOverlay, startDetectionLoop, stopDetection, updateCameraToggleAvailability]
  );

  useEffect(() => {
    let cancelled = false;

    async function initFaceDetection() {
      if (!open || !hasPermission || error) {
        return;
      }

      try {
        const faceapi = await ensureFaceApiReady();
        if (cancelled) {
          return;
        }
        faceApiRef.current = faceapi;
        startDetectionLoop();
      } catch (err) {
        logger.error('Failed to initialize face landmarks', err);
      }
    }

    if (open) {
      initFaceDetection();
    }

    return () => {
      cancelled = true;
      stopDetection();
    };
  }, [open, hasPermission, error, startDetectionLoop, stopDetection]);

  const restartStream = useCallback(async () => {
    if (!currentFacingMode) {
      return;
    }
    await initializeStream(currentFacingMode);
  }, [currentFacingMode, initializeStream]);

  const toggleFacingMode = useCallback(() => {
    setCurrentFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  useEffect(() => {
    if (!open || !currentFacingMode) {
      return;
    }
    initializeStream(currentFacingMode);

    return () => {
      stopDetection();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [open, currentFacingMode, initializeStream, stopDetection]);

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
    stopDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    faceApiRef.current = null;
    setCanToggleCamera(false);
    setCurrentFacingMode(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <DialogContent className="left-0 top-0 h-dvh w-dvw max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 overflow-hidden sm:left-1/2 sm:top-1/2 sm:h-auto sm:w-full sm:max-w-3xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border sm:p-6">
        <div className="flex h-full flex-col">
          <DialogHeader className="px-4 pt-6 pb-4 sm:px-0 sm:pt-0">
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>
          <div className="relative flex-1 bg-black">
            {!hasPermission || error ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#111827] text-white">
                  <CameraOff className="h-7 w-7" />
                </div>
                <p className="rounded bg-[#7F1D1D] px-3 py-2 text-sm text-[#FEE2E2]">
                  {t('error_prefix')} {error || t('permission_denied')}
                </p>
                <p className="text-xs text-[#F9FAFB]">{t('permission_help')}</p>
              </div>
            ) : (
              <>
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
                <canvas
                  ref={overlayCanvasRef}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  aria-hidden="true"
                />
              </>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
          <DialogFooter className="mt-4 px-4 pb-6 sm:mt-6 sm:px-0 sm:pb-0">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <DialogClose asChild>
                <Button type="button" variant="ghost" onClick={handleClose} className="border border-[#E5E7EB]">
                  {t('cancel')}
                </Button>
              </DialogClose>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={restartStream}
                    disabled={isCapturing}
                    className="border-[#E5E7EB]"
                    title={t('retry')}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t('retry')}
                  </Button>
                  {canToggleCamera ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        toggleFacingMode();
                      }}
                      disabled={isCapturing}
                      className="border-[#E5E7EB]"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {currentFacingMode === 'user' ? t('switch_to_standard') : t('switch_to_selfie')}
                    </Button>
                  ) : null}
                </div>
                <Button
                  type="button"
                  onClick={handleCapture}
                  disabled={!!error || isCapturing || !hasPermission}
                  className="flex items-center bg-[#0A0A0A] text-white hover:bg-[#111827]"
                >
                  {isCapturing ? (
                    t('capturing')
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {t('capture')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
