# Tính năng Tổng quan Chi tiêu Ngày

## Mô tả
Đã thêm các tính năng mới để hiển thị tổng quan chi tiêu theo ngày với biểu đồ trực quan và thống kê chi tiết.

## Các tính năng mới

### 1. Biểu đồ Line - Xu hướng Thu chi theo ngày
- **Vị trí**: Hiển thị sau phần summary cards
- **Chức năng**: 
  - Biểu đồ line thể hiện thu nhập và chi tiêu theo từng ngày
  - Màu xanh lá cho thu nhập, màu đỏ cho chi tiêu
  - Hiển thị tooltip với số tiền cụ thể khi hover
  - Responsive trên mobile

### 2. Biểu đồ Tròn - Phân bổ Chi tiêu theo Danh mục
- **Vị trí**: Hiển thị cùng với biểu đồ line
- **Chức năng**:
  - Biểu đồ doughnut thể hiện phần trăm chi tiêu theo từng danh mục
  - Hiển thị phần trăm trên các phần có tỷ lệ > 5%
  - Tooltip hiển thị số tiền và phần trăm khi hover
  - Legend ở dưới biểu đồ

### 3. Thống kê Chi tiết theo Ngày
- **Vị trí**: Có thể ẩn/hiện bằng nút toggle
- **Chức năng**:
  - Bảng thống kê chi tiết từng ngày trong khoảng thời gian
  - Hiển thị: Thu nhập, Chi tiêu, Số dư, Số giao dịch
  - Màu sắc phân biệt ngày có số dư dương/âm
  - Highlight ngày hôm nay
  - Responsive trên mobile

## Cách sử dụng

### Xem biểu đồ
1. Chọn khoảng thời gian muốn xem (Hôm nay, Tuần này, Tháng này, hoặc Tùy chọn)
2. Biểu đồ line và tròn sẽ tự động cập nhật theo dữ liệu

### Xem thống kê chi tiết
1. Sau khi chọn khoảng thời gian, nhấn nút "Hiển thị thống kê chi tiết"
2. Bảng thống kê sẽ hiện ra với dữ liệu chi tiết từng ngày
3. Nhấn "Ẩn thống kê chi tiết" để ẩn bảng

### Lọc dữ liệu
- Sử dụng các filter có sẵn để lọc theo loại giao dịch (Tất cả, Thu nhập, Chi tiêu)
- Biểu đồ và thống kê sẽ tự động cập nhật theo filter

## Responsive Design
- **Desktop**: Hiển thị đầy đủ với layout 2 cột cho biểu đồ
- **Tablet**: Layout thích ứng với màn hình vừa
- **Mobile**: Layout 1 cột, font size và spacing tối ưu cho màn hình nhỏ

## Dependencies
- Chart.js v4.5.0
- chartjs-plugin-datalabels v2.2.0
- Vue 3 Composition API

## Cấu trúc Files
```
components/
├── DailyOverviewChart.vue    # Component biểu đồ line và tròn
├── DailyStats.vue            # Component thống kê chi tiết
└── TransactionList.vue       # Component chính (đã tích hợp)
```

## Tính năng nâng cao
- Tự động cập nhật khi có giao dịch mới
- Animation mượt mà khi ẩn/hiện các phần
- Xử lý trường hợp không có dữ liệu
- Tối ưu hiệu suất với computed properties
- Cleanup resources khi component unmount
