import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

const ROOT_DIR = process.cwd();
const IS_VERCEL = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

const BUNDLED_DATA_DIR = path.resolve(ROOT_DIR, '.data');
const BUNDLED_STORE_FILE = path.resolve(BUNDLED_DATA_DIR, 'store.json');

const DATA_DIR = IS_VERCEL
  ? path.join(os.tmpdir(), 'dm77-unpam-data')
  : BUNDLED_DATA_DIR;
const STORE_FILE = path.resolve(DATA_DIR, 'store.json');
const UPLOADS_DIR = IS_VERCEL
  ? path.join(os.tmpdir(), 'dm77-unpam-uploads')
  : path.resolve(ROOT_DIR, 'public/uploads');

const OWNER_EMAIL = 'unpam.dm77@gmail.com';

const SESSION_SECRET =
  process.env.STAFF_SESSION_SECRET ||
  crypto
    .createHash('sha256')
    .update(`dm77-unpam-secret-${ROOT_DIR}`)
    .digest('hex');

export interface MenuVariant {
  label: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  variants: MenuVariant[];
  popular: boolean;
  available: boolean;
  sortOrder: number;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  whatsappNumber: string;
  instagramHandle: string;
  instagramUrl: string;
  tiktokHandle: string;
  tiktokUrl: string;
  mapsUrl: string;
  addressNote: string;
  openHours: string;
  announcement: string;
  gofoodUrl: string;
  shopeefoodUrl: string;
  grabfoodUrl: string;
}

