// Configuration for ADRIAN Swap - Base Mainnet

const CONFIG = {
  // Network Configuration
  BASE_MAINNET: {
    chainId: '0x2105',  // 8453 in hex
    chainIdDecimal: 8453,
    chainName: 'Base',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    // Usar Alchemy como RPC principal (más rápido y confiable)
    // Formato: https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY
    rpcUrls: [
      'https://base-mainnet.g.alchemy.com/v2/GCEoq-nQ0_6rZZI8CuoTEfILyQN6fR2M', // Alchemy
      'https://mainnet.base.org' // Fallback público
    ],
    blockExplorerUrls: ['https://basescan.org']
  },

  // Token Addresses
  TOKENS: {
    ADRIAN: {
      address: '0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea',
      decimals: 18,
      symbol: 'ADRIAN',
      name: 'Adrian Token',
      icon: 'https://basescan.org/token/images/adrianpunks_32.png'
    },
    ETH: {
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      symbol: 'ETH',
      name: 'Ethereum',
      icon: 'https://ethereum.org/static/6b935ac0e6194247347855dc3d328e83/6ed5f/eth-diamond-black.webp'
    }
  },

  // Uniswap V4 Contracts on Base
  UNISWAP_V4: {
    poolManager: '0x498581fF718922c3f8e6A244956aF099B2652b2b',
    positionManager: '0x7C5f5A4bBd8fD63184577525326123B519429bDc',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3'
  },

  // Our Pool Configuration
  POOL: {
    hookAddress: '0x2546FA3eA62Ac09029b1eA1Bae00eAD9Cb2500CC',
    poolId: '0x79cdf2d48abd42872a26d1b1c92ece4245327a4837b427dc9cff5f1acc40e379',
    fee: 0,
    tickSpacing: 60
  },

  // Tax Recipients (10% total)
  TAX_RECIPIENTS: {
    floorEngine: {
      address: '0x0351F7cBA83277E891D4a85Da498A7eACD764D58',
      bps: 980  // 9.8%
    },
    treasury: {
      address: '0x83Aa2CE87E4D037FaA3EbC9b2df64c2a88e222d0',
      bps: 10  // 0.1%
    },
    taxReaper: {
      address: '0xcEf912AB1934f8A0DC7A5F628E9704bdC17c6194',
      bps: 10  // 0.1%
    }
  },

  // Swapper Contract (DEPLOYED on Base Mainnet)
  // Deployment tx: 0x2449866ccfc13cf863bea788e6437b55846ef5f4e4a2ef734dc3fc9d1e56b097
  // BaseScan: https://basescan.org/address/0xA4542337205a9C129C01352CD204567bB0E91878
  SWAPPER_ADDRESS: '0xA4542337205a9C129C01352CD204567bB0E91878',  // ✅ DEPLOYED AND VERIFIED

  // Default Settings
  DEFAULT_SLIPPAGE: 1.0,  // 1%
  DEFAULT_DEADLINE: 20,   // 20 minutes
  TAX_PERCENTAGE: 10,     // 10% tax

  // Price Update Interval (milliseconds)
  PRICE_UPDATE_INTERVAL: 10000,  // 10 seconds

  // Transaction Settings
  GAS_LIMIT_MULTIPLIER: 1.2,  // Add 20% to estimated gas

  // API Endpoints (optional - for price feeds, etc.)
  API: {
    basescan: 'https://api.basescan.org/api',
    coingecko: 'https://api.coingecko.com/api/v3'
  },

  // Explorer URLs
  EXPLORER: {
    tx: (hash) => `https://basescan.org/tx/${hash}`,
    address: (addr) => `https://basescan.org/address/${addr}`,
    token: (addr) => `https://basescan.org/token/${addr}`
  },

  // Local Storage Keys
  STORAGE_KEYS: {
    slippage: 'adrian_swap_slippage',
    deadline: 'adrian_swap_deadline',
    expertMode: 'adrian_swap_expert_mode',
    unlimitedApproval: 'adrian_swap_unlimited_approval',
    recentTxs: 'adrian_swap_recent_txs'
  },

  // Max number of recent transactions to store
  MAX_RECENT_TXS: 10
};

// Validation function
function validateConfig() {
  console.log('🔧 Validating configuration...');
  
  if (CONFIG.SWAPPER_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.warn('⚠️ WARNING: SWAPPER_ADDRESS is not set! You need to deploy the AdrianSwapper contract first.');
    return false;
  }
  
  console.log('✅ Configuration validated');
  return true;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
  window.validateConfig = validateConfig;
}

