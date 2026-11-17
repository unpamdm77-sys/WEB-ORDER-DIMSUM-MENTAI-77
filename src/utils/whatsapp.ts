import { CartItem } from '../types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('Rp\u00a0', 'Rp')
    .replace('Rp ', 'Rp');
}

export function normalizeWhatsappNumber(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '6281996451323';
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  if (digits.startsWith('62')) {
    return digits;
  }
  return '62' + digits;
}

export function buildDirectWhatsAppUrl(rawPhone: string, message?: string): string {
  const phone = normalizeWhatsappNumber(rawPhone);
  if (!message) {
    return `https://wa.me/${phone}`;
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export interface WhatsAppCheckoutPayload {
  customerName: string;
  orderMethod: 'Ambil di Tempat (UNPAM)' | 'Antar / COD Area UNPAM';
  addressOrSpot: string;
  notes: string;
  items: CartItem[];
}

export function buildCartWhatsAppUrl(
  rawPhone: string,
  payload: WhatsAppCheckoutPayload
): string {
  const total = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const lines: string[] = [
    '*PESANAN BARU — DIMSUM MENTAI 77 UNPAM*',
    '--------------------------------',
    ...payload.items.map(
      (item, idx) =>
        `${idx + 1}. ${item.name} (${item.variantLabel}) x${item.quantity} = ${formatRupiah(
          item.price * item.quantity
        )}`
    ),
    '--------------------------------',
    `*Total Pesanan: ${formatRupiah(total)}*`,
    '',
    `Nama Pemesan: ${payload.customerName || '-'}`,
    `Metode: ${payload.orderMethod}`,
    `Lokasi / Titik Temu: ${payload.addressOrSpot || '-'}`,
  ];

  if (payload.notes.trim()) {
    lines.push(`Catatan: ${payload.notes.trim()}`);
  }

  lines.push('', 'Mohon info konfirmasi pesanannya ya Kak. Terima kasih!');

  return buildDirectWhatsAppUrl(rawPhone, lines.join('\n'));
}
