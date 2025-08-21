<template>
  <div class="event-detail-page">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Đang tải dữ liệu...</div>
    </div>

    <div v-if="event" class="event-content">
      <!-- Header section -->
      <div class="page-header">
        <div class="title-header">
          <button @click="goBack" class="back-button">
            <span class="back-icon">←</span>
            Quay lại
          </button>
          <h1 class="event-title">{{ event.name }}</h1>
        </div>
        <div class="event-status-label-top" :class="getEventStatusClass(event)">
          {{ getEventStatus(event) }}
        </div>
        <div class="action-header">
          <button
            v-if="
              getEventStatus(event) !== 'Đã kết thúc' &&
              user?.uid === event.createdBy?.uid
            "
            class="end-event-btn"
            @click="showEndEventModal = true"
          >
            Kết thúc sự kiện
          </button>
          <button
            v-if="getEventStatus(event) !== 'Đã kết thúc'"
            class="pay-btn"
            @click="openPaymentModal"
          >
            Thanh toán tất cả
          </button>
        </div>
      </div>

      <!-- Tabs Section -->
      <div class="tabs-section">
        <div class="tabs">
          <button
            v-for="tab in allTabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="['tab-btn', { active: activeTab === tab.key }]"
            style="position: relative"
          >
            {{ tab.label }}
            <span
              v-if="tab.key === 'discussion' && unreadMessagesCount > 0"
              class="notification-dot"
            ></span>
            <span
              v-if="tab.key === 'paymentHistory' && totalPendingPayments > 0"
              class="notification-dot"
            ></span>
            <span
              v-if="tab.key === 'transactions' && (unpaidIncomeCount > 0 || unpaidExpenseCount > 0)"
              class="notification-dot"
            ></span>
          </button>
        </div>
      </div>

      <!-- Transactions Section -->
      <div v-if="activeTab === 'transactions'" class="transactions-section">
        <div class="section-header">
          <h2>Danh sách thu chi</h2>
          <div class="action-buttons">
            <button
              @click="openTransactionModal('expense')"
              class="action-btn expense-btn"
            >
              + Chi
            </button>
            <button
              @click="openTransactionModal('income')"
              class="action-btn income-btn"
            >
              + Thu
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
              <span v-if="filter === 'income' && unpaidIncomeCount > 0" class="unpaid-count">({{ unpaidIncomeCount }})</span>
              <span v-if="filter === 'expense' && unpaidExpenseCount > 0" class="unpaid-count">({{ unpaidExpenseCount }})</span>
            </button>
          </div>
          <div class="summary">
            <div class="summary-item income">
              <span class="label">Tổng thu:</span>
              <span class="amount">{{
                formatCurrency(event.totalIncome || 0)
              }}</span>
            </div>
            <div class="summary-item expense">
              <span class="label">Tổng chi:</span>
              <span class="amount">{{
                formatCurrency(event.totalExpense || 0)
              }}</span>
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
                      <h3 class="transaction-description">
                        <span v-if="transaction.type === 'expense' && !isTransactionFullyPaid(transaction)" class="unpaid-dot">•</span>
                        {{ transaction.description }}
                      </h3>
                      <div class="transaction-details">
                        <span class="date">{{
                          formatDate(transaction.date)
                        }}</span>
                        <span
                          class="creator"
                          @click.stop="
                            navigateToProfile(transaction.createdBy.uid)
                          "
                        >
                          {{
                            transaction.createdBy.displayName ||
                            transaction.createdBy.email
                          }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="transaction-amount">
                  <span :class="transaction.type">
                    {{ transaction.type === "income" ? "+" : "-" }}
                    {{ formatCurrency(transaction.amount) }}
                  </span>
                </div>
              </div>
              <div v-if="transaction.type === 'expense'">
                <template
                  v-if="
                    transaction.paymentSplits &&
                    transaction.paymentSplits.length
                  "
                >
                  <div class="split-info">
                    <span class="split-status">Đã chia tiền</span>
                    <div class="payment-details">
                      <div 
                        v-for="split in getTransactionPaymentDetails(transaction)" 
                        :key="`${split.uid}-${split.payTo}`"
                        class="payment-item"
                      >
                        <template v-if="split.uid === split.payTo">
                          <!-- Trường hợp trả cho chính mình -->
                          <span class="payer">{{ getParticipantName(split.uid) }}</span>
                          <span class="amount">{{ formatCurrency(split.amount) }}</span>
                        </template>
                        <template v-else>
                          <!-- Trường hợp trả cho người khác -->
                          <span class="payer">{{ getParticipantName(split.uid) }}</span>
                          <span class="arrow">→</span>
                          <span class="payee">{{ getParticipantName(split.payTo) }}</span>
                          <span class="amount">{{ formatCurrency(split.amount) }}</span>
                          <span 
                            v-if="split.status === 'paid'" 
                            class="status paid"
                          >
                            {{ split.confirmedByReceiver ? 'Đã trả' : 'Chờ xác nhận' }}
                          </span>
                          <span 
                            v-else 
                            class="status unpaid"
                          >
                            Chưa trả
                          </span>
                        </template>
                      </div>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="transaction-actions">
                    <button
                      class="action-btn pay-btn"
                      @click="openPaymentModalForTransaction(transaction)"
                    >
                      Thanh toán
                    </button>
                  </div>
                </template>
              </div>
              <div
                v-if="
                  canEditTransaction(transaction) &&
                  !(
                    transaction.paymentSplits &&
                    transaction.paymentSplits.length
                  )
                "
                class="transaction-actions"
              >
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
        <div class="section-header plans-section-header">
          <div class="section-title">
            <div>
              <h2>Danh sách kế hoạch</h2>
              <div class="total-amount">
                Tổng chi tiêu dự kiến:
                {{ formatCurrency(totalEstimatedAmount) }}
              </div>
            </div>
            <button
              class="action-btn sort-btn"
              @click="sortPlansByStartTime"
              title="Sắp xếp theo thời gian bắt đầu"
            >
              <i class="fas fa-sort-amount-up"></i>
            </button>
          </div>
          <button @click="openPlanModal" class="action-btn plan-btn">+</button>
        </div>

        <div class="plan-filter-bar">
          <input
            v-model="searchText"
            class="plan-search-input"
            placeholder="Tìm kiếm kế hoạch..."
          />
          <select v-model="planStatusFilter" class="plan-status-dropdown">
            <option value="all">Tất cả</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="incomplete">Chưa hoàn thành</option>
          </select>
        </div>
        <div class="plans-list">
          <draggable
            :list="filteredPlans"
            item-key="id"
            @end="handleDragEnd"
            handle=".drag-handle"
          >
            <template #item="{ element: plan }">
              <div class="plan-card" :class="{ completed: plan.isCompleted }">
                <div v-if="plan.isCompleted" class="completed-ribbon">
                  Đã hoàn thành
                </div>
                <div class="plan-toolbar">
                  <div class="drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                  </div>
                  <div class="plan-toolbar-actions">
                    <button
                      v-if="canEditPlan(plan) && !plan.isCompleted"
                      @click="editPlan(plan)"
                      class="action-icon edit"
                      title="Chỉnh sửa"
                    >
                      ✏️
                    </button>
                    <button
                      v-if="canEditPlan(plan) && !plan.isCompleted"
                      @click="confirmDeletePlan(plan)"
                      class="action-icon delete"
                      title="Xóa"
                    >
                      🗑️
                    </button>
                    <label
                      class="completion-checkbox"
                      :title="
                        plan.isCompleted ? 'Đã hoàn thành' : 'Chưa hoàn thành'
                      "
                    >
                      <input
                        type="checkbox"
                        :checked="plan.isCompleted"
                        @change="togglePlanCompletion(plan)"
                      />
                      <span class="checkmark"></span>
                    </label>
                  </div>
                </div>
                <div class="plan-content">
                  <div class="plan-main">
                    <div class="plan-info">
                      <div class="plan-header">
                        <div class="plan-title-row">
                          <h3 class="plan-title">{{ plan.title }}</h3>
                          <!-- <span v-if="plan.isCompleted" class="completed-badge">Đã hoàn thành</span> -->
                        </div>
                        <div class="plan-meta">
                          <span class="date"
                            >{{ formatDateTime(plan.startTime) }} -
                            {{ formatDateTime(plan.endTime) }}</span
                          >
                          <span
                            class="creator"
                            @click.stop="navigateToProfile(plan.createdBy.uid)"
                          >
                            Người tạo:
                            {{
                              plan.createdBy.displayName || plan.createdBy.email
                            }}
                          </span>
                        </div>
                      </div>
                      <p class="plan-description">
                        Nội dung: {{ plan.description || "Không có mô tả" }}
                      </p>
                      <div class="plan-details">
                        <div class="detail-item">
                          <span class="label">Dự kiến chi tiêu:</span>
                          <span class="value">{{
                            formatCurrency(plan.estimatedAmount)
                          }}</span>
                        </div>
                        <div class="detail-item assignees">
                          <span class="label">Người đảm nhiệm</span>
                          <div class="assignees-list">
                            <template
                              v-if="plan.assignees && plan.assignees.length > 0"
                            >
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
                            <span v-else class="all-members"
                              >Tất cả thành viên</span
                            >
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </draggable>

          <div v-if="plans.length === 0" class="no-plans">
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
                <span class="value">{{
                  formatCurrency(totalEstimatedAmount)
                }}</span>
              </div>
              <div class="summary-item">
                <span class="label">Tổng chi tiêu thực tế:</span>
                <span class="value">{{
                  formatCurrency(totalActualAmount)
                }}</span>
              </div>
              <div
                class="summary-item difference"
                :class="
                  getDifferenceClass(totalEstimatedAmount, totalActualAmount)
                "
              >
                <span class="label">Chênh lệch:</span>
                <span class="value">{{
                  formatCurrency(totalActualAmount - totalEstimatedAmount)
                }}</span>
              </div>
            </div>
          </div>

          <div class="statistics-details">
            <div
              v-for="plan in plans"
              :key="plan.id"
              class="plan-statistics-card"
            >
              <h4>{{ plan.title }}</h4>
              <div class="statistics-grid">
                <div class="stat-item">
                  <span class="label">Dự kiến:</span>
                  <span class="value">{{
                    formatCurrency(plan.estimatedAmount)
                  }}</span>
                </div>
                <div class="stat-item">
                  <span class="label">Thực tế:</span>
                  <span class="value">{{
                    formatCurrency(getPlanActualAmount(plan))
                  }}</span>
                </div>
                <div
                  class="stat-item difference"
                  :class="
                    getDifferenceClass(
                      plan.estimatedAmount,
                      getPlanActualAmount(plan)
                    )
                  "
                >
                  <span class="label">Chênh lệch:</span>
                  <span class="value">{{
                    formatCurrency(
                      getPlanActualAmount(plan) - plan.estimatedAmount
                    )
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Other expenses -->
            <div class="plan-statistics-card other">
              <h4>Chi tiêu khác</h4>
              <div class="statistics-grid">
                <div class="stat-item">
                  <span class="label">Thực tế:</span>
                  <span class="value">{{
                    formatCurrency(getOtherExpenses())
                  }}</span>
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
            <template
              v-for="group in groupedMessages"
              :key="group.type ? 'date-' + group.date : group.messages[0].id"
            >
              <div v-if="group.type === 'date'" class="chat-date-separator">
                {{
                  group.date.toLocaleString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                }}
              </div>
              <div
                v-else
                :class="['chat-group', group.isOwn ? 'own-group' : '']"
              >
                <div class="chat-group-header" v-if="!group.isOwn">
                  <Avatar
                    :email="group.user.email"
                    :name="group.user.displayName"
                    size="small"
                    class="message-avatar"
                    @click="navigateToProfile(group.user.uid)"
                  />
                  <span class="message-author">{{
                    group.user.displayName || group.user.email
                  }}</span>
                </div>
                <div class="chat-bubbles">
                  <div
                    v-for="(msg, mIdx) in group.messages"
                    :key="msg.id"
                    :class="[
                      'chat-bubble',
                      group.isOwn ? 'own-bubble' : '',
                      mIdx === 0 ? 'first' : '',
                      mIdx === group.messages.length - 1 ? 'last' : '',
                    ]"
                  >
                    <span class="bubble-content">{{ msg.content }}</span>
                    <span
                      v-if="mIdx === group.messages.length - 1"
                      class="bubble-time"
                      >{{ formatMessageTime(msg.createdAt) }}</span
                    >
                  </div>
                </div>
              </div>
            </template>
            <button
              v-if="showScrollToBottom"
              class="scroll-to-bottom-btn"
              @click="scrollToBottom"
              title="Xuống cuối"
            >
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

      <!-- Payment History Section -->
      <div
        v-if="activeTab === 'paymentHistory'"
        class="payment-history-section"
      >
        <div class="section-header">
          <h2>Lịch sử thanh toán</h2>
        </div>
        
        <!-- Thống kê tổng hợp -->
        <div class="overall-stats-section">
          <div class="overall-stats-grid">
            <div class="overall-stat-item">
              <span class="overall-stat-label negative">Trả:</span>
              <span class="overall-stat-value negative">
                {{ formatCurrency(overallPaymentStats.totalToPay) }}
              </span>
            </div>
            <div class="overall-stat-item">
              <span class="overall-stat-label positive">Nhận:</span>
              <span class="overall-stat-value positive">
                {{ formatCurrency(overallPaymentStats.totalToReceive) }}
              </span>
            </div>
          </div>
          <div class="overall-stat-summary">
            <span 
              :class="[
                'overall-stat-label',
                overallPaymentStats.isPositive ? 'positive' : 
                overallPaymentStats.isNegative ? 'negative' : 'neutral'
              ]"
            >
              {{ overallPaymentStats.isPositive ? 'Sẽ nhận' : 
                 overallPaymentStats.isNegative ? 'Phải trả' : 'Cân bằng' }}:
            </span>
            <span 
              :class="[
                'overall-stat-value',
                overallPaymentStats.isPositive ? 'positive' : 
                overallPaymentStats.isNegative ? 'negative' : 'neutral'
              ]"
            >
              {{ formatCurrency(Math.abs(overallPaymentStats.netAmount)) }}
            </span>
          </div>
        </div>
        <div style="margin-bottom: 16px">
          <button
            :class="['tab-btn', { active: paymentTab === 'toPay' }]"
            @click="paymentTab = 'toPay'"
          >
            Nợ
            <span v-if="pendingPaymentsToPay > 0" class="badge-counter">{{
              pendingPaymentsToPay
            }}</span>
          </button>
          <button
            style="margin-left: 10px;"
            :class="['tab-btn ml-2', { active: paymentTab === 'toReceive' }]"
            @click="paymentTab = 'toReceive'"
          >
            Thu hồi nợ
            <span v-if="pendingPaymentsToReceive > 0" class="badge-counter">{{
              pendingPaymentsToReceive
            }}</span>
          </button>
        </div>

        <!-- Thông báo -->
        <div
          v-if="notification.show"
          :class="['notification', notification.type]"
        >
          {{ notification.message }}
        </div>

        <div class="payment-history-list">
          <!-- Tôi cần trả -->
          <template v-if="paymentTab === 'toPay'">
            <!-- Filter dropdown -->
            <div class="filter-section">
              <div class="filter-controls">
                <div class="filter-dropdown">
                  <button @click="togglePayToFilterDropdown" class="filter-btn">
                    <span>Trả cho: {{ getFilterDisplayText() }}</span>
                    <i class="fas fa-chevron-down"></i>
                  </button>
                  <div
                    v-if="showPayToFilterDropdown"
                    class="filter-dropdown-content"
                  >
                    <div class="filter-option" @click="selectAllPayTo">
                      <i
                        class="fas fa-check"
                        v-if="selectedPayToFilter === 'all'"
                      ></i>
                      <span>Tất cả</span>
                    </div>
                    <div
                      v-for="user in availablePayToOptions"
                      :key="user.uid"
                      class="filter-option"
                      @click="selectPayToFilter(user.uid)"
                    >
                      <i
                        class="fas fa-check"
                        v-if="selectedPayToFilter === user.uid"
                      ></i>
                      <span>{{ user.name }}</span>
                    </div>
                  </div>
                </div>

                <div class="filter-dropdown">
                  <button
                    @click="toggleStatusFilterDropdown"
                    class="filter-btn"
                  >
                    <span>Trạng thái: {{ getStatusFilterDisplayText() }}</span>
                    <i class="fas fa-chevron-down"></i>
                  </button>
                  <div
                    v-if="showStatusFilterDropdown"
                    class="filter-dropdown-content"
                  >
                    <div class="filter-option" @click="selectAllStatus">
                      <i
                        class="fas fa-check"
                        v-if="selectedStatusFilter === 'all'"
                      ></i>
                      <span>Tất cả</span>
                    </div>
                    <div
                      class="filter-option"
                      @click="selectStatusFilter('paid')"
                    >
                      <i
                        class="fas fa-check"
                        v-if="selectedStatusFilter === 'paid'"
                      ></i>
                      <span>Đã trả</span>
                    </div>
                    <div
                      class="filter-option"
                      @click="selectStatusFilter('unpaid')"
                    >
                      <i
                        class="fas fa-check"
                        v-if="selectedStatusFilter === 'unpaid'"
                      ></i>
                      <span>Chưa trả</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Thống kê -->
              <div class="payment-stats">
                <div class="stat-item">
                  <span class="stat-label">Đã trả:</span>
                  <span class="stat-value paid">{{
                    formatCurrency(filteredPaymentsStats.paidAmount)
                  }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Chưa trả:</span>
                  <span class="stat-value unpaid">{{
                    formatCurrency(filteredPaymentsStats.unpaidAmount)
                  }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Tổng:</span>
                  <span class="stat-value total">{{
                    formatCurrency(filteredPaymentsStats.totalAmount)
                  }}</span>
                </div>
              </div>
            </div>
                          <!-- Select all button -->
              <div class="select-all-section">
                <button 
                  @click="selectAllVisibleSplits" 
                  class="select-all-btn"
                  :disabled="filteredSplitsToPay.filter(split => !(split.status === 'paid' && split.confirmedByReceiver)).length === 0"
                >
                  <i :class="selectedSplits.size > 0 ? 'fas fa-check-square' : 'far fa-square'"></i> 
                  {{ selectedSplits.size > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả chưa trả' }}
                </button>
              </div>
            <!-- Bulk actions -->
            <div v-if="isSelectingMultiple" class="bulk-actions">
              <div class="bulk-info">
                <span>Đã chọn {{ selectedSplits.size }} khoản ({{ formatCurrency(selectedSplitsTotalAmount) }})</span>
                <button @click="clearSelection" class="clear-selection-btn">
                  <i class="fas fa-times"></i> Bỏ chọn
                </button>
              </div>
              <button @click="sendBulkPaidRequests" class="bulk-action-btn">
                <i class="fas fa-paper-plane"></i> Gửi yêu cầu đã trả ({{ selectedSplits.size }})
              </button>
            </div>

            <div
              v-for="split in filteredSplitsToPay"
              :key="split.uid + '-' + split.payTo"
              class="payment-history-row"
            >
              <!-- Checkbox -->
              <div class="checkbox-container">
                <input
                  type="checkbox"
                  :id="`split-${split.uid}-${split.payTo}${split.transactionId ? '-' + split.transactionId : ''}`"
                  :checked="selectedSplits.has(split.transactionId ? `${split.uid}-${split.payTo}-${split.transactionId}` : `${split.uid}-${split.payTo}`)"
                  @change="toggleSplitSelection(split.transactionId ? `${split.uid}-${split.payTo}-${split.transactionId}` : `${split.uid}-${split.payTo}`)"
                  :disabled="
                    split.status === 'paid' && split.confirmedByReceiver
                  "
                  class="split-checkbox"
                />
                <label
                  :for="`split-${split.uid}-${split.payTo}${split.transactionId ? '-' + split.transactionId : ''}`"
                  class="checkbox-label"
                ></label>
              </div>

              <div class="payment-info">
                <!-- Trả cho -->
                <span class="pay-to"
                  >Trả cho:
                  <b
                    @click="navigateToProfile(split.payTo)"
                    class="pay-to-link"
                    >{{ getParticipantName(split.payTo) }}</b
                  ></span
                >
                <!-- Nội dung khoản cần trả -->
                <span
                  v-if="split.transactionId"
                  class="transaction-description"
                >
                  {{ getTransactionDescription(split.transactionId) }}
                </span>
                <span v-else class="transaction-description">
                  Thanh toán tổng sự kiện
                </span>
                <!-- Ngày tạo -->
                <span class="payment-date">
                  {{ formatPaymentDate(split.createdAt) }}
                </span>
                <!-- Số tiền -->
                <span class="amount">{{ formatCurrency(split.amount) }}</span>
              </div>
              <div class="payment-status">
                <span class="status" :class="split.status">
                  {{
                    split.status === "paid"
                      ? split.confirmedByReceiver
                        ? "Đã trả"
                        : "Đã gửi yêu cầu"
                      : "Chưa thanh toán"
                  }}
                </span>
                <template v-if="split.status !== 'paid'">
                  <button
                    class="check-btn"
                    :disabled="splitLoading[split.transactionId ? `${split.uid}-${split.payTo}-${split.transactionId}` : `${split.uid}-${split.payTo}`]"
                    @click="sendPaidRequest(split)"
                  >
                    {{
                      splitLoading[split.transactionId ? `${split.uid}-${split.payTo}-${split.transactionId}` : `${split.uid}-${split.payTo}`]
                        ? "Đang gửi..."
                        : "Gửi yêu cầu đã trả"
                    }}
                  </button>
                </template>
                <template v-else>
                  <span
                    v-if="split.confirmedByReceiver"
                    style="color: #388e3c; font-weight: 500"
                    >Đã hoàn thành</span
                  >
                  <span v-else style="color: #f57f17; font-weight: 500"
                    >Đang chờ xác nhận</span
                  >
                </template>
              </div>
            </div>
            <div
              v-if="filteredSplitsToPay.length === 0"
              style="color: #888; padding: 12px"
            >
              {{
                selectedPayToFilter === "all"
                  ? "Không có khoản nào bạn cần trả."
                  : "Không có khoản nào cho người được chọn."
              }}
            </div>
          </template>
          <!-- Tôi nhận -->
          <template v-else>
            <!-- Filter dropdown cho tab "Tôi nhận" -->
            <div class="filter-section">
              <div class="filter-controls">
                <div class="filter-dropdown">
                  <button @click="togglePayerFilterDropdown" class="filter-btn">
                    <span>Người trả: {{ getFilterDisplayText() }}</span>
                    <i class="fas fa-chevron-down"></i>
                  </button>
                  <div
                    v-if="showPayerFilterDropdown"
                    class="filter-dropdown-content"
                  >
                    <div class="filter-option" @click="selectAllPayer">
                      <i
                        class="fas fa-check"
                        v-if="selectedPayerFilter === 'all'"
                      ></i>
                      <span>Tất cả</span>
                    </div>
                    <div
                      v-for="user in availablePayerOptions"
                      :key="user.uid"
                      class="filter-option"
                      @click="selectPayerFilter(user.uid)"
                    >
                      <i
                        class="fas fa-check"
                        v-if="selectedPayerFilter === user.uid"
                      ></i>
                      <span>{{ user.name }}</span>
                    </div>
                  </div>
                </div>

                <div class="filter-dropdown">
                  <button
                    @click="toggleReceiveStatusFilterDropdown"
                    class="filter-btn"
                  >
                    <span
                      >Trạng thái:
                      {{ getReceiveStatusFilterDisplayText() }}</span
                    >
                    <i class="fas fa-chevron-down"></i>
                  </button>
                  <div
                    v-if="showReceiveStatusFilterDropdown"
                    class="filter-dropdown-content"
                  >
                    <div class="filter-option" @click="selectAllReceiveStatus">
                      <i
                        class="fas fa-check"
                        v-if="selectedReceiveStatusFilter === 'all'"
                      ></i>
                      <span>Tất cả</span>
                    </div>
                    <div
                      class="filter-option"
                      @click="selectReceiveStatusFilter('received')"
                    >
                      <i
                        class="fas fa-check"
                        v-if="selectedReceiveStatusFilter === 'received'"
                      ></i>
                      <span>Đã nhận</span>
                    </div>
                    <div
                      class="filter-option"
                      @click="selectReceiveStatusFilter('pending')"
                    >
                      <i
                        class="fas fa-check"
                        v-if="selectedReceiveStatusFilter === 'pending'"
                      ></i>
                      <span>Chưa nhận</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Thống kê cho tab "Tôi nhận" -->
              <div class="payment-stats">
                <div class="stat-item">
                  <span class="stat-label">Đã nhận:</span>
                  <span class="stat-value paid">{{
                    formatCurrency(filteredReceiveStats.receivedAmount)
                  }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Chưa nhận:</span>
                  <span class="stat-value unpaid">{{
                    formatCurrency(filteredReceiveStats.pendingAmount)
                  }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Tổng:</span>
                  <span class="stat-value total">{{
                    formatCurrency(filteredReceiveStats.totalAmount)
                  }}</span>
                </div>
              </div>
            </div>
              <!-- Select all button cho tab "Tôi nhận" -->
              <div class="select-all-section">
                <button
                  @click="selectAllVisibleReceiveSplits"
                  class="select-all-btn"
                  :disabled="filteredSplitsToReceive.filter(split => split.status === 'paid' && !split.confirmedByReceiver).length === 0"
                >
                  <i :class="selectedReceiveSplits.size > 0 ? 'fas fa-check-square' : 'far fa-square'"></i> 
                  {{ selectedReceiveSplits.size > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả có thể xác nhận' }}
                </button>
              </div>
            <!-- Bulk actions cho tab "Tôi nhận" -->
            <div v-if="isSelectingMultipleReceive" class="bulk-actions">
              <div class="bulk-info">
                <span>Đã chọn {{ selectedReceiveSplits.size }} khoản ({{ formatCurrency(selectedReceiveSplitsTotalAmount) }})</span>
                <button
                  @click="clearReceiveSelection"
                  class="clear-selection-btn"
                >
                  <i class="fas fa-times"></i> Bỏ chọn
                </button>
              </div>
              <button @click="confirmBulkReceived" class="bulk-action-btn">
                <i class="fas fa-check-circle"></i> Xác nhận ({{ selectedReceiveSplits.size }})
              </button>
            </div>

            <div
              v-for="split in filteredSplitsToReceive"
              :key="split.uid + '-' + split.payTo"
              class="payment-history-row payment-receive-row"
            >
              <!-- Checkbox cho tab "Tôi nhận" -->
              <div class="checkbox-container">
                <input
                  type="checkbox"
                  :id="`receive-split-${split.uid}-${split.payTo}${split.transactionId ? '-' + split.transactionId : ''}`"
                  :checked="
                    selectedReceiveSplits.has(split.transactionId ? `${split.uid}-${split.payTo}-${split.transactionId}` : `${split.uid}-${split.payTo}`)
                  "
                  @change="
                    toggleReceiveSplitSelection(split.transactionId ? `${split.uid}-${split.payTo}-${split.transactionId}` : `${split.uid}-${split.payTo}`)
                  "
                  :disabled="
                    split.status !== 'paid' || split.confirmedByReceiver
                  "
                  class="split-checkbox"
                />
                <label
                  :for="`receive-split-${split.uid}-${split.payTo}${split.transactionId ? '-' + split.transactionId : ''}`"
                  class="checkbox-label"
                ></label>
              </div>

              <div class="payment-info">
                <div class="payer-name">
                  <span class="payer-label">Người trả:</span>
                  <span
                    class="payer-link"
                    @click.stop="navigateToProfile(split.uid)"
                    >{{ getParticipantName(split.uid) }}</span
                  >
                </div>
                <div class="receive-description">
                  <span v-if="split.transactionId">{{
                    getTransactionDescription(split.transactionId)
                  }}</span>
                  <span v-else>Thanh toán tổng sự kiện</span>
                </div>
                <div class="receive-date">
                  {{ formatPaymentDate(split.createdAt) }}
                </div>
                <div class="receive-amount">
                  {{ formatCurrency(split.amount) }}
                </div>
              </div>
              <div class="payment-status">
                <span class="status" :class="split.status">
                  {{
                    split.status === "paid"
                      ? split.confirmedByReceiver
                        ? "Đã nhận"
                        : "Chờ xác nhận"
                      : "Chưa thanh toán"
                  }}
                </span>
                <template v-if="split.status === 'paid'">
                  <button
                    v-if="!split.confirmedByReceiver"
                    class="check-btn"
                    :disabled="splitLoading[split.transactionId ? `${split.uid}-${split.payTo}-${split.transactionId}` : `${split.uid}-${split.payTo}`]"
                    @click="() => { console.log('Button clicked for split:', split); confirmReceived(split); }"
                  >
                    {{
                      splitLoading[split.transactionId ? `${split.uid}-${split.payTo}-${split.transactionId}` : `${split.uid}-${split.payTo}`]
                        ? "Đang xác nhận..."
                        : "Xác nhận đã nhận tiền"
                    }}
                  </button>
                  <span v-else class="confirmed-badge">
                    <i class="fas fa-check-circle"></i> Đã xác nhận
                  </span>
                </template>
              </div>
            </div>
            <div
              v-if="filteredSplitsToReceive.length === 0"
              style="color: #888; padding: 12px"
            >
              {{
                selectedPayerFilter === "all"
                  ? "Không có khoản nào bạn nhận."
                  : "Không có khoản nào cho người được chọn."
              }}
            </div>
          </template>
        </div>
      </div>

      <!-- Transaction Modal -->
      <div
        v-if="showTransactionModal"
        class="modal-overlay"
        @click.self="closeTransactionModal"
      >
        <div class="modal-content">
          <div class="modal-header" :class="transactionForm.type">
            <h3>{{ modalTitle }}</h3>
            <button @click="closeTransactionModal" class="close-btn">
              &times;
            </button>
          </div>

          <form
            @submit.prevent="handleSubmitTransaction"
            class="transaction-form"
          >
            <div class="form-group">
              <label for="amount">Số tiền</label>
              <input
                id="amount"
                type="text"
                v-model="formattedTransactionAmount"
                placeholder="Nhập số tiền"
                class="form-input"
                @input="onTransactionAmountInput"
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
                <option v-for="plan in plans" :key="plan.id" :value="plan.id">
                  {{ plan.title }}
                </option>
              </select>
            </div>

            <div class="modal-actions">
              <button
                type="button"
                @click="closeTransactionModal"
                class="cancel-btn"
              >
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
      <div
        v-if="showDeleteModal"
        class="modal-overlay"
        @click.self="showDeleteModal = false"
      >
        <div class="modal-content delete-modal">
          <div class="modal-header">
            <h3>Xác nhận xóa</h3>
            <button @click="showDeleteModal = false" class="close-btn">
              &times;
            </button>
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
              {{ isSubmitting ? "Đang xóa..." : "Xóa" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Plan Modal -->
      <div
        v-if="showPlanModal"
        class="modal-overlay"
        @click.self="closePlanModal"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h3>
              {{ isEditingPlan ? "Chỉnh sửa kế hoạch" : "Thêm kế hoạch mới" }}
            </h3>
            <button @click="closePlanModal" class="close-btn">&times;</button>
          </div>

          <form @submit.prevent="handleSubmitPlan" class="plan-form">
            <div class="form-group">
              <label for="title"
                >Tên kế hoạch <span class="required">*</span></label
              >
              <input
                id="title"
                v-model="planForm.title"
                type="text"
                required
                placeholder="Nhập tên kế hoạch"
                class="form-input"
                :class="{
                  invalid: !planForm.title.trim() && planForm.title !== '',
                }"
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
              <label for="startTime"
                >Thời gian bắt đầu <span class="required">*</span></label
              >
              <input
                id="startTime"
                v-model="planForm.startTime"
                type="datetime-local"
                required
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="endTime"
                >Thời gian kết thúc <span class="required">*</span></label
              >
              <input
                id="endTime"
                v-model="planForm.endTime"
                type="datetime-local"
                required
                class="form-input"
                :min="planForm.startTime"
                :class="{
                  invalid:
                    new Date(planForm.endTime) < new Date(planForm.startTime),
                }"
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
                  :class="{
                    selected: planForm.assignees.includes(participant.uid),
                  }"
                  @click="toggleAssignee(participant.uid)"
                >
                  <Avatar
                    :email="participant.email"
                    :name="participant.displayName"
                    size="small"
                    class="assignee-avatar"
                  />
                  <span class="assignee-name">{{
                    participant.displayName || participant.email
                  }}</span>
                </div>
              </div>
            </div>

            <div v-if="isEditingPlan" class="form-group checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="planForm.isCompleted" />
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
                {{
                  isSubmitting
                    ? "Đang lưu..."
                    : isEditingPlan
                    ? "Cập nhật"
                    : "Thêm mới"
                }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Delete Plan Confirmation Modal -->
      <div
        v-if="showDeletePlanModal"
        class="modal-overlay"
        @click.self="showDeletePlanModal = false"
      >
        <div class="modal-content delete-modal">
          <div class="modal-header">
            <h3>Xác nhận xóa</h3>
            <button @click="showDeletePlanModal = false" class="close-btn">
              &times;
            </button>
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
            <button @click="deletePlan" class="delete-btn">Xóa</button>
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
              <span class="info-value">{{
                formatCurrency(event.totalAmount)
              }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tag</span>
              <span class="info-value tag-value">
                {{ event.tag ? "#" + event.tag : "Chưa xác định" }}
              </span>
            </div>
          </div>
          <div class="description-box">
            <h3>Mô tả</h3>
            <p>{{ event.description || "Không có mô tả" }}</p>
          </div>
        </div>

        <!-- Participants section -->
        <div class="participants-section">
          <h2>Người tham gia ({{ event.participants?.length || 0 }})</h2>
          <div class="participants-list">
            <div
              v-for="participant in event.participants"
              :key="participant.uid"
              class="participant-card"
              @click="navigateToProfile(participant.uid)"
            >
              <Avatar
                :email="participant.email"
                :name="participant.displayName"
                size="medium"
                class="participant-avatar"
              />
              <div class="participant-info">
                <span class="participant-name">{{
                  participant.displayName || participant.email
                }}</span>
                <span
                  class="participant-email"
                  v-if="participant.displayName"
                  >{{ participant.email }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="showEndEventModal"
        class="modal-overlay"
        @click.self="showEndEventModal = false"
      >
        <div class="modal-content delete-modal">
          <div class="modal-header">
            <h3>Xác nhận kết thúc sự kiện</h3>
            <button class="close-btn" @click="showEndEventModal = false">
              &times;
            </button>
          </div>
          <div class="modal-body">
            <p>
              Bạn có chắc chắn muốn kết thúc sự kiện này? Sau khi kết thúc, mọi
              người sẽ không thể thêm giao dịch mới.
            </p>
            <p class="delete-info">{{ event.name }}</p>
          </div>
          <div class="modal-actions">
            <button @click="showEndEventModal = false" class="cancel-btn">
              Hủy
            </button>
            <button
              @click="endEvent"
              class="delete-btn"
              :disabled="isEndingEvent"
            >
              {{ isEndingEvent ? "Đang xử lý..." : "Kết thúc sự kiện" }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Kết thúc các tab nội dung -->
    <!-- Modal chia tiền -->
    <div
      v-if="showPaymentModal"
      class="modal-overlay"
      @click.self="closePaymentModal"
    >
      <div class="modal-content payment-modal">
        <div class="modal-header">
          <h3>
            {{
              paymentForTransaction
                ? `Chia tiền: ${paymentForTransaction.description}`
                : "Chia tiền thanh toán tổng"
            }}
          </h3>
          <button class="close-btn" @click="closePaymentModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="payment-list">
            <div
              v-for="(member, idx) in event.participants"
              :key="member.uid"
              class="payment-row"
            >
              <div class="member-info">
                <span class="member-name">{{
                  member.displayName || member.email
                }}</span>
                <label class="lock-amount-checkbox">
                  <input
                    type="checkbox"
                    v-model="paymentSplits[idx].locked"
                    @change="onLockAmountChange(idx)"
                  />
                  <span class="lock-label">🔒 Khóa số tiền</span>
                </label>
              </div>
              <div class="payment-input-container">
                <input
                  type="text"
                  class="payment-input"
                  :value="formatInputDisplay(paymentSplits[idx].amount)"
                  @input="onPaymentInput(idx, $event)"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  :disabled="paymentSplits[idx].locked"
                />
                <span class="currency">₫</span>
              </div>
              <div>
                <label class="pay-for-label">Trả cho:</label>
                <select
                  v-model="paymentSplits[idx].payTo"
                  class="pay-for-select"
                >
                  <option
                    v-for="p in event.participants"
                    :key="p.uid"
                    :value="p.uid"
                  >
                    {{ p.displayName || p.email }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          <div class="payment-summary">
            <span
              >Tổng cần chia:
              <b>{{ formatCurrency(totalAmountToSplit) }}</b></span
            >
            <span
              >Tổng đã nhập:
              <b>{{ formatCurrency(totalCustomAmount) }}</b></span
            >
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-button" @click="closePaymentModal">Hủy</button>
          <button
            class="submit-button"
            :disabled="!isPaymentValid"
            @click="handleConfirmPaymentSplits"
          >
            Xác nhận chia tiền
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, onUnmounted, watch } from "vue";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "~/plugins/firebase";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import Avatar from "~/components/Avatar.vue";
import draggable from "vuedraggable";
import { pushNotification } from "~/composables/useNotifications";
import { collection, query, where, getDocs } from "firebase/firestore";

definePageMeta({
  middleware: "auth",
});

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const event = ref(null);

const { user } = useAuth();
const showTransactionModal = ref(false);
const showDeleteModal = ref(false);
const isSubmitting = ref(false);
const currentFilter = ref("all");
const selectedTransaction = ref(null);
const activeTab = ref(route.query.tab || "transactions");
const showPlanModal = ref(false);
const showDeletePlanModal = ref(false);
const isEditingPlan = ref(false);
const selectedPlan = ref(null);

const messages = ref([]);
const newMessage = ref("");
const formattedEstimatedAmount = ref("0");
const plans = ref([]);

const filterLabels = {
  all: "Tất cả",
  income: "Khoản thu",
  expense: "Chi tiêu",
};

// Đếm số lượng khoản thu chưa chia tiền
const unpaidIncomeCount = computed(() => {
  if (!event.value?.transactions) return 0;
  return event.value.transactions.filter(transaction => 
    transaction.type === 'income' && 
    (!transaction.paymentSplits || transaction.paymentSplits.length === 0)
  ).length;
});

// Đếm số lượng khoản chi chưa chia tiền
const unpaidExpenseCount = computed(() => {
  if (!event.value?.transactions) return 0;
  return event.value.transactions.filter(transaction => 
    transaction.type === 'expense' && 
    (!transaction.paymentSplits || transaction.paymentSplits.length === 0)
  ).length;
});

const today = computed(() => {
  return new Date().toISOString().split("T")[0];
});

const modalTitle = computed(() => {
  const action = transactionForm.value.id ? "Chỉnh sửa" : "Thêm";
  const type =
    transactionForm.value.type === "income" ? "khoản thu" : "chi tiêu";
  return `${action} ${type}`;
});

const submitButtonText = computed(() => {
  if (isSubmitting.value) return "Đang lưu...";
  return transactionForm.value.id ? "Cập nhật" : "Lưu";
});

const filteredTransactions = computed(() => {
  if (!event.value?.transactions) return [];

  return event.value.transactions
    .filter(
      (transaction) =>
        currentFilter.value === "all" ||
        transaction.type === currentFilter.value
    )
    .sort((a, b) => {
      // Ưu tiên 1: Khoản chưa chia tiền lên đầu
      const aHasPaymentSplits = a.paymentSplits && a.paymentSplits.length > 0;
      const bHasPaymentSplits = b.paymentSplits && b.paymentSplits.length > 0;
      
      if (!aHasPaymentSplits && bHasPaymentSplits) return -1;
      if (aHasPaymentSplits && !bHasPaymentSplits) return 1;
      
      // Ưu tiên 2: Khoản chưa thanh toán lên đầu (trong cùng trạng thái chia tiền)
      const aIsFullyPaid = isTransactionFullyPaid(a);
      const bIsFullyPaid = isTransactionFullyPaid(b);
      
      if (!aIsFullyPaid && bIsFullyPaid) return -1;
      if (aIsFullyPaid && !bIsFullyPaid) return 1;
      
      // Ưu tiên 3: Sắp xếp theo thời gian (mới nhất lên đầu)
      return b.date.seconds - a.date.seconds;
    });
});

const canEditTransaction = (transaction) => {
  return transaction.createdBy.uid === user.value?.uid;
};

const openTransactionModal = (type, transaction = null) => {
  console.log("openTransactionModal", type, transaction);
  if (transaction) {
    transactionForm.value = {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      date: new Date(transaction.date.seconds * 1000)
        .toISOString()
        .split("T")[0],
      description: transaction.description,
      planId: transaction.planId || "other",
    };
  } else {
    transactionForm.value = {
      id: null,
      type,
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      planId: "other",
    };
  }
  showTransactionModal.value = true;
};

const closeTransactionModal = () => {
  showTransactionModal.value = false;
  transactionForm.value = {
    id: null,
    type: "expense",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    planId: "other",
  };
};

const handleSubmitTransaction = async () => {
  if (!event.value || !user.value) return;
  isSubmitting.value = true;
  try {
    const eventRef = doc(db, "events", event.value.id);
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
        displayName: user.value.displayName || user.value.email,
      },
    };
    let updatedTransactions = [...event.value.transactions];
    if (transactionForm.value.id) {
      // Update existing transaction
      const index = updatedTransactions.findIndex(
        (t) => t.id === transactionForm.value.id
      );
      if (index !== -1) {
        updatedTransactions[index] = transactionData;
      }
    } else {
      // Add new transaction
      updatedTransactions.push(transactionData);
    }
    // Calculate new totals
    const totalIncome = updatedTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = updatedTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    // Update Firestore in one batch
    await updateDoc(eventRef, {
      transactions: updatedTransactions,
      totalIncome,
      totalExpense,
    });
    // KHÔNG gán event.value.transactions ở đây, chỉ close modal
    closeTransactionModal();

    const participants = event.value.participants || [];
    for (const member of participants) {
      if (member.uid !== user.value.uid) {
        await pushNotification({
          recipientId: member.uid,
          type: transactionForm.value.id ? "edit_expense" : "add_expense",
          content: `${user.value.displayName} vừa ${
            transactionForm.value.id ? "chỉnh sửa" : "thêm"
          } khoản ${
            transactionForm.value.type === "income" ? "thu" : "chi"
          } mới`,
          eventId: event.value.id,
          relatedId: transactionForm.value.id || transactionData.id,
        });
      }
    }
  } catch (error) {
    console.error("Error handling transaction:", error);
    alert("Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.");
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
    const eventRef = doc(db, "events", event.value.id);
    // Remove transaction
    await updateDoc(eventRef, {
      transactions: arrayRemove(selectedTransaction.value),
    });
    // KHÔNG gán event.value.transactions ở đây, chỉ close modal
    showDeleteModal.value = false;
    selectedTransaction.value = null;
  } catch (error) {
    console.error("Error deleting transaction:", error);
    alert("Có lỗi xảy ra khi xóa giao dịch. Vui lòng thử lại.");
  } finally {
    isSubmitting.value = false;
  }
};

// Format date
const formatDate = (date) => {
  if (!date) return "Chưa xác định";
  return new Date(date.seconds * 1000).toLocaleDateString("vi-VN");
};

// Format payment date
const formatPaymentDate = (date) => {
  if (!date) return "Chưa xác định";
  const d = new Date(date.seconds * 1000);
  const now = new Date();
  const diffTime = Math.abs(now - d);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return "Hôm qua";
  } else if (diffDays === 0) {
    return "Hôm nay";
  } else if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  } else {
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }
};

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
};

// Helper function for payment details
const getTransactionPaymentDetails = (transaction) => {
  if (!transaction.paymentSplits || !event.value?.paymentSplits?.splits) {
    return [];
  }
  
  // Lấy tất cả splits liên quan đến transaction này
  const transactionSplits = event.value.paymentSplits.splits.filter(split => 
    split.transactionId === transaction.id
  );
  
  return transactionSplits;
};

// Kiểm tra xem transaction đã được thanh toán đầy đủ chưa
const isTransactionFullyPaid = (transaction) => {
  if (transaction.type !== 'expense') return true;
  
  // Nếu chưa có paymentSplits thì chưa thanh toán
  if (!transaction.paymentSplits || transaction.paymentSplits.length === 0) {
    return false;
  }
  
  // Kiểm tra xem tất cả splits có status = 'paid' và confirmedByReceiver = true không
  const splits = getTransactionPaymentDetails(transaction);
  if (splits.length === 0) return false;
  
  return splits.every(split => split.status === 'paid' && split.confirmedByReceiver);
};

// Go back function
const goBack = () => {
  router.back();
};

// Fetch event details
const fetchEventDetails = async () => {
  try {
    const eventId = route.params.id;
    const eventDoc = await getDoc(doc(db, "events", eventId));

    if (eventDoc.exists()) {
      event.value = {
        id: eventDoc.id,
        ...eventDoc.data(),
      };
      plans.value = event.value.plans || [];
      messages.value = event.value.messages || [];
    } else {
      router.push("/events");
    }
  } catch (error) {
    console.error("Error fetching event details:", error);
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
let unsubscribePayments;
onMounted(() => {
  fetchEventDetails();
  // Realtime plans & messages & transactions & readStatus
  const eventId = route.params.id;
  const eventRef = doc(db, "events", eventId);
  if (unsubscribePlans) unsubscribePlans();
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribePayments) unsubscribePayments();

  unsubscribePlans = onSnapshot(eventRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    if (data.plans) {
      plans.value = data.plans;
      if (event.value) event.value.plans = data.plans;
    }
    if (data.transactions) {
      if (event.value) event.value.transactions = data.transactions;
    }
    // Cập nhật messages và readStatus realtime
    if (data.messages) {
      messages.value = data.messages;
      if (event.value) event.value.messages = data.messages;
    }
    if (data.readStatus) {
      if (event.value) event.value.readStatus = data.readStatus;
      else
        event.value = { ...(event.value || {}), readStatus: data.readStatus };
    }
  });

  unsubscribeMessages = onSnapshot(eventRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    if (data.messages) {
      messages.value = data.messages;
      if (event.value) event.value.messages = data.messages;
    }
    if (data.readStatus) {
      if (event.value) event.value.readStatus = data.readStatus;
      else
        event.value = { ...(event.value || {}), readStatus: data.readStatus };
    }
  });

  // Thêm listener riêng biệt cho paymentSplits để cập nhật realtime
  unsubscribePayments = onSnapshot(eventRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    if (data.paymentSplits) {
      if (event.value) {
        event.value.paymentSplits = data.paymentSplits;
        // Nếu có xác nhận mới từ người nhận và người hiện tại là người trả
        if (user.value) {
          const mySentPayments = data.paymentSplits.splits.filter(
            (split) => split.uid === user.value.uid && split.status === "paid"
          );

          for (const split of mySentPayments) {
            if (split.confirmedByReceiver && !isAlreadyNotified(split)) {
              // Hiển thị thông báo khi có người xác nhận đã nhận tiền
              saveNotifiedState(split);
              showNotification(
                `${getParticipantName(split.payTo)} đã xác nhận nhận tiền!`,
                "success"
              );
            }
          }
        }
      }
    }
  });

  nextTick(() => {
    const container = messagesContainer.value;
    if (container) {
      container.addEventListener("scroll", handleChatScroll);
    }
  });
  if (activeTab.value === "discussion") {
    unreadMessagesCount.value = 0;
  }
  if (event.value && user.value) {
    markNotificationsAsRead(event.value.id, user.value.uid);
  }
});
onUnmounted(() => {
  if (unsubscribePlans) unsubscribePlans();
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribePayments) unsubscribePayments();
  const container = messagesContainer.value;
  if (container) {
    container.removeEventListener("scroll", handleScroll);
  }
});

// Computed Properties
const totalEstimatedAmount = computed(() => {
  return plans.value.reduce(
    (sum, plan) => sum + (plan.estimatedAmount || 0),
    0
  );
});

const totalActualAmount = computed(() => {
  if (!event.value?.transactions) return 0;
  return event.value.transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
});

const messagesContainer = ref(null);
const showScrollToBottom = ref(false);

const isFormValid = computed(() => {
  const startTime = new Date(planForm.value.startTime);
  const endTime = new Date(planForm.value.endTime);

  // Kiểm tra các điều kiện
  const isTitleValid = planForm.value.title.trim() !== "";
  const isStartTimeValid = !isNaN(startTime.getTime()); // Chỉ kiểm tra có nhập thời gian bắt đầu
  const isEndTimeValid = !isNaN(endTime.getTime());
  const isTimeOrderValid = endTime >= startTime;

  return isTitleValid && isStartTimeValid && isEndTimeValid && isTimeOrderValid;
});

// Methods for Plans
const openPlanModal = () => {
  console.log("openPlanModal");
  isEditingPlan.value = false;
  const now = new Date();
  planForm.value = {
    id: null,
    title: "",
    description: "",
    startTime: formatInputDateTime(now),
    endTime: formatInputDateTime(now),
    estimatedAmount: 0,
    isCompleted: false,
    assignees: [], // Initialize empty assignees array
  };
  formattedEstimatedAmount.value = "0";
  showPlanModal.value = true;
};

const closePlanModal = () => {
  showPlanModal.value = false;
  isEditingPlan.value = false;
  planForm.value = {
    id: null,
    title: "",
    description: "",
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
    estimatedAmount: 0,
    isCompleted: false,
    assignees: [],
  };
  formattedEstimatedAmount.value = "0";
};

const formatEstimatedAmount = () => {
  // Remove non-numeric characters
  const numericValue = formattedEstimatedAmount.value.replace(/[^0-9]/g, "");
  // Format with commas
  formattedEstimatedAmount.value = numericValue.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ","
  );
  // Update planForm
  planForm.value.estimatedAmount = parseInt(numericValue) || 0;
};

const validateEstimatedAmount = () => {
  if (!formattedEstimatedAmount.value) {
    formattedEstimatedAmount.value = "0";
    planForm.value.estimatedAmount = 0;
  }
};

const handleSubmitPlan = async () => {
  if (!event.value || !user.value || !isFormValid.value) return;

  try {
    isSubmitting.value = true;
    const eventRef = doc(db, "events", event.value.id);

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
      order: planForm.value.id ? planForm.value.order : plans.value.length || 0,
      createdAt: Timestamp.now(),
      createdBy: {
        uid: user.value.uid,
        email: user.value.email,
        displayName: user.value.displayName || user.value.email,
      },
    };

    let updatedPlans = [...(plans.value || [])];

    if (planForm.value.id) {
      const index = updatedPlans.findIndex((p) => p.id === planForm.value.id);
      if (index !== -1) {
        updatedPlans[index] = planData;
      }
    } else {
      updatedPlans.push(planData);
    }

    await updateDoc(eventRef, {
      plans: updatedPlans,
    });

    plans.value = updatedPlans;
    closePlanModal();

    alert(
      planForm.value.id
        ? "Cập nhật kế hoạch thành công!"
        : "Thêm kế hoạch mới thành công!"
    );

    const planParticipants = event.value.participants || [];
    for (const member of planParticipants) {
      if (member.uid !== user.value.uid) {
        await pushNotification({
          recipientId: member.uid,
          type: planForm.value.id ? "edit_plan" : "add_plan",
          content: `${user.value.displayName} vừa ${
            planForm.value.id ? "chỉnh sửa" : "thêm"
          } kế hoạch "${planForm.value.title}"`,
          eventId: event.value.id,
          relatedId: planForm.value.id || planData.id,
        });
      }
    }
  } catch (error) {
    console.error("Error handling plan:", error);
    alert("Có lỗi xảy ra khi lưu dữ liệu. Vui lòng thử lại.");
  } finally {
    isSubmitting.value = false;
  }
};

const editPlan = (plan) => {
  isEditingPlan.value = true;
  planForm.value = {
    id: plan.id,
    title: plan.title,
    description: plan.description || "",
    startTime: formatInputDateTime(new Date(plan.startTime.seconds * 1000)),
    endTime: formatInputDateTime(new Date(plan.endTime.seconds * 1000)),
    estimatedAmount: plan.estimatedAmount,
    isCompleted: plan.isCompleted,
    order: plan.order,
    assignees: plan.assignees || [],
  };
  formattedEstimatedAmount.value = plan.estimatedAmount
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
    const eventRef = doc(db, "events", event.value.id);

    // Remove plan
    const updatedPlans = plans.value.filter(
      (p) => p.id !== selectedPlan.value.id
    );

    // Update order for remaining plans
    updatedPlans.forEach((plan, index) => {
      plan.order = index;
    });

    // Update Firestore
    await updateDoc(eventRef, {
      plans: updatedPlans,
    });

    // Update local state
    plans.value = updatedPlans;
    showDeletePlanModal.value = false;
    selectedPlan.value = null;
  } catch (error) {
    console.error("Error deleting plan:", error);
    alert("Có lỗi xảy ra khi xóa kế hoạch. Vui lòng thử lại.");
  } finally {
    isSubmitting.value = false;
  }
};

