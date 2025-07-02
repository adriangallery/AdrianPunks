/**
 * Main Trait Builder page
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { WalletConnector } from '@/components/WalletConnector';
import { NFTSelector } from '@/components/NFTSelector';
import { TraitPanel } from '@/components/TraitPanel';
import { PreviewDisplay } from '@/components/PreviewDisplay';
import { EquippedTraits } from '@/components/EquippedTraits';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useWallet } from '@/hooks/useWallet';
import { useUserNFTs } from '@/hooks/useUserNFTs';
import { useUserTraits } from '@/hooks/useUserTraits';
import { NFT } from '@/types/nft';
import { TraitCategory } from '@/types/traits';

export default function TraitBuilder() {
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TraitCategory>('BACKGROUND');

  // Wallet connection
  const { isConnected, address } = useWallet();

  // User NFTs
  const { nfts, isLoading: nftsLoading, error: nftsError } = useUserNFTs({
    address,
    enabled: isConnected,
  });

  // User traits
  const { traits, traitsByCategory, isLoading: traitsLoading, error: traitsError } = useUserTraits({
    address,
    enabled: isConnected && !!selectedNFT,
  });

  // Handle NFT selection
  const handleSelectNFT = (nft: NFT) => {
    setSelectedNFT(nft);
  };

  // Handle category selection
  const handleSelectCategory = (category: TraitCategory) => {
    setSelectedCategory(category);
  };

  return (
    <>
      <Head>
        <title>AdrianLab Trait Builder</title>
        <meta name="description" content="Customize your AdrianLab NFTs with unique traits" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">
                    AdrianLab Trait Builder
                  </h1>
                </div>
                <WalletConnector />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {!isConnected ? (
              // Wallet Connection Screen
              <div className="flex items-center justify-center min-h-[60vh]">
                <WalletConnector />
              </div>
            ) : (
              // Main Builder Interface
              <div className="space-y-8">
                {/* NFT Selection */}
                <section>
                  <NFTSelector
                    nfts={nfts}
                    selectedNFT={selectedNFT}
                    onSelectNFT={handleSelectNFT}
                    isLoading={nftsLoading}
                    error={nftsError}
                  />
                </section>

                {/* Trait Builder (only show if NFT is selected) */}
                {selectedNFT && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Panel - Trait Categories */}
                    <div className="lg:col-span-1">
                      <TraitPanel
                        traitsByCategory={traitsByCategory}
                        selectedCategory={selectedCategory}
                        onSelectCategory={handleSelectCategory}
                        isLoading={traitsLoading}
                        error={traitsError}
                      />
                    </div>

                    {/* Center Panel - Preview */}
                    <div className="lg:col-span-1">
                      <PreviewDisplay
                        nft={selectedNFT}
                        selectedTraits={traitsByCategory}
                      />
                    </div>

                    {/* Right Panel - Equipped Traits */}
                    <div className="lg:col-span-1">
                      <EquippedTraits
                        nft={selectedNFT}
                        equippedTraits={traitsByCategory}
                      />
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {(nftsLoading || traitsLoading) && (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" />
                  </div>
                )}

                {/* Error State */}
                {(nftsError || traitsError) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Error loading data
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          {nftsError && <p>{nftsError}</p>}
                          {traitsError && <p>{traitsError}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center text-gray-500 text-sm">
                <p>&copy; 2024 AdrianLab. All rights reserved.</p>
                <p className="mt-2">
                  Built with Next.js, Tailwind CSS, and Web3 technologies
                </p>
              </div>
            </div>
          </footer>
        </div>
      </ErrorBoundary>
    </>
  );
} 