const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Ruta al archivo JSON
const jsonPath = path.join(__dirname, '..', 'nft_metadata.db');
const dbPath = path.join(__dirname, '..', 'nfts.db');

// Leer el archivo JSON
const nfts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Crear o abrir la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err);
        return;
    }
    console.log('Base de datos conectada');
});

// Crear tablas
db.serialize(() => {
    // Tabla principal de NFTs
    db.run(`CREATE TABLE IF NOT EXISTS nfts (
        token_id TEXT PRIMARY KEY,
        name TEXT,
        image_url TEXT,
        description TEXT,
        external_url TEXT,
        rarity TEXT
    )`);

    // Tabla de atributos
    db.run(`CREATE TABLE IF NOT EXISTS attributes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_id TEXT,
        trait_type TEXT,
        value TEXT,
        FOREIGN KEY (token_id) REFERENCES nfts(token_id)
    )`);

    // Insertar datos
    const insertNFT = db.prepare(`INSERT OR REPLACE INTO nfts 
        (token_id, name, image_url, description, external_url, rarity) 
        VALUES (?, ?, ?, ?, ?, ?)`);

    const insertAttribute = db.prepare(`INSERT INTO attributes 
        (token_id, trait_type, value) 
        VALUES (?, ?, ?)`);

    nfts.forEach(nft => {
        insertNFT.run(
            nft.tokenId.toString(),
            nft.name,
            nft.image,
            nft.description,
            nft.external_url,
            nft.rarity || "N/A"
        );

        nft.attributes.forEach(attr => {
            insertAttribute.run(
                nft.tokenId.toString(),
                attr.trait_type,
                attr.value
            );
        });
    });

    insertNFT.finalize();
    insertAttribute.finalize();

    console.log('Base de datos inicializada con éxito');
});

// Cerrar la base de datos
db.close((err) => {
    if (err) {
        console.error('Error al cerrar la base de datos:', err);
    }
    console.log('Base de datos cerrada');
}); 