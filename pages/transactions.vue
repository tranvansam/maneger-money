<template>
  <div class="transactions-page">    
    <div v-if="!isInitialized || loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Đang tải dữ liệu...</div>
    </div>
    
    <div v-if="fetchError" class="error-overlay">
      <div class="error-content">
        <h3>Lỗi khi tải dữ liệu</h3>
        <p>{{ fetchError }}</p>
        <button @click="refreshData" class="retry-button">Thử lại</button>
      </div>
    </div>
    
    <TransactionList 
      ref="transactionListRef"
      @add-transaction="showAddTransactionModal = true" 
    />
    
    <!-- Hệ thống notification -->
    <div v-if="notification.show" class="notification" :class="notification.type">
      <div class="notification-content">
        <span v-if="notification.type === 'success'" class="notification-icon">✓</span>
        <span v-else class="notification-icon">✗</span>
        <p>{{ notification.message }}</p>
      </div>
    </div>
    
    <!-- Modal thêm giao dịch -->
    <div v-if="showAddTransactionModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header" :class="{ 'income-header': newTransaction.type === 'income', 'expense-header': newTransaction.type === 'expense' }">
          <h2>Thêm giao dịch</h2>
          <button @click="showAddTransactionModal = false" class="close-button">&times;</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="addTransaction">
            <div class="form-group">
              <label>Loại giao dịch</label>
              <div class="radio-group">
                <label 
                  class="radio-option" 
                  :class="{ 'income': newTransaction.type === 'income' }"
                >
                  <input 
                    type="radio" 
                    v-model="newTransaction.type" 
                    value="income"
                  />
                  <span>Thu nhập</span>
                </label>
                <label 
                  class="radio-option" 
                  :class="{ 'expense': newTransaction.type === 'expense' }"
                >
                  <input 
                    type="radio" 
                    v-model="newTransaction.type" 
                    value="expense"
                  />
                  <span>Chi tiêu</span>
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label>Số tiền (VND) <span class="required">*</span></label>
              <div class="amount-input">
                <input 
                  type="text" 
                  v-model="formattedAmount" 
                  @input="formatAmount" 
                  @blur="validateAmount"
                  required 
                  placeholder="0" 
                />
              </div>
            </div>
            
            <div class="form-group">
              <label>Ngày</label>
              <input type="date" v-model="newTransaction.date" required />
            </div>
            
            <div class="form-group">
              <label>Mô tả</label>
              <input type="text" v-model="newTransaction.description" />
            </div>
            
            <div class="form-group">
              <label>Danh mục <span class="required">*</span></label>
              <div class="category-select">
                <select v-model="newTransaction.category" required>
                  <option value="" disabled>Chọn danh mục</option>
                  <optgroup v-if="newTransaction.type === 'income'" label="Thu nhập">
                    <option v-for="cat in incomeCategories" :key="cat.id" :value="cat.id">
                      {{ cat.name }}
                    </option>
                  </optgroup>
                  <optgroup v-else label="Chi tiêu">
                    <option v-for="cat in expenseCategories" :key="cat.id" :value="cat.id">
                      {{ cat.name }}
                    </option>
                  </optgroup>
                </select>
                <button type="button" @click="openCategoryManager" class="manage-categories-icon" title="Quản lý danh mục">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </div>
        
        <div class="form-actions">
          <button type="button" @click="showAddTransactionModal = false" class="cancel-button">Hủy</button>
          <button type="submit" @click="addTransaction" class="submit-button" :disabled="modalLoading">
            {{ modalLoading ? 'Đang xử lý...' : 'Lưu giao dịch' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Category Manager Component -->
    <CategoryManager 
      ref="categoryManager" 
      @categories-updated="fetchCategories"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import { collection, addDoc, query, getDocs, where } from 'firebase/firestore';
import { db } from '~/plugins/firebase';
import { useAuth } from '~/composables/useAuth';
import TransactionList from '~/components/TransactionList.vue';
import { useRoute } from 'vue-router';
import CategoryManager from '~/components/CategoryManager.vue';

definePageMeta({
  middleware: 'auth'
});

const route = useRoute();
const { user } = useAuth();
const loading = ref(false);
const modalLoading = ref(false);
const isInitialized = ref(false);
const fetchError = ref(null);
const transactionListRef = ref(null);

// Trạng thái hiển thị modal
const showAddTransactionModal = ref(false);

// Transaction mới
const newTransaction = ref({
  type: 'expense',
  amount: '',
  date: formatDateForInput(new Date()),
  description: '',
  category: 'other_expense'
});

const formattedAmount = ref('');

// Thêm state cho notification
const notification = ref({
  show: false,
  message: '',
  type: 'success', // 'success' hoặc 'error'
  timeout: null
});

// Thêm ref cho CategoryManager
const categoryManager = ref(null);

// Danh mục mặc định hệ thống
const defaultCategories = {
  income: [
    { id: 'salary', name: 'Lương', type: 'income', isDefault: false },
    { id: 'bonus', name: 'Thưởng', type: 'income', isDefault: false },
    { id: 'investment', name: 'Đầu tư', type: 'income', isDefault: false },
    { id: 'gifts', name: 'Quà tặng', type: 'income', isDefault: false },
    { id: 'performance', name: 'Đi diễn', type: 'income', isDefault: false },
    { id: 'other_income', name: 'Khác', type: 'income', isDefault: true }
  ],
  expense: [
    { id: 'food', name: 'Ăn uống', type: 'expense', isDefault: false },
    { id: 'rent', name: 'Tiền nhà', type: 'expense', isDefault: false },
    { id: 'utilities', name: 'Hóa đơn dịch vụ', type: 'expense', isDefault: false },
    { id: 'transportation', name: 'Di chuyển', type: 'expense', isDefault: false },
    { id: 'entertainment', name: 'Giải trí', type: 'expense', isDefault: false },
    { id: 'shopping', name: 'Mua sắm', type: 'expense', isDefault: false },
    { id: 'healthcare', name: 'Y tế', type: 'expense', isDefault: false },
    { id: 'education', name: 'Giáo dục', type: 'expense', isDefault: false },
    { id: 'debt_payment', name: 'Trả nợ', type: 'expense', isDefault: false },
    { id: 'other_expense', name: 'Khác', type: 'expense', isDefault: true }
  ]
};

// Danh mục thu nhập và chi tiêu riêng biệt
const incomeCategories = ref([...defaultCategories.income]);
const expenseCategories = ref([...defaultCategories.expense]);

// Biến lưu danh mục mặc định hiện tại
const currentDefaultIncome = ref('other_income');
const currentDefaultExpense = ref('other_expense');

// Thêm watcher cho newTransaction.type
watch(() => newTransaction.value.type, (newType) => {
  // Khi chuyển type, set category mặc định tương ứng
  newTransaction.value.category = newType === 'income' 
    ? currentDefaultIncome.value 
    : currentDefaultExpense.value;
});

// Thêm watcher cho showAddTransactionModal
watch(() => showAddTransactionModal.value, async (isOpen) => {
  if (isOpen) {
    // Khi mở modal, fetch categories và set default dựa vào type hiện tại
    await fetchCategories();
    // Set category mặc định dựa vào type
    newTransaction.value.category = newTransaction.value.type === 'income' 
      ? currentDefaultIncome.value 
      : currentDefaultExpense.value;
  }
});

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

// Kiểm tra số tiền khi blur
const validateAmount = () => {
  if (!formattedAmount.value) {
    formattedAmount.value = '0';
    newTransaction.value.amount = 0;
  }
};

// Hàm định dạng số tiền khi nhập
const formatAmount = () => {
  // Loại bỏ tất cả các ký tự không phải số
  let value = formattedAmount.value.replace(/\D/g, '');
  
  // Định dạng số với dấu phân cách hàng nghìn
  if (value) {
    formattedAmount.value = new Intl.NumberFormat('vi-VN').format(parseInt(value));
    // Cập nhật giá trị thực cho newTransaction.amount
    newTransaction.value.amount = parseInt(value);
  } else {
    formattedAmount.value = '';
    newTransaction.value.amount = '';
  }
};

// Hàm hiển thị thông báo
const showNotification = (message, type = 'success') => {
  // Xóa timeout cũ nếu có
  if (notification.value.timeout) {
    clearTimeout(notification.value.timeout);
  }
  
  // Hiển thị thông báo mới
  notification.value = {
    show: true,
    message,
    type,
    timeout: setTimeout(() => {
      notification.value.show = false;
    }, 3000) // Tự động ẩn sau 3 giây
  };
};

// Thêm giao dịch mới
const addTransaction = async () => {
  console.log("addTransaction function called");
  if (!user.value) {
    console.error("Cannot add transaction: User not authenticated");
    showNotification('Vui lòng đăng nhập để thêm giao dịch', 'error');
    return;
  }
  
  if (!newTransaction.value.amount || !newTransaction.value.category) {
    showNotification('Vui lòng nhập đầy đủ số tiền và chọn danh mục', 'error');
    return;
  }
  
  modalLoading.value = true;
  
  try {
    console.log("Creating transaction with data:", newTransaction.value);
    
    // Đảm bảo date là đối tượng Date
    let transactionDate;
    try {
      transactionDate = new Date(newTransaction.value.date);
      transactionDate.setHours(new Date().getHours());
      transactionDate.setMinutes(new Date().getMinutes());
      transactionDate.setSeconds(new Date().getSeconds());
      
      if (isNaN(transactionDate.getTime())) {
        throw new Error("Invalid date");
      }
    } catch (error) {
      console.error("Error parsing date:", error);
      transactionDate = new Date(); // Sử dụng ngày hiện tại nếu có lỗi
    }
    
    // Đảm bảo amount là số
    const amount = parseInt(newTransaction.value.amount) || 0;
    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }
    
    const transactionData = {
      type: newTransaction.value.type,
      amount: amount,
      date: transactionDate,
      description: newTransaction.value.description || 'Không có mô tả',
      category: newTransaction.value.category,
      createdAt: new Date()
    };
    
    console.log("Saving transaction to Firestore:", transactionData);
    
    const docRef = await addDoc(
      collection(db, 'users', user.value.uid, 'transactions'),
      transactionData
    );
    
    console.log("Transaction added successfully with ID:", docRef.id);
    
    // Reset form
    newTransaction.value = {
      type: 'expense',
      amount: '',
      date: formatDateForInput(new Date()),
      description: '',
      category: 'other_expense'
    };
    formattedAmount.value = '';
    
    showAddTransactionModal.value = false;
    
    // Thông báo thành công
    showNotification('Thêm giao dịch thành công!');
    
    // Refresh danh sách giao dịch
    console.log("Refreshing transaction list after adding new transaction");
    setTimeout(() => {
      refreshData();
    }, 300);
  } catch (error) {
    console.error('Error adding transaction:', error);
    showNotification('Không thể thêm giao dịch mới: ' + (error.message || 'Lỗi không xác định'), 'error');
  } finally {
    modalLoading.value = false;
  }
};

// Thêm hàm này để yêu cầu tải lại dữ liệu
const refreshData = async () => {
  console.log("Refreshing transaction data...");
  
  // Đảm bảo chỉ refresh khi có user (đã đăng nhập)
  if (!user.value || !user.value.uid) {
    console.error("Cannot refresh data: No authenticated user");
    fetchError.value = "Không thể tải dữ liệu: Người dùng chưa đăng nhập";
    loading.value = false;
    return;
  }
  
  // Ngăn chặn nhiều request cùng một lúc
  if (loading.value) {
    console.log("Already loading data, skipping refresh request");
    return;
  }
  
  // Đánh dấu đang loading và xóa lỗi trước đó
  loading.value = true;
  fetchError.value = null;
  
  console.log("TransactionListRef exists:", !!transactionListRef.value);
  
  try {
    if (transactionListRef.value) {
      // Đảm bảo transactionListRef.value tồn tại và có hàm refreshData
      console.log("Calling TransactionList refreshData");
      
      try {
        // Gọi trực tiếp refreshData và đợi kết quả
        await transactionListRef.value.refreshData();
        console.log("Transaction list refreshed successfully");
      } catch (error) {
        console.error("Error from TransactionList.refreshData:", error);
        fetchError.value = `Lỗi khi tải dữ liệu: ${error.message || "Không xác định"}`;
      } finally {
        loading.value = false;
      }
    } else {
      console.error("Transaction list ref is not available");
      fetchError.value = "Không thể tải dữ liệu: Lỗi tham chiếu component";
      loading.value = false;
    }
  } catch (error) {
    console.error("Error refreshing transaction data:", error);
    fetchError.value = `Lỗi khi tải dữ liệu: ${error.message || "Không xác định"}`;
    loading.value = false;
  } finally {
    // Sau khi hoàn thành, đánh dấu đã khởi tạo
    isInitialized.value = true;
  }
};

// Khi component được mount, đánh dấu là đã khởi tạo
onMounted(() => {
  console.log("Transactions page mounted");
  
  // Đánh dấu đã khởi tạo ngay khi mount
  isInitialized.value = true;
  
  // Đặt timeout để đảm bảo TransactionList component đã được render
  if (user.value && user.value.uid) {
    console.log("User already authenticated, initializing data on transactions page");
    // Đợi cho component được render đầy đủ
    setTimeout(() => {
      refreshData();
    }, 200);
  } else {
    console.log("Waiting for user authentication before loading data");
  }

  // Gọi fetchCategories khi component được mount
  fetchCategories();
});

// Watch cho user authentication status - với immediate: false để tránh chạy ngay
watch(user, (newUser) => {
  console.log("User auth state changed in transactions page:", newUser?.uid);
  if (newUser && newUser.uid && !loading.value) {
    console.log("User now authenticated, loading data on transactions page");
    // Đợi cho component được render đầy đủ
    setTimeout(() => {
      refreshData();
    }, 200);
  }
}, { immediate: false });

// Watch for route changes 
let lastPath = route.path;
watch(() => route.path, (newPath) => {
  console.log("Route changed from", lastPath, "to", newPath);
  
  // Chỉ refresh khi đến route 'transactions' từ một route khác
  if (newPath === '/transactions' && lastPath !== '/transactions') {
    console.log("Navigated to transactions page, refreshing data");
    
    // Chỉ refresh khi có user đăng nhập
    if (user.value && user.value.uid && !loading.value) {
      // Đợi cho component được render đầy đủ
      setTimeout(() => {
        refreshData();
      }, 200);
    }
  }
  
  lastPath = newPath;
});

// Hàm mở quản lý danh mục
const openCategoryManager = () => {
  if (categoryManager.value) {
    categoryManager.value.openModal(newTransaction.value.type);
  }
};

// Hàm lấy danh sách danh mục
const fetchCategories = async () => {
  if (!user.value) return;

  try {
    console.log('Fetching categories for user:', user.value.uid);
    
    // Lấy danh mục người dùng từ Firestore
    const q = query(
      collection(db, 'users', user.value.uid, 'categories')
    );
    const querySnapshot = await getDocs(q);
    
    // Lấy danh mục từ Firestore và phân loại
    const userCategories = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      isUserDefined: true // Đánh dấu là danh mục người dùng
    }));
    
    console.log('User categories from Firestore:', userCategories);

    // Phân loại danh mục người dùng
    const userIncomeCategories = userCategories
      .filter(cat => cat.type === 'income')
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        type: 'income',
        isDefault: cat.isDefault || false,
        isUserDefined: true
      }));
    
    const userExpenseCategories = userCategories
      .filter(cat => cat.type === 'expense')
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        type: 'expense',
        isDefault: cat.isDefault || false,
        isUserDefined: true
      }));

    // Tìm danh mục mặc định từ danh mục người dùng
    const defaultIncome = userIncomeCategories.find(cat => cat.isDefault);
    const defaultExpense = userExpenseCategories.find(cat => cat.isDefault);

    // Cập nhật trạng thái mặc định cho danh mục hệ thống
    const systemIncomeCategories = defaultCategories.income.map(cat => ({
      ...cat,
      isDefault: !defaultIncome && cat.id === 'other_income',
      isUserDefined: false
    }));
    
    const systemExpenseCategories = defaultCategories.expense.map(cat => ({
      ...cat,
      isDefault: !defaultExpense && cat.id === 'other_expense',
      isUserDefined: false
    }));

    // Kết hợp danh mục người dùng và hệ thống
    incomeCategories.value = [...userIncomeCategories, ...systemIncomeCategories];
    expenseCategories.value = [...userExpenseCategories, ...systemExpenseCategories];

    // Cập nhật danh mục mặc định hiện tại
    if (defaultIncome) {
      currentDefaultIncome.value = defaultIncome.id;
    } else {
      currentDefaultIncome.value = 'other_income';
    }

    if (defaultExpense) {
      currentDefaultExpense.value = defaultExpense.id;
    } else {
      currentDefaultExpense.value = 'other_expense';
    }

    // Cập nhật category cho transaction hiện tại nếu đang mở modal
    if (showAddTransactionModal.value) {
      newTransaction.value.category = newTransaction.value.type === 'income'
        ? currentDefaultIncome.value
        : currentDefaultExpense.value;
    }

    console.log('Final categories:', {
      income: incomeCategories.value,
      expense: expenseCategories.value
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    showNotification('Không thể tải danh sách danh mục', 'error');
  }
};

