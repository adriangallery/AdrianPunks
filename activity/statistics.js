/**
 * Statistics Module for $ADRIAN Ecosystem Activity
 * 
 * Este módulo maneja todas las estadísticas y gráficos de la página de actividad.
 * Se puede cargar de forma independiente y es completamente configurable.
 */

class StatisticsManager {
  constructor(supabaseClient, config = {}) {
    this.supabaseClient = supabaseClient;
    this.config = {
      // Direcciones de contratos
      contracts: {
        FLOOR_ENGINE: config.contracts?.FLOOR_ENGINE || '0x0351F7cBA83277E891D4a85Da498A7eACD764D58',
        ERC20: config.contracts?.ERC20 || '0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea',
        ADRIANLABCORE: config.contracts?.ADRIANLABCORE || '0x6e369bf0e4e0c106192d606fb6d85836d684da75',
        ERC1155: config.contracts?.ERC1155 || '0x90546848474fb3c9fda3fdad887969bb244e7e58',
        TRAITS_EXTENSIONS: config.contracts?.TRAITS_EXTENSIONS || '0x0995c0dA1ca071b792E852b6Ec531b7cD7d1F8D6',
        ADRIAN_SHOP: config.contracts?.ADRIAN_SHOP || '0x4b265927b1521995ce416bba3bed98231d2e946b',
        ADRIAN_NAME_REGISTRY: config.contracts?.ADRIAN_NAME_REGISTRY || '0xaeC5ED33c88c1943BB7452aC4B571ad0b4c4068C',
        ADRIAN_SERUM_MODULE: config.contracts?.ADRIAN_SERUM_MODULE || '0x0000000000000000000000000000000000000000',
        PUNK_QUEST: config.contracts?.PUNK_QUEST || '0xaf22843e195b792a3f874562ab7cee751066665e'
      },
      // Configuración de gráficos
      charts: {
        enabled: config.charts?.enabled !== false,
        library: config.charts?.library || 'chartjs', // 'chartjs', 'apexcharts', 'd3'
        theme: config.charts?.theme || 'auto' // 'auto', 'light', 'dark'
      },
      // Configuración de estadísticas
      stats: {
        refreshInterval: config.stats?.refreshInterval || 60000, // 1 minuto
        cacheTTL: config.stats?.cacheTTL || 30000 // 30 segundos
      }
    };
    
    this.cache = new Map();
    this.charts = new Map();
  }

  /**
   * Inicializar el módulo de estadísticas
   */
  async init() {
    if (!this.supabaseClient) {
      console.error('StatisticsManager: supabaseClient no proporcionado');
      return;
    }

    console.log('📊 StatisticsManager: Inicializando...');
    
    // Cargar configuración de gráficos si es necesario
    if (this.config.charts.enabled) {
      await this.loadChartLibrary();
    }

    // Cargar estadísticas iniciales
    await this.loadAllStatistics();
  }

  /**
   * Cargar librería de gráficos según configuración
   */
  async loadChartLibrary() {
    const library = this.config.charts.library;
    
    switch (library) {
      case 'chartjs':
        if (!window.Chart) {
          await this.loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js');
        }
        break;
      case 'apexcharts':
        if (!window.ApexCharts) {
          await this.loadScript('https://cdn.jsdelivr.net/npm/apexcharts@3.44.0/dist/apexcharts.min.js');
        }
        break;
      default:
        console.warn(`StatisticsManager: Librería de gráficos "${library}" no soportada`);
    }
  }

  /**
   * Cargar script dinámicamente
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Obtener fechas para un período predefinido
   */
  getPeriodDates(period) {
    const now = new Date();
    let dateFrom = null;
    let dateTo = now.toISOString().split('T')[0];

    switch (period) {
      case '24h':
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '7d':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '30d':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '90d':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1y':
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'all':
        dateFrom = null;
        dateTo = null;
        break;
      default:
        dateFrom = null;
        dateTo = null;
    }

    return { dateFrom, dateTo };
  }

  /**
   * Cargar todas las estadísticas con filtro de período
   */
  async loadAllStatistics(dateFrom = null, dateTo = null) {
    try {
      const stats = await Promise.all([
        this.getERC20Metrics(dateFrom, dateTo),
        this.getFloorEngineMetrics(dateFrom, dateTo),
        this.getAdrianLABCoreMetrics(dateFrom, dateTo),
        this.getERC1155Metrics(dateFrom, dateTo),
        this.getTraitsExtensionsMetrics(dateFrom, dateTo),
        this.getPunkQuestMetrics(dateFrom, dateTo)
      ]);

      return {
        erc20: stats[0],
        floorEngine: stats[1],
        adrianLABCore: stats[2],
        erc1155: stats[3],
        traitsExtensions: stats[4],
        punkQuest: stats[5]
      };
    } catch (error) {
      console.error('StatisticsManager: Error cargando estadísticas:', error);
      return null;
    }
  }

