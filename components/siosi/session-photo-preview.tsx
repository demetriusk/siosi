"use client";

import Image from "next/image";
import { ZoomIn, X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";

type SessionPhotoPreviewProps = {
  src: string;
  alt: string;
  className?: string;
};

export function SessionPhotoPreview({ src, alt, className }: SessionPhotoPreviewProps) {
  const [open, setOpen] = useState(false);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "group relative block aspect-square w-full overflow-hidden rounded-sm bg-[#F9FAFB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F9FAFB]",
            className,
          )}
        >
          <Image
            src={src}
            alt={alt}
            width={800}
            height={800}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            priority={false}
            unoptimized
          />
          <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#0A0A0A]/80 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur">
            <ZoomIn size={14} />
            <span>Zoom</span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="w-[92vw] max-w-[960px] overflow-hidden border-0 bg-[#0A0A0A] p-0 sm:rounded-xl"
        aria-label={alt}
      >
        <div className="relative flex w-full flex-col">
          <DialogTitle>
            <VisuallyHidden>{alt}</VisuallyHidden>
          </DialogTitle>
          <DialogDescription>
            <VisuallyHidden>Tap or click anywhere on the photo to close</VisuallyHidden>
          </DialogDescription>
          <DialogClose asChild>
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#0A0A0A] shadow-lg transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{
                top: "calc(env(safe-area-inset-top, 0px) + 1rem)",
                right: "calc(env(safe-area-inset-right, 0px) + 1rem)",
              }}
            >
              <X size={18} />
              <span className="sr-only">Close dialog</span>
            </button>
          </DialogClose>
          <div className="relative flex h-[90vh] max-h-[720px] w-full items-center justify-center bg-[#0A0A0A]">
            <DialogClose asChild>
              <button
                type="button"
                onClick={handleClose}
                className="relative block h-full w-full cursor-zoom-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="(max-width: 768px) 90vw, 960px"
                  className="pointer-events-none object-contain"
                  unoptimized
                />
                <span className="pointer-events-none absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 rounded-full bg-[#0A0A0A]/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white sm:hidden">
                  Tap to close
                </span>
              </button>
            </DialogClose>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent" aria-hidden />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
