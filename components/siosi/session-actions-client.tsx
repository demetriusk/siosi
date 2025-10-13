"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Share,
  Upload,
  EllipsisVertical,
  Download,
  Facebook,
  MessageCircle,
  MessageSquare,
  Copy,
  Trash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import DeleteSessionButton from './delete-session-button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import logger from '@/lib/logger';
import { SiWhatsapp } from '@icons-pack/react-simple-icons';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { format } from 'date-fns';

type Props = { locale: string; sessionId: string; createdAtIso: string };

type ShareTile = {
  key: string;
  label: string;
  icon: ReactNode;
  action: () => void;
};

export default function SessionActionsClient({ locale, sessionId, createdAtIso }: Props) {
  const sessionUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${locale}/session/${sessionId}`
    : `/${locale}/session/${sessionId}`;

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const formattedCreatedAt = useMemo(() => {
    try {
      return format(new Date(createdAtIso), 'MMMM d, yyyy • h:mm a');
    } catch {
      return createdAtIso;
    }
  }, [createdAtIso]);

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
        } else if (mounted) {
          setAuthChecked(true);
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
    window.open(href, '_blank', 'noopener');
  }

  function onShareMessenger() {
    const text = encodeURIComponent(`Check out my siOsi makeup analysis: ${sessionUrl}`);
    const href = `https://m.me/?link=${encodeURIComponent(sessionUrl)}&ref=${text}`;
    window.open(href, '_blank', 'noopener');
  }

  function onShareSms() {
    const body = encodeURIComponent(`Check out my siOsi makeup analysis: ${sessionUrl}`);
    const href = `sms:?&body=${body}`;
    window.location.href = href;
  }

  function onShareFacebook() {
    const href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sessionUrl)}`;
    window.open(href, '_blank', 'noopener');
  }

  async function downloadImage() {
    try {
      let blob: Blob | null = null;
      try {
        const posterRes = await fetch(`/api/sessions/${sessionId}/poster`);
        if (posterRes.ok) {
          const contentType = posterRes.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const json = await posterRes.json();
            if (json?.url) {
              const pngRes = await fetch(json.url);
              if (pngRes.ok) blob = await pngRes.blob();
            }
          } else if (contentType.includes('image/png')) {
            blob = await posterRes.blob();
          } else if (contentType.includes('image/svg')) {
            const svgText = await posterRes.text();
            const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = url;
            await img.decode();
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 1200;
            canvas.height = img.naturalHeight || 1400;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0);
            blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
            URL.revokeObjectURL(url);
          }
        }
      } catch (error) {
        logger.debug('Poster API fetch failed', error);
      }

      if (!blob) {
        const sessionRes = await fetch(`/api/sessions/${sessionId}`);
        if (!sessionRes.ok) throw new Error('Failed to fetch session');
        const sessionData = await sessionRes.json();
        const photoUrl: string | undefined = sessionData?.photo_url;
        if (!photoUrl) {
          toast.error('No photo', { description: 'This session has no photo to download' });
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = photoUrl;
        await img.decode();

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1200;
        canvas.height = img.naturalHeight || 1400;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const pad = 80;
        const maxImgW = canvas.width - pad * 2;
        const maxImgH = canvas.height - 320;
        let iw = img.width;
        let ih = img.height;
        const scale = Math.min(maxImgW / iw, maxImgH / ih, 1);
        iw = Math.round(iw * scale);
        ih = Math.round(ih * scale);
        const ix = Math.round((canvas.width - iw) / 2);
        const iy = Math.round((canvas.height - ih) / 2) - 60;
        ctx.drawImage(img, ix, iy, iw, ih);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, canvas.height - 180, canvas.width, 180);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px Verdana, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('siOsi analysis', pad, canvas.height - 120);
        ctx.font = '20px Verdana, sans-serif';
        ctx.fillText('My siOsi makeup analysis', pad, canvas.height - 80);
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.92));
      }

      if (!blob) throw new Error('Could not prepare image');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `siosi-${sessionId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Image downloaded', { description: 'Poster saved to your device' });
    } catch (error) {
      logger.error('Download image failed', error);
      toast.error('Download failed', { description: 'Could not create shareable image' });
    }
  }

  const shareTiles: ShareTile[] = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: <SiWhatsapp className="h-6 w-6" role="img" aria-hidden />,
      action: onShareWhatsapp,
    },
    {
      key: 'messenger',
      label: 'Messenger',
      icon: <MessageCircle className="h-6 w-6 text-[#2563EB]" />,
      action: onShareMessenger,
    },
    {
      key: 'sms',
      label: 'Message',
      icon: <MessageSquare className="h-6 w-6 text-[#10B981]" />,
      action: onShareSms,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: <Facebook className="h-6 w-6 text-[#1877F2]" />,
      action: onShareFacebook,
    },
  ];

  const handleShare = (action: () => void) => () => {
    try {
      action();
    } finally {
      setShareOpen(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Drawer open={shareOpen} onOpenChange={setShareOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-[#E5E7EB]"
            aria-label="Share session"
          >
            <Share className="h-4 w-4" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="pb-6">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-base font-semibold text-[#0A0A0A]">
              Share to
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-6 pb-2">
            <div className="grid grid-cols-4 gap-4">
              {shareTiles.map(({ key, label, icon, action }) => (
                <button
                  key={key}
                  type="button"
                  onClick={handleShare(action)}
                  className="flex flex-col items-center gap-2 text-xs font-medium text-[#111827]"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F4F6]">
                    {icon}
                  </span>
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-6 grid gap-2">
              {canNativeShare && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await onNativeShare();
                    setShareOpen(false);
                  }}
                  className="justify-start gap-2 border-[#E5E7EB]"
                >
                  <Share className="h-4 w-4" />
                  Share via device
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  onCopyLink();
                  setShareOpen(false);
                }}
                className="justify-start gap-2 border-[#E5E7EB]"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" className="mt-4 w-full text-sm text-[#6B7280]">
                Cancel
              </Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-[#E5E7EB]"
            aria-label="Session options"
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-[#0A0A0A]">
            {formattedCreatedAt}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {authChecked && isAuthenticated && (
            <DeleteSessionButton
              locale={locale}
              sessionId={sessionId}
              renderTriggerAction={({ openDialog }) => (
                <DropdownMenuItem
                  className="text-[#EF4444] focus:text-[#EF4444]"
                  onSelect={(event) => {
                    event.preventDefault();
                    openDialog();
                  }}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            />
          )}
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              downloadImage();
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download image
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Link href={`/${locale}/analyze`}>
        <Button variant="outline" size="sm" className="border-[#E5E7EB]">
          <Upload className="w-4 h-4 mr-2" />
          Analyze another
        </Button>
      </Link>
    </div>
  );
}
