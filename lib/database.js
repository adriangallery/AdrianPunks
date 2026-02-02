// Updated: 2026-02-02 - Database API Client
/**
 * Database Manager - API Client para Railway
 *
 * Reemplaza el anterior sistema que intentaba parsear SQLite localmente.
 * Ahora usa la API REST desplegada en Railway que maneja todas las queries.
 *
 * ✅ No requiere WebAssembly
 * ✅ No requiere sql.js ni alasql
 * ✅ Compatible con SES Lockdown
 * ✅ Solo usa fetch nativo del navegador
 */

const API_URL = 'https://enginedb-production.up.railway.app';

let isInitialized = false;

/**
 * Inicializar conexión con la API
 * Verifica que la API esté disponible
 */
async function initDB() {
  if (isInitialized) {
    return true;
  }

  try {
    console.log('🔌 Conectando con Database API...');

    // Verificar que la API responda
    const response = await fetch(`${API_URL}/query/tables`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.tables) {
      console.log(`✅ Database API conectada (${result.tables.length} tablas disponibles)`);
      isInitialized = true;
      return true;
    } else {
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('❌ Error conectando con Database API:', error);
    console.error('   Asegúrate de que la API esté desplegada en Railway');
    isInitialized = false;
    return false;
  }
}

/**
 * Ejecutar query SQL usando la API de Railway
 * @param {string} sql - Query SQL (solo SELECT permitido)
 * @param {Array} params - Parámetros para la query (opcional)
 * @returns {Promise<Array>} Resultados de la query
 */
async function query(sql, params = []) {
  // Auto-inicializar si no está inicializado
  if (!isInitialized) {
    const initialized = await initDB();
    if (!initialized) {
      console.error('❌ Database API no disponible');
      return [];
    }
  }

  try {
    const response = await fetch(`${API_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql, params })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      return result.data || [];
    } else {
      throw new Error(result.error || 'Query failed');
    }
  } catch (err) {
    console.error('❌ Query error:', err.message);
    console.error('   SQL:', sql);
    if (params.length > 0) {
      console.error('   Params:', params);
    }
    return [];
  }
}

/**
 * Ejecutar query y obtener solo el count
 * Útil para queries como "SELECT COUNT(*) FROM table"
 * @param {string} sql - Query SQL
 * @param {Array} params - Parámetros (opcional)
 * @returns {Promise<number>} El valor numérico del primer campo del primer resultado
 */
async function queryCount(sql, params = []) {
  const results = await query(sql, params);
  if (results.length === 0) return 0;

  // Obtener el primer valor del primer resultado
  const firstKey = Object.keys(results[0])[0];
  const value = results[0][firstKey];

  return typeof value === 'number' ? value : parseInt(value) || 0;
}

/**
 * Ejecutar query y obtener solo un resultado
 * Útil para queries con LIMIT 1 o que se espera un solo resultado
 * @param {string} sql - Query SQL
 * @param {Array} params - Parámetros (opcional)
 * @returns {Promise<Object|null>} El primer resultado o null
 */
async function querySingle(sql, params = []) {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Obtener lista de tablas disponibles
 * @returns {Promise<Array<string>>} Lista de nombres de tablas
 */
async function getTables() {
  try {
    const response = await fetch(`${API_URL}/query/tables`);
    const result = await response.json();
    return result.success ? result.tables : [];
  } catch (error) {
    console.error('❌ Error obteniendo tablas:', error);
    return [];
  }
}

/**
 * Obtener schema de una tabla
 * @param {string} tableName - Nombre de la tabla
 * @returns {Promise<Array>} Estructura de la tabla
 */
async function getTableSchema(tableName) {
  try {
    const response = await fetch(`${API_URL}/query/schema/${tableName}`);
    const result = await response.json();
    return result.success ? result.schema : [];
  } catch (error) {
    console.error(`❌ Error obteniendo schema de ${tableName}:`, error);
    return [];
  }
}

// Export para uso global
if (typeof window !== 'undefined') {
  window.Database = {
    init: initDB,
    query,
    queryCount,
    querySingle,
    getTables,
    getTableSchema,
    get isInitialized() {
      return isInitialized;
    },
    get apiUrl() {
      return API_URL;
    }
  };

  // Log de inicialización
  console.log('📚 Database API Client cargado');
  console.log(`   URL: ${API_URL}`);
  console.log('   Uso: await window.Database.query("SELECT * FROM table")');
}
