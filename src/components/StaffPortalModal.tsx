import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import {
  Check,
  Cloud,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_STORE_SETTINGS,
  IMAGE_PRESETS,
  MENU_CATEGORIES,
} from '../data/defaultData';
import {
  FIREBASE_PROJECT_ID,
  OWNER_EMAIL,
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../firebase';
import {
  MenuCategory,
  MenuItem,
  MenuVariant,
  StaffAccount,
  StaffSession,
  StoreSettings,
} from '../types';
import { compressImageFile } from '../utils/compressImage';
import { formatRupiah } from '../utils/whatsapp';

interface StaffPortalModalProps {
  open: boolean;
  onClose: () => void;
  session: StaffSession | null;
  authToken: string | null;
  onSessionChange: (token: string | null, session: StaffSession | null) => void;
  menuItems: MenuItem[];
  onMenuUpdated: (nextItems: MenuItem[]) => void;
  settings: StoreSettings;
  onSettingsUpdated: (nextSettings: StoreSettings) => void;
}

type StaffTab = 'menu' | 'contact' | 'accounts';
type LoginMode = 'staff' | 'owner';

const EMPTY_FORM: Omit<MenuItem, 'id'> = {
  name: '',
  category: 'Mentai Series',
  description: '',
  imageUrl: IMAGE_PRESETS[0].url,
  variants: [
    { label: 'Isi 4', price: 20000 },
    { label: 'Isi 6', price: 27000 },
  ],
  popular: false,
  available: true,
  sortOrder: 15,
};

async function safeParseJson<T extends Record<string, unknown>>(
  resp: Response
): Promise<T & { error?: string }> {
  const text = await resp.text();
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return {
      error: resp.ok
        ? 'Respon server tidak valid.'
        : `Server sedang bermasalah (HTTP ${resp.status}). Silakan coba lagi atau periksa log Vercel.`,
    } as T & { error?: string };
  }
}

