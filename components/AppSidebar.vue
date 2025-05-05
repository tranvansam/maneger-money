<template>
  <div v-if="isAuthenticated">
    <div class="sidebar" :class="{ 'sidebar-open': isOpen }">
      <div class="sidebar-header">
        <div class="app-title">
          <h1 class="app-logo">Manager Money</h1>
        </div>
        <button class="close-button" @click="toggleSidebar" v-if="isOpen">×</button>
      </div>
      
      <!-- User information section -->
      <div class="user-info">
        <div class="user-avatar">
          <span class="avatar-placeholder">{{ userInitials }}</span>
        </div>
        <div class="user-details">
          <div class="user-name">{{ user?.displayName || 'Người dùng' }}</div>
          <div class="user-email">{{ user?.email }}</div>
        </div>
      </div>
      
      <div class="sidebar-content">
        <nav class="sidebar-menu">
          <div class="menu-item" :class="{ 'active': isCurrentRoute('/dashboard') }" @click="navigateTo('/dashboard')">
            <span class="menu-icon">📊</span>
            <span class="menu-text">Tổng quan</span>
          </div>
          
          <div class="menu-item" :class="{ 'active': isCurrentRoute('/transactions') }" @click="navigateTo('/transactions')">
            <span class="menu-icon">💰</span>
            <span class="menu-text">Giao dịch</span>
          </div>
          
          <div class="menu-item" :class="{ 'active': isCurrentRoute('/events') }" @click="navigateTo('/events')">
            <span class="menu-icon">📅</span>
            <span class="menu-text">Sự kiện</span>
          </div>
          
          <div class="menu-item" :class="{ 'active': isCurrentRoute('/debts') }" @click="navigateTo('/debts')">
            <span class="menu-icon">💸</span>
            <span class="menu-text">Quản lý nợ</span>
          </div>
          
          <div class="menu-item" :class="{ 'active': isCurrentRoute('/friends') }" @click="navigateTo('/friends')">
            <span class="menu-icon">👥</span>
            <span class="menu-text">Bạn bè</span>
          </div>
          
          <!-- PC Only Menu Items -->
          <div class="pc-only-menu">
            <div class="menu-item" :class="{ 'active': isCurrentRoute('/reports') }" @click="navigateTo('/reports')">
              <span class="menu-icon">📈</span>
              <span class="menu-text">Báo cáo thống kê</span>
            </div>
            
            <div class="menu-item" :class="{ 'active': isCurrentRoute('/settings') }" @click="navigateTo('/settings')">
              <span class="menu-icon">⚙️</span>
              <span class="menu-text">Cài đặt</span>
            </div>
          </div>
          
          <!-- Mobile Only Menu Items -->
          <div class="mobile-only-menu">
            <div class="menu-item" :class="{ 'active': isCurrentRoute('/quick-add') }" @click="navigateTo('/quick-add')">
              <span class="menu-icon">➕</span>
              <span class="menu-text">Thêm nhanh</span>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="menu-item" @click="handleLogout">
            <span class="menu-icon">🚪</span>
            <span class="menu-text">Đăng xuất</span>
          </div>
        </nav>
      </div>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <div class="mobile-nav-bar">
      <div class="mobile-nav-item" :class="{ 'active': isCurrentRoute('/dashboard') }" @click="navigateTo('/dashboard')">
        <span class="mobile-nav-icon">📊</span>
        <span class="mobile-nav-text">Tổng quan</span>
      </div>
      
      <div class="mobile-nav-item" :class="{ 'active': isCurrentRoute('/transactions') }" @click="navigateTo('/transactions')">
        <span class="mobile-nav-icon">💰</span>
        <span class="mobile-nav-text">Giao dịch</span>
      </div>
      
      <div class="mobile-nav-item" :class="{ 'active': isCurrentRoute('/events') }" @click="navigateTo('/events')">
        <span class="mobile-nav-icon">📅</span>
        <span class="mobile-nav-text">Sự kiện</span>
      </div>
      
      <div class="mobile-nav-item" :class="{ 'active': isCurrentRoute('/debts') }" @click="navigateTo('/debts')">
        <span class="mobile-nav-icon">💸</span>
        <span class="mobile-nav-text">Nợ</span>
      </div>
      
      <div class="mobile-nav-item" :class="{ 'active': isCurrentRoute('/friends') }" @click="navigateTo('/friends')">
        <span class="mobile-nav-icon">👥</span>
        <span class="mobile-nav-text">Bạn bè</span>
      </div>
      
      <button class="mobile-nav-item quick-add-btn" @click="openQuickAdd">
        <span class="mobile-nav-icon add-icon">+</span>
        <span class="mobile-nav-text">Thêm</span>
      </button>
      
      <!-- <button class="mobile-nav-item menu-btn" @click="toggleSidebar">
        <span class="mobile-nav-icon">☰</span>
        <span class="mobile-nav-text">Menu</span>
      </button> -->
    </div>
    
    <!-- Move backdrop outside sidebar but still within parent component -->
    <div class="sidebar-backdrop" v-if="isOpen" @click="closeSidebar"></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const { logout, isAuthenticated, user } = useAuth();
