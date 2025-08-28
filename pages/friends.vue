<template>
  <div class="friends-page">
    <div class="page-container">
      <h1 class="page-title">Quản lý bạn bè</h1>
      
      <!-- Tabs -->
      <div class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.value"
          @click="currentTab = tab.value"
          :class="['tab', { active: currentTab === tab.value }]"
        >
          {{ tab.label }}
          <span v-if="tab.value === 'requests' && pendingRequests.length" 
                class="tab-badge">
            {{ pendingRequests.length }}
          </span>
        </button>
      </div>

      <!-- Search and Add Friend -->
      <div v-if="currentTab === 'all'" class="search-section">
        <div class="search-container">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Tìm kiếm theo email hoặc tên..."
            class="search-input"
          />
        </div>
      </div>

      <!-- Users List -->
      <div v-if="currentTab === 'all'" class="users-list">
        <div v-for="userItem in paginatedUsers" :key="userItem.uid" 
             class="user-card">
          <div class="user-info-container">
            <Avatar 
              :email="userItem.email" 
              :name="userItem.displayName"
              size="medium"
            />
            <div class="user-details">
              <NuxtLink 
                :to="`/profile/${userItem.uid}`"
                class="user-name-link"
              >
                {{ userItem.displayName || 'Chưa đặt tên' }}
              </NuxtLink>
              <div class="user-email">{{ userItem.email }}</div>
            </div>
          </div>
          
          <div v-if="!isFriend(userItem) && userItem.uid !== user?.uid">
            <!-- Received request buttons -->
            <div v-if="hasReceivedRequestFrom(userItem)" class="action-buttons">
              <button @click="handleAcceptRequest(getFriendRequest(userItem))" 
                      class="action-button accept">
                Chấp nhận
              </button>
              <button @click="handleRejectRequest(getFriendRequest(userItem))" 
                      class="action-button reject">
                Từ chối
              </button>
            </div>
            <!-- Sent request status -->
            <div v-else-if="hasSentRequestTo(userItem)" 
                 class="status-badge pending">
              Đã gửi lời mời
            </div>
            <!-- Send request button -->
            <button v-else
                    @click="sendRequest(userItem.email)"
                    :disabled="isSubmitting"
                    class="action-button add-friend">
              Thêm bạn
            </button>
          </div>
          <div v-else-if="isFriend(userItem)" class="friend-status">
            <span class="status-text">Đã là bạn</span>
          </div>
        </div>
      </div>

      <!-- Friends List -->
      <div v-if="currentTab === 'friends'" class="users-list">
        <div v-for="friend in friends" :key="friend.id" class="user-card">
          <div class="user-info-container">
            <Avatar 
              :email="friend.email" 
              :name="friend.displayName"
              size="medium"
            />
            <div class="user-details">
              <NuxtLink 
                :to="`/profile/${friend.id}`"
                class="user-name-link"
              >
                {{ friend.displayName || 'Chưa đặt tên' }}
              </NuxtLink>
              <div class="user-email">{{ friend.email }}</div>
            </div>
          </div>
          <button @click="handleRemoveFriend(friend)" 
                  class="remove-friend-button">
            <i class="fas fa-user-minus"></i>
            <span class="remove-text">Hủy kết bạn</span>
          </button>
        </div>
        <div v-if="friends.length === 0" class="empty-state">
          Bạn chưa có người bạn nào
        </div>
      </div>

      <!-- Friend Requests -->
      <div v-if="currentTab === 'requests'" class="users-list">
        <div v-for="request in pendingRequests" :key="request.id"
             class="request-card">
          <div class="user-info-container">
            <Avatar 
              :email="request.senderEmail" 
              size="medium"
            />
            <div class="user-details">
              <div class="user-name">{{ request.senderEmail }}</div>
              <div class="request-time">
                {{ new Date(request.createdAt).toLocaleDateString() }}
              </div>
            </div>
          </div>
          <div class="action-buttons">
            <button @click="handleAcceptRequest(request)"
                    class="action-button accept">
              Chấp nhận
            </button>
            <button @click="handleRejectRequest(request)"
                    class="action-button reject">
              Từ chối
            </button>
          </div>
        </div>
        <div v-if="pendingRequests.length === 0" class="empty-state">
          Không có lời mời kết bạn nào
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="currentTab === 'all'" class="pagination">
        <button
          v-for="page in totalPages"
          :key="page"
          @click="currentPage = page"
          :class="['page-button', { active: currentPage === page }]"
        >
          {{ page }}
        </button>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Xác nhận hủy kết bạn</h3>
          <button class="close-button" @click="closeConfirmModal">×</button>
        </div>
        <div class="modal-body">
          <p v-if="selectedFriend">
            Bạn có chắc muốn hủy kết bạn với {{ selectedFriend.displayName || selectedFriend.email }}?
          </p>
        </div>
        <div class="modal-footer">
          <button class="cancel-button" @click="closeConfirmModal">Hủy</button>
          <button class="confirm-button" @click="confirmRemoveFriend">Xác nhận</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { collection, query, where, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '~/plugins/firebase';
import { useAuth } from '~/composables/useAuth';
import { useFriends } from '~/composables/useFriends';
import Avatar from '~/components/Avatar.vue';

definePageMeta({
  middleware: 'auth'
});

const { user } = useAuth();
const { 
  friends, 
  friendRequests, 
  pendingRequests, 
  loading: friendsLoading, 
  sendFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest, 
  removeFriend, 
  setupFriendRequestsListener,
  setupFriendsListener 
} = useFriends();

const ITEMS_PER_PAGE = 10;
const currentTab = ref('all');
const currentPage = ref(1);
const searchQuery = ref('');
const allUsers = ref([]);
const filteredUsers = ref([]);
const isSubmitting = ref(false);
const loading = ref(true);
let unsubscribeUsers = null;
let unsubscribeFriends = null;
let unsubscribeRequests = null;

// Computed properties for pagination
const totalFilteredUsers = computed(() => filteredUsers.value.length);
const totalPages = computed(() => Math.ceil(totalFilteredUsers.value / ITEMS_PER_PAGE));

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  return filteredUsers.value.slice(start, end);
});

