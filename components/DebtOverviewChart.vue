<template>
  <div class="chart-container">
    <h2>Tổng quan khoản nợ</h2>
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <div>Đang tải dữ liệu khoản nợ...</div>
    </div>
    <div v-else-if="noData" class="empty-state">
      <div class="empty-icon">💰</div>
      <div class="empty-message">Không có khoản nợ nào</div>
      <div class="empty-hint">Thêm khoản nợ để xem thống kê tại đây</div>
    </div>
    <div v-else class="chart-content">
      <div class="chart-summary">
        <div class="summary-card i-lend">
          <div class="card-title">Tôi cho mượn</div>
          <div class="card-amount">{{ formatCurrency(totalLent) }}</div>
          <div class="card-count">{{ lentDebts.length }} khoản</div>
        </div>
        <div class="summary-card i-owe">
          <div class="card-title">Tôi đang nợ</div>
          <div class="card-amount">{{ formatCurrency(totalOwed) }}</div>
          <div class="card-count">{{ owedDebts.length }} khoản</div>
        </div>
        <div class="summary-card net">
          <div class="card-title">Chênh lệch</div>
          <div class="card-amount" :class="netBalance >= 0 ? 'positive' : 'negative'">
            {{ formatCurrency(netBalance) }}
          </div>
        </div>
      </div>
      
      <div class="status-overview">
        <h3>Phân loại tình trạng</h3>
        <div class="status-bars">
          <div v-for="(item, index) in statusData" :key="index" class="status-item">
            <div class="status-label">{{ item.label }}</div>
            <div class="status-bar-container">
              <div class="status-bar" :style="{ width: `${item.percentage}%`, backgroundColor: item.color }"></div>
            </div>
            <div class="status-value">{{ item.percentage.toFixed(0) }}%</div>
            <div class="status-amount">{{ formatCurrency(item.amount) }}</div>
          </div>
        </div>
      </div>
      
      <div class="debt-list">
        <h3>Các khoản nợ sắp đến hạn</h3>
        <div v-if="upcomingDebts.length === 0" class="empty-item">
          Không có khoản nợ nào sắp đến hạn
        </div>
        <div v-else class="debt-items">
          <div v-for="debt in upcomingDebts" :key="debt.id" class="debt-item">
            <div class="debt-info">
              <div class="debt-person">{{ debt.type === 'lent' ? 'Cho: ' : 'Nợ: ' }}{{ debt.personName }}</div>
              <div class="debt-description">{{ debt.description }}</div>
              <div class="debt-due">Hạn: {{ formatDate(debt.dueDate) }}</div>
            </div>
            <div class="debt-amount" :class="debt.type === 'lent' ? 'lent' : 'owed'">
              {{ formatCurrency(debt.amount) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  debts: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

// Hàm định dạng tiền VND
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Hàm định dạng ngày
const formatDate = (timestamp) => {
  if (!timestamp) return 'Không có hạn';
  
  const date = timestamp instanceof Object && 'toDate' in timestamp
    ? timestamp.toDate()
    : timestamp instanceof Object && 'seconds' in timestamp
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
  
  return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// Danh sách nợ được lọc
const lentDebts = computed(() => {
  console.log("Tất cả các khoản nợ:", props.debts);
  return props.debts.filter(debt => debt.type === 'lent');
});

const owedDebts = computed(() => {
  return props.debts.filter(debt => debt.type === 'owed');
});

// Tổng tiền cho mượn
const totalLent = computed(() => {
  const sum = lentDebts.value.reduce((total, debt) => {
    const amount = Number(debt.amount) || 0;
    return total + amount;
  }, 0);
  console.log("Tổng tiền cho mượn:", sum, "VND");
  return sum;
});

// Tổng tiền nợ
const totalOwed = computed(() => {
  const sum = owedDebts.value.reduce((total, debt) => {
    const amount = Number(debt.amount) || 0;
    return total + amount;
  }, 0);
  console.log("Tổng tiền nợ:", sum, "VND");
  return sum;
});

// Chênh lệch
const netBalance = computed(() => {
  return totalLent.value - totalOwed.value;
});

// Kiểm tra không có dữ liệu
const noData = computed(() => {
  return !props.debts || props.debts.length === 0;
});

// Dữ liệu trạng thái nợ
const statusData = computed(() => {
  const total = props.debts.reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0);
  
  if (total === 0) return [];
  
  // Nhóm theo trạng thái
  const statusCounts = {
    active: { amount: 0, label: 'Đang vay', color: '#2196F3' },
    overdue: { amount: 0, label: 'Quá hạn', color: '#f44336' },
    pending: { amount: 0, label: 'Chờ thanh toán', color: '#FF9800' },
    paid: { amount: 0, label: 'Đã thanh toán', color: '#4CAF50' }
  };
  
  // Tính tổng cho từng trạng thái
  const today = new Date();
  
  props.debts.forEach(debt => {
    const amount = Number(debt.amount) || 0;
    
    // Xác định trạng thái
    let status = debt.status || 'active';
    
    // Nếu status là 'active' và có dueDate và dueDate < ngày hiện tại -> 'overdue'
    if (status === 'active' && debt.dueDate) {
      const dueDate = debt.dueDate instanceof Object && 'toDate' in debt.dueDate
        ? debt.dueDate.toDate()
        : debt.dueDate instanceof Object && 'seconds' in debt.dueDate
          ? new Date(debt.dueDate.seconds * 1000)
          : new Date(debt.dueDate);
      
      if (dueDate < today) {
        status = 'overdue';
      }
    }
    
    if (status in statusCounts) {
      statusCounts[status].amount += amount;
    } else {
      statusCounts.active.amount += amount;
    }
  });
  
  // Chuyển đổi thành mảng và tính phần trăm
  return Object.values(statusCounts)
    .filter(item => item.amount > 0)
    .map(item => ({
      ...item,
      percentage: (item.amount / total) * 100
    }))
    .sort((a, b) => b.amount - a.amount);
});

// Các khoản nợ sắp đến hạn (trong 7 ngày tới)
const upcomingDebts = computed(() => {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  
  return props.debts
    .filter(debt => {
      // Chỉ lấy các khoản nợ đang kích hoạt
      if (debt.status !== 'active' && debt.status !== undefined) return false;
      
      // Nếu không có hạn trả, bỏ qua
      if (!debt.dueDate) return false;
      
      // Chuyển đổi dueDate thành đối tượng Date
      const dueDate = debt.dueDate instanceof Object && 'toDate' in debt.dueDate
        ? debt.dueDate.toDate()
        : debt.dueDate instanceof Object && 'seconds' in debt.dueDate
          ? new Date(debt.dueDate.seconds * 1000)
          : new Date(debt.dueDate);
      
      // Kiểm tra xem hạn trả có nằm trong khoảng thời gian 7 ngày tới không
      return dueDate >= today && dueDate <= nextWeek;
    })
    .sort((a, b) => {
      // Chuyển đổi dueDate
      const dateA = a.dueDate instanceof Object && 'toDate' in a.dueDate
        ? a.dueDate.toDate()
        : a.dueDate instanceof Object && 'seconds' in a.dueDate
          ? new Date(a.dueDate.seconds * 1000)
          : new Date(a.dueDate);
      
      const dateB = b.dueDate instanceof Object && 'toDate' in b.dueDate
        ? b.dueDate.toDate()
        : b.dueDate instanceof Object && 'seconds' in b.dueDate
          ? new Date(b.dueDate.seconds * 1000)
          : new Date(b.dueDate);
      
      // Sắp xếp theo ngày đến hạn sớm nhất
      return dateA - dateB;
    })
    .slice(0, 3); // Chỉ lấy 3 khoản sắp đến hạn nhất
});
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 100%;
  min-height: 380px;
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-top: 20px;
}

h2 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
  color: #333;
  font-weight: 600;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h3 {
  margin-top: 16px;
  margin-bottom: 14px;
  font-size: 16px;
  color: #333;
  font-weight: 600;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 16px;
  min-height: 340px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  min-height: 340px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-message {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: #9e9e9e;
}

.chart-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: space-between;
}

.summary-card {
  flex: 1;
  min-width: 150px;
  padding: 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.card-title {
  font-size: 14px;
  color: #757575;
  margin-bottom: 8px;
}

.card-amount {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 8px;
}

.card-count {
  font-size: 13px;
  color: #757575;
}

.i-lend .card-amount {
  color: #4CAF50;
}

.i-owe .card-amount {
  color: #f44336;
}

.positive {
  color: #4CAF50;
}

.negative {
  color: #f44336;
}

.status-overview {
  margin-top: 20px;
}

.status-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-label {
  width: 120px;
  font-size: 14px;
}

.status-bar-container {
  flex: 1;
  height: 14px;
  background-color: #f0f0f0;
  border-radius: 7px;
  overflow: hidden;
}

.status-bar {
  height: 100%;
  border-radius: 7px;
  transition: width 0.5s ease;
}

.status-value {
  width: 50px;
  text-align: right;
  font-size: 14px;
}

.status-amount {
  width: 120px;
  text-align: right;
  font-size: 14px;
  font-weight: 500;
}

.debt-list {
  margin-top: 20px;
}

.empty-item {
  text-align: center;
  padding: 20px;
  color: #757575;
  font-style: italic;
}

.debt-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.debt-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  background-color: #f9f9f9;
}

.debt-info {
  flex: 1;
}

.debt-person {
  font-weight: 500;
  margin-bottom: 4px;
}

.debt-description {
  font-size: 13px;
  color: #757575;
  margin-bottom: 4px;
}

.debt-due {
  font-size: 12px;
  font-style: italic;
  color: #9e9e9e;
}

.debt-amount {
  font-weight: bold;
  min-width: 120px;
  text-align: right;
}

.lent {
  color: #4CAF50;
}

.owed {
  color: #f44336;
}

@media (max-width: 768px) {
  .chart-summary {
    flex-direction: column;
  }
  
  .status-item {
    flex-wrap: wrap;
  }
  
  .status-label {
    width: 50%;
  }
  
  .status-value {
    width: auto;
    margin-left: auto;
  }
  
  .status-amount {
    width: 100%;
    text-align: left;
    margin-top: 5px;
    margin-left: 130px;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 