const isOpen = ref(false);
const emit = defineEmits(['open-quick-add']);

// Check if current route matches the given path
const isCurrentRoute = (path) => {
  if (path === '/dashboard') {
    // Exact match for dashboard
    return route.path === path;
  }
  // For other routes, check if current path starts with the menu path
  // This helps with nested routes like /transactions/edit/123
  return route.path.startsWith(path);
};

// Toggle sidebar visibility
const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    document.body.style.overflow = 'hidden'; // Prevent scrolling when sidebar is open
  } else {
    document.body.style.overflow = ''; // Restore scrolling
  }
};

// Close sidebar
const closeSidebar = () => {
  isOpen.value = false;
  document.body.style.overflow = '';
};

// Navigation with sidebar closing
const navigateTo = (path) => {
  closeSidebar();
  router.push(path);
};

// Open quick add modal
const openQuickAdd = () => {
  closeSidebar();
  // Emit event for parent components to handle
  emit('open-quick-add');
};

// Handle logout
const handleLogout = async () => {
  await logout();
  closeSidebar();
  router.push('/login');
};

// Provide methods to parent components
defineExpose({
  toggleSidebar,
  closeSidebar,
  openQuickAdd
});

// Calculate user initials for avatar
const userInitials = computed(() => {
  if (user.value && user.value.displayName) {
    const nameParts = user.value.displayName.split(' ');
    if (nameParts.length > 0) {
      return nameParts.map(part => part.charAt(0).toUpperCase()).join('').substring(0, 2);
    }
    return user.value.email?.charAt(0).toUpperCase() || '?';
  }
  return user.value?.email?.charAt(0).toUpperCase() || '?';
});
</script>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 250px;
  height: 100vh;
  background-color: #fff;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 2000;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
}

.sidebar-open {
  transform: translateX(0);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.app-title {
  flex: 1;
}

.app-logo {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #4CAF50;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #757575;
  padding: 0;
  margin: 0;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #333;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
  border-left: 4px solid transparent;
  position: relative;
  -webkit-tap-highlight-color: rgba(0,0,0,0);
}

.menu-item::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.menu-item:hover {
  background-color: #f5f5f5;
  transform: translateX(2px);
}

.menu-item:active {
  background-color: #e8f5e9;
  color: #4CAF50;
}

.menu-item.active {
  background-color: #e8f5e9;
  color: #4CAF50;
  border-left: 4px solid #4CAF50;
  padding-left: 16px;
  font-weight: 500;
}

.menu-icon {
  font-size: 18px;
  margin-right: 12px;
  width: 24px;
  text-align: center;
}

.divider {
  height: 1px;
  background-color: #eee;
  margin: 10px 20px;
}

.sidebar-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1999;
  pointer-events: auto;
  opacity: 1;
  transition: opacity 0.3s ease;
}

/* Mobile Bottom Navigation Bar */
.mobile-nav-bar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: white;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1500;
  justify-content: space-around;
  align-items: center;
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  color: #555;
  text-decoration: none;
  font-size: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
  min-width: 60px;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.mobile-nav-item:active {
  background-color: rgba(0, 0, 0, 0.05);
}

.mobile-nav-item.active {
  color: #4CAF50;
  font-weight: 500;
}

.mobile-nav-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 25%;
  right: 25%;
  height: 3px;
  background-color: #4CAF50;
  border-radius: 3px 3px 0 0;
}

.mobile-nav-item::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: 1;
}

.mobile-nav-icon {
  font-size: 20px;
  margin-bottom: 2px;
}

.mobile-nav-text {
  font-size: 10px;
}

.mobile-nav-item.router-link-exact-active {
  color: #4CAF50;
}

.add-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #4CAF50;
  color: white;
  border-radius: 50%;
  font-size: 24px;
  margin-bottom: 2px;
}

/* PC/Mobile responsive toggles */
.pc-only-menu {
  display: block;
}

.mobile-only-menu {
  display: none;
}

@media (max-width: 768px) {
  .sidebar {
    width: 80%;
    max-width: 300px;
  }
  
  .mobile-nav-bar {
    display: flex;
  }
  
  .pc-only-menu {
    display: none;
  }
  
  .mobile-only-menu {
    display: block;
  }
  
  /* Add padding to main content to account for mobile nav bar */
  .sidebar-content {
    padding-bottom: 70px;
  }
}

/* Add these styles */
.mobile-nav-item, .menu-item, .close-button {
  cursor: pointer;
}

.mobile-nav-item:hover, .menu-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* User info styles */
.user-info {
  padding: 20px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #eee;
  background-color: #f5f7fa;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #4CAF50;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.avatar-placeholder {
  font-size: 18px;
  font-weight: 600;
}

.user-details {
  overflow: hidden;
}

.user-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style> 