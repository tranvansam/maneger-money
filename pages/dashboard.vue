<template>
  <div class="dashboard-container">
    <div class="user-info" v-if="user">
      <p><strong>Email:</strong> {{ user.email }}</p>
    </div>
    
    <div v-if="!isInitialized || loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">Đang tải dữ liệu...</div>
    </div>
    
    <div v-if="fetchError" class="error-overlay">
      <div class="error-content">
        <h3>Lỗi khi tải dữ liệu</h3>
        <p>{{ fetchError }}</p>
        <button @click="retryFetch" class="retry-button">Thử lại</button>
      </div>
    </div>
    
    <!-- Thông tin thời tiết -->
    <div class="weather-widget">
      <div class="weather-header">
        <h2>Thời tiết {{ weather?.location || 'đang tải...' }}</h2>
        <div class="weather-actions">
          <button @click="showLocationSelect = !showLocationSelect" class="location-button">
            <span class="location-icon">📍</span>
          </button>
          <button @click="refreshWeather" class="refresh-button" :disabled="weatherLoading">
            <span class="refresh-icon">⟳</span>
          </button>
        </div>
      </div>
      
      <!-- Bộ chọn địa phương -->
      <div v-if="showLocationSelect" class="location-selector">
        <div class="location-header">
          <h3>Chọn địa phương</h3>
          <button @click="showLocationSelect = false" class="close-button">×</button>
        </div>
        <div class="location-list">
          <button 
            v-for="loc in locations" 
            :key="loc.id" 
            @click="selectLocation(loc)" 
            class="location-option"
            :class="{ 'active': loc.id === selectedLocationId }"
          >
            {{ loc.name }}
          </button>
        </div>
      </div>
      
      <div v-if="weatherLoading" class="weather-loading">
        <div class="loading-spinner"></div>
        <span>Đang tải dữ liệu thời tiết...</span>
      </div>
      <div v-else-if="weatherError" class="weather-error">
        <p>{{ weatherError }}</p>
        <button @click="refreshWeather" class="retry-button">Thử lại</button>
      </div>
      <div v-else-if="weather" class="weather-content">
        <div class="weather-main">
          <div class="weather-icon">{{ getWeatherEmoji(weather.condition) }}</div>
          <div class="weather-temp">{{ Math.round(weather.temp) }}°C</div>
          <div class="weather-condition">{{ translateWeatherCondition(weather.condition) }}</div>
        </div>
        <div class="weather-details">
          <div class="weather-detail">
            <span class="detail-label">Độ ẩm:</span>
            <span class="detail-value">{{ weather.humidity }}%</span>
          </div>
          <div class="weather-detail">
            <span class="detail-label">Gió:</span>
            <span class="detail-value">{{ weather.windSpeed }}km/h</span>
          </div>
          <div class="weather-detail">
            <span class="detail-label">Cảm giác như:</span>
            <span class="detail-value">{{ Math.round(weather.feelsLike) }}°C</span>
          </div>
        </div>
      </div>
      
      <!-- Dự báo 7 ngày -->
      <div v-if="weather && weather.forecast" class="weather-forecast">
        <h3>Dự báo 7 ngày tới</h3>
        <div class="forecast-container">
          <div v-for="(day, index) in weather.forecast" :key="index" class="forecast-day">
            <div class="forecast-date">{{ formatForecastDate(day.date) }}</div>
            <div class="forecast-icon">{{ getWeatherEmoji(day.condition) }}</div>
            <div class="forecast-temp">
              <span class="temp-high">{{ Math.round(day.tempMax) }}°</span>
              <span class="temp-low">{{ Math.round(day.tempMin) }}°</span>
            </div>
            <div class="forecast-condition">{{ translateWeatherCondition(day.condition) }}</div>
            <div class="forecast-precip" v-if="day.precipitation > 0">
              <span class="precip-icon">💧</span>
              <span>{{ day.precipitation }}mm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="finance-overview">
      <div class="finance-card income">
        <span class="card-title">Thu Nhập</span>
        <div v-if="loading" class="loading-placeholder">
          <div class="loading-spinner"></div>
          <span>Đang tải...</span>
        </div>
        <div v-else-if="fetchError" class="error-message">
          <span>{{ fetchError }}</span>
          <button @click="fetchTransactions" class="retry-button">Thử lại</button>
        </div>
        <span v-else-if="transactions.length === 0" class="no-data">Không có dữ liệu</span>
        <span v-else class="amount">{{ formatCurrency(totalIncome) }}</span>
      </div>
      <div class="finance-card expense">
        <span class="card-title">Chi Tiêu</span>
        <div v-if="loading" class="loading-placeholder">
          <div class="loading-spinner"></div>
          <span>Đang tải...</span>
        </div>
        <div v-else-if="fetchError" class="error-message">
          <span>{{ fetchError }}</span>
          <button @click="fetchTransactions" class="retry-button">Thử lại</button>
        </div>
        <span v-else-if="transactions.length === 0" class="no-data">Không có dữ liệu</span>
        <span v-else class="amount">{{ formatCurrency(totalExpense) }}</span>
      </div>
      <div class="finance-card balance">
        <span class="card-title">Số Dư</span>
        <div v-if="loading" class="loading-placeholder">
          <div class="loading-spinner"></div>
          <span>Đang tải...</span>
        </div>
        <div v-else-if="fetchError" class="error-message">
          <span>{{ fetchError }}</span>
          <button @click="fetchTransactions" class="retry-button">Thử lại</button>
        </div>
        <span v-else-if="transactions.length === 0" class="no-data">Không có dữ liệu</span>
        <span v-else class="amount">{{ formatCurrency(balance) }}</span>
      </div>
    </div>
    
    <div class="charts-container">
      <!-- Biểu đồ chi tiêu -->
      <div class="chart-wrapper">
        <div class="chart-header">
          <h2>Thống kê chi tiêu theo danh mục</h2>
          <button @click="refreshCharts" class="refresh-chart-button" :disabled="loading">
            <span class="refresh-icon">⟳</span>
          </button>
        </div>
        <ExpenseChartNew 
          :transactions="transactions" 
          :loading="loading" 
          :trend-data="expenseTrendData"
        />
      </div>
      
      <!-- Biểu đồ tổng quan nợ -->
      <div class="chart-wrapper">
        <div class="chart-header">
          <h2>Tổng quan khoản nợ</h2>
          <button @click="refreshDebts" class="refresh-chart-button" :disabled="debtsLoading">
            <span class="refresh-icon">⟳</span>
          </button>
        </div>
        <div v-if="debtsLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">Đang tải dữ liệu khoản nợ...</div>
        </div>
        <div v-else-if="fetchError" class="debt-error-message">
          <div class="error-icon">⚠️</div>
          <div class="error-title">Lỗi khi tải dữ liệu</div>
          <p class="error-description">{{ fetchError }}</p>
          <button @click="retryFetch" class="retry-button">Thử lại</button>
        </div>
        <DebtOverviewChart 
          v-else
          :debts="debts" 
          :loading="debtsLoading" 
        />
      </div>
    </div>
    
    <div class="quick-links">
      <button @click="navigateTo('/transactions')" class="quick-link-button">
        <span class="quick-link-icon">💰</span>
        <span>Quản lý giao dịch</span>
      </button>
      
      <button @click="navigateTo('/debts')" class="quick-link-button">
        <span class="quick-link-icon">💸</span>
        <span>Quản lý nợ</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp, limit } from 'firebase/firestore';
