<template>
  <div class="dashboard-container">
    <!-- User Info -->
    <div v-if="user" class="user-info">
      Xin chào, {{ user.displayName || user.email }}!
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Đang tải dữ liệu...</div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-overlay">
      <div class="error-content">
        <h3>Đã xảy ra lỗi</h3>
        <p>{{ error }}</p>
        <button @click="refreshData" class="retry-button">Thử lại</button>
      </div>
    </div>

    <!-- Main Dashboard Content -->
    <div v-if="!loading && !error">
      <!-- Tổng quan tài chính -->
      <div class="finance-overview">
        <div class="finance-card income">
          <span class="card-title">Tổng thu nhập</span>
          <div v-if="financeLoading" class="loading-placeholder">
            <div class="loading-spinner"></div>
            <span>Đang tải...</span>
          </div>
          <div v-else-if="financeError" class="error-message">
            <span>Lỗi tải dữ liệu</span>
            <button @click="fetchTransactions" class="retry-button">Thử lại</button>
          </div>
          <div v-else>
            <span class="amount">{{ formatCurrency(totalIncome) }}</span>
          </div>
        </div>

        <div class="finance-card expense">
          <span class="card-title">Tổng chi tiêu</span>
          <div v-if="financeLoading" class="loading-placeholder">
            <div class="loading-spinner"></div>
            <span>Đang tải...</span>
          </div>
          <div v-else-if="financeError" class="error-message">
            <span>Lỗi tải dữ liệu</span>
            <button @click="fetchTransactions" class="retry-button">Thử lại</button>
          </div>
          <div v-else>
            <span class="amount">{{ formatCurrency(totalExpense) }}</span>
          </div>
        </div>

        <div class="finance-card balance">
          <span class="card-title">Số dư</span>
          <div v-if="financeLoading" class="loading-placeholder">
            <div class="loading-spinner"></div>
            <span>Đang tải...</span>
          </div>
          <div v-else-if="financeError" class="error-message">
            <span>Lỗi tải dữ liệu</span>
            <button @click="fetchTransactions" class="retry-button">Thử lại</button>
          </div>
          <div v-else>
            <span class="amount">{{ formatCurrency(balance) }}</span>
          </div>
        </div>
      </div>

      <!-- Thông báo khoản nợ - Moved up -->
      <div class="debt-notifications">
        <div class="notification-title">
          <span class="notification-icon">🔔</span>
          Khoản nợ sắp đến hạn
        </div>

        <div v-if="debtsLoading" class="loading-state">
          <div class="loading-spinner" style="margin: 0 auto"></div>
          <p>Đang tải khoản nợ...</p>
        </div>

        <div v-else-if="debtsError" class="debt-error-message">
          <span class="error-icon">⚠️</span>
          <div class="error-title">Không thể tải dữ liệu khoản nợ</div>
          <div class="error-description">Vui lòng thử lại sau hoặc kiểm tra kết nối của bạn.</div>
          <button @click="fetchDebts" class="retry-button">Thử lại</button>
        </div>

        <div v-else-if="upcomingDebts.length > 0" class="notification-list">
          <div 
            v-for="debt in upcomingDebts.slice(0, 5)" 
            :key="debt.id" 
            :class="[
              'notification-item', 
              isOverdue(debt) ? 'overdue' : 
              isDueToday(debt) ? 'due-today' : 'due-soon'
            ]"
          >
            <span 
              :class="'status-icon'"
              :style="{
                color: isOverdue(debt) ? '#f44336' : 
                      isDueToday(debt) ? '#ffc107' : '#2196f3'
              }"
            >
              {{ isOverdue(debt) ? '⚠️' : isDueToday(debt) ? '📅' : '⏱️' }}
            </span>
            <div class="notification-details">
              <div class="notification-description">
                <span v-if="debt.type === 'lent'" class="debt-type-tag lent-tag">Cho mượn</span>
                <span v-else class="debt-type-tag owed-tag">Đi mượn</span>
                {{ debt.description }} ({{ debt.personName }})
              </div>
              <div class="notification-date">
                <span v-if="isOverdue(debt)">Quá hạn {{ daysOverdue(debt) }} ngày</span>
                <span v-else-if="isDueToday(debt)">Đến hạn hôm nay</span>
                <span v-else>Đến hạn trong {{ daysToDue(debt) }} ngày</span>
              </div>
              <div class="notification-amount">{{ formatCurrency(debt.amount) }}</div>
            </div>
            <div class="notification-actions">
              <router-link :to="`/debts/view/${debt.id}`" class="view-button">
                Xem chi tiết
              </router-link>
            </div>
          </div>
          <div class="view-all-link">
            <router-link to="/debts" class="view-all-button">
              Xem tất cả khoản nợ
            </router-link>
          </div>
        </div>
        <div v-else class="no-data">Chưa có khoản nợ sắp đến hạn</div>
      </div>

      <!-- Biểu đồ -->
      <div class="charts-container">
        <div class="chart-wrapper">
          <div class="chart-header">
            <h2>Thống kê chi tiêu</h2>
            <button @click="refreshCharts" class="refresh-chart-button" :disabled="chartLoading">
              <span class="icon-refresh">↻</span>
            </button>
          </div>
          <div class="comparison-chart-container">
            <ExpenseChart :transactions="transactions" :isLoading="chartLoading" :noData="transactions.length === 0" />
          </div>
        </div>

        <div class="chart-wrapper">
          <div class="chart-header">
            <h2>Tổng quan khoản nợ</h2>
            <button @click="refreshDebts" class="refresh-chart-button" :disabled="chartLoading">
              <span class="icon-refresh">↻</span>
            </button>
          </div>
          <div class="comparison-chart-container">
            <DebtOverviewChart :debts="debts" :loading="debtsLoading" />
          </div>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="quick-links">
        <router-link to="/transactions" class="quick-link-button">
          <span class="quick-link-icon">📋</span>
          Quản lý giao dịch
        </router-link>
        <router-link to="/debts" class="quick-link-button">
          <span class="quick-link-icon">🤝</span>
          Quản lý khoản nợ
        </router-link>
      </div>
    </div>

    <!-- Login Prompt for guest users -->
    <div v-if="!user && !loading" class="error-overlay">
      <div class="error-content">
        <h3>Vui lòng đăng nhập</h3>
        <p>Bạn cần đăng nhập để xem bảng tổng quan tài chính.</p>
        <router-link to="/login" class="retry-button">Đăng nhập ngay</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '~/plugins/firebase';

