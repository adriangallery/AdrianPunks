// Adrian Auction DApp - Main JavaScript functionality (Version estable 1.0)
// Último commit sincronizado: mayo 2024

// Contract Constants
const CONTRACT_ADDRESS = "0x1df1de9cb0cb887f08634ec66c4c8d781691f497";
const ADRIAN_TOKEN_ADDRESS = "0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea"; // ADRIAN token address
const ALCHEMY_API_KEY = "5qIXA1UZxOAzi8b9l0nrYmsQBO9-W7Ot";
const ALCHEMY_RPC_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const RPC_URL = ALCHEMY_RPC_URL;

// Contract ABIs
const AUCTION_ABI = [
  // Read functions
  "function getActiveAuctionsCount() view returns (uint256)",
  "function getActiveAuctions(uint256,uint256) view returns (uint256[] memory)",
  "function getManyAuctionDetails(uint256[]) view returns ((address nftContract,uint256 tokenId,address seller,uint256 reservePrice,uint256 endTime,address highestBidder,uint256 highestBid,bool active,bool finalized)[] memory)",
  "function getUserAuctions(address) view returns (uint256[] memory)",
  "function getUserBids(address) view returns (uint256[] memory)",
  
  // NUEVAS FUNCIONES
  "function depositNFT(address,uint256) external",
  "function createAuctionFromDeposit(address,uint256,uint256,uint256) external",
  "function withdrawDepositedNFT(address,uint256) external",
  "function getDepositInfo(address,uint256) external view returns (address)",
  
  // Write functions
  "function createAuction(address,uint256,uint256,uint256) external",
  "function placeBid(uint256,uint256) external",
  "function endAuction(uint256) external",
  "function cancelAuction(uint256) external",
  "function relistAuction(uint256,uint256,uint256) external",
  "function finalizeExpiredAuction(uint256) external", // NUEVA FUNCIÓN
  
  // Events
  "event AuctionCreated(uint256 indexed auctionId, address seller, address nftContract, uint256 tokenId, uint256 reservePrice, uint256 endTime)",
  "event BidPlaced(uint256 indexed auctionId, address bidder, uint256 amount)",
  "event BidRefunded(uint256 indexed auctionId, address bidder, uint256 amount)",
  "event AuctionEnded(uint256 indexed auctionId, address winner, uint256 amount)",
  "event AuctionCancelled(uint256 indexed auctionId)",
  "event AuctionExtended(uint256 indexed auctionId, uint256 newEndTime)",
  "event TransferFailed(address nftContract, uint256 tokenId, address from, address to, string reason)", // NUEVO EVENTO
  
  // NUEVOS EVENTOS
  "event NFTDeposited(address indexed nftContract, uint256 indexed tokenId, address indexed depositor)",
  "event NFTWithdrawn(address indexed nftContract, uint256 indexed tokenId, address indexed withdrawer)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

const ERC721_ABI = [
  "function isApprovedForAll(address owner, address operator) external view returns (bool)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function getApproved(uint256 tokenId) external view returns (address)",
  "function approve(address to, uint256 tokenId) external"
];

// Base Network Configuration
const BASE_NETWORK = {
  chainId: "0x2105", // 8453 in hex
  chainName: "Base Mainnet",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: ["https://basescan.org/"],
};

// App State
let currentAccount = null;
let provider = null;
let signer = null;
let auctionContract = null;
let readOnlyProvider = null;
let readOnlyAuctionContract = null;
let alchemyWeb3 = null;
let ownedNFTs = [];
let selectedNFT = null;
// Variables para paginación de NFTs
let nftPageKey = null; // Almacenará la clave de paginación devuelta por Alchemy
let nftPageSize = 20;
let hasMoreNfts = true;

// Variable para almacenar el último conjunto de IDs de subastas
let lastAuctionIds = [];

// Mapa para cachear temporalmente metadatos de NFTs
const nftMetadataCache = new Map();

// Variables de estado para el ticker
let tickerLoadingQueue = []; // Cola de subastas pendientes
let loadedAuctionIds = new Set(); // Subastas ya cargadas en el ticker
let isFirstLoad = true; // Para saber si es la primera carga
let tickerLoadingInProgress = false; // Control para evitar cargas superpuestas

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
  // Set up contract info
  const contractInfoElement = document.getElementById('contractInfo');
  if (contractInfoElement) {
    contractInfoElement.textContent = 
    `Contract: ${CONTRACT_ADDRESS.substring(0, 6)}...${CONTRACT_ADDRESS.substring(38)}`;
  }
  
  // Connect button event listener
  const connectBtn = document.getElementById("connectBtn");
  if (connectBtn) {
    connectBtn.addEventListener("click", connectWallet);
  }
  
  // Tab change handlers
  const myAuctionsTab = document.getElementById("myauctions-tab");
  if (myAuctionsTab) {
    myAuctionsTab.addEventListener("click", () => {
    if (currentAccount) {
      loadUserAuctions(currentAccount);
    }
  });
  }
  
  const myBidsTab = document.getElementById("mybids-tab");
  if (myBidsTab) {
    myBidsTab.addEventListener("click", () => {
    if (currentAccount) {
      loadUserBids(currentAccount);
    }
  });
  }
  
  const createTab = document.getElementById("create-tab");
  if (createTab) {
    createTab.addEventListener("click", () => {
    if (currentAccount) {
      // Reiniciar estado de paginación cuando se cambia a la pestaña
      nftPageKey = null;
      ownedNFTs = [];
      hasMoreNfts = true;
      loadUserNFTs(currentAccount);
    }
  });
  }
  
  // Botón Load More NFTs
  const loadMoreNftsBtn = document.getElementById("loadMoreNftsBtn");
  if (loadMoreNftsBtn) {
    loadMoreNftsBtn.addEventListener("click", () => {
    if (currentAccount && hasMoreNfts) {
      loadUserNFTs(currentAccount, true); // true = append mode
    }
  });
  }
  
  // Form handlers
  const createAuctionForm = document.getElementById("createAuctionForm");
  if (createAuctionForm) {
    createAuctionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentAccount) {
        showError("Please connect your wallet first");
      return;
    }
    
    if (!selectedNFT) {
        showError("Please select an NFT first");
      return;
    }
    
    const reservePrice = document.getElementById("reservePrice").value;
    const duration = document.getElementById("duration").value;
    
    // Validación de los inputs
    if (parseFloat(reservePrice) <= 0) {
        showError("Reserve price must be greater than 0");
      return;
    }
    
    if (parseInt(duration) < 1) {
        showError("Duration must be at least 1 hour");
      return;
    }
    
      console.log("Starting auction creation with parameters:", {
      nftContract: selectedNFT.contract,
      tokenId: selectedNFT.tokenId,
      reservePrice: reservePrice,
      duration: duration
    });
    
    createNewAuction(selectedNFT.contract, selectedNFT.tokenId, reservePrice, duration);
  });
  }
  
  // Bid modal setup
  const placeBidBtn = document.getElementById("placeBidBtn");
  if (placeBidBtn) {
    placeBidBtn.addEventListener("click", () => {
    const auctionId = document.getElementById("bidAuctionId").value;
    const bidAmount = document.getElementById("bidAmount").value;
    
    placeBid(auctionId, bidAmount);
    const bidModal = bootstrap.Modal.getInstance(document.getElementById('bidModal'));
    bidModal.hide();
  });
  }
  
  // Navigation buttons
  const createFirstAuctionBtn = document.getElementById("createFirstAuctionBtn");
  if (createFirstAuctionBtn) {
    createFirstAuctionBtn.addEventListener("click", () => {
      const createTab = document.getElementById("create-tab");
      if (createTab) createTab.click();
    });
  }
  
  const exploreToBidBtn = document.getElementById("exploreToBidBtn");
  if (exploreToBidBtn) {
    exploreToBidBtn.addEventListener("click", () => {
      const exploreTab = document.getElementById("explore-tab");
      if (exploreTab) exploreTab.click();
    });
  }
  
  // Check if wallet is already connected
  checkConnection();
  
  // Check for deposited NFTs when loading the Create tab
  if (createTab) {
    createTab.addEventListener("click", async () => {
      if (currentAccount && auctionContract) {
        // When switching to create tab, check if there are deposited NFTs
        try {
          if (selectedNFT) {
            const tokenIdBN = ethers.BigNumber.from(String(selectedNFT.tokenId));
            const depositor = await auctionContract.getDepositInfo(selectedNFT.contract, tokenIdBN);
            
            const depositStatus = document.getElementById("depositStatus");
            if (!depositStatus) return;
            
            // If the selected NFT is deposited by the current user
            if (depositor.toLowerCase() === currentAccount.toLowerCase()) {
              depositStatus.style.display = "block";
              const withdrawNFTBtn = document.getElementById("withdrawNFTBtn");
              if (withdrawNFTBtn) {
                withdrawNFTBtn.onclick = () => {
                  withdrawDepositedNFT(selectedNFT.contract, tokenIdBN);
                };
              }
            } else {
              depositStatus.style.display = "none";
            }
          } else {
            const depositStatus = document.getElementById("depositStatus");
            if (depositStatus) depositStatus.style.display = "none";
          }
        } catch (error) {
          console.warn("Error checking deposit status:", error);
          const depositStatus = document.getElementById("depositStatus");
          if (depositStatus) depositStatus.style.display = "none";
        }
      }
    });
  }
  
  // Mostrar inmediatamente el ticker vacío con mensaje de carga
  initEmptyTicker();
  
  // Iniciar actualización de tiempos
  startTimeUpdater();
});

// Initialize Alchemy Web3
function initAlchemyWeb3() {
  try {
    if (window.AlchemyWeb3) {
      console.log("Initializing AlchemyWeb3");
      alchemyWeb3 = AlchemyWeb3.createAlchemyWeb3(ALCHEMY_RPC_URL);
      console.log("AlchemyWeb3 initialized successfully");
      return true;
    }
    console.error("AlchemyWeb3 not available");
    return false;
  } catch (err) {
    console.error("Error initializing AlchemyWeb3:", err);
    return false;
  }
}

// Check if wallet is connected
async function checkConnection() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        // Auto-connect if user has previously connected
        await connectWallet();
      }
    } catch (error) {
      console.error("Failed to check connection:", error);
    }
  }
}

// Connect wallet
async function connectWallet() {
  try {
    if (!window.ethereum) {
      showError("MetaMask not detected! Please install MetaMask to use this application.");
      return;
    }
    
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    currentAccount = accounts[0];
    
    // Check if user is on the Base network
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== BASE_NETWORK.chainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_NETWORK.chainId }],
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BASE_NETWORK],
          });
        } else {
          throw switchError;
        }
      }
    }
    
    // Initialize providers and contracts
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    readOnlyProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    // Create contract instances
    readOnlyAuctionContract = new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, readOnlyProvider);
    auctionContract = readOnlyAuctionContract.connect(signer);
    
    // Initialize Alchemy Web3
    initAlchemyWeb3();
    
    // Update UI
    const connectSection = document.getElementById("connect-section");
    const accountSection = document.getElementById("account-section");
    const appContent = document.getElementById("app-content");
    const walletAddress = document.getElementById("walletAddress");
    
    if (connectSection) connectSection.style.display = "none";
    if (accountSection) accountSection.style.display = "block";
    if (appContent) appContent.style.display = "block";
    if (walletAddress) walletAddress.textContent = `${currentAccount.slice(0,6)}...${currentAccount.slice(-4)}`;
    
    // Inicializar el ticker carousel ya que ahora es visible
    updateAuctionCarousel();
    
    // Event listeners for account/chain changes
    window.ethereum.on('accountsChanged', (accounts) => {
      window.location.reload();
    });
    
    window.ethereum.on('chainChanged', () => {
      window.location.reload();
    });
    
    // Load data
    showSuccess("Wallet connected successfully!");
    
    // Only load active auctions on the main page (not on detail pages)
    const auctionsList = document.getElementById("auctionsList");
    if (auctionsList) {
    await loadActiveAuctions();
    }
    
  } catch (error) {
    console.error("Connection error:", error);
    showError(error.message || "Failed to connect wallet");
  }
}

// Check if user is on Base Network
async function checkBaseNetwork() {
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (chainId !== BASE_NETWORK.chainId) {
    showError("Please connect to Base Network to load your NFTs");
    return false;
  }
  return true;
}

// Función modificada para extraer mejor las URLs de imágenes NFT
async function loadUserNFTs(userAddress, appendMode = false) {
  const loadingElement = document.getElementById("loading-nfts");
  const noNftsMessage = document.getElementById("no-nfts");
  const nftSelection = document.getElementById("nft-selection");
  const nftList = document.getElementById("nftList");
  const auctionDetails = document.getElementById("auction-details");
  const loadMoreContainer = document.getElementById("load-more-container");
  const loadMoreButton = document.getElementById("loadMoreNftsBtn");
  
  // Reset state si no estamos en modo append
  if (!appendMode) {
    ownedNFTs = [];
    selectedNFT = null;
    nftPageKey = null;
  }
  
  // Show loading indicator
  if (!appendMode) {
    loadingElement.style.display = "block";
    noNftsMessage.style.display = "none";
    nftSelection.style.display = "none";
    auctionDetails.style.display = "none";
    nftList.innerHTML = "";
    loadMoreContainer.style.display = "none";
  } else {
    // En modo append, mostrar indicador de carga en el botón
    loadMoreButton.textContent = "Loading...";
    loadMoreButton.disabled = true;
  }
  
  try {
    // Check if Alchemy is initialized
    if (!alchemyWeb3) {
      if (!initAlchemyWeb3()) {
        throw new Error("Alchemy Web3 could not be initialized");
      }
    }
    
    // Construir URL con paginación usando el pageKey si existe
    // Modificación: Añadir parámetro para filtrar solo ERC721
    let alchemyUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${userAddress}&withMetadata=true&pageSize=${nftPageSize}&tokenType=ERC721`;
    if (nftPageKey && appendMode) {
      alchemyUrl += `&pageKey=${encodeURIComponent(nftPageKey)}`;
    }
    
    console.log(`Solicitando NFTs con URL: ${alchemyUrl}`);
    
    // Use Alchemy's getNFTsForOwner method to get all NFTs owned by the user with paginación
    const alchemyResponse = await fetch(alchemyUrl);
    
    if (!alchemyResponse.ok) {
      throw new Error("Failed to fetch NFTs from Alchemy API");
    }
    
    const nftsData = await alchemyResponse.json();
    console.log(`Página NFT data received:`, nftsData);
    
    // Guardar la clave de paginación para la próxima solicitud
    nftPageKey = nftsData.pageKey;
    console.log("Nueva pageKey:", nftPageKey);
    
    // Verificar si hay más páginas disponibles
    hasMoreNfts = nftPageKey !== undefined && nftPageKey !== null;
    console.log("¿Hay más NFTs para cargar?", hasMoreNfts ? "Sí" : "No");
    
    // Imprimir un ejemplo completo del primer NFT para depuración
    if (nftsData.ownedNfts && nftsData.ownedNfts.length > 0) {
      console.log("Ejemplo de estructura NFT:", JSON.stringify(nftsData.ownedNfts[0], null, 2));
    }
    
    // Process NFTs
    if (nftsData.ownedNfts && nftsData.ownedNfts.length > 0) {
      const newNFTs = nftsData.ownedNfts.map(nft => {
        try {
          // Verificar que existan las propiedades necesarias
          if (!nft || !nft.contract) {
            console.error("NFT missing required properties:", nft);
            return null;
          }
          
          // Filtrar NFTs - excluir contratos específicos
          const excludedContracts = [
            // Lista vacía por ahora - agregar contratos a filtrar en el futuro cuando sea necesario
            // Por ejemplo: "0x6ba5a93878a0ac34b63fd9994a874a9b0111d587"
          ].map(addr => addr.toLowerCase());

          if (nft.contract.address && 
              excludedContracts.includes(nft.contract.address.toLowerCase())) {
            console.log(`Excluyendo NFT del contrato filtrado: ${nft.contract.address}`);
            return null;
          }
          
          console.log("Procesando NFT completo:", nft);
          
          // Verificar que sea ERC721 (aunque ya filtramos en la API)
          if (nft.tokenType && nft.tokenType !== "ERC721") {
            console.log(`Excluyendo token que no es ERC721: ${nft.tokenType}`);
            return null;
          }
          
          // Extraer tokenId - podría estar directamente en nft.tokenId o en nft.id.tokenId
          let tokenId;
          if (nft.tokenId) {
            // Si tokenId está directamente en el objeto
            tokenId = nft.tokenId;
          } else if (nft.id && nft.id.tokenId) {
            // Si tokenId está en nft.id.tokenId (formato anterior)
            tokenId = nft.id.tokenId;
          } else {
            console.error("No tokenId found in NFT:", nft);
            return null;
          }
          
          // Convertir tokenId a entero (podría ser string en formato decimal o hex)
          let tokenIdInt;
          if (typeof tokenId === 'number') {
            tokenIdInt = tokenId;
          } else if (tokenId.startsWith('0x')) {
            tokenIdInt = parseInt(tokenId, 16);
          } else {
            tokenIdInt = parseInt(tokenId, 10);
          }
          
          if (isNaN(tokenIdInt)) {
            console.error("Invalid tokenId format:", tokenId);
            return null;
          }
          
          // Extraer título/nombre - podría estar en nft.title o nft.name
          let title = `NFT #${tokenIdInt}`;
          
          // Intentar obtener un título más descriptivo
          if (nft.title) {
            title = nft.title;
          } else if (nft.name) {
            title = nft.name;
          } else if (nft.metadata && nft.metadata.name) {
            title = nft.metadata.name;
          } else if (nft.contract && nft.contract.name) {
            title = `${nft.contract.name} #${tokenIdInt}`;
          }
          
          console.log(`NFT #${tokenIdInt} Propiedades principales:`, {
            contract: nft.contract,
            media: nft.media,
            raw: nft.raw,
            metadata: nft.metadata
          });
          
          // MÉTODO MEJORADO PARA EXTRAER LA URL DE LA IMAGEN
          let mediaUrl = "";
          
          // 1. Buscar en raw data - a veces la respuesta de Alchemy tiene la estructura completa directa
          if (nft.raw && nft.raw.metadata && nft.raw.metadata.image) {
            mediaUrl = nft.raw.metadata.image;
            console.log("Imagen encontrada en raw.metadata.image:", mediaUrl);
          }
          
          // 2. Intentar extraer la URL de la imagen de varias ubicaciones posibles
          if (!mediaUrl && nft.media && Array.isArray(nft.media) && nft.media.length > 0) {
            console.log("Buscando en media array:", nft.media);
            // Revisar todas las posibles propiedades donde podría estar la imagen
            const mediaSources = ['gateway', 'raw', 'thumbnail', 'format'];
            
            for (const source of mediaSources) {
              if (nft.media[0][source] && typeof nft.media[0][source] === 'string') {
                mediaUrl = nft.media[0][source];
                console.log(`Imagen encontrada en media[0].${source}:`, mediaUrl);
                break;
              }
            }
          }
          
          // 3. Si no encontramos la URL en media, buscar en otras ubicaciones
          if (!mediaUrl && nft.metadata) {
            console.log("Buscando en metadata:", nft.metadata);
            // Buscar en varias propiedades que comúnmente contienen URLs de imágenes
            const imageProps = ['image', 'image_url', 'imageUrl', 'imageURI', 'image_uri', 'imageData'];
            
            for (const prop of imageProps) {
              if (nft.metadata[prop] && typeof nft.metadata[prop] === 'string') {
                mediaUrl = nft.metadata[prop];
                console.log(`Imagen encontrada en metadata.${prop}:`, mediaUrl);
                break;
              }
            }
          }
          
          // 4. Si no encontramos la URL en metadata, buscar directamente en el objeto
          if (!mediaUrl) {
            console.log("Buscando en el objeto NFT principal");
            const imageProps = ['image', 'image_url', 'imageUrl', 'imageURI', 'image_uri'];
            
            for (const prop of imageProps) {
              if (nft[prop] && typeof nft[prop] === 'string') {
                mediaUrl = nft[prop];
                console.log(`Imagen encontrada en nft.${prop}:`, mediaUrl);
                break;
              }
            }
          }
          
          // 5. Último recurso: buscar cualquier URL en cualquier propiedad
          if (!mediaUrl && nft.metadata) {
            console.log("Buscando cualquier URL en metadata");
            for (const key in nft.metadata) {
              const value = nft.metadata[key];
              if (typeof value === 'string' && 
                  (value.startsWith('http') || value.startsWith('ipfs://') || value.startsWith('data:image/'))) {
                mediaUrl = value;
                console.log(`Found potential image URL in metadata.${key}:`, value);
                break;
              }
            }
          }
          
          // Verificar y corregir URLs de IPFS
          if (mediaUrl && mediaUrl.startsWith('ipfs://')) {
            const originalUrl = mediaUrl;
            const ipfsHash = mediaUrl.replace('ipfs://', '');
            // Fix: Check if the hash already contains 'ipfs/' prefix to avoid duplication
            if (ipfsHash.startsWith('ipfs/')) {
              mediaUrl = `https://ipfs.io/${ipfsHash}`;
            } else {
              mediaUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
            }
            console.log(`URL IPFS convertida: ${originalUrl} -> ${mediaUrl}`);
          }
          
          // Para URLs de Arweave
          if (mediaUrl && mediaUrl.startsWith('ar://')) {
            const originalUrl = mediaUrl;
            mediaUrl = mediaUrl.replace('ar://', 'https://arweave.net/');
            console.log(`URL Arweave convertida: ${originalUrl} -> ${mediaUrl}`);
          }
          
          // Imprimir para depuración
          console.log(`NFT #${tokenIdInt} image URL FINAL:`, mediaUrl);
          
          return {
            contract: nft.contract.address,
            tokenId: tokenIdInt,
            title: title,
            description: nft.description || "",
            media: mediaUrl,
            metadata: nft.metadata
          };
        } catch (err) {
          console.error("Error processing NFT:", err, nft);
          return null;
        }
      }).filter(nft => nft !== null); // Filtrar los NFTs que fallaron al procesarse
      
      // En modo append, agregamos los nuevos NFTs a la lista existente
      if (appendMode) {
        ownedNFTs = [...ownedNFTs, ...newNFTs];
      } else {
        ownedNFTs = newNFTs;
      }
      
      console.log(`Total de NFTs procesados (${appendMode ? 'append' : 'initial'}):`, ownedNFTs.length);
      
      if (ownedNFTs.length > 0) {
        // Display NFTs
        if (appendMode) {
          // Solo renderizar los nuevos NFTs
          renderAdditionalNFTs(nftList, newNFTs);
        } else {
          renderNFTGrid(nftList);
        }
        
        loadingElement.style.display = "none";
        nftSelection.style.display = "block";
        
        // Mostrar u ocultar el botón "Load More" según corresponda
        loadMoreContainer.style.display = hasMoreNfts ? "block" : "none";
        loadMoreButton.textContent = "Load More NFTs";
        loadMoreButton.disabled = false;
      } else {
        loadingElement.style.display = "none";
        noNftsMessage.style.display = "block";
        loadMoreContainer.style.display = "none";
      }
    } else {
      if (!appendMode) {
        loadingElement.style.display = "none";
        noNftsMessage.style.display = "block";
        loadMoreContainer.style.display = "none";
      } else {
        // Si estamos en modo append pero no hay más NFTs
        loadMoreButton.textContent = "No More NFTs";
        loadMoreButton.disabled = true;
        setTimeout(() => {
          loadMoreContainer.style.display = "none";
        }, 2000);
      }
    }
  } catch (error) {
    console.error("Error loading NFTs:", error);
    if (error.response) {
      try {
        console.error("Response data:", await error.response.text());
      } catch (e) {
        console.error("Could not read response data");
      }
    }
    
    if (appendMode) {
      // Restaurar el botón en caso de error
      loadMoreButton.textContent = "Load More NFTs";
      loadMoreButton.disabled = false;
      showError("Failed to load more NFTs. Please try again.");
    } else {
      showError("Failed to load your NFTs. Please try again later.");
      loadingElement.style.display = "none";
      noNftsMessage.style.display = "block";
    }
  }
}

