<template>
  <div class="container mx-auto p-4">
    <div class="mb-8">
      <h1 class="text-2xl font-bold mb-4">Quản lý tài khoản ngân hàng</h1>
      
      <!-- Bank Accounts List -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="account in bankAccounts" :key="account.id" 
             class="p-4 border rounded-lg bg-white shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <img :src="account.bankLogo" :alt="account.bankName" class="w-8 h-8 object-contain"/>
              <h3 class="font-semibold">{{ account.bankName }}</h3>
            </div>
            <button @click="deleteBankAccount(account.id)" 
                    class="text-red-500 hover:text-red-700">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          
          <!-- Account Details with Copy Buttons -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Số tài khoản:</span>
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ account.accountNumber }}</span>
                <button @click="copyToClipboard(account.accountNumber)" 
                        class="text-gray-400 hover:text-primary">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
            
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Tên chủ tài khoản:</span>
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ account.accountName }}</span>
                <button @click="copyToClipboard(account.accountName)"
                        class="text-gray-400 hover:text-primary">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
            
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Chi nhánh:</span>
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ account.branch }}</span>
                <button @click="copyToClipboard(account.branch)"
                        class="text-gray-400 hover:text-primary">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Add New Bank Account Card -->
        <button @click="showAddBankModal = true"
                class="p-4 border rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-gray-50">
          <div class="text-center">
            <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <i class="fas fa-plus text-primary"></i>
            </div>
            <span class="text-gray-600">Thêm tài khoản ngân hàng</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Add Bank Account Modal -->
    <div v-if="showAddBankModal" 
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Thêm tài khoản ngân hàng</h2>
          <button @click="showAddBankModal = false" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form @submit.prevent="addBankAccount" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Ngân hàng
            </label>
            <select v-model="newAccount.bankName" 
                    class="w-full p-2 border rounded-lg" 
                    required>
              <option value="">Chọn ngân hàng</option>
              <option v-for="bank in banksList" 
                      :key="bank.name" 
                      :value="bank.name">
                {{ bank.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Số tài khoản
            </label>
            <input v-model="newAccount.accountNumber" 
                   type="text" 
                   class="w-full p-2 border rounded-lg"
                   required />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Tên chủ tài khoản
            </label>
            <input v-model="newAccount.accountName" 
                   type="text" 
                   class="w-full p-2 border rounded-lg"
                   required />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Chi nhánh
            </label>
            <input v-model="newAccount.branch" 
                   type="text" 
                   class="w-full p-2 border rounded-lg"
                   required />
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <button type="button" 
                    @click="showAddBankModal = false"
                    class="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button type="submit" 
                    class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
              Thêm tài khoản
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '~/plugins/firebase';

definePageMeta({
  middleware: 'auth'
});

const { user } = useAuth();
const bankAccounts = ref([]);
const showAddBankModal = ref(false);
let unsubscribe = null;

const banksList = [
  { name: 'Vietcombank', logo: '/banks/vietcombank.png' },
  { name: 'Techcombank', logo: '/banks/techcombank.png' },
  { name: 'BIDV', logo: '/banks/bidv.png' },
  { name: 'VPBank', logo: '/banks/vpbank.png' },
  { name: 'MB Bank', logo: '/banks/mbbank.png' },
  { name: 'ACB', logo: '/banks/acb.png' },
  // Thêm các ngân hàng khác
];

const newAccount = ref({
  bankName: '',
  accountNumber: '',
  accountName: '',
  branch: ''
});

// Copy to clipboard function
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    // Có thể thêm thông báo copy thành công ở đây
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
};

// Fetch bank accounts
const setupBankAccountsListener = () => {
  if (!user.value) return;

  const q = query(
    collection(db, 'bankAccounts'),
    where('userId', '==', user.value.uid)
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    bankAccounts.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      bankLogo: banksList.find(bank => bank.name === doc.data().bankName)?.logo
    }));
  });
};

// Add new bank account
const addBankAccount = async () => {
  try {
    await addDoc(collection(db, 'bankAccounts'), {
      ...newAccount.value,
      userId: user.value.uid,
      createdAt: new Date()
    });
    
    showAddBankModal.value = false;
    newAccount.value = {
      bankName: '',
      accountNumber: '',
      accountName: '',
      branch: ''
    };
  } catch (error) {
    console.error('Error adding bank account:', error);
  }
};

// Delete bank account
const deleteBankAccount = async (accountId) => {
  if (!confirm('Bạn có chắc muốn xóa tài khoản ngân hàng này?')) return;
  
  try {
    await deleteDoc(doc(db, 'bankAccounts', accountId));
  } catch (error) {
    console.error('Error deleting bank account:', error);
  }
};

onMounted(() => {
  setupBankAccountsListener();
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});
</script> 