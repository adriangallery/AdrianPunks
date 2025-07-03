/**
 * App wrapper with providers
 */

import type { AppProps } from 'next/app';
import Head from 'next/head';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { base } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';
import '@/styles/globals.css';

// Configure chains & providers - Only BASE network
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [base],
  [
    // Primary RPC provider
    jsonRpcProvider({
      rpc: (chain) => {
        if (chain.id === base.id) {
          return {
            http: typeof window !== 'undefined' && window.ADRIANLAB_CONFIG 
              ? window.ADRIANLAB_CONFIG.RPC_URL 
              : 'https://mainnet.base.org',
            webSocket: typeof window !== 'undefined' && window.ADRIANLAB_CONFIG 
              ? window.ADRIANLAB_CONFIG.WS_URL || undefined 
              : undefined,
          };
        }
        return null;
      },
    }),
    // Fallback to public provider
    publicProvider(),
  ]
);

// Set up wagmi config
const { connectors } = getDefaultWallets({
  appName: 'AdrianLab Trait Builder',
  projectId: typeof window !== 'undefined' && window.ADRIANLAB_CONFIG 
    ? window.ADRIANLAB_CONFIG.WALLET_CONNECT_PROJECT_ID 
    : 'your-project-id',
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient: webSocketPublicClient || undefined,
});

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <script src="/config.js" async />
      </Head>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider chains={chains}>
          <QueryClientProvider client={queryClient}>
            <Component {...pageProps} />
          </QueryClientProvider>
        </RainbowKitProvider>
      </WagmiConfig>
    </>
  );
} 