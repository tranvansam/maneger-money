import { db } from '~/plugins/firebase'
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore'

// Hàm gửi notification cho một user cụ thể
export async function sendNotificationToUser({
  userId,
  title,
  body,
  data = {}
}: {
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
}) {
  try {
    // Lấy FCM token của user
    const tokenRef = doc(db, 'fcm_tokens', userId);
    const tokenDoc = await getDoc(tokenRef);
    
    if (!tokenDoc.exists() || !tokenDoc.data().isActive) {
      console.log('User has no active FCM token');
      return;
    }

    const token = tokenDoc.data().token;

    // Gửi notification qua Firebase Cloud Functions
    // TODO: Implement Cloud Function to send FCM message
    // For now, just save to notifications collection
    await addDoc(collection(db, 'notifications'), {
      recipientId: userId,
      title,
      body,
      data,
      isRead: false,
      createdAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

// Hàm gửi notification cho nhiều user
export async function sendNotificationToUsers({
  userIds,
  title,
  body,
  data = {}
}: {
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
}) {
  try {
    // Lấy tất cả FCM tokens của các users
    const tokensQuery = query(
      collection(db, 'fcm_tokens'),
      where('userId', 'in', userIds),
      where('isActive', '==', true)
    );
    
    const tokensSnapshot = await getDocs(tokensQuery);
    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

    if (tokens.length === 0) {
      console.log('No active FCM tokens found for users');
      return;
    }

    // Gửi notification qua Firebase Cloud Functions
    // TODO: Implement Cloud Function to send FCM messages
    // For now, just save to notifications collection
    const notifications = userIds.map(userId => ({
      recipientId: userId,
      title,
      body,
      data,
      isRead: false,
      createdAt: serverTimestamp()
    }));

    const batch = writeBatch(db);
    notifications.forEach(notification => {
      const docRef = doc(collection(db, 'notifications'));
      batch.set(docRef, notification);
    });
    await batch.commit();

    return true;
  } catch (error) {
    console.error('Error sending notifications:', error);
    throw error;
  }
}

// Hàm gửi notification cho tất cả users
export async function sendNotificationToAllUsers({
  title,
  body,
  data = {}
}: {
  title: string,
  body: string,
  data?: Record<string, any>
}) {
  try {
    // Lấy tất cả FCM tokens đang active
    const tokensQuery = query(
      collection(db, 'fcm_tokens'),
      where('isActive', '==', true)
    );
    
    const tokensSnapshot = await getDocs(tokensQuery);
    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

    if (tokens.length === 0) {
      console.log('No active FCM tokens found');
      return;
    }

    // Gửi notification qua Firebase Cloud Functions
    // TODO: Implement Cloud Function to send FCM messages
    // For now, just save to notifications collection
    const notifications = tokensSnapshot.docs.map(doc => ({
      recipientId: doc.data().userId,
      title,
      body,
      data,
      isRead: false,
      createdAt: serverTimestamp()
    }));

    const batch = writeBatch(db);
    notifications.forEach(notification => {
      const docRef = doc(collection(db, 'notifications'));
      batch.set(docRef, notification);
    });
    await batch.commit();

    return true;
  } catch (error) {
    console.error('Error sending notifications to all users:', error);
    throw error;
  }
}

/**
 * Hàm tổng quát gửi notification:
 * - Nếu truyền userId: gửi cho 1 user
 * - Nếu truyền userIds: gửi cho nhiều user
 * - Nếu không truyền userId/userIds: gửi cho tất cả
 */
export async function pushNotification({
  userId,
  userIds,
  title,
  body,
  data = {}
}: {
  userId?: string,
  userIds?: string[],
  title: string,
  body: string,
  data?: Record<string, any>
}) {
  if (userId) {
    return sendNotificationToUser({ userId, title, body, data });
  } else if (userIds && userIds.length > 0) {
    return sendNotificationToUsers({ userIds, title, body, data });
  } else {
    return sendNotificationToAllUsers({ title, body, data });
  }
} 