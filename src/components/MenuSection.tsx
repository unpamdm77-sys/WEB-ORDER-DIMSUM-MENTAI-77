import { Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { MENU_CATEGORIES } from '../data/defaultData';
import { MenuItem, MenuVariant } from '../types';
import { MenuCard } from './MenuCard';
import { CategoryFilter } from './Navbar';
import { BrushUnderline } from './OrientalAccents';

interface MenuSectionProps {
  items: MenuItem[];
  whatsappNumber: string;
  activeCategory: CategoryFilter;
  onSelectCategory: (category: CategoryFilter) => void;
  onAddToCart: (item: MenuItem, variant: MenuVariant) => void;
}

export function MenuSection({
  items,
  whatsappNumber,
  activeCategory,
  onSelectCategory,
  onAddToCart,
}: MenuSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const categories: CategoryFilter[] = ['Semua', ...MENU_CATEGORIES];

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items
      .filter((item) => {
        const matchesCat =
          activeCategory === 'Semua' || item.category === activeCategory;
        const matchesSearch =
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query);
        return matchesCat && matchesSearch;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [items, activeCategory, searchQuery]);

  return (
    <section id="menu" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#E6A84C]">
            Daftar Menu Lengkap · 100% Tobiko Asli
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-[#F6F2EC] sm:text-3xl [text-wrap:balance]">
            Pilih Varian Dimsum Favoritmu
          </h2>
          <BrushUnderline className="mt-1.5" />
          <p className="mt-2.5 max-w-xl text-sm text-[#C5BCB4]">
            Klik porsi yang diinginkan lalu tekan{' '}
            <strong className="text-[#F6F2EC]">+ Keranjang</strong> untuk checkout beberapa menu
            sekaligus, atau tekan <strong className="text-[#F6F2EC]">WA</strong> untuk pesan instan.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A79E96]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mentai, moza, goreng..."
            aria-label="Cari menu dimsum"
            className="h-11 w-full rounded-lg border border-[#443A37] bg-[#2B2523] pl-10 pr-4 text-sm text-[#F6F2EC] placeholder:text-[#9A9088] focus:border-[#E6A84C] focus:outline-none"
          />
        </div>
      </div>

      {/* Animated Category Segmented Control */}
      <div
        role="tablist"
        aria-label="Filter kategori menu"
        className="mt-8 flex items-center gap-1.5 overflow-x-auto pb-2"
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`relative cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isActive ? 'text-white' : 'text-[#C5BCB4] hover:bg-[#2E2725] hover:text-[#F6F2EC]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="activeMenuCategory"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-lg bg-[#E53E22]"
                />
              )}
              <span className="relative z-10">{cat}</span>
            </button>
          );
        })}
      </div>

      {/* Menu Grid: 2 columns on mobile (4 menus per screen), 3 on md/lg */}
      {filteredItems.length === 0 ? (
        <div className="mt-8 rounded-xl border border-[#3F3633] bg-[#2B2523] p-8 text-center shadow-sm sm:mt-10 sm:p-10">
          <p className="font-display text-lg font-semibold text-[#F6F2EC]">
            Menu tidak ditemukan
          </p>
          <p className="mt-1 text-sm text-[#C5BCB4]">
            Coba kata kunci lain atau tampilkan semua kategori.
          </p>
          <button
            type="button"
            onClick={() => {
              onSelectCategory('Semua');
              setSearchQuery('');
            }}
            className="mt-4 cursor-pointer rounded-lg border border-[#483E3A] bg-[#332C29] px-4 py-2 text-xs font-semibold text-[#F6F2EC] hover:border-[#E6A84C]"
          >
            Tampilkan Semua Menu
          </button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-5 md:grid-cols-3 lg:gap-6">
          {filteredItems.map((item) => (
            <MenuCard
              key={item.id}
              item={item}
              whatsappNumber={whatsappNumber}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      )}
    </section>
  );
}
