<template>
  <div class="transactions-section">
          <div class="section-header">
        <h1 class="page-title">Quản lý chi tiêu cá nhân</h1>
      <div class="header-actions">
        <button @click="toggleViewMode" class="view-mode-button"
          :title="viewMode === 'list' ? 'Chế độ cây' : 'Chế độ danh sách'">
          <svg v-if="viewMode === 'list'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
        <button @click="$emit('add-transaction')" class="add-button-mobile">
          <span>+</span>
        </button>
      </div>
    </div>

         <!-- Mobile Quick Filters -->
     <div class="mobile-quick-filters">
       <div class="quick-filter-chips">
         <button @click="setQuickFilter('today')" class="filter-chip" :class="{ active: quickFilter === 'today' }">
           Hôm nay
         </button>
         <button @click="setQuickFilter('week')" class="filter-chip" :class="{ active: quickFilter === 'week' }">
           Tuần này
         </button>
         <button @click="setQuickFilter('month')" class="filter-chip" :class="{ active: quickFilter === 'month' }">
           Tháng này
         </button>
         <button @click="toggleCustomDateFilter" class="filter-chip" :class="{ active: quickFilter === 'custom' }">
           Tùy chọn
         </button>
       </div>
       
       <!-- Custom Date Filter Panel -->
       <div v-if="showCustomDateFilter" class="custom-date-panel">
         <div class="custom-date-inputs">
           <div class="date-input-group">
             <label>Từ ngày:</label>
             <input type="date" v-model="startDate" @change="setCustomFilter" />
           </div>
           <div class="date-input-group">
             <label>Đến ngày:</label>
             <input type="date" v-model="endDate" @change="setCustomFilter" />
           </div>
         </div>
         <div class="custom-date-actions">
           <button @click="applyCustomFilter" class="apply-button">Áp dụng</button>
           <button @click="closeCustomDateFilter" class="cancel-button">Hủy</button>
         </div>
       </div>
     </div>

    <!-- Desktop Filters -->
    <div class="filters-and-actions desktop-only">
      <div class="filter-controls">
        <div class="filter-row">
          <div class="filter-group date-range">
            <span class="date-label">Từ:</span>

            <div class="date-inputs">
              <input type="date" v-model="startDate" @change="fetchTransactions" />
              <span class="date-connector">~</span>
              <input type="date" v-model="endDate" @change="fetchTransactions" />
            </div>

            <div class="date-buttons">
              <button @click="resetToToday" class="reset-button">
                <span>⟳</span> Hôm nay
              </button>

              <button @click="resetToCurrentMonth" class="reset-button">
                <span>⟳</span> Tháng này
              </button>
            </div>
          </div>

          <div class="filter-group type-filter">
            <label>
              <input type="radio" v-model="transactionType" value="all" @change="fetchTransactions" />
              <span class="radio-label">Tất cả</span>
            </label>
            <label>
              <input type="radio" v-model="transactionType" value="income" @change="fetchTransactions" />
              <span class="radio-label">Thu nhập</span>
            </label>
            <label>
              <input type="radio" v-model="transactionType" value="expense" @change="fetchTransactions" />
              <span class="radio-label">Chi tiêu</span>
            </label>
          </div>
        </div>
      </div>

              <button @click="$emit('add-transaction')" class="add-button">
          <span>+</span> Thêm chi tiêu
        </button>
    </div>

    <!-- Mobile Type Filter -->
    <div class="mobile-type-filter">
      <div class="type-tabs">
        <button @click="transactionType = 'all'" class="type-tab" :class="{ active: transactionType === 'all' }">
          Tất cả
        </button>
        <button @click="transactionType = 'income'" class="type-tab income"
          :class="{ active: transactionType === 'income' }">
          Thu nhập
        </button>
        <button @click="transactionType = 'expense'" class="type-tab expense"
          :class="{ active: transactionType === 'expense' }">
          Chi tiêu
        </button>
      </div>
    </div>

    <div class="transactions-summary">
      <div class="summary-card income-card">
        <div class="summary-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
          </svg>
        </div>
        <div class="summary-content">
          <div class="summary-label">Tổng thu</div>
          <div class="summary-amount income">{{ formatCurrency(totalIncome) }}</div>
        </div>
      </div>
      
      <div class="summary-card expense-card">
        <div class="summary-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <div class="summary-content">
          <div class="summary-label">Tổng chi</div>
          <div class="summary-amount expense">{{ formatCurrency(totalExpense) }}</div>
        </div>
      </div>
      
      <div class="summary-card balance-card" :class="{ 'positive': balance >= 0, 'negative': balance < 0 }">
        <div class="summary-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <div class="summary-content">
          <div class="summary-label">Số dư</div>
          <div class="summary-amount" :class="{ 'positive': balance >= 0, 'negative': balance < 0 }">
            {{ formatCurrency(balance) }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Đang tải dữ liệu...</p>
    </div>

    <div v-else-if="transactions.length === 0" class="empty-state">
      <div class="empty-icon">📊</div>
      <p>Không có chi tiêu nào trong khoảng thời gian này</p>
      <p class="date-range-info">Khoảng thời gian: {{ startDate }} đến {{ endDate }}</p>
      <button @click="fetchTransactions" class="retry-button">
        <span>⟳</span> Tải lại dữ liệu
      </button>
    </div>

    <div v-else class="transactions-list" :class="viewMode">
      <!-- Tree View Mode -->
      <div v-if="viewMode === 'tree'" class="tree-view">
        <div v-for="(group, date) in groupedTransactions" :key="date" class="date-group">
          <div class="date-header">
            <div class="date-info">
              <div class="date-label">{{ formatDateLabel(date) }}</div>
            </div>
            <div class="day-balance"
              :class="{ 'positive': getDayBalance(group) >= 0, 'negative': getDayBalance(group) < 0 }">
              {{ formatCurrency(getDayBalance(group)) }}
            </div>
          </div>

          <div class="transactions-in-group">
            <div v-for="transaction in group" :key="transaction.id" class="transaction-item tree-item"
              @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd"
              :data-id="transaction.id">
              <div class="transaction-content">
                <div class="transaction-icon" :class="transaction.type">
                  <svg v-if="transaction.type === 'income'" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z">
                    </path>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </div>

                <div class="transaction-info">
                  <div class="transaction-description">{{ transaction.description || 'Không có mô tả' }}</div>
                  <div class="transaction-category">{{ getCategoryName(transaction.category) }}</div>
                </div>

              </div>

              <div class="transaction-actions">
                <!-- Swipe Actions -->
                <div class="swipe-actions">
                  <button class="swipe-action edit" @click.stop="editTransaction(transaction)" title="Chỉnh sửa">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button class="swipe-action delete" @click.stop="deleteTransaction(transaction)" title="Xóa">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2">
                      </path>
                    </svg>
                  </button>
                </div>
                <div class="transaction-amount"
                  :class="{ 'income': transaction.type === 'income', 'expense': transaction.type === 'expense' }">
                  {{ transaction.type === 'income' ? '+' : '-' }} {{ formatCurrency(transaction.amount) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- List View Mode -->
      <div v-else class="list-view">
        <div v-for="transaction in transactions" :key="transaction.id" class="transaction-item list-item"
          @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd"
          :data-id="transaction.id">
          <div class="transaction-content">
            <div class="transaction-icon" :class="transaction.type">
              <svg v-if="transaction.type === 'income'" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z">
                </path>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>

            <div class="transaction-info">
              <div class="transaction-date">{{ formatDate(transaction.date) }}</div>
              <div class="transaction-description">{{ transaction.description || 'Không có mô tả' }}</div>
              <div class="transaction-category">{{ getCategoryName(transaction.category) }}</div>
            </div>


          </div>

          <!-- Swipe Actions -->
          <div class="transaction-actions">
            <div class="swipe-actions">
              <button class="swipe-action edit" @click.stop="editTransaction(transaction)" title="Chỉnh sửa">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="swipe-action delete" @click.stop="deleteTransaction(transaction)" title="Xóa">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                </svg>
              </button>
            </div>
            <div class="transaction-amount"
              :class="{ 'income': transaction.type === 'income', 'expense': transaction.type === 'expense' }">
              {{ transaction.type === 'income' ? '+' : '-' }} {{ formatCurrency(transaction.amount) }}
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>


</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted, defineExpose, nextTick } from 'vue';
import { collection, getDocs, query, where, orderBy, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '~/plugins/firebase';
import { useAuth } from '~/composables/useAuth';
import { onAuthStateChanged } from 'firebase/auth';

const { user } = useAuth();
const loading = ref(false);
const transactions = ref([]);
const isInitialized = ref(false);
const fetchError = ref(null);
let authUnsubscribe = null;

// Emits
const emit = defineEmits(['add-transaction', 'edit-transaction']);

// View mode state
const viewMode = ref('tree'); // 'tree' or 'list'
const quickFilter = ref('today'); // 'today', 'week', 'month', 'custom'

// Custom date filter state
const showCustomDateFilter = ref(false);

// Touch/swipe state
const touchStartX = ref(0);
const touchStartY = ref(0);
const currentSwipeId = ref(null);

// Quản lý filter thời gian
const now = new Date();
const today = new Date();
const startDate = ref(formatDateForInput(today));
const endDate = ref(formatDateForInput(today));
const transactionType = ref('all');

// State cho danh mục
const categories = ref({});
const categoriesLoading = ref(false);

// State cho modal chỉnh sửa (không cần thiết nữa vì dùng chung modal)
// const showEditModal = ref(false);
// const editingTransaction = ref(null);
// const editLoading = ref(false);

// Định nghĩa tên tiếng Việt cho các danh mục
const categoryNames = {
  // Chi tiêu
  food: 'Ăn uống',
  rent: 'Tiền nhà',
  utilities: 'Hóa đơn dịch vụ',
  transportation: 'Di chuyển',
  entertainment: 'Giải trí',
  shopping: 'Mua sắm',
  healthcare: 'Y tế',
  education: 'Giáo dục',
  debt_payment: 'Trả nợ',
  other_expense: 'Chi tiêu khác',

  // Thu nhập
  salary: 'Lương',
  bonus: 'Thưởng',
  investment: 'Đầu tư',
  gifts: 'Quà tặng',
  performance: 'Đi diễn',
  other_income: 'Thu nhập khác'
};

// Computed properties for tree view
const groupedTransactions = computed(() => {
  const groups = {};
  transactions.value.forEach(transaction => {
    const date = formatDateForInput(transaction.date);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
  });

  // Sort transactions within each group by time (newest first)
  Object.keys(groups).forEach(date => {
    groups[date].sort((a, b) => new Date(b.date) - new Date(a.date));
  });

  // Sort groups by date (newest first)
  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => new Date(b) - new Date(a))
  );
});

// Hàm lấy tên danh mục tiếng Việt
const getCategoryName = (categoryId) => {
  if (!categoryId) return 'Không có danh mục';
  return categories.value[categoryId]?.name || categoryId;
};

// Tính toán tổng thu, chi và số dư
const totalIncome = computed(() => {
  return transactions.value
    .filter(t => t.type === 'income')
    .reduce((sum, transaction) => {
      const amount = typeof transaction.amount === 'number'
        ? transaction.amount
        : parseFloat(String(transaction.amount).replace(/[^\d.-]/g, '')) || 0;

      if (isNaN(amount) || amount === 0) {
        console.warn('Invalid income amount detected:', transaction);
      }

      return sum + amount;
    }, 0);
});

const totalExpense = computed(() => {
  return transactions.value
    .filter(t => t.type === 'expense')
    .reduce((sum, transaction) => {
      const amount = typeof transaction.amount === 'number'
        ? transaction.amount
        : parseFloat(String(transaction.amount).replace(/[^\d.-]/g, '')) || 0;

      if (isNaN(amount) || amount === 0) {
        console.warn('Invalid expense amount detected:', transaction);
      }

      return sum + amount;
    }, 0);
});

const balance = computed(() => {
  return totalIncome.value - totalExpense.value;
});

// Hàm định dạng tiền VND
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Hàm định dạng ngày
const formatDate = (timestamp) => {
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }) + ' ' + date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Hàm định dạng ngày cho input
function formatDateForInput(date) {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}