import { db, auth } from '~/plugins/firebase';
import ExpenseChartNew from '~/components/ExpenseChartNew.vue';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'vue-router';
import { useAuth } from '~/composables/useAuth';
import DebtOverviewChart from '~/components/DebtOverviewChart.vue';

const router = useRouter();
const { user, logout } = useAuth();
const authLoading = ref(false);
const loading = ref(false);
const debtsLoading = ref(false);
const transactionsLoading = ref(false);
const isInitialized = ref(false);
const fetchError = ref(null);
const transactionsError = ref(null);
const debtsError = ref(null);
const transactions = ref([]);
const debts = ref([]);

// Thông tin thời tiết
const weather = ref(null);
const weatherError = ref(null);
const weatherLoading = ref(false);
const showLocationSelect = ref(false);
const selectedLocationId = ref('tamdan');

// Danh sách địa phương có thời tiết
const locations = [
  { id: 'tamdan', name: 'Tam Dân, Phú Ninh, Quảng Nam' },
  { id: 'danang', name: 'Đà Nẵng' },
  { id: 'hue', name: 'Huế, Thừa Thiên Huế' },
  { id: 'hanoi', name: 'Hà Nội' },
  { id: 'hochiminh', name: 'TP. Hồ Chí Minh' },
  { id: 'nhatrang', name: 'Nha Trang, Khánh Hòa' },
  { id: 'dalat', name: 'Đà Lạt, Lâm Đồng' },
  { id: 'phuquoc', name: 'Phú Quốc, Kiên Giang' },
];

// Hàm định dạng tiền VND
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Hàm định dạng ngày
const formatDate = (timestamp) => {
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// Hàm định dạng ngày cho dự báo thời tiết
const formatForecastDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.toLocaleDateString('vi-VN', { weekday: 'short' });
  return `${dayOfWeek} ${day}/${month}`;
};

