import { ArrowRight, MapPin, MessageCircle, UtensilsCrossed } from 'lucide-react';
import { motion } from 'motion/react';
import { StoreSettings } from '../types';
import { buildDirectWhatsAppUrl } from '../utils/whatsapp';
import {
  CornerFretAccent,
  DimsumKamonCrest,
  NorenTrimBar,
  SeigaihaBackdrop,
} from './OrientalAccents';

interface HeroSectionProps {
  settings: StoreSettings;
  menuCount: number;
  onOpenPoster: () => void;
}

export function HeroSection({ settings, menuCount, onOpenPoster }: HeroSectionProps) {
  const directWaUrl = buildDirectWhatsAppUrl(
    settings.whatsappNumber,
    'Halo Dimsum Mentai 77 UNPAM! Saya mau pesan dimsumnya nih.'
  );

  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-[#3D3532] bg-[#262120]"
    >
      {/* Japanese Seigaiha Wave Texture & Noren Shopfront Trim */}
      <SeigaihaBackdrop />
      <NorenTrimBar className="relative z-10" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Story & Direct Order Action */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-center lg:col-span-6"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium tracking-wide text-[#C5BCB4]">
              <DimsumKamonCrest size="sm" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#E6A84C]">Dimsum Mentai 77 UNPAM</span>
                <span aria-hidden="true">·</span>
                <span>{settings.tagline}</span>
              </div>
            </div>

            <h1 className="mt-4 font-display text-[clamp(2.25rem,4.2vw,3.65rem)] font-extrabold leading-[1.08] tracking-tight text-[#F6F2EC] [text-wrap:balance]">
              Dimsum Mentai Lumer, Hangat Langsung ke WhatsApp
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#C5BCB4] sm:text-lg">
              Perpaduan dimsum kukus &amp; goreng autentik dengan saus mentai creamy racikan 77,
              taburan <strong className="font-semibold text-[#F6F2EC]">100% Tobiko Asli</strong>,
              dan keju mozzarella pilihan. Favorit mahasiswa Universitas Pamulang.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <motion.a
                href="#menu"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-[#E53E22] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#C93218] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53E22] focus-visible:ring-offset-2 focus-visible:ring-offset-[#262120] whitespace-nowrap shrink-0"
              >
                <span>Pilih Menu &amp; Pesan</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </motion.a>

              <motion.a
                href={directWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg border border-[#483E3A] bg-[#2F2826] px-5 py-3 text-sm font-semibold text-[#F6F2EC] transition-colors duration-150 hover:border-green-500/70 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 whitespace-nowrap shrink-0"
              >
                <MessageCircle className="h-4 w-4 text-green-400" aria-hidden="true" />
                <span>Chat WhatsApp</span>
              </motion.a>

              <button
                type="button"
                onClick={onOpenPoster}
                className="inline-flex min-h-[46px] cursor-pointer items-center px-3 py-3 text-sm font-medium text-[#E6A84C] underline-offset-4 transition-colors hover:text-[#F6F2EC] hover:underline whitespace-nowrap shrink-0"
              >
                Lihat Poster Menu
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#3D3532] pt-5 text-xs text-[#C5BCB4]">
              <a
                href={settings.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-[#F6F2EC]"
              >
                <MapPin className="h-3.5 w-3.5 text-[#E53E22]" aria-hidden="true" />
                <span>Jl. Pamulang Permai 1, Samping Gapura Bundaran Tugu Pamulang</span>
              </a>
              <span aria-hidden="true">·</span>
              <span>{settings.openHours}</span>
            </div>
          </motion.div>

          {/* Right Appetizing Culinary Photography with Chinese-Japanese Fret Frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col lg:col-span-6"
          >
            <div className="relative h-full min-h-[280px] overflow-hidden rounded-2xl border border-[#E6A84C]/35 bg-[#2B2523] shadow-xl sm:min-h-[360px]">
              <CornerFretAccent colorClass="text-[#E6A84C]/85" />
              <motion.img
                src="/src/assets/images/hero_dimsum_mentai_feast_1794850382870.jpg"
                alt="Sajian Dimsum Mentai 77 UNPAM dengan taburan 100% tobiko asli dan chili oil"
                referrerPolicy="no-referrer"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1B1716]/90 via-[#1B1716]/25 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-[#E6A84C]">
                    Best Seller Siap Bakar
                  </p>
                  <p className="mt-0.5 font-display text-lg font-bold text-[#F6F2EC]">
                    Mentai Torch &amp; 100% Tobiko Asli
                  </p>
                </div>
                <span className="font-mono tabular-nums text-sm font-semibold text-[#F6F2EC]">
                  Mulai Rp12.000
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Full-Width 4-Column Quick Highlights Strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
          className="mt-10 grid grid-cols-2 gap-4 border-t border-[#3D3532] pt-8 md:grid-cols-4 md:gap-6"
        >
          <div>
            <p className="font-mono tabular-nums text-xl font-semibold text-[#E6A84C]">
              {menuCount} Menu
            </p>
            <p className="mt-1 text-xs text-[#C5BCB4]">
              Mentai, Mozarella, Goreng &amp; Birthday Cake
            </p>
          </div>
          <div>
            <p className="font-display text-xl font-bold text-[#F6F2EC]">
              100% Tobiko
            </p>
            <p className="mt-1 text-xs text-[#C5BCB4]">
              Topping telur ikan asli melimpah di tiap tray
            </p>
          </div>
          <div>
            <p className="font-display text-xl font-bold text-[#F6F2EC]">
              Direct WhatsApp
            </p>
            <p className="mt-1 text-xs text-[#C5BCB4]">
              Pilih varian, masuk keranjang, langsung kirim WA
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 font-display text-xl font-bold text-[#F6F2EC]">
              <UtensilsCrossed className="h-4 w-4 text-[#E53E22]" aria-hidden="true" />
              <span>Multi-Platform</span>
            </p>
            <p className="mt-1 text-xs text-[#C5BCB4]">
              GoFood · ShopeeFood · GrabFood
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
