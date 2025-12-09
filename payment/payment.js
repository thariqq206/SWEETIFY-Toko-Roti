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

// =============================================
// SWEETIFY - PAYMENT MODULE
// =============================================

let currentOrder = null;
let selectedFile = null;

// Initialize payment page
async function initPayment() {
    // Get order ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order');
    
    if (!orderId) {
        showToast('Order tidak ditemukan', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }
    
    // Load order details
    await loadOrderDetails(orderId);
    
    // Setup event listeners
    setupPaymentListeners();
}

// Load order details
async function loadOrderDetails(orderId) {
    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    product_name,
                    product_price,
                    quantity,
                    subtotal
                )
            `)
            .eq('id', orderId)
            .single();
        
        if (error) throw error;
        
        currentOrder = order;
        
        // Display order details
        displayOrderNumber(order.order_number);
        displayPaymentInstructions(order.payment_method);
        displayOrderSummary(order);
        
    } catch (error) {
        console.error('Error loading order:', error);
        showToast('Gagal memuat detail pesanan', 'error');
    }
}

// Display order number
function displayOrderNumber(orderNumber) {
    document.getElementById('order-number').textContent = orderNumber;
}

// Display payment instructions
function displayPaymentInstructions(paymentMethod) {
    const instructionsContainer = document.getElementById('payment-instructions');
    
    // Untuk demo, semua payment method jadi QRIS
    const instructions = `
        <div class="payment-info">
            <h3><i class="fas fa-qrcode"></i> Scan QRIS untuk Pembayaran</h3>
            <p class="qris-instruction">Scan QR Code di bawah dengan aplikasi e-wallet atau mobile banking Anda:</p>
        </div>
        <div style="text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 12px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=QRIS_SWEETIFY_${currentOrder.order_number}_${currentOrder.total_amount}" 
                 alt="QRIS Code" 
                 style="width: 250px; height: 250px; border: 3px solid #ddd; padding: 10px; border-radius: 12px;">
            <p style="margin-top: 16px; font-size: 14px; color: #666;">
                <i class="fas fa-mobile-alt"></i> Buka aplikasi e-wallet atau mobile banking
            </p>
            <p style="font-size: 14px; color: #666;">
                <i class="fas fa-camera"></i> Pilih menu QRIS / Scan QR
            </p>
            <p style="font-size: 14px; color: #666;">
                <i class="fas fa-check-circle"></i> Scan kode di atas
            </p>
        </div>
        <div class="payment-demo-note">
            <i class="fas fa-info-circle"></i>
            <div>
                <strong>Mode Demo:</strong> Untuk demo, klik tombol "Simulasi Pembayaran Berhasil" di bawah untuk melanjutkan ke halaman pesanan.
            </div>
        </div>
        <button class="btn-primary" style="margin-top: 20px;" onclick="simulatePaymentSuccess()">
            <i class="fas fa-check-circle"></i> Simulasi Pembayaran Berhasil
        </button>
    `;
    
    instructionsContainer.innerHTML = instructions;
}

// Copy account number
function copyAccountNumber() {
    const accountNumber = document.getElementById('account-number').textContent;
    navigator.clipboard.writeText(accountNumber).then(() => {
        showToast('Nomor rekening disalin', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Display order summary
function displayOrderSummary(order) {
    const summaryContainer = document.getElementById('order-summary');
    
    let itemsHTML = order.order_items.map(item => `
        <div class="summary-row">
            <span>${item.product_name} x${item.quantity}</span>
            <span>${formatCurrency(item.subtotal)}</span>
        </div>
    `).join('');
    
    summaryContainer.innerHTML = `
        ${itemsHTML}
        <div class="summary-row">
            <span>Total</span>
            <span>${formatCurrency(order.total_amount)}</span>
        </div>
    `;
}

// Setup event listeners
function setupPaymentListeners() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const uploadPreview = document.getElementById('upload-preview');
    const previewImage = document.getElementById('preview-image');
    const removeImageBtn = document.getElementById('remove-image');
    const submitProofBtn = document.getElementById('submit-proof-btn');
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File selected
    fileInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files[0]);
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFileSelect(e.dataTransfer.files[0]);
    });
    
    // Remove image
    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFile = null;
        fileInput.value = '';
        uploadPlaceholder.classList.remove('hidden');
        uploadPreview.classList.add('hidden');
        submitProofBtn.disabled = true;
    });
    
    // Submit proof
    submitProofBtn.addEventListener('click', submitPaymentProof);
}

// Handle file selection
function handleFileSelect(file) {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('File harus berupa gambar', 'error');
        return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran file maksimal 5MB', 'error');
        return;
    }
    
    selectedFile = file;
    
    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewImage = document.getElementById('preview-image');
        const uploadPlaceholder = document.getElementById('upload-placeholder');
        const uploadPreview = document.getElementById('upload-preview');
        
        previewImage.src = e.target.result;
        uploadPlaceholder.classList.add('hidden');
        uploadPreview.classList.remove('hidden');
        document.getElementById('submit-proof-btn').disabled = false;
    };
    reader.readAsDataURL(file);
}

// Submit payment proof
async function submitPaymentProof() {
    if (!selectedFile) {
        showToast('Pilih file terlebih dahulu', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submit-proof-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengunggah...';
    
    try {
        // Upload to Supabase Storage
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${currentOrder.id}-${Date.now()}.${fileExt}`;
        const filePath = `payment-proofs/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filePath, selectedFile);
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: urlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(filePath);
        
        // Update order with payment proof
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                payment_proof_url: urlData.publicUrl,
                status: 'waiting_confirmation'
            })
            .eq('id', currentOrder.id);
        
        if (updateError) throw updateError;
        
        showToast('Bukti pembayaran berhasil dikirim!', 'success');
        
        // Redirect after success
        setTimeout(() => {
            window.location.href = 'orders.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error uploading payment proof:', error);
        showToast('Gagal mengunggah bukti: ' + error.message, 'error');
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Bukti Pembayaran';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initPayment);

console.log('Payment Module Loaded');

// =============================================
// SWEETIFY - PAYMENT MODULE
// =============================================


// Initialize payment page
async function initPayment() {
    // Get order ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order');
    
    if (!orderId) {
        showToast('Order tidak ditemukan', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }
    
    // Load order details
    await loadOrderDetails(orderId);
    
    // Setup event listeners
    setupPaymentListeners();
}

// Load order details
async function loadOrderDetails(orderId) {
    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    product_name,
                    product_price,
                    quantity,
                    subtotal
                )
            `)
            .eq('id', orderId)
            .single();
        
        if (error) throw error;
        
        currentOrder = order;
        
        // Display order details
        displayOrderNumber(order.order_number);
        displayPaymentInstructions(order.payment_method);
        displayOrderSummary(order);
        
    } catch (error) {
        console.error('Error loading order:', error);
        showToast('Gagal memuat detail pesanan', 'error');
    }
}

