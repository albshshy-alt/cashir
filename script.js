// ===== بيانات المنتجات =====
let products = [
  // أضف منتجاتك من لوحة الإدارة، أو عدّل هذه القائمة مباشرة من الكود
];

// معرّف فريد لكل منتج (حتى لا تتعارض الأسماء المتشابهة)
products.forEach((p, i) => (p.id = i));

// ===== تخزين محلي لتعديلات/إضافات لوحة الإدارة (يبقى بعد تحديث الصفحة) =====
const OVERRIDES_KEY = "nasrLibraryProductOverrides";       // تعديلات على منتج أساسي: id -> {name?, price?, category?, barcode?}
const CUSTOM_PRODUCTS_KEY = "nasrLibraryCustomProducts";   // منتجات جديدة أُضيفت بالكامل من لوحة الإدارة
const DELETED_IDS_KEY = "nasrLibraryDeletedProductIds";    // منتجات أساسية حُذفت من لوحة الإدارة
const NEXT_CUSTOM_ID_KEY = "nasrLibraryNextCustomId";
const FIRST_CUSTOM_ID = 100000; // أكبر بكثير من عدد منتجات القائمة الأساسية لتفادي أي تعارض
const STORE_NAME_KEY = "libraryStoreName";
const STORE_SUB_KEY = "libraryStoreSub";
const ADMIN_PASSWORD_KEY = "adminPassword";
const DEFAULT_ADMIN_PASSWORD = "1234";
const ADMIN_PASSWORD_HASH_KEY = "adminPasswordHash";
const STOCK_KEY = "kashierProductStock";
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function loadStock() { return loadJSON(STOCK_KEY, {}); }
function saveStock(value) { saveJSON(STOCK_KEY, value); }
let productStock = loadStock(); // id -> non-negative quantity; missing key means not tracked
function getStock(product) {
  const value = productStock[String(product.id)];
  return Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
}
function setStock(product, value) {
  const qty = Math.max(0, Math.floor(Number(value) || 0));
  productStock[String(product.id)] = qty;
  saveStock(productStock);
}
function stockLabel(product) {
  const stock = getStock(product);
  return stock === null ? "الكمية: غير محددة" : stock === 0 ? "انتهت الكمية" : `المتوفر: ${stock}`;
}

// ===== اسم المحل (قابل للتغيير من لوحة الإدارة) =====
function loadStoreName() { return localStorage.getItem(STORE_NAME_KEY) || ""; }
function saveStoreName(value) { localStorage.setItem(STORE_NAME_KEY, value); }
function loadStoreSub() { return localStorage.getItem(STORE_SUB_KEY) || ""; }
function saveStoreSub(value) { localStorage.setItem(STORE_SUB_KEY, value); }

function applyStoreIdentity() {
  const name = loadStoreName();
  const sub = loadStoreSub();
  const displayName = name || "نظام كاشير";
  const displaySub = sub || "إدارة المبيعات والمخزون";
  const mark = displayName.trim().charAt(0);

  document.title = [displayName, sub].filter(Boolean).join(" - ");

  const brandMark = document.getElementById("brandMark");
  const brandName = document.getElementById("brandName");
  const brandSub = document.getElementById("brandSub");
  if (brandMark) brandMark.textContent = mark;
  if (brandName) brandName.textContent = displayName;
  if (brandSub) brandSub.textContent = displaySub;

  const invoiceMark = document.getElementById("invoiceMark");
  const invoiceBrandName = document.getElementById("invoiceBrandName");
  const invoiceBrandSub = document.getElementById("invoiceBrandSub");
  if (invoiceMark) invoiceMark.textContent = mark;
  if (invoiceBrandName) invoiceBrandName.textContent = displayName;
  if (invoiceBrandSub) invoiceBrandSub.textContent = displaySub;

  const footerLine = document.getElementById("footerLine");
  if (footerLine) {
    footerLine.textContent = name
      ? `${[name, sub].filter(Boolean).join(" — ")}. الأسعار قابلة للتغيير دون إشعار مسبق.`
      : "الأسعار قابلة للتغيير دون إشعار مسبق.";
  }

  const invoiceThanksLine = document.getElementById("invoiceThanksLine");
  if (invoiceThanksLine) {
    invoiceThanksLine.textContent = name
      ? `شكرًا لتعاملكم مع ${[name, sub].filter(Boolean).join(" — ")}`
      : "شكرًا لتعاملكم معنا";
  }
}

function loadOverrides() { return loadJSON(OVERRIDES_KEY, {}); }
function saveOverrides(obj) { saveJSON(OVERRIDES_KEY, obj); }
function loadCustomProducts() { return loadJSON(CUSTOM_PRODUCTS_KEY, []); }
function saveCustomProducts(list) { saveJSON(CUSTOM_PRODUCTS_KEY, list); }
function loadDeletedIds() { return loadJSON(DELETED_IDS_KEY, []); }
function saveDeletedIds(list) { saveJSON(DELETED_IDS_KEY, list); }
function nextCustomId() {
  const current = parseInt(localStorage.getItem(NEXT_CUSTOM_ID_KEY), 10) || FIRST_CUSTOM_ID;
  localStorage.setItem(NEXT_CUSTOM_ID_KEY, String(current + 1));
  return current;
}

