const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// API para manejar los NFTs
const nftAPI = {
    getAllNFTs: function() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(path.join(__dirname, '..', 'nfts.db'));
            
            db.all(`
                SELECT n.*, 
                       GROUP_CONCAT(a.trait_type || ':' || a.value) as attributes_str
                FROM nfts n
                LEFT JOIN attributes a ON n.token_id = a.token_id
                GROUP BY n.token_id
            `, [], (err, rows) => {
                if (err) {
                    console.error('Error loading NFTs:', err);
                    reject(err);
                    return;
                }
                
                const nfts = rows.map(row => ({
                    token_id: row.token_id,
                    name: row.name,
                    image_url: row.image_url,
                    attributes: row.attributes_str ? row.attributes_str.split(',').map(attr => {
                        const [trait_type, value] = attr.split(':');
                        return { trait_type, value };
                    }) : [],
                    description: row.description,
                    external_url: row.external_url,
                    rarity: row.rarity
                }));
                
                resolve(nfts);
                db.close();
            });
        });
    },

    getUniqueAttributes: function() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(path.join(__dirname, '..', 'nfts.db'));
            
            db.all(`
                SELECT DISTINCT trait_type, value
                FROM attributes
                ORDER BY trait_type, value
            `, [], (err, rows) => {
                if (err) {
                    console.error('Error getting unique attributes:', err);
                    reject(err);
                    return;
                }
                
                const attributes = {
                    backgrounds: new Set(),
                    types: new Set(),
                    accessories: new Set()
                };
                
                rows.forEach(row => {
                    if (row.trait_type === 'Background') {
                        attributes.backgrounds.add(row.value);
                    } else if (row.trait_type === 'Type') {
                        attributes.types.add(row.value);
                    } else if (row.trait_type === 'Accessory') {
                        attributes.accessories.add(row.value);
                    }
                });
                
                resolve({
                    backgrounds: Array.from(attributes.backgrounds),
                    types: Array.from(attributes.types),
                    accessories: Array.from(attributes.accessories)
                });
                
                db.close();
            });
        });
    },

    getFilteredNFTs: function(filters) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(path.join(__dirname, '..', 'nfts.db'));
            
            let query = `
                SELECT n.*, 
                       GROUP_CONCAT(a.trait_type || ':' || a.value) as attributes_str
                FROM nfts n
                LEFT JOIN attributes a ON n.token_id = a.token_id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (filters.background) {
                query += ` AND EXISTS (
                    SELECT 1 FROM attributes a2 
                    WHERE a2.token_id = n.token_id 
                    AND a2.trait_type = 'Background' 
                    AND a2.value = ?
                )`;
                params.push(filters.background);
            }
            
            if (filters.type) {
                query += ` AND EXISTS (
                    SELECT 1 FROM attributes a2 
                    WHERE a2.token_id = n.token_id 
                    AND a2.trait_type = 'Type' 
                    AND a2.value = ?
                )`;
                params.push(filters.type);
            }
            
            if (filters.accessory) {
                query += ` AND EXISTS (
                    SELECT 1 FROM attributes a2 
                    WHERE a2.token_id = n.token_id 
                    AND a2.trait_type = 'Accessory' 
                    AND a2.value = ?
                )`;
                params.push(filters.accessory);
            }
            
            query += ` GROUP BY n.token_id`;
            
            db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('Error filtering NFTs:', err);
                    reject(err);
                    return;
                }
                
                const nfts = rows.map(row => ({
                    token_id: row.token_id,
                    name: row.name,
                    image_url: row.image_url,
                    attributes: row.attributes_str ? row.attributes_str.split(',').map(attr => {
                        const [trait_type, value] = attr.split(':');
                        return { trait_type, value };
                    }) : [],
                    description: row.description,
                    external_url: row.external_url,
                    rarity: row.rarity
                }));
                
                resolve(nfts);
                db.close();
            });
        });
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
