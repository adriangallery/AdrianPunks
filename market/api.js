const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

// Configurar middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Configurar CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Ruta a la base de datos
const dbPath = path.join(__dirname, 'nfts.db');

// Endpoint para obtener todos los NFTs
app.get('/api/nfts', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
        SELECT n.*, 
               GROUP_CONCAT(a.trait_type || ':' || a.value) as attributes_str
        FROM nfts n
        LEFT JOIN attributes a ON n.token_id = a.token_id
        GROUP BY n.token_id
    `, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const nfts = rows.map(row => ({
            tokenId: row.token_id,
            name: row.name,
            description: row.description,
            image_url: row.image_url,
            external_url: row.external_url,
            attributes: row.attributes_str ? row.attributes_str.split(',').map(attr => {
                const [trait_type, value] = attr.split(':');
                return { trait_type, value };
            }) : [],
            rarity: row.rarity,
            is_one_of_one: row.is_one_of_one === 1
        }));
        
        res.json(nfts);
        db.close();
    });
});

// Endpoint para obtener atributos únicos
app.get('/api/attributes', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    
    db.all(`
        SELECT DISTINCT trait_type, value
        FROM attributes
        ORDER BY trait_type, value
    `, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
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
        
        res.json({
            backgrounds: Array.from(attributes.backgrounds),
            types: Array.from(attributes.types),
            accessories: Array.from(attributes.accessories)
        });
        
        db.close();
    });
});

// Endpoint para filtrar NFTs
app.get('/api/nfts/filter', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const { background, type, accessory } = req.query;
    
    let query = `
        SELECT n.*, 
               GROUP_CONCAT(a.trait_type || ':' || a.value) as attributes_str
        FROM nfts n
        LEFT JOIN attributes a ON n.token_id = a.token_id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (background) {
        query += ` AND EXISTS (
            SELECT 1 FROM attributes a2 
            WHERE a2.token_id = n.token_id 
            AND a2.trait_type = 'Background' 
            AND a2.value = ?
        )`;
        params.push(background);
    }
    
    if (type) {
        query += ` AND EXISTS (
            SELECT 1 FROM attributes a2 
            WHERE a2.token_id = n.token_id 
            AND a2.trait_type = 'Type' 
            AND a2.value = ?
        )`;
        params.push(type);
    }
    
    if (accessory) {
        query += ` AND EXISTS (
            SELECT 1 FROM attributes a2 
            WHERE a2.token_id = n.token_id 
            AND a2.trait_type = 'Accessory' 
            AND a2.value = ?
        )`;
        params.push(accessory);
    }
    
    query += ` GROUP BY n.token_id`;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const nfts = rows.map(row => ({
            tokenId: row.token_id,
            name: row.name,
            description: row.description,
            image_url: row.image_url,
            external_url: row.external_url,
            attributes: row.attributes_str ? row.attributes_str.split(',').map(attr => {
                const [trait_type, value] = attr.split(':');
                return { trait_type, value };
            }) : [],
            rarity: row.rarity,
            is_one_of_one: row.is_one_of_one === 1
        }));
        
        res.json(nfts);
        db.close();
    });
});

// Ruta para servir el archivo index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 