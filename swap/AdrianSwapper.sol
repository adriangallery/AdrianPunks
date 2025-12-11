// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AdrianSwapper
 * @notice Contract para realizar swaps entre ETH y ADRIAN usando Uniswap V4
 * @dev Utiliza el flash accounting de Uniswap V4 con callbacks
 * 
 * Deployment Instructions:
 * 1. Usar Remix IDE (remix.ethereum.org)
 * 2. Compilar con Solidity 0.8.24 o superior
 * 3. Conectar MetaMask a Base Mainnet
 * 4. Deploy con constructor arg: 0x498581fF718922c3f8e6A244956aF099B2652b2b
 * 5. Verificar en BaseScan
 * 6. Copiar dirección y actualizar config.js
 * 
 * Network: Base Mainnet (Chain ID: 8453)
 * Dependencies: @uniswap/v4-core
 */

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IHooks {}

contract AdrianSwapper is IUnlockCallback {
    using CurrencyLibrary for Currency;

    // ============ Immutable Variables ============
    
    /// @notice Uniswap V4 Pool Manager on Base
    IPoolManager public immutable poolManager;
    
    // ============ Constants ============
    
    /// @notice ADRIAN token address on Base
    address constant ADRIAN = 0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea;
    
    /// @notice Hook contract address (handles 10% tax)
    address constant HOOK = 0x2546FA3eA62Ac09029b1eA1Bae00eAD9Cb2500CC;
    
    /// @notice Pool fee (0 = no pool fee, only hook tax)
    uint24 constant FEE = 0;
    
    /// @notice Tick spacing for the pool
    int24 constant TICK_SPACING = 60;
    
    /// @notice Minimum sqrt price limit (for ETH → ADRIAN swaps)
    uint160 constant MIN_SQRT_PRICE = 4295128740;
    
    /// @notice Maximum sqrt price limit (for ADRIAN → ETH swaps)
    uint160 constant MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970340;

    // ============ Structs ============
    
    /// @notice Data passed to the unlock callback
    struct SwapCallbackData {
        address sender;           // User who initiated the swap
        bool zeroForOne;          // true = ETH→ADRIAN, false = ADRIAN→ETH
        int256 amountSpecified;   // Amount to swap (negative for exactInput)
        uint256 ethValue;         // ETH value sent with transaction
    }

    // ============ Events ============
    
    /// @notice Emitted when a swap is executed
    event SwapExecuted(
        address indexed user,
        bool indexed zeroForOne,
        int256 amountSpecified,
        int256 amount0,
        int256 amount1
    );

    // ============ Constructor ============
    
    /**
     * @notice Deploy the swapper contract
     * @param _poolManager Address of Uniswap V4 PoolManager on Base
     */
    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    // ============ External Functions ============
    
    /**
     * @notice Buy ADRIAN with ETH
     * @param amountIn Amount of ETH to spend (in wei)
     * @return amountOut Amount of ADRIAN received (after 10% tax)
     * @dev User must send ETH with the transaction
     */
    function buyAdrian(uint256 amountIn) external payable returns (uint256 amountOut) {
        require(msg.value == amountIn, "ETH mismatch");
        require(amountIn > 0, "Amount must be > 0");
        
        SwapCallbackData memory data = SwapCallbackData({
            sender: msg.sender,
            zeroForOne: true,  // ETH → ADRIAN
            amountSpecified: -int256(amountIn),  // exactInput (negative)
            ethValue: msg.value
        });

        // Execute swap via unlock callback
        bytes memory result = poolManager.unlock(abi.encode(data));
        BalanceDelta delta = abi.decode(result, (BalanceDelta));
        
        // amount1 is ADRIAN, positive means we receive
        amountOut = uint256(int256(delta.amount1()));
        
        emit SwapExecuted(
            msg.sender,
            true,
            data.amountSpecified,
            delta.amount0(),
            delta.amount1()
        );
    }

    /**
     * @notice Sell ADRIAN for ETH
     * @param amountIn Amount of ADRIAN to sell
     * @return amountOut Amount of ETH received
     * @dev User must have approved this contract to spend ADRIAN
     */
    function sellAdrian(uint256 amountIn) external returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be > 0");
        
        SwapCallbackData memory data = SwapCallbackData({
            sender: msg.sender,
            zeroForOne: false,  // ADRIAN → ETH
            amountSpecified: -int256(amountIn),  // exactInput (negative)
            ethValue: 0
        });

        // Execute swap via unlock callback
        bytes memory result = poolManager.unlock(abi.encode(data));
        BalanceDelta delta = abi.decode(result, (BalanceDelta));
        
        // amount0 is ETH, positive means we receive
        amountOut = uint256(int256(delta.amount0()));
        
        emit SwapExecuted(
            msg.sender,
            false,
            data.amountSpecified,
            delta.amount0(),
            delta.amount1()
        );
    }

    // ============ Callback Functions ============
    
    /**
     * @notice Callback function called by PoolManager during unlock
     * @param rawData Encoded SwapCallbackData
     * @return Encoded BalanceDelta
     * @dev Only callable by PoolManager
     */
    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only PoolManager");

        SwapCallbackData memory data = abi.decode(rawData, (SwapCallbackData));

        // Build the PoolKey
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(address(0)),  // ETH (native)
            currency1: Currency.wrap(ADRIAN),      // ADRIAN token
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(HOOK)
        });

        // Calculate sqrt price limit based on direction
        uint160 sqrtPriceLimitX96 = data.zeroForOne 
            ? MIN_SQRT_PRICE + 1      // Buy: allow price to go down
            : MAX_SQRT_PRICE - 1;     // Sell: allow price to go up

        // Execute the swap
        BalanceDelta delta = poolManager.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: data.zeroForOne,
                amountSpecified: data.amountSpecified,
                sqrtPriceLimitX96: sqrtPriceLimitX96
            }),
            bytes("")  // No hook data needed
        );

        int256 delta0 = delta.amount0();  // ETH delta
        int256 delta1 = delta.amount1();  // ADRIAN delta

        // Settle (pay what we owe to the pool)
        if (delta0 < 0) {
            // We owe ETH to the pool
            poolManager.settle{value: uint256(-delta0)}();
        }
        if (delta1 < 0) {
            // We owe ADRIAN to the pool
            // First sync, then transfer from user, then settle
            poolManager.sync(poolKey.currency1);
            IERC20(ADRIAN).transferFrom(data.sender, address(poolManager), uint256(-delta1));
            poolManager.settle();
        }

        // Take (claim what the pool owes us)
        if (delta0 > 0) {
            // Pool owes us ETH
            poolManager.take(poolKey.currency0, data.sender, uint256(delta0));
        }
        if (delta1 > 0) {
            // Pool owes us ADRIAN
            poolManager.take(poolKey.currency1, data.sender, uint256(delta1));
        }

        return abi.encode(delta);
    }

    // ============ Receive Function ============
    
    /**
     * @notice Allow contract to receive ETH
     * @dev Needed for ETH swaps and refunds
     */
    receive() external payable {}

    // ============ View Functions ============
    
    /**
     * @notice Get the pool key for the ADRIAN/ETH pool
     * @return The PoolKey struct
     */
    function getPoolKey() external pure returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(ADRIAN),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(HOOK)
        });
    }
    
    /**
     * @notice Get contract version
     * @return Version string
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}

