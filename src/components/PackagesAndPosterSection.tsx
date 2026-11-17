import { ExternalLink, Eye, MessageCircle, Utensils, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { MenuItem, StoreSettings } from '../types';
import { buildDirectWhatsAppUrl, formatRupiah } from '../utils/whatsapp';
import {
  AsanohaBackdrop,
  BrushUnderline,
  CornerFretAccent,
  HuiwenDivider,
} from './OrientalAccents';

interface PackagesAndPosterSectionProps {
  settings: StoreSettings;
  menuItems: MenuItem[];
  posterOpen: boolean;
  onOpenPoster: () => void;
  onClosePoster: () => void;
}

const FALLBACK_PARTY_IMAGE =
  '/src/assets/images/menu_dimsum_party_cake_1794850385246.jpg';

export function PackagesAndPosterSection({
  settings,
  menuItems,
  posterOpen,
  onOpenPoster,
  onClosePoster,
}: PackagesAndPosterSectionProps) {
  const [birthdayImgError, setBirthdayImgError] = useState(false);
  const [mixAllImgError, setMixAllImgError] = useState(false);

  const birthdayItem = useMemo(
    () =>
      menuItems.find((item) => item.id === 'dimsum-birthday-cake') ||
      menuItems.find((item) => /birthday/i.test(item.name)),
    [menuItems]
  );

  const mixAllItem = useMemo(
    () =>
      menuItems.find((item) => item.id === 'dimsum-mix-all-varian') ||
      menuItems.find((item) => /mix\s*all|all\s*varian/i.test(item.name)),
    [menuItems]
  );

  const birthdayTitle = birthdayItem?.name || 'Dimsum Birthday Cake';
  const birthdayPrice = birthdayItem?.variants?.[0]?.price ?? 85000;
  const birthdayVariantLabel = birthdayItem?.variants?.[0]?.label || 'Isi 16';
  const birthdayImage = birthdayItem?.imageUrl || FALLBACK_PARTY_IMAGE;

  const mixAllTitle = mixAllItem?.name || 'Dimsum Mix All Varian';
  const mixAllPrice = mixAllItem?.variants?.[0]?.price ?? 90000;
  const mixAllVariantLabel = mixAllItem?.variants?.[0]?.label || 'Isi 16';
  const mixAllImage = mixAllItem?.imageUrl || FALLBACK_PARTY_IMAGE;

  useEffect(() => {
    setBirthdayImgError(false);
  }, [birthdayImage]);

  useEffect(() => {
    setMixAllImgError(false);
  }, [mixAllImage]);

  const birthdayWaUrl = buildDirectWhatsAppUrl(
    settings.whatsappNumber,
    `Halo Dimsum Mentai 77 UNPAM! Saya mau pesan ${birthdayTitle} (${birthdayVariantLabel} - ${formatRupiah(
      birthdayPrice
    )}) / ${mixAllTitle}. Bisa dibantu request ucapan?`
  );

  return (
    <section
      id="paket"
      className="relative overflow-hidden border-t border-[#3D3532] bg-[#262120] py-14 sm:py-20"
    >
      {/* Japanese Asanoha Kumiko Lattice Backdrop & Huiwen Fret Divider */}
      <AsanohaBackdrop />
      <HuiwenDivider className="relative mb-10 sm:mb-12" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left Featured Showcase: Uploaded Photos from Birthday Cake & Mix All Varian */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-6"
          >
            <div className="grid h-full grid-cols-2 gap-3 sm:gap-4">
              {/* Photo 1: Dimsum Birthday Cake (live from uploaded menu item) */}
              <div className="group relative flex min-h-[240px] flex-col overflow-hidden rounded-2xl border border-[#E6A84C]/35 bg-[#2B2523] shadow-lg sm:min-h-[320px]">
                <CornerFretAccent colorClass="text-[#E6A84C]/80" />
                {!birthdayImgError && birthdayImage ? (
                  <img
                    src={birthdayImage}
                    alt={birthdayTitle}
                    referrerPolicy="no-referrer"
                    onError={() => setBirthdayImgError(true)}
                    className="h-full w-full flex-1 object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#2B2523] p-4 text-center">
                    <Utensils className="h-6 w-6 text-[#E6A84C]" aria-hidden="true" />
                    <span className="font-display text-xs font-semibold text-[#F6F2EC]">
                      {birthdayTitle}
                    </span>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#171312]/95 via-[#171312]/65 to-transparent p-3 pt-10">
                  <p className="truncate font-display text-xs font-bold text-[#F6F2EC] sm:text-sm">
                    {birthdayTitle}
                  </p>
                  <p className="font-mono tabular-nums text-[11px] font-semibold text-[#E6A84C] sm:text-xs">
                    {formatRupiah(birthdayPrice)} · {birthdayVariantLabel}
                  </p>
                </div>
              </div>

              {/* Photo 2: Dimsum Mix All Varian (live from uploaded menu item) */}
              <div className="group relative flex min-h-[240px] flex-col overflow-hidden rounded-2xl border border-[#E6A84C]/35 bg-[#2B2523] shadow-lg sm:min-h-[320px]">
                <CornerFretAccent colorClass="text-[#E6A84C]/80" />
                {!mixAllImgError && mixAllImage ? (
                  <img
                    src={mixAllImage}
                    alt={mixAllTitle}
                    referrerPolicy="no-referrer"
                    onError={() => setMixAllImgError(true)}
                    className="h-full w-full flex-1 object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#2B2523] p-4 text-center">
                    <Utensils className="h-6 w-6 text-[#E6A84C]" aria-hidden="true" />
                    <span className="font-display text-xs font-semibold text-[#F6F2EC]">
                      {mixAllTitle}
                    </span>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#171312]/95 via-[#171312]/65 to-transparent p-3 pt-10">
                  <p className="truncate font-display text-xs font-bold text-[#F6F2EC] sm:text-sm">
                    {mixAllTitle}
                  </p>
                  <p className="font-mono tabular-nums text-[11px] font-semibold text-[#E6A84C] sm:text-xs">
                    {formatRupiah(mixAllPrice)} · {mixAllVariantLabel}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Copy + Direct Order + Official Poster Trigger */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col justify-center lg:col-span-6"
          >
            <p className="text-xs font-semibold text-[#E6A84C]">
              Paket Acara &amp; Kejutan Spesial
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F6F2EC] sm:text-3xl [text-wrap:balance]">
              Rayakan Momen Bersama Dimsum Birthday Cake &amp; Mix All Varian
            </h2>
            <BrushUnderline className="mt-1.5" />
            <p className="mt-3 text-sm leading-relaxed text-[#C5BCB4] sm:text-base">
              Cocok untuk kejutan ulang tahun, anniversary, kumpul organisasi mahasiswa UNPAM, atau
              nobar bareng teman. Isi 16 pcs padat dengan varian mentai, mozzarella, sweet spicy,
              dan goreng lengkap dalam satu box rapi.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-[#3D3532] py-4">
              <div>
                <p className="text-xs text-[#A79E96]">{birthdayTitle}</p>
                <p className="mt-0.5 font-mono tabular-nums text-lg font-semibold text-[#E6A84C]">
                  {formatRupiah(birthdayPrice)}
                </p>
                <p className="text-xs text-[#C5BCB4]">
                  {birthdayVariantLabel} + Topper Ucapan
                </p>
              </div>
              <div>
                <p className="text-xs text-[#A79E96]">{mixAllTitle}</p>
                <p className="mt-0.5 font-mono tabular-nums text-lg font-semibold text-[#E6A84C]">
                  {formatRupiah(mixAllPrice)}
                </p>
                <p className="text-xs text-[#C5BCB4]">
                  {mixAllVariantLabel} Semua Rasa
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <motion.a
                href={birthdayWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.97 }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#E53E22] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C93218] whitespace-nowrap shrink-0"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Pesan Paket via WhatsApp</span>
              </motion.a>

              <button
                type="button"
                onClick={onOpenPoster}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-[#483E3A] bg-[#2F2826] px-4 py-2.5 text-sm font-semibold text-[#F6F2EC] transition-colors hover:border-[#E6A84C] hover:bg-[#38302D] whitespace-nowrap shrink-0"
              >
                <Eye className="h-4 w-4 text-[#E6A84C]" aria-hidden="true" />
                <span>Lihat Poster Menu Asli</span>
              </button>
            </div>

            {/* Available Delivery Platforms */}
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#C5BCB4]">
              <span>Tersedia juga di:</span>
              <a
                href={settings.gofoodUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#F6F2EC] hover:text-green-400"
              >
                <span>GoFood</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              <span aria-hidden="true">·</span>
              <a
                href={settings.shopeefoodUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#F6F2EC] hover:text-[#E53E22]"
              >
                <span>ShopeeFood</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              <span aria-hidden="true">·</span>
              <a
                href={settings.grabfoodUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#F6F2EC] hover:text-green-400"
              >
                <span>GrabFood</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Official Menu Poster Lightbox Modal */}
      <AnimatePresence>
        {posterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClosePoster}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-[#483E3A] bg-[#2B2523] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#3F3633] px-4 py-3">
                <span className="font-display text-sm font-bold text-[#F6F2EC]">
                  Poster Menu Resmi Dimsum Mentai 77
                </span>
                <button
                  type="button"
                  onClick={onClosePoster}
                  aria-label="Tutup poster menu"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#C5BCB4] hover:bg-[#38302D] hover:text-[#F6F2EC]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[80vh] overflow-y-auto p-3">
                <img
                  src="/assets/aistudio/MENU_9c4e9d41.jpg"
                  alt="Poster Menu Lengkap Dimsum Mentai 77 UNPAM"
                  referrerPolicy="no-referrer"
                  className="w-full rounded-lg object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