export interface StaffAccountRecord {
  id: string;
  username: string;
  displayName: string;
  passwordSalt: string;
  passwordHash: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreData {
  menuItems: MenuItem[];
  settings: StoreSettings;
  staffAccounts: StaffAccountRecord[];
}

interface SessionPayload {
  role: 'owner' | 'staff';
  uid: string;
  username: string;
  displayName: string;
  exp: number;
}

interface AuthedRequest extends Request {
  session?: SessionPayload;
}

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    id: 'dimsum-mentai',
    name: 'Dimsum Mentai',
    category: 'Mentai Series',
    description:
      'Siomay ayam udang lembut disiram saus mentai creamy khas 77 yang di-torch harum dengan taburan 100% Tobiko asli & nori.',
    imageUrl: '/src/assets/images/menu_dimsum_mentai_classic_1794850383222.jpg',
    variants: [
      { label: 'Isi 4', price: 20000 },
      { label: 'Isi 6', price: 27000 },
      { label: 'Isi 16', price: 85000 },
    ],
    popular: true,
    available: true,
    sortOrder: 1,
  },
  {
    id: 'dimsum-mentai-mozarella',
    name: 'Dimsum Mentai Mozarella',
    category: 'Mentai Series',
    description:
      'Perpaduan saus mentai gurih dan lelehan keju mozzarella melimpah yang dibakar sempurna, lumer di setiap gigitan.',
    imageUrl: '/src/assets/images/menu_dimsum_cheese_moza_1794850383190.jpg',
    variants: [
      { label: 'Isi 4', price: 25000 },
      { label: 'Isi 6', price: 32000 },
    ],
    popular: true,
    available: true,
    sortOrder: 2,
  },
  {
    id: 'dimsum-mentai-cheese',
    name: 'Dimsum Mentai Cheese',
    category: 'Mentai Series',
    description:
      'Kombinasi saus mentai klasik dan saus keju gurih creamy bertabur tobiko segar dan parsley harum.',
    imageUrl: '/src/assets/images/menu_dimsum_cheese_moza_1794850383190.jpg',
    variants: [
      { label: 'Isi 4', price: 22000 },
      { label: 'Isi 6', price: 30000 },
    ],
    popular: false,
    available: true,
    sortOrder: 3,
  },
  {
    id: 'dimsum-mentai-mix-sweet-spicy',
    name: 'Dimsum Mentai Mix Sweet Spicy',
    category: 'Mentai Series',
    description:
      'Setengah mentai creamy, setengah glaze sweet & spicy yang pedas manis nagih dalam satu tray hangat.',
    imageUrl: '/src/assets/images/hero_dimsum_mentai_feast_1794850382870.jpg',
    variants: [
      { label: 'Isi 4', price: 23000 },
      { label: 'Isi 6', price: 30000 },
    ],
    popular: false,
    available: true,
    sortOrder: 4,
  },
  {
    id: 'dimsum-mentai-mix-goreng',
    name: 'Dimsum Mentai Mix Goreng',
    category: 'Mentai Series',
    description:
      'Sensasi ganda: lembutnya dimsum mentai torched berpadu dengan renyahnya dimsum goreng dalam satu kotak.',
    imageUrl: '/src/assets/images/menu_dimsum_mentai_classic_1794850383222.jpg',
    variants: [
      { label: 'Isi 4', price: 23000 },
      { label: 'Isi 6', price: 30000 },
    ],
    popular: false,
    available: true,
    sortOrder: 5,
  },
  {
    id: 'dimsum-goreng-katsoubushi',
    name: 'Dimsum Goreng Katsoubushi',
    category: 'Goreng & Crispy',
    description:
      'Dimsum goreng keemasan super renyah dengan saus takoyaki spesial dan taburan melimpah serpihan ikan cakalang (katsoubushi).',
    imageUrl: '/src/assets/images/menu_dimsum_goreng_katsu_1794850384935.jpg',
    variants: [
      { label: 'Isi 4', price: 23000 },
      { label: 'Isi 6', price: 30000 },
    ],
    popular: true,
    available: true,
    sortOrder: 6,
  },
  {
    id: 'dimsum-goreng-mix-sweet-spicy',
    name: 'Dimsum Goreng Mix Sweet Spicy',
    category: 'Goreng & Crispy',
    description:
      'Dimsum goreng crispy dibalut saus sweet & spicy karamel pedas manis yang gurih dan menggugah selera.',
    imageUrl: '/src/assets/images/menu_dimsum_goreng_katsu_1794850384935.jpg',
    variants: [
      { label: 'Isi 4', price: 23000 },
      { label: 'Isi 6', price: 30000 },
    ],
    popular: false,
    available: true,
    sortOrder: 7,
  },
  {
    id: 'dimsum-goreng-keju',
    name: 'Dimsum Goreng Keju',
    category: 'Goreng & Crispy',
    description:
      'Kulit pangsit renyah berisi ayam udang lembut dan keju lumer gurih di dalamnya—favorit camilan sore di UNPAM.',
    imageUrl: '/src/assets/images/menu_dimsum_goreng_katsu_1794850384935.jpg',
    variants: [{ label: '1 Porsi', price: 20000 }],
    popular: false,
    available: true,
    sortOrder: 8,
  },
  {
    id: 'dimsum-kuah-keju-creamy',
    name: 'Dimsum Kuah Keju Creamy',
    category: 'Special & Kuah',
    description:
      'Dimsum kukus hangat disiram kuah keju creamy kental gurih yang bikin nagih, cocok dinikmati hangat kapan saja.',
    imageUrl: '/src/assets/images/menu_dimsum_cheese_moza_1794850383190.jpg',
    variants: [{ label: 'Isi 4', price: 25000 }],
    popular: true,
    available: true,
    sortOrder: 9,
  },
  {
    id: 'dimsum-sweet-spicy',
    name: 'Dimsum Sweet & Spicy',
    category: 'Special & Kuah',
    description:
      'Dimsum kukus lembut berlumur saus glaze pedas manis mengilap dengan wijen sangrai yang kaya rasa.',
    imageUrl: '/src/assets/images/hero_dimsum_mentai_feast_1794850382870.jpg',
    variants: [
      { label: 'Isi 4', price: 22000 },
      { label: 'Isi 6', price: 30000 },
    ],
    popular: false,
    available: true,
    sortOrder: 10,
  },
  {
    id: 'dimsum-original',
    name: 'Dimsum Original',
    category: 'Special & Kuah',
    description:
      'Dimsum kukus klasik daging ayam & udang padat juicy tanpa tepung berlebih, lengkap dengan saus sambal & chili oil.',
    imageUrl: '/src/assets/images/menu_dimsum_original_steamed_1794850382366.jpg',
    variants: [
      { label: 'Isi 4', price: 12000 },
      { label: 'Isi 6', price: 18000 },
    ],
    popular: false,
    available: true,
    sortOrder: 11,
  },
  {
    id: 'dimsum-mix-all-varian',
    name: 'Dimsum Mix All Varian',
    category: 'Paket & Cake',
    description:
      'Paket lengkap isi 16 pcs berisi seluruh varian favorit: Mentai, Cheese, Mozarella, Sweet Spicy, dan Goreng dalam satu box.',
    imageUrl: '/src/assets/images/menu_dimsum_party_cake_1794850385246.jpg',
    variants: [{ label: 'Isi 16', price: 90000 }],
    popular: true,
    available: true,
    sortOrder: 12,
  },
  {
    id: 'dimsum-birthday-cake',
    name: 'Dimsum Birthday Cake',
    category: 'Paket & Cake',
    description:
      'Kejutan ulang tahun atau anniversary unik berisi 16 pcs dimsum premium lengkap dengan topper ucapan spesial.',
    imageUrl: '/src/assets/images/menu_dimsum_party_cake_1794850385246.jpg',
    variants: [{ label: 'Isi 16', price: 85000 }],
    popular: true,
    available: true,
    sortOrder: 13,
  },
  {
    id: 'ekstra-chili-oil',
    name: 'Ekstra Chili Oil',
    category: 'Add-On',
    description:
      'Minyak cabai racikan rumahan pedas aromatik dengan ebi dan bawang putih renyah untuk pendamping wajib dimsum.',
    imageUrl: '/src/assets/images/menu_dimsum_original_steamed_1794850382366.jpg',
    variants: [{ label: 'Chili Oil', price: 3000 }],
    popular: false,
    available: true,
    sortOrder: 14,
  },
];

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Dimsum Mentai 77 UNPAM',
  tagline: 'The Ultimate Fusion · 100% Tobiko Asli',
  whatsappNumber: '081996451323',
  instagramHandle: '@DIMSUMMENTAI77.UNPAM',
  instagramUrl: 'https://www.instagram.com/dimsummentai77.unpam',
  tiktokHandle: '@dimsum.mentai.77.unpam',
  tiktokUrl: 'https://www.tiktok.com/@dimsum.mentai.77.unpam',
  mapsUrl: 'https://share.google/1zD7AfzXzzwkXprjD',
  addressNote:
    'Jl. Pamulang Permai 1, Samping Gapura Bundaran Tugu Pamulang (Area Kampus UNPAM, Tangerang Selatan)',
  openHours: 'Setiap Hari · 11.00 – 22.00 WIB',
  announcement:
    '100% Tobiko Asli · Tersedia di GoFood, ShopeeFood, GrabFood & Pesan Direct WhatsApp',
  gofoodUrl: 'https://gofood.co.id',
  shopeefoodUrl: 'https://shopee.co.id/m/shopeefood',
  grabfoodUrl: 'https://food.grab.com/id/id',
};

