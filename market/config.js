// Configuración de URLs base
const config = {
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://adrianpunks.vercel.app',
    IPFS_GATEWAY: 'https://ipfs.io/ipfs/'
};

// Función para obtener la URL completa de una imagen
function getImageUrl(imagePath) {
    if (imagePath.includes('ipfs://')) {
        return imagePath.replace('ipfs://', config.IPFS_GATEWAY);
    }
    if (imagePath.includes('localhost')) {
        return imagePath.replace('http://localhost:3001', config.API_BASE_URL);
    }
    return imagePath;
}

// Exportar configuración
window.AdrianPunksConfig = config;
window.getImageUrl = getImageUrl; 