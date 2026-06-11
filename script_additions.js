/* ============================================================
   PHẦN MỞ RỘNG - TÍNH NĂNG PRO
   ============================================================ */

/* ----- PROMO COUNTDOWN ----- */
function initCountdown() {
  const endTime = new Date();
  endTime.setHours(23, 59, 59, 999);
  
  function tick() {
    const now = new Date();
    let diff = Math.max(0, endTime - now);
    const h = String(Math.floor(diff / 3600000)).padStart(2,'0');
    diff %= 3600000;
    const m = String(Math.floor(diff / 60000)).padStart(2,'0');
    diff %= 60000;
    const s = String(Math.floor(diff / 1000)).padStart(2,'0');
    const el = document.getElementById('cdTimer');
    if (el) el.innerHTML = `
      <span class="cd-block">${h}</span><span style="color:var(--accent);font-weight:700">:</span>
      <span class="cd-block">${m}</span><span style="color:var(--accent);font-weight:700">:</span>
      <span class="cd-block">${s}</span>`;
  }
  tick();
  setInterval(tick, 1000);

  document.getElementById('promoBannerClose')?.addEventListener('click', () => {
    document.getElementById('promoBanner')?.remove();
  });
}

/* ----- SEARCH OVERLAY ----- */
function initSearchOverlay() {
  const overlay = document.getElementById('searchOverlay');
  const input = document.getElementById('searchOverlayInput');
  const results = document.getElementById('searchOverlayResults');

  document.getElementById('btnSearch')?.addEventListener('click', (e) => {
    e.stopPropagation();
    overlay?.classList.add('active');
    setTimeout(() => input?.focus(), 100);
  });

  document.getElementById('searchOverlayClose')?.addEventListener('click', () => overlay?.classList.remove('active'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay?.classList.remove('active'); });

  input?.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q || !results) return (results.innerHTML = '');
    const hits = PRODUCTS.filter(p => (p.name?.vi || '').toLowerCase().includes(q) || p.id?.toLowerCase().includes(q)).slice(0,5);
    if (!hits.length) { results.innerHTML = `<p style="color:rgba(255,255,255,0.5);padding:10px">Không tìm thấy sản phẩm</p>`; return; }
    results.innerHTML = hits.map(p => `
      <div class="search-preview-item" onclick="overlay.classList.remove('active'); openModalById('${p.id}')">
        <img src="${p.images?.[0]||''}" alt="${p.name?.vi||''}">
        <div>
          <div class="sp-name">${p.name?.vi||p.name?.en||''}</div>
          <div class="sp-price">${new Intl.NumberFormat('vi-VN').format(p.price)} VNĐ / ngày</div>
        </div>
      </div>`).join('');
  });
}

/* ----- WISHLIST PANEL ----- */
function initWishlistPanel() {
  document.getElementById('btnWishlist')?.addEventListener('click', () => {
    renderWishlistPanel();
    const panel = document.getElementById('wishlistPanel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('closeWishlistPanel')?.addEventListener('click', () => {
    document.getElementById('wishlistPanel').style.display = 'none';
  });
}

function renderWishlistPanel() {
  const itemsEl = document.getElementById('wishlistItems');
  if (!itemsEl) return;
  if (!wishlist.length) { itemsEl.innerHTML = `<div class="empty"><i class="far fa-heart" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:8px"></i>Chưa có sản phẩm yêu thích</div>`; return; }
  itemsEl.innerHTML = wishlist.map(id => {
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) return '';
    return `<div class="cart-item" style="cursor:pointer" onclick="openModalById('${p.id}')">
      <img src="${p.images?.[0]||''}" alt="" style="width:64px;height:80px;object-fit:cover;border-radius:8px">
      <div class="info">
        <strong>${p.name?.vi||p.name?.en||''}</strong>
        <div style="color:var(--muted);font-size:.88rem;margin-top:3px">${new Intl.NumberFormat('vi-VN').format(p.price)} VNĐ/ngày</div>
      </div>
      <button onclick="event.stopPropagation();window.toggleWishlist('${p.id}');renderWishlistPanel()" style="background:none;border:none;cursor:pointer;color:#e23;font-size:1.1rem"><i class="fas fa-heart-broken"></i></button>
    </div>`;
  }).join('');
}
window.renderWishlistPanel = renderWishlistPanel;

/* ----- COMPARE ----- */
let compareList = [];

window.toggleCompare = function(id) {
  const i = compareList.indexOf(id);
  if (i > -1) { compareList.splice(i, 1); }
  else {
    if (compareList.length >= 3) { showToast('Chỉ so sánh tối đa 3 sản phẩm'); return; }
    compareList.push(id);
  }
  updateCompareBar();
};

