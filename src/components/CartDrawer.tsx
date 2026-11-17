import { MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { CartItem, StoreSettings } from '../types';
import { buildCartWhatsAppUrl, formatRupiah } from '../utils/whatsapp';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  settings: StoreSettings;
  preselectedAddress?: string;
  onUpdateQty: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
}

export function CartDrawer({
  open,
  onClose,
  items,
  settings,
  preselectedAddress,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
}: CartDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [orderMethod, setOrderMethod] = useState<
    'Ambil di Tempat (UNPAM)' | 'Antar / COD Area UNPAM'
  >('Ambil di Tempat (UNPAM)');
  const [addressOrSpot, setAddressOrSpot] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (preselectedAddress) {
      setOrderMethod('Antar / COD Area UNPAM');
      setAddressOrSpot(preselectedAddress);
    }
  }, [preselectedAddress]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const whatsappCheckoutUrl = buildCartWhatsAppUrl(settings.whatsappNumber, {
    customerName: customerName.trim(),
    orderMethod,
    addressOrSpot: addressOrSpot.trim(),
    notes: notes.trim(),
    items,
  });

  const handleCheckoutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!customerName.trim()) {
      e.preventDefault();
      setFormError('Mohon isi nama pemesan terlebih dahulu agar pesanan mudah diproses.');
      return;
    }
    setFormError('');
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            aria-label="Keranjang Pesanan"
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[#443A37] bg-[#262120] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#3F3633] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-5 w-5 text-[#E6A84C]" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-[#F6F2EC]">
                  Keranjang Pesanan ({totalCount})
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup keranjang"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#C5BCB4] hover:bg-[#38302D] hover:text-[#F6F2EC]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="h-10 w-10 text-[#685A54]" aria-hidden="true" />
                  <p className="mt-3 font-display text-base font-semibold text-[#F6F2EC]">
                    Keranjang masih kosong
                  </p>
                  <p className="mt-1 max-w-xs text-sm text-[#C5BCB4]">
                    Pilih varian dimsum favoritmu dari daftar menu untuk langsung memesan via
                    WhatsApp.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-5 cursor-pointer rounded-lg bg-[#E53E22] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#C93218]"
                  >
                    Lihat Menu
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cart Items */}
                  <div className="space-y-3">
                    {items.map((item) => (
                      <motion.div
                        layout
                        key={item.key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="flex items-center gap-3 rounded-xl border border-[#3F3633] bg-[#2E2725] p-3"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="h-16 w-16 shrink-0 rounded-lg object-cover bg-[#201C1B]"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-display text-sm font-bold text-[#F6F2EC]">
                            {item.name}
                          </h3>
                          <p className="text-xs text-[#A79E96]">{item.variantLabel}</p>
                          <p className="mt-1 font-mono tabular-nums text-sm font-semibold text-[#E6A84C]">
                            {formatRupiah(item.price * item.quantity)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.key)}
                            aria-label={`Hapus ${item.name}`}
                            className="cursor-pointer text-[#A79E96] hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <div className="flex items-center gap-1.5 rounded-lg border border-[#443A37] bg-[#241F1E] px-1.5 py-1">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.key, -1)}
                              aria-label="Kurangi jumlah"
                              className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#C5BCB4] hover:bg-[#38302D] hover:text-[#F6F2EC]"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[1.25rem] text-center font-mono tabular-nums text-xs font-semibold text-[#F6F2EC]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.key, 1)}
                              aria-label="Tambah jumlah"
                              className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#C5BCB4] hover:bg-[#38302D] hover:text-[#F6F2EC]"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Customer Order Form */}
                  <div className="space-y-3 border-t border-[#3F3633] pt-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-bold text-[#F6F2EC]">
                        Detail Pengiriman / Pengambilan
                      </h3>
                      <button
                        type="button"
                        onClick={onClearCart}
                        className="cursor-pointer text-xs text-[#A79E96] hover:text-red-400"
                      >
                        Kosongkan
                      </button>
                    </div>

                    <div>
                      <label
                        htmlFor="wa-customer-name"
                        className="block text-xs font-medium text-[#C5BCB4]"
                      >
                        Nama Pemesan *
                      </label>
                      <input
                        id="wa-customer-name"
                        type="text"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (formError) setFormError('');
                        }}
                        placeholder="Contoh: Dika (Mahasiswa UNPAM)"
                        className="mt-1.5 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-sm text-[#F6F2EC] placeholder:text-[#8E847C] focus:border-[#E6A84C] focus:bg-[#2E2725] focus:outline-none"
                      />
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-[#C5BCB4]">
                        Metode Pesanan
                      </span>
                      <div className="mt-1.5 grid grid-cols-2 gap-2">
                        {(
                          [
                            'Ambil di Tempat (UNPAM)',
                            'Antar / COD Area UNPAM',
                          ] as const
                        ).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setOrderMethod(method)}
                            className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                              orderMethod === method
                                ? 'border-[#E6A84C] bg-[#E6A84C]/15 text-[#F6C87A] font-semibold'
                                : 'border-[#443A37] bg-[#332C29] text-[#C5BCB4] hover:border-[#6B5B55]'
                            }`}
                          >
                            {method === 'Ambil di Tempat (UNPAM)'
                              ? 'Ambil di Tempat'
                              : 'Antar / COD UNPAM'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="wa-address"
                        className="block text-xs font-medium text-[#C5BCB4]"
                      >
                        {orderMethod === 'Ambil di Tempat (UNPAM)'
                          ? 'Estimasi Jam Ambil'
                          : 'Alamat / Titik Temu Kampus'}
                      </label>
                      <input
                        id="wa-address"
                        type="text"
                        value={addressOrSpot}
                        onChange={(e) => setAddressOrSpot(e.target.value)}
                        placeholder={
                          orderMethod === 'Ambil di Tempat (UNPAM)'
                            ? 'Contoh: Ambil jam 16.00 WIB'
                            : 'Contoh: Depan Gerbang UNPAM Viktor / Kos Jl. Surya Kencana'
                        }
                        className="mt-1.5 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-sm text-[#F6F2EC] placeholder:text-[#8E847C] focus:border-[#E6A84C] focus:bg-[#2E2725] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="wa-notes"
                        className="block text-xs font-medium text-[#C5BCB4]"
                      >
                        Catatan Tambahan (Opsional)
                      </label>
                      <textarea
                        id="wa-notes"
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Contoh: Pisah chili oil, ucapan Happy Birthday Kak Nia..."
                        className="mt-1.5 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 py-2 text-sm text-[#F6F2EC] placeholder:text-[#8E847C] focus:border-[#E6A84C] focus:bg-[#2E2725] focus:outline-none"
                      />
                    </div>

                    {formError && (
                      <p role="alert" className="text-xs font-medium text-red-400">
                        {formError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Total + Direct WhatsApp Checkout Button */}
            {items.length > 0 && (
              <div className="border-t border-[#3F3633] bg-[#241F1E] px-5 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#C5BCB4]">Total Pembayaran</span>
                  <span className="font-mono tabular-nums text-xl font-bold text-[#E6A84C]">
                    {formatRupiah(subtotal)}
                  </span>
                </div>
                <motion.a
                  href={whatsappCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleCheckoutClick}
                  whileTap={{ scale: 0.98 }}
                  className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#15803D]"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  <span>Kirim Pesanan ke WhatsApp</span>
                </motion.a>
                <p className="mt-2 text-center text-[11px] text-[#A79E96]">
                  Pesanan otomatis terformat &amp; masuk ke WhatsApp {settings.whatsappNumber}
                </p>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
