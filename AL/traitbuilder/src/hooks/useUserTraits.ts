/**
 * Hook for fetching user traits
 */

import { useAccount, useContractReads } from 'wagmi';
import { ADRIAN_TRAITS_CORE_ADDRESS } from '../utils/constants';
import AdrianTraitsCoreABI from '../abis/AdrianTraitsCore.json';

// Filtrar solo las funciones del ABI para evitar errores de tipado
const abiFunctions = AdrianTraitsCoreABI.filter(item => item.type === 'function');

export interface Trait {
  id: string;
  tokenId: number;
  category: string;
  name: string;
  image: string;
  rarity: string;
  balance: number;
}

export function useUserTraits() {
  const { address, isConnected } = useAccount();

  // Leer el balance de traits de la wallet
  const { data: balanceData, isLoading: balanceLoading } = useContractReads({
    contracts: [
      {
        address: ADRIAN_TRAITS_CORE_ADDRESS as `0x${string}`,
        abi: abiFunctions,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
        enabled: !!address && isConnected,
      },
    ],
  });

  const balance = balanceData?.[0]?.result as bigint | undefined;
  const traitCount = balance ? Number(balance) : 0;

  // Crear contratos para leer cada trait por índice
  const traitContracts = Array.from({ length: traitCount }, (_, index) => ({
    address: ADRIAN_TRAITS_CORE_ADDRESS as `0x${string}`,
    abi: abiFunctions,
    functionName: 'tokenOfOwnerByIndex' as const,
    args: [address as `0x${string}`, BigInt(index)],
    enabled: !!address && isConnected && traitCount > 0,
  }));

  // Leer todos los trait IDs
  const { data: traitIdsData, isLoading: traitIdsLoading } = useContractReads({
    contracts: traitContracts,
  });

  const traitIds = traitIdsData?.map(result => 
    result.result ? Number(result.result) : null
  ).filter(id => id !== null) as number[] || [];

  // Crear contratos para leer datos de cada trait
  const traitDataContracts = traitIds.map(traitId => [
    {
      address: ADRIAN_TRAITS_CORE_ADDRESS as `0x${string}`,
      abi: abiFunctions,
      functionName: 'uri' as const,
      args: [BigInt(traitId)],
      enabled: !!address && isConnected,
    },
    {
      address: ADRIAN_TRAITS_CORE_ADDRESS as `0x${string}`,
      abi: abiFunctions,
      functionName: 'balanceOf' as const,
      args: [address as `0x${string}`, BigInt(traitId)],
      enabled: !!address && isConnected,
    },
  ]).flat();

  // Leer datos de todos los traits
  const { data: traitData, isLoading: traitDataLoading } = useContractReads({
    contracts: traitDataContracts,
  });

  // Procesar los datos de los traits
  const traits: Trait[] = [];
  
  if (traitData && traitIds.length > 0) {
    for (let i = 0; i < traitIds.length; i++) {
      const traitId = traitIds[i];
      const baseIndex = i * 2;
      
      const uriData = traitData[baseIndex]?.result as string | undefined;
      const balanceData = traitData[baseIndex + 1]?.result as bigint | undefined;

      if (uriData && balanceData) {
        const balance = Number(balanceData);
        
        // Parsear la URI para obtener información del trait
        // Asumiendo que la URI contiene información del trait
        const traitInfo = parseTraitURI(uriData, traitId);
        
        traits.push({
          id: `trait-${traitId}`,
          tokenId: traitId,
          category: traitInfo.category,
          name: traitInfo.name,
          image: traitInfo.image,
          rarity: traitInfo.rarity,
          balance,
        });
      }
    }
  }

  const isLoading = balanceLoading || traitIdsLoading || traitDataLoading;

  return {
    traits,
    isLoading,
    error: null,
  };
}

// Función auxiliar para parsear la URI del trait
function parseTraitURI(uri: string, traitId: number) {
  // Por ahora, crear datos de ejemplo basados en el traitId
  // En un caso real, la URI contendría metadata real
  const categories = ['BACKGROUND', 'BODY', 'EYES', 'MOUTH', 'ACCESSORY'];
  const category = categories[traitId % categories.length];
  
  return {
    category,
    name: `${category} #${traitId}`,
    image: `/api/preview?traitId=${traitId}`,
    rarity: ['Common', 'Rare', 'Epic', 'Legendary'][traitId % 4],
  };
} 