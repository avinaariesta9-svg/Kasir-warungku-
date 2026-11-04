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
}

export const ReceiptView: React.FC<ReceiptViewProps> = ({
  transaction,
  isOpen,
  onClose,
  onOpenPrinterSettings,
}) => {
  const { store } = useAuth();
  const { printerSettings } = useTransactions();

  const [isPrintingBt, setIsPrintingBt] = useState(false);
  const [printStatus, setPrintStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

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

  const handlePrintBluetooth = async () => {
    setPrintStatus(null);

    // Pastikan tidak mencoba memanggil Bluetooth jika belum terhubung
    if (!PrinterService.isConnected()) {
      setPrintStatus({
        type: 'error',
        message:
          'Printer Bluetooth belum tersambung. Buka menu "Atur Printer" untuk menghubungkan printer, atau gunakan tombol "Cetak Browser / Simpan PDF" di bawah.',
      });
      return;
    }

    setIsPrintingBt(true);
    try {
      const res = await PrinterService.printBluetooth(transaction, store);
      if (res.success) {
        setPrintStatus({
          type: 'success',
          message: 'Struk berhasil dikirim ke printer Bluetooth!',
        });
      } else {
        setPrintStatus({
          type: 'error',
          message: res.error || 'Gagal cetak Bluetooth. Gunakan alternatif Cetak Browser / Simpan PDF.',
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

  const handlePrintBrowser = () => {
    PrinterService.printBrowser();
  };

  const handleDownloadTxt = () => {
    try {
      PrinterService.downloadReceiptTxt(transaction, store, printerSettings.paperWidth);
      setPrintStatus({
        type: 'success',
        message: `File teks nota Struk-${transaction.invoiceNumber}.txt berhasil diunduh.`,
      });
    } catch (e: unknown) {
      setPrintStatus({
        type: 'error',
        message: (e as Error).message || 'Gagal mengunduh nota teks.',
      });
    }
  };

  const rawBtUrl = PrinterService.getRawBtUri(transaction, store, printerSettings.paperWidth);

  const dateFormatted = new Date(transaction.createdAt).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-emerald-600 px-4 py-3 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-white" />
            <div>
              <h3 className="font-bold text-sm leading-tight">Nota Transaksi</h3>
              <p className="text-[10px] text-emerald-100">{transaction.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-emerald-100 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Receipt Preview Body (Styled as 58mm/80mm thermal paper) */}
        <div className="p-4 overflow-y-auto max-h-[60vh] bg-slate-50 flex justify-center">
          <div
            id="thermal-receipt"
            className={`bg-white p-4 text-slate-800 shadow-sm border border-slate-200 font-mono text-xs leading-relaxed ${
              printerSettings.paperWidth === '80mm'
                ? 'w-[76mm] max-w-[80mm] receipt-80mm'
                : 'w-[56mm] max-w-[58mm] receipt-58mm'
            }`}
          >
            {/* Header Struk */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              <h4 className="font-extrabold text-sm uppercase text-slate-900 tracking-tight">
                {store?.storeName || 'KASIR WARUNGKU'}
              </h4>
              {store?.address && (
                <p className="text-[10px] text-slate-600 mt-0.5">{store.address}</p>
              )}
              {store?.whatsapp && (
                <p className="text-[10px] text-slate-600">WA: {store.whatsapp}</p>
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
                <span>Metode:</span>
                <span className="font-semibold">{transaction.paymentMethod}</span>
              </div>
            </div>

            {/* Daftar Barang */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-1.5 text-[11px]">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-semibold text-slate-900">{item.name}</div>
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

            {/* Ringkasan Total & Pembayaran */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-xs">
              <div className="flex justify-between text-[11px] text-slate-700">
                <span>Subtotal</span>
                <span>{formatRupiah(transaction.subtotal)}</span>
              </div>

              {transaction.discount && transaction.discount > 0 ? (
                <div className="flex justify-between text-[11px] text-red-600 font-semibold">
                  <span>Diskon</span>
                  <span>-{formatRupiah(transaction.discount)}</span>
                </div>
              ) : null}

              <div className="flex justify-between font-black text-slate-900 text-sm pt-0.5 border-t border-slate-200">
                <span>TOTAL BAYAR</span>
                <span>{formatRupiah(transaction.total)}</span>
              </div>

              {transaction.paymentMethod === 'TUNAI' ? (
                <>
                  <div className="flex justify-between text-[11px] text-slate-700">
                    <span>Tunai</span>
                    <span>{formatRupiah(transaction.cashAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-700 font-bold">
                    <span>Kembali</span>
                    <span>{formatRupiah(transaction.changeAmount)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                  <span>Status</span>
                  <span>LUNAS (QRIS)</span>
                </div>
              )}
            </div>

            {/* Footer Struk */}
            <div className="pt-3 text-center text-[10px] text-slate-500 space-y-0.5">
              <p className="font-semibold">Terima Kasih Atas Kunjungan Anda</p>
              <p>Barang yang dibeli tidak dapat ditukar</p>
              <p className="text-[9px] text-slate-400 mt-1">Kasir Warungku PWA</p>
            </div>
          </div>
        </div>

        {/* Print Feedback Status */}
        {printStatus && (
          <div
            className={`px-4 py-2 text-xs flex items-center gap-1.5 shrink-0 ${
              printStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-t border-emerald-200'
                : 'bg-red-50 text-red-800 border-t border-red-200'
            }`}
          >
            {printStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="text-[11px]">{printStatus.message}</span>
          </div>
        )}

        {/* Modal Actions / Print Options */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-2 shrink-0 print:hidden">
          {/* Action Utama: Cetak melalui Browser & Simpan PDF (100% universal: semua printer USB/WiFi/Thermal & PDF) */}
          <button
            onClick={handlePrintBrowser}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak melalui Browser / Simpan PDF</span>
          </button>

          {/* Opsi Tambahan: Bluetooth ESC/POS & Unduh Teks Nota */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrintBluetooth}
              disabled={isPrintingBt}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                isBtConnected
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title={
                isBtConnected
                  ? `Printer terhubung: ${connectedDeviceName}`
                  : 'Cetak langsung ke printer thermal Bluetooth BLE'
              }
            >
              <Bluetooth className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">
                {isPrintingBt ? 'Mengirim...' : isBtConnected ? 'Cetak Bluetooth' : 'Bluetooth ESC/POS'}
              </span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="py-2 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Unduh nota transaksi dalam format teks (.txt)"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Simpan .txt</span>
            </button>
          </div>

          {/* RawBT fallback link untuk printer Android Bluetooth Classic 2.0 */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-0.5">
            <span className="text-[10px] text-slate-400">Printer BT Classic?</span>
            <a
              href={rawBtUrl}
              className="text-emerald-700 hover:underline font-semibold flex items-center gap-1 text-[11px]"
              title="Buka struk lewat aplikasi RawBT Print Service di Android"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Cetak via RawBT</span>
            </a>
          </div>

          {/* Selesai / Transaksi Baru (Bisa dipakai tanpa printer) */}
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer mt-1"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Selesai & Transaksi Baru</span>
          </button>

          {onOpenPrinterSettings && (
            <button
              onClick={onOpenPrinterSettings}
              className="w-full text-center text-[11px] text-emerald-700 font-semibold hover:underline pt-0.5"
            >
              Atur Ukuran Kertas ({printerSettings.paperWidth}) & Koneksi Printer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
