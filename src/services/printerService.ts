import { StoreProfile, Transaction, PrinterSettings } from '../types';

const PRINTER_STORAGE_KEY = 'kasir_warungku_printer_settings';

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  paperWidth: '58mm',
  autoPrint: false,
};

// Recognized BLE Thermal Printer Services
const THERMAL_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard thermal printer
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Bluetooth
  '0000ff00-0000-1000-8000-00805f9b34fb', // Common POS printer
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // PT-210 / GOOJPRT / MPT-II
];

export interface BluetoothSupportStatus {
  isSupported: boolean;
  isPermitted: boolean;
  reason?: string;
}

export class PrinterService {
  private static connectedDevice: BluetoothDevice | null = null;
  private static writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

  static getSettings(): PrinterSettings {
    try {
      const raw = localStorage.getItem(PRINTER_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_PRINTER_SETTINGS;
  }

  static saveSettings(settings: Partial<PrinterSettings>): PrinterSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    try {
      localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menyimpan pengaturan printer ke localStorage:', e);
    }
    return updated;
  }

  /**
   * Periksa dukungan Web Bluetooth lengkap:
   * 1. Window & secure context (HTTPS / localhost)
   * 2. Ketersediaan API navigator.bluetooth
   * 3. Browser Permissions Policy / Feature Policy
   */
  static getBluetoothSupportStatus(): BluetoothSupportStatus {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        isSupported: false,
        isPermitted: false,
        reason: 'Lingkungan aplikasi tidak mendukung navigator/window.',
      };
    }

    // 1. Cek Secure Context (HTTPS wajib untuk Web Bluetooth)
    if (!window.isSecureContext) {
      return {
        isSupported: false,
        isPermitted: false,
        reason: 'Web Bluetooth memerlukan koneksi aman (HTTPS). Buka aplikasi menggunakan tautan https://.',
      };
    }

    // 2. Cek apakah navigator.bluetooth tersedia
    if (!('bluetooth' in navigator) || !navigator.bluetooth || typeof navigator.bluetooth.requestDevice !== 'function') {
      return {
        isSupported: false,
        isPermitted: false,
        reason: 'Browser ini tidak mendukung Web Bluetooth. Gunakan browser Google Chrome di HP Android atau komputer.',
      };
    }

    // 3. Cek Permissions Policy / Feature Policy (misal di dalam iframe)
    try {
      const doc = document as unknown as {
        permissionsPolicy?: { allowsFeature: (feature: string) => boolean };
        featurePolicy?: { allowsFeature: (feature: string) => boolean };
      };

      if (doc.permissionsPolicy && typeof doc.permissionsPolicy.allowsFeature === 'function') {
        if (!doc.permissionsPolicy.allowsFeature('bluetooth')) {
          return {
            isSupported: true,
            isPermitted: false,
            reason:
              'Akses Bluetooth dibatasi oleh Permissions Policy browser atau frame pratinjau. Gunakan opsi Cetak Browser / Simpan PDF, atau buka aplikasi langsung di tab Google Chrome baru.',
          };
        }
      } else if (doc.featurePolicy && typeof doc.featurePolicy.allowsFeature === 'function') {
        if (!doc.featurePolicy.allowsFeature('bluetooth')) {
          return {
            isSupported: true,
            isPermitted: false,
            reason:
              'Akses Bluetooth dibatasi oleh Feature Policy atau iframe. Gunakan opsi Cetak Browser / Simpan PDF.',
          };
        }
      }
    } catch {
      // Abaikan jika browser tidak mendukung inspeksi policy
    }