// Hàm định dạng nhãn ngày cho tree view
const formatDateLabel = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateString === formatDateForInput(today)) {
    return 'Hôm nay';
  } else if (dateString === formatDateForInput(yesterday)) {
    return 'Hôm qua';
  } else {
    // Hiển thị ngày ngắn gọn hơn cho mobile
    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }
};

// Hàm tính toán cho tree view
const getDayIncome = (transactions) => {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
};

const getDayExpense = (transactions) => {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
};

const getDayBalance = (transactions) => {
  return getDayIncome(transactions) - getDayExpense(transactions);
};

// Quick filter functions
const setQuickFilter = (filter) => {
  quickFilter.value = filter;

  const today = new Date();

  switch (filter) {
    case 'today':
      startDate.value = formatDateForInput(today);
      endDate.value = formatDateForInput(today);
      break;
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      startDate.value = formatDateForInput(weekStart);
      endDate.value = formatDateForInput(weekEnd);
      break;
    case 'month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      startDate.value = formatDateForInput(monthStart);
      endDate.value = formatDateForInput(monthEnd);
      break;
    case 'custom':
      // Keep current dates
      break;
  }

  fetchTransactions();
};

// Custom date filter functions
const toggleCustomDateFilter = () => {
  showCustomDateFilter.value = !showCustomDateFilter.value;
  if (showCustomDateFilter.value) {
    quickFilter.value = 'custom';
  }
};