export function StaffPortalModal({
  open,
  onClose,
  session,
  authToken,
  onSessionChange,
  menuItems,
  onMenuUpdated,
  settings,
  onSettingsUpdated,
}: StaffPortalModalProps) {
  const [loginMode, setLoginMode] = useState<LoginMode>('staff');
  const [activeTab, setActiveTab] = useState<StaffTab>('menu');

  // Staff Username/Password Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Owner Email + Password Fallback State (Vercel bypass for Firebase unauthorized-domain)
  const [showOwnerFallback, setShowOwnerFallback] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [hasOwnerPassword, setHasOwnerPassword] = useState<boolean | null>(null);

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Menu Editing State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [menuForm, setMenuForm] = useState<Omit<MenuItem, 'id'>>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmResetDefault, setConfirmResetDefault] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Contact Settings Form State
  const [contactForm, setContactForm] = useState<StoreSettings>(settings);
  const [savingContact, setSavingContact] = useState(false);

  // Owner-Only Staff Account Management State
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accDisplayName, setAccDisplayName] = useState('');
  const [accUsername, setAccUsername] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [accActive, setAccActive] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);

  const isOwner = session?.role === 'owner';
  const isOwnerFirebaseSignedIn =
    isOwner &&
    auth.currentUser?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

  useEffect(() => {
    setContactForm(settings);
  }, [settings]);

  useEffect(() => {
    if (!isOwner && activeTab === 'accounts') {
      setActiveTab('menu');
    }
  }, [isOwner, activeTab]);

  const notify = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4500);
  };

  const fetchStaffAccounts = async (token: string) => {
    setLoadingAccounts(true);
    try {
      const resp = await fetch('/api/staff-accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const json = await safeParseJson<{ accounts?: StaffAccount[] }>(resp);
        if (Array.isArray(json.accounts)) {
          setStaffAccounts(json.accounts);
        }
      }
    } catch {
      // Ignore transient network errors
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    if (open && isOwner && authToken && activeTab === 'accounts') {
      void fetchStaffAccounts(authToken);
    }
  }, [open, isOwner, authToken, activeTab]);

  useEffect(() => {
    if (!open || session || loginMode !== 'owner') return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/auth/owner-config');
        if (!resp.ok || cancelled) return;
        const json = (await resp.json()) as { hasOwnerPassword?: boolean };
        if (!cancelled) {
          setHasOwnerPassword(Boolean(json.hasOwnerPassword));
        }
      } catch {
        // Ignore non-critical check
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, session, loginMode]);

  // --- AUTHENTICATION HANDLERS ---
  const handleStaffLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const resp = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });
      const json = await safeParseJson<{
        token?: string;
        session?: StaffSession;
      }>(resp);
      if (!resp.ok || !json.token || !json.session) {
        notify('error', json.error || 'Username atau password salah.');
        return;
      }
      onSessionChange(json.token, json.session);
      setLoginPassword('');
      setActiveTab('menu');
      notify('success', `Selamat datang, ${json.session.displayName}!`);
    } catch {
      notify('error', 'Gagal terhubung ke server login.');
    } finally {
      setAuthLoading(false);
    }
  };

  const completeOwnerSessionVerification = async (
    email: string | null | undefined,
    getIdTokenFn: () => Promise<string>
  ) => {
    if (email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      await signOut(auth);
      notify(
        'error',
        `Akses ditolak. Login Google hanya khusus Owner (${OWNER_EMAIL}). Staff wajib login menggunakan akun user (Username & Password).`
      );
      return;
    }
    const idToken = await getIdTokenFn();
    const resp = await fetch('/api/auth/owner-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const json = await safeParseJson<{
      token?: string;
      session?: StaffSession;
    }>(resp);
    if (!resp.ok || !json.token || !json.session) {
      await signOut(auth);
      notify('error', json.error || 'Verifikasi Owner gagal.');
      return;
    }
    setUnauthorizedDomain(null);
    onSessionChange(json.token, json.session);
    setActiveTab('menu');
    notify('success', 'Berhasil masuk sebagai Owner Dimsum Mentai 77!');
  };

  // Complete Google Sign-In if returning from mobile redirect flow
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const redirectCred = await getRedirectResult(auth);
        if (!active || !redirectCred?.user) return;
        setAuthLoading(true);
        await completeOwnerSessionVerification(
          redirectCred.user.email,
          () => redirectCred.user.getIdToken()
        );
      } catch (err) {
        if (!active) return;
        const code = (err as { code?: string })?.code || '';
        const msg = err instanceof Error ? err.message : '';
        if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
          const host = window.location.hostname || 'domain-anda';
          setUnauthorizedDomain(host);
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleOwnerGoogleLogin = async () => {
    setAuthLoading(true);
    setUnauthorizedDomain(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await completeOwnerSessionVerification(
        cred.user.email,
        () => cred.user.getIdToken()
      );
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      const msg = err instanceof Error ? err.message : 'Gagal login Owner.';

      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        const host = window.location.hostname || 'domain-anda';
        setUnauthorizedDomain(host);
        setLoginMode('owner');
        if (hasOwnerPassword) {
          setShowOwnerFallback(true);
        }
        setStatusMessage({
          type: 'error',
          text: `Domain "${host}" belum didaftarkan di Firebase Authorized Domains. Ikuti panduan di bawah atau login pakai Password Owner.`,
        });
      } else if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
        const isStandalone = typeof window !== 'undefined' && window.self === window.top;
        if (isStandalone) {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        notify(
          'error',
          'Popup login diblokir oleh browser. Izinkan popup untuk situs ini lalu coba lagi.'
        );
      } else if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        notify('error', 'Popup login Google ditutup sebelum selesai. Silakan coba lagi.');
      } else {
        notify('error', msg);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOwnerPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerPassword.trim()) {
      notify('error', 'Masukkan password Owner terlebih dahulu.');
      return;
    }
    setAuthLoading(true);
    try {
      const resp = await fetch('/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: OWNER_EMAIL,
          password: ownerPassword,
        }),
      });
      const json = await safeParseJson<{
        token?: string;
        session?: StaffSession;
      }>(resp);
      if (!resp.ok || !json.token || !json.session) {
        notify('error', json.error || 'Gagal login Owner.');
        return;
      }
      setOwnerPassword('');
      setUnauthorizedDomain(null);
      onSessionChange(json.token, json.session);
      setActiveTab('menu');
      notify('success', 'Berhasil masuk sebagai Owner Dimsum Mentai 77!');
    } catch {
      notify('error', 'Gagal terhubung ke server login Owner.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCopyDomain = async () => {
    if (!unauthorizedDomain) return;
    try {
      await navigator.clipboard.writeText(unauthorizedDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } catch {
      // Clipboard API fallback ignored
    }
  };

  const handleSignOut = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // Ignore Firebase signout error
    }
    onSessionChange(null, null);
    setEditingItemId(null);
    setEditingAccountId(null);
    notify('success', 'Anda telah keluar.');
  };

  // --- FAST BROWSER IMAGE COMPRESSION FOR REALTIME FIREBASE STORAGE ---
  const handleImageFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file || !authToken) return;

    if (!file.type.startsWith('image/')) {
      notify('error', 'Pilih file gambar (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify('error', 'Ukuran file gambar maksimal 10 MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const compressedDataUrl = await compressImageFile(file);
      setMenuForm((prev) => ({ ...prev, imageUrl: compressedDataUrl }));
      notify(
        'success',
        'Foto siap! Klik "Simpan Menu" untuk langsung update realtime ke Firebase.'
      );
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Gagal memproses gambar.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSyncAllToFirestore = async () => {
    if (!isOwnerFirebaseSignedIn || !auth.currentUser) {
      notify(
        'error',
        `Login sebagai Owner Google (${OWNER_EMAIL}) terlebih dahulu untuk menyinkronkan ke Firebase.`
      );
      return;
    }

    setSyncingCloud(true);
    let syncedCount = 0;
    try {
      for (const item of menuItems) {
        const imageUrl = (item.imageUrl || '').trim();
        if (!imageUrl || imageUrl.length > 400000) {
          continue;
        }
        try {
          await setDoc(doc(db, 'menu_items', item.id), {
            name: item.name.trim().slice(0, 100),
            category: item.category,
            description: (item.description || '').trim().slice(0, 300),
            imageUrl,
            variants: item.variants.slice(0, 10).map((v) => ({
              label: v.label.trim().slice(0, 40) || 'Porsi',
              price: Math.max(0, Math.min(10000000, Number(v.price) || 0)),
            })),
            popular: Boolean(item.popular),
            available: Boolean(item.available),
            sortOrder: Math.max(0, Math.min(1000, Number(item.sortOrder) || 1)),
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid,
          });
          syncedCount++;
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `menu_items/${item.id}`);
        }
      }

      try {
        await setDoc(doc(db, 'store_settings', 'main'), {
          storeName: settings.storeName,
          tagline: settings.tagline,
          whatsappNumber: settings.whatsappNumber,
          instagramHandle: settings.instagramHandle,
          instagramUrl: settings.instagramUrl,
          tiktokHandle: settings.tiktokHandle,
          tiktokUrl: settings.tiktokUrl,
          mapsUrl: settings.mapsUrl,
          addressNote: settings.addressNote,
          openHours: settings.openHours,
          announcement: settings.announcement,
          gofoodUrl: settings.gofoodUrl,
          shopeefoodUrl: settings.shopeefoodUrl,
          grabfoodUrl: settings.grabfoodUrl,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser.uid,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'store_settings/main');
      }

      notify(
        'success',
        `Semua ${syncedCount} menu & foto tersinkron realtime ke Firebase!`
      );
    } catch (err) {
      notify(
        'error',
        err instanceof Error
          ? `Gagal sinkronisasi Firebase: ${err.message}`
          : 'Gagal menyinkronkan ke Firebase Firestore.'
      );
    } finally {
      setSyncingCloud(false);
    }
  };

  // --- MENU CRUD HANDLERS ---
  const startCreateNewMenu = () => {
    setEditingItemId('__NEW__');
    setMenuForm({
      ...EMPTY_FORM,
      sortOrder: menuItems.length + 1,
    });
  };

  const startEditMenu = (item: MenuItem) => {
    setEditingItemId(item.id);
    setMenuForm({
      name: item.name,
      category: item.category,
      description: item.description,
      imageUrl: item.imageUrl,
      variants: item.variants.map((v) => ({ ...v })),
      popular: item.popular,
      available: item.available,
      sortOrder: item.sortOrder,
    });
  };

  const updateVariantField = (
    idx: number,
    field: keyof MenuVariant,
    value: string
  ) => {
    setMenuForm((prev) => {
      const updated = [...prev.variants];
      if (field === 'price') {
        updated[idx] = { ...updated[idx], price: Math.max(0, Number(value) || 0) };
      } else {
        updated[idx] = { ...updated[idx], label: value };
      }
      return { ...prev, variants: updated };
    });
  };

  const addVariantRow = () => {
    if (menuForm.variants.length >= 10) return;
    setMenuForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { label: 'Varian Baru', price: 20000 }],
    }));
  };

  const removeVariantRow = (idx: number) => {
    if (menuForm.variants.length <= 1) return;
    setMenuForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    if (menuForm.name.trim().length < 2) {
      notify('error', 'Nama menu minimal 2 karakter.');
      return;
    }
    if (menuForm.variants.some((v) => !v.label.trim())) {
      notify('error', 'Semua label varian harus diisi.');
      return;
    }

    setSavingMenu(true);
    const slugId =
      editingItemId && editingItemId !== '__NEW__'
        ? editingItemId
        : `${menuForm.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;

    const payload = {
      name: menuForm.name.trim(),
      category: menuForm.category,
      description: menuForm.description.trim(),
      imageUrl: menuForm.imageUrl.trim() || IMAGE_PRESETS[0].url,
      variants: menuForm.variants.map((v) => ({
        label: v.label.trim(),
        price: Number(v.price) || 0,
      })),
      popular: menuForm.popular,
      available: menuForm.available,
      sortOrder: Number(menuForm.sortOrder) || 1,
    };

    try {
      let firebaseSaved = false;
      if (isOwnerFirebaseSignedIn && auth.currentUser) {
        if (payload.imageUrl.length > 400000) {
          notify(
            'error',
            'Ukuran foto melebihi batas dokumen Firebase (400 KB). Pilih gambar lain atau perkecil ukurannya.'
          );
          return;
        }
        try {
          await setDoc(doc(db, 'menu_items', slugId), {
            name: payload.name.slice(0, 100),
            category: payload.category,
            description: payload.description.slice(0, 300),
            imageUrl: payload.imageUrl,
            variants: payload.variants.slice(0, 10).map((v) => ({
              label: v.label.slice(0, 40),
              price: Math.max(0, Math.min(10000000, v.price)),
            })),
            popular: Boolean(payload.popular),
            available: Boolean(payload.available),
            sortOrder: Math.max(0, Math.min(1000, payload.sortOrder)),
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid,
          });
          firebaseSaved = true;
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `menu_items/${slugId}`);
        }
      }

      // Update local/API storefront cache best-effort
      try {
        const resp = await fetch(`/api/menu/${encodeURIComponent(slugId)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        });
        const json = await safeParseJson<{ menuItems?: MenuItem[] }>(resp);
        if (resp.ok && json.menuItems) {
          onMenuUpdated(json.menuItems);
        } else if (!firebaseSaved) {
          notify('error', json.error || 'Gagal menyimpan menu.');
          return;
        }
      } catch {
        if (!firebaseSaved) {
          notify('error', 'Terjadi kesalahan saat menyimpan menu.');
          return;
        }
      }

      setEditingItemId(null);
      notify(
        'success',
        firebaseSaved
          ? `Menu "${payload.name}" & fotonya langsung tersimpan realtime di Firebase!`
          : `Menu "${payload.name}" tersimpan sementara. Login Owner Google (${OWNER_EMAIL}) untuk sync realtime Firebase.`
      );
    } catch (err) {
      notify(
        'error',
        err instanceof Error
          ? `Gagal menyimpan ke Firebase: ${err.message}`
          : 'Terjadi kesalahan saat menyimpan menu.'
      );
    } finally {
      setSavingMenu(false);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!authToken) return;
    try {
      let firebaseDeleted = false;
      if (isOwnerFirebaseSignedIn) {
        try {
          await deleteDoc(doc(db, 'menu_items', id));
          firebaseDeleted = true;
        } catch {
          // Ignore if document did not exist in Firestore
        }
      }

      try {
        const resp = await fetch(`/api/menu/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const json = await safeParseJson<{ menuItems?: MenuItem[] }>(resp);
        if (resp.ok && json.menuItems) {
          onMenuUpdated(json.menuItems);
        } else if (!firebaseDeleted) {
          notify('error', json.error || 'Gagal menghapus menu.');
          return;
        }
      } catch {
        if (!firebaseDeleted) {
          notify('error', 'Gagal menghapus menu.');
          return;
        }
      }

      setConfirmDeleteId(null);
      notify('success', 'Menu berhasil dihapus.');
    } catch {
      notify('error', 'Gagal menghapus menu.');
    }
  };

  const handleSeedDefaultMenu = async () => {
    if (!authToken) return;
    setSavingMenu(true);
    try {
      const resp = await fetch('/api/menu/reset-default', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await safeParseJson<{ menuItems?: MenuItem[] }>(resp);
      if (!resp.ok || !json.menuItems) {
        notify('error', json.error || 'Gagal mereset menu.');
        return;
      }
      onMenuUpdated(json.menuItems);
      setConfirmResetDefault(false);
      notify('success', '14 menu resmi berhasil dipulihkan!');
    } catch {
      notify('error', 'Gagal menyinkronkan menu.');
    } finally {
      setSavingMenu(false);
    }
  };

  // --- STORE CONTACT SETTINGS ---
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setSavingContact(true);
    try {
      let firebaseSaved = false;
      if (isOwnerFirebaseSignedIn && auth.currentUser) {
        try {
          await setDoc(doc(db, 'store_settings', 'main'), {
            storeName: contactForm.storeName,
            tagline: contactForm.tagline,
            whatsappNumber: contactForm.whatsappNumber,
            instagramHandle: contactForm.instagramHandle,
            instagramUrl: contactForm.instagramUrl,
            tiktokHandle: contactForm.tiktokHandle,
            tiktokUrl: contactForm.tiktokUrl,
            mapsUrl: contactForm.mapsUrl,
            addressNote: contactForm.addressNote,
            openHours: contactForm.openHours,
            announcement: contactForm.announcement,
            gofoodUrl: contactForm.gofoodUrl,
            shopeefoodUrl: contactForm.shopeefoodUrl,
            grabfoodUrl: contactForm.grabfoodUrl,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid,
          });
          firebaseSaved = true;
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'store_settings/main');
        }
      }

      try {
        const resp = await fetch('/api/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(contactForm),
        });
        const json = await safeParseJson<{ settings?: StoreSettings }>(resp);
        if (resp.ok && json.settings) {
          onSettingsUpdated(json.settings);
        } else if (!firebaseSaved) {
          notify('error', json.error || 'Gagal menyimpan kontak.');
          return;
        }
      } catch {
        if (!firebaseSaved) {
          notify('error', 'Gagal menyimpan pengaturan kontak.');
          return;
        }
      }

      notify(
        'success',
        firebaseSaved
          ? 'Kontak & alamat toko langsung tersimpan realtime di Firebase!'
          : 'Kontak & alamat toko berhasil diperbarui!'
      );
    } catch (err) {
      notify(
        'error',
        err instanceof Error
          ? `Gagal menyimpan kontak ke Firebase: ${err.message}`
          : 'Gagal menyimpan pengaturan kontak.'
      );
    } finally {
      setSavingContact(false);
    }
  };

  const handleResetDefaultContact = () => {
    setContactForm(DEFAULT_STORE_SETTINGS);
  };

  // --- OWNER-ONLY STAFF USER ACCOUNT CRUD ---
  const startCreateAccount = () => {
    setEditingAccountId('__NEW__');
    setAccDisplayName('');
    setAccUsername('');
    setAccPassword('');
    setAccActive(true);
  };

  const startEditAccount = (acc: StaffAccount) => {
    setEditingAccountId(acc.id);
    setAccDisplayName(acc.displayName);
    setAccUsername(acc.username);
    setAccPassword('');
    setAccActive(acc.active);
  };

  const handleSaveStaffAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !isOwner) return;

    setSavingAccount(true);
    try {
      const isNew = editingAccountId === '__NEW__';
      const url = isNew
        ? '/api/staff-accounts'
        : `/api/staff-accounts/${encodeURIComponent(editingAccountId!)}`;
      const method = isNew ? 'POST' : 'PUT';

      const resp = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          displayName: accDisplayName.trim(),
          username: accUsername.trim(),
          password: accPassword || undefined,
          active: accActive,
        }),
      });
      const json = await safeParseJson<{ account?: StaffAccount }>(resp);
      if (!resp.ok || !json.account) {
        notify('error', json.error || 'Gagal menyimpan akun staff.');
        return;
      }

      await fetchStaffAccounts(authToken);
      setEditingAccountId(null);
      setAccPassword('');
      notify(
        'success',
        isNew
          ? `Akun staff "${json.account.username}" berhasil dibuat!`
          : `Akun staff "${json.account.username}" berhasil diperbarui!`
      );
    } catch {
      notify('error', 'Gagal menyimpan akun staff.');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDeleteStaffAccount = async (id: string) => {
    if (!authToken || !isOwner) return;
    try {
      const resp = await fetch(
        `/api/staff-accounts/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      if (!resp.ok) {
        notify('error', 'Gagal menghapus akun staff.');
        return;
      }
      await fetchStaffAccounts(authToken);
      notify('success', 'Akun staff berhasil dihapus.');
    } catch {
      notify('error', 'Gagal menghapus akun staff.');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#443A37] bg-[#262120] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#3F3633] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-[#E6A84C]" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-lg font-bold text-[#F6F2EC]">
                    Portal Staff &amp; Owner Dimsum Mentai 77
                  </h2>
                  <p className="text-xs text-[#A79E96]">
                    Edit menu, foto produk, harga, kontak &amp; akun staff
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {session && (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#443A37] px-3 py-1.5 text-xs font-medium text-[#C5BCB4] hover:bg-[#38302D] hover:text-[#F6F2EC]"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Keluar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup portal staff"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#C5BCB4] hover:bg-[#38302D] hover:text-[#F6F2EC]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Status Toast */}
            {statusMessage && (
              <div
                className={`border-b px-5 py-2.5 text-xs font-medium ${
                  statusMessage.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                    : 'border-red-500/30 bg-red-500/15 text-red-300'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {!session ? (
                /* Login Screen: Staff Username/Password + Owner Google Login */
                <div className="mx-auto max-w-md py-4">
                  {/* Mode Switcher */}
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#443A37] bg-[#2E2725] p-1">
                    <button
                      type="button"
                      onClick={() => setLoginMode('staff')}
                      className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        loginMode === 'staff'
                          ? 'bg-[#E53E22] text-white shadow-2xs'
                          : 'text-[#C5BCB4] hover:text-[#F6F2EC]'
                      }`}
                    >
                      Login Staff (Akun User)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMode('owner')}
                      className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        loginMode === 'owner'
                          ? 'bg-[#E53E22] text-white shadow-2xs'
                          : 'text-[#C5BCB4] hover:text-[#F6F2EC]'
                      }`}
                    >
                      Login Owner
                    </button>
                  </div>

                  {loginMode === 'staff' ? (
                    <form onSubmit={handleStaffLoginSubmit} className="mt-6 space-y-4">
                      <div className="text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E53E22]/15 text-[#E6A84C]">
                          <KeyRound className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <h3 className="mt-3 font-display text-lg font-bold text-[#F6F2EC]">
                          Masuk Sebagai Staff
                        </h3>
                        <p className="mt-1 text-xs text-[#C5BCB4]">
                          Gunakan username dan password akun staff yang diberikan oleh Owner.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="staff-login-username"
                          className="block text-xs font-medium text-[#C5BCB4]"
                        >
                          Username
                        </label>
                        <input
                          id="staff-login-username"
                          type="text"
                          required
                          autoComplete="username"
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          placeholder="Contoh: kasir77"
                          className="mt-1.5 h-11 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3.5 text-sm text-[#F6F2EC] placeholder:text-[#8E847C] focus:border-[#E6A84C] focus:bg-[#2E2725] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="staff-login-password"
                          className="block text-xs font-medium text-[#C5BCB4]"
                        >
                          Password
                        </label>
                        <div className="relative mt-1.5">
                          <input
                            id="staff-login-password"
                            type={showLoginPassword ? 'text' : 'password'}
                            required
                            autoComplete="current-password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="Masukkan password"
                            className="h-11 w-full rounded-lg border border-[#443A37] bg-[#332C29] pl-3.5 pr-11 text-sm text-[#F6F2EC] placeholder:text-[#8E847C] focus:border-[#E6A84C] focus:bg-[#2E2725] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword((p) => !p)}
                            aria-label={
                              showLoginPassword ? 'Sembunyikan password' : 'Lihat password'
                            }
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-[#A79E96] hover:text-[#F6F2EC]"
                          >
                            {showLoginPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <motion.button
                        type="submit"
                        disabled={authLoading}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#E53E22] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C93218] disabled:opacity-60"
                      >
                        <LogIn className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {authLoading ? 'Memeriksa akun...' : 'Masuk ke Panel Staff'}
                        </span>
                      </motion.button>
                    </form>
                  ) : (
                    <div className="mt-6 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E53E22]/15 text-[#E6A84C]">
                        <UserCheck className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <h3 className="mt-3 font-display text-lg font-bold text-[#F6F2EC]">
                        Login Khusus Owner
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-[#C5BCB4]">
                        Masuk sebagai Owner (<span className="font-mono font-semibold text-[#F6F2EC]">{OWNER_EMAIL}</span>)
                        untuk membuat &amp; mengubah akun user staff serta mengelola penuh toko.
                        Akun Google selain Owner akan ditolak otomatis.
                      </p>
                      <motion.button
                        type="button"
                        disabled={authLoading}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleOwnerGoogleLogin}
                        className="mt-6 inline-flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg bg-[#E53E22] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C93218] disabled:opacity-60"
                      >
                        <LogIn className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {authLoading
                            ? 'Memverifikasi Owner...'
                            : 'Masuk sebagai Owner (Google)'}
                        </span>
                      </motion.button>

                      {unauthorizedDomain && (
                        <div className="mt-5 rounded-xl border border-[#E6A84C]/45 bg-[#332C29] p-4 text-left text-xs leading-relaxed text-[#C5BCB4]">
                          <p className="font-display text-sm font-bold text-[#E6A84C]">
                            Aktifkan Domain Vercel di Firebase Auth
                          </p>
                          <p className="mt-1.5">
                            Agar Login Google Owner bisa dipakai di domain baru ini, tambahkan domain berikut ke{' '}
                            <strong className="text-[#F6F2EC]">Authorized domains</strong> Firebase (cukup 1 kali):
                          </p>

                          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[#483E3A] bg-[#241F1E] px-3 py-2">
                            <code className="truncate font-mono text-xs font-semibold text-[#F6F2EC]">
                              {unauthorizedDomain}
                            </code>
                            <button
                              type="button"
                              onClick={handleCopyDomain}
                              className="inline-flex cursor-pointer items-center gap-1 rounded bg-[#38302D] px-2.5 py-1 text-[11px] font-semibold text-[#E6A84C] hover:bg-[#443A37] whitespace-nowrap shrink-0"
                            >
                              {copiedDomain ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  <span>Disalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Salin Domain</span>
                                </>
                              )}
                            </button>
                          </div>

                          <ol className="mt-3 list-decimal space-y-1 pl-4 text-[11px] text-[#C5BCB4]">
                            <li>
                              Buka{' '}
                              <strong className="text-[#F6F2EC]">Firebase Console</strong> dengan email{' '}
                              <span className="font-mono text-[#F6F2EC]">{OWNER_EMAIL}</span>.
                            </li>
                            <li>
                              Masuk ke <strong className="text-[#F6F2EC]">Authentication → Settings → Authorized domains</strong>.
                            </li>
                            <li>
                              Klik <strong className="text-[#F6F2EC]">Add domain</strong>, tempel{' '}
                              <span className="font-mono text-[#F6F2EC]">{unauthorizedDomain}</span>, lalu simpan.
                            </li>
                          </ol>

                      <a
                        href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/settings`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-[#E6A84C]/50 bg-[#262120] px-3 py-2 text-xs font-semibold text-[#E6A84C] transition-colors hover:bg-[#38302D]"
                      >
                        <span>Buka Pengaturan Authorized Domains Firebase</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  )}

                  {/* Alternatif Login Owner Password untuk Vercel */}
                  <div className="mt-5 border-t border-[#3F3633] pt-4">
                    <button
                      type="button"
                      onClick={() => setShowOwnerFallback((prev) => !prev)}
                      className="cursor-pointer text-xs font-medium text-[#E6A84C] underline-offset-4 hover:underline"
                    >
                      {showOwnerFallback
                        ? 'Sembunyikan login password Owner'
                        : 'Alternatif Vercel: Login pakai Password Owner'}
                    </button>

                    {showOwnerFallback && (
                      <form
                        onSubmit={handleOwnerPasswordLogin}
                        className="mt-4 space-y-3 rounded-xl border border-[#443A37] bg-[#2E2725] p-4 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#F6F2EC]">
                            Login Owner (Email + Password)
                          </span>
                          <span className="font-mono text-[11px] text-[#A79E96]">
                            {OWNER_EMAIL}
                          </span>
                        </div>

                        {hasOwnerPassword === false && (
                          <p className="rounded-lg border border-[#E6A84C]/35 bg-[#332C29] p-2.5 text-[11px] leading-relaxed text-[#E6A84C]">
                            Set variabel <code className="font-mono font-bold">OWNER_PASSWORD</code> di
                            Vercel Environment Variables lalu Redeploy agar opsi ini aktif di semua URL Vercel.
                          </p>
                        )}

                        <div className="relative">
                          <input
                            type={showOwnerPassword ? 'text' : 'password'}
                            required
                            autoComplete="current-password"
                            value={ownerPassword}
                            onChange={(e) => setOwnerPassword(e.target.value)}
                            placeholder="Masukkan Password Owner"
                            className="h-11 w-full rounded-lg border border-[#443A37] bg-[#332C29] pl-3.5 pr-11 text-sm text-[#F6F2EC] placeholder:text-[#8E847C] focus:border-[#E6A84C] focus:bg-[#262120] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOwnerPassword((p) => !p)}
                            aria-label={
                              showOwnerPassword ? 'Sembunyikan password' : 'Lihat password'
                            }
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-[#A79E96] hover:text-[#F6F2EC]"
                          >
                            {showOwnerPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={authLoading}
                          className="inline-flex min-h-[42px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#E6A84C]/60 bg-[#38302D] px-4 py-2 text-xs font-semibold text-[#F6F2EC] transition-colors hover:bg-[#443A37] disabled:opacity-60"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-[#E6A84C]" aria-hidden="true" />
                          <span>
                            {authLoading ? 'Memverifikasi...' : 'Masuk Owner dengan Password'}
                          </span>
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
                </div>
              ) : (
                /* Authenticated Dashboard (Staff or Owner) */
                <div>
                  {/* Dashboard Tabs */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#3F3633] pb-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('menu')}
                        className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                          activeTab === 'menu'
                            ? 'bg-[#E53E22] text-white'
                            : 'bg-[#332C29] text-[#C5BCB4] hover:bg-[#3C3430] hover:text-[#F6F2EC]'
                        }`}
                      >
                        Edit Menu &amp; Gambar ({menuItems.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('contact')}
                        className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                          activeTab === 'contact'
                            ? 'bg-[#E53E22] text-white'
                            : 'bg-[#332C29] text-[#C5BCB4] hover:bg-[#3C3430] hover:text-[#F6F2EC]'
                        }`}
                      >
                        Edit Kontak &amp; Alamat
                      </button>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('accounts')}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                            activeTab === 'accounts'
                              ? 'bg-[#E53E22] text-white'
                              : 'bg-[#332C29] text-[#C5BCB4] hover:bg-[#3C3430] hover:text-[#F6F2EC]'
                          }`}
                        >
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Kelola Akun User Staff</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-[#A79E96]">
                      {isOwner ? 'Owner' : 'Staff'}:{' '}
                      <span className="font-semibold text-[#E6A84C]">
                        {session.displayName} ({session.username})
                      </span>
                    </p>
                  </div>

                  {/* TAB 1: MENU & IMAGE EDITOR */}
                  {activeTab === 'menu' && (
                    <div className="mt-5 space-y-4">
                      {/* Firebase Realtime Status Bar */}
                      <div className="rounded-xl border border-[#443A37] bg-[#2E2725] p-3.5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#38302D] text-[#E6A84C]">
                              <Cloud className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-[#F6F2EC]">
                                  Firebase Realtime Menu &amp; Foto
                                </span>
                                {isOwnerFirebaseSignedIn ? (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                    <Lock className="h-3 w-3" />
                                    Terkunci Realtime di Firebase
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-[#E6A84C]/35 bg-[#E6A84C]/10 px-2 py-0.5 text-[10px] font-semibold text-[#E6A84C]">
                                    Login Owner Google untuk Sync Realtime
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[11px] leading-relaxed text-[#A79E96]">
                                Foto menu otomatis dikompresi cepat dan disimpan langsung ke Firebase Firestore agar langsung tampil realtime di seluruh pelanggan &amp; aman saat update AI Studio.
                              </p>
                            </div>
                          </div>

                          {isOwner && (
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={syncingCloud}
                                onClick={handleSyncAllToFirestore}
                                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#E6A84C]/50 bg-[#38302D] px-3 text-xs font-semibold text-[#E6A84C] hover:bg-[#443A37] disabled:opacity-60"
                              >
                                <Cloud className="h-3.5 w-3.5" />
                                <span>
                                  {syncingCloud
                                    ? 'Menyinkronkan...'
                                    : 'Sinkronkan Semua ke Firebase'}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {editingItemId ? (
                        <form onSubmit={handleSaveMenu} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-display text-base font-bold text-[#F6F2EC]">
                              {editingItemId === '__NEW__'
                                ? 'Tambah Menu Baru'
                                : `Edit Menu: ${menuForm.name}`}
                            </h3>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="cursor-pointer text-xs text-[#C5BCB4] hover:text-[#F6F2EC]"
                            >
                              Batal
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-medium text-[#C5BCB4]">
                                Nama Menu *
                              </label>
                              <input
                                type="text"
                                required
                                value={menuForm.name}
                                onChange={(e) =>
                                  setMenuForm((p) => ({ ...p, name: e.target.value }))
                                }
                                placeholder="Contoh: Dimsum Mentai Truffle"
                                className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[#C5BCB4]">
                                Kategori *
                              </label>
                              <select
                                value={menuForm.category}
                                onChange={(e) =>
                                  setMenuForm((p) => ({
                                    ...p,
                                    category: e.target.value as MenuCategory,
                                  }))
                                }
                                className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                              >
                                {MENU_CATEGORIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-[#C5BCB4]">
                              Deskripsi Singkat
                            </label>
                            <textarea
                              rows={2}
                              value={menuForm.description}
                              onChange={(e) =>
                                setMenuForm((p) => ({
                                  ...p,
                                  description: e.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 py-2 text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                            />
                          </div>

                          {/* ENHANCED FAST IMAGE UPLOAD & PREVIEW */}
                          <div className="rounded-xl border border-[#443A37] bg-[#332C29] p-4 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <ImagePlus className="h-4 w-4 text-[#E53E22]" />
                                <span className="text-xs font-semibold text-[#F6F2EC]">
                                  Edit Foto / Gambar Menu (Simpan ke Firebase)
                                </span>
                              </div>
                              <div>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/gif"
                                  onChange={handleImageFileSelect}
                                  className="hidden"
                                />
                                <button
                                  type="button"
                                  disabled={uploadingImage}
                                  onClick={() => fileInputRef.current?.click()}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#E53E22] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#C93218] disabled:opacity-60"
                                >
                                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>
                                    {uploadingImage
                                      ? 'Memproses foto...'
                                      : 'Upload Foto dari HP / PC'}
                                  </span>
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                              {/* Live Thumbnail Preview */}
                              <div className="sm:col-span-4">
                                <div className="aspect-[4/3] overflow-hidden rounded-lg border border-[#443A37] bg-[#2E2725]">
                                  <img
                                    src={menuForm.imageUrl}
                                    alt="Preview foto menu"
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              </div>

                              {/* URL Input + Visual Presets */}
                              <div className="space-y-3 sm:col-span-8">
                                <div>
                                  <label className="block text-[11px] font-medium text-[#C5BCB4]">
                                    URL Gambar (otomatis terisi saat upload, atau tempel URL)
                                  </label>
                                  <input
                                    type="text"
                                    value={menuForm.imageUrl}
                                    onChange={(e) =>
                                      setMenuForm((p) => ({
                                        ...p,
                                        imageUrl: e.target.value,
                                      }))
                                    }
                                    placeholder="https://... atau upload dari HP/PC"
                                    className="mt-1 h-9 w-full rounded-lg border border-[#443A37] bg-[#2E2725] px-3 text-xs text-[#F6F2EC] focus:border-[#E53E22] focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <p className="text-[11px] font-medium text-[#C5BCB4]">
                                    Atau pilih cepat dari galeri foto dapur:
                                  </p>
                                  <div className="mt-1.5 grid grid-cols-6 gap-2">
                                    {IMAGE_PRESETS.map((preset) => {
                                      const selected =
                                        menuForm.imageUrl === preset.url;
                                      return (
                                        <button
                                          key={preset.url}
                                          type="button"
                                          title={preset.label}
                                          onClick={() =>
                                            setMenuForm((p) => ({
                                              ...p,
                                              imageUrl: preset.url,
                                            }))
                                          }
                                          className={`aspect-square cursor-pointer overflow-hidden rounded-md border-2 transition-all ${
                                            selected
                                              ? 'border-[#E53E22] scale-105'
                                              : 'border-[#443A37] opacity-75 hover:opacity-100'
                                          }`}
                                        >
                                          <img
                                            src={preset.url}
                                            alt={preset.label}
                                            referrerPolicy="no-referrer"
                                            className="h-full w-full object-cover"
                                          />
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Variants Editor */}
                          <div className="rounded-xl border border-[#443A37] bg-[#332C29] p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[#F6F2EC]">
                                Varian Porsi &amp; Harga (Rp)
                              </span>
                              <button
                                type="button"
                                onClick={addVariantRow}
                                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#D9381E] hover:underline"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Tambah Porsi</span>
                              </button>
                            </div>
                            <div className="mt-3 space-y-2">
                              {menuForm.variants.map((variant, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={variant.label}
                                    onChange={(e) =>
                                      updateVariantField(idx, 'label', e.target.value)
                                    }
                                    placeholder="Isi 4"
                                    className="h-9 flex-1 rounded-lg border border-[#443A37] bg-[#2E2725] px-3 text-xs text-[#F6F2EC] focus:border-[#E53E22] focus:outline-none"
                                  />
                                  <input
                                    type="number"
                                    min={0}
                                    step={500}
                                    value={variant.price}
                                    onChange={(e) =>
                                      updateVariantField(idx, 'price', e.target.value)
                                    }
                                    placeholder="20000"
                                    className="h-9 w-32 rounded-lg border border-[#443A37] bg-[#2E2725] px-3 font-mono text-xs text-[#F6F2EC] focus:border-[#E53E22] focus:outline-none"
                                  />
                                  {menuForm.variants.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeVariantRow(idx)}
                                      aria-label="Hapus varian"
                                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-neutral-400 hover:text-red-400"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-6">
                            <label className="flex cursor-pointer items-center gap-2 text-xs text-[#F6F2EC]">
                              <input
                                type="checkbox"
                                checked={menuForm.available}
                                onChange={(e) =>
                                  setMenuForm((p) => ({
                                    ...p,
                                    available: e.target.checked,
                                  }))
                                }
                                className="h-4 w-4 accent-[#E53E22]"
                              />
                              <span>Tersedia untuk dipesan</span>
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-xs text-[#F6F2EC]">
                              <input
                                type="checkbox"
                                checked={menuForm.popular}
                                onChange={(e) =>
                                  setMenuForm((p) => ({
                                    ...p,
                                    popular: e.target.checked,
                                  }))
                                }
                                className="h-4 w-4 accent-[#E53E22]"
                              />
                              <span>Tandai Best Seller</span>
                            </label>
                            <div className="flex items-center gap-2 text-xs text-[#C5BCB4]">
                              <span>Urutan:</span>
                              <input
                                type="number"
                                min={1}
                                max={999}
                                value={menuForm.sortOrder}
                                onChange={(e) =>
                                  setMenuForm((p) => ({
                                    ...p,
                                    sortOrder: Number(e.target.value) || 1,
                                  }))
                                }
                                className="h-8 w-16 rounded border border-[#443A37] bg-[#332C29] px-2 font-mono text-xs text-[#F6F2EC]"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="cursor-pointer rounded-lg border border-[#443A37] px-4 py-2 text-xs font-semibold text-[#C5BCB4] hover:bg-[#38302D] hover:text-[#F6F2EC]"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              disabled={savingMenu}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#E53E22] px-5 py-2 text-xs font-semibold text-white hover:bg-[#C93218] disabled:opacity-60"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>{savingMenu ? 'Menyimpan...' : 'Simpan Menu'}</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={startCreateNewMenu}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#E53E22] px-4 py-2 text-xs font-semibold text-white hover:bg-[#C93218]"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Tambah Menu Baru</span>
                            </button>

                            {confirmResetDefault ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-[#E6A84C]">
                                  Timpa dengan 14 menu bawaan?
                                </span>
                                <button
                                  type="button"
                                  disabled={savingMenu}
                                  onClick={handleSeedDefaultMenu}
                                  className="cursor-pointer rounded-lg bg-[#E53E22] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#C93218] disabled:opacity-60"
                                >
                                  Ya, Pulihkan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmResetDefault(false)}
                                  className="cursor-pointer rounded-lg border border-[#443A37] px-3 py-1.5 text-xs text-[#C5BCB4]"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={savingMenu}
                                onClick={() => setConfirmResetDefault(true)}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#443A37] px-3.5 py-2 text-xs font-medium text-[#C5BCB4] hover:bg-[#38302D] hover:text-[#F6F2EC]"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Pulihkan 14 Menu Resmi</span>
                              </button>
                            )}
                          </div>

                          <div className="mt-4 divide-y divide-[#3F3633] rounded-xl border border-[#443A37] bg-[#332C29]">
                            {menuItems
                              .slice()
                              .sort((a, b) => a.sortOrder - b.sortOrder)
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      referrerPolicy="no-referrer"
                                      className="h-12 w-12 shrink-0 rounded-lg object-cover bg-neutral-200"
                                    />
                                    <div className="min-w-0">
                                      <p className="truncate font-display text-sm font-bold text-[#F6F2EC]">
                                        {item.name}
                                      </p>
                                      <p className="text-xs text-[#A79E96]">
                                        {item.category} ·{' '}
                                        {item.variants
                                          .map((v) => `${v.label} ${formatRupiah(v.price)}`)
                                          .join(' / ')}{' '}
                                        ·{' '}
                                        <span
                                          className={
                                            item.available
                                              ? 'font-medium text-emerald-400'
                                              : 'font-medium text-red-400'
                                          }
                                        >
                                          {item.available ? 'Tersedia' : 'Habis'}
                                        </span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => startEditMenu(item)}
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#443A37] bg-[#2E2725] px-3 py-1.5 text-xs font-medium text-[#F6F2EC] hover:bg-[#38302D]"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                      <span>Edit &amp; Foto</span>
                                    </button>
                                    {confirmDeleteId === item.id ? (
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteMenu(item.id)}
                                          className="cursor-pointer rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                                        >
                                          Ya, Hapus
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteId(null)}
                                          className="cursor-pointer rounded-lg border border-[#443A37] bg-[#2E2725] px-2.5 py-1.5 text-xs text-[#C5BCB4]"
                                        >
                                          Batal
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(item.id)}
                                        aria-label={`Hapus ${item.name}`}
                                        className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#443A37] bg-[#2E2725] p-1.5 text-[#A79E96] hover:border-red-300 hover:text-red-400"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: CONTACT & ADDRESS SETTINGS EDITOR */}
                  {activeTab === 'contact' && (
                    <form onSubmit={handleSaveContact} className="mt-5 space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-[#C5BCB4]">
                            Nama Toko
                          </label>
                          <input
                            type="text"
                            required
                            value={contactForm.storeName}
                            onChange={(e) =>
                              setContactForm((p) => ({
                                ...p,
                                storeName: e.target.value,
                              }))
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#C5BCB4]">
                            Nomor WhatsApp Pemesanan
                          </label>
                          <input
                            type="text"
                            required
                            value={contactForm.whatsappNumber}
                            onChange={(e) =>
                              setContactForm((p) => ({
                                ...p,
                                whatsappNumber: e.target.value,
                              }))
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 font-mono text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#C5BCB4]">
                            Username Instagram
                          </label>
                          <input
                            type="text"
                            required
                            value={contactForm.instagramHandle}
                            onChange={(e) =>
                              setContactForm((p) => ({
                                ...p,
                                instagramHandle: e.target.value,
                              }))
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#C5BCB4]">
                            Link Direct Instagram
                          </label>
                          <input
                            type="url"
                            required
                            value={contactForm.instagramUrl}
                            onChange={(e) =>
                              setContactForm((p) => ({
                                ...p,
                                instagramUrl: e.target.value,
                              }))
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#C5BCB4]">
                            Username TikTok
                          </label>
                          <input
                            type="text"
                            required
                            value={contactForm.tiktokHandle}
                            onChange={(e) =>
                              setContactForm((p) => ({
                                ...p,
                                tiktokHandle: e.target.value,
                              }))
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#C5BCB4]">
                            Link Direct TikTok
                          </label>
                          <input
                            type="url"
                            required
                            value={contactForm.tiktokUrl}
                            onChange={(e) =>
                              setContactForm((p) => ({
                                ...p,
                                tiktokUrl: e.target.value,
                              }))
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#C5BCB4]">
                            Link Google Maps
                          </label>
                          <input
                            type="url"
                            required
                            value={contactForm.mapsUrl}
                            onChange={(e) =>
                              setContactForm((p) => ({
                                ...p,
                                mapsUrl: e.target.value,
                              }))
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#C5BCB4]">
                            Jam Operasional
                          </label>
                          <input
                            type="text"
                            required
                            value={contactForm.openHours}
                            onChange={(e) =>
                              setContactForm((p) => ({
                                ...p,
                                openHours: e.target.value,
                              }))
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#C5BCB4]">
                          Alamat Lengkap Outlet
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={contactForm.addressNote}
                          onChange={(e) =>
                            setContactForm((p) => ({
                              ...p,
                              addressNote: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 py-2 text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-medium text-[#C5BCB4]">
                            Link GoFood
                          </label>
                          <input
                            type="url"
                            value={contactForm.gofoodUrl}
                            onChange={(e) =>
                              setContactForm((p) => ({
                                ...p,
                                gofoodUrl: e.target.value,
                              }))
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-xs text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#C5BCB4]">
                            Link ShopeeFood
                          </label>
                          <input
                            type="url"
                            value={contactForm.shopeefoodUrl}
                            onChange={(e) =>
                              setContactForm((p) => ({
                                ...p,
                                shopeefoodUrl: e.target.value,
                              }))
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-xs text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#C5BCB4]">
                            Link GrabFood
                          </label>
                          <input
                            type="url"
                            value={contactForm.grabfoodUrl}
                            onChange={(e) =>
                              setContactForm((p) => ({
                                ...p,
                                grabfoodUrl: e.target.value,
                              }))
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-xs text-[#F6F2EC] focus:border-[#E53E22] focus:bg-[#2E2725] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleResetDefaultContact}
                          className="cursor-pointer text-xs text-[#A79E96] hover:text-[#F6F2EC]"
                        >
                          Kembalikan ke Kontak Default
                        </button>
                        <button
                          type="submit"
                          disabled={savingContact}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#E53E22] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#C93218] disabled:opacity-60"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>
                            {savingContact ? 'Menyimpan...' : 'Simpan Kontak & Alamat'}
                          </span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TAB 3: OWNER-ONLY STAFF USER ACCOUNT MANAGEMENT */}
                  {activeTab === 'accounts' && isOwner && (
                    <div className="mt-5 space-y-5">
                      {editingAccountId ? (
                        <form
                          onSubmit={handleSaveStaffAccount}
                          className="rounded-xl border border-[#443A37] bg-[#332C29] p-5 space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-display text-base font-bold text-[#F6F2EC]">
                              {editingAccountId === '__NEW__'
                                ? 'Buat Akun User Staff Baru'
                                : `Ubah Akun User: ${accUsername}`}
                            </h3>
                            <button
                              type="button"
                              onClick={() => setEditingAccountId(null)}
                              className="cursor-pointer text-xs text-[#C5BCB4] hover:text-[#F6F2EC]"
                            >
                              Batal
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-medium text-[#C5BCB4]">
                                Nama Staff *
                              </label>
                              <input
                                type="text"
                                required
                                value={accDisplayName}
                                onChange={(e) => setAccDisplayName(e.target.value)}
                                placeholder="Contoh: Rina (Kasir Sore)"
                                className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#2E2725] px-3 text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[#C5BCB4]">
                                Username Login *
                              </label>
                              <input
                                type="text"
                                required
                                value={accUsername}
                                onChange={(e) =>
                                  setAccUsername(e.target.value.toLowerCase())
                                }
                                placeholder="Contoh: kasir77"
                                className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#2E2725] px-3 font-mono text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-[#C5BCB4]">
                              {editingAccountId === '__NEW__'
                                ? 'Password * (min. 4 karakter)'
                                : 'Password Baru (kosongkan jika tidak diubah)'}
                            </label>
                            <input
                              type="password"
                              required={editingAccountId === '__NEW__'}
                              value={accPassword}
                              onChange={(e) => setAccPassword(e.target.value)}
                              placeholder={
                                editingAccountId === '__NEW__'
                                  ? 'Minimal 4 karakter'
                                  : 'Biarkan kosong jika tidak diganti'
                              }
                              className="mt-1 h-10 w-full rounded-lg border border-[#443A37] bg-[#2E2725] px-3 text-sm text-[#F6F2EC] focus:border-[#E53E22] focus:outline-none"
                            />
                          </div>

                          <label className="flex cursor-pointer items-center gap-2 text-xs text-[#F6F2EC]">
                            <input
                              type="checkbox"
                              checked={accActive}
                              onChange={(e) => setAccActive(e.target.checked)}
                              className="h-4 w-4 accent-[#E53E22]"
                            />
                            <span>Akun Aktif (diizinkan login sebagai staff)</span>
                          </label>

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingAccountId(null)}
                              className="cursor-pointer rounded-lg border border-[#443A37] bg-[#2E2725] px-4 py-2 text-xs font-semibold text-[#C5BCB4]"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              disabled={savingAccount}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#E53E22] px-5 py-2 text-xs font-semibold text-white hover:bg-[#C93218] disabled:opacity-60"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>
                                {savingAccount ? 'Menyimpan...' : 'Simpan Akun User'}
                              </span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="font-display text-sm font-bold text-[#F6F2EC]">
                                Daftar Akun User Staff
                              </h3>
                              <p className="text-xs text-[#A79E96]">
                                Hanya Owner yang dapat membuat, mengubah password, atau
                                menonaktifkan akun staff.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={startCreateAccount}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#E53E22] px-4 py-2 text-xs font-semibold text-white hover:bg-[#C93218]"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Buat Akun Staff</span>
                            </button>
                          </div>

                          <div className="mt-4 divide-y divide-[#3F3633] rounded-xl border border-[#443A37] bg-[#332C29]">
                            {loadingAccounts ? (
                              <div className="p-6 text-center text-xs text-[#A79E96]">
                                Memuat daftar akun staff...
                              </div>
                            ) : staffAccounts.length === 0 ? (
                              <div className="p-6 text-center text-xs text-[#C5BCB4]">
                                Belum ada akun user staff. Klik &ldquo;Buat Akun Staff&rdquo;
                                untuk membuat username &amp; password untuk karyawan Anda.
                              </div>
                            ) : (
                              staffAccounts.map((acc) => (
                                <div
                                  key={acc.id}
                                  className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div>
                                    <p className="font-display text-sm font-bold text-[#F6F2EC]">
                                      {acc.displayName}
                                    </p>
                                    <p className="mt-0.5 text-xs text-[#A79E96]">
                                      Username:{' '}
                                      <span className="font-mono font-medium text-[#F6F2EC]">
                                        {acc.username}
                                      </span>{' '}
                                      ·{' '}
                                      <span
                                        className={
                                          acc.active
                                            ? 'font-medium text-emerald-400'
                                            : 'font-medium text-red-400'
                                        }
                                      >
                                        {acc.active ? 'Aktif' : 'Nonaktif'}
                                      </span>
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditAccount(acc)}
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#443A37] bg-[#2E2725] px-3 py-1.5 text-xs font-medium text-[#F6F2EC] hover:bg-[#38302D]"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                      <span>Ubah</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStaffAccount(acc.id)}
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#443A37] bg-[#2E2725] px-3 py-1.5 text-xs text-red-400 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Hapus</span>
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