// Lấy dữ liệu giao dịch
const fetchTransactions = async () => {
  transactionsLoading.value = true;
  transactionsError.value = null;
  
  try {
    if (user.value) {
      // Lấy dữ liệu thực từ Firebase cho người dùng đã đăng nhập
      console.log("Đang lấy giao dịch thực cho user:", user.value.uid);
      
      // Kiểm tra xem db có tồn tại không
      if (!db) {
        console.error("Firebase db không được khởi tạo");
        throw new Error("Không thể kết nối đến cơ sở dữ liệu");
      }
      
      // Lấy tất cả giao dịch từ Firestore
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', user.value.uid),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const transactionsData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Xử lý dữ liệu một cách cẩn thận
        const transaction = {
          id: doc.id,
          ...data,
          // Đảm bảo date là đối tượng Date
          date: data.date instanceof Object && data.date.toDate ? data.date.toDate() : new Date(data.date || Date.now()),
          // Đảm bảo amount là số
          amount: Number(data.amount) || 0,
          // Đảm bảo type và category luôn tồn tại
          type: data.type || 'expense',
          category: data.category || 'other_expense',
          // Đảm bảo description luôn có giá trị
          description: data.description || ''
        };
        
        transactionsData.push(transaction);
      });
      
      console.log(`Đã tìm thấy ${transactionsData.length} giao dịch thực từ Firebase`);
      transactions.value = transactionsData;
      
      // Log chi tiết về các giao dịch theo loại
      const expenses = transactionsData.filter(t => t.type === 'expense');
      const incomes = transactionsData.filter(t => t.type === 'income');
      
      console.log(`Chi tiết dữ liệu: ${expenses.length} chi tiêu, ${incomes.length} thu nhập`);
      
      // Tính toán tổng theo danh mục để kiểm tra
      const categoryTotals = {};
      for (const transaction of expenses) {
        const category = transaction.category || 'other_expense';
        if (!categoryTotals[category]) {
          categoryTotals[category] = 0;
        }
        categoryTotals[category] += Number(transaction.amount) || 0;
      }
      
      console.log("Tổng chi tiêu theo danh mục:", categoryTotals);
      
      // Cập nhật dữ liệu xu hướng chi tiêu
      expenseTrendData.value = generateExpenseTrendData();
    } else {
      // Sử dụng dữ liệu mẫu cho người dùng chưa đăng nhập
      console.log("Người dùng chưa đăng nhập, sử dụng dữ liệu mẫu");
      transactions.value = sampleTransactions;
    }
  } catch (error) {
    console.error("Lỗi khi lấy giao dịch:", error);
    transactionsError.value = "Không thể tải dữ liệu giao dịch: " + error.message;
  } finally {
    transactionsLoading.value = false;
  }
};

// Tính toán tổng thu, chi và số dư
const totalIncome = computed(() => {
  const incomeTransactions = transactions.value.filter(t => t.type === 'income');
  const total = incomeTransactions.reduce((sum, transaction) => {
    const amount = Number(transaction.amount) || 0;
    return sum + amount;
  }, 0);
  
  console.log(`Tổng thu nhập (${incomeTransactions.length} giao dịch):`, total, "VND");
  console.log("Chi tiết thu nhập:", incomeTransactions);
  
  return total;
});

const totalExpense = computed(() => {
  const expenseTransactions = transactions.value.filter(t => t.type === 'expense');
  const total = expenseTransactions.reduce((sum, transaction) => {
    const amount = Number(transaction.amount) || 0;
    return sum + amount;
  }, 0);
  
  console.log(`Tổng chi tiêu (${expenseTransactions.length} giao dịch):`, total, "VND");
  console.log("Chi tiết chi tiêu:", expenseTransactions);
  
  return total;
});

const balance = computed(() => {
  const result = totalIncome.value - totalExpense.value;
  console.log("Số dư:", result, "VND");
  return result;
});

// Hàm chuyển đổi điều kiện thời tiết sang emoji
const getWeatherEmoji = (condition) => {
  const conditionMap = {
    'clear': '☀️',
    'sunny': '☀️',
    'partly cloudy': '⛅',
    'cloudy': '☁️',
    'overcast': '☁️',
    'mist': '🌫️',
    'patchy rain': '🌦️',
    'rain': '🌧️',
    'heavy rain': '⛈️',
    'thunderstorm': '⛈️',
    'snow': '❄️',
    'sleet': '🌨️',
    'fog': '🌫️',
    'default': '🌤️'
  };
  
  // Chuyển về chữ thường và tìm emoji phù hợp
  const lowerCondition = (condition || '').toLowerCase();
  for (const [key, emoji] of Object.entries(conditionMap)) {
    if (lowerCondition.includes(key)) {
      return emoji;
    }
  }
  
  return conditionMap.default;
};