// Components
import ExpenseChart from '~/components/ExpenseChart.vue';
import DebtOverviewChart from '~/components/DebtOverviewChart.vue';

// Page meta
definePageMeta({
  middleware: 'auth'
});

// Router
const router = useRouter();

// State variables
const user = ref(null);
const loading = ref(true);
const error = ref(null);
const financeLoading = ref(false);
const financeError = ref(null);
const chartLoading = ref(false);
const debtsLoading = ref(false);
const debtsError = ref(null);
const transactions = ref([]);
const debts = ref([]);
const totalIncome = ref(0);
const totalExpense = ref(0);
const balance = ref(0);
const expenseTrendData = ref([]);
const authListener = null;

// Computed để lấy danh sách khoản nợ sắp đến hạn (trong 7 ngày)
const upcomingDebts = computed(() => {
  if (!debts.value || debts.value.length === 0) return [];
  
  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(now.getDate() + 7);
  
  return debts.value
    .filter(debt => {
      if (!debt.dueDate) return false;
      
      const dueDate = debt.dueDate instanceof Date 
        ? debt.dueDate 
        : debt.dueDate.toDate ? debt.dueDate.toDate() : new Date(debt.dueDate);
      
      // Chỉ lấy những khoản nợ chưa thanh toán
      return !debt.isPaid && dueDate <= sevenDaysLater;
    })
    .sort((a, b) => {
      const dueDateA = a.dueDate instanceof Date 
        ? a.dueDate 
        : a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
      
      const dueDateB = b.dueDate instanceof Date 
        ? b.dueDate 
        : b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate);
      
      return dueDateA - dueDateB;
    });
});

// Hàm format tiền tệ
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

// Kiểm tra khoản nợ đã quá hạn chưa
const isOverdue = (debt) => {
  if (!debt.dueDate) return false;
  
  const dueDate = debt.dueDate instanceof Date 
    ? debt.dueDate 
    : debt.dueDate.toDate ? debt.dueDate.toDate() : new Date(debt.dueDate);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return dueDate < today && !debt.isPaid;
};