// 1) تطبيق التعديلات المحفوظة على منتجات القائمة الأساسية (تعديل اسم/سعر/تصنيف/باركود)
let productOverrides = loadOverrides();
Object.entries(productOverrides).forEach(([id, patch]) => {
  const product = products.find(p => p.id === Number(id));
  if (product) Object.assign(product, patch);
});

// 2) حذف المنتجات الأساسية التي حُذفت من لوحة الإدارة
let deletedProductIds = loadDeletedIds();
products = products.filter(p => !deletedProductIds.includes(p.id));

// 3) إضافة المنتجات الجديدة التي أُنشئت بالكامل من لوحة الإدارة
let customProducts = loadCustomProducts();
products = products.concat(customProducts);

// ===== باركود لكل منتج =====
// إذا كان للمنتج باركود جاهز من الشركة (أُضيف يدويًا في تعريفه، أو عبر قسم
// "إضافة باركود" في لوحة الإدارة)، يُستخدم كما هو. غير ذلك يُولَّد له باركود
// داخلي تلقائيًا (أرقام فقط حتى لا يتأثر بلغة لوحة المفاتيح عند المسح).
function assignDefaultBarcodeIfMissing(p) {
  if (!p.barcode) {
    p.barcode = "20" + String(p.id + 1).padStart(6, "0");
  }
}
products.forEach(assignDefaultBarcodeIfMissing);

let categories = [...new Set(products.map(p => p.category))];
function rebuildCategories() {
  categories = [...new Set(products.map(p => p.category))];
}
let activeCategory = "الكل";
let cart = {}; // { id: { ...product, qty } }

const catalogEl = document.getElementById("catalog");
const tabsEl = document.getElementById("tabs");
const searchInput = document.getElementById("searchInput");
const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartOverlay = document.getElementById("cartOverlay");
const closeCart = document.getElementById("closeCart");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const clearCartBtn = document.getElementById("clearCart");
const printInvoiceBtn = document.getElementById("printInvoiceBtn");
const customerNameInput = document.getElementById("customerName");
const discountValueInput = document.getElementById("discountValue");
const discountTypeSelect = document.getElementById("discountType");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartDiscountRowEl = document.getElementById("cartDiscountRow");
const cartDiscountAmountEl = document.getElementById("cartDiscountAmount");

// عناصر قائمة الفواتير السابقة
const historyBtn = document.getElementById("historyBtn");
const historyOverlay = document.getElementById("historyOverlay");
const closeHistory = document.getElementById("closeHistory");
const historyListEl = document.getElementById("historyList");
const historySearch = document.getElementById("historySearch");
const clearHistoryBtn = document.getElementById("clearHistory");

// عناصر مسح الباركود
const barcodeInput = document.getElementById("barcodeInput");
const scanToast = document.getElementById("scanToast");
const printBarcodesBtn = document.getElementById("printBarcodesBtn");
const barcodeSheetGrid = document.getElementById("barcodeSheetGrid");

// عناصر لوحة الإدارة
const adminBtn = document.getElementById("adminBtn");
const adminOverlay = document.getElementById("adminOverlay");
const storeNameInput = document.getElementById("storeNameInput");
const storeSubInput = document.getElementById("storeSubInput");
const saveStoreNameBtn = document.getElementById("saveStoreNameBtn");
const storeNameMsg = document.getElementById("storeNameMsg");
const closeAdmin = document.getElementById("closeAdmin");
// قسم إضافة باركود
const assignBarcodeSelect = document.getElementById("assignBarcodeSelect");
const assignBarcodeValue = document.getElementById("assignBarcodeValue");
const assignBarcodeBtn = document.getElementById("assignBarcodeBtn");
const assignBarcodeMsg = document.getElementById("assignBarcodeMsg");
// قسم إضافة/تعديل المنتجات
const adminProductsList = document.getElementById("adminProductsList");
const newProductName = document.getElementById("newProductName");
const newProductCategory = document.getElementById("newProductCategory");
const newProductPrice = document.getElementById("newProductPrice");
const newProductCost = document.getElementById("newProductCost");
const newProductStock = document.getElementById("newProductStock");
const newProductBarcode = document.getElementById("newProductBarcode");
const addProductBtn = document.getElementById("addProductBtn");
const addProductMsg = document.getElementById("addProductMsg");
const reportsBtn = document.getElementById("reportsBtn");
const reportsOverlay = document.getElementById("reportsOverlay");
const closeReports = document.getElementById("closeReports");
const reportFrom = document.getElementById("reportFrom");
const reportTo = document.getElementById("reportTo");
const runReportBtn = document.getElementById("runReportBtn");
const printReportBtn = document.getElementById("printReportBtn");
const reportSummary = document.getElementById("reportSummary");
const reportTopProducts = document.getElementById("reportTopProducts");
const reportInvoices = document.getElementById("reportInvoices");
const updateBanner = document.getElementById("updateBanner");
const updateTitle = document.getElementById("updateTitle");
const updateMessage = document.getElementById("updateMessage");
const updateNowBtn = document.getElementById("updateNowBtn");
const updateLaterBtn = document.getElementById("updateLaterBtn");
const updateProgress = document.getElementById("updateProgress");
const updateProgressBar = updateProgress?.querySelector("span");

