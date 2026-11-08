import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  Printer,
  ChevronRight,
  Banknote,
  QrCode,
  Package,
  Store,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../context/TransactionContext';
import { Transaction } from '../types';
import { ReceiptView } from './ReceiptView';
import { PrinterSettingsModal } from './PrinterSettingsModal';
import { DataService } from '../services/dataService';

export const TransactionHistory: React.FC = () => {
  const { store } = useAuth();
  const { transactions, transactionsLoading } = useTransactions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const formatRupiah = (val: number = 0) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter(
      (t) =>
        t.invoiceNumber?.toLowerCase().includes(q) ||
        t.paymentMethod?.toLowerCase().includes(q) ||
        t.items?.some((i) => i.name?.toLowerCase().includes(q))
    );
  }, [transactions, searchQuery]);

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      setExportNotice({
        type: 'warning',
        message: searchQuery
          ? 'Tidak ada riwayat transaksi yang cocok dengan pencarian untuk diekspor.'
          : 'Belum ada riwayat transaksi penjualan untuk diekspor.',
      });
      setTimeout(() => setExportNotice(null), 5000);
      return;
    }

    try {
      DataService.exportTransactionHistoryToExcel(
        filteredTransactions,
        store?.storeName,
        searchQuery
      );
      setExportNotice({
        type: 'success',
        message: `File Excel (.xlsx) berhasil diunduh (${filteredTransactions.length} nota transaksi).`,
      });
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: unknown) {
      setExportNotice({
        type: 'error',
        message: (err as Error).message || 'Gagal mengekspor file Excel. Pastikan izin unduhan browser aktif.',
      });
      setTimeout(() => setExportNotice(null), 5000);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-24">
      {/* Top Search Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-20 px-4 py-2.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate">
            <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{store?.storeName || 'Warung Saya'}</span>
          </div>
          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold shrink-0">
            Riwayat Nota Transaksi
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor nota atau barang..."
              className="w-full pl-9 pr-8 py-2 bg-slate-100 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white border border-transparent focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setIsPrinterSettingsOpen(true)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active:scale-95 shrink-0 flex items-center justify-center border border-slate-200 cursor-pointer"
            title="Pengaturan Printer"
          >
            <Printer className="w-4 h-4 text-slate-700" />
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl transition active:scale-95 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer select-none shrink-0"
            title="Ekspor Riwayat Transaksi ke Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor Excel</span>
            <span className="sm:hidden">Excel</span>
          </button>
        </div>

        {/* Pemberitahuan Ekspor Excel */}
        {exportNotice && (
          <div
            className={`p-2.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2 shadow-xs transition-all ${
              exportNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : exportNotice.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border border-amber-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {exportNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="leading-snug">{exportNotice.message}</span>
            </div>
            <button
              onClick={() => setExportNotice(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* List of Invoices */}
      <div className="p-4 space-y-3 flex-1">
        {transactionsLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Memuat riwayat transaksi...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 px-4 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <Receipt className="w-12 h-12 mx-auto text-slate-400 mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">Belum Ada Transaksi</h4>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery
                ? 'Tidak ada nota yang cocok dengan pencarian.'
                : 'Mulai buat transaksi penjualan kasir di menu Kasir.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Menampilkan <strong className="text-slate-800">{filteredTransactions.length}</strong> nota transaksi</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-emerald-200">
                Tersinkron Cloud Firestore
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredTransactions.map((tx) => {
                const dateFormatted = new Date(tx.createdAt).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const totalQty = tx.items?.reduce((sum, item) => sum + (item.qty || 1), 0) || 0;

                return (
                  <div
                    key={tx.id}
                    onClick={() => {
                      setSelectedTx(tx);
                      setIsReceiptOpen(true);
                    }}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200/80 hover:border-emerald-400 transition shadow-xs flex items-center justify-between gap-3 cursor-pointer active:scale-98"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 font-mono">
                          {tx.invoiceNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            tx.paymentMethod === 'TUNAI'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {tx.paymentMethod === 'TUNAI' ? (
                            <Banknote className="w-3 h-3" />
                          ) : (
                            <QrCode className="w-3 h-3" />
                          )}
                          <span>{tx.paymentMethod}</span>
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{dateFormatted}</span>
                        <span>•</span>
                        <span>{totalQty} barang</span>
                      </p>

                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {tx.items?.map((i) => `${i.name} (${i.qty})`).join(', ')}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <p className="text-sm font-black text-emerald-700">
                        {formatRupiah(tx.total)}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTx(tx);
                          setIsReceiptOpen(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold border border-emerald-200 flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                        title="Cetak Ulang Struk Transaksi"
                      >
                        <Printer className="w-3 h-3 text-emerald-600" />
                        <span>Cetak Ulang</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal for historical transaction */}
      {selectedTx && (
        <ReceiptView
          isOpen={isReceiptOpen}
          transaction={selectedTx}
          initialIsReprint={true}
          onClose={() => {
            setIsReceiptOpen(false);
            setSelectedTx(null);
          }}
          onOpenPrinterSettings={() => {
            setIsReceiptOpen(false);
            setIsPrinterSettingsOpen(true);
          }}
        />
      )}

      {/* Printer Settings Modal */}
      <PrinterSettingsModal
        isOpen={isPrinterSettingsOpen}
        onClose={() => setIsPrinterSettingsOpen(false)}
      />
    </div>
  );
};
