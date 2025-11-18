const sqlite3 = require('sqlite3').verbose();
const path = require('path');

export default async function handler(req, res) {
    try {
        // Ruta a la base de datos
        const dbPath = path.join(process.cwd(), 'adrianpunks.db');
        const db = new sqlite3.Database(dbPath);

        // Consulta para obtener todos los NFTs
        const query = `
            SELECT 
                id,
                name,
                image,
                attributes,
                compiler,
                masterminds,
                rarity
            FROM nfts
        `;

        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error al leer la base de datos:', err);
                res.status(500).json({ error: 'Error al leer la base de datos' });
                return;
            }

            // Procesar los resultados
            const nfts = rows.map(row => ({
                id: row.id,
                name: row.name,
                image: row.image,
                attributes: JSON.parse(row.attributes),
                compiler: row.compiler,
                masterminds: JSON.parse(row.masterminds),
                rarity: row.rarity
            }));

            res.status(200).json(nfts);
        });

        db.close();
    } catch (error) {
        console.error('Error en el endpoint:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
} 