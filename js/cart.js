// =============================================
// SWEETIFY - SHOPPING CART MODULE (COMPLETE FIX)
// =============================================

const CART_STORAGE_KEY = 'sweetify_cart';
let cart = [];

// Load cart from localStorage
function loadCart() {
    try {
        const storedCart = localStorage.getItem(CART_STORAGE_KEY);
        cart = storedCart ? JSON.parse(storedCart) : [];
        console.log('🛒 Cart loaded:', cart.length, 'items');
    } catch (error) {
        console.error('❌ Error loading cart:', error);
        cart = [];
    }
    updateCartUI();
}

// Save cart to localStorage
function saveCart() {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        console.log('💾 Cart saved:', cart.length, 'items');
    } catch (error) {
        console.error('❌ Error saving cart:', error);
    }
}

// Add item to cart
function addToCart(productId) {
    console.log('➕ Adding to cart:', productId);
    
    // Find product
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        console.error('❌ Product not found:', productId);
        showToast('Produk tidak ditemukan', 'error');
        return;
    }
    
    // Check if already in cart
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
        console.log('✅ Updated quantity:', existingItem.quantity);
        showToast(`${product.name} ditambahkan (${existingItem.quantity})`, 'success');
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity: 1
        });
        console.log('✅ Added new item to cart');
        showToast(`${product.name} ditambahkan ke keranjang`, 'success');
    }
    
    saveCart();
    updateCartUI();
}

// Update quantity
function updateQuantity(productId, change) {
    console.log('🔄 Update quantity:', productId, change);
    
    const item = cart.find(i => i.id === productId);
    
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartUI();
        }
    }
}

// Remove item from cart
function removeFromCart(productId) {
    console.log('🗑️ Removing from cart:', productId);
    
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    showToast('Item dihapus dari keranjang', 'success');
}

// Clear cart
function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
    console.log('🧹 Cart cleared');
}

// Calculate total
function calculateTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Update cart UI
function updateCartUI() {
    const cartBadge = document.getElementById('cart-badge');
    const navCartBadge = document.getElementById('nav-cart-badge');
    const floatingCartBtn = document.getElementById('floating-cart-btn');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = calculateTotal();
    
    console.log('🔄 Updating cart UI:', {totalItems, totalAmount});
    
    // Update badges
    if (cartBadge) cartBadge.textContent = totalItems;
    if (navCartBadge) {
        navCartBadge.textContent = totalItems;
        if (totalItems > 0) {
            navCartBadge.classList.remove('hidden');
        } else {
            navCartBadge.classList.add('hidden');
        }
    }
    
    // Show/hide floating cart button
    if (floatingCartBtn) {
        if (totalItems > 0) {
            floatingCartBtn.classList.remove('hidden');
        } else {
            floatingCartBtn.classList.add('hidden');
        }
    }
    
    // Update cart items display
    if (cartItems) {
        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart">🛒 Keranjang Anda masih kosong</p>';
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image_url || 'https://via.placeholder.com/60'}" 
                         alt="${item.name}" 
                         class="cart-item-image"
                         onerror="this.src='https://via.placeholder.com/60?text=Img'">
                    <div class="cart-item-info">
                        <h4 class="cart-item-name">${item.name}</h4>
                        <p class="cart-item-price">${formatCurrency(item.price)}</p>
                    </div>
                    <div class="cart-item-actions">
                        <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)" title="Kurangi">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)" title="Tambah">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn-remove" onclick="removeFromCart('${item.id}')" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    // Update total
    if (cartTotal) {
        cartTotal.textContent = formatCurrency(totalAmount);
    }
    
    // Enable/disable checkout button
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
        if (cart.length === 0) {
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.cursor = 'not-allowed';
        } else {
            checkoutBtn.style.opacity = '1';
            checkoutBtn.style.cursor = 'pointer';
        }
    }
}

// Open cart modal
function openCartModal() {
    console.log('🛒 Opening cart modal');
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
        updateCartUI();
        console.log('✅ Cart modal opened');
    } else {
        console.error('❌ Cart modal not found!');
    }
}

async function loadDashboard() {
            try {
                const [products, orders, customers] = await Promise.all([
                    supabase.from('products').select('*', { count: 'exact' }),
                    supabase.from('orders').select('*'),
                    supabase.from('user_profiles').select('*', { count: 'exact' })
                ]);

                document.getElementById('total-products').textContent = products.count || 0;
                document.getElementById('total-orders').textContent = orders.data?.length || 0;
                document.getElementById('total-customers').textContent = customers.count || 0;

                const revenue = orders.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
                document.getElementById('total-revenue').textContent = formatCurrency(revenue);

                displayRecentOrders(orders.data?.slice(0, 5) || []);
            } catch (error) {
                console.error('Error loading dashboard:', error);
            }
        }

// Close cart modal
function closeCartModal() {
    console.log('❌ Closing cart modal');
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.classList.remove('show');
        // Don't add 'hidden', let CSS handle it
        console.log('✅ Cart modal closed');
    }
}

// Proceed to checkout
function proceedToCheckout() {
    console.log('💳 Proceeding to checkout');
    
    const user = getCurrentUser();
    
    if (!user) {
        showToast('Silakan login terlebih dahulu', 'error');
        closeCartModal();
        setTimeout(() => {
            // Show login modal
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) loginBtn.click();
        }, 500);
        return;
    }
    
    if (cart.length === 0) {
        showToast('Keranjang Anda masih kosong', 'error');
        return;
    }
    
    // Store cart in localStorage for checkout page
    localStorage.setItem('sweetify_checkout_cart', JSON.stringify(cart));
    
    // Navigate to checkout page
    window.location.href = 'checkout.html';
}

// Setup cart event listeners
function setupCartListeners() {
    console.log('🔧 Setting up cart listeners...');
    
    const floatingCartBtn = document.getElementById('floating-cart-btn');
    const navCart = document.getElementById('nav-cart');
    const closeCart = document.getElementById('close-cart');
    const checkoutBtn = document.getElementById('checkout-btn');
    const cartModal = document.getElementById('cart-modal');
    
    if (floatingCartBtn) {
        floatingCartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Floating cart button clicked');
            openCartModal();
        });
        console.log('✅ Floating cart button listener added');
    } else {
        console.warn('⚠️ Floating cart button not found');
    }
    
    if (navCart) {
        navCart.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Nav cart clicked');
            openCartModal();
        });
        console.log('✅ Nav cart listener added');
    } else {
        console.warn('⚠️ Nav cart not found');
    }
    
    if (closeCart) {
        closeCart.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Close cart clicked');
            closeCartModal();
        });
        console.log('✅ Close cart listener added');
    } else {
        console.warn('⚠️ Close cart button not found');
    }
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Checkout button clicked');
            proceedToCheckout();
        });
        console.log('✅ Checkout button listener added');
    } else {
        console.warn('⚠️ Checkout button not found');
    }
    
    if (cartModal) {
        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) {
                console.log('🖱️ Modal overlay clicked');
                closeCartModal();
            }
        });
        console.log('✅ Modal overlay listener added');
    } else {
        console.warn('⚠️ Cart modal not found');
    }
    
    console.log('✅ Cart listeners setup complete');
}

// Initialize cart
function initCart() {
    console.log('🚀 Cart Module Initializing...');
    loadCart();
    setupCartListeners();
    console.log('✅ Cart Module Ready');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCart);
} else {
    initCart();
}

console.log('🛒 Cart Module Loaded');