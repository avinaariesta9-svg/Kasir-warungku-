import React, { useState } from 'react';
import {
  Printer,
  Bluetooth,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Download,
  FileText,
  ExternalLink,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { PrinterService } from '../services/printerService';
import { Transaction } from '../types';
import { ReceiptView } from './ReceiptView';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { store } = useAuth();
  const { printerSettings, updatePrinterSettings } = useTransactions();

  const [connecting, setConnecting] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [showTestReceipt, setShowTestReceipt] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const btStatus = PrinterService.getBluetoothSupportStatus();
  const isBtSupported = btStatus.isSupported;
  const isBtPermitted = btStatus.isPermitted;
  const isBtConnected = PrinterService.isConnected();
  const connectedName = PrinterService.getConnectedDeviceName();

  const dummyTransaction: Transaction = {
    id: 'TEST-001',
    storeId: store?.id || 'demo',
    invoiceNumber: 'TES-STRUK-001',
    items: [
      {
        productId: '1',
        name: 'Beras Ramos 5kg',
        price: 68000,
        costPrice: 62000,
        qty: 1,
        subtotal: 68000,
      },
      {
        productId: '2',
        name: 'Minyak Goreng 1L',
        price: 16500,
        costPrice: 15000,
        qty: 2,
        subtotal: 33000,
      },
    ],
    subtotal: 101000,
    total: 101000,
    paymentMethod: 'TUNAI',
    cashAmount: 150000,
    changeAmount: 49000,
    createdAt: new Date().toISOString(),
  };

  const handleConnectBluetooth = async () => {
    setStatusMessage(null);

    // 1. Guard: Jika Bluetooth tidak diizinkan atau tidak didukung, jangan panggil requestDevice
    if (!isBtSupported) {
      setStatusMessage({
        type: 'error',
        text: btStatus.reason || 'Web Bluetooth tidak didukung pada browser ini. Buka di Google Chrome di HP Android.',
      });
      return;
    }

    if (!isBtPermitted) {
      setStatusMessage({
        type: 'warning',
        text:
          'Akses Bluetooth diblokir oleh kebijakan keamanan browser (Permissions Policy) atau frame aplikasi. Anda tetap dapat mencetak struk secara langsung menggunakan opsi "Cetak Browser / Simpan PDF".',
      });
      return;
    }

    setConnecting(true);
    try {
      const res = await PrinterService.connectBluetooth();
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Terhubung ke printer "${res.deviceName}".`,
        });
        updatePrinterSettings({ savedDeviceName: res.deviceName });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Gagal menyambungkan Bluetooth.',
        });
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await PrinterService.disconnect();
    setStatusMessage({
      type: 'success',
      text: 'Printer Bluetooth telah diputuskan.',
    });
  };

  const handleTestPrintBluetooth = async () => {
    setStatusMessage(null);

    // Guard: Jangan panggil requestDevice jika printer belum tersambung
    if (!PrinterService.isConnected()) {
      setStatusMessage({
        type: 'error',
        text:
          'Printer Bluetooth belum terhubung. Silakan tekan tombol "Hubungkan Printer" terlebih dahulu, atau gunakan opsi "Uji Cetak Browser / Simpan PDF" di bawah.',
      });
      return;
    }

    setTestPrinting(true);
    try {
      const res = await PrinterService.printBluetooth(dummyTransaction, store);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Tes cetak struk Bluetooth berhasil dikirim!',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Gagal cetak tes struk Bluetooth.',
        });
      }
    } catch (e: unknown) {
      setStatusMessage({
        type: 'error',
        text: (e as Error).message || 'Terjadi kesalahan saat mencetak.',
      });
    } finally {
      setTestPrinting(false);
    }
  };

  const handleTestPrintBrowser = () => {
    setShowTestReceipt(true);
  };

  const handleTestPrintRawBt = () => {
    setStatusMessage(null);
    try {
      const res = PrinterService.printRawBt(
        dummyTransaction,
        store,
        printerSettings.paperWidth || '58mm'
      );
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Perintah uji cetak ESC/POS berhasil dikirim ke RawBT Android!',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Gagal mengirim ke RawBT. Pastikan aplikasi RawBT terpasang di HP.',
        });
      }
    } catch (e: unknown) {
      setStatusMessage({
        type: 'error',
        text: (e as Error).message || 'Gagal memicu RawBT.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-emerald-600 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Pengaturan Printer Kasir</h2>
              <p className="text-emerald-100 text-[11px]">Bluetooth ESC/POS & Ukuran Kertas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-emerald-100 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800">
          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : statusMessage.type === 'warning'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : statusMessage.type === 'warning' ? (
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* 1. Ukuran Kertas Thermal */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Ukuran Kertas Thermal Struk
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => updatePrinterSettings({ paperWidth: '58mm' })}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  printerSettings.paperWidth === '58mm'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-300 bg-white hover:bg-slate-100/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">58 mm</span>
                  {printerSettings.paperWidth === '58mm' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">32 karakter per baris</p>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium mt-1 inline-block">
                  Standar Warung Mini
                </span>
              </button>

              <button
                type="button"
                onClick={() => updatePrinterSettings({ paperWidth: '80mm' })}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  printerSettings.paperWidth === '80mm'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-300 bg-white hover:bg-slate-100/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">80 mm</span>
                  {printerSettings.paperWidth === '80mm' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">48 karakter per baris</p>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium mt-1 inline-block">
                  Printer Kasir Lebar
                </span>
              </button>
            </div>
          </div>

          {/* 2. Koneksi Bluetooth */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Koneksi Printer Bluetooth
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Web Bluetooth ESC/POS (BLE)
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                  isBtConnected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                <Bluetooth className="w-3 h-3" />
                <span>{isBtConnected ? 'Terhubung' : 'Terputus'}</span>
              </span>
            </div>

            {isBtConnected ? (
              <div className="p-3 bg-white border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">{connectedName}</p>
                  <p className="text-[10px] text-emerald-700">Siap mencetak transaksi</p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs rounded-lg transition cursor-pointer"
                >
                  Putuskan
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectBluetooth}
                disabled={connecting}
                className={`w-full py-2.5 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  !isBtPermitted || !isBtSupported
                    ? 'bg-slate-700 hover:bg-slate-800'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {connecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Bluetooth className="w-4 h-4" />
                )}
                <span>
                  {connecting ? 'Mencari Printer...' : 'Pilih & Hubungkan Printer Bluetooth'}
                </span>
              </button>
            )}

            {/* Banner status jika Bluetooth tidak didukung */}
            {!isBtSupported && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Web Bluetooth API tidak didukung pada browser ini. Harap buka aplikasi menggunakan <strong>Google Chrome di HP Android</strong>, atau gunakan alternatif <strong>Cetak Browser / Simpan PDF</strong> di bawah.
                </span>
              </div>
            )}

            {/* Banner status jika Bluetooth diblokir Permissions Policy atau iframe */}
            {isBtSupported && !isBtPermitted && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-950">Akses Bluetooth Dibatasi oleh Browser / Iframe</p>
                  <p className="text-amber-800/90 leading-relaxed">
                    Browser Anda atau frame aplikasi membatasi akses Web Bluetooth melalui Permissions Policy. Anda tetap dapat mencetak struk secara lancar menggunakan opsi <strong>Cetak Browser / Simpan PDF</strong> di bawah ini (bisa ke semua printer USB, WiFi, dan simpan PDF).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 3. Alternatif Cetak Universal: Cetak Browser & Simpan PDF */}
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Alternatif Cetak Universal
                </h4>
              </div>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                Bebas Izin Bluetooth
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Mendukung semua printer thermal USB/POS, printer WiFi, printer jaringan, printer biasa, serta <strong>Simpan sebagai PDF</strong> langsung lewat dialog cetak browser.
            </p>
            <button
              type="button"
              onClick={handleTestPrintBrowser}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Uji Cetak via Browser / Simpan PDF</span>
            </button>
          </div>

          {/* 4. Cetak Otomatis Toggle */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Cetak Otomatis Struk</p>
              <p className="text-[11px] text-slate-500">
                Langsung cetak struk begitu pembayaran berhasil
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={printerSettings.autoPrint}
                onChange={(e) => updatePrinterSettings({ autoPrint: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          {/* 5. Uji Cetak: RawBT & Bluetooth */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleTestPrintRawBt}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Uji Cetak via RawBT ({printerSettings.paperWidth || '58mm'})</span>
            </button>

            <button
              type="button"
              onClick={handleTestPrintBluetooth}
              disabled={testPrinting}
              className="w-full py-2.5 border border-slate-300 hover:bg-slate-100 active:scale-98 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Bluetooth className="w-4 h-4 text-blue-600" />
              <span>
                {testPrinting
                  ? 'Mengirim ke Printer...'
                  : isBtConnected
                  ? `Uji Cetak Bluetooth (${connectedName})`
                  : 'Uji Cetak Bluetooth (ESC/POS)'}
              </span>
            </button>
          </div>

          {/* 6. Keterangan Teknis & Keterbatasan Printer */}
          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 text-xs text-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />
                <span>Rekomendasi Printer Thermal HP Android:</span>
              </p>
              <a
                href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0"
              >
                <span>Unduh RawBT</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <ul className="text-[11px] text-emerald-900 list-disc list-inside space-y-1 leading-relaxed">
              <li>
                <strong>RawBT Print Service (Rekomendasi Utama)</strong>: Solusi terbaik untuk HP Android. Mendukung semua merk printer thermal Bluetooth 58mm &amp; 80mm (Panda, Eppos, GOOJPRT, VSC, Bella, Zywell, Kassen) serta kabel USB OTG.
              </li>
              <li>
                <strong>Web Bluetooth BLE</strong>: Khusus printer Bluetooth Low Energy (4.0/5.0) via browser Google Chrome Android.
              </li>
              <li>
                <strong>Cetak Universal / PDF</strong>: Berfungsi di semua HP/komputer tanpa perlu koneksi Bluetooth.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal Dialog Uji Cetak Struk (ReceiptView) */}
      {showTestReceipt && (
        <ReceiptView
          transaction={dummyTransaction}
          isOpen={showTestReceipt}
          onClose={() => setShowTestReceipt(false)}
        />
      )}
    </div>
  );
};
