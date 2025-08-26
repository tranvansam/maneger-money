<template>
  <div class="transaction-calendar">
    <div class="calendar-header">
      <h3>Lịch chi tiêu</h3>
      <div class="calendar-controls">
        <button @click="previousMonth" class="nav-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,18 9,12 15,6"></polyline>
          </svg>
        </button>
        <span class="current-month">{{ currentMonthYear }}</span>
        <button @click="nextMonth" class="nav-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,18 15,12 9,6"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <div class="calendar-grid">
      <!-- Header days -->
      <div class="calendar-header-row">
        <div class="calendar-cell header-cell">T2</div>
        <div class="calendar-cell header-cell">T3</div>
        <div class="calendar-cell header-cell">T4</div>
        <div class="calendar-cell header-cell">T5</div>
        <div class="calendar-cell header-cell">T6</div>
        <div class="calendar-cell header-cell weekend">T7</div>
        <div class="calendar-cell header-cell weekend">CN</div>
      </div>

      <!-- Calendar days -->
      <div class="calendar-body">
        <div 
          v-for="week in calendarWeeks" 
          :key="week[0]?.date || 'empty-week'" 
          class="calendar-week"
        >
          <div 
            v-for="day in week" 
            :key="day?.date || 'empty-day'"
            class="calendar-cell day-cell"
            :class="{
              'other-month': day?.otherMonth,
              'today': day?.isToday,
              'has-transactions': day?.hasTransactions,
              'positive-balance': day?.balance > 0,
              'negative-balance': day?.balance < 0
            }"
            @click="selectDate(day)"
          >
            <div class="day-number">{{ day?.dayNumber || '' }}</div>
            <div v-if="day?.hasTransactions" class="day-amount" :class="{
              'positive': day.balance > 0,
              'negative': day.balance < 0,
              'neutral': day.balance === 0
            }">
              {{ formatCompactAmount(day.balance) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="calendar-legend">
      <div class="legend-item">
        <div class="legend-color positive"></div>
        <span>Số dư dương</span>
      </div>
      <div class="legend-item">
        <div class="legend-color negative"></div>
        <span>Số dư âm</span>
      </div>
      <div class="legend-item">
        <div class="legend-color today"></div>
        <span>Hôm nay</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps({
  transactions: {
    type: Array,
    default: () => []
  },
  selectedDate: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['date-selected']);

const currentDate = ref(new Date());
const currentMonth = ref(currentDate.value.getMonth());
const currentYear = ref(currentDate.value.getFullYear());

// Computed properties
const currentMonthYear = computed(() => {
  return new Date(currentYear.value, currentMonth.value).toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric'
  });
});

const calendarWeeks = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;
  
  // Get first day of month
  const firstDay = new Date(year, month, 1);
  // Get last day of month
  const lastDay = new Date(year, month + 1, 0);
  
  // Get start of first week (Monday)
  const startOfWeek = new Date(firstDay);
  const dayOfWeek = firstDay.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday=0 to Monday=0
  startOfWeek.setDate(firstDay.getDate() - daysToSubtract);
  
  // Get end of last week (Sunday)
  const endOfWeek = new Date(lastDay);
  const lastDayOfWeek = lastDay.getDay();
  const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  endOfWeek.setDate(lastDay.getDate() + daysToAdd);
  
  const weeks = [];
  const currentDay = new Date(startOfWeek);
  
  while (currentDay <= endOfWeek) {
    const week = [];
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(currentDay);
      const dateKey = formatDateForInput(dayDate);
      
      // Get transactions for this day
      const dayTransactions = props.transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return formatDateForInput(transactionDate) === dateKey;
      });
      
      // Calculate day balance
      const dayBalance = dayTransactions.reduce((balance, transaction) => {
        const amount = typeof transaction.amount === 'number' 
          ? transaction.amount 
          : parseFloat(String(transaction.amount).replace(/[^\d.-]/g, '')) || 0;
        
        if (transaction.type === 'income') {
          return balance + amount;
        } else {
          return balance - amount;
        }
      }, 0);
      
      const day = {
        date: dateKey,
        dayNumber: currentDay.getDate(),
        otherMonth: currentDay.getMonth() !== month,
        isToday: dateKey === formatDateForInput(new Date()),
        hasTransactions: dayTransactions.length > 0,
        balance: dayBalance,
        transactions: dayTransactions
      };
      
      week.push(day);
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    weeks.push(week);
  }
  
  return weeks;
});

