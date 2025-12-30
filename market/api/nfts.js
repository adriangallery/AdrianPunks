const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// API para manejar NFTs
const nftAPI = {
    // Obtener todos los NFTs
    getAllNFTs: async function() {
        try {
            const response = await fetch('/api/nfts');
            if (!response.ok) {
                throw new Error('Error al cargar NFTs');
            }
            return await response.json();
        } catch (error) {
            console.error('Error en getAllNFTs:', error);
            throw error;
        }
    },

    // Obtener atributos únicos
    getUniqueAttributes: async function() {
        try {
            const response = await fetch('/api/attributes');
            if (!response.ok) {
                throw new Error('Error al cargar atributos');
            }
            return await response.json();
        } catch (error) {
            console.error('Error en getUniqueAttributes:', error);
            throw error;
        }
    },

    // Obtener NFTs filtrados
    getFilteredNFTs: async function(filters) {
        try {
            const queryParams = new URLSearchParams();
            if (filters.background) queryParams.append('background', filters.background);
            if (filters.type) queryParams.append('type', filters.type);
            if (filters.accessory) queryParams.append('accessory', filters.accessory);

            const response = await fetch(`/api/nfts/filter?${queryParams.toString()}`);
            if (!response.ok) {
                throw new Error('Error al cargar NFTs filtrados');
            }
            return await response.json();
        } catch (error) {
            console.error('Error en getFilteredNFTs:', error);
            throw error;
        }
    }
};

// Hacer la API disponible globalmente
window.nftAPI = nftAPI;

module.exports = (req, res) => {
  // La ruta al archivo .db. Se asume que está en la raíz del proyecto.
  const dbPath = path.join(__dirname, '..', 'nft_metadata.db');
  
  // Abrir la base de datos en modo solo lectura
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('Error abriendo la base de datos:', err);
    }
  });

  // Ejecutar la consulta
  db.all("SELECT * FROM nft_metadata", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(200).json(rows);
    }
    // Cerrar la base de datos
    db.close();
  });
};
