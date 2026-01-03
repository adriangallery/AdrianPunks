const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Ruta a la base de datos
const dbPath = path.join(__dirname, 'adrianpunks.db');

// Crear o abrir la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err);
        return;
    }
    console.log('Conexión exitosa a la base de datos SQLite');
});

// Crear tabla de NFTs
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS nfts (
        token_id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        image TEXT,
        external_url TEXT,
        attributes TEXT,
        compiler TEXT,
        masterminds TEXT,
        rarity REAL
    )`);

    // Leer el archivo JSON
    const jsonData = JSON.parse(fs.readFileSync(path.join(__dirname, 'adrianpunks.json'), 'utf8'));

    // Preparar la sentencia de inserción
    const stmt = db.prepare(`INSERT OR REPLACE INTO nfts 
        (token_id, name, description, image, external_url, attributes, compiler, masterminds, rarity) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    // Insertar cada NFT
    jsonData.collection.forEach((nft, index) => {
        const tokenId = index + 1; // El token_id es el índice + 1
        
        stmt.run(
            tokenId,
            nft.name,
            nft.description,
            nft.image,
            nft.external_url,
            JSON.stringify(nft.attributes),
            nft.compiler,
            JSON.stringify(nft.masterminds),
            nft.rarity
        );
    });

    stmt.finalize();
    console.log('Base de datos inicializada con éxito');
});

// Cerrar la base de datos
db.close((err) => {
    if (err) {
        console.error('Error al cerrar la base de datos:', err);
    } else {
        console.log('Base de datos cerrada');
    }
}); 