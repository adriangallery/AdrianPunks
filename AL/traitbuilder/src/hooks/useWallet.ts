/**
 * Hook for wallet connection and management
 */

import { useAccount, useConnect, useDisconnect, useNetwork, useSwitchNetwork } from 'wagmi';
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
  const { switchNetwork } = useSwitchNetwork();

  const [error, setError] = useState<string | null>(null);

  // Check if connected to correct network
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

  // Switch to correct network
  const switchToCorrectNetwork = useCallback(async () => {
    if (switchNetwork) {
      try {
        await switchNetwork(CHAIN_CONFIG.id);
        setError(null);
      } catch (err) {
        setError('Failed to switch network');
        console.error('Network switch error:', err);
      }
    }
  }, [switchNetwork]);

  // Auto-switch network if incorrect
  useEffect(() => {
    if (isConnected && !isCorrectNetwork && switchNetwork) {
      setError('Please switch to the correct network');
    } else if (isConnected && isCorrectNetwork) {
      setError(null);
    }
  }, [isConnected, isCorrectNetwork, switchNetwork]);

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
    switchToCorrectNetwork,
    
    // Available connectors
    availableConnectors,
    
    // Formatted address
    formattedAddress: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '',
  };
}; 