function updateCompareBar() {
  const bar = document.getElementById('compareBar');
  if (!bar) return;
  if (!compareList.length) { bar.classList.remove('visible'); return; }
  bar.classList.add('visible');
  document.getElementById('compareCount').textContent = `${compareList.length} sản phẩm đã chọn`;
  const slotsEl = document.getElementById('compareSlots');
  slotsEl.innerHTML = compareList.map(id => {
    const p = PRODUCTS.find(x => x.id === id);
    return p ? `<div class="compare-slot"><img src="${p.images?.[0]||''}"></div>` : '';
  }).join('') + Array(3 - compareList.length).fill('<div class="compare-slot">+</div>').join('');
}

window.clearCompare = function() { compareList = []; updateCompareBar(); };

window.openCompare = function() {
  if (compareList.length < 2) { showToast('Chọn ít nhất 2 sản phẩm để so sánh'); return; }
  const products = compareList.map(id => PRODUCTS.find(x => x.id === id)).filter(Boolean);
  const rows = [
    ['Ảnh', p => `<img src="${p.images?.[0]||''}">`],
    ['Tên', p => `<strong>${p.name?.vi||''}</strong>`],
    ['Giá/ngày', p => `<span style="color:var(--primary);font-weight:700">${new Intl.NumberFormat('vi-VN').format(p.price)} VNĐ</span>`],
    ['Danh mục', p => p.category?.toUpperCase()||''],
    ['Trạng thái', p => p.status === 'out_of_stock' ? '<span style="color:#e23">Hết hàng</span>' : '<span style="color:#2ea44f">Còn hàng</span>'],
  ];
  const modal = document.getElementById('compareModal');
  document.getElementById('compareTableBody').innerHTML = rows.map(([label, fn]) =>
    `<tr><td class="label-col">${label}</td>${products.map(p => `<td>${fn(p)}</td>`).join('')}</tr>`
  ).join('');
  modal?.classList.add('active');
};

document.getElementById('closeCompareModal')?.addEventListener('click', () => document.getElementById('compareModal')?.classList.remove('active'));
document.getElementById('compareModal')?.addEventListener('click', function(e){ if(e.target===this) this.classList.remove('active'); });

/* ----- LIGHTBOX ----- */
let lightboxImages = [], lightboxIndex = 0;

function openLightbox(images, idx) {
  lightboxImages = images; lightboxIndex = idx;
  const lb = document.getElementById('lightbox');
  document.getElementById('lightboxImg').src = images[idx];
  lb?.classList.add('active');
}
window.openLightbox = openLightbox;

document.getElementById('lightboxClose')?.addEventListener('click', () => document.getElementById('lightbox')?.classList.remove('active'));
document.getElementById('lightboxPrev')?.addEventListener('click', () => {
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  document.getElementById('lightboxImg').src = lightboxImages[lightboxIndex];
});
document.getElementById('lightboxNext')?.addEventListener('click', () => {
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  document.getElementById('lightboxImg').src = lightboxImages[lightboxIndex];
});
document.getElementById('lightbox')?.addEventListener('click', function(e){ if(e.target===this) this.classList.remove('active'); });

/* ----- REVIEWS ----- */
const FAKE_REVIEWS = [
  { name: 'Minh Châu', rating: 5, text: 'Váy rất đẹp, chất lượng tốt, giao hàng nhanh!', date: '2 ngày trước' },
  { name: 'Thu Hằng', rating: 5, text: 'Đầm sang trọng, mặc đi tiệc cưới ai cũng khen. Sẽ thuê lại.', date: '5 ngày trước' },
  { name: 'Lan Anh', rating: 4, text: 'Phục vụ nhiệt tình, sản phẩm đúng như mô tả.', date: '1 tuần trước' },
];

function renderReviews(productId) {
  const container = document.getElementById('reviewList');
  if (!container) return;
  const stored = JSON.parse(localStorage.getItem('tlc_reviews_' + productId) || '[]');
  const allReviews = [...stored, ...FAKE_REVIEWS];
  container.innerHTML = allReviews.map(r => `
    <div class="review-item">
      <div class="review-avatar">${r.name.charAt(0)}</div>
      <div>
        <strong style="font-size:.9rem">${r.name}</strong>
        <div class="review-meta">${r.date}</div>
        <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
        <div class="review-text">${r.text}</div>
      </div>
    </div>`).join('');
}
window.renderReviews = renderReviews;

