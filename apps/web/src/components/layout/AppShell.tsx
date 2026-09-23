import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Menu, X } from 'lucide-react';
import { cn, Button } from '@ytp/ui';
import { useAuthStore } from '@/stores/auth-store.js';
import { logoutUser } from '@/features/auth/auth.api.js';
import { PageTransition } from '@/components/motion/PageTransition.js';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/', label: 'Analyze', end: true },
  { to: '/history', label: 'History' },
  { to: '/collections', label: 'Collections' },
  { to: '/downloads', label: 'Downloads' },
  { to: '/settings', label: 'Settings' },
];

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean | undefined }) {
  return (
    <NavLink to={to} end={end ?? false} className="relative px-3 py-2 text-sm font-medium">
      {({ isActive }) => (
        <span
          className={cn(
            'relative',
            isActive ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-800',
          )}
        >
          {label}
          {isActive && (
            <motion.span
              layoutId="nav-underline"
              className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-brand-600"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
        </span>
      )}
    </NavLink>
  );
}

const FOOTER_LINKS = {
  Product: [
    { to: '/', label: 'Analyze' },
    { to: '/history', label: 'History' },
    { to: '/collections', label: 'Collections' },
    { to: '/downloads', label: 'Downloads' },
  ],
  Account: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/settings', label: 'Settings' },
  ],
};

export function AppShell() {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login', { replace: true });
  };

  const closeMobileNav = () => {
    setIsMobileNavOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="bg-gradient-to-r from-brand-600 to-orange-500 bg-clip-text text-lg font-bold text-transparent">
            YT Platform
          </span>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} end={item.end} />
            ))}

            <div className="ml-4 flex items-center gap-2 border-l border-zinc-200 pl-4">
              {status === 'authenticated' && user ? (
                <>
                  <span className="max-w-[10rem] truncate text-sm text-zinc-600">{user.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void handleLogout();
                    }}
                  >
                    <LogOut size={14} />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
                  >
                    Sign in
                  </NavLink>
                  <Button
                    size="sm"
                    onClick={() => {
                      navigate('/register');
                    }}
                  >
                    Sign up
                  </Button>
                </>
              )}
            </div>
          </nav>

          <button
            type="button"
            onClick={() => {
              setIsMobileNavOpen((open) => !open);
            }}
            aria-label={isMobileNavOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileNavOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 lg:hidden"
          >
            {isMobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {isMobileNavOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden border-t border-zinc-200 bg-white lg:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-3">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end ?? false}
                    onClick={closeMobileNav}
                    className={({ isActive }) =>
                      cn(
                        'rounded-lg px-3 py-2.5 text-base font-medium',
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-zinc-600 hover:bg-zinc-50',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}

                <div className="mt-2 flex flex-col gap-2 border-t border-zinc-100 pt-3">
                  {status === 'authenticated' && user ? (
                    <>
                      <span className="px-3 text-sm text-zinc-500">{user.name}</span>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          closeMobileNav();
                          void handleLogout();
                        }}
                      >
                        <LogOut size={16} />
                        Sign out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          closeMobileNav();
                          navigate('/login');
                        }}
                      >
                        Sign in
                      </Button>
                      <Button
                        onClick={() => {
                          closeMobileNav();
                          navigate('/register');
                        }}
                      >
                        Sign up
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <PageTransition />
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
            <div className="max-w-xs">
              <span className="bg-gradient-to-r from-brand-600 to-orange-500 bg-clip-text text-lg font-bold text-transparent">
                YT Platform
              </span>
              <p className="mt-2 text-sm text-zinc-500">
                Extract transcripts, process audio &amp; video, and manage your YouTube content -
                all from a single link.
              </p>
            </div>

            <div className="flex gap-8 sm:gap-12">
              {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
                <div key={heading}>
                  <h3 className="text-sm font-semibold text-zinc-900">{heading}</h3>
                  <ul className="mt-3 space-y-2">
                    {links.map((link) => (
                      <li key={link.to}>
                        <NavLink
                          to={link.to}
                          end={link.to === '/'}
                          className="text-sm text-zinc-500 hover:text-zinc-900"
                        >
                          {link.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-100 pt-6 text-sm text-zinc-400">
            © {new Date().getFullYear()} YT Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