// Display order number
function displayOrderNumber(orderNumber) {
    document.getElementById('order-number').textContent = orderNumber;
}

// Display payment instructions
function displayPaymentInstructions(paymentMethod) {
    const instructionsContainer = document.getElementById('payment-instructions');
    
    // Untuk demo, semua payment method jadi QRIS
    const instructions = `
        <div class="payment-info">
            <h3><i class="fas fa-qrcode"></i> Scan QRIS untuk Pembayaran</h3>
            <p class="qris-instruction">Scan QR Code di bawah dengan aplikasi e-wallet atau mobile banking Anda:</p>
        </div>
        <div style="text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 12px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=QRIS_SWEETIFY_${currentOrder.order_number}_${currentOrder.total_amount}" 
                 alt="QRIS Code" 
                 style="width: 250px; height: 250px; border: 3px solid #ddd; padding: 10px; border-radius: 12px;">
            <p style="margin-top: 16px; font-size: 14px; color: #666;">
                <i class="fas fa-mobile-alt"></i> Buka aplikasi e-wallet atau mobile banking
            </p>
            <p style="font-size: 14px; color: #666;">
                <i class="fas fa-camera"></i> Pilih menu QRIS / Scan QR
            </p>
            <p style="font-size: 14px; color: #666;">
                <i class="fas fa-check-circle"></i> Scan kode di atas
            </p>
        </div>
        <div class="payment-demo-note">
            <i class="fas fa-info-circle"></i>
            <div>
                <strong>Mode Demo:</strong> Untuk demo, klik tombol "Simulasi Pembayaran Berhasil" di bawah untuk melanjutkan ke halaman pesanan.
            </div>
        </div>
        <button class="btn-primary" style="margin-top: 20px;" onclick="simulatePaymentSuccess()">
            <i class="fas fa-check-circle"></i> Simulasi Pembayaran Berhasil
        </button>
    `;
    
    instructionsContainer.innerHTML = instructions;
}

