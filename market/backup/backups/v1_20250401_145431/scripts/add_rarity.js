const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Ruta a la base de datos
const dbPath = path.join(__dirname, '..', 'nft_metadata.db');

// Crear conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err);
    return;
  }
  console.log('Conexión exitosa a la base de datos');
});

// Leer el archivo SQL
const sqlScript = fs.readFileSync(path.join(__dirname, 'add_rarity_column.sql'), 'utf8');

// Ejecutar el script SQL
db.exec(sqlScript, (err) => {
  if (err) {
    console.error('Error al ejecutar el script SQL:', err);
  } else {
    console.log('Script SQL ejecutado exitosamente');
  }
  
  // Cerrar la conexión
  db.close((err) => {
    if (err) {
      console.error('Error al cerrar la base de datos:', err);
    } else {
      console.log('Conexión a la base de datos cerrada');
    }
  });
}); 