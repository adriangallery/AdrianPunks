# AdrianLab Trait Builder

Una aplicación web para construir y personalizar traits de NFTs de AdrianLab en la red Base.

## 🚀 Características

- **Conexión Wallet**: Soporte para MetaMask, WalletConnect y otras wallets
- **Gestión de NFTs**: Visualizar y seleccionar NFTs de tu colección AdrianLab
- **Sistema de Traits**: Navegar y equipar traits de diferentes categorías
- **Preview en Tiempo Real**: Ver cómo se ven los cambios antes de aplicarlos
- **Transacciones Blockchain**: Interactuar directamente con los contratos de AdrianLab
- **Interfaz Responsive**: Funciona en desktop y móvil

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Blockchain**: wagmi, RainbowKit, ethers.js
- **Red**: Base Network (L2 de Ethereum)
- **Contratos**: AdrianLabCore (ERC721), AdrianTraitsCore (ERC1155)

## 📋 Prerrequisitos

- Node.js 18+ 
- npm o yarn
- Wallet compatible (MetaMask, WalletConnect, etc.)
- Conexión a Base network

## ⚙️ Instalación

1. **Clonar el repositorio**
   ```bash
   cd AL/traitbuilder
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp env.example .env.local
   ```
   
   Editar `.env.local` con tus valores:
   ```env
   # Solo necesitas configurar WalletConnect Project ID
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=tu-project-id
   
   # Los contratos ya están configurados para Base network
   ```

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

5. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `NEXT_PUBLIC_CHAIN_ID` | ID de la red Base | `8453` |
| `NEXT_PUBLIC_RPC_URL` | URL del RPC de Base | `https://mainnet.base.org` |
| `NEXT_PUBLIC_ADRIAN_LAB_CORE` | Contrato ERC721 | `0x6e369bf0e4e0c106192d606fb6d85836d684da75` |
| `NEXT_PUBLIC_ADRIAN_TRAITS_CORE` | Contrato ERC1155 | `0x90546848474fb3c9fda3fdad887969bb244e7e58` |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | Project ID de WalletConnect | Requerido |

### Contratos

- **AdrianLabCore**: Contrato ERC721 para los NFTs principales
- **AdrianTraitsCore**: Contrato ERC1155 para los traits equipables
- **AdrianTraitsExtensions**: Contrato para traits adicionales (futuro)

## 🚀 Despliegue

### Vercel (Recomendado)

1. **Conectar repositorio a Vercel**
2. **Configurar variables de entorno en Vercel**
3. **Desplegar automáticamente**

### Netlify

1. **Build command**: `npm run build`
2. **Publish directory**: `.next`
3. **Configurar variables de entorno**

## 📱 Uso

1. **Conectar Wallet**: Usa el botón "Connect Wallet" en la parte superior
2. **Seleccionar NFT**: Elige un NFT de tu colección AdrianLab
3. **Explorar Traits**: Navega por las diferentes categorías de traits
4. **Equipar Traits**: Haz clic en un trait para equiparlo
5. **Preview**: Ve los cambios en tiempo real
6. **Confirmar**: Aplica los cambios con una transacción

## 🎨 Estructura del Proyecto

```
src/
├── components/          # Componentes React
├── hooks/              # Custom hooks
├── pages/              # Páginas Next.js
├── styles/             # Estilos CSS
├── types/              # Tipos TypeScript
├── utils/              # Utilidades y configuración
└── abis/               # ABIs de contratos
```

## 🔗 Enlaces Útiles

- [Base Network](https://base.org/)
- [Basescan](https://basescan.org/)
- [AdrianLab](https://adrianlab.com/)
- [RainbowKit](https://www.rainbowkit.com/)
- [wagmi](https://wagmi.sh/)

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

## 🆘 Soporte

Si tienes problemas o preguntas:
- Revisa los issues existentes
- Crea un nuevo issue con detalles
- Contacta al equipo de AdrianLab 