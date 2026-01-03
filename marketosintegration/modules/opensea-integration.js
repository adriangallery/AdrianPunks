// OpenSea Integration Module (marketosintegration only)
// Fetches listings from OpenSea v2 and normalizes to internal format.
// Uses cache (5 min) and falls back gracefully if misconfigured or rate limited.
const OpenSeaIntegration = (() => {
  const state = {
    initialized: false,
    collectionSlug: '',
    apiKey: '',
    cache: null,
    cacheAt: 0,
    cacheTtlMs: 5 * 60 * 1000, // 5 minutos
    baseUrl: 'https://api.opensea.io/api/v2'
  };

  function init() {
    if (state.initialized) return true;
    state.collectionSlug = window.OPENSEA_COLLECTION_SLUG || '';
    state.apiKey =
      window.OPENSEA_API_KEY_FALLBACK ||
      window.OPENSEA_MCP_TOKEN ||
      window.OPENSEA_API_KEY ||
      '';

    if (!state.collectionSlug) {
      console.warn('⚠️ OpenSeaIntegration: collection slug no configurado (OPENSEA_COLLECTION_SLUG vacío)');
      return false;
    }

    state.initialized = true;
    console.log('🔌 OpenSeaIntegration: init OK', {
      slug: state.collectionSlug,
      apiKey: state.apiKey ? 'present' : 'missing'
    });
    return true;
  }

  function extractTokenId(listing) {
    const protoParams = listing?.protocol_data?.parameters;
    const offerId = protoParams?.offer?.[0]?.identifierOrCriteria;
    const itemId =
      listing?.item?.nft_id ||
      listing?.item?.identifier ||
      listing?.token_id ||
      offerId;
    if (!itemId) return null;
    const numeric = itemId.toString().split(':').pop();
    const parsed = parseInt(numeric, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function extractPriceWei(listing) {
    const price =
      listing?.price?.current?.value ||
      listing?.price?.current?.price ||
      listing?.current_price ||
      listing?.protocol_data?.parameters?.consideration?.[0]?.startAmount ||
      listing?.protocol_data?.parameters?.totalOriginalConsiderationItems ||
      listing?.protocol_data?.parameters?.price;
    return price ? price.toString() : null;
  }

  function buildPermalink(tokenId) {
    if (window.NFT_ADDRESS) {
      return `https://opensea.io/assets/base/${window.NFT_ADDRESS}/${tokenId}`;
    }
    return '';
  }

  function normalizeListing(listing) {
    const ethers5 = window.ethers5Backup || window.ethers;
    const tokenId = extractTokenId(listing);
    const priceWei = extractPriceWei(listing);

    if (!tokenId || !priceWei) return null;

    let price;
    try {
      price = ethers5.BigNumber.from(priceWei);
    } catch (e) {
      console.warn('⚠️ OpenSeaIntegration: no se pudo parsear priceWei', priceWei);
      return null;
    }

    const priceETH = parseFloat(ethers5.utils.formatUnits(price, 18));

    return {
      tokenId,
      price,
      priceETH,
      seller: listing?.maker?.address || listing?.maker || '',
      source: 'opensea',
      isContractOwned: false,
      permalink: listing?.permalink || buildPermalink(tokenId),
      orderHash: listing?.order_hash || listing?.orderHash || listing?.order_hash
    };
  }

  async function fetchListings() {
    if (!init()) return [];

    const now = Date.now();
    if (state.cache && now - state.cacheAt < state.cacheTtlMs) {
      console.log('🟢 OpenSeaIntegration: cache hit', state.cache.length);
      return state.cache;
    }

    const url = `${state.baseUrl}/listings/collection/${state.collectionSlug}/all?limit=50&order_by=eth_price&order_direction=asc`;
    const headers = { accept: 'application/json' };
    if (state.apiKey) headers['X-API-KEY'] = state.apiKey;

    try {
      console.log('🌐 OpenSeaIntegration: fetching', url);
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const text = await res.text();
        console.warn('⚠️ OpenSeaIntegration: respuesta no OK', res.status, text.slice(0, 200));
        return [];
      }
      const data = await res.json();
      const rawListings = data?.listings || data?.orders || data?.data || [];
      const normalized = rawListings
        .map(normalizeListing)
        .filter(Boolean);

      state.cache = normalized;
      state.cacheAt = now;
      console.log(`✅ OpenSeaIntegration: ${normalized.length} listings cargados`);
      return normalized;
    } catch (error) {
      console.error('❌ OpenSeaIntegration: error al obtener listings', error);
      return [];
    }
  }

  function clearCache() {
    state.cache = null;
    state.cacheAt = 0;
  }

  return {
    init,
    getListings: fetchListings,
    clearCache
  };
})();

