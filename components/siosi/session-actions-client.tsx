"use client";

import Link from 'next/link';
import { Share2, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DeleteSessionButton from './delete-session-button';

export default function SessionActionsClient({ locale, sessionId }: { locale: string; sessionId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="border-[#E5E7EB]">
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>
      <Button variant="outline" size="sm" className="border-[#E5E7EB]">
        <Download className="w-4 h-4 mr-2" />
        Save
      </Button>
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
