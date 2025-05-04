<template>
  <div class="app-layout" :class="{'has-mobile-nav': isMobile}">
    <div v-if="showAppLoading" class="app-loading-overlay">
      <div class="app-loading-spinner"></div>
      <div class="app-loading-text">Sắp xong rồi, đợi tý nhé…</div>
    </div>
    <ClientOnly>
      <AppSidebar ref="sidebar" @open-quick-add="openQuickAddModal" />
    </ClientOnly>
    
    <div class="main-content">
      <!-- Only show header when authenticated -->
      <header v-if="isAuthenticated" class="app-header">
        <button class="menu-button" @click="toggleSidebar" aria-label="Toggle menu">
          <span class="menu-icon">≡</span>
        </button>
        <h1 class="app-title">Manager Money</h1>
        
        <!-- User info area -->
        <div class="user-area">
          <div class="user-menu" v-if="user">
            <div class="user-info" @click="toggleUserMenu">
              <Avatar 
                :email="user.email"
                :name="user.displayName"
                size="small"
                class="user-avatar"
              />
              <span class="user-name">{{ user.displayName || user.email }}</span>
              <i class="fas fa-chevron-down menu-arrow" :class="{ 'rotated': showUserMenu }"></i>
            </div>
            <div v-show="showUserMenu" class="menu-items">
              <NuxtLink :to="`/profile/${user.uid}`" class="menu-item" @click="showUserMenu = false">
                <i class="fas fa-user"></i>
                <span>Hồ sơ của tôi</span>
              </NuxtLink>
              <button @click="handleLogout" class="menu-item">
                <i class="fas fa-sign-out-alt"></i>
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main class="page-content">
        <slot />
      </main>
    </div>
    
    <!-- Quick Add Modal for Mobile -->
    <div v-if="showQuickAddModal" class="modal-overlay">
      <div class="modal quick-add-modal">
        <div class="modal-header">
          <h2>Thêm nhanh</h2>
          <button @click="showQuickAddModal = false" class="close-button">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="quick-action-grid">
            <NuxtLink to="/transactions?action=add-transaction" @click="showQuickAddModal = false" class="quick-action-button">
              <span class="quick-action-icon">💰</span>
              <span>Thêm giao dịch</span>
            </NuxtLink>
            
            <NuxtLink to="/debts?action=add-debt&tab=owed" @click="showQuickAddModal = false" class="quick-action-button">
              <span class="quick-action-icon">💸</span>
              <span>Thêm khoản nợ</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import AppSidebar from '~/components/AppSidebar.vue';
import Avatar from '~/components/Avatar.vue';
import { useAuth } from '~/composables/useAuth';
import { useRoute } from 'vue-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '~/plugins/firebase';

const route = useRoute();
const { user, isAuthenticated, logout, refreshUser } = useAuth();
const sidebar = ref(null);
const showQuickAddModal = ref(false);
const showUserMenu = ref(false);
const isMobile = ref(false);
const authUnsubscribe = ref(null);
const showAppLoading = ref(true);

// Setup direct auth state listener
const setupAuthListener = () => {
  if (process.client && auth) {
    // Clean up existing listener if any
    if (authUnsubscribe.value) {
      authUnsubscribe.value();
    }
    
    // Set up new listener
    authUnsubscribe.value = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed in layout:', firebaseUser?.email);
      console.log('Display name:', firebaseUser?.displayName);
      
      if (firebaseUser) {
        // Force refresh user data
        await refreshUser();
        console.log('User authenticated, app title should now be "Manager Money"');
      } else {
        console.log('User logged out, no app title should be displayed');
      }
    });
  }
};

// Handle logout
const handleLogout = async () => {
  try {
    showUserMenu.value = false;
    await logout();
    navigateTo('/login');
  } catch (error) {
    console.error('Logout error:', error);
  }
};

const toggleSidebar = () => {
  if (sidebar.value) {
    console.log('Toggling sidebar');
    sidebar.value.toggleSidebar();
  } else {
    console.error('Sidebar reference not found');
  }
};

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};

const openQuickAddModal = () => {
  showQuickAddModal.value = true;
};

// Click outside to close user menu
const handleClickOutside = (event) => {
  const userMenu = document.querySelector('.user-menu');
  if (userMenu && !userMenu.contains(event.target)) {
    showUserMenu.value = false;
  }
};

// Check if device is mobile
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

onMounted(() => {
  console.log('Default layout mounted');
  console.log('Initial auth state:', isAuthenticated.value ? 'Authenticated' : 'Not authenticated');
  console.log('Initial user display name:', user.value?.displayName);
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  document.addEventListener('click', handleClickOutside);
  
  // Set up direct auth state listener
  setupAuthListener();
  
  // Refresh user data on mount if authenticated
  if (isAuthenticated.value) {
    refreshUser().then(() => {
      console.log('User data refreshed on layout mount:', user.value?.displayName);
      console.log('App title should now be "Manager Money"');
    });
  } else {
    console.log('User not authenticated on layout mount, no app title should be displayed');
  }
  
  // Make sure the sidebar reference is available
  if (!sidebar.value) {
    console.warn('Sidebar reference not set on mount');
  }

  setTimeout(() => {
    showAppLoading.value = false;
  }, 1500);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  document.removeEventListener('click', handleClickOutside);
  
  // Clean up auth listener
  if (authUnsubscribe.value) {
    authUnsubscribe.value();
  }
});
</script>

<style>
/* Global styles */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #333;
  background-color: #f5f7fa;
}

* {
  box-sizing: border-box;
}

.app-loading-overlay {
  position: fixed;
  z-index: 99999;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(255,255,255,0.98);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s;
}
.app-loading-spinner {
  width: 48px;
  height: 48px;
  border: 5px solid #e0e0e0;
  border-top: 5px solid #4CAF50;
  border-radius: 50%;
  animation: app-spin 1s linear infinite;
  margin-bottom: 24px;
}
.app-loading-text {
  font-size: 18px;
  color: #388e3c;
  font-weight: 500;
  letter-spacing: 0.5px;
}
@keyframes app-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.app-header {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.menu-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  color: #666;
  margin-right: 1rem;
}

.menu-icon {
  display: block;
  line-height: 1;
}

.app-title {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
  flex: 1;
}

.user-area {
  position: relative;
}

.user-menu {
  position: relative;
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
  user-select: none;
}

.user-info:hover {
  background-color: #f5f5f5;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.user-name {
  font-size: 14px;
  color: #333;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-arrow {
  font-size: 12px;
  color: #666;
  transition: transform 0.2s;
}

.menu-arrow.rotated {
  transform: rotate(180deg);
}

.menu-items {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  padding: 8px 0;
  z-index: 1000;
  opacity: 0;
  transform: translateY(-10px);
  animation: slideDown 0.2s ease forwards;
}

@keyframes slideDown {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  color: #333;
  text-decoration: none;
  transition: all 0.2s;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
}

.menu-item:hover {
  background-color: #f5f5f5;
  padding-left: 20px;
}

.menu-item i {
  width: 16px;
  color: #666;
}

.page-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

/* Mobile styles */
@media (max-width: 768px) {
  .app-header {
    padding: 0.5rem;
  }

  .user-name {
    display: none;
  }

  .menu-items {
    right: -8px;
  }
}

/* Quick Add Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.quick-add-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-body {
  padding: 16px;
}

.quick-action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.quick-action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  text-decoration: none;
  color: #333;
  transition: all 0.2s;
}

.quick-action-button:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
}

.quick-action-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.has-mobile-nav {
  padding-bottom: 60px;
}
</style> 