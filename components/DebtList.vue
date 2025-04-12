<template>
  <div class="debt-section">
    <h2 class="section-title">{{ sectionTitle }}</h2>
    
    <!-- Thông báo khoản nợ đến hạn và quá hạn -->
    <div v-if="hasNotifications" class="notification-container">
      <div v-if="dueStatusCounts.overdue > 0" class="notification overdue">
        <span class="notification-icon">⚠️</span>
        <span class="notification-text">
          <strong>{{ dueStatusCounts.overdue }}</strong> khoản nợ đã quá hạn và chưa thanh toán
        </span>
      </div>
      
      <div v-if="dueStatusCounts.dueToday > 0" class="notification due-today">
        <span class="notification-icon">📅</span>
        <span class="notification-text">
          <strong>{{ dueStatusCounts.dueToday }}</strong> khoản nợ đến hạn hôm nay
        </span>
      </div>
      
      <div v-if="dueStatusCounts.dueSoon > 0" class="notification due-soon">
        <span class="notification-icon">⏰</span>
        <span class="notification-text">
          <strong>{{ dueStatusCounts.dueSoon }}</strong> khoản nợ sẽ đến hạn trong 3 ngày tới
        </span>
      </div>
    </div>
    
    <!-- Bộ lọc theo tháng -->
    <div class="filter-controls">
      <div class="month-filter">
        <button 
          @click="previousMonth" 
          class="month-nav-button"
          title="Tháng trước"
        >&lt;</button>
        <span class="current-month">{{ displayMonth }}</span>
        <button 
          @click="nextMonth" 
          class="month-nav-button"
          title="Tháng sau"
        >&gt;</button>
      </div>
    </div>
    
    <div v-if="loading" class="loading-state">
      Đang tải dữ liệu...
    </div>
    
    <div v-else-if="debts.length === 0" class="empty-state">
      <span v-if="props.filterType === 'owed'">Không có khoản nợ nào trong tháng này</span>
      <span v-else-if="props.filterType === 'lent'">Không có khoản cho mượn nào trong tháng này</span>
      <span v-else>Không có khoản nợ nào trong tháng này</span>
      <button @click="showAddDebtModal = true" class="add-small-button">
        <span v-if="props.filterType === 'lent'">Thêm khoản cho mượn</span>
        <span v-else>Thêm khoản nợ</span>
      </button>
    </div>
    
    <div v-else>
      <div class="debt-header">
        <div class="debt-actions">
          <button @click="showAddDebtModal = true" class="add-debt-button">
            <span>+</span> 
            <span v-if="props.filterType === 'lent'">Thêm khoản cho mượn</span>
            <span v-else>Thêm khoản nợ</span>
          </button>
        </div>
        
        <div class="debt-summary">
          <div class="summary-item">
            <span v-if="props.filterType === 'lent'">Tổng cho mượn:</span>
            <span v-else>Tổng nợ:</span>
            <span class="expense">{{ formatCurrency(totalDebt) }}</span>
          </div>
          <div class="summary-item">
            <span v-if="props.filterType === 'lent'">Đã thu hồi:</span>
            <span v-else>Đã trả:</span>
            <span class="income">{{ formatCurrency(paidDebt) }}</span>
          </div>
          <div class="summary-item">
            <span>Còn lại:</span>
            <span class="expense">{{ formatCurrency(remainingDebt) }}</span>
          </div>
        </div>
      </div>
      
      <div class="debt-list">
        <div v-for="debt in debts" :key="debt.id + (debt.isRecurring ? getMonthKey(selectedMonth.value) : '')" 
             class="debt-item" 
             :class="{ 
               'paid': isPaid(debt), 
               'recurring': debt.isRecurring,
               'lent': debt.debtType === 'lent',
               'overdue': checkDueStatus(debt) === 'overdue',
               'due-today': checkDueStatus(debt) === 'due-today',
               'due-soon': checkDueStatus(debt) === 'due-soon'
             }">
          <div class="debt-info">
            <div class="debt-checkbox">
              <input 
                type="checkbox" 
                :checked="isPaid(debt)" 
                @change="showConfirmToggle(debt)"
                :id="`debt-${debt.id}-${debt.isRecurring ? getMonthKey(selectedMonth.value) : ''}`"
              />
              <label :for="`debt-${debt.id}-${debt.isRecurring ? getMonthKey(selectedMonth.value) : ''}`"></label>
            </div>
            <div class="debt-details">
              <div class="debt-description">
                <span v-if="debt.debtType === 'lent'" class="debt-type-tag lent-tag">Cho mượn</span>
                <span v-else class="debt-type-tag owed-tag">Nợ</span>
                {{ debt.description }}
                <span v-if="debt.isRecurring" class="recurring-badge" title="Khoản trả góp định kỳ">
                  <i>⟳</i>
                </span>
                <span v-if="checkDueStatus(debt) === 'overdue'" class="due-status-badge overdue" title="Đã quá hạn">
                  ⚠️
                </span>
                <span v-else-if="checkDueStatus(debt) === 'due-today'" class="due-status-badge due-today" title="Đến hạn hôm nay">
                  📅
                </span>
                <span v-else-if="checkDueStatus(debt) === 'due-soon'" class="due-status-badge due-soon" title="Sắp đến hạn">
                  ⏰
                </span>
              </div>
              <div class="debt-date">Đến hạn: {{ formatDate(debt.dueDate) }}</div>
              <div v-if="debt.isRecurring && debt.endDate" class="debt-end-date">
                Kết thúc: {{ formatDate(debt.endDate) }}
              </div>
              <div class="debt-creditor">{{ debt.debtType === 'lent' ? 'Người mượn' : 'Chủ nợ' }}: {{ debt.creditor }}</div>
              <div v-if="debt.isRecurring && debt.totalAmount" class="debt-total-amount">
                Tổng khoản vay: <span class="total-amount-value">{{ formatCurrency(debt.totalAmount) }}</span>
              </div>
            </div>
          </div>
          <div class="debt-amount-container">
            <div v-if="isPaid(debt)" class="paid-label">
              {{ debt.debtType === 'lent' ? 'Đã thu' : 'Đã trả' }}
            </div>
            <div class="debt-amount" :class="{'lent-amount': debt.debtType === 'lent'}">
              {{ formatCurrency(debt.amount) }}
              <div v-if="debt.isRecurring" class="monthly-label">hàng tháng</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal thêm khoản nợ -->
    <div v-if="showAddDebtModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2 v-if="newDebt.debtType === 'lent'">Thêm khoản cho mượn</h2>
          <h2 v-else>Thêm khoản nợ</h2>
          <button @click="showAddDebtModal = false" class="close-button">&times;</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="addDebt">
            <div v-if="props.filterType === null" class="form-group">
              <label>Loại nợ <span class="required">*</span></label>
              <div class="debt-type-selector">
                <div 
                  class="debt-type-option" 
                  :class="{'selected': newDebt.debtType === 'owed'}"
                  @click="newDebt.debtType = 'owed'"
                >
                  <span class="debt-type-icon">💸</span>
                  <span class="debt-type-text">Tôi nợ</span>
                </div>
                <div 
                  class="debt-type-option" 
                  :class="{'selected': newDebt.debtType === 'lent'}"
                  @click="newDebt.debtType = 'lent'"
                >
                  <span class="debt-type-icon">💰</span>
                  <span class="debt-type-text">Tôi cho mượn</span>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label>Mô tả <span class="required">*</span></label>
              <input type="text" v-model="newDebt.description" required placeholder="Ví dụ: Trả góp mua xe" />
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
              <label>Ngày đến hạn <span class="required">*</span></label>
              <input type="date" v-model="newDebt.dueDate" required />
            </div>
            
            <div class="form-group recurring-group">
              <div class="checkbox-wrapper">
                <input type="checkbox" id="isRecurring" v-model="newDebt.isRecurring" />
                <label for="isRecurring">Trả góp định kỳ hàng tháng</label>
              </div>
              
              <div v-if="newDebt.isRecurring" class="recurring-options">
                <div class="form-group">
                  <label>Tổng số tiền vay <span class="required">*</span></label>
                  <div class="amount-input">
                    <input 
                      type="text" 
                      v-model="formattedTotalAmount" 
                      @input="formatTotalAmount" 
                      @blur="validateTotalAmount"
                      required 
                      placeholder="0" 
                    />
                  </div>
                </div>
                <div class="form-group">
                  <label>Ngày kết thúc</label>
                  <input type="date" v-model="newDebt.endDate" :min="newDebt.dueDate" />
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label>{{ newDebt.debtType === 'lent' ? 'Người mượn' : 'Chủ nợ' }}</label>
              <input type="text" v-model="newDebt.creditor" :placeholder="newDebt.debtType === 'lent' ? 'Tên người mượn tiền' : 'Tên người/tổ chức cho vay'" />
            </div>
            
            <div class="form-group">
              <label>Ghi chú</label>
              <textarea v-model="newDebt.notes" placeholder="Ghi chú thêm về khoản nợ"></textarea>
            </div>
          </form>
        </div>
        
        <div class="form-actions">
          <button type="button" @click="showAddDebtModal = false" class="cancel-button">Hủy</button>
          <button type="submit" @click="addDebt" class="submit-button" :disabled="modalLoading">
            {{ modalLoading ? 'Đang xử lý...' : (newDebt.debtType === 'lent' ? 'Lưu khoản cho mượn' : 'Lưu khoản nợ') }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Modal xác nhận đánh dấu đã trả/đã thu -->
    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal confirm-modal">
        <div class="modal-header">
          <h2>Xác nhận</h2>
          <button @click="showConfirmModal = false" class="close-button">&times;</button>
        </div>
        
        <div class="modal-body">
          <p v-if="selectedDebt">
            <span v-if="isPaid(selectedDebt)">
              Bạn có chắc muốn đánh dấu khoản 
              <strong>{{ selectedDebt.description }}</strong> 
              là <strong>chưa {{ selectedDebt.debtType === 'lent' ? 'thu' : 'trả' }}</strong>?
            </span>
            <span v-else>
              Bạn có chắc muốn đánh dấu khoản 
              <strong>{{ selectedDebt.description }}</strong> 
              là <strong>đã {{ selectedDebt.debtType === 'lent' ? 'thu' : 'trả' }}</strong>?
              
              <span v-if="!isPaid(selectedDebt) && selectedDebt.debtType === 'lent'" class="confirm-note">
                Thao tác này sẽ tạo một khoản thu nhập tương ứng.
              </span>
              <span v-if="!isPaid(selectedDebt) && selectedDebt.debtType === 'owed'" class="confirm-note">
                Thao tác này sẽ tạo một khoản chi tiêu tương ứng.
              </span>
            </span>
          </p>
        </div>
        
        <div class="form-actions">
          <button type="button" @click="showConfirmModal = false" class="cancel-button">Hủy</button>
          <button 
            type="button" 
            @click="confirmToggleDebtStatus" 
            class="submit-button" 
            :class="{'income-button': selectedDebt && selectedDebt.debtType === 'lent', 'expense-button': selectedDebt && selectedDebt.debtType === 'owed'}"
          >
            {{ selectedDebt && isPaid(selectedDebt) ? 'Đánh dấu chưa hoàn thành' : 'Xác nhận' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '~/plugins/firebase';
import { useAuth } from '~/composables/useAuth';

const props = defineProps({
  filterType: {
    type: String,
    default: null, // 'owed' hoặc 'lent', nếu null thì hiển thị tất cả
    validator: (value) => value === null || value === 'owed' || value === 'lent'
  }
});

const emit = defineEmits(['debt-toggled', 'debt-added']);

const { user } = useAuth();
const loading = ref(false);
const modalLoading = ref(false);
const debts = ref([]);
const showAddDebtModal = ref(false);
const showConfirmModal = ref(false);
const selectedDebt = ref(null);

// Format hiển thị số tiền
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Format hiển thị ngày
const formatDate = (timestamp) => {
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// Thêm thông tin về các tháng đã thanh toán
const newDebt = ref({
  description: '',
  amount: '',
  totalAmount: '',
  dueDate: formatDateForInput(new Date()),
  creditor: '',
  notes: '',
  paid: false,
  isRecurring: false,
  endDate: '',
  debtType: 'owed', // 'owed' = tôi nợ, 'lent' = tôi cho mượn
  paidMonths: {} // object lưu trạng thái thanh toán theo tháng: { "2023-05": true, "2023-06": true }
});

// Biến quản lý tháng hiện tại để lọc
const selectedMonth = ref(new Date());

// Tính toán hiển thị tháng hiện tại
const displayMonth = computed(() => {
  const months = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  
  return `${months[selectedMonth.value.getMonth()]} ${selectedMonth.value.getFullYear()}`;
});

// Chuyển đến tháng trước
const previousMonth = () => {
  const newDate = new Date(selectedMonth.value);
  newDate.setMonth(newDate.getMonth() - 1);
  selectedMonth.value = newDate;
  fetchDebts();
};

// Chuyển đến tháng sau
const nextMonth = () => {
  const newDate = new Date(selectedMonth.value);
  newDate.setMonth(newDate.getMonth() + 1);
  selectedMonth.value = newDate;
  fetchDebts();
};

// Biến lưu số tiền định dạng
const formattedAmount = ref('');

// Hàm định dạng số tiền khi nhập
const formatAmount = () => {
  // Loại bỏ tất cả các ký tự không phải số
  let value = formattedAmount.value.replace(/\D/g, '');
  
  // Định dạng số với dấu phân cách hàng nghìn
  if (value) {
    formattedAmount.value = new Intl.NumberFormat('vi-VN').format(parseInt(value));
    // Cập nhật giá trị thực cho newDebt.amount
    newDebt.value.amount = parseInt(value);
  } else {
    formattedAmount.value = '';
    newDebt.value.amount = '';
  }
};

// Kiểm tra số tiền khi blur
const validateAmount = () => {
  if (!formattedAmount.value) {
    formattedAmount.value = '0';
    newDebt.value.amount = 0;
  }
};

// Biến lưu tổng số tiền vay định dạng
const formattedTotalAmount = ref('');

// Hàm định dạng tổng số tiền vay khi nhập
const formatTotalAmount = () => {
  // Loại bỏ tất cả các ký tự không phải số
  let value = formattedTotalAmount.value.replace(/\D/g, '');
  
  // Định dạng số với dấu phân cách hàng nghìn
  if (value) {
    formattedTotalAmount.value = new Intl.NumberFormat('vi-VN').format(parseInt(value));
    // Cập nhật giá trị thực cho newDebt.totalAmount
    newDebt.value.totalAmount = parseInt(value);
  } else {
    formattedTotalAmount.value = '';
    newDebt.value.totalAmount = '';
  }
};

// Kiểm tra tổng số tiền vay khi blur
const validateTotalAmount = () => {
  if (!formattedTotalAmount.value) {
    formattedTotalAmount.value = '0';
    newDebt.value.totalAmount = 0;
  }
};

// Tính toán tổng nợ
const totalDebt = computed(() => {
  return debts.value.reduce((sum, debt) => sum + (parseFloat(debt.amount) || 0), 0);
});

// Hàm kiểm tra trạng thái đã thanh toán, xét cả trường hợp khoản nợ định kỳ
const isPaid = (debt) => {
  if (debt.isRecurring) {
    const currentMonthKey = getMonthKey(selectedMonth.value);
    return debt.paidMonths && debt.paidMonths[currentMonthKey] === true;
  }
  return debt.paid;
};

// Sửa cách tính toán tổng tiền đã trả và còn lại
const paidDebt = computed(() => {
  return debts.value
    .filter(debt => isPaid(debt))
    .reduce((sum, debt) => sum + (parseFloat(debt.amount) || 0), 0);
});

// Tính toán số nợ còn lại
const remainingDebt = computed(() => {
  return totalDebt.value - paidDebt.value;
});

// Tạo key tháng-năm cho việc đánh dấu thanh toán
const getMonthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Cập nhật tiêu đề dựa trên filterType
const sectionTitle = computed(() => {
  if (props.filterType === 'owed') {
    return 'Danh sách nợ cần trả';
  } else if (props.filterType === 'lent') {
    return 'Danh sách cho mượn';
  }
  return 'Danh sách khoản nợ';
});

// Sửa newDebt để mặc định theo loại được chọn
const resetNewDebt = () => {
  // Xác định debtType dựa vào filterType
  const debtType = props.filterType || 'owed';
  
  newDebt.value = {
    description: '',
    amount: '',
    totalAmount: '',
    dueDate: formatDateForInput(new Date()),
    creditor: '',
    notes: '',
    paid: false,
    isRecurring: false,
    endDate: '',
    debtType: debtType,
    paidMonths: {}
  };
  
  formattedAmount.value = '';
  formattedTotalAmount.value = '';
};

// Lấy danh sách nợ
const fetchDebts = async () => {
  if (!user.value || !user.value.uid) {
    console.log("Không thể lấy danh sách nợ: User chưa được xác thực");
    return;
  }
  
  loading.value = true;
  
  try {
    // Lấy khoảng thời gian của tháng đã chọn
    const firstDayOfMonth = new Date(selectedMonth.value.getFullYear(), selectedMonth.value.getMonth(), 1);
    const lastDayOfMonth = new Date(selectedMonth.value.getFullYear(), selectedMonth.value.getMonth() + 1, 0, 23, 59, 59);
    
    console.log("Lấy danh sách nợ của user:", user.value.uid);
    console.log("Tháng đã chọn:", `${selectedMonth.value.getMonth() + 1}/${selectedMonth.value.getFullYear()}`);
    console.log("Lọc theo loại:", props.filterType || "Tất cả");
    
    try {
      // Tạo Map để tránh trùng lặp
      const debtMap = new Map();
      
      // Truy vấn cơ bản
      let baseQuery = query(
        collection(db, 'users', user.value.uid, 'debts')
      );
      
      // Truy vấn lọc theo loại nợ (nếu có)
      let typeFilteredQuery = baseQuery;
      if (props.filterType === 'owed' || props.filterType === 'lent') {
        typeFilteredQuery = query(
          baseQuery,
          where('debtType', '==', props.filterType)
        );
      }
      
      // Truy vấn 1: Lấy khoản nợ có ngày đến hạn trong tháng đã chọn
      let q1 = query(
        typeFilteredQuery,
        where('dueDate', '>=', Timestamp.fromDate(firstDayOfMonth)),
        where('dueDate', '<=', Timestamp.fromDate(lastDayOfMonth)),
        orderBy('dueDate', 'asc')
      );
      
      const querySnapshot1 = await getDocs(q1);
      
      // Xử lý khoản nợ thông thường
      querySnapshot1.forEach((doc) => {
        const data = doc.data();
        // Đảm bảo dueDate là đối tượng Date
        const dueDate = data.dueDate instanceof Timestamp ? data.dueDate.toDate() : new Date(data.dueDate);
        const endDate = data.endDate instanceof Timestamp ? data.endDate.toDate() : 
                        data.endDate ? new Date(data.endDate) : null;
        
        debtMap.set(doc.id, {
          id: doc.id,
          ...data,
          dueDate: dueDate,
          endDate: endDate
        });
      });
      
      // Truy vấn 2: Lấy tất cả khoản nợ định kỳ và lọc ở client
      let q2 = typeFilteredQuery;
      
      if (props.filterType) {
        q2 = query(
          q2,
          where('isRecurring', '==', true)
        );
      } else {
        q2 = query(
          q2,
          where('isRecurring', '==', true)
        );
      }
      
      const querySnapshot2 = await getDocs(q2);
      
      // Xử lý khoản nợ định kỳ
      querySnapshot2.forEach((doc) => {
        if (!debtMap.has(doc.id)) {
          const data = doc.data();
          const originalDueDate = data.dueDate instanceof Timestamp ? data.dueDate.toDate() : new Date(data.dueDate);
          const endDate = data.endDate instanceof Timestamp ? data.endDate.toDate() : 
                          data.endDate ? new Date(data.endDate) : null;
          
          // Bỏ qua các khoản nợ định kỳ đã kết thúc
          if (!endDate || endDate < firstDayOfMonth) {
            return;
          }
          
          // Tính toán đến hạn trong tháng hiện tại (giữ nguyên ngày, chỉ thay đổi tháng/năm)
          let currentDueDate = new Date(originalDueDate);
          
          // Điều chỉnh ngày đến hạn để phù hợp với tháng được chọn
          while (currentDueDate < firstDayOfMonth && currentDueDate < endDate) {
            currentDueDate.setMonth(currentDueDate.getMonth() + 1);
          }
          
          // Nếu ngày đến hạn trong tháng này và chưa quá ngày kết thúc
          if (currentDueDate >= firstDayOfMonth && 
              currentDueDate <= lastDayOfMonth && 
              currentDueDate <= endDate) {
                
            // Đảm bảo paidMonths tồn tại
            const paidMonths = data.paidMonths || {};
            
            debtMap.set(doc.id, {
              id: doc.id,
              ...data,
              dueDate: currentDueDate,
              endDate: endDate,
              paidMonths: paidMonths
            });
          }
        }
      });
      
      // Chuyển Map thành mảng và sắp xếp theo ngày đến hạn
      const results = Array.from(debtMap.values())
        .sort((a, b) => a.dueDate - b.dueDate);
      
      console.log("Tổng số khoản nợ:", results.length);
      debts.value = results;
    } catch (error) {
      console.error('Lỗi truy vấn Firestore:', error);
    }
  } catch (error) {
    console.error('Lỗi khi lấy danh sách nợ:', error);
  } finally {
    loading.value = false;
  }
};

// Thêm khoản nợ mới
const addDebt = async () => {
  if (!user.value) {
    alert('Bạn cần đăng nhập để thêm khoản nợ');
    return;
  }
  
  if (!newDebt.value.description || !newDebt.value.amount || !newDebt.value.dueDate) {
    alert('Vui lòng nhập đầy đủ thông tin cần thiết');
    return;
  }
  
  // Kiểm tra nếu là định kỳ thì phải có ngày kết thúc
  if (newDebt.value.isRecurring && !newDebt.value.endDate) {
    alert('Khoản nợ định kỳ cần có ngày kết thúc');
    return;
  }
  
  // Kiểm tra nếu là khoản trả góp định kỳ thì phải có tổng số tiền vay
  if (newDebt.value.isRecurring && !newDebt.value.totalAmount) {
    alert('Vui lòng nhập tổng số tiền vay cho khoản trả góp định kỳ');
    return;
  }
  
  modalLoading.value = true;
  
  try {
    console.log("Thêm khoản nợ cho user:", user.value.uid);
    
    // Chuyển đổi dueDate thành Timestamp
    const dueDateTimestamp = Timestamp.fromDate(new Date(newDebt.value.dueDate));
    
    // Tạo dữ liệu khoản nợ
    const debtData = {
      description: newDebt.value.description,
      amount: parseFloat(newDebt.value.amount),
      totalAmount: parseFloat(newDebt.value.totalAmount),
      dueDate: dueDateTimestamp,
      creditor: newDebt.value.creditor || 'Không xác định',
      notes: newDebt.value.notes || '',
      paid: false,
      isRecurring: newDebt.value.isRecurring,
      debtType: newDebt.value.debtType, // Thêm trường debtType
      createdAt: Timestamp.now(),
      userId: user.value.uid,
      paidMonths: {} // Khởi tạo object lưu trạng thái thanh toán theo tháng
    };
    
    // Thêm endDate nếu là khoản nợ định kỳ
    if (newDebt.value.isRecurring && newDebt.value.endDate) {
      debtData.endDate = Timestamp.fromDate(new Date(newDebt.value.endDate));
    }
    
    console.log("Dữ liệu khoản nợ:", debtData);
    
    // Thêm khoản nợ vào Firestore
    const debtRef = await addDoc(
      collection(db, 'users', user.value.uid, 'debts'),
      debtData
    );
    
    // Nếu là khoản "cho mượn", thêm giao dịch chi tiêu
    if (newDebt.value.debtType === 'lent') {
      const transactionData = {
        type: 'expense',
        amount: parseFloat(newDebt.value.amount),
        date: Timestamp.now(),
        description: `Cho mượn: ${newDebt.value.description}`,
        category: 'lending',
        notes: `Cho ${newDebt.value.creditor} mượn. Ghi chú: ${newDebt.value.notes}`,
        createdAt: Timestamp.now(),
        userId: user.value.uid,
        debtId: debtRef.id // Liên kết với khoản nợ
      };
      
      await addDoc(
        collection(db, 'users', user.value.uid, 'transactions'),
        transactionData
      );
      
      console.log("Đã thêm giao dịch chi tiêu cho khoản cho mượn");
    }
    
    // Thông báo cho components cha khi thêm nợ thành công
    emit('debt-added', {
      id: debtRef.id,
      ...debtData
    });
    
    // Reset form
    resetNewDebt();
    formattedAmount.value = '';
    formattedTotalAmount.value = '';
    
    showAddDebtModal.value = false;
    
    // Cập nhật lại danh sách
    await fetchDebts();
  } catch (error) {
    console.error('Lỗi khi thêm khoản nợ:', error);
    alert(`Không thể thêm khoản nợ mới: ${error.message}`);
  } finally {
    modalLoading.value = false;
  }
};

// Cập nhật trạng thái khoản nợ (đã trả hay chưa)
const toggleDebtStatus = async (debt) => {
  if (!user.value) {
    alert('Bạn cần đăng nhập để cập nhật khoản nợ');
    return;
  }
  
  try {
    console.log("Cập nhật trạng thái khoản nợ:", debt.id);
    const debtRef = doc(db, 'users', user.value.uid, 'debts', debt.id);
    
    // Xác định tháng hiện tại đang xem
    const currentMonthKey = getMonthKey(selectedMonth.value);
    
    // Xác định trạng thái mới (ngược với trạng thái hiện tại)
    let newPaidStatus = false;
    
    if (debt.isRecurring) {
      // Đối với khoản nợ định kỳ, chỉ cập nhật trạng thái của tháng hiện tại
      const paidMonths = debt.paidMonths || {};
      newPaidStatus = !paidMonths[currentMonthKey]; // Đảo trạng thái hiện tại
      
      // Cập nhật trạng thái thanh toán cho tháng hiện tại
      paidMonths[currentMonthKey] = newPaidStatus;
      
      await updateDoc(debtRef, {
        paidMonths: paidMonths,
        updatedAt: Timestamp.now()
      });
    } else {
      // Đối với khoản nợ thông thường, cập nhật trường paid
      newPaidStatus = !debt.paid;
      
      await updateDoc(debtRef, {
        paid: newPaidStatus,
        updatedAt: Timestamp.now()
      });
    }
    
    // Nếu đánh dấu đã trả/đã thu hồi, thêm giao dịch vào hệ thống
    if (newPaidStatus) {
      const isLent = debt.debtType === 'lent';
      
      const transactionData = {
        type: isLent ? 'income' : 'expense', // Thu hồi nợ là "income", trả nợ là "expense"
        amount: parseFloat(debt.amount),
        date: Timestamp.now(),
        description: isLent 
          ? `Thu hồi nợ: ${debt.description}${debt.isRecurring ? ` (tháng ${selectedMonth.value.getMonth() + 1}/${selectedMonth.value.getFullYear()})` : ''}`
          : `Trả nợ: ${debt.description}${debt.isRecurring ? ` (tháng ${selectedMonth.value.getMonth() + 1}/${selectedMonth.value.getFullYear()})` : ''}`,
        category: isLent ? 'debt_repayment' : 'debt_payment',
        notes: isLent 
          ? `Thu hồi khoản nợ từ ${debt.creditor}. Ghi chú gốc: ${debt.notes}`
          : `Thanh toán khoản nợ cho ${debt.creditor}. Ghi chú gốc: ${debt.notes}`,
        createdAt: Timestamp.now(),
        userId: user.value.uid,
        debtId: debt.id // Liên kết với khoản nợ
      };
      
      await addDoc(
        collection(db, 'users', user.value.uid, 'transactions'),
        transactionData
      );
      
      console.log(`Đã thêm giao dịch ${isLent ? 'thu nhập' : 'chi tiêu'} ${debt.isRecurring ? `cho tháng ${currentMonthKey}` : ''}`);
    }
    
    // Emit event khi trạng thái nợ được cập nhật
    emit('debt-toggled', debt, newPaidStatus);
    
    console.log("Cập nhật trạng thái thành công");
    
    // Cập nhật lại danh sách
    await fetchDebts();
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái khoản nợ:', error);
    alert(`Không thể cập nhật trạng thái khoản nợ: ${error.message}`);
  }
};

// Hiển thị modal xác nhận khi thay đổi trạng thái khoản nợ
const showConfirmToggle = (debt) => {
  selectedDebt.value = debt;
  showConfirmModal.value = true;
};

// Xác nhận thay đổi trạng thái
const confirmToggleDebtStatus = async () => {
  if (!selectedDebt.value) return;
  
  // Lưu tạm selectedDebt để sử dụng sau khi đóng modal
  const debtToToggle = selectedDebt.value;
  
  // Đóng modal ngay lập tức để cải thiện trải nghiệm người dùng
  showConfirmModal.value = false;
  selectedDebt.value = null;
  
  // Sau đó mới thực hiện thay đổi trạng thái
  await toggleDebtStatus(debtToToggle);
};

// Kiểm tra trạng thái hạn chót của khoản nợ
const checkDueStatus = (debt) => {
  if (isPaid(debt)) return 'paid'; // Nếu đã thanh toán, không cần cảnh báo
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset giờ về 00:00:00
  
  const dueDate = new Date(debt.dueDate);
  dueDate.setHours(0, 0, 0, 0); // Reset giờ về 00:00:00
  
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'overdue'; // Quá hạn
  if (diffDays === 0) return 'due-today'; // Đến hạn hôm nay  
  if (diffDays <= 3) return 'due-soon'; // Sắp đến hạn (còn 3 ngày hoặc ít hơn)
  
  return 'normal'; // Bình thường
};

// Tính toán số khoản nợ theo trạng thái
const dueStatusCounts = computed(() => {
  let result = {
    overdue: 0,
    dueToday: 0,
    dueSoon: 0
  };
  
  debts.value.forEach(debt => {
    const status = checkDueStatus(debt);
    if (status === 'overdue') result.overdue++;
    if (status === 'due-today') result.dueToday++;
    if (status === 'due-soon') result.dueSoon++;
  });
  
  return result;
});

// Có thông báo nào không
const hasNotifications = computed(() => {
  return dueStatusCounts.value.overdue > 0 || 
         dueStatusCounts.value.dueToday > 0 || 
         dueStatusCounts.value.dueSoon > 0;
});

// Khởi tạo
onMounted(async () => {
  if (user.value) {
    resetNewDebt();
    await fetchDebts();
  }
});

// Watch khi filterType thay đổi
watch(() => props.filterType, async (newFilterType) => {
  console.log("Filter type changed to:", newFilterType);
  resetNewDebt();
  await fetchDebts();
});

// Watch khi user thay đổi
watch(user, async (newUser) => {
  if (newUser) {
    resetNewDebt();
    await fetchDebts();
  }
});

// Khi component unmount, reset state
onUnmounted(() => {
  debts.value = [];
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
</script>

<style scoped>
.debt-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-top: 30px;
}

.section-title {
  font-size: 20px;
  color: #333;
  border-left: 4px solid #4CAF50;
  padding-left: 10px;
  margin-bottom: 20px;
}

.filter-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.month-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f9f9f9;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #eee;
}

.month-nav-button {
  background: none;
  border: none;
  font-size: 18px;
  color: #555;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.month-nav-button:hover {
  background-color: #e9e9e9;
}

.current-month {
  font-weight: 500;
  min-width: 120px;
  text-align: center;
}

.recurring-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.1);
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 14px;
}

.debt-end-date {
  color: #757575;
  font-size: 14px;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.checkbox-wrapper input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #4CAF50;
}

.recurring-group {
  border: 1px solid #eee;
  padding: 12px;
  border-radius: 6px;
  background-color: #fafafa;
}

.recurring-options {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #ddd;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 20px;
  color: #757575;
  font-size: 15px;
}

.add-small-button {
  display: inline-block;
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.debt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.debt-actions {
  display: flex;
  gap: 10px;
}

.add-debt-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.add-debt-button:hover {
  background-color: #388E3C;
}

.debt-summary {
  display: flex;
  gap: 16px;
  background-color: #f9f9f9;
  padding: 10px 16px;
  border-radius: 6px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  font-weight: 500;
}

.summary-item span:first-child {
  font-size: 14px;
  color: #555;
}

.summary-item span:last-child {
  font-size: 16px;
  font-weight: bold;
}

.income {
  color: #4CAF50;
}

.expense {
  color: #F44336;
}

.debt-list {
  margin-top: 16px;
  border-top: 1px solid #eee;
}

.debt-item {
  display: flex;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s;
}

.debt-item:hover {
  background-color: #f9f9f9;
}

.debt-item.paid {
  background-color: #f0fff0;
}

.debt-item.recurring {
  border-left: 3px solid #4CAF50;
  padding-left: 8px;
}

.debt-item.lent {
  border-left: 3px solid #2196F3;
  padding-left: 8px;
}

.debt-item.overdue {
  border-left: 3px solid #f44336;
  background-color: #fff5f5;
}

.debt-item.due-today {
  border-left: 3px solid #ffc107;
  background-color: #fffbf0;
}

.debt-item.due-soon {
  border-left: 3px solid #2196f3;
  background-color: #f0f8ff;
}

.debt-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 70%;
}

.debt-checkbox {
  display: flex;
  align-items: center;
  position: relative;
}

.debt-checkbox input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #4CAF50;
}

.debt-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.debt-description {
  font-weight: 500;
  font-size: 16px;
}

.debt-date, .debt-creditor {
  color: #757575;
  font-size: 14px;
}

.debt-amount-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  align-self: center;
}