// Hàm chuyển đổi điều kiện thời tiết từ tiếng Anh sang tiếng Việt
const translateWeatherCondition = (condition) => {
  const conditionMap = {
    'clear': 'Trời quang',
    'sunny': 'Nắng',
    'partly cloudy': 'Mây rải rác',
    'cloudy': 'Nhiều mây',
    'overcast': 'U ám',
    'mist': 'Sương mù nhẹ',
    'patchy rain': 'Mưa rào rải rác',
    'rain': 'Mưa',
    'heavy rain': 'Mưa lớn',
    'thunderstorm': 'Dông',
    'snow': 'Tuyết',
    'sleet': 'Mưa tuyết',
    'fog': 'Sương mù dày',
    'default': 'Không xác định'
  };
  
  const lowerCondition = (condition || '').toLowerCase();
  for (const [key, translation] of Object.entries(conditionMap)) {
    if (lowerCondition.includes(key)) {
      return translation;
    }
  }
  
  return conditionMap.default;
};

// Lấy dữ liệu nợ
const fetchDebts = async () => {
  debtsLoading.value = true;
  debtsError.value = null;
  
  try {
    if (user.value) {
      // Lấy dữ liệu thực từ Firebase cho người dùng đã đăng nhập
      console.log("Đang lấy khoản nợ cho user:", user.value.uid);
      
      // Kiểm tra xem db có tồn tại không
      if (!db) {
        console.error("Firebase db không được khởi tạo");
        throw new Error("Không thể kết nối đến cơ sở dữ liệu");
      }
      
      // Lấy tất cả khoản nợ từ Firestore
      const q = query(
        collection(db, 'users', user.value.uid, 'debts'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const debtsData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Xử lý dữ liệu một cách cẩn thận
        const debt = {
          id: doc.id,
          ...data,
          // Đảm bảo các trường date là đối tượng Date
          createdAt: data.createdAt instanceof Object && data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
          dueDate: data.dueDate instanceof Object && data.dueDate.toDate ? data.dueDate.toDate() : data.dueDate ? new Date(data.dueDate) : null,
          endDate: data.endDate instanceof Object && data.endDate.toDate ? data.endDate.toDate() : data.endDate ? new Date(data.endDate) : null,
          // Đảm bảo amount là số
          amount: Number(data.amount) || 0,
          // Đảm bảo các trường khác luôn tồn tại
          description: data.description || '',
          creditor: data.creditor || '',
          notes: data.notes || '',
          debtType: data.debtType || 'owed',
          isRecurring: !!data.isRecurring,
          paidMonths: data.paidMonths || {},
          paid: !!data.paid
        };
        
        debtsData.push(debt);
      });
      
      console.log(`Đã tìm thấy ${debtsData.length} khoản nợ thực từ Firebase`);
      debts.value = debtsData;
      
      // Log chi tiết về các khoản nợ theo loại
      const lentDebts = debtsData.filter(d => d.debtType === 'lent');
      const owedDebts = debtsData.filter(d => d.debtType === 'owed');
      
      console.log(`Chi tiết khoản nợ: ${lentDebts.length} cho mượn, ${owedDebts.length} đang nợ`);
    } else {
      // Sử dụng dữ liệu mẫu cho người dùng chưa đăng nhập
      console.log("Người dùng chưa đăng nhập, sử dụng dữ liệu nợ mẫu");
      debts.value = sampleDebts;
    }
  } catch (error) {
    console.error("Lỗi khi lấy khoản nợ:", error);
    debtsError.value = "Không thể tải dữ liệu khoản nợ: " + error.message;
  } finally {
    debtsLoading.value = false;
  }
};

// Chọn địa phương
const selectLocation = (location) => {
  selectedLocationId.value = location.id;
  showLocationSelect.value = false;
  fetchWeather();
};

