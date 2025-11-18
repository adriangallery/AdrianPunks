// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Minimal interface for el contrato Punk NFT.
interface IPunkNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/*──────── ENUMS ────────*/
enum ItemType { Weapon, Armor }
enum ArmoryActionType { EquipDefault, EquipExtra, UnequipExtra, UnequipAll }
enum AdvancedArmoryActionType { EquipDefault, EquipExtra, UnequipExtra, UnequipAll }

contract PunkQuest is Ownable {
    using SafeERC20 for IERC20;

    /*──────── EXTERNAL REFS & WALLETS ────────*/
    IPunkNFT public immutable nft;
    IERC20[] public rewardTokens;
    address public feeWallet;
    address public artistWallet;
    uint256 public artistFeePercent;

    /*──────── STAKING ────────*/
    struct StakeInfo { uint256 stakeStart; uint256 lastClaim; }
    mapping(uint256 => StakeInfo) public stakes;

    uint256 public baseRewardRate;
    uint256[] public levelThresholds;
    uint256[] public levelBonuses;

    uint256 public socialMinTokens;
    uint256 public socialBoostBonus;
    uint256 public socialBoostDuration;
    uint256 public socialBoostActiveUntil;
    uint256 public totalStaked;

    uint256 public activationFee;
    uint256 public exitFee;
    uint256 public fastLevelUpgradeFee;
    uint256 public fastLevelUpgradeBonusIncrement;
    uint256 public claimFee;

    /* 🔹 Nuevo límite para fast‑bonus */
    uint256 public maxFastLevelBonus = 1e18; // 100 %

    mapping(uint256 => uint256) public tokenFastLevelBonus;
    mapping(uint256 => uint256) public tokenItemsBonus;
    mapping(uint256 => uint256) public specialTokenBoost;
    mapping(uint256 => int256)  public tokenFixedAdjustment;

    /*──────── STORE / PLANTILLAS ────────*/
    struct Item {
        uint256 price;
        uint256 bonus;
        uint256 durability;
        bool exists;
        ItemType itemType;
        bool degradable;
    }
    mapping(uint256 => Item) public items;
    uint256 public nextItemId = 1;

    mapping(address => mapping(uint256 => uint256)) public inventory;
    uint256 public totalItemsPurchased;
    uint256 public totalItemsEquipped;
    mapping(uint256 => uint256) public itemsPurchased;

    struct TokenArmory {
        uint256 weaponId;
        uint256 armorId;
        uint256 lastEventTimestamp;
        uint256[] extraItems;
    }
    mapping(uint256 => TokenArmory) public tokenArmory;

    uint256 public maxSlots = 2;
    uint256 public extraSlotCost = 10_000 * 1e18;
    mapping(uint256 => uint256) public extraSlotsPurchased;

    /*──────── EVENTOS BÁSICOS ────────*/
    struct EventDefinition {
        uint256 id;
        string name;
        int256 adjustment;
        string description;
    }
    mapping(uint256 => EventDefinition) public eventDefinitions;
    uint256 public nextEventId = 1;
    uint256 public eventCooldown = 1 days;
    uint256 public eventChance  = 20;          // 20 % por defecto
    uint256 public positiveEventBonus = 1e17;  // +10 %
    uint256 public negativeEventPenalty = 1e17;// −10 %
    bool    public eventsPaused = false;
    uint256 private randomNonce;

    /*──────── INSTANCIAS AVANZADAS ────────*/
    struct OwnedItem {
        uint256 instanceId;
        uint256 templateId;
        uint256 durability;
        bool degraded;
    }
    mapping(address => OwnedItem[]) public ownedItems;
    uint256 public nextInstanceId = 1;

    struct AdvancedTokenArmory {
        uint256 weaponInstanceId;
        uint256 armorInstanceId;
        uint256 lastEventTimestamp;
        uint256[] extraInstanceIds;
    }
    mapping(uint256 => AdvancedTokenArmory) public advancedTokenArmory;

    struct AdvancedEventDefinition {
        uint256 id;
        string name;
        int256 adjustment;
        string description;
        uint256 degradeAmount;
    }
    mapping(uint256 => AdvancedEventDefinition) public advancedEventDefinitions;
    uint256 public nextAdvancedEventId = 1;

    uint256 public repairFee;

    /*──────── EVENTS ────────*/
    event Staked(address indexed user, uint256 indexed id, uint256 ts);
    event RewardClaimed(address indexed user, uint256 indexed id, uint256 reward);
    event Unstaked(address indexed user, uint256 indexed id, uint256 ts);
    event FastLevelUpgradePurchased(address indexed user, uint256 indexed id, uint256 bonusAdded);

    event ItemAdded(uint256 id, string t, uint256 p, uint256 b, uint256 d);
    event ItemUpdated(uint256 id, string t, uint256 p, uint256 b, uint256 d);
    event ItemPurchasedInStore(address indexed user, uint256 id, uint256 q);
    event ItemEquipped(address indexed user, uint256 indexed id, uint256 itm);
    event ArmoryBonusUpdated(uint256 indexed id, uint256 bonus);

    event EventDefinitionAdded(uint256 id, string n, int256 adj, string d);
    event EventTriggered(address indexed op, uint256 id, uint256 ev, int256 adj, string n);
    event AdvancedEventDefinitionAdded(uint256 id, string n, int256 adj, string d, uint256 deg);
    event AdvancedEventTriggered(address indexed op, uint256 id, uint256 ev, int256 adj, string n);

    /*──────── CONSTRUCTOR ────────*/
    constructor(
        address _nft,
        address _reward,
        address _fee,
        uint256 _artistPct,
        address _artist
    ) Ownable(msg.sender) {
        nft = IPunkNFT(_nft);
        rewardTokens.push(IERC20(_reward));
        feeWallet = _fee;
        artistWallet = _artist;
        artistFeePercent = _artistPct;

        baseRewardRate = 317_000_000_000_000;
        levelThresholds = [7 days, 14 days, 30 days];
        levelBonuses   = [1e17,    2e17,   5e17];

        socialMinTokens = 330;
        socialBoostBonus = 1e17;
        socialBoostDuration = 1 days;

        activationFee = 1_000e18;
        exitFee = 1_000e18;
        fastLevelUpgradeFee = 2_000e18;
        fastLevelUpgradeBonusIncrement = 5e16;
        claimFee = 100e18;
        repairFee = 500e18;
    }
    // Parte 2/3

    /*════════════ STAKING ══════════*/
    function _mult(uint id, uint dur) internal view returns (uint) {
        uint lvl;
        for (uint i; i < levelThresholds.length; ++i) {
            if (dur >= levelThresholds[i]) {
                lvl = levelBonuses[i];
            }
        }
        uint soc = block.timestamp <= socialBoostActiveUntil ? socialBoostBonus : 0;
        return 1e18 + lvl + tokenFastLevelBonus[id] + tokenItemsBonus[id] + soc + specialTokenBoost[id];
    }

    function _updateSocial() internal {
        socialBoostActiveUntil =
            totalStaked >= socialMinTokens
                ? block.timestamp + socialBoostDuration
                : 0;
    }

    function stake(uint id) public {
        require(nft.ownerOf(id) == msg.sender, "!owner");
        require(stakes[id].stakeStart == 0, "staked");

        if (activationFee > 0) {
            rewardTokens[0].safeTransferFrom(msg.sender, feeWallet, activationFee);
        }

        stakes[id] = StakeInfo(block.timestamp, block.timestamp);
        totalStaked++;
        _updateSocial();

        emit Staked(msg.sender, id, block.timestamp);
    }

    function batchStake(uint[] calldata ids) external {
        for (uint i; i < ids.length; ++i) {
            stake(ids[i]);
        }
    }

    function pendingPassiveReward(uint id) public view returns (uint) {
        StakeInfo memory s = stakes[id];
        require(s.stakeStart > 0, "not staked");
        return (block.timestamp - s.lastClaim) * baseRewardRate / 1e18;
    }

    function pendingTotalReward(uint id) public view returns (uint) {
        StakeInfo memory s = stakes[id];
        require(s.stakeStart > 0, "not staked");
        uint base = (pendingPassiveReward(id) * _mult(id, block.timestamp - s.stakeStart)) / 1e18;
        int adj = tokenFixedAdjustment[id];
        return adj < 0
            ? (base > uint(-adj) ? base - uint(-adj) : 0)
            : base + uint(adj);
    }

    function pendingGameReward(uint id) public view returns (uint) {
        uint p = pendingPassiveReward(id);
        uint t = pendingTotalReward(id);
        return t > p ? t - p : 0;
    }

    /*──── getters for frontend ────*/
    function getTokenStats(uint id) external view returns (uint passive, uint game) {
        passive = pendingPassiveReward(id);
        game = pendingGameReward(id);
    }

    function getWalletStats(address w, uint[] calldata tokenIds)
        external
        view
        returns (
            uint[] memory stakedIds,
            uint pendingPassive,
            uint pendingGame
        )
    {
        uint len;
        for (uint i; i < tokenIds.length; ++i) {
            if (nft.ownerOf(tokenIds[i]) == w && stakes[tokenIds[i]].stakeStart > 0)
                len++;
        }
        stakedIds = new uint[](len);
        uint idx;
        for (uint i; i < tokenIds.length; ++i) {
            uint tid = tokenIds[i];
            if (nft.ownerOf(tid) == w && stakes[tid].stakeStart > 0) {
                stakedIds[idx++] = tid;
                pendingPassive += pendingPassiveReward(tid);
                pendingGame += pendingGameReward(tid);
            }
        }
    }

    function claimRewards(uint id) public returns (uint) {
        StakeInfo storage s = stakes[id];
        require(s.stakeStart > 0, "not staked");
        uint elapsed = block.timestamp - s.lastClaim;
        require(elapsed > 0, "no reward");

        if (claimFee > 0) {
            rewardTokens[0].safeTransferFrom(msg.sender, feeWallet, claimFee);
        }

        uint base = (elapsed * baseRewardRate * _mult(id, block.timestamp - s.stakeStart)) / 1e18;
        int adj = tokenFixedAdjustment[id];
        uint reward = adj < 0
            ? (base > uint(-adj) ? base - uint(-adj) : 0)
            : base + uint(adj);

        s.lastClaim = block.timestamp;
        s.stakeStart = block.timestamp;
        tokenFixedAdjustment[id] = 0;

        rewardTokens[0].safeTransfer(msg.sender, reward);
        emit RewardClaimed(msg.sender, id, reward);
        return reward;
    }

    function batchClaimRewards(uint[] calldata ids) public returns (uint total) {
        for (uint i; i < ids.length; ++i) total += claimRewards(ids[i]);
    }

    function unstake(uint id) public {
        require(nft.ownerOf(id) == msg.sender, "!owner");
        require(stakes[id].stakeStart > 0, "not staked");

        if (exitFee > 0) {
            rewardTokens[0].safeTransferFrom(msg.sender, feeWallet, exitFee);
        }

        claimRewards(id);
        delete stakes[id];
        totalStaked--;
        _updateSocial();

        emit Unstaked(msg.sender, id, block.timestamp);
    }

    function batchUnstake(uint[] calldata ids) external {
        uint totalFee = exitFee * ids.length;
        if (totalFee > 0) {
            rewardTokens[0].safeTransferFrom(msg.sender, feeWallet, totalFee);
        }
        for (uint i; i < ids.length; ++i) unstake(ids[i]);
    }

    /*──── fast‑level with cap ────*/
    function setMaxFastLevelBonus(uint v) external onlyOwner {
        maxFastLevelBonus = v;
    }

    function purchaseFastLevelUpgrade(uint id) external {
        require(nft.ownerOf(id) == msg.sender, "!owner");
        uint cur = tokenFastLevelBonus[id];
        require(cur < maxFastLevelBonus, "cap reached");
        rewardTokens[0].safeTransferFrom(msg.sender, feeWallet, fastLevelUpgradeFee);

        uint inc = fastLevelUpgradeBonusIncrement;
        if (cur + inc > maxFastLevelBonus) inc = maxFastLevelBonus - cur;
        tokenFastLevelBonus[id] = cur + inc;
        emit FastLevelUpgradePurchased(msg.sender, id, inc);
    }

    /*════════ STORE & EQUIP (templates) ═════════*/
    function addItem(ItemType t, uint p, uint b, uint d, bool degr) external onlyOwner {
        items[nextItemId] = Item(p, b, d, true, t, degr);
        emit ItemAdded(nextItemId, t == ItemType.Weapon ? "Weapon" : "Armor", p, b, d);
        nextItemId++;
    }

    function updateItem(uint id, uint p, uint b, uint d) external onlyOwner {
        require(items[id].exists, "not exist");
        items[id].price = p;
        items[id].bonus = b;
        items[id].durability = d;
        emit ItemUpdated(id, items[id].itemType == ItemType.Weapon ? "Weapon" : "Armor", p, b, d);
    }

    function buyItem(uint id, uint qty) external {
        require(items[id].exists, "not exist");
        uint tot = items[id].price * qty;
        uint art = (tot * artistFeePercent) / 100;
        rewardTokens[0].safeTransferFrom(msg.sender, artistWallet, art);
        rewardTokens[0].safeTransferFrom(msg.sender, feeWallet, tot - art);
        inventory[msg.sender][id] += qty;
        totalItemsPurchased += qty;
        itemsPurchased[id] += qty;
        emit ItemPurchasedInStore(msg.sender, id, qty);
    }

    function equipItem(uint tokenId, uint itemId) public {
        require(items[itemId].exists, "not exist");
        require(nft.ownerOf(tokenId) == msg.sender, "!owner");
        require(inventory[msg.sender][itemId] > 0, "not enough");
        inventory[msg.sender][itemId]--;

        TokenArmory storage ar = tokenArmory[tokenId];
        if (items[itemId].itemType == ItemType.Weapon) {
            if (ar.weaponId != 0) tokenItemsBonus[tokenId] -= items[ar.weaponId].bonus;
            ar.weaponId = itemId;
        } else {
            if (ar.armorId != 0) tokenItemsBonus[tokenId] -= items[ar.armorId].bonus;
            ar.armorId = itemId;
        }

        tokenItemsBonus[tokenId] += items[itemId].bonus;
        totalItemsEquipped++;
        emit ItemEquipped(msg.sender, tokenId, itemId);
    }

    /*──────── Extra slots ────────*/
    function setExtraSlotCost(uint v) external onlyOwner {
        extraSlotCost = v;
    }

    function purchaseExtraSlots(uint tokenId, uint q) external {
        require(nft.ownerOf(tokenId) == msg.sender, "!owner");
        require(extraSlotsPurchased[tokenId] + q <= maxSlots - 2, "max slots");
        rewardTokens[0].safeTransferFrom(msg.sender, feeWallet, extraSlotCost * q);
        extraSlotsPurchased[tokenId] += q;
    }
    // Parte 3/3

    /*════════ INSTANCES ─════════*/
    function batchBuyItems(uint[] calldata ids, uint[] calldata qtys) external {
        require(ids.length == qtys.length, "length mismatch");
        uint totalArt;
        uint totalFee;
        for (uint i; i < ids.length; ++i) {
            require(items[ids[i]].exists, "not exist");
            uint cost = items[ids[i]].price * qtys[i];
            uint artAmt = (cost * artistFeePercent) / 100;
            totalArt += artAmt;
            totalFee += cost - artAmt;
            for (uint j; j < qtys[i]; ++j) {
                ownedItems[msg.sender].push(
                    OwnedItem(nextInstanceId, ids[i], items[ids[i]].durability, false)
                );
                emit ItemPurchasedInStore(msg.sender, ids[i], nextInstanceId);
                nextInstanceId++;
            }
        }
        rewardTokens[0].safeTransferFrom(msg.sender, artistWallet, totalArt);
        rewardTokens[0].safeTransferFrom(msg.sender, feeWallet, totalFee);
    }

    function equipItemInstance(uint tokenId, uint instId) public {
        require(nft.ownerOf(tokenId) == msg.sender, "!owner");
        require(_ownsItem(msg.sender, instId), "not own");
        OwnedItem storage oi = _getOwnedItem(msg.sender, instId);
        require(oi.durability > 0 && !oi.degraded, "degraded");

        uint tpl = oi.templateId;
        AdvancedTokenArmory storage ar = advancedTokenArmory[tokenId];
        if (items[tpl].itemType == ItemType.Weapon) {
            if (ar.weaponInstanceId != 0) {
                uint oldTpl = _getOwnedItem(msg.sender, ar.weaponInstanceId).templateId;
                tokenItemsBonus[tokenId] -= items[oldTpl].bonus;
            }
            ar.weaponInstanceId = instId;
        } else {
            if (ar.armorInstanceId != 0) {
                uint oldTpl = _getOwnedItem(msg.sender, ar.armorInstanceId).templateId;
                tokenItemsBonus[tokenId] -= items[oldTpl].bonus;
            }
            ar.armorInstanceId = instId;
        }
        tokenItemsBonus[tokenId] += items[tpl].bonus;
        emit ItemEquipped(msg.sender, tokenId, instId);
    }

    function equipExtraItemInstance(uint tokenId, uint instId) public {
        require(nft.ownerOf(tokenId) == msg.sender, "!owner");
        require(_ownsItem(msg.sender, instId), "not own");
        OwnedItem storage oi = _getOwnedItem(msg.sender, instId);
        require(oi.durability > 0 && !oi.degraded, "degraded");
        require(
            advancedTokenArmory[tokenId].extraInstanceIds.length < extraSlotsPurchased[tokenId],
            "no slots"
        );
        advancedTokenArmory[tokenId].extraInstanceIds.push(instId);
        tokenItemsBonus[tokenId] += items[oi.templateId].bonus;
        emit ItemEquipped(msg.sender, tokenId, instId);
    }

    function batchArmoryActionsInstances(
        uint[] calldata tokenIds,
        uint8[] calldata acts,
        uint[] calldata insts,
        uint[] calldata idxs
    ) external {
        require(
            tokenIds.length == acts.length &&
            acts.length == insts.length &&
            insts.length == idxs.length,
            "length mismatch"
        );
        for (uint i; i < tokenIds.length; ++i) {
            uint t = tokenIds[i];
            require(nft.ownerOf(t) == msg.sender, "!owner");

            if (acts[i] == uint8(AdvancedArmoryActionType.EquipDefault)) {
                equipItemInstance(t, insts[i]);
            } else if (acts[i] == uint8(AdvancedArmoryActionType.EquipExtra)) {
                equipExtraItemInstance(t, insts[i]);
            } else if (acts[i] == uint8(AdvancedArmoryActionType.UnequipExtra)) {
                uint ix = idxs[i];
                require(ix < advancedTokenArmory[t].extraInstanceIds.length, "OOB");
                uint inst = advancedTokenArmory[t].extraInstanceIds[ix];
                uint tpl = _getOwnedItem(msg.sender, inst).templateId;
                tokenItemsBonus[t] -= items[tpl].bonus;

                // swap & pop
                uint last = advancedTokenArmory[t].extraInstanceIds.length - 1;
                advancedTokenArmory[t].extraInstanceIds[ix] = advancedTokenArmory[t].extraInstanceIds[last];
                advancedTokenArmory[t].extraInstanceIds.pop();
            } else if (acts[i] == uint8(AdvancedArmoryActionType.UnequipAll)) {
                // weapon
                uint w = advancedTokenArmory[t].weaponInstanceId;
                if (w != 0) {
                    uint tpl = _getOwnedItem(msg.sender, w).templateId;
                    tokenItemsBonus[t] -= items[tpl].bonus;
                    advancedTokenArmory[t].weaponInstanceId = 0;
                }
                // armor
                uint a = advancedTokenArmory[t].armorInstanceId;
                if (a != 0) {
                    uint tpl = _getOwnedItem(msg.sender, a).templateId;
                    tokenItemsBonus[t] -= items[tpl].bonus;
                    advancedTokenArmory[t].armorInstanceId = 0;
                }
                // extras
                uint count = advancedTokenArmory[t].extraInstanceIds.length;
                for (uint j; j < count; ++j) {
                    uint ex = advancedTokenArmory[t].extraInstanceIds[j];
                    uint tpl = _getOwnedItem(msg.sender, ex).templateId;
                    tokenItemsBonus[t] -= items[tpl].bonus;
                }
                delete advancedTokenArmory[t].extraInstanceIds;
            }
        }
    }

    /* Degradation */
    function _applyDegradation(uint tokenId, address user, uint inst, uint amt) internal {
        OwnedItem storage oi = _getOwnedItem(user, inst);
        if (oi.durability > amt) {
            oi.durability -= amt;
            return;
        }
        if (!oi.degraded) {
            tokenItemsBonus[tokenId] -= items[oi.templateId].bonus;
        }
        oi.durability = 0;
        oi.degraded = true;
    }

    function repairItem(uint inst, uint tokenId) external {
        OwnedItem storage oi = _getOwnedItem(msg.sender, inst);
        require(oi.degraded || oi.durability < items[oi.templateId].durability, "no repair needed");
        rewardTokens[0].safeTransferFrom(msg.sender, feeWallet, repairFee);
        if (oi.degraded) {
            tokenItemsBonus[tokenId] += items[oi.templateId].bonus;
            oi.degraded = false;
        }
        oi.durability = items[oi.templateId].durability;
    }

    /*════════ BASIC EVENTS ═════════*/
    function setEventsPaused(bool p) external onlyOwner {
        eventsPaused = p;
    }
    function addEventDefinition(string memory n, int256 adj, string memory d) external onlyOwner {
        eventDefinitions[nextEventId] = EventDefinition(nextEventId, n, adj, d);
        emit EventDefinitionAdded(nextEventId, n, adj, d);
        nextEventId++;
    }
    function triggerEvent(uint tokenId, uint id) public onlyOwner {
        require(!eventsPaused, "paused");
        EventDefinition storage e = eventDefinitions[id];
        require(e.id != 0, "!");
        TokenArmory storage ta = tokenArmory[tokenId];
        require(block.timestamp - ta.lastEventTimestamp >= eventCooldown, "cooldown");
        tokenFixedAdjustment[tokenId] += e.adjustment;
        ta.lastEventTimestamp = block.timestamp;
        emit EventTriggered(msg.sender, tokenId, id, e.adjustment, e.name);
    }
    function randomTriggerEvent(uint tokenId) external onlyOwner {
        require(!eventsPaused, "paused");
        if (nextEventId < 2) return;
        if (_rnd(100) >= eventChance) return;
        uint id = (_rnd(nextEventId - 1)) + 1;
        triggerEvent(tokenId, id);
    }

    /*════════ ADVANCED EVENTS ═════════*/
    function addAdvancedEventDefinition(string memory n, int256 adj, string memory d, uint256 deg) external onlyOwner {
        advancedEventDefinitions[nextAdvancedEventId] = AdvancedEventDefinition(nextAdvancedEventId, n, adj, d, deg);
        emit AdvancedEventDefinitionAdded(nextAdvancedEventId, n, adj, d, deg);
        nextAdvancedEventId++;
    }
    function triggerAdvancedEvent(uint tokenId, uint ev) external onlyOwner {
    require(!eventsPaused, "paused");
    AdvancedEventDefinition storage e = advancedEventDefinitions[ev];
    require(e.id != 0, "!");
    require(
        advancedTokenArmory[tokenId].weaponInstanceId != 0 ||
        advancedTokenArmory[tokenId].extraInstanceIds.length > 0,
        "no item"
    );

    /* ── usamos siempre el verdadero dueño del token ── */
    address player = nft.ownerOf(tokenId);

    tokenFixedAdjustment[tokenId] += e.adjustment;

    uint w = advancedTokenArmory[tokenId].weaponInstanceId;
    if (w != 0 && items[_getOwnedItem(player, w).templateId].degradable) {
        _applyDegradation(tokenId, player, w, e.degradeAmount);
    }

    uint a = advancedTokenArmory[tokenId].armorInstanceId;
    if (a != 0 && items[_getOwnedItem(player, a).templateId].degradable) {
        _applyDegradation(tokenId, player, a, e.degradeAmount);
    }

    uint n = advancedTokenArmory[tokenId].extraInstanceIds.length;
    for (uint i; i < n; ++i) {
        uint ex = advancedTokenArmory[tokenId].extraInstanceIds[i];
        if (items[_getOwnedItem(player, ex).templateId].degradable) {
            _applyDegradation(tokenId, player, ex, e.degradeAmount);
        }
    }

    emit AdvancedEventTriggered(msg.sender, tokenId, ev, e.adjustment, e.name);
}

    /*──────── RANDOM helper ────────*/
    function _rnd(uint max) internal returns (uint) {
        randomNonce++;
        return uint(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, msg.sender, randomNonce))) % max;
    }

    /*──────── AUX INSTANCIAS ────────*/
    function _ownsItem(address u, uint inst) internal view returns (bool) {
        OwnedItem[] storage a = ownedItems[u];
        for (uint i; i < a.length; ++i) {
            if (a[i].instanceId == inst) return true;
        }
        return false;
    }
    function _getOwnedItem(address u, uint inst) internal view returns (OwnedItem storage) {
        OwnedItem[] storage a = ownedItems[u];
        for (uint i; i < a.length; ++i) {
            if (a[i].instanceId == inst) return a[i];
        }
        revert("!");
    }

    /*──────── ADMIN ────────*/
    function depositRewardFunds(uint a) external {
        rewardTokens[0].safeTransferFrom(msg.sender, address(this), a);
    }
    function withdrawRewardFunds(uint a, address to) external onlyOwner {
        rewardTokens[0].safeTransfer(to, a);
    }
    function setBaseRewardRate(uint v) external onlyOwner { baseRewardRate = v; }
    function setActivationFee(uint v) external onlyOwner { activationFee = v; }
    function setExitFee(uint v) external onlyOwner { exitFee = v; }
    function setFastLevelUpgradeFee(uint v) external onlyOwner { fastLevelUpgradeFee = v; }
    function setFastLevelUpgradeBonusIncrement(uint v) external onlyOwner { fastLevelUpgradeBonusIncrement = v; }
    function setClaimFee(uint v) external onlyOwner { claimFee = v; }
    function setLevelParameters(uint[] calldata th, uint[] calldata bn) external onlyOwner {
        require(th.length == bn.length, "len");
        delete levelThresholds; delete levelBonuses;
        for (uint i; i < th.length; ++i) { levelThresholds.push(th[i]); levelBonuses.push(bn[i]); }
    }
    function setSocialStakingParameters(uint m, uint b, uint d) external onlyOwner {
        socialMinTokens=m; socialBoostBonus=b; socialBoostDuration=d; _updateSocial();
    }
    function setFeeWallet(address w) external onlyOwner { feeWallet=w; }
    function setArtistWallet(address w) external onlyOwner { artistWallet=w; }
    function setRepairFee(uint v) external onlyOwner { repairFee=v; }
    function addRewardToken(address t) external onlyOwner { rewardTokens.push(IERC20(t)); }
    function setMaxSlots(uint v) external onlyOwner { require(v>=2); maxSlots=v; }
    function setEventParameters(uint c, uint chance, uint pos, uint neg) external onlyOwner {
        eventCooldown=c; eventChance=chance; positiveEventBonus=pos; negativeEventPenalty=neg;
    }

    /*──────── DASHBOARD HELPERS ────────*/
    function getTokenDetailedInfo(uint id) external view returns (
        uint stakeStart,
        uint lastClaim,
        uint fast,
        uint itemsBonus,
        uint spec,
        int fix,
        uint pending
    ) {
        StakeInfo memory s = stakes[id];
        stakeStart = s.stakeStart;
        lastClaim = s.lastClaim;
        fast = tokenFastLevelBonus[id];
        itemsBonus = tokenItemsBonus[id];
        spec = specialTokenBoost[id];
        fix = tokenFixedAdjustment[id];
        pending = s.stakeStart > 0 ? pendingTotalReward(id) : 0;
    }

    function getTokenArmoryDetails(uint id) external view returns (
        uint weapon,
        uint armor,
        uint[] memory extras,
        uint lastEvent
    ) {
        TokenArmory storage a = tokenArmory[id];
        weapon = a.weaponId; armor = a.armorId; extras = a.extraItems; lastEvent = a.lastEventTimestamp;
    }

    function getGlobalStats() external view returns (uint staked, uint base, uint socialEnd) {
        staked = totalStaked; base = baseRewardRate; socialEnd = socialBoostActiveUntil;
    }

    function getEconomicSnapshot() external view onlyOwner returns (
        uint staked, uint totalItems, uint purchased, uint equipped
    ) {
        staked = totalStaked; totalItems = nextItemId - 1; purchased = totalItemsPurchased; equipped = totalItemsEquipped;
    }

    /*──────── FUN ────────*/
    function punkQuestHypeZone() external pure returns (string memory) {
        return "Welcome to the PunkQuest Hype Zone, stake, equip, and conquer!";
    }
    function partyTime() external pure returns (string memory) {
        return "Party time, keep stacking your rewards and stay punk!";
    }
}