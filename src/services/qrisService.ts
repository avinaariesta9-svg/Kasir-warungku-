import { StoreProfile } from '../types';

export class QrisService {
  /**
   * Mengompres gambar QRIS dari galeri HP ke format Base64 JPEG yang ringan (maks 600x600 px)
   * agar muat sempurna di Firestore (batas 1MB) dan instan di IndexedDB offline.
   */
  static async compressQrisImage(file: File, maxDimension: number = 600, quality: number = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File yang dipilih bukan gambar. Harap pilih gambar QRIS (PNG/JPG/WEBP).'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // Hitung rasio dimensi agar proporsional
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Gagal memproses kanvas gambar QRIS.'));
            return;
          }

          // Latar belakang putih bersih
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);

          // Gambar QRIS
          ctx.drawImage(img, 0, 0, width, height);

          // Ekspor Base64 JPEG
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };

        img.onerror = () => {
          reject(new Error('Gagal memuat gambar QRIS dari galeri.'));
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        reject(new Error('Gagal membaca file dari galeri HP.'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Format mata uang Rupiah
   */
  static formatRupiah(num: number = 0): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }

  /**
   * Cetak kartu / slip tagihan QRIS menggunakan printer browser / thermal
   */
  static printQrisCard(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
