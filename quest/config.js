// Quest Configuration
// Contract addresses and constants

const QUEST_CONFIG = {
  // Contract addresses
  PUNKQUEST_ADDRESS: "0xb253c1C784bA13ca1C45daB6777210a83cEA4f73",
  TOKEN_ADDRESS: "0x7E99075Ce287F1cF8cBCAaa6A1C7894e404fD7Ea",
  NFT_ADDRESS: "0x79BE8AcdD339C7b92918fcC3fd3875b5Aaad7566",
  MULTICALL3_ADDRESS: "0xcA11bde05977b3631167028862bE2a173976CA11", // Multicall3 on Base
  
  // Pool configuration
  POOL_MAX_AMOUNT: 10_000_000, // 10M $ADRIAN
  POOL_UPDATE_INTERVAL: 30000, // 30 seconds
  
  // Color thresholds (as percentage of max)
  POOL_GREEN_THRESHOLD: 50, // >50% = green
  POOL_YELLOW_THRESHOLD: 10, // 10-50% = yellow
  // <10% = red
  
  // Minimal ABIs
  TOKEN_ABI: [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ],
  
  NFT_ABI: [
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function ownerOf(uint256 tokenId) external view returns (address)"
  ],
  
  QUEST_ABI: [
    "function stake(uint256 tokenId) external",
    "function unstake(uint256 tokenId) external",
    "function claimRewards(uint256 tokenId) external",
    "function getTokenDetailedInfo(uint256 tokenId) view returns (uint256, uint256, uint256, uint256, uint256, int256, uint256)",
    "function getTokenMultiplierBreakdown(uint256 tokenId) view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256)",
    "function getTokenRewardBreakdown(uint256 tokenId) view returns (uint256, uint256, uint256, int256, uint256)",
    "function activationFee() view returns (uint256)",
    "function exitFee() view returns (uint256)",
    "function claimFee() view returns (uint256)",
    "function totalStaked() view returns (uint256)",
    "function stakes(uint256) view returns (uint256 stakeStart, uint256 lastClaim)"
  ],
  
  MULTICALL3_ABI: [
    "function aggregate3((address target, bool allowFailure, bytes callData)[] calls) external view returns ((bool success, bytes returnData)[] returnData)"
  ],
  
  // RPC URLs (fallback to public if not set)
  RPC_URL: null // Will use public Base RPC if not set
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.QUEST_CONFIG = QUEST_CONFIG;
}

