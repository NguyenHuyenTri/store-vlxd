// Đặt SPREADSHEET_ID trong Cài đặt dự án → Thuộc tính tập lệnh.
const PRODUCT_HEADERS = ['MaHang','TenSanPham','Hang','DanhMuc','DonViTinh','GiaBan','TonKho','HienThi'];
const ORDER_HEADERS = ['MaDon','NgayTao','KhachHang','DienThoai','DiaChi','GhiChu','ChiTietJSON','TamTinh','TrangThai'];
function db_(){ return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')); }
// Chạy thủ công từ trình soạn thảo. Không xóa hoặc ghi đè dữ liệu đã có.
function setupKimDao(){
  const ss=db_();
  [['SanPham',PRODUCT_HEADERS],['DonHang',ORDER_HEADERS],['KhachHang',['MaKhach','HoTen','DienThoai','DiaChi']],['NhapXuatKho',['MaPhieu','Ngay','MaHang','Loai','SoLuong','GhiChu']]].forEach(([name,headers])=>{
    const sheet=ss.getSheetByName(name)||ss.insertSheet(name);
    if(sheet.getLastRow()===0){ sheet.appendRow(headers);sheet.setFrozenRows(1); }
    else checkHeaders_(sheet,headers);
  });
}
function checkHeaders_(sheet,headers){
  const actual=sheet.getRange(1,1,1,headers.length).getValues()[0];
  if(headers.some((h,i)=>actual[i]!==h))throw new Error('Sai cấu trúc trang '+sheet.getName()+'. Vui lòng kiểm tra hàng tiêu đề.');
}
function doGet(){return HtmlService.createHtmlOutputFromFile('Index').setTitle('Kim Đào | Đá cắt & Nhám');}
function getCatalog(){
 const sh=db_().getSheetByName('SanPham');if(!sh)throw new Error('Chưa chạy setupKimDao.');checkHeaders_(sh,PRODUCT_HEADERS);
 if(sh.getLastRow()<2)return [];
 return sh.getRange(2,1,sh.getLastRow()-1,8).getValues().filter(r=>r[0]&&r[7]===true).map(r=>({id:String(r[0]),name:String(r[1]),brand:String(r[2]),cat:String(r[3]),unit:String(r[4]),price:Number(r[5]),available:Number(r[6])>0})).filter(p=>Number.isFinite(p.price)&&p.price>=0);
}
function text_(value,max,required){const s=String(value||'').trim();if((required&&!s)||s.length>max)throw new Error('Thông tin liên hệ không hợp lệ.');return s;}
function safeCell_(s){return /^[=+@-]/.test(s)?"'"+s:s;}
function placeOrder(input){
 if(!input||!Array.isArray(input.items)||!input.items.length||input.items.length>100)throw new Error('Giỏ hàng không hợp lệ.');
 const customer=text_(input.customer,100,true),phone=text_(input.phone,20,true),address=text_(input.address,500,true),note=text_(input.note,1000,false);
 if(!/^[+0-9 ()-]{9,20}$/.test(phone))throw new Error('Số điện thoại không hợp lệ.');
 const key=text_(input.requestId,80,true);if(!/^[a-zA-Z0-9-]{16,80}$/.test(key))throw new Error('Mã yêu cầu không hợp lệ.');
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const sh=db_().getSheetByName('DonHang');checkHeaders_(sh,ORDER_HEADERS);
  const id='KD-'+key; // Mã ổn định để thử lại không tạo đơn trùng.
  if(sh.getLastRow()>1){const found=sh.getRange(2,1,sh.getLastRow()-1,1).createTextFinder(id).matchEntireCell(true).findNext();if(found)return {id,duplicate:true};}
  const catalog=getCatalog(),seen={};let total=0;
  const items=input.items.map(i=>{
   const p=catalog.find(p=>p.id===i.id),q=Number(i.quantity);
   if(!p||!p.available||seen[i.id]||!Number.isInteger(q)||q<1||q>99999)throw new Error('Sản phẩm hoặc số lượng không hợp lệ. Vui lòng tải lại danh mục.');
   seen[i.id]=true;total+=p.price*q;return {id:p.id,name:p.name,unit:p.unit,quantity:q,price:p.price};
  });
  if(!Number.isSafeInteger(total)||total<0)throw new Error('Tổng tiền không hợp lệ.');
  sh.appendRow([id,new Date(),safeCell_(customer),safeCell_(phone),safeCell_(address),safeCell_(note),JSON.stringify(items),total,'Mới']);
  return {id,total};
 }finally{lock.releaseLock();}
}
