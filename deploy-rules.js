/**
 * Script để triển khai quy tắc bảo mật Firestore từ file firestore.rules
 * 
 * Sử dụng: 
 * 1. Đảm bảo đã cài đặt firebase-tools: npm install -g firebase-tools
 * 2. Đăng nhập vào Firebase: firebase login
 * 3. Chạy script: node deploy-rules.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Kiểm tra file quy tắc bảo mật tồn tại
const rulesFilePath = path.join(__dirname, 'firestore.rules');
if (!fs.existsSync(rulesFilePath)) {
  console.error('Không tìm thấy file firestore.rules!');
  process.exit(1);
}

// Hàm triển khai quy tắc
const deployRules = () => {
  try {
    console.log('Bắt đầu triển khai quy tắc bảo mật Firestore...');
    
    // Chạy lệnh firebase deploy chỉ với phần rules
    execSync('firebase deploy --only firestore:rules', { stdio: 'inherit' });
    
    console.log('Triển khai quy tắc bảo mật thành công!');
  } catch (error) {
    console.error('Lỗi khi triển khai quy tắc bảo mật:', error.message);
    process.exit(1);
  }
};

// Kiểm tra người dùng đã đăng nhập
try {
  execSync('firebase projects:list', { stdio: 'ignore' });
  deployRules();
} catch (error) {
  console.error('Bạn chưa đăng nhập vào Firebase CLI. Vui lòng chạy lệnh "firebase login" trước.');
  process.exit(1);
} 