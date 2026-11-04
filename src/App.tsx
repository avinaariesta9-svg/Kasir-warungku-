import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext';
import { TransactionProvider } from './context/TransactionContext';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { DeveloperDashboard } from './components/DeveloperDashboard';
import { BuyerLicenseScreen } from './components/BuyerLicenseScreen';
import { LicenseService } from './services/licenseService';
import { IndexedDbService } from './services/indexedDbService';
import { StoreLicense } from './types';
import { testFirestoreConnection } from './firebase';
import { Store, ShieldCheck, ShieldAlert } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading, store, storeLoading, isAdmin, logout, currentRole, isOwner, isCashier } = useAuth();

  // Navigation view state: 'pos' or 'developer'
  // Otomatis mengenali apakah dibuka dari domain konsumen (warungku-kasir) atau developer (warungku-admin)
  const [currentView, setCurrentView] = useState<'pos' | 'developer'>(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase();
      const path = window.location.pathname;
      const search = window.location.search;

      // 1. Deteksi domain hosting
      if (hostname.includes('warungku-admin') || hostname.startsWith('admin.')) {
        return 'developer';
      }
      if (hostname.includes('warungku-kasir') || hostname.startsWith('kasir.')) {
        return 'pos';
      }

      // 2. Deteksi path URL atau query
      if (path === '/developer' || search.includes('view=developer') || window.location.hash === '#/developer') {
        return 'developer';
      }
      if (path === '/' || path === '/pos' || search.includes('view=pos')) {
        return 'pos';
      }
    }
    return 'pos'; // Default ke Kasir POS untuk konsumen
  });

  // Buyer license state
  const [license, setLicense] = useState<StoreLicense | null>(null);
  const [licenseLoading, setLicenseLoading] = useState<boolean>(true);
  const currentDeviceId = LicenseService.getOrCreateDeviceId();

  useEffect(() => {
    // Verifikasi koneksi Firestore saat booting
    testFirestoreConnection();

    // Listen to browser popstate (back/forward)
    const handlePopState = () => {
      const hostname = window.location.hostname.toLowerCase();
      const isDevHost = hostname.includes('warungku-admin') || hostname.startsWith('admin.');
      const isDevPath = window.location.pathname === '/developer' || window.location.hash === '#/developer';
      setCurrentView((isDevHost || isDevPath) ? 'developer' : 'pos');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen to store license for buyer in real time
  useEffect(() => {
    if (!user || isAdmin) {
      setLicenseLoading(false);
      return;
    }

    if (!storeLoading && store) {
      setLicenseLoading(true);
      const activeStoreId = store.id || user.uid;

      // 1. Cek lisensi dari cache IndexedDB seketika (Offline-First)
      IndexedDbService.getLicense(activeStoreId).then((cachedLic) => {
        if (cachedLic) {
          setLicense(cachedLic);
          setLicenseLoading(false);
        }
      }).catch(() => {});

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setLicenseLoading(false);
        return;
      }

      // Pastikan dokumen permintaan lisensi ada di Firestore saat online
      LicenseService.ensureLicenseRequest(
        store,
        user.email || '',
        store.ownerName || user.displayName || undefined
      ).catch((err) => {
        console.warn('Gagal memastikan lisensi:', err);
      });

      // Pasang listener real-time status lisensi toko
      const unsubscribe = LicenseService.listenToStoreLicense(
        activeStoreId,
        async (lic) => {
          // Jika lisensi aktif tapi deviceId kosong (akibat Reset Perangkat oleh developer),
          // dan pengguna adalah pemilik utama toko, otomatis re-bind perangkat saat ini
          if (lic && lic.status === 'active' && !lic.deviceId && isOwner) {
            try {
              await LicenseService.rebindCurrentDevice(activeStoreId);
            } catch (e) {
              console.warn('Gagal mengikat perangkat setelah reset:', e);
            }
          }
          setLicense(lic);
          setLicenseLoading(false);
        },
        (err) => {
          console.error('Error lisensi:', err);
          setLicenseLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [user, store, storeLoading, isAdmin, isOwner]);

  const handleNavigate = (view: 'pos' | 'developer') => {
    setCurrentView(view);
    if (typeof window !== 'undefined' && window.history) {
      const newPath = view === 'developer' ? '/developer' : '/';
      window.history.pushState(null, '', newPath);
    }
  };

  if (loading || (user && !isAdmin && (storeLoading || licenseLoading))) {
    return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 animate-bounce">
          <Store className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-xl font-black tracking-tight">KASIR WARUNGKU</h1>
        <p className="text-xs text-emerald-100 mt-1">Memeriksa lisensi & memuat data warung...</p>
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mt-4" />
      </div>
    );
  }

  // 1. Belum login
  if (!user) {
    return (
      <div className="w-full min-h-screen bg-slate-100">
        <AuthScreen />
      </div>
    );
  }

  // 2. Akun Developer Admin
  if (isAdmin) {
    if (currentView === 'developer') {
      return <DeveloperDashboard onBackToPos={() => handleNavigate('pos')} />;
    }
    return <Dashboard onOpenDeveloper={() => handleNavigate('developer')} />;
  }

  // 3. Otorisasi Keamanan: Jika non-developer mencoba mengakses tampilan Developer (/developer atau domain warungku-admin)
  if (currentView === 'developer') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 text-center shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-white">Akses Developer Dibatasi</h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Halaman ini (<code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded font-mono">warungku-admin.web.app</code>) khusus untuk Developer Administrator Kasir WarungKu.
          </p>
          <div className="mt-4 p-3 bg-slate-900/80 rounded-2xl border border-slate-700/80 text-left text-xs">
            <p className="text-slate-400 text-[11px]">Akun yang sedang masuk:</p>
            <p className="font-bold text-white truncate font-mono">{user.email}</p>
            <p className="text-[11px] text-amber-400 mt-0.5 font-medium">
              Peran: {isOwner ? '👑 Pemilik Warung' : '💼 Admin Kasir'}
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.location.hostname.includes('warungku-admin')) {
                  window.location.href = 'https://warungku-kasir.web.app';
                } else {
                  handleNavigate('pos');
                }
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
            >
              <Store className="w-4 h-4" />
              <span>Buka Kasir WarungKu (warungku-kasir.web.app)</span>
            </button>
            <button
              onClick={logout}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-xl transition cursor-pointer active:scale-98"
            >
              Keluar / Ganti Akun Developer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Akun Pembeli / Pemilik Warung: Periksa Lisensi & Perangkat
  // Mismatch perangkat berlaku untuk perangkat utama toko bagi Pemilik
  const isMismatch = Boolean(
    isOwner &&
      license &&
      license.status === 'active' &&
      license.deviceId &&
      license.deviceId !== currentDeviceId
  );

  // Seluruh pengguna menggunakan Paket Selamanya (Sekali Bayar / Seumur Hidup) tanpa batas waktu
  const isLicenseActive = Boolean(license && license.status === 'active' && !isMismatch);

  if (!isLicenseActive) {
    return (
      <BuyerLicenseScreen
        license={license}
        currentDeviceId={currentDeviceId}
        isDeviceMismatch={isMismatch}
        onRefresh={() => {
          if (store) {
            LicenseService.ensureLicenseRequest(
              store,
              user.email || '',
              store.ownerName || user.displayName || undefined
            ).then((lic) => setLicense(lic));
          }
        }}
        onLogout={logout}
        developerPhone={LicenseService.getDeveloperPhone()}
      />
    );
  }

  // 4. Lisensi Pembeli Aktif & Terverifikasi
  return (
    <div className="w-full min-h-screen bg-slate-100">
      <Dashboard />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <TransactionProvider>
          <AppContent />
        </TransactionProvider>
      </ProductProvider>
    </AuthProvider>
  );
}