const handleDragEnd = async () => {
  try {
    const eventRef = doc(db, "events", event.value.id);

    // Update order for all plans
    const updatedPlans = plans.value.map((plan, index) => ({
      ...plan,
      order: index,
    }));

    // Update Firestore
    await updateDoc(eventRef, {
      plans: updatedPlans,
    });

    // Update local state
    plans.value = updatedPlans;
  } catch (error) {
    console.error("Error updating plan order:", error);
    alert("Có lỗi xảy ra khi cập nhật thứ tự kế hoạch.");
  }
};

const togglePlanCompletion = async (plan) => {
  try {
    const eventRef = doc(db, "events", event.value.id);

    // Update plan completion status
    const updatedPlans = plans.value.map((p) => {
      if (p.id === plan.id) {
        return {
          ...p,
          isCompleted: !p.isCompleted,
        };
      }
      return p;
    });

    // Update Firestore
    await updateDoc(eventRef, {
      plans: updatedPlans,
    });

    // Update local state
    plans.value = updatedPlans;
  } catch (error) {
    console.error("Error toggling plan completion:", error);
    alert("Có lỗi xảy ra khi cập nhật trạng thái kế hoạch.");
  }
};

const canEditPlan = (plan) => {
  return plan.createdBy.uid === user.value?.uid;
};

