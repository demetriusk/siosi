'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const UPDATE_POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function RegisterSW() {
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    let pollInterval: number | undefined;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        pollInterval = window.setInterval(() => registration.update(), UPDATE_POLL_INTERVAL_MS);

        if (registration.waiting) {
          waitingWorkerRef.current = registration.waiting;
          setUpdateReady(true);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorkerRef.current = registration.waiting;
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => {});

    const onControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      if (pollInterval) {
        window.clearInterval(pollInterval);
      }
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    waitingWorkerRef.current?.postMessage({ type: 'SKIP_WAITING' });
  };

  if (!updateReady) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-full bg-[#0A0A0A] px-4 py-2 shadow-lg shadow-black/20">
        <span className="text-sm font-medium text-white">Update available</span>
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full bg-white px-3 text-xs font-semibold text-black hover:bg-white/90"
          onClick={applyUpdate}
        >
          Reload
        </Button>
      </div>
    </div>
  );
}
