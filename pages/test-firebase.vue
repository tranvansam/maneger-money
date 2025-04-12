<template>
  <div class="test-container">
    <h1>Kiểm tra Firebase</h1>
    
    <div class="card">
      <h2>Trạng thái kết nối</h2>
      <div v-if="loading" class="status loading">Đang kiểm tra kết nối...</div>
      <div v-else-if="authInitialized" class="status success">✓ Firebase Auth đã được khởi tạo</div>
      <div v-else class="status error">✗ Firebase Auth chưa được khởi tạo</div>
      
      <div v-if="error" class="error-message">
        <h3>Lỗi</h3>
        <pre>{{ error }}</pre>
      </div>
      
      <h2>Thông tin cấu hình</h2>
      <div class="config-info">
        <div><strong>API Key:</strong> {{ maskedApiKey }}</div>
        <div><strong>Auth Domain:</strong> {{ authDomain }}</div>
        <div><strong>Project ID:</strong> {{ projectId }}</div>
      </div>
      
      <h2>Thử nghiệm đăng ký</h2>
      <div class="form-group">
        <label>Email</label>
        <input type="email" v-model="testEmail" placeholder="test@example.com" />
      </div>
      <div class="form-group">
        <label>Mật khẩu</label>
        <input type="password" v-model="testPassword" placeholder="******" />
      </div>
      <button @click="testRegistration" :disabled="loading || !testEmail || !testPassword" class="test-button">
        {{ loading ? 'Đang xử lý...' : 'Kiểm tra đăng ký' }}
      </button>
      
      <div v-if="testResult" class="result">
        <h3>Kết quả</h3>
        <pre>{{ testResult }}</pre>
      </div>
      
      <div class="actions">
        <button @click="reloadApp" class="reload-button">Khởi động lại ứng dụng</button>
        <NuxtLink to="/" class="link-button">Về trang chủ</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const { auth } = await import('~/plugins/firebase');
const loading = ref(false);
const error = ref(null);
const authInitialized = ref(!!auth);
const testEmail = ref('');
const testPassword = ref('');
const testResult = ref('');

// Firebase config info
const projectId = 'maneger-money';
const authDomain = 'maneger-money.firebaseapp.com';
const apiKey = 'AIzaSyAmr3SW4uIE1hyxEb9CF2PcDqP7sYV-wrw';
const maskedApiKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 5);

const testRegistration = async () => {
  loading.value = true;
  testResult.value = '';
  error.value = null;
  
  try {
    const { registerUser } = await import('~/plugins/firebase');
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail.value,
        password: testPassword.value,
        returnSecureToken: true
      })
    });
    
    const result = await response.json();
    if (result.error) {
      testResult.value = JSON.stringify(result, null, 2);
      error.value = result.error.message;
    } else {
      testResult.value = "Đăng ký thành công: " + JSON.stringify({
        email: result.email,
        localId: result.localId,
        idToken: result.idToken ? result.idToken.substring(0, 10) + '...' : 'không có'
      }, null, 2);
    }
  } catch (err) {
    console.error('Test error:', err);
    error.value = err.message;
    testResult.value = JSON.stringify(err, null, 2);
  } finally {
    loading.value = false;
  }
};

const reloadApp = () => {
  window.location.reload();
};
</script>

<style scoped>
.test-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  font-family: Arial, sans-serif;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 24px;
}

h2 {
  margin-top: 24px;
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.status {
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.success {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.error {
  background-color: #ffebee;
  color: #c62828;
}

.loading {
  background-color: #e3f2fd;
  color: #1565c0;
}

.error-message {
  background-color: #ffebee;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.error-message pre {
  white-space: pre-wrap;
  word-break: break-word;
}

.config-info {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 24px;
}

.config-info div {
  margin-bottom: 8px;
}

.form-group {
  margin-bottom: 16px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.test-button {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-bottom: 24px;
}

.test-button:disabled {
  background-color: #9e9e9e;
  cursor: not-allowed;
}

.result {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 24px;
}

.result pre {
  white-space: pre-wrap;
  word-break: break-word;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.reload-button {
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  flex: 1;
}

.link-button {
  background-color: #9e9e9e;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  text-decoration: none;
  text-align: center;
  flex: 1;
}
</style> 