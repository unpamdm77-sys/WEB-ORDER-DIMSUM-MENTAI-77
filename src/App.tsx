import { CheckCircle2, ShoppingBag } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CartDrawer } from './components/CartDrawer';
import { HeroSection } from './components/HeroSection';
import { LocationAndContactSection } from './components/LocationAndContactSection';
import { MenuSection } from './components/MenuSection';
import { CategoryFilter, Navbar } from './components/Navbar';
import { OpeningSplash } from './components/OpeningSplash';
import { DimsumKamonCrest } from './components/OrientalAccents';
import { PackagesAndPosterSection } from './components/PackagesAndPosterSection';
import { StaffPortalModal } from './components/StaffPortalModal';
import { DEFAULT_MENU_ITEMS, DEFAULT_STORE_SETTINGS } from './data/defaultData';
import { testFirestoreConnection } from './firebase';
import {
  CartItem,
  MenuItem,
  MenuVariant,
  StaffSession,
  StoreSettings,
} from './types';
import { formatRupiah } from './utils/whatsapp';

const CART_STORAGE_KEY = 'dm77_unpam_cart_v1';
const STAFF_TOKEN_KEY = 'dm77_staff_token_v1';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU_ITEMS);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('Semua');
  const [toastText, setToastText] = useState<string | null>(null);
  const [preselectedAddress, setPreselectedAddress] = useState<string>('');
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Staff / Owner Session State
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STAFF_TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);

  // Persist cart locally
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage errors
    }
  }, [cart]);

  // Listen for Maps quota events and check Firestore connection
  useEffect(() => {
    void testFirestoreConnection();
    const handleQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  // Load persisted storefront data from server
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const resp = await fetch('/api/storefront');
        if (!resp.ok) return;
        const json = (await resp.json()) as {
          menuItems?: MenuItem[];
          settings?: StoreSettings;
        };
        if (!active) return;
        if (Array.isArray(json.menuItems) && json.menuItems.length > 0) {
          setMenuItems(json.menuItems);
        }
        if (json.settings) {
          setSettings(json.settings);
        }
      } catch {
        // Fallback smoothly to defaultData
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Verify existing staff/owner token on mount
  useEffect(() => {
    if (!authToken) {
      setStaffSession(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const resp = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!resp.ok) {
          if (active) {
            setAuthToken(null);
            setStaffSession(null);
            localStorage.removeItem(STAFF_TOKEN_KEY);
          }
          return;
        }
        const json = (await resp.json()) as {
          authenticated?: boolean;
          session?: StaffSession;
        };
        if (active && json.authenticated && json.session) {
          setStaffSession(json.session);
        }
      } catch {
        // Keep token offline
      }
    })();
    return () => {
      active = false;
    };
  }, [authToken]);

  const handleSessionChange = useCallback(
    (nextToken: string | null, nextSession: StaffSession | null) => {
      setAuthToken(nextToken);
      setStaffSession(nextSession);
      try {
        if (nextToken) {
          localStorage.setItem(STAFF_TOKEN_KEY, nextToken);
        } else {
          localStorage.removeItem(STAFF_TOKEN_KEY);
        }
      } catch {
        // Ignore storage errors
      }
    },
    []
  );

  const handleAddToCart = (item: MenuItem, variant: MenuVariant) => {
    const key = `${item.id}__${variant.label}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          key,
          menuItemId: item.id,
          name: item.name,
          variantLabel: variant.label,
          price: variant.price,
          imageUrl: item.imageUrl,
          quantity: 1,
        },
      ];
    });
    setToastText(`${item.name} (${variant.label}) masuk keranjang`);
    setTimeout(() => {
      setToastText((curr) =>
        curr === `${item.name} (${variant.label}) masuk keranjang` ? null : curr
      );
    }, 2400);
  };

  const handleUpdateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.key === key ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const handleRemoveItem = (key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const handleSelectDeliveryAddress = (address: string) => {
    setPreselectedAddress(address);
    setCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#201C1B] text-[#F6F2EC] flex flex-col">
      <OpeningSplash
        visible={showSplash}
        onComplete={() => setShowSplash(false)}
      />

      {quotaExceeded && (
        <div className="bg-amber-950/90 border-b border-amber-700/60 text-amber-100 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-200 hover:text-white"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Navbar
        cartCount={cartCount}
        whatsappNumber={settings.whatsappNumber}
        onOpenCart={() => setCartOpen(true)}
        onOpenStaff={() => setStaffModalOpen(true)}
        onSelectCategory={setActiveCategory}
        isStaffActive={Boolean(staffSession)}
      />

      <main className="flex-1">
        <HeroSection
          settings={settings}
          menuCount={menuItems.length}
          onOpenPoster={() => setPosterOpen(true)}
        />

        <MenuSection
          items={menuItems}
          whatsappNumber={settings.whatsappNumber}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          onAddToCart={handleAddToCart}
        />

        <PackagesAndPosterSection
          settings={settings}
          posterOpen={posterOpen}
          onOpenPoster={() => setPosterOpen(true)}
          onClosePoster={() => setPosterOpen(false)}
        />

        <LocationAndContactSection
          settings={settings}
          onSelectDeliveryAddress={handleSelectDeliveryAddress}
        />
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-[#E6A84C]/25 bg-[#241F1E] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/logo_dm77_d20d4c54.png"
              alt="Logo Dimsum Mentai 77"
              referrerPolicy="no-referrer"
              className="h-8 w-8 object-contain"
            />
            <div>
              <p className="font-display text-sm font-bold text-[#F6F2EC]">
                {settings.storeName}
              </p>
              <p className="text-xs text-[#A79E96]">
                © {new Date().getFullYear()} Dimsum Mentai 77 UNPAM · {settings.tagline}
              </p>
            </div>
            <DimsumKamonCrest size="sm" className="ml-1" />
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs text-[#C5BCB4]">
            <a href="#menu" className="hover:text-[#F6F2EC]">
              Menu
            </a>
            <a href="#paket" className="hover:text-[#F6F2EC]">
              Paket
            </a>
            <a href="#lokasi" className="hover:text-[#F6F2EC]">
              Kontak &amp; Maps
            </a>
            <button
              type="button"
              onClick={() => setStaffModalOpen(true)}
              className="cursor-pointer font-semibold text-[#E6A84C] hover:underline"
            >
              {staffSession ? 'Panel Staff' : 'Login as Staff'}
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Cart Bar */}
      <AnimatePresence>
        {cartCount > 0 && !cartOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-3 left-3 right-3 z-30 md:hidden"
          >
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex h-12 w-full cursor-pointer items-center justify-between rounded-xl bg-[#E53E22] px-4 text-sm font-semibold text-white shadow-lg"
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                <span>{cartCount} Item di Keranjang</span>
              </span>
              <span className="font-mono tabular-nums font-bold">
                {formatRupiah(cartTotal)} · Pesan WA
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-blocking Cart Toast */}
      <AnimatePresence>
        {toastText && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-xl border border-[#483E3A] bg-[#2B2523] px-4 py-2.5 text-xs font-medium text-[#F6F2EC] shadow-xl md:bottom-6"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>{toastText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        settings={settings}
        preselectedAddress={preselectedAddress}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCart([])}
      />

      <StaffPortalModal
        open={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        session={staffSession}
        authToken={authToken}
        onSessionChange={handleSessionChange}
        menuItems={menuItems}
        onMenuUpdated={setMenuItems}
        settings={settings}
        onSettingsUpdated={setSettings}
      />
    </div>
  );
}
