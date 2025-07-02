/**
 * Contract configuration and addresses
 */

import { ContractAddresses } from '@/types/contracts';

// Contract addresses - Update these with actual deployed addresses
export const CONTRACTS: ContractAddresses = {
  ADRIAN_LAB_CORE: process.env.NEXT_PUBLIC_ADRIAN_LAB_CORE || '0x0000000000000000000000000000000000000000',
  ADRIAN_TRAITS_CORE: process.env.NEXT_PUBLIC_ADRIAN_TRAITS_CORE || '0x0000000000000000000000000000000000000000',
  ADRIAN_TRAITS_EXTENSIONS: process.env.NEXT_PUBLIC_ADRIAN_TRAITS_EXTENSIONS || '0x0000000000000000000000000000000000000000',
};

// Chain configuration
export const CHAIN_CONFIG = {
  id: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1'),
  name: 'Ethereum',
  network: 'ethereum',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/'],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherscan',
      url: 'https://etherscan.io',
    },
  },
};

// Contract ABIs will be imported from the abis directory
export const getContractConfig = (contractName: keyof ContractAddresses) => ({
  address: CONTRACTS[contractName],
  chainId: CHAIN_CONFIG.id,
});

// Validation functions
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const isValidTokenId = (tokenId: string): boolean => {
  const num = parseInt(tokenId);
  return !isNaN(num) && num >= 0;
};

export const isValidTraitId = (traitId: number): boolean => {
  return traitId >= 1 && traitId <= 99999;
};

// Error handling
export class ContractError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ContractError';
  }
}

export const handleContractError = (error: any): string => {
  if (error.code === 'ACTION_REJECTED') {
    return 'Transaction was rejected by user';
  }
  if (error.code === 'INSUFFICIENT_FUNDS') {
    return 'Insufficient funds for transaction';
  }
  if (error.message?.includes('User rejected')) {
    return 'User rejected the transaction';
  }
  return error.message || 'An unknown error occurred';
}; 