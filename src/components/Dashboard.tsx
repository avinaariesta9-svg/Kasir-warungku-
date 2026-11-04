import React, { useState } from 'react';
import {
  Store,
  DollarSign,
  Receipt,
  Package,
  Layers,
  Phone,
  MapPin,
  Edit3,
  LogOut,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  Printer,
  History,
  BarChart3,
  Database,
  TrendingUp,
  HelpCircle,
  Key,
  Users,
  Briefcase,
  Crown,
  WifiOff,
  CloudUpload,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import { useTransactions } from '../context/TransactionContext';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { StoreProfileModal } from './StoreProfileModal';
import { PWAInstallBanner } from './PWAInstallBanner';
import { ProductList } from './ProductList';
import { CashierView } from './CashierView';
import { TransactionHistory } from './TransactionHistory';
import { PrinterSettingsModal } from './PrinterSettingsModal';
import { ReportView } from './ReportView';
import { BackupRestoreModal } from './BackupRestoreModal';
import { HelpGuideModal } from './HelpGuideModal';
import { StoreActivationModal } from './StoreActivationModal';
import { StoreMembersModal } from './StoreMembersModal';

interface DashboardProps {
  onOpenDeveloper?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenDeveloper }) => {
  const { user, store, logout, isAdmin, currentRole, isOwner, isCashier } = useAuth();
  const { totalProductsCount, totalStockSum, lowStockProducts } = useProducts();
  const { cartItemsCount, transactions } = useTransactions();
  const { isOnline, isSyncing, pendingCount, syncNow } = useSyncStatus();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'cashier' | 'products' | 'history' | 'reports'
  >('dashboard');

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [activationModalOpen, setActivationModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const formatRupiah = (amount: number = 0) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari Kasir Warungku?')) {
      setLoggingOut(true);
      try {
        await logout();
      } catch (e) {
        console.error(e);
      } finally {
        setLoggingOut(false);
      }
    }
  };

  const cleanPhone = store?.whatsapp?.replace(/[^0-9]/g, '') || '';
  const waUrl =
    cleanPhone.length >= 9
      ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}`
      : null;

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-800 flex flex-col font-sans pb-16 md:pb-6">
      {/* Responsive Header */}
      <header className="sticky top-0 z-30 bg-emerald-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-base tracking-tight leading-tight truncate">
                {store?.storeName || 'KASIR WARUNGKU'}
              </h1>
              <p className="text-[11px] text-emerald-100 truncate flex items-center gap-1">
                <span>{store?.ownerName || user?.displayName || user?.email || 'Pemilik Warung'}</span>
                <span className="text-emerald-300">•</span>
                <span className="text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded font-semibold text-emerald-100">
                  {store?.storeCode || 'Toko Aktif'}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold flex items-center gap-0.5 ${
                    isCashier ? 'bg-teal-900 text-teal-100' : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  {isCashier ? '💼 Kasir' : '👑 Pemilik'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Status Online, Offline & Menunggu Sinkronisasi */}
            {!isOnline ? (
              <span
                className="px-2 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-xs"
                title="Aplikasi berjalan offline. Transaksi dan perubahan tersimpan di IndexedDB perangkat."
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Offline</span>
                {pendingCount > 0 && (
                  <span className="bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </span>
            ) : pendingCount > 0 ? (
              <button
                onClick={syncNow}
                disabled={isSyncing}
                className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer animate-pulse"
                title="Ada transaksi offline menunggu sinkronisasi ke Firebase. Tekan untuk sinkron sekarang."
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sinkron...' : `Sinkron (${pendingCount})`}</span>
              </button>
            ) : (
              <span
                className="px-2 py-1 rounded-xl bg-emerald-700/80 text-emerald-100 font-bold text-[11px] hidden sm:flex items-center gap-1.5 shadow-xs"
                title="Terhubung ke cloud Firebase"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                <span>Online</span>
              </span>
            )}

            {isAdmin && onOpenDeveloper && (
              <button
                onClick={onOpenDeveloper}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 active:scale-95 transition flex items-center gap-1 shadow-xs font-black cursor-pointer"
                title="Buka Dashboard Developer & Lisensi (/developer)"
                aria-label="Dashboard Developer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-black tracking-tight text-white">Dev</span>
              </button>
            )}

            {/* Menu Multi-Admin / Tim Toko */}
            <button
              onClick={() => setMembersModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition flex items-center gap-1 shadow-xs font-bold text-white cursor-pointer"
              title="Kelola Tim Admin & Kasir (Multi-Admin)"
              aria-label="Multi-Admin"
            >
              <Users className="w-4 h-4 text-emerald-100" />
              <span className="text-[11px] font-bold tracking-tight hidden sm:inline">Tim</span>
            </button>

            {(isOwner || isAdmin) && (
              <button
                onClick={() => setActivationModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-95 transition flex items-center gap-1 shadow-xs font-black cursor-pointer"
                title="Menu Aktivasi Toko (Khusus Admin / Penjual)"
                aria-label="Aktivasi Toko"
              >
                <Key className="w-4 h-4 text-slate-950" />
                <span className="text-[11px] font-black tracking-tight">Aktivasi</span>
              </button>
            )}

            <button
              onClick={() => setHelpModalOpen(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition text-white"
              title="Panduan & Bantuan"
              aria-label="Panduan & Bantuan"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {(isOwner || isAdmin) && (
              <button
                onClick={() => setBackupModalOpen(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition text-white"
                title="Backup & Impor Data"
                aria-label="Backup & Impor Data"
              >
                <Database className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setPrinterModalOpen(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition text-white"
              title="Pengaturan Printer"
              aria-label="Pengaturan Printer"
            >
              <Printer className="w-4 h-4" />
            </button>

            {(isOwner || isAdmin) && (
              <button
                onClick={() => setProfileModalOpen(true)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition text-white"
                title="Edit Profil Toko"
                aria-label="Edit Profil Toko"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 active:scale-95 transition text-emerald-100 hover:text-white"
              title="Keluar"
              aria-label="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Responsive Sub-Navigation Header Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex border-t border-emerald-500/60 bg-emerald-700/40 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2.5 px-3 text-center flex items-center justify-center gap-1.5 transition border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'border-white text-white bg-white/10'
                : 'border-transparent text-emerald-100 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Ringkasan</span>
          </button>

          <button
            onClick={() => setActiveTab('cashier')}
            className={`flex-1 py-2.5 px-3 text-center flex items-center justify-center gap-1.5 transition border-b-2 cursor-pointer whitespace-nowrap relative ${
              activeTab === 'cashier'
                ? 'border-white text-white bg-white/10'
                : 'border-transparent text-emerald-100 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Kasir POS</span>
            {cartItemsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-1 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-2.5 px-3 text-center flex items-center justify-center gap-1.5 transition border-b-2 cursor-pointer whitespace-nowrap relative ${
              activeTab === 'products'
                ? 'border-white text-white bg-white/10'
                : 'border-transparent text-emerald-100 hover:text-white'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Produk</span>
            {lowStockProducts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 px-3 text-center flex items-center justify-center gap-1.5 transition border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-white text-white bg-white/10'
                : 'border-transparent text-emerald-100 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-2.5 px-3 text-center flex items-center justify-center gap-1.5 transition border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'border-white text-white bg-white/10'
                : 'border-transparent text-emerald-100 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Laporan</span>
          </button>
        </div>
      </header>

      {/* Banner Notifikasi Status Offline / Menunggu Sinkronisasi */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 text-xs px-4 py-2 font-bold flex items-center justify-between shadow-xs sticky top-[88px] z-20">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Mode Offline Aktif — Kasir, keranjang, dan stok tersimpan di IndexedDB perangkat.</span>
          </div>
          {pendingCount > 0 && (
            <span className="text-[11px] bg-slate-900 text-amber-300 px-2.5 py-0.5 rounded-full font-extrabold shrink-0 ml-2">
              {pendingCount} Menunggu Sinkronisasi
            </span>
          )}
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div className="bg-emerald-900 text-emerald-100 text-xs px-4 py-2 font-semibold flex items-center justify-between shadow-xs sticky top-[88px] z-20">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 text-emerald-300 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Koneksi internet aktif — {pendingCount} data offline siap disinkronkan ke cloud Firebase.</span>
          </div>
          <button
            onClick={syncNow}
            disabled={isSyncing}
            className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer shrink-0 ml-2 shadow-xs active:scale-95"
          >
            {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
          </button>
        </div>
      )}

      {/* Main Responsive Container (HP Android, Tablet, Laptop, Desktop) */}
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex-1 flex flex-col">
        {activeTab === 'dashboard' && (
          <>
            {/* PWA Android Install Banner */}
            <PWAInstallBanner />

            {/* Quick Action Grid for Mobile, Tablet & Desktop */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Quick Action: Buka Kasir POS */}
              <button
                onClick={() => setActiveTab('cashier')}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl shadow-md shadow-emerald-700/20 flex items-center justify-between px-4 transition active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-white">Buka Mesin Kasir POS</p>
                    <p className="text-xs text-emerald-100">Scan barcode & cetak struk belanja</p>
                  </div>
                </div>
                <div className="bg-white/20 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                  <span>Mulai</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Quick Action: Laporan Finansial */}
              <button
                onClick={() => setActiveTab('reports')}
                className="w-full py-3.5 bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl shadow-xs flex items-center justify-between px-4 transition active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900">Laporan Omzet & Keuntungan</p>
                    <p className="text-[11px] text-slate-500">Lihat laba kotor, produk terlaris & ekspor Excel</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600" />
              </button>

              {/* Quick Action: Panduan & Bantuan Kasir WarungKu */}
              <button
                onClick={() => setHelpModalOpen(true)}
                className="w-full py-3.5 bg-emerald-50/70 border border-emerald-200/90 hover:bg-emerald-100/60 rounded-2xl flex items-center justify-between px-4 transition active:scale-98 cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950">Panduan & Bantuan Penggunaan</p>
                    <p className="text-[11px] text-emerald-700">Cara transaksi, printer Bluetooth & tips kasir</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
              </button>

              {/* Quick Action: Kelola Tim Admin (Multi-Admin) */}
              <button
                onClick={() => setMembersModalOpen(true)}
                className="w-full py-3.5 bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl shadow-xs flex items-center justify-between px-4 transition active:scale-98 cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900">Kelola Tim & Multi-Admin</p>
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.2 rounded">
                        Multi-User
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {isOwner ? 'Undang kasir lewat email, atur peran & hak akses' : 'Lihat status tim dan anggota kasir'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-teal-600 shrink-0" />
              </button>

              {/* Quick Action: Menu Aktivasi Toko khusus Admin/Penjual */}
              {(isOwner || isAdmin) && (
                <button
                  onClick={() => setActivationModalOpen(true)}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500/15 via-emerald-50/80 to-teal-50 border border-amber-300 hover:border-amber-400 rounded-2xl flex items-center justify-between px-3.5 transition active:scale-98 cursor-pointer text-left shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                      <Key className="w-4 h-4 text-slate-950" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-slate-900">Aktivasi Toko Konsumen</p>
                        <span className="text-[10px] bg-amber-300 text-slate-950 font-black px-1.5 py-0.2 rounded">
                          Khusus Admin
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Aktifkan toko baru langsung di tempat tanpa APK
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-700 shrink-0" />
                </button>
              )}

              {/* Quick Action: Dashboard Developer khusus Developer Admin */}
              {isAdmin && onOpenDeveloper && (
                <button
                  onClick={onOpenDeveloper}
                  className="w-full py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 hover:border-emerald-500 rounded-2xl flex items-center justify-between px-3.5 transition active:scale-98 cursor-pointer text-left shadow-md text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-white">Dashboard Developer & Lisensi</p>
                        <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-400/40 font-mono">
                          /developer
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Kelola aktivasi lisensi toko, verifikasi manual & reset perangkat
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
                </button>
              )}
            </div>

            {/* Low stock warning banner on Dashboard */}
            {lowStockProducts.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-900 leading-tight">
                      Peringatan Stok Menipis!
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      {lowStockProducts.length} produk perlu ditambah stok.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('products')}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition shrink-0 active:scale-95 cursor-pointer"
                >
                  <span>Cek</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Dashboard 4 Summary Cards */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <span>Ringkasan Kasir & Penjualan</span>
                </h3>
                <span className="text-[11px] font-medium text-emerald-700">Real-Time Firestore</span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Card 1: Penjualan Total (Clickable to Laporan) */}
                <button
                  type="button"
                  onClick={() => setActiveTab('reports')}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-400 active:scale-98 text-left transition cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-2 group-hover:bg-emerald-200 transition">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 leading-tight">Total Penjualan</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 mt-1 truncate">
                    {formatRupiah(store?.totalSales || 0)}
                  </p>
                  <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded mt-1 inline-flex items-center gap-1">
                    <span>Lihat Laba</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </button>

                {/* Card 2: Total Transaksi */}
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-400 active:scale-98 text-left transition cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 mb-2 group-hover:bg-blue-200 transition">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 leading-tight">Total Transaksi</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 mt-1 truncate">
                    {store?.totalTransactions ?? 0}{' '}
                    <span className="text-xs font-medium text-slate-400">Nota</span>
                  </p>
                  <span className="text-[10px] text-blue-700 font-medium bg-blue-50 px-1.5 py-0.5 rounded mt-1 inline-flex items-center gap-1">
                    <span>Lihat Riwayat</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </button>

                {/* Card 3: Total Produk */}
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-400 active:scale-98 text-left transition cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 mb-2 group-hover:bg-amber-200 transition">
                    <Package className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 leading-tight">Total Produk</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 mt-1 truncate">
                    {totalProductsCount}{' '}
                    <span className="text-xs font-medium text-slate-400">Item</span>
                  </p>
                  <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-flex items-center gap-1">
                    <span>Kelola Produk</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </button>

                {/* Card 4: Total Stok */}
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-400 active:scale-98 text-left transition cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 mb-2 group-hover:bg-purple-200 transition">
                    <Layers className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 leading-tight">Total Stok</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 mt-1 truncate">
                    {totalStockSum}{' '}
                    <span className="text-xs font-medium text-slate-400">Pcs</span>
                  </p>
                  <span className="text-[10px] text-purple-700 font-medium bg-purple-50 px-1.5 py-0.5 rounded mt-1 inline-flex items-center gap-1">
                    <span>Kuantitas Fisik</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </button>
              </div>
            </div>

            {/* Store Profile & Technical Architecture Grid (Tablet & Desktop 2 cols) */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Store Summary Hero Card */}
              <div className="p-4 bg-gradient-to-br from-white to-emerald-50/50 rounded-2xl border border-emerald-100 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      Toko Aktif
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
                      {store?.storeName || 'Warung Saya'}
                    </h2>
                    <div className="mt-1.5 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {store?.whatsapp ? (
                          <span className="font-medium text-slate-800">{store.whatsapp}</span>
                        ) : (
                          <span className="text-slate-400 italic">WhatsApp belum diisi</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {store?.address || <span className="text-slate-400 italic">Alamat belum diatur</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => setProfileModalOpen(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1 active:scale-95 transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Ubah Profil</span>
                    </button>

                    <button
                      onClick={() => setBackupModalOpen(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 active:scale-95 transition cursor-pointer"
                    >
                      <Database className="w-3 h-3 text-emerald-700" />
                      <span>Cadangkan</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Technical Architecture & Status Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Kompatibilitas Sistem: HP, Tablet, Laptop, Desktop</span>
                  </h4>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Sinkronisasi Cloud Real-Time
                      </span>
                      <span className="font-semibold text-emerald-700">Multi-Device Firestore</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Barcode Scanner
                      </span>
                      <span className="font-semibold text-slate-900">Kamera & USB Barcode Gun</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Printer Kasir
                      </span>
                      <span className="font-semibold text-emerald-700">Bluetooth BLE & Cetak PC</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        Aplikasi Web PWA
                      </span>
                      <span className="font-semibold text-emerald-700">Chrome, Edge & Android</span>
                    </div>
                  </div>
                </div>

                {/* Quick WhatsApp Test Card */}
                {waUrl && (
                  <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-950">
                        WA: {store?.whatsapp}
                      </span>
                    </div>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition"
                    >
                      Chat
                    </a>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Kasir POS */}
        {activeTab === 'cashier' && <CashierView />}

        {/* Tab 3: Produk & Stok */}
        {activeTab === 'products' && <ProductList />}

        {/* Tab 4: Riwayat Transaksi */}
        {activeTab === 'history' && <TransactionHistory />}

        {/* Tab 5: Laporan Finansial & Pengelolaan */}
        {activeTab === 'reports' && <ReportView />}
      </main>

      {/* Mobile-Only Fixed Bottom Navigation Bar (Hidden on md/tablet/desktop) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 shadow-lg md:hidden">
        <div className="max-w-md mx-auto flex items-center justify-around py-1.5 px-0.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px]">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('cashier')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer relative ${
              activeTab === 'cashier'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-[10px]">Kasir</span>
            {cartItemsCount > 0 && (
              <span className="absolute top-0.5 right-1.5 bg-amber-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cartItemsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer relative ${
              activeTab === 'products'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Boxes className="w-5 h-5" />
            <span className="text-[10px]">Produk</span>
            {lowStockProducts.length > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer ${
              activeTab === 'history'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px]">Riwayat</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer ${
              activeTab === 'reports'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px]">Laporan</span>
          </button>
        </div>
      </nav>

      {/* Modal Edit Profil Toko */}
      <StoreProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Modal Pengaturan Printer */}
      <PrinterSettingsModal
        isOpen={printerModalOpen}
        onClose={() => setPrinterModalOpen(false)}
      />

      {/* Modal Backup & Pemulihan Toko */}
      <BackupRestoreModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
      />

      {/* Modal Panduan & Bantuan Kasir */}
      <HelpGuideModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />

      {/* Modal Aktivasi Toko khusus Admin/Penjual */}
      <StoreActivationModal
        isOpen={activationModalOpen}
        onClose={() => setActivationModalOpen(false)}
      />

      {/* Modal Multi-Admin & Tim Toko */}
      <StoreMembersModal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
      />
    </div>
  );
};
