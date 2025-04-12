<template>
  <div class="login-container">
    <div class="login-form">
      <div class="form-header">
        <button class="back-button" @click="navigateTo('/')" title="Quay về trang chủ">
          <span class="back-icon">←</span>
        </button>
        <h1>Đăng nhập</h1>
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div v-if="firebaseInitError" class="error-message">
        Lỗi cấu hình Firebase. Vui lòng thử lại sau.
      </div>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            required 
            placeholder="Nhập email của bạn"
          />
        </div>
        
        <div class="form-group">
          <label for="password">Mật khẩu</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            required 
            placeholder="Nhập mật khẩu"
          />
        </div>
        
        <button type="submit" class="login-button" :disabled="loading || firebaseInitError">
          {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
        </button>
      </form>
      
      <div class="links">
        <p>Bạn chưa có tài khoản? <NuxtLink to="/register">Đăng ký</NuxtLink></p>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'guest'
});

const { login, error, loading } = useAuth();
const email = ref('');
const password = ref('');
const firebaseInitError = ref(false);

// Check if Firebase is initialized
try {
  const { auth } = await import('~/plugins/firebase');
  firebaseInitError.value = !auth;
} catch (err) {
  console.error('Error checking Firebase:', err);
  firebaseInitError.value = true;
}

const handleLogin = async () => {
  if (firebaseInitError.value) {
    return;
  }
  
  try {
    await login(email.value, password.value);
    
    // Wait a bit for auth state to propagate
    setTimeout(() => {
      // Redirect to dashboard on successful login
      navigateTo('/dashboard');
    }, 500);
  } catch (err) {
    // Error is already handled in the composable
    console.error('Login failed:', err);
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f5f5;
}

.login-form {
  width: 100%;
  max-width: 400px;
  padding: 30px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.form-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  position: relative;
}

.back-button {
  position: absolute;
  left: 0;
  background: none;
  border: none;
  font-size: 20px;
  color: #555;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border-radius: 50%;
  width: 36px;
  height: 36px;
}

.back-button:hover {
  background-color: #f0f0f0;
  color: #4CAF50;
}

.back-icon {
  display: block;
}

h1 {
  margin: 0 auto;
  text-align: center;
  color: #333;
  font-size: 24px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.login-button {
  width: 100%;
  padding: 12px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.login-button:hover {
  background-color: #388E3C;
}

.login-button:disabled {
  background-color: #9E9E9E;
  cursor: not-allowed;
}

.error-message {
  margin-bottom: 16px;
  padding: 10px;
  background-color: #FFEBEE;
  color: #D32F2F;
  border-radius: 4px;
  font-size: 14px;
}

.links {
  margin-top: 16px;
  text-align: center;
}

.links a {
  color: #4CAF50;
  text-decoration: none;
}

.links a:hover {
  text-decoration: underline;
}
</style> 