// Methods
const formatDateForInput = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
};

const formatCompactAmount = (amount) => {
  if (amount === 0) return '0';
  
  const absAmount = Math.abs(amount);
  if (absAmount >= 1000000) {
    return `${amount > 0 ? '+' : '-'}${(absAmount / 1000000).toFixed(1)}M`;
  } else if (absAmount >= 1000) {
    return `${amount > 0 ? '+' : '-'}${(absAmount / 1000).toFixed(0)}K`;
  } else {
    return `${amount > 0 ? '+' : '-'}${absAmount}`;
  }
};

const previousMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
};

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
};

const selectDate = (day) => {
  if (day && !day.otherMonth) {
    emit('date-selected', day);
  }
};

// Watch for transactions changes
watch(() => props.transactions, () => {
  // Calendar will automatically update due to computed property
}, { deep: true });

// Initialize
onMounted(() => {
  // Set current month and year
  const now = new Date();
  currentMonth.value = now.getMonth();
  currentYear.value = now.getFullYear();
});
</script>

<style scoped>
.transaction-calendar {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid #dee2e6;
  margin-bottom: 20px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.calendar-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.calendar-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-button {
  background: none;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-button:hover {
  background-color: #f0f0f0;
  color: #333;
}

.current-month {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  min-width: 120px;
  text-align: center;
}

.calendar-grid {
  width: 100%;
}

.calendar-header-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 8px;
}

.calendar-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.calendar-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.calendar-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s ease;
  position: relative;
  min-height: 60px;
}

.header-cell {
  background-color: #f8f9fa;
  color: #666;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-height: auto;
  aspect-ratio: auto;
  padding: 8px 4px;
}

.header-cell.weekend {
  color: #f44336;
}

.day-cell {
  background-color: #fafafa;
  cursor: pointer;
  border: 1px solid transparent;
}

.day-cell:hover {
  background-color: #f0f0f0;
  border-color: #ddd;
}

.day-cell.other-month {
  background-color: #f5f5f5;
  color: #ccc;
  cursor: default;
}

.day-cell.other-month:hover {
  background-color: #f5f5f5;
  border-color: transparent;
}

.day-cell.today {
  background-color: #e3f2fd;
  border-color: #2196F3;
  font-weight: 600;
}

.day-cell.has-transactions {
  background-color: #fff3e0;
  border-color: #ff9800;
}

.day-cell.positive-balance {
  background-color: #e8f5e9;
  border-color: #4CAF50;
}

.day-cell.negative-balance {
  background-color: #ffebee;
  border-color: #f44336;
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.day-amount {
  font-size: 10px;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-amount.positive {
  color: #2E7D32;
}

.day-amount.negative {
  color: #c62828;
}

.day-amount.neutral {
  color: #666;
}

.calendar-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid #ddd;
}

.legend-color.positive {
  background-color: #e8f5e9;
  border-color: #4CAF50;
}

.legend-color.negative {
  background-color: #ffebee;
  border-color: #f44336;
}

.legend-color.today {
  background-color: #e3f2fd;
  border-color: #2196F3;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .transaction-calendar {
    padding: 16px;
  }
  
  .calendar-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .calendar-controls {
    width: 100%;
    justify-content: space-between;
  }
  
  .current-month {
    min-width: auto;
  }
  
  .calendar-cell {
    min-height: 50px;
    padding: 2px;
  }
  
  .day-number {
    font-size: 12px;
  }
  
  .day-amount {
    font-size: 9px;
  }
  
  .calendar-legend {
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .transaction-calendar {
    padding: 12px;
  }
  
  .calendar-cell {
    min-height: 40px;
  }
  
  .day-number {
    font-size: 11px;
  }
  
  .day-amount {
    font-size: 8px;
  }
  
  .header-cell {
    font-size: 10px;
    padding: 6px 2px;
  }
}
</style>