// Kiểm tra khoản nợ đến hạn hôm nay
const isDueToday = (debt) => {
  if (!debt.dueDate) return false;
  
  const dueDate = debt.dueDate instanceof Date 
    ? debt.dueDate 
    : debt.dueDate.toDate ? debt.dueDate.toDate() : new Date(debt.dueDate);
  
  const today = new Date();
  
  return dueDate.getDate() === today.getDate() && 
         dueDate.getMonth() === today.getMonth() && 
         dueDate.getFullYear() === today.getFullYear() &&
         !debt.isPaid;
};

// Tính số ngày quá hạn
const daysOverdue = (debt) => {
  if (!debt.dueDate || !isOverdue(debt)) return 0;
  
  const dueDate = debt.dueDate instanceof Date 
    ? debt.dueDate 
    : debt.dueDate.toDate ? debt.dueDate.toDate() : new Date(debt.dueDate);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(today - dueDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Tính số ngày đến hạn
const daysToDue = (debt) => {
  if (!debt.dueDate || isOverdue(debt)) return 0;
  
  const dueDate = debt.dueDate instanceof Date 
    ? debt.dueDate 
    : debt.dueDate.toDate ? debt.dueDate.toDate() : new Date(debt.dueDate);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(dueDate - today);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Lấy dữ liệu giao dịch từ Firestore
const fetchTransactions = async () => {
  console.log('Fetching transactions data...');
  
  // Đảm bảo user đã đăng nhập
  if (!user.value || !user.value.uid) {
    console.error('Cannot fetch transactions: No authenticated user');
    error.value = 'Vui lòng đăng nhập để xem dữ liệu';
    loading.value = false;
    return;
  }
  
  financeLoading.value = true;
  financeError.value = null;
  
  try {
    const transactionsQuery = query(
      collection(db, 'users', user.value.uid, 'transactions'),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(transactionsQuery);
    
    const transactionData = [];
    let incomeTotal = 0;
    let expenseTotal = 0;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const transaction = {
        id: doc.id,
        type: data.type,
        amount: data.amount,
        date: data.date instanceof Date ? data.date : data.date.toDate(),
        description: data.description,
        category: data.category
      };
      
      transactionData.push(transaction);
      
      // Tính tổng thu nhập và chi tiêu
      if (transaction.type === 'income') {
        incomeTotal += transaction.amount;
      } else if (transaction.type === 'expense') {
        expenseTotal += transaction.amount;
      }
    });
    
    transactions.value = transactionData;
    totalIncome.value = incomeTotal;
    totalExpense.value = expenseTotal;
    balance.value = incomeTotal - expenseTotal;
    
    // Đánh dấu đã hoàn thành tải dữ liệu
    financeLoading.value = false;
    
    console.log(`Loaded ${transactionData.length} transactions`);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    financeError.value = 'Không thể tải dữ liệu giao dịch: ' + (err.message || 'Lỗi không xác định');
    financeLoading.value = false;
  }
};

// Lấy dữ liệu khoản nợ từ Firestore
const fetchDebts = async () => {
  console.log('Fetching debts data...');
  
  // Đảm bảo user đã đăng nhập
  if (!user.value || !user.value.uid) {
    console.error('Cannot fetch debts: No authenticated user');
    error.value = 'Vui lòng đăng nhập để xem dữ liệu';
    loading.value = false;
    return;
  }
  
  debtsLoading.value = true;
  debtsError.value = null;
  
  try {
    const debtsQuery = query(
      collection(db, 'users', user.value.uid, 'debts'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(debtsQuery);
    
    const debtData = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      debtData.push({
        id: doc.id,
        amount: data.amount,
        description: data.description,
        personName: data.personName || 'Không tên',
        dueDate: data.dueDate instanceof Date ? data.dueDate : data.dueDate?.toDate(),
        createdAt: data.createdAt instanceof Date ? data.createdAt : data.createdAt?.toDate(),
        isPaid: data.isPaid || false,
        type: data.type || 'owed'  // 'owed' hoặc 'lent'
      });
    });
    
    debts.value = debtData;
    
    // Đánh dấu đã hoàn thành tải dữ liệu
    debtsLoading.value = false;
    
    console.log(`Loaded ${debtData.length} debts`);
  } catch (err) {
    console.error('Error fetching debts:', err);
    debtsError.value = 'Không thể tải dữ liệu khoản nợ: ' + (err.message || 'Lỗi không xác định');
    debtsLoading.value = false;
  }
};

// Làm mới dữ liệu chart
const refreshCharts = async () => {
  console.log('Refreshing expense charts...');
  chartLoading.value = true;
  
  try {
    await fetchTransactions();
    const expenseTransactions = transactions.value.filter(t => t.type === 'expense');
    console.log(`Found ${expenseTransactions.length} expense transactions`);
    
    // Tính tổng chi tiêu theo danh mục
    const expenseByCategory = {};
    expenseTransactions.forEach(transaction => {
      const category = transaction.category || 'other_expense';
      if (!expenseByCategory[category]) {
        expenseByCategory[category] = 0;
      }
      expenseByCategory[category] += transaction.amount;
    });
    
    // Log chi tiêu theo danh mục
    console.log('Expense by category:', expenseByCategory);
    
    // Tạo dữ liệu trend cho 30 ngày
    expenseTrendData.value = generateExpenseTrendData(expenseTransactions);
  } catch (err) {
    console.error('Error refreshing charts:', err);
  } finally {
    chartLoading.value = false;
  }
};

// Làm mới dữ liệu khoản nợ
const refreshDebts = async () => {
  console.log('Refreshing debt data...');
  chartLoading.value = true;
  
  try {
    await fetchDebts();
    console.log(`Loaded ${debts.value.length} debts for charts`);
  } catch (err) {
    console.error('Error refreshing debt data:', err);
  } finally {
    chartLoading.value = false;
  }
};

// Tạo dữ liệu xu hướng chi tiêu trong 30 ngày qua
const generateExpenseTrendData = (expenseTransactions) => {
  const result = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Tạo mảng 30 ngày
  for (let i = 29; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    
    // Tính tổng chi tiêu cho ngày này
    let total = 0;
    
    expenseTransactions.forEach(transaction => {
      const transactionDate = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
      if (transactionDate.getDate() === day.getDate() && 
          transactionDate.getMonth() === day.getMonth() && 
          transactionDate.getFullYear() === day.getFullYear()) {
        total += transaction.amount;
      }
    });
    
    result.push({
      date: day,
      amount: total
    });
  }
  
  return result;
};

// Làm mới tất cả dữ liệu
const refreshData = async () => {
  console.log('Refreshing all dashboard data...');
  
  loading.value = true;
  error.value = null;
  
  try {
    await Promise.all([
      fetchTransactions(),
      fetchDebts()
    ]);
    
    // Tạo dữ liệu biểu đồ
    const expenseTransactions = transactions.value.filter(t => t.type === 'expense');
    expenseTrendData.value = generateExpenseTrendData(expenseTransactions);
  } catch (err) {
    console.error('Error refreshing dashboard data:', err);
    error.value = 'Không thể tải dữ liệu bảng điều khiển: ' + (err.message || 'Lỗi không xác định');
  } finally {
    loading.value = false;
  }
};

// Khởi tạo khi component được mount
onMounted(() => {
  console.log('Dashboard component mounted');
  
  // Khởi tạo state
  transactions.value = []; 
  debts.value = [];
  totalIncome.value = 0;
  totalExpense.value = 0;
  balance.value = 0;
  
  // Thiết lập authentication listener
  const authListener = onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser;
    
    if (currentUser) {
      console.log('User authenticated in dashboard:', currentUser.uid);
      refreshData();
    } else {
      console.log('No user authenticated in dashboard');
      loading.value = false;
      error.value = 'Vui lòng đăng nhập để xem bảng tổng quan tài chính';
    }
  });
});

