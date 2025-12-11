// AdrianSwapper Contract ABI

const SWAPPER_ABI = [
  // Read Functions
  "function poolManager() view returns (address)",
  
  // Write Functions
  "function buyAdrian(uint256 amountIn) payable returns (uint256 amountOut)",
  "function sellAdrian(uint256 amountIn) returns (uint256 amountOut)",
  
  // Callback (view only for reference)
  "function unlockCallback(bytes calldata rawData) external returns (bytes memory)",
  
  // Events (for listening to transactions)
  "event SwapExecuted(address indexed user, bool indexed zeroForOne, int256 amountSpecified, int256 amount0, int256 amount1)"
];

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.SWAPPER_ABI = SWAPPER_ABI;
}