// إشعار التحديث داخل واجهة التطبيق.
if (window.desktopUpdater) {
  window.desktopUpdater.onAvailable(({ version }) => {
    updateTitle.textContent = "يتوفر تحديث جديد";
    updateMessage.textContent = `الإصدار ${version} جاهز. اضغط تحديث الآن لتنزيله وتثبيته تلقائيًا.`;
    updateBanner.hidden = false;
  });
  window.desktopUpdater.onProgress(({ percent }) => {
    updateProgress.hidden = false;
    updateNowBtn.disabled = true;
    updateNowBtn.textContent = `جارٍ التحديث ${Math.round(percent)}%`;
    if (updateProgressBar) updateProgressBar.style.width = `${percent}%`;
  });
  window.desktopUpdater.onDownloaded(() => {
    updateTitle.textContent = "اكتمل تنزيل التحديث";
    updateMessage.textContent = "اضغط موافق لإعادة تشغيل التطبيق وتطبيق التحديث.";
    updateNowBtn.disabled = false;
    updateNowBtn.textContent = "موافق وإعادة التشغيل";
    updateNowBtn.onclick = () => window.desktopUpdater.install();
  });
  window.desktopUpdater.onError(() => {
    updateMessage.textContent = "تعذر تنزيل التحديث حاليًا. حاول لاحقًا.";
    updateNowBtn.disabled = false;
  });
  updateNowBtn.onclick = () => window.desktopUpdater.download();
  updateLaterBtn.addEventListener("click", () => { updateBanner.hidden = true; });
}

// ===== التبويبات =====
function renderTabs() {
  const allTabs = ["الكل", ...categories];
  tabsEl.innerHTML = allTabs.map(cat => `
    <button class="tab-btn ${cat === activeCategory ? "active" : ""}" data-cat="${cat}">${cat}</button>
  `).join("");

  tabsEl.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderTabs();
      renderCatalog();
    });
  });
}

// ===== الكتالوج =====
function renderCatalog() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = products.filter(p => {
    const matchesCategory = activeCategory === "الكل" || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    catalogEl.innerHTML = `<p class="no-results">لا توجد نتائج مطابقة للبحث.</p>`;
    return;
  }

  const grouped = {};
  filtered.forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });

  catalogEl.innerHTML = Object.entries(grouped).map(([cat, items]) => `
    <div class="cat-group">
      <h2>${cat}</h2>
      <div class="cat-grid">
        ${items.map(p => `
          <div class="product-card ${getStock(p) === 0 ? "out-of-stock" : ""}">
            <h4>${p.name}</h4>
            ${p.note ? `<div class="product-note">${p.note}</div>` : ""}
            <div class="stock-status ${getStock(p) === 0 ? "stock-empty" : ""}">${stockLabel(p)}</div>
            <div class="product-bottom">
              <span class="price">${p.price} ل.س</span>
              <button class="add-btn" data-id="${p.id}" ${getStock(p) === 0 ? "disabled" : ""}>${getStock(p) === 0 ? "انتهت الكمية" : "أضف"}</button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");

  catalogEl.querySelectorAll(".add-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      addToCart(parseInt(btn.dataset.id));
      btn.textContent = "أُضيف ✓";
      btn.classList.add("added");
      setTimeout(() => {
        btn.textContent = "أضف";
        btn.classList.remove("added");
      }, 900);
    });
  });
}

// ===== السلة =====
function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const stock = getStock(product);
  const currentQty = cart[id]?.qty || 0;
  if (stock === 0 || (stock !== null && currentQty >= stock)) {
    showScanToast(`انتهت الكمية المتوفرة من: ${product.name}`, "error");
    return;
  }
  if (cart[id]) {
    cart[id].qty += 1;
  } else {
    cart[id] = { ...product, qty: 1 };
  }
  updateCartUI();
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  const product = products.find(p => p.id === id);
  const stock = product ? getStock(product) : null;
  if (delta > 0 && stock !== null && cart[id].qty >= stock) {
    showScanToast(`لا يمكن تجاوز الكمية المتوفرة من: ${product.name}`, "error");
    return;
  }
  cart[id].qty += delta;
  if (cart[id].qty <= 0) delete cart[id];
  updateCartUI();
}

function removeItem(id) {
  delete cart[id];
  updateCartUI();
}

function getCartSubtotal() {
  return Object.values(cart).reduce((sum, i) => sum + i.qty * i.price, 0);
}

// يحسب قيمة الحسم الفعلية بالليرة بناءً على النوع المختار (نسبة % أو مبلغ ثابت)
// مع منع أي قيمة سالبة أو حسم يتجاوز المجموع الفرعي
function getDiscountAmount(subtotal) {
  const rawValue = parseFloat(discountValueInput.value);
  if (!rawValue || rawValue <= 0) return 0;

  if (discountTypeSelect.value === "amount") {
    return Math.min(rawValue, subtotal);
  }
  // نسبة مئوية، بحد أقصى 100%
  const pct = Math.min(rawValue, 100);
  return Math.round((subtotal * pct) / 100);
}

