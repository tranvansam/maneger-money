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

      <!-- Tabs Section -->
      <div class="tabs-section">
        <div class="tabs">
          <button 
            @click="activeTab = 'transactions'"
            :class="['tab-btn', { active: activeTab === 'transactions' }]"
          >
            Thu chi
          </button>
          <button 
            @click="activeTab = 'plans'"
            :class="['tab-btn', { active: activeTab === 'plans' }]"
          >
            Kế hoạch
          </button>
          <button 
            @click="activeTab = 'statistics'"
            :class="['tab-btn', { active: activeTab === 'statistics' }]"
          >
            Thống kê
          </button>
          <button 
            @click="activeTab = 'discussion'"
            :class="['tab-btn', { active: activeTab === 'discussion' }]"
          >
            Thảo luận
          </button>
        </div>
      </div>

      <!-- Transactions Section -->
      <div v-if="activeTab === 'transactions'" class="transactions-section">
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

      <!-- Plans Section -->
      <div v-if="activeTab === 'plans'" class="plans-section">
        <div class="section-header">
          <div class="section-title">
            <h2>Danh sách kế hoạch</h2>
            <div class="total-amount">
              Tổng chi tiêu dự kiến: {{ formatCurrency(totalEstimatedAmount) }}
            </div>
          </div>
          <button @click="openPlanModal" class="action-btn plan-btn">
            + Thêm kế hoạch
          </button>
        </div>

        <div class="plans-list">
          <draggable
            v-model="sortedPlans"
            item-key="id"
            @end="handleDragEnd"
            handle=".drag-handle"
          >
            <template #item="{element: plan}">
              <div class="plan-card" :class="{ 'completed': plan.isCompleted }">
                <div class="drag-handle">
                  <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="plan-content">
                  <div class="plan-main">
                    <div class="plan-info">
                      <div class="plan-header">
                        <div class="plan-title-row">
                          <label class="completion-checkbox">
                            <input 
                              type="checkbox" 
                              :checked="plan.isCompleted"
                              @change="togglePlanCompletion(plan)"
                            />
                            <span class="checkmark"></span>
                          </label>
                          <h3 class="plan-title">{{ plan.title }}</h3>
                          <span v-if="plan.isCompleted" class="completed-badge">Đã hoàn thành</span>
                        </div>
                        <div class="plan-meta">
                          <span class="date">{{ formatDateTime(plan.startTime) }} - {{ formatDateTime(plan.endTime) }}</span>
                          <span class="creator" @click.stop="navigateToProfile(plan.createdBy.uid)">
                            {{ plan.createdBy.displayName || plan.createdBy.email }}
                          </span>
                        </div>
                      </div>
                      <p class="plan-description">{{ plan.description || 'Không có mô tả' }}</p>
                      <div class="plan-details">
                        <div class="detail-item">
                          <span class="label">Dự kiến chi tiêu:</span>
                          <span class="value">{{ formatCurrency(plan.estimatedAmount) }}</span>
                        </div>
                        <div class="detail-item assignees">
                          <span class="label">Người đảm nhiệm</span>
                          <div class="assignees-list">
                            <template v-if="plan.assignees && plan.assignees.length > 0">
                              <Avatar 
                                v-for="uid in plan.assignees"
                                :key="uid"
                                :email="getParticipantEmail(uid)"
                                :name="getParticipantName(uid)"
                                size="small"
                                class="assignee-avatar"
                                :title="getParticipantName(uid)"
                              />
                            </template>
                            <span v-else class="all-members">Tất cả thành viên</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div v-if="canEditPlan(plan)" class="plan-actions">
                    <button 
                      @click="editPlan(plan)"
                      class="action-icon edit"
                      title="Chỉnh sửa"
                    >
                      ✏️
                    </button>
                    <button 
                      @click="confirmDeletePlan(plan)"
                      class="action-icon delete"
                      title="Xóa"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </draggable>

          <div v-if="sortedPlans.length === 0" class="no-plans">
            Chưa có kế hoạch nào
          </div>
        </div>
      </div>

      <!-- Statistics Section -->
      <div v-if="activeTab === 'statistics'" class="statistics-section">
        <div class="section-header">
          <h2>Thống kê chi tiêu theo kế hoạch</h2>
        </div>

        <div class="statistics-content">
          <div class="statistics-summary">
            <div class="summary-card">
              <h3>Tổng quan</h3>
              <div class="summary-item">
                <span class="label">Tổng chi tiêu dự kiến:</span>
                <span class="value">{{ formatCurrency(totalEstimatedAmount) }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Tổng chi tiêu thực tế:</span>
                <span class="value">{{ formatCurrency(totalActualAmount) }}</span>
              </div>
              <div class="summary-item difference" :class="getDifferenceClass(totalEstimatedAmount, totalActualAmount)">
                <span class="label">Chênh lệch:</span>
                <span class="value">{{ formatCurrency(totalActualAmount - totalEstimatedAmount) }}</span>
              </div>
            </div>
          </div>

          <div class="statistics-details">
            <div v-for="plan in sortedPlans" :key="plan.id" class="plan-statistics-card">
              <h4>{{ plan.title }}</h4>
              <div class="statistics-grid">
                <div class="stat-item">
                  <span class="label">Dự kiến:</span>
                  <span class="value">{{ formatCurrency(plan.estimatedAmount) }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">Thực tế:</span>
                  <span class="value">{{ formatCurrency(getPlanActualAmount(plan)) }}</span>
                </div>
                <div class="stat-item difference" :class="getDifferenceClass(plan.estimatedAmount, getPlanActualAmount(plan))">
                  <span class="label">Chênh lệch:</span>
                  <span class="value">{{ formatCurrency(getPlanActualAmount(plan) - plan.estimatedAmount) }}</span>
                </div>
              </div>
            </div>

            <!-- Other expenses -->
            <div class="plan-statistics-card other">
              <h4>Chi tiêu khác</h4>
              <div class="statistics-grid">
                <div class="stat-item">
                  <span class="label">Thực tế:</span>
                  <span class="value">{{ formatCurrency(getOtherExpenses()) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Discussion Section -->
      <div v-if="activeTab === 'discussion'" class="discussion-section">
        <div class="section-header">
          <h2>Thảo luận</h2>
        </div>

        <div class="discussion-content">
          <div class="messages-container" ref="messagesContainer">
            <div v-for="message in messages" :key="message.id" class="message-item" :class="{ 'own-message': message.createdBy.uid === user.value?.uid }">
              <div class="message-header">
                <Avatar 
                  :email="message.createdBy.email"
                  :name="message.createdBy.displayName"
                  size="small"
                  class="message-avatar"
                  @click="navigateToProfile(message.createdBy.uid)"
                />
                <div class="message-meta">
                  <span class="message-author">{{ message.createdBy.displayName || message.createdBy.email }}</span>
                  <span class="message-time">{{ formatMessageTime(message.createdAt) }}</span>
                </div>
              </div>
              <div class="message-content">
                {{ message.content }}
              </div>
            </div>
            <button v-if="showScrollToBottom" class="scroll-to-bottom-btn" @click="scrollToBottom" title="Xuống cuối">
              <i class="fas fa-arrow-down"></i>
            </button>
          </div>

          <div class="message-input">
            <textarea 
              v-model="newMessage"
              placeholder="Nhập tin nhắn..."
              @keyup.enter="sendMessage"
              class="message-textarea"
            ></textarea>
            <button 
              @click="sendMessage"
              class="send-button"
              :disabled="!newMessage.trim()"
            >
              Gửi
            </button>
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
                placeholder="Nhập mô tả"
                class="form-input"
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="planId">Thuộc kế hoạch</label>
              <select
                id="planId"
                v-model="transactionForm.planId"
                class="form-input"
              >
                <option value="other">Khác</option>
                <option v-for="plan in sortedPlans" :key="plan.id" :value="plan.id">
                  {{ plan.title }}
                </option>
              </select>
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

      <!-- Plan Modal -->
      <div v-if="showPlanModal" class="modal-overlay" @click.self="closePlanModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ isEditingPlan ? 'Chỉnh sửa kế hoạch' : 'Thêm kế hoạch mới' }}</h3>
            <button @click="closePlanModal" class="close-btn">&times;</button>
          </div>

          <form @submit.prevent="handleSubmitPlan" class="plan-form">
            <div class="form-group">
              <label for="title">Tên kế hoạch <span class="required">*</span></label>
              <input
                id="title"
                v-model="planForm.title"
                type="text"
                required
                placeholder="Nhập tên kế hoạch"
                class="form-input"
                :class="{ 'invalid': !planForm.title.trim() && planForm.title !== '' }"
              />
            </div>

            <div class="form-group">
              <label for="description">Mô tả</label>
              <textarea
                id="description"
                v-model="planForm.description"
                placeholder="Nhập mô tả"
                class="form-input"
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="startTime">Thời gian bắt đầu <span class="required">*</span></label>
              <input
                id="startTime"
                v-model="planForm.startTime"
                type="datetime-local"
                required
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="endTime">Thời gian kết thúc <span class="required">*</span></label>
              <input
                id="endTime"
                v-model="planForm.endTime"
                type="datetime-local"
                required
                class="form-input"
                :min="planForm.startTime"
                :class="{ 'invalid': new Date(planForm.endTime) < new Date(planForm.startTime) }"
              />
            </div>

            <div class="form-group">
              <label for="estimatedAmount">Dự kiến chi tiêu</label>
              <input
                id="estimatedAmount"
                v-model="formattedEstimatedAmount"
                type="text"
                placeholder="0"
                class="form-input"
                @input="formatEstimatedAmount"
                @blur="validateEstimatedAmount"
              />
            </div>

            <div class="form-group">
              <label>Người đảm nhiệm</label>
              <div class="assignees-selection">
                <div 
                  v-for="participant in event.participants" 
                  :key="participant.uid"
                  class="assignee-option"
                  :class="{ selected: planForm.assignees.includes(participant.uid) }"
                  @click="toggleAssignee(participant.uid)"
                >
                  <Avatar 
                    :email="participant.email"
                    :name="participant.displayName"
                    size="small"
                    class="assignee-avatar"
                  />
                  <span class="assignee-name">{{ participant.displayName || participant.email }}</span>
                </div>
              </div>
            </div>

            <div v-if="isEditingPlan" class="form-group checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="planForm.isCompleted"
                />
                <span class="checkbox-text">Đã hoàn thành</span>
              </label>
            </div>

            <div class="modal-actions">
              <button type="button" @click="closePlanModal" class="cancel-btn">
                Hủy
              </button>
              <button 
                type="submit" 
                class="submit-btn"
                :class="{ active: isFormValid }"
                :disabled="!isFormValid || isSubmitting"
              >
                {{ isSubmitting ? 'Đang lưu...' : (isEditingPlan ? 'Cập nhật' : 'Thêm mới') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Delete Plan Confirmation Modal -->
      <div v-if="showDeletePlanModal" class="modal-overlay" @click.self="showDeletePlanModal = false">
        <div class="modal-content delete-modal">
          <div class="modal-header">
            <h3>Xác nhận xóa</h3>
            <button @click="showDeletePlanModal = false" class="close-btn">&times;</button>
          </div>

          <div class="modal-body">
            <p>Bạn có chắc chắn muốn xóa kế hoạch này?</p>
            <p class="delete-info">
              {{ selectedPlan?.title }}
            </p>
          </div>

          <div class="modal-actions">
            <button @click="showDeletePlanModal = false" class="cancel-btn">
              Hủy
            </button>
            <button @click="deletePlan" class="delete-btn">
              Xóa
            </button>
          </div>
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
    </div> <!-- Kết thúc các tab nội dung -->
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '~/plugins/firebase';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '~/composables/useAuth';
import Avatar from '~/components/Avatar.vue';
import draggable from 'vuedraggable';

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
const activeTab = ref('transactions');
const showPlanModal = ref(false);
const showDeletePlanModal = ref(false);
const isEditingPlan = ref(false);
const selectedPlan = ref(null);

const transactionForm = ref({
  id: null,
  type: 'expense',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
  planId: 'other' // Default to 'other' if no plan is selected
});

const planForm = ref({
  id: null,
  title: '',
  description: '',
  startTime: new Date().toISOString().slice(0, 16),
  endTime: new Date().toISOString().slice(0, 16),
  estimatedAmount: 0,
  isCompleted: false,
  assignees: [] // Add new field for assignees
});

const messages = ref([]);
const newMessage = ref('');
const formattedEstimatedAmount = ref('0');
const plans = ref([]);

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
      description: transaction.description,
      planId: transaction.planId || 'other'
    };
  } else {
    transactionForm.value = {
      id: null,
      type,
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      planId: 'other'
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
    description: '',
    planId: 'other'
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
      planId: transactionForm.value.planId,
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
      plans.value = event.value.plans || [];
      messages.value = event.value.messages || [];
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

let unsubscribePlans;
let unsubscribeMessages;
onMounted(() => {
  fetchEventDetails();
  // Realtime plans & messages
  const eventId = route.params.id;
  const eventRef = doc(db, 'events', eventId);
  if (unsubscribePlans) unsubscribePlans();
  if (unsubscribeMessages) unsubscribeMessages();
  unsubscribePlans = onSnapshot(eventRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    if (data.plans) {
      plans.value = data.plans;
    }
  });
  unsubscribeMessages = onSnapshot(eventRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    if (data.messages) {
      messages.value = data.messages;
    }
  });
  nextTick(() => {
    const container = messagesContainer.value;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
  });
});
onUnmounted(() => {
  if (unsubscribePlans) unsubscribePlans();
  if (unsubscribeMessages) unsubscribeMessages();
  const container = messagesContainer.value;
  if (container) {
    container.removeEventListener('scroll', handleScroll);
  }
});

// Computed Properties
const totalEstimatedAmount = computed(() => {
  return plans.value.reduce((sum, plan) => sum + (plan.estimatedAmount || 0), 0);
});

const totalActualAmount = computed(() => {
  if (!event.value?.transactions) return 0;
  return event.value.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
});

const messagesContainer = ref(null);
const showScrollToBottom = ref(false);

const isFormValid = computed(() => {
  const startTime = new Date(planForm.value.startTime);
  const endTime = new Date(planForm.value.endTime);

  // Kiểm tra các điều kiện
  const isTitleValid = planForm.value.title.trim() !== '';
  const isStartTimeValid = !isNaN(startTime.getTime()); // Chỉ kiểm tra có nhập thời gian bắt đầu
  const isEndTimeValid = !isNaN(endTime.getTime());
  const isTimeOrderValid = endTime >= startTime;

  return isTitleValid && isStartTimeValid && isEndTimeValid && isTimeOrderValid;
});

// Methods for Plans
const openPlanModal = () => {
  isEditingPlan.value = false;
  const now = new Date();
  planForm.value = {
    id: null,
    title: '',
    description: '',
    startTime: formatInputDateTime(now),
    endTime: formatInputDateTime(now),
    estimatedAmount: 0,
    isCompleted: false,
    assignees: [] // Initialize empty assignees array
  };
  formattedEstimatedAmount.value = '0';
  showPlanModal.value = true;
};

const closePlanModal = () => {
  showPlanModal.value = false;
  isEditingPlan.value = false;
  planForm.value = {
    id: null,
    title: '',
    description: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
    estimatedAmount: 0,
    isCompleted: false,
    assignees: []
  };
  formattedEstimatedAmount.value = '0';
};

const formatEstimatedAmount = () => {
  // Remove non-numeric characters
  const numericValue = formattedEstimatedAmount.value.replace(/[^0-9]/g, '');
  // Format with commas
  formattedEstimatedAmount.value = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  // Update planForm
  planForm.value.estimatedAmount = parseInt(numericValue) || 0;
};

const validateEstimatedAmount = () => {
  if (!formattedEstimatedAmount.value) {
    formattedEstimatedAmount.value = '0';
    planForm.value.estimatedAmount = 0;
  }
};

const handleSubmitPlan = async () => {
  if (!event.value || !user.value || !isFormValid.value) return;
  
  try {
    isSubmitting.value = true;
    const eventRef = doc(db, 'events', event.value.id);
    
    if (!event.value.plans) {
      event.value.plans = [];
      await updateDoc(eventRef, { plans: [] });
    }

    const planData = {
      id: planForm.value.id || Date.now().toString(),
      title: planForm.value.title.trim(),
      description: planForm.value.description.trim(),
      startTime: Timestamp.fromDate(new Date(planForm.value.startTime)),
      endTime: Timestamp.fromDate(new Date(planForm.value.endTime)),
      estimatedAmount: Number(planForm.value.estimatedAmount) || 0,
      isCompleted: planForm.value.isCompleted || false,
      assignees: planForm.value.assignees,
      order: planForm.value.id ? planForm.value.order : (plans.value.length || 0),
      createdAt: Timestamp.now(),
      createdBy: {
        uid: user.value.uid,
        email: user.value.email,
        displayName: user.value.displayName || user.value.email
      }
    };

    let updatedPlans = [...(plans.value || [])];
    
    if (planForm.value.id) {
      const index = updatedPlans.findIndex(p => p.id === planForm.value.id);
      if (index !== -1) {
        updatedPlans[index] = planData;
      }
    } else {
      updatedPlans.push(planData);
    }

    await updateDoc(eventRef, {
      plans: updatedPlans
    });

    plans.value = updatedPlans;
    closePlanModal();
    
    alert(planForm.value.id ? 'Cập nhật kế hoạch thành công!' : 'Thêm kế hoạch mới thành công!');
  } catch (error) {
    console.error('Error handling plan:', error);
    alert('Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.');
  } finally {
    isSubmitting.value = false;
  }
};

const editPlan = (plan) => {
  isEditingPlan.value = true;
  planForm.value = {
    id: plan.id,
    title: plan.title,
    description: plan.description || '',
    startTime: formatInputDateTime(new Date(plan.startTime.seconds * 1000)),
    endTime: formatInputDateTime(new Date(plan.endTime.seconds * 1000)),
    estimatedAmount: plan.estimatedAmount,
    isCompleted: plan.isCompleted,
    order: plan.order,
    assignees: plan.assignees || []
  };
  formattedEstimatedAmount.value = plan.estimatedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  showPlanModal.value = true;
};

const confirmDeletePlan = (plan) => {
  selectedPlan.value = plan;
  showDeletePlanModal.value = true;
};

const deletePlan = async () => {
  if (!selectedPlan.value || !event.value) return;
  
  try {
    isSubmitting.value = true;
    const eventRef = doc(db, 'events', event.value.id);
    
    // Remove plan
    const updatedPlans = plans.value.filter(p => p.id !== selectedPlan.value.id);
    
    // Update order for remaining plans
    updatedPlans.forEach((plan, index) => {
      plan.order = index;
    });

    // Update Firestore
    await updateDoc(eventRef, {
      plans: updatedPlans
    });

    // Update local state
    plans.value = updatedPlans;
    showDeletePlanModal.value = false;
    selectedPlan.value = null;
  } catch (error) {
    console.error('Error deleting plan:', error);
    alert('Có lỗi xảy ra khi xóa kế hoạch. Vui lòng thử lại.');
  } finally {
    isSubmitting.value = false;
  }
};

const handleDragEnd = async () => {
  try {
    const eventRef = doc(db, 'events', event.value.id);
    
    // Update order for all plans
    const updatedPlans = plans.value.map((plan, index) => ({
      ...plan,
      order: index
    }));

    // Update Firestore
    await updateDoc(eventRef, {
      plans: updatedPlans
    });

    // Update local state
    plans.value = updatedPlans;
  } catch (error) {
    console.error('Error updating plan order:', error);
    alert('Có lỗi xảy ra khi cập nhật thứ tự kế hoạch.');
  }
};

const togglePlanCompletion = async (plan) => {
  try {
    const eventRef = doc(db, 'events', event.value.id);
    
    // Update plan completion status
    const updatedPlans = plans.value.map(p => {
      if (p.id === plan.id) {
        return {
          ...p,
          isCompleted: !p.isCompleted
        };
      }
      return p;
    });

    // Update Firestore
    await updateDoc(eventRef, {
      plans: updatedPlans
    });

    // Update local state
    plans.value = updatedPlans;
  } catch (error) {
    console.error('Error toggling plan completion:', error);
    alert('Có lỗi xảy ra khi cập nhật trạng thái kế hoạch.');
  }
};

const canEditPlan = (plan) => {
  return plan.createdBy.uid === user.value?.uid;
};

// Methods for Statistics
const getPlanActualAmount = (plan) => {
  if (!event.value?.transactions) return 0;
  return event.value.transactions
    .filter(t => t.type === 'expense' && t.planId === plan.id)
    .reduce((sum, t) => sum + t.amount, 0);
};

const getOtherExpenses = () => {
  if (!event.value?.transactions) return 0;
  return event.value.transactions
    .filter(t => t.type === 'expense' && (!t.planId || t.planId === 'other'))
    .reduce((sum, t) => sum + t.amount, 0);
};

const getDifferenceClass = (estimated, actual) => {
  const difference = actual - estimated;
  if (difference > 0) return 'over-budget';
  if (difference < 0) return 'under-budget';
  return '';
};

// Methods for Discussion
const sendMessage = async () => {
  if (!newMessage.value.trim() || !event.value || !user.value) return;
  try {
    const eventRef = doc(db, 'events', event.value.id);
    // Initialize messages array if not exists
    if (!event.value.messages) {
      event.value.messages = [];
      await updateDoc(eventRef, { messages: [] });
    }
    const messageData = {
      id: Date.now().toString(),
      content: newMessage.value.trim(),
      createdAt: Timestamp.now(),
      createdBy: {
        uid: user.value.uid,
        email: user.value.email,
        displayName: user.value.displayName || user.value.email
      }
    };
    // Add new message
    await updateDoc(eventRef, {
      messages: arrayUnion(messageData)
    });
    newMessage.value = '';
    // Scroll to bottom
    nextTick(() => {
      const container = messagesContainer.value;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại.');
  }
};

const formatDateTime = (date) => {
  if (!date) return 'Chưa xác định';
  const d = new Date(date.seconds * 1000);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatInputDateTime = (date) => {
  const d = new Date(date);
  return d.toISOString().slice(0, 16);
};

const formatMessageTime = (date) => {
  if (!date) return '';
  return new Date(date.seconds * 1000).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Thêm computed property để sắp xếp kế hoạch
const sortedPlans = computed(() => {
  return [...plans.value].sort((a, b) => {
    const timeA = new Date(a.startTime.seconds * 1000);
    const timeB = new Date(b.startTime.seconds * 1000);
    return timeA - timeB;
  });
});

const toggleAssignee = (uid) => {
  const index = planForm.value.assignees.indexOf(uid);
  if (index === -1) {
    planForm.value.assignees.push(uid);
  } else {
    planForm.value.assignees.splice(index, 1);
  }
};

const getParticipantEmail = (uid) => {
  const participant = event.value.participants.find(p => p.uid === uid);
  return participant ? participant.email : '';
};

const getParticipantName = (uid) => {
  const participant = event.value.participants.find(p => p.uid === uid);
  return participant ? (participant.displayName || participant.email) : '';
};

// Scroll to bottom function
const scrollToBottom = () => {
  const container = messagesContainer.value;
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
};

// Show/hide scroll to bottom button
const handleScroll = () => {
  const container = messagesContainer.value;
  if (!container) return;
  // Nếu chưa ở cuối thì show nút
  showScrollToBottom.value = container.scrollTop + container.clientHeight < container.scrollHeight - 50;
};
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
  margin-top: 20px;
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
  color: #666;
  font-size: 14px;
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
  z-index: 9999; /* Increased z-index to be above footer */
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
  border-radius: 16px 16px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  color: #333;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.transaction-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #555;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.2s;
  background: #f8f9fa;
}

.form-input:focus {
  outline: none;
  border-color: #4CAF50;
  background: white;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.form-input:hover {
  background: white;
}

textarea.form-input {
  min-height: 100px;
  resize: vertical;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.checkbox-group:hover {
  background: #f0f0f0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-text {
  font-size: 14px;
  color: #333;
}

.modal-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.cancel-btn {
  padding: 12px 24px;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  color: #666;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #eeeeee;
  color: #333;
}

.submit-btn {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  min-width: 120px;
  text-align: center;
  transition: all 0.2s;
  background-color: #ccc;
}

.submit-btn.active {
  background-color: #4CAF50;
}

.submit-btn.active:hover:not(:disabled) {
  background-color: #43A047;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .modal-content {
    height: 95vh;
    max-height: none;
    border-radius: 20px 20px 0 0;
    margin: 0;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    padding: 16px 20px;
  }

  .plan-form {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    padding-bottom: 100px; /* Add extra padding at bottom to prevent content being hidden behind sticky actions */
  }

  .modal-actions {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    padding: 16px 20px;
    margin: 0;
    border-radius: 0;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.05);
    z-index: 1;
  }
}

@media (max-width: 480px) {
  .modal-content {
    height: 100vh;
    border-radius: 0;
  }

  .modal-header {
    padding-top: env(safe-area-inset-top, 20px); /* Support for notched phones */
  }

  .modal-actions {
    padding-bottom: env(safe-area-inset-bottom, 20px); /* Support for notched phones */
  }

  .form-group label {
    font-size: 13px;
  }

  .assignee-option {
    padding: 6px 10px;
  }

  .assignee-name {
    font-size: 13px;
  }
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
    padding: 10px;
  }

  .page-header {
    padding: 15px;
    margin-bottom: 20px;
  }

  .event-title {
    font-size: 20px;
  }

  .tabs {
    overflow-x: auto;
    padding-bottom: 5px;
    margin: 0 -10px;
    padding: 0 10px;
  }

  .tab-btn {
    white-space: nowrap;
    padding: 8px 12px;
    font-size: 13px;
  }

  .info-section {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .info-card, .participants-section {
    padding: 15px;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .participants-list {
    grid-template-columns: 1fr;
  }

  .plan-card {
    padding: 15px;
  }

  .plan-content {
    flex-direction: column;
  }

  .plan-title-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .plan-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .plan-details {
    flex-direction: column;
  }

  .plan-actions {
    position: absolute;
    top: 10px;
    right: 10px;
  }

  .action-buttons {
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .action-btn {
    width: 100%;
  }

  .filter-bar {
    flex-direction: column;
    gap: 10px;
  }

  .filter-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    width: 100%;
    gap: 5px;
  }

  .filter-btn {
    width: 100%;
    text-align: center;
    font-size: 13px;
    padding: 6px;
  }

  .summary {
    flex-direction: column;
    width: 100%;
  }

  .transaction-card {
    padding: 12px;
  }

  .transaction-content {
    flex-direction: column;
    gap: 10px;
  }

  .transaction-main {
    flex-direction: column;
  }

  .transaction-amount {
    align-self: flex-end;
  }

  .transaction-actions {
    justify-content: flex-end;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #eee;
  }

  .modal-content {
    margin: 10px;
    max-height: calc(100vh - 20px);
  }

  .form-group {
    margin-bottom: 12px;
  }

  .modal-actions {
    flex-direction: column-reverse;
    gap: 8px;
  }

  .modal-actions button {
    width: 100%;
  }

  .discussion-section {
    height: calc(100vh - 200px);
  }

  .message-input {
    padding: 10px;
  }

  .message-item {
    max-width: 90%;
  }
}

@media (max-width: 480px) {
  .event-title {
    font-size: 18px;
  }

  .tab-btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .plan-card {
    padding: 12px;
  }

  .plan-title {
    font-size: 14px;
  }

  .plan-description {
    font-size: 13px;
  }

  .detail-item .value {
    font-size: 14px;
  }
}

.tabs-section {
  margin-bottom: 20px;
}

.tabs {
  display: flex;
  gap: 10px;
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.tab-btn.active {
  background-color: #333;
  color: white;
}

.plans-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title h2 {
  font-size: 20px;
  color: #333;
  margin: 0;
}

.total-amount {
  font-size: 14px;
  color: #666;
}

.action-btn.plan-btn {
  background-color: #4CAF50;
  color: white;
}

.action-btn.plan-btn:hover {
  background-color: #43A047;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-card {
  position: relative;
  padding: 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eee;
  transition: all 0.3s ease;
  display: flex;
  gap: 15px;
}

.plan-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.drag-handle {
  display: flex;
  align-items: center;
  cursor: move;
  color: #999;
  padding: 0 5px;
}

.plan-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plan-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.plan-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex: 1;
}

.plan-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #666;
  flex-wrap: wrap;
}

.plan-description {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  margin: 8px 0;
}

.plan-details {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item .label {
  font-size: 12px;
  color: #666;
}

.detail-item .value {
  font-size: 15px;
  font-weight: 600;
  color: #2E7D32;
}

.plan-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.action-icon {
  padding: 8px;
  border-radius: 6px;
  background: #f5f5f5;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.action-icon:hover {
  background: #eeeeee;
}

.plan-card.completed {
  background-color: #f8fdf9;
  border-color: #4CAF50;
}

.completed-badge {
  font-size: 12px;
  padding: 4px 8px;
  background-color: rgba(76, 175, 80, 0.1);
  color: #2E7D32;
  border-radius: 12px;
  font-weight: 500;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.completion-checkbox {
  position: relative;
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.completion-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 20px;
  width: 20px;
  background-color: #fff;
  border: 2px solid #ddd;
  border-radius: 4px;
  transition: all 0.2s;
}

.completion-checkbox:hover input ~ .checkmark {
  border-color: #4CAF50;
}

.completion-checkbox input:checked ~ .checkmark {
  background-color: #4CAF50;
  border-color: #4CAF50;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.completion-checkbox input:checked ~ .checkmark:after {
  display: block;
}

.statistics-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.statistics-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.statistics-summary {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-card h3 {
  font-size: 18px;
  color: #333;
  margin: 0;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-item .label {
  font-size: 14px;
  color: #666;
}

.summary-item .value {
  font-weight: 600;
  font-family: monospace;
}

.summary-item.difference {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px dashed #ddd;
}

.summary-item.difference.over-budget .value {
  color: #F44336;
}

.summary-item.difference.under-budget .value {
  color: #4CAF50;
}

.statistics-details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.plan-statistics-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #eee;
  transition: all 0.2s;
}

.plan-statistics-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.plan-statistics-card h4 {
  font-size: 16px;
  color: #333;
  margin: 0 0 12px 0;
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item .label {
  font-size: 12px;
  color: #666;
}

.stat-item .value {
  font-size: 14px;
  font-weight: 600;
  font-family: monospace;
}

.stat-item.difference {
  grid-column: 1 / -1;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px dashed #eee;
}

.stat-item.difference.over-budget .value {
  color: #F44336;
}

.stat-item.difference.under-budget .value {
  color: #4CAF50;
}

.plan-statistics-card.other {
  background: #f8f9fa;
  border-style: dashed;
}

.discussion-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 300px);
}

.discussion-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
  max-height: 500px;
  position: relative;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  max-height: 400px;
  min-height: 120px;
  position: relative;
}

.scroll-to-bottom-btn {
  position: absolute;
  right: 24px;
  bottom: 24px;
  z-index: 10;
  background: #4CAF50;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  cursor: pointer;
  font-size: 22px;
  transition: background 0.2s;
}
.scroll-to-bottom-btn:hover {
  background: #388e3c;
}

.message-item {
  margin-bottom: 16px;
  max-width: 80%;
}

.message-item.own-message {
  margin-left: auto;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.message-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.message-author {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.message-time {
  font-size: 12px;
  color: #666;
}

.message-content {
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  font-size: 14px;
  color: #333;
  line-height: 1.4;
}

.own-message .message-content {
  background: #4CAF50;
  color: white;
}

.message-input {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: white;
  border-top: 1px solid #eee;
  border-radius: 0 0 8px 8px;
}

.message-textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: none;
  font-size: 14px;
  line-height: 1.4;
  min-height: 40px;
  max-height: 120px;
}

.message-textarea:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}

.send-button {
  padding: 0 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.send-button:hover {
  background: #43A047;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.required {
  color: #F44336;
  margin-left: 4px;
}

.form-input.invalid {
  border-color: #F44336;
  background-color: #ffebee;
}

.assignees-selection {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.assignee-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #eee;
}

.assignee-option:hover {
  background: #f0f0f0;
}

.assignee-option.selected {
  background: #e8f5e9;
  border-color: #4CAF50;
}

.assignee-name {
  font-size: 14px;
  color: #333;
}

.assignees-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.assignee-avatar {
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.all-members {
  font-size: 13px;
  color: #666;
  font-style: italic;
}

@media (max-width: 768px) {
  .discussion-section {
    padding: 10px;
    max-width: 100vw;
    box-sizing: border-box;
  }
  .discussion-content {
    max-height: 60vh;
    min-height: 200px;
    width: 100vw;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  .messages-container {
    max-height: 45vh;
    min-height: 120px;
    width: 100vw;
    box-sizing: border-box;
    padding: 10px;
    border-radius: 0;
  }
  .scroll-to-bottom-btn {
    right: 12px;
    bottom: 12px;
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
  .info-section {
    padding: 10px;
    margin-top: 16px;
    margin-bottom: 0;
    width: 100vw;
    box-sizing: border-box;
  }
}
@media (max-width: 480px) {
  .discussion-content {
    max-height: 65vh;
    min-height: 160px;
    width: 100vw;
    padding: 0;
  }
  .messages-container {
    max-height: 50vh;
    min-height: 100px;
    width: 100vw;
    padding: 6px;
  }
  .scroll-to-bottom-btn {
    right: 8px;
    bottom: 8px;
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  .info-section {
    padding: 6px;
    margin-top: 10px;
    width: 100vw;
  }
}
</style> 