// Methods for Statistics
const getPlanActualAmount = (plan) => {
  if (!event.value?.transactions) return 0;
  return event.value.transactions
    .filter((t) => t.type === "expense" && t.planId === plan.id)
    .reduce((sum, t) => sum + t.amount, 0);
};

const getOtherExpenses = () => {
  if (!event.value?.transactions) return 0;
  return event.value.transactions
    .filter((t) => t.type === "expense" && (!t.planId || t.planId === "other"))
    .reduce((sum, t) => sum + t.amount, 0);
};

const getDifferenceClass = (estimated, actual) => {
  const difference = actual - estimated;
  if (difference > 0) return "over-budget";
  if (difference < 0) return "under-budget";
  return "";
};

// Methods for Discussion
const sendMessage = async () => {
  if (!newMessage.value.trim() || !event.value || !user.value) return;
  try {
    const eventRef = doc(db, "events", event.value.id);
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
        displayName: user.value.displayName || user.value.email,
      },
    };
    // Add new message
    await updateDoc(eventRef, {
      messages: arrayUnion(messageData),
    });
    newMessage.value = "";
    // Scroll to bottom
    nextTick(() => {
      const container = messagesContainer.value;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });

    const msgParticipants = event.value.participants || [];
    for (const member of msgParticipants) {
      if (member.uid !== user.value.uid) {
        await pushNotification({
          recipientId: member.uid,
          type: "discussion",
          content: `${user.value.displayName} vừa gửi một tin nhắn mới trong sự kiện "${event.value.name}"`,
          eventId: event.value.id,
        });
      }
    }
  } catch (error) {
    console.error("Error sending message:", error);
    alert("Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại.");
  }
};

