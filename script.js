/* ================== CONFIG ================== */
const GSHEET_FETCH_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyX85lhyBzhAP_VJ946YCPrZhzMppA92MAdv1VECmV-LQdrhlRJHoR9IciAlem4cFwT6w/exec'; 
const GSHEET_ORDER_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzhLyNyaXC7xGMbDXU3T6iy_Y_CcnVN_H0yHNnqIEBuzt74ZDcTsxozge28vG3_cKPFrw/exec';

let PRODUCTS = []; 
let lang = localStorage.getItem('dollup_lang') || 'vi';
const CART_KEY = 'dollup_cart_v1';
let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
let currentProduct = null;

/* ========== HELPER FUNCTIONS ========== */
const formatVND = n => new Intl.NumberFormat('vi-VN').format(n) + (lang === 'vi' ? ' VNĐ' : ' VND');
const t = (vi, en) => (lang === 'vi' ? vi : (en || vi));

function daysBetween(start, end) {
    const s = new Date(start); 
    const e = new Date(end);
    s.setHours(12, 0, 0, 0); 
    e.setHours(12, 0, 0, 0);
    return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

function saveCart() { 
    localStorage.setItem(CART_KEY, JSON.stringify(cart)); 
}

function showToast(msg) { 
    const el = document.getElementById('toast'); 
    if (el) { 
        el.textContent = msg; 
        el.classList.add('show'); 
        setTimeout(() => el.classList.remove('show'), 2500); 
    } 
}

/* ========== LOGIC KIỂM TRA TRÙNG LẶP (DUPLICATE CHECK) ========== */
/**
 * Kiểm tra xem một món đồ với cùng ID, cùng Size và cùng khoảng ngày đã có trong giỏ chưa.
 */
function isDuplicateInCart(id, size, start, end) {
    return cart.some(item => 
        item.id === id && 
        item.size === size && 
        item.start === start && 
        item.end === end
    );
}

/* ========== TẢI DỮ LIỆU SẢN PHẨM ========== */
async function loadProductsFromSheet() {
    try {
        const response = await fetch(GSHEET_FETCH_ENDPOINT);
        const data = await response.json();
        if (data && data.length > 0) {
            PRODUCTS = data;
            renderProducts(PRODUCTS);
        }
    } catch (error) {
        console.error("Lỗi tải sản phẩm:", error);
    }
}

/* ========== HIỂN THỊ SẢN PHẨM ========== */
const grid = document.getElementById('productGrid');
function renderProducts(list = PRODUCTS) {
    if (!grid) return;
    grid.innerHTML = '';
    list.forEach(p => {
        const el = document.createElement('div');
        el.className = 'card';
        const title = p.name[lang] || p.name.vi;
        const savedRating = localStorage.getItem('rating_' + p.id) || 0;
        el.innerHTML = `
            <div class="img"><img src="${p.images[0]}" alt="${title}" loading="lazy"></div>
            <div class="body">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <strong>${title}</strong>
                    <div style="color:var(--muted);font-size:.9rem">${p.id}</div>
                </div>
                <div class="rating" data-id="${p.id}">
                    ${[1, 2, 3, 4, 5].map(i => `<span class="star ${i <= savedRating ? 'active' : ''}" data-star="${i}">★</span>`).join('')}
                </div>
                <div class="price">${t('Giá thuê', 'Price')}: ${formatVND(p.price)} / ngày</div>
                <div class="actions">
                    <button class="btn-outline view-btn" data-id="${p.id}" style="flex:0 0 110px">${t('Xem', 'View')}</button>
                    <button class="btn-primary add-btn" data-id="${p.id}" style="flex:1">${t('Thêm nhanh', 'Quick add')}</button>
                </div>
            </div>
        `;
        grid.appendChild(el);
    });
}

/* ========== MODAL CHI TIẾT ========== */
const productModal = document.getElementById('productModal');
const modalMainImg = document.getElementById('modalMainImg');
const modalThumbs = document.getElementById('modalThumbs');
const modalTitle = document.getElementById('modalTitle');
const modalPrice = document.getElementById('modalPrice');
const modalDesc = document.getElementById('modalDesc');
const modalCategory = document.getElementById('modalCategory');
const modalCode = document.getElementById('modalCode');
const rentStart = document.getElementById('rentStart');
const rentEnd = document.getElementById('rentEnd');
const rentSize = document.getElementById('rentSize');
const rentNote = document.getElementById('rentNote');
const modalError = document.getElementById('modalError');

function openModalById(id) {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return;
    currentProduct = p;
    modalMainImg.src = p.images[0];
    modalThumbs.innerHTML = p.images.map(s => `<img src="${s}" alt="thumb" />`).join('');
    modalTitle.textContent = p.name[lang] || p.name.vi;
    modalPrice.textContent = formatVND(p.price) + ' / ngày';
    modalDesc.textContent = p.desc[lang] || p.desc.vi;
    modalCategory.textContent = p.category.toUpperCase();
    modalCode.textContent = p.id;
    modalError.style.display = 'none';
    const today = new Date().toISOString().slice(0, 10);
    rentStart.value = today; rentEnd.value = today; rentSize.value = 'M'; rentNote.value = '';
    productModal.classList.add('active');
}

/* ========== THÊM VÀO GIỎ HÀNG ========== */
function addToCartItem(obj) {
    // Kiểm tra trùng lặp trước khi push
    if (isDuplicateInCart(obj.id, obj.size, obj.start, obj.end)) {
        showToast(t('Sản phẩm này đã có trong giỏ hàng!', 'Item already in cart!'));
        return false; 
    }
    cart.push(obj);
    saveCart();
    renderCart();
    updateCartCount();
    showToast(t('Đã thêm vào giỏ hàng', 'Added to cart'));
    return true;
}

// Xử lý nút Thêm trong Modal
document.getElementById('addToCartModal').addEventListener('click', () => {
    if (!currentProduct) return;
    const start = rentStart.value; 
    const end = rentEnd.value; 
    const size = rentSize.value; 
    const note = rentNote.value || '';
    
    if (!start || !end) { 
        modalError.style.display = 'block'; 
        modalError.textContent = t('Vui lòng chọn ngày', 'Please select dates'); 
        return; 
    }
    const numDays = daysBetween(start, end);
    if (numDays <= 0) { 
        modalError.style.display = 'block'; 
        modalError.textContent = t('Ngày không hợp lệ', 'Invalid dates'); 
        return; 
    }

    const success = addToCartItem({
        uid: Date.now(), 
        id: currentProduct.id, 
        name: currentProduct.name[lang] || currentProduct.name.vi,
        pricePerDay: currentProduct.price, 
        start, 
        end, 
        days: numDays, 
        lineTotal: currentProduct.price * numDays,
        size, 
        note, 
        qty: 1
    });

    if (success) productModal.classList.remove('active');
});

// Xử lý Thêm nhanh ngoài danh sách
function quickAddToCart(id) {
    const p = PRODUCTS.find(x => x.id === id); 
    if (!p) return;
    const today = new Date().toISOString().slice(0, 10);
    addToCartItem({
        uid: Date.now(), 
        id: p.id, 
        name: p.name[lang] || p.name.vi, 
        pricePerDay: p.price, 
        start: today, 
        end: today, 
        days: 1, 
        lineTotal: p.price, 
        size: 'M', 
        note: '', 
        qty: 1
    });
}

/* ========== RENDER GIỎ HÀNG ========== */
const cartPanel = document.getElementById('cartPanel');
const cartItemsDom = document.getElementById('cartItems');
const cartCountDom = document.getElementById('cartCount');

function updateCartCount() {
    const c = cart.length; 
    if (cartCountDom) { 
        cartCountDom.style.display = c > 0 ? 'inline-block' : 'none'; 
        cartCountDom.textContent = c; 
    }
}

function renderCart() {
    if (!cartItemsDom) return;
    cartItemsDom.innerHTML = ''; 
    let total = 0;
    if (cart.length === 0) { 
        cartItemsDom.innerHTML = `<p style="color:var(--muted);padding:8px">${t('Giỏ hàng trống.', 'Cart is empty.')}</p>`; 
    }
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
                <button data-uid="${it.uid}" style="background:none;border:none;color:#c33;cursor:pointer"><i class="fas fa-trash"></i></button>
            </div>`;
        cartItemsDom.appendChild(div);
    });
    const totalDom = document.getElementById('cartTotal'); 
    if (totalDom) totalDom.textContent = formatVND(total);
    updateCartCount();
}

/* ========== THANH TOÁN (CHECKOUT) ========== */
document.getElementById('btnCheckout').addEventListener('click', async () => {
    if (cart.length === 0) return;

    const customerName = prompt(t("Nhập tên của bạn:", "Enter your name:"), "Khách hàng");
    const customerPhone = prompt(t("Nhập số điện thoại:", "Enter your phone:"), "");
    const customerEmail = prompt(t("Nhập email (không bắt buộc):", "Enter your email (optional):"), "");
    
    if (!customerName || !customerPhone) {
        showToast(t('Vui lòng cung cấp tên và số điện thoại!', 'Please provide name and phone!'));
        return;
    }

    const total = cart.reduce((s, i) => s + i.lineTotal, 0);
    if (!confirm(`${t('Xác nhận thanh toán tổng', 'Confirm payment total')} ${formatVND(total)}?`)) return;

    const btn = document.getElementById('btnCheckout');
    const originalText = btn.innerText;
    btn.innerText = t('Đang xử lý...', 'Processing...');
    btn.disabled = true;

    const orderPayload = {
        createdAt: new Date().toLocaleString('vi-VN'),
        customer: { name: customerName, phone: customerPhone, email: customerEmail },
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            size: item.size,
            start: item.start,
            end: item.end,
            days: item.days,
            pricePerDay: item.pricePerDay,
            lineTotal: item.lineTotal,
            note: item.note || ""
        }))
    };

    try {
        await fetch(GSHEET_ORDER_ENDPOINT, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        showToast(t('Hoàn tất! Cảm ơn bạn đã đặt hàng.', 'Order completed! Thank you.'));
        cart = [];
        saveCart();
        renderCart();
        cartPanel.style.display = 'none';
    } catch (err) {
        console.error("Lỗi gửi đơn:", err);
        showToast(t('Có lỗi xảy ra, vui lòng thử lại.', 'Error occurred, please try again.'));
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

/* ========== EVENT LISTENERS & UI ========== */
// Xóa món khỏi giỏ
cartItemsDom.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-uid]'); 
    if (!btn) return;
    cart = cart.filter(i => i.uid !== Number(btn.dataset.uid)); 
    saveCart(); 
    renderCart();
});

document.getElementById('btnOpenCart').addEventListener('click', () => { cartPanel.style.display = 'block'; });
document.getElementById('closeCartPanel').addEventListener('click', () => { cartPanel.style.display = 'none'; });

// Bộ lọc tìm kiếm
const txtSearch = document.getElementById('txtSearch');
const filterCategory = document.getElementById('filterCategory');
const sortBy = document.getElementById('sortBy');

function applyFilters() {
    let tmp = [...PRODUCTS];
    const q = txtSearch.value.trim().toLowerCase();
    if (q) tmp = tmp.filter(p => (p.name[lang] || p.name.vi).toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    const cat = filterCategory.value; 
    if (cat !== 'all') tmp = tmp.filter(p => p.category === cat);
    const s = sortBy.value; 
    if (s === 'priceAsc') tmp.sort((a, b) => a.price - b.price); 
    if (s === 'priceDesc') tmp.sort((a, b) => b.price - a.price);
    renderProducts(tmp);
}

txtSearch.addEventListener('input', applyFilters);
filterCategory.addEventListener('change', applyFilters);
sortBy.addEventListener('change', applyFilters);

document.body.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.view-btn'); 
    if (viewBtn) openModalById(viewBtn.dataset.id);
    const addBtn = e.target.closest('.add-btn'); 
    if (addBtn) quickAddToCart(addBtn.dataset.id);
});

modalThumbs.addEventListener('click', (e) => { 
    if (e.target.tagName === 'IMG') modalMainImg.src = e.target.src; 
});
document.getElementById('closeModal').addEventListener('click', () => productModal.classList.remove('active'));

document.getElementById('langVI').addEventListener('click', () => setLang('vi'));
document.getElementById('langEN').addEventListener('click', () => setLang('en'));

function setLang(l) {
    lang = l; 
    localStorage.setItem('dollup_lang', l); 
    renderProducts(); 
    renderCart();
}

document.addEventListener('DOMContentLoaded', () => {
    setLang(lang);
    loadProductsFromSheet();
});