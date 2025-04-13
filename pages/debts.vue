<template>
  <div class="debts-page">    
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Đang tải dữ liệu...</div>
    </div>
    
    <div class="page-header">
      <h1 class="page-title">Quản lý khoản nợ</h1>
      <div class="tab-navigation">
        <button 
          @click="activeTab = 'owed'" 
          class="tab-button" 
          :class="{ active: activeTab === 'owed' }"
        >
          <span class="tab-icon">💸</span>
          Tôi nợ người khác
        </button>
        <button 
          @click="activeTab = 'lent'" 
          class="tab-button" 
          :class="{ active: activeTab === 'lent' }"
        >
          <span class="tab-icon">💰</span>
          Người khác nợ tôi
        </button>
      </div>
    </div>
    
    <!-- Tab Nợ -->
    <div v-if="activeTab === 'owed'" class="tab-content">
      <DebtList 
        ref="owedDebtList" 
        :filter-type="'owed'" 
        @debt-toggled="handleDebtToggled" 
        @debt-added="handleDebtAdded" 
      />
      <div class="description-box">
        <div class="description-title">
          <i class="info-icon">ℹ️</i> Thông tin về khoản nợ
        </div>
        <p>Khi bạn đánh dấu đã <strong>thanh toán</strong> một khoản nợ, hệ thống sẽ tự động thêm một giao dịch <strong>chi tiêu</strong> vào quản lý giao dịch của bạn.</p>
      </div>
    </div>
    
    <!-- Tab Cho mượn -->
    <div v-if="activeTab === 'lent'" class="tab-content">
      <DebtList 
        ref="lentDebtList" 
        :filter-type="'lent'" 
        @debt-toggled="handleDebtToggled" 
        @debt-added="handleDebtAdded" 
      />
      <div class="description-box">
        <div class="description-title">
          <i class="info-icon">ℹ️</i> Thông tin về khoản cho mượn
        </div>
        <p>Khi bạn thêm mới một khoản <strong>cho mượn</strong>, hệ thống sẽ tự động thêm một giao dịch <strong>chi tiêu</strong> vào quản lý giao dịch của bạn.</p>
        <p>Khi bạn đánh dấu đã <strong>thu hồi</strong> khoản cho mượn, hệ thống sẽ tự động thêm một giao dịch <strong>thu nhập</strong> vào quản lý giao dịch của bạn.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '~/composables/useAuth';
import DebtList from '~/components/DebtList.vue';

definePageMeta({
  middleware: 'auth'
});

const router = useRouter();
const { user } = useAuth();
const loading = ref(true);
const error = ref(null);
let loadingTimer = null;

// Tab active
const activeTab = ref('owed'); // 'owed' hoặc 'lent'
const owedDebtList = ref(null);
const lentDebtList = ref(null);

// Hàm thử lại khi có lỗi
const tryAgain = () => {
  error.value = null;
  loading.value = true;
  initPage();
};

// Hàm khởi tạo trang
const initPage = () => {
  // Xóa timer trước đó nếu có
  if (loadingTimer) {
    clearTimeout(loadingTimer);
  }
  
  // Đảm bảo loading không kéo dài quá 1 giây
  loadingTimer = setTimeout(() => {
    loading.value = false;
  }, 500);
  
  // Thêm backup timer để đảm bảo luôn tắt loading sau 5 giây
  const backupTimer = setTimeout(() => {
    if (loading.value) {
      console.warn("Loading timeout occurred, forcing loading state to false");
      loading.value = false;
    }
  }, 5000);
};

// Xử lý khi toggle trạng thái khoản nợ
const handleDebtToggled = (debt, isPaid) => {
  console.log(`Khoản ${debt.debtType === 'lent' ? 'cho mượn' : 'nợ'} ${debt.id} đã được đánh dấu ${isPaid ? 'đã' : 'chưa'} thanh toán`);
};

// Xử lý khi thêm khoản nợ mới
const handleDebtAdded = (debt) => {
  console.log(`Đã thêm khoản ${debt.debtType === 'lent' ? 'cho mượn' : 'nợ'} mới: ${debt.description}`);
};

// Cập nhật lại danh sách khi chuyển tab
watch(activeTab, (newTab) => {
  console.log(`Chuyển tab sang: ${newTab}`);
});

onMounted(() => {
  console.log("Debts page mounted");
  
  // Kiểm tra user đã đăng nhập
  if (!user.value || !user.value.uid) {
    console.log("User not authenticated on debts page");
    error.value = "Vui lòng đăng nhập để sử dụng tính năng này";
    loading.value = false;
    return;
  }
  
  // Khởi tạo trang
  initPage();
});

// Dọn dẹp khi unmount
onUnmounted(() => {
  console.log("Debts page unmounted");
  if (loadingTimer) {
    clearTimeout(loadingTimer);
  }
});
</script>

<style scoped>
.debts-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.page-title {
  font-size: 24px;
  margin-bottom: 20px;
  color: #333;
  border-left: 4px solid #4CAF50;
  padding-left: 10px;
}

.tab-navigation {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eaeaea;
  padding-bottom: 10px;
}

.tab-button {
  padding: 10px 20px;
  border: none;
  background-color: #f5f5f5;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  color: #555;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-button:hover {
  background-color: #eeeeee;
}

.tab-button.active {
  background-color: #4CAF50;
  color: white;
}

.tab-icon {
  font-size: 18px;
}

.tab-content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  margin-bottom: 20px;
  animation: fadeIn 0.3s ease;
}

.description-box {
  margin-top: 30px;
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  border-left: 4px solid #2196F3;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.description-title {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: #333;
}

.description-box p {
  margin: 10px 0;
  line-height: 1.5;
  color: #555;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(3px);
  transition: all 0.3s ease;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 6px solid #f3f3f3;
  border-top: 6px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.loading-text {
  font-size: 20px;
  color: #333;
  font-weight: 500;
  text-align: center;
  padding: 10px 20px;
  border-radius: 8px;
  background-color: rgba(255,255,255,0.8);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.error-content {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  text-align: center;
  max-width: 90%;
  width: 500px;
}

.error-content h3 {
  color: #f44336;
  margin-top: 0;
  font-size: 24px;
}

.error-content p {
  margin: 20px 0;
  color: #555;
  line-height: 1.5;
}

.retry-button {
  padding: 10px 24px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #45a049;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 768px) {
  .debts-page {
    padding: 15px;
  }
  
  .tab-navigation {
    flex-direction: column;
    gap: 10px;
  }
  
  .page-title {
    font-size: 20px;
  }
}
</style> 