const sqlite3 = require('sqlite3').verbose();
const path = require('path');

export default function handler(req, res) {
    const db = new sqlite3.Database(path.join(process.cwd(), 'nft_metadata.db'));
    
    db.all("SELECT * FROM nfts", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const nfts = rows.map(row => ({
            ...row,
            attributes: row.attributes ? JSON.parse(row.attributes) : [],
            masterminds: row.masterminds ? JSON.parse(row.masterminds) : []
        }));
        
        res.status(200).json(nfts);
    });
    
    db.close();
} 