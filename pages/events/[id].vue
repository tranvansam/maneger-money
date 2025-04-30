<template>
  <div class="event-detail-page">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Đang tải dữ liệu...</div>
    </div>

    <div v-if="event" class="event-content">
      <!-- Header section -->
      <div class="page-header">
        <button @click="goBack" class="back-button">
          <span class="back-icon">←</span>
          Quay lại
        </button>
        <h1 class="event-title">{{ event.name }}</h1>
        <div class="event-status" :class="{ 'active': !event.isEnded, 'ended': event.isEnded }">
          {{ event.isEnded ? 'Đã kết thúc' : 'Đang diễn ra' }}
        </div>
      </div>

      <!-- Event info section -->
      <div class="info-section">
        <div class="info-card">
          <h2>Thông tin sự kiện</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Ngày bắt đầu</span>
              <span class="info-value">{{ formatDate(event.startDate) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Ngày kết thúc</span>
              <span class="info-value">{{ formatDate(event.endDate) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Người tạo</span>
              <span class="info-value">{{ event.creator }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tổng chi tiêu</span>
              <span class="info-value">{{ formatCurrency(event.totalAmount) }}</span>
            </div>
          </div>
          <div class="description-box">
            <h3>Mô tả</h3>
            <p>{{ event.description || 'Không có mô tả' }}</p>
          </div>
        </div>

        <!-- Participants section -->
        <div class="participants-section">
          <h2>Người tham gia ({{ event.participants?.length || 0 }})</h2>
          <div class="participants-list">
            <div v-for="participant in event.participants" 
                 :key="participant.uid" 
                 class="participant-card"
                 @click="navigateToProfile(participant.uid)">
              <Avatar 
                :email="participant.email"
                :name="participant.displayName"
                size="medium"
                class="participant-avatar"
              />
              <div class="participant-info">
                <span class="participant-name">{{ participant.displayName || participant.email }}</span>
                <span class="participant-email" v-if="participant.displayName">{{ participant.email }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Transactions Section -->
      <div class="transactions-section">
        <div class="section-header">
          <h2>Danh sách thu chi</h2>
          <div class="action-buttons">
            <button @click="openTransactionModal('expense')" class="action-btn expense-btn">
              + Thêm chi tiêu
            </button>
            <button @click="openTransactionModal('income')" class="action-btn income-btn">
              + Thêm khoản thu
            </button>
          </div>
        </div>

        <div class="filter-bar">
          <div class="filter-buttons">
            <button 
              v-for="filter in ['all', 'income', 'expense']" 
              :key="filter"
              @click="currentFilter = filter"
              :class="['filter-btn', { active: currentFilter === filter }]"
            >
              {{ filterLabels[filter] }}
            </button>
          </div>
          <div class="summary">
            <div class="summary-item income">
              <span class="label">Tổng thu:</span>
              <span class="amount">{{ formatCurrency(event.totalIncome || 0) }}</span>
            </div>
            <div class="summary-item expense">
              <span class="label">Tổng chi:</span>
              <span class="amount">{{ formatCurrency(event.totalExpense || 0) }}</span>
            </div>
          </div>
        </div>

        <div class="transactions-list">
          <div 
            v-for="transaction in filteredTransactions" 
            :key="transaction.id"
            class="transaction-card"
            :class="transaction.type"
          >
            <div class="transaction-content">
              <div class="transaction-main">
                <div class="transaction-info">
                  <div class="transaction-header">
                    <Avatar 
                      :email="transaction.createdBy.email"
                      :name="transaction.createdBy.displayName"
                      size="small"
                      class="transaction-avatar"
                      @click.stop="navigateToProfile(transaction.createdBy.uid)"
                    />
                    <div class="transaction-meta">
                      <h3 class="transaction-description">{{ transaction.description }}</h3>
                      <div class="transaction-details">
                        <span class="date">{{ formatDate(transaction.date) }}</span>
                        <span class="creator" @click.stop="navigateToProfile(transaction.createdBy.uid)">
                          {{ transaction.createdBy.displayName || transaction.createdBy.email }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="transaction-amount">
                  <span :class="transaction.type">
                    {{ transaction.type === 'income' ? '+' : '-' }} {{ formatCurrency(transaction.amount) }}
                  </span>
                </div>
              </div>
              
              <div v-if="canEditTransaction(transaction)" class="transaction-actions">
                <button 
                  @click="editTransaction(transaction)"
                  class="action-icon edit"
                  title="Chỉnh sửa"
                >
                  ✏️
                </button>
                <button 
                  @click="confirmDeleteTransaction(transaction)"
                  class="action-icon delete"
                  title="Xóa"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>

          <div v-if="filteredTransactions.length === 0" class="no-transactions">
            Chưa có giao dịch nào
          </div>
        </div>
      </div>

      <!-- Transaction Modal -->
      <div v-if="showTransactionModal" class="modal-overlay" @click.self="closeTransactionModal">
        <div class="modal-content">
          <div class="modal-header" :class="transactionForm.type">
            <h3>{{ modalTitle }}</h3>
            <button @click="closeTransactionModal" class="close-btn">&times;</button>
          </div>

          <form @submit.prevent="handleSubmitTransaction" class="transaction-form">
            <div class="form-group">
              <label for="amount">Số tiền</label>
              <input
                id="amount"
                v-model="transactionForm.amount"
                type="number"
                required
                min="0"
                placeholder="Nhập số tiền"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="date">Ngày</label>
              <input
                id="date"
                v-model="transactionForm.date"
                type="date"
                required
                :max="today"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="description">Mô tả</label>
              <textarea
                id="description"
                v-model="transactionForm.description"
                required
                placeholder="Nhập mô tả"
                class="form-input"
                rows="3"
              ></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeTransactionModal" class="cancel-btn">
                Hủy
              </button>
              <button 
                type="submit" 
                class="submit-btn"
                :class="[transactionForm.type, { loading: isSubmitting }]"
                :disabled="isSubmitting"
              >
                {{ submitButtonText }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal-content delete-modal">
          <div class="modal-header">
            <h3>Xác nhận xóa</h3>
            <button @click="showDeleteModal = false" class="close-btn">&times;</button>
          </div>

          <div class="modal-body">
            <p>Bạn có chắc chắn muốn xóa giao dịch này?</p>
            <p class="delete-info">
              {{ selectedTransaction?.description }} - 
              {{ formatCurrency(selectedTransaction?.amount || 0) }}
            </p>
          </div>

          <div class="modal-actions">
            <button @click="showDeleteModal = false" class="cancel-btn">
              Hủy
            </button>
            <button 
              @click="handleDeleteTransaction"
              class="delete-btn"
              :class="{ loading: isSubmitting }"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? 'Đang xóa...' : 'Xóa' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '~/plugins/firebase';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '~/composables/useAuth';
import Avatar from '~/components/Avatar.vue';

definePageMeta({
  middleware: 'auth'
});

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const event = ref(null);

const { user } = useAuth();
const showTransactionModal = ref(false);
const showDeleteModal = ref(false);
const isSubmitting = ref(false);
const currentFilter = ref('all');
const selectedTransaction = ref(null);

const transactionForm = ref({
  id: null,
  type: 'expense',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: ''
});

const filterLabels = {
  all: 'Tất cả',
  income: 'Khoản thu',
  expense: 'Chi tiêu'
};

const today = computed(() => {
  return new Date().toISOString().split('T')[0];
});

const modalTitle = computed(() => {
  const action = transactionForm.value.id ? 'Chỉnh sửa' : 'Thêm';
  const type = transactionForm.value.type === 'income' ? 'khoản thu' : 'chi tiêu';
  return `${action} ${type}`;
});

const submitButtonText = computed(() => {
  if (isSubmitting.value) return 'Đang lưu...';
  return transactionForm.value.id ? 'Cập nhật' : 'Lưu';
});

const filteredTransactions = computed(() => {
  if (!event.value?.transactions) return [];
  
  return event.value.transactions
    .filter(transaction => 
      currentFilter.value === 'all' || 
      transaction.type === currentFilter.value
    )
    .sort((a, b) => b.date.seconds - a.date.seconds);
});

const canEditTransaction = (transaction) => {
  return transaction.createdBy.uid === user.value?.uid;
};

const openTransactionModal = (type, transaction = null) => {
  if (transaction) {
    transactionForm.value = {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      date: new Date(transaction.date.seconds * 1000).toISOString().split('T')[0],
      description: transaction.description
    };
  } else {
    transactionForm.value = {
      id: null,
      type,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    };
  }
  showTransactionModal.value = true;
};

const closeTransactionModal = () => {
  showTransactionModal.value = false;
  transactionForm.value = {
    id: null,
    type: 'expense',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  };
};

const handleSubmitTransaction = async () => {
  if (!event.value || !user.value) return;
  
  isSubmitting.value = true;
  try {
    const eventRef = doc(db, 'events', event.value.id);
    
    // Initialize transactions array if not exists
    if (!event.value.transactions) {
      event.value.transactions = [];
      await updateDoc(eventRef, { transactions: [] });
    }

    const transactionData = {
      id: transactionForm.value.id || Date.now().toString(),
      type: transactionForm.value.type,
      amount: Number(transactionForm.value.amount),
      date: Timestamp.fromDate(new Date(transactionForm.value.date)),
      description: transactionForm.value.description,
      createdAt: Timestamp.now(),
      createdBy: {
        uid: user.value.uid,
        email: user.value.email,
        displayName: user.value.displayName || user.value.email
      }
    };

    let updatedTransactions = [...event.value.transactions];
    
    if (transactionForm.value.id) {
      // Update existing transaction
      const index = updatedTransactions.findIndex(t => t.id === transactionForm.value.id);
      if (index !== -1) {
        updatedTransactions[index] = transactionData;
      }
    } else {
      // Add new transaction
      updatedTransactions.push(transactionData);
    }

    // Calculate new totals
    const totalIncome = updatedTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = updatedTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Update Firestore in one batch
    await updateDoc(eventRef, {
      transactions: updatedTransactions,
      totalIncome,
      totalExpense
    });

    // Update local state
    event.value.transactions = updatedTransactions;
    event.value.totalIncome = totalIncome;
    event.value.totalExpense = totalExpense;

    closeTransactionModal();
  } catch (error) {
    console.error('Error handling transaction:', error);
    alert('Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.');
  } finally {
    isSubmitting.value = false;
  }
};

const editTransaction = (transaction) => {
  openTransactionModal(transaction.type, transaction);
};

const confirmDeleteTransaction = (transaction) => {
  selectedTransaction.value = transaction;
  showDeleteModal.value = true;
};

const handleDeleteTransaction = async () => {
  if (!selectedTransaction.value || !event.value) return;
  
  isSubmitting.value = true;
  try {
    const eventRef = doc(db, 'events', event.value.id);
    
    // Remove transaction
    await updateDoc(eventRef, {
      transactions: arrayRemove(selectedTransaction.value)
    });

    // Update local state
    const index = event.value.transactions.findIndex(t => t.id === selectedTransaction.value.id);
    event.value.transactions.splice(index, 1);

    // Update totals
    if (selectedTransaction.value.type === 'income') {
      event.value.totalIncome -= selectedTransaction.value.amount;
      await updateDoc(eventRef, { totalIncome: event.value.totalIncome });
    } else {
      event.value.totalExpense -= selectedTransaction.value.amount;
      await updateDoc(eventRef, { totalExpense: event.value.totalExpense });
    }

    showDeleteModal.value = false;
    selectedTransaction.value = null;
  } catch (error) {
    console.error('Error deleting transaction:', error);
    alert('Có lỗi xảy ra khi xóa giao dịch. Vui lòng thử lại.');
  } finally {
    isSubmitting.value = false;
  }
};

// Format date
const formatDate = (date) => {
  if (!date) return 'Chưa xác định';
  return new Date(date.seconds * 1000).toLocaleDateString('vi-VN');
};

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount || 0);
};

// Go back function
const goBack = () => {
  router.back();
};

// Fetch event details
const fetchEventDetails = async () => {
  try {
    const eventId = route.params.id;
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    
    if (eventDoc.exists()) {
      event.value = {
        id: eventDoc.id,
        ...eventDoc.data()
      };
    } else {
      router.push('/events');
    }
  } catch (error) {
    console.error('Error fetching event details:', error);
  } finally {
    loading.value = false;
  }
};

const navigateToProfile = (uid) => {
  if (uid) {
    router.push(`/profile/${uid}`);
  }
};

onMounted(() => {
  fetchEventDetails();
});
</script>

<style scoped>
.event-detail-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
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
  z-index: 1000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #f5f5f5;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  color: #333;
  transition: all 0.2s;
}

.back-button:hover {
  background-color: #e0e0e0;
  transform: translateX(-2px);
}

.back-icon {
  font-size: 20px;
}

.event-title {
  font-size: 24px;
  color: #333;
  margin: 0;
  flex: 1;
}

.event-status {
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
}

.event-status.active {
  background-color: #e8f5e9;
  color: #2E7D32;
}

.event-status.ended {
  background-color: #ffebee;
  color: #c62828;
}

.info-section {
  display: grid;
  gap: 20px;
  grid-template-columns: 2fr 1fr;
}

.info-card {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.info-card h2 {
  font-size: 18px;
  color: #333;
  margin: 0 0 20px 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 14px;
  color: #666;
}

.info-value {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.description-box {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.description-box h3 {
  font-size: 16px;
  color: #333;
  margin: 0 0 10px 0;
}

.description-box p {
  color: #666;
  line-height: 1.5;
  margin: 0;
}

.participants-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.participants-section h2 {
  font-size: 18px;
  color: #333;
  margin: 0 0 20px 0;
}

.participants-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.participant-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.participant-card:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.participant-card:active {
  transform: translateY(0);
  background: #e9ecef;
}

.participant-avatar {
  flex-shrink: 0;
}

.participant-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.participant-name {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.participant-email {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transactions-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 20px;
  color: #333;
  margin: 0;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.income-btn {
  background-color: #4CAF50;
  color: white;
}

.income-btn:hover {
  background-color: #43A047;
}

.expense-btn {
  background-color: #F44336;
  color: white;
}

.expense-btn:hover {
  background-color: #E53935;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
}

.filter-buttons {
  display: flex;
  gap: 10px;
}

.filter-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.filter-btn.active {
  background-color: #333;
  border-color: #333;
  color: white;
}

.summary {
  display: flex;
  gap: 20px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-item .label {
  font-size: 14px;
  color: #666;
}

.summary-item .amount {
  font-weight: 600;
  font-family: monospace;
}

.summary-item.income .amount {
  color: #4CAF50;
}

.summary-item.expense .amount {
  color: #F44336;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.transaction-card {
  padding: 16px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #eee;
  transition: all 0.2s;
}

.transaction-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.transaction-card.income {
  border-left: 4px solid #4CAF50;
}

.transaction-card.expense {
  border-left: 4px solid #F44336;
}

.transaction-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.transaction-main {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.transaction-info {
  flex: 1;
}

.transaction-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.transaction-avatar {
  cursor: pointer;
  transition: transform 0.2s;
}

.transaction-avatar:hover {
  transform: scale(1.1);
}

.transaction-meta {
  flex: 1;
  min-width: 0;
}

.transaction-description {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transaction-details {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.creator {
  cursor: pointer;
  transition: color 0.2s;
}

.creator:hover {
  color: #4CAF50;
  text-decoration: underline;
}

.date {
  color: #888;
}

.transaction-amount {
  font-family: monospace;
  font-size: 16px;
  font-weight: 600;
}

.transaction-amount .income {
  color: #4CAF50;
}

.transaction-amount .expense {
  color: #F44336;
}

.transaction-actions {
  display: flex;
  gap: 8px;
}

.action-icon {
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.action-icon:hover {
  opacity: 1;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header.income {
  border-bottom: 3px solid #4CAF50;
}

.modal-header.expense {
  border-bottom: 3px solid #F44336;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.transaction-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.form-input:focus {
  outline: none;
  border-color: #4CAF50;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.cancel-btn {
  padding: 8px 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 4px;
  color: #666;
  cursor: pointer;
}

.submit-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  min-width: 100px;
  text-align: center;
}

.submit-btn.income {
  background: #4CAF50;
}

.submit-btn.expense {
  background: #F44336;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.delete-modal {
  max-width: 400px;
}

.modal-body {
  padding: 20px;
}

.delete-info {
  margin-top: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 14px;
}

.delete-btn {
  padding: 8px 16px;
  background: #F44336;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.delete-btn:hover:not(:disabled) {
  background: #E53935;
}

.delete-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading {
  position: relative;
  color: transparent !important;
}

.loading::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .event-detail-page {
    padding: 15px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .info-section {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    flex-direction: column;
    gap: 15px;
  }

  .filter-buttons {
    width: 100%;
    justify-content: space-between;
  }

  .summary {
    width: 100%;
    justify-content: space-around;
  }

  .transaction-content {
    flex-direction: column;
  }

  .transaction-main {
    flex-direction: column;
    gap: 8px;
  }

  .transaction-actions {
    justify-content: flex-end;
    padding-top: 8px;
    border-top: 1px solid #eee;
  }
}
</style> 