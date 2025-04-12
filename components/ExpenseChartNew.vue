<template>
  <div class="expense-statistics">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Đang tải dữ liệu chi tiêu...</p>
    </div>
    
    <div v-else-if="noData || (!transactions || transactions.length === 0)" class="no-data">
      <p>Không có dữ liệu chi tiêu</p>
      <p class="sub-text">Hãy thêm các giao dịch để xem thống kê</p>
    </div>
    
    <div v-else class="charts-container">
      <div class="chart-row">
        <div class="chart-column">
          <h3>Chi tiêu theo danh mục</h3>
          <div class="chart-wrapper">
            <canvas id="expense-pie-chart"></canvas>
          </div>
        </div>
        
        <div class="chart-column">
          <h3>So sánh chi tiêu</h3>
          <div class="chart-wrapper">
            <canvas id="expense-bar-chart"></canvas>
          </div>
        </div>
      </div>
      
      <div class="chart-row">
        <div class="chart-column full-width">
          <h3>Xu hướng chi tiêu (30 ngày qua)</h3>
          <div class="chart-wrapper">
            <canvas id="expense-trend-chart"></canvas>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch, ref } from 'vue';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables, ChartDataLabels);

const props = defineProps({
  transactions: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  noData: {
    type: Boolean,
    default: false
  },
  trendData: {
    type: Array,
    default: () => []
  }
});

const expensesByCategory = ref({});
const pieChart = ref(null);
const barChart = ref(null);
const lineChart = ref(null);

// Tính toán dữ liệu biểu đồ từ giao dịch
const calculateChartData = () => {
  if (!props.transactions || props.transactions.length === 0) {
    console.log('Không có giao dịch nào để tính toán dữ liệu biểu đồ');
    return;
  }

  // Lọc chỉ các giao dịch chi tiêu
  const expenses = props.transactions.filter(transaction => transaction.type === 'expense');
  console.log(`Đang xử lý ${expenses.length} giao dịch chi tiêu cho biểu đồ`);

  // Tính tổng chi tiêu theo danh mục
  const categories = {};
  expenses.forEach(expense => {
    const category = expense.category || 'Khác';
    if (!categories[category]) {
      categories[category] = 0;
    }
    categories[category] += typeof expense.amount === 'number' ? expense.amount : Number(expense.amount) || 0;
  });

  expensesByCategory.value = categories;
  console.log('Chi tiêu theo danh mục:', categories);

  // Cập nhật biểu đồ
  renderPieChart();
  renderBarChart();
  renderTrendChart();
};

// Render biểu đồ tròn cho chi tiêu theo danh mục
const renderPieChart = () => {
  const ctx = document.getElementById('expense-pie-chart');
  if (!ctx) {
    console.error('Không tìm thấy canvas cho biểu đồ tròn');
    return;
  }

  // Hủy biểu đồ cũ nếu tồn tại
  if (pieChart.value) {
    pieChart.value.destroy();
  }

  const categories = Object.keys(expensesByCategory.value);
  const amounts = Object.values(expensesByCategory.value);

  if (categories.length === 0) {
    console.log('Không có dữ liệu danh mục để hiển thị biểu đồ tròn');
    return;
  }

  // Màu cho các danh mục
  const backgroundColors = [
    'rgba(255, 99, 132, 0.7)',
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 206, 86, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)',
    'rgba(199, 199, 199, 0.7)',
    'rgba(83, 102, 255, 0.7)',
    'rgba(40, 159, 64, 0.7)',
    'rgba(210, 199, 199, 0.7)',
  ];

  pieChart.value = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: categories,
      datasets: [{
        data: amounts,
        backgroundColor: backgroundColors.slice(0, categories.length),
        borderWidth: 1
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
            }
          }
        },
        datalabels: {
          formatter: (value, context) => {
            const sum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / sum) * 100) + '%';
            return percentage;
          },
          color: '#fff',
          font: {
            weight: 'bold',
            size: 12
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const formattedValue = new Intl.NumberFormat('vi-VN', { 
                style: 'currency', 
                currency: 'VND' 
              }).format(value);
              const label = context.label || '';
              return `${label}: ${formattedValue}`;
            }
          }
        }
      }
    }
  });
};

