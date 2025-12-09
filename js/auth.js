// ========================================
// SWEETIFY - AUTHENTICATION MODULE (COMPLETE FIX)
// ========================================

let isLoginForm = true;

// ========================================
// AUTH STATE MANAGEMENT
// ========================================

// Initialize Auth
async function initAuth() {
    try {
        console.log('🔐 Initializing Auth...');
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session?.user) {
            currentUser = session.user;
            console.log('✅ User logged in:', currentUser.email);
            
            // Check if admin
            if (currentUser.email === ADMIN_EMAIL) {
                console.log('👨‍💼 Admin user detected!');
                
                // If on customer page, redirect to admin
                if (!window.location.pathname.includes('admin')) {
                    console.log('🔄 Redirecting to admin dashboard...');
                    window.location.href = 'admin.html';
                    return;
                }
            } else {
                console.log('👤 Regular user logged in');
                
                // If regular user on admin page, redirect to home
                if (window.location.pathname.includes('admin')) {
                    console.log('🔄 Redirecting to customer dashboard...');
                    window.location.href = 'index.html';
                    return;
                }
            }
            
            await updateAuthUI();
            await loadUserProfile();
        } else {
            console.log('👤 No user logged in');
        }
        
        // Listen to auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Auth state changed:', event);
            
            if (session?.user) {
                currentUser = session.user;
                await updateAuthUI();
                await loadUserProfile();
                
                if (event === 'SIGNED_IN') {
                    // Check if admin and redirect
                    if (currentUser.email === ADMIN_EMAIL) {
                        console.log('👨‍💼 Admin logged in, redirecting...');
                        showToast('Selamat datang Admin!', 'success');
                        setTimeout(() => {
                            window.location.href = 'admin.html';
                        }, 1000);
                    } else {
                        console.log('👤 Regular user logged in');
                        showToast('Berhasil login!', 'success');
                        // Stay on current page (index.html for customers)
                    }
                }
            } else {
                currentUser = null;
                updateAuthUI();
                
                if (event === 'SIGNED_OUT') {
                    showToast('Berhasil logout', 'success');
                    
                    // If on admin page, redirect to home
                    if (window.location.pathname.includes('admin')) {
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 1000);
                    }
                }
            }
        });
        
        console.log('✅ Auth initialized');
    } catch (error) {
        console.error('❌ Error initializing auth:', error);
    }
}

// Update Auth UI
async function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const userProfileBtn = document.getElementById('user-profile-btn');
    const userInitial = document.getElementById('user-initial');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const userInitials = document.getElementById('user-initials');
    const userAvatar = document.getElementById('user-avatar');
    const userMenu = document.getElementById('user-menu');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (currentUser) {
        // Hide login button, show profile button
        if (loginBtn) loginBtn.style.display = 'none';
        if (userMenu) userMenu.classList.remove('hidden');
        
        // Set user initial
        const name = currentUser.user_metadata?.full_name || currentUser.email;
        const initials = getInitials(name);
        
        if (userInitial) userInitial.textContent = initials;
        if (userInitials) userInitials.textContent = initials;
        
        // Set user menu info
        if (userName) userName.textContent = name;
        if (userEmail) userEmail.textContent = currentUser.email;
        
        // Setup user avatar click
        if (userAvatar) {
            userAvatar.onclick = () => {
                if (userDropdown) {
                    userDropdown.classList.toggle('hidden');
                }
            };
        }
    } else {
        // Show login button, hide profile button
        if (loginBtn) loginBtn.style.display = 'flex';
        if (userMenu) userMenu.classList.add('hidden');
    }
}

// Load User Profile
async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        // If profile doesn't exist, create one
        if (!data) {
            await createUserProfile();
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Create User Profile
async function createUserProfile() {
    if (!currentUser) return;
    
    try {
        const { error } = await supabase
            .from('user_profiles')
            .insert({
                id: currentUser.id,
                email: currentUser.email,
                full_name: currentUser.user_metadata?.full_name || '',
                phone: '',
                address: ''
            });
        
        if (error) throw error;
        console.log('✅ User profile created');
    } catch (error) {
        console.error('Error creating user profile:', error);
    }
}

// ========================================
// AUTH MODAL FUNCTIONS
// ========================================

// Show Auth Modal
function showAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('show');
        isLoginForm = true;
        updateAuthFormUI();
    }
}

// Close Auth Modal
function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('show');
        resetAuthForms();
    }
}

// Toggle Auth Form (Login/Register)
function toggleAuthForm() {
    isLoginForm = !isLoginForm;
    updateAuthFormUI();
}

// Update Auth Form UI
function updateAuthFormUI() {
    const authTitle = document.getElementById('auth-title');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authToggleText = document.getElementById('auth-toggle-text');
    
    if (isLoginForm) {
        if (authTitle) authTitle.textContent = 'Login';
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (authToggleText) {
            authToggleText.innerHTML = 'Belum punya akun? <a href="#" onclick="toggleAuthForm(); return false;">Daftar di sini</a>';
        }
    } else {
        if (authTitle) authTitle.textContent = 'Daftar Akun';
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (authToggleText) {
            authToggleText.innerHTML = 'Sudah punya akun? <a href="#" onclick="toggleAuthForm(); return false;">Login di sini</a>';
        }
    }
}

