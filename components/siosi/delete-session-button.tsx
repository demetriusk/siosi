"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Trash } from 'lucide-react';

export default function DeleteSessionButton({ locale, sessionId }: { locale: string; sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // get access token from client-side supabase if available
      let token: string | undefined;
      try {
        const mod = await import('@/lib/supabase');
        const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
        if (typeof (maybeSupabase as any)?.auth?.getSession === 'function') {
          const res = await (maybeSupabase as any).auth.getSession();
          token = res?.data?.session?.access_token ?? res?.session?.access_token;
        } else if (typeof (maybeSupabase as any)?.auth?.getUser === 'function') {
          // older/newer supabase helpers may expose getUser
          const res = await (maybeSupabase as any).auth.getUser();
          token = res?.data?.user?.identities?.[0]?.access_token ?? res?.data?.access_token ?? undefined;
        } else if (typeof (maybeSupabase as any)?.auth?.session === 'function') {
          const s = (maybeSupabase as any).auth.session();
          token = s?.access_token;
        } else if (typeof (maybeSupabase as any)?.auth?.user === 'function') {
          const u = (maybeSupabase as any).auth.user();
          token = u?.access_token;
        }
      } catch (e) {
        // ignore - no token
      }

      if (!token) {
        // If we couldn't locate a client access token, ask the user to sign in.
        toast.error(t('auth.login_required') || 'Please log in to delete sessions');
        router.push(`/${locale}/login`);
        setLoading(false);
        return;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Failed to delete session');
        setLoading(false);
        return;
      }

      toast.success(t('sessions.deleted_toast') || 'Session deleted');
      // navigate back to sessions list
      router.push(`/${locale}/sessions`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Delete session error', err);
      toast.error('Failed to delete session');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white" onClick={() => setOpen(true)}>
        <Trash className="w-4 h-4 mr-2" />
        {t('sessions.delete') || 'Delete'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sessions.confirm_delete_title') || 'Delete session?'}</DialogTitle>
            <DialogDescription>
              {t('sessions.confirm_delete_desc') || 'This will permanently delete this session. This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="mr-2">
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleConfirm} className="bg-[#EF4444] hover:bg-[#DC2626] text-white" disabled={loading}>
              {loading ? (t('sessions.deleting') || 'Deleting...') : (t('sessions.delete') || 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