// Función para renderizar solo NFTs adicionales (para append)
function renderAdditionalNFTs(container, newNFTs) {
  newNFTs.forEach((nft, index) => {
    const globalIndex = ownedNFTs.findIndex(n => 
      n.contract === nft.contract && n.tokenId === nft.tokenId
    );
    
    const isSelected = selectedNFT && selectedNFT.contract === nft.contract && selectedNFT.tokenId === nft.tokenId;
    
    const nftCard = document.createElement("div");
    nftCard.className = `auction-card ${isSelected ? 'border-primary' : ''}`;
    nftCard.onclick = () => selectNFT(globalIndex);
    
    // Asegurarse de que la URL de la imagen sea una cadena válida
    const imageUrl = (typeof nft.media === 'string' && nft.media) 
      ? nft.media 
      : "https://placehold.co/400x400?text=NFT+Image";
    
    console.log(`Renderizando NFT adicional #${nft.tokenId} con imagen:`, imageUrl);
    
    nftCard.innerHTML = `
      <div class="nft-image-container">
        <img src="${imageUrl}" class="nft-image" alt="${nft.title}" 
             onerror="console.error('Error cargando imagen:', this.src); this.onerror=null; this.src='https://placehold.co/400x400?text=NFT+Image'" 
             loading="lazy">
      </div>
      <div class="token-info">
        <h3 class="auction-title">${nft.title}</h3>
        <p>Contract: ${formatAddress(nft.contract)}</p>
        <p>Token ID: ${nft.tokenId}</p>
        ${isSelected ? '<span class="auction-status status-live">Selected</span>' : ''}
      </div>
    `;
    
    container.appendChild(nftCard);
    
    // Verificar si la imagen cargó correctamente
    const img = nftCard.querySelector('.nft-image');
    img.addEventListener('load', () => {
      console.log(`NFT adicional #${nft.tokenId} image loaded successfully:`, img.src);
    });
  });
}

// Renderizar con manejo mejorado de errores de imagen
function renderNFTGrid(container) {
  container.innerHTML = "";
  
  ownedNFTs.forEach((nft, index) => {
    const isSelected = selectedNFT && selectedNFT.contract === nft.contract && selectedNFT.tokenId === nft.tokenId;
    
    const nftCard = document.createElement("div");
    nftCard.className = `auction-card ${isSelected ? 'border-primary' : ''}`;
    nftCard.onclick = () => selectNFT(index);
    
    // Asegurarse de que la URL de la imagen sea una cadena válida
    const imageUrl = (typeof nft.media === 'string' && nft.media) 
      ? nft.media 
      : "https://placehold.co/400x400?text=NFT+Image";
    
    console.log(`Renderizando NFT #${nft.tokenId} con imagen:`, imageUrl);
    
    nftCard.innerHTML = `
      <div class="nft-image-container">
        <img src="${imageUrl}" class="nft-image" alt="${nft.title}" 
             onerror="console.error('Error cargando imagen:', this.src); this.onerror=null; this.src='https://placehold.co/400x400?text=NFT+Image'" 
             loading="lazy">
      </div>
      <div class="token-info">
        <h3 class="auction-title">${nft.title}</h3>
        <p>Contract: ${formatAddress(nft.contract)}</p>
        <p>Token ID: ${nft.tokenId}</p>
        ${isSelected ? '<span class="auction-status status-live">Selected</span>' : ''}
      </div>
    `;
    
    container.appendChild(nftCard);
    
    // Verificar si la imagen cargó correctamente
    const img = nftCard.querySelector('.nft-image');
    img.addEventListener('load', () => {
      console.log(`NFT #${nft.tokenId} image loaded successfully:`, img.src);
    });
  });
}

// Select NFT for auction
async function selectNFT(index) {
  selectedNFT = ownedNFTs[index];
  
  // Update display
  renderNFTGrid(document.getElementById("nftList"));
  
  // Show selected NFT in the auction details
  const selectedNftDisplay = document.getElementById("selectedNftDisplay");
  const auctionDetails = document.getElementById("auction-details");
  
  // Asegurar que la URL de la imagen es válida
  const imageUrl = (typeof selectedNFT.media === 'string' && selectedNFT.media) 
    ? selectedNFT.media 
    : "https://placehold.co/400x400?text=NFT+Image";
  
  selectedNftDisplay.innerHTML = `
    <img src="${imageUrl}" class="me-3" style="width: 50px; height: 50px; object-fit: contain;" 
         onerror="this.onerror=null; this.src='https://placehold.co/400x400?text=NFT+Image'">
    <div>
      <strong>${selectedNFT.title}</strong>
      <div>Token ID: ${selectedNFT.tokenId}</div>
    </div>
  `;
  
  // Set hidden fields
  document.getElementById("nftContract").value = selectedNFT.contract;
  document.getElementById("tokenId").value = selectedNFT.tokenId;
  
  // Show auction details
  auctionDetails.style.display = "block";
  
  // Verify if the NFT is deposited
  if (auctionContract) {
    try {
      const tokenIdBN = ethers.BigNumber.from(String(selectedNFT.tokenId));
      const depositor = await auctionContract.getDepositInfo(selectedNFT.contract, tokenIdBN);
      
      // If the selected NFT is deposited by the current user
      if (depositor.toLowerCase() === currentAccount.toLowerCase()) {
        document.getElementById("depositStatus").style.display = "block";
        document.getElementById("withdrawNFTBtn").onclick = () => {
          withdrawDepositedNFT(selectedNFT.contract, tokenIdBN);
        };
      } else {
        document.getElementById("depositStatus").style.display = "none";
      }
    } catch (error) {
      console.warn("Error checking deposit status:", error);
      document.getElementById("depositStatus").style.display = "none";
    }
  }
  
  showSuccess("NFT selected for auction");
}

// Show error message
function showError(message) {
  const errorAlert = document.getElementById("errorAlert");
  errorAlert.textContent = message;
  errorAlert.style.display = "block";
  
  setTimeout(() => {
    errorAlert.style.display = "none";
  }, 5000);
}

// Show success message
function showSuccess(message) {
  const successAlert = document.getElementById("successAlert");
  successAlert.textContent = message;
  successAlert.style.display = "block";
  
  setTimeout(() => {
    successAlert.style.display = "none";
  }, 5000);
}

// Helper functions for displaying auction data
function formatEther(wei) {
  return ethers.utils.formatUnits(wei, 18);
}

function formatAddress(address) {
  if (!address) return "";
  return `${address.slice(0,6)}...${address.slice(-4)}`;
}

// Function to format time ago
function formatTimeAgo(seconds) {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  return `${Math.floor(seconds / 86400)} days`;
}

