import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.liorangroup.p2pchat',
  appName: 'p2p_chat',
  webDir: 'out',
  server: {
    url: 'https://p2-p-chat-ruddy.vercel.app/chat', // your deployed Next.js URL
    cleartext: false,
  },
};

export default config;
