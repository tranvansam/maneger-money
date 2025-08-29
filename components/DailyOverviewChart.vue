<template>
  <div class="daily-overview-chart">
    
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Đang tải dữ liệu...</p>
    </div>
    
    <div v-else-if="!transactions || transactions.length === 0" class="no-data">
      <div class="no-data-icon">📊</div>
      <p>Không có dữ liệu chi tiêu</p>
      <p class="sub-text">Hãy thêm các chi tiêu để xem thống kê</p>
    </div>
    
    <div v-else class="charts-container">
      <!-- Biểu đồ line cho thu chi theo ngày -->
      <div class="chart-section">
        <div class="chart-header">
          <h3>Xu hướng thu chi theo ngày</h3>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color income"></div>
              <span>Thu nhập</span>
            </div>
            <div class="legend-item">
              <div class="legend-color expense"></div>
              <span>Chi tiêu</span>
            </div>
          </div>
        </div>
        <div class="chart-wrapper">
          <canvas ref="lineChartCanvas"></canvas>
        </div>
      </div>
      
      <!-- Biểu đồ tròn cho phần trăm chi tiêu theo danh mục -->
      <div class="chart-section">
        <div class="chart-header">
          <h3>Phân bổ chi tiêu theo danh mục</h3>
        </div>
        <div class="chart-wrapper">
          <canvas ref="pieChartCanvas"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

Chart.register(...registerables, ChartDataLabels)

const props = defineProps({
  transactions: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
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

const lineChartCanvas = ref(null)
const pieChartCanvas = ref(null)
let lineChart = null
let pieChart = null

// Computed properties để tính toán dữ liệu
const dailyData = computed(() => {
  if (!props.transactions || props.transactions.length === 0) {
    return []
  }
  
  const dailyMap = {}
  
  // Tạo mảng ngày từ startDate đến endDate
  const start = new Date(props.startDate)
  const end = new Date(props.endDate)
  
  // Kiểm tra xem startDate và endDate có hợp lệ không
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return []
  }
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0]
    dailyMap[dateKey] = {
      date: dateKey,
      income: 0,
      expense: 0,
      balance: 0
    }
  }
  
  // Tính toán dữ liệu từ transactions
  props.transactions.forEach(transaction => {
    // Đảm bảo transaction.date là Date object
    let transactionDate;
    if (transaction.date instanceof Date) {
      transactionDate = transaction.date;
    } else if (transaction.date && typeof transaction.date === 'object' && transaction.date.seconds) {
      // Firestore Timestamp
      transactionDate = new Date(transaction.date.seconds * 1000);
    } else {
      transactionDate = new Date(transaction.date);
    }
    
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
      
      dailyMap[dateKey].balance = dailyMap[dateKey].income - dailyMap[dateKey].expense
    }
  })
  
  const result = Object.values(dailyMap).sort((a, b) => new Date(a.date) - new Date(b.date))
  return result
})

const expenseByCategory = computed(() => {
  if (!props.transactions || props.transactions.length === 0) return {}
  
  const categoryMap = {}
  const expenses = props.transactions.filter(t => t.type === 'expense')
  
  expenses.forEach(expense => {
    const category = expense.category || 'other_expense'
    const amount = typeof expense.amount === 'number' 
      ? expense.amount 
      : parseFloat(String(expense.amount).replace(/[^\d.-]/g, '')) || 0
    
    if (!categoryMap[category]) {
      categoryMap[category] = 0
    }
    categoryMap[category] += amount
  })
  
  return categoryMap
})

// Hàm lấy tên danh mục tiếng Việt
const getCategoryName = (categoryId) => {
  const categoryNames = {
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
    salary: 'Lương',
    bonus: 'Thưởng',
    investment: 'Đầu tư',
    gifts: 'Quà tặng',
    performance: 'Đi diễn',
    other_income: 'Thu nhập khác'
  }
  
  return categoryNames[categoryId] || categoryId
}

// Hàm định dạng tiền VND
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND',
    notation: 'compact',
    compactDisplay: 'short'
  }).format(amount)
}

// Hàm định dạng ngày
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit'
  })
}

