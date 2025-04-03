const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Ruta a la base de datos
const dbPath = path.join(__dirname, 'adrianpunks.db');

// Endpoint para obtener todos los NFTs
app.get('/api/nfts', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    db.all('SELECT * FROM nfts ORDER BY token_id', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
    db.close();
});

// Endpoint para obtener un NFT específico
app.get('/api/nfts/:tokenId', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    db.get('SELECT * FROM nfts WHERE token_id = ?', [req.params.tokenId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'NFT not found' });
            return;
        }
        res.json(row);
    });
    db.close();
});

// Servir el archivo market.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'market.html'));
});

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
}); 