  /**
   * Obtener métricas completas de ERC20 con filtro de fecha
   */
  async getERC20Metrics(dateFrom = null, dateTo = null) {
    const cacheKey = `erc20_metrics_${dateFrom || 'all'}_${dateTo || 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.stats.cacheTTL) {
      return cached.data;
    }

    try {
      let transfersQuery = this.supabaseClient
        .from('erc20_transfers')
        .select('*')
        .eq('contract_address', this.config.contracts.ERC20.toLowerCase());

      if (dateFrom) {
        transfersQuery = transfersQuery.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        transfersQuery = transfersQuery.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: transfers, count: totalTransfers } = await transfersQuery;

      // Calcular volumen total
      const totalVolume = transfers?.reduce((sum, t) => {
        try {
          return sum + BigInt(t.value_wei || 0);
        } catch {
          return sum;
        }
      }, 0n) || 0n;

      // Calcular promedio de transfer
      const avgTransferSize = totalTransfers > 0 ? totalVolume / BigInt(totalTransfers) : 0n;

      // Obtener unique holders (direcciones que han recibido tokens)
      const uniqueReceivers = new Set(transfers?.map(t => t.to_address?.toLowerCase()).filter(Boolean) || []);
      const uniqueSenders = new Set(transfers?.map(t => t.from_address?.toLowerCase()).filter(Boolean) || []);
      const uniqueHolders = new Set([...uniqueReceivers, ...uniqueSenders]);

      // Obtener staking data
      let stakingQuery = this.supabaseClient
        .from('erc20_custom_events')
        .select('*')
        .eq('contract_address', this.config.contracts.ERC20.toLowerCase())
        .eq('event_name', 'Staked');

      if (dateFrom) {
        stakingQuery = stakingQuery.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        stakingQuery = stakingQuery.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: stakingEvents } = await stakingQuery;
      const totalStaked = stakingEvents?.reduce((sum, e) => {
        try {
          const amount = e.event_data?.amount || e.value_wei || '0';
          return sum + BigInt(amount);
        } catch {
          return sum;
        }
      }, 0n) || 0n;

      const stats = {
        totalTransfers: totalTransfers || 0,
        totalVolume: totalVolume.toString(),
        avgTransferSize: avgTransferSize.toString(),
        uniqueHolders: uniqueHolders.size,
        totalStaked: totalStaked.toString(),
        lastUpdated: new Date().toISOString()
      };

      this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
      return stats;
    } catch (error) {
      console.error('StatisticsManager: Error obteniendo métricas ERC20:', error);
      return null;
    }
  }

  /**
   * Obtener estadísticas de ERC20 (método legacy, mantiene compatibilidad)
   */
  async getERC20Statistics() {
    const cacheKey = 'erc20_stats';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.stats.cacheTTL) {
      return cached.data;
    }

    try {
      // Total transfers
      const { count: totalTransfers } = await this.supabaseClient
        .from('erc20_transfers')
        .select('*', { count: 'exact', head: true })
        .eq('contract_address', this.config.contracts.ERC20.toLowerCase());

      // Total approvals
      const { count: totalApprovals } = await this.supabaseClient
        .from('erc20_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('contract_address', this.config.contracts.ERC20.toLowerCase());

      // Volume (suma de value_wei)
      const { data: transfers } = await this.supabaseClient
        .from('erc20_transfers')
        .select('value_wei')
        .eq('contract_address', this.config.contracts.ERC20.toLowerCase());

      const totalVolume = transfers?.reduce((sum, t) => {
        try {
          return sum + BigInt(t.value_wei || 0);
        } catch {
          return sum;
        }
      }, 0n) || 0n;

      const stats = {
        totalTransfers: totalTransfers || 0,
        totalApprovals: totalApprovals || 0,
        totalVolume: totalVolume.toString(),
        lastUpdated: new Date().toISOString()
      };

      this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
      return stats;
    } catch (error) {
      console.error('StatisticsManager: Error obteniendo estadísticas ERC20:', error);
      return null;
    }
  }

  /**
   * Obtener métricas completas de FloorEngine con filtro de fecha
   */
  async getFloorEngineMetrics(dateFrom = null, dateTo = null) {
    const cacheKey = `floorengine_metrics_${dateFrom || 'all'}_${dateTo || 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.stats.cacheTTL) {
      return cached.data;
    }

    try {
      // Active listings (sin filtro de fecha, son estado actual)
      const { count: activeListings, data: listings } = await this.supabaseClient
        .from('punk_listings')
        .select('*')
        .eq('is_listed', true);

      // Calcular floor price (precio más bajo)
      let floorPrice = null;
      if (listings && listings.length > 0) {
        const prices = listings
          .map(l => l.price_wei ? BigInt(l.price_wei) : null)
          .filter(Boolean)
          .sort((a, b) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
          });
        floorPrice = prices.length > 0 ? prices[0].toString() : null;
      }

      // Trades con filtro de fecha
      let tradesQuery = this.supabaseClient
        .from('trade_events')
        .select('*');

      if (dateFrom) {
        tradesQuery = tradesQuery.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        tradesQuery = tradesQuery.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: trades, count: totalTrades } = await tradesQuery;

      // Calcular volumen total y precio promedio
      const totalVolume = trades?.reduce((sum, t) => {
        try {
          return sum + BigInt(t.price_wei || 0);
        } catch {
          return sum;
        }
      }, 0n) || 0n;

      const avgTradePrice = totalTrades > 0 ? totalVolume / BigInt(totalTrades) : 0n;

      // Sweeps con filtro de fecha
      let sweepsQuery = this.supabaseClient
        .from('sweep_events')
        .select('*', { count: 'exact', head: true });

      if (dateFrom) {
        sweepsQuery = sweepsQuery.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        sweepsQuery = sweepsQuery.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { count: totalSweeps } = await sweepsQuery;

      const stats = {
        activeListings: activeListings || 0,
        totalTrades: totalTrades || 0,
        totalVolume: totalVolume.toString(),
        avgTradePrice: avgTradePrice.toString(),
        floorPrice: floorPrice,
        totalSweeps: totalSweeps || 0,
        lastUpdated: new Date().toISOString()
      };

      this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
      return stats;
    } catch (error) {
      console.error('StatisticsManager: Error obteniendo métricas FloorEngine:', error);
      return null;
    }
  }

  /**
   * Obtener estadísticas de FloorEngine (método legacy, mantiene compatibilidad)
   */
  async getFloorEngineStatistics() {
    const cacheKey = 'floorengine_stats';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.stats.cacheTTL) {
      return cached.data;
    }