    return {
      isSupported: true,
      isPermitted: true,
    };
  }

  static isBluetoothSupported(): boolean {
    return this.getBluetoothSupportStatus().isSupported;
  }

  static isBluetoothPermitted(): boolean {
    const status = this.getBluetoothSupportStatus();
    return status.isSupported && status.isPermitted;
  }

  static isConnected(): boolean {
    return !!this.connectedDevice && !!this.connectedDevice.gatt?.connected && !!this.writeCharacteristic;
  }

  static getConnectedDeviceName(): string | null {
    if (this.connectedDevice && this.connectedDevice.gatt?.connected) {
      return this.connectedDevice.name || 'Printer Bluetooth';
    }
    return null;
  }

  static async disconnect(): Promise<void> {
    if (this.connectedDevice && this.connectedDevice.gatt?.connected) {
      this.connectedDevice.gatt.disconnect();
    }
    this.connectedDevice = null;
    this.writeCharacteristic = null;
  }

  /**
   * Hubungkan printer Bluetooth.
   * Hanya boleh dipanggil setelah aksi klik tombol eksplisit dari pengguna.
   */
  static async connectBluetooth(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    const status = this.getBluetoothSupportStatus();

    // 1. Validasi dukungan browser sebelum memanggil requestDevice
    if (!status.isSupported) {
      return {
        success: false,
        error: status.reason || 'Web Bluetooth belum didukung browser ini. Gunakan Chrome di HP Android.',
      };
    }

    // 2. Validasi izin Permissions Policy sebelum memanggil requestDevice
    if (!status.isPermitted) {
      return {
        success: false,
        error:
          status.reason ||
          'Akses Bluetooth tidak diizinkan oleh Permissions Policy browser / iframe. Gunakan alternatif Cetak Browser atau buka di tab Chrome baru.',
      };
    }

    try {
      // Disconnect previous if open
      await this.disconnect();

      if (!navigator.bluetooth || typeof navigator.bluetooth.requestDevice !== 'function') {
        throw new Error('Web Bluetooth tidak tersedia pada browser ini.');
      }

      // Request device filter - HANYA dijalankan saat pengguna menekan tombol Hubungkan Printer
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: THERMAL_PRINTER_SERVICES,
      });

      if (!device.gatt) {
        throw new Error('Perangkat tidak mendukung koneksi GATT Bluetooth.');
      }

      const server = await device.gatt.connect();

      // Find writable characteristic in primary services
      let targetCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

      // Try known services first
      for (const serviceUuid of THERMAL_PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          for (const c of characteristics) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              targetCharacteristic = c;
              break;
            }
          }
          if (targetCharacteristic) break;
        } catch {
          // Continue searching other services
        }
      }

      // If still not found, search all services
      if (!targetCharacteristic) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            const characteristics = await service.getCharacteristics();
            for (const c of characteristics) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                targetCharacteristic = c;
                break;
              }
            }
            if (targetCharacteristic) break;
          }
        } catch {
          // Ignored
        }
      }

      if (!targetCharacteristic) {
        throw new Error(
          'Tidak dapat menemukan karakteristik cetak (ESC/POS) pada printer ini. Pastikan printer mendukung Bluetooth BLE/GATT.'
        );
      }

      this.connectedDevice = device;
      this.writeCharacteristic = targetCharacteristic;

      const deviceName = device.name || 'Printer Thermal';
      this.saveSettings({ savedDeviceName: deviceName, savedDeviceId: device.id });

      device.addEventListener('gattserverdisconnected', () => {
        this.writeCharacteristic = null;
      });

      return { success: true, deviceName };
    } catch (err: unknown) {
      const error = err as Error;
      const errMsg = error?.message || '';
      const errName = error?.name || '';

      // Penanganan eksplisit jika terjadi penolakan Permissions Policy / iframe
      if (
        errName === 'SecurityError' ||
        errMsg.toLowerCase().includes('permissions policy') ||
        errMsg.toLowerCase().includes('disallowed')
      ) {
        return {
          success: false,
          error:
            'Akses Bluetooth diblokir oleh kebijakan keamanan browser (Permissions Policy) atau frame aplikasi. Anda tetap dapat menggunakan mode "Cetak Browser / Simpan PDF", atau buka aplikasi langsung di Google Chrome.',
        };
      }

      // Penanganan jika pengguna membatalkan dialog pemilihan perangkat
      if (
        errName === 'NotFoundError' ||
        errMsg.toLowerCase().includes('user cancelled') ||
        errMsg.toLowerCase().includes('user canceled') ||
        errMsg.toLowerCase().includes('cancelled')
      ) {
        return {
          success: false,
          error: 'Pencarian printer Bluetooth dibatalkan oleh pengguna.',
        };
      }

      return {
        success: false,
        error: errMsg || 'Gagal menyambungkan ke printer Bluetooth.',
      };
    }
  }

  // Format currency without decimals for compact receipt
  private static formatRp(num: number = 0): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }

  // Helper two columns (Left text, Right text) padded with spaces
  private static padTwoColumns(left: string, right: string, width: number): string {
    const spaceCount = width - (left.length + right.length);
    if (spaceCount <= 0) {
      return left + ' ' + right;
    }
    return left + ' '.repeat(spaceCount) + right;
  }

  // Format ESC/POS raw bytes sequence
  static generateEscPosBytes(
    transaction: Transaction,
    store: StoreProfile | null,
    paperWidth: '58mm' | '80mm'
  ): Uint8Array {
    const lineWidth = paperWidth === '80mm' ? 48 : 32;
    const divider = '-'.repeat(lineWidth);
    const dateFormatted = new Date(transaction.createdAt).toLocaleString('id-ID', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const encoder = new TextEncoder();
    const parts: number[] = [];

    // Commands
    const ESC = 0x1b;
    const GS = 0x1d;

    // Initialize
    parts.push(ESC, 0x40);

    // Center Align
    parts.push(ESC, 0x61, 0x01);

    // Bold ON + Double Height for Store Name
    parts.push(ESC, 0x45, 0x01);
    parts.push(GS, 0x21, 0x01);
    const storeName = (store?.storeName || 'KASIR WARUNGKU').toUpperCase();
    for (const b of encoder.encode(storeName + '\n')) parts.push(b);

    // Normal Text & Bold OFF
    parts.push(ESC, 0x45, 0x00);
    parts.push(GS, 0x21, 0x00);

    // Store address & WhatsApp if available
    if (store?.address) {
      for (const b of encoder.encode(store.address + '\n')) parts.push(b);
    }
    if (store?.whatsapp) {
      for (const b of encoder.encode(`WA: ${store.whatsapp}\n`)) parts.push(b);
    }

    // Divider
    for (const b of encoder.encode(divider + '\n')) parts.push(b);

    // Left Align
    parts.push(ESC, 0x61, 0x00);

    // Invoice No & Date
    for (const b of encoder.encode(this.padTwoColumns(`No: ${transaction.invoiceNumber}`, dateFormatted, lineWidth) + '\n')) {
      parts.push(b);
    }
    for (const b of encoder.encode(this.padTwoColumns('Kasir: Warung', `Metode: ${transaction.paymentMethod}`, lineWidth) + '\n')) {
      parts.push(b);
    }

    // Divider
    for (const b of encoder.encode(divider + '\n')) parts.push(b);

    // Items List
    transaction.items.forEach((item) => {
      // Line 1: Item name
      for (const b of encoder.encode(item.name + '\n')) parts.push(b);

      // Line 2: Qty x Price and Subtotal
      const qtyPrice = `  ${item.qty} x ${this.formatRp(item.price)}`;
      const subtotalStr = this.formatRp(item.subtotal);
      for (const b of encoder.encode(this.padTwoColumns(qtyPrice, subtotalStr, lineWidth) + '\n')) {
        parts.push(b);
      }
    });

    // Divider
    for (const b of encoder.encode(divider + '\n')) parts.push(b);

    // Subtotal and Discount if applicable
    for (const b of encoder.encode(this.padTwoColumns('SUBTOTAL', this.formatRp(transaction.subtotal), lineWidth) + '\n')) {
      parts.push(b);
    }
    if (transaction.discount && transaction.discount > 0) {
      for (const b of encoder.encode(this.padTwoColumns('DISKON', `-${this.formatRp(transaction.discount)}`, lineWidth) + '\n')) {
        parts.push(b);
      }
    }

    // Bold ON for Total
    parts.push(ESC, 0x45, 0x01);
    for (const b of encoder.encode(this.padTwoColumns('TOTAL BAYAR', this.formatRp(transaction.total), lineWidth) + '\n')) {
      parts.push(b);
    }
    parts.push(ESC, 0x45, 0x00);

    // Payment details
    if (transaction.paymentMethod === 'TUNAI') {
      for (const b of encoder.encode(this.padTwoColumns('TUNAI', this.formatRp(transaction.cashAmount), lineWidth) + '\n')) {
        parts.push(b);
      }
      for (const b of encoder.encode(this.padTwoColumns('KEMBALI', this.formatRp(transaction.changeAmount), lineWidth) + '\n')) {
        parts.push(b);
      }
    } else {
      for (const b of encoder.encode(this.padTwoColumns('STATUS', 'LUNAS (QRIS)', lineWidth) + '\n')) {
        parts.push(b);
      }
    }

    // Divider
    for (const b of encoder.encode(divider + '\n')) parts.push(b);

    // Footer - Center Align
    parts.push(ESC, 0x61, 0x01);
    for (const b of encoder.encode('Terima Kasih Atas Kunjungan Anda\n')) parts.push(b);
    for (const b of encoder.encode('Barang yang dibeli tidak dapat ditukar\n')) parts.push(b);
    for (const b of encoder.encode('Powered by Kasir Warungku\n\n\n\n')) parts.push(b);

    // Cut Paper command
    parts.push(GS, 0x56, 0x41, 0x03);

    return new Uint8Array(parts);
  }

  // Print via Web Bluetooth
  // Print via Web Bluetooth (ESC/POS)
  static async printBluetooth(
    transaction: Transaction,
    store: StoreProfile | null
  ): Promise<{ success: boolean; error?: string }> {
    // PENTING: Jangan memanggil connectBluetooth() / requestDevice secara otomatis di sini!
    // Sesuai Permissions Policy dan Web Bluetooth standard, requestDevice hanya boleh dipicu
    // dari interaksi klik langsung tombol "Hubungkan Printer" oleh pengguna.
    if (!this.isConnected() || !this.writeCharacteristic) {
      return {
        success: false,
        error:
          'Printer Bluetooth belum terhubung. Silakan buka Pengaturan Printer dan tekan "Hubungkan Printer", atau gunakan opsi "Cetak Browser / Simpan PDF".',
      };
    }

    try {
      const settings = this.getSettings();
      const rawBytes = this.generateEscPosBytes(transaction, store, settings.paperWidth);

      // Send in MTU-safe chunks (max 50 bytes per packet)
      const chunkSize = 50;
      for (let i = 0; i < rawBytes.length; i += chunkSize) {
        const chunk = rawBytes.slice(i, i + chunkSize);
        if (this.writeCharacteristic.writeValueWithoutResponse) {
          await this.writeCharacteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.writeCharacteristic.writeValue(chunk);
        }
        // Small delay to prevent printer buffer overflow
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: (err as Error).message || 'Terjadi kesalahan saat mengirim data ke printer.',
      };
    }
  }

  // Fallback 1: Cetak via Browser (Window Print) - Kompatibel dengan semua jenis printer (USB / WiFi / LAN / Thermal POS / Simpan PDF)
  static printBrowser(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  // Format teks nota transaksi (untuk ekspor .txt atau salin ke WhatsApp)
  static generateReceiptText(
    transaction: Transaction,
    store: StoreProfile | null,
    paperWidth: '58mm' | '80mm' = '58mm'
  ): string {
    const width = paperWidth === '80mm' ? 48 : 32;
    const divider = '='.repeat(width);
    const thinDivider = '-'.repeat(width);
    const dateFormatted = new Date(transaction.createdAt).toLocaleString('id-ID', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const lines: string[] = [];
    lines.push(divider);

    // Center header
    const storeName = (store?.storeName || 'KASIR WARUNGKU').toUpperCase();
    lines.push(this.centerText(storeName, width));
    if (store?.address) lines.push(this.centerText(store.address, width));
    if (store?.whatsapp) lines.push(this.centerText(`WA: ${store.whatsapp}`, width));
    lines.push(thinDivider);

    // Metadata
    lines.push(this.padTwoColumns(`No: ${transaction.invoiceNumber}`, dateFormatted, width));
    lines.push(this.padTwoColumns('Kasir: Warung', `Metode: ${transaction.paymentMethod}`, width));
    lines.push(thinDivider);

    // Items
    transaction.items.forEach((item) => {
      lines.push(item.name);
      const qtyPrice = `  ${item.qty} x ${this.formatRp(item.price)}`;
      const subtotal = this.formatRp(item.subtotal);
      lines.push(this.padTwoColumns(qtyPrice, subtotal, width));
    });
    lines.push(thinDivider);

    // Totals
    lines.push(this.padTwoColumns('SUBTOTAL', this.formatRp(transaction.subtotal), width));
    if (transaction.discount && transaction.discount > 0) {
      lines.push(this.padTwoColumns('DISKON', `-${this.formatRp(transaction.discount)}`, width));
    }
    lines.push(this.padTwoColumns('TOTAL BAYAR', this.formatRp(transaction.total), width));

    if (transaction.paymentMethod === 'TUNAI') {
      lines.push(this.padTwoColumns('TUNAI', this.formatRp(transaction.cashAmount), width));
      lines.push(this.padTwoColumns('KEMBALI', this.formatRp(transaction.changeAmount), width));
    } else {
      lines.push(this.padTwoColumns('STATUS', 'LUNAS (QRIS)', width));
    }

    lines.push(thinDivider);
    lines.push(this.centerText('Terima Kasih Atas Kunjungan Anda', width));
    lines.push(this.centerText('Barang yang dibeli tidak dapat ditukar', width));
    lines.push(this.centerText('Kasir Warungku POS', width));
    lines.push(divider);

    return lines.join('\n');
  }

  private static centerText(text: string, width: number): string {
    if (text.length >= width) return text;
    const pad = Math.floor((width - text.length) / 2);
    return ' '.repeat(pad) + text;
  }

  // Unduh nota sebagai file teks .txt
  static downloadReceiptTxt(
    transaction: Transaction,
    store: StoreProfile | null,
    paperWidth: '58mm' | '80mm' = '58mm'
  ): void {
    const text = this.generateReceiptText(transaction, store, paperWidth);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Struk-${transaction.invoiceNumber || 'transaksi'}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // Fallback 2: Generate RawBT intent URI for Android Bluetooth Classic thermal printers
  static getRawBtUri(
    transaction: Transaction,
    store: StoreProfile | null,
    paperWidth: '58mm' | '80mm' = '58mm'
  ): string {
    const rawBytes = this.generateEscPosBytes(transaction, store, paperWidth);
    let binary = '';
    for (let i = 0; i < rawBytes.length; i++) {
      binary += String.fromCharCode(rawBytes[i]);
    }
    const base64 = btoa(binary);
    return `rawbt:data:base64,${base64}`;
  }
}
