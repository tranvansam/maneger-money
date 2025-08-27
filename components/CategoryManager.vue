<template>
  <div class="category-manager">
    <div class="modal-overlay" v-if="showModal">
      <div class="modal">
        <div class="modal-header">
          <h2>Quản lý danh mục</h2>
          <button @click="showModal = false" class="close-button">&times;</button>
        </div>
        
        <div class="modal-body">
          <!-- Form thêm danh mục mới -->
          <div class="add-category-form">
            <div class="form-row">
              <div class="input-group">
                <input 
                  type="text" 
                  v-model="newCategory.name" 
                  placeholder="Nhập tên danh mục"
                  @keyup.enter="addCategory"
                />
                <button 
                  @click="addCategory" 
                  class="add-button"
                  :disabled="!newCategory.name || !newCategory.type"
                  title="Thêm danh mục"
                >
                  +
                </button>
              </div>
              
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" v-model="newCategory.type" value="income" @change="updateCategoryList" />
                  <span>Thu nhập</span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="newCategory.type" value="expense" @change="updateCategoryList" />
                  <span>Chi tiêu</span>
                </label>
              </div>
            </div>
          </div>
          
          <!-- Danh sách danh mục -->
          <div class="categories-list">
            <h3>Danh sách danh mục {{ newCategory.type === 'income' ? 'thu nhập' : 'chi tiêu' }}</h3>
            
            <div class="category-items">
              <div v-for="category in displayedCategories" :key="category.id" class="category-item">
                <div class="category-info">
                  <input 
                    type="radio"
                    :name="'default-' + category.type"
                    :value="category.id"
                    v-model="defaultCategories[category.type]"
                    @change="setDefaultCategory(category)"
                  />
                  <input 
                    type="text" 
                    v-model="category.name" 
                    @blur="updateCategory(category)"
                    :disabled="category.isSystem"
                  />
                </div>
                <div class="category-actions">
                  <button 
                    v-if="!category.isSystem"
                    @click="deleteCategory(category)"
                    class="delete-button"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '~/plugins/firebase';
import { useAuth } from '~/composables/useAuth';

const { user } = useAuth();
const showModal = ref(false);
const categories = ref([]);
const loading = ref(false);

// Danh mục mặc định
const systemCategories = {
  income: [
    { id: 'salary', name: 'Lương', type: 'income', isSystem: true },
    { id: 'bonus', name: 'Thưởng', type: 'income', isSystem: true },
    { id: 'investment', name: 'Đầu tư', type: 'income', isSystem: true },
    { id: 'gifts', name: 'Quà tặng', type: 'income', isSystem: true },
    { id: 'performance', name: 'Đi diễn', type: 'income', isSystem: true },
    { id: 'other_income', name: 'Khác', type: 'income', isSystem: true }
  ],
  expense: [
    { id: 'food', name: 'Ăn uống', type: 'expense', isSystem: true },
    { id: 'rent', name: 'Tiền nhà', type: 'expense', isSystem: true },
    { id: 'utilities', name: 'Hóa đơn dịch vụ', type: 'expense', isSystem: true },
    { id: 'transportation', name: 'Di chuyển', type: 'expense', isSystem: true },
    { id: 'entertainment', name: 'Giải trí', type: 'expense', isSystem: true },
    { id: 'shopping', name: 'Mua sắm', type: 'expense', isSystem: true },
    { id: 'healthcare', name: 'Y tế', type: 'expense', isSystem: true },
    { id: 'education', name: 'Giáo dục', type: 'expense', isSystem: true },
    { id: 'debt_payment', name: 'Trả nợ', type: 'expense', isSystem: true },
    { id: 'other_expense', name: 'Khác', type: 'expense', isSystem: true }
  ]
};

// Ref cho danh mục mặc định được chọn
const defaultCategories = ref({
  income: 'other_income',
  expense: 'other_expense'
});

// Danh mục mới
const newCategory = ref({
  type: 'expense',
  name: ''
});

// Computed properties để lọc danh mục theo loại
const incomeCategories = computed(() => {
  return categories.value.filter(c => c.type === 'income');
});

const expenseCategories = computed(() => {
  return categories.value.filter(c => c.type === 'expense');
});

