# Kim Đào — Tiger, Sơn Đông

Website dùng Google Apps Script và Google Trang tính. Bản quản trị cần được chủ tài khoản cập nhật vào Apps Script và triển khai phiên bản mới. Không có mật khẩu hoặc khóa riêng trong repository.

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
- Quản trị có đăng nhập bằng mật khẩu chung của cửa hàng: xem 200 đơn gần nhất, tìm kiếm, đổi trạng thái, xuất CSV; thêm/sửa/ẩn sản phẩm và điều chỉnh tồn kho. Chỉ số tổng hợp tính toàn bộ đơn. Mỗi lệnh đọc/ghi quản trị đều kiểm tra phiên trên máy chủ. Chưa có tài khoản và phân quyền riêng cho từng nhân viên.
- Cần kiểm thử thực tế sau khi chủ tài khoản cấp quyền/triển khai; môi trường phát triển chưa truy cập được bảng tính.
- Web app công khai chưa có CAPTCHA hoặc chống spam ở mức sản xuất. Cần bổ sung trước khi quảng bá rộng; Apps Script có hạn mức.
- Không đưa thông tin khách hàng, mật khẩu, token, hoặc bản sao dữ liệu thật vào GitHub. Repository hiện công khai.
- Website Sites cũ là bản thử riêng biệt, chưa tự động đổi sang backend này. URL Apps Script là địa chỉ dùng để kiểm thử kết nối thật.

## Kiểm tra trước khi sử dụng

Thử sản phẩm ẩn/hết hàng; giỏ trống; thay số lượng; gửi lại khi mất mạng; giá được tính lại từ Sheets; dữ liệu chứa dấu tiếng Việt; đơn xuất hiện đúng trong Sheets. Chỉ dùng thông tin giả để thử.

## Cập nhật bản quản trị

1. Sao lưu bảng tính bằng **Tệp → Tạo bản sao** trước khi thay đổi.
2. Mở Apps Script đang dùng. Thay toàn bộ nội dung file mã `.gs` bằng `Code.gs` mới. Thay toàn bộ nội dung file HTML bằng `Index.html` mới. Tên HTML trong danh sách phải là **Index.html**, không phải Index.html.html. Nếu thêm file mới, chỉ nhập tên `Index`.
3. Giữ nguyên thuộc tính `SPREADSHEET_ID`. Thêm thuộc tính tập lệnh `ADMIN_PASSWORD` là mật khẩu riêng dài ít nhất 16 ký tự, tối đa 256 ký tự. Chọn mật khẩu ngẫu nhiên, không dùng lại mật khẩu Google. Không dán mật khẩu vào mã, GitHub hoặc chat. Không có mật khẩu mặc định.
4. Lưu → **Triển khai → Quản lý bản triển khai → bút chì → Phiên bản mới → Triển khai**. Giữ bản triển khai cũ để giữ nguyên link `/exec`.
5. Mở link `/exec`, bấm **Quản trị**, nhập mật khẩu đã đặt.
6. Thử xem đơn; thay trạng thái của đơn thử; thêm một sản phẩm thử ở trạng thái ẩn; kiểm tra dữ liệu trong Sheets. Khách chưa đăng nhập không được xem đơn hoặc tồn kho chính xác.
7. Đăng xuất sau khi dùng máy chung. Phiên nằm trong bộ nhớ tab, tối đa 1 giờ và có thể hết hạn sớm do Google Cache. Tải lại trang sẽ cần đăng nhập lại. Đổi hoặc xóa `ADMIN_PASSWORD` sẽ vô hiệu hóa phiên cũ. Giới hạn 10 lần đăng nhập trong 5 phút dùng chung cho ứng dụng.

### Quy tắc tồn kho và cập nhật đồng thời

- Giá trị đơn hoàn tất là tổng tiền hàng của các đơn có trạng thái Hoàn tất; chưa phải lợi nhuận hoặc số tiền thực thu.
- Đổi trạng thái đơn **chưa tự trừ/hoàn kho**. Điều chỉnh số lượng thực tế qua **Sửa sản phẩm** hoặc trực tiếp trên bảng tính.
- Ứng dụng dùng khóa cho các lệnh ghi và kiểm tra phiên bản sản phẩm/trạng thái đơn. Nếu báo dữ liệu đã thay đổi, bấm Làm mới rồi kiểm tra trước khi sửa lại.
- Khóa Apps Script không khóa thao tác sửa tay trong Google Sheets. Tránh sửa cùng một dòng trực tiếp trong bảng tính trong lúc đang lưu trên web.
- Chưa có sổ biến động kho, thu chi, công nợ hoặc phân quyền nhân viên. `NhapXuatKho` và `KhachHang` vẫn chỉ là cấu trúc chuẩn bị.

## Kiểm tra tự động

Chạy `node --test tests/backend.test.cjs` bằng Node.js 18+. Bộ kiểm tra dùng bảng tính giả để xác minh quyền quản trị, hết phiên/đăng xuất/đổi mật khẩu, giới hạn đăng nhập, tính giá trên máy chủ, đơn trùng, số lượng không hợp lệ, tranh chấp cập nhật và bảo toàn dữ liệu khi khởi tạo. Cần kiểm tra thêm trên bản Apps Script thật sau khi triển khai; không thay thế kiểm tra giao diện và quyền Google thực tế.