// Function to format time remaining
function formatTimeRemaining(endTime) {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const secondsRemaining = endTime - now;
  
  console.log(`Time calculation: endTime=${endTime}, now=${now}, remaining=${secondsRemaining}`);
  
  if (secondsRemaining <= 0) return "Ended";
  
  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// Load active auctions for explore tab
async function loadActiveAuctions() {
  const loadingElement = document.getElementById("loading-auctions");
  const noAuctionsMessage = document.getElementById("no-auctions-message");
  const auctionsList = document.getElementById("auctionsList");
  
  loadingElement.style.display = "block";
  noAuctionsMessage.style.display = "none";
  auctionsList.innerHTML = "";
  
  try {
    console.log("Fetching active auctions count...");
    // 1. First, get the total count of active auctions
    const count = await readOnlyAuctionContract.getActiveAuctionsCount();
    console.log(`Active auctions count: ${count.toString()}`);
    
    // 2. Calculate how many pages we need (contract limits to 50 per page)
    const pageSize = 50; // Contract has MAX_AUCTIONS_PER_PAGE = 50
    const pages = Math.ceil(count.toNumber() / pageSize);
    console.log(`Need to fetch ${pages} pages of auction IDs`);
    
    // 3. Fetch all auction IDs from all pages
    let allIds = [];
    for (let i = 0; i < pages; i++) {
      console.log(`Fetching auction IDs page ${i}...`);
      const ids = await readOnlyAuctionContract.getActiveAuctions(i, pageSize);
      console.log(`Page ${i} IDs:`, ids.map(id => id.toString()));
      allIds = allIds.concat(ids.map(id => id.toNumber()));
    }
    
    console.log(`Total auction IDs fetched: ${allIds.length}`);
    
    if (allIds.length === 0) {
      loadingElement.style.display = "none";
      noAuctionsMessage.style.display = "block";
      return;
    }
    
    // 4. Now get the detailed information for all auction IDs at once
    console.log("Fetching auction details...");
    const details = await readOnlyAuctionContract.getManyAuctionDetails(allIds);
    console.log("Received auction details:", details);
    
    const filter = document.getElementById("filterSelect").value;
    const now = Math.floor(Date.now() / 1000);
    
    // Filter auctions based on selection
    const filtered = details.filter((auction, index) => {
      // Ensure values are BigNumber objects
      const highestBid = ethers.BigNumber.from(String(auction.highestBid || '0'));
      const reservePrice = ethers.BigNumber.from(String(auction.reservePrice || '0'));
      const endTime = auction.endTime ? Number(auction.endTime.toString()) : 0;
      
      // Handle boolean values
      const isActive = auction.active === true || auction.active === 1;
      
      const timeLeft = endTime - now;
      if (filter === "active") return isActive;
      if (filter === "reserveMet") return highestBid.gte(reservePrice);
      if (filter === "endingSoon") return isActive && timeLeft < 900;
      return true;
    });
    
    console.log(`Filtered to ${filtered.length} auctions based on filter: ${filter}`);
    
    // Sort auctions - ending soon first
    filtered.sort((a, b) => {
      // Convert to Number for safe comparison
      const aTime = a.endTime ? Number(a.endTime.toString()) : 0;
      const bTime = b.endTime ? Number(b.endTime.toString()) : 0;
      return aTime - bTime;
    });
    
    if (filtered.length === 0) {
      loadingElement.style.display = "none";
      noAuctionsMessage.style.display = "block";
      return;
    }
    
    console.log(`Displaying ${filtered.length} auctions`);
    
    // 5. Process and display each auction
    for (let i = 0; i < filtered.length; i++) {
      const auction = filtered[i];
      const auctionId = allIds[details.indexOf(auction)]; // Get the correct auction ID
      
      // Debug log to see the exact data structure
      console.log(`Auction #${auctionId} raw data:`, {
        nftContract: auction.nftContract,
        tokenId: auction.tokenId?.toString(),
        seller: auction.seller, 
        reservePrice: auction.reservePrice?.toString(),
        endTime: auction.endTime?.toString(),
        highestBidder: auction.highestBidder,
        highestBid: auction.highestBid?.toString(),
        active: auction.active, // This might be 0/1 or true/false
        finalized: auction.finalized // This might be 0/1 or true/false
      });
      
      await renderAuction(auction, auctionId, auctionsList);
    }
    
    loadingElement.style.display = "none";
    
  } catch (error) {
    console.error("Error loading auctions:", error);
    showError("Failed to load auctions. Please try again later.");
    loadingElement.style.display = "none";
    noAuctionsMessage.style.display = "block";
  }
}

// Load user created auctions
async function loadUserAuctions(userAddress) {
  const loadingElement = document.getElementById("loading-my-auctions");
  const noAuctionsMessage = document.getElementById("no-my-auctions");
  const auctionsList = document.getElementById("myAuctionsList");
  
  loadingElement.style.display = "block";
  noAuctionsMessage.style.display = "none";
  auctionsList.innerHTML = "";
  
  try {
    console.log(`Fetching auctions for user ${userAddress}...`);
    const auctionIds = await readOnlyAuctionContract.getUserAuctions(userAddress);
    console.log(`User auctions IDs:`, auctionIds.map(id => id.toString()));
    
    if (auctionIds.length === 0) {
      loadingElement.style.display = "none";
      noAuctionsMessage.style.display = "block";
      return;
    }
    
    console.log(`Fetching details for ${auctionIds.length} user auctions...`);
    const details = await readOnlyAuctionContract.getManyAuctionDetails(auctionIds);
    console.log(`User auction details received:`, details);
    
    for (let i = 0; i < details.length; i++) {
      const auction = details[i];
      const auctionId = auctionIds[i].toNumber();
      
      // Debug log to see the exact data structure
      console.log(`User Auction #${auctionId} raw data:`, {
        nftContract: auction.nftContract,
        tokenId: auction.tokenId?.toString(),
        seller: auction.seller, 
        reservePrice: auction.reservePrice?.toString(),
        endTime: auction.endTime?.toString(),
        highestBidder: auction.highestBidder,
        highestBid: auction.highestBid?.toString(),
        active: auction.active, // This might be 0/1 or true/false
        finalized: auction.finalized // This might be 0/1 or true/false
      });
      
      await renderAuction(auction, auctionId, auctionsList, true);
    }
    
    loadingElement.style.display = "none";
    
  } catch (error) {
    console.error("Error loading user auctions:", error);
    showError("Failed to load your auctions. Please try again later.");
    loadingElement.style.display = "none";
    noAuctionsMessage.style.display = "block";
  }
}

// Load user bids
async function loadUserBids(userAddress) {
  const loadingElement = document.getElementById("loading-my-bids");
  const noBidsMessage = document.getElementById("no-my-bids");
  const bidsList = document.getElementById("myBidsList");
  
  loadingElement.style.display = "block";
  noBidsMessage.style.display = "none";
  bidsList.innerHTML = "";
  
  try {
    console.log(`Fetching bids for user ${userAddress}...`);
    const auctionIds = await readOnlyAuctionContract.getUserBids(userAddress);
    console.log(`User bid auction IDs:`, auctionIds.map(id => id.toString()));
    
    if (auctionIds.length === 0) {
      loadingElement.style.display = "none";
      noBidsMessage.style.display = "block";
      return;
    }
    
    console.log(`Fetching details for ${auctionIds.length} auctions with user bids...`);
    const details = await readOnlyAuctionContract.getManyAuctionDetails(auctionIds);
    console.log(`Bid auction details received:`, details);
    
    for (let i = 0; i < details.length; i++) {
      const auction = details[i];
      const auctionId = auctionIds[i].toNumber();
      
      // Debug log to see the exact data structure
      console.log(`Bid Auction #${auctionId} raw data:`, {
        nftContract: auction.nftContract,
        tokenId: auction.tokenId?.toString(),
        seller: auction.seller, 
        reservePrice: auction.reservePrice?.toString(),
        endTime: auction.endTime?.toString(),
        highestBidder: auction.highestBidder,
        highestBid: auction.highestBid?.toString(),
        active: auction.active, // This might be 0/1 or true/false
        finalized: auction.finalized // This might be 0/1 or true/false
      });
      
      // Check if user is highest bidder and highlight
      const isHighestBidder = auction.highestBidder.toLowerCase() === userAddress.toLowerCase();
      console.log(`User is highest bidder for auction #${auctionId}: ${isHighestBidder}`);
      
      await renderAuction(auction, auctionId, bidsList, false, isHighestBidder);
    }
    
    loadingElement.style.display = "none";
    
  } catch (error) {
    console.error("Error loading user bids:", error);
    showError("Failed to load your bids. Please try again later.");
    loadingElement.style.display = "none";
    noBidsMessage.style.display = "block";
  }
}

// Render a single auction card
async function renderAuction(auction, auctionId, container, isOwner = false, isHighestBidder = false) {
  console.log(`Raw auction data for #${auctionId}:`, auction);
  
  // CRITICAL FIX - Extract and convert auction data safely
  const nftContract = auction.nftContract || ethers.constants.AddressZero;
  const tokenId = auction.tokenId ? ethers.BigNumber.from(auction.tokenId).toString() : '0';
  const seller = auction.seller || ethers.constants.AddressZero;
  const reservePrice = auction.reservePrice ? ethers.BigNumber.from(auction.reservePrice) : ethers.BigNumber.from(0);
  const highestBid = auction.highestBid ? ethers.BigNumber.from(auction.highestBid) : ethers.BigNumber.from(0);
  
  // CRITICAL FIX - Handle endTime correctly
  let endTime;
  try {
    endTime = auction.endTime ? parseInt(auction.endTime.toString()) : 0;
    console.log(`Converted endTime: ${endTime}`);
  } catch (err) {
    console.error("Error converting endTime:", err);
    endTime = 0;
  }
  
  // CRITICAL FIX - Handle boolean values
  const isActive = auction.active === true || auction.active === 1;
  const isFinalized = auction.finalized === true || auction.finalized === 1;
  
  const now = Math.floor(Date.now() / 1000);
  const timeRemaining = endTime - now;
  
  console.log(`Processed auction data:`, {
    nftContract,
    tokenId,
    seller,
    reservePrice: reservePrice.toString(),
    highestBid: highestBid.toString(),
    endTime,
    timeRemaining,
    isActive,
    isFinalized
  });
  
  // Calculate auction status properties
  const endingSoon = isActive && timeRemaining < 900 && timeRemaining > 0;
  const reserveMet = highestBid.gte(reservePrice);
  const isEnded = !isActive || timeRemaining <= 0;
  const hasWinner = auction.highestBidder !== ethers.constants.AddressZero && 
                    highestBid.gt(0) && 
                    highestBid.gte(reservePrice);
  
  // NEW: Check if user has bid on this auction but is not the highest bidder
  // We do it by checking if the auction is in the user's bids
  let hasUserBid = false;
  let isOutbid = false;
  
  if (currentAccount) {
    try {
      // See if user has bid on this auction by checking the contract
      const userBids = await readOnlyAuctionContract.getUserBids(currentAccount);
      
      // Check if this auction ID is in the user's bids
      hasUserBid = userBids.some(bid => bid.toString() === auctionId.toString());
      
      // User has bid but is not highest bidder = outbid
      isOutbid = hasUserBid && !isHighestBidder && auction.highestBidder !== ethers.constants.AddressZero;
      
      console.log(`User bid status for auction #${auctionId}:`, {
        hasUserBid,
        isHighestBidder,
        isOutbid
      });
    } catch (error) {
      console.warn(`Could not check user bids for auction #${auctionId}:`, error);
    }
  }
  
  // Create auction card
  const auctionCard = document.createElement('div');
  auctionCard.className = 'auction-card';
  
  // Determinar la clase de borde para la tarjeta
  let cardClass = '';
  if (isHighestBidder) cardClass += ' border-success'; // Verde si eres el mayor postor
  else if (isOwner) cardClass += ' border-primary'; // Azul si eres el dueño
  else if (isOutbid) cardClass += ' border-danger'; // Rojo si te han superado
  else if (endingSoon) cardClass += ' border-warning'; // Amarillo si está por terminar
  else if (reserveMet) cardClass += ' border-info'; // Info si se cumplió el precio de reserva
  else if (isEnded) cardClass += ' border-secondary'; // Gris si ya terminó
  
  auctionCard.className = `auction-card ${cardClass}`;
  
  // NEW: Make entire card clickable to go to details
  auctionCard.style.cursor = 'pointer';
  auctionCard.onclick = () => showAuctionDetails(auctionId);
  
  // Try to fetch NFT image from Alchemy if possible
  let imageUrl = 'https://placehold.co/400x400?text=NFT+Image';
  let nftName = `NFT #${tokenId}`;
  
  // Improved image loading
  if (alchemyWeb3 && nftContract && nftContract !== ethers.constants.AddressZero) {
    try {
      console.log(`Obteniendo metadata para NFT en contrato ${nftContract}, token ID ${tokenId}`);
      
      // Create a temporary NFT contract to get the tokenURI
      const nftContractInstance = new ethers.Contract(nftContract, ERC721_ABI, readOnlyProvider);
      
      try {
        const tokenURI = await nftContractInstance.tokenURI(tokenId);
      console.log(`Token URI obtenido:`, tokenURI);
      
      if (tokenURI) {
        // Try to fetch metadata
          let metadata = null;
          
        if (tokenURI.startsWith('ipfs://')) {
            // Extracting the CID (Content Identifier) correctly
          const ipfsHash = tokenURI.replace('ipfs://', '');
            // Fix: Check if the hash already contains 'ipfs/' prefix to avoid duplication
            let ipfsUrl;
            if (ipfsHash.startsWith('ipfs/')) {
              ipfsUrl = `https://ipfs.io/${ipfsHash}`;
              console.log(`Token URI IPFS corregido para evitar duplicación:`, ipfsUrl);
            } else {
              ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
              console.log(`Token URI IPFS estándar:`, ipfsUrl);
            }
          
          try {
            console.log(`Obteniendo metadata desde IPFS:`, ipfsUrl);
            const response = await fetch(ipfsUrl);
              metadata = await response.json();
          } catch (error) {
            console.warn("Error al obtener metadata desde IPFS:", error);
          }
        } else if (tokenURI.startsWith('http')) {
          try {
            console.log(`Obteniendo metadata desde HTTP:`, tokenURI);
            const response = await fetch(tokenURI);
              metadata = await response.json();
            } catch (error) {
              console.warn("Error al obtener metadata HTTP:", error);
            }
          }
          
          if (metadata) {
            console.log("Metadata obtenido:", metadata);
            
            if (metadata.name) {
              nftName = metadata.name;
            }
            
            if (metadata.image) {
              if (metadata.image.startsWith('ipfs://')) {
                // Extracting the CID (Content Identifier) correctly
                const imageHash = metadata.image.replace('ipfs://', '');
                // Fix: Check if the hash already contains 'ipfs/' prefix to avoid duplication
                if (imageHash.startsWith('ipfs/')) {
                  imageUrl = `https://ipfs.io/${imageHash}`;
                  console.log(`URL IPFS corregida para evitar duplicación:`, imageUrl);
                } else {
                  imageUrl = `https://ipfs.io/ipfs/${imageHash}`;
                  console.log(`URL IPFS estándar:`, imageUrl);
                }
              } else {
              imageUrl = metadata.image;
              }
              console.log(`Imagen URL:`, imageUrl);
            }
          }
        }
      } catch (err) {
        console.warn(`Error fetching tokenURI:`, err);
      }
    } catch (error) {
      console.warn(`Error al cargar la imagen del NFT para la subasta #${auctionId}:`, error);
    }
  }
  
  // Create status badges
  let statusBadges = '';
  
  if (isActive) {
    if (endingSoon) {
      statusBadges += '<span class="auction-status status-ending">🔥 Ending Soon</span>';
    } else {
      statusBadges += '<span class="auction-status status-live">🔄 Active</span>';
    }
    
    if (reserveMet) {
      statusBadges += '<span class="auction-status status-reserve-met">✅ Reserve Met</span>';
    }
    
    if (isHighestBidder) {
      statusBadges += '<span class="auction-status status-live">🏆 You are Winning</span>';
    }
    
    // NEW: Add Outbid badge
    if (isOutbid) {
      statusBadges += '<span class="auction-status status-outbid" style="background-color: #ffcccb; color: #dc3545;">⚠️ You\'ve Been Outbid</span>';
    }
  } else {
    if (isFinalized) {
      if (hasWinner) {
        statusBadges += '<span class="auction-status">✅ Ended with Winner</span>';
      } else {
        statusBadges += '<span class="auction-status">❌ Ended without Winner</span>';
      }
    } else {
      statusBadges += '<span class="auction-status">⏸️ Inactive</span>';
    }
  }
  
  if (isOwner) {
    statusBadges += '<span class="auction-status">👑 Your Auction</span>';
  }
  
  // Create action buttons
  let actionButtons = '';
  
  if (isActive && !isFinalized) {
    if (isOwner && endTime <= now) {
      actionButtons = `<button class="btn-action w-100 mb-2" onclick="finalizeAuction(${auctionId}); event.stopPropagation();">Finalize Auction</button>`;
    } else if (isOwner && highestBid.isZero()) {
      actionButtons = `<button class="btn-action w-100 mb-2" onclick="cancelAuction(${auctionId}); event.stopPropagation();">Cancel Auction</button>`;
    } else if (!isOwner) {
      // NEW: Custom button text for outbid users
      const buttonText = isOutbid ? "Outbid! Bid Again" : "Place Bid";
      const buttonClass = isOutbid ? "btn-action w-100 mb-2 btn-danger" : "btn-action w-100 mb-2";
      
      actionButtons = `<button class="${buttonClass}" onclick="openBidModal(${auctionId}, '${highestBid}', '${reservePrice}', '${nftContract}', ${tokenId}); event.stopPropagation();">${buttonText}</button>`;
    }
  } else if (isOwner && !isActive && isFinalized && 
            (auction.highestBidder === ethers.constants.AddressZero || highestBid.lt(reservePrice))) {
    // Mostrar botón de relist solo cuando:
    // 1. El usuario es el dueño de la subasta
    // 2. La subasta no está activa
    // 3. La subasta está finalizada
    // 4. La subasta no tuvo postor o no se alcanzó el precio de reserva
    actionButtons = `<button class="btn-action w-100 mb-2" onclick="showRelistModal(${auctionId}); event.stopPropagation();">Relist</button>`;
  }
  
  // Add share button to all auctions
  actionButtons += `<button class="btn-action w-100 mb-2" onclick="shareAuction(${auctionId}, '${encodeURIComponent(nftName)}'); event.stopPropagation();">Share Auction</button>`;
  
  // NEW: Add "View Details" button
  actionButtons += `<button class="btn-secondary w-100" onclick="showAuctionDetails(${auctionId}); event.stopPropagation();">View Details</button>`;
  
  // CRITICAL FIX - Time display logic
  let timeDisplay = '';
  if (isActive && endTime > now) {
    timeDisplay = `<p><strong>Time Remaining:</strong> ${formatTimeRemaining(endTime)}</p>`;
  } else {
    // Only show "ended X ago" if endTime is valid
    if (endTime > 1000000) { // Sanity check - any timestamp before 1970 + ~11 days is suspicious
      const endedAgo = now - endTime;
      timeDisplay = `<p><strong>Ended:</strong> ${formatTimeAgo(endedAgo)} ago</p>`;
    } else {
      timeDisplay = `<p><strong>Time:</strong> Not available</p>`;
    }
  }
  
  // Populate auction card
  auctionCard.innerHTML = `
    <div class="nft-image-container">
      <img src="${imageUrl}" class="nft-image" alt="${nftName}" onerror="this.src='https://placehold.co/400x400?text=NFT+Image'">
    </div>
    <div class="auction-info">
      <h3 class="auction-title">${nftName}</h3>
      <div class="mb-2">${statusBadges}</div>
      <p><strong>Auction ID:</strong> #${auctionId}</p>
      <p><strong>Contract:</strong> ${formatAddress(nftContract)}</p>
      <p><strong>Seller:</strong> ${formatAddress(seller)}</p>
      <p><strong>Reserve Price:</strong> ${formatAdrian(reservePrice)}</p>
      <p><strong>Highest Bid:</strong> ${formatAdrian(highestBid)}</p>
      ${timeDisplay}
      <div class="mt-3">
        ${actionButtons}
      </div>
    </div>
  `;
  
  container.appendChild(auctionCard);
}

// Open bid modal
function openBidModal(auctionId, currentBid, reservePrice, nftContract, tokenId) {
  document.getElementById("bidAuctionId").value = auctionId;
  
  console.log("Bid modal params:", { auctionId, currentBid, reservePrice, nftContract, tokenId });
  
  // Calculate minimum bid
  const currentBidValue = ethers.BigNumber.from(String(currentBid || '0'));
  const reservePriceValue = ethers.BigNumber.from(String(reservePrice || '0'));
  
  let minBidAmount;
  if (currentBidValue.gt(0)) {
    // If there's already a bid, minimum is current bid + 0.000001
    minBidAmount = parseFloat(ethers.utils.formatUnits(currentBidValue, 18)) + 0.000001;
  } else {
    // If no bids yet, minimum is reserve price
    minBidAmount = parseFloat(ethers.utils.formatUnits(reservePriceValue, 18));
  }
  
  document.getElementById("minBid").textContent = minBidAmount.toFixed(6);
  document.getElementById("reservePriceDisplay").textContent = ethers.utils.formatUnits(reservePriceValue, 18);
  document.getElementById("bidAmount").min = minBidAmount;
  document.getElementById("bidAmount").value = minBidAmount;
  
  // Ensure tokenId is properly formatted
  const formattedTokenId = tokenId ? (typeof tokenId === 'string' ? tokenId : String(tokenId)) : '0';
  
  // Try to load NFT image for the modal
  loadNFTForBidModal(nftContract, formattedTokenId);
  
  // Open modal
  const modal = new bootstrap.Modal(document.getElementById('bidModal'));
  modal.show();
}

// Load NFT image for bid modal
async function loadNFTForBidModal(nftContract, tokenId) {
  const bidNftDisplay = document.getElementById("bid-nft-display");
  bidNftDisplay.innerHTML = `<div class="text-center"><div class="loading-spinner"></div><p>Loading NFT details...</p></div>`;
  
  console.log("Loading NFT for bid modal:", { nftContract, tokenId });
  
  let imageUrl = 'https://placehold.co/400x400?text=NFT+Image';
  let nftName = `NFT #${tokenId}`;
  
  try {
    if (alchemyWeb3 && nftContract) {
      // Try to get metadata using Alchemy
      const nftContractInstance = new ethers.Contract(nftContract, ERC721_ABI, readOnlyProvider);
      
      try {
        const tokenURI = await nftContractInstance.tokenURI(tokenId);
        console.log("Token URI for bid modal:", tokenURI);
      
      if (tokenURI) {
          let metadata = null;
        
        // Handle IPFS URIs
        if (tokenURI.startsWith('ipfs://')) {
            // Extracting the CID (Content Identifier) correctly
          const ipfsHash = tokenURI.replace('ipfs://', '');
            // Fix: Check if the hash already contains 'ipfs/' prefix to avoid duplication
            let ipfsUrl;
            if (ipfsHash.startsWith('ipfs/')) {
              ipfsUrl = `https://ipfs.io/${ipfsHash}`;
              console.log(`Token URI IPFS corregido para bid modal:`, ipfsUrl);
            } else {
              ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
              console.log(`Token URI IPFS estándar para bid modal:`, ipfsUrl);
            }
            
            try {
          const response = await fetch(ipfsUrl);
          metadata = await response.json();
              console.log("IPFS metadata for bid modal:", metadata);
            } catch (error) {
              console.warn("Error fetching IPFS metadata for bid modal:", error);
            }
        } else if (tokenURI.startsWith('http')) {
            try {
          const response = await fetch(tokenURI);
          metadata = await response.json();
              console.log("HTTP metadata for bid modal:", metadata);
            } catch (error) {
              console.warn("Error fetching HTTP metadata for bid modal:", error);
            }
        }
        
        if (metadata) {
            if (metadata.name) {
              nftName = metadata.name;
            }
            
          if (metadata.image) {
            if (metadata.image.startsWith('ipfs://')) {
                // Extracting the CID (Content Identifier) correctly
              const imageHash = metadata.image.replace('ipfs://', '');
                // Fix: Check if the hash already contains 'ipfs/' prefix to avoid duplication
                if (imageHash.startsWith('ipfs/')) {
                  imageUrl = `https://ipfs.io/${imageHash}`;
                  console.log(`URL IPFS corregida para evitar duplicación:`, imageUrl);
                } else {
              imageUrl = `https://ipfs.io/ipfs/${imageHash}`;
                  console.log(`URL IPFS estándar:`, imageUrl);
                }
            } else {
              imageUrl = metadata.image;
            }
              console.log("Image URL for bid modal:", imageUrl);
          }
          }
        }
      } catch (err) {
        console.warn("Error getting tokenURI for bid modal:", err);
      }
    }
  } catch (error) {
    console.warn("Error loading NFT details for bid modal:", error);
  }
  
  // Update modal with NFT details
  bidNftDisplay.innerHTML = `
    <div class="d-flex align-items-center">
      <img src="${imageUrl}" alt="${nftName}" class="me-3" style="width: 100px; height: 100px; object-fit: contain;" onerror="this.src='https://placehold.co/400x400?text=NFT+Image'">
      <div>
        <h4>${nftName}</h4>
        <p>Token ID: ${tokenId}</p>
        <p>Contract: ${formatAddress(nftContract)}</p>
      </div>
    </div>
  `;
}

// Place bid function
async function placeBid(auctionId, bidAmount) {
  if (!window.ethereum || !currentAccount) {
    showError("Please connect your wallet first");
    return;
  }
  
  // Validate bid amount
  if (parseFloat(bidAmount) <= 0) {
    showError("Bid amount must be greater than 0");
    return;
  }
  
  console.log("=== STARTING BID PROCESS ===");
  console.log("Parameters:", { auctionId, bidAmount });
  
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    // Verify and approve ADRIAN tokens
    console.log("Initializing ADRIAN token contract:", ADRIAN_TOKEN_ADDRESS);
    const tokenContract = new ethers.Contract(ADRIAN_TOKEN_ADDRESS, ERC20_ABI, signer);
    const bidInWei = ethers.utils.parseEther(bidAmount.toString());
    console.log("Bid amount in wei:", bidInWei.toString());
    
    // Check allowance
    console.log("Checking current allowance for auction contract");
    const allowance = await tokenContract.allowance(currentAccount, CONTRACT_ADDRESS);
    console.log("Current allowance:", allowance.toString());
    
    if (allowance.lt(bidInWei)) {
      console.log("Insufficient allowance, requesting approval...");
      showSuccess("Approving ADRIAN tokens for bidding...");
      
      // Only approve the exact amount needed for the bid
      const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, bidInWei);
      console.log("Approval transaction sent for exact bid amount:", approveTx.hash);
      
      showSuccess("Confirming token approval...");
      const approveReceipt = await approveTx.wait();
      console.log("Approval receipt:", approveReceipt);
      
      if (approveReceipt.status === 0) {
        throw new Error("Approval transaction failed");
      }
      
      // Verify approval after transaction
      const newAllowance = await tokenContract.allowance(currentAccount, CONTRACT_ADDRESS);
      console.log("New allowance after approval:", newAllowance.toString());
      
      if (newAllowance.lt(bidInWei)) {
        throw new Error("Approval completed but allowance is still insufficient");
      }
      
      showSuccess("ADRIAN tokens approved successfully for this bid");
    } else {
      console.log("Sufficient allowance for bid");
    }
    
    // Place the bid
    console.log("Initializing auction contract for bidding");
    const contract = new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, signer);
    
    showSuccess("Sending bid...");
    console.log("Sending placeBid transaction with parameters:", {
      auctionId,
      bidInWei: bidInWei.toString()
    });
    
    const tx = await contract.placeBid(auctionId, bidInWei);
    console.log("Bid transaction sent:", tx.hash);
    
    // Wait for confirmation
    showSuccess("Confirming your bid...");
    const receipt = await tx.wait();
    console.log("Bid transaction receipt:", receipt);
    
    if (receipt.status === 0) {
      throw new Error("Bid transaction failed");
    }
    
    // Look for BidPlaced event in logs
    const bidPlacedEvent = receipt.events?.find(e => e.event === 'BidPlaced');
    console.log("BidPlaced event:", bidPlacedEvent);
    
    if (bidPlacedEvent && bidPlacedEvent.args) {
      console.log("Event arguments:", bidPlacedEvent.args);
      showSuccess(`Bid of ${formatAdrian(bidPlacedEvent.args.amount)} placed successfully!`);
    } else {
      showSuccess("Bid placed successfully!");
    }
    
    console.log("=== BID PROCESS COMPLETED SUCCESSFULLY ===");
    
    // Reload views
    loadActiveAuctions();
    
    // Reload bids tab if active
    if (document.getElementById("mybids-tab").classList.contains("active")) {
      loadUserBids(currentAccount);
    }
    
  } catch (error) {
    console.error("=== ERROR PLACING BID ===");
    console.error("Detailed error:", error);
    
    // Detailed error information for debugging
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.transaction) {
      console.error("Transaction details:", error.transaction);
    }
    if (error.receipt) {
      console.error("Transaction receipt:", error.receipt);
    }
    
    // Provide more specific error message
    let errorMessage = "Error placing bid.";
    
    if (error.code === 4001) {
      errorMessage = "Transaction rejected by user.";
    } else if (error.message.includes("insufficient funds")) {
      errorMessage = "Insufficient funds to complete the transaction.";
    } else if (error.message.includes("execution reverted")) {
      // Extract specific error message
      const revertReason = error.data?.message || error.message;
      
      // Interpret common contract errors
      if (revertReason.includes("auction ended")) {
        errorMessage = "The auction has already ended.";
      } else if (revertReason.includes("not active")) {
        errorMessage = "The auction is not active.";
      } else if (revertReason.includes("bid too low")) {
        errorMessage = "Bid is too low. It must be higher than the current bid.";
      } else if (revertReason.includes("finalized")) {
        errorMessage = "The auction has already been finalized.";
      } else if (revertReason.includes("insufficient allowance")) {
        errorMessage = "Insufficient ADRIAN token allowance.";
      } else if (revertReason.includes("insufficient balance")) {
        errorMessage = "You don't have enough ADRIAN tokens.";
      } else {
        errorMessage = `Transaction failed: ${revertReason}`;
      }
    } else if (error.message.includes("transaction failed")) {
      errorMessage = "Transaction failed. Check console for more details.";
    } else if (error.message.includes("user rejected")) {
      errorMessage = "Transaction rejected by user.";
    } else if (error.message.includes("gas")) {
      errorMessage = "Gas error. The limit may be too low.";
    }
    
    console.error("Error message shown to user:", errorMessage);
    showError(errorMessage);
  }
}

