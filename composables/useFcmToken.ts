import { getMessaging, getToken } from "firebase/messaging";
import { db } from '~/plugins/firebase'
import { doc, setDoc } from "firebase/firestore";

export async function saveFcmTokenForUser(userId: string) {
  try {
    const messaging = getMessaging();
    const token = await getToken(messaging, { vapidKey: "BHXBw8kOhJVLYVqWZrQueAO1M2f2gjlcIYZxHsWgTV3WIlS7yxB9bEEFefVOGw6Tvv3xoEoBuycxpCBZfcQxESk" });
    if (token) {
      await setDoc(doc(db, "users", userId), { fcmToken: token }, { merge: true });
    }
  } catch (err) {
    console.error("Không thể lấy FCM token:", err);
  }
}

navigator.serviceWorker.register('/firebase-messaging-sw.js')