// Lấy dữ liệu thời tiết
const fetchWeather = async () => {
  weatherLoading.value = true;
  weatherError.value = null;
  
  try {
    // Xác định vị trí và API key
    let city;
    
    switch(selectedLocationId.value) {
      case 'danang':
        city = 'Da Nang';
        break;
      case 'hue':
        city = 'Hue';
        break;
      case 'hanoi':
        city = 'Hanoi';
        break;
      case 'hochiminh':
        city = 'Ho Chi Minh City';
        break;
      case 'nhatrang':
        city = 'Nha Trang';
        break;
      case 'dalat':
        city = 'Da Lat';
        break;
      case 'phuquoc':
        city = 'Phu Quoc';
        break;
      case 'tamdan':
      default:
        city = 'Tam Ky,Quang Nam'; // Gần nhất với Tam Dân
    }
    
    // Gọi API OpenWeatherMap cho thời tiết hiện tại
    // Free API key: sử dụng API key công khai cho mục đích demo
    const apiKey = '1266a10927c73e99e2186b2cfbd0830e';
    
    // API current weather
    const currentWeatherURL = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=vi`;
    const currentWeatherResponse = await fetch(currentWeatherURL);
    
    if (!currentWeatherResponse.ok) {
      throw new Error(`API Error: ${currentWeatherResponse.status}`);
    }
    
    const currentData = await currentWeatherResponse.json();
    
    // API forecast cho 7 ngày (One Call API)
    const lat = currentData.coord.lat;
    const lon = currentData.coord.lon;
    const forecastURL = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly&appid=${apiKey}&units=metric&lang=vi`;
    
    const forecastResponse = await fetch(forecastURL);
    
    if (!forecastResponse.ok) {
      throw new Error(`Forecast API Error: ${forecastResponse.status}`);
    }
    
    const forecastData = await forecastResponse.json();
    
    // Xử lý dữ liệu thời tiết hiện tại
    const mainCondition = currentData.weather[0].description;
    
    // Xử lý dữ liệu dự báo 7 ngày
    const daily = forecastData.daily.slice(1, 8); // Bỏ qua ngày hôm nay (index 0)
    
    const forecastProcessed = daily.map(day => {
      return {
        date: new Date(day.dt * 1000).toISOString(),
        condition: day.weather[0].description,
        tempMin: day.temp.min,
        tempMax: day.temp.max,
        precipitation: day.rain ? day.rain : 0
      };
    });
    
    // Xác định tên địa phương hiển thị
    let locationName = locations.find(loc => loc.id === selectedLocationId.value)?.name || city;
    
    // Tạo đối tượng thời tiết
    weather.value = {
      location: locationName,
      temp: currentData.main.temp,
      feelsLike: currentData.main.feels_like,
      humidity: currentData.main.humidity,
      windSpeed: currentData.wind.speed * 3.6, // Đổi từ m/s sang km/h
      condition: mainCondition,
      forecast: forecastProcessed
    };
    
    console.log("Đã tải thành công dữ liệu thời tiết thực từ API");
    
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu thời tiết:', error);
    weatherError.value = 'Không thể tải dữ liệu thời tiết: ' + error.message;
    weather.value = null;
  } finally {
    weatherLoading.value = false;
  }
};

// Làm mới dữ liệu thời tiết
const refreshWeather = () => {
  fetchWeather();
};

// Làm mới dữ liệu biểu đồ chi tiêu
const refreshCharts = async () => {
  try {
    console.log("Đang làm mới dữ liệu thống kê chi tiêu...");
    transactionsLoading.value = true;
    
    // Gọi lại hàm fetchTransactions để lấy dữ liệu mới nhất từ Firebase
    await fetchTransactions();
    
    // Thống kê lại dữ liệu chi tiêu
    const expenseTransactions = transactions.value.filter(t => t.type === 'expense');
    
    // Phân loại chi tiêu theo danh mục
    const categoryTotals = {};
    let totalAmount = 0;
    
    for (const tx of expenseTransactions) {
      const category = tx.category || 'other_expense';
      const amount = Number(tx.amount) || 0;
      
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      
      categoryTotals[category] += amount;
      totalAmount += amount;
    }
    
    console.log(`Đã làm mới dữ liệu chi tiêu: ${expenseTransactions.length} giao dịch`);
    console.log(`Tổng chi tiêu: ${formatCurrency(totalAmount)}`);
    console.log("Chi tiết chi tiêu theo danh mục:", categoryTotals);
    
    // Cập nhật dữ liệu xu hướng chi tiêu
    expenseTrendData.value = generateExpenseTrendData();
    
  } catch (error) {
    console.error("Lỗi khi làm mới dữ liệu chi tiêu:", error);
    transactionsError.value = "Không thể làm mới dữ liệu chi tiêu: " + error.message;
  } finally {
    transactionsLoading.value = false;
  }
};

// Làm mới dữ liệu biểu đồ nợ
const refreshDebts = async () => {
  try {
    console.log("Đang làm mới dữ liệu khoản nợ...");
    debtsLoading.value = true;
    debtsError.value = null;
    
    // Lấy dữ liệu mới từ Firebase
    await fetchDebts();
    
    // Kiểm tra kết quả
    if (debts.value.length === 0) {
      console.log("Không tìm thấy dữ liệu nợ trong Firebase");
    } else {
      console.log(`Đã làm mới dữ liệu nợ: ${debts.value.length} khoản nợ`);
      
      // Log chi tiết theo loại nợ
      const lentDebts = debts.value.filter(d => d.debtType === 'lent');
      const owedDebts = debts.value.filter(d => d.debtType === 'owed');
      
      console.log(`Chi tiết khoản nợ: ${lentDebts.length} cho mượn, ${owedDebts.length} đang nợ`);
    }
  } catch (error) {
    console.error("Lỗi khi làm mới dữ liệu nợ:", error);
    debtsError.value = "Không thể làm mới dữ liệu khoản nợ: " + error.message;
  } finally {
    debtsLoading.value = false;
  }
};

