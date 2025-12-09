// =============================================
// SWEETIFY - ORDERS MODULE (SHOPEE-LIKE)
// =============================================

let allOrders = [];
let currentFilter = 'all';

// Initialize orders page
async function initOrders() {
    const user = await checkAuth();
    if (!user) {
        showToast('Silakan login terlebih dahulu', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }
    
    await loadOrders();
    setupOrdersListeners();
}

// Load orders from database
async function loadOrders() {
    const loading = document.getElementById('loading');
    const ordersContainer = document.getElementById('orders-container');
    const emptyState = document.getElementById('empty-state');
    
    try {
        loading.classList.remove('hidden');
        ordersContainer.innerHTML = '';
        emptyState.classList.add('hidden');
        
        const user = await checkAuth();
        
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    product_id,
                    product_name,
                    product_price,
                    quantity,
                    subtotal
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allOrders = data || [];
        
        if (allOrders.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            renderOrders();
        }
        
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Gagal memuat pesanan', 'error');
    } finally {
        loading.classList.add('hidden');
    }
}

// Render orders list
function renderOrders() {
    const ordersContainer = document.getElementById('orders-container');
    const emptyState = document.getElementById('empty-state');
    
    let filteredOrders = allOrders;
    
    // Filter by status
    if (currentFilter !== 'all') {
        if (currentFilter === 'pending') {
            filteredOrders = allOrders.filter(o => 
                o.status === 'pending' || o.status === 'waiting_confirmation'
            );
        } else if (currentFilter === 'processing') {
            filteredOrders = allOrders.filter(o => o.status === 'processing');
        } else if (currentFilter === 'shipping') {
            filteredOrders = allOrders.filter(o => o.status === 'shipping');
        } else if (currentFilter === 'completed') {
            filteredOrders = allOrders.filter(o => o.status === 'completed');
        }
    }
    
    if (filteredOrders.length === 0) {
        ordersContainer.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    ordersContainer.innerHTML = filteredOrders.map(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        const statusText = getStatusText(order.status);
        
        return `
            <div class="order-card-shopee">
                <!-- Header -->
                <div class="order-card-header">
                    <div class="order-shop-info">
                        <i class="fas fa-store"></i>
                        <span class="order-shop-name">Sweetify</span>
                    </div>
                    <span class="order-status-badge ${order.status}">${statusText}</span>
                </div>
                
                <!-- Body -->
                <div class="order-card-body">
                    <div class="order-product-list">
                        ${order.order_items.map((item, index) => {
                            // Hanya tampilkan 2 produk pertama
                            if (index >= 2) return '';
                            // Placeholder image
                            const imageUrl = 'https://via.placeholder.com/70x70/F5DEB3/8B4513?text=' + encodeURIComponent(item.product_name.substring(0, 10));
                            return `
                                <div class="order-product-item">
                                    <img src="${imageUrl}" 
                                         alt="${item.product_name}" 
                                         class="order-product-image">
                                    <div class="order-product-info">
                                        <div class="order-product-name">${item.product_name}</div>
                                        <div class="order-product-meta">
                                            <span class="order-product-qty">x${item.quantity}</span>
                                            <span class="order-product-price">${formatCurrency(item.subtotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${order.order_items.length > 2 ? `
                            <div style="text-align: center; font-size: 12px; color: var(--color-text-light);">
                                +${order.order_items.length - 2} produk lainnya
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="order-total-section">
                        <span class="order-total-label">${order.order_items.length} Produk</span>
                        <div class="order-total-amount">
                            <span class="order-total-label-main">Total Pesanan:</span>
                            <span class="order-total-price">${formatCurrency(order.total_amount)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="order-card-footer">
                    <div class="order-footer-left">
                        <i class="far fa-clock"></i> ${orderDate}
                    </div>
                    <div class="order-footer-actions">
                        <button class="btn-order-action whatsapp" onclick="contactAdminOrder('${order.order_number}')">
                            <i class="fab fa-whatsapp"></i> Hubungi
                        </button>
                        ${order.status === 'completed' ? `
                            <button class="btn-order-action primary" onclick="showRatingModal('${order.id}')">
                                <i class="fas fa-star"></i> Nilai
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'pending': 'Menunggu Pembayaran',
        'waiting_confirmation': 'Menunggu Konfirmasi',
        'processing': 'Sedang Diproses',
        'shipping': 'Dalam Pengiriman',
        'completed': 'Selesai',
        'cancelled': 'Dibatalkan'
    };
    return statusMap[status] || status;
}

// Contact admin via WhatsApp
function contactAdminOrder(orderNumber) {
    const message = `Halo Admin Sweetify, saya ingin bertanya tentang pesanan saya:\n\nNo. Pesanan: ${orderNumber}`;
    const whatsappUrl = `https://wa.me/${APP_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Show rating modal
async function showRatingModal(orderId) {
    const modal = document.getElementById('rating-modal');
    const content = document.getElementById('rating-content');
    
    try {
        const order = allOrders.find(o => o.id === orderId);
        if (!order) return;
        
        // Check existing ratings
        const user = await checkAuth();
        const { data: existingRatings } = await supabase
            .from('product_ratings')
            .select('product_id, rating, review')
            .eq('order_id', orderId)
            .eq('user_id', user.id);
        
        const ratedProductIds = existingRatings ? existingRatings.map(r => r.product_id) : [];
        
        content.innerHTML = `
            <div style="margin-bottom: 20px;">
                <p style="font-size: 14px; color: var(--color-text-light);">
                    Bagaimana pengalaman Anda dengan produk-produk ini?
                </p>
            </div>
            
            ${order.order_items.map(item => {
                const existingRating = existingRatings?.find(r => r.product_id === item.product_id);
                const isRated = ratedProductIds.includes(item.product_id);
                
                return `
                    <div class="product-rating-item">
                        <div class="rating-product-info">
                            <img src="https://via.placeholder.com/60" 
                                 alt="${item.product_name}" 
                                 class="rating-product-image">
                            <div>
                                <div class="rating-product-name">${item.product_name}</div>
                                ${isRated ? '<span style="font-size: 12px; color: #28a745;"><i class="fas fa-check-circle"></i> Sudah dinilai</span>' : ''}
                            </div>
                        </div>
                        
                        <div class="star-rating" data-product-id="${item.product_id}">
                            ${[1,2,3,4,5].map(star => `
                                <i class="fas fa-star ${existingRating && star <= existingRating.rating ? 'active' : ''}" 
                                   data-rating="${star}"
                                   onclick="selectRating('${item.product_id}', ${star})"></i>
                            `).join('')}
                        </div>
                        
                        <textarea class="rating-textarea" 
                                  id="review-${item.product_id}" 
                                  placeholder="Ceritakan pengalaman Anda (opsional)"
                                  ${isRated ? 'disabled' : ''}>${existingRating ? existingRating.review || '' : ''}</textarea>
                    </div>
                `;
            }).join('')}
            
            <button class="btn-primary btn-submit-rating" onclick="submitRatings('${orderId}')">
                <i class="fas fa-paper-plane"></i> Kirim Penilaian
            </button>
        `;
        
        modal.classList.add('show');
        
    } catch (error) {
        console.error('Error showing rating modal:', error);
        showToast('Gagal memuat form penilaian', 'error');
    }
}

// Close rating modal
function closeRatingModal() {
    const modal = document.getElementById('rating-modal');
    modal.classList.remove('show');
}

// Select rating (star)
function selectRating(productId, rating) {
    const stars = document.querySelectorAll(`.star-rating[data-product-id="${productId}"] i`);
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Submit ratings
async function submitRatings(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    try {
        const user = await checkAuth();
        const ratings = [];
        
        for (const item of order.order_items) {
            const stars = document.querySelectorAll(`.star-rating[data-product-id="${item.product_id}"] i.active`);
            const rating = stars.length;
            const review = document.getElementById(`review-${item.product_id}`)?.value || '';
            
            if (rating > 0) {
                ratings.push({
                    user_id: user.id,
                    product_id: item.product_id,
                    order_id: orderId,
                    rating: rating,
                    review: review
                });
            }
        }
        
        if (ratings.length === 0) {
            showToast('Pilih minimal 1 bintang untuk setiap produk', 'error');
            return;
        }
        
        // Insert or update ratings
        const { error } = await supabase
            .from('product_ratings')
            .upsert(ratings, { 
                onConflict: 'user_id,order_id,product_id',
                ignoreDuplicates: false 
            });
        
        if (error) throw error;
        
        showToast('Terima kasih atas penilaian Anda!', 'success');
        closeRatingModal();
        
    } catch (error) {
        console.error('Error submitting ratings:', error);
        showToast('Gagal mengirim penilaian: ' + error.message, 'error');
    }
}

// Setup event listeners
function setupOrdersListeners() {
    // Tab buttons
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-status');
            renderOrders();
        });
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initOrders);

console.log('Orders Module Loaded');