"use client";

import Link from 'next/link';
import { Share2, Download, Upload, Copy, Instagram, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DeleteSessionButton from './delete-session-button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

type Props = { locale: string; sessionId: string };

export default function SessionActionsClient({ locale, sessionId }: Props) {
  const { toast } = useToast();
  const sessionUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${locale}/session/${sessionId}`
    : `/${locale}/session/${sessionId}`;

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function onNativeShare() {
    if (!canNativeShare) {
      toast({ title: 'Not available', description: 'Native share is not supported in this browser' });
      return;
    }

    try {
      await navigator.share({
        title: 'siOsi makeup analysis',
        text: 'Check out my siOsi makeup analysis',
        url: sessionUrl,
      });
        toast({ title: 'Shared', description: 'Shared via device share sheet' });
    } catch (err) {
      // user may cancel or share may fail
        toast({ title: 'Share cancelled', description: 'Share was not completed' });
    }
  }

  function onCopyLink() {
    if (!navigator?.clipboard) {
      toast({ title: 'Copy failed', description: 'Clipboard not available', variant: 'destructive' });
      return;
    }
    navigator.clipboard.writeText(sessionUrl).then(() => {
        toast({ title: 'Link copied', description: 'Session link copied to clipboard' });
    }, () => {
      toast({ title: 'Copy failed', description: 'Could not copy link', variant: 'destructive' });
    });
  }

  function onShareWhatsapp() {
    const text = encodeURIComponent(`Check out my siOsi makeup analysis: ${sessionUrl}`);
    const href = `https://wa.me/?text=${text}`;
    window.open(href, '_blank');
  }

  function onShareTelegram() {
    const text = encodeURIComponent(`Check out my siOsi makeup analysis: ${sessionUrl}`);
    const href = `https://t.me/share/url?url=${encodeURIComponent(sessionUrl)}&text=${text}`;
    window.open(href, '_blank');
  }

  function onShareInstagram() {
    // replaced by shareImage flow below - kept for compatibility but no-op
    // Instagram web doesn't support direct programmatic uploads. Use the image share flow instead.
    shareImage();
  }

  // --- Image poster generation + Web Share flow (friendly fallback) ---
  async function makePosterImage(photoUrl: string, titleText = 'siOsi analysis') {
    if (!photoUrl) return null;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photoUrl;
      await img.decode();

      const w = 1200;
      const h = 1400;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      // draw image centered with padding
      const pad = 80;
      const maxImgW = w - pad * 2;
      const maxImgH = h - 320; // leave room for caption area
      let iw = img.width;
      let ih = img.height;
      const scale = Math.min(maxImgW / iw, maxImgH / ih, 1);
      iw = Math.round(iw * scale);
      ih = Math.round(ih * scale);
      const ix = Math.round((w - iw) / 2);
      const iy = Math.round((h - ih) / 2) - 60;
      ctx.drawImage(img, ix, iy, iw, ih);

      // bottom caption box
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, h - 180, w, 180);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.font = 'bold 36px Arial, sans-serif';
      const xtext = pad;
      const ytext = h - 120;
      ctx.fillText(titleText, xtext, ytext);
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText('My siOsi makeup analysis', xtext, ytext + 40);

      return await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png', 0.9)
      );
    } catch (e) {
      return null;
    }
  }

  async function shareImage() {
    // Friendly, low-tech flow:
    // 1) Try to generate a poster image and use navigator.share(files) on devices that support it.
    // 2) If not supported or failed, download the image and copy a short caption to clipboard and show clear instructions via toast.

    if (!sessionUrl) {
      toast({ title: 'No image', description: 'No session URL available to share', variant: 'destructive' });
      return;
    }

    // Try to find the session photo on the page using the image URL from the sessionUrl context.
    // As a simple approach, fetch the session endpoint we already have which includes `photo_url`.
    try {
      // Try server-generated poster first (SVG) for better consistency
      let blob: Blob | null = null;
      try {
  const posterRes = await fetch(`/api/sessions/${sessionId}/poster`);
        if (posterRes.ok) {
          const contentType = posterRes.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const json = await posterRes.json();
            if (json?.url) {
              // fetch the PNG from storage
              const pngRes = await fetch(json.url);
              if (pngRes.ok) blob = await pngRes.blob();
            }
          } else if (contentType.includes('image/png')) {
            blob = await posterRes.blob();
          } else if (contentType.includes('image/svg')) {
            // server returned SVG (png generation not available) - convert to PNG client-side
            const svgText = await posterRes.text();
            const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = url;
            await img.decode();
            const c = document.createElement('canvas');
            c.width = img.naturalWidth || 1200;
            c.height = img.naturalHeight || 1400;
            const ctx = c.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0);
            blob = await new Promise<Blob | null>((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
            URL.revokeObjectURL(url);
          }
        }
      } catch (e) {
        // ignore and fallback to client poster
        blob = null;
      }

      if (!blob) {
        // fallback to client-side poster
        const sessionRes = await fetch(`/api/sessions/${sessionId}`);
        if (!sessionRes.ok) throw new Error('Failed to fetch session');
        const sessionData = await sessionRes.json();
        const photoUrl: string | undefined = sessionData?.photo_url;
        if (!photoUrl) {
          toast({ title: 'No photo', description: 'This session has no photo to share', variant: 'destructive' });
          return;
        }

        blob = await makePosterImage(photoUrl, 'siOsi analysis');
        if (!blob) throw new Error('Could not create image');
      }

      const file = new File([blob], `siosi-${sessionId}.png`, { type: 'image/png' });

      // Use Web Share API with files when available (mobile browsers)
      const canShareFiles = typeof (navigator as any).canShare === 'function' && (navigator as any).canShare({ files: [file] });
      if (canShareFiles) {
        try {
          await (navigator as any).share({ files: [file], title: 'siOsi analysis', text: 'Check out my siOsi makeup analysis' });
          toast({ title: 'Shared', description: 'Shared via device share sheet' });
          return;
        } catch (err) {
          // user cancelled or share failed, fall through to download fallback
        }
      }

      // Fallback: download the image and copy a suggested caption so low-tech users can follow simple steps.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `siosi-${sessionId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Copy a short caption to clipboard to make uploading easier for low-tech users
      const caption = 'My siOsi makeup analysis — see results: ' + sessionUrl;
      try {
        await navigator.clipboard.writeText(caption);
      } catch (e) {
        // ignore clipboard failures
      }

      toast({
        title: 'Image downloaded',
        description: 'Open Instagram (or another app) and upload the downloaded image. Caption copied to clipboard.',
      });
    } catch (e) {
      toast({ title: 'Share failed', description: 'Could not create shareable image', variant: 'destructive' });
    }
  }

  async function onSave() {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch session');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `siosi-session-${sessionId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Saved', description: 'Session JSON downloaded' });
    } catch (err) {
      toast({ title: 'Save failed', description: 'Could not download session', variant: 'destructive' });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="border-[#E5E7EB]">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {canNativeShare && (
            <>
              <DropdownMenuItem onSelect={onNativeShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onSelect={onSave}>
            <Download className="w-4 h-4 mr-2" />
            Save
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onShareInstagram}>
            <Instagram className="w-4 h-4 mr-2" />
            Share to Instagram
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onShareWhatsapp}>
            <MessageSquare className="w-4 h-4 mr-2 rotate-45" />
            Share to WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onShareTelegram}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Share to Telegram
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onCopyLink}>
            <Copy className="w-4 h-4 mr-2" />
            Copy link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Link href={`/${locale}/analyze`}>
        <Button variant="outline" size="sm" className="border-[#E5E7EB]">
          <Upload className="w-4 h-4 mr-2" />
          Analyze another
        </Button>
      </Link>

      <DeleteSessionButton locale={locale} sessionId={sessionId} />
    </div>
  );
}
