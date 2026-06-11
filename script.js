/* ============================================================
   1. CẤU HÌNH & BIẾN TOÀN CỤC (CONFIG & GLOBALS)
   ============================================================ */
const GSHEET_FETCH_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyX85lhyBzhAP_VJ946YCPrZhzMppA92MAdv1VECmV-LQdrhlRJHoR9IciAlem4cFwT6w/exec'; 
const GSHEET_ORDER_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzhLyNyaXC7xGMbDXU3T6iy_Y_CcnVN_H0yHNnqIEBuzt74ZDcTsxozge28vG3_cKPFrw/exec';

const CART_KEY = 'dollup_cart_v1';
const WISHLIST_KEY = 'tlc_wishlist_v1';
const RATING_KEY = 'tlc_ratings_v1';

let PRODUCTS = [];
let lang = localStorage.getItem('dollup_lang') || 'vi';
let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
let wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
let currentProduct = null;
let currentUser = null;

/* ============================================================
   2. CÔNG CỤ HỖ TRỢ (HELPER FUNCTIONS)
   ============================================================ */
const formatVND = n => new Intl.NumberFormat('vi-VN').format(n) + (lang === 'vi' ? ' VNĐ' : ' VND');
const t = (vi, en) => (lang === 'vi' ? vi : (en || vi));

function daysBetween(start, end) {
    const s = new Date(start); 
    const e = new Date(end);
    s.setHours(12, 0, 0, 0); 
    e.setHours(12, 0, 0, 0);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
}

function showToast(msg) { 
    const el = document.getElementById('toast'); 
    if (el) { 
        el.textContent = msg; el.classList.add('show'); 
        setTimeout(() => el.classList.remove('show'), 2500); 
    } 
}

function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

function updateAuthUI() {
    // No auth UI needed
}

function getProductRating(productId) {
    const ratings = JSON.parse(localStorage.getItem(RATING_KEY) || '{}');
    const seed = productId.length; 
    const baseCount = (seed * 7 % 110) + 42; 
    const baseAvg = (4.6 + (seed % 4) / 10).toFixed(1); 

    if (ratings[productId]) {
        const userValue = ratings[productId];
        const newAvg = ((parseFloat(baseAvg) * baseCount + userValue) / (baseCount + 1)).toFixed(1);
        return { avg: newAvg, count: baseCount + 1 };
    }
    return { avg: baseAvg, count: baseCount };
}

function generateVietQR(amount, orderInfo) {
    const bankConfig = {
        bankId: 'ICB', 
        accountNo: '107875610698', 
        accountName: 'NGUYEN HUU HAI' 
    };
    return `https://img.vietqr.io/image/${bankConfig.bankId}-${bankConfig.accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(orderInfo)}&accountName=${encodeURIComponent(bankConfig.accountName)}`;
}

