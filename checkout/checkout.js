// =============================================
// SWEETIFY - CHECKOUT MODULE
// =============================================

let checkoutCart = [];
let deliveryFee = 0;

// Initialize checkout page
async function initCheckout() {
    // Check if user is logged in
    const user = await checkAuth();
    if (!user) {
        showToast('Silakan login terlebih dahulu', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }
    
    // Load cart from localStorage
    const cartData = localStorage.getItem('sweetify_checkout_cart');
    if (!cartData) {
        showToast('Keranjang kosong', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }
    
    checkoutCart = JSON.parse(cartData);
    
    if (checkoutCart.length === 0) {
        showToast('Keranjang kosong', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }
    
    // Load user profile
    await loadUserProfile(user);
    
    // Render order items
    renderOrderItems();
    
    // Calculate initial price
    calculatePrice();
    
    // Setup event listeners
    setupCheckoutListeners();
}

// Load user profile data
async function loadUserProfile(user) {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (error) throw error;
        
        if (data) {
            // Pre-fill form with user data
            document.getElementById('full-name').value = data.full_name || '';
            document.getElementById('phone').value = data.phone || '';
            document.getElementById('address').value = data.address || '';
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Render order items
function renderOrderItems() {
    const orderItemsContainer = document.getElementById('order-items');
    
    orderItemsContainer.innerHTML = checkoutCart.map(item => `
        <div class="order-item">
            <img src="${item.image_url || 'https://via.placeholder.com/60'}" 
                 alt="${item.name}" 
                 class="order-item-image"
                 onerror="this.src='https://via.placeholder.com/60?text=No+Image'">
            <div class="order-item-info">
                <h4 class="order-item-name">${item.name}</h4>
                <p class="order-item-price">${formatCurrency(item.price)}</p>
                <p class="order-item-qty">Jumlah: ${item.quantity}</p>
            </div>
        </div>
    `).join('');
}

// Calculate price
function calculatePrice() {
    const deliveryMethod = document.getElementById('delivery-method').value;
    
    // Calculate subtotal
    const subtotal = checkoutCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate delivery fee (GoSend flat rate)
    if (deliveryMethod === 'gosend') {
        deliveryFee = APP_CONFIG.deliveryFee; // Rp 15.000
    } else if (deliveryMethod === 'pickup') {
        deliveryFee = 0;
    } else {
        deliveryFee = 0;
    }
    
    const total = subtotal + deliveryFee;
    
    // Update UI
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('delivery-fee').textContent = deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Gratis';
    document.getElementById('total-amount').textContent = formatCurrency(total);
}

// Validate form
function validateForm() {
    const fullName = document.getElementById('full-name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const deliveryMethod = document.getElementById('delivery-method').value;
    const paymentMethod = document.querySelector('input[name="payment"]:checked');
    
    if (!fullName) {
        showToast('Nama lengkap harus diisi', 'error');
        return false;
    }
    
    if (!phone) {
        showToast('Nomor telepon harus diisi', 'error');
        return false;
    }
    
    if (!address) {
        showToast('Alamat harus diisi', 'error');
        return false;
    }
    
    if (!deliveryMethod) {
        showToast('Pilih metode pengiriman', 'error');
        return false;
    }
    
    if (!paymentMethod) {
        showToast('Pilih metode pembayaran', 'error');
        return false;
    }
    
    return true;
}

// Place order
async function placeOrder() {
    if (!validateForm()) return;
    
    const placeOrderBtn = document.getElementById('place-order-btn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    
    try {
        const user = await checkAuth();
        if (!user) throw new Error('User not authenticated');
        
        // Get form data
        const fullName = document.getElementById('full-name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const address = document.getElementById('address').value.trim();
        const deliveryMethod = document.getElementById('delivery-method').value;
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        const notes = document.getElementById('notes').value.trim();
        
        // Calculate total
        const subtotal = checkoutCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total = subtotal + deliveryFee;
        
        // Create order
        const orderNumber = generateOrderNumber();
        
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: user.id,
                order_number: orderNumber,
                total_amount: total,
                status: 'pending',
                payment_method: paymentMethod,
                delivery_address: `${fullName}\n${phone}\n${address}`,
                delivery_method: deliveryMethod,
                is_preorder: false
            })
            .select()
            .single();
        
        if (orderError) throw orderError;
        
        // Create order items
        const orderItems = checkoutCart.map(item => ({
            order_id: order.id,
            product_id: item.id,
            product_name: item.name,
            product_price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity
        }));
        
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);
        
        if (itemsError) throw itemsError;
        
        // Update user profile
        await supabase
            .from('user_profiles')
            .update({
                full_name: fullName,
                phone: phone,
                address: address
            })
            .eq('id', user.id);
        
        // Clear cart
        localStorage.removeItem('sweetify_cart');
        localStorage.removeItem('sweetify_checkout_cart');
        
        // Show success message
        showToast('Pesanan berhasil dibuat!', 'success');
        
        // Redirect to payment page
        setTimeout(() => {
            window.location.href = `payment.html?order=${order.id}`;
        }, 1500);
        
    } catch (error) {
        console.error('Error placing order:', error);
        showToast('Gagal membuat pesanan: ' + error.message, 'error');
        
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = '<i class="fas fa-check-circle"></i> Buat Pesanan';
    }
}

// Setup event listeners
function setupCheckoutListeners() {
    const deliveryMethodSelect = document.getElementById('delivery-method');
    const placeOrderBtn = document.getElementById('place-order-btn');
    
    if (deliveryMethodSelect) {
        deliveryMethodSelect.addEventListener('change', calculatePrice);
    }
    
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', placeOrder);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initCheckout);

console.log('Checkout Module Loaded');