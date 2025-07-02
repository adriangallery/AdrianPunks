/**
 * Contract configuration and addresses
 */

import { ContractAddresses } from '@/types/contracts';

// Contract addresses - BASE Network
export const CONTRACTS: ContractAddresses = {
  ADRIAN_LAB_CORE: process.env.NEXT_PUBLIC_ADRIAN_LAB_CORE || '0x6e369bf0e4e0c106192d606fb6d85836d684da75',
  ADRIAN_TRAITS_CORE: process.env.NEXT_PUBLIC_ADRIAN_TRAITS_CORE || '0x90546848474fb3c9fda3fdad887969bb244e7e58',
  ADRIAN_TRAITS_EXTENSIONS: process.env.NEXT_PUBLIC_ADRIAN_TRAITS_EXTENSIONS || '0x0000000000000000000000000000000000000000',
};

// Chain configuration - BASE Network
export const CHAIN_CONFIG = {
  id: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '8453'),
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Basescan',
      url: 'https://basescan.org',
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