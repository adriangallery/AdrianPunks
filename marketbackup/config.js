// Configuración de URLs base
const config = {
    API_BASE_URL: 'https://marketplace-ks4ktpit5-adrians-projects-43090263.vercel.app',
    DB_URL: 'https://marketplace-ks4ktpit5-adrians-projects-43090263.vercel.app/api/nfts',
    IPFS_GATEWAY: 'https://ipfs.io/ipfs/'
};

// Función para obtener la URL completa de una imagen
function getImageUrl(imagePath) {
    if (imagePath.includes('ipfs://')) {
        return imagePath.replace('ipfs://', config.IPFS_GATEWAY);
    }
    return imagePath;
}

// Exportar configuración
window.AdrianPunksConfig = config;
window.getImageUrl = getImageUrl; 