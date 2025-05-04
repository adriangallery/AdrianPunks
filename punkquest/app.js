/* -----------------------------------------------------------
   Adrian Punks  – Marketplace / Quest dApp
   Autor: ChatGPT · Mayo 2025
   ----------------------------------------------------------- */

   import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

   /* ------------------ 1.  CONFIGURACIÓN BÁSICA ------------------ */
   
   const CFG = {
     network: {
       chainIdHex: "0x2105",          // Base mainnet
       chainIdDec: 8453,
       rpc: "https://base-mainnet.infura.io/v3/cc0c8013b1e044dcba79d4f7ec3b2ba1"
     },
     addresses: {
       punks:  "0x79BE8AcdD339C7b92918fcC3fd3875b5Aaad7566",
       quest:  "0x6c1BFa0AfB84e314DF2e8B9a88C3530e0b19a49F",
       token:  "0xD2a4684edFc70D2B01600416f50Fc5733bFc97D5",
       multicall: "0xcA11bde05977b3631167028862bE2a173976CA11"
     },
     abi: { 
       punks: [
         "function balanceOf(address owner) view returns (uint256)",
         "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
         "function tokenURI(uint256 tokenId) view returns (string)",
         "function ownerOf(uint256 tokenId) view returns (address)",
         "function getApproved(uint256 tokenId) view returns (address)",
         "function isApprovedForAll(address owner, address operator) view returns (bool)",
         "function approve(address to, uint256 tokenId)",
         "function setApprovalForAll(address operator, bool approved)",
         "function transferFrom(address from, address to, uint256 tokenId)",
         "function safeTransferFrom(address from, address to, uint256 tokenId)",
         "function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)"
       ],
       quest: [
         "function stake(uint256 id)",
         "function unstake(uint256 id)",
         "function claimRewards(uint256 id) returns (uint256)",
         "function batchStake(uint256[] ids)",
         "function batchUnstake(uint256[] ids)",
         "function batchClaimRewards(uint256[] ids) returns (uint256)",
         "function getTokenDetailedInfo(uint256 id) view returns (uint256, uint256, uint256, uint256, uint256, int256, uint256)",
         "function getTokenStats(uint256 id) view returns (uint256, uint256)",
         "function getTokenArmoryDetails(uint256 id) view returns (uint256, uint256, uint256[], uint256)",
         "function activationFee() view returns (uint256)",
         "function exitFee() view returns (uint256)",
         "function claimFee() view returns (uint256)",
         "function fastLevelUpgradeFee() view returns (uint256)",
         "function extraSlotCost() view returns (uint256)",
         "function repairFee() view returns (uint256)",
         "function baseRewardRate() view returns (uint256)",
         "function eventChance() view returns (uint256)",
         "function eventCooldown() view returns (uint256)",
         "function positiveEventBonus() view returns (uint256)",
         "function negativeEventPenalty() view returns (uint256)",
         "function maxFastLevelBonus() view returns (uint256)",
         "function fastLevelUpgradeBonusIncrement() view returns (uint256)",
         "function maxSlots() view returns (uint256)",
         "function socialMinTokens() view returns (uint256)",
         "function socialBoostBonus() view returns (uint256)",
         "function socialBoostDuration() view returns (uint256)",
         "function socialBoostActiveUntil() view returns (uint256)",
         "function totalStaked() view returns (uint256)",
         "function totalItemsEquipped() view returns (uint256)",
         "function totalItemsPurchased() view returns (uint256)",
         "function getGlobalStats() view returns (uint256, uint256, uint256)",
         "function getEconomicSnapshot() view returns (uint256, uint256, uint256, uint256)",
         "function getWalletStats(address w, uint256[] tokenIds) view returns (uint256[], uint256, uint256)",
         "function pendingPassiveReward(uint256 id) view returns (uint256)",
         "function pendingGameReward(uint256 id) view returns (uint256)",
         "function pendingTotalReward(uint256 id) view returns (uint256)",
         "function randomTriggerEvent(uint256 tokenId)",
         "function triggerEvent(uint256 tokenId, uint256 id)",
         "function triggerAdvancedEvent(uint256 tokenId, uint256 ev)",
         "function addEventDefinition(string n, int256 adj, string d)",
         "function addAdvancedEventDefinition(string n, int256 adj, string d, uint256 deg)",
         "function setEventParameters(uint256 c, uint256 chance, uint256 pos, uint256 neg)",
         "function setEventsPaused(bool p)",
         "function addItem(uint8 t, uint256 p, uint256 b, uint256 d, bool degr)",
         "function updateItem(uint256 id, uint256 p, uint256 b, uint256 d)",
         "function buyItem(uint256 id, uint256 qty)",
         "function batchBuyItems(uint256[] ids, uint256[] qtys)",
         "function equipItem(uint256 tokenId, uint256 itemId)",
         "function equipItemInstance(uint256 tokenId, uint256 instId)",
         "function equipExtraItemInstance(uint256 tokenId, uint256 instId)",
         "function repairItem(uint256 inst, uint256 tokenId)",
         "function purchaseFastLevelUpgrade(uint256 id)",
         "function purchaseExtraSlots(uint256 tokenId, uint256 q)",
         "function addRewardToken(address t)",
         "function depositRewardFunds(uint256 a)",
         "function withdrawRewardFunds(uint256 a, address to)",
         "function setActivationFee(uint256 v)",
         "function setExitFee(uint256 v)",
         "function setClaimFee(uint256 v)",
         "function setFastLevelUpgradeFee(uint256 v)",
         "function setExtraSlotCost(uint256 v)",
         "function setRepairFee(uint256 v)",
         "function setBaseRewardRate(uint256 v)",
         "function setFastLevelUpgradeBonusIncrement(uint256 v)",
         "function setMaxFastLevelBonus(uint256 v)",
         "function setMaxSlots(uint256 v)",
         "function setLevelParameters(uint256[] th, uint256[] bn)",
         "function setSocialStakingParameters(uint256 m, uint256 b, uint256 d)",
         "function setArtistWallet(address w)",
         "function setFeeWallet(address w)",
         "function owner() view returns (address)",
         "function renounceOwnership()",
         "function transferOwnership(address newOwner)"
       ],
       erc20: [
         "function balanceOf(address account) view returns (uint256)",
         "function allowance(address owner, address spender) view returns (uint256)",
         "function approve(address spender, uint256 amount) returns (bool)",
         "function transfer(address to, uint256 amount) returns (bool)",
         "function transferFrom(address from, address to, uint256 amount) returns (bool)",
         "function decimals() view returns (uint8)",
         "function symbol() view returns (string)",
         "function name() view returns (string)",
         "function totalSupply() view returns (uint256)",
         "function stake(uint256 amount)",
         "function withdrawStake()",
         "function calculateReward(address staker) view returns (uint256)",
         "function stakedBalance(address account) view returns (uint256)",
         "function stakingStart(address account) view returns (uint256)",
         "function rewardRate() view returns (uint256)",
         "function updateRewardRate(uint256 _newRewardRate)",
         "function taxFee() view returns (uint256)",
         "function creatorFee() view returns (uint256)",
         "function burnFee() view returns (uint256)",
         "function taxAddress() view returns (address)",
         "function creatorAddress() view returns (address)",
         "function isFeeExempt(address account) view returns (bool)",
         "function setFeeExemption(address account, bool exempt)",
         "function updateTaxFee(uint256 _newTaxFee)",
         "function updateCreatorFee(uint256 _newCreatorFee)",
         "function updateBurnFee(uint256 _newBurnFee)",
         "function updateTaxAddress(address _newTaxAddress)",
         "function updateCreatorAddress(address _newCreatorAddress)",
         "function owner() view returns (address)",
         "function renounceOwnership()",
         "function transferOwnership(address newOwner)"
       ]
     },
     imgPath:  "/market/halfxadrianimages/",
     placeholder: "/market/halfxadrianimages/placeholder.jpg"
   };
   
   /* ------------------ 2.  ESTADO GLOBAL ------------------ */
   
   const S = {
     provider:     null,
     signer:       null,
     account:      "",
     contracts:    {},
     ownedTokens:  [],
     selected:     new Set(),
     storeItems:   [],
     inventory:    {},
     cart:         [],
     fees:         {},
     decimals:     18,
     symbol:       "ADRIAN",
     loading:      false,
     currentTab:   "tokens"
   };
   
   /* ------------------ 3.  DOM CORTO ------------------ */
   
   const $ = selector => document.querySelector(selector);
   const $$ = selector => document.querySelectorAll(selector);
   
   /* Elementos Reutilizados */
   const E = {
     connectBtn:   $("#connectWalletBtn"),
     accountBox:   $("#accountDisplay"),
     balBox:       $("#tokenBalance"),
     error:        $("#errorAlert"),
     ok:           $("#successAlert"),
     loadingTok:   $("#loading-tokens"),
     noTok:        $("#no-tokens-message"),
     grid:         $("#token-grid"),
     tokActions:   $("#token-actions"),
     stakeBtn:     $("#stakeBtn"),
     unstakeBtn:   $("#unstakeBtn"),
     claimBtn:     $("#claimBtn"),
     lvlBtn:       $("#levelUpBtn"),
     selectAll:    $("#selectAllBtn"),
     /* Store & Carrito */
     storeLoad:    $("#loading-store"),
     storeGrid:    $("#store-grid"),
     cartBadge:    $("#cartBadge"),
     cartItems:    $("#cart-items"),
     cartSum:      $("#cart-summary"),
     cartTotal:    $("#cart-total"),
     approveBtn:   $("#approveBtn"),
     checkoutBtn:  $("#checkoutBtn"),
     /* Tabs */
     tabs:         $$(".nav-link")
   };
   
   /* ------------------ 4.  UTILIDADES ------------------ */
   
   const fmt = (bn, dec = S.decimals, fixed = 2) =>
     Number(ethers.utils.formatUnits(bn, dec)).toFixed(fixed);
   
   const notify = (box, msg) => {
     box.textContent = msg;
     box.style.display = "block";
     setTimeout(() => (box.style.display = "none"), 5000);
   };
   
   const handleErr = err => notify(E.error, err.message ?? "Error inesperado");
   
   const withLoad = fn => async (...a) => {
     S.loading = true; toggleUI();
     try { return await fn(...a); }
     catch (e) { handleErr(e); }
     finally { S.loading = false; toggleUI(); }
   };
   
   /* ------------------ 5.  CONEXIÓN WALLET ------------------ */
   
   async function connectWallet() {
     try {
       if (typeof window.ethereum === 'undefined') {
         throw new Error('MetaMask no está instalado');
       }

       const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
       if (accounts.length === 0) {
         throw new Error('No se encontraron cuentas');
       }

       const account = accounts[0];
       const chainId = await window.ethereum.request({ method: 'eth_chainId' });

       if (chainId !== CFG.network.chainIdHex) {
         try {
           await window.ethereum.request({
             method: 'wallet_switchEthereumChain',
             params: [{ chainId: CFG.network.chainIdHex }],
           });
         } catch (switchError) {
           if (switchError.code === 4902) {
             await window.ethereum.request({
               method: 'wallet_addEthereumChain',
               params: [{
                 chainId: CFG.network.chainIdHex,
                 chainName: 'Base Mainnet',
                 nativeCurrency: {
                   name: 'ETH',
                   symbol: 'ETH',
                   decimals: 18
                 },
                 rpcUrls: [CFG.network.rpc],
                 blockExplorerUrls: ['https://basescan.org']
               }],
             });
           } else {
             throw switchError;
           }
         }
       }

       return account;
     } catch (error) {
       console.error('Error al conectar la wallet:', error);
       throw error;
     }
   }
   
   window.renderAccount = () => {
     E.accountBox.textContent = `${S.account.slice(0, 6)}…${S.account.slice(-4)}`;
     E.accountBox.parentElement.style.display = "block";
   };
   
   /* ------------------ 6.  CARGA INICIAL ------------------ */
   
   window.bootstrapData = async function() {
     await Promise.all([loadFees(), loadBalance(), loadTokens(), loadStore()]);
   };
   
   /* --- 6-a  BALANCE -------------------------------------- */
   window.loadBalance = async function() {
     const bal = await S.contracts.token.balanceOf(S.account);
     E.balBox.textContent = `$${S.symbol}: ${fmt(bal, S.decimals, 2)}`;
   };
   
   /* --- 6-b  COMISIONES ----------------------------------- */
   window.loadFees = async function() {
     const Q = S.contracts.quest;
     const [activation, exit, claim, levelUp, extra] = await Promise.all([
       Q.activationFee(), Q.exitFee(), Q.claimFee(),
       Q.fastLevelUpgradeFee(), Q.extraSlotCost()
     ]);
     S.fees = { activation, exit, claim, levelUp, extra };
   };
   
   /* --- 6-c  TOKEN NFTs ----------------------------------- */
   window.loadTokens = async function() {
     try {
       const account = await connectWallet();
       const punksContract = new ethers.Contract(CFG.addresses.punks, CFG.abi.punks, S.provider);
       const questContract = new ethers.Contract(CFG.addresses.quest, CFG.abi.quest, S.provider);
       const tokenContract = new ethers.Contract(CFG.addresses.token, CFG.abi.erc20, S.provider);

       // Cargar balance de tokens
       const balance = await punksContract.balanceOf(account);
       const tokenIds = [];
       for (let i = 0; i < balance.toNumber(); i++) {
         const tokenId = await punksContract.tokenOfOwnerByIndex(account, i);
         tokenIds.push(tokenId.toNumber());
       }

       // Cargar información detallada de cada token
       const tokens = await Promise.all(tokenIds.map(async (id) => {
         const [level, xp, maxXp, lastClaim, lastEvent, eventBonus, durability] = 
           await questContract.getTokenDetailedInfo(id);
         const [staked, equipped] = await questContract.getTokenStats(id);
         const [slots, usedSlots, items, lastRepair] = 
           await questContract.getTokenArmoryDetails(id);
         
         return {
           id,
           level: parseInt(level),
           xp: parseInt(xp),
           maxXp: parseInt(maxXp),
           lastClaim: parseInt(lastClaim),
           lastEvent: parseInt(lastEvent),
           eventBonus: parseInt(eventBonus),
           durability: parseInt(durability),
           staked: staked === 'true',
           equipped: parseInt(equipped),
           slots: parseInt(slots),
           usedSlots: parseInt(usedSlots),
           items: items.map(i => parseInt(i)),
           lastRepair: parseInt(lastRepair)
         };
       }));

       // Cargar balance de ADRIAN
       const adrianBalance = await tokenContract.balanceOf(account);
       const decimals = await tokenContract.decimals();
       const formattedBalance = fmt(adrianBalance, decimals);

       S.ownedTokens = tokenIds;
       S.inventory = {};
       for (const token of tokens) {
         S.inventory[token.id] = token.staked ? 1 : 0;
       }

       renderTokens();
       return { tokens, adrianBalance: formattedBalance };
     } catch (error) {
       console.error('Error al cargar tokens:', error);
       throw error;
     }
   };
   
   /* Renderizado de tarjetas NFT */
   window.renderTokens = function() {
     E.grid.innerHTML = "";
     S.ownedTokens.forEach(id => {
       const card = document.createElement("div");
       card.className = "token-card" + (S.selected.has(id) ? " selected-token" : "");
       card.onclick = () => toggleSelect(id);
   
       const img   = new Image();
       img.src     = `${CFG.imgPath}${id}.jpg`;
       img.onerror = () => (img.src = CFG.placeholder);
       card.append(img);
   
       const info  = document.createElement("div");
       info.className = "token-info";
       info.innerHTML = `<div class="token-title">Adrian #${id}</div>`;
       card.append(info);
   
       E.grid.append(card);
     });
     toggleUI();
   };
   
   /* Selección */
   window.toggleSelect = function(id) {
     S.selected.has(id) ? S.selected.delete(id) : S.selected.add(id);
     renderTokens();
   };
   
   /* --- 6-d  TIENDA --------------------------------------- */
   window.loadStore = async function() {
     E.storeLoad.style.display = "block";
     const nextId = (await S.contracts.quest.nextItemId()).toNumber();
   
     S.storeItems = [];
     for (let i = 1; i < nextId; i++) {
       const item = await S.contracts.quest.items(i);
       if (!item.exists) continue;       // omitidos no existentes
       S.storeItems.push({ id: i, ...item });
     }
     renderStore();
   };
   
   window.renderStore = function(filter = "all") {
     E.storeGrid.innerHTML = "";
     const f = filter === "all" ? () => true :
               filter === "weapon" ? it => it.itemType === 0 :
               it => it.itemType === 1;
   
     S.storeItems.filter(f).forEach(it => {
       const card = document.createElement("div");
       card.className = "item-card";
       card.onclick = () => showItem(it);
       card.innerHTML = `
         <div class="item-type ${it.itemType === 0 ? "type-weapon" : "type-armor"}">
           ${it.itemType === 0 ? "Weapon" : "Armor"}
         </div>
         <div class="item-bonus">Bonus: ${it.bonus}%</div>
         <div class="item-durability">Durability: ${it.durability}</div>
         <div class="item-price">${fmt(it.price)} $${S.symbol}</div>`;
       E.storeGrid.append(card);
     });
     E.storeLoad.style.display = "none";
   };
   
   /* Item → modal */
   function showItem(item) {
     $("#itemDetailsTitle").textContent = `Item #${item.id}`;
     $("#itemDetailsContent").innerHTML = `
        <p><strong>Tipo:</strong> ${item.itemType === 0 ? "Weapon" : "Armor"}</p>
        <p><strong>Bono:</strong> ${item.bonus}%</p>
        <p><strong>Durabilidad:</strong> ${item.durability}</p>
        <p><strong>Precio:</strong> ${fmt(item.price)} $${S.symbol}</p>`;
     $("#addToCartModal").onclick = () => { addToCart(item.id, 1); };
     new bootstrap.Modal("#itemDetailsModal").show();
   }
   
   /* ------------------ 7.  CARRITO ------------------ */
   
   function addToCart(id, qty = 1) {
     const found = S.cart.find(i => i.id === id);
     found ? (found.qty += qty) : S.cart.push({ id, qty });
     renderCart();
   }
   
   function renderCart() {
     E.cartItems.innerHTML = "";
     let total = ethers.BigNumber.from(0);
     S.cart.forEach(it => {
       const storeIt = S.storeItems.find(s => s.id === it.id);
       const li = document.createElement("div");
       li.className = "cart-item";
       li.innerHTML = `
         <span>#${it.id} × ${it.qty}</span>
         <strong>${fmt(storeIt.price.mul(it.qty))}</strong>`;
       E.cartItems.append(li);
       total = total.add(storeIt.price.mul(it.qty));
     });
     E.cartTotal.textContent = `${fmt(total)} $${S.symbol}`;
     E.cartBadge.textContent = S.cart.length;
     E.checkoutBtn.disabled = !S.cart.length;
     E.cartSum.style.display = S.cart.length ? "block" : "none";
   }
   
   /* APROBAR → TOKEN */
   const approve = withLoad(async () => {
     const total = S.cart.reduce((sum, it) => {
       const price = S.storeItems.find(s => s.id === it.id).price;
       return sum.add(price.mul(it.qty));
     }, ethers.BigNumber.from(0));
     const allowance = await S.contracts.token.allowance(S.account, CFG.addresses.quest);
     if (allowance.gte(total)) return notify(E.ok, "Allowance suficiente 👍");
   
     const tx = await S.contracts.token.approve(CFG.addresses.quest, total);
     await tx.wait(); notify(E.ok, "Allowance actualizado");
   });
   
   const checkout = withLoad(async () => {
     for (const it of S.cart) {
       const tx = await S.contracts.quest.buyItem(it.id, it.qty);
       await tx.wait();
     }
     notify(E.ok, "¡Compra completada!");
     S.cart = []; renderCart(); await loadInventory();
   });
   
   /* ------------------ 8.  INVENTARIO ------------------ */
   
   async function loadInventory() {
     $("#loading-inventory").style.display = "block";
     const inv = {};
     await Promise.all(S.storeItems.map(async it => {
       const qty = await S.contracts.quest.inventory(S.account, it.id);
       if (qty.gt(0)) inv[it.id] = qty.toNumber();
     }));
     S.inventory = inv;
     renderInventory();
   }
   
   function renderInventory() {
     const list = $("#inventory-list");
     list.innerHTML = "";
     Object.entries(S.inventory).forEach(([id, qty]) => {
       const li = document.createElement("div");
       li.className = "inventory-item";
       li.innerHTML = `<span>Item #${id}</span><span class="inventory-count">${qty}</span>`;
       list.append(li);
     });
     $("#no-inventory-message").style.display = Object.keys(S.inventory).length ? "none" : "block";
     $("#loading-inventory").style.display = "none";
   }
   
   /* ------------------ 9.  TOKENS → ACCIONES ------------------ */
   
   const batch = withLoad(async (fnName, msg) => {
     if (!S.selected.size) return;
     const ids = [...S.selected];
     const tx  = await S.contracts.quest[fnName](ids);
     await tx.wait(); notify(E.ok, msg);
     await loadTokens(); S.selected.clear();
   });
   
   E.stakeBtn.onclick   = () => batch("batchStake",   "Tokens stakeados");
   E.unstakeBtn.onclick = () => batch("batchUnstake", "Tokens des-stakeados");
   E.claimBtn.onclick   = () => batch("batchClaimRewards", "Recompensas reclamadas");
   
   E.lvlBtn.onclick = withLoad(async () => {
     if (S.selected.size !== 1) return notify(E.error, "Selecciona solo 1 token");
     const tokenId = [...S.selected][0];
     const tx = await S.contracts.quest.purchaseFastLevelUpgrade(tokenId);
     await tx.wait(); notify(E.ok, "Token subido de nivel");
   });
   
   /* ------------------ 10.  UI & EVENTOS ------------------ */
   
   window.toggleUI = function() {
     /* botones */
     const sel = S.selected.size;
     E.tokActions.style.display = sel ? "block" : "none";
     E.stakeBtn.textContent     = `Stake (${sel})`;
     E.unstakeBtn.textContent   = `Unstake (${sel})`;
     E.claimBtn.textContent     = `Claim (${sel})`;
     /* select-all */
     E.selectAll.textContent = sel === S.ownedTokens.length ? "Deselect All" : "Select All";
   };
   E.selectAll.onclick = () => {
     if (S.selected.size === S.ownedTokens.length) S.selected.clear();
     else S.ownedTokens.forEach(id => S.selected.add(id));
     renderTokens();
   };
   
   /* Tabs */
   E.tabs.forEach(t => t.addEventListener("click", ev => {
     ev.preventDefault();
     E.tabs.forEach(n => n.classList.remove("active"));
     t.classList.add("active");
     $(".tab-pane.active").classList.remove("active");
     $(t.dataset.bsTarget).classList.add("active");
     if (t.id === "inventoryTab") loadInventory();
   }));
   
   /* Botones carrito */
   E.approveBtn.onclick  = approve;
   E.checkoutBtn.onclick = checkout;
   
   /* ------------------ 11.  ARRANQUE ------------------ */
   
   // Definir ABIs
   const ADRIAN_PUNKS_ABI = [/* Tu ABI aquí */];
   const PUNK_QUEST_ABI = [/* Tu ABI aquí */];
   const ERC20_ABI = [/* Tu ERC20 ABI aquí */];

   // Actualizar CFG con los ABIs
   CFG.abi.punks = ADRIAN_PUNKS_ABI;
   CFG.abi.quest = PUNK_QUEST_ABI;
   CFG.abi.erc20 = ERC20_ABI;

   // Exponer funciones al scope global
   window.connect = connectWallet;
   window.renderAccount = renderAccount;
   window.bootstrapData = bootstrapData;
   window.loadBalance = loadBalance;
   window.loadFees = loadFees;
   window.loadTokens = loadTokens;
   window.renderTokens = renderTokens;
   window.toggleSelect = toggleSelect;
   window.loadStore = loadStore;
   window.renderStore = renderStore;
   window.toggleUI = toggleUI;

   // Configurar event listeners
   document.addEventListener('DOMContentLoaded', () => {
     E.connectBtn.addEventListener('click', withLoad(connectWallet));
     E.selectAll.addEventListener('click', () => {
       if (S.selected.size === S.ownedTokens.length) S.selected.clear();
       else S.ownedTokens.forEach(id => S.selected.add(id));
       renderTokens();
     });
     
     // Event listeners para pestañas
     E.tabs.forEach(t => t.addEventListener('click', ev => {
       ev.preventDefault();
       E.tabs.forEach(n => n.classList.remove('active'));
       t.classList.add('active');
       document.querySelector('.tab-pane.active').classList.remove('active');
       document.querySelector(t.dataset.bsTarget).classList.add('active');
       if (t.id === 'inventoryTab') loadInventory();
     }));
     
     // Botones del carrito
     E.approveBtn.addEventListener('click', approve);
     E.checkoutBtn.addEventListener('click', checkout);
     
     // Verificar si la wallet ya está conectada
     if (window.ethereum) {
       window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
         if (accounts.length > 0) withLoad(connectWallet)();
       });
     }
   });

   /* ------------------ 3.  FUNCIONES DE UI ------------------ */

   function updateTokenCard(token) {
     const card = document.createElement('div');
     card.className = 'token-card';
     card.innerHTML = `
       <div class="token-image">
         <img src="${CFG.imgPath}${token.id}.jpg" alt="Token ${token.id}" onerror="this.src='${CFG.placeholder}'">
       </div>
       <div class="token-info">
         <h3>Token #${token.id}</h3>
         <p>Nivel: ${token.level}</p>
         <p>XP: ${token.xp}/${token.maxXp}</p>
         <p>Durabilidad: ${token.durability}%</p>
         <p>Slots: ${token.usedSlots}/${token.slots}</p>
         <div class="token-actions">
           ${token.staked ? 
             `<button onclick="unstakeToken(${token.id})">Unstake</button>
              <button onclick="claimRewards(${token.id})">Reclamar</button>` :
             `<button onclick="stakeToken(${token.id})">Stake</button>`
           }
           <button onclick="repairItem(0, ${token.id})">Reparar</button>
           <button onclick="purchaseFastLevelUpgrade(${token.id})">Mejorar Nivel</button>
           <button onclick="purchaseExtraSlots(${token.id}, 1)">Comprar Slot</button>
         </div>
       </div>
     `;
     return card;
   }

   function updateStoreItem(item) {
     const card = document.createElement('div');
     card.className = 'store-item';
     card.innerHTML = `
       <div class="item-image">
         <img src="${CFG.imgPath}items/${item.id}.jpg" alt="Item ${item.id}" onerror="this.src='${CFG.placeholder}'">
       </div>
       <div class="item-info">
         <h3>${item.name}</h3>
         <p>Tipo: ${item.type}</p>
         <p>Precio: ${item.price} ADRIAN</p>
         <p>Bonus: ${item.bonus}%</p>
         <p>Durabilidad: ${item.durability}%</p>
         <div class="item-actions">
           <button onclick="buyItem(${item.id}, 1)">Comprar</button>
         </div>
       </div>
     `;
     return card;
   }

   function updateInventoryItem(item) {
     const card = document.createElement('div');
     card.className = 'inventory-item';
     card.innerHTML = `
       <div class="item-image">
         <img src="${CFG.imgPath}items/${item.id}.jpg" alt="Item ${item.id}" onerror="this.src='${CFG.placeholder}'">
       </div>
       <div class="item-info">
         <h3>${item.name}</h3>
         <p>Tipo: ${item.type}</p>
         <p>Durabilidad: ${item.durability}%</p>
         <div class="item-actions">
           <button onclick="equipItem(${item.tokenId}, ${item.id})">Equipar</button>
           <button onclick="repairItem(${item.instanceId}, ${item.tokenId})">Reparar</button>
         </div>
       </div>
     `;
     return card;
   }

   function updateADRIANBalance(balance) {
     const balanceElement = document.getElementById('adrian-balance');
     if (balanceElement) {
       balanceElement.textContent = `${balance} ADRIAN`;
     }
   }

   function showNotification(message, type = 'info') {
     const notification = document.createElement('div');
     notification.className = `notification ${type}`;
     notification.textContent = message;
     document.body.appendChild(notification);
     setTimeout(() => notification.remove(), 3000);
   }

   function updateUI(data) {
     const tokensContainer = document.getElementById('tokens-container');
     const storeContainer = document.getElementById('store-container');
     const inventoryContainer = document.getElementById('inventory-container');

     if (tokensContainer) {
       tokensContainer.innerHTML = '';
       data.tokens.forEach(token => {
         tokensContainer.appendChild(updateTokenCard(token));
       });
     }

     if (storeContainer) {
       storeContainer.innerHTML = '';
       data.storeItems.forEach(item => {
         storeContainer.appendChild(updateStoreItem(item));
       });
     }

     if (inventoryContainer) {
       inventoryContainer.innerHTML = '';
       data.inventoryItems.forEach(item => {
         inventoryContainer.appendChild(updateInventoryItem(item));
       });
     }

     updateADRIANBalance(data.adrianBalance);
   }

   async function initializeApp() {
     try {
       const account = await connectWallet();
       const data = await loadTokens();
       updateUI(data);
       showNotification('Aplicación cargada correctamente', 'success');
     } catch (error) {
       showNotification(error.message, 'error');
     }
   }

   // Event Listeners
   window.addEventListener('load', initializeApp);
   window.ethereum?.on('accountsChanged', initializeApp);
   window.ethereum?.on('chainChanged', initializeApp);