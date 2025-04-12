# Maneger Money

Ứng dụng quản lý chi tiêu cá nhân xây dựng với Nuxt 3 và Firebase.

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Chạy máy chủ phát triển
npm run dev

# Xây dựng ứng dụng cho production
npm run build
```

## Cấu hình cơ sở dữ liệu Firebase

Ứng dụng sử dụng Firebase Authentication và Firestore Database.

### Cấu hình quy tắc bảo mật cho Firestore

Để ứng dụng hoạt động đúng, bạn cần cập nhật quy tắc bảo mật của Firestore. Sao chép nội dung từ file `firestore.rules` trong dự án và cập nhật trong Firebase Console:

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Chọn dự án của bạn
3. Chọn "Firestore Database" từ menu bên trái
4. Chọn tab "Rules"
5. Sao chép nội dung từ file `firestore.rules` và dán vào
6. Nhấn "Publish"

Quy tắc này sẽ đảm bảo rằng người dùng chỉ có thể truy cập dữ liệu của họ.

## Tính năng chính

1. **Quản lý tài khoản**
   - Đăng ký và đăng nhập người dùng
   - Bảo mật thông tin cá nhân

2. **Quản lý thu chi**
   - Thêm, xóa, sửa các khoản thu chi
   - Phân loại theo danh mục
   - Theo dõi số dư

3. **Quản lý nợ**
   - Theo dõi các khoản nợ cần trả
   - Đánh dấu khoản nợ đã thanh toán
   - Thống kê tổng nợ và số đã trả

4. **Báo cáo và thống kê**
   - Biểu đồ hiển thị tổng quan chi tiêu
   - Phân tích chi tiêu theo danh mục

## Cấu trúc thư mục

- `components/`: Chứa các component Vue
- `composables/`: Chứa các composable hooks
- `pages/`: Các trang của ứng dụng
- `plugins/`: Plugin và cấu hình (như Firebase)
- `public/`: Tài nguyên tĩnh
- `firestore.rules`: Quy tắc bảo mật cho Firestore

## Lưu ý

- Đảm bảo bạn đã cấu hình Firebase đúng cách trước khi chạy ứng dụng
- Các quy tắc bảo mật Firestore phải được triển khai để ứng dụng hoạt động đúng