// Bảng hướng dẫn chọn size
function showSizeGuide() {
    const html = `
    <div id="sizeGuideModal" class="about-info active" style="display:flex">
        <div class="about-card" style="padding:20px; max-width:400px; display:block;">
            <button onclick="document.getElementById('sizeGuideModal').remove()" style="float:right; border:none; background:none; cursor:pointer;">✕</button>
            <h3>Hướng dẫn chọn Size</h3>
            <table class="size-table" style="width:100%; border-collapse:collapse; margin-top:10px;">
                <tr><th style="border:1px solid #ddd; padding:8px;">Size</th><th style="border:1px solid #ddd; padding:8px;">Vòng Ngực</th><th style="border:1px solid #ddd; padding:8px;">Vòng Eo</th></tr>
                <tr><td style="border:1px solid #ddd; padding:8px;">S</td><td style="border:1px solid #ddd; padding:8px;">80-84</td><td style="border:1px solid #ddd; padding:8px;">62-66</td></tr>
                <tr><td style="border:1px solid #ddd; padding:8px;">M</td><td style="border:1px solid #ddd; padding:8px;">85-88</td><td style="border:1px solid #ddd; padding:8px;">67-70</td></tr>
                <tr><td style="border:1px solid #ddd; padding:8px;">L</td><td style="border:1px solid #ddd; padding:8px;">89-92</td><td style="border:1px solid #ddd; padding:8px;">71-74</td></tr>
            </table>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

/* ============================================================
   3. MODULE SẢN PHẨM & HIỂN THỊ
   ============================================================ */
async function loadProductsFromSheet() {
    try {
        const response = await fetch(GSHEET_FETCH_ENDPOINT);
        const data = await response.json();
        if (data && data.length > 0) {
            PRODUCTS = data;
            renderProducts(PRODUCTS);
            renderCart();
        }
    } catch (error) { console.error("Lỗi tải sản phẩm:", error); }
}

function renderProducts(list = PRODUCTS) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    grid.innerHTML = '';

    list.forEach(p => {
        const title = p.name[lang] || p.name.vi;
        const isWishlisted = wishlist.includes(p.id);
        const isAvailable = p.status !== 'out_of_stock';
        const ratingData = getProductRating(p.id);
        const userRating = JSON.parse(localStorage.getItem(RATING_KEY) || '{}')[p.id] || 0;
        
        const el = document.createElement('div');
        el.className = 'card';
        el.innerHTML = `
            <div class="img" style="cursor:pointer" onclick="openModalById('${p.id}')">
                <img src="${p.images[0]}" alt="${title}" loading="lazy">
                <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="event.stopPropagation(); window.toggleWishlist('${p.id}')">
                    <i class="${isWishlisted ? 'fas' : 'far'} fa-heart"></i>
                </button>
                ${!isAvailable ? `<div class="stock-tag">${t('Hết hàng', 'Sold out')}</div>` : ''}
            </div>
            <div class="body">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <strong onclick="openModalById('${p.id}')" style="cursor:pointer">${title}</strong>
                    <div style="color:var(--muted);font-size:.9rem">${p.id}</div>
                </div>
                <div class="rating-box" style="margin: 8px 0; display: flex; align-items: center; gap: 6px;">
                    <div class="rating" data-id="${p.id}" style="display: flex; gap: 2px;">
                        ${[1, 2, 3, 4, 5].map(i => `
                            <span class="star ${i <= (userRating || Math.round(ratingData.avg)) ? 'active' : ''}" data-star="${i}">★</span>
                        `).join('')}
                    </div>
                    <span style="font-size: 13px; color: #ff9800; font-weight: 600;">${ratingData.avg}</span>
                </div>
                <div class="price">${formatVND(p.price)} / ${t('ngày', 'day')}</div>
                <div class="actions">
                    <button class="btn-outline view-btn" data-id="${p.id}">${t('Chi tiết', 'View')}</button>
                    <button class="btn-primary add-btn" data-id="${p.id}" ${!isAvailable ? 'disabled' : ''}>
                        ${isAvailable ? t('Thuê ngay', 'Rent') : t('Hết hàng', 'Sold out')}
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(el);
    });
}

window.openModalById = function(id) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return;
    currentProduct = p;

    document.getElementById('modalMainImg').src = p.images[0];
    document.getElementById('modalThumbs').innerHTML = p.images.map(s => `<img src="${s}" alt="thumb" />`).join('');
    document.getElementById('modalTitle').textContent = p.name[lang] || p.name.vi;
    document.getElementById('modalPrice').textContent = formatVND(p.price) + ' / ' + t('ngày', 'day');
    document.getElementById('modalDesc').textContent = p.desc[lang] || p.desc.vi;
    document.getElementById('modalCategory').textContent = p.category.toUpperCase();
    document.getElementById('modalCode').textContent = p.id;

    // Thêm link bảng size vào modal
    const sizeContainer = document.getElementById('rentSize').parentElement;
    if(!document.getElementById('sizeLink')) {
        sizeContainer.insertAdjacentHTML('beforeend', '<span id="sizeLink" class="size-guide-link" style="display:block; margin-top:5px; cursor:pointer; color:var(--primary); text-decoration:underline;" onclick="showSizeGuide()">Xem bảng hướng dẫn chọn size</span>');
    }

    document.getElementById('productModal').classList.add('active');
    updateLivePrice();
};
/* ============================================================
   4. MODULE GIỎ HÀNG & LOGIC THUÊ
   ============================================================ */
function updateCartCount() {
    const el = document.getElementById('cartCount');
    if (el) { el.style.display = cart.length > 0 ? 'inline-block' : 'none'; el.textContent = cart.length; }
}

