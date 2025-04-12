import { ref, computed, onUnmounted } from 'vue';
import { auth, loginUser, registerUser, logoutUser, getCurrentUser, updateUserProfile } from '~/plugins/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';

// Shared auth state across the app
const user = ref<User | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
let authUnsubscribe: (() => void) | null = null;

// Set up persistent auth listener
if (process.client && auth) {
  authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    user.value = firebaseUser;
    loading.value = false;
    console.log('Auth state updated in useAuth:', firebaseUser?.email);
    console.log('Current display name:', firebaseUser?.displayName);
  }, (err) => {
    console.error('Auth state change error:', err);
    error.value = err.message;
    loading.value = false;
  });
}

export const useAuth = () => {
  // Check if the user is authenticated
  const isAuthenticated = computed(() => !!user.value);

  // Initialize auth state
  const initAuth = async () => {
    // Only run if not already initialized by the listener
    if (loading.value && !user.value) {
      loading.value = true;
      try {
        user.value = await getCurrentUser();
      } catch (err) {
        console.error('Error initializing auth:', err);
        error.value = (err as Error).message;
      } finally {
        loading.value = false;
      }
    }
  };

  // Register a new user
  const register = async (email: string, password: string, displayName?: string) => {
    loading.value = true;
    error.value = null;
    try {
      const userCredential = await registerUser(email, password);
      // We don't need to set user.value here as the auth listener will update it
      
      // Update display name if provided
      if (displayName && userCredential.user) {
        await updateUserProfile(userCredential.user, { displayName });
        console.log("Updated user with display name:", displayName);
      }
      
      return userCredential;
    } catch (err) {
      console.error('Registration error:', err);
      // Make error message more user-friendly
      if ((err as Error).message.includes('auth/email-already-in-use')) {
        error.value = 'Email này đã được sử dụng. Vui lòng chọn email khác.';
      } else if ((err as Error).message.includes('auth/invalid-email')) {
        error.value = 'Email không hợp lệ.';
      } else if ((err as Error).message.includes('auth/weak-password')) {
        error.value = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.';
      } else if ((err as Error).message.includes('auth/configuration-not-found')) {
        error.value = 'Lỗi cấu hình Firebase. Vui lòng kiểm tra cấu hình và thử lại.';
      } else {
        error.value = (err as Error).message;
      }
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Log in a user
  const login = async (email: string, password: string) => {
    loading.value = true;
    error.value = null;
    try {
      const userCredential = await loginUser(email, password);
      // We don't need to set user.value here as the auth listener will update it
      return userCredential;
    } catch (err) {
      console.error('Login error:', err);
      // Make error message more user-friendly
      if ((err as Error).message.includes('auth/invalid-credential')) {
        error.value = 'Email hoặc mật khẩu không đúng.';
      } else if ((err as Error).message.includes('auth/user-not-found')) {
        error.value = 'Tài khoản không tồn tại.';
      } else if ((err as Error).message.includes('auth/wrong-password')) {
        error.value = 'Mật khẩu không đúng.';
      } else if ((err as Error).message.includes('auth/configuration-not-found')) {
        error.value = 'Lỗi cấu hình Firebase. Vui lòng kiểm tra cấu hình và thử lại.';
      } else {
        error.value = (err as Error).message;
      }
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Log out a user
  const logout = async () => {
    loading.value = true;
    error.value = null;
    try {
      await logoutUser();
      // We don't need to set user.value = null here as the auth listener will update it
    } catch (err) {
      error.value = (err as Error).message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    if (!user.value) return null;
    
    try {
      await user.value.reload();
      // Force an update to ensure reactive changes
      user.value = { ...user.value };
      console.log('User data refreshed, display name:', user.value.displayName);
      return user.value;
    } catch (err) {
      console.error('Error refreshing user:', err);
      return user.value;
    }
  };

  // Initialize auth state on first usage
  initAuth();

  return {
    user,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    refreshUser
  };
}; 