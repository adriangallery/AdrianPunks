/**
 * Types for traits and categories
 */

export type TraitCategory = 
  | 'BACKGROUND'
  | 'BASE'
  | 'BODY'
  | 'CLOTHING'
  | 'EYES'
  | 'MOUTH'
  | 'HEAD'
  | 'ACCESSORIES';

export interface Trait {
  id: number;
  category: TraitCategory;
  name: string;
  description?: string;
  imageURI?: string;
  balance: number;
  isEquipped: boolean;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface TraitCategoryData {
  category: TraitCategory;
  traits: Trait[];
  equippedTraitId: number | null;
}

export interface TraitFilters {
  category?: TraitCategory;
  rarity?: string;
  equipped?: boolean;
  search?: string;
}

export interface TraitSelection {
  tokenId: string;
  traits: {
    [category in TraitCategory]?: number;
  };
}

export interface TraitPreview {
  tokenId: string;
  previewUrl: string;
  traits: {
    [category in TraitCategory]?: number;
  };
  timestamp: number;
}

export interface TraitStats {
  totalTraits: number;
  equippedTraits: number;
  categoriesWithTraits: TraitCategory[];
  rarityDistribution: {
    [rarity: string]: number;
  };
} 