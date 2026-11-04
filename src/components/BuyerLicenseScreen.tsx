import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Send,
  Smartphone,
  Store,
  RefreshCw,
  LogOut,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { StoreLicense } from '../types';
import { LicenseService } from '../services/licenseService';

interface BuyerLicenseScreenProps {
  license: StoreLicense | null;
  currentDeviceId: string;
  isDeviceMismatch: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  developerPhone: string;
}

export const BuyerLicenseScreen: React.FC<BuyerLicenseScreenProps> = ({
  license,
  currentDeviceId,
  isDeviceMismatch,
  onRefresh,
  onLogout,
  developerPhone,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedDevice, setCopiedDevice] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);

  const handleCopy = (text: string, type: 'code' | 'device') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedDevice(true);
      setTimeout(() => setCopiedDevice(false), 2000);
    }
  };

  const handleRebindDevice = async () => {
    if (!license) return;
    setRebuilding(true);
    try {
      await LicenseService.rebindCurrentDevice(license.storeId);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setRebuilding(false);
    }
  };

  const waUrl = license
    ? LicenseService.buildBuyerWhatsAppUrl(license, developerPhone)
    : `https://wa.me/${developerPhone}`;

  const renderContent = () => {
    // 1. Device Mismatch: Active license on another phone
    if (isDeviceMismatch && license?.status === 'active') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3">
            <Smartphone className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-black text-amber-950">
                Lisensi Terikat pada Perangkat Lain
              </h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Lisensi toko Anda sudah <strong>AKTIF</strong>, namun terikat pada ID perangkat HP yang berbeda.
              </p>
              <div className="mt-2.5 p-2.5 bg-white/90 border border-amber-200 rounded-xl text-[11px] space-y-1">
                <p className="text-slate-500">
                  Perangkat Terdaftar:{' '}
                  <span className="font-mono font-bold text-slate-800">
                    {license.deviceId || '(Belum terikat)'}
                  </span>
                </p>
                <p className="text-slate-500">
                  Perangkat Anda Saat Ini:{' '}
                  <span className="font-mono font-bold text-emerald-700">
                    {currentDeviceId}
                  </span>
                </p>
              </div>
              <p className="text-[11px] text-amber-700 mt-2">
                *Satu lisensi berlaku untuk satu toko dan satu perangkat utama. Jika Anda mengganti HP baru, silakan minta Developer untuk me-reset perangkat.
              </p>
            </div>
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 active:scale-98 transition"
          >
            <Send className="w-4 h-4" />
            <span>Minta Reset Perangkat via WhatsApp</span>
          </a>
        </div>
      );
    }

    // 2. Status Ditolak
    if (license?.status === 'rejected') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-300 rounded-2xl flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-black text-red-950">
                Permintaan Aktivasi Ditolak
              </h3>
              <p className="text-xs text-red-800 mt-1 leading-relaxed">
                Developer belum dapat menyetujui aktivasi toko ini.
              </p>
              {license.rejectReason && (
                <div className="mt-2 p-2.5 bg-white/90 border border-red-200 rounded-xl text-xs font-medium text-red-900">
                  Catatan Developer: "{license.rejectReason}"
                </div>
              )}
            </div>
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition"
          >
            <Send className="w-4 h-4" />
            <span>Hubungi Developer via WhatsApp</span>
          </a>
        </div>
      );
    }

    // 3. Status Nonaktif
    if (license?.status === 'inactive') {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-slate-100 border border-slate-300 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Lisensi Toko Dinonaktifkan
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Lisensi aplikasi toko Anda saat ini sedang dinonaktifkan oleh developer.
              </p>
              <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 font-medium">
                🛡️ <strong>Data Anda Aman:</strong> Seluruh produk, riwayat transaksi, dan laporan toko Anda tetap tersimpan aman di cloud Firebase dan tidak dihapus.
              </div>
            </div>
          </div>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition"
          >
            <Send className="w-4 h-4" />
            <span>Hubungi Developer untuk Mengaktifkan</span>
          </a>
        </div>
      );
    }

    // 4. Default: Menunggu Persetujuan Developer (Pending)
    return (
      <div className="space-y-4">
        {/* Pulsing Status Banner */}
        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-2xl">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-900">
              Menunggu Verifikasi Developer
            </span>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed">
            Permintaan aktivasi lisensi toko <strong>{license?.storeName || 'Anda'}</strong> telah dibuat. Silakan hubungi Developer via WhatsApp untuk konfirmasi pembayaran.
          </p>
        </div>

        {/* Credentials & Device Info Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">Kode Permintaan Lisensi:</span>
              <button
                onClick={() => license && handleCopy(license.requestCode, 'code')}
                className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-bold cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Disalin' : 'Salin'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-black text-slate-900 tracking-wider">
              {license?.requestCode || 'MEMUAT...'}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">ID Perangkat HP Ini:</span>
              <button
                onClick={() => handleCopy(currentDeviceId, 'device')}
                className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-bold cursor-pointer"
              >
                {copiedDevice ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedDevice ? 'Disalin' : 'Salin'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="truncate">{currentDeviceId}</span>
              <span className="text-[10px] text-slate-400 font-sans ml-2">Utama</span>
            </div>
          </div>

          <div className="pt-1 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Sekali bayar, tanpa biaya langganan bulanan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Aplikasi otomatis terbuka setelah developer menyetujui</span>
            </div>
          </div>
        </div>

        {/* Big WhatsApp Button */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/25 active:scale-98 transition text-center"
        >
          <Send className="w-4 h-4" />
          <span>Kirim Bukti Bayar ke WhatsApp Developer</span>
        </a>

        {/* Real-time sync note */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-[11px] text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
            <span>Memeriksa persetujuan secara real-time...</span>
          </div>
          <button
            onClick={onRefresh}
            className="text-[10px] font-bold text-emerald-700 hover:underline"
          >
            Cek Sekarang
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Top Branding */}
      <div>
        <div className="pt-6 pb-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-600/30">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">KASIR WARUNGKU</h1>
          <p className="text-xs text-slate-500 mt-0.5">Sistem Kasir & Manajemen Warung</p>
        </div>

        {/* Store info pill */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 mb-4 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {license?.storeName || 'Toko Anda'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {license?.ownerName || 'Pemilik Warung'} • {license?.ownerEmail || ''}
            </p>
          </div>
          <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-md font-bold text-slate-600 shrink-0">
            {license?.storeId ? `ID: ${license.storeId.slice(0, 6)}...` : ''}
          </span>
        </div>

        {/* Dynamic Status Content */}
        {renderContent()}
      </div>

      {/* Bottom Footer Actions */}
      <div className="pt-6 pb-2 text-center space-y-3">
        <button
          onClick={onLogout}
          className="text-xs text-slate-500 hover:text-red-600 font-semibold inline-flex items-center gap-1.5 cursor-pointer py-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar Akun atau Ganti Pengguna</span>
        </button>
        <p className="text-[10px] text-slate-400">
          Kasir WarungKu • Perlindungan Lisensi Cloud Firebase
        </p>
      </div>
    </div>
  );
};