// Add debounce function
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Watch for search query changes with debounce
watch(searchQuery, debounce((newQuery) => {
  if (!newQuery.trim()) {
    filteredUsers.value = [...allUsers.value];
  } else {
    const query = newQuery.toLowerCase().trim();
    filteredUsers.value = allUsers.value.filter(user => {
      const emailMatch = user.email?.toLowerCase().includes(query);
      const nameMatch = user.displayName?.toLowerCase().includes(query);
      return emailMatch || nameMatch;
    });
  }
  currentPage.value = 1;
}, 300));

// Fetch all users with realtime updates
const setupUsersListener = () => {
  if (!user.value) return;
  
  loading.value = true;
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    
    unsubscribeUsers = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const users = snapshot.docs
          .map(doc => ({
            uid: doc.id,
            email: doc.data().email,
            displayName: doc.data().displayName,
            photoURL: doc.data().photoURL,
            createdAt: doc.data().createdAt?.toDate(),
          }))
          .filter(u => u.uid !== user.value?.uid);

        allUsers.value = users;
        if (!searchQuery.value.trim()) {
          filteredUsers.value = [...users];
        }
      } else {
        allUsers.value = [];
        filteredUsers.value = [];
      }
      loading.value = false;
    });
  } catch (error) {
    console.error('Error setting up users listener:', error);
    loading.value = false;
  }
};

// Get friend request object
const getFriendRequest = (userItem) => {
  return friendRequests.value.find(request => 
    (request.senderId === userItem.uid && request.receiverId === user.value?.uid) ||
    (request.receiverId === userItem.uid && request.senderId === user.value?.uid)
  );
};

// Tabs data
const tabs = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Bạn bè', value: 'friends' },
  { label: 'Lời mời', value: 'requests' }
];

