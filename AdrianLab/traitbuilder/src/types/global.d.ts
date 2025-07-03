declare global {
  interface Window {
    ADRIANLAB_CONFIG?: {
      CHAIN_ID: number;
      RPC_URL: string;
      WS_URL: string;
      ADRIAN_LAB_CORE: string;
      ADRIAN_TRAITS_CORE: string;
      ADRIAN_TRAITS_EXTENSIONS: string;
      WALLET_CONNECT_PROJECT_ID: string;
      API_URL: string;
      PREVIEW_API_URL: string;
    };
  }
}

export {}; 