function getCartTotal() {
  const subtotal = getCartSubtotal();
  return subtotal - getDiscountAmount(subtotal);
}

function updateCartUI() {
  const items = Object.values(cart);
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = getCartSubtotal();
  const discountAmount = getDiscountAmount(subtotal);
  const totalPrice = subtotal - discountAmount;

  cartCount.textContent = totalQty;
  cartSubtotalEl.textContent = `${subtotal} ل.س`;
  if (discountAmount > 0) {
    cartDiscountRowEl.classList.add("show");
    cartDiscountAmountEl.textContent = `- ${discountAmount} ل.س`;
  } else {
    cartDiscountRowEl.classList.remove("show");
  }
  cartTotalEl.textContent = `${totalPrice} ل.س`;

  if (items.length === 0) {
    cartItemsEl.innerHTML = `<p class="empty-cart">السلة فارغة حاليًا.</p>`;
    return;
  }

  cartItemsEl.innerHTML = items.map(i => `
    <div class="cart-item">
      <span class="cart-item-name">${i.name}</span>
      <div class="cart-item-qty">
        <button class="qty-btn" data-id="${i.id}" data-delta="-1">−</button>
        <span>${i.qty}</span>
        <button class="qty-btn" data-id="${i.id}" data-delta="1">+</button>
      </div>
      <span>${i.qty * i.price} ل.س</span>
      <button class="remove-btn" data-id="${i.id}" title="حذف">×</button>
    </div>
  `).join("");

  cartItemsEl.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      changeQty(parseInt(btn.dataset.id), parseInt(btn.dataset.delta));
    });
  });
  cartItemsEl.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", () => removeItem(parseInt(btn.dataset.id)));
  });
}

// ===== تخزين الفواتير السابقة (localStorage) =====
const HISTORY_KEY = "nasrLibraryInvoices";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

function addInvoiceToHistory(invoice) {
  const list = loadHistory();
  list.unshift(invoice); // الأحدث أولاً
  saveHistory(list);
}

function deleteInvoiceFromHistory(invNumber) {
  const list = loadHistory().filter(inv => inv.number !== invNumber);
  saveHistory(list);
  renderHistory();
}