// Dọn dẹp
onUnmounted(() => {
  console.log('Dashboard component unmounted');
  
  // Hủy listener khi component unmounted
  if (authListener) {
    authListener();
  }
});
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.user-info {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 8px;
  font-size: 14px;
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

/* Tổng quan tài chính */
.finance-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.finance-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
  overflow: hidden;
  min-height: 130px;
}

.finance-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.finance-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
}

.finance-card.income::before {
  background-color: #4CAF50;
}

.finance-card.expense::before {
  background-color: #F44336;
}

.finance-card.balance::before {
  background-color: #2196F3;
}

.card-title {
  font-weight: bold;
  color: #666;
  margin-bottom: 10px;
  font-size: 16px;
}

.amount {
  font-size: 24px;
  font-weight: 700;
  margin-top: 5px;
  color: #333;
}

.finance-card.income .amount {
  color: #4CAF50;
}

.finance-card.expense .amount {
  color: #F44336;
}

.finance-card.balance .amount {
  color: #2196F3;
}

.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.loading-placeholder .loading-spinner {
  width: 30px;
  height: 30px;
  border-width: 3px;
  margin-bottom: 0;
}

.error-message {
  color: #f44336;
  text-align: center;
  font-size: 14px;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.error-message .retry-button {
  padding: 6px 12px;
  font-size: 14px;
}

/* Biểu đồ */
.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

@media (max-width: 768px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
}

.chart-wrapper {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 0;
  margin-top: 20px;
  overflow: hidden;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px 0;
}

.chart-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.refresh-chart-button {
  background: none;
  border: none;
  color: #4CAF50;
  cursor: pointer;
  font-size: 18px;
  transition: transform 0.2s;
  padding: 5px;
}

.refresh-chart-button:hover {
  transform: rotate(30deg);
}

.refresh-chart-button:disabled {
  color: #cccccc;
  cursor: not-allowed;
}

.comparison-chart-container {
  padding: 15px;
  height: 420px;
  position: relative;
}

/* Quick Links */
.quick-links {
  display: flex;
  gap: 15px;
  margin-top: 30px;
  margin-bottom: 40px;
}

.quick-link-button {
  background-color: white;
  border: none;
  padding: 15px 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  color: #333;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.quick-link-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.quick-link-icon {
  font-size: 20px;
}

/* Thông báo khoản nợ */
.debt-notifications {
  width: 100%;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: 20px 0 30px 0;
}

.notification-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.notification-icon {
  font-size: 20px;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background-color: #f9f9f9;
  gap: 12px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.notification-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.notification-item.overdue {
  border-left: 4px solid #f44336;
  background-color: #ffebee;
}

.notification-item.due-today {
  border-left: 4px solid #ffc107;
  background-color: #fff8e1;
}

.notification-item.due-soon {
  border-left: 4px solid #2196f3;
  background-color: #e3f2fd;
}

.status-icon {
  font-size: 22px;
  width: 30px;
  display: flex;
  justify-content: center;
}

.notification-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notification-description {
  font-weight: 500;
  color: #333;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.debt-type-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  margin-right: 4px;
}

.lent-tag {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.owed-tag {
  background-color: #ffebee;
  color: #c62828;
}

.notification-date {
  font-size: 14px;
  color: #666;
}

.notification-amount {
  font-weight: 600;
  color: #333;
}

.notification-actions {
  display: flex;
  align-items: center;
}

.view-button {
  padding: 6px 12px;
  background-color: #f5f5f5;
  color: #333;
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.view-button:hover {
  background-color: #e0e0e0;
}

.view-all-link {
  margin-top: 12px;
  text-align: center;
}

.view-all-button {
  display: inline-block;
  padding: 8px 16px;
  background-color: #f5f5f5;
  color: #333;
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
  transition: background-color 0.2s, transform 0.2s;
}

.view-all-button:hover {
  background-color: #e0e0e0;
  transform: translateY(-2px);
}

.no-data {
  padding: 20px;
  text-align: center;
  color: #757575;
  font-style: italic;
  background-color: #f9f9f9;
  border-radius: 8px;
}

/* Các thành phần lỗi */
.debt-error-message {
  text-align: center;
  padding: 20px;
  margin: 20px 0;
  background-color: #fff5f5;
  border: 1px solid #ffebee;
  border-radius: 8px;
  color: #d32f2f;
}

.error-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.error-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

.error-description {
  margin-bottom: 16px;
  color: #616161;
}

.loading-state {
  text-align: center;
  padding: 20px;
  color: #757575;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .finance-overview {
    grid-template-columns: 1fr;
  }
  
  .finance-card {
    min-height: 110px;
  }
  
  .finance-card:hover {
    transform: none;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .quick-link-button:hover {
    transform: none;
  }
  
  .notification-item {
    padding: 12px 8px;
  }

  .notification-description {
    word-break: break-word;
  }
  
  .notification-actions {
    margin-left: auto;
  }
  
  .chart-header h2 {
    font-size: 16px;
  }
  
  .comparison-chart-container {
    height: 380px;
  }
}

@media (max-width: 576px) {
  .notification-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .status-icon {
    margin-bottom: 6px;
  }
  
  .notification-actions {
    align-self: flex-end;
    margin-top: 8px;
  }
  
  .debt-type-tag {
    margin-bottom: 4px;
  }
}
</style> 