// Reset Auth Forms
function resetAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
}

// ========================================
// AUTH ACTIONS
// ========================================

// Handle Login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;
    
    if (!email || !password) {
        showToast('Email dan password harus diisi', 'error');
        return;
    }
    
    try {
        console.log('🔐 Attempting login for:', email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('❌ Login error:', error);
            
            // Handle specific error cases
            if (error.message === 'Email not confirmed' || error.code === 'email_not_confirmed') {
                showToast('⚠️ Email belum diverifikasi. Cek inbox email Anda!', 'error');
                return;
            }
            
            if (error.message === 'Invalid login credentials') {
                showToast('❌ Email atau password salah!', 'error');
                return;
            }
            
            throw error;
        }
        
        console.log('✅ Login successful!');
        
        closeAuthModal();
        
        // Check if admin
        if (email === ADMIN_EMAIL) {
            console.log('👨‍💼 Admin login detected');
            showToast('Selamat datang Admin!', 'success');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            console.log('👤 Regular user login');
            showToast('Berhasil login! Selamat berbelanja 🛒', 'success');
            // Stay on index.html for shopping
        }
        
    } catch (error) {
        console.error('❌ Login error:', error);
        showToast(error.message || 'Gagal login. Periksa email dan password Anda.', 'error');
    }
}

// Handle Register
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('register-name')?.value;
    const email = document.getElementById('register-email')?.value;
    const password = document.getElementById('register-password')?.value;
    const confirmPassword = document.getElementById('register-confirm-password')?.value;
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showToast('Semua field harus diisi', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('Format email tidak valid', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password minimal 6 karakter', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Password tidak cocok', 'error');
        return;
    }
    
    try {
        console.log('🔐 Registering user:', email);
        
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name
                },
                // Optional: Skip email confirmation for instant login
                // emailRedirectTo: window.location.origin
            }
        });
        
        if (error) {
            console.error('❌ Register error:', error);
            throw error;
        }
        
        console.log('✅ Registration successful!');
        console.log('Registration data:', data);
        
        closeAuthModal();
        
        // Check if email confirmation is required
        if (data.user && !data.session) {
            // Email confirmation required
            showToast('✅ Pendaftaran berhasil! Silakan cek email untuk verifikasi.', 'success');
            
            // Show login form after a delay
            setTimeout(() => {
                showToast('💡 Setelah verifikasi email, silakan login.', 'success');
            }, 3000);
        } else if (data.session) {
            // Auto-login successful (email confirmation disabled)
            showToast('✅ Pendaftaran berhasil! Selamat berbelanja 🛒', 'success');
        }
        
    } catch (error) {
        console.error('❌ Register error:', error);
        
        // Handle specific errors
        if (error.message.includes('User already registered')) {
            showToast('❌ Email sudah terdaftar. Silakan login.', 'error');
        } else {
            showToast(error.message || 'Gagal mendaftar', 'error');
        }
    }
}

// Sign Out
async function signOut() {
    try {
        console.log('👋 Signing out...');
        
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        // Clear cart
        removeLocalStorage(APP_CONFIG.storageKey.cart);
        
        // Close user menu
        const userMenu = document.getElementById('user-menu');
        const userDropdown = document.getElementById('user-dropdown');
        if (userDropdown) userDropdown.classList.add('hidden');
        
        console.log('✅ Signed out successfully');
        
        // Redirect to home if on protected page
        if (window.location.pathname.includes('profile') || 
            window.location.pathname.includes('orders') ||
            window.location.pathname.includes('admin')) {
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        }
        
    } catch (error) {
        console.error('❌ Sign out error:', error);
        showToast('Gagal logout', 'error');
    }
}

// Toggle User Menu
function toggleUserMenu() {
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown) {
        userDropdown.classList.toggle('hidden');
    }
}

// Close user menu when clicking outside
document.addEventListener('click', (event) => {
    const userDropdown = document.getElementById('user-dropdown');
    const userAvatar = document.getElementById('user-avatar');
    
    if (userDropdown && userAvatar) {
        if (!userDropdown.contains(event.target) && !userAvatar.contains(event.target)) {
            userDropdown.classList.add('hidden');
        }
    }
});

// ========================================
// CHECK AUTH REQUIRED
// ========================================

// Check if user is authenticated (for protected pages)
async function checkAuthRequired() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        showToast('Silakan login terlebih dahulu', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return false;
    }
    
    return true;
}

// Check if user is admin (for admin pages)
async function checkAdminAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        alert('Silakan login terlebih dahulu');
        window.location.href = 'index.html';
        return false;
    }
    
    if (session.user.email !== ADMIN_EMAIL) {
        alert('Akses ditolak. Hanya admin yang dapat mengakses halaman ini.');
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// Setup login button
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', showAuthModal);
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);
    }
    
    // Initialize auth on page load
    initAuth();
});

console.log('🔐 Auth Module Loaded');