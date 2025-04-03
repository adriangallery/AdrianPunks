const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta de la base de datos
const dbPath = path.join(__dirname, '..', 'nft_metadata.db');

// Crear conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err);
    return;
  }
  console.log('Conexión exitosa a la base de datos');
});

// Añadir la columna rarity
db.run('ALTER TABLE nft_metadata ADD COLUMN rarity TEXT;', (err) => {
  if (err) {
    console.error('Error al añadir la columna rarity:', err);
  } else {
    console.log('Columna rarity añadida exitosamente');
  }
  
  // Cerrar la conexión
  db.close((err) => {
    if (err) {
      console.error('Error al cerrar la base de datos:', err);
    } else {
      console.log('Conexión cerrada');
    }
  });
}); 