const closeCustomDateFilter = () => {
  showCustomDateFilter.value = false;
  // Reset to previous filter if needed
  if (quickFilter.value === 'custom') {
    quickFilter.value = 'today';
    setQuickFilter('today');
  }
};

const setCustomFilter = () => {
  quickFilter.value = 'custom';
};

const applyCustomFilter = () => {
  showCustomDateFilter.value = false;
  fetchTransactions();
};

// View mode toggle
const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'list' ? 'tree' : 'list';
};

// Touch/swipe handlers
const handleTouchStart = (event) => {
  const touch = event.touches[0];
  touchStartX.value = touch.clientX;
  touchStartY.value = touch.clientY;
  currentSwipeId.value = event.currentTarget.dataset.id;
};

const handleTouchMove = (event) => {
  if (!currentSwipeId.value) return;

  const touch = event.touches[0];
  const deltaX = touch.clientX - touchStartX.value;
  const deltaY = touch.clientY - touchStartY.value;

  // Prevent vertical scrolling if horizontal swipe is detected
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
    event.preventDefault();
  }
};

const handleTouchEnd = (event) => {
  if (!currentSwipeId.value) return;

  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStartX.value;

  // Reset swipe state
  currentSwipeId.value = null;
};

// Transaction actions
const editTransaction = (transaction) => {
  // Emit event để parent component xử lý với mode edit
  emit('edit-transaction', transaction);
};

  const deleteTransaction = async (transaction) => {
    if (!confirm('Bạn có chắc chắn muốn xóa chi tiêu này?')) {
      return;
    }

  try {
    // Xóa chi tiêu khỏi Firestore
    const docRef = doc(db, 'users', user.value.uid, 'transactions', transaction.id);
    await deleteDoc(docRef);

    // Cập nhật danh sách local
    transactions.value = transactions.value.filter(t => t.id !== transaction.id);

          // Hiển thị thông báo thành công
      showNotification('Đã xóa chi tiêu thành công!', 'success');
      } catch (error) {
      console.error('Error deleting transaction:', error);
      showNotification('Không thể xóa chi tiêu: ' + error.message, 'error');
    }
};

// Hàm cập nhật chi tiêu (sẽ được xử lý ở parent component)
// const updateTransaction = async () => {
//   // Logic này sẽ được chuyển sang parent component
// };

// Hàm hiển thị thông báo
const showNotification = (message, type = 'success') => {
  // Tạo notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${type === 'success' ? '✓' : '✗'}</span>
      <p>${message}</p>
    </div>
  `;

  // Thêm styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2000;
    min-width: 300px;
    max-width: 400px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background-color: ${type === 'success' ? '#e8f5e9' : '#ffebee'};
    border-left: 4px solid ${type === 'success' ? '#4CAF50' : '#f44336'};
    animation: slideIn 0.3s ease forwards;
  `;

  // Thêm vào body
  document.body.appendChild(notification);

  // Tự động xóa sau 3 giây
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
};