.debt-amount {
  font-weight: bold;
  font-size: 18px;
  align-self: center;
  color: #F44336;
}

.debt-type-selector {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.debt-type-option {
  flex: 1;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.debt-type-option:hover {
  background-color: #f5f5f5;
}

.debt-type-option.selected {
  background-color: #e8f5e9;
  border-color: #4CAF50;
  color: #2E7D32;
}

.debt-type-icon {
  font-size: 24px;
}

.debt-type-text {
  font-weight: 500;
}

.debt-type-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-right: 8px;
}

.lent-tag {
  background-color: #e3f2fd;
  color: #1565c0;
}

.owed-tag {
  background-color: #ffebee;
  color: #c62828;
}

.lent-amount {
  color: #2196F3;
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
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
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
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #444;
}

.required {
  color: #F44336;
  margin-left: 3px;
}

.form-group input, .form-group select, .form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 15px;
  transition: all 0.2s ease-in-out;
  background-color: white;
  box-sizing: border-box;
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.amount-input {
  position: relative;
  display: flex;
  align-items: center;
}

.amount-input input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 15px;
  text-align: left;
  transition: all 0.2s ease-in-out;
  background-color: white;
  box-sizing: border-box;
  font-weight: 500;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  background-color: #f9f9f9;
  border-radius: 0 0 8px 8px;
}

