/**
 * Types for API responses
 */

import { Trait, TraitStats } from './traits';
import { NFT, NFTStats } from './nft';

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PreviewAPIResponse {
  previewUrl: string;
  traits: {
    [category: string]: number;
  };
  tokenId: string;
  timestamp: number;
}

export interface PreviewAPIRequest {
  tokenId: string;
  traits: {
    [category: string]: number;
  };
}

export interface TraitAPIResponse {
  traits: Trait[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface NFTAPIResponse {
  nfts: NFT[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface StatsAPIResponse {
  nftStats: NFTStats;
  traitStats: TraitStats;
  userStats: UserStats;
}

export interface UserStats {
  totalNFTs: number;
  totalTraits: number;
  equippedTraits: number;
  favoriteNFTs: string[];
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'equip' | 'unequip' | 'mint' | 'transfer';
  tokenId: string;
  traitId?: number;
  category?: string;
  timestamp: number;
  transactionHash?: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
} 