import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import {
  Check,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
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
import { OWNER_EMAIL, auth, db, googleProvider } from '../firebase';
import {
  MenuCategory,
  MenuItem,
  MenuVariant,
  StaffAccount,
  StaffSession,
  StoreSettings,
} from '../types';
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

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Menu Editing State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [menuForm, setMenuForm] = useState<Omit<MenuItem, 'id'>>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savingMenu, setSavingMenu] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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
        const json = (await resp.json()) as { accounts: StaffAccount[] };
        setStaffAccounts(json.accounts);
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
      const json = (await resp.json()) as {
        token?: string;
        session?: StaffSession;
        error?: string;
      };
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

  const handleOwnerGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
        await signOut(auth);
        notify(
          'error',
          `Akses ditolak. Login Google hanya khusus Owner (${OWNER_EMAIL}). Staff wajib login menggunakan akun user (Username & Password).`
        );
        return;
      }
      const idToken = await cred.user.getIdToken();
      const resp = await fetch('/api/auth/owner-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const json = (await resp.json()) as {
        token?: string;
        session?: StaffSession;
        error?: string;
      };
      if (!resp.ok || !json.token || !json.session) {
        await signOut(auth);
        notify('error', json.error || 'Verifikasi Owner gagal.');
        return;
      }
      onSessionChange(json.token, json.session);
      setActiveTab('menu');
      notify('success', 'Berhasil masuk sebagai Owner Dimsum Mentai 77!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal login Owner.';
      notify('error', msg);
    } finally {
      setAuthLoading(false);
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

  // --- IMAGE UPLOAD HANDLER ---
  const handleImageFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !authToken) return;

    if (!file.type.startsWith('image/')) {
      notify('error', 'Pilih file gambar (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('error', 'Ukuran file gambar maksimal 5 MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
        reader.readAsDataURL(file);
      });

      const resp = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          filename: file.name,
          dataUrl,
        }),
      });
      const json = (await resp.json()) as { url?: string; error?: string };
      if (!resp.ok || !json.url) {
        notify('error', json.error || 'Gagal mengunggah gambar.');
        return;
      }
      setMenuForm((prev) => ({ ...prev, imageUrl: json.url! }));
      notify('success', 'Foto menu berhasil diunggah!');
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Gagal mengunggah gambar.'
      );
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
      const resp = await fetch(`/api/menu/${encodeURIComponent(slugId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const json = (await resp.json()) as {
        menuItems?: MenuItem[];
        error?: string;
      };
      if (!resp.ok || !json.menuItems) {
        notify('error', json.error || 'Gagal menyimpan menu.');
        return;
      }
      onMenuUpdated(json.menuItems);

      // Sync to Firestore if Owner is signed into Firebase Auth
      if (isOwner && auth.currentUser?.email === OWNER_EMAIL) {
        try {
          await setDoc(doc(db, 'menu_items', slugId), {
            ...payload,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid,
          });
        } catch {
          // Primary persistence already succeeded on server
        }
      }

      setEditingItemId(null);
      notify('success', `Menu "${payload.name}" & gambarnya berhasil disimpan!`);
    } catch {
      notify('error', 'Terjadi kesalahan saat menyimpan menu.');
    } finally {
      setSavingMenu(false);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!authToken) return;
    try {
      const resp = await fetch(`/api/menu/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = (await resp.json()) as {
        menuItems?: MenuItem[];
        error?: string;
      };
      if (!resp.ok || !json.menuItems) {
        notify('error', json.error || 'Gagal menghapus menu.');
        return;
      }
      onMenuUpdated(json.menuItems);

      if (isOwner && auth.currentUser?.email === OWNER_EMAIL) {
        try {
          await deleteDoc(doc(db, 'menu_items', id));
        } catch {
          // Ignore secondary sync error
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
      const json = (await resp.json()) as {
        menuItems?: MenuItem[];
        error?: string;
      };
      if (!resp.ok || !json.menuItems) {
        notify('error', json.error || 'Gagal mereset menu.');
        return;
      }
      onMenuUpdated(json.menuItems);
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
      const resp = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(contactForm),
      });
      const json = (await resp.json()) as {
        settings?: StoreSettings;
        error?: string;
      };
      if (!resp.ok || !json.settings) {
        notify('error', json.error || 'Gagal menyimpan kontak.');
        return;
      }
      onSettingsUpdated(json.settings);

      if (isOwner && auth.currentUser?.email === OWNER_EMAIL) {
        try {
          await setDoc(doc(db, 'store_settings', 'main'), {
            ...json.settings,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid,
          });
        } catch {
          // Primary persistence succeeded
        }
      }

      notify('success', 'Kontak & alamat toko berhasil diperbarui!');
    } catch {
      notify('error', 'Gagal menyimpan pengaturan kontak.');
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
      const json = (await resp.json()) as {
        account?: StaffAccount;
        error?: string;
      };
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
                    <div className="mt-5">
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

                          {/* ENHANCED IMAGE EDITOR & UPLOAD */}
                          <div className="rounded-xl border border-[#443A37] bg-[#332C29] p-4 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <ImagePlus className="h-4 w-4 text-[#E53E22]" />
                                <span className="text-xs font-semibold text-[#F6F2EC]">
                                  Edit Foto / Gambar Menu
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
                                      ? 'Mengunggah...'
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
                                    placeholder="/uploads/... atau https://..."
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

                            <button
                              type="button"
                              disabled={savingMenu}
                              onClick={handleSeedDefaultMenu}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#443A37] px-3.5 py-2 text-xs font-medium text-[#C5BCB4] hover:bg-[#38302D] hover:text-[#F6F2EC]"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Pulihkan 14 Menu Resmi</span>
                            </button>
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
