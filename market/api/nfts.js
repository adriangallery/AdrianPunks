const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// API para manejar los NFTs
const nftAPI = {
    getAllNFTs: function() {
        // Aquí iría la lógica para obtener todos los NFTs
        // Por ahora retornamos datos de ejemplo
        return [
            {
                token_id: "1",
                image_url: "https://ipfs.io/ipfs/bafybeibfywb3emvjod5owcus7nyn4fqosqrbvuq2cyxczhbmavfxuautsy/1.gif",
                attributes: JSON.stringify({
                    background: "Blue",
                    type: "Punk",
                    accessory: "None"
                })
            }
            // Agrega más NFTs según sea necesario
        ];
    },

    getUniqueAttributes: function() {
        const nfts = this.getAllNFTs();
        const attributes = {
            backgrounds: new Set(),
            types: new Set(),
            accessories: new Set()
        };

        nfts.forEach(nft => {
            const attr = JSON.parse(nft.attributes);
            attributes.backgrounds.add(attr.background);
            attributes.types.add(attr.type);
            attributes.accessories.add(attr.accessory);
        });

        return {
            backgrounds: Array.from(attributes.backgrounds),
            types: Array.from(attributes.types),
            accessories: Array.from(attributes.accessories)
        };
    },

    getFilteredNFTs: function(filters) {
        const nfts = this.getAllNFTs();
        return nfts.filter(nft => {
            const attr = JSON.parse(nft.attributes);
            return (!filters.background || attr.background === filters.background) &&
                   (!filters.type || attr.type === filters.type) &&
                   (!filters.accessory || attr.accessory === filters.accessory);
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
