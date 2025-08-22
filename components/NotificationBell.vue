<template>
  <div class="notification-bell">
    <button @click="toggleDropdown" class="bell-btn">
      <i class="fa-solid fa-bell bell-icon"></i>
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>
    
    <!-- Overlay để đóng dropdown khi click bên ngoài -->
    <div v-if="showDropdown" class="dropdown-overlay" @click="closeDropdown"></div>
    
    <div v-if="showDropdown" class="dropdown">
      <div class="noti-header">
        <div class="noti-header-content">
          <span class="noti-title">Thông báo</span>
          <button v-if="unreadCount > 0" @click="markAllRead" class="mark-all-read-btn">
            <i class="fa-solid fa-check-double"></i>
            Đánh dấu tất cả đã đọc
          </button>
        </div>
        <div class="noti-tabs">
          <button :class="{ active: tab === 'all' }" @click="tab = 'all'">Tất cả</button>
          <button :class="{ active: tab === 'unread' }" @click="tab = 'unread'">
            Chưa đọc
            <span v-if="unreadCount > 0" class="unread-count">({{ unreadCount }})</span>
          </button>
        </div>
      </div>
      
      <div class="noti-list">
        <template v-if="filteredNotifications.length">
          <div v-if="newNotifications.length" class="noti-group">
            <div class="noti-group-title">
              <i class="fa-solid fa-clock"></i>
              Hôm nay
            </div>
            <div v-for="noti in newNotifications" :key="noti.id" class="noti-item" :class="{ unread: !noti.isRead }"
              @click="goToNotification(noti)">
              <div class="noti-avatar">
                <i :class="getNotificationIcon(noti.data?.type)"></i>
              </div>
              <div class="noti-content-wrapper">
                <div class="noti-content">{{ noti.body || noti.content }}</div>
                <div class="noti-meta">
                  <span class="noti-event">{{ noti.title || noti.data?.eventName }}</span>
                  <span class="noti-time">{{ formatTime(noti.createdAt) }}</span>
                </div>
              </div>
              <div v-if="!noti.isRead" class="unread-indicator"></div>
            </div>
          </div>
          
          <div v-if="oldNotifications.length" class="noti-group">
            <div class="noti-group-title">
              <i class="fa-solid fa-history"></i>
              Trước đó
            </div>
            <div v-for="noti in oldNotifications" :key="noti.id" class="noti-item" :class="{ unread: !noti.isRead }"
              @click="goToNotification(noti)">
              <div class="noti-avatar">
                <i :class="getNotificationIcon(noti.data?.type)"></i>
              </div>
              <div class="noti-content-wrapper">
                <div class="noti-content">{{ noti.body || noti.content }}</div>
                <div class="noti-meta">
                  <span class="noti-event">{{ noti.title || noti.data?.eventName }}</span>
                  <span class="noti-time">{{ formatTime(noti.createdAt) }}</span>
                </div>
              </div>
              <div v-if="!noti.isRead" class="unread-indicator"></div>
            </div>
          </div>
        </template>
        
        <div v-else class="empty">
          <i class="fa-regular fa-bell-slash empty-icon"></i>
          <div class="empty-title">Không có thông báo</div>
          <div class="empty-subtitle">Bạn sẽ nhận được thông báo khi có hoạt động mới</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { db } from '~/plugins/firebase'
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { useAuth } from '~/composables/useAuth'
import { useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'
import 'vue3-toastify/dist/index.css'

const showDropdown = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const tab = ref('all')
const { user } = useAuth()
const router = useRouter()
let lastNotiId = null

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function closeDropdown() {
  showDropdown.value = false
}

function formatTime(time) {
  if (!time) return ''
  const date = time.seconds ? new Date(time.seconds * 1000) : new Date(time)
  const now = new Date()
  const diff = (now - date) / 1000
  if (diff < 60) return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 172800) return 'Hôm qua'
  return date.toLocaleDateString('vi-VN')
}

async function markAllRead() {
  for (const n of notifications.value) {
    if (!n.isRead) {
      await updateDoc(doc(db, "notifications", n.id), { isRead: true })
    }
  }
  unreadCount.value = 0
}

function goToNotification(noti) {
  if (!noti.isRead) {
    updateDoc(doc(db, "notifications", noti.id), { isRead: true })
  }
  if (noti.data?.eventId || noti.eventId) {
    router.push(`/events/${noti.data?.eventId || noti.eventId}`)
  }
  showDropdown.value = false
}

function getNotificationIcon(type) {
  const icons = {
    event_created: 'fa-solid fa-calendar-plus',
    event_updated: 'fa-solid fa-edit',
    event_ended: 'fa-solid fa-calendar-check',
    transaction_added: 'fa-solid fa-plus-circle',
    transaction_updated: 'fa-solid fa-edit',
    plan_added: 'fa-solid fa-tasks',
    plan_updated: 'fa-solid fa-edit',
    message_sent: 'fa-solid fa-comment',
    payment_request: 'fa-solid fa-money-bill-wave',
    payment_confirmed: 'fa-solid fa-check-circle',
    discussion: 'fa-solid fa-comment',
    add_expense: 'fa-solid fa-plus-circle',
    edit_expense: 'fa-solid fa-edit',
    add_plan: 'fa-solid fa-tasks',
    edit_plan: 'fa-solid fa-edit'
  }
  return icons[type] || 'fa-solid fa-bell'
}

const filteredNotifications = computed(() => {
  if (tab.value === 'all') return notifications.value
  return notifications.value.filter(n => !n.isRead)
})