// Computed property để hiển thị danh mục theo loại
const displayedCategories = computed(() => {
  // Lọc danh mục theo loại đang chọn
  const filteredCategories = categories.value.filter(c => c.type === newCategory.value.type);
  
  // Tách thành 2 mảng: custom và system
  const customCategories = filteredCategories.filter(c => !c.isSystem);
  const systemCategories = filteredCategories.filter(c => c.isSystem);
  
  // Sắp xếp custom categories theo thời gian tạo mới nhất
  customCategories.sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return b.createdAt.seconds - a.createdAt.seconds;
  });
  
  // Nối 2 mảng lại, custom categories lên đầu
  return [...customCategories, ...systemCategories];
});

// Lấy danh sách danh mục từ Firestore
const fetchCategories = async () => {
  if (!user.value) return;
  
  try {
    const q = query(collection(db, 'users', user.value.uid, 'categories'));
    const querySnapshot = await getDocs(q);
    
    // Lấy danh mục từ Firestore
    const userCategories = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      isSystem: false // Đánh dấu là danh mục của người dùng
    }));
    
    // Kết hợp danh mục mặc định với danh mục người dùng
    categories.value = [
      ...systemCategories.income,
      ...systemCategories.expense,
      ...userCategories
    ];

    // Set initial default values
    const defaultIncome = categories.value.find(c => c.type === 'income' && c.isDefault);
    const defaultExpense = categories.value.find(c => c.type === 'expense' && c.isDefault);
    
    defaultCategories.value = {
      income: defaultIncome?.id || 'other_income',
      expense: defaultExpense?.id || 'other_expense'
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

// Thêm emit để thông báo thay đổi
const emit = defineEmits(['categories-updated']);

// Thêm danh mục mới
const addCategory = async () => {
  if (!user.value || !newCategory.value.name) return;
  
  try {
    loading.value = true;
    const docRef = await addDoc(
      collection(db, 'users', user.value.uid, 'categories'),
      {
        name: newCategory.value.name,
        type: newCategory.value.type,
        isDefault: false,
        createdAt: serverTimestamp()
      }
    );
    
    // Thêm vào đầu danh sách
    categories.value.unshift({
      id: docRef.id,
      name: newCategory.value.name,
      type: newCategory.value.type,
      isDefault: false,
      createdAt: new Date()
    });
    
    // Lưu lại type hiện tại
    const currentType = newCategory.value.type;
    
    // Reset form nhưng giữ nguyên type
    newCategory.value = {
      type: currentType,
      name: ''
    };

    // Emit sự kiện cập nhật
    emit('categories-updated');
  } catch (error) {
    console.error('Error adding category:', error);
  } finally {
    loading.value = false;
  }
};

// Cập nhật danh mục
const updateCategory = async (category) => {
  if (!user.value || category.isDefault) return;
  
  try {
    loading.value = true;
    await updateDoc(
      doc(db, 'users', user.value.uid, 'categories', category.id),
      {
        name: category.name,
        isDefault: category.isDefault
      }
    );
    await fetchCategories();
    emit('categories-updated');
  } catch (error) {
    console.error('Error updating category:', error);
  } finally {
    loading.value = false;
  }
};

// Xóa danh mục
const deleteCategory = async (category) => {
  if (!user.value || category.isSystem) return;
  
  try {
    loading.value = true;
    // Xóa khỏi Firestore
    await deleteDoc(doc(db, `users/${user.value.uid}/categories/${category.id}`));
    
    // Xóa khỏi state local
    categories.value = categories.value.filter(c => c.id !== category.id);
    
    // Emit sự kiện để cập nhật parent
    emit('categories-updated');
  } catch (error) {
    console.error('Error deleting category:', error);
  } finally {
    loading.value = false;
  }
};

// Thêm hàm cập nhật danh sách khi thay đổi loại
const updateCategoryList = () => {
  // Không cần làm gì thêm vì computed property sẽ tự động cập nhật
};

// Thêm hàm đặt danh mục mặc định
const setDefaultCategory = async (category) => {
  if (!user.value) return;
  
  try {
    loading.value = true;
    
    // Lưu trạng thái cũ để rollback nếu cần
    const previousState = JSON.parse(JSON.stringify(categories.value));
    
    // Cập nhật state local trước
    categories.value = categories.value.map(c => ({
      ...c,
      isDefault: c.type === category.type ? c.id === category.id : c.isDefault
    }));

    try {
      // Lấy tất cả danh mục user cùng loại
      const userCategories = categories.value.filter(c => 
        c.type === category.type && !c.isSystem
      );

      // Nếu chọn danh mục hệ thống làm mặc định
      if (category.isSystem) {
        // Xóa trạng thái mặc định của tất cả danh mục user cùng loại
        if (userCategories.length > 0) {
          const promises = userCategories.map(c => 
            updateDoc(
              doc(db, 'users', user.value.uid, 'categories', c.id),
              { isDefault: false }
            )
          );
          await Promise.all(promises);
        }
      } else {
        // Nếu chọn danh mục người dùng làm mặc định
        const promises = userCategories.map(c => 
          updateDoc(
            doc(db, 'users', user.value.uid, 'categories', c.id),
            { isDefault: c.id === category.id }
          )
        );
        await Promise.all(promises);
      }

      // Emit event để cập nhật parent
      emit('categories-updated');
    } catch (error) {
      console.error('Error updating Firestore:', error);
      // Rollback state nếu có lỗi
      categories.value = previousState;
      throw error;
    }
  } catch (error) {
    console.error('Error setting default category:', error);
    // Tải lại toàn bộ danh mục nếu có lỗi
    await fetchCategories();
  } finally {
    loading.value = false;
  }
};

// Mở modal
const openModal = () => {
  showModal.value = true;
  fetchCategories();
};

// Đóng modal
const closeModal = () => {
  showModal.value = false;
  // Emit sự kiện cập nhật khi đóng modal
  emit('categories-updated');
};

// Watch for modal state changes to manage body scroll
watch(showModal, (isOpen) => {
  if (isOpen) {
    // Disable body scroll when modal opens
    document.body.style.overflow = 'hidden';
  } else {
    // Re-enable body scroll when modal closes
    document.body.style.overflow = '';
  }
});

// Cleanup function to restore body scroll when component unmounts
onUnmounted(() => {
  // Restore body scroll when component unmounts
  document.body.style.overflow = '';
});

// Expose methods
defineExpose({
  openModal,
  closeModal
});
</script>

<style scoped>
.category-manager {
  position: relative;
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
  z-index: 1000;
}

.modal {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f9f9f9;
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
  color: #757575;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  /* Ensure smooth scrolling on mobile */
  -webkit-overflow-scrolling: touch;
  /* Prevent horizontal scroll */
  overflow-x: hidden;
}

.add-category-form {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: nowrap;
}

.input-group {
  display: flex;
  gap: 8px;
  flex: 1;
  align-items: center;
}

.input-group input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.radio-group {
  display: flex;
  gap: 15px;
  margin-top: 0;
  width: auto;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.radio-option input[type="radio"] {
  margin: 0;
  width: 16px;
  height: 16px;
  accent-color: #4CAF50;
}

.radio-option span {
  font-size: 14px;
  color: #333;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  width: 100%;
}

.save-button {
  width: 100%;
  padding: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.save-button:hover {
  background-color: #45a049;
  transform: translateY(-1px);
}

.save-button:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
  transform: none;
}

.categories-list {
  margin-top: 20px;
}

.category-group {
  margin-bottom: 20px;
}

.category-group h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
}

.category-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 8px;
}

.category-items::-webkit-scrollbar {
  width: 6px;
}

.category-items::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.category-items::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.category-items::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.category-info input[type="radio"] {
  margin: 0;
  accent-color: #4CAF50;
}

.category-info input[type="text"] {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.category-info input[type="text"]:disabled {
  background-color: #f5f5f5;
  color: #666;
}

.category-actions {
  display: flex;
  gap: 8px;
}

.delete-button {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.delete-button:hover {
  background-color: #d32f2f;
}

.add-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}

.add-button:hover {
  background-color: #45a049;
  transform: translateY(-1px);
}

.add-button:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .modal {
    width: 95%;
    max-height: 95vh;
  }
  
  .form-row {
    flex-direction: column;
    gap: 12px;
  }
  
  .input-group {
    width: 100%;
  }
  
  .radio-group {
    width: 100%;
    justify-content: center;
    gap: 24px;
  }
  
  .radio-option {
    flex: 0 0 auto;
  }
}
</style> 