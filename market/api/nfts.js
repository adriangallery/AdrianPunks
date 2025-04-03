const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const nfts = [
    {
        token_id: "1",
        image_url: "https://ipfs.io/ipfs/bafybeibfywb3emvjod5owcus7nyn4fqosqrbvuq2cyxczhbmavfxuautsy/1.gif",
        attributes: '{"Background": "Blue", "Type": "Human", "Accessory": "None"}'
    },
    {
        token_id: "2",
        image_url: "https://ipfs.io/ipfs/bafybeibfywb3emvjod5owcus7nyn4fqosqrbvuq2cyxczhbmavfxuautsy/2.gif",
        attributes: '{"Background": "Red", "Type": "Alien", "Accessory": "Hat"}'
    },
    // Agrega más NFTs aquí según sea necesario
];

// Función para obtener todos los NFTs
function getAllNFTs() {
    return nfts;
}

// Función para obtener NFTs filtrados
function getFilteredNFTs(filters) {
    return nfts.filter(nft => {
        const attributes = JSON.parse(nft.attributes);
        return (!filters.background || attributes.Background === filters.background) &&
               (!filters.type || attributes.Type === filters.type) &&
               (!filters.accessory || attributes.Accessory === filters.accessory);
    });
}

// Función para obtener atributos únicos
function getUniqueAttributes() {
    const backgrounds = new Set();
    const types = new Set();
    const accessories = new Set();

    nfts.forEach(nft => {
        const attributes = JSON.parse(nft.attributes);
        if (attributes.Background) backgrounds.add(attributes.Background);
        if (attributes.Type) types.add(attributes.Type);
        if (attributes.Accessory) accessories.add(attributes.Accessory);
    });

    return {
        backgrounds: Array.from(backgrounds),
        types: Array.from(types),
        accessories: Array.from(accessories)
    };
}

// Exportar las funciones
window.nftAPI = {
    getAllNFTs,
    getFilteredNFTs,
    getUniqueAttributes
};

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
