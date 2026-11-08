// Đặt SPREADSHEET_ID trong Cài đặt dự án → Thuộc tính tập lệnh.
const PRODUCT_HEADERS = ['MaHang','TenSanPham','Hang','DanhMuc','DonViTinh','GiaBan','TonKho','HienThi'];
const PACK_HEADERS = ['VienMoiHop','HopMoiThung','AnhSanPham'];
const ORDER_HEADERS = ['MaDon','NgayTao','KhachHang','DienThoai','DiaChi','GhiChu','ChiTietJSON','TamTinh','TrangThai'];
function db_(){ return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')); }
// Chạy thủ công từ trình soạn thảo. Không xóa hoặc ghi đè dữ liệu đã có.
function setupKimDao(){
  const ss=db_();
  [['SanPham',PRODUCT_HEADERS],['DonHang',ORDER_HEADERS],['KhachHang',['MaKhach','HoTen','DienThoai','DiaChi']],['NhapXuatKho',['MaPhieu','Ngay','MaHang','Loai','SoLuong','GhiChu']]].forEach(([name,headers])=>{
    const sheet=ss.getSheetByName(name)||ss.insertSheet(name);
    if(sheet.getLastRow()===0){ sheet.appendRow(headers);sheet.setFrozenRows(1); }
    else checkHeaders_(sheet,headers);
    if(name==='SanPham')ensurePackColumns_(sheet);
  });
}
function checkHeaders_(sheet,headers){
  const actual=sheet.getRange(1,1,1,headers.length).getValues()[0];
  if(headers.some((h,i)=>actual[i]!==h))throw new Error('Sai cấu trúc trang '+sheet.getName()+'. Vui lòng kiểm tra hàng tiêu đề.');
}
function doGet(){return HtmlService.createHtmlOutputFromFile('Index').setTitle('Kim Đào | Đá cắt & Nhám');}
function ensurePackColumns_(sh){
 const existing=sh.getRange(1,9,1,3).getValues()[0];
 if(existing.some((value,i)=>value!==''&&value!==PACK_HEADERS[i]))throw new Error('Cột I–K đang có dữ liệu khác. Vui lòng kiểm tra trước khi thêm quy cách và ảnh.');
 sh.getRange(1,9,1,3).setValues([PACK_HEADERS]);
}
function packValues_(unit,perBox,perCarton){
 const isPiece=String(unit).trim().toLowerCase()==='viên';
 if(!isPiece)return {perBox:0,perCarton:0};
 const box=perBox===''||perBox===undefined||perBox===null?100:Number(perBox);
 const carton=perCarton===''||perCarton===undefined||perCarton===null?0:Number(perCarton);
 if(!Number.isInteger(box)||box<1||box>100000||![0,8,10].includes(carton))throw new Error('Quy cách không hợp lệ: số viên/hộp phải dương; số hộp/thùng là 8 hoặc 10 (0 nếu chưa cấu hình).');
 return {perBox:box,perCarton:carton};
}
function imageLink_(value){
 const url=String(value||'').trim();
 if(url.length>2000||(url&&!/^https:\/\/[A-Za-z0-9.-]+(?::443)?(?:[/?#][^\s<>"']*)?$/.test(url)))throw new Error('Link ảnh phải là địa chỉ HTTPS hợp lệ.');
 return url;
}
function productFromRow_(r){
 const pack=packValues_(r[4],r[8],r[9]);
 return {id:String(r[0]),name:String(r[1]),brand:String(r[2]),cat:String(r[3]),unit:String(r[4]),price:Number(r[5]),stock:Number(r[6]),visible:r[7]===true,...pack,imageUrl:imageLink_(r[10]),packingVersion:1,version:digest_(JSON.stringify(r))};
}
function getCatalog(){
 return productRows_().rows.filter(r=>r[0]&&r[7]===true).map(productFromRow_).filter(p=>Number.isSafeInteger(p.price)&&p.price>=0).map(p=>({id:p.id,name:p.name,brand:p.brand,cat:p.cat,unit:p.unit,price:p.price,available:p.stock>0,perBox:p.perBox,perCarton:p.perCarton,imageUrl:p.imageUrl,packingVersion:1}));
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
  const catalog=productRows_().rows.filter(r=>r[0]&&r[7]===true).map(productFromRow_),seen={},needed={};let total=0;
  const items=input.items.map(i=>{
   const p=catalog.find(p=>p.id===i.id),q=Number(i.quantity),saleUnit=i.saleUnit||'base';
   if(!p||!Number.isInteger(q)||q<1||q>99999||!['base','box','carton'].includes(saleUnit))throw new Error('Sản phẩm hoặc số lượng không hợp lệ. Vui lòng tải lại danh mục.');
   const key=p.id+'~'+saleUnit;
   const factor=saleUnit==='base'?1:saleUnit==='box'?p.perBox:p.perBox*p.perCarton;
   if(seen[key]||!Number.isSafeInteger(factor)||factor<1||!Number.isSafeInteger(p.price)||p.price<0)throw new Error('Đơn vị bán chưa được cấu hình hoặc sản phẩm bị lặp.');
   seen[key]=true;const baseQuantity=q*factor;needed[p.id]=(needed[p.id]||0)+baseQuantity;
   if(!Number.isSafeInteger(baseQuantity)||needed[p.id]>p.stock)throw new Error('Số lượng '+p.name+' vượt tồn kho hiện có. Vui lòng giảm số lượng hoặc liên hệ cửa hàng.');
   const price=p.price*factor;total+=price*q;
   return {id:p.id,name:p.name,unit:saleUnit==='base'?p.unit:saleUnit==='box'?'Hộp':'Thùng',quantity:q,price,saleUnit,unitFactor:factor,baseQuantity,baseUnit:p.unit};
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
 if(!secret||secret.length<8)throw new Error('Chưa cấu hình ADMIN_PASSWORD tối thiểu 8 ký tự trong Thuộc tính tập lệnh.');
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
function productRows_(){const sh=db_().getSheetByName('SanPham');checkHeaders_(sh,PRODUCT_HEADERS);const extra=sh.getRange(1,9,1,3).getValues()[0];if(extra.some((v,i)=>v!==''&&v!==PACK_HEADERS[i]))throw new Error('Cột I–K không đúng cấu trúc quy cách/ảnh.');return {sh,rows:sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,11).getValues():[]};}
function adminSnapshot(token){
 requireAdmin_(token);const p=productRows_(),sh=db_().getSheetByName('DonHang');checkHeaders_(sh,ORDER_HEADERS);
 const all=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,9).getValues():[];
 const stats={count:all.length,pending:all.filter(r=>r[8]==='Mới').length,completedValue:all.filter(r=>r[8]==='Hoàn tất').reduce((s,r)=>s+(Number(r[7])||0),0)};
 return {stats,packaging:true,products:p.rows.filter(r=>r[0]).map(productFromRow_),orders:all.slice(-200).reverse().map(r=>{let items=[];try{items=JSON.parse(r[6]);if(!Array.isArray(items))items=[];}catch{}return {id:String(r[0]),date:r[1] instanceof Date?r[1].toISOString():String(r[1]),customer:String(r[2]),phone:String(r[3]),address:String(r[4]),note:String(r[5]),items,total:Number(r[7]),status:String(r[8])};})};
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
  const previous=matches.length?matches[0].r:[];
  const pack=packValues_(unit,input.perBox===undefined?previous[8]:input.perBox,input.perCarton===undefined?previous[9]:input.perCarton),imageUrl=imageLink_(input.imageUrl===undefined?previous[10]:input.imageUrl);
  ensurePackColumns_(data.sh);
  const values=[id,safeCell_(name),safeCell_(brand),safeCell_(cat),safeCell_(unit),price,stock,input.visible,pack.perBox,pack.perCarton,imageUrl];
  if(matches.length){
   const m=matches[0];if(!input.version||digest_(JSON.stringify(m.r))!==input.version)throw new Error('Sản phẩm đã thay đổi. Bấm Làm mới và sửa lại.');
   data.sh.getRange(m.i+2,1,1,11).setValues([values]);
  }else{if(input.version)throw new Error('Sản phẩm đã bị xóa. Bấm Làm mới.');data.sh.appendRow(values);}
  return true;
 }finally{lock.releaseLock();}
}

// Cầu nối Netlify. Chỉ cho phép các nghiệp vụ công khai đã định nghĩa;
// các nghiệp vụ quản trị vẫn kiểm tra phiên tại từng hàm.
function doPost(event){
 try{
  const raw=event&&event.postData&&event.postData.contents;
  if(typeof raw!=='string'||raw.length>65536)throw new Error('Yêu cầu không hợp lệ.');
  const input=JSON.parse(raw);
  const methods={getCatalog:{fn:getCatalog,count:0},placeOrder:{fn:placeOrder,count:1},adminLogin:{fn:adminLogin,count:1},adminLogout:{fn:adminLogout,count:1},adminSnapshot:{fn:adminSnapshot,count:1},adminSetStatus:{fn:adminSetStatus,count:4},adminSaveProduct:{fn:adminSaveProduct,count:2}};
  if(!input||!Object.prototype.hasOwnProperty.call(methods,input.method))throw new Error('Nghiệp vụ không được hỗ trợ.');
  const route=methods[input.method];
  if(!Array.isArray(input.args)||input.args.length!==route.count)throw new Error('Tham số không hợp lệ.');
  return json_({apiVersion:1,ok:true,data:route.fn.apply(null,input.args)});
 }catch(error){return json_({apiVersion:1,ok:false,error:String(error.message||'Không xử lý được yêu cầu.')});}
}
function json_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
