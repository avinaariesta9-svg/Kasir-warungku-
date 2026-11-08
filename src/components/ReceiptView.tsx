import React, { useState } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  Share2,
  Smartphone,
  ExternalLink,
  Bluetooth,
  RotateCcw,
  HelpCircle,
  Settings,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { Transaction, StoreProfile, PrinterSettings } from '../types';
import { PrinterService } from '../services/printerService';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../context/TransactionContext';

interface ReceiptViewProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onOpenPrinterSettings?: () => void;
  initialIsReprint?: boolean;
}

export const ReceiptView: React.FC<ReceiptViewProps> = ({
  transaction,
  isOpen,
  onClose,
  onOpenPrinterSettings,
  initialIsReprint = false,
}) => {
  const { store } = useAuth();
  const { printerSettings, updatePrinterSettings } = useTransactions();

  const [isPrintingBt, setIsPrintingBt] = useState(false);
  const [isPrintingRawBt, setIsPrintingRawBt] = useState(false);
  const [isReprint, setIsReprint] = useState(initialIsReprint);
  const [reprintCount, setReprintCount] = useState(initialIsReprint ? 1 : 0);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [printStatus, setPrintStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const currentPaperWidth = printerSettings.paperWidth || '58mm';
  const isBtConnected = PrinterService.isConnected();
  const connectedDeviceName = PrinterService.getConnectedDeviceName();

  const formatRupiah = (val: number = 0) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleTogglePaperWidth = (width: '58mm' | '80mm') => {
    updatePrinterSettings({ paperWidth: width });
    setPrintStatus({
      type: 'info',
      message: `Ukuran kertas diatur ke ${width} (${width === '80mm' ? '48 kolom' : '32 kolom'}).`,
    });
    setTimeout(() => setPrintStatus(null), 3000);
  };

  // 1. Cetak via RawBT (Pilihan Utama HP Android untuk Printer Thermal Bluetooth & USB)
  const handlePrintRawBt = (asReprint: boolean = isReprint) => {
    setPrintStatus(null);
    setIsPrintingRawBt(true);

    try {
      const result = PrinterService.printRawBt(
        transaction,
        store,
        currentPaperWidth,
        asReprint
      );

      if (result.success) {
        if (asReprint) {
          setReprintCount((prev) => prev + 1);
        }
        setPrintStatus({
          type: 'success',
          message: 'Perintah cetak struk ESC/POS dikirim ke aplikasi RawBT Android!',
        });
      } else {
        setPrintStatus({
          type: 'error',
          message: result.error || 'Gagal membuka RawBT. Pastikan aplikasi RawBT terpasang di HP.',
        });
      }
    } catch (e: unknown) {
      setPrintStatus({
        type: 'error',
        message: (e as Error).message || 'Terjadi kendala saat membuka RawBT.',
      });
    } finally {
      setTimeout(() => setIsPrintingRawBt(false), 800);
    }
  };

  // 2. Cetak langsung via Web Bluetooth (BLE ESC/POS)
  const handlePrintBluetooth = async (asReprint: boolean = isReprint) => {
    setPrintStatus(null);

    if (!PrinterService.isConnected()) {
      setPrintStatus({
        type: 'error',
        message:
          'Printer Bluetooth belum terhubung. Buka petunjuk menghubungkan printer di bawah atau gunakan tombol Cetak via RawBT.',
      });
      setShowGuideModal(true);
      return;
    }

    setIsPrintingBt(true);
    try {
      const res = await PrinterService.printBluetooth(transaction, store, asReprint);
      if (res.success) {
        if (asReprint) {
          setReprintCount((prev) => prev + 1);
        }
        setPrintStatus({
          type: 'success',
          message: `Struk berhasil dikirim ke printer Bluetooth ${connectedDeviceName || ''}!`,
        });
      } else {
        setPrintStatus({
          type: 'error',
          message: res.error || 'Gagal mengirim ke printer Bluetooth. Coba Cetak via RawBT.',
        });
      }
    } catch (e: unknown) {
      setPrintStatus({
        type: 'error',
        message: (e as Error).message || 'Terjadi kesalahan pada printer Bluetooth.',
      });
    } finally {
      setIsPrintingBt(false);
    }
  };

  // 3. Tombol Cetak Ulang Struk (Reprint)
  const handleReprintReceipt = () => {
    setIsReprint(true);
    // Jalankan cetak dengan flag reprint
    handlePrintRawBt(true);
  };

  // 4. Cetak Universal Browser (Semua printer & simpan PDF)
  const handlePrintBrowser = () => {
    PrinterService.printBrowser();
  };

  // 5. Unduh nota teks
  const handleDownloadTxt = () => {
    try {
      PrinterService.downloadReceiptTxt(transaction, store, currentPaperWidth, isReprint);
      setPrintStatus({
        type: 'success',
        message: `File struk Struk-${transaction.invoiceNumber}.txt berhasil diunduh.`,
      });
    } catch (e: unknown) {
      setPrintStatus({
        type: 'error',
        message: (e as Error).message || 'Gagal mengunduh file nota teks.',
      });
    }
  };

  // 6. Bagikan struk ke WhatsApp pelanggan
  const handleShareWhatsApp = () => {
    try {
      const receiptText = PrinterService.generateReceiptText(
        transaction,
        store,
        currentPaperWidth,
        isReprint
      );
      const encoded = encodeURIComponent(receiptText);
      const waUrl = `https://wa.me/?text=${encoded}`;
      window.open(waUrl, '_blank');
      setPrintStatus({
        type: 'success',
        message: 'Membuka WhatsApp untuk mengirim struk teks ke pelanggan.',
      });
    } catch (e: unknown) {
      setPrintStatus({
        type: 'error',
        message: (e as Error).message || 'Gagal membagikan struk ke WhatsApp.',
      });
    }
  };

  const rawBtDirectUri = PrinterService.getRawBtUri(
    transaction,
    store,
    currentPaperWidth,
    isReprint
  );

  const dateFormatted = new Date(transaction.createdAt).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95 max-h-[96vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm leading-tight">Nota Transaksi Kasir</h3>
                {isReprint && (
                  <span className="px-1.5 py-0.2 bg-amber-400 text-amber-950 font-black text-[9px] rounded-md uppercase">
                    Salinan #{reprintCount || 1}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-emerald-100">{transaction.invoiceNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowGuideModal(true)}
              className="p-1.5 rounded-full hover:bg-white/20 transition text-emerald-100 hover:text-white"
              title="Petunjuk Printer Android"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 transition text-emerald-100 hover:text-white"
              title="Tutup Nota"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-bar: Status Transaksi & Pengatur Lebar Kertas (58mm / 80mm) */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 text-xs print:hidden">
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Transaksi Sukses</span>
          </div>

          {/* Selector Ukuran Kertas Cepat */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => handleTogglePaperWidth('58mm')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                currentPaperWidth === '58mm'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              58 mm
            </button>
            <button
              type="button"
              onClick={() => handleTogglePaperWidth('80mm')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                currentPaperWidth === '80mm'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              80 mm
            </button>
          </div>
        </div>

        {/* Preview Struk Kertas Thermal (Sesuai 58mm atau 80mm) */}
        <div className="p-3 sm:p-4 overflow-y-auto max-h-[50vh] sm:max-h-[52vh] bg-slate-100 flex justify-center">
          <div
            id="thermal-receipt"
            className={`bg-white p-3.5 sm:p-4 text-slate-800 shadow-md border border-slate-200 font-mono text-xs leading-relaxed transition-all duration-200 ${
              currentPaperWidth === '80mm'
                ? 'w-[78mm] max-w-[80mm] receipt-80mm'
                : 'w-[56mm] max-w-[58mm] receipt-58mm'
            }`}
          >
            {/* Header Toko */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              <h4 className="font-extrabold text-sm uppercase text-slate-900 tracking-tight">
                {store?.storeName || 'KASIR WARUNGKU'}
              </h4>
              <p className="text-[10px] text-slate-600 mt-0.5">
                {store?.address || 'Kasir WarungKu Mobile POS'}
              </p>
              {store?.whatsapp && (
                <p className="text-[10px] text-slate-600">WA: {store.whatsapp}</p>
              )}
              {isReprint && (
                <div className="mt-1 py-0.5 px-2 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-sm tracking-wider uppercase inline-block">
                  *** SALINAN / CETAK ULANG ***
                </div>
              )}
            </div>

            {/* Info Transaksi */}
            <div className="py-2 text-[10px] border-b border-dashed border-slate-400 space-y-0.5">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-semibold">{transaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>{dateFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{store?.ownerName || 'Warung'}</span>
              </div>
              <div className="flex justify-between">
                <span>Metode:</span>
                <span className="font-semibold">{transaction.paymentMethod}</span>
              </div>
            </div>

            {/* Daftar Barang Belanja */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-1.5 text-[11px]">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-semibold text-slate-900 break-words">{item.name}</div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>
                      {item.qty} x {formatRupiah(item.price)}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Ringkasan Subtotal, Diskon, Total Bayar, Tunai & Kembalian */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-xs">
              <div className="flex justify-between text-[11px] text-slate-700">
                <span>Subtotal</span>
                <span>{formatRupiah(transaction.subtotal)}</span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-700">
                <span>Diskon</span>
                <span className={transaction.discount && transaction.discount > 0 ? 'text-red-600 font-semibold' : ''}>
                  {transaction.discount && transaction.discount > 0
                    ? `-${formatRupiah(transaction.discount)}`
                    : 'Rp 0'}
                </span>
              </div>

              <div className="flex justify-between font-black text-slate-900 text-sm pt-0.5 border-t border-slate-200">
                <span>TOTAL BAYAR</span>
                <span>{formatRupiah(transaction.total)}</span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-700">
                <span>Pembayaran ({transaction.paymentMethod})</span>
                <span className="font-semibold text-slate-900">
                  {transaction.paymentMethod === 'TUNAI'
                    ? formatRupiah(transaction.cashAmount)
                    : formatRupiah(transaction.total)}
                </span>
              </div>

              <div className="flex justify-between text-[11px] text-slate-800 font-bold">
                <span>Kembalian</span>
                <span>
                  {transaction.paymentMethod === 'TUNAI'
                    ? formatRupiah(transaction.changeAmount)
                    : 'Rp 0'}
                </span>
              </div>
            </div>

            {/* Footer Struk */}
            <div className="pt-2 text-center text-[10px] text-slate-500 space-y-0.5">
              <p className="font-semibold">Terima Kasih Atas Kunjungan Anda</p>
              <p>Barang yang dibeli tidak dapat ditukar</p>
              <p className="text-[9px] text-slate-400 mt-1">Kasir WarungKu Mobile POS</p>
            </div>
          </div>
        </div>

        {/* Feedback Pesan Status Print */}
        {printStatus && (
          <div
            className={`px-4 py-2 text-xs flex items-center gap-2 shrink-0 ${
              printStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-t border-emerald-200'
                : printStatus.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-t border-blue-200'
                : 'bg-rose-50 text-rose-800 border-t border-rose-200'
            }`}
          >
            {printStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : printStatus.type === 'info' ? (
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="text-[11px] leading-snug">{printStatus.message}</span>
          </div>
        )}

        {/* Banner Panduan Jika Printer Belum Terhubung */}
        {!isBtConnected && (
          <div className="px-4 py-2 bg-amber-50/90 border-t border-amber-200 flex items-center justify-between gap-2 shrink-0 text-[11px] text-amber-900 print:hidden">
            <div className="flex items-center gap-1.5 min-w-0">
              <HelpCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="truncate">Printer belum terhubung ke Bluetooth?</span>
            </div>
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="text-emerald-700 font-bold hover:underline shrink-0 cursor-pointer"
            >
              Lihat Panduan
            </button>
          </div>
        )}

        {/* Bagian Tombol Aksi Cetak Utama untuk HP Android */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-2 shrink-0 print:hidden">
          {/* Tombol Utama 1: Cetak via RawBT (Paling dioptimalkan untuk Android) */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handlePrintRawBt(isReprint)}
              disabled={isPrintingRawBt}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Smartphone className="w-4 h-4" />
              <span>
                {isPrintingRawBt ? 'Mengirim ke RawBT...' : 'Cetak Struk via RawBT (Android)'}
              </span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-normal">
                {currentPaperWidth}
              </span>
            </button>
          </div>

          {/* Tombol Baris 2: Cetak Bluetooth Langsung & Tombol Cetak Ulang Struk */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handlePrintBluetooth(isReprint)}
              disabled={isPrintingBt}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                isBtConnected
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title={
                isBtConnected
                  ? `Printer terhubung: ${connectedDeviceName}`
                  : 'Cetak langsung ke printer Bluetooth BLE'
              }
            >
              <Bluetooth className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">
                {isPrintingBt ? 'Mengirim...' : isBtConnected ? 'Cetak Bluetooth' : 'Bluetooth ESC/POS'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleReprintReceipt}
              className="py-2 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Cetak ulang struk sebagai salinan nota"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Cetak Ulang</span>
            </button>
          </div>

          {/* Tombol Baris 3: Cetak Browser / PDF, Kirim WhatsApp & Simpan .txt */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={handlePrintBrowser}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
              title="Cetak lewat dialog printer browser atau simpan PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="truncate">Cetak/PDF</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
              title="Bagikan struk teks ke WhatsApp pelanggan"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
              title="Unduh nota transaksi dalam format teks (.txt)"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span className="truncate">Simpan .txt</span>
            </button>
          </div>

          {/* Fallback Tautan Langsung RawBT */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 px-1">
            <a
              href={rawBtDirectUri}
              className="text-emerald-700 hover:underline font-semibold flex items-center gap-1 text-[11px]"
              title="Tautan langsung intent RawBT Android"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Buka RawBT langsung</span>
            </a>

            {onOpenPrinterSettings && (
              <button
                type="button"
                onClick={onOpenPrinterSettings}
                className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>Atur Printer</span>
              </button>
            )}
          </div>

          {/* Tombol Utama: Selesai & Transaksi Baru */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-black active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer mt-1"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Selesai & Transaksi Baru</span>
          </button>
        </div>
      </div>

      {/* Modal Petunjuk Menghubungkan Printer HP Android */}
      {showGuideModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="bg-emerald-600 px-5 py-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-100" />
                <div>
                  <h4 className="font-bold text-sm">Panduan Printer Thermal Android</h4>
                  <p className="text-[10px] text-emerald-100">Koneksi Bluetooth 58mm & 80mm</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-full hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-700">
              {/* Cara 1: RawBT (Sangat Direkomendasikan) */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 flex items-center gap-1">
                    <Smartphone className="w-4 h-4 text-emerald-700" />
                    <span>Cara 1: Gunakan Aplikasi RawBT (Rekomendasi)</span>
                  </span>
                  <span className="text-[9px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.2 rounded-md">
                    Paling Stabil
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Aplikasi RawBT mendukung semua merk printer thermal mini (Panda, Eppos, GOOJPRT, VSC, Bella, Zywell, Iware, Kassen, dll).
                </p>
                <ol className="list-decimal list-inside text-[11px] text-emerald-900 space-y-1 font-medium">
                  <li>
                    Pasang aplikasi gratis <strong>RawBT Print Service</strong> dari Google Play Store.
                  </li>
                  <li>
                    Nyalakan printer & Bluetooth HP, sandingkan / pairing perangkat (PIN default: <strong>0000</strong> atau <strong>1234</strong>).
                  </li>
                  <li>
                    Buka RawBT &gt; Settings &gt; Pilih printer Bluetooth Anda.
                  </li>
                  <li>
                    Kembali ke Kasir WarungKu, lalu tekan tombol <strong>"Cetak Struk via RawBT"</strong>. Struk langsung tercetak!
                  </li>
                </ol>
                <a
                  href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] rounded-xl shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka RawBT di Play Store</span>
                </a>
              </div>

              {/* Cara 2: Web Bluetooth Langsung */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <Bluetooth className="w-4 h-4 text-blue-600" />
                  <span>Cara 2: Web Bluetooth Langsung (Google Chrome)</span>
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Untuk printer yang mendukung Bluetooth Low Energy (BLE):
                </p>
                <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-1">
                  <li>Aktifkan Bluetooth dan Lokasi/GPS di HP Android Anda.</li>
                  <li>Buka Pengaturan Printer, lalu tekan <strong>"Pilih & Hubungkan Printer"</strong>.</li>
                  <li>Pilih printer thermal Anda dari daftar perangkat Chrome.</li>
                </ul>
              </div>

              {/* Cara 3: Cetak Browser & Simpan PDF */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <Printer className="w-4 h-4 text-slate-700" />
                  <span>Cara 3: Cetak Browser / PDF / WhatsApp</span>
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Jika belum memiliki printer fisik, Anda dapat menekan tombol <strong>Cetak/PDF</strong> untuk mencetak ke printer WiFi/kabel, atau tekan <strong>WhatsApp</strong> untuk mengirim nota langsung ke pelanggan.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