const formatDateTime = (date) => {
  if (!date) return "Chưa xác định";
  const d = new Date(date.seconds * 1000);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatInputDateTime = (date) => {
  const d = new Date(date);
  return d.toISOString().slice(0, 16);
};

const formatMessageTime = (date) => {
  if (!date) return "";
  return new Date(date.seconds * 1000).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
  const participant = event.value.participants.find((p) => p.uid === uid);
  return participant ? participant.email : "";
};

const getParticipantName = (uid) => {
  const participant = event.value.participants.find((p) => p.uid === uid);
  return participant ? participant.displayName || participant.email : "";
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
  showScrollToBottom.value =
    container.scrollTop + container.clientHeight < container.scrollHeight - 50;
};

// Group messages by user and time
const groupedMessages = computed(() => {
  if (!messages.value.length) return [];
  const groups = [];
  let currentGroup = null;
  let lastDate = null;
  messages.value.forEach((msg, idx) => {
    const prev = messages.value[idx - 1];
    const msgDate = new Date(msg.createdAt.seconds * 1000);
    const msgDay = msgDate.toDateString();
    // Nếu khác ngày, tạo group mới
    if (!lastDate || lastDate !== msgDay) {
      groups.push({
        type: "date",
        date: msgDate,
      });
      lastDate = msgDay;
      currentGroup = null;
    }
    // Nếu khác user hoặc group chưa có, tạo group mới
    if (!currentGroup || prev?.createdBy.uid !== msg.createdBy.uid) {
      currentGroup = {
        user: msg.createdBy,
        messages: [],
        isOwn: msg.createdBy.uid === user.value?.uid,
      };
      groups.push(currentGroup);
    }
    currentGroup.messages.push(msg);
  });
  return groups;
});

const unreadMessagesCount = computed(() => {
  if (!event.value || !event.value.messages || !user.value) return 0;
  const messagesArr = event.value.messages;
  const readStatus = event.value.readStatus || {};
  const lastReadId = readStatus[user.value.uid];
  if (!lastReadId) return messagesArr.length;
  const lastReadIdx = messagesArr.findIndex((m) => m.id === lastReadId);
  if (lastReadIdx === -1) return messagesArr.length;
  return messagesArr.length - (lastReadIdx + 1);
});

// Hàm kiểm tra đã ở cuối khung chat chưa
function isAtBottom() {
  const container = messagesContainer.value;
  if (!container) return false;
  return (
    container.scrollTop + container.clientHeight >= container.scrollHeight - 10
  );
}

// Hàm cập nhật trạng thái đã đọc lên Firestore
async function markMessagesAsRead() {
  if (
    event.value &&
    event.value.messages &&
    event.value.messages.length > 0 &&
    user.value
  ) {
    const lastMsg = event.value.messages[event.value.messages.length - 1];
    const eventRef = doc(db, "events", event.value.id);
    const readStatus = event.value.readStatus || {};
    if (readStatus[user.value.uid] !== lastMsg.id) {
      readStatus[user.value.uid] = lastMsg.id;
      await updateDoc(eventRef, { readStatus });
      event.value.readStatus = { ...readStatus };
    }
  }
}

// Khi scroll, nếu ở cuối và đang ở tab Thảo luận thì mark as read
function handleChatScroll() {
  if (activeTab.value === "discussion" && isAtBottom()) {
    markMessagesAsRead();
  }
}

// Gắn sự kiện scroll khi mounted và activeTab là discussion
watch(activeTab, (newTab) => {
  nextTick(() => {
    const container = messagesContainer.value;
    if (container) {
      container.removeEventListener("scroll", handleChatScroll);
      if (newTab === "discussion") {
        container.addEventListener("scroll", handleChatScroll);
        // Nếu vừa vào tab và đã ở cuối thì mark as read luôn
        // Thêm scroll xuống cuối khi chuyển tab
        container.scrollTop = container.scrollHeight;
        if (isAtBottom()) {
          markMessagesAsRead();
        }
      }
    }
  });
});

// Khi có tin nhắn mới, nếu đang ở tab Thảo luận và đã ở cuối thì mark as read
watch(
  () => event.value && event.value.messages && event.value.messages.length,
  () => {
    if (activeTab.value === "discussion" && isAtBottom()) {
      markMessagesAsRead();
    }
  }
);

// Di chuyển khai báo này lên trên
const transactionForm = ref({
  id: null,
  type: "expense",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  description: "",
  planId: "other", // Default to 'other' if no plan is selected
});

// Đảm bảo khai báo planForm ở đây
const planForm = ref({
  id: null,
  title: "",
  description: "",
  startTime: new Date().toISOString().slice(0, 16),
  endTime: new Date().toISOString().slice(0, 16),
  estimatedAmount: 0,
  isCompleted: false,
  assignees: [],
});

// Thêm hàm đồng bộ trạng thái
const getEventStatus = (event) => {
  const now = new Date();
  if (event.isEnded) return "Đã kết thúc";
  if (event.startDate && event.endDate) {
    if (
      now <
      new Date(
        event.startDate.seconds
          ? event.startDate.seconds * 1000
          : event.startDate
      )
    )
      return "Sắp đến";
    if (
      now >=
        new Date(
          event.startDate.seconds
            ? event.startDate.seconds * 1000
            : event.startDate
        ) &&
      now <=
        new Date(
          event.endDate.seconds ? event.endDate.seconds * 1000 : event.endDate
        )
    )
      return "Đang diễn ra";
    if (
      now >
      new Date(
        event.endDate.seconds ? event.endDate.seconds * 1000 : event.endDate
      )
    )
      return "Đã kết thúc";
  }
  return "Chưa xác định";
};
const getEventStatusClass = (event) => {
  const status = getEventStatus(event);
  if (status === "Sắp đến") return "status-upcoming";
  if (status === "Đang diễn ra") return "status-active";
  if (status === "Đã kết thúc") return "status-ended";
  return "";
};

const totalCustomAmount = computed(() =>
  paymentSplits.value.reduce((sum, p) => sum + Number(p.amount || 0), 0)
);

const isPaymentValid = computed(
  () =>
    Number(totalCustomAmount.value) === Number(totalAmountToSplit.value) &&
    paymentSplits.value.every(
      (p) => Number.isFinite(Number(p.amount)) && Number(p.amount) >= 0
    )
);

// Thêm computed property để tính tổng số tiền cần chia
const totalAmountToSplit = computed(() => {
  if (paymentForTransaction.value) {
    return paymentForTransaction.value.amount;
  }
  if (!event.value?.transactions) return 0;

  // Tổng chi
  const totalExpense = event.value.transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  // Tổng thu
  const totalIncome = event.value.transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  // Tổng số tiền của các transaction đã chia tiền (có paymentSplits và length > 0)
  const sumAllSplitted = event.value.transactions
    .filter(
      (t) =>
        t.type === "expense" && t.paymentSplits && t.paymentSplits.length > 0
    )
    .reduce((sum, t) => sum + t.amount, 0);

  // Số tiền cần chia = tổng chi - tổng thu - tổng các khoản đã chia
  return totalExpense - totalIncome - sumAllSplitted;
});

const showPaymentModal = ref(false);
const paymentSplits = ref([]); // [{uid, amount, payTo}]
const paymentForTransaction = ref(null); // transaction object or null

const openPaymentModalForTransaction = (transaction) => {
  if (!event.value || !transaction) return;
  paymentForTransaction.value = transaction;
  const members = event.value.participants || [];
  const total = transaction.amount;
  const even = Math.floor(total / members.length);
  const remainder = total - even * members.length;
  paymentSplits.value = members.map((m, idx) => ({
    uid: m.uid,
    amount: even + (idx === 0 ? remainder : 0),
    payTo: user.value.uid, // mặc định trả cho người bấm
    locked: false, // mặc định không khóa
  }));
  showPaymentModal.value = true;
};

// Sửa lại confirmPaymentSplits để lưu paymentSplits cho transaction nếu có
const confirmPaymentSplits = async () => {
  if (!isPaymentValid.value || !event.value) return;
  try {
    const eventRef = doc(db, "events", event.value.id);
    if (paymentForTransaction.value) {
      // Lưu paymentSplits vào transaction cụ thể (giữ nguyên logic cũ)
      const newSplits = paymentSplits.value.map((p) => ({
        ...p,
        status: "pending",
        createdAt: Timestamp.now(),
        createdBy: user.value.uid,
        transactionId: paymentForTransaction.value.id,
      }));
      // Cập nhật transaction
      const updatedTransactions = event.value.transactions.map((t) => {
        if (t.id === paymentForTransaction.value.id) {
          return {
            ...t,
            paymentSplits: newSplits,
          };
        }
        return t;
      });
      // Merge vào event.paymentSplits.splits
      let paymentSplitsData =
        event.value.paymentSplits && event.value.paymentSplits.splits
          ? [...event.value.paymentSplits.splits]
          : [];
      paymentSplitsData = paymentSplitsData.filter(
        (s) => s.transactionId !== paymentForTransaction.value.id
      ); // Xóa splits cũ của transaction này nếu có
      paymentSplitsData.push(...newSplits);
      const paymentSplitsObj = {
        splits: paymentSplitsData,
        totalAmount:
          (event.value.paymentSplits &&
            event.value.paymentSplits.totalAmount) ||
          0,
        createdAt: Timestamp.now(),
        createdBy: user.value.uid,
      };
      await updateDoc(eventRef, {
        transactions: updatedTransactions,
        paymentSplits: paymentSplitsObj,
      });
      event.value.transactions = updatedTransactions;
      event.value.paymentSplits = paymentSplitsObj;
    } else {
      // Chia tổng: cập nhật trạng thái đã chia cho các transaction chưa chia
      const updatedTransactions = event.value.transactions.map((t) => {
        if (
          t.type === "expense" &&
          (!t.paymentSplits || t.paymentSplits.length === 0)
        ) {
          return {
            ...t,
            paymentSplits: [{ isTotalSplit: true }],
          };
        }
        return t;
      });
      const paymentData = {
        splits: paymentSplits.value.map((p) => ({
          uid: p.uid,
          amount: Number(p.amount),
          payTo: p.payTo,
          status: "pending",
          createdAt: Timestamp.now(),
          createdBy: user.value.uid,
        })),
        totalAmount: totalAmountToSplit.value,
        createdAt: Timestamp.now(),
        createdBy: {
          uid: user.value.uid,
          email: user.value.email,
          displayName: user.value.displayName || user.value.email,
        },
      };
      await updateDoc(eventRef, {
        transactions: updatedTransactions,
        paymentSplits: paymentData,
        lastUpdated: Timestamp.now(),
      });
      event.value.transactions = updatedTransactions;
      event.value.paymentSplits = paymentData;
    }
    closePaymentModal();
    alert("Đã lưu thông tin chia tiền thành công!");
  } catch (error) {
    console.error("Error saving payment splits:", error);
    alert("Có lỗi xảy ra khi lưu thông tin chia tiền. Vui lòng thử lại.");
  }
};

const closePaymentModal = () => {
  showPaymentModal.value = false;
  paymentForTransaction.value = null;
};

// 1. Thêm tab mới vào giao diện
const extraTabs = computed(() => {
  if (
    event.value &&
    event.value.paymentSplits &&
    event.value.paymentSplits.splits
  ) {
    return [{ key: "paymentHistory", label: "Lịch sử thanh toán" }];
  }
  return [];
});

// ... existing code ...
// 2. Thêm biến activeTab để hỗ trợ tab mới
const allTabs = computed(() => [
  { key: "transactions", label: "Thu chi" },
  { key: "plans", label: "Kế hoạch" },
  { key: "statistics", label: "Thống kê" },
  { key: "discussion", label: "Thảo luận" },
  ...extraTabs.value,
]);

// ... existing code ...
// 3. Hàm xác nhận thanh toán
const splitLoading = ref({});

const paymentTab = ref("toPay"); // 'toPay' | 'toReceive'

const splitsToPay = computed(() => {
  if (!user.value || !event.value?.paymentSplits?.splits) return [];
  return event.value.paymentSplits.splits.filter(
    (split) => split.uid === user.value.uid && split.payTo !== user.value.uid
  );
});
const splitsToReceive = computed(() => {
  if (!user.value || !event.value?.paymentSplits?.splits) return [];
  return event.value.paymentSplits.splits.filter(
    (split) => split.payTo === user.value.uid && split.uid !== user.value.uid
  );
});

const notification = ref({
  show: false,
  message: "",
  type: "success", // 'success' | 'error'
});

const showNotification = (message, type = "success") => {
  notification.value = {
    show: true,
    message,
    type,
  };
  // Tự động ẩn sau 3 giây
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
};

const findSplitIndexInOriginalArray = (split) => {
  if (!event.value?.paymentSplits?.splits) return -1;
  return event.value.paymentSplits.splits.findIndex(
    (s) =>
      s.uid === split.uid &&
      s.payTo === split.payTo &&
      s.transactionId === split.transactionId &&
      s.amount === split.amount
  );
};

const sendPaidRequest = async (split, isBulkMode = false) => {
  console.log("sendPaidRequest called with:", split);
  console.log("isBulkMode:", isBulkMode);

  if (!event.value || !event.value.paymentSplits) {
    console.error("Event or paymentSplits not found");
    return;
  }

  const splitIdx = findSplitIndexInOriginalArray(split);
  console.log("Found split index:", splitIdx);

  if (splitIdx === -1) {
    console.error("Split not found in original array");
    if (!isBulkMode) {
      showNotification("Không tìm thấy khoản thanh toán!", "error");
    }
    return;
  }

  const loadingKey = split.transactionId ? 
    `${split.uid}-${split.payTo}-${split.transactionId}` : 
    `${split.uid}-${split.payTo}`;
  if (!isBulkMode) {
    splitLoading.value[loadingKey] = true;
  }

  try {
    console.log("Starting Firestore update...");
    const eventRef = doc(db, "events", event.value.id);
    const paymentSplits = { ...event.value.paymentSplits };
    const splits = [...paymentSplits.splits];

    // Kiểm tra nếu trả cho chính mình thì tự động xác nhận
    const isPayingToSelf = split.uid === split.payTo;
    console.log("isPayingToSelf:", isPayingToSelf);

    // Update the specific split
    const updatedSplit = {
      ...splits[splitIdx],
      status: "paid",
      paidAt: Timestamp.now(),
      paidBy: user.value.uid,
      confirmedByReceiver: isPayingToSelf, // Tự động xác nhận nếu trả cho chính mình
    };

    console.log("Updated split:", updatedSplit);
    splits[splitIdx] = updatedSplit;

    // Update Firestore
    console.log("Updating Firestore...");
    await updateDoc(eventRef, {
      paymentSplits: {
        ...paymentSplits,
        splits: splits,
      },
    });

    console.log("Firestore updated successfully");

    // Update local state
    event.value.paymentSplits.splits = splits;

    if (!isBulkMode) {
      if (isPayingToSelf) {
        showNotification("Đã tự động xác nhận thanh toán cho chính mình!");
      } else {
        showNotification("Đã gửi yêu cầu thành công!");
      }
    }
  } catch (error) {
    if (!isBulkMode) {
      showNotification("Có lỗi khi gửi yêu cầu đã trả!", "error");
    }
    console.error(error);
    throw error; // Re-throw để bulk mode có thể handle
  } finally {
    if (!isBulkMode) {
      splitLoading.value[loadingKey] = false;
    }
  }
};

const confirmReceived = async (split, isBulkMode = false) => {
  console.log('confirmReceived called with:', split);
  console.log('isBulkMode:', isBulkMode);
  
  if (!event.value || !event.value.paymentSplits) {
    console.error('Event or paymentSplits not found');
    return;
  }
  
  const splitIdx = findSplitIndexInOriginalArray(split);
  console.log('Found split index:', splitIdx);
  
  if (splitIdx === -1) {
    console.error('Split not found in original array');
    if (!isBulkMode) {
      showNotification("Không tìm thấy khoản thanh toán!", "error");
    }
    return;
  }

  const loadingKey = split.transactionId ? 
    `${split.uid}-${split.payTo}-${split.transactionId}` : 
    `${split.uid}-${split.payTo}`;
  if (!isBulkMode) {
    splitLoading.value[loadingKey] = true;
  }

  try {
    console.log('Starting Firestore update for confirmReceived...');
    const eventRef = doc(db, "events", event.value.id);
    const paymentSplits = { ...event.value.paymentSplits };
    const splits = [...paymentSplits.splits];

    // Update the specific split
    const updatedSplit = {
      ...splits[splitIdx],
      confirmedByReceiver: true,
      confirmedAt: Timestamp.now(),
    };
    
    console.log('Updated split:', updatedSplit);
    splits[splitIdx] = updatedSplit;

    // Update Firestore
    console.log('Updating Firestore...');
    await updateDoc(eventRef, {
      paymentSplits: {
        ...paymentSplits,
        splits: splits,
      },
    });

    console.log('Firestore updated successfully');

    // Update local state
    event.value.paymentSplits.splits = splits;

    if (!isBulkMode) {
      showNotification("Đã xác nhận nhận tiền!");
    }
  } catch (error) {
    if (!isBulkMode) {
      showNotification("Có lỗi khi xác nhận đã nhận tiền!", "error");
    }
    console.error(error);
    throw error; // Re-throw để bulk mode có thể handle
  } finally {
    if (!isBulkMode) {
      splitLoading.value[loadingKey] = false;
    }
  }
};

const totalPendingPayments = computed(() => {
  return pendingPaymentsToReceive.value + pendingPaymentsToPay.value;
});

// Filter cho tab "Tôi cần trả"
const selectedPayToFilter = ref("all"); // 'all' hoặc array of user IDs
const selectedStatusFilter = ref("all"); // 'all', 'paid', 'unpaid'
const showPayToFilterDropdown = ref(false);
const showStatusFilterDropdown = ref(false);

// Filter cho tab "Tôi nhận"
const selectedPayerFilter = ref("all"); // 'all' hoặc array of user IDs
const selectedReceiveStatusFilter = ref("all"); // 'all', 'received', 'pending'
const showPayerFilterDropdown = ref(false);
const showReceiveStatusFilterDropdown = ref(false);

// Checkbox selection cho bulk actions
const selectedSplits = ref(new Set());
const selectedReceiveSplits = ref(new Set());
const isSelectingMultiple = ref(false);
const isSelectingMultipleReceive = ref(false);

// Tính tổng số tiền của các splits được chọn trong tab "Tôi nhận"
const selectedReceiveSplitsTotalAmount = computed(() => {
  if (!selectedReceiveSplits.value.size) return 0;
  
  let total = 0;
  selectedReceiveSplits.value.forEach((splitKey) => {
    const parts = splitKey.split("-");
    const uid = parts[0];
    const payTo = parts[1];
    const transactionId = parts.length > 2 ? parts[2] : null;
    
    // Tìm split tương ứng trong filteredSplitsToReceive
    const split = filteredSplitsToReceive.value.find(s => {
      if (transactionId) {
        return s.uid === uid && s.payTo === payTo && s.transactionId === transactionId;
      }
      return s.uid === uid && s.payTo === payTo;
    });
    
    if (split) {
      total += split.amount;
    }
  });
  
  return total;
});

// Tính tổng số tiền của các splits được chọn trong tab "Tôi cần trả"
const selectedSplitsTotalAmount = computed(() => {
  if (!selectedSplits.value.size) return 0;
  
  let total = 0;
  selectedSplits.value.forEach((splitKey) => {
    const parts = splitKey.split("-");
    const uid = parts[0];
    const payTo = parts[1];
    const transactionId = parts.length > 2 ? parts[2] : null;
    
    // Tìm split tương ứng trong filteredSplitsToPay
    const split = filteredSplitsToPay.value.find(s => {
      if (transactionId) {
        return s.uid === uid && s.payTo === payTo && s.transactionId === transactionId;
      }
      return s.uid === uid && s.payTo === payTo;
    });
    
    if (split) {
      total += split.amount;
    }
  });
  
  return total;
});

// Danh sách người tham gia để filter (loại bỏ chính mình)
const availablePayToOptions = computed(() => {
  if (!event.value?.participants) return [];
  return event.value.participants
    .filter((p) => p.uid !== user.value?.uid)
    .map((p) => ({
      uid: p.uid,
      name: p.name || p.email,
      email: p.email,
    }));
});

// Danh sách người trả để filter (loại bỏ chính mình)
const availablePayerOptions = computed(() => {
  if (!event.value?.participants) return [];
  return event.value.participants
    .filter((p) => p.uid !== user.value?.uid)
    .map((p) => ({
      uid: p.uid,
      name: p.name || p.email,
      email: p.email,
    }));
});

// Danh sách đã lọc theo filter
const filteredSplitsToPay = computed(() => {
  if (!splitsToPay.value) return [];

  let filtered = splitsToPay.value;

  // Filter theo người nhận
  if (selectedPayToFilter.value !== "all") {
    if (Array.isArray(selectedPayToFilter.value)) {
      filtered = filtered.filter((split) =>
        selectedPayToFilter.value.includes(split.payTo)
      );
    } else {
      filtered = filtered.filter(
        (split) => split.payTo === selectedPayToFilter.value
      );
    }
  }

  // Filter theo trạng thái
  if (selectedStatusFilter.value !== "all") {
    if (selectedStatusFilter.value === "paid") {
      // Đã trả: status = 'paid' và confirmedByReceiver = true
      filtered = filtered.filter(
        (split) => split.status === "paid" && split.confirmedByReceiver
      );
    } else if (selectedStatusFilter.value === "unpaid") {
      // Chưa trả: status != 'paid' hoặc (status = 'paid' nhưng chưa xác nhận)
      filtered = filtered.filter(
        (split) =>
          split.status !== "paid" ||
          (split.status === "paid" && !split.confirmedByReceiver)
      );
    }
  }

  // Sắp xếp: chưa trả/chờ xác nhận lên đầu
  return filtered.sort((a, b) => {
    // Kiểm tra trạng thái thanh toán
    const aIsPaid = a.status === "paid" && a.confirmedByReceiver;
    const bIsPaid = b.status === "paid" && b.confirmedByReceiver;
    
    // Nếu a chưa trả và b đã trả thì a lên đầu
    if (!aIsPaid && bIsPaid) return -1;
    // Nếu a đã trả và b chưa trả thì b lên đầu
    if (aIsPaid && !bIsPaid) return 1;
    
    // Nếu cùng trạng thái thì sắp xếp theo thời gian tạo (mới nhất lên đầu)
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });
});

// Danh sách đã lọc theo filter cho tab "Tôi nhận"
const filteredSplitsToReceive = computed(() => {
  if (!splitsToReceive.value) return [];

  let filtered = splitsToReceive.value;

  // Filter theo người trả
  if (selectedPayerFilter.value !== "all") {
    if (Array.isArray(selectedPayerFilter.value)) {
      filtered = filtered.filter((split) =>
        selectedPayerFilter.value.includes(split.uid)
      );
    } else {
      filtered = filtered.filter(
        (split) => split.uid === selectedPayerFilter.value
      );
    }
  }

  // Filter theo trạng thái
  if (selectedReceiveStatusFilter.value !== "all") {
    if (selectedReceiveStatusFilter.value === "received") {
      // Đã nhận: status = 'paid' và confirmedByReceiver = true
      filtered = filtered.filter(
        (split) => split.status === "paid" && split.confirmedByReceiver
      );
    } else if (selectedReceiveStatusFilter.value === "pending") {
      // Chưa nhận: status = 'paid' nhưng chưa xác nhận HOẶC status != 'paid'
      filtered = filtered.filter(
        (split) => 
          split.status !== "paid" ||
          (split.status === "paid" && !split.confirmedByReceiver)
      );
    }
  }

  // Sắp xếp: chưa nhận/chờ xác nhận lên đầu
  return filtered.sort((a, b) => {
    // Kiểm tra trạng thái nhận tiền
    const aIsReceived = a.status === "paid" && a.confirmedByReceiver;
    const bIsReceived = b.status === "paid" && b.confirmedByReceiver;
    
    // Nếu a chưa nhận và b đã nhận thì a lên đầu
    if (!aIsReceived && bIsReceived) return -1;
    // Nếu a đã nhận và b chưa nhận thì b lên đầu
    if (aIsReceived && !bIsReceived) return 1;
    
    // Nếu cùng trạng thái thì sắp xếp theo thời gian tạo (mới nhất lên đầu)
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });
});

// Tính tổng tiền đã trả và chưa trả theo filter
const filteredPaymentsStats = computed(() => {
  const filtered = filteredSplitsToPay.value;
  let paidAmount = 0;
  let unpaidAmount = 0;

  filtered.forEach((split) => {
    if (split.status === "paid" && split.confirmedByReceiver) {
      paidAmount += split.amount;
    } else {
      unpaidAmount += split.amount;
    }
  });

  return {
    paidAmount,
    unpaidAmount,
    totalAmount: paidAmount + unpaidAmount,
  };
});

// Tính tổng tiền đã nhận và chưa nhận theo filter cho tab "Tôi nhận"
const filteredReceiveStats = computed(() => {
  const filtered = filteredSplitsToReceive.value;
  let receivedAmount = 0;
  let pendingAmount = 0;

  filtered.forEach((split) => {
    if (split.status === "paid" && split.confirmedByReceiver) {
      receivedAmount += split.amount;
    } else if (split.status === "paid" && !split.confirmedByReceiver) {
      pendingAmount += split.amount;
    } else if (split.status !== "paid") {
      // Các khoản chưa thanh toán cũng tính vào pending
      pendingAmount += split.amount;
    }
  });

  return {
    receivedAmount,
    pendingAmount,
    totalAmount: receivedAmount + pendingAmount,
  };
});

// Thống kê tổng hợp: Số tiền sẽ nhận - Số tiền phải trả
const overallPaymentStats = computed(() => {
  const totalToReceive = filteredReceiveStats.value.totalAmount;
  const totalToPay = filteredPaymentsStats.value.totalAmount;
  const netAmount = totalToReceive - totalToPay;
  
  return {
    totalToReceive,
    totalToPay,
    netAmount,
    isPositive: netAmount > 0,
    isNegative: netAmount < 0,
    isZero: netAmount === 0
  };
});

// Cập nhật pendingPaymentsToPay để sử dụng filtered list
const pendingPaymentsToPay = computed(() => {
  if (!user.value || !event.value?.paymentSplits?.splits) return 0;
  // Đếm các khoản trong danh sách đã lọc và có trạng thái chưa thanh toán HOẶC đã gửi yêu cầu nhưng chưa xác nhận
  return filteredSplitsToPay.value.filter(
    (split) =>
      split.status !== "paid" ||
      (split.status === "paid" && !split.confirmedByReceiver)
  ).length;
});

// Cập nhật pendingPaymentsToReceive để sử dụng filtered list
const pendingPaymentsToReceive = computed(() => {
  if (!user.value || !event.value?.paymentSplits?.splits) return 0;
  // Đếm các khoản trong danh sách đã lọc và có trạng thái chưa thanh toán HOẶC chưa xác nhận
  return filteredSplitsToReceive.value.filter(
    (split) =>
      split.status !== "paid" ||
      (split.status === "paid" && !split.confirmedByReceiver)
  ).length;
});

// Thêm hàm để lưu trạng thái đã thông báo vào local storage
const saveNotifiedState = (split) => {
  const storageKey = `notified_${event.value.id}_${split.uid}_${split.payTo}`;
  localStorage.setItem(storageKey, "true");
};

// Kiểm tra trạng thái đã thông báo
const isAlreadyNotified = (split) => {
  const storageKey = `notified_${event.value.id}_${split.uid}_${split.payTo}`;
  return localStorage.getItem(storageKey) === "true";
};

const showEndEventModal = ref(false);
const isEndingEvent = ref(false);

const endEvent = async () => {
  if (!event.value) return;
  isEndingEvent.value = true;
  try {
    const eventRef = doc(db, "events", event.value.id);
    await updateDoc(eventRef, { isEnded: true });
    event.value.isEnded = true;
    showEndEventModal.value = false;
    // Optional: show notification
    showNotification("Sự kiện đã được kết thúc!", "success");
  } catch (error) {
    showNotification("Có lỗi khi kết thúc sự kiện!", "error");
    console.error(error);
  } finally {
    isEndingEvent.value = false;
  }
};

const paymentError = ref("");

const handleConfirmPaymentSplits = () => {
  if (!isPaymentValid.value) {
    paymentError.value = "Số tiền chia chưa hợp lệ hoặc chưa đủ!";
    alert(paymentError.value);
    return;
  }
  paymentError.value = "";
  confirmPaymentSplits();
};

const getTransactionDescription = (transactionId) => {
  const transaction = event.value.transactions.find(
    (t) => t.id === transactionId
  );
  return transaction ? transaction.description : "Không có mô tả";
};

// Hàm xử lý filter cho tab "Tôi cần trả"
const togglePayToFilterDropdown = () => {
  showPayToFilterDropdown.value = !showPayToFilterDropdown.value;
  if (showPayToFilterDropdown.value) {
    showStatusFilterDropdown.value = false;
  }
};

const toggleStatusFilterDropdown = () => {
  showStatusFilterDropdown.value = !showStatusFilterDropdown.value;
  if (showStatusFilterDropdown.value) {
    showPayToFilterDropdown.value = false;
  }
};

const togglePayerFilterDropdown = () => {
  showPayerFilterDropdown.value = !showPayerFilterDropdown.value;
  if (showPayerFilterDropdown.value) {
    showReceiveStatusFilterDropdown.value = false;
  }
};

const toggleReceiveStatusFilterDropdown = () => {
  showReceiveStatusFilterDropdown.value =
    !showReceiveStatusFilterDropdown.value;
  if (showReceiveStatusFilterDropdown.value) {
    showPayerFilterDropdown.value = false;
  }
};

const selectPayToFilter = (filterValue) => {
  selectedPayToFilter.value = filterValue;
  showPayToFilterDropdown.value = false;
};

const selectStatusFilter = (filterValue) => {
  selectedStatusFilter.value = filterValue;
  showStatusFilterDropdown.value = false;
};

const selectPayerFilter = (filterValue) => {
  selectedPayerFilter.value = filterValue;
  showPayerFilterDropdown.value = false;
};

const selectReceiveStatusFilter = (filterValue) => {
  selectedReceiveStatusFilter.value = filterValue;
  showReceiveStatusFilterDropdown.value = false;
};

const selectAllPayTo = () => {
  selectedPayToFilter.value = "all";
  showPayToFilterDropdown.value = false;
};

const selectAllStatus = () => {
  selectedStatusFilter.value = "all";
  showStatusFilterDropdown.value = false;
};

const selectAllPayer = () => {
  selectedPayerFilter.value = "all";
  showPayerFilterDropdown.value = false;
};

const selectAllReceiveStatus = () => {
  selectedReceiveStatusFilter.value = "all";
  showReceiveStatusFilterDropdown.value = false;
};

const selectMultiplePayTo = (userIds) => {
  selectedPayToFilter.value = userIds;
  showPayToFilterDropdown.value = false;
};

const getFilterDisplayText = () => {
  if (selectedPayToFilter.value === "all") {
    return "Tất cả";
  }

  if (Array.isArray(selectedPayToFilter.value)) {
    if (selectedPayToFilter.value.length === 0) {
      return "Tất cả";
    }
    if (selectedPayToFilter.value.length === 1) {
      const user = availablePayToOptions.value.find(
        (u) => u.uid === selectedPayToFilter.value[0]
      );
      return user ? user.name : "Không xác định";
    }
    return `${selectedPayToFilter.value.length} người`;
  }

  const user = availablePayToOptions.value.find(
    (u) => u.uid === selectedPayToFilter.value
  );
  return user ? user.name : "Không xác định";
};

const getStatusFilterDisplayText = () => {
  switch (selectedStatusFilter.value) {
    case "all":
      return "Tất cả";
    case "paid":
      return "Đã trả";
    case "unpaid":
      return "Chưa trả";
    default:
      return "Tất cả";
  }
};

const getReceiveStatusFilterDisplayText = () => {
  switch (selectedReceiveStatusFilter.value) {
    case "all":
      return "Tất cả";
    case "received":
      return "Đã nhận";
    case "pending":
      return "Chưa nhận";
    default:
      return "Tất cả";
  }
};

// Hàm xử lý checkbox selection
const toggleSplitSelection = (splitKey) => {
  console.log("Toggle selection for:", splitKey);
  console.log("Current selectedSplits:", selectedSplits.value);

  if (selectedSplits.value.has(splitKey)) {
    selectedSplits.value.delete(splitKey);
    console.log("Removed from selection");
  } else {
    selectedSplits.value.add(splitKey);
    console.log("Added to selection");
  }

  isSelectingMultiple.value = selectedSplits.value.size > 0;
  console.log("Updated selectedSplits:", selectedSplits.value);
  console.log("isSelectingMultiple:", isSelectingMultiple.value);
};

const selectAllVisibleSplits = () => {
  const selectableSplits = filteredSplitsToPay.value.filter(
    (split) => !(split.status === "paid" && split.confirmedByReceiver)
  );
  
  // Kiểm tra xem tất cả đã được chọn chưa
  const allSelected = selectableSplits.every(split => {
    const splitKey = split.transactionId ? 
      `${split.uid}-${split.payTo}-${split.transactionId}` : 
      `${split.uid}-${split.payTo}`;
    return selectedSplits.value.has(splitKey);
  });
  
  if (allSelected) {
    // Nếu tất cả đã chọn thì bỏ chọn tất cả
    selectedSplits.value.clear();
  } else {
    // Nếu chưa chọn tất cả thì chọn tất cả
    selectedSplits.value.clear();
    selectableSplits.forEach((split) => {
      const splitKey = split.transactionId ? 
        `${split.uid}-${split.payTo}-${split.transactionId}` : 
        `${split.uid}-${split.payTo}`;
      selectedSplits.value.add(splitKey);
    });
  }
  
  isSelectingMultiple.value = selectedSplits.value.size > 0;
};

const clearSelection = () => {
  selectedSplits.value.clear();
  isSelectingMultiple.value = false;
};

const toggleReceiveSplitSelection = (splitKey) => {
  console.log("Toggle receive selection for:", splitKey);
  console.log("Current selectedReceiveSplits:", selectedReceiveSplits.value);

  if (selectedReceiveSplits.value.has(splitKey)) {
    selectedReceiveSplits.value.delete(splitKey);
    console.log("Removed from receive selection");
  } else {
    selectedReceiveSplits.value.add(splitKey);
    console.log("Added to receive selection");
  }

  isSelectingMultipleReceive.value = selectedReceiveSplits.value.size > 0;
  console.log("Updated selectedReceiveSplits:", selectedReceiveSplits.value);
  console.log("isSelectingMultipleReceive:", isSelectingMultipleReceive.value);
};

const selectAllVisibleReceiveSplits = () => {
  console.log('selectAllVisibleReceiveSplits called');
  console.log('filteredSplitsToReceive:', filteredSplitsToReceive.value);
  
  // Chỉ chọn những khoản thực sự có thể xác nhận
  const selectableSplits = filteredSplitsToReceive.value.filter(
    (split) => split.status === "paid" && !split.confirmedByReceiver
  );
  
  console.log('Selectable splits (can confirm):', selectableSplits);
  
  if (selectableSplits.length === 0) {
    console.log('No splits can be confirmed');
    showNotification("Không có khoản nào có thể xác nhận!", "error");
    return;
  }
  
  // Kiểm tra xem tất cả đã được chọn chưa
  const allSelected = selectableSplits.every(split => {
    const splitKey = split.transactionId ? 
      `${split.uid}-${split.payTo}-${split.transactionId}` : 
      `${split.uid}-${split.payTo}`;
    return selectedReceiveSplits.value.has(splitKey);
  });
  
  console.log('All selected:', allSelected);
  console.log('Current selectedReceiveSplits:', selectedReceiveSplits.value);
  
  if (allSelected) {
    // Nếu tất cả đã chọn thì bỏ chọn tất cả
    console.log('Clearing all selections');
    selectedReceiveSplits.value.clear();
  } else {
    // Nếu chưa chọn tất cả thì chọn tất cả
    console.log('Selecting all selectable splits');
    selectedReceiveSplits.value.clear();
    selectableSplits.forEach((split) => {
      // Tạo unique key bao gồm cả transactionId để tránh conflict
      const splitKey = split.transactionId ? 
        `${split.uid}-${split.payTo}-${split.transactionId}` : 
        `${split.uid}-${split.payTo}`;
      console.log('Adding to selection:', splitKey, 'Status:', split.status, 'Confirmed:', split.confirmedByReceiver);
      selectedReceiveSplits.value.add(splitKey);
    });
  }
  
  isSelectingMultipleReceive.value = selectedReceiveSplits.value.size > 0;
  console.log('Final selectedReceiveSplits:', selectedReceiveSplits.value);
  console.log('isSelectingMultipleReceive:', isSelectingMultipleReceive.value);
  
  if (selectedReceiveSplits.value.size > 0) {
    showNotification(`Đã chọn ${selectedReceiveSplits.value.size} khoản có thể xác nhận!`, "success");
  }
};

const clearReceiveSelection = () => {
  selectedReceiveSplits.value.clear();
  isSelectingMultipleReceive.value = false;
};

// Gửi yêu cầu đã trả cho nhiều khoản
const sendBulkPaidRequests = async () => {
  if (selectedSplits.value.size === 0) return;

  const splitsToProcess = Array.from(selectedSplits.value)
    .map((splitKey) => {
      const parts = splitKey.split("-");
      const uid = parts[0];
      const payTo = parts[1];
      const transactionId = parts.length > 2 ? parts[2] : null;
      
      return filteredSplitsToPay.value.find(
        (split) => {
          if (transactionId) {
            return split.uid === uid && split.payTo === payTo && split.transactionId === transactionId;
          }
          return split.uid === uid && split.payTo === payTo;
        }
      );
    })
    .filter(
      (split) =>
        split && !(split.status === "paid" && split.confirmedByReceiver)
    );

  if (splitsToProcess.length === 0) {
    showNotification("Không có khoản nào hợp lệ để gửi yêu cầu!", "error");
    return;
  }

  try {
    // Hiển thị loading cho tất cả items được chọn
    splitsToProcess.forEach((split) => {
      const loadingKey = split.transactionId ? 
        `${split.uid}-${split.payTo}-${split.transactionId}` : 
        `${split.uid}-${split.payTo}`;
      splitLoading.value[loadingKey] = true;
    });

    // Gửi yêu cầu cho từng khoản
    for (const split of splitsToProcess) {
      await sendPaidRequest(split, true); // true = bulk mode
    }

    showNotification(
      `Đã gửi yêu cầu cho ${splitsToProcess.length} khoản!`,
      "success"
    );
    clearSelection();
  } catch (error) {
    showNotification("Có lỗi khi gửi yêu cầu hàng loạt!", "error");
    console.error(error);
  } finally {
    // Clear loading cho tất cả items
    splitsToProcess.forEach((split) => {
      const loadingKey = split.transactionId ? 
        `${split.uid}-${split.payTo}-${split.transactionId}` : 
        `${split.uid}-${split.payTo}`;
      splitLoading.value[loadingKey] = false;
    });
  }
};

// Xác nhận đã nhận tiền cho nhiều khoản - Trực tiếp vào Firebase
const confirmBulkReceived = async () => {
  console.log('confirmBulkReceived called');
  console.log('selectedReceiveSplits:', selectedReceiveSplits.value);
  
  if (selectedReceiveSplits.value.size === 0) {
    showNotification("Không có khoản nào được chọn!", "error");
    return;
  }

  try {
    // Lấy tất cả splits được chọn
    const selectedSplits = Array.from(selectedReceiveSplits.value);
    console.log('Selected splits to process:', selectedSplits);
    
    // Hiển thị loading cho tất cả items được chọn
    selectedSplits.forEach((splitKey) => {
      splitLoading.value[splitKey] = true;
    });

    // Cập nhật trực tiếp vào Firebase
    const eventRef = doc(db, "events", event.value.id);
    const paymentSplits = { ...event.value.paymentSplits };
    const splits = [...paymentSplits.splits];
    
    let updatedCount = 0;
    
    // Cập nhật từng split được chọn
    for (const splitKey of selectedSplits) {
      const parts = splitKey.split("-");
      const uid = parts[0];
      const payTo = parts[1];
      const transactionId = parts.length > 2 ? parts[2] : null;
      
      // Tìm splits match với uid và payTo
      let matchingSplits = splits.filter(s => s.uid === uid && s.payTo === payTo);
      
      // Nếu có transactionId, filter thêm theo transactionId
      if (transactionId) {
        matchingSplits = matchingSplits.filter(s => s.transactionId === transactionId);
      }
      
      if (matchingSplits.length > 0) {
        // Nếu có nhiều splits match, chỉ cập nhật những split có thể xác nhận (status = 'paid' và chưa xác nhận)
        const splitsToUpdate = matchingSplits.filter(s => 
          s.status === 'paid' && !s.confirmedByReceiver
        );
        
        for (const splitToUpdate of splitsToUpdate) {
          const splitIdx = splits.findIndex(s => 
            s.uid === splitToUpdate.uid && 
            s.payTo === splitToUpdate.payTo && 
            s.transactionId === splitToUpdate.transactionId &&
            s.amount === splitToUpdate.amount
          );
          
          if (splitIdx !== -1) {
            console.log('Updating split at index:', splitIdx, 'Key:', splitKey);
            
            // Cập nhật split
            splits[splitIdx] = {
              ...splits[splitIdx],
              confirmedByReceiver: true,
              confirmedAt: Timestamp.now(),
            };
            
            updatedCount++;
          }
        }
      }
    }
    
    if (updatedCount > 0) {
      // Cập nhật Firebase
      console.log('Updating Firebase with', updatedCount, 'splits');
      await updateDoc(eventRef, {
        paymentSplits: {
          ...paymentSplits,
          splits: splits,
        },
      });
      
      // Cập nhật local state
      event.value.paymentSplits.splits = splits;
      
      showNotification(`Đã xác nhận ${updatedCount} khoản!`, "success");
    } else {
      showNotification("Không tìm thấy khoản nào để xác nhận!", "error");
    }
    
    clearReceiveSelection();
  } catch (error) {
    showNotification("Có lỗi khi xác nhận hàng loạt!", "error");
    console.error(error);
  } finally {
    // Clear loading cho tất cả items
    Array.from(selectedReceiveSplits.value).forEach((splitKey) => {
      splitLoading.value[splitKey] = false;
    });
  }
};

// Đảm bảo hàm openPaymentModal luôn hoạt động đúng
const openPaymentModal = () => {
  if (!event.value) return;
  paymentForTransaction.value = null;
  const members = event.value.participants || [];
  const total = totalAmountToSplit.value;
  const even = Math.floor(total / members.length);
  const remainder = total - even * members.length;
  paymentSplits.value = members.map((m, idx) => ({
    uid: m.uid,
    amount: even + (idx === 0 ? remainder : 0),
    payTo: user.value.uid, // mặc định trả cho người bấm
    locked: false, // mặc định không khóa
  }));
  showPaymentModal.value = true;
};

// Khi đổi tab, cập nhật query param trên URL
watch(activeTab, (newTab) => {
  if (route.query.tab !== newTab) {
    router.replace({ query: { ...route.query, tab: newTab } });
  }
});
// Khi URL thay đổi (back/forward), cập nhật tab
watch(
  () => route.query.tab,
  (tab) => {
    if (tab && tab !== activeTab.value) {
      activeTab.value = tab;
    }
  }
);

const sortPlansByStartTime = () => {
  plans.value = [...plans.value].sort((a, b) => {
    const timeA = a.startTime.seconds
      ? a.startTime.seconds
      : new Date(a.startTime).getTime() / 1000;
    const timeB = b.startTime.seconds
      ? b.startTime.seconds
      : new Date(b.startTime).getTime() / 1000;
    return timeA - timeB;
  });
};

const searchText = ref("");
const planStatusFilter = ref("all");
const filteredPlans = computed(() => {
  let result = plans.value;
  if (planStatusFilter.value === "completed") {
    result = result.filter((p) => p.isCompleted);
  } else if (planStatusFilter.value === "incomplete") {
    result = result.filter((p) => !p.isCompleted);
  }
  if (searchText.value.trim()) {
    const q = searchText.value.trim().toLowerCase();
    result = result.filter(
      (p) =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }
  return result;
});

function formatInputDisplay(val) {
  if (val === null || val === undefined) return "";
  return Number(val).toLocaleString("en-US");
}
function onPaymentInput(idx, event) {
  let val = event.target.value.replace(/[^\d]/g, "");
  if (!val) val = "0";
  const newAmount = Number(val);
  
  // Cập nhật số tiền cho người được chọn
  paymentSplits.value[idx].amount = newAmount;
  
  // Tính toán số tiền còn lại và chia đều cho những người không bị khóa
  const totalAmount = paymentForTransaction.value ? paymentForTransaction.value.amount : totalAmountToSplit.value;
  
  // Tính tổng số tiền của những người bị khóa (trừ người hiện tại)
  const lockedAmount = paymentSplits.value.reduce((sum, split, i) => {
    if (i !== idx && split.locked) {
      return sum + split.amount;
    }
    return sum;
  }, 0);
  
  const remainingAmount = totalAmount - newAmount - lockedAmount;
  const unlockedParticipants = paymentSplits.value.filter((split, i) => i !== idx && !split.locked);
  
  if (unlockedParticipants.length > 0 && remainingAmount >= 0) {
    const evenAmount = Math.floor(remainingAmount / unlockedParticipants.length);
    const remainder = remainingAmount - evenAmount * unlockedParticipants.length;
    
    // Cập nhật số tiền cho những người không bị khóa
    let remainderCount = 0;
    paymentSplits.value.forEach((split, i) => {
      if (i !== idx && !split.locked) {
        split.amount = evenAmount + (remainderCount < remainder ? 1 : 0);
        remainderCount++;
      }
    });
  }
  
  // Format lại value và giữ vị trí con trỏ cuối
  const formatted = Number(val).toLocaleString("en-US");
  event.target.value = formatted;
  // Đặt lại con trỏ về cuối chuỗi
  setTimeout(() => {
    event.target.setSelectionRange(formatted.length, formatted.length);
  }, 0);
}

// Xử lý khi checkbox khóa số tiền thay đổi
function onLockAmountChange(idx) {
  // Khi khóa số tiền, cần chia lại số tiền cho những người không bị khóa
  if (paymentSplits.value[idx].locked) {
    // Tính toán lại số tiền cho những người không bị khóa
    const totalAmount = paymentForTransaction.value ? paymentForTransaction.value.amount : totalAmountToSplit.value;
    
    // Tính tổng số tiền của những người bị khóa
    const lockedAmount = paymentSplits.value.reduce((sum, split, i) => {
      if (split.locked) {
        return sum + split.amount;
      }
      return sum;
    }, 0);
    
    const remainingAmount = totalAmount - lockedAmount;
    const unlockedParticipants = paymentSplits.value.filter(split => !split.locked);
    
    if (unlockedParticipants.length > 0 && remainingAmount >= 0) {
      const evenAmount = Math.floor(remainingAmount / unlockedParticipants.length);
      const remainder = remainingAmount - evenAmount * unlockedParticipants.length;
      
      // Cập nhật số tiền cho những người không bị khóa
      let remainderCount = 0;
      paymentSplits.value.forEach((split, i) => {
        if (!split.locked) {
          split.amount = evenAmount + (remainderCount < remainder ? 1 : 0);
          remainderCount++;
        }
      });
    }
  }
}

// Thêm biến và hàm format số tiền cho input
const formattedTransactionAmount = ref("");

function formatCurrencyInput(value) {
  value = value.replace(/[^0-9]/g, "");
  if (!value) return "";
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Khi mở modal hoặc khi amount thay đổi, đồng bộ formattedTransactionAmount
watch(
  () => transactionForm.value.amount,
  (val) => {
    formattedTransactionAmount.value = formatCurrencyInput(
      val ? val.toString() : ""
    );
  }
);

function onTransactionAmountInput(e) {
  const raw = e.target.value.replace(/[^0-9]/g, "");
  transactionForm.value.amount = raw;
  formattedTransactionAmount.value = formatCurrencyInput(raw);
}

async function markNotificationsAsRead(eventId, userId) {
  const q = query(
    collection(db, "notifications"),
    where("eventId", "==", eventId),
    where("recipientId", "==", userId),
    where("isRead", "==", false)
  );
  const querySnapshot = await getDocs(q);
  for (const notiDoc of querySnapshot.docs) {
    await updateDoc(doc(db, "notifications", notiDoc.id), { isRead: true });
  }
}
</script>

<style scoped>
.event-detail-page {
  /* padding: 20px; */
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
  border-top: 4px solid #4caf50;
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: relative;
  justify-content: space-between;
}
.title-header {
  display: flex;
  gap: 20px;
  align-items: center;
}
.action-header {
  display: flex;
  gap: 20px;
  align-items: center;
  @media (max-width: 768px) {
    gap: 20px;
    flex: 1;
  }
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
.event-content {
  max-width: calc(100vw - 20px);
}
.event-title {
  font-size: 24px;
  color: #333;
  margin: 0;
  flex: 1;
}

.event-status-label-top {
  position: absolute;
  top: -18px;
  right: 20px;
  font-size: 14px;
  font-weight: 500;
  padding: 6px 18px;
  border-radius: 18px;
  pointer-events: none;
  z-index: 2;
  top: -13px;
  right: 8px;
  font-size: 13px;
  padding: 4px 14px;

  /* @media (max-width: 480px) {
    top: 12px;
    right: 15px;
    font-size: 12px;
    padding: 3px 12px;
  } */
}
.status-upcoming {
  background: #fffde7;
  color: #fbc02d;
  border: 1px solid #ffe082;
}
.status-active {
  background: #e8f5e9;
  color: #388e3c;
  border: 1px solid #a5d6a7;
}
.status-ended {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
  width: 100%;
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
  background-color: #4caf50;
  color: white;
}

.income-btn:hover {
  background-color: #43a047;
}

.expense-btn {
  background-color: #f44336;
  color: white;
}

.expense-btn:hover {
  background-color: #e53935;
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
  position: relative;
}

.filter-btn.active {
  background-color: #333;
  border-color: #333;
  color: white;
}

.unpaid-count {
  color: #f44336;
  font-weight: 500;
  font-size: 12px;
  margin-left: 4px;
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
  color: #4caf50;
}

.summary-item.expense .amount {
  color: #f44336;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.transaction-card.income {
  border-left: 4px solid #4caf50;
}

.transaction-card.expense {
  border-left: 4px solid #f44336;
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

.unpaid-dot {
  color: #f44336;
  font-weight: bold;
  margin-right: 6px;
  font-size: 18px;
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
  color: #4caf50;
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
  color: #4caf50;
}

.transaction-amount .expense {
  color: #f44336;
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
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
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
  border-color: #4caf50;
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
  background-color: #4caf50;
}

.submit-btn.active {
  background-color: #4caf50;
}

.submit-btn.active:hover:not(:disabled) {
  background-color: #43a047;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background-color: #ccc;
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }
  .action-btn.plan-btn {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .action-btn.sort-btn {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #ccc;
    border-radius: 50%;
  }
  .modal-content {
    height: 95vh;
    max-height: none;
    border-radius: 20px 20px 0 0;
    margin: 0;
    display: flex;
    flex-direction: column;
  }
  .payment-input-container {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 4px;
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
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
    z-index: 1;
  }
}

@media (max-width: 480px) {
  .modal-content {
    height: 100vh;
    border-radius: 0;
  }

  .modal-header {
    padding-top: env(
      safe-area-inset-top,
      20px
    ); /* Support for notched phones */
  }

  .modal-actions {
    padding-bottom: env(
      safe-area-inset-bottom,
      20px
    ); /* Support for notched phones */
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
  background: #f44336;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.delete-btn:hover:not(:disabled) {
  background: #e53935;
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
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .event-detail-page {
    /* padding: 10px; */
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
    padding: 0 6px;
    padding-bottom: 10px !important;
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

  .info-card,
  .participants-section {
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
  .section-header h2 {
    font-size: 18px;
  }

  .action-buttons {
    gap: 8px;
    width: 100%;
    display: flex;
    justify-content: end;
  }

  .action-btn {
    width: 70px;
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
    width: 100%;
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

  .split-info {
    width: 100%;
  }

  .payment-details {
    width: 100%;
    overflow-x: auto;
  }

  .payment-item {
    min-width: 280px;
    justify-content: space-between;
  }

  .modal-content {
    max-height: calc(100vh - 20px);
    border-radius: 20px 20px 0 0 !important;
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

  .payment-item {
    width: 100%;
    font-size: 10px;
  }

  .payment-item .payer,
  .payment-item .payee {
    max-width: 60px;
    min-width: 50px;
  }

  .payment-item .amount {
    min-width: 60px;
    font-size: 10px;
  }

  .payment-item .status {
    min-width: 40px;
    font-size: 8px;
    padding: 1px 3px;
  }

  .member-info {
    min-width: 120px;
  }

  .lock-amount-checkbox {
    font-size: 10px;
    padding: 3px 6px;
  }

  .lock-label {
    font-size: 10px;
  }

  .lock-amount-checkbox input[type="checkbox"] {
    width: 14px;
    height: 14px;
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
  @media (max-width: 768px) {
    font-size: 18px;
  }
}

.total-amount {
  font-size: 14px;
  color: #666;
}

.action-btn.plan-btn {
  background-color: #4caf50;
  color: white;
}

.action-btn.plan-btn:hover {
  background-color: #43a047;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 20px 22px 18px 22px;
  border-radius: 18px;
  background: #fff;
  border: 1.5px solid #e0e0e0;
  box-shadow: 0 4px 24px rgba(60, 60, 60, 0.16);
  transition: box-shadow 0.2s, border 0.2s;
  min-width: 260px;
  width: 100%;
  max-width: unset;
  margin: 0;
}
.plan-card:hover {
  box-shadow: 0 8px 32px rgba(60, 60, 60, 0.22);
  border-color: #b2dfdb;
}
.drag-handle {
  position: absolute;
  left: 14px;
  top: 16px;
  color: #bdbdbd;
  font-size: 20px;
  cursor: grab;
  z-index: 2;
}
.plan-actions {
  position: absolute;
  top: 14px;
  right: 16px;
  display: flex;
  gap: 8px;
  z-index: 2;
}
.action-icon {
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 18px;
  color: #757575;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  @media (max-width: 768px) {
    font-size: 13px;
  }
}
.action-icon.edit:hover {
  background: #e3f2fd;
  color: #1976d2;
}
.action-icon.delete:hover {
  background: #ffebee;
  color: #d32f2f;
}
.plan-content {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.plan-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.plan-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.plan-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 2px;
}
.completion-checkbox {
  margin: 0 0 0 8px;
  position: relative;
  width: 22px;
  height: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.completion-checkbox input {
  opacity: 0;
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  margin: 0;
  cursor: pointer;
  z-index: 2;
}
.checkmark {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #bdbdbd;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border 0.2s, background 0.2s;
  box-sizing: border-box;
  z-index: 1;
}
.completion-checkbox:hover .checkmark {
  border-color: #388e3c;
}
.completion-checkbox input:checked ~ .checkmark {
  background: #43a047;
  border-color: #388e3c;
}
.checkmark:after {
  content: "";
  display: none;
  width: 8px;
  height: 14px;
  border: solid #fff;
  border-width: 0 3px 3px 0;
  border-radius: 1px;
  transform: rotate(45deg);
  position: absolute;
  left: 7px;
  top: 2px;
}
.completion-checkbox input:checked ~ .checkmark:after {
  display: block;
}
@media (max-width: 600px) {
  .completion-checkbox,
  .checkmark {
    width: 18px;
    height: 18px;
  }
  .checkmark:after {
    width: 6px;
    height: 10px;
    left: 5px;
    top: 1px;
    border-width: 0 2px 2px 0;
  }
}
.plan-title {
  font-size: 20px;
  font-weight: 700;
  color: #222;
  margin: 0;
  flex: 1;
  letter-spacing: 0.2px;
}
.completed-badge {
  font-size: 12px;
  padding: 3px 10px;
  background: #e8f5e9;
  color: #388e3c;
  border-radius: 10px;
  font-weight: 600;
  border: 1px solid #a5d6a7;
  margin-left: 6px;
}
.plan-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #757575;
  flex-wrap: wrap;
}
.plan-description {
  color: #616161;
  font-size: 14px;
  line-height: 1.5;
  margin: 6px 0 0 0;
  font-style: italic;
}
.plan-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f7fafc;
  border-radius: 10px;
  padding: 10px 14px;
  margin-top: 8px;
}
.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.detail-item .label {
  color: #888;
  min-width: 110px;
}
.detail-item .value {
  font-size: 15px;
  font-weight: 700;
  color: #2e7d32;
  font-family: monospace;
}
.detail-item.assignees {
  align-items: flex-start;
  flex-direction: column;
  gap: 2px;
}
.assignees-list {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.all-members {
  color: #757575;
  font-style: italic;
  font-size: 13px;
}
@media (max-width: 600px) {
  .plans-list {
    gap: 10px !important;
  }
  .plan-card {
    min-width: unset;
    max-width: unset;
    width: 100%;
    margin: 0;
    padding: 10px 6px 10px 10px;
    border-radius: 12px;
    margin-bottom: 10px;
  }
  .plan-title {
    font-size: 15px;
  }
  .plan-details {
    padding: 6px 6px;
  }
  .plan-meta {
    font-size: 12px;
  }
  .drag-handle {
    left: 4px;
    top: 8px;
    font-size: 22px;
    padding: 8px 0;
  }
}

.statistics-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
  color: #f44336;
}

.summary-item.difference.under-budget .value {
  color: #4caf50;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
  color: #f44336;
}

.stat-item.difference.under-budget .value {
  color: #4caf50;
}

.plan-statistics-card.other {
  background: #f8f9fa;
  border-style: dashed;
}

.discussion-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
  background: #4caf50;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-size: 14px;
  color: #333;
  line-height: 1.4;
}

.own-message .message-content {
  background: #4caf50;
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
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}

.send-button {
  padding: 0 20px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.send-button:hover {
  background: #43a047;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.required {
  color: #f44336;
  margin-left: 4px;
}

.form-input.invalid {
  border-color: #f44336;
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
  border-color: #4caf50;
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.all-members {
  font-size: 13px;
  color: #666;
  font-style: italic;
}

@media (max-width: 768px) {
  .discussion-section {
    padding: 10px;
    /* max-width: 100vw; */
    box-sizing: border-box;
  }
  .plans-section-header {
    align-items: start;
    justify-content: space-between;
    gap: 10px;
  }
  .plans-section-header .section-title {
    align-items: start;
    width: 100%;
  }
  .discussion-content {
    max-height: 60vh;
    min-height: 200px;
    /* width: 100vw; */
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  .messages-container {
    max-height: 40vh;
    min-height: 50px;
    /* width: 100vw; */
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
    /* padding: 10px; */
    margin-top: 16px;
    margin-bottom: 0;
    width: 100%;
    box-sizing: border-box;
  }
}
@media (max-width: 480px) {
  .discussion-content {
    max-height: 65vh;
    min-height: 160px;
    /* width: 100vw; */
    padding: 0;
  }
  .messages-container {
    max-height: 50vh;
    min-height: 40px;
    /* width: 100vw; */
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
    /* padding: 6px; */
    margin-top: 10px;
    width: 100%;
  }
}

.chat-date-separator {
  text-align: center;
  color: #888;
  font-size: 13px;
  margin: 18px 0 10px 0;
  font-style: italic;
}

.chat-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 8px;
}
.own-group {
  align-items: flex-end;
}

.chat-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.chat-bubbles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.chat-bubble {
  display: inline-block;
  max-width: 70vw;
  background: #fff;
  color: #222;
  padding: 8px 14px;
  border-radius: 18px;
  margin-bottom: 0;
  font-size: 15px;
  position: relative;
  word-break: break-word;
  margin-left: 36px;
}

.own-bubble {
  background: #1877f2;
  color: #fff;
  align-self: flex-end;
  margin-left: 0;
  margin-right: 0;
}

.chat-bubble.first {
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
}
.chat-bubble.last {
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 18px;
  margin-bottom: 4px;
}
.own-group .chat-bubble {
  margin-left: 0;
  margin-right: 0;
  align-self: flex-end;
}

.bubble-content {
  display: block;
}
.bubble-time {
  display: block;
  color: #888;
  font-size: 12px;
  margin-top: 2px;
  text-align: right;
}

@media (max-width: 700px) {
  .event-detail-page {
    /* padding: 8px; */
  }
  .action-header {
    width: 100%;
  }
  .page-header {
    padding: 12px;
    margin-bottom: 15px;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .event-title {
    font-size: 18px;
    width: 100%;
  }

  .event-status {
    font-size: 12px;
    padding: 4px 8px;
  }

  .tabs {
    overflow-x: auto;
    padding-bottom: 5px;
    margin: 0 -8px;
    padding: 0 8px;
    -webkit-overflow-scrolling: touch;
  }

  .tab-btn {
    padding: 6px 10px;
    font-size: 12px;
    white-space: nowrap;
  }

  .discussion-section {
    padding: 8px;
    height: calc(100vh - 330px);
  }

  .discussion-content {
    height: calc(100% - 60px);
    margin-top: 10px;
  }

  .messages-container {
    padding: 8px;
    max-height: calc(100% - 50px);
  }

  .message-input {
    padding: 8px;
    position: sticky;
    bottom: 0;
    background: white;
    z-index: 1;
  }

  .message-textarea {
    padding: 8px;
    font-size: 13px;
    min-height: 36px;
  }

  .send-button {
    padding: 0 12px;
    font-size: 13px;
  }

  .chat-bubble {
    max-width: 85%;
    padding: 6px 12px;
    font-size: 14px;
    margin-left: 30px;
  }

  .own-bubble {
    margin-right: 0;
  }

  .bubble-time {
    font-size: 11px;
  }

  .info-section {
    /* padding: 8px; */
    margin-top: 10px;
  }

  .info-card,
  .participants-section {
    padding: 12px;
  }

  .info-grid {
    gap: 12px;
  }

  .info-label {
    font-size: 12px;
  }

  .info-value {
    font-size: 14px;
  }

  .participants-list {
    gap: 10px;
  }

  .participant-card {
    padding: 8px;
  }

  .participant-name {
    font-size: 13px;
  }

  .participant-email {
    font-size: 11px;
  }

  .modal-content {
    height: 100vh;
    border-radius: 0;
  }

  .modal-header {
    padding: 12px 16px;
  }

  .modal-body {
    padding: 16px;
  }

  .form-group {
    margin-bottom: 10px;
  }

  .form-input {
    padding: 10px;
    font-size: 14px;
  }

  .modal-actions {
    padding: 12px 16px;
  }

  .modal-actions button {
    padding: 10px 16px;
    font-size: 14px;
  }

  .scroll-to-bottom-btn {
    right: 8px;
    bottom: 8px;
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .chat-date-separator {
    font-size: 12px;
    margin: 12px 0 8px 0;
  }
}

.badge-unread {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #2196f3;
  color: #fff;
  border-radius: 50%;
  min-width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: bold;
  box-shadow: 0 2px 6px rgba(33, 150, 243, 0.15);
  z-index: 2;
  border: 2px solid #fff;
}

.tag-value {
  color: #00796b;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.5px;
}

.pay-btn {
  background: #4caf50;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 22px;
  font-size: 15px;
  font-weight: 600;
  /* margin-left: 16px; */
  cursor: pointer;
  transition: background 0.2s;
  @media (max-width: 768px) {
    display: flex;
    font-size: 13px;
    padding: 8px 10px;
    width: 100%;
    flex: 1;
    justify-content: center;
  }
}
.pay-btn:hover {
  background: #388e3c;
}
.payment-modal {
  max-width: 520px;
}
.payment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 18px;
}
.payment-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px 12px;
  flex-wrap: wrap;
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 160px;
  padding: 4px 0;
}

.member-name {
  font-weight: 500;
  color: #333;
}

.lock-amount-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  background: rgba(76, 175, 80, 0.05);
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.lock-amount-checkbox:hover {
  background: rgba(76, 175, 80, 0.1);
  border-color: rgba(76, 175, 80, 0.3);
}

.lock-amount-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #4caf50;
}

.lock-amount-checkbox input[type="checkbox"]:checked + .lock-label {
  color: #4caf50;
  font-weight: 500;
}

.lock-label {
  font-size: 11px;
  color: #666;
  transition: all 0.2s ease;
}
.payment-input {
  width: 90px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #ddd;
  font-size: 15px;
  text-align: right;
}

.payment-input:disabled {
  background-color: #f8f9fa;
  color: #999;
  cursor: not-allowed;
  border-color: #e0e0e0;
  opacity: 0.7;
}
.currency {
  color: #888;
  font-size: 15px;
  margin-left: 2px;
}
.pay-for-label {
  margin-left: 10px;
  font-size: 13px;
  color: #666;
}
.pay-for-select {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #4caf50;
  background: #fff;
  color: #333;
  font-size: 14px;
  outline: none;
  margin-left: 4px;
}
.payment-summary {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 15px;
  color: #333;
}

.payment-history-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-top: 20px;
}

.payment-history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.payment-history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  background: #f8f9fa;
}

.member-name {
  font-size: 16px;
  color: #333;
}

.amount {
  font-size: 14px;
  color: #666;
}

.pay-to {
  font-size: 14px;
  color: #666;
}

.status {
  font-size: 14px;
  color: #333;
  padding: 4px 8px;
  border-radius: 4px;
}

.status.paid {
  background: #e8f5e9;
  color: #388e3c;
}

.status.pending {
  background: #fff3e0;
  color: #f57f17;
}

.check-btn {
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.check-btn:hover {
  background: #43a047;
}

.paid-time {
  font-size: 12px;
  color: #666;
}

.pay-to-link {
  color: #1976d2;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s;
}
.pay-to-link:hover {
  color: #1565c0;
}

.notification {
  position: relative;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  animation: fadeIn 0.3s, fadeOut 0.5s 2.5s;
}

.notification.success {
  background-color: #e8f5e9;
  color: #388e3c;
  border: 1px solid #a5d6a7;
}

.notification.error {
  background-color: #ffebee;
  color: #d32f2f;
  border: 1px solid #ef9a9a;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.badge-counter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #f44336;
  color: white;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  font-size: 12px;
  font-weight: bold;
  padding: 0 6px;
  margin-left: 8px;
}

.tab-btn .badge-counter {
  position: relative;
  top: -1px;
  font-size: 11px;
  min-width: 18px;
  height: 18px;
}

.badge-counter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #f44336;
  color: white;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  font-size: 12px;
  font-weight: bold;
  padding: 0 6px;
  margin-left: 8px;
}

.tabs-section .badge-counter {
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 28px;
  height: 28px;
  font-size: 15px;
  box-shadow: 0 2px 6px rgba(244, 67, 54, 0.15);
  z-index: 2;
  border: 2px solid #fff;
}

.tab-btn .badge-counter {
  position: relative;
  top: -1px;
  font-size: 11px;
  min-width: 18px;
  height: 18px;
}

.notification-dot {
  position: absolute;
  top: 3px;
  left: -3px;
  width: 10px;
  height: 10px;
  background-color: #f44336;
  border-radius: 50%;
  border: 2px solid #fff;
  transform: translate(30%, -30%);
}

.end-event-btn {
  background: #d32f2f;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 22px;
  font-size: 15px;
  font-weight: 600;
  /* margin-left: 16px; */
  cursor: pointer;
  transition: background 0.2s;
  @media (max-width: 768px) {
    font-size: 13px;
    padding: 8px 10px;
    width: 100%;
    flex: 1;
  }
}
.end-event-btn:hover {
  background: #b71c1c;
}

.split-status {
  display: inline-block;
  background: #e8f5e9;
  color: #388e3c;
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 500;
  margin-top: 8px;
  margin-bottom: 4px;
}

.split-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.payment-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #f8f9fa;
  border-radius: 6px;
  padding: 8px;
  border-left: 3px solid #4caf50;
  width: 100%;
}

.payment-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 0;
  flex-wrap: wrap;
  width: 100%;
  justify-content: space-between;
}

.payment-item .payer,
.payment-item .payee {
  font-weight: 500;
  color: #333;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.payment-item .arrow {
  color: #666;
  font-size: 10px;
  flex-shrink: 0;
}

.payment-item .amount {
  font-weight: 600;
  color: #e65100;
  margin-left: auto;
  flex-shrink: 0;
  min-width: 80px;
  text-align: right;
}

.payment-item .status {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  min-width: 60px;
  text-align: center;
  flex-shrink: 0;
}

.payment-item .status.paid {
  background: #e8f5e9;
  color: #388e3c;
}

.payment-item .status.unpaid {
  background: #fff3e0;
  color: #f57c00;
}

.payment-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.payment-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.transaction-description {
  font-size: 13px;
  color: #666;
  font-style: italic;
  margin-top: 4px;
}

.payment-date {
  font-size: 12px;
  color: #888;
  font-style: italic;
  margin-top: 2px;
}

.receive-date {
  font-size: 12px;
  color: #888;
  font-style: italic;
  margin-top: 2px;
}

.payment-history-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px;
  border-radius: 8px;
  background: #f8f9fa;
  gap: 16px;
}

.payment-modal .modal-header {
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.payment-modal .modal-body {
  padding: 20px;
}

.payment-modal .modal-footer {
  padding: 16px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-button {
  padding: 8px 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button:hover {
  background: #e0e0e0;
}

.submit-button {
  padding: 8px 24px;
  background: #4caf50;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-button:hover:not(:disabled) {
  background: #43a047;
}

.submit-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.payment-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.payment-info {
  flex: 1;
  min-width: 0;
}

.payment-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  min-width: 120px;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.status.paid {
  background: #e8f5e9;
  color: #388e3c;
}

.status.pending {
  background: #fff3e0;
  color: #f57f17;
}

.confirmed-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #388e3c;
  font-size: 13px;
  font-weight: 500;
}

.confirmed-badge i {
  font-size: 16px;
}

.payment-history-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-radius: 8px;
  background: #f8f9fa;
  gap: 20px;
  border: 1px solid #eee;
  transition: all 0.2s;
}

.payment-history-row:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.member-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.amount {
  font-size: 16px;
  font-weight: 600;
  color: #2e7d32;
  font-family: monospace;
}

.transaction-description {
  font-size: 13px;
  color: #666;
  font-style: italic;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pay-to {
  font-size: 13px;
  color: #666;
}

.pay-to-link {
  color: #1976d2;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s;
}

.pay-to-link:hover {
  color: #1565c0;
}

.check-btn {
  padding: 6px 12px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.check-btn:hover:not(:disabled) {
  background: #43a047;
}

.check-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.transaction-description.highlight {
  font-weight: bold;
  color: #1565c0;
  background: #e3f2fd;
  padding: 4px 10px;
  border-radius: 6px;
  margin-top: 2px;
  display: inline-block;
  font-size: 15px;
}

.payment-receive-row .payer-name {
  font-weight: 600;
  color: #1976d2;
  font-size: 15px;
  margin-bottom: 2px;
}
.payment-receive-row .receive-description {
  font-style: italic;
  color: #666;
  font-size: 14px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.payment-receive-row .receive-amount {
  color: #2e7d32;
  font-size: 18px;
  font-weight: bold;
  margin-top: 2px;
}

.payer-link {
  color: #1976d2;
  cursor: pointer;
  text-decoration: underline;
  font-weight: 600;
  transition: color 0.2s;
}
.payer-link:hover {
  color: #0d47a1;
}

.payer-label {
  color: #888;
  font-size: 13px;
  font-weight: 400;
  margin-right: 2px;
}

.sort-btn {
  background: #f5f5f5;
  color: #1976d2;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 500;
  margin-left: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s, color 0.2s;
}
.sort-btn:hover {
  background: #e3f2fd;
  color: #0d47a1;
}
.sort-btn i {
  font-size: 16px;
}

/* Filter styles */
.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.filter-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-dropdown {
  position: relative;
  min-width: 180px;
}

.filter-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: border-color 0.2s;
}

.filter-btn:hover {
  border-color: #1976d2;
}

.filter-btn i {
  margin-left: 8px;
  transition: transform 0.2s;
}

.filter-dropdown-content {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.filter-option {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.filter-option:hover {
  background: #f5f5f5;
}

.filter-option i {
  margin-right: 8px;
  color: #1976d2;
  width: 16px;
}

.payment-stats {
  display: flex;
  gap: 16px;
  align-items: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
}

.stat-value.paid {
  color: #388e3c;
}

.stat-value.unpaid {
  color: #d32f2f;
}

.stat-value.total {
  color: #1976d2;
}

@media (max-width: 768px) {
  .filter-section {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .filter-controls {
    flex-direction: row;
    gap: 8px;
  }
  
  .filter-dropdown {
    min-width: auto;
    flex: 1;
    width: 50%;
  }
  
  .filter-btn {
    font-size: 11px;
    padding: 6px 8px;
  }
  
  .filter-option {
    font-size: 11px;
    padding: 6px 8px;
  }
  
  .payment-stats {
    justify-content: space-around;
  }
  
  .stat-item {
    min-width: auto;
  }
}

/* Checkbox styles */
.checkbox-container {
  display: flex;
  align-items: center;
  margin-right: 12px;
}

.split-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  opacity: 0;
  position: absolute;
  z-index: 1;
}

.checkbox-label {
  width: 18px;
  height: 18px;
  border: 2px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  background: white;
  transition: all 0.2s;
  display: block;
}

.split-checkbox:checked + .checkbox-label {
  background: #1976d2;
  border-color: #1976d2;
}

.split-checkbox:checked + .checkbox-label::after {
  content: "✓";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.split-checkbox:disabled + .checkbox-label {
  background: #f5f5f5;
  border-color: #ddd;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Payment history row with checkbox */
.payment-history-row {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eee;
  transition: background 0.2s;
}

.payment-history-row:hover {
  background: #f8f9fa;
}

/* Select all section */
.select-all-section {
  margin-bottom: 12px;
}

.select-all-btn {
  background: #e3f2fd;
  color: #1976d2;
  border: 1px solid #1976d2;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.select-all-btn:hover {
  background: #1976d2;
  color: white;
}

.select-all-btn:disabled {
  background: #f5f5f5;
  color: #ccc;
  border-color: #ddd;
  cursor: not-allowed;
  opacity: 0.6;
}

.select-all-btn:disabled:hover {
  background: #f5f5f5;
  color: #ccc;
  transform: none;
}

/* Bulk actions */
.bulk-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #e8f5e9;
  border: 1px solid #4caf50;
  border-radius: 8px;
  margin-bottom: 16px;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  color: #2e7d32;
}

.clear-selection-btn {
  background: none;
  border: 1px solid #d32f2f;
  color: #d32f2f;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.clear-selection-btn:hover {
  background: #d32f2f;
  color: white;
}

.bulk-action-btn {
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.bulk-action-btn:hover {
  background: #388e3c;
}

@media (max-width: 768px) {
  .bulk-actions {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .bulk-info {
    justify-content: space-between;
  }

  .payment-history-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .checkbox-container {
    align-self: flex-start;
    margin-bottom: 8px;
  }

  .payment-details {
    padding: 6px;
    overflow-x: auto;
  }

  .payment-item {
    font-size: 11px;
    gap: 4px;
    width: 100%;
    flex-wrap: nowrap;
  }

  .payment-item .payer,
  .payment-item .payee {
    max-width: 80px;
    min-width: 60px;
  }

  .payment-item .amount {
    font-size: 11px;
    min-width: 70px;
    text-align: right;
  }

  .payment-item .status {
    font-size: 9px;
    padding: 1px 4px;
    min-width: 50px;
    text-align: center;
  }
}

.plan-card.completed {
  background: #e8f5e9 !important;
  position: relative;
  overflow: hidden;
}
.completed-ribbon {
  position: absolute;
  top: 50%;
  left: -30%;
  width: 160%;
  text-align: center;
  transform: translateY(-50%) rotate(-15deg);
  background: #388e3c;
  color: #fff;
  font-weight: 800;
  font-size: 22px;
  opacity: 0.25;
  padding: 18px 0;
  z-index: 1;
  letter-spacing: 2px;
  border-radius: 0;
  box-shadow: none;
  pointer-events: none;
  user-select: none;
}
.plan-card.completed > *:not(.completed-ribbon) {
  position: relative;
  z-index: 2;
}
@media (max-width: 600px) {
  .completed-ribbon {
    font-size: 15px;
    padding: 10px 0;
  }
  .drag-handle {
    top: 6px;
    left: 6px;
    font-size: 18px;
    padding: 2px 4px;
  }
}

.plan-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
}
.plan-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.drag-handle {
  position: static;
  top: unset;
  left: unset;
  color: #bdbdbd;
  font-size: 18px;
  cursor: grab;
  z-index: 3;
  padding: 2px 4px;
  background: transparent;
  border-radius: 4px;
  display: flex;
  align-items: center;
}
.completion-checkbox {
  margin: 0 0 0 8px;
  position: relative;
  width: 20px;
  height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.plan-filter-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}
.plan-search-input {
  flex: 1;
  min-width: 120px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 15px;
}
/* Thống kê tổng hợp */
.overall-stats-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid #e9ecef;
}

.overall-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}

@media (max-width: 768px) {
  .overall-stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }
  
  .overall-stat-item {
    font-size: 9px;
    padding: 3px 4px;
  }
  
  .overall-stat-summary {
    font-size: 10px;
    padding-top: 6px;
  }
  
  .overall-stat-value {
    font-size: 9px;
  }
}

.overall-stat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 8px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.overall-stat-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  padding-top: 8px;
  border-top: 1px solid #e9ecef;
}

.overall-stat-label {
  font-weight: 500;
}

.overall-stat-label.positive {
  color: #28a745;
}

.overall-stat-label.negative {
  color: #dc3545;
}

.overall-stat-label.neutral {
  color: #6c757d;
}

.overall-stat-value {
  font-weight: 700;
  font-size: 12px;
}

.overall-stat-value.positive {
  color: #28a745;
}

.overall-stat-value.negative {
  color: #dc3545;
}

.overall-stat-value.neutral {
  color: #6c757d;
}

.plan-status-dropdown {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #bdbdbd;
  background: #f5f5f5;
  color: #333;
  font-size: 15px;
  min-width: 120px;
  outline: none;
  transition: border 0.2s;
}
.plan-status-dropdown:focus {
  border-color: #388e3c;
}
@media (max-width: 600px) {
  .plan-filter-bar {
    gap: 6px;
    margin-bottom: 10px;
  }
  .plan-search-input {
    font-size: 14px;
    padding: 7px 10px;
  }
  .plan-status-dropdown {
    min-width: 90px;
    font-size: 13px;
    padding: 7px 8px;
  }
}

@media (max-width: 600px) {
  .payment-input {
    width: 100% !important;
    min-width: 0;
    font-size: 15px;
    box-sizing: border-box;
  }
}
</style>
