import { Product, StoreProfile, Transaction, StoreBackupData } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export class DataService {
  // Helper download file teks / CSV
  static triggerDownload(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // Helper download file biner (Excel .xlsx) yang aman untuk Android & PC
  static triggerBinaryDownload(
    buffer: unknown,
    filename: string,
    mimeType: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    const blob = new Blob([buffer as BlobPart], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 1500);
  }

  // 1. Ekspor Laporan Penjualan ke format Excel .xlsx (Microsoft Excel & Google Sheets)
  static exportSalesReportToExcel(
    transactions: Transaction[],
    dateRangeLabel: string,
    summary: { totalRevenue: number; totalCost: number; totalProfit: number },
    storeName?: string
  ): void {
    if (!transactions || transactions.length === 0) {
      throw new Error('Data transaksi kosong pada periode ini.');
    }

    const formatRpNumber = (num: number = 0) => Math.round(num);

    const rows: (string | number)[][] = [
      ['LAPORAN PENJUALAN - KASIR WARUNGKU'],
      ['Nama Toko', storeName || 'WarungKu'],
      ['Periode Laporan', dateRangeLabel],
      ['Tanggal Unduh', new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })],
      ['Total Transaksi', `${transactions.length} Nota`],
      ['Total Omzet / Penjualan (Rp)', formatRpNumber(summary.totalRevenue)],
      ['Total Modal HPP (Rp)', formatRpNumber(summary.totalCost)],
      ['Total Keuntungan Bersih (Rp)', formatRpNumber(summary.totalProfit)],
      [], // baris kosong
      [
        'No Nota',
        'Tanggal & Waktu',
        'Metode Pembayaran',
        'Nama Produk / Barang',
        'Jumlah (Qty)',
        'Harga Jual Satuan (Rp)',
        'Total Penjualan (Rp)',
        'Harga Modal Satuan (Rp)',
        'Total Modal (Rp)',
        'Keuntungan Bersih (Rp)',
      ],
    ];

    transactions.forEach((tx) => {
      const dateFormatted = new Date(tx.createdAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      tx.items.forEach((item) => {
        const itemSellingTotal = item.subtotal || item.price * item.qty;
        const itemCostTotal = (item.costPrice || 0) * item.qty;
        const itemProfit = itemSellingTotal - itemCostTotal;

        rows.push([
          tx.invoiceNumber,
          dateFormatted,
          tx.paymentMethod,
          item.name,
          item.qty,
          formatRpNumber(item.price),
          formatRpNumber(itemSellingTotal),
          formatRpNumber(item.costPrice || 0),
          formatRpNumber(itemCostTotal),
          formatRpNumber(itemProfit),
        ]);
      });
    });

    const wb = XLSX.utils.book_new();
    const wsSales = XLSX.utils.aoa_to_sheet(rows);

    // Atur lebar kolom agar rapi dan terbaca jelas
    wsSales['!cols'] = [
      { wch: 18 }, // No Nota
      { wch: 22 }, // Tanggal & Waktu
      { wch: 18 }, // Metode Pembayaran
      { wch: 28 }, // Nama Produk
      { wch: 14 }, // Qty
      { wch: 22 }, // Harga Jual Satuan
      { wch: 22 }, // Total Penjualan
      { wch: 22 }, // Harga Modal Satuan
      { wch: 20 }, // Total Modal
      { wch: 22 }, // Keuntungan Bersih
    ];

    XLSX.utils.book_append_sheet(wb, wsSales, 'Laporan Penjualan');

    // Sheet 2: Ringkasan Produk Terlaris
    const productSalesMap: Record<
      string,
      { name: string; qtySold: number; revenue: number; profit: number }
    > = {};

    transactions.forEach((tx) => {
      tx.items.forEach((item) => {
        const itemSellingTotal = item.subtotal || item.price * item.qty;
        const itemCostTotal = (item.costPrice || 0) * item.qty;
        const itemProfit = itemSellingTotal - itemCostTotal;

        const key = item.productId || item.name;
        if (!productSalesMap[key]) {
          productSalesMap[key] = {
            name: item.name,
            qtySold: 0,
            revenue: 0,
            profit: 0,
          };
        }
        productSalesMap[key].qtySold += item.qty;
        productSalesMap[key].revenue += itemSellingTotal;
        productSalesMap[key].profit += itemProfit;
      });
    });

    const topProducts = Object.values(productSalesMap).sort((a, b) => b.qtySold - a.qtySold);
    if (topProducts.length > 0) {
      const topRows: (string | number)[][] = [
        ['RINGKASAN PENJUALAN PER PRODUK'],
        ['Periode', dateRangeLabel],
        [],
        ['Peringkat', 'Nama Produk', 'Jumlah Terjual (Qty)', 'Total Omzet (Rp)', 'Total Keuntungan (Rp)'],
      ];

      topProducts.forEach((p, idx) => {
        topRows.push([
          idx + 1,
          p.name,
          p.qtySold,
          formatRpNumber(p.revenue),
          formatRpNumber(p.profit),
        ]);
      });

      const wsTop = XLSX.utils.aoa_to_sheet(topRows);
      wsTop['!cols'] = [
        { wch: 10 },
        { wch: 32 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(wb, wsTop, 'Ringkasan Produk');
    }

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const cleanStore = (storeName || 'WarungKu').replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    this.triggerBinaryDownload(
      excelBuffer,
      `Laporan_Penjualan_${cleanStore}_${dateStr}.xlsx`
    );
  }

  // 2. Ekspor Riwayat Transaksi ke format Excel .xlsx (Microsoft Excel & Google Sheets)
  static exportTransactionHistoryToExcel(
    transactions: Transaction[],
    storeName?: string,
    searchQuery?: string
  ): void {
    if (!transactions || transactions.length === 0) {
      throw new Error('Riwayat transaksi kosong.');
    }

    const formatRpNumber = (num: number = 0) => Math.round(num);

    const rows: (string | number)[][] = [
      ['RIWAYAT TRANSAKSI - KASIR WARUNGKU'],
      ['Nama Toko', storeName || 'WarungKu'],
      ['Tanggal Unduh', new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })],
      ['Pencarian / Filter', searchQuery?.trim() ? searchQuery : 'Semua Transaksi'],
      ['Total Nota Transaksi', `${transactions.length} Nota`],
      [], // baris kosong
      [
        'No',
        'No Nota',
        'Tanggal & Waktu',
        'Metode Pembayaran',
        'Total Belanja (Rp)',
        'Jumlah Barang (Qty)',
        'Rincian Barang',
      ],
    ];

    transactions.forEach((tx, idx) => {
      const dateFormatted = new Date(tx.createdAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const totalQty = tx.items?.reduce((sum, item) => sum + (Number(item.qty) || 1), 0) || 0;
      const itemsText =
        tx.items
          ?.map((i) => `${i.name} (${i.qty}x @ Rp ${formatRpNumber(i.price).toLocaleString('id-ID')})`)
          .join('; ') || '-';

      rows.push([
        idx + 1,
        tx.invoiceNumber,
        dateFormatted,
        tx.paymentMethod,
        formatRpNumber(tx.total),
        totalQty,
        itemsText,
      ]);
    });

    const wb = XLSX.utils.book_new();
    const wsTx = XLSX.utils.aoa_to_sheet(rows);

    wsTx['!cols'] = [
      { wch: 8 },  // No
      { wch: 20 }, // No Nota
      { wch: 22 }, // Tanggal & Waktu
      { wch: 18 }, // Metode Pembayaran
      { wch: 20 }, // Total Belanja
      { wch: 18 }, // Jumlah Barang
      { wch: 50 }, // Rincian Barang
    ];

    XLSX.utils.book_append_sheet(wb, wsTx, 'Riwayat Transaksi');

    // Sheet 2: Rincian Item Penjualan per Baris
    const itemRows: (string | number)[][] = [
      ['RINCIAN BARANG PER NOTA TRANSAKSI'],
      ['No Nota', 'Tanggal & Waktu', 'Metode Pembayaran', 'Nama Barang', 'Qty', 'Harga Satuan (Rp)', 'Total Belanja Item (Rp)'],
    ];

    transactions.forEach((tx) => {
      const dateFormatted = new Date(tx.createdAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      tx.items.forEach((item) => {
        const itemSellingTotal = item.subtotal || item.price * item.qty;
        itemRows.push([
          tx.invoiceNumber,
          dateFormatted,
          tx.paymentMethod,
          item.name,
          item.qty,
          formatRpNumber(item.price),
          formatRpNumber(itemSellingTotal),
        ]);
      });
    });

    const wsItems = XLSX.utils.aoa_to_sheet(itemRows);
    wsItems['!cols'] = [
      { wch: 20 },
      { wch: 22 },
      { wch: 18 },
      { wch: 30 },
      { wch: 10 },
      { wch: 20 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, wsItems, 'Rincian Barang');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const cleanStore = (storeName || 'WarungKu').replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    this.triggerBinaryDownload(
      excelBuffer,
      `Riwayat_Transaksi_${cleanStore}_${dateStr}.xlsx`
    );
  }

  // 3. Cadangan Ekspor Laporan Penjualan ke format CSV (Tetap dipertahankan untuk kompatibilitas)
  static exportSalesReportToCSV(
    transactions: Transaction[],
    dateRangeLabel: string,
    summary: { totalRevenue: number; totalCost: number; totalProfit: number }
  ) {
    const formatRpNumber = (num: number = 0) => Math.round(num);

    const headers = [
      'No Nota',
      'Tanggal & Waktu',
      'Metode Pembayaran',
      'Nama Barang',
      'Jumlah (Qty)',
      'Harga Jual Satuan (Rp)',
      'Total Penjualan (Rp)',
      'Harga Beli Satuan (Rp)',
      'Total Modal (Rp)',
      'Keuntungan / Laba (Rp)',
    ];

    const rows: string[] = [];

    // Header ringkasan laporan di bagian atas
    rows.push(`"LAPORAN PENJUALAN KASIR WARUNGKU"`);
    rows.push(`"Periode: ${dateRangeLabel}"`);
    rows.push(`"Total Transaksi: ${transactions.length} Nota"`);
    rows.push(`"Total Omzet / Penjualan: Rp ${formatRpNumber(summary.totalRevenue)}"`);
    rows.push(`"Total Modal HPP: Rp ${formatRpNumber(summary.totalCost)}"`);
    rows.push(`"Total Keuntungan Bersih: Rp ${formatRpNumber(summary.totalProfit)}"`);
    rows.push(''); // Blank line

    // Header kolom tabel
    rows.push(headers.map((h) => `"${h}"`).join(','));

    // Baris setiap item transaksi
    transactions.forEach((tx) => {
      const dateFormatted = new Date(tx.createdAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      tx.items.forEach((item) => {
        const itemSellingTotal = item.subtotal || item.price * item.qty;
        const itemCostTotal = (item.costPrice || 0) * item.qty;
        const itemProfit = itemSellingTotal - itemCostTotal;

        const row = [
          `"${tx.invoiceNumber}"`,
          `"${dateFormatted}"`,
          `"${tx.paymentMethod}"`,
          `"${item.name.replace(/"/g, '""')}"`,
          item.qty,
          formatRpNumber(item.price),
          formatRpNumber(itemSellingTotal),
          formatRpNumber(item.costPrice || 0),
          formatRpNumber(itemCostTotal),
          formatRpNumber(itemProfit),
        ];
        rows.push(row.join(','));
      });
    });

    // Tambahkan UTF-8 BOM (\uFEFF) agar Microsoft Excel di HP / PC membaca karakter dengan benar
    const csvContent = '\uFEFF' + rows.join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    this.triggerDownload(csvContent, `Laporan_Penjualan_${dateStr}.csv`);
  }

  // 2. Download Template CSV Produk
  static downloadProductCSVTemplate() {
    const headers = [
      'Nama Produk',
      'Barcode',
      'Kategori',
      'Harga Beli',
      'Harga Jual',
      'Stok',
      'Min Stok',
    ];

    const examples = [
      ['Minyak Goreng Bimoli 1L', '8991234567890', 'Sembako', '15000', '16500', '24', '5'],
      ['Indomie Goreng Spesial', '8999999123456', 'Makanan', '2800', '3500', '40', '10'],
      ['Teh Botol Sosro 350ml', '8998888765432', 'Minuman', '3200', '4000', '30', '6'],
      ['Kopi Kapal Api Mix 1 Renceng', '8997777654321', 'Minuman', '12000', '14000', '15', '3'],
    ];

    const rows = [
      headers.map((h) => `"${h}"`).join(','),
      ...examples.map((r) => r.map((c) => `"${c}"`).join(',')),
    ];

    const csvContent = '\uFEFF' + rows.join('\r\n');
    this.triggerDownload(csvContent, 'Template_Import_Produk_Warungku.csv');
  }

  // 3. Parse file CSV Produk
  static parseProductCSV(csvText: string): Array<Omit<Product, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>> {
    // Bersihkan BOM jika ada
    const cleanText = csvText.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r\n|\n/).filter((l) => l.trim().length > 0);

    if (lines.length < 2) {
      throw new Error('File CSV kosong atau tidak memiliki baris data.');
    }

    // Deteksi pemisah (koma atau titik koma)
    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';

    // Helper split baris CSV dengan handling kutip
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map((col) => col.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    };

    const headers = parseLine(headerLine).map((h) => h.toLowerCase());

    const nameIdx = headers.findIndex((h) => h.includes('nama') || h.includes('name'));
    const barcodeIdx = headers.findIndex((h) => h.includes('barcode') || h.includes('kode'));
    const catIdx = headers.findIndex((h) => h.includes('kategori') || h.includes('category'));
    const costIdx = headers.findIndex((h) => h.includes('beli') || h.includes('modal') || h.includes('cost'));
    const sellIdx = headers.findIndex((h) => h.includes('jual') || h.includes('price') || h.includes('harga'));
    const stockIdx = headers.findIndex((h) => h.includes('stok') || h.includes('stock') || h.includes('qty'));
    const minStockIdx = headers.findIndex((h) => h.includes('min'));

    if (nameIdx === -1 || sellIdx === -1) {
      throw new Error(
        'Kolom wajib "Nama Produk" dan "Harga Jual" tidak ditemukan dalam header CSV.'
      );
    }

    const parsedProducts: Array<Omit<Product, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>> = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      const name = cols[nameIdx] || '';
      if (!name) continue; // lewati baris tanpa nama

      const barcode = barcodeIdx > -1 ? cols[barcodeIdx] || '' : '';
      const category = catIdx > -1 ? cols[catIdx] || 'Lainnya' : 'Lainnya';
      const costPrice = costIdx > -1 ? Number(cols[costIdx]?.replace(/[^0-9]/g, '')) || 0 : 0;
      const sellingPrice = sellIdx > -1 ? Number(cols[sellIdx]?.replace(/[^0-9]/g, '')) || 0 : 0;
      const stock = stockIdx > -1 ? Number(cols[stockIdx]?.replace(/[^0-9]/g, '')) || 0 : 0;
      const minStock = minStockIdx > -1 ? Number(cols[minStockIdx]?.replace(/[^0-9]/g, '')) || 5 : 5;

      parsedProducts.push({
        name,
        barcode,
        category,
        costPrice,
        sellingPrice,
        stock,
        minStock,
      });
    }

    if (parsedProducts.length === 0) {
      throw new Error('Tidak ada data produk yang valid untuk diimpor.');
    }

    return parsedProducts;
  }

  // 4. Buat Backup Lengkap Toko (JSON)
  static async createStoreBackup(
    store: StoreProfile,
    products: Product[],
    transactions: Transaction[]
  ) {
    const backupData: StoreBackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      store,
      products,
      transactions,
    };

    const jsonContent = JSON.stringify(backupData, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const cleanStoreName = store.storeName.replace(/[^a-zA-Z0-9]/g, '_');
    this.triggerDownload(
      jsonContent,
      `Backup_${cleanStoreName}_${dateStr}.json`,
      'application/json;charset=utf-8;'
    );
  }

  // 5. Pulihkan Toko dari File Backup (JSON)
  static async restoreStoreBackup(
    backupData: StoreBackupData,
    userId: string
  ): Promise<{ productsCount: number; transactionsCount: number }> {
    if (!backupData || !backupData.store || !Array.isArray(backupData.products)) {
      throw new Error('Format file backup tidak valid.');
    }

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    // 1. Pulihkan Profil Toko
    const storeRef = doc(db, 'stores', userId);
    batch.set(
      storeRef,
      {
        ...backupData.store,
        id: userId,
        ownerId: userId,
        updatedAt: now,
      },
      { merge: true }
    );

    // 2. Pulihkan Produk
    const productsRef = collection(db, 'stores', userId, 'products');
    for (const prod of backupData.products) {
      const prodId = prod.id || doc(productsRef).id;
      const pDoc = doc(db, 'stores', userId, 'products', prodId);
      batch.set(pDoc, {
        ...prod,
        id: prodId,
        storeId: userId,
        updatedAt: now,
      });
    }

    // 3. Pulihkan Transaksi (jika ada)
    if (Array.isArray(backupData.transactions)) {
      const txRef = collection(db, 'stores', userId, 'transactions');
      for (const tx of backupData.transactions) {
        const txId = tx.id || doc(txRef).id;
        const tDoc = doc(db, 'stores', userId, 'transactions', txId);
        batch.set(tDoc, {
          ...tx,
          id: txId,
          storeId: userId,
        });
      }
    }

    try {
      await batch.commit();
      return {
        productsCount: backupData.products.length,
        transactionsCount: backupData.transactions?.length || 0,
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `stores/${userId}/backup_restore`);
    }
  }
}
