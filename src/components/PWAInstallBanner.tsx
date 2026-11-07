import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  compact?: boolean;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Jika sudah terpasang atau ditutup oleh pengguna, sembunyikan
  if (isInstalled || dismissed) {
    return null;
  }

  // Alur Instalasi Android / Chromium Browser (Chrome, Edge, Samsung Internet)
  if (isInstallable) {
    if (compact) {
      return (
        <button
          onClick={install}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-slate-800 active:scale-95 transition cursor-pointer"
          title="Pasang Aplikasi Kasir WarungKu di Layar Utama HP"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Pasang Aplikasi</span>
        </button>
      );
    }

    return (
      <div className="w-full my-2 p-3 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs sm:text-sm leading-tight text-white truncate">Pasang Kasir WarungKu</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Buka fullscreen tanpa browser bar & hemat data</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={install}
            type="button"
            className="bg-white text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm hover:bg-slate-100 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pasang</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            type="button"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            aria-label="Tutup Banner Instalasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Alur Bantuan iOS Safari
  if (isIOS) {
    if (compact) {
      return (
        <button
          onClick={() => setShowIOSGuide(true)}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-slate-800 active:scale-95 transition cursor-pointer"
          title="Pasang di iPhone / iPad"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Pasang di iPhone</span>
        </button>
      );
    }

    return (
      <>
        <div className="w-full my-2 p-3 bg-slate-900 rounded-2xl text-white border border-slate-800 shadow-md flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs sm:text-sm text-white truncate">Pasang Kasir WarungKu di iPhone</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Tambahkan ke Layar Utama</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowIOSGuide(true)}
              type="button"
              className="text-xs bg-white text-slate-950 px-3 py-1.5 rounded-xl font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Panduan
            </button>
            <button
              onClick={() => setDismissed(true)}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              aria-label="Tutup Banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-slate-800 shadow-2xl animate-in slide-in-from-bottom-4">
              <h3 className="font-bold text-base text-slate-900 mb-2">Pasang di Layar Utama iPhone</h3>
              <ol className="text-xs text-slate-600 space-y-2 mb-4 list-decimal list-inside">
                <li>Ketuk tombol <strong>Bagikan (Share)</strong> di bilah browser Safari bawah.</li>
                <li>Gulir ke bawah lalu pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.</li>
                <li>Ketuk <strong>Tambah</strong> di pojok kanan atas.</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                type="button"
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