// Thử tải lại dữ liệu
const retryFetch = async () => {
  fetchError.value = null;
  try {
    console.log("Đang thử tải lại dữ liệu...");
    await Promise.all([
      fetchTransactions(),
      fetchDebts()
    ]);
    console.log("Đã tải lại dữ liệu thành công");
  } catch (error) {
    console.error("Lỗi khi thử tải lại dữ liệu:", error);
    fetchError.value = "Không thể tải lại dữ liệu: " + error.message;
  }
};

// Xử lý đăng xuất
const handleLogout = async () => {
  authLoading.value = true;
  try {
    await logout();
    router.push('/login');
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
  } finally {
    authLoading.value = false;
  }
};

// Chuyển hướng trang
const navigateTo = (path) => {
  router.push(path);
};

// Khi component được mount
onMounted(async () => {
  console.log("Dashboard mounted, checking user:", user.value?.uid);
  
  // Khởi tạo với mảng trống
  transactions.value = [];
  debts.value = [];
  
  // Set loading state right away
  loading.value = true;
  debtsLoading.value = true;
  weatherLoading.value = true;
  
  try {
    // Tải thời tiết trước vì không cần auth
    await fetchWeather();
    
    // Gán trực tiếp một authStateChanged listener để đảm bảo luôn có thông tin user mới nhất
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.uid);
      
      if (firebaseUser) {
        console.log("Initializing dashboard for user:", firebaseUser.uid);
        try {
          // Reset loading state để UI phản ánh đúng trạng thái
          loading.value = true;
          debtsLoading.value = true;
          
          // Đảm bảo user.value được cập nhật trước khi gọi fetchTransactions
          await nextTick();
          
          // Thực hiện tải dữ liệu tuần tự để dễ debug
          await fetchTransactions();
          console.log("Đã tải giao dịch, tiếp tục tải nợ...");
          
          await fetchDebts();
          console.log("Đã tải nợ, tiếp tục cập nhật thời tiết...");
          
          await fetchWeather();
          
          console.log("Đã tải tất cả dữ liệu thực thành công");
          
        } catch (error) {
          console.error("Error during initial data load:", error);
          fetchError.value = "Lỗi khi tải dữ liệu ban đầu: " + (error.message || "Không xác định");
          transactions.value = [];
          debts.value = [];
        } finally {
          isInitialized.value = true;
          loading.value = false;
          debtsLoading.value = false;
        }
      } else {
        console.log("Không có user đang đăng nhập, chỉ hiển thị thời tiết");
        fetchError.value = "Vui lòng đăng nhập để xem dữ liệu giao dịch và nợ";
        transactions.value = [];
        debts.value = [];
        
        isInitialized.value = true;
        loading.value = false;
        debtsLoading.value = false;
      }
    });
    
    // Cleanup function
    return () => {
      console.log("Dashboard unmounting, unsubscribing auth listener");
      unsubscribe();
    };
  } catch (error) {
    console.error("Error during initial setup:", error);
    fetchError.value = "Lỗi khi khởi tạo: " + (error.message || "Không xác định");
    
    transactions.value = [];
    debts.value = [];
    
    isInitialized.value = true;
    loading.value = false;
    debtsLoading.value = false;
    weatherLoading.value = false;
  }
});

// Watch cho user authentication status
watch(user, async (newUser, oldUser) => {
  console.log("User watcher triggered:", newUser?.uid);
  
  // Chỉ thực hiện khi trạng thái user thực sự thay đổi
  if (newUser?.uid !== oldUser?.uid) {
    console.log("Trạng thái đăng nhập thay đổi, tải lại dữ liệu...");
    
    if (newUser && newUser.uid) {
      console.log("Người dùng đã đăng nhập, tải dữ liệu thực từ Firebase");
      
      // Đặt trạng thái loading
      transactionsLoading.value = true;
      debtsLoading.value = true;
      
      try {
        // Tải dữ liệu giao dịch và nợ
        await Promise.all([
          fetchTransactions(),
          fetchDebts()
        ]);
        
        // Làm mới dữ liệu thời tiết
        await fetchWeather();
        
        // Cập nhật dữ liệu xu hướng chi tiêu
        expenseTrendData.value = generateExpenseTrendData();
        
        console.log("Đã tải lại dữ liệu thành công sau khi đăng nhập");
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu sau đăng nhập:", error);
        fetchError.value = "Không thể tải dữ liệu: " + error.message;
      } finally {
        transactionsLoading.value = false;
        debtsLoading.value = false;
      }
    } else {
      console.log("Người dùng đã đăng xuất, xóa dữ liệu");
      transactions.value = [];
      debts.value = [];
      fetchError.value = "Vui lòng đăng nhập để xem dữ liệu";
    }
  }
});

