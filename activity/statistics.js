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
   * Cargar todas las estadísticas
   */
  async loadAllStatistics() {
    try {
      const stats = await Promise.all([
        this.getERC20Statistics(),
        this.getFloorEngineStatistics(),
        this.getAdrianLABStatistics(),
        this.getPunkQuestStatistics()
      ]);

      return {
        erc20: stats[0],
        floorEngine: stats[1],
        adrianLAB: stats[2],
        punkQuest: stats[3]
      };
    } catch (error) {
      console.error('StatisticsManager: Error cargando estadísticas:', error);
      return null;
    }
  }

  /**
   * Obtener estadísticas de ERC20
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
   * Obtener estadísticas de FloorEngine
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
   * Obtener estadísticas de AdrianLAB
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
   * Obtener estadísticas de PunkQuest
   */
  async getPunkQuestStatistics() {
    const cacheKey = 'punkquest_stats';
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.stats.cacheTTL) {
      return cached.data;
    }

    try {
      // Intentar múltiples nombres de tabla
      const possibleTables = [
        'punk_quest_events',
        'punkquest_events',
        'punk_quest_staking_events',
        'punkquest_staking_events'
      ];

      let totalStaked = 0;
      for (const tableName of possibleTables) {
        try {
          const { count } = await this.supabaseClient
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            .eq('contract_address', this.config.contracts.PUNK_QUEST.toLowerCase())
            .eq('event_type', 'Staked');
          
          if (count !== null) {
            totalStaked = count;
            break;
          }
        } catch (err) {
          continue;
        }
      }

      const stats = {
        totalStaked: totalStaked,
        lastUpdated: new Date().toISOString()
      };

      this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
      return stats;
    } catch (error) {
      console.error('StatisticsManager: Error obteniendo estadísticas PunkQuest:', error);
      return null;
    }
  }

  /**
   * Renderizar estadísticas en el contenedor
   */
  async render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`StatisticsManager: Contenedor "${containerId}" no encontrado`);
      return;
    }

    const stats = await this.loadAllStatistics();
    if (!stats) {
      container.innerHTML = '<div class="alert alert-warning">Error cargando estadísticas</div>';
      return;
    }

    // Renderizar HTML de estadísticas
    container.innerHTML = this.generateStatisticsHTML(stats);

    // Si los gráficos están habilitados, renderizarlos
    if (this.config.charts.enabled) {
      await this.renderCharts(stats);
    }
  }

  /**
   * Generar HTML de estadísticas
   */
  generateStatisticsHTML(stats) {
    return `
      <div class="row g-3 mb-4">
        <!-- ERC20 Statistics -->
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">ERC20 Transfers</h6>
              <h3 class="card-title">${this.formatNumber(stats.erc20?.totalTransfers || 0)}</h3>
              <p class="card-text small text-muted">Total: ${this.formatADRIAN(stats.erc20?.totalVolume || '0')}</p>
            </div>
          </div>
        </div>

        <!-- FloorEngine Statistics -->
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Active Listings</h6>
              <h3 class="card-title">${this.formatNumber(stats.floorEngine?.activeListings || 0)}</h3>
              <p class="card-text small text-muted">Trades: ${this.formatNumber(stats.floorEngine?.totalTrades || 0)}</p>
            </div>
          </div>
        </div>

        <!-- AdrianLAB Statistics -->
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">AdrianLAB Events</h6>
              <h3 class="card-title">${this.formatNumber((stats.adrianLAB?.erc721Transfers || 0) + (stats.adrianLAB?.erc1155Transfers || 0))}</h3>
              <p class="card-text small text-muted">Traits: ${this.formatNumber(stats.adrianLAB?.traitsEvents || 0)}</p>
            </div>
          </div>
        </div>

        <!-- PunkQuest Statistics -->
        <div class="col-md-6 col-lg-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">PunkQuest Staked</h6>
              <h3 class="card-title">${this.formatNumber(stats.punkQuest?.totalStaked || 0)}</h3>
              <p class="card-text small text-muted">Total staked tokens</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Container -->
      <div id="statistics-charts-container" class="row g-3">
        <!-- Los gráficos se renderizarán aquí -->
      </div>
    `;
  }

  /**
   * Renderizar gráficos
   */
  async renderCharts(stats) {
    const container = document.getElementById('statistics-charts-container');
    if (!container || !window.Chart) {
      return;
    }

    // Aquí se pueden agregar gráficos usando Chart.js u otra librería
    // Por ahora, placeholder para futura implementación
    container.innerHTML += '<div class="col-12"><p class="text-muted">Gráficos próximamente...</p></div>';
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

