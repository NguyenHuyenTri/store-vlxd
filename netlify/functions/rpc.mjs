const ROUTES = Object.freeze({getCatalog:0,placeOrder:1,adminLogin:1,adminLogout:1,adminSnapshot:1,adminSetStatus:4,adminSaveProduct:2});
const MAX_BYTES = 65536;
const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const respond = (status,body) => new Response(JSON.stringify(body),{status,headers});
// Factory permits tests without credentials or real customer data.
export function createHandler({fetchImpl=globalThis.fetch,env=process.env}={}){
 return async function handler(request){
  if(request.method!=='POST')return respond(405,{ok:false,error:'Chỉ hỗ trợ POST.'});
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return respond(403,{ok:false,error:'Nguồn yêu cầu không hợp lệ.'});
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return respond(415,{ok:false,error:'Yêu cầu phải có định dạng JSON.'});
  if(Number(request.headers.get('content-length'))>MAX_BYTES)return respond(413,{ok:false,error:'Yêu cầu quá lớn.'});
  let input;
  try{const body=await request.text();if(Buffer.byteLength(body,'utf8')>MAX_BYTES)return respond(413,{ok:false,error:'Yêu cầu quá lớn.'});input=JSON.parse(body);}catch{return respond(400,{ok:false,error:'Dữ liệu JSON không hợp lệ.'});}
  if(!input||!Object.hasOwn(ROUTES,input.method)||!Array.isArray(input.args)||input.args.length!==ROUTES[input.method])return respond(400,{ok:false,error:'Nghiệp vụ hoặc tham số không hợp lệ.'});
  // Fixed server-side destination: a visitor cannot select a proxy target.
  let endpoint;
  try{endpoint=new URL(env.APPS_SCRIPT_URL);if(endpoint.protocol!=='https:'||endpoint.hostname!=='script.google.com'||endpoint.port||endpoint.username||endpoint.password||!/^\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(endpoint.pathname)||endpoint.search||endpoint.hash)throw Error();}
  catch{return respond(503,{ok:false,error:'Chưa cấu hình APPS_SCRIPT_URL hợp lệ trong Netlify. Liên hệ cửa hàng.'});}
  try{
   const response=await fetchImpl(endpoint.href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:input.method,args:input.args}),redirect:'follow',signal:AbortSignal.timeout(25000)});
   if(!response.ok)return respond(502,{ok:false,error:'Không kết nối được Google Trang tính. Vui lòng thử lại.'});
   let result;try{result=await response.json()}catch{return respond(502,{ok:false,error:'Đầu nối dữ liệu chưa sẵn sàng. Cần cập nhật Code.gs và triển khai phiên bản Apps Script mới.'});}
   if(!result||result.apiVersion!==1||typeof result.ok!=='boolean')return respond(502,{ok:false,error:'Phiên bản đầu nối dữ liệu không phù hợp. Cần cập nhật Apps Script.'});
   if(!result.ok)return respond(400,{ok:false,error:typeof result.error==='string'?result.error:'Không thực hiện được yêu cầu.'});
   return respond(200,{ok:true,data:result.data});
  }catch(error){return respond(error.name==='TimeoutError'||error.name==='AbortError'?504:502,{ok:false,error:'Kết nối đang chậm hoặc bị gián đoạn. Vui lòng thử lại; đơn gửi lại giữ nguyên mã để tránh trùng.'});}
 };
}
export default createHandler();
export const config = {path:'/api/rpc'};
