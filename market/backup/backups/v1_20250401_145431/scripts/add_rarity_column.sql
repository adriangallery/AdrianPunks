-- Añadir la columna rarity a la tabla nft_metadata
ALTER TABLE nft_metadata ADD COLUMN rarity TEXT;

-- Actualizar la rareza basada en los atributos
UPDATE nft_metadata 
SET rarity = (
    SELECT COUNT(*) 
    FROM json_each(attributes) 
    WHERE json_extract(value, '$.trait_type') = 'Rarity'
); 