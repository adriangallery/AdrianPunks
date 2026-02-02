// Updated: 2026-02-01 - SQLite Database Manager
/**
 * Database Manager - SQLite desde GitHub con cache
 *
 * Reemplaza a Supabase client para todas las queries.
 * Usa alasql (JavaScript puro) en lugar de sql.js (WASM)
 * para evitar problemas con SES Lockdown.
 */

const DB_URL = 'https://raw.githubusercontent.com/adriangallery/enginedb/main/api/data/enginedb.sqlite';
const DB_CACHE_KEY = 'enginedb_data';
const DB_VERSION_KEY = 'enginedb_version';

let dbData = null;

/**
 * Inicializar alasql (cargado desde CDN en HTML)
 */
function initAlaSQL() {
  if (typeof alasql === 'undefined') {
    throw new Error('alasql not loaded. Add <script src="https://cdn.jsdelivr.net/npm/alasql@4"></script> to HTML');
  }

  // Configurar alasql para mejor performance
  alasql.options.cache = true;
}

/**
 * Descargar y parsear SQLite desde GitHub
 */
async function downloadDB() {
  console.log('📥 Descargando database desde GitHub...');

  const response = await fetch(DB_URL);

  if (!response.ok) {
    throw new Error(`Failed to download DB: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);
  console.log(`✅ Database descargada: ${sizeMB} MB`);

  // Convertir SQLite a objeto JavaScript usando SQL.js temporal
  // (Solo para parsear, no para queries)
  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`
  });

  const db = new SQL.Database(new Uint8Array(arrayBuffer));

  // Extraer todas las tablas a JSON
  const tables = [
    'erc20_transfers',
    'erc20_approvals',
    'erc20_custom_events',
    'erc721_transfers',
    'erc721_custom_events',
    'erc1155_transfers_single',
    'erc1155_transfers_batch',
    'erc1155_custom_events',
    'trade_events',
    'sweep_events',
    'listing_events',
    'punk_listings',
    'traits_extensions_events',
    'punk_quest_staking_events',
    'punk_quest_item_events',
    'punk_quest_event_events'
  ];

  const data = {};

  for (const table of tables) {
    try {
      const result = db.exec(`SELECT * FROM ${table}`);
      if (result.length > 0) {
        const { columns, values } = result[0];
        data[table] = values.map((row) => {
          const obj = {};
          columns.forEach((col, idx) => {
            obj[col] = row[idx];
          });
          return obj;
        });
      } else {
        data[table] = [];
      }
    } catch (e) {
      console.warn(`⚠️ Error loading table ${table}:`, e);
      data[table] = [];
    }
  }

  db.close();

  return data;
}

/**
 * Obtener versión de DB desde GitHub (Last-Modified header)
 */
async function getDBVersion() {
  const response = await fetch(DB_URL, { method: 'HEAD' });
  return response.headers.get('last-modified') || Date.now().toString();
}

/**
 * Guardar DB en IndexedDB para cache persistente
 */
async function saveToCache(data, version) {
  if (!('indexedDB' in window)) return;

  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction('database', 'readwrite');
    const store = tx.objectStore('database');

    await store.put({ id: DB_CACHE_KEY, data: data });
    await store.put({ id: DB_VERSION_KEY, data: version });

    console.log('💾 Database guardada en cache (IndexedDB)');
  } catch (err) {
    console.warn('⚠️ Error guardando en cache:', err);
  }
}

/**
 * Leer DB desde cache
 */
async function loadFromCache() {
  if (!('indexedDB' in window)) return null;

  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction('database', 'readonly');
    const store = tx.objectStore('database');

    const dataObj = await store.get(DB_CACHE_KEY);
    const versionObj = await store.get(DB_VERSION_KEY);

    if (!dataObj || !versionObj) return null;

    return {
      data: dataObj.data,
      version: versionObj.data
    };
  } catch (err) {
    console.warn('⚠️ Error leyendo cache:', err);
    return null;
  }
}

/**
 * Abrir IndexedDB
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EngineDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('database')) {
        db.createObjectStore('database', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Inicializar base de datos (descargar o usar cache)
 */
async function initDB() {
  if (dbData) return dbData;

  initAlaSQL();

  const remoteVersion = await getDBVersion();
  console.log('🔍 Versión remota:', remoteVersion);

  // Intentar cargar desde cache
  const cached = await loadFromCache();

  if (cached && cached.version === remoteVersion) {
    console.log('⚡ Usando versión en cache');
    dbData = cached.data;
  } else {
    console.log('🔄 Descargando nueva versión...');
    dbData = await downloadDB();
    await saveToCache(dbData, remoteVersion);
  }

  // Cargar datos en alasql
  for (const [table, rows] of Object.entries(dbData)) {
    if (Array.isArray(rows) && rows.length > 0) {
      alasql(`CREATE TABLE IF NOT EXISTS ${table}`);
      alasql.tables[table].data = rows;
    }
  }

  console.log('✅ Database lista para queries');
  return dbData;
}

/**
 * Ejecutar query SQL usando alasql
 */
async function query(sql, params = []) {
  await initDB();

  try {
    // alasql usa ? para placeholders, igual que SQLite
    const result = alasql(sql, params);
    return Array.isArray(result) ? result : [];
  } catch (err) {
    console.error('❌ Query error:', err, 'SQL:', sql);
    return [];
  }
}

/**
 * Ejecutar query y obtener solo el count
 */
async function queryCount(sql, params = []) {
  const results = await query(sql, params);
  if (results.length === 0) return 0;

  const firstKey = Object.keys(results[0])[0];
  return results[0][firstKey] || 0;
}

/**
 * Ejecutar query y obtener solo un resultado
 */
async function querySingle(sql, params = []) {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Export para uso global
if (typeof window !== 'undefined') {
  window.Database = {
    init: initDB,
    query,
    queryCount,
    querySingle,
    get isInitialized() {
      return dbData !== null;
    }
  };
}