// Se llamará cuando el usuario quiera finalizar una subasta
async function finalizeAuction(auctionId) {
  if (!window.ethereum || !currentAccount) {
    showError("Please connect your wallet first");
    return;
  }
  
  console.log("=== INICIO DE FINALIZACIÓN DE SUBASTA ===");
  console.log("Finalizando subasta ID:", auctionId);
  
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, signer);
    
    // Realizar la transacción
    showSuccess("Enviando transacción para finalizar la subasta...");
    console.log("Enviando transacción endAuction");
    
    const tx = await contract.endAuction(auctionId);
    console.log("Transacción enviada:", tx.hash);
    
    showSuccess("Confirmando finalización de la subasta...");
    const receipt = await tx.wait();
    console.log("Recibo de la transacción:", receipt);
    
    if (receipt.status === 0) {
      throw new Error("La transacción de finalización falló");
    }
    
    // Buscar evento AuctionEnded en los logs
    const auctionEndedEvent = receipt.events?.find(e => e.event === 'AuctionEnded');
    console.log("Evento AuctionEnded:", auctionEndedEvent);
    
    if (auctionEndedEvent && auctionEndedEvent.args) {
      console.log("Argumentos del evento:", auctionEndedEvent.args);
      const winner = auctionEndedEvent.args.winner;
      const amount = auctionEndedEvent.args.amount;
      
      if (winner !== ethers.constants.AddressZero) {
        showSuccess(`¡Subasta finalizada con éxito! Ganador: ${formatAddress(winner)} con ${formatAdrian(amount)}`);
      } else {
        showSuccess("¡Subasta finalizada sin ganador! Puedes volver a listar el NFT si lo deseas.");
      }
    } else {
      showSuccess("¡Subasta finalizada con éxito!");
    }
    
    console.log("=== FIN DE FINALIZACIÓN DE SUBASTA EXITOSA ===");
    
    // Recargar las vistas
    loadActiveAuctions();
    if (document.getElementById("myauctions-tab").classList.contains("active")) {
      loadUserAuctions(currentAccount);
    }
    
  } catch (error) {
    console.error("=== ERROR AL FINALIZAR LA SUBASTA ===");
    console.error("Error detallado:", error);
    
    // Información detallada del error para depuración
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.transaction) {
      console.error("Detalles de la transacción:", error.transaction);
    }
    if (error.receipt) {
      console.error("Recibo de la transacción:", error.receipt);
    }
    
    // Proporcionar mensaje de error más específico
    let errorMessage = "Error al finalizar la subasta.";
    
    if (error.code === 4001) {
      errorMessage = "Transacción rechazada por el usuario.";
    } else if (error.message.includes("insufficient funds")) {
      errorMessage = "Fondos insuficientes para completar la transacción.";
    } else if (error.message.includes("execution reverted")) {
      // Extraer el mensaje de error específico
      const revertReason = error.data?.message || error.message;
      
      // Interpretar errores comunes del contrato
      if (revertReason.includes("not seller")) {
        errorMessage = "Solo el vendedor puede finalizar esta subasta.";
      } else if (revertReason.includes("not ended")) {
        errorMessage = "La subasta aún no ha terminado.";
      } else if (revertReason.includes("already finalized")) {
        errorMessage = "La subasta ya ha sido finalizada.";
      } else if (revertReason.includes("not active")) {
        errorMessage = "La subasta no está activa.";
      } else {
        errorMessage = `La transacción falló: ${revertReason}`;
      }
    } else if (error.message.includes("transaction failed")) {
      errorMessage = "La transacción falló. Revisa la consola para más detalles.";
    } else if (error.message.includes("user rejected")) {
      errorMessage = "Transacción rechazada por el usuario.";
    }
    
    console.error("Mensaje de error mostrado al usuario:", errorMessage);
    showError(errorMessage);
  }
}

// Se llamará cuando el usuario quiera cancelar una subasta
async function cancelAuction(auctionId) {
  if (!window.ethereum || !currentAccount) {
    showError("Please connect your wallet first");
    return;
  }
  
  if (!confirm("¿Estás seguro de que deseas cancelar esta subasta? Esta acción no se puede deshacer.")) {
    return;
  }
  
  console.log("=== INICIO DE CANCELACIÓN DE SUBASTA ===");
  console.log("Cancelando subasta ID:", auctionId);
  
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, signer);
    
    // Realizar la transacción
    showSuccess("Enviando transacción para cancelar la subasta...");
    console.log("Enviando transacción cancelAuction");
    
    const tx = await contract.cancelAuction(auctionId);
    console.log("Transacción enviada:", tx.hash);
    
    showSuccess("Confirmando cancelación de la subasta...");
    const receipt = await tx.wait();
    console.log("Recibo de la transacción:", receipt);
    
    if (receipt.status === 0) {
      throw new Error("La transacción de cancelación falló");
    }
    
    // Buscar evento AuctionCancelled en los logs
    const auctionCancelledEvent = receipt.events?.find(e => e.event === 'AuctionCancelled');
    console.log("Evento AuctionCancelled:", auctionCancelledEvent);
    
    showSuccess("Subasta cancelada correctamente. El NFT ha sido devuelto a tu wallet.");
    console.log("=== FIN DE CANCELACIÓN DE SUBASTA EXITOSA ===");
    
    // Recargar las vistas
    loadActiveAuctions();
    if (document.getElementById("myauctions-tab").classList.contains("active")) {
      loadUserAuctions(currentAccount);
    }
    
  } catch (error) {
    console.error("=== ERROR AL CANCELAR LA SUBASTA ===");
    console.error("Error detallado:", error);
    
    // Información detallada del error para depuración
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.transaction) {
      console.error("Detalles de la transacción:", error.transaction);
    }
    if (error.receipt) {
      console.error("Recibo de la transacción:", error.receipt);
    }
    
    // Proporcionar mensaje de error más específico
    let errorMessage = "Error al cancelar la subasta.";
    
    if (error.code === 4001) {
      errorMessage = "Transacción rechazada por el usuario.";
    } else if (error.message.includes("insufficient funds")) {
      errorMessage = "Fondos insuficientes para completar la transacción.";
    } else if (error.message.includes("execution reverted")) {
      // Extraer el mensaje de error específico
      const revertReason = error.data?.message || error.message;
      
      // Interpretar errores comunes del contrato
      if (revertReason.includes("not seller")) {
        errorMessage = "Solo el vendedor puede cancelar esta subasta.";
      } else if (revertReason.includes("has bids")) {
        errorMessage = "No puedes cancelar una subasta que ya tiene ofertas.";
      } else if (revertReason.includes("already finalized")) {
        errorMessage = "La subasta ya ha sido finalizada.";
      } else if (revertReason.includes("not active")) {
        errorMessage = "La subasta no está activa.";
      } else {
        errorMessage = `La transacción falló: ${revertReason}`;
      }
    } else if (error.message.includes("transaction failed")) {
      errorMessage = "La transacción falló. Revisa la consola para más detalles.";
    } else if (error.message.includes("user rejected")) {
      errorMessage = "Transacción rechazada por el usuario.";
    }
    
    console.error("Mensaje de error mostrado al usuario:", errorMessage);
    showError(errorMessage);
  }
}

// Function to deposit an NFT to the contract
async function depositNFT(nftContract, tokenId) {
  if (!window.ethereum || !currentAccount) {
    showError("Please connect your wallet first");
    return false;
  }
  
  console.log("=== STARTING NFT DEPOSIT ===");
  console.log("Parameters:", { nftContract, tokenId });
  
  try {
    // Convert tokenId to BigNumber
    const tokenIdBN = ethers.BigNumber.from(String(tokenId));
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    // Verify ownership
    const nftContractInstance = new ethers.Contract(nftContract, ERC721_ABI, signer);
    const owner = await nftContractInstance.ownerOf(tokenIdBN);
    
    if (owner.toLowerCase() !== currentAccount.toLowerCase()) {
      showError("You are not the owner of this NFT");
      return false;
    }
    
    // *** ADD APPROVAL STEP BEFORE DEPOSIT ***
    console.log("Requesting NFT approval...");
    showSuccess("Step 1/2: Approving NFT...");
    
    // You can use approve or setApprovalForAll
    const approveTx = await nftContractInstance.approve(CONTRACT_ADDRESS, tokenIdBN, {
      gasLimit: 200000
    });
    
    console.log("Approval transaction sent:", approveTx.hash);
    showSuccess("Confirming approval...");
    
    const approveReceipt = await approveTx.wait();
    console.log("Approval confirmed:", approveReceipt);
    
    // Small pause to ensure the approval is registered
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now deposit the NFT
    showSuccess("Step 2/2: Depositing NFT...");
    const auctionContract = new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, signer);
    
    const tx = await auctionContract.depositNFT(nftContract, tokenIdBN, {
      gasLimit: 300000
    });
    
    console.log("Deposit transaction sent:", tx.hash);
    showSuccess("Confirming deposit...");
    
    const receipt = await tx.wait();
    console.log("Deposit receipt:", receipt);
    
    if (receipt.status === 0) {
      throw new Error("Deposit failed on the blockchain");
    }
    
    // Find NFTDeposited event
    const depositEvent = receipt.events?.find(e => e.event === 'NFTDeposited');
    if (depositEvent) {
      console.log("NFT deposited successfully:", depositEvent);
      showSuccess("NFT deposited successfully! You can now create the auction.");
      
      // Update UI to show NFT is deposited
      document.getElementById("depositStatus").style.display = "block";
      
      // Set event handler for withdraw button
      document.getElementById("withdrawNFTBtn").onclick = () => {
        withdrawDepositedNFT(nftContract, tokenIdBN);
      };
      
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error("Error depositing NFT:", error);
    
    let errorMessage = "Error depositing the NFT.";
    
    if (error.code === 4001) {
      errorMessage = "Transaction rejected by user.";
    } else if (error.message.includes("NFT already deposited")) {
      errorMessage = "This NFT is already deposited in the contract.";
    } else if (error.message.includes("not owner")) {
      errorMessage = "You are not the owner of this NFT.";
    } else if (error.message.includes("ERC721: transfer")) {
      errorMessage = "Transfer failed. Make sure the NFT is approved for the contract.";
    }
    
    showError(errorMessage);
    return false;
  }
}

// Function to withdraw a deposited NFT
async function withdrawDepositedNFT(nftContract, tokenId) {
  if (!window.ethereum || !currentAccount) {
    showError("Please connect your wallet first");
    return;
  }
  
  try {
    // Convert tokenId to BigNumber if needed
    const tokenIdBN = ethers.BigNumber.from(String(tokenId));
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    const auctionContract = new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, signer);
    
    showSuccess("Retrieving deposited NFT...");
    
    const tx = await auctionContract.withdrawDepositedNFT(nftContract, tokenIdBN, {
      gasLimit: 250000
    });
    
    showSuccess("Confirming withdrawal...");
    const receipt = await tx.wait();
    
    if (receipt.status === 0) {
      throw new Error("Withdrawal failed on the blockchain");
    }
    
    showSuccess("NFT successfully withdrawn to your wallet!");
    
    // Update UI
    document.getElementById("depositStatus").style.display = "none";
    
  } catch (error) {
    console.error("Error withdrawing NFT:", error);
    
    let errorMessage = "Error withdrawing the NFT.";
    
    if (error.code === 4001) {
      errorMessage = "Transaction rejected by user.";
    } else if (error.message.includes("Not the depositor")) {
      errorMessage = "You are not the depositor of this NFT.";
    } else if (error.message.includes("NFT not found")) {
      errorMessage = "The NFT is not deposited in the contract.";
    }
    
    showError(errorMessage);
  }
}

// Function to create a new auction - WITH SIMPLIFIED FLOW
async function createNewAuction(nftContract, tokenId, reservePrice, durationHours) {
  if (!window.ethereum || !currentAccount) {
    showError("Please connect your wallet first");
    return;
  }
  
  console.log("=== STARTING AUCTION CREATION ===");
  console.log("Received parameters:", { nftContract, tokenId, reservePrice, durationHours });
  
  // Check if simplified flow should be used
  const useSimplifiedFlow = document.getElementById("useSimplifiedFlow")?.checked || false;
  console.log("Using simplified flow?", useSimplifiedFlow);
  
  // 1. INITIAL VERIFICATION - PARAMETER VALIDATION AND CONVERSION
  // Validate nftContract is a valid address
  if (!ethers.utils.isAddress(nftContract)) {
    showError("Invalid NFT contract address");
    return;
  }

  // Convert tokenId to BigNumber
  let tokenIdBN;
  try {
    tokenIdBN = ethers.BigNumber.from(String(tokenId));
    console.log("TokenID as BigNumber:", tokenIdBN.toString());
  } catch (err) {
    console.error("Error converting tokenId to BigNumber:", err);
    showError("Invalid token ID: " + err.message);
    return;
  }

  // Format reserve price
  let formattedReservePrice;
  try {
    const floatPrice = parseFloat(reservePrice);
    if (isNaN(floatPrice) || floatPrice <= 0) {
      showError("Price must be a positive number");
      return;
    }
    formattedReservePrice = floatPrice.toFixed(6);
    console.log("Formatted price:", formattedReservePrice);
  } catch (err) {
    showError("Invalid price format: " + err.message);
    return;
  }

  // Convert price to wei
  const reservePriceWei = ethers.utils.parseEther(formattedReservePrice);
  console.log("Reserve price in ADRIAN tokens (wei):", reservePriceWei.toString());

  // Validate duration
  let durationSecs;
  try {
    const hoursNum = parseFloat(durationHours);
    if (isNaN(hoursNum) || hoursNum < 1) {
      showError("Duration must be at least 1 hour");
      return;
    }
    durationSecs = Math.floor(hoursNum * 3600);
    console.log("Duration in seconds:", durationSecs);
  } catch (err) {
    showError("Invalid duration: " + err.message);
    return;
  }
  
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    console.log("Provider and signer initialized correctly");
    
    // 2. EXECUTE THE CORRECT FLOW BASED ON SELECTION
    if (useSimplifiedFlow) {
      // SIMPLIFIED FLOW: FIRST DEPOSIT, THEN CREATEAUCTIONFROMDEPOSIT
      
      // 2. CHECK IF NFT IS ALREADY DEPOSITED
      const auctionContract = new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, signer);
      let isDeposited = false;
      
      try {
        const depositor = await auctionContract.getDepositInfo(nftContract, tokenIdBN);
        isDeposited = (depositor.toLowerCase() === currentAccount.toLowerCase());
        console.log("NFT already deposited?", isDeposited);
      } catch (error) {
        console.warn("Error checking deposit status:", error);
        // If we can't check, assume it's not deposited to ensure the process continues
        isDeposited = false;
      }
      
      // 3. DEPOSIT NFT TO CONTRACT (STEP 1/2)
      if (!isDeposited) {
        showSuccess("Depositing NFT...");
        console.log("NFT not deposited yet, proceeding with deposit");
        
        // Use the separate depositNFT function which includes approval
        const depositSuccess = await depositNFT(nftContract, tokenIdBN);
        
        if (!depositSuccess) {
          throw new Error("Failed to deposit NFT. Please make sure the NFT is approved for the contract.");
        }
      } else {
        console.log("NFT already deposited by current user, proceeding to auction creation");
      }
      
      // 4. CREATE AUCTION FROM DEPOSIT (STEP 2/2)
      showSuccess("Creating auction...");
      
      try {
        // TRANSACTION #2: createAuctionFromDeposit
        // Call createAuctionFromDeposit function with exact parameters required
        const tx = await auctionContract.createAuctionFromDeposit(
          nftContract,     // _nftContract: address
          tokenIdBN,       // _tokenId: uint256
          reservePriceWei, // _reservePrice: uint256
          durationSecs,    // _durationSecs: uint256
          { 
            gasLimit: 500000 
          }
        );
        
        console.log("Auction creation transaction sent:", tx.hash);
        showSuccess("Confirming auction creation...");
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        if (receipt.status === 0) {
          throw new Error("Auction creation failed on the blockchain");
        }
        
        // 5. FINALIZATION - Verify success through AuctionCreated event
        const auctionCreatedEvent = receipt.events?.find(e => e.event === 'AuctionCreated');
        
        if (auctionCreatedEvent && auctionCreatedEvent.args) {
          const auctionId = auctionCreatedEvent.args.auctionId.toString();
          console.log("New auction ID:", auctionId);
          showSuccess(`Auction #${auctionId} created successfully!`);
        } else {
          showSuccess("Auction created successfully!");
        }
      } catch (error) {
        console.error("Error in auction creation transaction:", error);
        throw new Error("Failed to create auction: " + (error.message || "Unknown error"));
      }
      
      // Update UI - Hide deposit status
      document.getElementById("depositStatus").style.display = "none";
    } else {
      // TRADITIONAL FLOW (original)
      console.log("Using traditional flow with approvals...");
      
      // 1. Create NFT contract instance and approve directly
      console.log("Creating NFT contract instance:", nftContract);
    const nftContractInstance = new ethers.Contract(nftContract, ERC721_ABI, signer);
    
      // 2. APPROVE TOKEN USING setApprovalForAll
      console.log("Requesting approval using setApprovalForAll...");
      showSuccess("Requesting permission to use NFT...");
    
    try {
      const approveTx = await nftContractInstance.setApprovalForAll(CONTRACT_ADDRESS, true, {
          gasLimit: 250000
      });
        console.log("Approval transaction sent:", approveTx.hash);
      
        showSuccess("Confirming approval...");
      const approveReceipt = await approveTx.wait();
        console.log("Approval confirmed:", approveReceipt);
      
        // Wait to ensure blockchain has processed the approval
        console.log("Waiting 3 seconds to ensure approval has been processed...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      if (error.code === 4001) {
          throw new Error("Approval transaction rejected by user");
        }
        console.warn("Error in global approval:", error);
      }
      
      // 3. Verify and approve ADRIAN tokens for the reserve price
      console.log("Initializing ADRIAN token contract:", ADRIAN_TOKEN_ADDRESS);
      const tokenContract = new ethers.Contract(ADRIAN_TOKEN_ADDRESS, ERC20_ABI, signer);
      
      // Check allowance
      console.log("Checking current ADRIAN token allowance for auction contract");
      const allowance = await tokenContract.allowance(currentAccount, CONTRACT_ADDRESS);
      console.log("Current ADRIAN allowance:", allowance.toString());
      
      if (allowance.lt(reservePriceWei)) {
        console.log("Insufficient ADRIAN token allowance, requesting approval...");
        showSuccess("Approving ADRIAN tokens for auction...");
        
        // Only approve the exact amount needed for the auction
        const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, reservePriceWei);
        console.log("ADRIAN token approval transaction sent for exact amount:", approveTx.hash);
        
        showSuccess("Confirming ADRIAN token approval...");
        const approveReceipt = await approveTx.wait();
        console.log("ADRIAN token approval receipt:", approveReceipt);
        
        if (approveReceipt.status === 0) {
          throw new Error("ADRIAN token approval transaction failed");
        }
        
        // Verify approval after transaction
        const newAllowance = await tokenContract.allowance(currentAccount, CONTRACT_ADDRESS);
        console.log("New ADRIAN token allowance after approval:", newAllowance.toString());
        
        if (newAllowance.lt(reservePriceWei)) {
          throw new Error("ADRIAN token approval completed but allowance is still insufficient");
        }
        
        showSuccess("ADRIAN tokens approved successfully for this auction");
      } else {
        console.log("Sufficient ADRIAN token allowance for auction");
      }
      
      // 4. Create auction with traditional method
      console.log("Creating auction contract instance:", CONTRACT_ADDRESS);
      const auctionContract = new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, signer);
      
      showSuccess("Sending transaction to create auction...");
      
      // Configure gas options
      const gasLimit = 500000;
      
      // Call createAuction method
    const tx = await auctionContract.createAuction(
      nftContract,
        tokenIdBN,
      reservePriceWei,
        durationSecs,
        { gasLimit }
    );
    
      console.log("Transaction sent:", tx.hash);
      showSuccess(`Transaction sent. Waiting for confirmation...`);
    
      const receipt = await tx.wait();
    
    if (receipt.status === 0) {
        throw new Error("Transaction failed on the blockchain");
    }
    
      // Find AuctionCreated event in logs
    const auctionCreatedEvent = receipt.events?.find(e => e.event === 'AuctionCreated');
    
    if (auctionCreatedEvent && auctionCreatedEvent.args) {
      const auctionId = auctionCreatedEvent.args.auctionId.toString();
        console.log("New auction ID:", auctionId);
        showSuccess(`Auction #${auctionId} created successfully!`);
    } else {
        showSuccess("Auction created successfully!");
      }
    }
    
    // Clean form and update UI
    document.getElementById("createAuctionForm").reset();
    document.getElementById("auction-details").style.display = "none";
    document.getElementById("depositStatus").style.display = "none";
    selectedNFT = null;
    renderNFTGrid(document.getElementById("nftList"));
    
    console.log("=== AUCTION CREATION SUCCESSFUL ===");
    
    // Navigate to My Auctions tab
    setTimeout(() => {
      document.getElementById("myauctions-tab").click();
    }, 1500);
    
  } catch (error) {
    console.error("=== ERROR CREATING AUCTION ===");
    console.error("Detailed error:", error);
    
    if (error.data) console.error("Error data:", error.data);
    
    // Detailed error analysis
    let errorMessage = "Error creating auction.";
    
    if (error.code === 4001) {
      errorMessage = "Transaction rejected by user.";
    } else if (error.message.includes("Not the depositor")) {
      errorMessage = "You are not the depositor of this NFT.";
    } else if (error.message.includes("NFT not in contract")) {
      errorMessage = "NFT is not in the contract. Deposit it first.";
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    console.error("Error message displayed:", errorMessage);
    showError(errorMessage);
  }
}

