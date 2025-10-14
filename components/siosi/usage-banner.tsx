'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
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
      <Alert className="bg-red-50 border-red-200">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertDescription className="ml-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-red-900 mb-1">
              You've reached your limit
            </p>
            <p className="text-sm text-red-700">
              Sign up for unlimited analyses and save your results
            </p>
          </div>
          <Link href={`/${locale}/auth`}>
            <Button className="bg-red-600 hover:bg-red-700 text-white ml-4">
              Sign Up Free
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Show remaining analyses
  return (
    <Alert className="bg-blue-50 border-blue-200">
      <Sparkles className="h-5 w-5 text-blue-600" />
      <AlertDescription className="ml-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-1">
            {remaining} {remaining === 1 ? 'analysis' : 'analyses'} remaining
          </p>
          <p className="text-sm text-blue-700">
            Sign up for unlimited analyses and to save your results
          </p>
        </div>
        <Link href={`/${locale}/auth`}>
          <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 ml-4">
            Sign Up Free
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}