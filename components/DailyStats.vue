<template>
  <div class="daily-stats">
    <div class="stats-header">
      <h3>Thống kê chi tiết theo ngày</h3>
      <div class="stats-summary">
        <div class="summary-item">
          <span class="label">Tổng ngày:</span>
          <span class="value">{{ totalDays }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Ngày có giao dịch:</span>
          <span class="value">{{ daysWithTransactions }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="dailyStats.length === 0" class="no-data">
      <p>Không có dữ liệu để hiển thị</p>
    </div>
    
    <div v-else class="stats-table">
      <div class="table-header">
        <div class="header-cell date-col">Ngày</div>
        <div class="header-cell income-col">Thu nhập</div>
        <div class="header-cell expense-col">Chi tiêu</div>
        <div class="header-cell balance-col">Số dư</div>
        <div class="header-cell count-col">Số giao dịch</div>
      </div>
      
      <div class="table-body">
        <div 
          v-for="day in dailyStats" 
          :key="day.date" 
          class="table-row"
          :class="{ 
            'positive-day': day.balance > 0, 
            'negative-day': day.balance < 0,
            'today': day.isToday 
          }"
        >
          <div class="table-cell date-col">
            <div class="date-info">
              <div class="date-label">{{ formatDateLabel(day.date) }}</div>
              <div class="date-subtitle">{{ formatDateFull(day.date) }}</div>
            </div>
          </div>
          <div class="table-cell income-col">
            <span v-if="day.income > 0" class="amount income">
              +{{ formatCurrency(day.income) }}
            </span>
            <span v-else class="amount zero">-</span>
          </div>
          <div class="table-cell expense-col">
            <span v-if="day.expense > 0" class="amount expense">
              -{{ formatCurrency(day.expense) }}
            </span>
            <span v-else class="amount zero">-</span>
          </div>
          <div class="table-cell balance-col">
            <span class="amount" :class="{ 'positive': day.balance >= 0, 'negative': day.balance < 0 }">
              {{ formatCurrency(day.balance) }}
            </span>
          </div>
          <div class="table-cell count-col">
            <span class="transaction-count">{{ day.transactionCount }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  transactions: {
    type: Array,
    default: () => []
  },
  startDate: {
    type: String,
    default: ''
  },
  endDate: {
    type: String,
    default: ''
  }
})

// Computed properties để tính toán thống kê
const dailyStats = computed(() => {
  if (!props.transactions || props.transactions.length === 0) return []
  
  const dailyMap = {}
  
  // Tạo mảng ngày từ startDate đến endDate
  const start = new Date(props.startDate)
  const end = new Date(props.endDate)
  const today = new Date()
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0]
    dailyMap[dateKey] = {
      date: dateKey,
      income: 0,
      expense: 0,
      balance: 0,
      transactionCount: 0,
      isToday: d.toDateString() === today.toDateString()
    }
  }
  
  // Tính toán dữ liệu từ transactions
  props.transactions.forEach(transaction => {
    const transactionDate = new Date(transaction.date)
    const dateKey = transactionDate.toISOString().split('T')[0]
    
    if (dailyMap[dateKey]) {
      const amount = typeof transaction.amount === 'number' 
        ? transaction.amount 
        : parseFloat(String(transaction.amount).replace(/[^\d.-]/g, '')) || 0
      
      if (transaction.type === 'income') {
        dailyMap[dateKey].income += amount
      } else {
        dailyMap[dateKey].expense += amount
      }
      
      dailyMap[dateKey].transactionCount++
      dailyMap[dateKey].balance = dailyMap[dateKey].income - dailyMap[dateKey].expense
    }
  })
  
  return Object.values(dailyMap)
    .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sắp xếp mới nhất trước
})

const totalDays = computed(() => {
  if (!props.startDate || !props.endDate) return 0
  
  const start = new Date(props.startDate)
  const end = new Date(props.endDate)
  const diffTime = Math.abs(end - start)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + 1
})