// ===== الفاتورة والطباعة =====
function generateInvoiceNumber() {
  const now = new Date();
  return `NS-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,"0")}${now.getDate().toString().padStart(2,"0")}-${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
}

function fillInvoiceDOM(invoice) {
  document.getElementById("invNumber").textContent = invoice.number;
  document.getElementById("invDate").textContent = invoice.dateLabel;
  document.getElementById("invCustomer").textContent = invoice.customer || "—";

  document.getElementById("invoiceBody").innerHTML = invoice.items.map(i => `
    <tr>
      <td>${i.name}</td>
      <td>${i.qty}</td>
      <td>${i.price} ل.س</td>
      <td>${i.qty * i.price} ل.س</td>
    </tr>
  `).join("");

  // المجموع الفرعي: نستخدم القيمة المخزّنة إن وجدت، وإلا نعتبره مساويًا
  // للمجموع الكلي (للتوافق مع الفواتير القديمة المحفوظة قبل إضافة الحسم)
  const subtotal = invoice.subtotal != null ? invoice.subtotal : invoice.total;
  document.getElementById("invSubtotal").textContent = `${subtotal} ل.س`;

  const discountRow = document.getElementById("invDiscountRow");
  const discountAmount = invoice.discountAmount || 0;
  if (discountAmount > 0) {
    const label = invoice.discountType === "percent"
      ? `الحسم (${invoice.discountValue}%)`
      : "الحسم";
    document.getElementById("invDiscountLabel").textContent = label;
    document.getElementById("invDiscountAmount").textContent = `- ${discountAmount} ل.س`;
    discountRow.classList.add("show");
  } else {
    discountRow.classList.remove("show");
  }

  document.getElementById("invTotal").textContent = `${invoice.total} ل.س`;
}

function buildInvoiceFromCart() {
  const items = Object.values(cart).map(i => ({
    name: i.name, qty: i.qty, price: i.price, cost: Number(i.cost) || 0
  }));
  const subtotal = getCartSubtotal();
  const discountAmount = getDiscountAmount(subtotal);
  const discountType = discountAmount > 0 ? discountTypeSelect.value : null;
  const discountValue = discountAmount > 0 ? (parseFloat(discountValueInput.value) || 0) : 0;
  const total = subtotal - discountAmount;
  const customer = customerNameInput.value.trim();
  const now = new Date();

  const invoice = {
    number: generateInvoiceNumber(),
    dateLabel: now.toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" }),
    timestamp: now.getTime(),
    customer,
    items,
    subtotal,
    discountType,
    discountValue,
    discountAmount,
    total
  };

  fillInvoiceDOM(invoice);
  return invoice;
}

function getInvoiceCost(invoice) {
  return (invoice.items || []).reduce((sum, item) => sum + (Number(item.cost) || 0) * (Number(item.qty) || 0), 0);
}
function dateKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function renderReports() {
  const from = reportFrom.value || "0000-01-01";
  const to = reportTo.value || "9999-12-31";
  const invoices = loadHistory().filter(inv => { const day = dateKey(inv.timestamp); return day >= from && day <= to; });
  const sales = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const cost = invoices.reduce((sum, inv) => sum + getInvoiceCost(inv), 0);
  const discount = invoices.reduce((sum, inv) => sum + (Number(inv.discountAmount) || 0), 0);
  const profit = sales - cost;
  const quantity = invoices.reduce((sum, inv) => sum + (inv.items || []).reduce((n, item) => n + (Number(item.qty) || 0), 0), 0);
  const top = {};
  invoices.forEach(inv => (inv.items || []).forEach(item => {
    if (!top[item.name]) top[item.name] = { qty: 0, sales: 0 };
    top[item.name].qty += Number(item.qty) || 0;
    top[item.name].sales += (Number(item.qty) || 0) * (Number(item.price) || 0);
  }));
  const topRows = Object.entries(top).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
  reportSummary.innerHTML = [["إجمالي الفواتير", invoices.length], ["القطع المباعة", quantity], ["صافي المبيعات", `${sales} ل.س`], ["الخصومات", `${discount} ل.س`], ["تكلفة المنتجات", `${cost} ل.س`], ["صافي الربح", `${profit} ل.س`]].map(([label, value]) => `<div class="report-stat"><small>${label}</small><strong>${value}</strong></div>`).join("");
  reportTopProducts.innerHTML = `<h4>الأكثر مبيعًا</h4>${topRows.length ? `<table class="report-table"><thead><tr><th>المنتج</th><th>الكمية</th><th>المبيعات</th></tr></thead><tbody>${topRows.map(([name, data]) => `<tr><td>${name}</td><td>${data.qty}</td><td>${data.sales} ل.س</td></tr>`).join("")}</tbody></table>` : `<p class="history-empty">لا توجد مبيعات في الفترة المحددة.</p>`}`;
  reportInvoices.innerHTML = `<h4>الفواتير المشمولة: ${invoices.length}</h4>`;
}

function completeSaleAndDeductStock() {
  const nextStock = { ...productStock };
  for (const item of Object.values(cart)) {
    const stock = getStock(item);
    if (stock !== null && item.qty > stock) {
      alert(`الكمية المطلوبة من "${item.name}" أكبر من المتوفر (${stock}).`);
      return false;
    }
    if (stock !== null) nextStock[String(item.id)] = stock - item.qty;
  }
  productStock = nextStock;
  saveStock(productStock);
  return true;
}

printInvoiceBtn.addEventListener("click", () => {
  if (Object.keys(cart).length === 0) {
    alert("السلة فارغة، أضف منتجات أولاً.");
    return;
  }
  const invoice = buildInvoiceFromCart();
  if (!completeSaleAndDeductStock()) return;
  addInvoiceToHistory(invoice);
  cart = {};
  updateCartUI();
  renderCatalog();
  window.print();
});

// ===== عرض قائمة الفواتير السابقة =====
function renderHistory() {
  const query = historySearch.value.trim().toLowerCase();
  const list = loadHistory().filter(inv => {
    const customer = (inv.customer || "").toLowerCase();
    const number = inv.number.toLowerCase();
    return customer.includes(query) || number.includes(query);
  });

  if (list.length === 0) {
    historyListEl.innerHTML = `<p class="history-empty">لا توجد فواتير محفوظة بعد.</p>`;
    return;
  }

  historyListEl.innerHTML = list.map(inv => `
    <div class="history-card">
      <div class="history-card-top">
        <b>${inv.customer || "زبون بدون اسم"}</b>
        <span>${inv.dateLabel}</span>
      </div>
      <div class="history-card-sub">رقم: ${inv.number} • ${inv.items.length} صنف • ${inv.total} ل.س</div>
      <div class="history-card-actions">
        <button class="history-mini-btn" data-action="view" data-number="${inv.number}">إعادة طباعة</button>
        <button class="history-mini-btn danger" data-action="delete" data-number="${inv.number}">حذف</button>
      </div>
    </div>
  `).join("");

  historyListEl.querySelectorAll("[data-action='view']").forEach(btn => {
    btn.addEventListener("click", () => {
      const inv = loadHistory().find(i => i.number === btn.dataset.number);
      if (!inv) return;
      fillInvoiceDOM(inv);
      window.print();
    });
  });

  historyListEl.querySelectorAll("[data-action='delete']").forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm("هل تريد حذف هذه الفاتورة من السجل؟")) {
        deleteInvoiceFromHistory(btn.dataset.number);
      }
    });
  });
}

historyBtn.addEventListener("click", () => {
  renderHistory();
  historyOverlay.classList.add("open");
});
closeHistory.addEventListener("click", () => historyOverlay.classList.remove("open"));
historyOverlay.addEventListener("click", (e) => {
  if (e.target === historyOverlay) historyOverlay.classList.remove("open");
});
historySearch.addEventListener("input", renderHistory);
clearHistoryBtn.addEventListener("click", () => {
  if (confirm("هل تريد حذف كل سجل الفواتير السابقة؟ لا يمكن التراجع عن هذا.")) {
    saveHistory([]);
    renderHistory();
  }
});

// ===== وضع مسح الباركود (هاتف موصول بالكمبيوتر عبر USB كـ"لوحة مفاتيح") =====
// أغلب تطبيقات مسح الباركود على الهاتف (مثل Barcode to PC أو أي تطبيق
// "Keyboard Wedge") عند توصيل الهاتف بالكمبيوتر عبر USB، تقوم بكتابة رقم
// الباركود الممسوح مباشرة كأنه مكتوب من لوحة المفاتيح داخل الحقل المركّز
// عليه، ثم تضغط Enter تلقائيًا. لذلك نقرأ القيمة الفعلية من حقل الباركود
// نفسه مباشرة (بدل تجميع الأحرف يدويًا بمؤقّت) لتفادي أي تفاوت بالتوقيت
// بين الأحرف قد يسبب اختلاف بين القيمة الظاهرة وما يتم فحصه فعليًا.

// تحويل الأرقام العربية (الهندية) أو الفارسية إلى أرقام إنجليزية عادية،
// لأن بعض تخطيطات لوحة المفاتيح العربية تكتب الأرقام بهذا الشكل: ٠١٢٣٤٥٦٧٨٩
function toEnglishDigits(str) {
  return str.replace(/[٠-٩۰-۹]/g, (d) => {
    const code = d.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660); // عربي
    if (code >= 0x06F0 && code <= 0x06F9) return String(code - 0x06F0); // فارسي
    return d;
  });
}

// الباركود أرقام فقط، لذلك نطبّعه بتحويل أي أرقام عربية إلى إنجليزية ثم
// إزالة أي شيء ليس رقمًا — هذا يجعل المسح يعمل بغض النظر عن لغة لوحة
// المفاتيح المفعّلة على الكمبيوتر وقت المسح.
function normalizeBarcode(code) {
  return toEnglishDigits(code.trim()).replace(/[^0-9]/g, "");
}

// خريطة باركود مطبّعة، قابلة لإعادة البناء عند إضافة/تعديل منتج من لوحة الإدارة
let barcodeMapNormalized = {};
function rebuildBarcodeMap() {
  barcodeMapNormalized = {};
  products.forEach((p) => {
    barcodeMapNormalized[normalizeBarcode(p.barcode)] = p.id;
  });
}
rebuildBarcodeMap();

barcodeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === "Tab") {
    e.preventDefault();
    const raw = barcodeInput.value;
    barcodeInput.value = "";
    if (raw.trim().length > 0) {
      handleBarcodeScanned(raw);
    }
  }
});

// دعم أيضًا التطبيقات التي لا ترسل Enter بعد المسح
let barcodeInputTimer = null;
barcodeInput.addEventListener("input", () => {
  clearTimeout(barcodeInputTimer);
  barcodeInputTimer = setTimeout(() => {
    const raw = barcodeInput.value;
    if (raw.trim().length >= 4) {
      handleBarcodeScanned(raw);
      barcodeInput.value = "";
    }
  }, 400);
});

function handleBarcodeScanned(code) {
  const norm = normalizeBarcode(code);
  const id = barcodeMapNormalized[norm];
  if (id === undefined) {
    showScanToast(`⚠️ باركود غير معروف: ${code}`, "error");
    return;
  }
  addToCart(id);
  const product = products.find(p => p.id === id);
  showScanToast(`✅ أُضيف إلى السلة: ${product.name}`, "success");
}

let toastTimer = null;
function showScanToast(message, type) {
  scanToast.textContent = message;
  scanToast.className = "scan-toast show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    scanToast.classList.remove("show");
  }, 2200);
}

// إبقاء حقل الباركود مركّزًا عليه دائمًا لتسهيل المسح المباشر
function focusBarcodeInput() {
  if (document.activeElement !== barcodeInput && !cartOverlay.classList.contains("open") && !historyOverlay.classList.contains("open") && !adminOverlay.classList.contains("open")) {
    barcodeInput.focus();
  }
}
barcodeInput.addEventListener("blur", () => {
  setTimeout(focusBarcodeInput, 50);
});

// ===== طباعة ملصقات الباركود لكل المنتجات =====
printBarcodesBtn.addEventListener("click", () => {
  barcodeSheetGrid.innerHTML = products.map(p => `
    <div class="barcode-label">
      <div class="bc-name">${p.name}</div>
      <div class="bc-price">${p.price} ل.س</div>
      <svg class="bc-svg" data-code="${p.barcode}"></svg>
    </div>
  `).join("");

  barcodeSheetGrid.querySelectorAll(".bc-svg").forEach(svg => {
    JsBarcode(svg, svg.dataset.code, {
      format: "CODE128",
      width: 1.5,
      height: 35,
      fontSize: 11,
      margin: 2
    });
  });

  document.body.classList.add("printing-barcodes");
  window.print();
});
window.addEventListener("afterprint", () => {
  document.body.classList.remove("printing-barcodes");
  document.body.classList.remove("printing-report");
});

reportsBtn.addEventListener("click", () => {
  const today = dateKey(Date.now());
  if (!reportFrom.value) reportFrom.value = today;
  if (!reportTo.value) reportTo.value = today;
  renderReports();
  reportsOverlay.classList.add("open");
});
closeReports.addEventListener("click", () => reportsOverlay.classList.remove("open"));
reportsOverlay.addEventListener("click", (event) => {
  if (event.target === reportsOverlay) reportsOverlay.classList.remove("open");
});
runReportBtn.addEventListener("click", renderReports);
printReportBtn.addEventListener("click", () => {
  renderReports();
  document.body.classList.add("printing-report");
  window.print();
});

// ===== لوحة الإدارة =====

// -- قسم 1: ربط باركود بمنتج (باركود شركة أو باركود يُكتب يدويًا) --
function fillAssignBarcodeSelect() {
  assignBarcodeSelect.innerHTML = products
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ar"))
    .map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`)
    .join("");
}