// Render biểu đồ cột cho chi tiêu theo danh mục
const renderBarChart = () => {
  const ctx = document.getElementById('expense-bar-chart');
  if (!ctx) {
    console.error('Không tìm thấy canvas cho biểu đồ cột');
    return;
  }

  // Hủy biểu đồ cũ nếu tồn tại
  if (barChart.value) {
    barChart.value.destroy();
  }

  const categories = Object.keys(expensesByCategory.value);
  const amounts = Object.values(expensesByCategory.value);

  if (categories.length === 0) {
    console.log('Không có dữ liệu danh mục để hiển thị biểu đồ cột');
    return;
  }

  barChart.value = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [{
        label: 'Chi tiêu theo danh mục',
        data: amounts,
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return new Intl.NumberFormat('vi-VN', { 
                style: 'currency', 
                currency: 'VND',
                maximumFractionDigits: 0 
              }).format(value);
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              return new Intl.NumberFormat('vi-VN', { 
                style: 'currency', 
                currency: 'VND' 
              }).format(value);
            }
          }
        }
      }
    }
  });
};

// Render biểu đồ đường xu hướng chi tiêu
const renderTrendChart = () => {
  const ctx = document.getElementById('expense-trend-chart');
  if (!ctx) {
    console.error('Không tìm thấy canvas cho biểu đồ xu hướng');
    return;
  }

  // Hủy biểu đồ cũ nếu tồn tại
  if (lineChart.value) {
    lineChart.value.destroy();
  }

  // Sử dụng props.trendData nếu được truyền vào
  if (!props.trendData || props.trendData.length === 0) {
    console.log('Không có dữ liệu xu hướng để hiển thị');
    return;
  }

  // Chuẩn bị dữ liệu cho biểu đồ đường
  const dates = props.trendData.map(item => {
    const date = new Date(item.date);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });
  
  const amounts = props.trendData.map(item => item.amount);

  lineChart.value = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Chi tiêu hàng ngày',
        data: amounts,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return new Intl.NumberFormat('vi-VN', { 
                style: 'currency', 
                currency: 'VND',
                maximumFractionDigits: 0 
              }).format(value);
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              return new Intl.NumberFormat('vi-VN', { 
                style: 'currency', 
                currency: 'VND' 
              }).format(value);
            }
          }
        }
      }
    }
  });
};

// Xem xét khi transactions thay đổi
watch(() => props.transactions, (newValue) => {
  console.log(`Transactions được cập nhật: ${newValue?.length || 0} giao dịch`);
  calculateChartData();
}, { deep: true });

// Xem xét khi trendData thay đổi
watch(() => props.trendData, (newValue) => {
  if (newValue && newValue.length > 0) {
    console.log('Dữ liệu xu hướng được cập nhật, đang cập nhật biểu đồ...');
    renderTrendChart();
  }
}, { deep: true });

// Khi component được tạo
onMounted(() => {
  calculateChartData();
});
</script>

<style scoped>
.expense-statistics {
  width: 100%;
  min-height: 400px;
  position: relative;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  width: 100%;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #3498db;
  width: 40px;
  height: 40px;
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
  height: 400px;
  background-color: #f9f9f9;
  border-radius: 8px;
  border: 1px dashed #ddd;
}

.no-data p {
  margin: 0;
  font-size: 18px;
  color: #666;
}

.no-data .sub-text {
  font-size: 14px;
  color: #999;
  margin-top: 8px;
}

.charts-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

.chart-row {
  display: flex;
  gap: 24px;
  width: 100%;
}

.chart-column {
  flex: 1;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 16px;
}

.chart-column.full-width {
  width: 100%;
}

.chart-wrapper {
  height: 300px;
  position: relative;
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 16px;
  color: #333;
  text-align: center;
}

@media (max-width: 768px) {
  .chart-row {
    flex-direction: column;
  }
  
  .chart-column {
    width: 100%;
  }
}
</style> 