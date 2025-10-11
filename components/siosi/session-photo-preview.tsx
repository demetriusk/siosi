"use client";

import Image from "next/image";
import { ZoomIn, X } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useState } from "react";

type SessionPhotoPreviewProps = {
  src: string;
  alt: string;
  className?: string;
};

export function SessionPhotoPreview({ src, alt, className }: SessionPhotoPreviewProps) {
  const [open, setOpen] = useState(false);

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
        className="max-w-5xl w-[min(92vw,960px)] border-0 bg-[#0A0A0A] p-0 sm:rounded-xl"
        aria-label={alt}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#0A0A0A] shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X size={18} />
          <span className="sr-only">Close</span>
        </button>
        <div className="relative flex h-[min(90vh,720px)] w-full items-center justify-center bg-[#0A0A0A]">
          <div className="relative h-full w-full">
            <Image
              src={src}
              alt={alt}
              fill
              sizes="(max-width: 768px) 90vw, 960px"
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
