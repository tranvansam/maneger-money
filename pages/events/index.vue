<template>
    <div class="events-page">
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">Đang tải dữ liệu...</div>
      </div>
  
      <div class="page-header">
        <h1 class="page-title">Quản lý sự kiện</h1>
        <button @click="openAddEventModal" class="add-event-button">
          <span class="button-icon">+</span>
          Tạo sự kiện mới
        </button>
      </div>
  
      <!-- Danh sách sự kiện -->
      <div class="events-list" v-if="events.length > 0">
        <div v-for="event in events" :key="event.id" class="event-card" @click="navigateToDetail(event.id)">
          <div class="event-header">
            <h3 class="event-title">{{ event.name }}</h3>
            <span class="event-status" :class="{ 'active': !event.isEnded, 'ended': event.isEnded }">
              {{ event.isEnded ? 'Đã kết thúc' : 'Đang diễn ra' }}
            </span>
          </div>
          <p class="event-description">{{ event.description || 'Không có mô tả' }}</p>
          <div class="event-info">
            <div class="participants">
              <span class="info-label">Số người tham gia:</span>
              <span class="info-value">{{ event.participants?.length || 0 }}</span>
            </div>
            <div class="total-amount">
              <span class="info-label">Tổng chi tiêu:</span>
              <span class="info-value">{{ formatCurrency(event.totalAmount || 0) }}</span>
            </div>
          </div>
        </div>
      </div>
  
      <div v-else class="empty-state">
        <div class="empty-icon">📅</div>
        <p class="empty-text">Chưa có sự kiện nào được tạo</p>
        <button @click="openAddEventModal" class="create-first-event">Tạo sự kiện đầu tiên</button>
      </div>
  
      <!-- Modal thêm sự kiện mới -->
      <div v-if="showAddEventModal" class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h2>Tạo sự kiện mới</h2>
            <button @click="showAddEventModal = false" class="close-button">&times;</button>
          </div>
          
          <div class="modal-body">
            <form @submit.prevent="createEvent">
              <div class="form-group">
                <label>Tên sự kiện <span class="required">*</span></label>
                <input 
                  type="text" 
                  v-model="newEvent.name"
                  required
                  placeholder="Nhập tên sự kiện"
                />
              </div>
  
              <div class="form-group">
                <label>Mô tả</label>
                <textarea 
                  v-model="newEvent.description"
                  placeholder="Mô tả chi tiết về sự kiện"
                  rows="3"
                ></textarea>
              </div>
  
              <div class="form-group">
                <label>Ngày bắt đầu</label>
                <input 
                  type="date" 
                  v-model="newEvent.startDate"
                  class="date-input"
                />
              </div>
  
              <div class="form-group">
                <label>Ngày kết thúc</label>
                <input 
                  type="date" 
                  v-model="newEvent.endDate"
                  class="date-input"
                />
              </div>
  
              <div class="form-group">
                <label>Người tham gia <span class="required">*</span></label>
                <div class="participants-input">
                  <input 
                    type="email"
                    v-model="participantEmail"
                    placeholder="Nhập email người tham gia"
                  />
                  <button type="button" @click="addParticipant" class="add-participant-button">
                    Thêm
                  </button>
                </div>
                <div class="participants-list" v-if="newEvent.participants.length > 0">
                  <div v-for="(email, index) in newEvent.participants" :key="index" class="participant-item">
                    <span>{{ email }}</span>
                    <button type="button" @click="removeParticipant(index)" class="remove-participant">
                      &times;
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
  
          <div class="form-actions">
            <button type="button" @click="showAddEventModal = false" class="cancel-button">Hủy</button>
            <button type="submit" @click="createEvent" class="submit-button" :disabled="isSubmitting">
              {{ isSubmitting ? 'Đang xử lý...' : 'Tạo sự kiện' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { collection, addDoc, query, getDocs, where } from 'firebase/firestore';
  import { db } from '~/plugins/firebase';
  import { useAuth } from '~/composables/useAuth';
  
  definePageMeta({
    middleware: 'auth'
  });
  
  const { user } = useAuth();
  const loading = ref(true);
  const events = ref([]);
  const showAddEventModal = ref(false);
  const isSubmitting = ref(false);
  const participantEmail = ref('');
  
  // Khởi tạo sự kiện mới
  const newEvent = ref({
    name: '',
    description: '',
    participants: [],
    totalAmount: 0,
    isEnded: false,
    createdAt: null,
    createdBy: null,
    startDate: null,
    endDate: null
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
  
  // Tạo sự kiện mới
  const createEvent = async () => {
    if (!user.value) return;
    
    try {
      // Thêm người tạo vào danh sách người tham gia
      const participants = [user.value.email, ...newEvent.value.participants];
      
      const eventData = {
        name: newEvent.value.name,
        description: newEvent.value.description,
        participants: participants,
        creator: user.value.email,
        createdAt: new Date(),
        totalAmount: 0,
        isEnded: false,
        startDate: newEvent.value.startDate ? new Date(newEvent.value.startDate) : null,
        endDate: newEvent.value.endDate ? new Date(newEvent.value.endDate) : null
      };
      
      const docRef = await addDoc(
        collection(db, 'events'),
        eventData
      );
      
      // Reset form
      newEvent.value = {
        name: '',
        description: '',
        participants: [],
        totalAmount: 0,
        isEnded: false,
        createdAt: null,
        createdBy: null,
        startDate: null,
        endDate: null
      };
  
      showAddEventModal.value = false;
      await fetchEvents();
    } catch (error) {
      console.error('Error adding event:', error);
    }
  };
  
  // Lấy danh sách sự kiện
  const fetchEvents = async () => {
    if (!user.value) return;
  
    loading.value = true;
    try {
      const q = query(
        collection(db, 'events'),
        where('participants', 'array-contains', user.value.email)
      );
      
      const querySnapshot = await getDocs(q);
      events.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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
  
  onMounted(() => {
    if (user.value) {
      fetchEvents();
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
    margin-bottom: 30px;
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  
  .page-title {
    font-size: 24px;
    color: #333;
    margin: 0;
    border-left: 4px solid #4CAF50;
    padding-left: 10px;
  }
  
  .add-event-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
  }
  
  .add-event-button:hover {
    background-color: #45a049;
    transform: translateY(-1px);
  }
  
  .button-icon {
    font-size: 20px;
  }
  
  .events-list {
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
  
  .empty-state {
    text-align: center;
    padding: 40px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  .empty-text {
    color: #666;
    margin-bottom: 20px;
  }
  
  .create-first-event {
    padding: 10px 24px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
  }
  
  .create-first-event:hover {
    background-color: #45a049;
  }
  
  /* Modal styles */
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
  
  .modal {
    background-color: white;
    border-radius: 10px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
    background-color: #f8f9fa;
  }
  
  .modal-header h2 {
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
  
  .participants-input {
    display: flex;
    gap: 8px;
  }
  
  .participants-input input {
    flex: 1;
  }
  
  .add-participant-button {
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .participants-list {
    margin-top: 12px;
  }
  
  .participant-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: #f5f5f5;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  
  .remove-participant {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    font-size: 18px;
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 20px;
    border-top: 1px solid #eee;
    background-color: white;
  }
  
  .cancel-button {
    padding: 10px 20px;
    background-color: #f5f5f5;
    color: #333;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .submit-button {
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .submit-button:disabled {
    background-color: #a5d6a7;
    cursor: not-allowed;
  }
  
  .required {
    color: #f44336;
  }
  
  .date-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
    background-color: white;
    cursor: pointer;
  }
  
  .date-input:hover {
    border-color: #4CAF50;
  }
  
  .date-input:focus {
    outline: none;
    border-color: #4CAF50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
  }
  
  @media (max-width: 768px) {
    .events-page {
      padding: 15px;
    }
  
    .page-header {
      flex-direction: column;
      gap: 15px;
      align-items: stretch;
    }
  
    .add-event-button {
      width: 100%;
      justify-content: center;
    }
  
    .events-list {
      grid-template-columns: 1fr;
    }
  
    .modal {
      width: 95%;
      max-height: 95vh;
    }
  }
  </style> 