assignBarcodeBtn.addEventListener("click", () => {
  const id = Number(assignBarcodeSelect.value);
  const rawCode = assignBarcodeValue.value.trim();
  const code = normalizeBarcode(rawCode);

  if (!code) {
    assignBarcodeMsg.textContent = "⚠️ اكتب رقم الباركود أولًا";
    assignBarcodeMsg.className = "admin-msg error";
    return;
  }
  const existingOwnerId = barcodeMapNormalized[code];
  if (existingOwnerId !== undefined && existingOwnerId !== id) {
    const owner = products.find(p => p.id === existingOwnerId);
    assignBarcodeMsg.textContent = `⚠️ هذا الباركود مستخدم بالفعل للمنتج: ${owner ? owner.name : existingOwnerId}`;
    assignBarcodeMsg.className = "admin-msg error";
    return;
  }

  const product = products.find(p => p.id === id);
  if (!product) return;
  product.barcode = code;

  // حفظ التعديل: إذا كان منتجًا أساسيًا نحفظه في overrides، وإذا كان منتجًا
  // مخصصًا أُضيف من لوحة الإدارة نحدّثه مباشرة داخل customProducts
  if (id < FIRST_CUSTOM_ID) {
    productOverrides[id] = { ...(productOverrides[id] || {}), barcode: code };
    saveOverrides(productOverrides);
  } else {
    const cp = customProducts.find(p => p.id === id);
    if (cp) { cp.barcode = code; saveCustomProducts(customProducts); }
  }

  rebuildBarcodeMap();
  fillAssignBarcodeSelect();
  renderAdminProductsList();
  assignBarcodeValue.value = "";
  assignBarcodeMsg.textContent = `✅ تم ربط الباركود بمنتج: ${product.name}`;
  assignBarcodeMsg.className = "admin-msg success";
});

