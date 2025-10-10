"use client";

import Link from 'next/link';
import { Share2, Download, Upload, Copy, Instagram } from 'lucide-react';
import type { SVGProps } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import DeleteSessionButton from './delete-session-button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import logger from '@/lib/logger';
import { cn } from '@/lib/utils';

type IconProps = SVGProps<SVGSVGElement>;

function WhatsAppIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...props}
      className={cn('w-4 h-4', className)}
    >
      <path
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.149-.67.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.173.198-.297.298-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.009-.372-.011-.571-.011-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.414-.074-.124-.272-.198-.57-.347zm-5.531 7.401h-.001a11.815 11.815 0 01-6.01-1.651l-.431-.256-4.463 1.165 1.189-4.351-.28-.446a11.86 11.86 0 01-1.815-6.266c.001-6.574 5.346-11.918 11.92-11.918 3.183 0 6.167 1.24 8.413 3.487a11.86 11.86 0 013.495 8.413c-.003 6.572-5.348 11.917-11.917 11.917zm0-21.633C6.405.15 1.28 5.273 1.278 11.98c0 2.353.621 4.653 1.799 6.664l.115.188-1.271 4.657 4.781-1.252.183.109a10.61 10.61 0 005.621 1.607h.005c5.89 0 10.684-4.792 10.686-10.681.002-2.847-1.108-5.523-3.124-7.541A10.61 10.61 0 0011.94.15z"
        fill="currentColor"
      />
    </svg>
  );
}

function TelegramIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...props}
      className={cn('w-4 h-4', className)}
    >
      <path
        d="M11.944 0C5.355 0 0 5.355 0 11.944c0 6.59 5.355 11.944 11.944 11.944 6.59 0 11.944-5.355 11.944-11.944C23.888 5.355 18.533 0 11.944 0zm5.524 7.871l-1.444 6.805c-.109.484-.399.603-.809.375l-2.237-1.648-1.078 1.039c-.119.119-.219.219-.449.219l.16-2.188 3.987-3.597c.173-.16-.038-.25-.269-.09l-4.93 3.105-2.121-.664c-.46-.145-.47-.46.096-.684l8.29-3.189c.384-.145.718.09.594.684z"
        fill="currentColor"
      />
    </svg>
  );
}

type Props = { locale: string; sessionId: string };

export default function SessionActionsClient({ locale, sessionId }: Props) {
  // use sonner toast directly
  const sessionUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${locale}/session/${sessionId}`
    : `/${locale}/session/${sessionId}`;

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    let listener: any = null;

    async function resolveAuth() {
      try {
        const mod = await import('@/lib/supabase');
        const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;

        if (!maybeSupabase?.auth) {
          if (mounted) setAuthChecked(true);
          return;
        }

        if (typeof maybeSupabase.auth.getUser === 'function') {
          const { data } = await maybeSupabase.auth.getUser();
          if (mounted) {
            setIsAuthenticated(!!data?.user);
            setAuthChecked(true);
          }
        } else if (typeof maybeSupabase.auth.user === 'function') {
          const user = maybeSupabase.auth.user();
          if (mounted) {
            setIsAuthenticated(!!user);
            setAuthChecked(true);
          }
        } else if (typeof maybeSupabase.auth.getSession === 'function') {
          const { data } = await maybeSupabase.auth.getSession();
          if (mounted) {
            setIsAuthenticated(!!data?.session?.user);
            setAuthChecked(true);
          }
        } else {
          if (mounted) setAuthChecked(true);
        }

        listener = maybeSupabase.auth.onAuthStateChange?.((event: string, session: any) => {
          if (!mounted) return;
          setIsAuthenticated(!!session?.user);
          setAuthChecked(true);
        });
      } catch (error) {
        logger.debug('Session actions auth check failed', error);
        if (mounted) setAuthChecked(true);
      }
    }

    resolveAuth();

    return () => {
      mounted = false;
      try {
        const subscription = listener?.data?.subscription ?? listener?.subscription;
        subscription?.unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, []);

  async function onNativeShare() {
    if (!canNativeShare) {
  toast('Not available', { description: 'Native share is not supported in this browser' });
      return;
    }

    try {
      await navigator.share({
        title: 'siOsi makeup analysis',
        text: 'Check out my siOsi makeup analysis',
        url: sessionUrl,
      });
  toast.success('Shared', { description: 'Shared via device share sheet' });
    } catch (error) {
      logger.debug('Native share cancelled or failed', error);
      toast('Share cancelled', { description: 'Share was not completed' });
    }
  }

  function onCopyLink() {
    if (!navigator?.clipboard) {
  toast.error('Copy failed', { description: 'Clipboard not available' });
      return;
    }
    navigator.clipboard.writeText(sessionUrl)
      .then(() => {
        toast.success('Link copied', { description: 'Session link copied to clipboard' });
      })
      .catch((error) => {
        logger.warn('Clipboard write failed', error);
        toast.error('Copy failed', { description: 'Could not copy link' });
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
    } catch (error) {
      logger.debug('Poster image generation failed', error);
      return null;
    }
  }

  async function shareImage() {
    // Friendly, low-tech flow:
    // 1) Try to generate a poster image and use navigator.share(files) on devices that support it.
    // 2) If not supported or failed, download the image and copy a short caption to clipboard and show clear instructions via toast.

    if (!sessionUrl) {
  toast.error('No image', { description: 'No session URL available to share' });
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
      } catch (error) {
        logger.debug('Poster API fetch failed', error);
        blob = null;
      }

      if (!blob) {
        // fallback to client-side poster
        const sessionRes = await fetch(`/api/sessions/${sessionId}`);
        if (!sessionRes.ok) throw new Error('Failed to fetch session');
        const sessionData = await sessionRes.json();
        const photoUrl: string | undefined = sessionData?.photo_url;
        if (!photoUrl) {
          toast.error('No photo', { description: 'This session has no photo to share' });
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
          toast.success('Shared', { description: 'Shared via device share sheet' });
          return;
        } catch (error) {
          logger.debug('Native share failed or was cancelled', error);
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
      } catch (error) {
        logger.debug('Failed to copy caption to clipboard', error);
      }

    toast('Image downloaded', { description: 'Open Instagram (or another app) and upload the downloaded image. Caption copied to clipboard.' });
    } catch (error) {
      logger.error('Share poster generation failed', error);
      toast.error('Share failed', { description: 'Could not create shareable image' });
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
  toast.success('Saved', { description: 'Session JSON downloaded' });
    } catch (error) {
      logger.error('Save session export failed', error);
      toast.error('Save failed', { description: 'Could not download session' });
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
            <WhatsAppIcon className="mr-2" />
            Share to WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onShareTelegram}>
            <TelegramIcon className="mr-2" />
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

      {authChecked && isAuthenticated && (
        <DeleteSessionButton locale={locale} sessionId={sessionId} />
      )}
    </div>
  );
}
