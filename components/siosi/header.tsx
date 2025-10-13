'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import LanguageSelect from './language-select';
// NOTE: we purposely avoid importing `supabase` at module scope here to prevent
// bundling server-side vendor chunks into client-side runtime. We'll dynamically
// load it inside the client effect where needed.

interface HeaderProps {
  locale: string;
}

export function Header({ locale }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('nav');
  const [user, setUser] = useState<any>(null);

  // Basic navigation items. Keep these simple and locale-aware.
  const navigation = [
    { name: t('about'), href: `/${locale}/about` }
  ];

  const privateNav = [
    { name: t('sessions'), href: `/${locale}/sessions` },
    { name: t('profile'), href: `/${locale}/profile` }
  ];

  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      try {
        // dynamically import the supabase client from our helper module.
        const mod = await import('@/lib/supabase');
        const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;

        // try to read the current session/user from Supabase
        const maybeGetUser = (maybeSupabase as any)?.auth?.getUser ?? (maybeSupabase as any)?.auth?.user;
        if (maybeGetUser) {
          // supabase v2: getUser()
          if (typeof (maybeSupabase as any)?.auth?.getUser === 'function') {
            const { data } = await (maybeSupabase as any).auth.getUser();
            if (mounted) setUser(data?.user ?? null);
          } else if (typeof (maybeSupabase as any)?.auth?.user === 'function') {
            if (mounted) setUser((maybeSupabase as any).auth.user());
          }
        }
      } catch {
        // ignore
      }
    };

    fetchUser();

    // try to subscribe to auth changes if available
    let listener: any = null;
    (async () => {
      try {
        const mod = await import('@/lib/supabase');
        const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
        listener = (maybeSupabase as any)?.auth?.onAuthStateChange?.((event: string, session: any) => {
          if (!mounted) return;
          setUser(session?.user ?? null);
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
      try {
        if (listener?.subscription?.unsubscribe) listener.subscription.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, []);

  const isActive = (href: string) => pathname === href;

  return (
    <header className="bg-white/75 backdrop-blur-sm border-b border-[#E5E7EB] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          <div className="flex gap-6">

            <Link href={`/${locale}`} className="flex items-center group">
              <div className="logo-mask w-8 h-8 mr-3 flex-none overflow-visible" aria-hidden></div>
              <span className="text-2xl tracking-tight text-[#0A0A0A]">siOsi</span>
            </Link>

            <nav className="hidden md:flex items-center gap-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-medium ${isActive(item.href) ? 'text-[#0A0A0A]' : 'text-[#6B7280] hover:text-[#0A0A0A]'}`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {privateNav.map((item) => (
                  <Link key={item.name} href={item.href} className="text-sm text-[#6B7280] hover:text-[#0A0A0A]">
                    {item.name}
                  </Link>
                ))}

              </div>
            ) : (
              <Link href={`/${locale}/auth`} className="text-sm text-[#6B7280] hover:text-[#0A0A0A]">
                {t('login')}
              </Link>
            )}
            {!user && (
              <div className="w-40">
                <LanguageSelect locale={locale} />
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#0A0A0A]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E7EB] bg-white">
          <nav className="px-4 py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-base font-medium rounded transition-colors ${
                  isActive(item.href) ? 'text-[#0A0A0A] bg-[#F9FAFB]' : 'text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F9FAFB]'
                }`}
              >
                {item.name}
              </Link>
            ))}

            {user ? (
              <div className="space-y-2">
                {privateNav.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium rounded text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F9FAFB]"
                  >
                    {item.name}
                  </Link>
                ))}

                <button
                  onClick={async () => {
                    try {
                      const mod = await import('@/lib/supabase');
                      const maybeSupabase = (mod as any).supabase ?? (mod as any).default ?? null;
                      await (maybeSupabase as any)?.auth?.signOut?.();
                    } catch {
                      // ignore
                    }
                    setMobileMenuOpen(false);
                    router.push(`/${locale}/auth`);
                  }}
                  className="w-full text-left px-3 py-2 text-base font-medium rounded text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F9FAFB]"
                >
                  {t('logout')}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href={`/${locale}/auth`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-base font-medium rounded text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F9FAFB]"
                >
                  {t('login')}
                </Link>
              </div>
            )}

            {!user && (
              <div className="px-3 py-2">
                <div className="w-full">
                  <LanguageSelect locale={locale} onChangeClose={() => setMobileMenuOpen(false)} />
                </div>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