// Thêm watcher để fetch categories khi component được mount và khi modal mở
watch([showAddTransactionModal, user], async ([isOpen, currentUser]) => {
  if (isOpen && currentUser) {
    console.log('Modal opened or user changed, fetching categories...');
    await fetchCategories();
  }
}, { immediate: true });
</script>

<style scoped>
.transactions-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

.page-title {
  font-size: 24px;
  margin-bottom: 20px;
  color: #333;
  border-left: 4px solid #4CAF50;
  padding-left: 10px;
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
.form-group select,
.form-group textarea {
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

@media (max-width: 768px) {
  .transactions-page {
    padding: 15px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .radio-group {
    flex-direction: row;
  }
  
  .form-actions {
    flex-direction: row;
    justify-content: space-between;
  }
  
  .cancel-button, 
  .submit-button {
    flex: 1;
  }
}

/* Thiết kế notification */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  min-width: 300px;
  max-width: 400px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateX(0);
  animation: slideIn 0.3s ease forwards;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification.success {
  background-color: #e8f5e9;
  border-left: 4px solid #4CAF50;
}

.notification.error {
  background-color: #ffebee;
  border-left: 4px solid #f44336;
}

.notification-content {
  padding: 16px;
  display: flex;
  align-items: center;
}

.notification-icon {
  margin-right: 12px;
  font-size: 20px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success .notification-icon {
  color: #4CAF50;
}

.error .notification-icon {
  color: #f44336;
}

.notification p {
  margin: 0;
  font-size: 14px;
  color: #333;
}

/* Responsive styles */
@media (max-width: 768px) {
  .notification {
    top: auto;
    bottom: 20px;
    left: 20px;
    right: 20px;
    min-width: auto;
  }
}

.category-select {
  display: flex;
  gap: 10px;
  align-items: center;
}

.category-select select {
  flex: 1;
}

.manage-categories-button {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.manage-categories-button:hover {
  background-color: #1976D2;
}

@media (max-width: 768px) {
  .category-select {
    flex-direction: column;
  }
  
  .manage-categories-button {
    width: 100%;
  }
}

.manage-categories-icon {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  transition: all 0.3s ease;
  color: #666;
  background-color: #f5f5f5;
}

.manage-categories-icon:hover {
  transform: rotate(90deg);
  background-color: #e8f5e9;
  color: #2E7D32;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

@media (max-width: 768px) {
  .category-select {
    flex-direction: row;
  }
  
  .manage-categories-icon {
    width: 32px;
    height: 32px;
    font-size: 18px;
  }
}
</style> 