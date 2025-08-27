<template>
  <div class="transaction-calendar">
    <div class="calendar-controls">
      <button @click="previousMonth" class="nav-button" :disabled="!canNavigatePrevious">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15,18 9,12 15,6"></polyline>
        </svg>
      </button>
      <span class="current-month">{{ currentMonthYear }}</span>
      <button @click="nextMonth" class="nav-button" :disabled="!canNavigateNext">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9,18 15,12 9,6"></polyline>
        </svg>
      </button>
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
              'has-transactions': day?.hasTransactions,
              'positive-balance': day?.balance > 0,
              'negative-balance': day?.balance < 0,
              'disabled': day?.disabled
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
  },
  filterStartDate: {
    type: String,
    default: null
  },
  filterEndDate: {
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

// Check if current month is within filter range
const isCurrentMonthInRange = computed(() => {
  if (!props.filterStartDate || !props.filterEndDate) return true;
  
  const filterStart = new Date(props.filterStartDate);
  const filterEnd = new Date(props.filterEndDate);
  const currentMonthStart = new Date(currentYear.value, currentMonth.value, 1);
  const currentMonthEnd = new Date(currentYear.value, currentMonth.value + 1, 0);
  
  // Check if current month overlaps with filter range
  return currentMonthStart <= filterEnd && currentMonthEnd >= filterStart;
});

// Check if a specific date is within filter range
const isDateInRange = (dateString) => {
  if (!props.filterStartDate || !props.filterEndDate) return true;
  
  const date = new Date(dateString);
  const filterStart = new Date(props.filterStartDate);
  const filterEnd = new Date(props.filterEndDate);
  
  return date >= filterStart && date <= filterEnd;
};

// Check if we can navigate to previous month
const canNavigatePrevious = computed(() => {
  if (!props.filterStartDate) return true;
  
  const filterStart = new Date(props.filterStartDate);
  const previousMonthEnd = new Date(currentYear.value, currentMonth.value, 0);
  
  // Allow navigation if previous month overlaps with filter range
  return previousMonthEnd >= filterStart;
});

// Check if we can navigate to next month
const canNavigateNext = computed(() => {
  if (!props.filterEndDate) return true;
  
  const filterEnd = new Date(props.filterEndDate);
  const nextMonthStart = new Date(currentYear.value, currentMonth.value + 1, 1);
  
  // Allow navigation if next month overlaps with filter range
  return nextMonthStart <= filterEnd;
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
         hasTransactions: dayTransactions.length > 0,
         balance: dayBalance,
         transactions: dayTransactions,
         disabled: !isDateInRange(dateKey)
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

// Method to navigate to a specific month and year
const navigateToMonth = (month, year) => {
  currentMonth.value = month;
  currentYear.value = year;
};

const selectDate = (day) => {
  if (day && !day.otherMonth && !day.disabled) {
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

// Expose methods to parent component
defineExpose({
  navigateToMonth
});
</script>

<style scoped>
.transaction-calendar {
  padding: 0;
}



.calendar-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px 20px 0 20px;
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

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #ccc;
}

.nav-button:disabled:hover {
  background-color: transparent;
  color: #ccc;
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

.day-cell.disabled {
  background-color: #f5f5f5;
  color: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.day-cell.disabled:hover {
  background-color: #f5f5f5;
  border-color: transparent;
}

.day-cell.disabled .day-number {
  color: #ccc;
}

.day-cell.disabled .day-amount {
  color: #ccc;
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



/* Mobile responsive */
@media (max-width: 768px) {
  .transaction-calendar {
    padding: 0;
  }
  
  .calendar-controls {
    width: 100%;
    justify-content: space-between;
    padding: 16px 16px 0 16px;
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
  

}

@media (max-width: 480px) {
  .transaction-calendar {
    padding: 0;
  }
  
  .calendar-controls {
    padding: 12px 12px 0 12px;
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
