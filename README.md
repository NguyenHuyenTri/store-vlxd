# Kim Đào — Tiger, Sơn Đông

Mã website dùng Google Apps Script và Google Trang tính. Chưa được triển khai hoặc kết nối cho tới khi chủ tài khoản thực hiện các bước dưới đây. Không có mật khẩu hoặc khóa riêng trong repository.

## Cài đặt (làm trên máy tính)

1. Mở bảng tính quản lý của bạn. Giữ bảng tính riêng tư.
2. Chọn **Tiện ích mở rộng → Apps Script**.
3. Thay nội dung `Code.gs` bằng file `Code.gs` trong repository này.
4. Thêm file **HTML** tên `Index` rồi dán toàn bộ nội dung `Index.html`.
5. Trong **Cài đặt dự án → Thuộc tính tập lệnh**, thêm `SPREADSHEET_ID` với giá trị là mã bảng tính (đoạn giữa `/d/` và `/edit` trên đường dẫn bảng tính). Không đưa mã này lên GitHub. Lưu. Chọn hàm `setupKimDao` và bấm **Chạy**. Xem quyền Google yêu cầu và cấp quyền cho dự án của chính bạn.
6. Trở lại bảng tính. Có các trang `SanPham`, `DonHang`, `KhachHang`, `NhapXuatKho`. Hàm tạo cấu trúc không ghi đè dữ liệu. Hai trang sau hiện là cấu trúc chuẩn bị, chưa tự động cập nhật.
7. Nhập sản phẩm thật vào `SanPham`: `MaHang`, `TenSanPham`, `Hang`, `DanhMuc`, `DonViTinh`, `GiaBan`, `TonKho`, `HienThi`. Mã chỉ dùng chữ không dấu, số, `_`, `-`; phải duy nhất. Giá và tồn kho là số không âm. Cột `HienThi` đặt kiểu hộp kiểm và bật cho sản phẩm được bán. Hãng: Tiger hoặc Sơn Đông; nhóm: Đá cắt, Đá mài, Nhám, Nhám xếp. Không có sản phẩm/giá giả tự nhập vào bảng.
8. **Triển khai → Bản triển khai mới → Ứng dụng web**. Chạy dưới danh tính **Tôi**. Nếu muốn khách đặt không cần đăng nhập, chọn đối tượng truy cập **Bất kỳ ai** (tùy chính sách tài khoản). Chỉ link web app công khai; không công khai bảng tính.
9. Sao chép URL kết thúc `/exec`. Mở cửa sổ ẩn danh để thử tải sản phẩm và đặt một đơn. Xác nhận có hàng mới trong `DonHang`. Đổi trạng thái đơn trực tiếp trong bảng tính.
10. Khi sửa mã: **Quản lý bản triển khai → Chỉnh sửa → Phiên bản mới → Triển khai** để giữ URL.

## Hoạt động và giới hạn

- Website đọc sản phẩm hiển thị từ Sheets và gửi đơn vào Sheets. Server tự tính giá, không tin tổng tiền từ trình duyệt.
- Đơn hàng dùng khóa và mã yêu cầu để hạn chế trùng khi gửi lại. Đơn là yêu cầu, chưa tự trừ tồn kho, chưa thu tiền.
- Giá là giá tham khảo; cửa hàng xác nhận giá và vận chuyển. Không có email/SMS tự gửi.
- Quản lý nội bộ hiện thực hiện trực tiếp trong bảng tính với quyền chia sẻ Google. Màn hình quản lý nội bộ có đăng nhập riêng chưa được triển khai; không công khai tồn kho chi tiết hoặc danh sách đơn qua các hàm public.
- Cần kiểm thử thực tế sau khi chủ tài khoản cấp quyền/triển khai; môi trường phát triển chưa truy cập được bảng tính.
- Web app công khai chưa có CAPTCHA hoặc chống spam ở mức sản xuất. Cần bổ sung trước khi quảng bá rộng; Apps Script có hạn mức.
- Không đưa thông tin khách hàng, mật khẩu, token, hoặc bản sao dữ liệu thật vào GitHub. Repository hiện công khai.
- Website Sites cũ là bản thử riêng biệt, chưa tự động đổi sang backend này. URL Apps Script là địa chỉ dùng để kiểm thử kết nối thật.

## Kiểm tra trước khi sử dụng

Thử sản phẩm ẩn/hết hàng; giỏ trống; thay số lượng; gửi lại khi mất mạng; giá được tính lại từ Sheets; dữ liệu chứa dấu tiếng Việt; đơn xuất hiện đúng trong Sheets. Chỉ dùng thông tin giả để thử.
