const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Leer el archivo JSON
const jsonPath = path.join(__dirname, 'market', 'adrianpunks.json');
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const db = new sqlite3.Database('adrianpunks.db');

// Crear tabla de NFTs
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS nfts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        image TEXT NOT NULL,
        attributes TEXT NOT NULL,
        compiler TEXT,
        masterminds TEXT,
        rarity REAL
    )`);

    // Preparar la sentencia SQL
    const stmt = db.prepare(`
        INSERT INTO nfts (name, image, attributes, compiler, masterminds, rarity)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Insertar cada NFT del JSON
    jsonData.collection.forEach(nft => {
        stmt.run(
            nft.name,
            nft.image,
            JSON.stringify(nft.attributes),
            'Adrian', // Compiler
            JSON.stringify(['Adrian']), // Masterminds
            0.95 // Rarity (podemos calcular esto más tarde)
        );
    });

    stmt.finalize();
    console.log('Base de datos inicializada con éxito');
});

db.close(); 