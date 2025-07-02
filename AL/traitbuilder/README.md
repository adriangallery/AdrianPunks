# AdrianLab Trait Builder

Una aplicación web moderna para personalizar NFTs de AdrianLab con traits únicos. Permite a los usuarios conectar sus wallets, ver sus NFTs, explorar traits disponibles y aplicar cambios mediante transacciones blockchain.

## 🚀 Características

- **Conexión de Wallet**: Soporte para MetaMask, WalletConnect y otras wallets populares
- **Gestión de NFTs**: Visualización y selección de NFTs del usuario
- **Sistema de Traits**: Exploración de traits por categorías (Background, Base, Body, etc.)
- **Preview en Tiempo Real**: Vista previa instantánea de combinaciones de traits
- **Transacciones Blockchain**: Equipar/desequipar traits mediante contratos inteligentes
- **UI Responsive**: Diseño moderno y adaptable a todos los dispositivos
- **Manejo de Errores**: Sistema robusto de manejo de errores y estados de carga

## 🏗️ Arquitectura

### Contratos Blockchain
- **AdrianLabCore** (ERC721): NFTs principales con `tokenSkin[tokenId]`
- **AdrianTraitsCore** (ERC1155): Traits con rangos de IDs (1-99,999)
- **AdrianTraitsExtensions**: Sistema de equipamiento con `equippedTrait[tokenId][category]`

### Categorías de Traits
- BACKGROUND
- BASE
- BODY
- CLOTHING
- EYES
- MOUTH
- HEAD
- ACCESSORIES

### Stack Tecnológico
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Web3**: wagmi, viem, RainbowKit
- **State Management**: React Query
- **Blockchain**: Ethereum Mainnet

## 📦 Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd traitbuilder
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp env.example .env.local
```

Editar `.env.local` con tus configuraciones:
```env
# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY

# Contract Addresses
NEXT_PUBLIC_ADRIAN_LAB_CORE=0x...
NEXT_PUBLIC_ADRIAN_TRAITS_CORE=0x...
NEXT_PUBLIC_ADRIAN_TRAITS_EXTENSIONS=0x...

# Wallet Configuration
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id
```

4. **Ejecutar en desarrollo**
```bash
npm run dev
```

5. **Construir para producción**
```bash
npm run build
npm start
```

## 🎯 Uso

### Flujo de Usuario

1. **Conectar Wallet**: El usuario conecta su wallet usando RainbowKit
2. **Seleccionar NFT**: Elige un NFT de su colección para personalizar
3. **Explorar Traits**: Navega por las categorías de traits disponibles
4. **Preview en Tiempo Real**: Ve cambios instantáneos en el preview
5. **Aplicar Cambios**: Confirma transacciones para equipar/desequipar traits

### Funcionalidades Principales

#### Wallet Connection
- Soporte para múltiples wallets
- Detección automática de red
- Manejo de errores de conexión

#### NFT Management
- Grid responsive de NFTs
- Información detallada de cada NFT
- Estados de carga y error

#### Trait System
- Organización por categorías
- Filtros y búsqueda
- Información de rareza y balance

#### Preview System
- Actualización en tiempo real
- Caché de imágenes
- Fallbacks para errores

#### Transaction Management
- Estados de transacción
- Confirmaciones de usuario
- Manejo de errores de red

## 🏗️ Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── WalletConnector.tsx
│   ├── NFTSelector.tsx
│   ├── TraitPanel.tsx
│   ├── PreviewDisplay.tsx
│   ├── EquippedTraits.tsx
│   ├── LoadingSpinner.tsx
│   └── ErrorBoundary.tsx
├── hooks/              # Hooks personalizados
│   ├── useWallet.ts
│   ├── useUserNFTs.ts
│   ├── useUserTraits.ts
│   ├── useEquippedTraits.ts
│   ├── useTraitEquipping.ts
│   └── usePreview.ts
├── utils/              # Utilidades y helpers
│   ├── contracts.ts
│   ├── validation.ts
│   ├── preview.ts
│   ├── constants.ts
│   └── helpers.ts
├── types/              # Definiciones TypeScript
│   ├── contracts.ts
│   ├── traits.ts
│   ├── nft.ts
│   └── api.ts
├── abis/               # ABIs de contratos
│   ├── AdrianLabCore.json
│   ├── AdrianTraitsCore.json
│   └── AdrianTraitsExtensions.json
├── pages/              # Páginas Next.js
│   ├── index.tsx
│   ├── _app.tsx
│   └── api/
└── styles/             # Estilos globales
    └── globals.css
```

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `NEXT_PUBLIC_CHAIN_ID` | ID de la blockchain | Sí |
| `NEXT_PUBLIC_RPC_URL` | URL del RPC provider | Sí |
| `NEXT_PUBLIC_ADRIAN_LAB_CORE` | Dirección del contrato ERC721 | Sí |
| `NEXT_PUBLIC_ADRIAN_TRAITS_CORE` | Dirección del contrato ERC1155 | Sí |
| `NEXT_PUBLIC_ADRIAN_TRAITS_EXTENSIONS` | Dirección del sistema de equipamiento | Sí |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | Project ID de WalletConnect | Sí |

### Configuración de Redes

El proyecto está configurado para Ethereum Mainnet por defecto. Para cambiar a testnets:

1. Actualizar `NEXT_PUBLIC_CHAIN_ID`
2. Configurar RPC URL apropiada
3. Actualizar direcciones de contratos

## 🧪 Desarrollo

### Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construir para producción
npm run start        # Servidor de producción
npm run lint         # Linting con ESLint
npm run type-check   # Verificación de tipos TypeScript
```

### Convenciones de Código

- **TypeScript**: Uso estricto de tipos
- **ESLint**: Configuración Next.js + TypeScript
- **Prettier**: Formateo automático
- **Componentes**: Funcionales con hooks
- **Estilos**: Tailwind CSS con clases utilitarias

### Testing

```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch

# Coverage
npm run test:coverage
```

## 🚀 Despliegue

### Vercel (Recomendado)

1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Desplegar automáticamente

### Otros Proveedores

- **Netlify**: Configurar build command `npm run build`
- **AWS Amplify**: Configurar build settings
- **Docker**: Usar Dockerfile incluido

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

- **Documentación**: [Wiki del proyecto]
- **Issues**: [GitHub Issues]
- **Discord**: [Servidor de AdrianLab]

## 🔮 Roadmap

- [ ] Soporte para múltiples redes
- [ ] Sistema de favoritos
- [ ] Historial de transacciones
- [ ] Exportar configuraciones
- [ ] Modo colaborativo
- [ ] Integración con marketplaces

---

**Desarrollado con ❤️ por el equipo de AdrianLab** 