const daysWithTransactions = computed(() => {
  return dailyStats.value.filter(day => day.transactionCount > 0).length
})

// Hàm định dạng tiền VND
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND',
    notation: 'compact',
    compactDisplay: 'short'
  }).format(amount)
}

// Hàm định dạng nhãn ngày
const formatDateLabel = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Hôm nay'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Hôm qua'
  } else {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }
}

// Hàm định dạng ngày đầy đủ
const formatDateFull = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
</script>

<style scoped>
.daily-stats {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid #dee2e6;
  overflow: hidden;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #dee2e6;
}

.stats-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.stats-summary {
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
  font-weight: 500;
}

.summary-item .value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  background: white;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.no-data {
  padding: 40px 20px;
  text-align: center;
  color: #666;
  font-style: italic;
}

.stats-table {
  overflow-x: auto;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 16px 24px;
  background: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  font-weight: 600;
  color: #495057;
  font-size: 14px;
  text-align: center;
}

.table-body {
  max-height: 400px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #e9ecef;
  transition: all 0.2s ease;
  align-items: center;
  text-align: center;
}

.table-row:hover {
  background: #f8f9fa;
}

.table-row.positive-day {
  background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%);
}

.table-row.negative-day {
  background: linear-gradient(135deg, #ffebee 0%, #fff5f5 100%);
}

.table-row.today {
  border-left: 4px solid #4CAF50;
  background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
}

.table-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  padding: 8px 4px;
}

.date-col {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  justify-content: center;
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.date-label {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.date-subtitle {
  font-size: 12px;
  color: #666;
}

.amount {
  font-weight: 600;
  font-size: 14px;
}

.amount.income {
  color: #2E7D32;
}

.amount.expense {
  color: #c62828;
}

.amount.positive {
  color: #2E7D32;
}

.amount.negative {
  color: #c62828;
}

.amount.zero {
  color: #999;
  font-weight: 400;
}

.transaction-count {
  background: #f8f9fa;
  color: #666;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #dee2e6;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .stats-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
    padding: 16px 20px;
  }
  
  .stats-header h3 {
    font-size: 16px;
  }
  
  .stats-summary {
    gap: 16px;
  }
  
  .summary-item .label {
    font-size: 13px;
  }
  
  .summary-item .value {
    font-size: 14px;
  }
  
  .table-header {
    grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
    gap: 8px;
    padding: 12px 16px;
    font-size: 12px;
  }
  
  .table-row {
    grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
    gap: 8px;
    padding: 12px 16px;
  }
  
  .table-cell {
    font-size: 12px;
    padding: 6px 2px;
  }
  
  .date-label {
    font-size: 13px;
  }
  
  .date-subtitle {
    font-size: 11px;
  }
  
  .amount {
    font-size: 12px;
  }
  
  .transaction-count {
    font-size: 11px;
    padding: 2px 6px;
  }
}

@media (max-width: 480px) {
  .stats-header {
    padding: 12px 16px;
  }
  
  .stats-header h3 {
    font-size: 15px;
  }
  
  .stats-summary {
    gap: 12px;
  }
  
  .summary-item .label {
    font-size: 12px;
  }
  
  .summary-item .value {
    font-size: 13px;
  }
  
  .table-header {
    grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr;
    gap: 4px;
    padding: 8px 12px;
    font-size: 10px;
  }
  
  .table-row {
    grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr;
    gap: 4px;
    padding: 8px 12px;
  }
  
  .table-cell {
    font-size: 11px;
    padding: 4px 1px;
  }
  
  .date-label {
    font-size: 12px;
  }
  
  .date-subtitle {
    font-size: 10px;
  }
  
  .amount {
    font-size: 11px;
  }
  
  .transaction-count {
    font-size: 10px;
    padding: 1px 4px;
  }
}
</style>