// Add an external refresh method that can be called via ref
const refreshData = async () => {
  console.log("TransactionList refreshData called");

  if (!user.value || !user.value.uid) {
    console.error("Cannot refresh: No authenticated user");
    fetchError.value = "Người dùng chưa được xác thực";
    loading.value = false;
    throw new Error("User not authenticated");
  }

  // If we're already loading, don't start another fetch
  if (loading.value) {
    console.log("Already loading data, skipping duplicate fetch");
    return true; // Return true to indicate operation was "successful" (skipped)
  }

  // Đặt biến refreshInProgress để theo dõi quá trình refresh riêng biệt
  loading.value = true;
  fetchError.value = null;
  console.log("Starting to fetch transactions in TransactionList");

  try {
    await fetchTransactions();
    console.log("Data refreshed successfully in TransactionList");
    console.log("Total Income:", totalIncome.value);
    console.log("Total Expense:", totalExpense.value);
    return true; // Trả về true khi thành công để parent component biết
  } catch (error) {
    console.error("Error refreshing data in TransactionList:", error);
    fetchError.value = "Lỗi khi tải lại dữ liệu: " + (error.message || "Không xác định");
    transactions.value = []; // Clear transactions on error to avoid showing stale data
    throw error; // Re-throw error to be caught by parent
  } finally {
    isInitialized.value = true;
    loading.value = false;
  }
};

  // Lấy danh sách chi tiêu
const fetchTransactions = async () => {
  if (!user.value || !user.value.uid) {
    console.log("Không thể lấy chi tiêu: User chưa được xác thực");
    fetchError.value = "Người dùng chưa được xác thực";
    loading.value = false;
    return;
  }

      console.log("Đang lấy chi tiêu cho user:", user.value.uid);
  console.log("Khoảng thời gian:", startDate.value, "đến", endDate.value);
      console.log("Loại chi tiêu:", transactionType.value);

  // Đảm bảo không set loading khi đã đang loading
  if (!loading.value) {
    loading.value = true;
  }
  fetchError.value = null;

  try {
    // Tạo đối tượng Date đúng cho ngày bắt đầu và kết thúc
    const start = new Date(startDate.value);
    start.setHours(0, 0, 0, 0); // Đặt thời gian bắt đầu là đầu ngày

    const end = new Date(endDate.value);
    end.setHours(23, 59, 59, 999); // Đặt thời gian kết thúc đến cuối ngày

    console.log("Truy vấn Firestore từ", start.toISOString(), "đến", end.toISOString());

    let collectionPath = `users/${user.value.uid}/transactions`;
    console.log("Collection path:", collectionPath);

    // Chuyển đổi đối tượng Date thành đối tượng Timestamp của Firestore
    const startTimestamp = Timestamp.fromDate(start);
    const endTimestamp = Timestamp.fromDate(end);

    let q = query(
      collection(db, collectionPath),
      where('date', '>=', startTimestamp),
      where('date', '<=', endTimestamp),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    console.log("Số lượng kết quả nhận được:", querySnapshot.size);

    let results = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Đảm bảo date là đối tượng Date
      let date;
      if (data.date instanceof Timestamp) {
        date = data.date.toDate();
      } else if (data.date && typeof data.date === 'object' && data.date.seconds) {
        // Xử lý trường hợp data.date là object có dạng Firestore Timestamp
        date = new Date(data.date.seconds * 1000);
      } else if (data.date instanceof Date) {
        date = data.date;
      } else if (data.date) {
        // Xử lý trường hợp date là string hoặc số
        date = new Date(data.date);
      } else {
        date = new Date();
      }

      // Đảm bảo amount là một số
      let amount = 0;
      if (typeof data.amount === 'number') {
        amount = data.amount;
      } else if (typeof data.amount === 'string') {
        amount = parseFloat(data.amount.replace(/[^\d.-]/g, '')) || 0;
      }

      // Đảm bảo type là một chuỗi hợp lệ
      const type = ['income', 'expense'].includes(data.type) ? data.type : 'expense';

              console.log(`Chi tiêu [${doc.id}]: ${type}, ${amount}đ, ${date.toISOString()}`);
      console.log(`  - Trong khoảng thời gian: ${date >= start && date <= end}`);
      console.log(`  - So sánh ngày: ${date.getDate()}/${date.getMonth() + 1} với ${start.getDate()}/${start.getMonth() + 1} và ${end.getDate()}/${end.getMonth() + 1}`);

      // Thêm vào kết quả mà không cần kiểm tra lại khoảng thời gian
      // vì Firestore query đã xử lý điều này
      results.push({
        id: doc.id,
        ...data,
        date: date,
        amount: amount,
        type: type
      });
    });

    // Lọc theo loại nếu cần
    if (transactionType.value !== 'all') {
      const beforeCount = results.length;
      results = results.filter(t => t.type === transactionType.value);
              console.log(`Đã lọc theo loại ${transactionType.value}: ${beforeCount} -> ${results.length} chi tiêu`);
    }

          console.log("Tổng số chi tiêu sau khi lọc:", results.length);

    // Sắp xếp lại theo ngày mới nhất trước
    results.sort((a, b) => b.date - a.date);

    // Cập nhật transactions chỉ khi cần thiết
    if (JSON.stringify(transactions.value) !== JSON.stringify(results)) {
      transactions.value = results;
    }
  } catch (error) {
    console.error('Lỗi khi lấy chi tiêu:', error);
    if (error.code) {
      console.error('Mã lỗi Firebase:', error.code);
    }
    fetchError.value = `Không thể tải dữ liệu chi tiêu: ${error.message || 'Lỗi không xác định'}`;
    transactions.value = []; // Đặt lại transactions để tránh hiển thị dữ liệu cũ
  } finally {
    loading.value = false;
    isInitialized.value = true;
  }
};

