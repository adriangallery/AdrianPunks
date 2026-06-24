// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

/// @title FiftyFifty - Split de Ingresos 50/50 con Migración Segura de Wallets
/// @notice Contrato para repartir ingresos (ETH y ERC20) a partes iguales entre artista y dev
/// Cualquiera de los dos puede activar el reparto y automáticamente recibe 50% y envía 50% al otro
/// Incluye sistema two-step para migrar wallets de forma segura
/// @dev Implementa ReentrancyGuard y patrón CEI para máxima seguridad
contract FiftyFifty {
    
    address public artist;
    address public dev;
    
    // Two-Step Transfer variables
    address public proposedArtist;
    address public proposedDev;
    uint256 public artistProposalExpiry;
    uint256 public devProposalExpiry;
    uint256 public constant PROPOSAL_VALIDITY = 7 days;
    
    // ReentrancyGuard implementation
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;
    
    // Eventos existentes
    event ETHDistributed(address indexed initiator, uint256 artistAmount, uint256 devAmount);
    event TokenDistributed(address indexed token, address indexed initiator, uint256 artistAmount, uint256 devAmount);
    event ETHReceived(address indexed sender, uint256 amount);
    
    // Eventos para Two-Step Transfer
    event ArtistProposed(address indexed currentArtist, address indexed proposedArtist, uint256 expiry);
    event ArtistUpdated(address indexed oldArtist, address indexed newArtist);
    event ArtistProposalCancelled(address indexed artist);
    event DevProposed(address indexed currentDev, address indexed proposedDev, uint256 expiry);
    event DevUpdated(address indexed oldDev, address indexed newDev);
    event DevProposalCancelled(address indexed dev);

    // Modificadores
    modifier onlyAuthorized() {
        require(msg.sender == artist || msg.sender == dev, "Not authorized");
        _;
    }
    
    modifier onlyArtist() {
        require(msg.sender == artist, "Only artist");
        _;
    }
    
    modifier onlyDev() {
        require(msg.sender == dev, "Only dev");
        _;
    }
    
    modifier nonReentrant() {
        require(_status != ENTERED, "ReentrancyGuard: reentrant call");
        _status = ENTERED;
        _;
        _status = NOT_ENTERED;
    }
    
    constructor(address _artist, address _dev) {
        require(_artist != address(0) && _dev != address(0), "Invalid addresses");
        require(_artist != _dev, "Artist and dev must be different");
        artist = _artist;
        dev = _dev;
        _status = NOT_ENTERED;
    }
    
    // ========== FUNCIONALIDAD ORIGINAL (SIN CAMBIOS) ==========
    
    /// @notice Función para recibir ETH - emite evento para tracking
    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }
    
    /// @notice Retira y distribuye todo el ETH del contrato 50/50
    /// Implementa patrón CEI (Check-Effects-Interactions) para prevenir reentrancy
    function withdrawETH() external onlyAuthorized nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH available");
        
        // EFFECTS: Calcular distribución antes de interacciones externas
        uint256 halfAmount = balance / 2;
        uint256 remainingAmount = balance - halfAmount; // Remainder va al iniciador
        
        address recipient = (msg.sender == artist) ? dev : artist;
        
        // INTERACTIONS: Transferencias externas al final.
        // Sin límite de gas (el patrón CEI + nonReentrant ya protegen contra reentrancy);
        // un stipend de 2300 gas haría fallar el envío a wallets de contrato (Safe, etc.)
        // y dejaría los ingresos atascados, ya que artist/dev pueden ser multisigs.
        (bool successRecipient, ) = payable(recipient).call{value: halfAmount}("");
        require(successRecipient, "Transfer to recipient failed");

        (bool successInitiator, ) = payable(msg.sender).call{value: remainingAmount}("");
        require(successInitiator, "Transfer to initiator failed");
        
        // Emitir evento después de transferencias exitosas
        if (msg.sender == artist) {
            emit ETHDistributed(msg.sender, remainingAmount, halfAmount);
        } else {
            emit ETHDistributed(msg.sender, halfAmount, remainingAmount);
        }
    }
    
    /// @notice Retira y distribuye todos los tokens ERC20 del contrato 50/50
    /// @param tokenAddress Dirección del token ERC20 a distribuir
    function withdrawToken(address tokenAddress) external onlyAuthorized nonReentrant {
        require(tokenAddress != address(0), "Invalid token address");
        
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens available");
        
        // EFFECTS: Calcular distribución antes de interacciones externas
        uint256 halfAmount = balance / 2;
        uint256 remainingAmount = balance - halfAmount; // Remainder va al iniciador
        
        address recipient = (msg.sender == artist) ? dev : artist;
        
        // INTERACTIONS: Transferencias de tokens al final
        require(token.transfer(recipient, halfAmount), "Transfer to recipient failed");
        require(token.transfer(msg.sender, remainingAmount), "Transfer to initiator failed");
        
        // Emitir evento después de transferencias exitosas
        if (msg.sender == artist) {
            emit TokenDistributed(tokenAddress, msg.sender, remainingAmount, halfAmount);
        } else {
            emit TokenDistributed(tokenAddress, msg.sender, halfAmount, remainingAmount);
        }
    }
    
    /// @notice Consulta el balance de ETH del contrato
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /// @notice Consulta el balance de un token ERC20 específico
    function getTokenBalance(address tokenAddress) external view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }
    
    /// @notice Devuelve información básica del contrato
    function getInfo() external view returns (
        address _artist, 
        address _dev, 
        uint256 ethBalance
    ) {
        return (artist, dev, address(this).balance);
    }
    
    /// @notice Función de verificación para confirmar que el contrato puede operar
    function isOperational() external view returns (bool) {
        return artist != address(0) && dev != address(0) && artist != dev;
    }
    
    // ========== NUEVA FUNCIONALIDAD: TWO-STEP TRANSFER ==========
    
    /// @notice PASO 1: El artista actual propone una nueva dirección
    /// @param newArtist Dirección de la nueva wallet del artista
    function proposeNewArtist(address newArtist) external onlyArtist {
        require(newArtist != address(0), "Invalid address");
        require(newArtist != artist, "Same as current artist");
        require(newArtist != dev, "Cannot be dev address");
        
        proposedArtist = newArtist;
        artistProposalExpiry = block.timestamp + PROPOSAL_VALIDITY;
        
        emit ArtistProposed(msg.sender, newArtist, artistProposalExpiry);
    }
    
    /// @notice PASO 2: La nueva dirección acepta convertirse en artista
    function acceptArtistRole() external {
        require(msg.sender == proposedArtist, "Not the proposed artist");
        require(block.timestamp <= artistProposalExpiry, "Proposal expired");
        require(msg.sender != dev, "Cannot be dev address");
        
        address oldArtist = artist;
        artist = msg.sender;
        
        // Limpiar propuesta
        proposedArtist = address(0);
        artistProposalExpiry = 0;
        
        emit ArtistUpdated(oldArtist, msg.sender);
    }
    
    /// @notice Cancela una propuesta de cambio de artista pendiente
    function cancelArtistProposal() external onlyArtist {
        require(proposedArtist != address(0), "No active proposal");
        
        proposedArtist = address(0);
        artistProposalExpiry = 0;
        
        emit ArtistProposalCancelled(msg.sender);
    }
    
    /// @notice PASO 1: El dev actual propone una nueva dirección
    /// @param newDev Dirección de la nueva wallet del dev
    function proposeNewDev(address newDev) external onlyDev {
        require(newDev != address(0), "Invalid address");
        require(newDev != dev, "Same as current dev");
        require(newDev != artist, "Cannot be artist address");
        
        proposedDev = newDev;
        devProposalExpiry = block.timestamp + PROPOSAL_VALIDITY;
        
        emit DevProposed(msg.sender, newDev, devProposalExpiry);
    }
    
    /// @notice PASO 2: La nueva dirección acepta convertirse en dev
    function acceptDevRole() external {
        require(msg.sender == proposedDev, "Not the proposed dev");
        require(block.timestamp <= devProposalExpiry, "Proposal expired");
        require(msg.sender != artist, "Cannot be artist address");
        
        address oldDev = dev;
        dev = msg.sender;
        
        // Limpiar propuesta
        proposedDev = address(0);
        devProposalExpiry = 0;
        
        emit DevUpdated(oldDev, msg.sender);
    }
    
    /// @notice Cancela una propuesta de cambio de dev pendiente
    function cancelDevProposal() external onlyDev {
        require(proposedDev != address(0), "No active proposal");
        
        proposedDev = address(0);
        devProposalExpiry = 0;
        
        emit DevProposalCancelled(msg.sender);
    }
    
    // ========== FUNCIONES DE CONSULTA PARA TWO-STEP TRANSFER ==========
    
    /// @notice Consulta si hay una propuesta de artista activa y válida
    function getArtistProposal() external view returns (
        address proposed,
        uint256 expiry,
        bool isActive
    ) {
        bool active = proposedArtist != address(0) && block.timestamp <= artistProposalExpiry;
        return (proposedArtist, artistProposalExpiry, active);
    }
    
    /// @notice Consulta si hay una propuesta de dev activa y válida
    function getDevProposal() external view returns (
        address proposed,
        uint256 expiry,
        bool isActive
    ) {
        bool active = proposedDev != address(0) && block.timestamp <= devProposalExpiry;
        return (proposedDev, devProposalExpiry, active);
    }
}