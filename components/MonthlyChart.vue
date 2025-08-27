<template>
  <div class="chart-wrapper">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
  monthlyData: {
    type: Array,
    required: true
  }
})

const chartCanvas = ref(null)
let chart = null

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const formatMonthShort = (monthKey) => {
  const [year, month] = monthKey.split('-')
  return `${month}/${year.slice(-2)}`
}

const createChartData = () => {
  // Sort monthly data by monthKey in ascending order
  const sortedData = [...props.monthlyData].sort((a, b) => a.monthKey.localeCompare(b.monthKey))
  
  const labels = sortedData.map(month => formatMonthShort(month.monthKey))
  
  return {
    labels,
    datasets: [
      {
        label: 'Thu nhập',
        data: sortedData.map(month => month.income),
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#4CAF50',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      },
      {
        label: 'Chi tiêu',
        data: sortedData.map(month => month.expense),
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#f44336',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      },
      {
        label: 'Trung bình/ngày',
        data: sortedData.map(month => month.avgPerDay),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        borderDash: [5, 5],
        pointBackgroundColor: '#2196F3',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      }
    ]
  }
}

const createChartOptions = () => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 12,
        bottom: 50
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'center',
        labels: {
          usePointStyle: true,
          padding: 12,
          font: {
            size: 11,
            weight: '500'
          },
          color: '#666',
          boxWidth: 12,
          boxHeight: 12
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#ddd',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ${formatCurrency(value)}`
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Tháng',
          font: {
            size: 14,
            weight: '600'
          },
          color: '#333'
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 12,
            weight: '500'
          },
          color: '#666'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Số tiền (VND)',
          font: {
            size: 14,
            weight: '600'
          },
          color: '#333'
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 12,
            weight: '500'
          },
          color: '#666',
          callback: function(value) {
            return formatCurrency(value)
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    elements: {
      point: {
        hoverRadius: 8
      }
    }
  }
}

const initChart = () => {
  if (chart) {
    chart.destroy()
  }

  const ctx = chartCanvas.value.getContext('2d')
  chart = new Chart(ctx, {
    type: 'line',
    data: createChartData(),
    options: createChartOptions()
  })
}

const updateChart = () => {
  if (chart) {
    chart.data = createChartData()
    chart.update('active')
  }
}

watch(() => props.monthlyData, () => {
  updateChart()
}, { deep: true })

onMounted(() => {
  if (props.monthlyData && props.monthlyData.length > 0) {
    initChart()
  }
})

onUnmounted(() => {
  if (chart) {
    chart.destroy()
  }
})
</script>

<style scoped>
.chart-wrapper {
  position: relative;
  height: 400px;
  width: 100%;
  max-width: 100%;
  background: white;
  border-radius: 8px;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.chart-wrapper canvas {
  max-width: 100% !important;
  height: auto !important;
}

@media (max-width: 768px) {
  .chart-wrapper {
    height: 300px;
    padding: 0;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }
}

@media (max-width: 480px) {
  .chart-wrapper {
    height: 250px;
    padding: 0;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }
}
</style>
