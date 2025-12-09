// =============================================
// SWEETIFY - PROFILE MODULE (MODERN)
// =============================================

let userProfile = null;
let isEditMode = false;

// Initialize profile page
async function initProfile() {
    const user = await checkAuth();
    if (!user) {
        showToast('Silakan login terlebih dahulu', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }
    
    displayUserInfo(user);
    await loadUserProfile(user);
    setupProfileListeners();
}

// Display user basic info
function displayUserInfo(user) {
    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    const email = user.email;
    const initials = getInitials(name);
    
    // Avatar large
    const avatarLarge = document.getElementById('profile-avatar-large');
    avatarLarge.innerHTML = `<span style="font-size: 48px; font-weight: bold;">${initials}</span>`;
    
    // Header info
    document.getElementById('profile-name-display').textContent = name;
    document.getElementById('profile-email-display').textContent = email;
}

// Load user profile from database
async function loadUserProfile(user) {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // Profile doesn't exist, create one
            await createUserProfile(user);
            await loadUserProfile(user); // Reload
            return;
        }
        
        if (error) throw error;
        
        userProfile = data;
        displayProfileInfo(user, data);
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        showToast('Gagal memuat profil', 'error');
    }
}

// Create user profile
async function createUserProfile(user) {
    try {
        const { error } = await supabase
            .from('user_profiles')
            .insert({
                id: user.id,
                full_name: user.user_metadata?.full_name || user.email.split('@')[0],
                phone: '',
                address: ''
            });
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Error creating user profile:', error);
    }
}

// Display profile info
function displayProfileInfo(user, profile) {
    // Display mode
    document.getElementById('display-name').textContent = profile.full_name || '-';
    document.getElementById('display-email').textContent = user.email;
    document.getElementById('display-phone').textContent = profile.phone || 'Belum diisi';
    document.getElementById('display-address').textContent = profile.address || 'Belum diisi';
    
    // Edit mode (pre-fill)
    document.getElementById('edit-name').value = profile.full_name || '';
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-phone').value = profile.phone || '';
    document.getElementById('edit-address').value = profile.address || '';
}

// Toggle edit mode
function toggleEditMode() {
    isEditMode = !isEditMode;
    
    const infoView = document.getElementById('profile-info-view');
    const formView = document.getElementById('profile-form');
    const btnToggle = document.getElementById('btn-edit-toggle');
    
    if (isEditMode) {
        infoView.classList.add('hidden');
        formView.classList.remove('hidden');
        btnToggle.innerHTML = '<i class="fas fa-times"></i> Batal';
        btnToggle.style.backgroundColor = '#6c757d';
    } else {
        infoView.classList.remove('hidden');
        formView.classList.add('hidden');
        btnToggle.innerHTML = '<i class="fas fa-edit"></i> Edit';
        btnToggle.style.backgroundColor = '';
    }
}

// Cancel edit
function cancelEdit() {
    toggleEditMode();
}

// Update user profile
async function updateUserProfile(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('edit-name').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const address = document.getElementById('edit-address').value.trim();
    
    if (!fullName) {
        showToast('Nama lengkap harus diisi', 'error');
        return;
    }
    
    if (!phone) {
        showToast('Nomor telepon harus diisi', 'error');
        return;
    }
    
    if (!address) {
        showToast('Alamat harus diisi', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    
    try {
        const user = await checkAuth();
        
        // Update database
        const { error } = await supabase
            .from('user_profiles')
            .update({
                full_name: fullName,
                phone: phone,
                address: address
            })
            .eq('id', user.id);
        
        if (error) throw error;
        
        // Update display
        displayProfileInfo(user, {
            full_name: fullName,
            phone: phone,
            address: address
        });
        
        // Update header
        document.getElementById('profile-name-display').textContent = fullName;
        const initials = getInitials(fullName);
        const avatarLarge = document.getElementById('profile-avatar-large');
        avatarLarge.innerHTML = `<span style="font-size: 48px; font-weight: bold;">${initials}</span>`;
        
        showToast('Profil berhasil diperbarui', 'success');
        toggleEditMode();
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Gagal memperbarui profil: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan';
    }
}

// Contact admin via WhatsApp
function contactAdmin(e) {
    e.preventDefault();
    const message = 'Halo Admin Sweetify, saya ingin bertanya tentang produk.';
    const whatsappUrl = `https://wa.me/${APP_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Show about modal
function showAbout(e) {
    e.preventDefault();
    const modal = document.getElementById('about-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Close about modal
function closeAboutModal() {
    const modal = document.getElementById('about-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Logout
async function logout() {
    if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
        try {
            await signOut();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Gagal logout', 'error');
        }
    }
}

// Setup event listeners
function setupProfileListeners() {
    // Profile form submit
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', updateUserProfile);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // About modal
    const aboutModal = document.getElementById('about-modal');
    if (aboutModal) {
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) {
                closeAboutModal();
            }
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initProfile);

console.log('Profile Module Loaded');