// Send friend request
const sendRequest = async (email) => {
  if (!email || isSubmitting.value) return;
  
  isSubmitting.value = true;
  try {
    await sendFriendRequest(email);
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

// Check if users are friends
const isFriend = (userItem) => {
  return friends.value.some(friend => 
    friend.id === userItem.uid || friend.email === userItem.email
  );
};

// Check if there's a pending friend request
const hasReceivedRequestFrom = (userItem) => {
  return friendRequests.value.find(request => 
    request.status === 'pending' && 
    request.senderId === userItem.uid && 
    request.receiverId === user.value?.uid
  );
};

const hasSentRequestTo = (userItem) => {
  return friendRequests.value.find(request => 
    request.status === 'pending' && 
    request.receiverId === userItem.uid && 
    request.senderId === user.value?.uid
  );
};

// Handle friend request actions
const handleAcceptRequest = async (request) => {
  if (!request) return;
  
  try {
    await acceptFriendRequest(request.id);
  } catch (error) {
    console.error('Error accepting friend request:', error);
    alert('Có lỗi xảy ra khi chấp nhận lời mời kết bạn');
  }
};

const handleRejectRequest = async (request) => {
  if (!request) return;
  
  try {
    await rejectFriendRequest(request.id);
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    alert('Có lỗi xảy ra khi từ chối lời mời kết bạn');
  }
};

// Add new refs for modal
const showConfirmModal = ref(false);
const selectedFriend = ref(null);

// Update remove friend handlers
const handleRemoveFriend = (friend) => {
  console.log('Selected friend for removal:', friend); // Debug log
  if (!friend || !friend.id) {
    console.error('Invalid friend object:', friend);
    return;
  }
  selectedFriend.value = friend;
  showConfirmModal.value = true;
};

const closeConfirmModal = () => {
  showConfirmModal.value = false;
  selectedFriend.value = null;
};

const confirmRemoveFriend = async () => {
  console.log('Confirming remove friend:', selectedFriend.value); // Debug log
  
  if (!selectedFriend.value || !selectedFriend.value.id) {
    console.error('No friend selected for removal or invalid friend ID');
    return;
  }

  try {
    await removeFriend(selectedFriend.value.id);
    closeConfirmModal();
  } catch (error) {
    console.error('Error removing friend:', error);
    alert('Có lỗi xảy ra khi hủy kết bạn. Vui lòng thử lại sau.');
  }
};

// Setup listeners on mount
onMounted(async () => {
  if (user.value) {
    setupUsersListener();
    unsubscribeFriends = setupFriendsListener();
    unsubscribeRequests = setupFriendRequestsListener();
  }
});

// Cleanup listeners on unmount
onUnmounted(() => {
  if (unsubscribeUsers) unsubscribeUsers();
  if (unsubscribeFriends) unsubscribeFriends();
  if (unsubscribeRequests) unsubscribeRequests();
});
</script>

<style scoped>
.friends-page {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 24px;
  border-left: 4px solid #4CAF50;
  padding-left: 12px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  background: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.tab {
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.tab:hover {
  background: #f5f5f5;
  color: #4CAF50;
}

.tab.active {
  background: #4CAF50;
  color: white;
}

.tab-badge {
  display: inline-block;
  background: #ff5252;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  margin-left: 8px;
}

/* Search */
.search-section {
  margin-bottom: 24px;
}

.search-container {
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.search-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76,175,80,0.1);
}

/* Users List */
.users-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.user-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.2s;
}

.user-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.user-info-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-weight: 600;
  color: #333;
}

.user-email {
  font-size: 14px;
  color: #666;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button.add-friend {
  background: #4CAF50;
  color: white;
}

.action-button.add-friend:hover:not(:disabled) {
  background: #45a049;
}

.action-button.accept {
  background: #4CAF50;
  color: white;
}

.action-button.accept:hover {
  background: #45a049;
}

.action-button.reject {
  background: #f44336;
  color: white;
}

.action-button.reject:hover {
  background: #d32f2f;
}

.status-badge {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
}

.status-badge.pending {
  background: #f5f5f5;
  color: #666;
}

.friend-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  color: #4CAF50;
  font-size: 14px;
}

.remove-friend-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: none;
  border: 1px solid #ff5252;
  color: #ff5252;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.remove-friend-button:hover {
  background: #ff5252;
  color: white;
}

.remove-friend-button i {
  font-size: 16px;
}

.remove-text {
  display: inline-block;
}

/* Request Card */
.request-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.request-time {
  font-size: 12px;
  color: #666;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
  background: white;
  border-radius: 8px;
  grid-column: 1 / -1;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
}

.page-button {
  min-width: 36px;
  height: 36px;
  border: none;
  background: #f5f5f5;
  color: #666;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-button:hover {
  background: #e0e0e0;
}

.page-button.active {
  background: #4CAF50;
  color: white;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }

  .tabs {
    overflow-x: auto;
    padding: 8px;
  }

  .tab {
    padding: 8px 16px;
    white-space: nowrap;
  }

  .users-list {
    grid-template-columns: 1fr;
  }

  .user-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .action-buttons {
    width: 100%;
  }

  .action-button {
    flex: 1;
    text-align: center;
  }

  .friend-status {
    width: 100%;
    justify-content: space-between;
  }

  .remove-text {
    display: none;
  }
  
  .remove-friend-button {
    padding: 8px;
  }
  
  .remove-friend-button i {
    margin: 0;
  }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  animation: modal-appear 0.3s ease;
}

.modal-header {
  padding: 16px;
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
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0 8px;
}

.close-button:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
  color: #666;
}

.modal-footer {
  padding: 16px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-button,
.confirm-button {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button {
  background: #f5f5f5;
  color: #666;
}

.cancel-button:hover {
  background: #e0e0e0;
}

.confirm-button {
  background: #ff5252;
  color: white;
}

.confirm-button:hover {
  background: #ff1744;
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

.user-name-link {
  font-weight: 600;
  color: #333;
  text-decoration: none;
  transition: color 0.2s;
}

.user-name-link:hover {
  color: #4CAF50;
  text-decoration: underline;
}
</style> 