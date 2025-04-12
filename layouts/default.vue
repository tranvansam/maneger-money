<template>
  <div class="app-layout" :class="{'has-mobile-nav': isMobile}">
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
          <div class="user-menu" @click="toggleUserMenu">
            <span class="user-name">{{ user?.displayName || user?.email }}</span>
            <span class="user-icon">👤</span>
            
            <div class="user-dropdown" v-if="showUserMenu">
              <div class="dropdown-item">
                <span class="item-icon">✉️</span>
                <span>{{ user?.email }}</span>
              </div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item" @click="handleLogout">
                <span class="item-icon">🚪</span>
                <span>Đăng xuất</span>
              </div>
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
            <NuxtLink to="/dashboard?action=add-transaction" @click="showQuickAddModal = false" class="quick-action-button">
              <span class="quick-action-icon">💰</span>
              <span>Thêm giao dịch</span>
            </NuxtLink>
            
            <NuxtLink to="/debts?action=add-debt" @click="showQuickAddModal = false" class="quick-action-button">
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
    await logout();
    showUserMenu.value = false;
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
  if (userMenu && !userMenu.contains(event.target) && showUserMenu.value) {
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
  width: 100%;
}

.app-header {
  background-color: white;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 10;
}

.menu-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  margin-right: 15px;
  color: #555;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.menu-button:hover {
  background-color: #f0f0f0;
  transform: scale(1.05);
}

.menu-button:active {
  background-color: #e8e8e8;
  transform: scale(0.95);
}

.app-title {
  font-size: 18px;
  margin: 0;
  color: #4CAF50;
  font-weight: 600;
  flex: 1;
}

/* User area styles */
.user-area {
  margin-left: auto;
  position: relative;
}

.user-menu {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 40px;
  background-color: #f0f7f0;
  transition: background-color 0.2s;
  position: relative;
}

.user-menu:hover {
  background-color: #e8f5e9;
}

.user-name {
  margin-right: 8px;
  font-weight: 500;
  color: #2E7D32;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-icon {
  font-size: 18px;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 220px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 100;
  padding: 8px 0;
  overflow: hidden;
}

.dropdown-item {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  color: #333;
  transition: background-color 0.2s;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.item-icon {
  margin-right: 12px;
  font-size: 16px;
}

.dropdown-divider {
  height: 1px;
  background-color: #eaeaea;
  margin: 8px 0;
}

.page-content {
  flex: 1;
  padding: 0;
  background-color: #f5f7fa;
}

/* Mobile navigation adjustments */
.app-layout.has-mobile-nav .page-content {
  padding-bottom: 70px; /* Space for mobile navigation bar */
}

/* Quick Add Modal */
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
  z-index: 2100;
}

.modal {
  background-color: white;
  border-radius: 12px;
  width: 90%;
  max-width: 320px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
  background-color: #f9f9f9;
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
  cursor: pointer;
  color: #757575;
}

.modal-body {
  padding: 16px;
}

.quick-action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.quick-action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: background-color 0.2s, transform 0.2s;
  text-align: center;
}

.quick-action-button:hover {
  background-color: #e8f5e9;
  transform: translateY(-2px);
}

.quick-action-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

@media (max-width: 768px) {
  .app-header {
    padding: 10px 15px;
  }
  
  .quick-action-grid {
    grid-template-columns: 1fr;
  }
  
  .modal {
    max-height: 90vh;
    overflow-y: auto;
  }
}
</style> 