// -- قسم 2: إضافة وتعديل المنتجات --
function fillCategoryDatalist() {
  newProductCategory.setAttribute("list", "categoryOptions");
  let datalist = document.getElementById("categoryOptions");
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = "categoryOptions";
    document.body.appendChild(datalist);
  }
  datalist.innerHTML = categories.map(c => `<option value="${c}"></option>`).join("");
}

function renderAdminProductsList() {
  adminProductsList.innerHTML = products
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ar"))
    .map(p => `
      <div class="admin-product-row" data-id="${p.id}">
        <input type="text" class="ap-name" value="${p.name}" />
        <input type="text" class="ap-category" value="${p.category}" />
        <input type="number" class="ap-price" value="${p.price}" min="0" />
        <input type="number" class="ap-cost" value="${Number(p.cost) || 0}" min="0" />
        <input type="number" class="ap-stock" value="${getStock(p) ?? ""}" min="0" placeholder="غير محدد" />
        <span class="ap-barcode">${p.barcode}</span>
        <button class="ap-save">حفظ</button>
        <button class="ap-delete">حذف</button>
      </div>
    `).join("");
}

adminProductsList.addEventListener("click", (e) => {
  const row = e.target.closest(".admin-product-row");
  if (!row) return;
  const id = Number(row.dataset.id);

  if (e.target.classList.contains("ap-save")) {
    const name = row.querySelector(".ap-name").value.trim();
    const category = row.querySelector(".ap-category").value.trim();
    const price = Number(row.querySelector(".ap-price").value);
    const cost = Number(row.querySelector(".ap-cost").value);
    const stockInput = row.querySelector(".ap-stock").value.trim();
    const stock = stockInput === "" ? null : Number(stockInput);
    if (!name || !category || !Number.isFinite(price) || price < 0 || !Number.isFinite(cost) || cost < 0 || cost > price || (stock !== null && (!Number.isFinite(stock) || stock < 0))) {
      addProductMsg.textContent = "⚠️ تأكد من تعبئة الاسم والتصنيف والسعر بشكل صحيح";
      addProductMsg.className = "admin-msg error";
      return;
    }
    const product = products.find(p => p.id === id);
    Object.assign(product, { name, category, price, cost });
    if (stock === null) delete productStock[String(id)];
    else setStock(product, stock);
    if (stock === null) saveStock(productStock);

    if (id < FIRST_CUSTOM_ID) {
      productOverrides[id] = { ...(productOverrides[id] || {}), name, category, price, cost };
      saveOverrides(productOverrides);
    } else {
      const cp = customProducts.find(p => p.id === id);
      if (cp) { Object.assign(cp, { name, category, price, cost }); saveCustomProducts(customProducts); }
    }

    rebuildCategories();
    fillCategoryDatalist();
    renderTabs();
    renderCatalog();
    fillAssignBarcodeSelect();
    addProductMsg.textContent = `✅ تم حفظ تعديلات المنتج: ${name}`;
    addProductMsg.className = "admin-msg success";
  }

  if (e.target.classList.contains("ap-delete")) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    if (!confirm(`هل تريد حذف "${product.name}" نهائيًا؟`)) return;

    products = products.filter(p => p.id !== id);
    delete barcodeMapNormalized[normalizeBarcode(product.barcode)];
    delete productStock[String(id)];
    saveStock(productStock);

    if (id < FIRST_CUSTOM_ID) {
      deletedProductIds.push(id);
      saveDeletedIds(deletedProductIds);
      delete productOverrides[id];
      saveOverrides(productOverrides);
    } else {
      customProducts = customProducts.filter(p => p.id !== id);
      saveCustomProducts(customProducts);
    }

    rebuildCategories();
    fillCategoryDatalist();
    renderTabs();
    renderCatalog();
    fillAssignBarcodeSelect();
    renderAdminProductsList();
  }
});

