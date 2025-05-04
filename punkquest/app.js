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
     abi:      { punks: ADRIAN_PUNKS_ABI, quest: PUNK_QUEST_ABI, erc20: ERC20_ABI },
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
   
   window.connect = async function() {
     if (!window.ethereum) throw new Error("Instala MetaMask para continuar");
     const [acc] = await window.ethereum.request({ method: "eth_requestAccounts" });
     /* Red Base */
     if ((await ethereum.request({ method: "eth_chainId" })) !== CFG.network.chainIdHex) {
       try {
         await ethereum.request({ method: "wallet_switchEthereumChain",
                                  params: [{ chainId: CFG.network.chainIdHex }] });
       } catch (e) {
         if (e.code === 4902)
           await ethereum.request({ method: "wallet_addEthereumChain",
                                    params: [{ ...CFG.network,
                                               chainId: CFG.network.chainIdHex }] });
         else throw e;
       }
     }
   
     S.provider  = new ethers.providers.Web3Provider(window.ethereum);
     S.signer    = S.provider.getSigner();
     S.account   = acc;
     /* Instancias de contrato */
     const make = (addr, abi) => new ethers.Contract(addr, abi, S.signer);
     S.contracts.punks  = make(CFG.addresses.punks,  CFG.abi.punks);
     S.contracts.quest  = make(CFG.addresses.quest,  CFG.abi.quest);
     S.contracts.token  = make(CFG.addresses.token,  CFG.abi.erc20);
     /* Leer decimals & symbol */
     [S.decimals, S.symbol] = await Promise.all([
         S.contracts.token.decimals(),  S.contracts.token.symbol() ]);
   
     notify(E.ok, "Wallet conectada correctamente");
     renderAccount(); await bootstrapData();
   };
   
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
     E.loadingTok.style.display = "block"; E.grid.innerHTML = "";
     const bal = (await S.contracts.punks.balanceOf(S.account)).toNumber();
     if (!bal) { E.noTok.style.display = "block"; return; }
   
     /* Obtener Ids mediante multicall */
     const iface = new ethers.utils.Interface(CFG.abi.punks);
     const calls = [...Array(bal).keys()].map(i => ({
         target: CFG.addresses.punks,
         allowFailure: false,
         callData: iface.encodeFunctionData("tokenOfOwnerByIndex", [S.account, i])
     }));
     const results = await new ethers.Contract(
           CFG.addresses.multicall,
           ["function aggregate3(tuple(address,bool,bytes)[]) view returns((bool,bytes)[])"],
           S.provider
         ).aggregate3(calls);
   
     S.ownedTokens = results.map(r =>
         iface.decodeFunctionResult("tokenOfOwnerByIndex", r.returnData)[0].toNumber());
   
     renderTokens();
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
   
   E.connectBtn.onclick = withLoad(connect);
   
   /* Si la wallet ya está conectada, conecta auto */
   window.addEventListener("load", async () => {
     const accs = window.ethereum ? await ethereum.request({ method: "eth_accounts" }) : [];
     if (accs.length) withLoad(connect)();
   });