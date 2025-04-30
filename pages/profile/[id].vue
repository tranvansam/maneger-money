<template>
  <div class="profile-page">
    <head>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </head>

    <!-- Breadcrumb navigation -->
    <div class="breadcrumb-container">
      <div class="breadcrumb-content">
        <button @click="$router.back()" class="back-button">
          <i class="fas fa-arrow-left"></i>
          <span>Quay lại</span>
        </button>
        <div class="breadcrumb">
          <NuxtLink to="/" class="breadcrumb-item">Trang chủ</NuxtLink>
          <i class="fas fa-chevron-right separator"></i>
          <NuxtLink to="/friends" class="breadcrumb-item">Bạn bè</NuxtLink>
          <i class="fas fa-chevron-right separator"></i>
          <span class="breadcrumb-item current">Trang cá nhân</span>
        </div>
      </div>
    </div>

    <div class="profile-container">
      <!-- Basic Info Section -->
      <div class="profile-header">
        <Avatar 
          :email="profileData?.email" 
          :name="profileData?.displayName"
          size="large"
        />
        <div class="profile-basic-info">
          <div v-if="isOwnProfile && isEditing" class="edit-field">
            <input 
              v-model="editableProfile.displayName" 
              type="text" 
              placeholder="Nhập tên của bạn"
              class="edit-input"
            >
          </div>
          <h1 v-else class="profile-name">{{ profileData?.displayName || 'Chưa đặt tên' }}</h1>
          <p class="profile-email">{{ profileData?.email }}</p>
          <button v-if="isOwnProfile" 
                  @click="toggleEdit" 
                  class="edit-button">
            <i :class="isEditing ? 'fas fa-check' : 'fas fa-edit'"></i>
            {{ isEditing ? 'Lưu thay đổi' : 'Chỉnh sửa thông tin' }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <p>Đang tải thông tin...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
      </div>

      <!-- Content when loaded -->
      <div v-else class="profile-content">
        <!-- Friend Status -->
        <div v-if="!isOwnProfile" class="friend-status-section">
          <div v-if="isFriend" class="is-friend">
            <i class="fas fa-user-check"></i>
            <span>Đã là bạn bè</span>
          </div>
          <div v-else-if="hasSentRequest" class="request-sent">
            <i class="fas fa-clock"></i>
            <span>Đã gửi lời mời kết bạn</span>
          </div>
          <button v-else
                  @click="handleSendRequest(profileData.email)"
                  :disabled="isSubmitting"
                  class="add-friend-button">
            <i class="fas fa-user-plus"></i>
            Thêm bạn
          </button>
        </div>

        <!-- Profile Information -->
        <div v-if="isFriend || isOwnProfile" class="profile-info">
          <!-- Contact Information -->
          <div class="info-section">
            <h2>Thông tin liên hệ</h2>
            <div v-if="isOwnProfile && isEditing">
              <div class="edit-field">
                <label>Số điện thoại</label>
                <input 
                  v-model="editableProfile.phone" 
                  type="tel" 
                  placeholder="Nhập số điện thoại"
                  class="edit-input"
                >
              </div>
              <div class="edit-field">
                <label>Địa chỉ</label>
                <input 
                  v-model="editableProfile.address" 
                  type="text" 
                  placeholder="Nhập địa chỉ"
                  class="edit-input"
                >
              </div>
            </div>
            <div v-else>
              <div class="info-item" v-if="profileData?.phone">
                <i class="fas fa-phone"></i>
                <span>{{ profileData.phone }}</span>
              </div>
              <div class="info-item" v-if="profileData?.address">
                <i class="fas fa-map-marker-alt"></i>
                <span>{{ profileData.address }}</span>
              </div>
              <div v-if="!profileData?.phone && !profileData?.address" class="no-info">
                Chưa cập nhật thông tin liên hệ
              </div>
            </div>
          </div>

          <!-- Bank Accounts Section -->
          <div class="bank-accounts-section">
            <div class="section-header">
              <h2>Tài khoản ngân hàng</h2>
              <button v-if="isOwnProfile" 
                      @click="showAddBankModal = true"
                      class="add-button">
                <i class="fas fa-plus"></i>
                Thêm tài khoản
              </button>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="loading-state">
              <p>Đang tải thông tin...</p>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="error-state">
              <p>{{ error }}</p>
            </div>

            <!-- Content when loaded -->
            <div v-else>
              <template v-if="showBankAccounts">
                <div v-if="bankAccounts.length > 0" class="bank-accounts-grid">
                  <div v-for="account in bankAccounts" 
                       :key="account.id" 
                       class="bank-account-card">
                    <div class="bank-logo">
                      <img :src="account.bankLogo" :alt="account.bankName">
                    </div>
                    <div class="bank-details">
                      <div class="bank-name">
                        <div class="value-with-copy">
                          <span>{{ account.bankName }}</span>
                          <button @click="copyWithNotification(account.bankName, 'tên ngân hàng')" 
                                  class="copy-button"
                                  title="Sao chép tên ngân hàng">
                            <i class="fas fa-copy"></i>
                          </button>
                        </div>
                      </div>
                      <div class="account-info">
                        <div class="info-row">
                          <span class="label">STK:</span>
                          <div class="value-with-copy">
                            <span>{{ account.accountNumber }}</span>
                            <button @click="copyWithNotification(account.accountNumber, 'số tài khoản')" 
                                    class="copy-button"
                                    title="Sao chép số tài khoản">
                              <i class="fas fa-copy"></i>
                            </button>
                          </div>
                        </div>
                        <div class="info-row">
                          <span class="label">Chủ TK:</span>
                          <div class="value-with-copy">
                            <span>{{ account.accountName }}</span>
                            <button @click="copyWithNotification(account.accountName, 'tên chủ tài khoản')" 
                                    class="copy-button"
                                    title="Sao chép tên chủ tài khoản">
                              <i class="fas fa-copy"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button v-if="isOwnProfile"
                            @click="removeBankAccount(account.id)"
                            class="remove-button"
                            title="Xóa tài khoản">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div v-else class="no-info">
                  Chưa có tài khoản ngân hàng nào
                </div>
              </template>
              <div v-else class="private-info-message">
                <i class="fas fa-lock"></i>
                <p>Hãy kết bạn để xem thông tin chi tiết</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Bank Modal -->
    <div v-if="showAddBankModal" class="modal-overlay" @click.self="showAddBankModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Thêm tài khoản ngân hàng</h3>
          <button @click="showAddBankModal = false" class="close-button">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Tên ngân hàng</label>
            <input 
              v-model="newBank.bankName"
              type="text"
              placeholder="VD: Vietcombank"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label>Số tài khoản</label>
            <input 
              v-model="newBank.accountNumber"
              type="text"
              placeholder="Nhập số tài khoản"
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label>Tên chủ tài khoản</label>
            <input 
              v-model="newBank.accountName"
              type="text"
              placeholder="Nhập tên chủ tài khoản"
              class="form-input"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showAddBankModal = false" class="cancel-button">
            Hủy
          </button>
          <button @click="addBankAccount" 
                  :disabled="!isValidBankForm"
                  class="submit-button">
            Thêm tài khoản
          </button>
        </div>
      </div>
    </div>

    <!-- Notification -->
    <div v-if="showNotification" 
         class="notification"
         :class="{ 'notification-show': showNotification }">
      {{ notificationMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '~/plugins/firebase';
import { useAuth } from '~/composables/useAuth';
import { useFriends } from '~/composables/useFriends';
import Avatar from '~/components/Avatar.vue';

const route = useRoute();
const { user } = useAuth();
const { friends, sendFriendRequest, setupFriendsListener } = useFriends();

const profileData = ref(null);
const bankAccounts = ref([]);
const loading = ref(true);
const error = ref(null);
const isSubmitting = ref(false);
const isEditing = ref(false);
const showAddBankModal = ref(false);

// Editable profile data
const editableProfile = ref({
  displayName: '',
  phone: '',
  address: ''
});

// New bank account form
const newBank = ref({
  bankName: '',
  accountNumber: '',
  accountName: ''
});

// Add these new refs for notification
const showNotification = ref(false);
const notificationMessage = ref('');

// Computed properties
const isOwnProfile = computed(() => user.value?.uid === route.params.id);
const isFriend = computed(() => {
  const result = friends.value?.some(friend => friend.id === route.params.id);
  console.log('Checking friend status:', {
    friendsList: friends.value,
    currentProfileId: route.params.id,
    isFriend: result
  });
  return result;
});
const hasSentRequest = ref(false);

const isValidBankForm = computed(() => {
  return newBank.value.bankName && 
         newBank.value.accountNumber && 
         newBank.value.accountName;
});

// Toggle edit mode
const toggleEdit = async () => {
  if (isEditing.value) {
    // Save changes
    try {
      const userRef = doc(db, 'users', user.value.uid);
      await updateDoc(userRef, {
        displayName: editableProfile.value.displayName,
        phone: editableProfile.value.phone,
        address: editableProfile.value.address
      });
      
      // Update local data
      profileData.value = {
        ...profileData.value,
        ...editableProfile.value
      };
      
      isEditing.value = false;
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Có lỗi xảy ra khi lưu thông tin');
    }
  } else {
    // Enter edit mode
    editableProfile.value = {
      displayName: profileData.value?.displayName || '',
      phone: profileData.value?.phone || '',
      address: profileData.value?.address || ''
    };
    isEditing.value = true;
  }
};

// Add new bank account
const addBankAccount = async () => {
  if (!isValidBankForm.value) return;

  try {
    const bankData = {
      userId: user.value.uid,
      bankName: newBank.value.bankName,
      accountNumber: newBank.value.accountNumber,
      accountName: newBank.value.accountName,
      createdAt: new Date()
    };

    await addDoc(collection(db, 'bankAccounts'), bankData);
    
    // Reset form and close modal
    newBank.value = {
      bankName: '',
      accountNumber: '',
      accountName: ''
    };
    showAddBankModal.value = false;
    
    // Refresh bank accounts
    await fetchBankAccounts();
  } catch (err) {
    console.error('Error adding bank account:', err);
    alert('Có lỗi xảy ra khi thêm tài khoản ngân hàng');
  }
};

// Remove bank account
const removeBankAccount = async (accountId) => {
  if (!confirm('Bạn có chắc muốn xóa tài khoản ngân hàng này?')) return;

  try {
    await deleteDoc(doc(db, 'bankAccounts', accountId));
    await fetchBankAccounts();
  } catch (err) {
    console.error('Error removing bank account:', err);
    alert('Có lỗi xảy ra khi xóa tài khoản ngân hàng');
  }
};

// New copy function with notification
const copyWithNotification = async (text, fieldName) => {
  try {
    await navigator.clipboard.writeText(text);
    notificationMessage.value = `Đã sao chép ${fieldName}`;
    showNotification.value = true;
    
    // Auto hide after 1 second
    setTimeout(() => {
      showNotification.value = false;
    }, 1000);
  } catch (err) {
    console.error('Copy failed:', err);
    notificationMessage.value = 'Không thể sao chép. Vui lòng thử lại.';
    showNotification.value = true;
  }
};

// Setup friends listener on mount
onMounted(() => {
  if (user.value) {
    const unsubscribe = setupFriendsListener();
    onUnmounted(() => {
      if (unsubscribe) unsubscribe();
    });
  }
});

// Fetch user profile data
const fetchProfileData = async () => {
  if (!user.value) return;
  
  loading.value = true;
  try {
    const userDoc = await getDoc(doc(db, 'users', route.params.id));
    if (!userDoc.exists()) {
      error.value = 'Không tìm thấy người dùng';
      return;
    }
    
    profileData.value = {
      ...userDoc.data(),
      id: userDoc.id
    };

    console.log('Profile data loaded:', {
      profileData: profileData.value,
      isFriend: isFriend.value,
      isOwnProfile: isOwnProfile.value
    });

    // Fetch bank accounts if user is friend or own profile
    if (isOwnProfile.value || isFriend.value) {
      console.log('Fetching bank accounts...');
      await fetchBankAccounts();
    }

    // Check if friend request is pending
    if (!isOwnProfile.value) {
      await checkFriendRequest();
    }
  } catch (err) {
    console.error('Error fetching profile:', err);
    error.value = 'Có lỗi xảy ra khi tải thông tin';
  } finally {
    loading.value = false;
  }
};

// Fetch bank accounts
const fetchBankAccounts = async () => {
  console.log('Fetching bank accounts for:', {
    profileId: route.params.id,
    isFriend: isFriend.value,
    isOwnProfile: isOwnProfile.value,
    currentUser: user.value?.uid
  });

  if (!route.params.id || (!isOwnProfile.value && !isFriend.value)) {
    console.log('Not authorized to view bank accounts');
    bankAccounts.value = [];
    return;
  }

  try {
    // Create query to get bank accounts
    const bankAccountsRef = collection(db, 'bankAccounts');
    const bankQuery = query(
      bankAccountsRef,
      where('userId', '==', route.params.id)
    );

    // Execute query
    const snapshot = await getDocs(bankQuery);
    console.log('Bank accounts query result:', {
      empty: snapshot.empty,
      size: snapshot.size,
      docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    });

    // Map documents to bank accounts array
    bankAccounts.value = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        bankLogo: data.bankLogo || `https://placehold.co/100x100?text=${encodeURIComponent(data.bankName)}`
      };
    });

    console.log('Bank accounts loaded:', bankAccounts.value);
  } catch (err) {
    console.error('Error fetching bank accounts:', err);
    bankAccounts.value = [];
  }
};

