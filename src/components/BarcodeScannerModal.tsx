import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, Flashlight, AlertCircle, Check, Keyboard, RefreshCw, ShieldAlert, Settings } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

// Synthesize pleasant checkout beep
function playScanBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // A6 beep
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore audio context autoplay limitations
  }
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInsecureOrigin, setIsInsecureOrigin] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [supportsTorch, setSupportsTorch] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [detectorSupported, setDetectorSupported] = useState<boolean>(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);

  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setTorchOn(false);
  }, []);

  const startBarcodeDetection = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      const barcodeDetector = new BarcodeDetectorClass({
        formats: [
          'ean_13',
          'ean_8',
          'upc_a',
          'upc_e',
          'code_128',
          'code_39',
          'qr_code',
          'data_matrix',
        ],
      });

      setIsScanning(true);

      const detectFrame = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          animationFrameRef.current = requestAnimationFrame(detectFrame);
          return;
        }

        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            if (code) {
              playScanBeep();
              if (navigator.vibrate) navigator.vibrate(80);
              stopCamera();
              onScanSuccess(code);
              onClose();
              return;
            }
          }
        } catch {
          // Frame detection glitch, continue next frame
        }

        animationFrameRef.current = requestAnimationFrame(detectFrame);
      };

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    } catch (e) {
      console.warn('Gagal inisialisasi BarcodeDetector:', e);
      setDetectorSupported(false);
    }
  }, [onClose, onScanSuccess, stopCamera]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage(null);
    setIsPermissionDenied(false);
    setIsInsecureOrigin(false);
    setHasCamera(true);
    setIsRequestingPermission(true);

    // 1. Verifikasi konteks keamanan (HTTPS wajib untuk akses getUserMedia di browser modern)
    const isSecure = window.isSecureContext ||
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isSecure) {
      setIsInsecureOrigin(true);
      setHasCamera(false);
      setIsRequestingPermission(false);
      setErrorMessage('Browser membatasi kamera hanya untuk koneksi aman HTTPS. Buka aplikasi via tautan https://');
      return;
    }

    // 2. Periksa ketersediaan API getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setIsRequestingPermission(false);
      setErrorMessage('Browser ini tidak mendukung akses kamera perangkat.');
      return;
    }

    // 3. Periksa status permission terlebih dahulu jika didukung oleh browser
    try {
      if (navigator.permissions && navigator.permissions.query) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as any });
        if (permissionStatus.state === 'denied') {
          setIsPermissionDenied(true);
          setHasCamera(false);
          setIsRequestingPermission(false);
          setErrorMessage('Izin kamera ditolak di pengaturan browser Anda.');
          return;
        }
      }
    } catch {
      // Beberapa browser tidak mengizinkan query 'camera', lanjutkan langsung ke getUserMedia
    }

    // 4. Minta izin & buka stream kamera menggunakan getUserMedia
    try {
      let stream: MediaStream | null = null;
      try {
        // Coba kamera belakang (environment) dengan resolusi optimal HP
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (firstErr) {
        console.warn('Percobaan kamera environment gagal, mencoba fallback standar:', firstErr);
        // Fallback jika constraint ideal tidak didukung perangkat
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      if (!stream) {
        throw new Error('Aliran video kamera tidak ditemukan.');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Gagal memutar video kamera:', playErr);
        }
      }

      // Periksa kapabilitas lampu flash/torch
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities?.() as { torch?: boolean }) || {};
        setSupportsTorch(!!capabilities.torch);
      }

      // Periksa dukungan BarcodeDetector bawaan browser
      const hasBarcodeDetector = 'BarcodeDetector' in window;
      setDetectorSupported(hasBarcodeDetector);

      if (hasBarcodeDetector) {
        startBarcodeDetection();
      }
    } catch (err: unknown) {
      console.warn('Gagal mengakses kamera:', err);
      setHasCamera(false);

      const errName = (err as { name?: string })?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setIsPermissionDenied(true);
        setErrorMessage('Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setErrorMessage('Perangkat kamera tidak ditemukan pada HP/komputer ini.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setErrorMessage('Kamera sedang digunakan oleh aplikasi lain atau terkunci.');
      } else {
        setErrorMessage('Tidak dapat menyalakan kamera. Silakan gunakan input barcode manual.');
      }
    } finally {
      setIsRequestingPermission(false);
    }
  }, [startBarcodeDetection, stopCamera]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Gagal mengubah lampu senter:', e);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playScanBeep();
    stopCamera();
    onScanSuccess(manualCode.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="w-full max-w-sm bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col text-white">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Pindai Barcode Produk</h3>
              <p className="text-[10px] text-slate-400">Arahkan kamera ke barcode barang</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition"
            aria-label="Tutup pemindai"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder Area */}
        <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
          {hasCamera ? (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="w-56 h-36 border-2 border-emerald-400/80 rounded-2xl relative shadow-lg">
                  {/* Corner accents */}
                  <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-emerald-400 rounded-tl-sm" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-emerald-400 rounded-tr-sm" />
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-emerald-400 rounded-bl-sm" />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-emerald-400 rounded-br-sm" />

                  {/* Animated laser scan line */}
                  {isScanning && (
                    <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse absolute top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              {/* Torch toggle button */}
              {supportsTorch && (
                <button
                  onClick={toggleTorch}
                  className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition ${
                    torchOn ? 'bg-amber-400 text-slate-900 shadow-lg' : 'bg-black/50 text-white'
                  }`}
                  title="Lampu Flash"
                >
                  <Flashlight className="w-4 h-4" />
                </button>
              )}

              {/* Status Note when BarcodeDetector is not natively present */}
              {!detectorSupported && (
                <div className="absolute bottom-2 inset-x-2 py-1.5 px-3 bg-slate-950/85 backdrop-blur-md rounded-lg text-center text-[10px] text-amber-300">
                  Pemindai otomatis browser ini memerlukan input manual. Gunakan kolom di bawah.
                </div>
              )}
            </>
          ) : (
            <div className="p-5 text-center text-slate-300 w-full flex flex-col items-center justify-center">
              {isPermissionDenied ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Izin Kamera Ditolak</h4>
                  <p className="text-[11px] text-slate-300 max-w-xs leading-relaxed">
                    Browser memblokir akses ke kamera HP Anda.
                  </p>
                  <button
                    onClick={startCamera}
                    disabled={isRequestingPermission}
                    className="mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRequestingPermission ? 'animate-spin' : ''}`} />
                    <span>Coba Minta Izin Lagi</span>
                  </button>
                </div>
              ) : isInsecureOrigin ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Perlu Koneksi HTTPS</h4>
                  <p className="text-[11px] text-slate-300 max-w-xs leading-relaxed">
                    Kamera HP hanya dapat diakses melalui koneksi aman (HTTPS).
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Kamera Tidak Aktif</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    {errorMessage || 'Kamera tidak dapat diakses saat ini.'}
                  </p>
                  <button
                    onClick={startCamera}
                    disabled={isRequestingPermission}
                    className="mt-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition border border-slate-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRequestingPermission ? 'animate-spin' : ''}`} />
                    <span>Coba Lagi</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Petunjuk Membuka Izin Kamera di Browser jika Ditolak */}
        {isPermissionDenied && (
          <div className="px-4 py-3 bg-amber-950/40 border-t border-amber-800/40 text-amber-200 text-[11px] space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Settings className="w-3.5 h-3.5" />
              <span>Cara Mengaktifkan Kamera di Google Chrome / Browser HP:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-200 pl-1 leading-relaxed">
              <li>Ketuk ikon <b>Gembok 🔒</b> atau <b>Pengaturan Situs</b> di sebelah kiri alamat URL atas.</li>
              <li>Pilih menu <b>Izin</b> (Permissions) lalu pilih <b>Kamera</b>.</li>
              <li>Ubah pilihan menjadi <b>Izinkan</b> (Allow).</li>
              <li>Ketuk tombol <b>"Coba Minta Izin Lagi"</b> di atas.</li>
            </ol>
          </div>
        )}

        {/* Error Notification if other than permission */}
        {errorMessage && !isPermissionDenied && !isInsecureOrigin && (
          <div className="px-4 py-2 bg-red-950/60 border-t border-red-800/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Manual Barcode Input Fallback - Selalu tersedia jika kamera tidak bisa */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Input Manual Kode Barcode</span>
            </span>
            <span className="text-[10px] text-slate-400">Alternatif jika kamera terkendala</span>
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ketik angka barcode (cth: 899...)"
              autoFocus={!hasCamera}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Pakai</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

