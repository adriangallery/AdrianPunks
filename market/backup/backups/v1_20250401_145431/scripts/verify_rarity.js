const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Ruta al archivo de base de datos
const dbPath = path.join(__dirname, '..', 'nft_metadata.db');

// Ruta al archivo JSON con los valores de rareza esperados
const rarityJsonPath = '/Users/adrian/Desktop/AdrianPunks/metaadrian_new_rarity.json';

// Crear conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
    return;
  }
  console.log('Conexión exitosa con la base de datos');
});

// Leer el archivo JSON con los valores esperados
fs.readFile(rarityJsonPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error al leer el archivo JSON:', err);
    db.close();
    return;
  }

  try {
    const expectedRarityData = JSON.parse(data);
    let verifiedCount = 0;
    let errorCount = 0;

    // Consulta para obtener todos los NFTs con su rareza
    db.all('SELECT name, rarity FROM nft_metadata', [], (err, rows) => {
      if (err) {
        console.error('Error al consultar la base de datos:', err);
        db.close();
        return;
      }

      rows.forEach(row => {
        const expectedRarity = expectedRarityData[row.name];
        if (expectedRarity === undefined) {
          console.error(`NFT no encontrado en los datos de rareza: ${row.name}`);
          errorCount++;
        } else if (row.rarity !== expectedRarity.toString()) {
          console.error(`Discrepancia en la rareza para ${row.name}:`);
          console.error(`  Base de datos: ${row.rarity}`);
          console.error(`  Esperado: ${expectedRarity}`);
          errorCount++;
        } else {
          verifiedCount++;
          if (verifiedCount % 100 === 0) {
            console.log(`Verificados ${verifiedCount} NFTs...`);
          }
        }
      });

      const total = verifiedCount + errorCount;
      const successRate = ((verifiedCount / total) * 100).toFixed(2);
      
      console.log('\nResultados de la verificación:');
      console.log(`Total de NFTs verificados: ${total}`);
      console.log(`NFTs correctos: ${verifiedCount}`);
      console.log(`NFTs con error: ${errorCount}`);
      console.log(`Tasa de éxito: ${successRate}%`);

      db.close();
    });

  } catch (err) {
    console.error('Error al procesar el JSON:', err);
    db.close();
  }
}); 