// Check if friend request is pending
const checkFriendRequest = async () => {
  if (!user.value || isOwnProfile.value) return;

  try {
    const requestQuery = query(
      collection(db, 'friendships'),
      where('senderId', '==', user.value.uid),
      where('receiverId', '==', route.params.id),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(requestQuery);
    hasSentRequest.value = !snapshot.empty;
  } catch (err) {
    console.error('Error checking friend request:', err);
  }
};

// Handle send friend request
const handleSendRequest = async (email) => {
  if (!email || isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    await sendFriendRequest(email);
    hasSentRequest.value = true;
  } catch (error) {
    console.error('Error sending friend request:', error);
    let errorMessage = 'Có lỗi xảy ra khi gửi lời mời kết bạn';
    
    if (error.message === 'Friend request already exists') {
      errorMessage = 'Đã có lời mời kết bạn đang chờ xử lý';
    } else if (error.message === 'Already friends') {
      errorMessage = 'Các bạn đã là bạn bè';
    } else if (error.message === 'User not found') {
      errorMessage = 'Không tìm thấy người dùng với email này';
    } else if (error.message === 'Cannot send friend request to yourself') {
      errorMessage = 'Bạn không thể gửi lời mời kết bạn cho chính mình';
    }
    
    alert(errorMessage);
  } finally {
    isSubmitting.value = false;
  }
};

// Watch for changes in friends list or route
watch([() => friends.value, () => route.params.id], async ([newFriends, newId]) => {
  console.log('Friends or route changed:', {
    newFriends,
    newId,
    currentLoading: loading.value
  });
  
  if (loading.value) return;
  
  if (newId || (newFriends && isFriend.value)) {
    await fetchProfileData();
  }
}, { immediate: true });

// Watch for changes in friend status and profile ID
watch([() => route.params.id, isFriend, isOwnProfile], async ([newId, newIsFriend, newIsOwnProfile]) => {
  console.log('Profile or friend status changed:', {
    profileId: newId,
    isFriend: newIsFriend,
    isOwnProfile: newIsOwnProfile
  });

  if (newId && (newIsFriend || newIsOwnProfile)) {
    await fetchBankAccounts();
  } else {
    bankAccounts.value = [];
  }
}, { immediate: true });

// Template section
const showBankAccounts = computed(() => {
  const canView = isOwnProfile.value || isFriend.value;
  console.log('Can view bank accounts?', {
    isOwnProfile: isOwnProfile.value,
    isFriend: isFriend.value,
    canView
  });
  return canView;
});

// Fetch data on mount
onMounted(fetchProfileData);
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 20px;
}

