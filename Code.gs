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

// Quản trị: mật khẩu nằm trong Script Properties, tuyệt đối không ghi vào HTML/GitHub.
function digest_(value){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value)));}
function authKey_(){return digest_(PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD')||'');}
function adminLogin(password){
 const secret=PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
 if(!secret||secret.length<16)throw new Error('Chưa cấu hình ADMIN_PASSWORD tối thiểu 16 ký tự trong Thuộc tính tập lệnh.');
 const cache=CacheService.getScriptCache(),lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const attempts=Number(cache.get('admin-attempts')||0);
  if(attempts>=10)throw new Error('Đã thử quá nhiều lần. Vui lòng chờ 5 phút.');
  cache.put('admin-attempts',String(attempts+1),300);
  if(typeof password!=='string'||password.length>256||digest_(password)!==digest_(secret))throw new Error('Mật khẩu không đúng.');
  const token=Utilities.getUuid()+Utilities.getUuid();cache.put('session-'+digest_(token),authKey_(),3600);return {token,expiresIn:3600};
 }finally{lock.releaseLock();}
}
function requireAdmin_(token){
 if(typeof token!=='string'||token.length>100||!token)throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
 if(CacheService.getScriptCache().get('session-'+digest_(token))!==authKey_())throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
}
function adminLogout(token){requireAdmin_(token);CacheService.getScriptCache().remove('session-'+digest_(token));return true;}
function productRows_(){const sh=db_().getSheetByName('SanPham');checkHeaders_(sh,PRODUCT_HEADERS);return {sh,rows:sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,8).getValues():[]};}
function adminSnapshot(token){
 requireAdmin_(token);const p=productRows_(),sh=db_().getSheetByName('DonHang');checkHeaders_(sh,ORDER_HEADERS);
 const all=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,9).getValues():[];
 const stats={count:all.length,pending:all.filter(r=>r[8]==='Mới').length,completedValue:all.filter(r=>r[8]==='Hoàn tất').reduce((s,r)=>s+(Number(r[7])||0),0)};
 return {stats,products:p.rows.filter(r=>r[0]).map(r=>({id:String(r[0]),name:String(r[1]),brand:String(r[2]),cat:String(r[3]),unit:String(r[4]),price:Number(r[5]),stock:Number(r[6]),visible:r[7]===true,version:digest_(JSON.stringify(r))})),orders:all.slice(-200).reverse().map(r=>{let items=[];try{items=JSON.parse(r[6]);if(!Array.isArray(items))items=[];}catch{}return {id:String(r[0]),date:r[1] instanceof Date?r[1].toISOString():String(r[1]),customer:String(r[2]),phone:String(r[3]),address:String(r[4]),note:String(r[5]),items,total:Number(r[7]),status:String(r[8])};})};
}
function adminSetStatus(token,id,expected,status){
 requireAdmin_(token);const statuses=['Mới','Đã xác nhận','Đang giao','Hoàn tất','Đã hủy'];
 if(!statuses.includes(status))throw new Error('Trạng thái không hợp lệ.');
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const sh=db_().getSheetByName('DonHang');checkHeaders_(sh,ORDER_HEADERS);
  if(sh.getLastRow()<2)throw new Error('Không tìm thấy đơn.');
  const cell=sh.getRange(2,1,sh.getLastRow()-1,1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  if(!cell)throw new Error('Không tìm thấy đơn.');
  const target=sh.getRange(cell.getRow(),9),current=String(target.getValue());
  if(current===status)return true;
  if(current!==expected)throw new Error('Đơn đã được cập nhật. Bấm Làm mới để xem dữ liệu mới.');
  target.setValue(status);return true;
 }finally{lock.releaseLock();}
}
function adminSaveProduct(token,input){
 requireAdmin_(token);if(!input)throw new Error('Thiếu dữ liệu sản phẩm.');
 const id=text_(input.id,60,true);if(!/^[a-zA-Z0-9_-]+$/.test(id))throw new Error('Mã hàng chỉ gồm chữ không dấu, số, gạch ngang hoặc gạch dưới.');
 const name=text_(input.name,150,true),brand=text_(input.brand,80,true),cat=text_(input.cat,80,true),unit=text_(input.unit,40,true);
 const price=Number(input.price),stock=Number(input.stock);
 if(input.price===''||input.stock===''||!Number.isSafeInteger(price)||price<0||price>1e12||!Number.isSafeInteger(stock)||stock<0||stock>1e9||typeof input.visible!=='boolean')throw new Error('Giá và tồn kho phải là số nguyên không âm hợp lệ.');
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const data=productRows_(),matches=data.rows.map((r,i)=>({r,i})).filter(x=>String(x.r[0])===id);
  if(matches.length>1)throw new Error('Mã hàng bị trùng trong bảng tính. Vui lòng sửa trực tiếp.');
  const values=[id,safeCell_(name),safeCell_(brand),safeCell_(cat),safeCell_(unit),price,stock,input.visible];
  if(matches.length){
   const m=matches[0];if(!input.version||digest_(JSON.stringify(m.r))!==input.version)throw new Error('Sản phẩm đã thay đổi. Bấm Làm mới và sửa lại.');
   data.sh.getRange(m.i+2,1,1,8).setValues([values]);
  }else{if(input.version)throw new Error('Sản phẩm đã bị xóa. Bấm Làm mới.');data.sh.appendRow(values);}
  return true;
 }finally{lock.releaseLock();}
}