// Tạo dữ liệu xu hướng chi tiêu cho biểu đồ
const generateExpenseTrendData = () => {
  // Chỉ sử dụng dữ liệu giao dịch thực từ Firebase
  if (!transactions.value || transactions.value.length === 0) {
    console.log("Không có dữ liệu giao dịch thực để tạo xu hướng chi tiêu");
    return [];
  }

  // Tạo mảng cho 30 ngày gần đây
  const result = [];
  const today = new Date();
  
  // Chỉ xem xét các giao dịch chi tiêu (loại "expense") trong 30 ngày qua
  const recentExpenses = transactions.value.filter(transaction => {
    const transactionDate = transaction.date instanceof Date 
      ? transaction.date 
      : new Date(transaction.date);
    
    const daysDifference = Math.floor((today - transactionDate) / (1000 * 60 * 60 * 24));
    return transaction.type === 'expense' && daysDifference < 30;
  });
  
  console.log(`Số lượng chi tiêu trong 30 ngày qua: ${recentExpenses.length}`);
  
  // Tạo một đối tượng để theo dõi tổng chi tiêu cho mỗi ngày
  const dailyExpenses = {};
  
  // Tính tổng chi tiêu cho mỗi ngày
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split('T')[0]; // Định dạng 'YYYY-MM-DD'
    dailyExpenses[dateString] = 0;
  }
  
  // Cộng dồn chi tiêu cho mỗi ngày
  recentExpenses.forEach(expense => {
    const expenseDate = expense.date instanceof Date 
      ? expense.date 
      : new Date(expense.date);
    
    const dateString = expenseDate.toISOString().split('T')[0];
    if (dailyExpenses[dateString] !== undefined) {
      dailyExpenses[dateString] += expense.amount;
    }
  });
  
  // Chuyển đổi đối tượng thành mảng kết quả
  for (const dateStr in dailyExpenses) {
    result.push({
      date: dateStr,
      amount: dailyExpenses[dateStr]
    });
  }
  
  // Sắp xếp theo ngày tăng dần
  result.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  console.log("Đã tạo dữ liệu xu hướng chi tiêu thực từ 30 ngày qua", result);
  return result;
};

const expenseTrendData = ref(generateExpenseTrendData());

// Làm mới tất cả dữ liệu
const refreshData = async () => {
  try {
    console.log("Đang làm mới tất cả dữ liệu từ API và Firebase...");
    
    // Đặt các trạng thái loading
    loading.value = true;
    transactionsLoading.value = true;
    debtsLoading.value = true;
    weatherLoading.value = true;
    
    // Xóa các thông báo lỗi
    fetchError.value = null;
    transactionsError.value = null;
    debtsError.value = null;
    weatherError.value = null;
    
    // Làm mới tất cả dữ liệu
    await Promise.all([
      fetchTransactions(),
      fetchDebts(),
      fetchWeather()
    ]);
    
    // Cập nhật dữ liệu xu hướng chi tiêu
    expenseTrendData.value = generateExpenseTrendData();
    
    console.log("Đã làm mới tất cả dữ liệu thực thành công");
    console.log(`Số lượng giao dịch: ${transactions.value.length}`);
    console.log(`Số lượng khoản nợ: ${debts.value.length}`);
    
  } catch (error) {
    console.error("Lỗi khi làm mới dữ liệu:", error);
    fetchError.value = "Không thể làm mới tất cả dữ liệu: " + error.message;
  } finally {
    loading.value = false;
    transactionsLoading.value = false;
    debtsLoading.value = false;
    weatherLoading.value = false;
  }
};
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eaeaea;
}

.logout-button {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.logout-button:hover {
  background-color: #d32f2f;
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
  backdrop-filter: blur(2px);
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

.loading-text {
  font-size: 18px;
  color: #333;
}

.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.error-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 24px;
  text-align: center;
  max-width: 90%;
  width: 400px;
}

.error-content h3 {
  color: #f44336;
  margin-top: 0;
}

.retry-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  margin-top: 16px;
}

/* Widget thời tiết */
.weather-widget {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.weather-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.weather-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
  line-height: 1.4;
  max-width: 80%;
  overflow-wrap: break-word;
}

.weather-actions {
  display: flex;
  gap: 8px;
}

.location-button, .refresh-button {
  background: none;
  border: none;
  color: #4CAF50;
  cursor: pointer;
  font-size: 20px;
  transition: transform 0.2s;
}

.location-button:hover, .refresh-button:hover {
  transform: rotate(30deg);
}

.location-icon, .refresh-icon {
  display: inline-block;
}