// Thử tải lại dữ liệu
const retryFetch = async () => {
  fetchError.value = null;
  await fetchTransactions();
};

// Thêm các hàm lọc theo ngày/tháng hiện tại
const resetToToday = () => {
  const today = new Date();
  // Đảm bảo rằng chúng ta lấy ngày hiện tại đầy đủ
  today.setHours(0, 0, 0, 0);
  console.log("Đặt lại thành hôm nay:", today.toISOString());

  startDate.value = formatDateForInput(today);
  endDate.value = formatDateForInput(today);

  // Ghi log để debug
  console.log("startDate:", startDate.value);
  console.log("endDate:", endDate.value);

  // Đợi một tick trước khi fetch để đảm bảo giá trị đã được cập nhật
  nextTick(() => {
    fetchTransactions();
  });
};

const resetToCurrentMonth = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  startDate.value = formatDateForInput(firstDay);
  endDate.value = formatDateForInput(lastDay);
  fetchTransactions();
};

// Hàm lấy danh mục từ Firestore
const fetchCategories = async () => {
  if (!user.value) return;

  try {
    categoriesLoading.value = true;

    // Lấy danh mục từ Firestore
    const q = query(
      collection(db, 'users', user.value.uid, 'categories')
    );
    const querySnapshot = await getDocs(q);

    // Tạo object map từ id sang category
    const categoryMap = {};
    querySnapshot.docs.forEach(doc => {
      const category = doc.data();
      categoryMap[doc.id] = category;
    });

    // Thêm danh mục mặc định
    const defaultCategories = {
      food: { name: 'Ăn uống', type: 'expense' },
      rent: { name: 'Tiền nhà', type: 'expense' },
      utilities: { name: 'Hóa đơn dịch vụ', type: 'expense' },
      transportation: { name: 'Di chuyển', type: 'expense' },
      entertainment: { name: 'Giải trí', type: 'expense' },
      shopping: { name: 'Mua sắm', type: 'expense' },
      healthcare: { name: 'Y tế', type: 'expense' },
      education: { name: 'Giáo dục', type: 'expense' },
      debt_payment: { name: 'Trả nợ', type: 'expense' },
      other_expense: { name: 'Chi tiêu khác', type: 'expense' },
      salary: { name: 'Lương', type: 'income' },
      bonus: { name: 'Thưởng', type: 'income' },
      investment: { name: 'Đầu tư', type: 'income' },
      gifts: { name: 'Quà tặng', type: 'income' },
      performance: { name: 'Đi diễn', type: 'income' },
      other_income: { name: 'Thu nhập khác', type: 'income' }
    };

    // Kết hợp danh mục người dùng và mặc định
    categories.value = { ...defaultCategories, ...categoryMap };

  } catch (error) {
    console.error('Error fetching categories:', error);
  } finally {
    categoriesLoading.value = false;
  }
};

// Thêm gọi fetchCategories trong onMounted
onMounted(async () => {
  console.log("TransactionList mounted");
  await fetchCategories();

  // Setup auth listener
  authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      await fetchCategories();
      await fetchTransactions();
    } else {
      transactions.value = [];
    }
  });
});

// Đảm bảo unsubscribe khi component unmounted
onUnmounted(() => {
  console.log("TransactionList unmounted, cleaning up");
  if (authUnsubscribe) {
    authUnsubscribe();
    console.log("Auth listener unsubscribed");
  }
});

// Sử dụng watcher để đảm bảo fetchTransactions chỉ được gọi khi user đã được tải
// Removed immediate flag to prevent duplicate fetch
watch(user, async (newUser, oldUser) => {
  console.log("User changed in watcher:", newUser?.uid);

  // Chỉ gọi fetch khi:
  // 1. Có user mới (newUser)
  // 2. User mới khác user cũ
  // 3. Chưa được initialize
  // 4. Không đang loading
  if (
    newUser &&
    newUser.uid &&
    (!oldUser || newUser.uid !== oldUser.uid) &&
    !isInitialized.value &&
    !loading.value
  ) {
    console.log("User changed significantly, re-fetching transactions");
    loading.value = true;
    try {
      await fetchTransactions();
      console.log("Data loaded via user watcher");
    } catch (error) {
      console.error("Error loading data in user watcher:", error);
      fetchError.value = "Lỗi khi tải dữ liệu: " + (error.message || "Không xác định");
      transactions.value = []; // Clear any partial data
    } finally {
      isInitialized.value = true;
      loading.value = false;
    }
  }
});

// Thêm watch cho startDate, endDate và transactionType để tự động cập nhật khi chúng thay đổi
watch([startDate, endDate, transactionType], async (newValues, oldValues) => {
  // Skip if we're already loading or not initialized
  if (loading.value || !isInitialized.value) {
    console.log("Skipping filter change refresh during loading/initialization");
    return;
  }

  // Chỉ refresh khi giá trị thực sự thay đổi và người dùng đã đăng nhập
  if (user.value && user.value.uid) {
    console.log("Filter changed, refreshing data");
    await fetchTransactions();
  }
}, { deep: true });

