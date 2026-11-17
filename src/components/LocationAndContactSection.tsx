import {
  ArrowUpRight,
  Clock,
  Instagram,
  MapPin,
  MessageCircle,
  Music2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { StoreSettings } from '../types';
import { buildDirectWhatsAppUrl } from '../utils/whatsapp';
import { BrushUnderline, CornerFretAccent, HuiwenDivider } from './OrientalAccents';
import { StoreMapCanvas } from './StoreMapCanvas';

interface LocationAndContactSectionProps {
  settings: StoreSettings;
  onSelectDeliveryAddress: (address: string) => void;
}

export function LocationAndContactSection({
  settings,
  onSelectDeliveryAddress,
}: LocationAndContactSectionProps) {
  const waHref = buildDirectWhatsAppUrl(
    settings.whatsappNumber,
    'Halo Dimsum Mentai 77 UNPAM! Saya ingin bertanya / memesan dimsum.'
  );

  return (
    <section id="lokasi" className="border-t border-[#3D3532] bg-[#201C1B] py-14 sm:py-20">
      <HuiwenDivider className="mb-10 sm:mb-12" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-[#E6A84C]">
            Lokasi &amp; Kontak Langsung
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-[#F6F2EC] sm:text-3xl [text-wrap:balance]">
            Peta Lokasi Area UNPAM &amp; Kontak Direct
          </h2>
          <BrushUnderline className="mt-1.5" />
          <p className="mt-2.5 text-sm text-[#C5BCB4]">
            Jelajahi peta interaktif di bawah untuk mencari titik antar area Universitas
            Pamulang, atau klik langsung WhatsApp, Instagram, TikTok, dan Google Maps resmi
            Dimsum Mentai 77 UNPAM.
          </p>
        </div>

        {/* Interactive Google Maps Platform Map + Store Info */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-[#3F3633] bg-[#2B2523] p-4 shadow-sm sm:p-5 lg:col-span-7"
          >
            <StoreMapCanvas
              settings={settings}
              onSelectDeliveryAddress={onSelectDeliveryAddress}
            />
          </motion.div>

          {/* Store Details + Direct Maps Button */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#3F3633] bg-[#2B2523] p-6 shadow-sm sm:p-8 lg:col-span-5"
          >
            <CornerFretAccent colorClass="text-[#E6A84C]/35" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E53E22]/15 text-[#E53E22]">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-[#F6F2EC]">
                    {settings.storeName}
                  </h3>
                  <p className="text-xs text-[#A79E96]">
                    Jl. Pamulang Permai 1 · Tugu Pamulang
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-[#C5BCB4]">
                {settings.addressNote}
              </p>

              <div className="mt-5 flex items-center gap-2.5 text-sm text-[#F6F2EC]">
                <Clock className="h-4 w-4 text-[#E6A84C]" aria-hidden="true" />
                <span>{settings.openHours}</span>
              </div>

              <div className="mt-6 rounded-xl border border-[#443A37] bg-[#332C29] p-4 text-xs leading-relaxed text-[#C5BCB4]">
                <span className="font-semibold text-[#E6A84C]">Tips Pemesanan:</span>{' '}
                Cari gedung kampus, kost, atau titik jemputmu di kolom pencarian peta
                untuk otomatis mengisi alamat antar ke WhatsApp.
              </div>
            </div>

            <div className="mt-8 border-t border-[#3F3633] pt-6">
              <motion.a
                href={settings.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#E53E22] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C93218]"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <span>Buka Lokasi di Google Maps</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </motion.a>
            </div>
          </motion.div>
        </div>

        {/* Direct Clickable Contact Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* WhatsApp Direct */}
          <motion.a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="group flex flex-col justify-between rounded-2xl border border-[#3F3633] bg-[#2B2523] p-5 shadow-sm transition-colors hover:border-green-500/60"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15 text-green-400">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowUpRight
                className="h-4 w-4 text-[#9A9088] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-green-400"
                aria-hidden="true"
              />
            </div>
            <div className="mt-5">
              <p className="text-xs font-medium text-[#A79E96]">
                WhatsApp Direct
              </p>
              <p className="mt-1 font-mono tabular-nums text-base font-semibold text-[#F6F2EC]">
                {settings.whatsappNumber}
              </p>
              <p className="mt-1 text-xs font-medium text-green-400">Chat &amp; order langsung</p>
            </div>
          </motion.a>

          {/* Instagram Direct */}
          <motion.a
            href={settings.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="group flex flex-col justify-between rounded-2xl border border-[#3F3633] bg-[#2B2523] p-5 shadow-sm transition-colors hover:border-pink-400/60"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/15 text-pink-400">
                <Instagram className="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowUpRight
                className="h-4 w-4 text-[#9A9088] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-pink-400"
                aria-hidden="true"
              />
            </div>
            <div className="mt-5">
              <p className="text-xs font-medium text-[#A79E96]">
                Instagram Resmi
              </p>
              <p className="mt-1 font-display text-base font-bold text-[#F6F2EC] break-all">
                {settings.instagramHandle}
              </p>
              <p className="mt-1 text-xs font-medium text-pink-400">Update promo harian</p>
            </div>
          </motion.a>

          {/* TikTok Direct */}
          <motion.a
            href={settings.tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="group flex flex-col justify-between rounded-2xl border border-[#3F3633] bg-[#2B2523] p-5 shadow-sm transition-colors hover:border-[#E6A84C]/60"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#38302D] text-[#F6F2EC]">
                <Music2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowUpRight
                className="h-4 w-4 text-[#9A9088] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#E6A84C]"
                aria-hidden="true"
              />
            </div>
            <div className="mt-5">
              <p className="text-xs font-medium text-[#A79E96]">
                TikTok Resmi
              </p>
              <p className="mt-1 font-display text-base font-bold text-[#F6F2EC] break-all">
                {settings.tiktokHandle}
              </p>
              <p className="mt-1 text-xs text-[#C5BCB4]">Video &amp; review menu</p>
            </div>
          </motion.a>

          {/* Google Maps Direct */}
          <motion.a
            href={settings.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="group flex flex-col justify-between rounded-2xl border border-[#3F3633] bg-[#2B2523] p-5 shadow-sm transition-colors hover:border-[#E53E22]/70"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E53E22]/15 text-[#E53E22]">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowUpRight
                className="h-4 w-4 text-[#9A9088] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#E53E22]"
                aria-hidden="true"
              />
            </div>
            <div className="mt-5">
              <p className="text-xs font-medium text-[#A79E96]">
                Google Maps Direct
              </p>
              <p className="mt-1 font-display text-base font-bold text-[#F6F2EC]">
                Rute Dimsum 77 UNPAM
              </p>
              <p className="mt-1 text-xs font-medium text-[#E6A84C]">Navigasi langsung</p>
            </div>
          </motion.a>
        </div>
      </div>
    </section>
  );
}
