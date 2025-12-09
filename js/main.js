// =============================================
// SWEETIFY - MAIN APPLICATION SCRIPT
// =============================================

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Sweetify App Initializing...');
    
    // Setup notification button
    setupNotificationBtn();
    
    // Wait for all modules to load
    setTimeout(() => {
        console.log('Sweetify App Ready!');
    }, 1000);
});

// Setup notification button (placeholder)
function setupNotificationBtn() {
    const notifBtn = document.getElementById('notif-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            showToast('Tidak ada notifikasi baru', 'success');
        });
    }
}

console.log('Main Script Loaded');