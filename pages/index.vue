<template>
  <div>
    <header class="header">
      <div class="container">
        <div class="logo">
          <h1>Quản lý Chi tiêu</h1>
        </div>
        <nav class="navigation">
          <template v-if="isAuthenticated">
            <NuxtLink to="/dashboard" class="nav-link">Trang quản lý</NuxtLink>
            <button @click="handleLogout" class="nav-button">
              Đăng xuất
            </button>
          </template>
          <template v-else>
            <NuxtLink to="/login" class="nav-link">Đăng nhập</NuxtLink>
            <NuxtLink to="/register" class="nav-link">Đăng ký</NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="hero">
      <div class="container">
        <div class="hero-content">
          <h2>Kiểm soát chi tiêu của bạn</h2>
          <p>Ứng dụng giúp bạn theo dõi, quản lý và tối ưu hóa chi tiêu cá nhân một cách dễ dàng.</p>
          
          <div class="cta-buttons">
            <NuxtLink 
              :to="isAuthenticated ? '/dashboard' : '/register'" 
              class="cta-button primary"
            >
              {{ isAuthenticated ? 'Đi đến Trang quản lý' : 'Bắt đầu ngay' }}
            </NuxtLink>
            
            <NuxtLink 
              v-if="!isAuthenticated" 
              to="/login" 
              class="cta-button secondary"
            >
              Đăng nhập
            </NuxtLink>
          </div>
        </div>
      </div>
    </main>

    <section class="features">
      <div class="container">
        <h2>Tính năng chính</h2>
        
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h3>Theo dõi chi tiêu</h3>
            <p>Ghi lại và phân loại các khoản chi tiêu của bạn một cách dễ dàng.</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">📅</div>
            <h3>Báo cáo hàng tháng</h3>
            <p>Xem báo cáo chi tiết về chi tiêu của bạn mỗi tháng.</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">🎯</div>
            <h3>Mục tiêu tài chính</h3>
            <p>Đặt mục tiêu tiết kiệm và theo dõi tiến trình của bạn.</p>
          </div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="container">
        <p>&copy; {{ new Date().getFullYear() }} Quản lý Chi tiêu. Bảo lưu mọi quyền.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
const { isAuthenticated, logout } = useAuth();

const handleLogout = async () => {
  try {
    await logout();
    // Will stay on home page after logout
  } catch (err) {
    console.error('Logout failed:', err);
  }
};
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.header {
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 16px 0;
}

.header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo h1 {
  margin: 0;
  font-size: 24px;
  color: #4CAF50;
}

.navigation {
  display: flex;
  gap: 16px;
  align-items: center;
}

.nav-link {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  padding: 8px 12px;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #4CAF50;
}

.nav-button {
  background-color: transparent;
  color: #f44336;
  border: 1px solid #f44336;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-button:hover {
  background-color: #f44336;
  color: white;
}

.hero {
  padding: 80px 0;
  background-color: #f5f5f5;
  text-align: center;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero h2 {
  font-size: 36px;
  margin-bottom: 16px;
  color: #333;
}

.hero p {
  font-size: 18px;
  margin-bottom: 32px;
  color: #666;
}

.cta-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.cta-button {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s;
}

.cta-button.primary {
  background-color: #4CAF50;
  color: white;
}

.cta-button.primary:hover {
  background-color: #388E3C;
}

.cta-button.secondary {
  background-color: white;
  color: #4CAF50;
  border: 1px solid #4CAF50;
}

.cta-button.secondary:hover {
  background-color: #f1f8e9;
}

.features {
  padding: 80px 0;
  background-color: white;
  text-align: center;
}

.features h2 {
  margin-bottom: 48px;
  font-size: 32px;
  color: #333;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
}

.feature-card {
  padding: 24px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.feature-card h3 {
  margin-bottom: 12px;
  font-size: 20px;
  color: #333;
}

.feature-card p {
  color: #666;
}

.footer {
  background-color: #333;
  color: white;
  padding: 24px 0;
  text-align: center;
}
</style> 