// Copy account number
function copyAccountNumber() {
    const accountNumber = document.getElementById('account-number').textContent;
    navigator.clipboard.writeText(accountNumber).then(() => {
        showToast('Nomor rekening disalin', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Display order summary
function displayOrderSummary(order) {
    const summaryContainer = document.getElementById('order-summary');
    
    let itemsHTML = order.order_items.map(item => `
        <div class="summary-row">
            <span>${item.product_name} x${item.quantity}</span>
            <span>${formatCurrency(item.subtotal)}</span>
        </div>
    `).join('');
    
    summaryContainer.innerHTML = `
        ${itemsHTML}
        <div class="summary-row">
            <span>Total</span>
            <span>${formatCurrency(order.total_amount)}</span>
        </div>
    `;
}

// Setup event listeners
function setupPaymentListeners() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const uploadPreview = document.getElementById('upload-preview');
    const previewImage = document.getElementById('preview-image');
    const removeImageBtn = document.getElementById('remove-image');
    const submitProofBtn = document.getElementById('submit-proof-btn');
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File selected
    fileInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files[0]);
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFileSelect(e.dataTransfer.files[0]);
    });
    
    // Remove image
    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFile = null;
        fileInput.value = '';
        uploadPlaceholder.classList.remove('hidden');
        uploadPreview.classList.add('hidden');
        submitProofBtn.disabled = true;
    });
    
    // Submit proof
    submitProofBtn.addEventListener('click', submitPaymentProof);
}

// Handle file selection
function handleFileSelect(file) {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('File harus berupa gambar', 'error');
        return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Ukuran file maksimal 5MB', 'error');
        return;
    }
    
    selectedFile = file;
    
    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewImage = document.getElementById('preview-image');
        const uploadPlaceholder = document.getElementById('upload-placeholder');
        const uploadPreview = document.getElementById('upload-preview');
        
        previewImage.src = e.target.result;
        uploadPlaceholder.classList.add('hidden');
        uploadPreview.classList.remove('hidden');
        document.getElementById('submit-proof-btn').disabled = false;
    };
    reader.readAsDataURL(file);
}

// Submit payment proof
async function submitPaymentProof() {
    if (!selectedFile) {
        showToast('Pilih file terlebih dahulu', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submit-proof-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengunggah...';
    
    try {
        // Upload to Supabase Storage
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${currentOrder.id}-${Date.now()}.${fileExt}`;
        const filePath = `payment-proofs/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filePath, selectedFile);
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: urlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(filePath);
        
        // Update order with payment proof
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                payment_proof_url: urlData.publicUrl,
                status: 'waiting_confirmation'
            })
            .eq('id', currentOrder.id);
        
        if (updateError) throw updateError;
        
        showToast('Bukti pembayaran berhasil dikirim!', 'success');
        
        // Redirect after success
        setTimeout(() => {
            window.location.href = 'orders.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error uploading payment proof:', error);
        showToast('Gagal mengunggah bukti: ' + error.message, 'error');
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Bukti Pembayaran';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initPayment);

// Simulate payment success (untuk demo)
async function simulatePaymentSuccess() {
    try {
        const { error } = await supabase
            .from('orders')
            .update({
                status: 'processing',
                payment_proof_url: 'https://via.placeholder.com/400x300?text=QRIS+Payment+Success',
                updated_at: new Date().toISOString()
            })
            .eq('id', currentOrder.id);
        
        if (error) throw error;
        
        showToast('Pembayaran berhasil! Pesanan Anda sedang diproses', 'success');
        
        setTimeout(() => {
            window.location.href = 'orders.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error simulating payment:', error);
        showToast('Gagal memproses pembayaran', 'error');
    }
}

console.log('Payment Module Loaded');