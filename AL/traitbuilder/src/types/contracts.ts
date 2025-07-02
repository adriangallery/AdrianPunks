/**
 * Types for blockchain contracts
 */

export interface ContractConfig {
  address: string;
  abi: any[];
  chainId: number;
}

export interface ContractAddresses {
  ADRIAN_LAB_CORE: string;
  ADRIAN_TRAITS_CORE: string;
  ADRIAN_TRAITS_EXTENSIONS: string;
}

export interface TransactionState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error?: string;
  hash?: string;
}

export interface ContractReadResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  refetch: () => void;
}

export interface ContractWriteResult {
  write: (() => void) | undefined;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error?: Error;
  data?: any;
}

// AdrianLabCore Contract Types
export interface TokenSkin {
  tokenId: string;
  skin: number;
}

export interface NFTMetadata {
  tokenId: string;
  owner: string;
  tokenURI: string;
  skin: number;
}

// AdrianTraitsCore Contract Types
export interface TraitBalance {
  traitId: number;
  balance: number;
}

export interface TraitMetadata {
  traitId: number;
  category: string;
  name: string;
  description?: string;
  imageURI?: string;
}

// AdrianTraitsExtensions Contract Types
export interface EquippedTrait {
  tokenId: string;
  category: string;
  traitId: number | null;
}

export interface EquippedTraitsMap {
  [tokenId: string]: {
    [category: string]: number | null;
  };
} 