const newNotifications = computed(() =>
  filteredNotifications.value.filter(n => {
    const date = n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000) : new Date(n.createdAt)
    return (Date.now() - date.getTime()) < 24 * 3600 * 1000
  })
)
const oldNotifications = computed(() =>
  filteredNotifications.value.filter(n => {
    const date = n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000) : new Date(n.createdAt)
    return (Date.now() - date.getTime()) >= 24 * 3600 * 1000
  })
)

onMounted(() => {
  if (!user.value) return
  const q = query(
    collection(db, "notifications"),
    where("recipientId", "==", user.value.uid),
    orderBy("createdAt", "desc")
  )
  onSnapshot(q, (querySnapshot) => {
    const newList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Detect new notification - chỉ hiển thị toast khi có notification mới
    if (notifications.value.length > 0 && newList.length > notifications.value.length) {
      const latest = newList[0]
      if (latest.id !== lastNotiId && !latest.isRead) {
        // Hiển thị toast với nội dung đúng
        const toastContent = latest.body || latest.content || 'Bạn có thông báo mới'
        toast.info(toastContent, {
          autoClose: 5000,
          position: 'top-right',
          closeOnClick: true,
          closeButton: true,
          limit: 1, // Giảm limit để tránh duplicate
          toastId: latest.id, // Thêm toastId để tránh duplicate
          style: { 
            marginBottom: '16px', 
            borderRadius: '10px', 
            boxShadow: '0 2px 12px rgba(60,60,60,0.12)',
            fontSize: '14px',
            padding: '12px 16px'
          }
        })
        lastNotiId = latest.id
      }
    }
    
    notifications.value = newList
    unreadCount.value = notifications.value.filter(n => !n.isRead).length
  })
})
</script>

<style scoped>
.notification-bell {
  position: relative;
}

.bell-btn {
  background: none;
  border: none;
  position: relative;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bell-icon {
  font-size: 18px;
  color: #333;
}

.badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #f44336;
  color: #fff;
  border-radius: 50%;
  min-width: 18px;
  height: 18px;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

.dropdown {
  position: absolute;
  right: 0;
  top: 50px;
  background: #fff;
  border: none;
  width: 380px;
  max-width: 95vw;
  max-height: 600px;
  overflow: hidden;
  z-index: 1000;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 600px) {
  .dropdown {
    left: -240px;
    right: unset;
    width: 80vw;
    min-width: unset;
    max-width: unset;
    border-radius: 16px;
    top: 48px;
    box-shadow: 0 8px 32px rgba(60, 60, 60, 0.18);
  }
}

.noti-header {
  padding: 16px 20px 12px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  border-radius: 16px 16px 0 0;
}

.noti-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.noti-title {
  font-weight: 700;
  font-size: 18px;
  color: #1a1a1a;
}

.mark-all-read-btn {
  background: none;
  border: none;
  color: #1877f2;
  font-size: 13px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.mark-all-read-btn:hover {
  background: #e7f3ff;
}

.noti-tabs {
  display: flex;
  gap: 8px;
}

.noti-tabs button {
  background: none;
  border: none;
  font-size: 14px;
  color: #65676b;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s;
  font-weight: 500;
  position: relative;
}

.noti-tabs button.active {
  background: #e7f3ff;
  color: #1877f2;
  font-weight: 600;
}

.noti-tabs button:hover:not(.active) {
  background: #f2f3f5;
}

.unread-count {
  font-size: 12px;
  color: #1877f2;
  margin-left: 4px;
}

.noti-list {
  padding: 0;
  overflow-y: auto;
  max-height: 500px;
  min-height: 200px;
}

.noti-group {
  margin-bottom: 0;
}

.noti-group-title {
  font-size: 12px;
  color: #65676b;
  padding: 12px 20px 8px 20px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fafafa;
}

.noti-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s;
  background: #fff;
  position: relative;
}

.noti-item.unread {
  background: #f0f8ff;
  border-left: 4px solid #1877f2;
}

.noti-item:hover {
  background: #f8f9fa;
}

.noti-item.unread:hover {
  background: #e7f3ff;
}

.noti-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e7f3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.noti-avatar i {
  color: #1877f2;
  font-size: 16px;
}

.noti-content-wrapper {
  flex: 1;
  min-width: 0;
}

.noti-content {
  font-size: 14px;
  color: #1a1a1a;
  line-height: 1.4;
  margin-bottom: 4px;
  font-weight: 400;
}

.noti-item.unread .noti-content {
  font-weight: 600;
}

.noti-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #65676b;
}

.noti-event {
  font-weight: 500;
  color: #1877f2;
}

.noti-time {
  color: #65676b;
}

.unread-indicator {
  width: 8px;
  height: 8px;
  background: #1877f2;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.empty {
  padding: 60px 20px;
  text-align: center;
  color: #65676b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon {
  font-size: 48px;
  color: #bbb;
  margin-bottom: 8px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.empty-subtitle {
  font-size: 14px;
  color: #65676b;
  max-width: 200px;
  line-height: 1.4;
}

.mark-read-btn {
  width: 90%;
  background: #2196f3;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 15px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
  margin: 0 auto;
  display: block;
}

.mark-read-btn:hover {
  background: #1976d2;
}

@media (max-width: 600px) {
  .noti-item {
    padding: 18px 14px;
    font-size: 16px;
  }

  .noti-header {
    padding: 14px 10px 0 10px;
  }

  .noti-group-title {
    padding: 8px 10px 4px 10px;
  }
}
</style>