function renderCart() {
    const itemsDom = document.getElementById('cartItems');
    if (!itemsDom) return;
    itemsDom.innerHTML = ''; 
    let total = 0;

    if (cart.length === 0) itemsDom.innerHTML = `<p style="color:var(--muted);padding:8px">${t('Giỏ hàng trống.', 'Cart is empty.')}</p>`;
    
    cart.forEach(it => {
        total += it.lineTotal;
        const prod = PRODUCTS.find(p => p.id === it.id) || {};
        const div = document.createElement('div'); 
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${prod.images?.[0] || ''}" alt="">
            <div class="info">
                <strong>${it.name}</strong>
                <div style="color:var(--muted);font-size:.9rem">Size: ${it.size} • ${it.start} → ${it.end}</div>
                <div style="margin-top:4px;color:var(--primary);font-weight:700">${formatVND(it.lineTotal)}</div>
            </div>
            <div class="actions">
                <button class="delete-cart-item" data-uid="${it.uid}"><i class="fas fa-trash"></i></button>
            </div>`;
        itemsDom.appendChild(div);
    });
    document.getElementById('cartTotal').textContent = formatVND(total);
    
    // Dịch tiêu đề giỏ hàng
    const cartHeader = document.querySelector('#cartPanel h3');
    if(cartHeader) cartHeader.textContent = t('Giỏ hàng của bạn', 'Your Cart');
    const checkoutBtn = document.getElementById('btnCheckout');
    const promoBtn = document.getElementById('applyPromoBtn');
    if (checkoutBtn) {
        checkoutBtn.textContent = t('Thanh toán', 'Checkout');
        checkoutBtn.disabled = cart.length === 0;
    }
    if (promoBtn) {
        promoBtn.disabled = false;
    }

    updateCartCount();
}

function addToCartItem(obj) {
    const isDup = cart.some(i => i.id === obj.id && i.size === obj.size && i.start === obj.start && i.end === obj.end);
    if (isDup) return showToast(t('Sản phẩm đã có trong giỏ!', 'Already in cart!'));
    
    cart.push(obj); saveCart(); renderCart();
    const checkoutBtn = document.getElementById('btnCheckout');
    if (checkoutBtn) checkoutBtn.disabled = false;
    showToast(t('Đã thêm vào giỏ hàng', 'Added to cart'));
    return true;
}

function quickAddToCart(id) {
    const p = PRODUCTS.find(x => x.id === id); if (!p) return;
    const today = new Date().toISOString().slice(0, 10);
    addToCartItem({ uid: Date.now(), id: p.id, name: p.name[lang] || p.name.vi, pricePerDay: p.price, start: today, end: today, days: 1, lineTotal: p.price, size: 'M', note: '', qty: 1 });
}

/* ============================================================
   5. MODULE THANH TOÁN & NGÔN NGỮ
   ============================================================ */
async function handleCheckout() {
    if (cart.length === 0) {
        showToast(t('Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.', 'Your cart is empty. Add items before checkout.'));
        return;
    }
    const customerName = prompt(t("Nhập tên của bạn:", "Enter your name:"), "");
    const customerPhone = prompt(t("Nhập số điện thoại:", "Enter your phone:"), "");
    if (!customerName || !customerPhone) return showToast(t('Vui lòng cung cấp thông tin!', 'Info required!'));

    const total = cart.reduce((s, i) => s + i.lineTotal, 0);
    const orderId = 'TLC' + Date.now().toString().slice(-6);
    const qrUrl = generateVietQR(total, `THANH TOAN ${orderId}`);

    const qrOverlay = document.createElement('div');
    qrOverlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:10000;display:flex;justify-content:center;align-items:center;color:#333;";
    qrOverlay.innerHTML = `
        <div style="background:#fff; padding:25px; border-radius:20px; text-align:center; max-width:350px; width:90%;">
            <h3 style="margin-bottom:10px;">${t('Thanh toán đơn hàng', 'Payment')}</h3>
            <p style="font-size:14px;">Mã đơn: <strong>${orderId}</strong></p>
            <img src="${qrUrl}" style="width:100%; border-radius:10px; margin:15px 0; border:1px solid #eee;">
            <p style="font-size:18px; color:var(--primary); font-weight:bold;">${formatVND(total)}</p>
            <button id="confirmPaidBtn" style="background:var(--primary); color:#fff; border:none; padding:12px 20px; border-radius:10px; cursor:pointer; width:100%; margin-top:15px; font-weight:600;">
                ${t('Tôi đã chuyển khoản', 'I have transferred')}
            </button>
            <p onclick="this.parentElement.parentElement.remove()" style="margin-top:15px; cursor:pointer; font-size:13px; color:#666;">${t('Quay lại', 'Go back')}</p>
        </div>
    `;
    document.body.appendChild(qrOverlay);

    document.getElementById('confirmPaidBtn').onclick = async function() {
        this.innerText = t('Đang xử lý...', 'Processing...'); this.disabled = true;
        try {
            await fetch(GSHEET_ORDER_ENDPOINT, {
                method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ createdAt: new Date().toLocaleString('vi-VN'), orderId, customer: { name: customerName, phone: customerPhone }, items: cart, total })
            });
            showToast(t('Hoàn tất! Cảm ơn bạn.', 'Order completed!'));
            cart = []; saveCart(); renderCart();
            qrOverlay.remove();
            document.getElementById('cartPanel').style.display = 'none';
        } catch (err) { 
            showToast(t('Lỗi, vui lòng thử lại.', 'Error, please retry.'));
            this.disabled = false; this.innerText = t('Thử lại', 'Retry');
        }
    };
}

function setLang(newLang) {
    lang = newLang;
    localStorage.setItem('dollup_lang', newLang);
    
    // Chuyển màu nút
    document.getElementById('langVI')?.classList.toggle('active', newLang === 'vi');
    document.getElementById('langEN')?.classList.toggle('active', newLang === 'en');
    
    // Dịch menu điều hướng tĩnh
    const navLinks = document.querySelectorAll('.main-nav a');
    if (navLinks.length >= 4) {
        navLinks[0].textContent = t('Trang Chủ', 'Home');
        navLinks[1].textContent = t('Bộ Sưu Tập', 'Collections');
        navLinks[2].textContent = t('Sản Phẩm Mới', 'New Arrivals');
        navLinks[3].textContent = t('Về Chúng Tôi', 'About Us');
    }

    renderProducts();
    renderCart();
    updateWishlistUI();
}

function applyFilters() {
    let tmp = [...PRODUCTS];
    const q = document.getElementById('txtSearch').value.trim().toLowerCase();
    if (q) tmp = tmp.filter(p => (p.name[lang] || p.name.vi).toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    const cat = document.getElementById('filterCategory').value;
    if (cat !== 'all') tmp = tmp.filter(p => p.category === cat);
    const s = document.getElementById('sortBy').value;
    if (s === 'priceAsc') tmp.sort((a, b) => a.price - b.price);
    if (s === 'priceDesc') tmp.sort((a, b) => b.price - a.price);
    renderProducts(tmp);
}

/* ============================================================
   6. MODULE TÍNH NĂNG PHỤ
   ============================================================ */
window.toggleWishlist = function(id) {
    const index = wishlist.indexOf(id);
    if (index > -1) wishlist.splice(index, 1); else wishlist.push(id);
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    updateWishlistUI(); renderProducts();
};

function updateWishlistUI() {
    const el = document.getElementById('wishlistCount');
    if (el) { el.style.display = wishlist.length > 0 ? 'inline-block' : 'none'; el.textContent = wishlist.length; }
}

function updateLivePrice() {
    const start = document.getElementById('rentStart').value;
    const end = document.getElementById('rentEnd').value;
    if (start && end && currentProduct) {
        const days = daysBetween(start, end);
        document.getElementById('liveDays').textContent = days;
        document.getElementById('liveTotal').textContent = formatVND(currentProduct.price * days);
        const liveUnit = document.getElementById('liveUnit');
        if(liveUnit) liveUnit.textContent = t('ngày', 'days');
    }
}

function handleRatingClick(e) {
    const star = e.target.closest('.star');
    if (!star) return;
    const productId = star.parentElement.getAttribute('data-id');
    const val = parseInt(star.getAttribute('data-star'));
    
    let ratings = JSON.parse(localStorage.getItem(RATING_KEY) || '{}');
    ratings[productId] = val;
    localStorage.setItem(RATING_KEY, JSON.stringify(ratings));
    
    showToast(t('Cảm ơn bạn đã đánh giá!', 'Thank you for rating!'));
    renderProducts();
}

/* ============================================================
   7. SỰ KIỆN (EVENT LISTENERS)
   ============================================================ */
function initEventListeners() {
    // 1. Rating
    document.getElementById('productGrid')?.addEventListener('click', (e) => {
        if (e.target.closest('.star')) handleRatingClick(e);
    });

    // 2. View/Add/Delete Cart
    document.body.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-btn'); if (viewBtn) openModalById(viewBtn.dataset.id);
        const addBtn = e.target.closest('.add-btn'); if (addBtn) quickAddToCart(addBtn.dataset.id);
        const delBtn = e.target.closest('.delete-cart-item'); 
        if (delBtn) { cart = cart.filter(i => i.uid !== Number(delBtn.dataset.uid)); saveCart(); renderCart(); }
    });

    // 3. Modal Product
    document.getElementById('closeModal')?.addEventListener('click', () => document.getElementById('productModal').classList.remove('active'));
    document.getElementById('addToCartModal')?.addEventListener('click', () => {
        if (!currentProduct) return;
        const start = document.getElementById('rentStart').value; 
        const end = document.getElementById('rentEnd').value; 
        const days = daysBetween(start, end);
        if (days <= 0) return showToast(t('Ngày không hợp lệ', 'Invalid dates'));
        const success = addToCartItem({
            uid: Date.now(), id: currentProduct.id, name: currentProduct.name[lang] || currentProduct.name.vi,
            pricePerDay: currentProduct.price, start, end, days, lineTotal: currentProduct.price * days,
            size: document.getElementById('rentSize').value, note: document.getElementById('rentNote').value, qty: 1
        });
        if (success) document.getElementById('productModal').classList.remove('active');
    });

    // 4. Filters
    document.getElementById('txtSearch')?.addEventListener('input', applyFilters);
    document.getElementById('filterCategory')?.addEventListener('change', applyFilters);
    document.getElementById('sortBy')?.addEventListener('change', applyFilters);
    document.getElementById('rentStart')?.addEventListener('change', updateLivePrice);
    document.getElementById('rentEnd')?.addEventListener('change', updateLivePrice);

    // 5. Cart Panel
    const checkoutBtn = document.getElementById('btnCheckout');
    document.getElementById('btnOpenCart')?.addEventListener('click', () => {
        if (window.renderCart) window.renderCart();
        document.getElementById('cartPanel').style.display = 'block';
    });
    document.getElementById('closeCartPanel')?.addEventListener('click', () => document.getElementById('cartPanel').style.display = 'none');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
        checkoutBtn.disabled = cart.length === 0;
    }
    const promoBtn = document.getElementById('applyPromoBtn');
    if (promoBtn) {
        promoBtn.disabled = false;
    }

    // 6. Language
    document.getElementById('langVI')?.addEventListener('click', () => setLang('vi'));
    document.getElementById('langEN')?.addEventListener('click', () => setLang('en'));

    // 7. About Us Modal (Sửa lỗi nút không ấn được)
    const aboutModal = document.getElementById('aboutInfo');
    const navAbout = document.getElementById('navAbout');
    if (navAbout) {
        navAbout.addEventListener('click', (e) => { 
            e.preventDefault(); 
            if(aboutModal) aboutModal.classList.add('active'); 
        });
    }
    document.getElementById('closeAbout')?.addEventListener('click', () => aboutModal.classList.remove('active'));
    window.addEventListener('click', (e) => { if (e.target === aboutModal) aboutModal.classList.remove('active'); });
}

/* ============================================================
   8. KHỞI CHẠY (ON LOAD)
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    setLang(lang);
    loadProductsFromSheet();
});
// 1. Tạo Popup bảng size (gọi hàm này khi người dùng click vào link hướng dẫn size)
function showSizeGuide() {
    const html = `
    <div id="sizeGuideModal" class="modal active">
        <div class="modal-card" style="padding:20px; max-width:400px; display:block;">
            <h3>Hướng dẫn chọn Size</h3>
            <table class="size-table">
                <tr><th>Size</th><th>Vòng Ngực</th><th>Vòng Eo</th></tr>
                <tr><td>S</td><td>80-84</td><td>62-66</td></tr>
                <tr><td>M</td><td>85-88</td><td>67-70</td></tr>
                <tr><td>L</td><td>89-92</td><td>71-74</td></tr>
            </table>
            <button onclick="document.getElementById('sizeGuideModal').remove()" style="margin-top:15px; width:100%; padding:10px;">Đóng</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}
