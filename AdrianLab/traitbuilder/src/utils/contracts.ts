/**
 * Contract configuration and addresses
 */

import { ContractAddresses } from '@/types/contracts';
import { getContractAddresses } from './constants';

// Contract addresses - will be loaded dynamically
export const getContracts = (): ContractAddresses => {
  return getContractAddresses();
};

// Chain configuration - BASE Network
export const getChainConfig = () => {
  const chainId = typeof window !== 'undefined' && window.ADRIANLAB_CONFIG 
    ? window.ADRIANLAB_CONFIG.CHAIN_ID 
    : 8453;
  
  const rpcUrl = typeof window !== 'undefined' && window.ADRIANLAB_CONFIG 
    ? window.ADRIANLAB_CONFIG.RPC_URL 
    : 'https://mainnet.base.org';

  return {
    id: chainId,
    name: 'Base',
    network: 'base',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
      public: {
        http: [rpcUrl],
      },
    },
    blockExplorers: {
      default: {
        name: 'Basescan',
        url: 'https://basescan.org',
      },
    },
  };
};

export const CHAIN_CONFIG = getChainConfig();
export const CONTRACTS = getContracts();

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