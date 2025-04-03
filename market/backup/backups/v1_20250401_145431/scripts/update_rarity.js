const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Ruta al archivo de base de datos
const dbPath = path.join(__dirname, '..', 'nft_metadata.db');

// Ruta al archivo JSON con los nuevos valores de rareza
const rarityJsonPath = '/Users/adrian/Desktop/AdrianPunks/metaadrian_new_rarity.json';

// Crear conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
    return;
  }
  console.log('Conexión exitosa con la base de datos');
});

// Leer el archivo JSON con los nuevos valores de rareza
fs.readFile(rarityJsonPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error al leer el archivo JSON:', err);
    db.close();
    return;
  }

  try {
    const rarityData = JSON.parse(data);
    let updatedCount = 0;
    let errorCount = 0;

    // Preparar la consulta SQL
    const stmt = db.prepare('UPDATE nft_metadata SET rarity = ? WHERE name = ?');

    // Actualizar cada NFT
    Object.entries(rarityData).forEach(([name, data]) => {
      const rarity = data.new_rarity;
      stmt.run([rarity, name], (err) => {
        if (err) {
          console.error(`Error al actualizar ${name}:`, err);
          errorCount++;
        } else {
          updatedCount++;
          if (updatedCount % 100 === 0) {
            console.log(`Actualizados ${updatedCount} NFTs...`);
          }
        }
      });
    });

    // Finalizar la declaración preparada
    stmt.finalize((err) => {
      if (err) {
        console.error('Error al finalizar la declaración:', err);
      } else {
        console.log(`\nActualización completada. Total de NFTs actualizados: ${updatedCount}`);
      }
      db.close();
    });

  } catch (err) {
    console.error('Error al procesar el JSON:', err);
    db.close();
  }
}); 