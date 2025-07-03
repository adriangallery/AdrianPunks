/**
 * Wallet connection component
 */

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '@/hooks/useWallet';

interface WalletConnectorProps {
  className?: string;
}

export const WalletConnector: React.FC<WalletConnectorProps> = ({ className = '' }) => {
  const {
    isConnected,
    isConnecting,
    address,
    isCorrectNetwork,
    error,
    formattedAddress,
  } = useWallet();

  if (isConnected) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        {/* Wallet Info */}
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700">
            {formattedAddress}
          </span>
        </div>

        {/* Network Status */}
        {!isCorrectNetwork && (
          <div className="bg-orange-100 border border-orange-300 text-orange-700 px-3 py-2 rounded-lg text-sm">
            Please connect to Base network
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Connect Button (RainbowKit) */}
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Welcome Message */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to AdrianLab Trait Builder
        </h2>
        <p className="text-gray-600 mb-6">
          Connect your wallet to start customizing your NFTs on Base network
        </p>
      </div>

      {/* Connect Button */}
      <ConnectButton />

      {/* Loading State */}
      {isConnecting && (
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span>Connecting...</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm max-w-md text-center">
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
        <h3 className="font-medium text-blue-900 mb-2">How to get started:</h3>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Connect your wallet (MetaMask, WalletConnect, etc.)</li>
          <li>2. Make sure you're on Base network</li>
          <li>3. Select an NFT from your collection</li>
          <li>4. Browse and equip traits to customize your NFT</li>
        </ol>
      </div>
    </div>
  );
}; 