.cancel-button {
  background-color: #f0f0f0;
  color: #555;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  flex: 1;
}

.cancel-button:hover {
  background-color: #e0e0e0;
}

.submit-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  flex: 1;
}

.submit-button:hover {
  background-color: #388E3C;
}

@media (max-width: 768px) {
  .debt-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .debt-summary {
    width: 100%;
    justify-content: space-between;
  }
  
  .debt-item {
    padding: 12px 0;
    gap: 10px;
  }
  
  .debt-info {
    max-width: 65%;
  }
  
  .form-group label {
    font-size: 14px;
  }
  
  .form-group input, .form-group select, .form-group textarea {
    padding: 10px;
    font-size: 14px;
  }
  
  .modal-body {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .debt-summary {
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  
  .summary-item {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }
  
  .debt-info {
    max-width: 60%;
  }
  
  .debt-description {
    font-size: 14px;
  }
  
  .debt-item {
    flex-direction: column;
    gap: 8px;
  }
  
  .debt-amount-container {
    align-self: flex-end;
    flex-direction: row-reverse;
    align-items: center;
    gap: 10px;
  }
  
  .modal {
    width: 100%;
    height: 100%;
    max-width: 100%;
    border-radius: 0;
  }
  
  .form-actions {
    position: sticky;
    bottom: 0;
    margin-top: 0;
    padding: 12px;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    z-index: 10;
    background-color: white;
    border-radius: 0;
  }
  
  .cancel-button, .submit-button {
    padding: 12px 16px;
    font-size: 14px;
  }
}

.debt-total-amount {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.total-amount-value {
  font-weight: 500;
  color: #FF9800;
}

.monthly-label {
  font-size: 12px;
  color: #777;
  text-align: center;
  margin-top: 2px;
}

.paid-label {
  background-color: #4CAF50;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  white-space: nowrap;
}

.confirm-modal {
  max-width: 450px;
}

.confirm-note {
  display: block;
  margin-top: 10px;
  font-style: italic;
  color: #757575;
  font-size: 14px;
}

.income-button {
  background-color: #4CAF50;
}

.income-button:hover {
  background-color: #388E3C;
}

.expense-button {
  background-color: #F44336;
}

.expense-button:hover {
  background-color: #D32F2F;
}

/* Notification styles */
.notification-container {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  gap: 10px;
}

.notification-icon {
  font-size: 20px;
}

.notification.overdue {
  background-color: #ffebee;
  border-left: 4px solid #f44336;
  color: #c62828;
}

.notification.due-today {
  background-color: #fff8e1;
  border-left: 4px solid #ffc107;
  color: #ff8f00;
}

.notification.due-soon {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
  color: #0d47a1;
}

/* Debt item due status */
.debt-item.overdue {
  border-left: 3px solid #f44336;
  background-color: #fff5f5;
}

.debt-item.due-today {
  border-left: 3px solid #ffc107;
  background-color: #fffbf0;
}

.debt-item.due-soon {
  border-left: 3px solid #2196f3;
  background-color: #f0f8ff;
}

.due-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 14px;
}
</style> 