function initReviewForm() {
  let selectedStars = 0;
  document.getElementById('reviewStarPicker')?.addEventListener('click', e => {
    const sp = e.target.closest('.sp');
    if (!sp) return;
    selectedStars = parseInt(sp.dataset.star);
    document.querySelectorAll('#reviewStarPicker .sp').forEach((s, i) => s.classList.toggle('lit', i < selectedStars));
  });

  document.getElementById('submitReviewBtn')?.addEventListener('click', () => {
    const text = document.getElementById('reviewText').value.trim();
    const name = document.getElementById('reviewName').value.trim() || 'Khách hàng';
    if (!text || !selectedStars) { showToast('Vui lòng chọn sao và nhập nhận xét'); return; }
    if (!currentProduct) return;
    const reviews = JSON.parse(localStorage.getItem('tlc_reviews_' + currentProduct.id) || '[]');
    reviews.unshift({ name, rating: selectedStars, text, date: 'Vừa xong' });
    localStorage.setItem('tlc_reviews_' + currentProduct.id, JSON.stringify(reviews));
    document.getElementById('reviewText').value = '';
    document.getElementById('reviewName').value = '';
    selectedStars = 0;
    document.querySelectorAll('#reviewStarPicker .sp').forEach(s => s.classList.remove('lit'));
    renderReviews(currentProduct.id);
    showToast('Cảm ơn bạn đã đánh giá!');
  });
}

/* ----- MODAL TABS ----- */
function initModalTabs() {
  document.getElementById('productModal')?.addEventListener('click', e => {
    const btn = e.target.closest('.modal-tab-btn');
    if (!btn) return;
    const tab = btn.dataset.tab;
    document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === tab));
    if (tab === 'reviews' && currentProduct) renderReviews(currentProduct.id);
  });
}