// Funciones adicionales que podrían ser útiles más adelante
function showAuctionDetails(auctionId) {
  // Implementar para mostrar detalles completos de una subasta específica
  console.log("Mostrar detalles de la subasta:", auctionId);
  
  // Redirigir a la página de detalles de la subasta
  const baseUrl = window.location.origin;
  // Comprobar si estamos en GitHub Pages para incluir la ruta AdrianAuctions
  if (baseUrl.includes('github.io')) {
    window.location.href = `${baseUrl}/AdrianAuctions/auctiondetails.html?id=${auctionId}`;
  } else {
    window.location.href = `${baseUrl}/auctiondetails.html?id=${auctionId}`;
  }
}

// Function to relist an auction (new function based on contract capability)
async function relistAuction(auctionId, newReservePrice, durationHours) {
  if (!window.ethereum || !currentAccount) {
    showError("Please connect your wallet first");
    return;
  }
  
  // Validación de entradas
  if (parseFloat(newReservePrice) <= 0) {
    showError("El precio de reserva debe ser mayor que 0");
    return;
  }
  
  if (parseInt(durationHours) < 1) {
    showError("La duración debe ser de al menos 1 hora");
    return;
  }
  
  console.log("=== INICIO DE RELISTING DE SUBASTA ===");
  console.log("Parámetros:", { auctionId, newReservePrice, durationHours });
  
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    // Convert to contract parameters
    const reservePriceWei = ethers.utils.parseEther(newReservePrice.toString());
    const durationSeconds = durationHours * 3600;
    
    console.log("Parámetros convertidos:", {
      auctionId: auctionId,
      reservePriceWei: reservePriceWei.toString(),
      durationSeconds
    });
    
    showSuccess("Enviando transacción para volver a listar la subasta...");
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, signer);
    
    // Importante: relistAuction solo necesita estos parámetros ya que el NFT
    // ya está en posesión del contrato y no necesita transferencia adicional
    console.log("Llamando a relistAuction con parámetros:", {
      auctionId,
      reservePriceWei: reservePriceWei.toString(),
      durationSeconds
    });
    
    const tx = await contract.relistAuction(
      auctionId,               // ID de la subasta original 
      reservePriceWei,         // Nuevo precio de reserva en Wei
      durationSeconds          // Nueva duración en segundos
    );
    
    console.log("Transacción enviada:", tx.hash);
    
    showSuccess("Confirmando relisting de subasta...");
    console.log("Esperando confirmación de la transacción...");
    
    const receipt = await tx.wait();
    console.log("Recibo de la transacción:", receipt);
    
    if (receipt.status === 0) {
      throw new Error("La transacción de relisting falló");
    }
    
    // Find the AuctionCreated event to get the new auction ID
    console.log("Buscando evento AuctionCreated en los logs...");
    const auctionCreatedEvent = receipt.events?.find(e => e.event === 'AuctionCreated');
    console.log("Evento AuctionCreated encontrado:", auctionCreatedEvent);
    
    let newAuctionId = null;
    
    if (auctionCreatedEvent && auctionCreatedEvent.args) {
      console.log("Argumentos del evento:", auctionCreatedEvent.args);
      newAuctionId = auctionCreatedEvent.args.auctionId.toString();
      console.log("ID de la nueva subasta:", newAuctionId);
      showSuccess(`¡NFT vuelto a listar con éxito en la subasta #${newAuctionId}!`);
    } else {
      console.log("No se pudo encontrar el ID de la nueva subasta en los eventos");
      showSuccess("¡NFT vuelto a listar con éxito!");
    }
    
    console.log("=== FIN DE RELISTING EXITOSO ===");
    
    // Refresh auction display
    loadUserAuctions(currentAccount);
    
  } catch (error) {
    console.error("=== ERROR AL VOLVER A LISTAR LA SUBASTA ===");
    console.error("Error detallado:", error);
    
    // Información detallada del error para depuración
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.transaction) {
      console.error("Detalles de la transacción:", error.transaction);
    }
    if (error.receipt) {
      console.error("Recibo de la transacción:", error.receipt);
    }
    
    // Proporcionar mensaje de error más específico
    let errorMessage = "Error al volver a listar la subasta.";
    
    if (error.code === 4001) {
      errorMessage = "Transacción rechazada por el usuario.";
    } else if (error.message.includes("insufficient funds")) {
      errorMessage = "Fondos insuficientes para completar la transacción.";
    } else if (error.message.includes("execution reverted")) {
      // Extraer el mensaje de error de la blockchain si está disponible
      const revertReason = error.data?.message || error.message;
      errorMessage = `La transacción falló: ${revertReason}`;
    } else if (error.message.includes("transaction failed")) {
      errorMessage = "La transacción falló. Revisa la consola para más detalles.";
    } else if (error.message.includes("user rejected")) {
      errorMessage = "Usuario rechazó la transacción.";
    } else if (error.message.includes("gas")) {
      errorMessage = "Error con el gas de la transacción. Puede que el límite sea demasiado bajo.";
    } else if (error.message.includes("Auction had a winner")) {
      errorMessage = "No se puede volver a listar una subasta que ya tuvo un ganador.";
    } else if (error.message.includes("Not the seller")) {
      errorMessage = "Solo el vendedor original puede volver a listar esta subasta.";
    } else if (error.message.includes("Auction still active")) {
      errorMessage = "La subasta aún está activa y no puede ser vuelta a listar.";
    } else if (error.message.includes("NFT not in contract")) {
      errorMessage = "El NFT ya no está en posesión del contrato.";
    }
    
    console.error("Mensaje de error mostrado al usuario:", errorMessage);
    showError(errorMessage);
  }
}

// Function to show relist modal
function showRelistModal(auctionId) {
  console.log("Mostrando modal para volver a listar la subasta ID:", auctionId);
  
  // Create modal if it doesn't exist
  if (!document.getElementById('relistModal')) {
    console.log("Creando modal de relisting por primera vez");
    
    const modalHTML = `
      <div class="modal fade" id="relistModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Relist Auction</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p class="mb-3">You can relist this NFT in a new auction with the following parameters:</p>
              
              <div class="alert alert-info mb-3">
                <strong>Information:</strong> This function will create a new auction with the same NFT that is already in possession of the contract.
              </div>
              
              <form id="relistForm">
                <input type="hidden" id="relistAuctionId" value="${auctionId}">
                <div class="mb-3">
                  <label for="newReservePrice" class="form-label">New reserve price ($ADRIAN)</label>
                  <input type="number" class="form-control" id="newReservePrice" min="0.000001" step="0.000001" required>
                  <small class="text-muted">The minimum bid required for the auction to be valid</small>
                </div>
                <div class="mb-3">
                  <label for="newDuration" class="form-label">New duration (hours)</label>
                  <input type="number" class="form-control" id="newDuration" min="1" value="24" required>
                  <small class="text-muted">Auction duration in hours (minimum 1 hour)</small>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn-action" id="relistAuctionBtn">Relist</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listener for relist button
    document.getElementById('relistAuctionBtn').addEventListener('click', () => {
      const auctionId = document.getElementById('relistAuctionId').value;
      const newReservePrice = document.getElementById('newReservePrice').value;
      const newDuration = document.getElementById('newDuration').value;
      
      // Validación básica
      let isValid = true;
      
      if (parseFloat(newReservePrice) <= 0) {
        showError("El precio de reserva debe ser mayor que 0");
        isValid = false;
      }
      
      if (parseInt(newDuration) < 1) {
        showError("La duración debe ser de al menos 1 hora");
        isValid = false;
      }
      
      if (isValid) {
        console.log("Validación superada, procediendo con relisting");
        relistAuction(auctionId, newReservePrice, newDuration);
        
        // Hide modal
        const relistModal = bootstrap.Modal.getInstance(document.getElementById('relistModal'));
        relistModal.hide();
      }
    });
  } else {
    // Update auction ID if modal already exists
    console.log("Modal de relisting ya existe, actualizando ID de subasta");
    document.getElementById('relistAuctionId').value = auctionId;
  }
  
  // Intentar obtener los detalles de la subasta original para sugerir valores
  try {
    if (readOnlyAuctionContract) {
      readOnlyAuctionContract.getManyAuctionDetails([auctionId]).then(auctions => {
        if (auctions && auctions.length > 0) {
          const originalAuction = auctions[0];
          // Sugerir un precio de reserva similar al original
          if (originalAuction.reservePrice) {
            const originalReservePrice = ethers.utils.formatEther(originalAuction.reservePrice);
            document.getElementById('newReservePrice').value = originalReservePrice;
          }
        }
      }).catch(err => {
        console.error("Error al obtener detalles de la subasta original:", err);
      });
    }
  } catch (error) {
    console.warn("No se pudieron cargar los detalles de la subasta original:", error);
  }
  
  // Show modal
  const relistModal = new bootstrap.Modal(document.getElementById('relistModal'));
  relistModal.show();
} 

// Debug function to inspect auction data structure directly
async function debugAuction(auctionId) {
  try {
    console.log(`Debugging auction #${auctionId}`);
    
    // 1. Try to get auction details directly from the contract
    const auctionIdArray = [ethers.BigNumber.from(auctionId)];
    const details = await readOnlyAuctionContract.getManyAuctionDetails(auctionIdArray);
    
    if (details && details.length > 0) {
      const auction = details[0];
      console.log("Raw auction from contract:", auction);
      console.log("Properties:", {
        nftContract: auction.nftContract,
        tokenId: auction.tokenId?.toString(),
        seller: auction.seller,
        reservePrice: auction.reservePrice?.toString(),
        endTime: auction.endTime?.toString(),
        highestBidder: auction.highestBidder,
        highestBid: auction.highestBid?.toString(),
        active: auction.active,
        finalized: auction.finalized
      });
      
      // Try to decode fields manually
      if (Array.isArray(auction)) {
        console.log("Auction is array-like, trying to decode manually");
        console.log("Array elements:", auction.map((v, i) => `[${i}]: ${v?.toString()}`));
      }
    } else {
      console.log("No auction details returned");
    }
  } catch (error) {
    console.error("Error debugging auction:", error);
  }
}

// Call with an auction ID from the console, e.g.: debugAuction(1);

