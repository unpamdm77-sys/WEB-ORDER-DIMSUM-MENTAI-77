import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import {
  AlertTriangle,
  Check,
  Cloud,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  HardDrive,
  ImagePlus,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
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
  auth,
  captureDriveTokenFromResult,
  clearDriveAccessToken,
  db,
  getDriveAccessToken,
  googleProvider,
  initDriveAuth,
  signInWithGoogleDrive,
} from '../firebase';
import {
  MenuCategory,
  MenuItem,
  MenuVariant,
  StaffAccount,
  StaffSession,
  StoreSettings,
} from '../types';
import {
  DriveImageFile,
  backupCatalogToDrive,
  deleteDriveFile,
  listDriveImageFiles,
  shareDriveFilePublicly,
  uploadImageToDrive,
} from '../utils/googleDrive';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Google Drive & Permanent Cloud Lock State (token kept strictly in-memory)
  const [driveToken, setDriveToken] = useState<string | null>(() =>
    getDriveAccessToken()
  );
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveImageFile[]>([]);
  const [driveSearch, setDriveSearch] = useState('');
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
  const [driveConfirmDialog, setDriveConfirmDialog] = useState<
    | { kind: 'upload'; file: File }
    | { kind: 'share-pick'; driveFile: DriveImageFile }
    | { kind: 'delete'; driveFile: DriveImageFile }
    | { kind: 'backup' }
    | null
  >(null);
  const [processingDriveAction, setProcessingDriveAction] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);

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
    setDriveToken(getDriveAccessToken());
    const unsub = initDriveAuth(
      (_user, token) => setDriveToken(token),
      () => setDriveToken(getDriveAccessToken())
    );
    return () => unsub();
  }, [open]);

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
        const token = captureDriveTokenFromResult(redirectCred);
        if (token) setDriveToken(token);
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
      const token = captureDriveTokenFromResult(cred);
      if (token) setDriveToken(token);
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
    clearDriveAccessToken();
    setDriveToken(null);
    setDrivePickerOpen(false);
    setDriveFiles([]);
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

  // --- GOOGLE DRIVE AUTH, PICKER, UPLOAD, DELETE & BACKUP ---
  const loadDriveFiles = async (tokenOverride?: string, queryOverride?: string) => {
    const activeToken = tokenOverride || driveToken || getDriveAccessToken();
    if (!activeToken) return;
    setLoadingDriveFiles(true);
    try {
      const files = await listDriveImageFiles(
        activeToken,
        queryOverride !== undefined ? queryOverride : driveSearch
      );
      setDriveFiles(files);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal memuat foto dari Google Drive.';
      if (msg.toLowerCase().includes('credential') || msg.toLowerCase().includes('unauthorized') || msg.includes('401')) {
        clearDriveAccessToken();
        setDriveToken(null);
      }
      notify('error', msg);
    } finally {
      setLoadingDriveFiles(false);
    }
  };

  const handleConnectGoogleDrive = async () => {
    setConnectingDrive(true);
    try {
      const { user, accessToken } = await signInWithGoogleDrive();
      setDriveToken(accessToken);
      notify(
        'success',
        `Google Drive terhubung (${user.email || 'Akun Google'}). Foto menu siap disimpan permanen!`
      );
      if (drivePickerOpen) {
        await loadDriveFiles(accessToken);
      }
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      const msg =
        err instanceof Error ? err.message : 'Gagal menghubungkan Google Drive.';
      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        notify(
          'error',
          `Domain "${window.location.hostname}" belum ditambahkan di Firebase Authorized domains.`
        );
      } else if (
        code !== 'auth/popup-closed-by-user' &&
        code !== 'auth/cancelled-popup-request'
      ) {
        notify('error', msg);
      }
    } finally {
      setConnectingDrive(false);
    }
  };

  const handleOpenDrivePicker = async () => {
    const nextOpen = !drivePickerOpen;
    setDrivePickerOpen(nextOpen);
    if (nextOpen && driveToken) {
      await loadDriveFiles(driveToken, driveSearch);
    }
  };

  const handleSelectDriveFile = (file: DriveImageFile) => {
    if (file.sharedPublicly) {
      setMenuForm((prev) => ({ ...prev, imageUrl: file.imageUrl }));
      setDrivePickerOpen(false);
      notify('success', `Foto "${file.name}" dari Google Drive dipasang ke menu!`);
    } else {
      setDriveConfirmDialog({ kind: 'share-pick', driveFile: file });
    }
  };

  const uploadToLocalFallback = async (file: File) => {
    if (!authToken) return;
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
      const json = await safeParseJson<{ url?: string }>(resp);
      if (!resp.ok || !json.url) {
        notify('error', json.error || 'Gagal mengunggah gambar.');
        return;
      }
      setMenuForm((prev) => ({ ...prev, imageUrl: json.url! }));
      notify(
        'success',
        'Foto dipasang sementara. Hubungkan Google Drive agar foto terkunci permanen saat update AI Studio/Vercel!'
      );
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Gagal mengunggah gambar.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // --- IMAGE UPLOAD HANDLER ---
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
    if (file.size > 5 * 1024 * 1024) {
      notify('error', 'Ukuran file gambar maksimal 5 MB.');
      return;
    }

    const activeToken = driveToken || getDriveAccessToken();
    if (activeToken) {
      // Mandatory explicit confirmation dialog before mutating Google Drive
      setDriveConfirmDialog({ kind: 'upload', file });
      return;
    }

    await uploadToLocalFallback(file);
  };

  const executeDriveConfirmAction = async () => {
    if (!driveConfirmDialog) return;
    const activeToken = driveToken || getDriveAccessToken();
    if (!activeToken) {
      setDriveConfirmDialog(null);
      notify('error', 'Sesi Google Drive belum aktif. Klik "Sign in with Google" terlebih dahulu.');
      return;
    }

    setProcessingDriveAction(true);
    try {
      if (driveConfirmDialog.kind === 'upload') {
        setUploadingImage(true);
        const uploaded = await uploadImageToDrive(
          activeToken,
          driveConfirmDialog.file,
          menuForm.name.trim() || undefined
        );
        setMenuForm((prev) => ({ ...prev, imageUrl: uploaded.imageUrl }));
        if (drivePickerOpen) {
          setDriveFiles((prev) => [uploaded, ...prev]);
        }
        notify(
          'success',
          `Foto "${uploaded.name}" berhasil disimpan ke Google Drive (folder Dimsum Mentai 77 Menu)!`
        );
      } else if (driveConfirmDialog.kind === 'share-pick') {
        const target = driveConfirmDialog.driveFile;
        await shareDriveFilePublicly(activeToken, target.id);
        setDriveFiles((prev) =>
          prev.map((f) =>
            f.id === target.id ? { ...f, sharedPublicly: true } : f
          )
        );
        setMenuForm((prev) => ({ ...prev, imageUrl: target.imageUrl }));
        setDrivePickerOpen(false);
        notify(
          'success',
          `Akses publik diatur & foto "${target.name}" dipasang ke menu!`
        );
      } else if (driveConfirmDialog.kind === 'delete') {
        const target = driveConfirmDialog.driveFile;
        await deleteDriveFile(activeToken, target.id);
        setDriveFiles((prev) => prev.filter((f) => f.id !== target.id));
        notify('success', `Foto "${target.name}" dihapus dari Google Drive.`);
      } else if (driveConfirmDialog.kind === 'backup') {
        const result = await backupCatalogToDrive(activeToken, {
          exportedAt: new Date().toISOString(),
          storeSettings: settings,
          menuItems,
        });
        notify(
          'success',
          `Backup katalog "${result.name}" tersimpan di Google Drive!`
        );
      }
      setDriveConfirmDialog(null);
    } catch (err) {
      notify(
        'error',
        err instanceof Error ? err.message : 'Operasi Google Drive gagal.'
      );
    } finally {
      setUploadingImage(false);
      setProcessingDriveAction(false);
    }
  };

  const handleSyncAllToFirestore = async () => {
    if (!isOwnerFirebaseSignedIn || !auth.currentUser) {
      notify(
        'error',
        `Login sebagai Owner Google (${OWNER_EMAIL}) terlebih dahulu untuk mengunci seluruh menu ke Cloud.`
      );
      return;
    }

    setSyncingCloud(true);
    let syncedCount = 0;
    let skippedTooLong = 0;
    try {
      for (const item of menuItems) {
        const imageUrl = (item.imageUrl || '').trim();
        if (!imageUrl || imageUrl.length > 500) {
          skippedTooLong++;
          continue;
        }
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
      }

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

      if (skippedTooLong > 0) {
        notify(
          'error',
          `${syncedCount} menu terkunci ke Cloud, tetapi ${skippedTooLong} menu masih memakai gambar base64 (>500 karakter). Upload ulang foto menu tersebut ke Google Drive agar terkunci permanen!`
        );
      } else {
        notify(
          'success',
          `Semua ${syncedCount} menu & foto berhasil dikunci permanen di Cloud! Aman saat update di Google AI Studio maupun Vercel.`
        );
      }
    } catch (err) {
      notify(
        'error',
        err instanceof Error
          ? `Gagal mengunci ke Cloud: ${err.message}`
          : 'Gagal menyinkronkan ke Cloud Firestore.'
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
      const resp = await fetch(`/api/menu/${encodeURIComponent(slugId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await safeParseJson<{ menuItems?: MenuItem[] }>(resp);
      if (!resp.ok || !json.menuItems) {
        notify('error', json.error || 'Gagal menyimpan menu.');
        return;
      }
      onMenuUpdated(json.menuItems);

      // Lock permanently to Cloud Firestore if Owner is signed into Firebase Auth
      let cloudLocked = false;
      let cloudWarning = '';
      if (isOwnerFirebaseSignedIn && auth.currentUser) {
        if (payload.imageUrl.length > 500) {
          cloudWarning =
            'Menu tersimpan sementara, namun URL gambar terlalu panjang untuk dikunci ke Cloud. Upload foto melalui Google Drive agar tidak berubah saat update AI Studio!';
        } else {
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
            cloudLocked = true;
          } catch (err) {
            cloudWarning =
              err instanceof Error
                ? `Menu tersimpan di server, tapi sinkronisasi Cloud gagal: ${err.message}`
                : 'Menu tersimpan di server, tapi gagal mengunci ke Cloud Firestore.';
          }
        }
      }

      setEditingItemId(null);
      if (cloudWarning) {
        notify('error', cloudWarning);
      } else if (cloudLocked) {
        notify(
          'success',
          `Menu "${payload.name}" & gambarnya tersimpan dan terkunci permanen di Cloud!`
        );
      } else {
        notify(
          'success',
          `Menu "${payload.name}" tersimpan. Untuk mengunci permanen saat update AI Studio, login Owner via Google & klik "Kunci Semua ke Cloud".`
        );
      }
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
      const json = await safeParseJson<{ menuItems?: MenuItem[] }>(resp);
      if (!resp.ok || !json.menuItems) {
        notify('error', json.error || 'Gagal menghapus menu.');
        return;
      }
      onMenuUpdated(json.menuItems);

      if (isOwnerFirebaseSignedIn) {
        try {
          await deleteDoc(doc(db, 'menu_items', id));
        } catch {
          // Ignore if document wasn't synced to Firestore yet
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
      const resp = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(contactForm),
      });
      const json = await safeParseJson<{ settings?: StoreSettings }>(resp);
      if (!resp.ok || !json.settings) {
        notify('error', json.error || 'Gagal menyimpan kontak.');
        return;
      }
      onSettingsUpdated(json.settings);

      let cloudLocked = false;
      if (isOwnerFirebaseSignedIn && auth.currentUser) {
        try {
          await setDoc(doc(db, 'store_settings', 'main'), {
            storeName: json.settings.storeName,
            tagline: json.settings.tagline,
            whatsappNumber: json.settings.whatsappNumber,
            instagramHandle: json.settings.instagramHandle,
            instagramUrl: json.settings.instagramUrl,
            tiktokHandle: json.settings.tiktokHandle,
            tiktokUrl: json.settings.tiktokUrl,
            mapsUrl: json.settings.mapsUrl,
            addressNote: json.settings.addressNote,
            openHours: json.settings.openHours,
            announcement: json.settings.announcement,
            gofoodUrl: json.settings.gofoodUrl,
            shopeefoodUrl: json.settings.shopeefoodUrl,
            grabfoodUrl: json.settings.grabfoodUrl,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid,
          });
          cloudLocked = true;
        } catch (err) {
          notify(
            'error',
            err instanceof Error
              ? `Kontak tersimpan di server, tapi sinkronisasi Cloud gagal: ${err.message}`
              : 'Kontak tersimpan di server, tapi gagal sync ke Cloud.'
          );
          return;
        }
      }

      notify(
        'success',
        cloudLocked
          ? 'Kontak & alamat toko diperbarui dan terkunci di Cloud!'
          : 'Kontak & alamat toko berhasil diperbarui!'
      );
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
                      {/* Google Drive & Cloud Lock Status Bar */}
                      <div className="rounded-xl border border-[#443A37] bg-[#2E2725] p-3.5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#38302D] text-[#E6A84C]">
                              <HardDrive className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-[#F6F2EC]">
                                  Penyimpanan Foto Google Drive &amp; Kunci Cloud
                                </span>
                                {driveToken ? (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                    <Check className="h-3 w-3" />
                                    Google Drive Terhubung
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-[#E6A84C]/35 bg-[#E6A84C]/10 px-2 py-0.5 text-[10px] font-semibold text-[#E6A84C]">
                                    Belum terhubung ke Drive
                                  </span>
                                )}
                                {isOwnerFirebaseSignedIn && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/35 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                                    <Lock className="h-3 w-3" />
                                    Cloud Firestore Aktif
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[11px] leading-relaxed text-[#A79E96]">
                                Foto menu yang diupload ke Google Drive &amp; dikunci ke Cloud tidak akan berubah walaupun aplikasi di-update di Google AI Studio atau Vercel.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {!driveToken ? (
                              <button
                                type="button"
                                disabled={connectingDrive}
                                onClick={handleConnectGoogleDrive}
                                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#747775] bg-white px-3.5 text-xs font-medium text-[#1F1F1F] shadow-2xs transition-colors hover:bg-[#F8F9FA] disabled:opacity-60"
                              >
                                <svg
                                  viewBox="0 0 48 48"
                                  className="h-4 w-4 shrink-0"
                                  aria-hidden="true"
                                >
                                  <path
                                    fill="#EA4335"
                                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                                  />
                                  <path
                                    fill="#4285F4"
                                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                                  />
                                  <path
                                    fill="#FBBC05"
                                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                                  />
                                  <path
                                    fill="#34A853"
                                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                                  />
                                </svg>
                                <span>
                                  {connectingDrive
                                    ? 'Menghubungkan...'
                                    : 'Sign in with Google'}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDriveConfirmDialog({ kind: 'backup' })}
                                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#443A37] bg-[#38302D] px-3 text-xs font-semibold text-[#F6F2EC] hover:bg-[#443A37]"
                              >
                                <HardDrive className="h-3.5 w-3.5 text-[#E6A84C]" />
                                <span>Backup ke Drive</span>
                              </button>
                            )}

                            {isOwner && (
                              <button
                                type="button"
                                disabled={syncingCloud}
                                onClick={handleSyncAllToFirestore}
                                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#E6A84C]/50 bg-[#38302D] px-3 text-xs font-semibold text-[#E6A84C] hover:bg-[#443A37] disabled:opacity-60"
                              >
                                <Cloud className="h-3.5 w-3.5" />
                                <span>
                                  {syncingCloud
                                    ? 'Mengunci...'
                                    : 'Kunci Semua ke Cloud'}
                                </span>
                              </button>
                            )}
                          </div>
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

                          {/* ENHANCED IMAGE EDITOR & GOOGLE DRIVE UPLOAD / PICKER */}
                          <div className="rounded-xl border border-[#443A37] bg-[#332C29] p-4 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <ImagePlus className="h-4 w-4 text-[#E53E22]" />
                                <span className="text-xs font-semibold text-[#F6F2EC]">
                                  Edit Foto / Gambar Menu
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/gif"
                                  onChange={handleImageFileSelect}
                                  className="hidden"
                                />
                                {driveToken && (
                                  <button
                                    type="button"
                                    onClick={handleOpenDrivePicker}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E6A84C]/50 bg-[#2E2725] px-3 py-1.5 text-xs font-semibold text-[#E6A84C] hover:bg-[#38302D]"
                                  >
                                    <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>
                                      {drivePickerOpen
                                        ? 'Tutup Galeri Drive'
                                        : 'Pilih dari Google Drive'}
                                    </span>
                                  </button>
                                )}
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
                                      : driveToken
                                        ? 'Upload ke Google Drive'
                                        : 'Upload Foto dari HP / PC'}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {!driveToken && (
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E6A84C]/35 bg-[#2A2321] px-3 py-2 text-[11px] text-[#C5BCB4]">
                                <span>
                                  Sambungkan Google Drive agar foto yang diupload tersimpan permanen di Drive Anda &amp; tidak berubah saat update AI Studio.
                                </span>
                                <button
                                  type="button"
                                  disabled={connectingDrive}
                                  onClick={handleConnectGoogleDrive}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#747775] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1F1F1F] hover:bg-[#F8F9FA] disabled:opacity-60"
                                >
                                  <svg
                                    viewBox="0 0 48 48"
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden="true"
                                  >
                                    <path
                                      fill="#EA4335"
                                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                                    />
                                    <path
                                      fill="#4285F4"
                                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                                    />
                                    <path
                                      fill="#FBBC05"
                                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                                    />
                                    <path
                                      fill="#34A853"
                                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                                    />
                                  </svg>
                                  <span>
                                    {connectingDrive
                                      ? 'Menghubungkan...'
                                      : 'Sign in with Google'}
                                  </span>
                                </button>
                              </div>
                            )}

                            {/* Inline Google Drive Image Picker Gallery */}
                            {drivePickerOpen && driveToken && (
                              <div className="rounded-xl border border-[#443A37] bg-[#262120] p-3.5 space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="relative flex-1 min-w-[180px]">
                                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A79E96]" />
                                    <input
                                      type="text"
                                      value={driveSearch}
                                      onChange={(e) => setDriveSearch(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          void loadDriveFiles(driveToken, driveSearch);
                                        }
                                      }}
                                      placeholder="Cari nama foto di Google Drive..."
                                      className="h-8 w-full rounded-lg border border-[#443A37] bg-[#332C29] pl-8 pr-3 text-xs text-[#F6F2EC] placeholder:text-[#8E847C] focus:border-[#E6A84C] focus:outline-none"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    disabled={loadingDriveFiles}
                                    onClick={() => void loadDriveFiles(driveToken, driveSearch)}
                                    className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-[#443A37] bg-[#332C29] px-3 text-xs font-medium text-[#F6F2EC] hover:bg-[#38302D] disabled:opacity-60"
                                  >
                                    <RefreshCw
                                      className={`h-3.5 w-3.5 ${
                                        loadingDriveFiles ? 'animate-spin' : ''
                                      }`}
                                    />
                                    <span>Muat Ulang</span>
                                  </button>
                                </div>

                                {loadingDriveFiles ? (
                                  <p className="py-6 text-center text-xs text-[#A79E96]">
                                    Memuat daftar gambar dari Google Drive...
                                  </p>
                                ) : driveFiles.length === 0 ? (
                                  <p className="py-6 text-center text-xs text-[#A79E96]">
                                    Belum ada gambar ditemukan di Google Drive Anda. Klik &ldquo;Upload ke Google Drive&rdquo; untuk mengunggah foto baru.
                                  </p>
                                ) : (
                                  <div className="grid max-h-64 grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-4">
                                    {driveFiles.map((file) => (
                                      <div
                                        key={file.id}
                                        className="group relative flex flex-col overflow-hidden rounded-lg border border-[#443A37] bg-[#2E2725]"
                                      >
                                        <div className="aspect-[4/3] w-full overflow-hidden bg-[#201C1B]">
                                          <img
                                            src={file.thumbnailLink || file.imageUrl}
                                            alt={file.name}
                                            referrerPolicy="no-referrer"
                                            className="h-full w-full object-cover"
                                          />
                                        </div>
                                        <div className="flex flex-col gap-1.5 p-2">
                                          <p
                                            className="truncate text-[11px] font-medium text-[#F6F2EC]"
                                            title={file.name}
                                          >
                                            {file.name}
                                          </p>
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => handleSelectDriveFile(file)}
                                              className="flex-1 cursor-pointer rounded bg-[#E53E22] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#C93218]"
                                            >
                                              Pakai Foto
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setDriveConfirmDialog({
                                                  kind: 'delete',
                                                  driveFile: file,
                                                })
                                              }
                                              aria-label={`Hapus ${file.name} dari Drive`}
                                              className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-[#443A37] bg-[#262120] text-[#A79E96] hover:border-red-400/50 hover:text-red-400"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

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
                                    URL Gambar (otomatis terisi URL permanen Drive saat upload)
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
                                    placeholder="https://lh3.googleusercontent.com/d/..."
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

            {/* Mandatory Explicit Confirmation Dialog for Mutating / Deleting Google Drive Files */}
            {driveConfirmDialog && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
                <div className="w-full max-w-md rounded-2xl border border-[#443A37] bg-[#262120] p-5 shadow-2xl">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        driveConfirmDialog.kind === 'delete'
                          ? 'bg-red-500/15 text-red-400'
                          : 'bg-[#E6A84C]/15 text-[#E6A84C]'
                      }`}
                    >
                      <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base font-bold text-[#F6F2EC]">
                        {driveConfirmDialog.kind === 'upload' &&
                          'Konfirmasi Upload ke Google Drive'}
                        {driveConfirmDialog.kind === 'share-pick' &&
                          'Konfirmasi Izin Publik Foto Drive'}
                        {driveConfirmDialog.kind === 'delete' &&
                          'Konfirmasi Hapus Foto Google Drive'}
                        {driveConfirmDialog.kind === 'backup' &&
                          'Konfirmasi Backup Menu ke Google Drive'}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#C5BCB4]">
                        {driveConfirmDialog.kind === 'upload' && (
                          <>
                            File{' '}
                            <strong className="text-[#F6F2EC]">
                              {driveConfirmDialog.file.name}
                            </strong>{' '}
                            akan diunggah ke folder{' '}
                            <strong className="text-[#F6F2EC]">
                              Dimsum Mentai 77 Menu
                            </strong>{' '}
                            di Google Drive Anda dan diatur agar dapat dibaca publik
                            (anyone reader) supaya foto tampil di website pelanggan.
                          </>
                        )}
                        {driveConfirmDialog.kind === 'share-pick' && (
                          <>
                            Foto{' '}
                            <strong className="text-[#F6F2EC]">
                              {driveConfirmDialog.driveFile.name}
                            </strong>{' '}
                            saat ini belum dibagikan publik. Ubah izin file ini di
                            Google Drive menjadi publik (anyone reader) agar gambar bisa
                            dilihat oleh pelanggan?
                          </>
                        )}
                        {driveConfirmDialog.kind === 'delete' && (
                          <>
                            Foto{' '}
                            <strong className="text-red-300">
                              {driveConfirmDialog.driveFile.name}
                            </strong>{' '}
                            akan dihapus permanen dari Google Drive Anda. Menu yang
                            sedang memakai foto ini akan kehilangan gambarnya jika belum
                            diganti.
                          </>
                        )}
                        {driveConfirmDialog.kind === 'backup' && (
                          <>
                            Aplikasi akan membuat file backup JSON baru berisi seluruh{' '}
                            <strong className="text-[#F6F2EC]">
                              {menuItems.length} menu &amp; kontak toko
                            </strong>{' '}
                            di folder{' '}
                            <strong className="text-[#F6F2EC]">
                              Dimsum Mentai 77 Menu
                            </strong>{' '}
                            pada Google Drive Anda.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={processingDriveAction}
                      onClick={() => setDriveConfirmDialog(null)}
                      className="cursor-pointer rounded-lg border border-[#443A37] bg-[#2E2725] px-4 py-2 text-xs font-semibold text-[#C5BCB4] hover:bg-[#38302D] hover:text-[#F6F2EC] disabled:opacity-60"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={processingDriveAction}
                      onClick={executeDriveConfirmAction}
                      className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
                        driveConfirmDialog.kind === 'delete'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-[#E53E22] hover:bg-[#C93218]'
                      }`}
                    >
                      {processingDriveAction
                        ? 'Memproses...'
                        : driveConfirmDialog.kind === 'delete'
                          ? 'Ya, Hapus Permanen'
                          : 'Ya, Lanjutkan'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