/* ----- TRENDING CHIPS ----- */
function initTrendingChips() {
  document.getElementById('trendingStrip')?.addEventListener('click', e => {
    const chip = e.target.closest('.trend-chip');
    if (!chip) return;
    document.querySelectorAll('.trend-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const cat = chip.dataset.cat;
    document.getElementById('filterCategory').value = cat;
    applyFilters();
    document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' });
  });
}

/* ----- PROMO CODE ----- */
const PROMO_CODES = { 'VIP20': 0.20, 'SALE15': 0.15, 'NEW10': 0.10 };
let activePromo = null;

function initPromoCode() {
  const promoBtn = document.getElementById('applyPromoBtn');
  const promoInput = document.getElementById('promoInput');
  if (promoBtn) {
    promoBtn.disabled = false;
    promoBtn.addEventListener('click', () => {
      const code = promoInput?.value.trim().toUpperCase() || '';
      const msgEl = document.getElementById('promoMsg');
      if (PROMO_CODES[code]) {
        activePromo = { code, discount: PROMO_CODES[code] };
        msgEl.className = 'promo-msg success';
        msgEl.textContent = `✓ Áp dụng thành công! Giảm ${PROMO_CODES[code] * 100}%`;
        renderCart();
      } else {
        activePromo = null;
        msgEl.className = 'promo-msg error';
        msgEl.textContent = '✗ Mã không hợp lệ';
      }
    });
  }
}

/* Patch renderCart to show promo */
const _origRenderCart = window.renderCart;
window.renderCart = function() {
  if (typeof _origRenderCart === 'function') _origRenderCart();
  if (!activePromo) return;
  const totalEl = document.getElementById('cartTotal');
  if (!totalEl) return;
  const baseTotal = cart.reduce((s, i) => s + i.lineTotal, 0);
  const saving = Math.round(baseTotal * activePromo.discount);
  const discounted = baseTotal - saving;
  totalEl.innerHTML = `<span style="text-decoration:line-through;color:#999;font-size:.9rem">${new Intl.NumberFormat('vi-VN').format(baseTotal)} VNĐ</span><br><strong>${new Intl.NumberFormat('vi-VN').format(discounted)} VNĐ</strong>`;
  const savingEl = document.getElementById('promoSavingLine');
  if (savingEl) { savingEl.style.display = 'flex'; savingEl.querySelector('.saving-amount').textContent = `- ${new Intl.NumberFormat('vi-VN').format(saving)} VNĐ`; }
};

/* ----- NOTIFICATIONS ----- */
const NOTIFICATIONS = [
  { icon: '🛍️', text: 'Đơn hàng TLC230512 đã được xác nhận', time: '2 phút trước', unread: true },
  { icon: '🎉', text: 'Giảm 20% hôm nay với mã VIP20', time: '1 giờ trước', unread: true },
  { icon: '💌', text: 'Bộ sưu tập mới vừa được cập nhật', time: 'Hôm qua', unread: false },
];

function initNotifications() {
  const btn = document.getElementById('btnNotif');
  const panel = document.getElementById('notifPanel');
  if (!btn || !panel) return;

  const unread = NOTIFICATIONS.filter(n => n.unread).length;
  const badge = btn.querySelector('.notif-badge');
  if (badge && unread > 0) badge.textContent = unread;

  panel.querySelector('.notif-list').innerHTML = NOTIFICATIONS.map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}">
      <div class="ni-icon">${n.icon}</div>
      <div class="ni-text">
        ${n.text}
        <div class="ni-time">${n.time}</div>
      </div>
    </div>`).join('');

  btn.addEventListener('click', e => { e.stopPropagation(); panel.classList.toggle('active'); });
  document.addEventListener('click', e => { if (!panel.contains(e.target) && e.target !== btn) panel.classList.remove('active'); });
  panel.querySelector('.mark-all-read')?.addEventListener('click', () => {
    NOTIFICATIONS.forEach(n => n.unread = false);
    panel.querySelector('.notif-list').querySelectorAll('.unread').forEach(el => el.classList.remove('unread'));
    if (badge) badge.style.display = 'none';
  });
}

/* ----- SCROLL REVEAL ----- */
function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.feature-card, .hero-card').forEach(el => { el.classList.add('reveal'); observer.observe(el); });
}

/* ----- BACK TO TOP ----- */
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  window.addEventListener('scroll', () => btn?.classList.toggle('visible', window.scrollY > 400));
  btn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ----- CHAT FAB ----- */
function initChatFab() {
  const fab = document.getElementById('chatFab');
  const bubble = document.getElementById('chatBubble');
  let shown = false;
  setTimeout(() => { if (!shown && bubble) { bubble.classList.add('visible'); shown = true; setTimeout(() => bubble.classList.remove('visible'), 4000); } }, 3000);
  fab?.addEventListener('click', () => window.open('https://zalo.me/0981176563', '_blank'));
}

/* ----- PATCH openModalById for tabs + lightbox ----- */
const _origOpenModal = window.openModalById;
window.openModalById = function(id) {
  _origOpenModal(id);
  // Reset tabs
  document.querySelectorAll('.modal-tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.querySelectorAll('.modal-tab-content').forEach((c, i) => c.classList.toggle('active', i === 0));
  // Live price box show/hide
  const lpBox = document.getElementById('livePriceBox');
  if (lpBox) lpBox.classList.remove('visible');
  // Thumbs click opens lightbox
  const p = PRODUCTS.find(x => x.id === id);
  if (p) {
    const mainImg = document.getElementById('modalMainImg');
    mainImg.style.cursor = 'zoom-in';
    mainImg.onclick = () => openLightbox(p.images, 0);
    document.querySelectorAll('#modalThumbs img').forEach((img, i) => {
      img.onclick = () => { mainImg.src = p.images[i]; openLightbox(p.images, i); };
    });
  }
};

/* ----- PATCH updateLivePrice ----- */
const _origLivePrice = window.updateLivePrice;
window.updateLivePrice = function() {
  if (typeof _origLivePrice === 'function') _origLivePrice();
  const start = document.getElementById('rentStart')?.value;
  const end = document.getElementById('rentEnd')?.value;
  const lpBox = document.getElementById('livePriceBox');
  if (start && end && currentProduct && lpBox) {
    const days = daysBetween(start, end);
    if (days > 0) {
      lpBox.classList.add('visible');
      lpBox.querySelector('.lp-days').textContent = `${days} ngày thuê`;
      lpBox.querySelector('.lp-total').textContent = new Intl.NumberFormat('vi-VN').format(currentProduct.price * days) + ' VNĐ';
    }
  }
};

/* ----- CART BADGE BOUNCE ----- */
const _origAddItem = window.addToCartItem;
window.addToCartItem = function(...args) {
  const result = _origAddItem ? _origAddItem(...args) : null;
  const cartIcon = document.querySelector('#btnOpenCart i');
  cartIcon?.parentElement.classList.add('cart-bounce');
  setTimeout(() => cartIcon?.parentElement.classList.remove('cart-bounce'), 400);
  return result;
};

/* ----- SKELETON LOADING ----- */
window.showSkeletons = function(n = 8) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  grid.innerHTML = Array(n).fill(`
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line price"></div>
      </div>
    </div>`).join('');
};

/* ----- INIT ALL ----- */
document.addEventListener('DOMContentLoaded', () => {
  showSkeletons(8);
  initCountdown();
  initSearchOverlay();
  initWishlistPanel();
  initTrendingChips();
  initPromoCode();
  initNotifications();
  initScrollReveal();
  initBackToTop();
  initChatFab();
  initModalTabs();
  initReviewForm();
});