.profile-container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
}

.profile-basic-info {
  flex: 1;
}

.profile-name {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
}

.profile-email {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.friend-status-section {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.is-friend {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4CAF50;
  font-size: 16px;
}

.info-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.info-section h2 {
  font-size: 18px;
  color: #333;
  margin: 0 0 16px 0;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.info-item i {
  color: #4CAF50;
  width: 20px;
}

.bank-accounts-section {
  margin-top: 24px;
}

.bank-accounts-section h2 {
  font-size: 18px;
  color: #333;
  margin: 0 0 16px 0;
}

.bank-accounts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.bank-account-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  gap: 12px;
}

.bank-logo {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bank-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bank-details {
  flex: 1;
}

.bank-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  color: #666;
  min-width: 60px;
}

.value-with-copy {
  display: flex;
  align-items: center;
  gap: 8px;
}

.copy-button {
  background: none;
  border: none;
  color: #9e9e9e;
  cursor: pointer;
  padding: 4px;
  transition: all 0.2s;
}

.copy-button:hover {
  color: #4CAF50;
  transform: scale(1.1);
}

.no-info {
  text-align: center;
  color: #666;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  font-size: 14px;
}

.private-info-message {
  text-align: center;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 8px;
  color: #666;
}

.private-info-message i {
  font-size: 32px;
  color: #999;
  margin-bottom: 16px;
}

.add-friend-button {
  padding: 8px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}

.add-friend-button:hover:not(:disabled) {
  background: #45a049;
}

.add-friend-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.request-sent {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4CAF50;
  font-size: 14px;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 20px;
  color: #666;
  background: #f8f9fa;
  border-radius: 8px;
  margin-top: 16px;
}

.loading-state {
  color: #4CAF50;
}

.error-state {
  color: #f44336;
}

.edit-button {
  margin-top: 12px;
  padding: 8px 16px;
  background: none;
  border: 1px solid #4CAF50;
  color: #4CAF50;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.edit-button:hover {
  background: #4CAF50;
  color: white;
}

.edit-field {
  margin-bottom: 16px;
}

.edit-field label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
}

.edit-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  transition: all 0.2s;
}

