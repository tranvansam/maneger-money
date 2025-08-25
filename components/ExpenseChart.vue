<template>
  <div class="expense-statistics">
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Đang tải dữ liệu chi tiêu...</p>
    </div>
    
    <div v-else-if="noData || (!transactions || transactions.length === 0)" class="no-data">
      <p>Không có dữ liệu chi tiêu</p>
      <p class="sub-text">Hãy thêm các chi tiêu để xem thống kê</p>
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
  }
});

const expensesByCategory = ref({});
const pieChart = ref(null);
const barChart = ref(null);
const lineChart = ref(null);

// Tính toán dữ liệu biểu đồ từ chi tiêu
const calculateChartData = () => {
  if (!props.transactions || props.transactions.length === 0) {
    console.log('Không có chi tiêu nào để tính toán dữ liệu biểu đồ');
    return;
  }

  // Lọc chỉ các chi tiêu chi tiêu
  const expenses = props.transactions.filter(transaction => transaction.type === 'expense');
  console.log(`Đang xử lý ${expenses.length} chi tiêu chi tiêu cho biểu đồ`);

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
      labels: categories.map(getCategoryName),
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
              size: 12,
              family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            },
            boxWidth: 12,
            padding: 10
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
            size: 12,
            family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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

// Hàm chuyển đổi mã danh mục sang tên hiển thị tiếng Việt
const getCategoryName = (categoryCode) => {
  const categoryNames = {
    'food': 'Ăn uống',
    'rent': 'Tiền nhà',
    'utilities': 'Hóa đơn dịch vụ',
    'transportation': 'Di chuyển',
    'entertainment': 'Giải trí',
    'shopping': 'Mua sắm',
    'healthcare': 'Y tế',
    'education': 'Giáo dục',
    'debt_payment': 'Trả nợ',
    'salary': 'Lương',
    'bonus': 'Thưởng',
    'investment': 'Đầu tư',
    'gifts': 'Quà tặng',
    'performance': 'Đi diễn',
    'other_income': 'Thu nhập khác',
    'other_expense': 'Chi tiêu khác'
  };
  
  return categoryNames[categoryCode] || categoryCode;
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

  // Sắp xếp danh mục theo số tiền từ cao đến thấp
  const sortedCategories = [...categories].sort((a, b) => expensesByCategory.value[b] - expensesByCategory.value[a]);
  const sortedAmounts = sortedCategories.map(category => expensesByCategory.value[category]);
  const sortedLabels = sortedCategories.map(category => getCategoryName(category));

  barChart.value = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sortedLabels,
      datasets: [{
        label: 'Chi tiêu',
        data: sortedAmounts,
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: {
          ticks: {
            callback: function(value) {
              return new Intl.NumberFormat('vi-VN', { 
                style: 'currency', 
                currency: 'VND',
                notation: 'compact',
                compactDisplay: 'short'
              }).format(value);
            },
            font: {
              family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          ticks: {
            font: {
              family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }
          },
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        datalabels: {
          anchor: 'end',
          align: 'end',
          formatter: function(value) {
            return new Intl.NumberFormat('vi-VN', { 
              style: 'currency', 
              currency: 'VND',
              notation: 'compact', 
              compactDisplay: 'short'
            }).format(value);
          },
          font: {
            weight: 'bold',
            family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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
              return `Chi tiêu: ${formattedValue}`;
            }
          }
        }
      }
    }
  });
};

// Render biểu đồ xu hướng chi tiêu
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

  // Lọc các chi tiêu chi tiêu trong 30 ngày qua
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const expenses = props.transactions.filter(transaction => {
    return transaction.type === 'expense' && 
           transaction.date && 
           new Date(transaction.date) >= thirtyDaysAgo;
  });

  if (expenses.length === 0) {
    console.log('Không có dữ liệu chi tiêu trong 30 ngày qua');
    return;
  }

  // Chuẩn bị dữ liệu cho biểu đồ
  const days = [];
  const dailyExpenses = [];

  // Tạo mảng 30 ngày từ ngày cũ nhất đến hiện tại
  for (let i = 29; i >= 0; i--) {
    const day = new Date();
    day.setDate(now.getDate() - i);
    days.push(day);
    dailyExpenses.push(0);
  }

  // Tính chi tiêu cho mỗi ngày
  expenses.forEach(expense => {
    const expenseDate = new Date(expense.date);
    for (let i = 0; i < days.length; i++) {
      if (expenseDate.getDate() === days[i].getDate() && 
          expenseDate.getMonth() === days[i].getMonth() && 
          expenseDate.getFullYear() === days[i].getFullYear()) {
        dailyExpenses[i] += typeof expense.amount === 'number' ? expense.amount : Number(expense.amount) || 0;
        break;
      }
    }
  });

  // Format days
  const formattedDays = days.map(day => {
    const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(day);
    return date;
  });

  lineChart.value = new Chart(ctx, {
    type: 'line',
    data: {
      labels: formattedDays,
      datasets: [{
        label: 'Chi tiêu hàng ngày',
        data: dailyExpenses,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderWidth: 2,
        fill: true,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            font: {
              family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }
          }
        },
        datalabels: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const formattedValue = new Intl.NumberFormat('vi-VN', { 
                style: 'currency', 
                currency: 'VND' 
              }).format(value);
              return `Chi tiêu: ${formattedValue}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: {
              family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return new Intl.NumberFormat('vi-VN', { 
                style: 'currency', 
                currency: 'VND',
                notation: 'compact',
                compactDisplay: 'short'
              }).format(value);
            },
            font: {
              family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }
          }
        }
      }
    }
  });
};

// Xem xét khi transactions thay đổi
watch(() => props.transactions, (newValue) => {
  console.log(`Transactions được cập nhật: ${newValue.length} chi tiêu`);
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
  height: 100%;
  position: relative;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 250px;
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

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 250px;
  padding: 20px;
  text-align: center;
  color: #757575;
}

.no-data p {
  margin: 5px 0;
}

.no-data .sub-text {
  font-size: 14px;
  color: #9e9e9e;
  font-style: italic;
}

.charts-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 380px;
}

.chart-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.chart-column {
  flex: 1;
  min-width: 250px;
  min-height: 380px;
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.full-width {
  width: 100%;
}

.chart-column h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 16px;
  color: #333;
  font-weight: 600;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.chart-wrapper {
  position: relative;
  height: 300px;
}

@media (max-width: 768px) {
  .chart-row {
    flex-direction: column;
  }
  
  .chart-column {
    width: 100%;
    min-width: auto;
  }
  
  .chart-wrapper {
    height: 280px;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 