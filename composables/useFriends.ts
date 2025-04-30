import { ref, computed } from 'vue';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, onSnapshot, or, and, Firestore, getDoc } from 'firebase/firestore';
import { db } from '~/plugins/firebase';
import { useAuth } from '~/composables/useAuth';

// Assert db as Firestore type
const firestore = db as Firestore;

export interface Friend {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  senderEmail: string;
  receiverEmail: string;
}

export function useFriends() {
  const { user } = useAuth();
  const friends = ref<Friend[]>([]);
  const friendRequests = ref<FriendRequest[]>([]);
  const loading = ref(false);

  // Computed properties
  const pendingRequests = computed(() => 
    friendRequests.value.filter(req => 
      req.status === 'pending' && req.receiverId === user.value?.uid
    )
  );

  const sentRequests = computed(() => 
    friendRequests.value.filter(req => 
      req.status === 'pending' && req.senderId === user.value?.uid
    )
  );

  // Fetch all friends with realtime updates
  const setupFriendsListener = () => {
    if (!user.value) return;
    
    const q = query(
      collection(firestore, 'friendships'),
      or(
        and(
          where('senderId', '==', user.value.uid),
          where('status', '==', 'accepted')
        ),
        and(
          where('receiverId', '==', user.value.uid),
          where('status', '==', 'accepted')
        )
      )
    );

    return onSnapshot(q, async (snapshot) => {
      const friendIds = snapshot.docs.map(doc => {
        const data = doc.data();
        return data.senderId === user.value?.uid ? data.receiverId : data.senderId;
      });

      console.log('Found friend IDs:', friendIds);

      // Fetch user details for each friend
      const friendsData = await Promise.all(
        friendIds.map(async (friendId) => {
          try {
            const userDoc = await getDoc(doc(firestore, 'users', friendId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                id: friendId,
                email: userData.email || '',
                displayName: userData.displayName,
                photoURL: userData.photoURL
              };
            }
            console.log('Friend document not found:', friendId);
            return null;
          } catch (err) {
            console.error('Error fetching friend data:', err);
            return null;
          }
        })
      );

      // Filter out null values and update friends list
      friends.value = friendsData.filter(friend => friend !== null);
      console.log('Updated friends list:', friends.value);
    });
  };

  // Fetch all friends
  const fetchFriends = async () => {
    if (!user.value) return;
    
    loading.value = true;
    try {
      const q = query(
        collection(firestore, 'friendships'),
        or(
          and(
            where('senderId', '==', user.value.uid),
            where('status', '==', 'accepted')
          ),
          and(
            where('receiverId', '==', user.value.uid),
            where('status', '==', 'accepted')
          )
        )
      );

      const querySnapshot = await getDocs(q);
      const friendIds = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return data.senderId === user.value?.uid ? data.receiverId : data.senderId;
      });

      console.log('Found friend IDs:', friendIds);

      // Fetch user details for each friend
      const friendsData = await Promise.all(
        friendIds.map(async (friendId) => {
          try {
            const userDoc = await getDoc(doc(firestore, 'users', friendId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                id: friendId,
                email: userData.email || '',
                displayName: userData.displayName,
                photoURL: userData.photoURL
              };
            }
            console.log('Friend document not found:', friendId);
            return null;
          } catch (err) {
            console.error('Error fetching friend data:', err);
            return null;
          }
        })
      );

      // Filter out null values and update friends list
      friends.value = friendsData.filter(friend => friend !== null);
      console.log('Updated friends list:', friends.value);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      loading.value = false;
    }
  };

  // Send friend request
  const sendFriendRequest = async (friendEmail: string) => {
    if (!user.value) return;

    try {
      // Check if request already exists
      const existingRequest = await getDocs(
        query(
          collection(firestore, 'friendships'),
          or(
            and(
              where('senderEmail', '==', user.value.email),
              where('receiverEmail', '==', friendEmail),
              where('status', '==', 'pending')
            ),
            and(
              where('senderEmail', '==', friendEmail),
              where('receiverEmail', '==', user.value.email),
              where('status', '==', 'pending')
            )
          )
        )
      );

      // Nếu có request pending, throw error
      if (!existingRequest.empty) {
        throw new Error('Friend request already exists');
      }

      // Check if they are already friends
      const existingFriendship = await getDocs(
        query(
          collection(firestore, 'friendships'),
          or(
            and(
              where('senderEmail', '==', user.value.email),
              where('receiverEmail', '==', friendEmail),
              where('status', '==', 'accepted')
            ),
            and(
              where('senderEmail', '==', friendEmail),
              where('receiverEmail', '==', user.value.email),
              where('status', '==', 'accepted')
            )
          )
        )
      );

      // Nếu đã là bạn bè, throw error
      if (!existingFriendship.empty) {
        throw new Error('Already friends');
      }

      // Get receiver's user document
      const receiverQuery = await getDocs(
        query(collection(firestore, 'users'), where('email', '==', friendEmail))
      );

      if (receiverQuery.empty) {
        throw new Error('User not found');
      }

      const receiverData = receiverQuery.docs[0].data();

      // Check if trying to add self
      if (receiverData.uid === user.value.uid) {
        throw new Error('Cannot send friend request to yourself');
      }
      
      // Create new friend request
      await addDoc(collection(firestore, 'friendships'), {
        senderId: user.value.uid,
        senderEmail: user.value.email,
        receiverId: receiverData.uid,
        receiverEmail: friendEmail,
        status: 'pending',
        createdAt: new Date()
      });

    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (requestId: string) => {
    try {
      const requestRef = doc(firestore, 'friendships', requestId);
      await updateDoc(requestRef, {
        status: 'accepted'
      });
      await fetchFriends();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  };

  // Reject friend request
  const rejectFriendRequest = async (requestId: string) => {
    try {
      const requestRef = doc(firestore, 'friendships', requestId);
      await updateDoc(requestRef, {
        status: 'rejected'
      });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      throw error;
    }
  };

  // Remove friend
  const removeFriend = async (friendId: string) => {
    if (!user.value || !friendId) {
      console.error('Invalid user or friend ID:', { userId: user.value?.uid, friendId });
      throw new Error('Invalid user or friend ID');
    }

    try {
      // Find the friendship document
      const friendshipsRef = collection(firestore, 'friendships');
      const q = query(
        friendshipsRef,
        or(
          and(
            where('senderId', '==', user.value.uid),
            where('receiverId', '==', friendId),
            where('status', '==', 'accepted')
          ),
          and(
            where('senderId', '==', friendId),
            where('receiverId', '==', user.value.uid),
            where('status', '==', 'accepted')
          )
        )
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.error('Friendship not found for:', { userId: user.value.uid, friendId });
        throw new Error('Friendship not found');
      }

      // Delete the friendship document
      const docToDelete = querySnapshot.docs[0];
      await deleteDoc(doc(firestore, 'friendships', docToDelete.id));
      console.log('Friendship removed successfully:', docToDelete.id);

      // Refresh friends list
      await fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
  };

  // Listen to friend requests
  const setupFriendRequestsListener = () => {
    if (!user.value) return;

    const q = query(
      collection(firestore, 'friendships'),
      or(
        where('senderId', '==', user.value.uid),
        where('receiverId', '==', user.value.uid)
      )
    );

    return onSnapshot(q, (snapshot) => {
      friendRequests.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FriendRequest[];
    });
  };

  return {
    friends,
    friendRequests,
    pendingRequests,
    sentRequests,
    loading,
    fetchFriends,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    setupFriendRequestsListener,
    setupFriendsListener
  };
} 