// Function to share an auction
function shareAuction(auctionId, nftName) {
  // Get the base URL of the current site
  const baseUrl = window.location.origin;
  // Create the share URL for this specific auction, adding AdrianAuctions path if on GitHub Pages
  let shareUrl;
  if (baseUrl.includes('github.io')) {
    shareUrl = `${baseUrl}/AdrianAuctions/auctiondetails.html?id=${auctionId}`;
  } else {
    shareUrl = `${baseUrl}/auctiondetails.html?id=${auctionId}`;
  }
  
  // Updated social share text with $ADRIAN, @adriancerda and emojis 🟦🟥
  const shareText = encodeURIComponent(`Check out this NFT auction: ${decodeURIComponent(nftName)} on Adrian Auction! $ADRIAN @adriancerda 🟦🟥`);
  
  // Imagen fija para respaldo
  const fixedShareImage = 'https://adrianpunks.com/market/adrianpunksimages/200.png';
  
  // Intentar obtener la imagen del NFT actual (si estamos en la página de detalles)
  let nftImage = document.getElementById('detail-nft-image');
  let shareImageUrl = fixedShareImage;
  
  if (nftImage && nftImage.src && nftImage.src !== 'https://placehold.co/600x600?text=NFT+Image') {
    // Convertir a URL absoluta si es necesario
    if (!nftImage.src.startsWith('http') && !nftImage.src.startsWith('data:')) {
      shareImageUrl = new URL(nftImage.src, baseUrl).href;
    } else {
      shareImageUrl = nftImage.src;
    }
    console.log(`Usando imagen de NFT para compartir: ${shareImageUrl}`);
  } else {
    console.log(`No se encontró imagen de NFT válida, usando imagen predeterminada: ${fixedShareImage}`);
  }
  
  // Actualizar metadatos para compartir
  const ogImageElement = document.getElementById('og-image');
  const twitterImageElement = document.getElementById('twitter-image');
  
  if (ogImageElement) ogImageElement.setAttribute('content', shareImageUrl);
  if (twitterImageElement) twitterImageElement.setAttribute('content', shareImageUrl);
  
  // Create modal for sharing
  const modalHTML = `
    <div class="modal fade" id="shareModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Share Auction #${auctionId}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p>Share this auction with others:</p>
            
            <div class="input-group mb-3">
              <input type="text" class="form-control" id="shareUrlInput" value="${shareUrl}" readonly>
              <button class="btn btn-outline-secondary" type="button" id="copyShareUrl">Copy</button>
            </div>
            
            <div class="share-buttons mt-3 d-flex gap-2">
              <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${shareText}" target="_blank" class="btn btn-sm text-white" style="background-color: #1DA1F2;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-twitter-x" viewBox="0 0 16 16">
                  <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/>
                </svg>
                Twitter
              </a>
              <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" class="btn btn-sm text-white" style="background-color: #3b5998;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-facebook" viewBox="0 0 16 16">
                  <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
                </svg>
                Facebook
              </a>
              <a href="https://wa.me/?text=${encodeURIComponent(`Check out this NFT auction: ${decodeURIComponent(nftName)} on Adrian Auction! $ADRIAN @adriancerda 🟦🟥 ${shareUrl}`)}" target="_blank" class="btn btn-sm text-white" style="background-color: #25D366;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-whatsapp" viewBox="0 0 16 16">
                  <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                </svg>
                WhatsApp
              </a>
              <a href="https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${shareText}" target="_blank" class="btn btn-sm text-white" style="background-color: #0088cc;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-telegram" viewBox="0 0 16 16">
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629.093.06.183.125.27.187.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.426 1.426 0 0 0-.013-.315.337.337 0 0 0-.114-.217.526.526 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09z"/>
                </svg>
                Telegram
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove any existing share modal
  const existingModal = document.getElementById('shareModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Initialize modal
  const shareModal = new bootstrap.Modal(document.getElementById('shareModal'));
  shareModal.show();
  
  // Set up copy functionality
  document.getElementById('copyShareUrl').addEventListener('click', function() {
    const shareUrlInput = document.getElementById('shareUrlInput');
    shareUrlInput.select();
    shareUrlInput.setSelectionRange(0, 99999); // For mobile devices
    
    // Copy the text inside the text field
    navigator.clipboard.writeText(shareUrlInput.value)
      .then(() => {
        showSuccess("Link copied to clipboard!");
      })
      .catch(err => {
        showError("Failed to copy link");
        console.error('Could not copy text: ', err);
      });
  });
}

// Function to load auction details for a specific auction ID
async function loadAuctionDetails(auctionId) {
  if (!auctionId) {
    console.error("No auction ID provided");
    document.getElementById('loading-auction').style.display = 'none';
    document.getElementById('no-auction-message').style.display = 'block';
    return;
  }
  
  try {
    console.log(`Loading details for auction #${auctionId}`);
    
    // Inicializar el contrato si aún no está listo
    if (!readOnlyAuctionContract) {
      readOnlyProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
      readOnlyAuctionContract = new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, readOnlyProvider);
    }
    
    // Obtenemos los datos de la subasta directamente del contrato
    // Usamos getManyAuctionDetails con un array de un solo ID
    const auctionIdArray = [ethers.BigNumber.from(auctionId)];
    const auctionsDetails = await readOnlyAuctionContract.getManyAuctionDetails(auctionIdArray);
    
    if (!auctionsDetails || auctionsDetails.length === 0) {
      throw new Error("Auction not found");
    }
    
    // La primera subasta del array es la que buscamos
    const auction = auctionsDetails[0];
    console.log(`Raw auction data for #${auctionId}:`, auction);
    
    // Process auction data with safety checks
    const nftContract = auction.nftContract || ethers.constants.AddressZero;
    const tokenId = auction.tokenId ? ethers.BigNumber.from(auction.tokenId).toString() : '0';
    const seller = auction.seller || ethers.constants.AddressZero;
    const highestBidder = auction.highestBidder || ethers.constants.AddressZero;
    const reservePrice = auction.reservePrice ? ethers.BigNumber.from(auction.reservePrice) : ethers.BigNumber.from(0);
    const highestBid = auction.highestBid ? ethers.BigNumber.from(auction.highestBid) : ethers.BigNumber.from(0);
    
    // Handle endTime correctly
    let endTime;
    try {
      endTime = auction.endTime ? parseInt(auction.endTime.toString()) : 0;
      console.log(`Converted endTime: ${endTime}`);
    } catch (err) {
      console.error("Error converting endTime:", err);
      endTime = 0;
    }
    
    // Handle boolean values
    const isActive = auction.active === true || auction.active === 1;
    const isFinalized = auction.finalized === true || auction.finalized === 1;
    
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = endTime - now;
    
    // Calculate auction status properties
    const endingSoon = isActive && timeRemaining < 900 && timeRemaining > 0;
    const reserveMet = highestBid.gte(reservePrice);
    const isEnded = !isActive || timeRemaining <= 0;
    const hasWinner = auction.highestBidder !== ethers.constants.AddressZero && 
                      highestBid.gt(0) && 
                      highestBid.gte(reservePrice);
    
    const isOwner = currentAccount && seller.toLowerCase() === currentAccount.toLowerCase();
    const isHighestBidder = currentAccount && highestBidder.toLowerCase() === currentAccount.toLowerCase();
    
    // Resto del código tal cual...
    // ... existing code ...
    // Determine NFT metadata
    let imageUrl = 'https://placehold.co/600x600?text=NFT+Image';
    let nftName = `NFT #${tokenId}`;
    
    // Try to fetch NFT image from Alchemy if possible
    if (alchemyWeb3 && nftContract && nftContract !== ethers.constants.AddressZero) {
      try {
        console.log(`Getting metadata for NFT at contract ${nftContract}, token ID ${tokenId}`);
        
        // Create a temporary NFT contract to get the tokenURI
        const nftContractInstance = new ethers.Contract(nftContract, ERC721_ABI, readOnlyProvider);
        
        try {
          const tokenURI = await nftContractInstance.tokenURI(tokenId);
          console.log(`Token URI obtained:`, tokenURI);
          
          if (tokenURI) {
            // Try to fetch metadata
            let metadata = null;
            
            if (tokenURI.startsWith('ipfs://')) {
              // Extracting the CID (Content Identifier) correctly
              const ipfsHash = tokenURI.replace('ipfs://', '');
              // Fix: Check if the hash already contains 'ipfs/' prefix to avoid duplication
              let ipfsUrl;
              if (ipfsHash.startsWith('ipfs/')) {
                ipfsUrl = `https://ipfs.io/${ipfsHash}`;
                console.log(`Token URI IPFS corrected to avoid duplication:`, ipfsUrl);
              } else {
                ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
                console.log(`Standard IPFS URI:`, ipfsUrl);
              }
              
              try {
                console.log(`Getting metadata from IPFS:`, ipfsUrl);
                const response = await fetch(ipfsUrl);
                metadata = await response.json();
              } catch (error) {
                console.warn("Error getting metadata from IPFS:", error);
              }
            } else if (tokenURI.startsWith('http')) {
              try {
                console.log(`Getting metadata from HTTP:`, tokenURI);
                const response = await fetch(tokenURI);
                metadata = await response.json();
              } catch (error) {
                console.warn("Error getting HTTP metadata:", error);
              }
            }
            
            if (metadata) {
              console.log("Metadata obtained:", metadata);
              
              if (metadata.name) {
                nftName = metadata.name;
              }
              
              if (metadata.image) {
                if (metadata.image.startsWith('ipfs://')) {
                  // Extracting the CID (Content Identifier) correctly
                  const imageHash = metadata.image.replace('ipfs://', '');
                  // Fix: Check if the hash already contains 'ipfs/' prefix to avoid duplication
                  if (imageHash.startsWith('ipfs/')) {
                    imageUrl = `https://ipfs.io/${imageHash}`;
                    console.log(`IPFS URL corrected to avoid duplication:`, imageUrl);
                  } else {
                    imageUrl = `https://ipfs.io/ipfs/${imageHash}`;
                    console.log(`Standard IPFS URL:`, imageUrl);
                  }
                } else {
                  imageUrl = metadata.image;
                }
                console.log(`Image URL:`, imageUrl);
              }
            }
          }
        } catch (err) {
          console.warn(`Error fetching tokenURI:`, err);
        }
      } catch (error) {
        console.warn(`Error loading NFT image for auction #${auctionId}:`, error);
      }
    }
    
    // Update meta tags for social media sharing
    const currentUrl = window.location.href;
    
    // Ahora usaremos la imagen del NFT actual para compartir, con imagen fija como respaldo
    const fixedShareImage = 'https://adrianpunks.com/market/adrianpunksimages/200.png';
    
    // Convertir la URL de la imagen del NFT a URL absoluta si es necesario
    let absoluteImageUrl = imageUrl;
    
    // Si la imagen es una URL relativa, convertirla a absoluta
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      const baseUrl = window.location.origin;
      absoluteImageUrl = new URL(imageUrl, baseUrl).href;
      console.log(`Convertida URL relativa a absoluta: ${imageUrl} -> ${absoluteImageUrl}`);
    }
    
    console.log(`Imagen para compartir: ${absoluteImageUrl} (respaldo: ${fixedShareImage})`);
    
    // Actualizar metas OpenGraph
    const ogImageElement = document.getElementById('og-image');
    const ogTitleElement = document.getElementById('og-title');
    const ogDescElement = document.getElementById('og-description');
    const ogUrlElement = document.getElementById('og-url');
    
    if (ogImageElement) {
      // Usar primero la imagen del NFT, con la imagen fija como fallback a través de onerror
      ogImageElement.setAttribute('content', absoluteImageUrl);
    }
    if (ogTitleElement) ogTitleElement.setAttribute('content', `${nftName} - Adrian Auction`);
    if (ogDescElement) ogDescElement.setAttribute('content', `Bid on "${nftName}" NFT auction on Adrian Auction! Current bid: ${formatAdrian(highestBid)}. $ADRIAN @adriancerda 🟦🟥`);
    if (ogUrlElement) ogUrlElement.setAttribute('content', currentUrl);
    
    // Actualizar metas Twitter
    const twitterImageElement = document.getElementById('twitter-image');
    const twitterTitleElement = document.getElementById('twitter-title');
    const twitterDescElement = document.getElementById('twitter-description');
    const twitterImageAltElement = document.getElementById('twitter-image-alt');
    
    if (twitterImageElement) {
      // Usar primero la imagen del NFT, con la imagen fija como fallback
      twitterImageElement.setAttribute('content', absoluteImageUrl);
    }
    if (twitterTitleElement) twitterTitleElement.setAttribute('content', `${nftName} - Adrian Auction`);
    if (twitterDescElement) twitterDescElement.setAttribute('content', `Bid on "${nftName}" NFT auction on Adrian Auction! Current bid: ${formatAdrian(highestBid)}. $ADRIAN @adriancerda 🟦🟥`);
    if (twitterImageAltElement) twitterImageAltElement.setAttribute('content', `NFT auction image of ${nftName}`);
    
    // Update page title
    document.title = `${nftName} - Adrian Auction`;
    
    // Setup share buttons
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this NFT auction: ${nftName} on Adrian Auction! $ADRIAN @adriancerda 🟦🟥`);
    
    const twitterShare = document.getElementById('twitter-share');
    const facebookShare = document.getElementById('facebook-share');
    const whatsappShare = document.getElementById('whatsapp-share');
    const telegramShare = document.getElementById('telegram-share');
    
    if (twitterShare) twitterShare.href = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
    if (facebookShare) facebookShare.href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    if (whatsappShare) whatsappShare.href = `https://wa.me/?text=${text}%20${url}`;
    if (telegramShare) telegramShare.href = `https://t.me/share/url?url=${url}&text=${text}`;
    
    // Create status badges
    let statusBadges = '';
    
    if (isActive) {
      if (endingSoon) {
        statusBadges += '<span class="auction-status status-ending">🔥 Ending Soon</span>';
      } else {
        statusBadges += '<span class="auction-status status-live">🔄 Active</span>';
      }
      
      if (reserveMet) {
        statusBadges += '<span class="auction-status status-reserve-met">✅ Reserve Met</span>';
      }
      
      if (isHighestBidder) {
        statusBadges += '<span class="auction-status status-live">🏆 You are Winning</span>';
      }
    } else {
      if (isFinalized) {
        if (hasWinner) {
          statusBadges += '<span class="auction-status">✅ Ended with Winner</span>';
        } else {
          statusBadges += '<span class="auction-status">❌ Ended without Winner</span>';
        }
      } else {
        statusBadges += '<span class="auction-status">⏸️ Inactive</span>';
      }
    }
    
    if (isOwner) {
      statusBadges += '<span class="auction-status">👑 Your Auction</span>';
    }
    
    // Update the UI with auction details
    document.getElementById('detail-nft-image').src = imageUrl;
    document.getElementById('detail-title').textContent = nftName;
    document.getElementById('detail-status-badges').innerHTML = statusBadges;
    document.getElementById('detail-auction-id').textContent = `#${auctionId}`;
    document.getElementById('detail-contract').textContent = formatAddress(nftContract);
    document.getElementById('detail-token-id').textContent = tokenId;
    document.getElementById('detail-seller').textContent = formatAddress(seller);
    document.getElementById('detail-reserve-price').textContent = `${formatAdrian(reservePrice)}`;
    document.getElementById('detail-current-bid').textContent = highestBid.gt(0) ? `${formatAdrian(highestBid)}` : "No bids yet";
    document.getElementById('detail-highest-bidder').textContent = highestBidder !== ethers.constants.AddressZero ? formatAddress(highestBidder) : "No bidder yet";
    
    if (isActive && timeRemaining > 0) {
      document.getElementById('detail-time-label').textContent = "Time Remaining";
      document.getElementById('detail-time-value').textContent = formatTimeRemaining(endTime);
      
      // Update time remaining every second
      const timeInterval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = endTime - now;
        
        if (timeRemaining <= 0) {
          clearInterval(timeInterval);
          document.getElementById('detail-time-value').textContent = "Ended";
          
          // Reload the page to show updated status
          setTimeout(() => {
            loadAuctionDetails(auctionId);
          }, 3000);
        } else {
          document.getElementById('detail-time-value').textContent = formatTimeRemaining(endTime);
        }
      }, 1000);
    } else {
      document.getElementById('detail-time-label').textContent = "Status";
      
      if (isActive) {
        document.getElementById('detail-time-value').textContent = "Active (Waiting for finalization)";
      } else if (isFinalized) {
        document.getElementById('detail-time-value').textContent = "Finalized";
      } else {
        document.getElementById('detail-time-value').textContent = "Inactive";
      }
    }
    
    // Create action buttons
    let actionButtons = '';
    
    if (isActive && !isFinalized) {
      if (isOwner && endTime <= now) {
        actionButtons = `<button class="btn-action w-100 mb-2" onclick="finalizeAuction(${auctionId}); event.stopPropagation();">Finalize Auction</button>`;
      } else if (isOwner && highestBid.isZero()) {
        actionButtons = `<button class="btn-action w-100 mb-2" onclick="cancelAuction(${auctionId}); event.stopPropagation();">Cancel Auction</button>`;
      } else if (!isOwner) {
        actionButtons = `<button class="btn-action w-100 mb-2" onclick="openBidModal(${auctionId}, '${highestBid}', '${reservePrice}', '${nftContract}', ${tokenId}); event.stopPropagation();">Place Bid</button>`;
      }
    } else if (isOwner && !isActive && isFinalized && 
             (auction.highestBidder === ethers.constants.AddressZero || highestBid.lt(reservePrice))) {
      // Mostrar botón de relist solo cuando:
      // 1. El usuario es el dueño de la subasta
      // 2. La subasta no está activa
      // 3. La subasta está finalizada
      // 4. La subasta no tuvo postor o no se alcanzó el precio de reserva
      actionButtons = `<button class="btn-action w-100 mb-2" onclick="showRelistModal(${auctionId}); event.stopPropagation();">Relist</button>`;
    }
    
    // Add back to all auctions button
    actionButtons += `<a href="index.html" class="btn-secondary w-100">All Auctions</a>`;
    
    document.getElementById('detail-action-container').innerHTML = actionButtons;
    
    // Show the auction details container
    document.getElementById('loading-auction').style.display = 'none';
    document.getElementById('auction-details-container').style.display = 'block';
    
  } catch (error) {
    console.error(`Error loading auction #${auctionId}:`, error);
    document.getElementById('loading-auction').style.display = 'none';
    document.getElementById('no-auction-message').style.display = 'block';
  }
}

// Debug function for auctions
// Call with an auction ID from the console, e.g.: debugAuction(1);

// Dispatch an event when auction.js is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.dispatchEvent(new Event('auctionJsLoaded'));
  console.log('auction.js loaded and initialized');
});

// Function to load active auctions for the mini-carousel
async function loadAuctionsForCarousel() {
  try {
    console.log("Loading auctions for the mini-carousel...");
    
    // Asegurar que el contrato está inicializado
    initReadOnlyContract();
    
    // 1. Obtener todas las subastas activas - buscar hasta 5 para variar el contenido
    let count;
    try {
      count = await readOnlyAuctionContract.getActiveAuctionsCount();
      console.log(`Active auctions for carousel: ${count.toString()}`);
    } catch (error) {
      console.error("Error al obtener número de subastas:", error);
      return []; // Retornar array vacío en caso de error
    }
    
    // Si no hay subastas, retornar array vacío
    if (!count || count.toNumber() === 0) {
      return [];
    }
    
    // 2. Limitar a un máximo de 5 subastas para asegurar variedad
    const pageSize = Math.min(5, count.toNumber());
    let ids, auctionIds;
    
    try {
      ids = await readOnlyAuctionContract.getActiveAuctions(0, pageSize);
      auctionIds = ids.map(id => id.toNumber());
    } catch (error) {
      console.error("Error al obtener IDs de subastas:", error);
      return []; // Retornar array vacío en caso de error
    }
    
    if (!ids || ids.length === 0) {
      return [];
    }
    
    // 3. Get details of the auctions
    let details;
    try {
      details = await readOnlyAuctionContract.getManyAuctionDetails(auctionIds);
    } catch (error) {
      console.error("Error al obtener detalles de subastas:", error);
      return []; // Retornar array vacío en caso de error
    }
    
    // 4. Process only basic information for speed
    const now = Math.floor(Date.now() / 1000);
    
    // Filtrar solo aquellas subastas que están activas
    const activeAuctions = details.filter((auction, index) => {
      // Si falta información crucial, filtrar
      if (!auction || !auction.endTime) return false;
      
      const isActive = auction.active === true || auction.active === 1;
      const endTime = auction.endTime ? Number(auction.endTime.toString()) : 0;
      return isActive && endTime > now;
    });
    
    if (activeAuctions.length === 0) {
      return [];
    }
    
    // 5. Create basic auction objects with minimal required info - optimizado para velocidad
    const carouselData = activeAuctions.map((auction, index) => {
      const auctionId = auctionIds[details.indexOf(auction)];
      
      // Información básica a mostrar inicialmente
      const nftContract = auction.nftContract || ethers.constants.AddressZero;
      const tokenId = auction.tokenId ? auction.tokenId.toString() : '0';
      const reservePrice = auction.reservePrice ? ethers.BigNumber.from(auction.reservePrice) : ethers.BigNumber.from(0);
      const highestBid = auction.highestBid ? ethers.BigNumber.from(auction.highestBid) : ethers.BigNumber.from(0);
      const endTime = auction.endTime ? parseInt(auction.endTime.toString()) : 0;
      
      // Placeholder image for initial fast load
      const imageUrl = 'https://placehold.co/400x400?text=Loading...';
      const nftName = `NFT #${tokenId.toString()}`;
      
      // Precio a mostrar (si hay oferta, mostrar esa, sino mostrar precio reserva)
      const displayPrice = highestBid.gt(0) ? 
        `${formatAdrian(highestBid)}` : 
        `${formatAdrian(reservePrice)}`;
      
      // Tiempo restante
      const timeRemaining = endTime - now;
      const formattedTime = formatTimeRemaining(endTime);
      
      // Retornar objeto con datos básicos
      return {
        auctionId,
        nftName,
        imageUrl,
        displayPrice,
        timeRemaining,
        formattedTime,
        nftContract,
        tokenId
      };
    });
    
    // 6. Load images immediately for the first auction to have something visible quickly
    if (carouselData.length > 0) {
      loadSingleAuctionImage(carouselData[0]).then(() => {
        // After first auction is loaded, load the rest in background
        setTimeout(() => {
          for (let i = 1; i < carouselData.length; i++) {
            loadSingleAuctionImage(carouselData[i]);
          }
        }, 100);
      });
    }
    
    console.log("Carousel data prepared:", carouselData);
    return carouselData;
    
  } catch (error) {
    console.error("Error loading auctions for carousel:", error);
    return [];
  }
}

// Función para cargar la imagen de una sola subasta
async function loadSingleAuctionImage(auction) {
  if (!auction || !auction.nftContract || auction.nftContract === ethers.constants.AddressZero) {
    return;
  }
  
  try {
    const nftContractInstance = new ethers.Contract(auction.nftContract, ERC721_ABI, readOnlyProvider);
    const tokenURI = await nftContractInstance.tokenURI(auction.tokenId);
    
    if (!tokenURI) return;
    
    let metadata = null;
    
    // Handle IPFS URLs
    if (tokenURI.startsWith('ipfs://')) {
      const ipfsHash = tokenURI.replace('ipfs://', '');
      const ipfsUrl = ipfsHash.startsWith('ipfs/') ? 
        `https://ipfs.io/${ipfsHash}` : 
        `https://ipfs.io/ipfs/${ipfsHash}`;
      
      const response = await fetch(ipfsUrl).catch(err => null);
      if (response) {
        metadata = await response.json().catch(err => null);
      }
    } else if (tokenURI.startsWith('http')) {
      const response = await fetch(tokenURI).catch(err => null);
      if (response) {
        metadata = await response.json().catch(err => null);
      }
    }
    
    if (!metadata) return;
    
    if (metadata.name) {
      auction.nftName = metadata.name;
    }
    
    if (metadata.image) {
      if (metadata.image.startsWith('ipfs://')) {
        const imageHash = metadata.image.replace('ipfs://', '');
        auction.imageUrl = imageHash.startsWith('ipfs/') ? 
          `https://ipfs.io/${imageHash}` : 
          `https://ipfs.io/ipfs/${imageHash}`;
      } else {
        auction.imageUrl = metadata.image;
      }
    }
    
    // Actualizar el carousel con la nueva imagen y nombre
    updateCarouselItem(auction);
    
  } catch (error) {
    console.warn(`Error loading image for auction #${auction.auctionId}:`, error);
  }
}

