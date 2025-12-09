// =============================================
// SWEETIFY - PRODUCTS MODULE (COMPLETE FIX)
// =============================================

let allProducts = [];
let selectedCategory = 'All';
let favorites = [];

// Mock Products - Always available as fallback
function getMockProducts() {
    return [
        { id: 'p1', name: 'Strawberry Dream Cake', price: 55000, image_url: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400', rating: 5, category: 'Tart', stock: 10, description: 'Tart pastry crispy dengan custard dan strawberry segar', is_available: true },
        { id: 'p2', name: 'Chocolate Chip Cookies', price: 33000, image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', rating: 4.8, category: 'Cookies', stock: 20, description: 'Cookies klasik dengan chocolate chips melimpah', is_available: true },
        { id: 'p3', name: 'Red Velvet Cupcake', price: 28000, image_url: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=400', rating: 4.9, category: 'Cupcake', stock: 15, description: 'Cupcake red velvet dengan cream cheese frosting', is_available: true },
        { id: 'p4', name: 'Fudgy Brownies Box', price: 43000, image_url: 'https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=400', rating: 4.9, category: 'Brownies', stock: 12, description: 'Brownies cokelat super fudgy', is_available: true },
        { id: 'p5', name: 'Black Forest Cake', price: 90000, image_url: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400', rating: 4.8, category: 'Cake', stock: 8, description: 'Kue black forest dengan cherry dan whipped cream', is_available: true },
        { id: 'p6', name: 'Vanilla Cupcake', price: 22000, image_url: 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=400', rating: 4.6, category: 'Cupcake', stock: 18, description: 'Cupcake vanilla klasik dengan buttercream', is_available: true },
        { id: 'p7', name: 'Chocolate Fudge Cake', price: 88000, image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', rating: 4.9, category: 'Cake', stock: 10, description: 'Kue cokelat super rich dengan fudge frosting', is_available: true },
        { id: 'p8', name: 'Lemon Tart', price: 38000, image_url: 'https://images.unsplash.com/photo-1519915212116-7cfef71f1d3e?w=400', rating: 4.7, category: 'Tart', stock: 14, description: 'Tart lemon segar dengan lemon curd', is_available: true },
    ];
}

// Fetch products from Supabase
async function fetchProducts() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error-message');
    const gridEl = document.getElementById('products-grid');
    
    console.log('🎯 Fetching products...');
    
    // Show loading
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (gridEl) gridEl.innerHTML = '';
    
    try {
        // Check if Supabase is available
        if (typeof supabase === 'undefined') {
            console.warn('⚠️ Supabase not available, using mock data');
            allProducts = getMockProducts();
            renderProducts();
            return;
        }

        console.log('📦 Fetching from Supabase...');
        
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_available', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }
        
        if (data && data.length > 0) {
            console.log('✅ Got', data.length, 'products from Supabase');
            allProducts = data;
        } else {
            console.log('⚠️ No products in database, using mock data');
            allProducts = getMockProducts();
        }
        
    } catch (error) {
        console.error('❌ Error fetching products:', error);
        console.log('📦 Using mock data as fallback');
        allProducts = getMockProducts();
    } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
        renderProducts();
    }
}

// Render products to grid
function renderProducts(searchQuery = '') {
    const gridEl = document.getElementById('products-grid');
    
    if (!gridEl) {
        console.error('❌ Products grid element not found!');
        return;
    }
    
    let filtered = [...allProducts]; // Create copy
    
    // Filter by category
    if (selectedCategory && selectedCategory !== 'All') {
        filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    // Filter by search
    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    console.log('✅ Rendering', filtered.length, 'products');
    
    // Clear grid
    gridEl.innerHTML = '';
    
    if (filtered.length === 0) {
        gridEl.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-box-open" style="font-size: 64px; color: #ccc; margin-bottom: 16px;"></i>
                <p style="color: #666; font-size: 16px;">Tidak ada produk ditemukan</p>
            </div>
        `;
        return;
    }
    
    // Create product cards
    filtered.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const isFav = favorites.includes(product.id);
        const stars = generateStars(product.rating || 4.5);
        
        card.innerHTML = `
            <img src="${product.image_url}" 
                 alt="${product.name}" 
                 class="product-image"
                 onerror="this.src='https://via.placeholder.com/200x200/F5DEB3/8B4513?text=Sweetify'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-rating">
                    ${stars}
                    <span>${product.rating || 4.5}</span>
                </div>
                <p class="product-price">${formatCurrency(product.price)}</p>
                <div class="product-actions">
                    <button class="btn-icon btn-favorite ${isFav ? 'favorited' : ''}" 
                            onclick="event.stopPropagation(); toggleFavorite('${product.id}')">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart('${product.id}')">
                        <i class="fas fa-plus"></i> Tambah
                    </button>
                </div>
            </div>
        `;
        
        // Click to view detail
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.product-actions')) {
                showProductDetail(product.id);
            }
        });
        
        gridEl.appendChild(card);
    });
}

// Generate star rating
function generateStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let stars = '';
    
    for (let i = 0; i < full; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (half) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    const empty = 5 - full - (half ? 1 : 0);
    for (let i = 0; i < empty; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// Show product detail modal
function showProductDetail(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        console.error('Product not found:', productId);
        return;
    }
    
    const modal = document.getElementById('product-modal');
    const detail = document.getElementById('product-detail');
    
    if (!modal || !detail) {
        console.error('Modal elements not found');
        return;
    }
    
    const isFav = favorites.includes(product.id);
    const stars = generateStars(product.rating || 4.5);
    const info = getProductInfo(product.category, product.name);
    
    detail.innerHTML = `
        <img src="${product.image_url}" 
             alt="${product.name}" 
             class="product-detail-image"
             onerror="this.src='https://via.placeholder.com/600x300/F5DEB3/8B4513?text=Sweetify'">
        <h2 class="product-detail-title">${product.name}</h2>
        <div class="product-detail-rating">
            ${stars}
            <span>${product.rating || 4.5} / 5.0</span>
        </div>
        <p class="product-detail-price">${formatCurrency(product.price)}</p>
        <p class="product-detail-description">${product.description || 'Kue berkualitas tinggi dengan bahan pilihan.'}</p>
        <div class="product-detail-actions">
            <button class="btn-icon btn-favorite ${isFav ? 'favorited' : ''}" 
                    onclick="toggleFavorite('${product.id}')">
                <i class="fas fa-heart"></i>
            </button>
            <button class="btn-primary" onclick="addToCart('${product.id}'); closeProductModal();">
                <i class="fas fa-shopping-cart"></i> Tambah ke Keranjang
            </button>
        </div>
        
        <div class="product-tabs">
            <button class="product-tab-btn active" data-tab="description">
                <i class="fas fa-info-circle"></i> Deskripsi
            </button>
            <button class="product-tab-btn" data-tab="ingredients">
                <i class="fas fa-list"></i> Bahan & Proses
            </button>
        </div>
        
        <div class="product-tab-content">
            <div class="tab-pane active" id="tab-description">
                <p id="product-description-text">${product.description || 'Kue berkualitas tinggi dengan bahan pilihan.'}</p>
            </div>
            <div class="tab-pane" id="tab-ingredients">
                <div id="product-ingredients-content">
                    <div class="ingredients-section">
                        <h4><i class="fas fa-clipboard-list"></i> Bahan-bahan:</h4>
                        <ul class="ingredients-list">
                            ${info.ingredients.map(ing => `<li>${ing}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="ingredients-section">
                        <h4><i class="fas fa-fire"></i> Proses Pembuatan:</h4>
                        <ol class="process-steps">
                            ${info.process.map(step => `<li>${step}</li>`).join('')}
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    setupProductTabs();
}

// Get product info
function getProductInfo(category, name) {
    const base = ['Tepung terigu premium', 'Gula halus', 'Mentega berkualitas', 'Telur segar'];
    
    const info = {
        'Cake': {
            ingredients: [...base, 'Susu murni', 'Vanilla essence', 'Baking powder'],
            process: [
                'Kocok mentega dan gula hingga mengembang',
                'Tambahkan telur satu per satu',
                'Masukkan tepung secara bertahap',
                'Tambahkan susu dan vanilla',
                'Panggang 180°C selama 35-40 menit'
            ]
        },
        'Cupcake': {
            ingredients: [...base, 'Susu', 'Vanilla', 'Baking powder', 'Buttercream'],
            process: [
                'Mixer mentega dan gula',
                'Masukkan telur satu per satu',
                'Campurkan tepung dan baking powder',
                'Tuang ke cup cupcake',
                'Panggang 175°C selama 18-20 menit'
            ]
        },
        'Tart': {
            ingredients: ['Tepung', 'Mentega dingin', 'Gula', 'Custard', 'Buah segar'],
            process: [
                'Buat kulit tart dari tepung dan mentega',
                'Diamkan di kulkas 30 menit',
                'Panggang kulit kosong 15 menit',
                'Isi dengan custard',
                'Hias dengan buah segar'
            ]
        },
        'Brownies': {
            ingredients: ['Cokelat dark', 'Mentega', 'Gula', 'Telur', 'Tepung', 'Kakao'],
            process: [
                'Lelehkan cokelat dan mentega',
                'Kocok telur dan gula',
                'Campurkan dengan cokelat leleh',
                'Masukkan tepung dan kakao',
                'Panggang 170°C selama 25-30 menit'
            ]
        },
        'Cookies': {
            ingredients: [...base, 'Chocolate chips', 'Baking soda', 'Brown sugar'],
            process: [
                'Kocok mentega dan gula hingga creamy',
                'Masukkan telur dan vanilla',
                'Campurkan tepung dan baking soda',
                'Tambahkan chocolate chips',
                'Panggang 175°C selama 12-15 menit'
            ]
        }
    };
    
    return info[category] || info['Cake'];
}

// Close modal
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.remove('show');
}

// Setup tabs
function setupProductTabs() {
    document.querySelectorAll('.product-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.product-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const targetPane = document.getElementById(`tab-${tabId}`);
            if (targetPane) targetPane.classList.add('active');
        });
    });
}

// Toggle favorite
async function toggleFavorite(productId) {
    if (typeof getCurrentUser !== 'function') {
        showToast('Silakan login terlebih dahulu', 'error');
        return;
    }
    
    const user = getCurrentUser();
    if (!user) {
        showToast('Silakan login terlebih dahulu', 'error');
        return;
    }
    
    const isFav = favorites.includes(productId);
    
    if (isFav) {
        favorites = favorites.filter(id => id !== productId);
        showToast('Dihapus dari favorit', 'success');
    } else {
        favorites.push(productId);
        showToast('Ditambahkan ke favorit', 'success');
    }
    
    renderProducts();
}

// Setup category filter
function setupCategoryFilter() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            selectedCategory = btn.getAttribute('data-category');
            console.log('📂 Category changed to:', selectedCategory);
            renderProducts();
        });
    });
}

// Setup search
function setupSearch() {
    const searchBtn = document.getElementById('search-btn');
    const searchContainer = document.getElementById('search-container');
    const searchInput = document.getElementById('search-input');
    const searchClose = document.getElementById('search-close');
    
    if (searchBtn && searchContainer && searchInput) {
        searchBtn.addEventListener('click', () => {
            searchContainer.classList.toggle('hidden');
            if (!searchContainer.classList.contains('hidden')) {
                searchInput.focus();
            }
        });
    }
    
    if (searchClose && searchContainer && searchInput) {
        searchClose.addEventListener('click', () => {
            searchContainer.classList.add('hidden');
            searchInput.value = '';
            renderProducts();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderProducts(e.target.value);
        });
    }
}

// Setup modal
function setupProductModal() {
    const closeBtn = document.getElementById('close-product');
    const modal = document.getElementById('product-modal');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeProductModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeProductModal();
            }
        });
    }
}

// Initialize
async function initProducts() {
    console.log('🚀 Products Module Initializing...');
    
    await fetchProducts();
    setupCategoryFilter();
    setupSearch();
    setupProductModal();
    
    console.log('✅ Products Module Ready');
    console.log('📦 Total products loaded:', allProducts.length);
}

// Auto-start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProducts);
} else {
    setTimeout(initProducts, 100);
}

console.log('📦 Products Module Loaded');