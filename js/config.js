// ========================================
// SWEETIFY - SUPABASE CONFIGURATION
// ========================================

// Supabase Configuration
const SUPABASE_URL = 'https://ylfyixhkowiukaeunzjo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZnlpeGhrb3dpdWthZXVuempvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NDg4NTEsImV4cCI6MjA4MDAyNDg1MX0.x1bD_-kTTyqNWPzj-llbGPIfgWx4YJVDpqMnD1O5WoU';

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin Email - Login dengan email ini akan masuk ke admin dashboard
const ADMIN_EMAIL = 'naufalthariq21@gmail.com';

// Current User Global Variable
let currentUser = null;

// App Configuration
const APP_CONFIG = {
    appName: 'Sweetify',
    appVersion: '1.0.0',
    currency: 'IDR',
    locale: 'id-ID',
    whatsappNumber: '628561311299',
    deliveryFee: 15000,
    minOrder: 50000,
    logoUrl: 'https://i.ibb.co/9ZJ8LJh/sweetify-logo.png',
    storageKey: {
        cart: 'sweetify_cart',
        user: 'sweetify_user'
    }
};

// Format currency to Indonesian Rupiah
function formatCurrency(amount) {
    return new Intl.NumberFormat(APP_CONFIG.locale, {
        style: 'currency',
        currency: APP_CONFIG.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    if (!toast || !toastMessage) {
        console.log('Toast:', message);
        return;
    }
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Generate order number
function generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SW${year}${month}${day}${random}`;
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Check if user is admin
function isAdmin() {
    return currentUser && currentUser.email === ADMIN_EMAIL;
}

// Get user initials
function getInitials(name) {
    if (!name) return 'U';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Validate email
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Save to localStorage with error handling
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

// Get from localStorage with error handling
function getFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
    }
}

// Remove from localStorage
function removeLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
    }
}

// Check and redirect to admin if admin user
async function checkAdminRedirect() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.email === ADMIN_EMAIL) {
        // User is admin, check if not on admin page
        if (!window.location.pathname.includes('admin')) {
            console.log('Admin detected, redirecting to admin dashboard...');
            window.location.href = 'admin.html';
        }
    }
}

// Initialize auth and check admin
async function initializeAuth() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
            currentUser = session.user;
            console.log('User logged in:', currentUser.email);
            
            // Check if admin
            if (currentUser.email === ADMIN_EMAIL) {
                console.log('Admin user detected!');
            }
        } else {
            currentUser = null;
            console.log('No user logged in');
        }
        
        return currentUser;
    } catch (error) {
        console.error('Error initializing auth:', error);
        return null;
    }
}

// Listen to auth changes
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event);
    
    if (session?.user) {
        currentUser = session.user;
        
        // Redirect admin to admin dashboard
        if (event === 'SIGNED_IN' && currentUser.email === ADMIN_EMAIL) {
            console.log('Admin signed in, redirecting...');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 500);
        }
    } else {
        currentUser = null;
    }
});

console.log('✅ Sweetify Config Loaded');
console.log('📦 Supabase initialized:', SUPABASE_URL);