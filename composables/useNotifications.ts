import { db } from '~/plugins/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export async function pushNotification({
  recipientId,
  type,
  content,
  eventId,
  relatedId
}: {
  recipientId: string,
  type: string,
  content: string,
  eventId?: string,
  relatedId?: string
}) {
  await addDoc(collection(db, 'notifications'), {
    recipientId,
    type,
    content,
    eventId: eventId || null,
    relatedId: relatedId || null,
    isRead: false,
    createdAt: serverTimestamp()
  })
} 