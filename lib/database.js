// Updated: 2026-02-01 - SQLite Database Manager
/**
 * Database Manager - SQLite desde GitHub con cache
 *
 * Reemplaza a Supabase client para todas las queries.
 * Descarga SQLite desde GitHub solo cuando hay nueva versión.
 * Cachea en IndexedDB para no re-descargar.
 */

const DB_URL = 'https://raw.githubusercontent.com/adriangallery/enginedb/main/api/data/enginedb.sqlite';
const DB_CACHE_KEY = 'enginedb_sqlite';
const DB_VERSION_KEY = 'enginedb_version';

let db = null;
let SQL = null;

/**
 * Inicializar SQL.js (solo una vez)
 */
async function initSQL() {
  if (SQL) return;

  SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`
  });
}

/**
 * Descargar DB desde GitHub
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

  return arrayBuffer;
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
async function saveToCache(arrayBuffer, version) {
  if (!('indexedDB' in window)) return;

  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction('database', 'readwrite');
    const store = tx.objectStore('database');

    await store.put({ id: DB_CACHE_KEY, data: arrayBuffer });
    await store.put({ id: DB_VERSION_KEY, data: version });

    console.log('💾 Database guardada en cache (IndexedDB)');
  } catch (err) {
    console.warn('⚠️  Error guardando en cache:', err);
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

    const result = await store.get(DB_CACHE_KEY);
    return result?.data || null;
  } catch (err) {
    console.warn('⚠️  Error leyendo cache:', err);
    return null;
  }
}

/**
 * Obtener versión cacheada
 */
async function getCachedVersion() {
  if (!('indexedDB' in window)) return null;

  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction('database', 'readonly');
    const store = tx.objectStore('database');

    const result = await store.get(DB_VERSION_KEY);
    return result?.data || null;
  } catch (err) {
    return null;
  }
}

/**
 * Abrir IndexedDB para cache persistente
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('enginedb', 1);

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
 * Inicializar database
 *
 * @param {boolean} forceRefresh - Forzar descarga incluso si hay cache
 * @returns {Promise<Database>} Database instance lista para queries
 */
async function initDB(forceRefresh = false) {
  if (db && !forceRefresh) return db;

  await initSQL();

  // Verificar si hay nueva versión
  const [remoteVersion, cachedVersion] = await Promise.all([
    getDBVersion(),
    getCachedVersion()
  ]);

  let arrayBuffer;

  if (!forceRefresh && cachedVersion === remoteVersion) {
    // Usar cache si versión coincide
    console.log('✅ Usando database cacheada');
    const cached = await loadFromCache();

    if (cached) {
      arrayBuffer = cached;
    } else {
      // Cache corrupta, re-descargar
      arrayBuffer = await downloadDB();
      await saveToCache(arrayBuffer, remoteVersion);
    }
  } else {
    // Descargar nueva versión
    console.log('🔄 Nueva versión detectada, descargando...');
    arrayBuffer = await downloadDB();
    await saveToCache(arrayBuffer, remoteVersion);
  }

  // Crear database SQL.js
  db = new SQL.Database(new Uint8Array(arrayBuffer));
  console.log('✅ Database lista para queries');

  return db;
}

/**
 * Ejecutar query SQL
 *
 * @param {string} sql - Query SQL (usar prepared statements con ?)
 * @param {Array} params - Parámetros para bind (previene SQL injection)
 * @returns {Promise<Array>} Array de objetos con resultados
 *
 * @example
 * const punks = await query(
 *   'SELECT * FROM erc721_transfers WHERE contract_address = ? LIMIT ?',
 *   ['0x123...', 10]
 * );
 */
async function query(sql, params = []) {
  const database = await initDB();

  const result = database.exec(sql, params);

  if (result.length === 0) return [];

  // Convertir resultado a objetos
  const { columns, values } = result[0];

  return values.map((row) => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

/**
 * Ejecutar query SQL y obtener solo el count
 *
 * @param {string} sql - Query SQL
 * @param {Array} params - Parámetros
 * @returns {Promise<number>} Count
 */
async function queryCount(sql, params = []) {
  const results = await query(sql, params);
  if (results.length === 0) return 0;

  // Si la query tiene COUNT(*), COUNT(column), etc.
  const firstKey = Object.keys(results[0])[0];
  return results[0][firstKey] || 0;
}

/**
 * Ejecutar query SQL y obtener solo un resultado
 *
 * @param {string} sql - Query SQL
 * @param {Array} params - Parámetros
 * @returns {Promise<Object|null>} Primer resultado o null
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
      return db !== null;
    }
  };
}
