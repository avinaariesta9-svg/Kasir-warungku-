import React, { useState } from 'react';
import {
  X,
  Upload,
  Download,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import { useTransactions } from '../context/TransactionContext';
import { DataService } from '../services/dataService';
import { Product } from '../types';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ isOpen, onClose }) => {
  const { user, store } = useAuth();
  const { products, bulkImportProducts } = useProducts();
  const { transactions } = useTransactions();

  const [activeSubTab, setActiveSubTab] = useState<'import' | 'backup' | 'restore'>('import');

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<Array<Omit<Product, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>> | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // JSON Restore State
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Status message
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Handle CSV file selection and parsing
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = DataService.parseProductCSV(text);
        setParsedPreview(parsed);
      } catch (err: unknown) {
        setStatus({
          type: 'error',
          text: (err as Error).message || 'Gagal membaca format CSV.',
        });
        setParsedPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!parsedPreview || parsedPreview.length === 0) return;
    setIsImporting(true);
    setStatus(null);
    try {
      const result = await bulkImportProducts(parsedPreview);
      setStatus({
        type: 'success',
        text: `Berhasil mengimpor! ${result.added} produk baru ditambahkan, ${result.updated} produk diperbarui (tanpa duplikat).`,
      });
      setParsedPreview(null);
      setCsvFile(null);
    } catch (err: unknown) {
      setStatus({
        type: 'error',
        text: (err as Error).message || 'Gagal menyimpan produk impor.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle Backup
  const handleDownloadBackup = () => {
    if (!store) return;
    try {
      DataService.createStoreBackup(store, products, transactions);
      setStatus({
        type: 'success',
        text: 'File cadangan data toko berhasil diunduh ke HP Anda.',
      });
    } catch (err: unknown) {
      setStatus({
        type: 'error',
        text: (err as Error).message || 'Gagal membuat backup data toko.',
      });
    }
  };

  // Handle Restore file selection
  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
  };

  const handleExecuteRestore = async () => {
    if (!restoreFile || !user) return;
    if (
      !window.confirm(
        'PERINGATAN: Memulihkan data cadangan akan memperbarui profil toko, produk, dan transaksi dari file. Lanjutkan?'
      )
    ) {
      return;
    }

    setIsRestoring(true);
    setStatus(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backupData = JSON.parse(text);
        const result = await DataService.restoreStoreBackup(backupData, user.uid);
        setStatus({
          type: 'success',
          text: `Data toko berhasil dipulihkan! (${result.productsCount} produk & ${result.transactionsCount} transaksi tersinkronisasi).`,
        });
        setRestoreFile(null);
      } catch (err: unknown) {
        setStatus({
          type: 'error',
          text: (err as Error).message || 'Gagal memulihkan data dari file backup.',
        });
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(restoreFile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-emerald-600 px-5 py-3.5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-bold text-base leading-tight">Pengelolaan & Backup Toko</h2>
              <p className="text-emerald-100 text-[11px]">Impor Excel, Ekspor & Pemulihan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-emerald-100 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveSubTab('import');
              setStatus(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeSubTab === 'import'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Impor Produk
          </button>

          <button
            onClick={() => {
              setActiveSubTab('backup');
              setStatus(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeSubTab === 'backup'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Backup Data
          </button>

          <button
            onClick={() => {
              setActiveSubTab('restore');
              setStatus(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              activeSubTab === 'restore'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Pemulihan
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800 flex-1">
          {/* Status Feedback Alert */}
          {status && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                status.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{status.text}</span>
            </div>
          )}

          {/* TAB 1: IMPOR PRODUK CSV */}
          {activeSubTab === 'import' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Format Template CSV</h4>
                    <p className="text-[11px] text-slate-500">
                      Unduh template untuk mengisi barang lewat Excel di HP/PC
                    </p>
                  </div>
                  <button
                    onClick={() => DataService.downloadProductCSVTemplate()}
                    className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition flex items-center gap-1 shrink-0 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Template</span>
                  </button>
                </div>
              </div>

              {/* Upload Input */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center bg-slate-50 hover:bg-slate-100/60 transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <FileSpreadsheet className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  {csvFile ? csvFile.name : 'Pilih File CSV Produk'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Format .csv (didukung Excel, WPS Office, Google Sheets)
                </p>
              </div>

              {/* Anti-Duplicate Rule Notice */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  <strong>Perlindungan Duplikasi:</strong> Jika produk dengan nama atau barcode yang sama sudah ada, data stok dan harga akan otomatis diperbarui tanpa membuat duplikat baru.
                </span>
              </div>

              {/* Preview parsed items */}
              {parsedPreview && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Pratinjau: {parsedPreview.length} Barang Siap Diimpor
                    </span>
                    <span className="text-[10px] text-slate-500">Kolom valid terdeteksi</span>
                  </div>

                  <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs bg-white">
                    {parsedPreview.slice(0, 5).map((p, i) => (
                      <div key={i} className="p-2 flex justify-between items-center">
                        <div className="truncate pr-2">
                          <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.category} • Stok: {p.stock}</p>
                        </div>
                        <span className="font-bold text-emerald-700 text-xs shrink-0">
                          Rp {p.sellingPrice.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                    {parsedPreview.length > 5 && (
                      <div className="p-1.5 text-center text-[10px] text-slate-400 italic">
                        + {parsedPreview.length - 5} produk lainnya...
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleExecuteImport}
                    disabled={isImporting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isImporting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Mulai Impor ke Toko ({parsedPreview.length} Barang)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BACKUP DATA TOKO */}
          {activeSubTab === 'backup' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <h4 className="text-xs font-bold text-slate-900">Cadangkan Seluruh Data Toko</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Backup mengamankan seluruh informasi warung Anda, termasuk profil toko, katalog seluruh barang, dan riwayat nota kasir ke dalam satu file berkas JSON.
                </p>
                <div className="pt-2 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Toko:</span>
                    <span className="font-semibold text-slate-800">{store?.storeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Produk:</span>
                    <span className="font-semibold text-slate-800">{products.length} barang</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Transaksi:</span>
                    <span className="font-semibold text-slate-800">{transactions.length} nota</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadBackup}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Cadangan Toko (JSON)</span>
              </button>
            </div>
          )}

          {/* TAB 3: PEMULIHAN (RESTORE) */}
          {activeSubTab === 'restore' && (
            <div className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/80 space-y-2">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  <span>Pemulihan Data Cadangan</span>
                </h4>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Gunakan fitur ini saat Anda berganti HP atau ingin mengembalikan data toko dari file cadangan JSON yang sebelumnya diunduh.
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center bg-slate-50 hover:bg-slate-100/60 transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Database className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  {restoreFile ? restoreFile.name : 'Pilih File Backup (.json)'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pilih file hasil cadangan Kasir Warungku
                </p>
              </div>

              <button
                onClick={handleExecuteRestore}
                disabled={!restoreFile || isRestoring}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-amber-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Pulihkan Data ke Toko</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
