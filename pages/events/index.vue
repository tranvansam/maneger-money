<template>
    <div class="events-page">
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">Đang tải dữ liệu...</div>
      </div>
  
      <div class="page-header">
        <h1 class="page-title">Quản lý sự kiện</h1>
        <div class="header-actions">
          <div class="search-container">
            <div class="search-input-wrapper">
              <i class="fas fa-search search-icon"></i>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Tìm kiếm sự kiện..."
                class="search-input"
              />
            </div>
          </div>
          <div v-if="friends.length > 0">
            <button @click="showAddEventModal = true" class="add-button">
              <i class="fas fa-plus"></i>
              Thêm sự kiện
            </button>
          </div>
          <div v-else>
            <NuxtLink to="/friends" class="add-friends-button">
              <i class="fas fa-user-plus"></i>
              Thêm bạn bè
            </NuxtLink>
          </div>
        </div>
      </div>
  
      <!-- No friends message -->
      <div v-if="friends.length === 0" class="no-friends-message">
        <i class="fas fa-users"></i>
        <p>Bạn cần có ít nhất một người bạn để tạo sự kiện</p>
        <p class="sub-text">Hãy thêm bạn bè để bắt đầu tạo và chia sẻ sự kiện!</p>
      </div>
  
      <!-- Events list with search -->
      <div v-else class="events-grid">
        <div v-if="filteredEvents.length === 0" class="no-events-message">
          <template v-if="searchQuery">
            <i class="fas fa-search"></i>
            <p>Không tìm thấy sự kiện nào phù hợp</p>
          </template>
          <template v-else>
            <i class="fas fa-calendar-plus"></i>
            <p>Chưa có sự kiện nào</p>
            <p class="sub-text">Hãy tạo sự kiện đầu tiên của bạn!</p>
          </template>
        </div>
        
        <div v-for="event in filteredEvents" 
             :key="event.id" 
             class="event-card" @click="navigateToDetail(event.id)">
          <div class="event-header">
            <div class="event-creator">
              <Avatar 
                :email="event.createdBy?.email"
                :name="event.createdBy?.displayName"
                size="medium"
                class="creator-avatar"
                @click.stop="navigateToProfile(event.createdBy.uid)"
              />
              <div class="creator-info">
                <h3 class="event-title">{{ event.name }}</h3>
                <div class="creator-name" @click.stop="navigateToProfile(event.createdBy.uid)">
                  {{ event.createdBy?.displayName || event.createdBy?.email }}
                </div>
              </div>
            </div>
            <span class="event-status" :class="{ 'active': !event.isEnded, 'ended': event.isEnded }">
              {{ event.isEnded ? 'Đã kết thúc' : 'Đang diễn ra' }}
            </span>
          </div>
  
          <p class="event-description">{{ event.description || 'Không có mô tả' }}</p>
          
          <div class="event-details">
            <div class="detail-item">
              <i class="fas fa-calendar"></i>
              <span>{{ formatDate(event.startDate) }}</span>
            </div>
            <div class="detail-item" v-if="event.location">
              <i class="fas fa-map-marker-alt"></i>
              <span>{{ event.location }}</span>
            </div>
          </div>
  
          <div class="event-info">
            <div class="participants">
              <div class="participants-avatars">
                <Avatar 
                  v-for="participant in event.participants?.slice(0, 3)" 
                  :key="participant.uid"
                  :email="participant.email"
                  :name="participant.displayName"
                  size="small"
                  class="participant-avatar"
                  @click.stop="navigateToProfile(participant.uid)"
                />
                <div v-if="event.participants?.length > 3" class="more-participants">
                  +{{ event.participants.length - 3 }}
                </div>
              </div>
              <span class="info-label">{{ event.participants?.length || 0 }} người tham gia</span>
            </div>
            <div class="total-amount">
              <span class="info-label">Tổng chi tiêu:</span>
              <span class="info-value">{{ formatCurrency(event.totalAmount || 0) }}</span>
            </div>
          </div>
        </div>
      </div>
  
      <!-- Add Event Modal -->
      <div v-if="showAddEventModal" class="modal-overlay" @click="closeAddEventModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Thêm sự kiện mới</h3>
            <button class="close-button" @click="closeAddEventModal">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Tiêu đề <span class="required">*</span></label>
              <input v-model="newEvent.title" type="text" class="form-input" placeholder="Nhập tiêu đề sự kiện">
            </div>
            <div class="form-group">
              <label>Mô tả</label>
              <textarea v-model="newEvent.description" class="form-input" placeholder="Nhập mô tả sự kiện"></textarea>
            </div>
            <div class="form-group">
              <label>Thời gian bắt đầu</label>
              <input v-model="newEvent.startDate" type="datetime-local" class="form-input">
            </div>
            <div class="form-group">
              <label>Thời gian kết thúc</label>
              <input v-model="newEvent.endDate" type="datetime-local" class="form-input">
            </div>
            <div class="form-group">
              <label>Địa điểm</label>
              <input v-model="newEvent.location" type="text" class="form-input" placeholder="Nhập địa điểm">
            </div>
            <div class="form-group">
              <label>Mời bạn bè <span class="required">*</span></label>
              <div class="friends-search">
                <div class="search-input-wrapper">
                  <i class="fas fa-search search-icon"></i>
                  <input
                    v-model="friendSearchQuery"
                    type="text"
                    placeholder="Tìm kiếm bạn bè..."
                    class="search-input"
                  />
                </div>
              </div>
              <div class="friends-select">
                <div v-for="friend in filteredFriends" 
                     :key="friend.id" 
                     class="friend-option"
                     :class="{ selected: selectedFriends.includes(friend.id) }"
                     @click="toggleFriendSelection(friend.id)">
                  <Avatar 
                    :email="friend.email" 
                    :name="friend.displayName"
                    size="small"
                  />
                  <span class="friend-name">{{ friend.displayName || friend.email }}</span>
                  <i class="fas fa-check check-icon"></i>
                </div>
                <div v-if="filteredFriends.length === 0" class="no-results">
                  Không tìm thấy bạn bè phù hợp
                </div>
              </div>
              <div class="selected-friends-preview" v-if="selectedFriends.length > 0">
                <div class="selected-count">
                  Đã chọn {{ selectedFriends.length }} người
                </div>
                <div class="selected-avatars">
                  <Avatar 
                    v-for="friendId in selectedFriends.slice(0, 3)" 
                    :key="friendId"
                    :email="getFriendById(friendId)?.email"
                    :name="getFriendById(friendId)?.displayName"
                    size="small"
                  />
                  <div v-if="selectedFriends.length > 3" class="more-selected">
                    +{{ selectedFriends.length - 3 }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-button" @click="closeAddEventModal">
              <i class="fas fa-times"></i>
              Hủy
            </button>
            <button 
              class="submit-button" 
              :disabled="!isValidEventForm"
              @click="createEvent">
              <i class="fas fa-plus"></i>
              Tạo sự kiện
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue';
  import { collection, addDoc, query, getDocs, where, serverTimestamp } from 'firebase/firestore';
  import { db } from '~/plugins/firebase';
  import { useAuth } from '~/composables/useAuth';
  import { useFriends } from '~/composables/useFriends';
  import Avatar from '~/components/Avatar.vue';
  
  definePageMeta({
    middleware: 'auth'
  });
  
  const { user } = useAuth();
  const { friends, loading: loadingFriends, fetchFriends } = useFriends();
  const loading = ref(true);
  const events = ref([]);
  const showAddEventModal = ref(false);
  const isSubmitting = ref(false);
  const participantEmail = ref('');
  const showFriendsList = ref(false);
  const selectedFriends = ref([]);
  const searchQuery = ref('');
  const friendSearchQuery = ref('');
  
  // Add formatDate function
  const formatDate = (date) => {
    if (!date) return '';
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Initialize new event with proper structure
  const newEvent = ref({
    title: '',
    description: '',
    location: '',
    startDate: null,
    endDate: null,
    participants: [],
    totalAmount: 0,
    isEnded: false
  });
  
  // Format tiền tệ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };
  
  // Thêm người tham gia
  const addParticipant = () => {
    if (participantEmail.value && 
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participantEmail.value) &&
        !newEvent.value.participants.includes(participantEmail.value)) {
      newEvent.value.participants.push(participantEmail.value);
      participantEmail.value = '';
    }
  };
  
  // Xóa người tham gia
  const removeParticipant = (index) => {
    newEvent.value.participants.splice(index, 1);
  };
  
  // Mở modal chi tiết sự kiện
  const openEventDetail = (eventId) => {
    navigateTo({
      path: `/events/${eventId}`
    });
  };
  
  // Mở modal thêm sự kiện
  const openAddEventModal = () => {
    showAddEventModal.value = true;
  };
  
  // Create event function
  const createEvent = async () => {
    if (!user.value || !isValidEventForm.value) return;
    
    try {
      // Get selected friends' data
      const selectedFriendsData = selectedFriends.value.map(friendId => {
        const friend = getFriendById(friendId);
        return {
          uid: friend.id,
          email: friend.email,
          displayName: friend.displayName || friend.email,
          photoURL: friend.photoURL
        };
      });

      // Add creator to participants
      const creatorData = {
        uid: user.value.uid,
        email: user.value.email,
        displayName: user.value.displayName || user.value.email,
        photoURL: user.value.photoURL
      };

      // Prepare event data
      const eventData = {
        name: newEvent.value.title,
        description: newEvent.value.description || '',
        location: newEvent.value.location || '',
        startDate: newEvent.value.startDate ? new Date(newEvent.value.startDate) : null,
        endDate: newEvent.value.endDate ? new Date(newEvent.value.endDate) : null,
        participants: [creatorData, ...selectedFriendsData],
        createdBy: creatorData,
        totalAmount: 0,
        isEnded: false,
        createdAt: serverTimestamp()
      };

      // Add to Firestore
      await addDoc(collection(db, 'events'), eventData);

      // Reset form and close modal
      resetForm();
      showAddEventModal.value = false;

      // Refresh events list
      await fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Có lỗi xảy ra khi tạo sự kiện. Vui lòng thử lại.');
    }
  };
  
  // Update fetchEvents function
  const fetchEvents = async () => {
    if (!user.value) return;

    loading.value = true;
    try {
      const eventsRef = collection(db, 'events');
      const q = query(
        eventsRef,
        where('participants', 'array-contains', {
          uid: user.value.uid,
          email: user.value.email,
          displayName: user.value.displayName || user.value.email,
          photoURL: user.value.photoURL
        })
      );
      
      const querySnapshot = await getDocs(q);
      events.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        startDate: doc.data().startDate?.toDate(),
        endDate: doc.data().endDate?.toDate()
      }));
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      loading.value = false;
    }
  };
  
  // Add this function to handle navigation
  const navigateToDetail = (eventId) => {
    navigateTo(`/events/${eventId}`);
  };
  
  // Add friend to participants
  const addFriendToParticipants = (friend) => {
    if (!newEvent.value.participants.includes(friend.email)) {
      newEvent.value.participants.push(friend.email);
      selectedFriends.value.push(friend.id);
    }
  };
  
  // Remove friend from participants
  const removeFriendFromParticipants = (friend) => {
    const emailIndex = newEvent.value.participants.indexOf(friend.email);
    if (emailIndex > -1) {
      newEvent.value.participants.splice(emailIndex, 1);
      const friendIndex = selectedFriends.value.indexOf(friend.id);
      if (friendIndex > -1) {
        selectedFriends.value.splice(friendIndex, 1);
      }
    }
  };
  
  // Toggle friend selection
  const toggleFriendSelection = (friendId) => {
    const index = selectedFriends.value.indexOf(friendId);
    if (index === -1) {
      selectedFriends.value.push(friendId);
    } else {
      selectedFriends.value.splice(index, 1);
    }
  };
  
  // Reset form with friends
  const resetForm = () => {
    newEvent.value = {
      title: '',
      description: '',
      location: '',
      startDate: null,
      endDate: null,
      participants: [],
      totalAmount: 0,
      isEnded: false
    };
    selectedFriends.value = [];
    participantEmail.value = '';
  };
  
  const navigateToProfile = (uid) => {
    navigateTo(`/profile/${uid}`);
  };
  
  // Add computed for filtered events
  const filteredEvents = computed(() => {
    if (!searchQuery.value) return events.value;
    
    const query = searchQuery.value.toLowerCase().trim();
    return events.value.filter(event => {
      return event.name.toLowerCase().includes(query) ||
             event.description.toLowerCase().includes(query) ||
             event.location.toLowerCase().includes(query);
    });
  });
  
  // Add computed for filtered friends
  const filteredFriends = computed(() => {
    if (!friendSearchQuery.value) return friends.value;
    
    const query = friendSearchQuery.value.toLowerCase().trim();
    return friends.value.filter(friend => {
      return friend.displayName?.toLowerCase().includes(query) ||
             friend.email.toLowerCase().includes(query);
    });
  });
  
  // Add helper function to get friend by id
  const getFriendById = (friendId) => {
    return friends.value.find(friend => friend.id === friendId);
  };
  
  // Update form validation
  const isValidEventForm = computed(() => {
    return newEvent.value.title &&
           selectedFriends.value.length > 0;
  });
  
  // Update close modal function
  const closeAddEventModal = () => {
    showAddEventModal.value = false;
    newEvent.value = {
      title: '',
      description: '',
      location: '',
      startDate: null,
      endDate: null,
      participants: [],
      totalAmount: 0,
      isEnded: false
    };
    selectedFriends.value = [];
    friendSearchQuery.value = '';
  };
  
  onMounted(async () => {
    if (user.value) {
      await Promise.all([fetchEvents(), fetchFriends()]);
    }
  });
  </script>
  
  <style scoped>
  .events-page {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
  }
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .page-title {
    font-size: 24px;
    color: #333;
    margin: 0;
    border-left: 4px solid #4CAF50;
    padding-left: 10px;
  }
  
  .header-actions {
    display: flex;
    gap: 16px;
    align-items: center;
  }
  
  .search-container {
    min-width: 300px;
  }
  
  .search-input-wrapper {
    position: relative;
  }
  
  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #666;
  }
  
  .search-input {
    width: 100%;
    padding: 10px 12px 10px 36px;
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
  
  .add-button {
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
  }
  
  .add-button:hover {
    background-color: #45a049;
  }
  
  .add-friends-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s;
  }
  
  .add-friends-button:hover {
    background: #45a049;
  }
  
  .events-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
  }
  
  .event-card {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .event-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  
  .event-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 12px;
  }
  
  .event-title {
    font-size: 18px;
    color: #333;
    margin: 0;
    flex: 1;
  }
  
  .event-status {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 12px;
    font-weight: 500;
  }
  
  .event-status.active {
    background-color: #e8f5e9;
    color: #2E7D32;
  }
  
  .event-status.ended {
    background-color: #ffebee;
    color: #c62828;
  }
  
  .event-description {
    color: #666;
    font-size: 14px;
    margin: 12px 0;
    line-height: 1.5;
  }
  
  .event-info {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #eee;
  }
  
  .info-label {
    font-size: 12px;
    color: #666;
    display: block;
    margin-bottom: 4px;
  }
  
  .info-value {
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }
  
  .no-friends-message,
  .no-events-message {
    text-align: center;
    padding: 40px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  
  .no-friends-message i,
  .no-events-message i {
    font-size: 48px;
    color: #999;
    margin-bottom: 16px;
  }
  
  .sub-text {
    color: #666;
    font-size: 14px;
    margin-top: 8px;
  }
  
  .friends-search {
    margin-bottom: 12px;
  }
  
  .friends-search .search-input-wrapper {
    margin-bottom: 8px;
  }
  
  .friends-search .search-input {
    width: 100%;
    padding: 8px 12px 8px 36px;
    font-size: 14px;
  }
  
  .selected-friends-preview {
    margin-top: 12px;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .selected-count {
    font-size: 14px;
    color: #666;
  }
  
  .selected-avatars {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .more-selected {
    background: #e0e0e0;
    color: #666;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 12px;
  }
  
  .no-results {
    text-align: center;
    padding: 16px;
    color: #666;
    font-size: 14px;
  }
  
  .required {
    color: #f44336;
    margin-left: 4px;
  }
  
  .friends-select {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 8px;
  }
  
  .friend-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    padding-right: 40px; /* Space for the checkmark */
  }
  
  .friend-option:hover {
    background: #f5f5f5;
  }
  
  .friend-option.selected {
    background: #e8f5e9;
  }
  
  .friend-name {
    flex: 1;
  }
  
  .check-icon {
    position: absolute;
    right: 12px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #4CAF50;
    opacity: 0;
    transform: scale(0);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .friend-option.selected .check-icon {
    opacity: 1;
    transform: scale(1);
  }
  
  /* Add a subtle border when hovering */
  .friend-option:hover:not(.selected) {
    border: 1px solid #e0e0e0;
    padding: 7px 39px 7px 7px; /* Adjust padding to account for border */
  }
  
  /* Add a green border when selected */
  .friend-option.selected {
    border: 1px solid #4CAF50;
    padding: 7px 39px 7px 7px;
  }
  
  /* Add checkmark background */
  .friend-option.selected .check-icon {
    background: #4CAF50;
    color: white;
    border-radius: 50%;
    padding: 4px;
  }
  
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
    z-index: 9999;
  }
  
  .modal-content {
    background-color: white;
    border-radius: 10px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: modal-appear 0.3s ease;
    position: relative;
    z-index: 10000;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
    background-color: #f8f9fa;
    position: sticky;
    top: 0;
    z-index: 10002;
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 20px;
    color: #333;
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
  }
  
  .modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
    position: relative;
    z-index: 10001;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #333;
  }
  
  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
  }
  
  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }
  
  .modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: flex-end;
    gap: 16px;
    background: white;
    position: sticky;
    bottom: 0;
    z-index: 10002;
  }
  
  .cancel-button,
  .submit-button {
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
  }
  
  .cancel-button {
    background-color: #f5f5f5;
    color: #666;
    border: 1px solid #ddd;
  }
  
  .cancel-button:hover {
    background-color: #e0e0e0;
    color: #333;
  }
  
  .submit-button {
    background-color: #4CAF50;
    color: white;
    border: none;
  }
  
  .submit-button:hover:not(:disabled) {
    background-color: #45a049;
    transform: translateY(-1px);
  }
  
  .submit-button:disabled {
    background-color: #a5d6a7;
    cursor: not-allowed;
    transform: none;
  }
  
  .event-creator {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .creator-avatar {
    cursor: pointer;
    transition: transform 0.2s;
  }
  
  .creator-avatar:hover {
    transform: scale(1.1);
  }
  
  .creator-info {
    display: flex;
    flex-direction: column;
  }
  
  .creator-name {
    font-size: 14px;
    color: #666;
    cursor: pointer;
  }
  
  .creator-name:hover {
    text-decoration: underline;
  }
  
  .participants-avatars {
    display: flex;
    align-items: center;
  }
  
  .participant-avatar {
    margin-right: -10px;
    transition: transform 0.2s;
    cursor: pointer;
  }
  
  .participant-avatar:hover {
    transform: scale(1.1);
    z-index: 1;
  }
  
  .more-participants {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: #e0e0e0;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    border: 2px solid #fff;
    margin-left: -10px;
  }
  
  .event-details {
    display: flex;
    gap: 16px;
    margin: 12px 0;
  }
  
  .detail-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #666;
    font-size: 14px;
  }
  
  .detail-item i {
    color: #4CAF50;
  }
  
  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: stretch;
    }
  
    .header-actions {
      flex-direction: column;
    }
  
    .search-container {
      min-width: 100%;
    }
  }

  @media (max-width: 768px) {
    .modal-overlay {
      align-items: flex-end;
      background-color: rgba(0, 0, 0, 0.7);
    }

    .modal-content {
      width: 100%;
      max-width: 100%;
      height: 100vh;
      max-height: 90vh;
      margin: 0;
      border-radius: 20px 20px 0 0;
      animation: slide-up 0.3s ease;
    }

    .modal-header {
      padding: 20px;
      background: white;
    }

    .modal-footer {
      padding: 16px;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
    }

    .cancel-button,
    .submit-button {
      flex: 1;
      justify-content: center;
      padding: 14px 24px;
      font-size: 16px;
    }
  }

  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
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
  </style> 