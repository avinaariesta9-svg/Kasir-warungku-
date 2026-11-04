import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Camera,
  Tag,
  AlertTriangle,
  Edit2,
  Trash2,
  Layers,
  ArrowUpDown,
  Filter,
  CheckCircle,
  XCircle,
  Store,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import { Product, PRODUCT_CATEGORIES } from '../types';
import { ProductFormModal } from './ProductFormModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { BackupRestoreModal } from './BackupRestoreModal';
import { Upload } from 'lucide-react';

export const ProductList: React.FC = () => {
  const { store } = useAuth();
  const { products, loading, deleteProduct, lowStockProducts } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatRupiah = (val: number = 0) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filtered and Searched products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Filter category
      if (selectedCategory !== 'Semua' && p.category !== selectedCategory) {
        return false;
      }

      // Filter low stock
      if (onlyLowStock && p.stock > (p.minStock ?? 5)) {
        return false;
      }

      // Filter search (name or barcode)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = p.name?.toLowerCase().includes(query);
        const matchBarcode = p.barcode?.toLowerCase().includes(query);
        return matchName || matchBarcode;
      }

      return true;
    });
  }, [products, selectedCategory, onlyLowStock, searchQuery]);

  const handleDelete = async (p: Product) => {
    if (window.confirm(`Hapus produk "${p.name}" dari warung Anda?`)) {
      setDeletingId(p.id);
      try {
        await deleteProduct(p.id);
      } catch (e) {
        console.error(e);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const categoriesWithAll = ['Semua', ...PRODUCT_CATEGORIES];

  return (
    <div className="flex-1 flex flex-col pb-20">
      {/* Top Action Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-20 px-4 py-2.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate">
            <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{store?.storeName || 'Warung Saya'}</span>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold shrink-0">
            Katalog Produk & Stok
          </span>
        </div>

        {/* Search Input & Scan Camera */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama produk atau kode barcode..."
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
            onClick={() => setIsScannerOpen(true)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active:scale-95 shrink-0 flex items-center justify-center border border-slate-200"
            title="Scan Barcode untuk Cari"
            aria-label="Scan Barcode untuk Cari"
          >
            <Camera className="w-4 h-4 text-emerald-700" />
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active:scale-95 shrink-0 flex items-center justify-center border border-slate-200"
            title="Impor Produk dari CSV / Excel"
            aria-label="Impor Produk dari CSV / Excel"
          >
            <Upload className="w-4 h-4 text-emerald-700" />
          </button>

          <button
            onClick={() => {
              setProductToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-1.5 active:scale-95 transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Tambah</span>
          </button>
        </div>

        {/* Low stock alert banner filter if any */}
        {lowStockProducts.length > 0 && (
          <div className="mt-2.5">
            <button
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className={`w-full py-1.5 px-3 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                onlyLowStock
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <AlertTriangle className={`w-3.5 h-3.5 ${onlyLowStock ? 'text-white' : 'text-amber-600'}`} />
                <span>
                  <strong>{lowStockProducts.length} Produk</strong> stok menipis
                </span>
              </div>
              <span className="underline text-[11px]">
                {onlyLowStock ? 'Tampilkan Semua' : 'Lihat Produk'}
              </span>
            </button>
          </div>
        )}

        {/* Category Horizontal Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 pb-0.5 text-xs">
          {categoriesWithAll.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition shrink-0 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Memuat daftar produk...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 px-4 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Package className="w-7 h-7" />
            </div>
            {searchQuery || selectedCategory !== 'Semua' || onlyLowStock ? (
              <>
                <h4 className="font-bold text-slate-800 text-sm">Produk Tidak Ditemukan</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Tidak ada barang yang cocok dengan filter atau kata kunci pencarian.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('Semua');
                    setOnlyLowStock(false);
                  }}
                  className="mt-3 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Reset Pencarian
                </button>
              </>
            ) : (
              <>
                <h4 className="font-bold text-slate-800 text-sm">Belum Ada Produk di Warung</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Mulai catat barang dagangan Anda lengkap dengan harga modal, harga jual, dan jumlah stok.
                </p>
                <button
                  onClick={() => {
                    setProductToEdit(null);
                    setIsFormModalOpen(true);
                  }}
                  className="mt-4 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 inline-flex items-center gap-1.5 transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Produk Pertama</span>
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Menampilkan <strong className="text-slate-800">{filteredProducts.length}</strong> produk</span>
              {onlyLowStock && (
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold text-xs border border-amber-200">Filter: Stok Menipis</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = !isOutOfStock && product.stock <= (product.minStock ?? 5);

                return (
                  <div
                    key={product.id}
                    className={`bg-white p-3.5 rounded-2xl border transition shadow-xs flex flex-col justify-between gap-2 ${
                      isOutOfStock
                        ? 'border-red-200 bg-red-50/20'
                        : isLowStock
                        ? 'border-amber-200 bg-amber-50/10'
                        : 'border-slate-200/80 hover:border-emerald-300'
                    }`}
                  >
                    {/* Top row: Name, Category, Stock Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {product.category || 'Lainnya'}
                          </span>
                          {product.barcode && (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Barcode className="w-3 h-3 text-slate-400" />
                              <span>{product.barcode}</span>
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-1 leading-snug">
                          {product.name}
                        </h4>
                      </div>

                      {/* Stock Status Badge */}
                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <Layers className="w-3 h-3" />
                          <span>{product.stock} Pcs</span>
                        </span>
                        {isOutOfStock ? (
                          <p className="text-[10px] text-red-600 font-semibold mt-0.5">Stok Habis</p>
                        ) : isLowStock ? (
                          <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Stok Menipis</p>
                        ) : null}
                      </div>
                    </div>

                    {/* Middle row: Prices (Selling and Cost Price) */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs mt-auto">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Harga Jual</p>
                        <p className="font-black text-sm text-emerald-700">
                          {formatRupiah(product.sellingPrice)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Harga Beli (Modal)</p>
                        <p className="font-semibold text-xs text-slate-600">
                          {formatRupiah(product.costPrice)}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => {
                            setProductToEdit(product);
                            setIsFormModalOpen(true);
                          }}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition active:scale-95 cursor-pointer"
                          title="Edit Produk"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          disabled={deletingId === product.id}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-400 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
      />

      {/* Barcode Search Scanner */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => {
          setSearchQuery(code);
        }}
      />

      {/* Backup and Import Modal */}
      <BackupRestoreModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