.edit-input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76,175,80,0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.add-button {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}

.add-button:hover {
  background: #45a049;
}

.remove-button {
  background: none;
  border: none;
  color: #ff5252;
  cursor: pointer;
  padding: 8px;
  transition: all 0.2s;
  opacity: 0;
}

.bank-account-card:hover .remove-button {
  opacity: 1;
}

.remove-button:hover {
  color: #f44336;
  transform: scale(1.1);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  animation: modal-appear 0.3s ease;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 20px;
  padding: 4px;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76,175,80,0.1);
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-button,
.submit-button {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button {
  background: none;
  border: 1px solid #ddd;
  color: #666;
}

.submit-button {
  background: #4CAF50;
  border: none;
  color: white;
}

.cancel-button:hover {
  background: #f5f5f5;
}

.submit-button:hover:not(:disabled) {
  background: #45a049;
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .profile-page {
    padding: 12px;
  }

  .profile-container {
    padding: 16px;
  }

  .profile-header {
    flex-direction: column;
    text-align: center;
  }

  .bank-accounts-grid {
    grid-template-columns: 1fr;
  }

  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .label {
    min-width: auto;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .add-button {
    width: 100%;
    justify-content: center;
  }

  .remove-button {
    opacity: 1;
  }

  .modal-content {
    margin: 20px;
  }
}

/* Notification styles */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  opacity: 0;
  transform: translateY(-20px);
  transition: all 0.3s ease;
  z-index: 1000;
}

.notification-show {
  opacity: 1;
  transform: translateY(0);
}

/* Breadcrumb styles */
.breadcrumb-container {
  background: white;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.breadcrumb-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  background: #f5f5f5;
  color: #666;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.back-button:hover {
  background: #e0e0e0;
  color: #333;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  flex-wrap: wrap;
}

.breadcrumb-item {
  color: #666;
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumb-item:not(.current):hover {
  color: #4CAF50;
  text-decoration: underline;
}

.breadcrumb-item.current {
  color: #4CAF50;
  font-weight: 500;
}

.separator {
  font-size: 12px;
  color: #999;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .breadcrumb-container {
    margin: 0 0 12px 0;
    border-radius: 0;
  }

  .breadcrumb-content {
    padding: 8px 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .back-button {
    padding: 6px 12px;
  }

  .breadcrumb {
    font-size: 13px;
  }
}
</style> 