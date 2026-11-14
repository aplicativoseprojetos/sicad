'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Shield,
  Sun,
  Moon,
  UserCircle,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? null);
      }
    }
    fetchUser();
  }, [supabase.auth]);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const navLinks = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/cadastro',
      label: 'Novo Cadastro',
      icon: UserPlus,
    },
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <>
      <nav
        className={cn(
          'sticky top-0 z-50 h-16 border-b',
          'bg-white border-slate-200',
          'dark:bg-slate-900 dark:border-slate-800'
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Logo + App Name */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Shield className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              SICAD
            </span>
          </Link>

          {/* Center: Desktop Nav Links */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right: Theme Toggle + User Menu + Mobile Hamburger */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                'rounded-lg p-2 transition-colors',
                'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
                'dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              )}
              aria-label="Alternar tema"
            >
              {mounted ? (
                theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )
              ) : (
                <div className="h-5 w-5" />
              )}
            </button>

            {/* Desktop User Menu */}
            <div className="relative hidden md:block" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
                  'text-slate-600 hover:bg-slate-100',
                  'dark:text-slate-400 dark:hover:bg-slate-800',
                  userMenuOpen && 'bg-slate-100 dark:bg-slate-800'
                )}
                aria-label="Menu do usuário"
              >
                <UserCircle className="h-6 w-6" />
                {userEmail && (
                  <span className="max-w-[160px] truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                    {userEmail}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div
                  className={cn(
                    'absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border shadow-lg',
                    'bg-white border-slate-200',
                    'dark:bg-slate-900 dark:border-slate-700'
                  )}
                >
                  <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Conectado como
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {userEmail ?? '—'}
                    </p>
                  </div>
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        'text-red-600 hover:bg-red-50',
                        'dark:text-red-400 dark:hover:bg-red-950/40'
                      )}
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                'rounded-lg p-2 transition-colors md:hidden',
                'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
                'dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              )}
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-out Drawer */}
      <div
        ref={mobileMenuRef}
        className={cn(
          'fixed right-0 top-16 z-50 flex h-[calc(100vh-4rem)] w-72 flex-col border-l transition-transform duration-300 ease-in-out md:hidden',
          'bg-white border-slate-200',
          'dark:bg-slate-900 dark:border-slate-800',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navegação
          </p>
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* User Section at Bottom */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-3 px-1">
            <UserCircle className="h-8 w-8 shrink-0 text-slate-400 dark:text-slate-500" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                Conectado como
              </p>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {userEmail ?? '—'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              'bg-red-50 text-red-600 hover:bg-red-100',
              'dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60'
            )}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </>
  );
}
