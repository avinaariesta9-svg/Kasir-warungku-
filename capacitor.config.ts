import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.warungku.kasir',
  appName: 'Kasir WarungKu',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
