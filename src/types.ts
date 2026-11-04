export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreProfile {
  id: string; // matches userId
  ownerId: string;
  storeName: string;
  address: string;
  whatsapp: string;
  totalSales: number; // Nilai awal 0 (Rupiah)
  totalTransactions: number; // Nilai awal 0
  totalProducts: number; // Nilai awal 0
  totalStock: number; // Nilai awal 0
  createdAt: string;
  updatedAt: string;
  storeCode?: string; // ID unik toko misal WRG-A1B2C
  ownerName?: string;
  ownerEmail?: string;
  activatedAt?: string;
  activatedBy?: string;
  isActive?: boolean;
  plan?: SubscriptionPlan;
  planExpiresAt?: string;
  memberEmails?: string[]; // Daftar email admin/kasir yang diundang (lowercase)
  memberUids?: string[]; // Daftar UID user yang terikat ke toko ini
}

export type StoreRole = 'owner' | 'cashier'; // 'Pemilik' | 'Admin Kasir'

export interface StoreMember {
  id: string;
  storeId: string;
  email: string;
  name: string;
  role: StoreRole;
  status: 'active' | 'inactive';
  invitedBy: string;
  invitedAt: string;
  joinedAt?: string;
  userId?: string;
}

export interface ActivatedStoreRecord {
  id: string;
  storeCode: string;
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  whatsapp: string;
  address: string;
  activatedAt: string;
  activatedBy: string;
  initialPassword?: string;
}

export interface DashboardSummary {
  totalSales: number;
  totalTransactions: number;
  totalProducts: number;
  totalStock: number;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  barcode: string;
  category: string;
  unit?: string; // Satuan barang: Pcs, Bungkus, Botol, Kg, Liter, dll.
  costPrice: number; // Harga beli (modal) dalam Rupiah
  sellingPrice: number; // Harga jual dalam Rupiah
  stock: number; // Jumlah stok
  minStock: number; // Peringatan stok menipis
  createdAt: string;
  updatedAt: string;
}

export const PRODUCT_UNITS = [
  'Pcs',
  'Bungkus',
  'Botol',
  'Kg',
  'Gram',
  'Liter',
  'Renceng',
  'Dus/Karton',
  'Lainnya',
] as const;

export const PRODUCT_CATEGORIES = [
  'Sembako',
  'Makanan',
  'Minuman',
  'Snack & Camilan',
  'Bumbu & Dapur',
  'Rokok & Tembakau',
  'Kebutuhan Rumah',
  'Lainnya',
] as const;

export interface CartItem {
  product: Product;
  qty: number;
  subtotal: number;
}

export interface TransactionItem {
  productId: string;
  name: string;
  price: number;
  costPrice: number;
  qty: number;
  subtotal: number;
}

export type PaymentMethod = 'TUNAI' | 'QRIS';

export interface Transaction {
  id: string;
  storeId: string;
  invoiceNumber: string;
  items: TransactionItem[];
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashAmount: number;
  changeAmount: number;
  createdAt: string;
}

export interface PrinterSettings {
  paperWidth: '58mm' | '80mm';
  autoPrint: boolean;
  savedDeviceName?: string;
  savedDeviceId?: string;
}

export interface StoreBackupData {
  version: number;
  exportedAt: string;
  store: StoreProfile;
  products: Product[];
  transactions: Transaction[];
}

export interface ReportFilter {
  period: 'today' | '7days' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
}

export interface SalesReportSummary {
  totalRevenue: number; // Omzet
  totalCost: number; // Modal
  totalProfit: number; // Keuntungan bersih
  transactionCount: number;
  itemsSoldCount: number;
  topProducts: Array<{
    productId: string;
    name: string;
    qtySold: number;
    revenue: number;
    profit: number;
  }>;
}

export type SubscriptionPlan = 'lifetime';

export type LicenseStatus = 'pending' | 'active' | 'rejected' | 'inactive';

export interface StoreLicense {
  id: string; // matches storeId / userId
  storeId: string;
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  whatsapp: string;
  requestCode: string; // e.g. REQ-WRG-87234
  deviceId: string; // e.g. DEV-8F2A-91K4
  deviceInfo?: string; // e.g. Chrome on Android
  status: LicenseStatus;
  plan?: SubscriptionPlan;
  planExpiresAt?: string;
  requestedAt: string;
  activatedAt?: string;
  activatedBy?: string;
  rejectedAt?: string;
  rejectReason?: string;
  notes?: string;
  updatedAt: string;
}

export interface LicenseActionLog {
  id: string;
  storeId: string;
  storeName: string;
  action: 'ACTIVATE' | 'REJECT' | 'DEACTIVATE' | 'RESET_DEVICE' | 'UPDATE_PLAN';
  performedBy: string;
  timestamp: string;
  details?: string;
}