addProductBtn.addEventListener("click", () => {
  const name = newProductName.value.trim();
  const category = newProductCategory.value.trim();
  const price = Number(newProductPrice.value);
  const cost = Number(newProductCost.value);
  const stockInput = newProductStock.value.trim();
  const stock = stockInput === "" ? null : Number(stockInput);
  const rawBarcode = newProductBarcode.value.trim();

  if (!name || !category || !Number.isFinite(price) || price < 0 || !Number.isFinite(cost) || cost < 0 || cost > price || (stock !== null && (!Number.isFinite(stock) || stock < 0))) {
    addProductMsg.textContent = "⚠️ تأكد من تعبئة الاسم والتصنيف والسعر بشكل صحيح";
    addProductMsg.className = "admin-msg error";
    return;
  }

  const newProduct = { id: nextCustomId(), name, category, price, cost };
  if (stock !== null) {
    newProductStock.value = String(Math.floor(stock));
    productStock[String(newProduct.id)] = Math.floor(stock);
    saveStock(productStock);
  }

  if (rawBarcode) {
    const code = normalizeBarcode(rawBarcode);
    if (barcodeMapNormalized[code] !== undefined) {
      const owner = products.find(p => p.id === barcodeMapNormalized[code]);
      addProductMsg.textContent = `⚠️ هذا الباركود مستخدم بالفعل للمنتج: ${owner ? owner.name : ""}`;
      addProductMsg.className = "admin-msg error";
      return;
    }
    newProduct.barcode = code;
  }
  assignDefaultBarcodeIfMissing(newProduct);

  customProducts.push(newProduct);
  saveCustomProducts(customProducts);
  products.push(newProduct);

  rebuildCategories();
  fillCategoryDatalist();
  rebuildBarcodeMap();
  renderTabs();
  renderCatalog();
  fillAssignBarcodeSelect();
  renderAdminProductsList();

  newProductName.value = "";
  newProductCategory.value = "";
  newProductPrice.value = "";
  newProductCost.value = "";
  newProductStock.value = "";
  newProductBarcode.value = "";
  addProductMsg.textContent = `✅ تمت إضافة المنتج: ${name}`;
  addProductMsg.className = "admin-msg success";
});

function openAdminPanel() {
  fillAssignBarcodeSelect();
  fillCategoryDatalist();
  renderAdminProductsList();
  assignBarcodeMsg.textContent = "";
  addProductMsg.textContent = "";
  storeNameInput.value = loadStoreName();
  storeSubInput.value = loadStoreSub();
  storeNameMsg.textContent = "";
  adminOverlay.classList.add("open");
}

adminBtn.addEventListener("click", openAdminPanel);
saveStoreNameBtn.addEventListener("click", () => {
  saveStoreName(storeNameInput.value.trim());
  saveStoreSub(storeSubInput.value.trim());
  applyStoreIdentity();
  storeNameMsg.textContent = "✅ تم حفظ الاسم";
  storeNameMsg.className = "admin-msg success";
});

closeAdmin.addEventListener("click", () => adminOverlay.classList.remove("open"));
adminOverlay.addEventListener("click", (e) => {
  if (e.target === adminOverlay) adminOverlay.classList.remove("open");
});

// ===== أحداث عامة =====
searchInput.addEventListener("input", renderCatalog);
cartBtn.addEventListener("click", () => cartOverlay.classList.add("open"));
closeCart.addEventListener("click", () => cartOverlay.classList.remove("open"));
cartOverlay.addEventListener("click", (e) => {
  if (e.target === cartOverlay) cartOverlay.classList.remove("open");
});
clearCartBtn.addEventListener("click", () => {
  cart = {};
  discountValueInput.value = "";
  discountTypeSelect.value = "percent";
  updateCartUI();
});
discountValueInput.addEventListener("input", updateCartUI);
discountTypeSelect.addEventListener("change", updateCartUI);

// ===== تشغيل أولي =====
applyStoreIdentity();
renderTabs();
renderCatalog();
updateCartUI();
focusBarcodeInput();