let memoryStoreFallback: StoreData | null = null;

function ensureDirectories() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch {
    // Graceful fallback to memoryStoreFallback if filesystem is read-only
  }
}

function parseStoreJson(raw: string): StoreData {
  const parsed = JSON.parse(raw) as Partial<StoreData>;
  return {
    menuItems:
      Array.isArray(parsed.menuItems) && parsed.menuItems.length > 0
        ? parsed.menuItems
        : DEFAULT_MENU_ITEMS,
    settings: parsed.settings
      ? { ...DEFAULT_SETTINGS, ...parsed.settings }
      : DEFAULT_SETTINGS,
    staffAccounts: Array.isArray(parsed.staffAccounts)
      ? parsed.staffAccounts
      : [],
  };
}

function readStore(): StoreData {
  ensureDirectories();
  if (fs.existsSync(STORE_FILE)) {
    try {
      const data = parseStoreJson(fs.readFileSync(STORE_FILE, 'utf8'));
      memoryStoreFallback = data;
      return data;
    } catch {
      // Fall through to bundled/default seed
    }
  }

  if (memoryStoreFallback) {
    return memoryStoreFallback;
  }

  if (IS_VERCEL && fs.existsSync(BUNDLED_STORE_FILE)) {
    try {
      const seeded = parseStoreJson(fs.readFileSync(BUNDLED_STORE_FILE, 'utf8'));
      memoryStoreFallback = seeded;
      try {
        fs.writeFileSync(STORE_FILE, JSON.stringify(seeded, null, 2), 'utf8');
      } catch {
        // Ignore non-critical seed copy error
      }
      return seeded;
    } catch {
      // Ignore parse error on bundled seed
    }
  }

  const initial: StoreData = {
    menuItems: DEFAULT_MENU_ITEMS,
    settings: DEFAULT_SETTINGS,
    staffAccounts: [],
  };
  memoryStoreFallback = initial;
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), 'utf8');
  } catch {
    // Ignore write failure on read-only environments
  }
  return initial;
}