// Expose the refreshData method
defineExpose({
  refreshData
});
</script>

<style scoped>
.transactions-section {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-top: -24px;
  position: relative;
  overflow: hidden;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.view-mode-button {
  background-color: #f0f0f0;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
  transition: all 0.2s;
  color: #333;
  font-weight: 500;
}

.view-mode-button:hover {
  background-color: #e0e0e0;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.view-mode-button svg {
  transition: transform 0.2s ease;
}

.view-mode-button:hover svg {
  transform: scale(1.1);
}

.filters-and-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 10px;
}

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 300px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.filter-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.date-range {
  padding: 8px 12px;
  border-radius: 6px;
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
}

.date-range input[type="date"] {
  padding: 5px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.date-range label,
.date-range .date-label {
  margin-right: 4px;
  font-size: 14px;
}

.type-filter {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  border-radius: 6px;
  flex: 1;
  justify-content: center;
  align-items: center;
}

.radio-label {
  font-size: 14px;
  margin-left: 4px;
}

.date-connector {
  font-weight: bold;
}

.date-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-buttons {
  display: flex;
  gap: 8px;
  margin-left: 8px;
}

.reset-button {
  background-color: #f0f0f0;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
  transition: all 0.2s;
  color: #333;
  font-weight: 500;
}

.reset-button:hover {
  background-color: #e0e0e0;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.reset-button span {
  font-size: 14px;
  display: inline-block;
}

.add-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.2s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.add-button:hover {
  background-color: #45a049;
  box-shadow: 0 3px 7px rgba(0, 0, 0, 0.15);
}

.add-button-mobile {
  display: none;
  width: 40px;
  height: 40px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}

.mobile-quick-filters {
  display: none;
  /* Hide on desktop */
  margin-bottom: 16px;
  padding: 10px 0;
  background-color: #f9f9f9;
  border-radius: 6px;
  overflow-x: auto;
  /* Allow horizontal scrolling for chips */
  -webkit-overflow-scrolling: touch;
  /* Smooth scrolling on iOS */
}

.quick-filter-chips {
  display: flex;
  gap: 8px;
  padding: 0 10px;
}

.filter-chip {
  background-color: #e0e0e0;
  border: none;
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.2s;
  white-space: nowrap;
  color: #333;
  font-weight: 500;
}

.filter-chip:hover {
  background-color: #d0d0d0;
  transform: translateY(-1px);
}

.filter-chip.active {
  background-color: #4CAF50;
  color: white;
}

.custom-date-panel {
  margin-top: 12px;
  padding: 16px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.custom-date-inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.date-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-input-group label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.date-input-group input {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  background-color: #f9f9f9;
}

.date-input-group input:focus {
  outline: none;
  border-color: #4CAF50;
  background-color: white;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}

.custom-date-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.apply-button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.apply-button:hover {
  background-color: #45a049;
  transform: translateY(-1px);
}

.custom-date-actions .cancel-button {
  padding: 8px 16px;
  background-color: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.custom-date-actions .cancel-button:hover {
  background-color: #e0e0e0;
  transform: translateY(-1px);
}

.mobile-type-filter {
  display: none;
  /* Hide on desktop */
  margin-bottom: 16px;
  padding: 10px 0;
  background-color: #f9f9f9;
  border-radius: 6px;
  overflow-x: auto;
  /* Allow horizontal scrolling for tabs */
  -webkit-overflow-scrolling: touch;
  /* Smooth scrolling on iOS */
}

.type-tabs {
  display: flex;
  gap: 10px;
  padding: 0 10px;
}

.type-tab {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
  text-align: center;
  white-space: nowrap;
}

.type-tab.income {
  background-color: #e8f5e9;
  color: #4CAF50;
}

.type-tab.expense {
  background-color: #ffebee;
  color: #f44336;
}

.type-tab.active {
  background-color: #4CAF50;
  color: white;
}

.type-tab:hover:not(.active) {
  background-color: #f0f0f0;
}

.transactions-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
  padding: 0;
}

.summary-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid #dee2e6;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 80px;
}

.summary-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--card-color), var(--card-color-light));
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.summary-card.income-card {
  --card-color: #4CAF50;
  --card-color-light: #81C784;
}

.summary-card.expense-card {
  --card-color: #f44336;
  --card-color-light: #ef9a9a;
}

.summary-card.balance-card.positive {
  --card-color: #2196F3;
  --card-color-light: #64B5F6;
}

.summary-card.balance-card.negative {
  --card-color: #FF9800;
  --card-color-light: #FFB74D;
}

