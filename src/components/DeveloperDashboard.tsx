import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Send,
  Smartphone,
  Store,
  Layers,
  Settings,
  History,
  RefreshCw,
  Phone,
  User,
  Key,
  Code,
  Copy,
  Check,
  AlertCircle,
  Slash,
  Users,
  LogOut,
  MapPin,
  Award,
  Sparkles,
  ExternalLink,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import {
  StoreLicense,
  LicenseActionLog,
  LicenseStatus,
  StoreProfile,
  UserProfile,
} from '../types';
import { LicenseService } from '../services/licenseService';
import { ChatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { StoreActivationModal } from './StoreActivationModal';
import { DeveloperChatView } from './DeveloperChatView';

interface DeveloperDashboardProps {
  onBackToPos: () => void;
}

export const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({ onBackToPos }) => {
  const { user, isAdmin, logout } = useAuth();

  // Data states
  const [licenses, setLicenses] = useState<StoreLicense[]>([]);
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<LicenseActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Active view tab: 'licenses' | 'users' | 'stores' | 'logs' | 'chats'
  const [activeTab, setActiveTab] = useState<'licenses' | 'users' | 'stores' | 'logs' | 'chats'>('licenses');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | LicenseStatus>('all');

  // Developer phone config
  const [devPhone, setDevPhone] = useState(LicenseService.getDeveloperPhone());
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneSavedMessage, setPhoneSavedMessage] = useState(false);

  // Modals
  const [activationModalOpen, setActivationModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<StoreLicense | null>(null);
  const [rejectReason, setRejectReason] = useState('Pembayaran belum terkonfirmasi.');

  // Modal Persetujuan Terima (Paket Selamanya)
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [licenseToApprove, setLicenseToApprove] = useState<StoreLicense | null>(null);

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [allLicenses, allStores, allLogs, allUsers] = await Promise.all([
        LicenseService.getAllLicenses(),
        LicenseService.getAllStores(),
        LicenseService.getLicenseActionLogs(),
        LicenseService.getAllUsers(),
      ]);
      setLicenses(allLicenses);
      setStores(allStores);
      setLogs(allLogs);
      setUsersList(allUsers);
    } catch (e) {
      console.error('Gagal memuat data developer:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Real-time unread chat messages listener for developer
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = ChatService.listenAllConversations((convs) => {
      const totalUnread = convs.reduce((acc, c) => acc + (c.unreadByDeveloper || 0), 0);
      setUnreadChatCount(totalUnread);
    });
    return () => unsub();
  }, [isAdmin]);

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    LicenseService.setDeveloperPhone(devPhone);
    setIsEditingPhone(false);
    setPhoneSavedMessage(true);
    setTimeout(() => setPhoneSavedMessage(false), 2500);
  };

  // Helper format tanggal Indonesia
  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatRupiah = (val: number = 0) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // 1. Tombol TERIMA (Persetujuan Pengguna Baru - Paket Selamanya / Seumur Hidup)
  const openApproveModal = (license: StoreLicense) => {
    setLicenseToApprove(license);
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!licenseToApprove || !user?.email) return;

    setActionLoadingId(licenseToApprove.id);
    try {
      await LicenseService.activateLicense(
        licenseToApprove.storeId,
        licenseToApprove.storeName,
        user.email,
        licenseToApprove.deviceId
      );
      showToast(`Toko "${licenseToApprove.storeName}" berhasil DISETUJUI & DIAKTIFKAN SELAMANYA!`);
      setApproveModalOpen(false);
      await loadData();
    } catch (err) {
      alert('Gagal menyetujui lisensi: ' + String(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Tombol TOLAK
  const openRejectModal = (license: StoreLicense) => {
    setSelectedLicense(license);
    setRejectReason('Pembayaran belum terkonfirmasi.');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedLicense || !user?.email) return;
    setActionLoadingId(selectedLicense.id);
    try {
      await LicenseService.rejectLicense(
        selectedLicense.storeId,
        selectedLicense.storeName,
        user.email,
        rejectReason
      );
      setRejectModalOpen(false);
      showToast(`Permintaan "${selectedLicense.storeName}" DITOLAK.`);
      await loadData();
    } catch (err) {
      alert('Gagal menolak lisensi: ' + String(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. NONAKTIFKAN AKUN
  const handleDeactivate = async (license: StoreLicense) => {
    if (!user?.email) return;
    const confirmAction = window.confirm(
      `Nonaktifkan akun toko "${license.storeName}" (${license.ownerName})?\n\nCatatan Penting: Seluruh produk, stok, dan riwayat transaksi toko TIDAK akan terhapus dan tetap tersimpan aman di cloud Firebase.`
    );
    if (!confirmAction) return;

    setActionLoadingId(license.id);
    try {
      await LicenseService.deactivateLicense(
        license.storeId,
        license.storeName,
        user.email,
        'Dinonaktifkan oleh developer'
      );
      showToast(`Akun "${license.storeName}" telah DINONAKTIFKAN.`);
      await loadData();
    } catch (err) {
      alert('Gagal menonaktifkan akun: ' + String(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. AKTIFKAN KEMBALI (Paket Selamanya)
  const handleReactivate = async (license: StoreLicense) => {
    if (!user?.email) return;
    setActionLoadingId(license.id);
    try {
      await LicenseService.activateLicense(
        license.storeId,
        license.storeName,
        user.email,
        license.deviceId
      );
      showToast(`Akun "${license.storeName}" berhasil DIAKTIFKAN KEMBALI SELAMANYA!`);
      await loadData();
    } catch (err) {
      alert('Gagal mengaktifkan kembali: ' + String(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  // 5. RESET PERANGKAT
  const handleResetDevice = async (license: StoreLicense) => {
    if (!user?.email) return;
    if (
      !window.confirm(
        `Reset pengikatan perangkat untuk toko "${license.storeName}"?\n\nTindakan ini memungkinkan pembeli login dan mengikat HP barunya ke lisensi ini.`
      )
    ) {
      return;
    }

    setActionLoadingId(license.id);
    try {
      await LicenseService.resetDevice(license.storeId, license.storeName, user.email);
      showToast(`Perangkat toko "${license.storeName}" berhasil DI-RESET.`);
      await loadData();
    } catch (err) {
      alert('Gagal me-reset perangkat: ' + String(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  // 6. UBAH STATUS AKSES PENGGUNA LANGSUNG (Khusus Developer Admin)
  const handleChangeStatus = async (
    targetStoreId: string,
    targetStoreName: string,
    newStatus: LicenseStatus
  ) => {
    if (!user?.email) return;
    setActionLoadingId(targetStoreId);
    try {
      await LicenseService.changeUserAccessStatus(
        targetStoreId,
        targetStoreName,
        user.email,
        newStatus,
        `Diubah oleh developer`
      );
      showToast(`Status "${targetStoreName}" berhasil diubah menjadi: ${newStatus.toUpperCase()}`);
      await loadData();
    } catch (err) {
      alert('Gagal mengubah status: ' + String(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Gabungkan seluruh pengguna unik dari usersList, stores, dan licenses
  const unifiedUsers = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      name: string;
      storeName: string;
      storeCode?: string;
      email: string;
      whatsapp: string;
      createdAt: string;
      status: LicenseStatus;
      license?: StoreLicense;
      store?: StoreProfile;
    }>();

    // 1. Dari stores
    stores.forEach((s) => {
      const lic = licenses.find((l) => l.storeId === s.id);
      map.set(s.id, {
        userId: s.id,
        name: s.ownerName || 'Pemilik Warung',
        storeName: s.storeName,
        storeCode: s.storeCode,
        email: s.ownerEmail || '',
        whatsapp: s.whatsapp || lic?.whatsapp || '',
        createdAt: s.createdAt || lic?.requestedAt || '',
        status: lic?.status || (s.isActive ? 'active' : 'inactive'),
        license: lic,
        store: s,
      });
    });

    // 2. Dari licenses (jika ada lisensi yang belum ada di stores)
    licenses.forEach((l) => {
      if (!map.has(l.storeId)) {
        map.set(l.storeId, {
          userId: l.storeId,
          name: l.ownerName,
          storeName: l.storeName,
          storeCode: undefined,
          email: l.ownerEmail,
          whatsapp: l.whatsapp,
          createdAt: l.requestedAt,
          status: l.status,
          license: l,
          store: undefined,
        });
      }
    });

    // 3. Dari usersList (jika ada user yang belum punya store/license)
    usersList.forEach((u) => {
      if (!map.has(u.id)) {
        map.set(u.id, {
          userId: u.id,
          name: u.displayName || 'Pengguna Baru',
          storeName: 'Menunggu Pengaturan Toko',
          storeCode: undefined,
          email: u.email,
          whatsapp: '-',
          createdAt: u.createdAt,
          status: 'pending',
          license: undefined,
          store: undefined,
        });
      }
    });

    return Array.from(map.values());
  }, [stores, licenses, usersList]);

  // Statistics Calculation (Akurat & Tersinkron)
  const totalPengguna = unifiedUsers.length;
  const totalToko = stores.length;
  const totalActive = unifiedUsers.filter((u) => u.status === 'active').length;
  const totalInactive = unifiedUsers.filter((u) => u.status === 'inactive').length;
  const totalPending = unifiedUsers.filter((u) => u.status === 'pending').length;
  const totalRejected = unifiedUsers.filter((u) => u.status === 'rejected').length;

  // Filtered lists
  const filteredUsers = useMemo(() => {
    return unifiedUsers.filter((u) => {
      const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        u.name.toLowerCase().includes(term) ||
        u.storeName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.whatsapp.includes(term) ||
        (u.storeCode && u.storeCode.toLowerCase().includes(term)) ||
        (u.createdAt && u.createdAt.toLowerCase().includes(term));

      return matchesStatus && matchesSearch;
    });
  }, [unifiedUsers, filterStatus, searchTerm]);

  const filteredLicenses = useMemo(() => {
    return licenses.filter((l) => {
      const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        l.storeName.toLowerCase().includes(term) ||
        l.ownerName.toLowerCase().includes(term) ||
        l.ownerEmail.toLowerCase().includes(term) ||
        l.requestCode.toLowerCase().includes(term) ||
        l.whatsapp.toLowerCase().includes(term) ||
        l.deviceId.toLowerCase().includes(term) ||
        (l.requestedAt && l.requestedAt.toLowerCase().includes(term));

      return matchesStatus && matchesSearch;
    });
  }, [licenses, filterStatus, searchTerm]);

  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      const term = searchTerm.toLowerCase();
      return (
        !term ||
        s.storeName.toLowerCase().includes(term) ||
        (s.ownerName && s.ownerName.toLowerCase().includes(term)) ||
        (s.ownerEmail && s.ownerEmail.toLowerCase().includes(term)) ||
        (s.whatsapp && s.whatsapp.includes(term)) ||
        (s.address && s.address.toLowerCase().includes(term)) ||
        (s.storeCode && s.storeCode.toLowerCase().includes(term)) ||
        (s.createdAt && s.createdAt.toLowerCase().includes(term))
      );
    });
  }, [stores, searchTerm]);

  // Status Badge Component
  const getStatusBadge = (status?: LicenseStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Aktif</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>MENUNGGU PERSETUJUAN</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            <span>Ditolak</span>
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-slate-200 text-slate-800 border border-slate-300">
            <Slash className="w-3.5 h-3.5 text-slate-600" />
            <span>Nonaktif</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <span>Belum Diajukan</span>
          </span>
        );
    }
  };

  // Badge Paket Selamanya (Sekali Bayar / Seumur Hidup)
  const getLifetimeBadge = () => {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
        <span>♾️ Selamanya (Seumur Hidup)</span>
      </span>
    );
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-red-200 text-center space-y-3 shadow-lg">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-lg font-black text-slate-900">Akses Developer Dibatasi</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Halaman <strong>Dashboard Developer (/developer)</strong> dilindungi oleh Firebase Authentication & Security Rules. Hanya akun developer terotorisasi (<strong>avinaariesta9@gmail.com</strong>) yang berhak mengakses.
          </p>
          <button
            onClick={onBackToPos}
            className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition cursor-pointer"
          >
            Kembali ke Halaman Kasir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold animate-in fade-in flex items-center gap-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base tracking-tight leading-tight">
                  DASHBOARD DEVELOPER
                </h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                  /developer
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Otorisasi Firebase • Akun: <strong className="text-white font-mono">{user?.email}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivationModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
              title="Aktivasi Toko di Tempat"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aktivasi Toko</span>
            </button>

            <button
              onClick={loadData}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onBackToPos}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition active:scale-95 cursor-pointer"
              title="Buka Kasir WarungKu"
            >
              Mode Kasir
            </button>

            <button
              onClick={() => logout()}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
              title="Keluar Akun Developer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex border-t border-slate-800 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('licenses')}
            className={`py-2.5 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition whitespace-nowrap ${
              activeTab === 'licenses'
                ? 'border-emerald-500 text-emerald-400 bg-white/5 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Persetujuan & Lisensi</span>
            {totalPending > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] animate-pulse">
                {totalPending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-2.5 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-emerald-500 text-emerald-400 bg-white/5 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manajemen Pengguna & Toko ({totalPengguna})</span>
          </button>

          <button
            onClick={() => setActiveTab('stores')}
            className={`py-2.5 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition whitespace-nowrap ${
              activeTab === 'stores'
                ? 'border-emerald-500 text-emerald-400 bg-white/5 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Omzet & Metrik Toko ({totalToko})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2.5 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-emerald-500 text-emerald-400 bg-white/5 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Aktivitas Developer ({logs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('chats')}
            className={`py-2.5 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition whitespace-nowrap relative ${
              activeTab === 'chats'
                ? 'border-emerald-500 text-emerald-400 bg-white/5 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat Pelanggan</span>
            {unreadChatCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] animate-pulse">
                {unreadChatCount} Baru
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-4 space-y-4">
        {/* WhatsApp Developer Number Setting */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Nomor WhatsApp Developer (Penerima Konfirmasi Pembayaran)
              </p>
              <p className="text-[11px] text-slate-500">
                Nomor ini digunakan pembeli saat menekan tombol WhatsApp aktivasi:{' '}
                <strong className="text-slate-800 ml-1 font-mono">
                  +{LicenseService.getDeveloperPhone()}
                </strong>
              </p>
              {phoneSavedMessage && (
                <span className="text-[10px] text-emerald-700 font-bold">
                  ✓ Nomor WhatsApp berhasil disimpan!
                </span>
              )}
            </div>
          </div>

          <div>
            {!isEditingPhone ? (
              <button
                onClick={() => setIsEditingPhone(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Ubah Nomor WA</span>
              </button>
            ) : (
              <form onSubmit={handleSavePhone} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={devPhone}
                  onChange={(e) => setDevPhone(e.target.value)}
                  placeholder="08123456789"
                  className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-mono font-bold w-36 focus:outline-emerald-600"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingPhone(false)}
                  className="px-2 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </button>
              </form>
            )}
          </div>
        </div>

        {/* 5 DASHBOARD STATISTIK CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* Card 1: Total Pengguna */}
          <div
            onClick={() => setActiveTab('users')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              activeTab === 'users' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[11px] font-bold ${activeTab === 'users' ? 'text-slate-300' : 'text-slate-600'}`}>Total Pengguna</span>
              <Users className={`w-4 h-4 ${activeTab === 'users' ? 'text-emerald-400' : 'text-slate-400'}`} />
            </div>
            <p className={`text-xl font-black ${activeTab === 'users' ? 'text-white' : 'text-slate-900'}`}>{totalPengguna}</p>
            <p className={`text-[10px] mt-0.5 ${activeTab === 'users' ? 'text-slate-400' : 'text-slate-400'}`}>Pengguna terdaftar</p>
          </div>

          {/* Card 2: Total Toko */}
          <div
            onClick={() => setActiveTab('stores')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              activeTab === 'stores' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[11px] font-bold ${activeTab === 'stores' ? 'text-slate-300' : 'text-slate-600'}`}>Total Toko</span>
              <Store className={`w-4 h-4 ${activeTab === 'stores' ? 'text-emerald-400' : 'text-slate-400'}`} />
            </div>
            <p className={`text-xl font-black ${activeTab === 'stores' ? 'text-white' : 'text-slate-900'}`}>{totalToko}</p>
            <p className={`text-[10px] mt-0.5 ${activeTab === 'stores' ? 'text-slate-400' : 'text-slate-400'}`}>Unit usaha fisik</p>
          </div>

          {/* Card 3: Pengguna Aktif */}
          <div
            onClick={() => {
              setActiveTab('licenses');
              setFilterStatus('active');
            }}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              filterStatus === 'active' && activeTab === 'licenses'
                ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-800">Pengguna Aktif</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-slate-900">{totalActive}</p>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Akses seumur hidup</p>
          </div>

          {/* Card 4: Pengguna Nonaktif */}
          <div
            onClick={() => {
              setActiveTab('licenses');
              setFilterStatus('inactive');
            }}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              filterStatus === 'inactive' && activeTab === 'licenses'
                ? 'bg-slate-200 border-slate-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-slate-700">Nonaktif</span>
              <Slash className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-xl font-black text-slate-900">{totalInactive}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Akses ditangguhkan</p>
          </div>

          {/* Card 5: Pendaftar Baru / Menunggu Persetujuan */}
          <div
            onClick={() => {
              setActiveTab('licenses');
              setFilterStatus('pending');
            }}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              filterStatus === 'pending' && activeTab === 'licenses'
                ? 'bg-amber-50 border-amber-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-amber-800">Menunggu</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl font-black text-slate-900">{totalPending}</p>
            <p className="text-[10px] text-amber-700 font-semibold mt-0.5">Perlu persetujuan</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama pengguna, toko, email, WhatsApp, tanggal, kode..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-emerald-600 bg-slate-50/70 text-slate-800"
            />
          </div>
        </div>

        {/* TAB 1: PERSETUJUAN PENGGUNA BARU & LISENSI */}
        {activeTab === 'licenses' && (
          <div className="space-y-3">
            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-semibold">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  filterStatus === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({licenses.length})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  filterStatus === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Menunggu Persetujuan ({totalPending})
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  filterStatus === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Aktif ({totalActive})
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  filterStatus === 'inactive'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Nonaktif ({totalInactive})
              </button>
              <button
                onClick={() => setFilterStatus('rejected')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  filterStatus === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-800 hover:bg-red-100'
                }`}
              >
                Ditolak ({totalRejected})
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Memuat data lisensi dari Firestore...</p>
              </div>
            ) : filteredLicenses.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-1">
                <Store className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Tidak ada permohonan lisensi</p>
                <p className="text-[11px] text-slate-400">
                  {searchTerm
                    ? 'Tidak ada data yang cocok dengan pencarian Anda.'
                    : 'Belum ada toko dengan status ini.'}
                </p>
              </div>
            ) : (
              filteredLicenses.map((item) => {
                const isWorking = actionLoadingId === item.id;
                const replyWaUrl = LicenseService.buildDeveloperReplyUrl(
                  item,
                  window.location.origin
                );

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-slate-300 transition space-y-3"
                  >
                    {/* Top Bar of Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm text-slate-900 truncate">
                            {item.storeName}
                          </h3>
                          {getStatusBadge(item.status)}
                          {item.status === 'active' && getLifetimeBadge()}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800">{item.ownerName}</span>
                          <span>•</span>
                          <span>{item.ownerEmail}</span>
                          {item.whatsapp && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-mono font-semibold">
                                {item.whatsapp}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 block">
                          ID: {item.storeId.slice(0, 8)}...
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Diajukan: {formatDate(item.requestedAt)}
                        </span>
                      </div>
                    </div>

                    {/* License Technical Identifiers */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Kode Permintaan:</span>
                        <span className="font-mono font-black text-slate-900 tracking-wider">
                          {item.requestCode}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block">Perangkat Terikat (1 Toko = 1 HP):</span>
                        <span className="font-mono font-bold text-slate-800 truncate block">
                          {item.deviceId || (
                            <span className="text-amber-600 italic">
                              (Belum terikat / Di-reset)
                            </span>
                          )}
                        </span>
                        {item.deviceInfo && (
                          <span className="text-[10px] text-slate-400 truncate block">
                            {item.deviceInfo}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Notes / Reason if rejected or inactive */}
                    {(item.rejectReason || item.notes) && (
                      <div className="p-2 bg-slate-100 rounded-xl text-[11px] text-slate-700 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>Catatan: {item.rejectReason || item.notes}</span>
                      </div>
                    )}

                    {/* Action Buttons Toolbar */}
                    <div className="pt-1 flex items-center justify-between gap-2 flex-wrap border-t border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Status Menunggu Persetujuan: Tampilkan Tombol TERIMA dan TOLAK */}
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openApproveModal(item)}
                              disabled={isWorking}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>TERIMA</span>
                            </button>

                            <button
                              onClick={() => openRejectModal(item)}
                              disabled={isWorking}
                              className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>TOLAK</span>
                            </button>
                          </>
                        )}

                        {/* Status Aktif: Tombol Nonaktifkan */}
                        {item.status === 'active' && (
                          <button
                            onClick={() => handleDeactivate(item)}
                            disabled={isWorking}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer disabled:opacity-50"
                            title="Nonaktifkan akses toko"
                          >
                            <Slash className="w-3.5 h-3.5" />
                            <span>Nonaktifkan</span>
                          </button>
                        )}

                        {/* Status Nonaktif atau Ditolak: Tombol Aktifkan Kembali */}
                        {(item.status === 'inactive' || item.status === 'rejected') && (
                          <button
                            onClick={() => handleReactivate(item)}
                            disabled={isWorking}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 transition active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aktifkan Kembali (Selamanya)</span>
                          </button>
                        )}

                        {/* Reset Perangkat */}
                        <button
                          onClick={() => handleResetDevice(item)}
                          disabled={isWorking}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer disabled:opacity-50"
                          title="Kosongkan ID perangkat agar pembeli dapat login di HP barunya"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Perangkat</span>
                        </button>
                      </div>

                      {/* WhatsApp contact */}
                      {item.whatsapp && (
                        <a
                          href={replyWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 transition active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Kirim WA</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: DAFTAR SELURUH PENGGUNA APLIKASI */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Daftar Seluruh Pengguna Aplikasi ({filteredUsers.length})</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Data akun pengguna, nama pemilik, nama toko, email, status akun, dan akses paket Selamanya
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Memuat data pengguna dari Firebase...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-1">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Tidak ada data pengguna</p>
                <p className="text-[11px] text-slate-400">Tidak ada data yang cocok dengan filter pencarian.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-3.5">Nama & Toko</th>
                        <th className="py-3 px-3">Email Pengguna</th>
                        <th className="py-3 px-3">Tanggal Daftar</th>
                        <th className="py-3 px-3">Status Akun</th>
                        <th className="py-3 px-3">Masa Aktif</th>
                        <th className="py-3 px-3 text-right">Aksi Developer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((item) => {
                        const linkedLicense = item.license || licenses.find((l) => l.storeId === item.userId);
                        const isWorking = actionLoadingId === item.userId;
                        const cleanPhone = item.whatsapp?.replace(/[^0-9]/g, '') || '';
                        const waUrl =
                          cleanPhone.length >= 9
                            ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}`
                            : null;

                        return (
                          <tr key={item.userId} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3.5">
                              <p className="font-black text-slate-900">{item.name}</p>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Store className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="font-semibold text-slate-700">{item.storeName}</span>
                                {item.storeCode && (
                                  <span className="font-mono text-[10px] text-slate-400">({item.storeCode})</span>
                                )}
                              </p>
                              {item.whatsapp && item.whatsapp !== '-' && (
                                <p className="text-[10px] font-mono text-emerald-700 mt-0.5">
                                  WA: {item.whatsapp}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-700 text-[11px]">
                              {item.email || '-'}
                            </td>
                            <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                              {formatDateTime(item.createdAt)}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {getStatusBadge(item.status)}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {getLifetimeBadge()}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                {item.status === 'pending' && linkedLicense && (
                                  <>
                                    <button
                                      onClick={() => openApproveModal(linkedLicense)}
                                      disabled={isWorking}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition active:scale-95 shadow-2xs"
                                      title="Terima & Aktifkan Paket Selamanya"
                                    >
                                      Terima
                                    </button>
                                    <button
                                      onClick={() => openRejectModal(linkedLicense)}
                                      disabled={isWorking}
                                      className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[11px] font-bold cursor-pointer transition active:scale-95"
                                      title="Tolak Pendaftaran"
                                    >
                                      Tolak
                                    </button>
                                  </>
                                )}

                                {item.status === 'active' && (
                                  <button
                                    onClick={() => {
                                      if (linkedLicense) {
                                        handleDeactivate(linkedLicense);
                                      } else {
                                        handleChangeStatus(item.userId, item.storeName, 'inactive');
                                      }
                                    }}
                                    disabled={isWorking}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold cursor-pointer transition active:scale-95"
                                    title="Nonaktifkan Akses Pengguna"
                                  >
                                    Nonaktifkan
                                  </button>
                                )}

                                {(item.status === 'inactive' || item.status === 'rejected') && (
                                  <button
                                    onClick={() => {
                                      if (linkedLicense) {
                                        handleReactivate(linkedLicense);
                                      } else {
                                        handleChangeStatus(item.userId, item.storeName, 'active');
                                      }
                                    }}
                                    disabled={isWorking}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition active:scale-95 shadow-2xs"
                                    title="Aktifkan Kembali Pengguna (Paket Selamanya)"
                                  >
                                    Aktifkan
                                  </button>
                                )}

                                {waUrl && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition"
                                    title="Hubungi WhatsApp"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DAFTAR TOKO & OMZET */}
        {activeTab === 'stores' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                Data Toko Pelanggan WarungKu ({filteredStores.length})
              </h2>
              <span className="text-[11px] text-slate-400">
                Tersimpan di Cloud Firestore (/stores)
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Memuat data toko pelanggan...</p>
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-1">
                <Store className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Tidak ada data toko</p>
              </div>
            ) : (
              filteredStores.map((store) => {
                const linkedLicense = licenses.find((l) => l.storeId === store.id);
                const cleanPhone = store.whatsapp?.replace(/[^0-9]/g, '') || '';
                const waUrl =
                  cleanPhone.length >= 9
                    ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}`
                    : null;

                return (
                  <div
                    key={store.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-slate-900">
                            {store.storeName}
                          </h3>
                          {getStatusBadge(linkedLicense?.status)}
                          {getLifetimeBadge()}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Pemilik: <strong>{store.ownerName || 'Pemilik Warung'}</strong> • {store.ownerEmail || '-'}
                        </p>
                      </div>

                      <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl shrink-0">
                        {store.storeCode || 'WRG-KASIR'}
                      </span>
                    </div>

                    {/* Store Metrics & Address */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Omzet:</span>
                        <span className="font-bold text-slate-900">
                          {formatRupiah(store.totalSales || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Transaksi:</span>
                        <span className="font-bold text-slate-900">
                          {store.totalTransactions || 0} Nota
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Variasi Produk:</span>
                        <span className="font-bold text-slate-900">
                          {store.totalProducts || 0} Item
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">WhatsApp:</span>
                        <span className="font-mono font-semibold text-emerald-700">
                          {store.whatsapp || '-'}
                        </span>
                      </div>
                    </div>

                    {store.address && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{store.address}</span>
                      </p>
                    )}

                    <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-100">
                      <span className="text-[11px] text-slate-400">
                        ID Toko: <span className="font-mono">{store.id}</span>
                      </span>

                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold flex items-center gap-1 transition text-xs"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>Hubungi WA</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 4: RIWAYAT AKTIVITAS DEVELOPER */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Tindakan Developer (Audit Trail)</span>
              </h3>
              <span className="text-[11px] text-slate-400">{logs.length} catatan</span>
            </div>

            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Belum ada riwayat aktivitas tindakan developer.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
                {logs.map((log) => {
                  return (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-black ${
                              log.action === 'ACTIVATE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.action === 'REJECT'
                                ? 'bg-red-100 text-red-800'
                                : log.action === 'RESET_DEVICE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {log.action}
                          </span>
                          <span>{log.storeName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Oleh: {log.performedBy} • {log.details}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Chat Pelanggan Real-Time */}
        {activeTab === 'chats' && <DeveloperChatView />}
      </main>

      {/* MODAL PERSETUJUAN TERIMA (Paket Selamanya / Seumur Hidup) */}
      {approveModalOpen && licenseToApprove && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-black text-sm text-slate-900">
                Persetujuan Pengguna Baru
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Setujui dan aktifkan lisensi untuk warung <strong>{licenseToApprove.storeName}</strong> ({licenseToApprove.ownerName})?
            </p>

            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1.5 text-xs text-amber-950">
              <div className="flex items-center gap-1.5 font-black text-amber-900">
                <Award className="w-4 h-4 text-amber-700" />
                <span>Paket Selamanya (Sekali Bayar / Seumur Hidup)</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Toko akan langsung aktif secara permanen tanpa batas masa kedaluwarsa. Seluruh fitur POS kasir, produk, dan laporan terbuka penuh.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={actionLoadingId === licenseToApprove.id}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {actionLoadingId === licenseToApprove.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Setujui & Aktifkan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              <h3 className="font-black text-sm text-slate-900">
                Tolak Permintaan Aktivasi
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Tolak permintaan lisensi untuk toko <strong>{selectedLicense?.storeName}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alasan Penolakan:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-red-500"
                placeholder="Misal: Pembayaran belum terkonfirmasi atau data tidak valid..."
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Activation Modal */}
      <StoreActivationModal
        isOpen={activationModalOpen}
        onClose={() => {
          setActivationModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
};