.weather-loading, .weather-error {
  text-align: center;
  padding: 20px;
  color: #757575;
}

.weather-content {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.weather-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.weather-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.weather-temp {
  font-size: 36px;
  font-weight: bold;
  color: #333;
}

.weather-details {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.weather-detail {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-label {
  color: #757575;
}

.detail-value {
  font-weight: 500;
}

/* Tổng quan tài chính */
.finance-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.finance-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.finance-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-title {
  font-size: 16px;
  color: #757575;
  margin-bottom: 10px;
}

.amount {
  font-size: 24px;
  font-weight: bold;
}

.income .amount {
  color: #4CAF50;
}

.expense .amount {
  color: #f44336;
}

.balance .amount {
  color: #2196F3;
}

.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.error-message {
  color: #f44336;
  text-align: center;
}

/* Container cho biểu đồ */
.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

/* Quick links */
.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.quick-link-button {
  background-color: white;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.quick-link-button:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.quick-link-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

/* Dự báo 7 ngày */
.weather-forecast {
  margin-top: 20px;
  border-top: 1px solid #eaeaea;
  padding-top: 20px;
}

.weather-forecast h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: #555;
}

.forecast-container {
  display: flex;
  overflow-x: auto;
  gap: 15px;
  padding-bottom: 10px;
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

.forecast-container::-webkit-scrollbar {
  height: 6px;
}

.forecast-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.forecast-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.forecast-day {
  min-width: 80px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 8px;
  transition: transform 0.2s;
}

.forecast-day:hover {
  transform: translateY(-3px);
  box-shadow: 0 3px 5px rgba(0,0,0,0.1);
}

.forecast-date {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #555;
}

.forecast-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.forecast-temp {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
}

.temp-high {
  font-weight: bold;
  color: #f44336;
}

.temp-low {
  color: #2196F3;
}

.forecast-condition {
  font-size: 12px;
  text-align: center;
  color: #555;
  margin-bottom: 5px;
  text-transform: capitalize;
}

.forecast-precip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #2196F3;
}

.precip-icon {
  font-size: 12px;
}

/* Bộ chọn địa phương */
.location-selector {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: 16px;
  overflow: hidden;
  position: relative;
  z-index: 10;
}

.location-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #eaeaea;
}

.location-header h3 {
  margin: 0;
  font-size: 16px;
  color: #4CAF50;
}

.close-button {
  background: none;
  border: none;
  color: #757575;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: #f5f5f5;
}

.location-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}

.location-option {
  background-color: #f9f9f9;
  border: 1px solid #eaeaea;
  border-radius: 6px;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: #333;
}

.location-option:hover {
  background-color: #f0f7f0;
  border-color: #c8e6c9;
}

.location-option.active {
  background-color: #e8f5e9;
  border-color: #4CAF50;
  color: #2E7D32;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .finance-overview {
    grid-template-columns: 1fr;
  }
  
  .charts-container {
    grid-template-columns: 1fr;
  }
  
  .weather-content {
    flex-direction: column;
  }
  
  .finance-card:hover {
    transform: none;
  }
  
  .quick-link-button:hover {
    transform: none;
  }
  
  .forecast-container {
    padding-bottom: 15px;
  }
  
  .forecast-day:hover {
    transform: none;
  }
  
  .location-list {
    grid-template-columns: 1fr;
  }
}

/* CSS cho biểu đồ và nút làm mới */
.chart-wrapper {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 0;
  margin-top: 20px;
  overflow: hidden;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px 0;
}

.chart-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.refresh-chart-button {
  background: none;
  border: none;
  color: #4CAF50;
  cursor: pointer;
  font-size: 18px;
  transition: transform 0.2s;
  padding: 5px;
}

.refresh-chart-button:hover {
  transform: rotate(30deg);
}

.refresh-chart-button:disabled {
  color: #cccccc;
  cursor: not-allowed;
}

/* New styles for the debt error message */
.debt-error-message {
  text-align: center;
  padding: 20px;
  margin: 20px 0;
  background-color: #fff5f5;
  border: 1px solid #ffebee;
  border-radius: 8px;
  color: #d32f2f;
}

.error-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.error-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

.error-description {
  margin-bottom: 16px;
  color: #616161;
}

.retry-button {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.retry-button:hover {
  background-color: #388e3c;
}

.loading-state {
  text-align: center;
  padding: 20px;
  color: #757575;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.refresh-button:hover {
  background-color: #388E3C;
}

.refresh-button:disabled {
  background-color: #9E9E9E;
  cursor: not-allowed;
}

.refresh-icon {
  font-size: 16px;
}

.no-data {
  font-size: 16px;
  color: #9e9e9e;
  font-style: italic;
  display: block;
  text-align: center;
  padding: 10px 0;
}
</style> 