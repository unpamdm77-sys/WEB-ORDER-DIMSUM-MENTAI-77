import { ChevronRight, MessageCircle, ShoppingBag, UserCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { MENU_CATEGORIES } from '../data/defaultData';
import { MenuCategory } from '../types';
import { buildDirectWhatsAppUrl } from '../utils/whatsapp';

export type CategoryFilter = 'Semua' | MenuCategory;

interface NavbarProps {
  cartCount: number;
  whatsappNumber: string;
  onOpenCart: () => void;
  onOpenStaff: () => void;
  onSelectCategory: (category: CategoryFilter) => void;
  isStaffActive: boolean;
}

export function Navbar({
  cartCount,
  whatsappNumber,
  onOpenCart,
  onOpenStaff,
  onSelectCategory,
  isStaffActive,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const directWaUrl = buildDirectWhatsAppUrl(
    whatsappNumber,
    'Halo Dimsum Mentai 77 UNPAM! Saya mau tanya & pesan menu dimsum.'
  );

  const handleMobileCategoryJump = (category: CategoryFilter) => {
    onSelectCategory(category);
    setMobileMenuOpen(false);
    const menuEl = document.getElementById('menu');
    if (menuEl) {
      menuEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E6A84C]/25 bg-[#241F1E]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:gap-8 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#top"
          className="flex min-w-0 items-center gap-2 sm:gap-3 whitespace-nowrap shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53E22]"
        >
          <img
            src="/assets/aistudio/logo_dm77_d20d4c54.png"
            alt="Logo Dimsum Mentai 77"
            referrerPolicy="no-referrer"
            className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
          />
          <span className="font-display text-sm font-bold tracking-tight text-[#F6F2EC] sm:text-lg">
            Dimsum Mentai 77
          </span>
        </a>

        {/* Zone 2: Desktop Single-Line Navigation */}
        <nav
          aria-label="Navigasi utama"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#C5BCB4]"
        >
          <a
            href="#menu"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F6F2EC] underline-offset-4 hover:underline"
          >
            Menu
          </a>
          <a
            href="#paket"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F6F2EC] underline-offset-4 hover:underline"
          >
            Paket &amp; Poster
          </a>
          <a
            href="#lokasi"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#F6F2EC] underline-offset-4 hover:underline"
          >
            Lokasi &amp; Kontak
          </a>
          <button
            type="button"
            onClick={onOpenStaff}
            className="whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 hover:text-[#E6A84C] underline-offset-4 hover:underline"
          >
            {isStaffActive ? 'Panel Staff' : 'Login Staff'}
          </button>
        </nav>

        {/* Zone 3: Cart Action + 3-Line Hamburger Trigger for Mobile/Small Screens */}
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            onClick={onOpenCart}
            whileTap={{ scale: 0.96 }}
            aria-label={`Buka keranjang pesanan (${cartCount} item)`}
            className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg bg-[#E53E22] px-2.5 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#C93218] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53E22] focus-visible:ring-offset-2 focus-visible:ring-offset-[#241F1E] whitespace-nowrap shrink-0 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden min-[420px]:inline">Keranjang</span>
            <motion.span
              key={cartCount}
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
              className="rounded bg-black/25 px-1.5 py-0.5 font-mono tabular-nums text-xs font-semibold"
            >
              {cartCount}
            </motion.span>
          </motion.button>

          {/* Animated 3-Line Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-hamburger-menu"
            className="inline-flex h-11 w-11 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-[#443A37] bg-[#2E2826] text-[#F6F2EC] transition-colors hover:border-[#E6A84C]/60 hover:bg-[#38302D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53E22] lg:hidden shrink-0"
          >
            <motion.span
              animate={mobileMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.18 }}
              className="block h-0.5 w-5 rounded-full bg-current"
            />
            <motion.span
              animate={mobileMenuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.15 }}
              className="block h-0.5 w-5 rounded-full bg-current"
            />
            <motion.span
              animate={mobileMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.18 }}
              className="block h-0.5 w-5 rounded-full bg-current"
            />
          </button>
        </div>
      </div>

      {/* Mobile & Small-Screen Hamburger Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-x-0 top-16 bottom-0 z-30 bg-black/45 backdrop-blur-xs lg:hidden"
              aria-hidden="true"
            />

            <motion.nav
              id="mobile-hamburger-menu"
              aria-label="Menu navigasi mobile"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-40 max-h-[calc(100vh-4.5rem)] overflow-y-auto border-t border-[#443A37] bg-[#2A2422] px-4 py-4 shadow-2xl lg:hidden"
            >
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[#E6A84C]">
                Navigasi Halaman
              </p>
              <div className="mt-2 flex flex-col gap-1">
                <a
                  href="#menu"
                  onClick={() => handleMobileCategoryJump('Semua')}
                  className="flex min-h-[44px] items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-[#F6F2EC] transition-colors hover:bg-[#362E2C]"
                >
                  <span>Daftar Menu Lengkap</span>
                  <ChevronRight className="h-4 w-4 text-[#C5BCB4]" aria-hidden="true" />
                </a>
                <a
                  href="#paket"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-[#F6F2EC] transition-colors hover:bg-[#362E2C]"
                >
                  <span>Paket &amp; Poster Menu</span>
                  <ChevronRight className="h-4 w-4 text-[#C5BCB4]" aria-hidden="true" />
                </a>
                <a
                  href="#lokasi"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-[#F6F2EC] transition-colors hover:bg-[#362E2C]"
                >
                  <span>Lokasi UNPAM &amp; Kontak</span>
                  <ChevronRight className="h-4 w-4 text-[#C5BCB4]" aria-hidden="true" />
                </a>
              </div>

              <div className="mt-4 border-t border-[#3F3633] pt-4">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[#E6A84C]">
                  Pilih Kategori Menu
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleMobileCategoryJump('Semua')}
                    className="flex min-h-[40px] cursor-pointer items-center rounded-lg border border-[#443A37] bg-[#332C29] px-3 py-2 text-left text-xs font-medium text-[#F6F2EC] transition-colors hover:border-[#E53E22]"
                  >
                    Semua Varian
                  </button>
                  {MENU_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleMobileCategoryJump(category)}
                      className="flex min-h-[40px] cursor-pointer items-center rounded-lg border border-[#443A37] bg-[#332C29] px-3 py-2 text-left text-xs font-medium text-[#C5BCB4] transition-colors hover:border-[#E53E22] hover:text-[#F6F2EC]"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[#3F3633] pt-4 sm:grid-cols-2">
                <a
                  href={directWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-green-500/35 bg-green-500/15 px-4 py-2.5 text-sm font-semibold text-green-400 transition-colors hover:bg-green-500/25"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Chat WhatsApp Direct</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenStaff();
                  }}
                  className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#E6A84C]/35 bg-[#332C29] px-4 py-2.5 text-sm font-semibold text-[#E6A84C] transition-colors hover:border-[#E6A84C] hover:bg-[#3C3430]"
                >
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                  <span>{isStaffActive ? 'Buka Panel Staff' : 'Login as Staff'}</span>
                </button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
