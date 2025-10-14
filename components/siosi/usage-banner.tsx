'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';

const ANONYMOUS_LIMIT = 2;

interface UsageBannerProps {
  locale: string;
}

export function UsageBanner({ locale }: UsageBannerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [remaining, setRemaining] = useState(ANONYMOUS_LIMIT);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);

        // If not authenticated, check localStorage
        if (!user) {
          const key = 'anonymous_analyses';
          const stored = localStorage.getItem(key);
          const count = stored ? parseInt(stored, 10) : 0;
          setRemaining(Math.max(0, ANONYMOUS_LIMIT - count));
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Don't show anything while checking
  if (isAuthenticated === null) return null;

  // Don't show for authenticated users
  if (isAuthenticated) return null;

  // Show limit reached message
  if (remaining === 0) {
    return (
      <Alert className="bg-red-50 border-red-200 mb-8">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertDescription className="ml-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-red-900 mb-1">
              You’ve reached your limit
            </p>
            <p className="text-sm text-red-700">
              Sign up for more analyses and save your results
            </p>
          </div>
          <Link href={`/${locale}/auth`}>
            <Button className="ml-4 bg-[#0A0A0A] text-white hover:bg-[#0A0A0A]/90 focus-visible:ring-[#0A0A0A]/50">
              Sign Up Free
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Show remaining analyses
  return (
    <Alert className="bg-white border-[#0A0A0A] mb-8">
      <ScanFace className="h-5 w-5 text-[#0A0A0A]" />
      <AlertDescription className="ml-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0A0A0A] mb-1">
            {remaining} {remaining === 1 ? 'analysis' : 'analyses'} remaining
          </p>
          <p className="text-sm text-[#4B5563]">
            Sign up for more analyses and to save your results
          </p>
        </div>
        <Link href={`/${locale}/auth`}>
          <Button className="ml-4 bg-[#0A0A0A] text-white hover:bg-[#0A0A0A]/90 focus-visible:ring-[#0A0A0A]/50">
            Sign Up Free
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}