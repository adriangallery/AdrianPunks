/**
 * Types for NFTs
 */

export interface NFT {
  tokenId: string;
  owner: string;
  currentSkin: number;
  previewUrl: string;
  metadata?: NFTMetadata;
  equippedTraits?: EquippedTraits;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: NFTAttribute[];
  external_url?: string;
  animation_url?: string;
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface EquippedTraits {
  [category: string]: number | null;
}

export interface NFTCollection {
  nfts: NFT[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface NFTFilters {
  search?: string;
  hasTraits?: boolean;
  equippedTraits?: string[];
  sortBy?: 'tokenId' | 'recent' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface NFTStats {
  totalNFTs: number;
  nftsWithTraits: number;
  averageTraitsPerNFT: number;
  mostEquippedTraits: {
    traitId: number;
    count: number;
  }[];
} 