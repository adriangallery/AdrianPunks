const sqlite3 = require('sqlite3').verbose();
const path = require('path');

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
