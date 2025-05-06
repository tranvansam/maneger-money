<template>
  <div class="notification-bell">
    <button @click="toggleDropdown" class="bell-btn">
      <i class="fa-solid fa-bell bell-icon"></i>
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount }}</span>
    </button>
    <div v-if="showDropdown" class="dropdown">
      <div class="noti-header">
        <span class="noti-title">Thông báo</span>
        <div class="noti-tabs">
          <button :class="{ active: tab === 'all' }" @click="tab = 'all'">Tất cả</button>
          <button :class="{ active: tab === 'unread' }" @click="tab = 'unread'">Chưa đọc</button>
        </div>
      </div>
      <div class="noti-list">
        <template v-if="filteredNotifications.length">
          <div v-if="newNotifications.length" class="noti-group">
            <div class="noti-group-title">Mới</div>
            <div v-for="noti in newNotifications" :key="noti.id" class="noti-item" :class="{ unread: !noti.isRead }"
              @click="goToNotification(noti)">
              <div class="noti-content">{{ noti.content }}</div>
              <span class="noti-time">{{ formatTime(noti.createdAt) }}</span>
              <span v-if="!noti.isRead" class="dot"></span>
            </div>
          </div>
          <div v-if="oldNotifications.length" class="noti-group">
            <div class="noti-group-title">Trước đó</div>
            <div v-for="noti in oldNotifications" :key="noti.id" class="noti-item" :class="{ unread: !noti.isRead }"
              @click="goToNotification(noti)">
              <div class="noti-content">{{ noti.content }}</div>
              <span class="noti-time">{{ formatTime(noti.createdAt) }}</span>
              <span v-if="!noti.isRead" class="dot"></span>
            </div>
          </div>
        </template>
        <div v-else class="empty">
          <i class="fa-regular fa-bell-slash empty-icon"></i>
          <div>Không có thông báo</div>
        </div>
      </div>
      <button v-if="unreadCount > 0" class="mark-read-btn" @click="markAllRead">Đánh dấu đã đọc</button>
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
  if (noti.eventId) {
    router.push(`/events/${noti.eventId}`)
  }
  showDropdown.value = false
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
    // Detect new notification
    if (notifications.value.length && newList.length > notifications.value.length) {
      const latest = newList[0]
      if (latest.id !== lastNotiId && !latest.isRead) {
        toast.info(latest.content, {
          autoClose: 5000,
          position: 'top-right',
          closeOnClick: true,
          closeButton: true,
          limit: 3,
          style: { marginBottom: '16px', borderRadius: '10px', boxShadow: '0 2px 12px rgba(60,60,60,0.12)' }
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
  top: 0;
  right: 0;
  background: red;
  color: #fff;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 12px;
}

.dropdown {
  position: absolute;
  right: 0;
  top: 30px;
  background: #fff;
  border: 1px solid #ccc;
  width: 350px;
  max-width: 95vw;
  max-height: 500px;
  overflow-y: auto;
  z-index: 100;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(60, 60, 60, 0.18);
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
  padding: 12px 16px 0 16px;
  border-bottom: 1px solid #eee;
}

.noti-title {
  font-weight: bold;
  font-size: 18px;
}

.noti-tabs {
  float: right;
}

.noti-tabs button {
  background: none;
  border: none;
  font-size: 15px;
  color: #888;
  margin-left: 8px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
  transition: background 0.2s;
}

.noti-tabs button.active,
.noti-tabs button:hover {
  background: #f0f0f0;
  color: #333;
}

.noti-list {
  padding: 0 0 8px 0;
  overflow-y: scroll;
  max-height: 460px;
  min-height: 460px;
}

.noti-group {
  margin-bottom: 8px;
}

.noti-group-title {
  font-size: 13px;
  color: #888;
  padding: 8px 16px 4px 16px;
}

.noti-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.2s;
  font-size: 15px;
  background: #fff;
  color: #222;
  width: 100% !important;
}

.noti-item.unread {
  background: #e3f2fd;
  font-weight: 600;
  border-left: 4px solid #2196f3;
  color: #222;
}

.noti-item.unread .noti-content {
  font-weight: 600;
}

.noti-item:not(.unread) .noti-content {
  font-weight: 400;
}

.noti-item:hover {
  background: #f5faff;
}

.noti-content {
  flex: 1;
}

.noti-time {
  font-size: 12px;
  color: #888;
  min-width: 70px;
  text-align: right;
}

.dot {
  width: 10px;
  height: 10px;
  background: #2196f3;
  border-radius: 50%;
  display: inline-block;
  margin-left: 6px;
}

.empty {
  padding: 40px 0 30px 0;
  text-align: center;
  color: #888;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon {
  font-size: 38px;
  color: #bbb;
  margin-bottom: 8px;
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