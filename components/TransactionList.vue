<template>
  <div class="transactions-section">
    <div class="section-header">
      <h1 class="page-title">Quản lý giao dịch</h1>
      <button @click="$emit('add-transaction')" class="add-button-mobile">
        <span>+</span>
      </button>
    </div>
    
    <div class="filters-and-actions">
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
        <span>+</span> Thêm giao dịch
      </button>
    </div>
    
    <div class="transactions-summary">
      <div class="summary-item">
        <span>Tổng thu:</span>
        <span class="income">{{ formatCurrency(totalIncome) }}</span>
      </div>
      <div class="summary-item">
        <span>Tổng chi:</span>
        <span class="expense">{{ formatCurrency(totalExpense) }}</span>
      </div>
      <div class="summary-item">
        <span>Số dư:</span>
        <span :class="{ 'positive': balance >= 0, 'negative': balance < 0 }">
          {{ formatCurrency(balance) }}
        </span>
      </div>
    </div>
    
    <div v-if="loading" class="loading-state">
      Đang tải dữ liệu...
    </div>
    
    <div v-else-if="transactions.length === 0" class="empty-state">
      <p>Không có giao dịch nào trong khoảng thời gian này</p>
      <p class="date-range-info">Khoảng thời gian: {{ startDate }} đến {{ endDate }}</p>
      <button @click="fetchTransactions" class="retry-button">
        <span>⟳</span> Tải lại dữ liệu
      </button>
    </div>
    
    <div v-else class="transactions-list">
      <div v-for="transaction in transactions" :key="transaction.id" class="transaction-item">
        <div class="transaction-info">
          <div class="transaction-date">{{ formatDate(transaction.date) }}</div>
          <div class="transaction-description">{{ transaction.description }}</div>
          <div class="transaction-category">{{ getCategoryName(transaction.category) }}</div>
        </div>
        <div class="transaction-amount" :class="{ 'income': transaction.type === 'income', 'expense': transaction.type === 'expense' }">
          {{ transaction.type === 'income' ? '+' : '-' }} {{ formatCurrency(transaction.amount) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted, defineExpose, nextTick } from 'vue';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
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
const emit = defineEmits(['add-transaction']);

// Quản lý filter thời gian
const now = new Date();
const today = new Date();
const startDate = ref(formatDateForInput(today));
const endDate = ref(formatDateForInput(today));
const transactionType = ref('all');

// State cho danh mục
const categories = ref({});
const categoriesLoading = ref(false);

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
      // Đảm bảo amount là số
      const amount = typeof transaction.amount === 'number' 
        ? transaction.amount 
        : parseFloat(String(transaction.amount).replace(/[^\d.-]/g, '')) || 0;
      
      // Log để debug
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
      // Đảm bảo amount là số
      const amount = typeof transaction.amount === 'number' 
        ? transaction.amount 
        : parseFloat(String(transaction.amount).replace(/[^\d.-]/g, '')) || 0;
      
      // Log để debug
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

// Lấy danh sách giao dịch
const fetchTransactions = async () => {
  if (!user.value || !user.value.uid) {
    console.log("Không thể lấy giao dịch: User chưa được xác thực");
    fetchError.value = "Người dùng chưa được xác thực";
    loading.value = false;
    return;
  }
  
  console.log("Đang lấy giao dịch cho user:", user.value.uid);
  console.log("Khoảng thời gian:", startDate.value, "đến", endDate.value);
  console.log("Loại giao dịch:", transactionType.value);
  
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
      
      console.log(`Giao dịch [${doc.id}]: ${type}, ${amount}đ, ${date.toISOString()}`);
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
      console.log(`Đã lọc theo loại ${transactionType.value}: ${beforeCount} -> ${results.length} giao dịch`);
    }
    
    console.log("Tổng số giao dịch sau khi lọc:", results.length);
    
    // Sắp xếp lại theo ngày mới nhất trước
    results.sort((a, b) => b.date - a.date);
    
    // Cập nhật transactions chỉ khi cần thiết
    if (JSON.stringify(transactions.value) !== JSON.stringify(results)) {
      transactions.value = results;
    }
  } catch (error) {
    console.error('Lỗi khi lấy giao dịch:', error);
    if (error.code) {
      console.error('Mã lỗi Firebase:', error.code);
    }
    fetchError.value = `Không thể tải dữ liệu giao dịch: ${error.message || 'Lỗi không xác định'}`;
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
  margin-top: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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

.date-range label, .date-range .date-label {
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
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
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.add-button:hover {
  background-color: #45a049;
  box-shadow: 0 3px 7px rgba(0,0,0,0.15);
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

.transactions-summary {
  display: flex;
  justify-content: space-between;
  background-color: #f9f9f9;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 100px;
}

.summary-item span:first-child {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.summary-item span:last-child {
  font-weight: bold;
  font-size: 16px;
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

.loading-state, .empty-state {
  text-align: center;
  padding: 40px 0;
  color: #757575;
  font-style: italic;
}

.transactions-list {
  margin-top: 20px;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
  border-radius: 8px;
  margin-bottom: 8px;
}

.transaction-item:hover {
  background-color: #f9f9f9;
}

.transaction-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.transaction-date {
  font-size: 12px;
  color: #757575;
  margin-bottom: 4px;
}

.transaction-description {
  font-weight: 500;
  margin-bottom: 2px;
  font-size: 15px;
}

.transaction-category {
  font-size: 12px;
  color: #757575;
  background-color: #f0f0f0;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
  margin-top: 4px;
}

.transaction-amount {
  font-weight: bold;
  font-size: 16px;
  text-align: right;
  padding-left: 16px;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .filter-controls {
    min-width: 100%;
  }
  
  .filter-row {
    flex-direction: column;
    width: 100%;
  }
  
  .date-range, .type-filter {
    width: 100%;
    flex: none;
  }
  
  .date-label {
    display: none;
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
  
  .summary-item {
    flex: 1 0 30%;
  }
  
  .transaction-item {
    flex-direction: row;
    gap: 10px;
    padding: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    background-color: white;
  }
  
  .transaction-info {
    flex: 1;
  }
  
  .transaction-description {
    font-size: 14px;
  }
  
  .transaction-amount {
    align-self: center;
    min-width: auto;
    font-size: 14px;
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
</style> 