// Función para actualizar un elemento específico del carousel
function updateCarouselItem(auction) {
  const tickerItems = document.querySelectorAll('.ticker-item');
  
  for (const item of tickerItems) {
    const auctionCard = item.querySelector('.auction-carousel-card');
    if (!auctionCard) continue;
    
    // Verificar si este item corresponde a la subasta que queremos actualizar
    if (auctionCard.getAttribute('onclick') === `showAuctionDetails(${auction.auctionId})`) {
      // Actualizar título
      const titleElement = auctionCard.querySelector('.carousel-title');
      if (titleElement) titleElement.textContent = auction.nftName;
      
      // Actualizar imagen
      const imgElement = auctionCard.querySelector('img');
      if (imgElement) imgElement.src = auction.imageUrl;
    }
  }
}

// Inicializar el contrato para lectura (independiente de la wallet)
function initReadOnlyContract() {
  if (!readOnlyProvider || !readOnlyAuctionContract) {
    console.log("Inicializando contrato para lectura...");
    readOnlyProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
    readOnlyAuctionContract = new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, readOnlyProvider);
    console.log("Contrato inicializado para lectura.");
  }
}

// Iniciar el ticker carousel inmediatamente al cargar la página
window.addEventListener('load', () => {
  console.log("Iniciando carga del ticker carousel...");
  
  // Inicializar el contrato para lectura sin esperar la conexión de la wallet
  initReadOnlyContract();
});

// Inicializar el carousel al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar el carousel inmediatamente con alta prioridad
  console.log("Iniciando carga del ticker carousel (DOM Content)...");
  
  // Ejecutar inmediatamente, sin esperar otras operaciones
  setTimeout(() => {
    // Inicializar el contrato para lectura sin esperar la conexión de la wallet
    initReadOnlyContract();
    
    console.log("Ticker carousel inicializado correctamente");
  }, 0);
});

// Function to update the carousel
function updateAuctionCarousel() {
  loadAuctionsForCarousel().then(auctions => {
    const tickerContainer = document.getElementById('auction-carousel-items');
    if (!tickerContainer) {
      console.warn("Ticker container not found");
      return;
    }
    
    // Si no hay subastas, mostrar mensaje de carga
    if (auctions.length === 0) {
      tickerContainer.innerHTML = `
        <div class="ticker-item">
          <div class="auction-carousel-card">
            <div class="d-flex align-items-center justify-content-center" style="min-width: 250px;">
              <div class="loading-spinner me-2"></div>
              <p class="mb-0">Loading active auctions...</p>
            </div>
          </div>
        </div>
      `;
      return;
    }
    
    // Comprobar si hay nuevas subastas (comparando con el último conjunto)
    const currentAuctionIds = auctions.map(a => a.auctionId);
    const hasNewAuctions = !arraysEqual(currentAuctionIds, lastAuctionIds);
    
    // Si hay cambios o es la primera carga, actualizar el contenido
    if (hasNewAuctions || lastAuctionIds.length === 0) {
      console.log("Nuevas subastas detectadas, actualizando ticker");
      
      // Actualizar el último conjunto de IDs
      lastAuctionIds = [...currentAuctionIds];
      
      // Generate HTML for ticker items
      const tickerItems = auctions.map(auction => `
        <div class="ticker-item">
          <div class="auction-carousel-card" onclick="showAuctionDetails(${auction.auctionId})">
            <div class="carousel-img-container">
              <img src="${auction.imageUrl}" alt="${auction.nftName}" onerror="this.src='https://placehold.co/400x400?text=NFT+Image'">
            </div>
            <div class="carousel-info">
              <div class="carousel-title">${auction.nftName}</div>
              <div class="carousel-price">${auction.displayPrice}</div>
              <div class="carousel-time">${auction.formattedTime}</div>
            </div>
          </div>
        </div>
      `).join('');
      
      // Clave para un loop perfecto: repetir el conjunto de elementos exactamente 2 veces
      // Esto garantiza que cuando termine el primer conjunto, el segundo ya estará posicionado
      // para crear la ilusión de un scroll infinito
      tickerContainer.innerHTML = tickerItems + tickerItems;
      
      // Reiniciar la animación para que el ticker comience nuevamente desde el principio
      // pero solo si ya estaba iniciado previamente
      if (lastAuctionIds.length > 0) {
        tickerContainer.style.animation = 'none';
        // Truco para forzar un reflow y reiniciar la animación correctamente
        void tickerContainer.offsetWidth;
        tickerContainer.style.animation = null;
      }
    } else {
      console.log("No hay nuevas subastas, manteniendo el ticker actual");
    }
  });
}

// Comparar si dos arrays tienen los mismos elementos
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

// Mostrar inmediatamente un ticker placeholder mientras se cargan los datos reales
function initPlaceholderTicker() {
  const tickerContainer = document.getElementById('auction-carousel-items');
  if (!tickerContainer) return;
  
  // Crear placeholders para mostrar inmediatamente
  const placeholders = Array(5).fill(0).map((_, i) => `
    <div class="ticker-item">
      <div class="auction-carousel-card">
        <div class="carousel-img-container placeholder-glow">
          <div class="placeholder w-100 h-100"></div>
        </div>
        <div class="carousel-info">
          <div class="carousel-title placeholder"></div>
          <div class="carousel-price placeholder"></div>
          <div class="carousel-time placeholder"></div>
        </div>
      </div>
    </div>
  `).join('');
  
  // Duplicar para efecto infinito
  tickerContainer.innerHTML = placeholders + placeholders;
  
  // Iniciar animación ticker
  startTickerAnimation(tickerContainer);
}

// Función para iniciar la animación del ticker
function startTickerAnimation(container) {
  if (!container) return;
  
  // Obtener el ancho total de todos los elementos
  const items = container.querySelectorAll('.ticker-item');
  if (items.length === 0) return;
  
  const tickerWidth = items[0].offsetWidth * (items.length / 2);
  const duration = tickerWidth / 50; // Velocidad proporcional al ancho
  
  // Establecer la animación CSS
  container.style.animation = `ticker ${duration}s linear infinite`;
  container.style.width = `${tickerWidth * 2}px`; // Duplicar para hacer loop
}

// Cargar datos básicos rápidamente y luego mejorarlos
async function loadAuctionsForCarousel() {
  // Inicializar contrato independientemente de la wallet
  if (!readOnlyProvider || !readOnlyAuctionContract) {
    try {
      readOnlyProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
      readOnlyAuctionContract = new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, readOnlyProvider);
    } catch (error) {
      console.error("Error inicializando contrato:", error);
      return [];
    }
  }
  
  try {
    // 1. Obtener rápidamente IDs de subastas
    let count, ids;
    try {
      count = await readOnlyAuctionContract.getActiveAuctionsCount();
      if (count.toNumber() === 0) return [];
      
      // Limitar a 10 subastas máximo para rendimiento
      const pageSize = Math.min(10, count.toNumber());
      ids = await readOnlyAuctionContract.getActiveAuctions(0, pageSize);
    } catch (error) {
      console.error("Error obteniendo subastas:", error);
      return [];
    }
    
    const auctionIds = ids.map(id => id.toNumber());
    if (auctionIds.length === 0) return [];
    
    // 2. Obtener detalles básicos
    let details;
    try {
      details = await readOnlyAuctionContract.getManyAuctionDetails(auctionIds);
    } catch (error) {
      console.error("Error obteniendo detalles:", error);
      return [];
    }
    
    const now = Math.floor(Date.now() / 1000);
    
    // 3. Procesar datos básicos primero (sin esperar imágenes)
    const carouselData = [];
    for (let i = 0; i < details.length; i++) {
      const auction = details[i];
      if (!auction) continue;
      
      // Verificar si es activa
      const isActive = auction.active === true || auction.active === 1;
      const endTime = auction.endTime ? parseInt(auction.endTime.toString()) : 0;
      if (!isActive || endTime <= now) continue;
      
      const auctionId = auctionIds[i];
      const nftContract = auction.nftContract || ethers.constants.AddressZero;
      const tokenId = auction.tokenId ? auction.tokenId.toString() : '0';
      const reservePrice = auction.reservePrice ? ethers.BigNumber.from(auction.reservePrice) : ethers.BigNumber.from(0);
      const highestBid = auction.highestBid ? ethers.BigNumber.from(auction.highestBid) : ethers.BigNumber.from(0);
      
      // Crear objeto con datos básicos
      const auctionItem = {
        auctionId,
        nftContract,
        tokenId,
        nftName: `NFT #${tokenId}`,
        imageUrl: 'https://placehold.co/400x400?text=Loading...',
        displayPrice: highestBid.gt(0) ? 
          `${formatAdrian(highestBid)}` : 
          `${formatAdrian(reservePrice)}`,
        timeRemaining: endTime - now,
        formattedTime: formatTimeRemaining(endTime),
        endTime,
        loaded: false // Indica que aún no se ha cargado completamente
      };
      
      carouselData.push(auctionItem);
    }
    
    return carouselData;
  } catch (error) {
    console.error("Error cargando datos para carousel:", error);
    return [];
  }
}

// Actualizar el ticker con datos básicos rápidamente, luego mejorar las imágenes
async function updateAuctionCarousel() {
  // 1. Obtener datos básicos rápidamente
  const auctions = await loadAuctionsForCarousel();
  
  const tickerContainer = document.getElementById('auction-carousel-items');
  if (!tickerContainer) return;
  
  // 2. Si no hay subastas, mantener placeholders pero con mensaje
  if (auctions.length === 0) {
    const noAuctionsItems = Array(5).fill(`
      <div class="ticker-item">
        <div class="auction-carousel-card">
          <div class="carousel-info text-center py-3">
            <div class="carousel-title">No active auctions</div>
            <div class="carousel-price">Create the first one!</div>
          </div>
        </div>
      </div>
    `).join('');
    
    tickerContainer.innerHTML = noAuctionsItems + noAuctionsItems;
    startTickerAnimation(tickerContainer);
    return;
  }
  
  // 3. Comprobar si son nuevas subastas
  const currentAuctionIds = auctions.map(a => a.auctionId);
  const hasNewAuctions = !arraysEqual(currentAuctionIds, lastAuctionIds);
  
  // 4. Actualizar ticker con datos básicos rápidamente
  if (hasNewAuctions || lastAuctionIds.length === 0) {
    lastAuctionIds = [...currentAuctionIds];
    
    // Generar HTML con placeholders para imágenes
    const tickerItems = auctions.map(auction => `
      <div class="ticker-item">
        <div class="auction-carousel-card" onclick="showAuctionDetails(${auction.auctionId})" data-auction-id="${auction.auctionId}">
          <div class="carousel-img-container">
            <img src="${auction.imageUrl}" alt="${auction.nftName}" 
                 data-nft-contract="${auction.nftContract}" 
                 data-token-id="${auction.tokenId}"
                 onerror="this.onerror=null; this.src='https://placehold.co/400x400?text=NFT+Image'">
          </div>
          <div class="carousel-info">
            <div class="carousel-title">${auction.nftName}</div>
            <div class="carousel-price">${auction.displayPrice}</div>
            <div class="carousel-time ticker-time" data-end-time="${auction.endTime}">${auction.formattedTime}</div>
          </div>
        </div>
      </div>
    `).join('');
    
    // Duplicar para efecto infinito
    tickerContainer.innerHTML = tickerItems + tickerItems;
    
    // Reiniciar animación
    startTickerAnimation(tickerContainer);
    
    // 5. Cargar imágenes en segundo plano
    loadTickerImages();
    
    // 6. Actualizar tiempos periódicamente
    startTimeUpdater();
  }
}

// Cargar imágenes del ticker de forma progresiva
async function loadTickerImages() {
  const images = document.querySelectorAll('.auction-carousel-card img[data-nft-contract]');
  if (!images.length) return;
  
  // Procesar primeras 2 imágenes inmediatamente, resto con delay
  for (let i = 0; i < images.length/2; i++) {
    const img = images[i];
    const nftContract = img.getAttribute('data-nft-contract');
    const tokenId = img.getAttribute('data-token-id');
    
    // Usar caché si existe para esta combinación de contrato/token
    const cacheKey = `${nftContract}-${tokenId}`;
    if (nftMetadataCache.has(cacheKey)) {
      const cachedData = nftMetadataCache.get(cacheKey);
      img.src = cachedData.imageUrl;
      
      // Actualizar nombre si está en mismo card
      const titleEl = img.closest('.auction-carousel-card').querySelector('.carousel-title');
      if (titleEl && cachedData.name) {
        titleEl.textContent = cachedData.name;
      }
      continue;
    }
    
    // Si no está en caché, cargar con delay progresivo
    setTimeout(() => {
      loadNFTMetadata(nftContract, tokenId).then(metadata => {
        if (!metadata) return;
        
        // Actualizar imagen
        img.src = metadata.imageUrl || img.src;
        
        // Actualizar título si es posible
        if (metadata.name) {
          const card = img.closest('.auction-carousel-card');
          if (card) {
            const titleEl = card.querySelector('.carousel-title');
            if (titleEl) titleEl.textContent = metadata.name;
          }
        }
        
        // Guardar en caché
        nftMetadataCache.set(cacheKey, metadata);
      });
    }, i * 200); // Escalonar carga cada 200ms
  }
  
  // Procesar resto de imágenes con más delay
  for (let i = Math.floor(images.length/2); i < images.length; i++) {
    setTimeout(() => {
      const img = images[i];
      const nftContract = img.getAttribute('data-nft-contract');
      const tokenId = img.getAttribute('data-token-id');
      
      const cacheKey = `${nftContract}-${tokenId}`;
      if (nftMetadataCache.has(cacheKey)) {
        const cachedData = nftMetadataCache.get(cacheKey);
        img.src = cachedData.imageUrl;
        return;
      }
      
      loadNFTMetadata(nftContract, tokenId).then(metadata => {
        if (!metadata) return;
        img.src = metadata.imageUrl || img.src;
        nftMetadataCache.set(cacheKey, metadata);
      });
    }, 500 + (i * 300)); // Mayor delay para imágenes menos prioritarias
  }
}

// Cargar metadata de NFT optimizada
async function loadNFTMetadata(nftContract, tokenId) {
  if (!nftContract || nftContract === ethers.constants.AddressZero) {
    return null;
  }
  
  try {
    const nftContractInstance = new ethers.Contract(nftContract, ERC721_ABI, readOnlyProvider);
    let tokenURI;
    
    try {
      tokenURI = await nftContractInstance.tokenURI(tokenId);
    } catch (error) {
      console.warn(`Error obteniendo tokenURI para NFT ${tokenId}:`, error);
      return null;
    }
    
    if (!tokenURI) return null;
    
    // Procesar URI según su tipo
    let metadataUrl = tokenURI;
    if (tokenURI.startsWith('ipfs://')) {
      const ipfsHash = tokenURI.replace('ipfs://', '');
      metadataUrl = ipfsHash.startsWith('ipfs/') 
        ? `https://ipfs.io/${ipfsHash}` 
        : `https://ipfs.io/ipfs/${ipfsHash}`;
    }
    
    // Forzar timeout en fetch para no bloquear
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
      const response = await fetch(metadataUrl, { 
        signal: controller.signal,
        cache: 'force-cache' // Intentar usar caché del navegador
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) return null;
      
      const metadata = await response.json();
      
      // Extraer imagen
      let imageUrl = 'https://placehold.co/400x400?text=NFT+Image';
      if (metadata.image) {
        if (metadata.image.startsWith('ipfs://')) {
          const imageHash = metadata.image.replace('ipfs://', '');
          imageUrl = imageHash.startsWith('ipfs/') 
            ? `https://ipfs.io/${imageHash}` 
            : `https://ipfs.io/ipfs/${imageHash}`;
        } else {
          imageUrl = metadata.image;
        }
      }
      
      return {
        name: metadata.name || `NFT #${tokenId}`,
        imageUrl: imageUrl,
        description: metadata.description || ''
      };
    } catch (error) {
      console.warn(`Error obteniendo metadata para NFT ${tokenId}:`, error);
      return null;
    }
  } catch (error) {
    console.warn(`Error en proceso de metadata para NFT ${tokenId}:`, error);
    return null;
  }
}

// Actualizar tiempos en el ticker
function startTimeUpdater() {
  // Limpiar intervalos anteriores
  if (window.tickerTimeUpdater) {
    clearInterval(window.tickerTimeUpdater);
  }
  
  // Actualizar cada segundo
  window.tickerTimeUpdater = setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    const timeElements = document.querySelectorAll('.ticker-time[data-end-time]');
    
    timeElements.forEach(el => {
      const endTime = parseInt(el.getAttribute('data-end-time'));
      if (!endTime) return;
      
      const remaining = endTime - now;
      if (remaining <= 0) {
        el.textContent = "Ended";
      } else {
        el.textContent = formatTimeRemaining(endTime);
      }
    });
  }, 1000);
}

// Comparar si dos arrays tienen los mismos elementos
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

// Iniciar o recalcular la animación del ticker
function startTickerAnimation() {
  const tickerContainer = document.getElementById('auction-carousel-items');
  if (!tickerContainer) return;
  
  // Obtener el ancho total de los elementos
  const items = tickerContainer.querySelectorAll('.ticker-item');
  if (items.length === 0) return;
  
  // Medir el ancho real
  let totalWidth = 0;
  items.forEach(item => {
    totalWidth += item.offsetWidth;
  });
  
  // Usar solo la mitad del ancho ya que tenemos duplicados
  const halfWidth = totalWidth / 2;
  
  // Calcular duración basada en el ancho (velocidad constante)
  // Más ancho = más tiempo para mantener velocidad percibida
  const baseDuration = 20; // segundos para una referencia de ancho
  const referenceWidth = 1000; // ancho de referencia en px
  const duration = Math.max(10, (halfWidth / referenceWidth) * baseDuration);
  
  // Aplicar animación CSS
  tickerContainer.style.animationDuration = `${duration}s`;
  tickerContainer.style.animationName = 'ticker';
  tickerContainer.style.animationTimingFunction = 'linear';
  tickerContainer.style.animationIterationCount = 'infinite';
}

// Debug función específica para relist
async function debugRelistAuction(auctionId) {
  console.log("=== INICIO DE DIAGNÓSTICO DE RELISTING ===");
  
  if (!currentAccount) {
    console.error("No hay cuenta conectada");
    return;
  }
  
  try {
    // Obtener los detalles de la subasta
    console.log(`Obteniendo detalles de la subasta #${auctionId}...`);
    
    if (!readOnlyAuctionContract) {
      console.error("Contrato de solo lectura no inicializado");
      return;
    }
    
    const auctionDetails = await readOnlyAuctionContract.getManyAuctionDetails([auctionId]);
    if (!auctionDetails || auctionDetails.length === 0) {
      console.error("No se pudo obtener los detalles de la subasta");
      return;
    }
    
    const auction = auctionDetails[0];
    console.log("Detalles de la subasta:", {
      nftContract: auction.nftContract,
      tokenId: auction.tokenId.toString(),
      seller: auction.seller,
      reservePrice: ethers.utils.formatEther(auction.reservePrice) + " ADRIAN",
      endTime: new Date(auction.endTime.toNumber() * 1000).toLocaleString(),
      highestBidder: auction.highestBidder,
      highestBid: ethers.utils.formatEther(auction.highestBid) + " ADRIAN",
      active: auction.active,
      finalized: auction.finalized
    });
    
    // Comprobar si la subasta cumple con las condiciones para relist
    const isActive = auction.active;
    const isFinalized = auction.finalized;
    const hasNoWinner = auction.highestBidder === ethers.constants.AddressZero || 
                         auction.highestBid.lt(auction.reservePrice);
    const isSeller = auction.seller.toLowerCase() === currentAccount.toLowerCase();
    
    console.log("Estado para relisting:", {
      isActive,
      isFinalized,
      hasNoWinner,
      isSeller
    });
    
    // Determinar si esta subasta es elegible para relisting
    const canRelist = !isActive && isFinalized && hasNoWinner && isSeller;
    console.log(`Esta subasta ${canRelist ? 'ES' : 'NO ES'} elegible para relisting`);
    
    // Si no es elegible, mostrar la razón
    if (!canRelist) {
      if (isActive) console.error("La subasta aún está activa");
      if (!isFinalized) console.error("La subasta no está finalizada");
      if (!hasNoWinner) console.error("La subasta ya tiene un ganador");
      if (!isSeller) console.error("No eres el vendedor de esta subasta");
    }
    
    // Verificar si el NFT sigue en el contrato
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      const nftContract = new ethers.Contract(auction.nftContract, ERC721_ABI, signer);
      const nftOwner = await nftContract.ownerOf(auction.tokenId);
      
      console.log(`Propietario actual del NFT: ${nftOwner}`);
      console.log(`¿El contrato posee el NFT?: ${nftOwner.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()}`);
      
      if (nftOwner.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
        console.error("El NFT ya no está en posesión del contrato de subastas");
      }
    } catch (error) {
      console.error("Error al verificar la propiedad del NFT:", error);
    }
    
  } catch (error) {
    console.error("Error en diagnóstico de relisting:", error);
  }
  
  console.log("=== FIN DE DIAGNÓSTICO DE RELISTING ===");
}

