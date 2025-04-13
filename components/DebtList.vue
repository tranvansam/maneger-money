<template>
  <div class="debt-section">
    <!-- Add loading overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Đang xử lý...</div>
    </div>
    
    <h2 class="section-title">
      {{ props.filterType === 'owed' ? 'Quản lý nợ phải trả' : 'Quản lý cho vay' }}
      <button @click="openAddDebtModal" class="add-mobile-button">+</button>
    </h2>
    
    <!-- Notifications Section -->
    <div v-if="hasNotifications" class="debt-notifications" style="margin-bottom: 20px;">
      <div v-if="dueStatusCounts.overdue > 0" class="notification overdue">
        <i class="fas fa-exclamation-circle"></i>
        {{ dueStatusCounts.overdue }} khoản {{ props.filterType === 'owed' ? 'nợ đã quá hạn' : 'cho vay đã quá hạn' }}
      </div>
      <div v-if="dueStatusCounts.dueToday > 0" class="notification due-today">
        <i class="fas fa-calendar-day"></i>
        {{ dueStatusCounts.dueToday }} khoản {{ props.filterType === 'owed' ? 'nợ đến hạn' : 'cho vay đến hạn' }} hôm nay
      </div>
      <div v-if="dueStatusCounts.dueSoon > 0" class="notification due-soon">
        <i class="fas fa-clock"></i>
        {{ dueStatusCounts.dueSoon }} khoản {{ props.filterType === 'owed' ? 'nợ sắp đến hạn' : 'cho vay sắp đến hạn' }}
      </div>
    </div>
    
    <!-- Filter and Controls -->
    <div class="control-bar">
      <div v-if="!showTotalAmounts" class="month-filter">
        <button @click="previousMonth" class="month-nav-button prev-month">
          <span class="sr-only">Tháng trước</span>
        </button>
        <span class="current-month">{{ formatMonthYear(selectedMonth) }}</span>
        <button @click="nextMonth" class="month-nav-button next-month">
          <span class="sr-only">Tháng sau</span>
        </button>
      </div>
      <div v-else class="total-view-label">
        <span class="total-view-text">Tổng hợp tất cả khoản nợ</span>
      </div>
      
      <div class="control-buttons">
        <button @click="toggleTotalView" class="toggle-view-button">
          <i class="fas" :class="showTotalAmounts ? 'fa-calendar-alt' : 'fa-chart-bar'"></i>
          {{ showTotalAmounts ? 'Xem theo tháng' : 'Xem tất cả' }}
        </button>
        
        <button @click="openAddDebtModal" class="add-button">
          <i class="fas fa-plus"></i> Thêm {{ props.filterType === 'owed' ? 'khoản nợ' : 'khoản cho vay' }}
        </button>
      </div>
    </div>
    
    <!-- Loading and Empty States -->
    <div v-if="loading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i> Đang tải...
    </div>
    
    <div v-else-if="debts.length === 0" class="empty-state">
      <div class="empty-state-icon">{{ showTotalAmounts ? '📊' : '📅' }}</div>
      <p v-if="showTotalAmounts">
        Không có {{ props.filterType === 'owed' ? 'khoản nợ' : 'khoản cho vay' }} nào.
        Thêm mới để theo dõi các khoản {{ props.filterType === 'owed' ? 'nợ' : 'cho vay' }}.
      </p>
      <p v-else>
        Không có {{ props.filterType === 'owed' ? 'khoản nợ' : 'khoản cho vay' }} nào 
        trong tháng {{ selectedMonth.getMonth() + 1 }}/{{ selectedMonth.getFullYear() }}
      </p>
    </div>
    
    <!-- Debt Summary -->
    <div v-else class="debts-container">
      <div class="debts-summary">
        <div class="summary-item total">
          <div class="summary-label">
            <i class="fas fa-calculator"></i>
            {{ props.filterType === 'owed' ? 'Nợ :' : 'Cho vay :' }}
          </div>
          <div class="summary-value">{{ formatCurrency(totalDebtAmount) }}</div>
        </div>
        
        <div class="summary-item paid">
          <div class="summary-label">
            <i class="fas fa-check-circle"></i>
            {{ props.filterType === 'owed' ? 'Đã trả :' : 'Đã thu :' }}
          </div>
          <div class="summary-value">{{ formatCurrency(totalPaidAmount) }}</div>
        </div>
        
        <div class="summary-item remaining">
          <div class="summary-label">
            <i class="fas fa-exclamation-circle"></i>
            {{ props.filterType === 'owed' ? 'Còn nợ :' : 'Chưa thu :' }}
          </div>
          <div class="summary-value">{{ formatCurrency(remainingAmount) }}</div>
        </div>
      </div>
      
      <div class="debt-list">
        <div v-for="debt in debts" :key="debt.id + (debt.isRecurring ? getMonthKey(selectedMonth.value) : '')" 
             class="debt-item" 
             :class="{ 'settled': debt.isSettled, 'paid': isPaid(debt) }">
          <div class="debt-content">
            <div class="debt-header">
              <div class="debt-info">
                <div class="debt-checkbox" v-if="!debt.isSettled || ((props.filterType === 'owed' && !debt.isRecurring) || props.filterType === 'lent')">
                  <input 
                    type="checkbox" 
                    :checked="isPaid(debt)" 
                    @change="showConfirmToggle(debt)"
                    :id="`debt-${debt.id}-${debt.isRecurring ? getMonthKey(selectedMonth.value) : ''}`"
                  />
                  <label :for="`debt-${debt.id}-${debt.isRecurring ? getMonthKey(selectedMonth.value) : ''}`"></label>
                </div>
                
                <div class="debt-details">
                  <div class="debt-title">
                    <span v-if="debt.debtType === 'lent'" class="debt-type-tag lent-tag">Cho vay</span>
                    <span v-else class="debt-type-tag owed-tag">Nợ</span>
                    {{ debt.description }}
                    <span v-if="debt.isRecurring" class="recurring-badge" title="Khoản trả góp định kỳ">
                    </span>
                    <span v-if="!debt.isSettled && checkDueStatus(debt) === 'overdue'" class="due-status-badge overdue" title="Đã quá hạn">
                      ⚠️
                    </span>
                    <span v-else-if="!debt.isSettled && checkDueStatus(debt) === 'due-today'" class="due-status-badge due-today" title="Đến hạn hôm nay">
                      📅
                    </span>
                    <span v-else-if="!debt.isSettled && checkDueStatus(debt) === 'due-soon'" class="due-status-badge due-soon" title="Sắp đến hạn">
                      ⏰
                    </span>
                  </div>
                  
                  <div class="debt-date">Đến hạn: {{ formatDate(debt.dueDate) }}</div>
                  <div v-if="debt.isRecurring && debt.endDate" class="debt-end-date">
                    Kết thúc: {{ formatDate(debt.endDate) }}
                  </div>
                  <div class="debt-creditor">{{ debt.debtType === 'lent' ? 'Người vay' : 'Chủ nợ' }}: {{ debt.creditor }}</div>
                  <div v-if="debt.isRecurring && debt.totalAmount" class="debt-total-amount">
                    Tổng khoản vay: <span class="total-amount-value">{{ formatCurrency(debt.totalAmount) }}</span>
                  </div>
                  <div v-if="debt.isSettled" class="settlement-info">
                    Đã tất toán ngày: {{ formatDate(debt.settledDate) }}
                    <br>
                    Số tiền tất toán: {{ formatCurrency(debt.settlementAmount) }}
                  </div>
                </div>
              </div>
              
              <div class="debt-amount-container">
                <div v-if="debt.isSettled" class="settled-label">
                  Đã tất toán
                </div>
                <div v-else-if="isPaid(debt)" class="paid-label">
                  {{ debt.debtType === 'lent' ? 'Đã thu' : 'Đã trả' }}
                </div>
                <div class="debt-amount" 
                     @click="openEditModal(debt)"
                     :class="{'lent-amount': debt.debtType === 'lent', 'settled-amount': debt.isSettled}">
                  {{ showTotalAmounts && debt.isRecurring ? formatCurrency(debt.totalAmount || debt.amount) : formatCurrency(debt.amount) }}
                  <span v-if="debt.isRecurring && showTotalAmounts" class="debt-total-note">
                    ({{ formatCurrency(debt.amount) }}/tháng)
                  </span>
                  <span v-else-if="debt.isRecurring && !showTotalAmounts" class="debt-total-note">
                    (Tổng: {{ formatCurrency(debt.totalAmount || debt.amount) }})
                  </span>
                </div>
                <div v-if="debt.isRecurring && !debt.isSettled" class="settlement-container">
                  <button 
                    @click="openSettlementModal(debt)" 
                    class="settlement-button"
                    :disabled="loading"
                  >
                    Tất toán
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal thêm khoản nợ -->
    <div v-if="showAddDebtModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2 v-if="newDebt.debtType === 'lent'">Thêm khoản cho vay</h2>
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
                  <span class="debt-type-text">Tôi cho vay</span>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label>Mô tả khoản {{ newDebt.debtType === 'lent' ? 'cho vay' : 'nợ' }}</label>
              <input 
                type="text" 
                v-model="newDebt.description" 
                placeholder="Ví dụ: Mua xe máy"
                required
              />
            </div>

            <div class="form-group">
              <label>{{ newDebt.debtType === 'lent' ? 'Người vay' : 'Chủ nợ' }} <span class="required">*</span></label>
              <input 
                type="text" 
                v-model="newDebt.creditor"
                :placeholder="newDebt.debtType === 'lent' ? 'Tên người vay' : 'Tên chủ nợ'"
                required
              />
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

            <div v-if="newDebt.debtType === 'owed'" class="form-group recurring-group">
              <div class="recurring-checkbox">
                <input 
                  type="checkbox" 
                  v-model="newDebt.isRecurring" 
                  id="recurring-checkbox"
                />
                <label for="recurring-checkbox">Trả góp định kỳ hàng tháng</label>
              </div>
              
              <div v-if="newDebt.isRecurring" class="recurring-details">
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
                  <label>Ngày kết thúc <span class="required">*</span></label>
                  <input type="date" v-model="newDebt.endDate" required />
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <div class="form-actions">
          <button type="button" @click="showAddDebtModal = false" class="cancel-button">Hủy</button>
          <button type="submit" @click="addDebt" class="submit-button" :disabled="modalLoading">
            {{ modalLoading ? 'Đang xử lý...' : (newDebt.debtType === 'lent' ? 'Lưu khoản cho vay' : 'Lưu khoản nợ') }}
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

    <!-- Modal tất toán -->
    <div v-if="showSettlementModal" class="modal-overlay">
      <div class="modal settlement-modal">
        <div class="modal-header">
          <h2>Tất toán khoản nợ</h2>
          <button @click="closeSettlementModal" class="close-button">&times;</button>
        </div>
        
        <div class="modal-body">
          <p v-if="selectedDebt">
            Bạn đang tất toán khoản nợ: <strong>{{ selectedDebt.description }}</strong>
            <br>
            Số tiền gốc: <strong>{{ formatCurrency(selectedDebt.amount) }}</strong>
          </p>
          
          <div class="form-group">
            <label>Số tiền tất toán <span class="required">*</span></label>
            <div class="amount-input">
              <input 
                type="text" 
                v-model="formattedSettlementAmount" 
                @input="formatSettlementAmount" 
                @blur="validateSettlementAmount"
                required 
                placeholder="0" 
              />
            </div>
          </div>
          
          <div class="settlement-note">
            * Khoản nợ sau khi tất toán sẽ không được tính vào tổng nợ và sẽ không xuất hiện trong các tháng tiếp theo
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" @click="closeSettlementModal" class="cancel-button">Hủy</button>
          <button 
            type="button" 
            @click="confirmSettlement" 
            class="submit-button"
            :disabled="!settlementAmount || settlementAmount <= 0"
          >
            Xác nhận tất toán
          </button>
        </div>
      </div>
    </div>

    <!-- Modal chỉnh sửa khoản nợ -->
    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Chỉnh sửa khoản {{ editingDebt?.debtType === 'lent' ? 'cho vay' : 'nợ' }}</h2>
          <button @click="closeEditModal" class="close-button">&times;</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="saveEdit">
            <div class="form-group">
              <label>Mô tả <span class="required">*</span></label>
              <input 
                type="text" 
                v-model="editingDebt.description" 
                required 
                placeholder="Ví dụ: Mua xe máy"
              />
            </div>

            <div class="form-group">
              <label>{{ editingDebt?.debtType === 'lent' ? 'Người vay' : 'Chủ nợ' }} <span class="required">*</span></label>
              <input 
                type="text" 
                v-model="editingDebt.creditor"
                required 
                :placeholder="editingDebt?.debtType === 'lent' ? 'Tên người vay' : 'Tên chủ nợ'"
              />
            </div>

            <div class="form-group">
              <label>Số tiền (VND) <span class="required">*</span></label>
              <div class="amount-input">
                <input 
                  type="text" 
                  v-model="formattedEditAmount" 
                  @input="formatEditAmount" 
                  @blur="validateEditAmount"
                  required 
                  placeholder="0"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Ngày đến hạn <span class="required">*</span></label>
              <input 
                type="date" 
                v-model="editingDebt.dueDate" 
                required 
              />
            </div>

            <div v-if="editingDebt?.isRecurring" class="form-group">
              <label>Tổng số tiền <span class="required">*</span></label>
              <div class="amount-input">
                <input 
                  type="text" 
                  v-model="formattedEditTotalAmount" 
                  @input="formatEditTotalAmount" 
                  @blur="validateEditTotalAmount"
                  required 
                  placeholder="0"
                />
              </div>
            </div>

            <div v-if="editingDebt?.isRecurring" class="form-group">
              <label>Ngày kết thúc <span class="required">*</span></label>
              <input 
                type="date" 
                v-model="editingDebt.endDate" 
                required 
              />
            </div>
          </form>
        </div>
        
        <div class="form-actions">
          <button type="button" @click="showDeleteConfirmModal = true" class="delete-button">
            Xóa khoản nợ
          </button>
          <div class="action-buttons">
            <button type="button" @click="closeEditModal" class="cancel-button">Hủy</button>
            <button type="submit" @click="saveEdit" class="submit-button" :disabled="modalLoading">
              {{ modalLoading ? 'Đang xử lý...' : 'Lưu thay đổi' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal xác nhận xóa -->
    <div v-if="showDeleteConfirmModal" class="modal-overlay">
      <div class="modal confirm-modal">
        <div class="modal-header">
          <h2>Xác nhận xóa</h2>
          <button @click="showDeleteConfirmModal = false" class="close-button">&times;</button>
        </div>
        
        <div class="modal-body">
          <p>
            Bạn có chắc chắn muốn xóa khoản {{ editingDebt?.debtType === 'lent' ? 'cho vay' : 'nợ' }}:
            <strong>{{ editingDebt?.description }}</strong>?
          </p>
          <p class="warning-text">
            Lưu ý: Hành động này không thể hoàn tác.
          </p>
        </div>
        
        <div class="form-actions">
          <button type="button" @click="showDeleteConfirmModal = false" class="cancel-button">Hủy</button>
          <button type="button" @click="deleteDebt" class="delete-confirm-button" :disabled="modalLoading">
            {{ modalLoading ? 'Đang xử lý...' : 'Xác nhận xóa' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, Timestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '~/plugins/firebase';
import { useAuth } from '~/composables/useAuth';
import { debounce } from 'lodash';

const props = defineProps({
  filterType: {
    type: String,
    default: null, // 'owed' hoặc 'lent', nếu null thì hiển thị tất cả
    validator: (value) => value === null || value === 'owed' || value === 'lent'
  }
});

const emit = defineEmits(['debt-toggled', 'debt-added']);

const { user } = useAuth();
const loading = ref(false); // Đổi giá trị mặc định thành false
const modalLoading = ref(false);
const debts = ref([]);
const showAddDebtModal = ref(false);
const showConfirmModal = ref(false);
const selectedDebt = ref(null);
const showTotalAmounts = ref(false);
const editingDebt = ref(null);
const showStatusModal = ref(false);
const currentDebtForStatus = ref(null);
const showSettlementModal = ref(false);
const settlementAmount = ref(0);
const formattedSettlementAmount = ref('');

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

// Khởi tạo
onMounted(() => {
  console.log('DebtList mounted');
  if (user.value) {
    resetNewDebt();
    // Không gọi fetchDebts ở đây vì watcher sẽ tự gọi
  }
});

// Tối ưu lại watchers để tránh gọi API nhiều lần
const debouncedFetch = debounce(() => {
  if (!loading.value && user.value) {
    fetchDebts();
  }
}, 300);

// Gộp tất cả các watchers thành một
watch(
  [
    () => props.filterType,
    () => showTotalAmounts.value,
    () => selectedMonth.value?.getTime(),
    () => user.value?.uid
  ],
  ([newFilterType, newShowTotal, newMonth, newUid], [oldFilterType, oldShowTotal, oldMonth, oldUid]) => {
    console.log('Watch triggered:', {
      filterType: [oldFilterType, newFilterType],
      showTotal: [oldShowTotal, newShowTotal],
      month: [oldMonth, newMonth],
      uid: [oldUid, newUid]
    });

    // Chỉ gọi API khi thực sự có thay đổi
    if (
      newFilterType !== oldFilterType ||
      newShowTotal !== oldShowTotal ||
      newMonth !== oldMonth ||
      newUid !== oldUid
    ) {
      debouncedFetch();
    }
  },
  { 
    deep: false, // Tắt deep watching vì không cần thiết
    immediate: true // Gọi ngay lần đầu mounted
  }
);

// Sửa lại các hàm điều hướng tháng
const previousMonth = () => {
  const newDate = new Date(selectedMonth.value);
  newDate.setMonth(newDate.getMonth() - 1);
  selectedMonth.value = newDate;
  // Không cần gọi fetchDebts ở đây vì watcher sẽ tự gọi
};

const nextMonth = () => {
  const newDate = new Date(selectedMonth.value);
  newDate.setMonth(newDate.getMonth() + 1);
  selectedMonth.value = newDate;
  // Không cần gọi fetchDebts ở đây vì watcher sẽ tự gọi
};

// Sửa lại hàm toggle view
const toggleTotalView = () => {
  showTotalAmounts.value = !showTotalAmounts.value;
  console.log('Toggled total view:', showTotalAmounts.value);
  // Không cần gọi fetchDebts ở đây vì watcher sẽ tự gọi
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

// Computed properties
const totalDebt = computed(() => {
  if (showTotalAmounts.value) {
    // For total view, sum all debt amounts including recurring debts' total amounts
    return debts.value.reduce((sum, debt) => {
      if (debt.isRecurring) {
        // For recurring debts, use totalAmount if available, otherwise calculate based on months
        const totalAmount = debt.totalAmount || calculateRecurringTotal(debt);
        return sum + totalAmount;
      }
      return sum + (debt.amount || 0);
    }, 0);
  } else {
    // For monthly view, sum only the current month's debts
    const currentMonthKey = getMonthKey(selectedMonth.value);
    return debts.value.reduce((sum, debt) => {
      if (debt.isRecurring) {
        // For recurring debts in monthly view, only count if the debt is active for this month
        if (isDebtActiveForMonth(debt, currentMonthKey)) {
          return sum + (debt.amount || 0);
        }
        return sum;
      }
      // For non-recurring debts, include if they belong to the current month
      return sum + (debt.amount || 0);
    }, 0);
  }
});

const totalDebtAmount = computed(() => {
  return debts.value.reduce((total, debt) => {
    // Nếu khoản nợ đã được tất toán, bỏ qua
    if (debt.isSettled) return total;
    
    // Nếu đang xem theo tháng
    if (!showTotalAmounts.value) {
      const currentMonthKey = getMonthKey(selectedMonth.value);
      
      // Với khoản nợ định kỳ
      if (debt.isRecurring) {
        if (isDebtActiveForMonth(debt, currentMonthKey)) {
          return total + debt.amount;
        }
        return total;
      }
      
      // Với khoản nợ thường
      const dueDate = debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : new Date(debt.dueDate);
      if (dueDate.getMonth() === selectedMonth.value.getMonth() && 
          dueDate.getFullYear() === selectedMonth.value.getFullYear()) {
        return total + debt.amount;
      }
      return total;
    }
    
    // Nếu xem tổng
    if (debt.isRecurring) {
      return total + (debt.totalAmount || debt.amount);
    }
    return total + debt.amount;
  }, 0);
});

const totalPaidAmount = computed(() => {
  return debts.value.reduce((total, debt) => {
    // Nếu khoản nợ đã được tất toán
    if (debt.isSettled) {
      if (!showTotalAmounts.value) {
        // Kiểm tra xem có tất toán trong tháng hiện tại không
        const settledDate = debt.settledDate instanceof Timestamp ? 
          debt.settledDate.toDate() : new Date(debt.settledDate);
        if (settledDate.getMonth() === selectedMonth.value.getMonth() && 
            settledDate.getFullYear() === selectedMonth.value.getFullYear()) {
          return total + debt.settlementAmount;
        }
        return total;
      }
      return total + debt.settlementAmount;
    }

    // Nếu đang xem theo tháng
    if (!showTotalAmounts.value) {
      const currentMonthKey = getMonthKey(selectedMonth.value);
      
      // Với khoản nợ định kỳ
      if (debt.isRecurring) {
        if (debt.paidMonths?.[currentMonthKey]) {
          return total + debt.amount;
        }
        return total;
      }
      
      // Với khoản nợ thường
      const dueDate = debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : new Date(debt.dueDate);
      if (debt.paid && 
          dueDate.getMonth() === selectedMonth.value.getMonth() && 
          dueDate.getFullYear() === selectedMonth.value.getFullYear()) {
        return total + debt.amount;
      }
      return total;
    }
    
    // Nếu xem tổng
    if (debt.isRecurring) {
      const paidMonths = Object.values(debt.paidMonths || {}).filter(Boolean).length;
      return total + (paidMonths * debt.amount);
    }
    return total + (debt.paid ? debt.amount : 0);
  }, 0);
});

const remainingAmount = computed(() => {
  return Math.max(0, totalDebtAmount.value - totalPaidAmount.value);
});

// Helper function to calculate total amount for recurring debt
const calculateRecurringTotal = (debt) => {
  if (!debt.startDate || !debt.endDate) return debt.amount || 0;
  const start = debt.startDate instanceof Timestamp ? debt.startDate.toDate() : new Date(debt.startDate);
  const end = debt.endDate instanceof Timestamp ? debt.endDate.toDate() : new Date(debt.endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return (debt.amount || 0) * months;
};

// Helper function to calculate total paid amount for recurring debt
const calculateTotalPaidForRecurring = (debt) => {
  if (!debt.paidMonths) return 0;
  const paidMonthsCount = Object.values(debt.paidMonths).filter(Boolean).length;
  return paidMonthsCount * (debt.amount || 0);
};

// Helper function to check if a debt is active for a given month
const isDebtActiveForMonth = (debt, monthKey) => {
  if (!debt.startDate || !debt.endDate) return true;
  const [yearStr, monthStr] = monthKey.split('-');
  const checkDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1);
  const startDate = debt.startDate instanceof Timestamp ? debt.startDate.toDate() : new Date(debt.startDate);
  const endDate = debt.endDate instanceof Timestamp ? debt.endDate.toDate() : new Date(debt.endDate);
  return checkDate >= startDate && checkDate <= endDate;
};

// Hàm kiểm tra trạng thái đã thanh toán, xét cả trường hợp khoản nợ định kỳ
const isPaid = (debt) => {
  if (debt.isRecurring) {
    const currentMonthKey = getMonthKey(selectedMonth.value);
    return debt.paidMonths && debt.paidMonths[currentMonthKey] === true;
  }
  return debt.paid;
};

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
  if (!user.value) {
    console.log('Skip fetching: No user');
    return;
  }

  // Nếu đang loading thì không fetch nữa
  if (loading.value) {
    console.log('Skip fetching: Already loading');
    return;
  }

  try {
    loading.value = true;
    console.log('Fetching debts for user:', user.value.uid);
    
    // Clear existing debts
    debts.value = [];
    
    const debtCollection = collection(db, `users/${user.value.uid}/debts`);
    let baseQuery = query(debtCollection, where('debtType', '==', props.filterType));

    const querySnapshot = await getDocs(baseQuery);
    const fetchedDebts = [];
    
    querySnapshot.docs.forEach(doc => {
      const debtData = doc.data();
      const debtDate = debtData.dueDate?.toDate() || new Date();
      const endDate = debtData.endDate?.toDate();
      
      if (!showTotalAmounts.value) {
        // For monthly view
        const startOfMonth = new Date(selectedMonth.value.getFullYear(), selectedMonth.value.getMonth(), 1);
        const endOfMonth = new Date(selectedMonth.value.getFullYear(), selectedMonth.value.getMonth() + 1, 0, 23, 59, 59);
        
        // For recurring debts
        if (debtData.isRecurring) {
          if ((!endDate || endDate >= startOfMonth) && debtDate <= endOfMonth) {
            const monthlyDueDate = new Date(
              selectedMonth.value.getFullYear(),
              selectedMonth.value.getMonth(),
              debtDate.getDate()
            );
            
            fetchedDebts.push({
              id: doc.id,
              ...debtData,
              dueDate: monthlyDueDate,
              dueStatus: checkDueStatus({...debtData, dueDate: monthlyDueDate})
            });
          }
        } 
        // For regular debts
        else if (debtDate >= startOfMonth && debtDate <= endOfMonth) {
          fetchedDebts.push({
            id: doc.id,
            ...debtData,
            dueDate: debtDate,
            dueStatus: checkDueStatus(debtData)
          });
        }
      } else {
        // For total view, get all debts
        fetchedDebts.push({
          id: doc.id,
          ...debtData,
          dueDate: debtDate,
          dueStatus: checkDueStatus(debtData)
        });
      }
    });

    // Sort debts
    fetchedDebts.sort((a, b) => {
      if (showTotalAmounts.value) {
        if (a.isRecurring !== b.isRecurring) {
          return a.isRecurring ? -1 : 1;
        }
      }
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    // Update debts after all processing is done
    debts.value = fetchedDebts;
    console.log(`Fetched ${debts.value.length} debts`);

  } catch (error) {
    console.error('Error fetching debts:', error);
    alert('Lỗi tải dữ liệu: ' + error.message);
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
  
  loading.value = true;
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
    loading.value = false;
    modalLoading.value = false;
  }
};

// Cập nhật trạng thái khoản nợ (đã trả hay chưa)
const toggleDebtStatus = async (debt) => {
  if (!user.value) {
    alert('Bạn cần đăng nhập để cập nhật khoản nợ');
    return;
  }
  
  loading.value = true;
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
  } finally {
    loading.value = false;
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

// Function to check if two dates are the same day
const isSameDay = (date1, date2) => {
  date1 = new Date(date1);
  date2 = new Date(date2);
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
};

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

// Format month and year for display
const formatMonthYear = (date) => {
  const months = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

// Function to open add debt modal
const openAddDebtModal = () => {
  showAddDebtModal.value = true;
};

// Modal tất toán - rename to openSettlementModal
const openSettlementModal = (debt) => {
  selectedDebt.value = debt;
  showSettlementModal.value = true;
  settlementAmount.value = debt.amount;
  formattedSettlementAmount.value = new Intl.NumberFormat('vi-VN').format(debt.amount);
};

// Xác nhận tất toán
const confirmSettlement = async () => {
  if (!selectedDebt.value || !selectedDebt.value.id) {
    console.error('No debt selected or invalid debt data');
    return;
  }

  loading.value = true;
  try {
    const debtRef = doc(db, 'users', user.value.uid, 'debts', selectedDebt.value.id);
    
    // Cập nhật trạng thái tất toán
    await updateDoc(debtRef, {
      isSettled: true,
      settledDate: Timestamp.now(),
      settlementAmount: settlementAmount.value,
      updatedAt: Timestamp.now()
    });

    // Thêm giao dịch tất toán
    const transactionData = {
      type: selectedDebt.value.debtType === 'lent' ? 'income' : 'expense',
      amount: settlementAmount.value,
      date: Timestamp.now(),
      description: `Tất toán: ${selectedDebt.value.description}`,
      category: selectedDebt.value.debtType === 'lent' ? 'debt_repayment' : 'debt_payment',
      notes: `Tất toán khoản ${selectedDebt.value.debtType === 'lent' ? 'cho vay' : 'nợ'}`,
      createdAt: Timestamp.now(),
      userId: user.value.uid,
      debtId: selectedDebt.value.id
    };

    await addDoc(
      collection(db, 'users', user.value.uid, 'transactions'),
      transactionData
    );

    // Đóng modal và reset state
    closeSettlementModal();
    
    // Cập nhật lại danh sách
    await fetchDebts();
  } catch (error) {
    console.error('Error settling debt:', error);
    alert(`Không thể tất toán khoản nợ: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// Format settlement amount
const formatSettlementAmount = () => {
  let value = formattedSettlementAmount.value.replace(/\D/g, '');
  if (value) {
    formattedSettlementAmount.value = new Intl.NumberFormat('vi-VN').format(parseInt(value));
    settlementAmount.value = parseInt(value);
  } else {
    formattedSettlementAmount.value = '';
    settlementAmount.value = 0;
  }
};

// Validate settlement amount
const validateSettlementAmount = () => {
  if (!formattedSettlementAmount.value) {
    formattedSettlementAmount.value = '0';
    settlementAmount.value = 0;
  }
};

// Close settlement modal
const closeSettlementModal = () => {
  showSettlementModal.value = false;
  selectedDebt.value = null;
  settlementAmount.value = 0;
  formattedSettlementAmount.value = '';
};

// Settle debt
const settleDebt = async (debt) => {
  if (!user.value) {
    alert('Bạn cần đăng nhập để tất toán khoản nợ');
    return;
  }

  try {
    const debtRef = doc(db, 'users', user.value.uid, 'debts', debt.id);
    await updateDoc(debtRef, {
      isSettled: true,
      settledDate: Timestamp.now(),
      settlementAmount: debt.amount,
      updatedAt: Timestamp.now()
    });

    // Add transaction
    const transactionData = {
      type: debt.debtType === 'lent' ? 'income' : 'expense',
      amount: debt.amount,
      date: Timestamp.now(),
      description: `Tất toán: ${debt.description}`,
      category: debt.debtType === 'lent' ? 'debt_repayment' : 'debt_payment',
      notes: `Tất toán khoản ${debt.debtType === 'lent' ? 'cho vay' : 'nợ'}`,
      createdAt: Timestamp.now(),
      userId: user.value.uid,
      debtId: debt.id
    };

    await addDoc(
      collection(db, 'users', user.value.uid, 'transactions'),
      transactionData
    );

    // Close settlement modal
    closeSettlementModal();

    // Refresh debts
    await fetchDebts();
  } catch (error) {
    console.error('Error settling debt:', error);
    alert(`Không thể tất toán khoản nợ: ${error.message}`);
  }
};

// Thêm các biến và hàm xử lý cho modal chỉnh sửa
const showEditModal = ref(false);
const formattedEditAmount = ref('');
const formattedEditTotalAmount = ref('');

// Mở modal chỉnh sửa
const openEditModal = (debt) => {
  // Convert Timestamp to Date object if needed
  const dueDate = debt.dueDate instanceof Timestamp ? debt.dueDate.toDate() : new Date(debt.dueDate);
  const endDate = debt.endDate instanceof Timestamp ? debt.endDate.toDate() : new Date(debt.endDate);
  
  editingDebt.value = { 
    ...debt,
    dueDate: formatDateForInput(dueDate),
    endDate: debt.endDate ? formatDateForInput(endDate) : ''
  };
  
  if (debt.isRecurring) {
    formattedEditAmount.value = new Intl.NumberFormat('vi-VN').format(debt.amount);
    formattedEditTotalAmount.value = new Intl.NumberFormat('vi-VN').format(debt.totalAmount || debt.amount);
  } else {
    formattedEditAmount.value = new Intl.NumberFormat('vi-VN').format(debt.amount);
  }
  showEditModal.value = true;
};

// Đóng modal chỉnh sửa
const closeEditModal = () => {
  showEditModal.value = false;
  editingDebt.value = null;
  formattedEditAmount.value = '';
  formattedEditTotalAmount.value = '';
};

// Format số tiền chỉnh sửa
const formatEditAmount = () => {
  let value = formattedEditAmount.value.replace(/\D/g, '');
  if (value) {
    formattedEditAmount.value = new Intl.NumberFormat('vi-VN').format(parseInt(value));
    editingDebt.value.amount = parseInt(value);
  } else {
    formattedEditAmount.value = '';
    editingDebt.value.amount = '';
  }
};

// Validate số tiền chỉnh sửa
const validateEditAmount = () => {
  if (!formattedEditAmount.value) {
    formattedEditAmount.value = '0';
    editingDebt.value.amount = 0;
  }
};

// Format tổng số tiền chỉnh sửa
const formatEditTotalAmount = () => {
  let value = formattedEditTotalAmount.value.replace(/\D/g, '');
  if (value) {
    formattedEditTotalAmount.value = new Intl.NumberFormat('vi-VN').format(parseInt(value));
    editingDebt.value.totalAmount = parseInt(value);
  } else {
    formattedEditTotalAmount.value = '';
    editingDebt.value.totalAmount = '';
  }
};

// Validate tổng số tiền chỉnh sửa
const validateEditTotalAmount = () => {
  if (!formattedEditTotalAmount.value) {
    formattedEditTotalAmount.value = '0';
    editingDebt.value.totalAmount = 0;
  }
};

// Lưu chỉnh sửa
const saveEdit = async () => {
  if (!editingDebt.value || !editingDebt.value.id) {
    console.error('No debt selected for editing');
    return;
  }

  loading.value = true;
  modalLoading.value = true;
  try {
    const debtRef = doc(db, 'users', user.value.uid, 'debts', editingDebt.value.id);

    const updateData = {
      description: editingDebt.value.description,
      creditor: editingDebt.value.creditor,
      amount: editingDebt.value.amount,
      dueDate: Timestamp.fromDate(new Date(editingDebt.value.dueDate)),
      updatedAt: Timestamp.now()
    };

    if (editingDebt.value.isRecurring) {
      updateData.totalAmount = editingDebt.value.totalAmount;
      updateData.endDate = Timestamp.fromDate(new Date(editingDebt.value.endDate));
    }

    await updateDoc(debtRef, updateData);

    // Cập nhật lại danh sách
    await fetchDebts();
    closeEditModal();
  } catch (error) {
    console.error('Error updating debt:', error);
    alert(`Không thể cập nhật khoản nợ: ${error.message}`);
  } finally {
    loading.value = false;
    modalLoading.value = false;
  }
};

// Thêm biến showDeleteConfirmModal
const showDeleteConfirmModal = ref(false);

// Thêm hàm xóa khoản nợ
const deleteDebt = async () => {
  if (!editingDebt.value || !editingDebt.value.id) {
    console.error('No debt selected for deletion');
    return;
  }

  loading.value = true;
  modalLoading.value = true;
  try {
    // 1. Xóa các giao dịch liên quan đến khoản nợ
    const transactionsRef = collection(db, 'users', user.value.uid, 'transactions');
    const q = query(transactionsRef, where('debtId', '==', editingDebt.value.id));
    const querySnapshot = await getDocs(q);
    
    // Xóa từng giao dịch
    const deletePromises = querySnapshot.docs.map(doc => {
      return deleteDoc(doc.ref);
    });
    await Promise.all(deletePromises);
    
    console.log(`Đã xóa ${querySnapshot.size} giao dịch liên quan`);

    // 2. Xóa khoản nợ
    const debtRef = doc(db, 'users', user.value.uid, 'debts', editingDebt.value.id);
    await deleteDoc(debtRef);

    // Đóng các modal
    showDeleteConfirmModal.value = false;
    closeEditModal();

    // Cập nhật lại danh sách
    await fetchDebts();
  } catch (error) {
    console.error('Error deleting debt:', error);
    alert(`Không thể xóa khoản nợ: ${error.message}`);
  } finally {
    loading.value = false;
    modalLoading.value = false;
  }
};
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
}

.add-mobile-button {
  display: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #4CAF50;
  color: white;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.add-mobile-button:hover {
  background-color: #45a049;
}

.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 10px;
  flex-wrap: wrap;
}

.month-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f9f9f9;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid #eee;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.month-nav-button {
  width: 28px;
  height: 28px;
  border: none;
  background-color: transparent;
  cursor: pointer;
  position: relative;
}

.month-nav-button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  border-style: solid;
  border-width: 2px 2px 0 0;
  transform: translate(-50%, -50%) rotate(45deg);
}

.prev-month::before {
  transform: translate(-25%, -50%) rotate(-135deg);
}

.next-month::before {
  transform: translate(-75%, -50%) rotate(45deg);
}

.current-month {
  font-weight: 500;
  padding: 0 0.5rem;
  min-width: 120px;
  text-align: center;
}

.control-buttons {
  display: flex;
  gap: 10px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.add-button {
    outline: none;
    border-radius: 20px;
    border: none;
    background-color: #05cb0f;
    color: white;
    padding: 15px;
    cursor: pointer;
}
@media (max-width: 768px) {
  .section-title {
    margin-bottom: 16px;
  }
  
  .section-title .add-mobile-button {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .control-bar {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .month-filter {
    flex: 1;
    padding: 6px 12px;
    min-width: 200px;
  }
  
  .control-buttons {
    flex: 1;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  
  .toggle-view-button {
    padding: 8px 12px;
    font-size: 14px;
    width: 100%;
  }
  
  .current-month {
    min-width: 100px;
    font-size: 14px;
  }
  
  .add-button {
    display: none !important;
    outline: none;
    border-radius: 20px;
    border: none;
    background-color: #2E7D32;
    color: white;
  }
}

@media (max-width: 480px) {
  .control-bar {
    gap: 8px;
  }
  
  .month-filter {
    padding: 4px 10px;
    min-width: 150px;
  }
  
  .toggle-view-button {
    font-size: 13px;
    padding: 8px 12px;
  }
  
  .current-month {
    min-width: 90px;
    font-size: 13px;
  }
}

.debt-list {
  margin-top: 16px;
  border-top: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.debt-item {
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #e0e0e0;
  transition: all 0.2s ease;
  position: relative;
}

.debt-item.settled {
  background-color: #f5f5f5;
  border-color: #e0e0e0;
}

.debt-item.paid {
  border-color: #4CAF50;
}

.debt-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.debt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.debt-info {
  flex: 1;
}

.debt-checkbox {
  margin-right: 8px;
}

.debt-checkbox input[type="checkbox"] {
  display: none;
}

.debt-checkbox label {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #4CAF50;
  border-radius: 4px;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
}

.debt-checkbox input[type="checkbox"]:checked + label:after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #4CAF50;
  font-size: 14px;
}

.debt-details {
  flex: 1;
}

.debt-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 16px;
  color: #333;
  flex-wrap: wrap;
}

.debt-date, .debt-end-date, .debt-creditor, .debt-total-amount {
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
  text-align: left;
}

.total-amount-value {
  font-weight: 600;
  color: #333;
}

.debt-amount-container {
  text-align: left;
  min-width: 120px;
  margin-bottom: 10px; /* Tạo khoảng trống cho button */
}

.debt-amount {
  font-size: 20px;
  font-weight: 600;
  color: #f44336;
  margin-bottom: 8px;
  text-align: left;
}

.debt-amount.lent-amount {
  color: #2196F3;
}

.debt-amount.settled-amount {
  color: #9e9e9e;
}

.debt-total-note {
  display: block;
  font-size: 14px;
  color: #757575;
  margin-top: 4px;
  text-align: left;
}

.settlement-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e0e0e0;
  font-size: 14px;
  color: #666;
}

.settlement-container {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
}

.settlement-button {
  width: 100%;
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.settlement-button:hover {
  background-color: #45a049;
}

.settlement-button:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}

.debt-type-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.debt-type-tag.owed-tag {
  background-color: #ff5252;
  color: white;
}

.debt-type-tag.lent-tag {
  background-color: #4CAF50;
  color: white;
}

.recurring-badge {
  color: #757575;
  font-size: 14px;
}

@media (max-width: 768px) {
  .debt-item {
    padding: 12px;
    padding-bottom: 60px; /* Tạo khoảng trống cho button trên mobile */
  }

  .debt-header {
    flex-direction: column;
  }

  .debt-info {
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .debt-amount-container {
    width: 100%;
    min-width: auto;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #eee;
  }

  .settlement-container {
    bottom: 12px;
    left: 12px;
    right: 12px;
  }

  .settlement-button {
    padding: 10px;
    font-size: 14px;
  }
}

.debt-item.paid {
  background-color: #f8fff8;
}

.debt-item.recurring {
  border-left: 3px solid #4CAF50;
  padding-left: 16px;
}

.debt-item.lent {
  border-left: 3px solid #2196F3;
  padding-left: 16px;
}

.debt-item.overdue {
  border-left: 3px solid #f44336;
  background-color: #fff8f8;
}

.debt-item.due-today {
  border-left: 3px solid #ffc107;
  background-color: #fffcf0;
}

.debt-item.due-soon {
  border-left: 3px solid #2196f3;
  background-color: #f0f8ff;
}

.debt-item:last-child {
  border-bottom: none;
  border-radius: 0 0 8px 8px;
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
  width: 22px;
  height: 22px;
  cursor: pointer;
  accent-color: #4CAF50;
  border-radius: 4px;
  transition: all 0.2s;
}

.debt-checkbox input[type="checkbox"]:hover {
  transform: scale(1.1);
}

.debt-description {
  font-weight: 500;
  font-size: 16px;
  line-height: 1.4;
  color: #333;
}

.debt-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.debt-date, .debt-creditor {
  color: #757575;
  font-size: 14px;
}

.debt-amount-container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 12px;
}

.debt-amount {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  text-align: right;
}

.debt-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.settled {
  background-color: #9e9e9e;
  color: white;
}

.status-badge.paid {
  background-color: #4CAF50;
  color: white;
}

.debt-type-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.debt-type-tag.owed-tag {
  background-color: #ff5252;
  color: white;
}

.debt-type-tag.lent-tag {
  background-color: #4CAF50;
  color: white;
}

.debt-total-note {
  font-size: 12px;
  color: #757575;
  font-style: italic;
  margin-top: 4px;
  display: block;
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
  padding: 20px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  margin: auto;
  margin-bottom: env(safe-area-inset-bottom, 20px);
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
    align-items: flex-start;
    padding-top: 20px;
  }

  .modal-content {
    max-height: calc(100vh - 100px);
    margin-bottom: 80px; /* Khoảng cách với thanh menu */
  }
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
  overflow-y: auto;
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
.form-group input[type="date"] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.amount-input {
  position: relative;
}

.amount-input input {
  text-align: left;
  font-size: 18px;
  font-weight: 500;
}

.recurring-group {
  border: 1px solid #e0e0e0;
  padding: 16px;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.recurring-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.recurring-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #4CAF50;
}

.recurring-checkbox label {
  margin: 0;
  cursor: pointer;
  user-select: none;
}

.recurring-details {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e0e0e0;
}

.required {
  color: #f44336;
  margin-left: 4px;
}

@media (max-width: 768px) {
  .modal-body {
    padding: 16px;
  }
  
  .recurring-group {
    padding: 12px;
  }
}

.form-actions {
  display: flex;
  flex-direction: column;
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
    padding: 20px;
    margin-bottom: 16px;
    
    .debt-header {
      margin-bottom: 16px;
    }
    
    .debt-amount-container {
      margin-top: 12px;
    }
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

  .month-filter {
    flex:1;
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

.view-toggle-button {
  padding: 10px 16px;
  background-color: #f1f1f1;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.view-toggle-button:hover {
  background-color: #e0e0e0;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.debt-total-note {
  font-size: 12px;
  color: #757575;
  font-style: italic;
}

.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap : 10px;
  flex-wrap: wrap;
}

.debts-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(145deg, #f8f9fa, #ffffff);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.summary-item {
  background: white;
  padding: 20px;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.summary-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.summary-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 0.95rem;
  margin-bottom: 12px;
  font-weight: 500;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  min-height: 340px;
}
.summary-value {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 4px;
}

.summary-item.total {
  background: linear-gradient(145deg, #e8f5e9, #ffffff);
  border-left: 4px solid #4CAF50;
}

.summary-item.total .summary-value {
  color: #2e7d32;
}

.summary-item.paid {
  background: linear-gradient(145deg, #f3e5f5, #ffffff);
  border-left: 4px solid #9c27b0;
}

.summary-item.paid .summary-value {
  color: #6a1b9a;
}

.summary-item.remaining {
  background: linear-gradient(145deg, #ffebee, #ffffff);
  border-left: 4px solid #f44336;
}

.summary-item.remaining .summary-value {
  color: #c62828;
}

@media (max-width: 768px) {
  .debts-summary {
    grid-template-columns: repeat(3, 1fr);
    padding: 15px;
    gap: 15px;
  }

  .summary-item {
    padding: 15px;
  }

  .summary-label {
    font-size: 0.9rem;
  }

  .summary-value {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .debts-summary {
    grid-template-columns: 1fr;
    padding: 12px;
    gap: 12px;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
  }

  .summary-label {
    margin-bottom: 0;
    font-size: 0.85rem;
  }

  .summary-value {
    font-size: 1.1rem;
    margin-top: 0;
  }
}
.toggle-view-button{
  border-radius: 20px;
  outline: none;
  border: none;
  background-color: #8b939c;
  min-height: 42px;
  color: white;
  padding-left: 10px;
  padding-right: 10px;
  cursor: pointer;
}

.settlement-button {
  background-color: #FF9800;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
  white-space: nowrap;
}

.settlement-button:hover {
  background-color: #F57C00;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.settled-label,
.paid-label {
  display: none;
}

.debt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.debt-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background-color: #e0e0e0;
  color: #333;
}

.debt-status.overdue {
  background-color: #ff5252;
  color: white;
}

.debt-status.due-today {
  background-color: #ff9800;
  color: white;
}

.debt-status.due-soon {
  background-color: #ffd740;
  color: #333;
}

.debt-type-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.debt-type-tag.owed-tag {
  background-color: #ff5252;
  color: white;
}

.debt-type-tag.lent-tag {
  background-color: #4CAF50;
  color: white;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  background-color: #f9f9f9;
  border-radius: 0 0 8px 8px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.delete-button {
  width: 100%;
  padding: 12px 20px;
  background-color: transparent;
  color: #dc3545;
  border: 1px solid #dc3545;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.delete-button:hover {
  background-color: #dc3545;
  color: white;
}

.delete-confirm-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  flex: 1;
}

.delete-confirm-button:hover {
  background-color: #c82333;
}

.warning-text {
  color: #dc3545;
  font-style: italic;
  margin-top: 8px;
  font-size: 14px;
}

@media (max-width: 480px) {
  .form-actions {
    padding: 12px;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .delete-button,
  .cancel-button,
  .submit-button,
  .delete-confirm-button {
    width: 100%;
    padding: 10px 16px;
  }
}

/* Add loading overlay styles */
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
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.loading-text {
  font-size: 18px;
  color: #333;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 