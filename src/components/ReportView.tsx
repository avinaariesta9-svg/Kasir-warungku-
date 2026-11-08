import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Package,
  Calendar,
  Download,
  Database,
  ArrowUpRight,
  Filter,
  BarChart3,
  Award,
  Clock,
  Printer,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { Transaction, ReportFilter, SalesReportSummary } from '../types';
import { DataService } from '../services/dataService';
import { ReceiptView } from './ReceiptView';
import { BackupRestoreModal } from './BackupRestoreModal';

export const ReportView: React.FC = () => {
  const { transactions, transactionsLoading } = useTransactions();
  const { store } = useAuth();

  const [period, setPeriod] = useState<ReportFilter['period']>('today');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
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

  // Filter transactions based on date
  const filteredTransactions = useMemo(() => {
    const now = new Date();

    return transactions.filter((tx) => {
      const txDate = new Date(tx.createdAt);

      if (period === 'today') {
        return (
          txDate.getDate() === now.getDate() &&
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      }

      if (period === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return txDate >= sevenDaysAgo;
      }

      if (period === 'month') {
        return (
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      }

      if (period === 'custom') {
        if (!customStart || !customEnd) return true;
        const start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        return txDate >= start && txDate <= end;
      }

      return true;
    });
  }, [transactions, period, customStart, customEnd]);

  // Aggregate Sales Summary & Profit based on COST PRICE recorded at transaction time!
  const reportSummary: SalesReportSummary = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let itemsSoldCount = 0;
    const productSalesMap: Record<
      string,
      { productId: string; name: string; qtySold: number; revenue: number; profit: number }
    > = {};

    filteredTransactions.forEach((tx) => {
      totalRevenue += tx.total || 0;

      tx.items.forEach((item) => {
        const itemQty = Number(item.qty) || 1;
        const itemSellingPrice = Number(item.price) || 0;
        // CRITICAL CONSTRAINT: Must use recorded costPrice at the time of transaction
        const itemCostPrice = Number(item.costPrice) || 0;

        const subtotalRevenue = itemSellingPrice * itemQty;
        const subtotalCost = itemCostPrice * itemQty;
        const subtotalProfit = subtotalRevenue - subtotalCost;

        totalCost += subtotalCost;
        itemsSoldCount += itemQty;

        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            productId: item.productId,
            name: item.name,
            qtySold: 0,
            revenue: 0,
            profit: 0,
          };
        }

        productSalesMap[item.productId].qtySold += itemQty;
        productSalesMap[item.productId].revenue += subtotalRevenue;
        productSalesMap[item.productId].profit += subtotalProfit;
      });
    });

    const totalProfit = totalRevenue - totalCost;

    // Rank top selling products by quantity sold
    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, 10);

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      transactionCount: filteredTransactions.length,
      itemsSoldCount,
      topProducts,
    };
  }, [filteredTransactions]);

  const dateLabel = useMemo(() => {
    if (period === 'today') return 'Hari Ini';
    if (period === '7days') return '7 Hari Terakhir';
    if (period === 'month') return 'Bulan Ini';
    return `${customStart} s/d ${customEnd}`;
  }, [period, customStart, customEnd]);

  const profitMarginPercent = useMemo(() => {
    if (reportSummary.totalRevenue <= 0) return 0;
    return Math.round((reportSummary.totalProfit / reportSummary.totalRevenue) * 100);
  }, [reportSummary]);

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      setExportNotice({
        type: 'warning',
        message: 'Tidak ada data transaksi penjualan pada periode ini. Silakan ubah filter tanggal atau lakukan penjualan terlebih dahulu.',
      });
      setTimeout(() => setExportNotice(null), 5000);
      return;
    }

    try {
      DataService.exportSalesReportToExcel(
        filteredTransactions,
        dateLabel,
        reportSummary,
        store?.storeName
      );
      setExportNotice({
        type: 'success',
        message: `File Excel (.xlsx) berhasil diunduh (${filteredTransactions.length} nota transaksi).`,
      });
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: unknown) {
      setExportNotice({
        type: 'error',
        message: (err as Error).message || 'Gagal mengekspor file Excel. Pastikan izin unduhan browser diizinkan.',
      });
      setTimeout(() => setExportNotice(null), 5000);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-24 text-slate-800 font-sans">
      {/* Top Header Filter Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-20 px-4 py-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                Laporan Keuangan & Laba
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              {store?.storeName || 'Warung Saya'}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active:scale-95 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Kelola Data & Backup"
            >
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden xs:inline">Pengelolaan</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl transition active:scale-95 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer select-none"
              title="Ekspor Laporan ke Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </button>
          </div>
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

        {/* Filter Period Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setPeriod('today')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold transition ${
              period === 'today'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hari Ini
          </button>

          <button
            onClick={() => setPeriod('7days')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold transition ${
              period === '7days'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            7 Hari Terakhir
          </button>

          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold transition ${
              period === 'month'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Bulan Ini
          </button>

          <button
            onClick={() => setPeriod('custom')}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap font-semibold transition ${
              period === 'custom'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pilih Tanggal
          </button>
        </div>

        {/* Custom Date Pickers */}
        {period === 'custom' && (
          <div className="pt-1 flex items-center gap-2 text-xs">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Dari:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Sampai:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Report Scroll */}
      <div className="p-4 space-y-4 flex-1">
        {/* Periode Badge */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="flex items-center gap-1 font-semibold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Periode: {dateLabel}</span>
          </span>
          <span className="text-emerald-700 font-bold">
            {filteredTransactions.length} Transaksi
          </span>
        </div>

        {/* Main Metric Highlight Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Omzet / Penjualan */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4.5 rounded-3xl shadow-sm col-span-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                Total Omzet / Penjualan
              </span>
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black my-2">
              {formatRupiah(reportSummary.totalRevenue)}
            </div>
            <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs text-emerald-100">
              <span>{reportSummary.transactionCount} Transaksi Berhasil</span>
              <span>{reportSummary.itemsSoldCount} Item Terjual</span>
            </div>
          </div>

          {/* Card 2: Total Modal (HPP) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 block leading-tight">
                Total Modal (HPP)
              </span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-800 my-1 truncate">
              {formatRupiah(reportSummary.totalCost)}
            </div>
            <span className="text-[10px] text-slate-400 block">
              Modal tercatat saat transaksi
            </span>
          </div>

          {/* Card 3: Keuntungan Bersih (Laba) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 block leading-tight">
                Keuntungan Bersih
              </span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 my-1 truncate">
              {formatRupiah(reportSummary.totalProfit)}
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded w-fit">
              Margin {profitMarginPercent}%
            </span>
          </div>
        </div>

        {/* Responsive Grid for Produk Terlaris & Daftar Penjualan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Section 2: Produk Terlaris (Top Selling Products) */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Produk Terlaris</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Berdasarkan Qty</span>
            </div>

            {reportSummary.topProducts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada penjualan produk pada periode ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {reportSummary.topProducts.map((p, idx) => (
                  <div key={p.productId} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-950 shadow-xs'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-900'
                            : idx === 2
                            ? 'bg-amber-700/30 text-amber-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate leading-snug">{p.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {p.qtySold} terjual • Laba {formatRupiah(p.profit)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-900 text-xs">{formatRupiah(p.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Rincian Riwayat Transaksi dalam Periode */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Daftar Penjualan ({filteredTransactions.length})</span>
              </h4>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada riwayat penjualan pada tanggal yang dipilih.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredTransactions.map((tx) => {
                  const txProfit =
                    tx.total -
                    (tx.items?.reduce(
                      (acc, curr) => acc + (Number(curr.costPrice) || 0) * (Number(curr.qty) || 1),
                      0
                    ) || 0);

                  const dateFormatted = new Date(tx.createdAt).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        setSelectedTx(tx);
                        setIsReceiptOpen(true);
                      }}
                      className="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl border border-slate-200/70 transition flex items-center justify-between gap-2 cursor-pointer active:scale-98"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-slate-900">
                            {tx.invoiceNumber}
                          </span>
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                            {tx.paymentMethod}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{dateFormatted}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-slate-900">{formatRupiah(tx.total)}</p>
                        <p className="text-[10px] text-emerald-700 font-bold">
                          Laba +{formatRupiah(txProfit)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Cetak Nota jika diklik */}
      {selectedTx && (
        <ReceiptView
          isOpen={isReceiptOpen}
          transaction={selectedTx}
          initialIsReprint={true}
          onClose={() => {
            setIsReceiptOpen(false);
            setSelectedTx(null);
          }}
        />
      )}

      {/* Modal Pengelolaan & Backup Toko */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
};