// Nueva función para formatear cantidades ADRIAN
function formatAdrian(amount) {
  // amount puede ser string, number o BigNumber
  let num = 0;
  try {
    if (typeof amount === 'string') {
      num = parseFloat(amount);
    } else if (typeof amount === 'object' && amount._isBigNumber) {
      num = parseFloat(ethers.utils.formatUnits(amount, 18));
    } else {
      num = Number(amount);
    }
  } catch (e) {
    num = 0;
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $ADRIAN';
}

// Función para cargar y mostrar el historial de pujas en la página de detalles
async function loadBidHistory(auctionId) {
  console.log(`Loading bid history for auction #${auctionId}...`);
  
  // Crear un contenedor para el historial de pujas si no existe
  if (!document.getElementById('bid-history-container')) {
    console.log("Creating bid history section...");
    
    // Buscar el punto de inserción después de los detalles principales
    const detailsContainer = document.getElementById('auction-details-container');
    
    if (!detailsContainer) {
      console.warn("Cannot find auction details container");
      return;
    }
    
    // Crear y añadir la sección de historial
    const historySection = document.createElement('div');
    historySection.className = 'card mt-4';
    historySection.innerHTML = `
      <div class="section-title">Bid History</div>
      <div id="bid-history-container">
        <div id="loading-history" class="text-center p-4">
          <div class="loading-spinner"></div>
          <p class="mt-3">Loading bid history...</p>
        </div>
        <div id="bid-history-list" class="list-group"></div>
        <div id="no-bids-message" class="alert alert-info mt-3" style="display: none;">
          No bids have been placed on this auction yet.
        </div>
      </div>
    `;
    
    detailsContainer.appendChild(historySection);
  }
  
  try {
    // Verificar que tenemos los contratos inicializados
    if (!readOnlyAuctionContract) {
      console.error("Auction contract not initialized");
      document.getElementById('loading-history').style.display = 'none';
      document.getElementById('no-bids-message').textContent = "Could not load bid history. Try refreshing the page.";
      document.getElementById('no-bids-message').style.display = 'block';
      return;
    }
    
    // Obtener los detalles de la subasta
    const auctionDetails = await readOnlyAuctionContract.getManyAuctionDetails([auctionId]);
    
    if (!auctionDetails || auctionDetails.length === 0) {
      console.warn("Could not fetch auction details");
      document.getElementById('loading-history').style.display = 'none';
      document.getElementById('no-bids-message').textContent = "Could not load auction data.";
      document.getElementById('no-bids-message').style.display = 'block';
      return;
    }
    
    const auction = auctionDetails[0];
    const highestBidder = auction.highestBidder;
    const highestBid = auction.highestBid ? ethers.BigNumber.from(auction.highestBid) : ethers.BigNumber.from(0);
    
    // Si no hay ofertas, mostrar mensaje
    if (highestBid.isZero() || highestBidder === ethers.constants.AddressZero) {
      document.getElementById('loading-history').style.display = 'none';
      document.getElementById('no-bids-message').style.display = 'block';
      return;
    }
    
    // Nota: El contrato actual no tiene una función específica para obtener todo el historial de pujas
    // Solo podemos ver la puja más alta, por lo que mostraremos esa
    const bidHistoryList = document.getElementById('bid-history-list');
    bidHistoryList.innerHTML = '';
    
    // Crear un elemento para la puja más alta
    const bidItem = document.createElement('div');
    bidItem.className = 'list-group-item d-flex justify-content-between align-items-center';
    
    // Formatear timestamp de cuando se hizo la puja
    // Como no tenemos la información exacta, usamos "Current winning bid"
    
    bidItem.innerHTML = `
      <div>
        <div class="fw-bold">${formatAddress(highestBidder)}</div>
        <small class="text-muted">Current winning bid</small>
      </div>
      <span class="badge bg-primary rounded-pill">${formatAdrian(highestBid)}</span>
    `;
    
    bidHistoryList.appendChild(bidItem);
    
    // Mostrar elemento de historial y ocultar loading
    document.getElementById('loading-history').style.display = 'none';
    bidHistoryList.style.display = 'block';
    
    console.log("Bid history loaded successfully");
    
  } catch (error) {
    console.error("Error loading bid history:", error);
    document.getElementById('loading-history').style.display = 'none';
    document.getElementById('no-bids-message').textContent = "Error loading bid history. Please try again later.";
    document.getElementById('no-bids-message').style.display = 'block';
  }
}

// Modificar la función showAuctionDetails para llamar a loadBidHistory
async function showAuctionDetails(auctionId) {
  console.log(`Loading auction details for ID: ${auctionId}`);
  
  // Si estamos en la página de detalles, actualizar la URL sin recargar
  // Si no, redirigir a la página de detalles
  const isDetailsPage = window.location.href.includes('auctiondetails.html');
  
  if (isDetailsPage) {
    // Actualizar URL sin recargar
    const newUrl = `auctiondetails.html?id=${auctionId}`;
    window.history.pushState({ auctionId }, '', newUrl);
    
    // Cargar los detalles de la subasta
    await loadAuctionDetailsPage(auctionId);
    
    // Cargar el historial de pujas
    await loadBidHistory(auctionId);
  } else {
    // Redirigir a la página de detalles
    window.location.href = `auctiondetails.html?id=${auctionId}`;
  }
}

// Function to load auction details page based on URL parameter
async function loadAuctionDetailsPage(auctionId = null) {
  console.log("Loading auction details page...");
  
  try {
    // If no auctionId provided, try to get from URL
    if (!auctionId) {
      const urlParams = new URLSearchParams(window.location.search);
      auctionId = urlParams.get('id');
      
      if (!auctionId) {
        document.getElementById('loading-auction').style.display = 'none';
        document.getElementById('error-message').innerHTML = "No auction ID specified";
        document.getElementById('error-container').style.display = 'block';
        return;
      }
    }
    
    console.log(`Loading details for auction #${auctionId}`);
    
    // Make sure auction contract is available
    if (!readOnlyAuctionContract) {
      console.error("Auction contract not initialized");
      
      // Attempt manual initialization as fallback
      await initializeContract();
      
      if (!readOnlyAuctionContract) {
        document.getElementById('loading-auction').style.display = 'none';
        document.getElementById('error-message').innerHTML = "Could not connect to blockchain. Please try again later.";
        document.getElementById('error-container').style.display = 'block';
        return;
      }
    }
    
    // Fetch auction details
    const auctionDetails = await readOnlyAuctionContract.getManyAuctionDetails([auctionId]);
    
    if (!auctionDetails || auctionDetails.length === 0) {
      document.getElementById('loading-auction').style.display = 'none';
      document.getElementById('error-message').innerHTML = `Auction #${auctionId} not found`;
      document.getElementById('error-container').style.display = 'block';
      return;
    }
    
    // Process auction data
    const auction = auctionDetails[0];
    console.log(`Raw auction data for #${auctionId}:`, auction);
    
    // CRITICAL FIX - Extract and convert auction data safely
    const nftContract = auction.nftContract || ethers.constants.AddressZero;
    const tokenId = auction.tokenId ? ethers.BigNumber.from(auction.tokenId).toString() : '0';
    const seller = auction.seller || ethers.constants.AddressZero;
    const reservePrice = auction.reservePrice ? ethers.BigNumber.from(auction.reservePrice) : ethers.BigNumber.from(0);
    const highestBid = auction.highestBid ? ethers.BigNumber.from(auction.highestBid) : ethers.BigNumber.from(0);
    const highestBidder = auction.highestBidder || ethers.constants.AddressZero;
    
    // CRITICAL FIX - Handle endTime correctly
    let endTime;
    try {
      endTime = auction.endTime ? parseInt(auction.endTime.toString()) : 0;
      console.log(`Converted endTime: ${endTime}`);
    } catch (err) {
      console.error("Error converting endTime:", err);
      endTime = 0;
    }
    
    // CRITICAL FIX - Handle boolean values
    const isActive = auction.active === true || auction.active === 1;
    const isFinalized = auction.finalized === true || auction.finalized === 1;
    
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = endTime - now;
    
    // Check if user is the seller or highest bidder
    const isOwner = currentAccount && seller.toLowerCase() === currentAccount.toLowerCase();
    const isHighestBidder = currentAccount && highestBidder.toLowerCase() === currentAccount.toLowerCase();
    
    // Check if user has bid but is not the highest bidder
    let hasUserBid = false;
    let isOutbid = false;
    
    if (currentAccount) {
      try {
        // Check if user has bid on this auction
        const userBids = await readOnlyAuctionContract.getUserBids(currentAccount);
        hasUserBid = userBids.some(bid => bid.toString() === auctionId.toString());
        
        // User has bid but is not highest bidder = outbid
        isOutbid = hasUserBid && !isHighestBidder && 
                   highestBidder !== ethers.constants.AddressZero;
        
        console.log(`User bid status:`, { hasUserBid, isHighestBidder, isOutbid });
      } catch (error) {
        console.warn("Could not check user bid status:", error);
      }
    }
    
    // Try to fetch NFT image from chain if possible
    let imageUrl = 'https://placehold.co/600x600?text=NFT+Image';
    let nftName = `NFT #${tokenId}`;
    
    // Improved image loading
    if (nftContract && nftContract !== ethers.constants.AddressZero) {
      try {
        console.log(`Fetching metadata for NFT at contract ${nftContract}, token ID ${tokenId}`);
        
        // Create a temporary NFT contract to get the tokenURI
        const nftContractInstance = new ethers.Contract(nftContract, ERC721_ABI, readOnlyProvider);
        
        try {
          const tokenURI = await nftContractInstance.tokenURI(tokenId);
          console.log(`Token URI:`, tokenURI);
          
          if (tokenURI) {
            // Try to fetch metadata
            let metadata = null;
            
            if (tokenURI.startsWith('ipfs://')) {
              const ipfsHash = tokenURI.replace('ipfs://', '');
              let ipfsUrl;
              if (ipfsHash.startsWith('ipfs/')) {
                ipfsUrl = `https://ipfs.io/${ipfsHash}`;
              } else {
                ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
              }
              
              try {
                console.log(`Fetching metadata from IPFS:`, ipfsUrl);
                const response = await fetch(ipfsUrl);
                metadata = await response.json();
              } catch (error) {
                console.warn("Error fetching metadata from IPFS:", error);
              }
            } else if (tokenURI.startsWith('http')) {
              try {
                console.log(`Fetching metadata from HTTP:`, tokenURI);
                const response = await fetch(tokenURI);
                metadata = await response.json();
              } catch (error) {
                console.warn("Error fetching HTTP metadata:", error);
              }
            }
            
            if (metadata) {
              console.log("Metadata fetched:", metadata);
              
              if (metadata.name) {
                nftName = metadata.name;
              }
              
              if (metadata.image) {
                if (metadata.image.startsWith('ipfs://')) {
                  const imageHash = metadata.image.replace('ipfs://', '');
                  if (imageHash.startsWith('ipfs/')) {
                    imageUrl = `https://ipfs.io/${imageHash}`;
                  } else {
                    imageUrl = `https://ipfs.io/ipfs/${imageHash}`;
                  }
                } else {
                  imageUrl = metadata.image;
                }
                console.log(`Image URL:`, imageUrl);
              }
            }
          }
        } catch (err) {
          console.warn(`Error fetching tokenURI:`, err);
        }
      } catch (error) {
        console.warn(`Error loading NFT image for auction #${auctionId}:`, error);
      }
    }
    
    // Update OG tags for sharing
    const ogTitle = document.getElementById('og-title');
    const ogDesc = document.getElementById('og-description');
    const ogImage = document.getElementById('og-image');
    const ogUrl = document.getElementById('og-url');
    
    const twitterTitle = document.getElementById('twitter-title');
    const twitterDesc = document.getElementById('twitter-description');
    const twitterImage = document.getElementById('twitter-image');
    
    if (ogTitle) ogTitle.setAttribute('content', `${nftName} - Adrian Auction`);
    if (ogDesc) ogDesc.setAttribute('content', `Bid on this NFT auction featuring ${nftName} with a reserve price of ${formatAdrian(reservePrice)}. Current bid: ${formatAdrian(highestBid)}`);
    if (ogImage) ogImage.setAttribute('content', imageUrl);
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);
    
    if (twitterTitle) twitterTitle.setAttribute('content', `${nftName} - Adrian Auction`);
    if (twitterDesc) twitterDesc.setAttribute('content', `Bid on this NFT auction featuring ${nftName} with a reserve price of ${formatAdrian(reservePrice)}. Current bid: ${formatAdrian(highestBid)}`);
    if (twitterImage) twitterImage.setAttribute('content', imageUrl);
    
    // Set page title
    document.title = `${nftName} - Adrian Auction`;
    
    // Create status badges
    let statusBadges = '';
    
    if (isActive) {
      if (endingSoon) {
        statusBadges += '<span class="auction-status status-ending">🔥 Ending Soon</span>';
      } else {
        statusBadges += '<span class="auction-status status-live">🔄 Active</span>';
      }
      
      if (reserveMet) {
        statusBadges += '<span class="auction-status status-reserve-met">✅ Reserve Met</span>';
      }
      
      if (isHighestBidder) {
        statusBadges += '<span class="auction-status status-live">🏆 You are Winning</span>';
      }
      
      // NEW: Add Outbid badge
      if (isOutbid) {
        statusBadges += '<span class="auction-status status-outbid" style="background-color: #ffcccb; color: #dc3545;">⚠️ You\'ve Been Outbid</span>';
      }
    } else {
      if (isFinalized) {
        if (hasWinner) {
          statusBadges += '<span class="auction-status">✅ Ended with Winner</span>';
        } else {
          statusBadges += '<span class="auction-status">❌ Ended without Winner</span>';
        }
      } else {
        statusBadges += '<span class="auction-status">⏸️ Inactive</span>';
      }
    }
    
    if (isOwner) {
      statusBadges += '<span class="auction-status">👑 Your Auction</span>';
    }
    
    // Populate auction details in the page
    document.getElementById('detail-nft-image').src = imageUrl;
    document.getElementById('detail-title').textContent = nftName;
    document.getElementById('detail-status-badges').innerHTML = statusBadges;
    document.getElementById('detail-auction-id').textContent = `#${auctionId}`;
    document.getElementById('detail-contract').textContent = formatAddress(nftContract);
    document.getElementById('detail-token-id').textContent = tokenId;
    document.getElementById('detail-seller').textContent = formatAddress(seller);
    document.getElementById('detail-reserve-price').textContent = `${formatAdrian(reservePrice)}`;
    document.getElementById('detail-current-bid').textContent = highestBid.gt(0) ? `${formatAdrian(highestBid)}` : "No bids yet";
    document.getElementById('detail-highest-bidder').textContent = highestBidder !== ethers.constants.AddressZero ? formatAddress(highestBidder) : "No bidder yet";
    
    // Time display
    if (isActive && timeRemaining > 0) {
      document.getElementById('detail-time-label').textContent = "Time Remaining";
      document.getElementById('detail-time-value').textContent = formatTimeRemaining(endTime);
      
      // Set up time counter update
      const timeCounterElement = document.getElementById('detail-time-value');
      
      // Clear any existing interval
      if (window.timeUpdateInterval) {
        clearInterval(window.timeUpdateInterval);
      }
      
      // Update time every second
      window.timeUpdateInterval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = endTime - now;
        
        if (timeRemaining <= 0) {
          clearInterval(window.timeUpdateInterval);
          timeCounterElement.textContent = "Auction ended";
          
          // Reload page to update status
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        } else {
          timeCounterElement.textContent = formatTimeRemaining(endTime);
        }
      }, 1000);
    } else {
      document.getElementById('detail-time-label').textContent = "Status";
      if (isActive) {
        document.getElementById('detail-time-value').textContent = "Active";
      } else if (isFinalized) {
        document.getElementById('detail-time-value').textContent = "Finalized";
      } else {
        document.getElementById('detail-time-value').textContent = "Inactive";
      }
    }
    
    // Create action buttons based on auction state and user role
    let actionButtons = '';
    
    if (isActive && !isFinalized) {
      if (isOwner && endTime <= now) {
        actionButtons += `<button class="btn-action w-100 mb-2" onclick="finalizeAuction(${auctionId})">Finalize Auction</button>`;
      } else if (isOwner && highestBid.isZero()) {
        actionButtons += `<button class="btn-action w-100 mb-2" onclick="cancelAuction(${auctionId})">Cancel Auction</button>`;
      } else if (!isOwner) {
        // NEW: Custom button text for outbid users
        const buttonText = isOutbid ? "Outbid! Bid Again" : "Place Bid";
        const buttonClass = isOutbid ? "btn-action w-100 mb-2 btn-danger" : "btn-action w-100 mb-2";
        
        actionButtons += `<button class="${buttonClass}" onclick="openBidModal(${auctionId}, '${highestBid}', '${reservePrice}', '${nftContract}', ${tokenId})">${buttonText}</button>`;
      }
    } else if (isOwner && !isActive && isFinalized && 
              (auction.highestBidder === ethers.constants.AddressZero || highestBid.lt(reservePrice))) {
      // Show relist button only when:
      // 1. User is the owner of the auction
      // 2. Auction is not active
      // 3. Auction is finalized
      // 4. Auction had no bidder or reserve price wasn't met
      actionButtons += `<button class="btn-action w-100 mb-2" onclick="showRelistModal(${auctionId})">Relist</button>`;
    }
    
    // Add share button to all auctions
    actionButtons += `<button class="btn-action w-100 mb-2" onclick="shareAuction(${auctionId}, '${encodeURIComponent(nftName)}')">Share Auction</button>`;
    
    // Add button to go back to all auctions
    actionButtons += `<a href="index.html" class="btn-secondary w-100">All Auctions</a>`;
    
    document.getElementById('detail-action-container').innerHTML = actionButtons;
    
    // Hide loading indicator and show auction details
    document.getElementById('loading-auction').style.display = 'none';
    document.getElementById('auction-details-container').style.display = 'block';
    
    // Load bid history
    await loadBidHistory(auctionId);
    
  } catch (error) {
    console.error("Error loading auction details:", error);
    document.getElementById('loading-auction').style.display = 'none';
    document.getElementById('error-message').innerHTML = "Error loading auction details. Please try again later.";
    document.getElementById('error-container').style.display = 'block';
  }
}