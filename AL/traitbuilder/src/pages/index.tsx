/**
 * Main Trait Builder page
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { WalletConnector } from '@/components/WalletConnector';
import NFTGrid from '@/components/NFTGrid';
import TraitPanel from '@/components/TraitPanel';
import EquippedTraits from '@/components/EquippedTraits';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useWallet } from '@/hooks/useWallet';
import { useUserNFTs } from '@/hooks/useUserNFTs';
import { useUserTraits } from '@/hooks/useUserTraits';

export default function TraitBuilder() {
  const { isConnected, address } = useWallet();
  const { nfts, isLoading: nftsLoading } = useUserNFTs();
  const { traits, isLoading: traitsLoading } = useUserTraits();
  const [selectedNFT, setSelectedNFT] = useState<string | null>(null);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-8">AdrianLab Trait Builder</h1>
          <p className="text-xl text-gray-300 mb-8">
            Conecta tu wallet para comenzar a personalizar tus NFTs
          </p>
          <WalletConnector />
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>AdrianLab Trait Builder</title>
        <meta name="description" content="Customize your AdrianLab NFTs with unique traits" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          {/* Header */}
          <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-white">AdrianLab Trait Builder</h1>
                  <div className="text-sm text-gray-300">
                    {address && `Wallet: ${address.slice(0, 6)}...${address.slice(-4)}`}
                  </div>
                </div>
                <WalletConnector />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {nftsLoading || traitsLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* NFT Grid */}
                <div className="lg:col-span-2">
                  <div className="bg-black/20 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                    <h2 className="text-xl font-semibold text-white mb-4">
                      Tus NFTs ({nfts.length})
                    </h2>
                    {nfts.length > 0 ? (
                      <NFTGrid 
                        nfts={nfts} 
                        selectedNFT={selectedNFT}
                        onSelectNFT={setSelectedNFT}
                      />
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-300 text-lg">
                          No tienes NFTs de AdrianLab en tu wallet
                        </p>
                        <p className="text-gray-400 mt-2">
                          Minta algunos NFTs primero para poder personalizarlos
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trait Panel */}
                <div className="space-y-6">
                  {/* Selected NFT Info */}
                  {selectedNFT && (
                    <div className="bg-black/20 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        NFT Seleccionado
                      </h3>
                      <EquippedTraits nftId={selectedNFT} />
                    </div>
                  )}

                  {/* Available Traits */}
                  <div className="bg-black/20 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Traits Disponibles ({traits.length})
                    </h3>
                    <TraitPanel 
                      traits={traits}
                      selectedNFT={selectedNFT}
                    />
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </ErrorBoundary>
    </>
  );
} 