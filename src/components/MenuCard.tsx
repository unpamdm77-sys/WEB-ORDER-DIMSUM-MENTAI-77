import { MessageCircle, Plus, Utensils } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { MenuItem, MenuVariant } from '../types';
import { buildDirectWhatsAppUrl, formatRupiah } from '../utils/whatsapp';

interface MenuCardProps {
  item: MenuItem;
  whatsappNumber: string;
  onAddToCart: (item: MenuItem, variant: MenuVariant) => void;
}

export function MenuCard({ item, whatsappNumber, onAddToCart }: MenuCardProps) {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  const safeIndex = Math.min(selectedVariantIndex, Math.max(0, item.variants.length - 1));
  const activeVariant = item.variants[safeIndex] ?? { label: 'Regular', price: 0 };

  const directSingleOrderUrl = buildDirectWhatsAppUrl(
    whatsappNumber,
    `Halo Dimsum Mentai 77 UNPAM! Saya mau pesan:\n• ${item.name} (${activeVariant.label}) — ${formatRupiah(
      activeVariant.price
    )}\n\nApakah masih tersedia Kak?`
  );

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-[#2B2523] shadow-sm transition-colors duration-150 ${
        item.available
          ? 'border-[#3F3633] hover:border-[#E6A84C]/55'
          : 'border-[#3F3633]/60 opacity-70'
      }`}
    >
      {/* Subtle Chinese-Japanese Vermilion-Gold Top Architectural Trim */}
      <div
        aria-hidden="true"
        className="h-[2px] w-full bg-gradient-to-r from-[#E53E22]/75 via-[#E6A84C]/65 to-[#E53E22]/20"
      />

      {/* 4:3 Appetizing Dish Photo with Fallback Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#221D1C]">
        {!imgError && item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#2B2523] to-[#3A312E] p-3 text-center">
            <Utensils className="h-6 w-6 text-[#E6A84C]" aria-hidden="true" />
            <span className="font-display text-xs font-semibold text-[#F6F2EC] sm:text-sm">
              {item.name}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1B1716]/45 via-transparent to-transparent" />
      </div>

      {/* Card Body - Compact 2x2 Mobile Friendly, Spacious on Tablet/PC */}
      <div className="flex flex-1 flex-col p-2.5 sm:p-5">
        {/* Clean Unboxed Metadata */}
        <div className="flex items-center justify-between gap-1.5 text-[10px] text-[#C5BCB4] sm:text-xs">
          <span className="truncate">
            {item.category}
            {item.popular ? ' · Favorit' : ''}
          </span>
          <span
            className={`shrink-0 font-medium ${
              item.available ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {item.available ? 'Ada' : 'Habis'}
          </span>
        </div>

        <h3 className="mt-1 line-clamp-2 font-display text-[13px] font-bold leading-snug text-[#F6F2EC] sm:mt-1.5 sm:text-lg">
          {item.name}
        </h3>

        <p className="mt-1.5 hidden text-sm leading-relaxed text-[#C5BCB4] sm:line-clamp-2 sm:block">
          {item.description}
        </p>

        {/* Interactive Variant Buttons */}
        <div className="mt-2 sm:mt-4">
          <p className="hidden text-xs font-medium text-[#A79E96] sm:block">
            Pilih porsi:
          </p>
          <div className="flex flex-wrap gap-1 sm:mt-2 sm:gap-2">
            {item.variants.map((variant, idx) => {
              const isSelected = idx === safeIndex;
              return (
                <button
                  key={`${item.id}-${variant.label}`}
                  type="button"
                  onClick={() => setSelectedVariantIndex(idx)}
                  className={`cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium transition-colors duration-150 whitespace-nowrap shrink-0 sm:px-3 sm:py-1.5 sm:text-xs ${
                    isSelected
                      ? 'border-[#E6A84C] bg-[#E6A84C]/15 text-[#F6C87A] font-semibold'
                      : 'border-[#443A37] bg-[#332C29] text-[#C5BCB4] hover:border-[#6B5B55] hover:text-[#F6F2EC]'
                  }`}
                >
                  {variant.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Price + Direct Order & Cart Actions */}
        <div className="mt-auto flex flex-col gap-2 border-t border-[#3F3633] pt-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-4">
          <div className="flex items-baseline justify-between gap-1 sm:block">
            <span className="text-[10px] text-[#A79E96] sm:block sm:text-[11px]">
              {activeVariant.label}
            </span>
            <span className="font-mono tabular-nums text-sm font-semibold text-[#E6A84C] sm:text-lg">
              {formatRupiah(activeVariant.price)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:gap-2 shrink-0">
            <motion.a
              href={item.available ? directSingleOrderUrl : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!item.available}
              whileTap={item.available ? { scale: 0.95 } : undefined}
              onClick={(e) => {
                if (!item.available) e.preventDefault();
              }}
              title="Pesan langsung menu ini via WhatsApp"
              className={`inline-flex min-h-[36px] items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 sm:min-h-[40px] sm:gap-1.5 sm:px-3 sm:py-2 sm:text-xs ${
                item.available
                  ? 'border-[#443A37] bg-[#332C29] text-[#F6F2EC] hover:border-green-500/60 hover:bg-green-500/15 hover:text-green-400'
                  : 'cursor-not-allowed border-[#3A322F] text-[#7A7068]'
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />
              <span>WA</span>
            </motion.a>

            <motion.button
              type="button"
              disabled={!item.available}
              whileTap={item.available ? { scale: 0.94 } : undefined}
              onClick={() => onAddToCart(item, activeVariant)}
              className={`inline-flex min-h-[36px] items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 sm:min-h-[40px] sm:gap-1.5 sm:px-3.5 sm:py-2 sm:text-xs ${
                item.available
                  ? 'cursor-pointer bg-[#E53E22] text-white hover:bg-[#C93218]'
                  : 'cursor-not-allowed bg-[#38302D] text-[#8B8179]'
              }`}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sm:hidden">Pesan</span>
              <span className="hidden sm:inline">Keranjang</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
