<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Leer el archivo JSON desde el directorio privado
$jsonData = file_get_contents('../private/adrianpunks.json');

// Servir los datos
echo $jsonData;
?> 