// Tạo biểu đồ line
const createLineChart = () => {
  if (lineChart) {
    lineChart.destroy()
  }
  
  const ctx = lineChartCanvas.value?.getContext('2d')
  if (!ctx) {
    return
  }
  
  const data = dailyData.value
  
  // Nếu không có dữ liệu, tạo biểu đồ với dữ liệu mẫu cho tháng hiện tại
  let chartData = data;
  if (data.length === 0) {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    chartData = [];
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      chartData.push({
        date: d.toISOString().split('T')[0],
        income: 0,
        expense: 0,
        balance: 0
      });
    }
  }
  
  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.map(item => formatDate(item.date)),
      datasets: [
        {
          label: 'Thu nhập',
          data: chartData.map(item => item.income),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#4CAF50',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Chi tiêu',
          data: chartData.map(item => item.expense),
          borderColor: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#f44336',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              const value = context.raw
              return `${context.dataset.label}: ${formatCurrency(value)}`
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 11
            }
          }
        },
        y: {
          display: true,
          beginAtZero: true,
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            callback: function(value) {
              return formatCurrency(value)
            },
            font: {
              size: 11
            }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  })
}

// Tạo biểu đồ tròn
const createPieChart = () => {
  if (pieChart) {
    pieChart.destroy()
  }
  
  const ctx = pieChartCanvas.value?.getContext('2d')
  if (!ctx) return
  
  const categories = Object.keys(expenseByCategory.value)
  const amounts = Object.values(expenseByCategory.value)
  
  // Nếu không có dữ liệu, tạo biểu đồ với dữ liệu mẫu
  const chartCategories = categories.length > 0 ? categories : ['other_expense', 'food', 'transportation']
  const chartAmounts = amounts.length > 0 ? amounts : [0, 0, 0]
  
  // Màu cho các danh mục
  const backgroundColors = [
    'rgba(255, 99, 132, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
    'rgba(199, 199, 199, 0.8)',
    'rgba(83, 102, 255, 0.8)',
    'rgba(40, 159, 64, 0.8)',
    'rgba(210, 199, 199, 0.8)'
  ]
  
  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartCategories.map(getCategoryName),
      datasets: [{
        data: chartAmounts,
        backgroundColor: backgroundColors.slice(0, chartCategories.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: {
              size: 12
            },
            boxWidth: 12,
            padding: 15,
            usePointStyle: true
          }
        },
        datalabels: {
          formatter: (value, context) => {
            const sum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0)
            const percentage = Math.round((value / sum) * 100)
            return percentage > 5 ? `${percentage}%` : ''
          },
          color: '#fff',
          font: {
            weight: 'bold',
            size: 11
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw
              const sum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0)
              const percentage = Math.round((value / sum) * 100)
              return `${context.label}: ${formatCurrency(value)} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

// Cập nhật biểu đồ khi dữ liệu thay đổi
const updateCharts = async () => {
  await nextTick()
  
  // Thêm delay nhỏ để đảm bảo DOM đã sẵn sàng
  setTimeout(() => {
    // Luôn tạo biểu đồ line, ngay cả khi không có dữ liệu
    createLineChart()
    
    // Luôn tạo biểu đồ pie, ngay cả khi không có dữ liệu
    createPieChart()
  }, 100)
}

// Watch cho transactions
watch(() => props.transactions, () => {
  updateCharts()
}, { deep: true })

// Watch cho startDate và endDate
watch([() => props.startDate, () => props.endDate], () => {
  updateCharts()
})

onMounted(() => {
  updateCharts()
})

onUnmounted(() => {
  if (lineChart) {
    lineChart.destroy()
  }
  if (pieChart) {
    pieChart.destroy()
  }
})
</script>

<style scoped>
.daily-overview-chart {
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid #dee2e6;
  overflow: hidden;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.no-data-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-data p {
  margin: 0;
  font-size: 16px;
}

.no-data .sub-text {
  font-size: 14px;
  color: #999;
  margin-top: 8px;
}

.charts-container {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.chart-section {
  padding: 24px;
  border-bottom: 1px solid #dee2e6;
}

.chart-section:last-child {
  border-bottom: none;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.chart-legend {
  display: flex;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-color.income {
  background-color: #4CAF50;
}

.legend-color.expense {
  background-color: #f44336;
}

.chart-wrapper {
  height: 300px;
  position: relative;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .chart-section {
    padding: 16px;
  }
  
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .chart-header h3 {
    font-size: 16px;
  }
  
  .chart-legend {
    gap: 16px;
  }
  
  .legend-item {
    font-size: 13px;
  }
  
  .chart-wrapper {
    height: 250px;
  }
}

@media (max-width: 480px) {
  .chart-section {
    padding: 12px;
  }
  
  .chart-header h3 {
    font-size: 15px;
  }
  
  .chart-wrapper {
    height: 200px;
  }
  
  .legend-item {
    font-size: 12px;
  }
  
  .legend-color {
    width: 10px;
    height: 10px;
  }
}
</style>