.summary-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--card-color), var(--card-color-light));
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 12px;
  font-weight: 500;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.summary-amount {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.summary-amount.income {
  color: #4CAF50;
}

.summary-amount.expense {
  color: #f44336;
}

.summary-amount.positive {
  color: #2196F3;
}

.summary-amount.negative {
  color: #FF9800;
}

.income {
  color: #4CAF50;
}

.expense {
  color: #f44336;
}

.positive {
  color: #4CAF50;
}

.negative {
  color: #f44336;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #757575;
  font-style: italic;
}

.loading-state .loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.transactions-list {
  margin-top: 20px;
}

.tree-view .date-group {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.transactions-in-group {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.date-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.date-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-label {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.date-summary {
  font-size: 14px;
  color: #666;
}

.day-income {
  color: #4CAF50;
}

.day-expense {
  color: #f44336;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  border-radius: 12px;
  margin-bottom: 8px;
  position: relative;
  /* For swipe actions */
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
  overflow: hidden;
  cursor: pointer;
}

.transaction-item:hover {
  background-color: #f9f9f9;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

.transaction-item:hover {
  background-color: #f9f9f9;
}

.transaction-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.transaction-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #f0f0f0;
  color: #333;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.transaction-icon.income {
  background-color: #e8f5e9;
  color: #4CAF50;
}

.transaction-icon.expense {
  background-color: #ffebee;
  color: #f44336;
}

.transaction-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.transaction-description {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 15px;
  color: #333;
  line-height: 1.3;
}

.transaction-category {
  font-size: 11px;
  color: #666;
  background-color: #f8f9fa;
  padding: 3px 8px;
  border-radius: 10px;
  display: inline-block;
  margin-top: 4px;
  border: 1px solid #e9ecef;
  font-weight: 500;
}



.swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  display: flex;
  gap: 8px;
  padding-left: 10px;
  /* Match transaction-content padding */
  z-index: 10;
  /* Ensure actions are above content */
  opacity: 0;
  transition: opacity 0.3s ease;
}

.transaction-item:hover .swipe-actions {
  opacity: 1;
}

.swipe-action {
  background-color: #f0f0f0;
  border: none;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: #333;
  font-size: 14px;
  flex-shrink: 0;
  min-width: 40px;
  height: 40px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.swipe-action:hover {
  background-color: #e0e0e0;
  transform: scale(1.05);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

.swipe-action.edit {
  color: #4CAF50;
}

.swipe-action.delete {
  color: #f44336;
}

@media (max-width: 768px) {
  .transactions-section {
    padding: 15px;
    margin-top: 16px;
  }

  .section-header {
    margin-bottom: 12px;
  }

  .page-title {
    font-size: 20px;
  }

  .header-actions {
    gap: 8px;
  }

  .view-mode-button {
    padding: 8px;
    font-size: 12px;
  }

  .add-button-mobile {
    width: 36px;
    height: 36px;
    font-size: 20px;
  }

  .filter-controls {
    min-width: 100%;
  }

  .filter-row {
    flex-direction: column;
    width: 100%;
  }

  .date-range,
  .type-filter {
    width: 100%;
    flex: none;
  }

  .date-range {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .date-inputs {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    position: relative;
  }

  .date-range input[type="date"] {
    flex: 1;
    max-width: 45%;
  }

  .date-buttons {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-left: 0;
    width: 100%;
  }

  .reset-button {
    padding: 8px 0;
    font-size: 13px;
    white-space: nowrap;
    flex: 1;
    max-width: 120px;
    justify-content: center;
  }

  .filters-and-actions {
    flex-direction: column;
  }

  .add-button {
    display: none;
  }

  .add-button-mobile {
    display: flex;
  }

  .mobile-quick-filters {
    display: block;
    /* Show on mobile */
    margin-bottom: 12px;
    padding: 8px 0;
  }

  .mobile-type-filter {
    display: block;
    /* Show on mobile */
    margin-bottom: 12px;
    padding: 8px 0;
  }

  .quick-filter-chips {
    gap: 6px;
    padding: 0 8px;
  }

  .filter-chip {
    padding: 5px 10px;
    font-size: 12px;
  }

  .type-tabs {
    justify-content: center;
    padding: 0 8px;
    gap: 8px;
  }

     .type-tab {
     flex: none;
     padding: 6px 12px;
     font-size: 12px;
   }

   .custom-date-panel {
     margin-top: 8px;
     padding: 12px;
   }

   .custom-date-inputs {
     gap: 10px;
     margin-bottom: 12px;
   }

   .date-input-group input {
     padding: 12px;
     font-size: 16px; /* Prevent zoom on iOS */
   }

   .custom-date-actions {
     gap: 8px;
   }

   .apply-button,
   .custom-date-actions .cancel-button {
     padding: 10px 14px;
     font-size: 14px;
   }

  .transactions-summary {
    grid-template-columns: 1fr;
    gap: 6px;
    margin-bottom: 10px;
  }

  .summary-card {
    padding: 10px;
    border-radius: 8px;
    min-height: 60px;
  }

  .summary-icon {
    width: 28px;
    height: 28px;
    border-radius: 5px;
    margin-bottom: 4px;
  }

  .summary-label {
    font-size: 10px;
  }

  .summary-amount {
    font-size: 13px;
  }

  .transactions-list {
    margin-top: 16px;
  }

  .tree-view .date-group {
    margin-bottom: 16px;
    padding-bottom: 12px;
  }

  .date-header {
    margin-bottom: 8px;
    padding-bottom: 6px;
  }

  .date-label {
    font-size: 16px;
    font-weight: 700;
  }

  .date-summary {
    font-size: 12px;
    font-weight: 500;
  }

  .day-balance {
    font-size: 14px;
    font-weight: bold;
    padding: 6px 12px;
    border-radius: 6px;
    background-color: #f5f5f5;
    min-width: 80px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .day-balance.positive {
    background-color: #e8f5e9;
    color: #2E7D32;
    border: 1px solid #c8e6c9;
  }

  .day-balance.negative {
    background-color: #ffebee;
    color: #c62828;
    border: 1px solid #ffcdd2;
  }

  .transaction-item {
    flex-direction: row;
    gap: 10px;
    padding: 12px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    background-color: white;
    margin-bottom: 8px;
    border-radius: 10px;
  }

  .transaction-content {
    gap: 8px;
  }

  .transaction-icon {
    width: 32px;
    height: 32px;
  }

  .transaction-info {
    flex: 1;
  }

  .transaction-description {
    font-size: 14px;
    margin-bottom: 3px;
    font-weight: 600;
  }

  .transaction-category {
    font-size: 12px;
    padding: 2px 8px;
    font-weight: 500;
  }

  .transaction-actions {
    min-width: 100px;
    gap: 6px;
  }

     .transaction-amount {
     font-size: 13px;
     padding: 2px 0;
     min-width: 70px;
   }

  .swipe-actions {
    gap: 8px;
    padding-left: 8px;
    opacity: 1;
    /* Always show on mobile */
    position: relative;
    z-index: 5;
  }

  .swipe-action {
    padding: 8px;
    font-size: 12px;
    border-radius: 6px;
    min-width: 36px;
    height: 36px;
  }

  .loading-state {
    padding: 30px 0;
  }

  .loading-state .loading-spinner {
    width: 32px;
    height: 32px;
    margin-bottom: 8px;
  }

  .loading-state p {
    font-size: 14px;
  }

  .empty-state {
    padding: 20px;
    margin-top: 16px;
  }

  .empty-state .empty-icon {
    font-size: 36px;
    margin-bottom: 8px;
  }

  .empty-state p {
    font-size: 14px;
    margin: 6px 0;
  }

  .empty-state .date-range-info {
    font-size: 12px;
  }

  .empty-state .retry-button {
    margin-top: 12px;
    padding: 6px 12px;
    font-size: 13px;
  }

  /* Mobile modal improvements */
  .modal {
    width: 95%;
    max-width: none;
    margin: 10px;
    border-radius: 12px;
  }

  .modal-header {
    padding: 12px 16px;
  }

  .modal-header h2 {
    font-size: 18px;
  }

  .modal-body {
    padding: 16px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    font-size: 14px;
    margin-bottom: 6px;
  }

  .form-group input[type="text"],
  .form-group input[type="date"],
  .form-group input[type="number"],
  .form-group select {
    padding: 12px;
    font-size: 16px;
    /* Prevent zoom on iOS */
  }

  .radio-group {
    gap: 20px;
  }

  .radio-option {
    padding: 10px 12px;
    font-size: 14px;
  }

  .amount-input input {
    font-size: 16px;
    padding: 12px;
  }

  .form-actions {
    padding: 12px 16px;
  }

  .cancel-button,
  .submit-button {
    padding: 12px 16px;
    font-size: 16px;
  }
}

/* Desktop only styles */
.desktop-only {
  display: block;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none;
  }
}

.empty-state {
  text-align: center;
  padding: 30px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-top: 20px;
  color: #757575;
}

.empty-state .empty-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.empty-state p {
  margin: 8px 0;
}

.empty-state .date-range-info {
  font-size: 14px;
  color: #888;
  margin: 10px 0;
}

.empty-state .retry-button {
  margin-top: 15px;
  background-color: #f5f5f5;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.empty-state .retry-button:hover {
  background-color: #e0e0e0;
}

/* Modal Styles */
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

.modal {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  transition: all 0.3s ease;
}

.modal-header.income-header {
  background-color: #e8f5e9;
  border-bottom: 1px solid #81C784;
}

.modal-header.income-header h2 {
  color: #2E7D32;
}

.modal-header.expense-header {
  background-color: #ffebee;
  border-bottom: 1px solid #ef9a9a;
}

.modal-header.expense-header h2 {
  color: #c62828;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #757575;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input[type="text"],
.form-group input[type="date"],
.form-group input[type="number"],
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.form-group select {
  height: 42px;
}

.amount-input {
  position: relative;
}

.amount-input input {
  text-align: left;
  font-size: 18px;
  font-weight: 500;
}

.radio-group {
  display: flex;
  justify-content: center;
  gap: 30px;
}

.radio-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 16px;
  background-color: #f5f5f5;
  border-radius: 6px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.radio-option.income {
  background-color: #e8f5e9;
  color: #2E7D32;
  border-color: #81C784;
}

.radio-option.expense {
  background-color: #ffebee;
  color: #c62828;
  border-color: #ef9a9a;
}

.radio-option:hover {
  transform: translateY(-1px);
}

.radio-option.income:hover {
  background-color: #c8e6c9;
}

.radio-option.expense:hover {
  background-color: #ffcdd2;
}

.radio-option input {
  margin-right: 8px;
}

.radio-option.income input {
  accent-color: #2E7D32;
}

.radio-option.expense input {
  accent-color: #c62828;
}

.required {
  color: #f44336;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
  background-color: white;
  position: sticky;
  bottom: 0;
  box-shadow: 0 -1px 5px rgba(0, 0, 0, 0.1);
}

.cancel-button {
  padding: 10px 20px;
  background-color: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.cancel-button:hover {
  background-color: #e0e0e0;
}

.submit-button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.submit-button:hover {
  background-color: #45a049;
}

.submit-button:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}

.category-select {
  display: flex;
  gap: 10px;
  align-items: center;
}

.category-select select {
  flex: 1;
}

.transaction-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  min-width: 120px;
}

.transaction-amount {
  font-weight: 600;
  font-size: 14px;
  text-align: right;
  padding: 4px 0;
  min-width: 80px;
  transition: all 0.2s ease;
}

.transaction-amount.income {
  color: #4CAF50;
}

.transaction-amount.expense {
  color: #f44336;
}
.summary-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>