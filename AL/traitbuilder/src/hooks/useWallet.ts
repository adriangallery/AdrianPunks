/**
 * Hook for wallet connection and management
 */

import { useAccount, useConnect, useDisconnect, useNetwork } from 'wagmi';
import { useCallback, useEffect, useState } from 'react';
import { CHAIN_CONFIG } from '@/utils/contracts';
import { ERROR_MESSAGES } from '@/utils/constants';

export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | undefined;
  chainId: number | undefined;
  isCorrectNetwork: boolean;
  error: string | null;
}

export const useWallet = () => {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();

  const [error, setError] = useState<string | null>(null);

  // Check if connected to correct network (BASE)
  const isCorrectNetwork = chain?.id === CHAIN_CONFIG.id;

  // Connect wallet
  const connectWallet = useCallback(async (connectorId: string) => {
    try {
      setError(null);
      const connector = connectors.find(c => c.id === connectorId);
      if (connector) {
        await connect({ connector });
      }
    } catch (err) {
      setError(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
      console.error('Wallet connection error:', err);
    }
  }, [connect, connectors]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    try {
      disconnect();
      setError(null);
    } catch (err) {
      console.error('Wallet disconnection error:', err);
    }
  }, [disconnect]);

  // Auto-check network
  useEffect(() => {
    if (isConnected && !isCorrectNetwork) {
      setError('Please connect to Base network');
    } else if (isConnected && isCorrectNetwork) {
      setError(null);
    }
  }, [isConnected, isCorrectNetwork]);

  // Handle connection errors
  useEffect(() => {
    if (connectError) {
      setError(connectError.message);
    }
  }, [connectError]);

  // Get available connectors
  const availableConnectors = connectors.filter(connector => connector.ready);

  return {
    // State
    isConnected,
    isConnecting,
    address,
    chainId: chain?.id,
    isCorrectNetwork,
    error,
    
    // Actions
    connectWallet,
    disconnectWallet,
    
    // Available connectors
    availableConnectors,
    
    // Formatted address
    formattedAddress: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '',
  };
}; 