function writeStore(data: StoreData) {
  memoryStoreFallback = data;
  ensureDirectories();
  try {
    const tmpFile = `${STORE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, STORE_FILE);
  } catch {
    // Memory fallback already updated if FS write fails
  }
}

function hashPassword(password: string, salt?: string) {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { salt: usedSalt, hash: derived };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function signSession(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionPayload;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return undefined;
}

function requireStaffOrOwner(req: AuthedRequest, res: Response, next: NextFunction) {
  const session = verifySessionToken(getBearerToken(req));
  if (!session) {
    res.status(401).json({
      error: 'Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.',
    });
    return;
  }
  req.session = session;
  next();
}

function requireOwnerOnly(req: AuthedRequest, res: Response, next: NextFunction) {
  const session = verifySessionToken(getBearerToken(req));
  if (!session || session.role !== 'owner') {
    res.status(403).json({
      error: 'Hanya Owner yang berhak mengakses dan mengubah akun user staff.',
    });
    return;
  }
  req.session = session;
  next();
}

function getFirebaseApiKey(): string | null {
  if (process.env.FIREBASE_API_KEY) return process.env.FIREBASE_API_KEY;
  if (process.env.VITE_FIREBASE_API_KEY) return process.env.VITE_FIREBASE_API_KEY;

  const candidatePaths = Array.from(
    new Set([
      path.resolve(ROOT_DIR, 'firebase-applet-config.json'),
      path.resolve(ROOT_DIR, '../firebase-applet-config.json'),
      '/var/task/firebase-applet-config.json',
    ])
  );
  for (const cfgPath of candidatePaths) {
    try {
      if (fs.existsSync(cfgPath)) {
        const raw = fs.readFileSync(cfgPath, 'utf8');
        const parsed = JSON.parse(raw) as { apiKey?: string };
        if (parsed.apiKey) return parsed.apiKey;
      }
    } catch {
      // Try next candidate path
    }
  }
  return null;
}

export function createApiApp() {
  ensureDirectories();
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));

  // Serve uploaded dish images in dev/local Node or warm /tmp cache
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Health Check Endpoint (useful for Vercel deployment verification)
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      runtime: IS_VERCEL ? 'vercel-serverless' : 'node-server',
      hasFirebaseConfig: Boolean(getFirebaseApiKey()),
      hasOwnerPassword: Boolean(process.env.OWNER_PASSWORD?.trim()),
    });
  });

  // Public Storefront Data (Menu + Contacts)
  app.get('/api/storefront', (_req, res) => {
    const data = readStore();
    res.json({
      menuItems: data.menuItems,
      settings: data.settings,
    });
  });

  // Verify existing session token
  app.get('/api/auth/session', (req, res) => {
    const session = verifySessionToken(getBearerToken(req));
    if (!session) {
      res.status(401).json({ authenticated: false });
      return;
    }
    res.json({
      authenticated: true,
      session: {
        role: session.role,
        uid: session.uid,
        username: session.username,
        displayName: session.displayName,
      },
    });
  });

  // Staff Login (Username + Password ONLY, no Google account)
  app.post('/api/auth/staff-login', (req, res) => {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };
    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanUsername || !cleanPassword) {
      res.status(400).json({ error: 'Username dan password wajib diisi.' });
      return;
    }

    const data = readStore();
    const account = data.staffAccounts.find(
      (acc) => acc.username.toLowerCase() === cleanUsername
    );

    if (
      !account ||
      !verifyPassword(cleanPassword, account.passwordSalt, account.passwordHash)
    ) {
      res.status(401).json({ error: 'Username atau password salah.' });
      return;
    }

    if (!account.active) {
      res.status(403).json({
        error: 'Akun staff ini sedang dinonaktifkan oleh Owner.',
      });
      return;
    }

    const sessionPayload: SessionPayload = {
      role: 'staff',
      uid: account.id,
      username: account.username,
      displayName: account.displayName,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    };

    const token = signSession(sessionPayload);
    res.json({
      token,
      session: {
        role: sessionPayload.role,
        uid: sessionPayload.uid,
        username: sessionPayload.username,
        displayName: sessionPayload.displayName,
      },
    });
  });

  // Owner Login Verification (Verifies Firebase Google ID Token for OWNER_EMAIL ONLY)
  app.post('/api/auth/owner-verify', async (req, res) => {
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) {
      res.status(400).json({ error: 'Token Google tidak ditemukan.' });
      return;
    }

    const apiKey = getFirebaseApiKey();
    if (!apiKey) {
      res.status(500).json({
        error:
          'Konfigurasi Firebase tidak tersedia di server. Tambahkan env FIREBASE_API_KEY di Vercel atau gunakan Login Password Owner.',
      });
      return;
    }

    try {
      const verifyResp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
          apiKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }
      );

      if (!verifyResp.ok) {
        res.status(401).json({ error: 'Verifikasi akun Google gagal.' });
        return;
      }

      const verifyJson = (await verifyResp.json()) as {
        users?: Array<{
          localId?: string;
          email?: string;
          emailVerified?: boolean;
          displayName?: string;
        }>;
      };

      const fbUser = verifyJson.users?.[0];
      if (
        !fbUser ||
        !fbUser.emailVerified ||
        fbUser.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()
      ) {
        res.status(403).json({
          error: `Akses ditolak. Login Google hanya khusus Owner (${OWNER_EMAIL}). Staff silakan login pakai Username & Password.`,
        });
        return;
      }

      const sessionPayload: SessionPayload = {
        role: 'owner',
        uid: fbUser.localId || 'owner',
        username: fbUser.email,
        displayName: fbUser.displayName || 'Owner Dimsum 77',
        exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
      };

      const token = signSession(sessionPayload);
      res.json({
        token,
        session: {
          role: sessionPayload.role,
          uid: sessionPayload.uid,
          username: sessionPayload.username,
          displayName: sessionPayload.displayName,
        },
      });
    } catch {
      res.status(500).json({ error: 'Gagal menghubungi layanan verifikasi Owner.' });
    }
  });

  // Check whether server-side OWNER_PASSWORD fallback is configured (safe boolean only)
  app.get('/api/auth/owner-config', (_req, res) => {
    const configured = Boolean(process.env.OWNER_PASSWORD?.trim());
    res.json({ hasOwnerPassword: configured });
  });

  // Owner Email + Password Fallback Login (works on any Vercel URL without Firebase Authorized Domains)
  app.post('/api/auth/owner-login', (req, res) => {
    const expectedPassword = process.env.OWNER_PASSWORD?.trim();
    if (!expectedPassword) {
      res.status(400).json({
        error:
          'OWNER_PASSWORD belum diatur di Environment Variables Vercel. Tambahkan OWNER_PASSWORD di Project Settings Vercel lalu Redeploy, atau tambahkan domain ini ke Firebase Authorized Domains.',
      });
      return;
    }

    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanEmail || !cleanPassword) {
      res.status(400).json({ error: 'Email dan password Owner wajib diisi.' });
      return;
    }

    if (cleanEmail !== OWNER_EMAIL.toLowerCase()) {
      res.status(403).json({
        error: `Hanya email Owner resmi (${OWNER_EMAIL}) yang diizinkan.`,
      });
      return;
    }

    const inputDigest = crypto.createHash('sha256').update(cleanPassword).digest();
    const expectedDigest = crypto
      .createHash('sha256')
      .update(expectedPassword)
      .digest();

    if (!crypto.timingSafeEqual(inputDigest, expectedDigest)) {
      res.status(401).json({ error: 'Password Owner salah.' });
      return;
    }

    const sessionPayload: SessionPayload = {
      role: 'owner',
      uid: 'owner-password',
      username: OWNER_EMAIL,
      displayName: 'Owner Dimsum 77',
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    };

    const token = signSession(sessionPayload);
    res.json({
      token,
      session: {
        role: sessionPayload.role,
        uid: sessionPayload.uid,
        username: sessionPayload.username,
        displayName: sessionPayload.displayName,
      },
    });
  });

  // --- OWNER-ONLY STAFF USER ACCOUNT MANAGEMENT ---
  app.get('/api/staff-accounts', requireOwnerOnly, (_req, res) => {
    const data = readStore();
    const safeList = data.staffAccounts.map((acc) => ({
      id: acc.id,
      username: acc.username,
      displayName: acc.displayName,
      active: acc.active,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
    }));
    res.json({ accounts: safeList });
  });

  app.post('/api/staff-accounts', requireOwnerOnly, (req, res) => {
    const { username, displayName, password } = req.body as {
      username?: string;
      displayName?: string;
      password?: string;
    };

    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanName = String(displayName || '').trim();
    const cleanPassword = String(password || '');

    if (!/^[a-z0-9._-]{3,32}$/.test(cleanUsername)) {
      res.status(400).json({
        error:
          'Username harus 3–32 karakter (hanya huruf kecil, angka, titik, garis bawah, atau strip).',
      });
      return;
    }
    if (!cleanName || cleanName.length < 2) {
      res.status(400).json({ error: 'Nama staff minimal 2 karakter.' });
      return;
    }
    if (cleanPassword.length < 4) {
      res.status(400).json({ error: 'Password minimal 4 karakter.' });
      return;
    }

    const data = readStore();
    if (
      data.staffAccounts.some(
        (acc) => acc.username.toLowerCase() === cleanUsername
      )
    ) {
      res.status(409).json({ error: 'Username sudah dipakai oleh staff lain.' });
      return;
    }

    const { salt, hash } = hashPassword(cleanPassword);
    const now = new Date().toISOString();
    const newAccount: StaffAccountRecord = {
      id: `staff_${crypto.randomBytes(6).toString('hex')}`,
      username: cleanUsername,
      displayName: cleanName,
      passwordSalt: salt,
      passwordHash: hash,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    data.staffAccounts.push(newAccount);
    writeStore(data);

    res.status(201).json({
      account: {
        id: newAccount.id,
        username: newAccount.username,
        displayName: newAccount.displayName,
        active: newAccount.active,
        createdAt: newAccount.createdAt,
        updatedAt: newAccount.updatedAt,
      },
    });
  });

  app.put('/api/staff-accounts/:id', requireOwnerOnly, (req, res) => {
    const targetId = req.params.id;
    const { username, displayName, password, active } = req.body as {
      username?: string;
      displayName?: string;
      password?: string;
      active?: boolean;
    };

    const data = readStore();
    const idx = data.staffAccounts.findIndex((acc) => acc.id === targetId);
    if (idx === -1) {
      res.status(404).json({ error: 'Akun staff tidak ditemukan.' });
      return;
    }

    const current = data.staffAccounts[idx];
    const nextUsername =
      username !== undefined
        ? String(username).trim().toLowerCase()
        : current.username;

    if (!/^[a-z0-9._-]{3,32}$/.test(nextUsername)) {
      res.status(400).json({
        error:
          'Username harus 3–32 karakter (hanya huruf kecil, angka, titik, garis bawah, atau strip).',
      });
      return;
    }

    if (
      data.staffAccounts.some(
        (acc) => acc.id !== targetId && acc.username.toLowerCase() === nextUsername
      )
    ) {
      res.status(409).json({ error: 'Username sudah digunakan staff lain.' });
      return;
    }

    const nextName =
      displayName !== undefined
        ? String(displayName).trim()
        : current.displayName;
    if (nextName.length < 2) {
      res.status(400).json({ error: 'Nama staff minimal 2 karakter.' });
      return;
    }

    let nextSalt = current.passwordSalt;
    let nextHash = current.passwordHash;
    if (password && password.trim().length > 0) {
      if (password.length < 4) {
        res.status(400).json({ error: 'Password baru minimal 4 karakter.' });
        return;
      }
      const hashed = hashPassword(password);
      nextSalt = hashed.salt;
      nextHash = hashed.hash;
    }

    const updated: StaffAccountRecord = {
      ...current,
      username: nextUsername,
      displayName: nextName,
      passwordSalt: nextSalt,
      passwordHash: nextHash,
      active: typeof active === 'boolean' ? active : current.active,
      updatedAt: new Date().toISOString(),
    };

    data.staffAccounts[idx] = updated;
    writeStore(data);

    res.json({
      account: {
        id: updated.id,
        username: updated.username,
        displayName: updated.displayName,
        active: updated.active,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  });

  app.delete('/api/staff-accounts/:id', requireOwnerOnly, (req, res) => {
    const targetId = req.params.id;
    const data = readStore();
    const nextList = data.staffAccounts.filter((acc) => acc.id !== targetId);
    if (nextList.length === data.staffAccounts.length) {
      res.status(404).json({ error: 'Akun staff tidak ditemukan.' });
      return;
    }
    data.staffAccounts = nextList;
    writeStore(data);
    res.json({ deleted: true });
  });

  // --- MENU & IMAGE EDITING (STAFF + OWNER) ---
  app.post('/api/upload-image', requireStaffOrOwner, (req, res) => {
    const { filename, dataUrl } = req.body as {
      filename?: string;
      dataUrl?: string;
    };

    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'File gambar tidak valid.' });
      return;
    }

    const match = dataUrl.match(
      /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/
    );
    if (!match) {
      res.status(400).json({
        error: 'Format gambar harus PNG, JPG, WEBP, atau GIF.',
      });
      return;
    }

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Ukuran gambar maksimal 5 MB.' });
      return;
    }

    if (IS_VERCEL) {
      res.json({ url: dataUrl });
      return;
    }

    const baseName = String(filename || 'menu-image')
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 36);
    const outName = `${baseName || 'menu'}-${Date.now().toString(36)}.${ext}`;
    const outPath = path.resolve(UPLOADS_DIR, outName);

    try {
      ensureDirectories();
      fs.writeFileSync(outPath, buffer);
      res.json({ url: `/uploads/${outName}` });
    } catch {
      res.json({ url: dataUrl });
    }
  });

  app.put('/api/menu/:id', requireStaffOrOwner, (req, res) => {
    const itemId = req.params.id;
    const body = req.body as Partial<MenuItem>;

    if (!body.name || String(body.name).trim().length < 2) {
      res.status(400).json({ error: 'Nama menu minimal 2 karakter.' });
      return;
    }
    if (!Array.isArray(body.variants) || body.variants.length === 0) {
      res.status(400).json({ error: 'Minimal 1 varian harga harus diisi.' });
      return;
    }

    const cleanItem: MenuItem = {
      id: itemId,
      name: String(body.name).trim().slice(0, 100),
      category: String(body.category || 'Mentai Series'),
      description: String(body.description || '').trim().slice(0, 300),
      imageUrl: String(body.imageUrl || '').trim() || DEFAULT_MENU_ITEMS[0].imageUrl,
      variants: body.variants.slice(0, 10).map((v) => ({
        label: String(v.label || 'Reguler').trim().slice(0, 40),
        price: Math.max(0, Number(v.price) || 0),
      })),
      popular: Boolean(body.popular),
      available: body.available !== false,
      sortOrder: Number(body.sortOrder) || 1,
    };

    const data = readStore();
    const idx = data.menuItems.findIndex((m) => m.id === itemId);
    if (idx === -1) {
      data.menuItems.push(cleanItem);
    } else {
      data.menuItems[idx] = cleanItem;
    }
    data.menuItems.sort((a, b) => a.sortOrder - b.sortOrder);
    writeStore(data);
    res.json({ item: cleanItem, menuItems: data.menuItems });
  });

  app.delete('/api/menu/:id', requireStaffOrOwner, (req, res) => {
    const itemId = req.params.id;
    const data = readStore();
    data.menuItems = data.menuItems.filter((m) => m.id !== itemId);
    writeStore(data);
    res.json({ deleted: true, menuItems: data.menuItems });
  });

  app.post('/api/menu/reset-default', requireStaffOrOwner, (_req, res) => {
    const data = readStore();
    data.menuItems = DEFAULT_MENU_ITEMS;
    writeStore(data);
    res.json({ menuItems: data.menuItems });
  });

  // --- STORE SETTINGS & CONTACT EDITING (STAFF + OWNER) ---
  app.put('/api/settings', requireStaffOrOwner, (req, res) => {
    const body = req.body as Partial<StoreSettings>;
    const data = readStore();
    const updated: StoreSettings = {
      storeName: String(body.storeName || data.settings.storeName).trim(),
      tagline: String(body.tagline || data.settings.tagline).trim(),
      whatsappNumber: String(body.whatsappNumber || data.settings.whatsappNumber)
        .replace(/[^0-9+]/g, '')
        .trim(),
      instagramHandle: String(
        body.instagramHandle || data.settings.instagramHandle
      ).trim(),
      instagramUrl: String(body.instagramUrl || data.settings.instagramUrl).trim(),
      tiktokHandle: String(body.tiktokHandle || data.settings.tiktokHandle).trim(),
      tiktokUrl: String(body.tiktokUrl || data.settings.tiktokUrl).trim(),
      mapsUrl: String(body.mapsUrl || data.settings.mapsUrl).trim(),
      addressNote: String(body.addressNote || data.settings.addressNote).trim(),
      openHours: String(body.openHours || data.settings.openHours).trim(),
      announcement: String(body.announcement ?? data.settings.announcement).trim(),
      gofoodUrl: String(body.gofoodUrl ?? data.settings.gofoodUrl).trim(),
      shopeefoodUrl: String(
        body.shopeefoodUrl ?? data.settings.shopeefoodUrl
      ).trim(),
      grabfoodUrl: String(body.grabfoodUrl ?? data.settings.grabfoodUrl).trim(),
    };
    data.settings = updated;
    writeStore(data);
    res.json({ settings: updated });
  });

  // Ensure unexpected Express errors always return JSON instead of HTML/plain text
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message =
      err instanceof Error ? err.message : 'Terjadi kesalahan pada server.';
    res.status(500).json({ error: message });
  });

  return app;
}

let cachedApp: ReturnType<typeof createApiApp> | null = null;

export default function handler(req: Request, res: Response) {
  try {
    if (!cachedApp) {
      cachedApp = createApiApp();
    }
    return cachedApp(req, res);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Internal serverless initialization error';
    res.status(500).json({
      error: `Terjadi kesalahan pada server API: ${message}`,
    });
  }
}
