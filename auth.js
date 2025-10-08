// auth.js - Authentication & Authorization Helper

// Ambil role pengguna dari localStorage
const userRole = localStorage.getItem('userRole');

// Fungsi untuk memeriksa apakah pengguna adalah admin
function isAdmin() {
    return userRole === 'admin';
}

// Fungsi untuk melindungi halaman. Panggil di setiap halaman yang butuh login.
function protectPage() {
    // Jika tidak ada role (belum login) dan kita tidak sedang di halaman login,
    // paksa kembali ke halaman login.
    if (!userRole && !window.location.pathname.endsWith('login.html')) {
        window.location.href = 'login.html';
    }
}

// Fungsi untuk logout
function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// Jalankan proteksi secara otomatis saat script ini dimuat
protectPage();