    try {
      // Active listings
      const { count: activeListings } = await this.supabaseClient
        .from('punk_listings')
        .select('*', { count: 'exact', head: true })
        .eq('is_listed', true);

      // Total trades
      const { count: totalTrades } = await this.supabaseClient
        .from('trade_events')
        .select('*', { count: 'exact', head: true });

      // Total sweeps
      const { count: totalSweeps } = await this.supabaseClient
        .from('sweep_events')
        .select('*', { count: 'exact', head: true });

      const stats = {
        activeListings: activeListings || 0,
        totalTrades: totalTrades || 0,
        totalSweeps: totalSweeps || 0,
        lastUpdated: new Date().toISOString()
      };

      this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
      return stats;
    } catch (error) {
      console.error('StatisticsManager: Error obteniendo estadísticas FloorEngine:', error);
      return null;
    }
  }

  /**
   * Obtener métricas completas de AdrianLABCore con filtro de fecha
   */
  async getAdrianLABCoreMetrics(dateFrom = null, dateTo = null) {
    const cacheKey = `adrianlabcore_metrics_${dateFrom || 'all'}_${dateTo || 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.stats.cacheTTL) {
      return cached.data;
    }

    try {
      // ERC721 transfers
      let transfersQuery = this.supabaseClient
        .from('erc721_transfers')
        .select('*')
        .eq('contract_address', this.config.contracts.ADRIANLABCORE);

      if (dateFrom) {
        transfersQuery = transfersQuery.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        transfersQuery = transfersQuery.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: transfers, count: totalTransfers } = await transfersQuery;

      // Unique holders
      const uniqueHolders = new Set(transfers?.map(t => t.to_address?.toLowerCase()).filter(Boolean) || []);

      // Mints (from_address = 0x0)
      const mints = transfers?.filter(t => t.from_address?.toLowerCase() === '0x0000000000000000000000000000000000000000') || [];
      const totalMinted = mints.length;

      // Burns (to_address = 0x0)
      const burns = transfers?.filter(t => t.to_address?.toLowerCase() === '0x0000000000000000000000000000000000000000') || [];
      const totalBurned = burns.length;

      // Custom events
      let customQuery = this.supabaseClient
        .from('erc721_custom_events')
        .select('*')
        .eq('contract_address', this.config.contracts.ADRIANLABCORE);

      if (dateFrom) {
        customQuery = customQuery.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        customQuery = customQuery.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: customEvents } = await customQuery;
      const skinsAssigned = customEvents?.filter(e => e.event_name === 'SkinAssigned').length || 0;
      const serumsApplied = customEvents?.filter(e => e.event_name === 'SerumApplied').length || 0;

      const stats = {
        totalTransfers: totalTransfers || 0,
        totalMinted: totalMinted,
        totalBurned: totalBurned,
        uniqueHolders: uniqueHolders.size,
        skinsAssigned: skinsAssigned,
        serumsApplied: serumsApplied,
        lastUpdated: new Date().toISOString()
      };

      this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
      return stats;
    } catch (error) {
      console.error('StatisticsManager: Error obteniendo métricas AdrianLABCore:', error);
      return null;
    }
  }

  /**
   * Obtener métricas completas de ERC1155 con filtro de fecha
   */
  async getERC1155Metrics(dateFrom = null, dateTo = null) {
    const cacheKey = `erc1155_metrics_${dateFrom || 'all'}_${dateTo || 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.stats.cacheTTL) {
      return cached.data;
    }

    try {
      // Single transfers
      let singleQuery = this.supabaseClient
        .from('erc1155_transfers_single')
        .select('*')
        .eq('contract_address', this.config.contracts.ERC1155);

      if (dateFrom) {
        singleQuery = singleQuery.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        singleQuery = singleQuery.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: singleTransfers, count: singleCount } = await singleQuery;

      // Batch transfers
      let batchQuery = this.supabaseClient
        .from('erc1155_transfers_batch')
        .select('*')
        .eq('contract_address', this.config.contracts.ERC1155);

      if (dateFrom) {
        batchQuery = batchQuery.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        batchQuery = batchQuery.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: batchTransfers, count: batchCount } = await batchQuery;

      const totalTransfers = (singleCount || 0) + (batchCount || 0);

      // Unique asset types
      const assetTypes = new Set();
      singleTransfers?.forEach(t => {
        if (t.token_id) assetTypes.add(t.token_id);
      });
      batchTransfers?.forEach(t => {
        if (t.token_ids && Array.isArray(t.token_ids)) {
          t.token_ids.forEach(id => assetTypes.add(id));
        }
      });

      // Unique holders
      const uniqueHolders = new Set();
      singleTransfers?.forEach(t => {
        if (t.to_address) uniqueHolders.add(t.to_address.toLowerCase());
      });
      batchTransfers?.forEach(t => {
        if (t.to_address) uniqueHolders.add(t.to_address.toLowerCase());
      });

      // Mints y burns
      const mints = singleTransfers?.filter(t => t.from_address?.toLowerCase() === '0x0000000000000000000000000000000000000000') || [];
      const burns = singleTransfers?.filter(t => t.to_address?.toLowerCase() === '0x0000000000000000000000000000000000000000') || [];

      // Custom events
      let customQuery = this.supabaseClient
        .from('erc1155_custom_events')
        .select('*')
        .eq('contract_address', this.config.contracts.ERC1155);

      if (dateFrom) {
        customQuery = customQuery.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        customQuery = customQuery.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: customEvents } = await customQuery;
      const packsOpened = customEvents?.filter(e => e.event_name === 'PackOpened').length || 0;

      const stats = {
        totalTransfers: totalTransfers,
        totalMinted: mints.length,
        totalBurned: burns.length,
        uniqueAssetTypes: assetTypes.size,
        uniqueHolders: uniqueHolders.size,
        packsOpened: packsOpened,
        lastUpdated: new Date().toISOString()
      };

      this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
      return stats;
    } catch (error) {
      console.error('StatisticsManager: Error obteniendo métricas ERC1155:', error);
      return null;
    }
  }

  /**
   * Obtener métricas completas de TraitsExtensions con filtro de fecha
   */
  async getTraitsExtensionsMetrics(dateFrom = null, dateTo = null) {
    const cacheKey = `traitsextensions_metrics_${dateFrom || 'all'}_${dateTo || 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.stats.cacheTTL) {
      return cached.data;
    }

    try {
      let query = this.supabaseClient
        .from('traits_extensions_events')
        .select('*')
        .eq('contract_address', this.config.contracts.TRAITS_EXTENSIONS.toLowerCase());

      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: events } = await query;

      const totalApplied = events?.length || 0;
      const traitApplied = events?.filter(e => e.event_name === 'TraitApplied').length || 0;
      const traitsAppliedBatch = events?.filter(e => e.event_name === 'TraitsAppliedBatch').length || 0;

      // Unique traits
      const uniqueTraits = new Set();
      events?.forEach(e => {
        if (e.trait_id) uniqueTraits.add(e.trait_id);
        if (e.trait_ids && Array.isArray(e.trait_ids)) {
          e.trait_ids.forEach(id => uniqueTraits.add(id));
        }
        if (e.event_data?.traitId) uniqueTraits.add(e.event_data.traitId);
        if (e.event_data?.traitIds && Array.isArray(e.event_data.traitIds)) {
          e.event_data.traitIds.forEach(id => uniqueTraits.add(id));
        }
      });

      // Unique tokens with traits
      const uniqueTokens = new Set();
      events?.forEach(e => {
        if (e.token_id) uniqueTokens.add(e.token_id);
        if (e.event_data?.tokenId) uniqueTokens.add(e.event_data.tokenId);
      });

      const stats = {
        totalApplied: totalApplied,
        traitApplied: traitApplied,
        traitsAppliedBatch: traitsAppliedBatch,
        uniqueTraits: uniqueTraits.size,
        uniqueTokens: uniqueTokens.size,
        avgTraitsPerToken: uniqueTokens.size > 0 ? (totalApplied / uniqueTokens.size).toFixed(2) : 0,
        lastUpdated: new Date().toISOString()
      };

      this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
      return stats;
    } catch (error) {
      console.error('StatisticsManager: Error obteniendo métricas TraitsExtensions:', error);
      return null;
    }
  }

  /**
   * Obtener estadísticas de AdrianLAB (método legacy, mantiene compatibilidad)
   */
  async getAdrianLABStatistics() {
    const cacheKey = 'adrianlab_stats';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.stats.cacheTTL) {
      return cached.data;
    }

    try {
      // ERC721 transfers
      const { count: erc721Transfers } = await this.supabaseClient
        .from('erc721_transfers')
        .select('*', { count: 'exact', head: true })
        .eq('contract_address', this.config.contracts.ADRIANLABCORE);

      // ERC1155 transfers
      const { count: erc1155Transfers } = await this.supabaseClient
        .from('erc1155_transfers_single')
        .select('*', { count: 'exact', head: true })
        .eq('contract_address', this.config.contracts.ERC1155);

      // TraitsExtensions events
      const { count: traitsEvents } = await this.supabaseClient
        .from('traits_extensions_events')
        .select('*', { count: 'exact', head: true })
        .eq('contract_address', this.config.contracts.TRAITS_EXTENSIONS.toLowerCase());

      const stats = {
        erc721Transfers: erc721Transfers || 0,
        erc1155Transfers: erc1155Transfers || 0,
        traitsEvents: traitsEvents || 0,
        lastUpdated: new Date().toISOString()
      };

      this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
      return stats;
    } catch (error) {
      console.error('StatisticsManager: Error obteniendo estadísticas AdrianLAB:', error);
      return null;
    }
  }

  /**
   * Obtener métricas completas de PunkQuest con filtro de fecha
   */
  async getPunkQuestMetrics(dateFrom = null, dateTo = null) {
    const cacheKey = `punkquest_metrics_${dateFrom || 'all'}_${dateTo || 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.stats.cacheTTL) {
      return cached.data;
    }

    try {
      // Staking events
      let stakingQuery = this.supabaseClient
        .from('punk_quest_staking_events')
        .select('*')
        .eq('contract_address', this.config.contracts.PUNK_QUEST.toLowerCase());

      if (dateFrom) {
        stakingQuery = stakingQuery.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        stakingQuery = stakingQuery.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: stakingEvents } = await stakingQuery;
      const staked = stakingEvents?.filter(e => e.event_type === 'Staked').length || 0;
      const unstaked = stakingEvents?.filter(e => e.event_type === 'Unstaked').length || 0;
      const rewardsClaimed = stakingEvents?.filter(e => e.event_type === 'RewardClaimed').length || 0;

      // Unique stakers
      const uniqueStakers = new Set(stakingEvents?.map(e => e.user_address?.toLowerCase()).filter(Boolean) || []);

      // Total rewards distributed
      const totalRewards = stakingEvents?.reduce((sum, e) => {
        try {
          return sum + BigInt(e.reward_wei || 0);
        } catch {
          return sum;
        }
      }, 0n) || 0n;

      // Item events
      let itemQuery = this.supabaseClient
        .from('punk_quest_item_events')
        .select('*')
        .eq('contract_address', this.config.contracts.PUNK_QUEST.toLowerCase());

      if (dateFrom) {
        itemQuery = itemQuery.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        itemQuery = itemQuery.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: itemEvents } = await itemQuery;
      const itemsPurchased = itemEvents?.filter(e => e.event_type === 'ItemPurchased').length || 0;

      // Event events
      let eventQuery = this.supabaseClient
        .from('punk_quest_event_events')
        .select('*')
        .eq('contract_address', this.config.contracts.PUNK_QUEST.toLowerCase());

      if (dateFrom) {
        eventQuery = eventQuery.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        eventQuery = eventQuery.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: questEvents } = await eventQuery;
      const eventsTriggered = questEvents?.length || 0;

      const stats = {
        totalStaked: staked,
        totalUnstaked: unstaked,
        activeStakers: uniqueStakers.size,
        totalRewards: totalRewards.toString(),
        rewardsClaimed: rewardsClaimed,
        itemsPurchased: itemsPurchased,
        eventsTriggered: eventsTriggered,
        lastUpdated: new Date().toISOString()
      };

      this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
      return stats;
    } catch (error) {
      console.error('StatisticsManager: Error obteniendo métricas PunkQuest:', error);
      return null;
    }
  }

  /**
   * Obtener estadísticas de PunkQuest (método legacy, mantiene compatibilidad)
   */
  async getPunkQuestStatistics() {
    return await this.getPunkQuestMetrics();
  }

  /**
   * Obtener datos para gráfica de volumen ERC20 por intervalo de tiempo
   */
  async getERC20VolumeChartData(dateFrom, dateTo, interval = 'day') {
    try {
      let query = this.supabaseClient
        .from('erc20_transfers')
        .select('value_wei, created_at')
        .eq('contract_address', this.config.contracts.ERC20.toLowerCase())
        .order('created_at', { ascending: true });

      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: transfers } = await query;
      if (!transfers || transfers.length === 0) {
        return { labels: [], datasets: [] };
      }

      // Agrupar por intervalo
      const grouped = {};
      transfers.forEach(t => {
        const date = new Date(t.created_at);
        let key;
        if (interval === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (interval === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!grouped[key]) {
          grouped[key] = 0n;
        }
        grouped[key] += BigInt(t.value_wei || 0);
      });

      const labels = Object.keys(grouped).sort();
      const data = labels.map(key => {
        const wei = grouped[key];
        const divisor = BigInt(10 ** 18);
        return Number(wei / divisor) + Number(wei % divisor) / Number(divisor);
      });

      return {
        labels,
        datasets: [{
          label: 'Volume ($ADRIAN)',
          data,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      };
    } catch (error) {
      console.error('Error obteniendo datos de volumen ERC20:', error);
      return { labels: [], datasets: [] };
    }
  }

  /**
   * Obtener datos para gráfica de count de transfers ERC20
   */
  async getERC20TransferCountChartData(dateFrom, dateTo, interval = 'day') {
    try {
      let query = this.supabaseClient
        .from('erc20_transfers')
        .select('created_at')
        .eq('contract_address', this.config.contracts.ERC20.toLowerCase())
        .order('created_at', { ascending: true });

      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: transfers } = await query;
      if (!transfers || transfers.length === 0) {
        return { labels: [], datasets: [] };
      }

      // Agrupar por intervalo
      const grouped = {};
      transfers.forEach(t => {
        const date = new Date(t.created_at);
        let key;
        if (interval === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (interval === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        grouped[key] = (grouped[key] || 0) + 1;
      });

      const labels = Object.keys(grouped).sort();
      const data = labels.map(key => grouped[key]);

      return {
        labels,
        datasets: [{
          label: 'Transfer Count',
          data,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.1
        }]
      };
    } catch (error) {
      console.error('Error obteniendo datos de count ERC20:', error);
      return { labels: [], datasets: [] };
    }
  }

  /**
   * Obtener Top 10 Holders de ERC20
   */
  async getERC20TopHolders(dateFrom = null, dateTo = null, limit = 10) {
    try {
      let query = this.supabaseClient
        .from('erc20_transfers')
        .select('to_address, value_wei')
        .eq('contract_address', this.config.contracts.ERC20.toLowerCase());

      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: transfers } = await query;
      if (!transfers || transfers.length === 0) {
        return [];
      }

      // Agrupar por dirección y sumar
      const balances = {};
      transfers.forEach(t => {
        const addr = t.to_address?.toLowerCase();
        if (addr && addr !== '0x0000000000000000000000000000000000000000') {
          if (!balances[addr]) {
            balances[addr] = 0n;
          }
          balances[addr] += BigInt(t.value_wei || 0);
        }
      });

      // Convertir a array y ordenar
      const topHolders = Object.entries(balances)
        .map(([address, balance]) => ({
          address,
          balance: balance.toString()
        }))
        .sort((a, b) => {
          const aBig = BigInt(a.balance);
          const bBig = BigInt(b.balance);
          if (aBig > bBig) return -1;
          if (aBig < bBig) return 1;
          return 0;
        })
        .slice(0, limit);

      return topHolders;
    } catch (error) {
      console.error('Error obteniendo top holders ERC20:', error);
      return [];
    }
  }

  /**
   * Obtener datos para gráfica de volumen FloorEngine
   */
  async getFloorEngineVolumeChartData(dateFrom, dateTo, interval = 'day') {
    try {
      let query = this.supabaseClient
        .from('trade_events')
        .select('price_wei, created_at')
        .order('created_at', { ascending: true });

      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: trades } = await query;
      if (!trades || trades.length === 0) {
        return { labels: [], datasets: [] };
      }

      // Agrupar por intervalo
      const grouped = {};
      trades.forEach(t => {
        const date = new Date(t.created_at);
        let key;
        if (interval === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (interval === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!grouped[key]) {
          grouped[key] = 0n;
        }
        grouped[key] += BigInt(t.price_wei || 0);
      });

      const labels = Object.keys(grouped).sort();
      const data = labels.map(key => {
        const wei = grouped[key];
        const divisor = BigInt(10 ** 18);
        return Number(wei / divisor) + Number(wei % divisor) / Number(divisor);
      });

      return {
        labels,
        datasets: [{
          label: 'Trading Volume ($ADRIAN)',
          data,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1
        }]
      };
    } catch (error) {
      console.error('Error obteniendo datos de volumen FloorEngine:', error);
      return { labels: [], datasets: [] };
    }
  }

  /**
   * Obtener datos para gráfica de count de trades FloorEngine
   */
  async getFloorEngineTradeCountChartData(dateFrom, dateTo, interval = 'day') {
    try {
      let query = this.supabaseClient
        .from('trade_events')
        .select('created_at')
        .order('created_at', { ascending: true });

      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: trades } = await query;
      if (!trades || trades.length === 0) {
        return { labels: [], datasets: [] };
      }

      // Agrupar por intervalo
      const grouped = {};
      trades.forEach(t => {
        const date = new Date(t.created_at);
        let key;
        if (interval === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (interval === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        grouped[key] = (grouped[key] || 0) + 1;
      });

      const labels = Object.keys(grouped).sort();
      const data = labels.map(key => grouped[key]);

      return {
        labels,
        datasets: [{
          label: 'Trade Count',
          data,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1
        }]
      };
    } catch (error) {
      console.error('Error obteniendo datos de count FloorEngine:', error);
      return { labels: [], datasets: [] };
    }
  }

  /**
   * Obtener datos para gráfica de Mint/Burn AdrianLABCore
   */
  async getAdrianLABCoreMintBurnChartData(dateFrom, dateTo, interval = 'day') {
    try {
      let query = this.supabaseClient
        .from('erc721_transfers')
        .select('from_address, to_address, created_at')
        .eq('contract_address', this.config.contracts.ADRIANLABCORE)
        .order('created_at', { ascending: true });

      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: transfers } = await query;
      if (!transfers || transfers.length === 0) {
        return { labels: [], datasets: [] };
      }

      // Agrupar mints y burns por intervalo
      const mintsGrouped = {};
      const burnsGrouped = {};

      transfers.forEach(t => {
        const date = new Date(t.created_at);
        let key;
        if (interval === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (interval === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        const fromZero = t.from_address?.toLowerCase() === '0x0000000000000000000000000000000000000000';
        const toZero = t.to_address?.toLowerCase() === '0x0000000000000000000000000000000000000000';

        if (fromZero) {
          mintsGrouped[key] = (mintsGrouped[key] || 0) + 1;
        }
        if (toZero) {
          burnsGrouped[key] = (burnsGrouped[key] || 0) + 1;
        }
      });

      const allKeys = new Set([...Object.keys(mintsGrouped), ...Object.keys(burnsGrouped)]);
      const labels = Array.from(allKeys).sort();
      const mintsData = labels.map(key => mintsGrouped[key] || 0);
      const burnsData = labels.map(key => burnsGrouped[key] || 0);

      return {
        labels,
        datasets: [
          {
            label: 'Minted',
            data: mintsData,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          },
          {
            label: 'Burned',
            data: burnsData,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1
          }
        ]
      };
    } catch (error) {
      console.error('Error obteniendo datos de mint/burn AdrianLABCore:', error);
      return { labels: [], datasets: [] };
    }
  }

  /**
   * Obtener datos para gráfica de aplicaciones de traits
   */
  async getTraitsApplicationsChartData(dateFrom, dateTo, interval = 'day') {
    try {
      let query = this.supabaseClient
        .from('traits_extensions_events')
        .select('created_at')
        .eq('contract_address', this.config.contracts.TRAITS_EXTENSIONS.toLowerCase())
        .order('created_at', { ascending: true });

      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: events } = await query;
      if (!events || events.length === 0) {
        return { labels: [], datasets: [] };
      }

      // Agrupar por intervalo
      const grouped = {};
      events.forEach(e => {
        const date = new Date(e.created_at);
        let key;
        if (interval === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (interval === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        grouped[key] = (grouped[key] || 0) + 1;
      });

      const labels = Object.keys(grouped).sort();
      const data = labels.map(key => grouped[key]);

      return {
        labels,
        datasets: [{
          label: 'Trait Applications',
          data,
          borderColor: 'rgb(255, 206, 86)',
          backgroundColor: 'rgba(255, 206, 86, 0.2)',
          tension: 0.1
        }]
      };
    } catch (error) {
      console.error('Error obteniendo datos de traits:', error);
      return { labels: [], datasets: [] };
    }
  }

  /**
   * Obtener Top 10 Sellers de FloorEngine
   */
  async getFloorEngineTopSellers(dateFrom = null, dateTo = null, limit = 10) {
    try {
      let query = this.supabaseClient
        .from('trade_events')
        .select('seller, price_wei')
        .neq('seller', null);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: trades } = await query;
      if (!trades || trades.length === 0) {
        return [];
      }

      // Agrupar por seller y sumar
      const volumes = {};
      trades.forEach(t => {
        const seller = t.seller?.toLowerCase();
        if (seller) {
          if (!volumes[seller]) {
            volumes[seller] = { volume: 0n, count: 0 };
          }
          volumes[seller].volume += BigInt(t.price_wei || 0);
          volumes[seller].count += 1;
        }
      });

      // Convertir a array y ordenar
      const topSellers = Object.entries(volumes)
        .map(([address, data]) => ({
          address,
          volume: data.volume.toString(),
          count: data.count
        }))
        .sort((a, b) => {
          const aBig = BigInt(a.volume);
          const bBig = BigInt(b.volume);
          if (aBig > bBig) return -1;
          if (aBig < bBig) return 1;
          return 0;
        })
        .slice(0, limit);

      return topSellers;
    } catch (error) {
      console.error('Error obteniendo top sellers FloorEngine:', error);
      return [];
    }
  }

  /**
   * Renderizar estadísticas en el contenedor
   */
  async render(containerId, dateFrom = null, dateTo = null) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`StatisticsManager: Contenedor "${containerId}" no encontrado`);
      return;
    }

    const stats = await this.loadAllStatistics(dateFrom, dateTo);
    if (!stats) {
      container.innerHTML = '<div class="alert alert-warning">Error cargando estadísticas</div>';
      return;
    }

    // Renderizar HTML de estadísticas
    container.innerHTML = this.generateStatisticsHTML(stats, dateFrom, dateTo);

    // Si los gráficos están habilitados, renderizarlos
    if (this.config.charts.enabled) {
      await this.renderCharts(stats, dateFrom, dateTo);
    }
  }

  /**
   * Generar HTML de estadísticas
   */
  generateStatisticsHTML(stats, dateFrom = null, dateTo = null) {
    const periodDisplay = dateFrom && dateTo 
      ? `${dateFrom} to ${dateTo}`
      : dateFrom 
        ? `Since ${dateFrom}`
        : dateTo
          ? `Until ${dateTo}`
          : 'All Time';

    return `
      <!-- Period Selector -->
      <div class="card mb-4" style="position: sticky; top: 0; z-index: 10; background: var(--card-bg);">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-6 mb-2 mb-md-0">
              <label class="form-label mb-1">Period</label>
              <div class="btn-group" role="group">
                <button type="button" class="btn btn-sm btn-outline-primary period-btn" data-period="24h">24h</button>
                <button type="button" class="btn btn-sm btn-outline-primary period-btn" data-period="7d">7d</button>
                <button type="button" class="btn btn-sm btn-outline-primary period-btn" data-period="30d">30d</button>
                <button type="button" class="btn btn-sm btn-outline-primary period-btn" data-period="90d">90d</button>
                <button type="button" class="btn btn-sm btn-outline-primary period-btn" data-period="1y">1y</button>
                <button type="button" class="btn btn-sm btn-outline-primary period-btn" data-period="all">All</button>
              </div>
            </div>
            <div class="col-md-6">
              <label class="form-label mb-1">Custom Range</label>
              <div class="d-flex gap-2">
                <input type="date" id="statsDateFrom" class="form-control form-control-sm" value="${dateFrom || ''}">
                <input type="date" id="statsDateTo" class="form-control form-control-sm" value="${dateTo || ''}">
                <button type="button" class="btn btn-sm btn-primary" onclick="applyStatsPeriod()">Apply</button>
              </div>
            </div>
          </div>
          <div class="mt-2">
            <small class="text-muted">Showing: ${periodDisplay}</small>
          </div>
        </div>
      </div>

      <!-- ERC20 Statistics Cards -->
      <h5 class="mb-3">ERC20 - $ADRIAN Token</h5>
      <div class="row g-3 mb-4">
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Transfers</h6>
              <h3 class="card-title">${this.formatNumber(stats.erc20?.totalTransfers || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Volume</h6>
              <h3 class="card-title">${this.formatADRIAN(stats.erc20?.totalVolume || '0')}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Unique Holders</h6>
              <h3 class="card-title">${this.formatNumber(stats.erc20?.uniqueHolders || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Staked</h6>
              <h3 class="card-title">${this.formatADRIAN(stats.erc20?.totalStaked || '0')}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Avg Transfer Size</h6>
              <h3 class="card-title">${this.formatADRIAN(stats.erc20?.avgTransferSize || '0')}</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- FloorEngine Statistics Cards -->
      <h5 class="mb-3">FloorEngine - Marketplace</h5>
      <div class="row g-3 mb-4">
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Active Listings</h6>
              <h3 class="card-title">${this.formatNumber(stats.floorEngine?.activeListings || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Trades</h6>
              <h3 class="card-title">${this.formatNumber(stats.floorEngine?.totalTrades || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Trading Volume</h6>
              <h3 class="card-title">${this.formatADRIAN(stats.floorEngine?.totalVolume || '0')}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Avg Trade Price</h6>
              <h3 class="card-title">${this.formatADRIAN(stats.floorEngine?.avgTradePrice || '0')}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Floor Price</h6>
              <h3 class="card-title">${stats.floorEngine?.floorPrice ? this.formatADRIAN(stats.floorEngine.floorPrice) : 'N/A'}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Sweeps</h6>
              <h3 class="card-title">${this.formatNumber(stats.floorEngine?.totalSweeps || 0)}</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- AdrianLABCore Statistics Cards -->
      <h5 class="mb-3">AdrianLABCore - ERC721 NFTs</h5>
      <div class="row g-3 mb-4">
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Transfers</h6>
              <h3 class="card-title">${this.formatNumber(stats.adrianLABCore?.totalTransfers || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Minted</h6>
              <h3 class="card-title">${this.formatNumber(stats.adrianLABCore?.totalMinted || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Burned</h6>
              <h3 class="card-title">${this.formatNumber(stats.adrianLABCore?.totalBurned || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Unique Holders</h6>
              <h3 class="card-title">${this.formatNumber(stats.adrianLABCore?.uniqueHolders || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Skins Assigned</h6>
              <h3 class="card-title">${this.formatNumber(stats.adrianLABCore?.skinsAssigned || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Serums Applied</h6>
              <h3 class="card-title">${this.formatNumber(stats.adrianLABCore?.serumsApplied || 0)}</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- ERC1155 Statistics Cards -->
      <h5 class="mb-3">ERC1155 - AdrianLAB Assets</h5>
      <div class="row g-3 mb-4">
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Transfers</h6>
              <h3 class="card-title">${this.formatNumber(stats.erc1155?.totalTransfers || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Minted</h6>
              <h3 class="card-title">${this.formatNumber(stats.erc1155?.totalMinted || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Burned</h6>
              <h3 class="card-title">${this.formatNumber(stats.erc1155?.totalBurned || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Unique Asset Types</h6>
              <h3 class="card-title">${this.formatNumber(stats.erc1155?.uniqueAssetTypes || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Unique Holders</h6>
              <h3 class="card-title">${this.formatNumber(stats.erc1155?.uniqueHolders || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Packs Opened</h6>
              <h3 class="card-title">${this.formatNumber(stats.erc1155?.packsOpened || 0)}</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- TraitsExtensions Statistics Cards -->
      <h5 class="mb-3">TraitsExtensions</h5>
      <div class="row g-3 mb-4">
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Applied</h6>
              <h3 class="card-title">${this.formatNumber(stats.traitsExtensions?.totalApplied || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Unique Traits</h6>
              <h3 class="card-title">${this.formatNumber(stats.traitsExtensions?.uniqueTraits || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Tokens with Traits</h6>
              <h3 class="card-title">${this.formatNumber(stats.traitsExtensions?.uniqueTokens || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Avg Traits/Token</h6>
              <h3 class="card-title">${stats.traitsExtensions?.avgTraitsPerToken || '0'}</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- PunkQuest Statistics Cards -->
      <h5 class="mb-3">PunkQuest</h5>
      <div class="row g-3 mb-4">
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Staked</h6>
              <h3 class="card-title">${this.formatNumber(stats.punkQuest?.totalStaked || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Active Stakers</h6>
              <h3 class="card-title">${this.formatNumber(stats.punkQuest?.activeStakers || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Total Rewards</h6>
              <h3 class="card-title">${this.formatADRIAN(stats.punkQuest?.totalRewards || '0')}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Items Purchased</h6>
              <h3 class="card-title">${this.formatNumber(stats.punkQuest?.itemsPurchased || 0)}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Events Triggered</h6>
              <h3 class="card-title">${this.formatNumber(stats.punkQuest?.eventsTriggered || 0)}</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Container -->
      <div id="statistics-charts-container" class="row g-3 mb-4">
        <!-- Los gráficos se renderizarán aquí -->
      </div>

      <!-- Top 10 Tables -->
      <div id="statistics-top10-container">
        <!-- Top 10 se renderizará aquí -->
      </div>
    `;
  }

  /**
   * Renderizar gráficos
   */
  async renderCharts(stats, dateFrom = null, dateTo = null) {
    const container = document.getElementById('statistics-charts-container');
    if (!container || !window.Chart) {
      return;
    }

    container.innerHTML = '';

    // Determinar intervalo basado en el rango de fechas
    let interval = 'day';
    if (dateFrom && dateTo) {
      const days = Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24));
      if (days > 90) {
        interval = 'month';
      } else if (days > 30) {
        interval = 'week';
      }
    } else if (!dateFrom) {
      interval = 'month';
    }

    // Gráfica de Volumen ERC20
    const erc20VolumeData = await this.getERC20VolumeChartData(dateFrom, dateTo, interval);
    if (erc20VolumeData.labels.length > 0) {
      const chartContainer = document.createElement('div');
      chartContainer.className = 'col-md-6 mb-4';
      chartContainer.innerHTML = '<canvas id="erc20VolumeChart"></canvas>';
      container.appendChild(chartContainer);

      const ctx = document.getElementById('erc20VolumeChart').getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: erc20VolumeData,
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'ERC20 Volume Over Time'
            },
            legend: {
              display: true
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      this.charts.set('erc20Volume', chart);
    }

    // Gráfica de Transfer Count ERC20
    const erc20CountData = await this.getERC20TransferCountChartData(dateFrom, dateTo, interval);
    if (erc20CountData.labels.length > 0) {
      const chartContainer = document.createElement('div');
      chartContainer.className = 'col-md-6 mb-4';
      chartContainer.innerHTML = '<canvas id="erc20CountChart"></canvas>';
      container.appendChild(chartContainer);

      const ctx = document.getElementById('erc20CountChart').getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: erc20CountData,
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'ERC20 Transfer Count Over Time'
            },
            legend: {
              display: true
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      this.charts.set('erc20Count', chart);
    }

    // Gráfica de Volumen FloorEngine
    const floorEngineVolumeData = await this.getFloorEngineVolumeChartData(dateFrom, dateTo, interval);
    if (floorEngineVolumeData.labels.length > 0) {
      const chartContainer = document.createElement('div');
      chartContainer.className = 'col-md-6 mb-4';
      chartContainer.innerHTML = '<canvas id="floorEngineVolumeChart"></canvas>';
      container.appendChild(chartContainer);

      const ctx = document.getElementById('floorEngineVolumeChart').getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: floorEngineVolumeData,
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'FloorEngine Trading Volume Over Time'
            },
            legend: {
              display: true
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      this.charts.set('floorEngineVolume', chart);
    }

    // Gráfica de Trade Count FloorEngine
    const floorEngineCountData = await this.getFloorEngineTradeCountChartData(dateFrom, dateTo, interval);
    if (floorEngineCountData.labels.length > 0) {
      const chartContainer = document.createElement('div');
      chartContainer.className = 'col-md-6 mb-4';
      chartContainer.innerHTML = '<canvas id="floorEngineCountChart"></canvas>';
      container.appendChild(chartContainer);

      const ctx = document.getElementById('floorEngineCountChart').getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: floorEngineCountData,
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'FloorEngine Trade Count Over Time'
            },
            legend: {
              display: true
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      this.charts.set('floorEngineCount', chart);
    }

    // Gráfica de Mint/Burn AdrianLABCore
    const adrianLABMintBurnData = await this.getAdrianLABCoreMintBurnChartData(dateFrom, dateTo, interval);
    if (adrianLABMintBurnData.labels.length > 0) {
      const chartContainer = document.createElement('div');
      chartContainer.className = 'col-md-6 mb-4';
      chartContainer.innerHTML = '<canvas id="adrianLABMintBurnChart"></canvas>';
      container.appendChild(chartContainer);

      const ctx = document.getElementById('adrianLABMintBurnChart').getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: adrianLABMintBurnData,
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'AdrianLABCore Mint/Burn Over Time'
            },
            legend: {
              display: true
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              stacked: false
            }
          }
        }
      });
      this.charts.set('adrianLABMintBurn', chart);
    }

    // Gráfica de Trait Applications
    const traitsData = await this.getTraitsApplicationsChartData(dateFrom, dateTo, interval);
    if (traitsData.labels.length > 0) {
      const chartContainer = document.createElement('div');
      chartContainer.className = 'col-md-6 mb-4';
      chartContainer.innerHTML = '<canvas id="traitsChart"></canvas>';
      container.appendChild(chartContainer);

      const ctx = document.getElementById('traitsChart').getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: traitsData,
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Traits Applications Over Time'
            },
            legend: {
              display: true
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      this.charts.set('traits', chart);
    }

    // Renderizar Top 10
    await this.renderTop10(dateFrom, dateTo);
  }

  /**
   * Obtener Top 10 Buyers de FloorEngine
   */
  async getFloorEngineTopBuyers(dateFrom = null, dateTo = null, limit = 10) {
    try {
      let query = this.supabaseClient
        .from('trade_events')
        .select('buyer, price_wei')
        .neq('buyer', null);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: trades } = await query;
      if (!trades || trades.length === 0) {
        return [];
      }

      // Agrupar por buyer y sumar
      const volumes = {};
      trades.forEach(t => {
        const buyer = t.buyer?.toLowerCase();
        if (buyer) {
          if (!volumes[buyer]) {
            volumes[buyer] = { volume: 0n, count: 0 };
          }
          volumes[buyer].volume += BigInt(t.price_wei || 0);
          volumes[buyer].count += 1;
        }
      });

      // Convertir a array y ordenar
      const topBuyers = Object.entries(volumes)
        .map(([address, data]) => ({
          address,
          volume: data.volume.toString(),
          count: data.count
        }))
        .sort((a, b) => {
          const aBig = BigInt(a.volume);
          const bBig = BigInt(b.volume);
          if (aBig > bBig) return -1;
          if (aBig < bBig) return 1;
          return 0;
        })
        .slice(0, limit);

      return topBuyers;
    } catch (error) {
      console.error('Error obteniendo top buyers FloorEngine:', error);
      return [];
    }
  }

  /**
   * Obtener Top 10 Most Traded Tokens de FloorEngine
   */
  async getFloorEngineTopTradedTokens(dateFrom = null, dateTo = null, limit = 10) {
    try {
      let query = this.supabaseClient
        .from('trade_events')
        .select('token_id')
        .neq('token_id', null);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00Z');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59Z');
      }

      const { data: trades } = await query;
      if (!trades || trades.length === 0) {
        return [];
      }

      // Contar trades por token
      const tokenCounts = {};
      trades.forEach(t => {
        const tokenId = t.token_id;
        if (tokenId) {
          tokenCounts[tokenId] = (tokenCounts[tokenId] || 0) + 1;
        }
      });

      // Convertir a array y ordenar
      const topTokens = Object.entries(tokenCounts)
        .map(([tokenId, count]) => ({
          tokenId,
          count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return topTokens;
    } catch (error) {
      console.error('Error obteniendo top traded tokens FloorEngine:', error);
      return [];
    }
  }

  /**
   * Renderizar Top 10 tables
   */
  async renderTop10(dateFrom = null, dateTo = null) {
    const container = document.getElementById('statistics-top10-container');
    if (!container) return;

    // Obtener todos los Top 10 en paralelo
    const [topHolders, topSellers, topBuyers, topTradedTokens] = await Promise.all([
      this.getERC20TopHolders(dateFrom, dateTo),
      this.getFloorEngineTopSellers(dateFrom, dateTo),
      this.getFloorEngineTopBuyers(dateFrom, dateTo),
      this.getFloorEngineTopTradedTokens(dateFrom, dateTo)
    ]);

    let html = '<h5 class="mb-3">Top 10 Rankings</h5><div class="row g-3">';

    // Top 10 Holders ERC20
    if (topHolders.length > 0) {
      html += `
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">Top 10 ERC20 Holders</h6>
            </div>
            <div class="card-body">
              <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="table table-sm table-hover">
                  <thead style="position: sticky; top: 0; background: var(--card-bg);">
                    <tr>
                      <th>#</th>
                      <th>Address</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
      `;
      topHolders.forEach((holder, index) => {
        html += `
          <tr>
            <td>${index + 1}</td>
            <td><code style="font-size: 0.7rem">${holder.address.slice(0, 8)}...${holder.address.slice(-6)}</code></td>
            <td style="font-size: 0.85rem">${this.formatADRIAN(holder.balance)}</td>
          </tr>
        `;
      });
      html += `
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Top 10 Sellers FloorEngine
    if (topSellers.length > 0) {
      html += `
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">Top 10 FloorEngine Sellers</h6>
            </div>
            <div class="card-body">
              <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="table table-sm table-hover">
                  <thead style="position: sticky; top: 0; background: var(--card-bg);">
                    <tr>
                      <th>#</th>
                      <th>Address</th>
                      <th>Volume</th>
                      <th>Trades</th>
                    </tr>
                  </thead>
                  <tbody>
      `;
      topSellers.forEach((seller, index) => {
        html += `
          <tr>
            <td>${index + 1}</td>
            <td><code style="font-size: 0.7rem">${seller.address.slice(0, 8)}...${seller.address.slice(-6)}</code></td>
            <td style="font-size: 0.85rem">${this.formatADRIAN(seller.volume)}</td>
            <td>${this.formatNumber(seller.count)}</td>
          </tr>
        `;
      });
      html += `
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Top 10 Buyers FloorEngine
    if (topBuyers.length > 0) {
      html += `
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">Top 10 FloorEngine Buyers</h6>
            </div>
            <div class="card-body">
              <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="table table-sm table-hover">
                  <thead style="position: sticky; top: 0; background: var(--card-bg);">
                    <tr>
                      <th>#</th>
                      <th>Address</th>
                      <th>Volume</th>
                      <th>Trades</th>
                    </tr>
                  </thead>
                  <tbody>
      `;
      topBuyers.forEach((buyer, index) => {
        html += `
          <tr>
            <td>${index + 1}</td>
            <td><code style="font-size: 0.7rem">${buyer.address.slice(0, 8)}...${buyer.address.slice(-6)}</code></td>
            <td style="font-size: 0.85rem">${this.formatADRIAN(buyer.volume)}</td>
            <td>${this.formatNumber(buyer.count)}</td>
          </tr>
        `;
      });
      html += `
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Top 10 Most Traded Tokens
    if (topTradedTokens.length > 0) {
      html += `
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">Top 10 Traded Tokens</h6>
            </div>
            <div class="card-body">
              <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="table table-sm table-hover">
                  <thead style="position: sticky; top: 0; background: var(--card-bg);">
                    <tr>
                      <th>#</th>
                      <th>Token ID</th>
                      <th>Trades</th>
                    </tr>
                  </thead>
                  <tbody>
      `;
      topTradedTokens.forEach((token, index) => {
        html += `
          <tr>
            <td>${index + 1}</td>
            <td><strong>#${token.tokenId}</strong></td>
            <td>${this.formatNumber(token.count)}</td>
          </tr>
        `;
      });
      html += `
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  /**
   * Formatear número con separadores de miles
   */
  formatNumber(num) {
    return new Intl.NumberFormat('es-ES').format(num);
  }

  /**
   * Formatear cantidad de ADRIAN
   */
  formatADRIAN(weiAmount) {
    try {
      const amount = BigInt(weiAmount);
      const decimals = 18;
      const divisor = BigInt(10 ** decimals);
      const whole = amount / divisor;
      const remainder = amount % divisor;
      const decimalsStr = remainder.toString().padStart(decimals, '0').slice(0, 2);
      return `${this.formatNumber(whole)}.${decimalsStr} $ADRIAN`;
    } catch {
      return '0.00 $ADRIAN';
    }
  }

  /**
   * Limpiar caché
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Destruir instancia y limpiar recursos
   */
  destroy() {
    this.clearCache();
    this.charts.forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    this.charts.clear();
  }
}

// Exportar para uso global o como módulo
if (typeof window !== 'undefined') {
  window.StatisticsManager = StatisticsManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatisticsManager;
}

