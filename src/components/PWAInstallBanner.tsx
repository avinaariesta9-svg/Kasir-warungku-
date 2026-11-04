import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  // Android / Chromium Browser Install flow
  if (isInstallable) {
    return (
      <div className="mx-4 mt-3 mb-2 p-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl text-white shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">Pasang di Layar Utama HP</p>
            <p className="text-xs text-emerald-100 mt-0.5">Buka lebih cepat & hemat kuota</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={install}
            className="bg-white text-emerald-700 font-medium text-xs px-3.5 py-2 rounded-xl shadow-sm hover:bg-emerald-50 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pasang</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg transition"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari flow helper
  if (isIOS) {
    return (
      <>
        <div className="mx-4 mt-3 mb-2 p-3 bg-slate-800 rounded-2xl text-white shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="font-medium text-xs">Pasang Kasir Warungku di iPhone</p>
              <p className="text-[11px] text-slate-300">Tambahkan ke Layar Utama</p>
            </div>
          </div>
          <button
            onClick={() => setShowIOSGuide(true)}
            className="text-xs bg-emerald-600 px-3 py-1.5 rounded-lg font-medium text-white"
          >
            Panduan
          </button>
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
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
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
