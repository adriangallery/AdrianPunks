const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

// Middleware
app.use(express.json());

// Configuración de CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Ruta a la base de datos
const dbPath = path.join(process.cwd(), 'adrianpunks.db');
console.log('Ruta de la base de datos:', dbPath);

// Endpoint para obtener todos los NFTs
app.get('/api/nfts', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    db.all('SELECT * FROM nfts ORDER BY id', [], (err, rows) => {
        if (err) {
            console.error('Error al consultar la base de datos:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        try {
            // Procesar los resultados
            const nfts = rows.map(row => ({
                ...row,
                attributes: JSON.parse(row.attributes),
                masterminds: JSON.parse(row.masterminds)
            }));
            res.json(nfts);
        } catch (error) {
            console.error('Error al procesar los datos:', error);
            res.status(500).json({ error: 'Error al procesar los datos' });
        }
    });
    db.close();
});

// Endpoint para obtener un NFT específico
app.get('/api/nfts/:id', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    db.get('SELECT * FROM nfts WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            console.error('Error al consultar la base de datos:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'NFT no encontrado' });
            return;
        }
        
        try {
            // Procesar el resultado
            const nft = {
                ...row,
                attributes: JSON.parse(row.attributes),
                masterminds: JSON.parse(row.masterminds)
            };
            res.json(nft);
        } catch (error) {
            console.error('Error al procesar los datos:', error);
            res.status(500).json({ error: 'Error al procesar los datos' });
        }
    });
    db.close();
});

// Servir archivos estáticos desde la carpeta market
app.use(express.static(path.join(process.cwd(), 'market')));

// Ruta principal que sirve market.html
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'market', 'market.html'));
});

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
}); 