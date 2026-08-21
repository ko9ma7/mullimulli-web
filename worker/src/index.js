const COURIERS = {
  pigeon:{speed:60,fail:0.08}, plane:{speed:120,fail:0.16}, butterfly:{speed:12,fail:0.18},
  bee:{speed:24,fail:0.12}, hedgehog:{speed:4,fail:0.10}, turtle:{speed:0.7,fail:0.06}, snail:{speed:0.03,fail:0.03}
};
const AVATARS=['🦊','🐰','🐱','🐻','🦝','🐶','🐼','🐿️'];
const enc = new TextEncoder();
const dec = new TextDecoder();

export default {
  async fetch(request, env){
    const origin=request.headers.get('Origin')||'';
    const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
    const corsOrigin=allowed.includes(origin)?origin:(allowed.includes('*')?'*':'');
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:corsHeaders(corsOrigin)});
    try{
      const url=new URL(request.url), p=url.pathname.replace(/\/$/,'');
      if(p==='/api/health' && request.method==='GET') return json({ok:true,service:'mullimulli-api'},200,corsOrigin);
      if(p==='/api/signup' && request.method==='POST') return withCors(await signup(request,env),corsOrigin);
      if(p==='/api/login' && request.method==='POST') return withCors(await login(request,env),corsOrigin);
      const user=await authenticate(request,env);
      if(!user) return json({error:'로그인이 필요합니다.'},401,corsOrigin);
      if(p==='/api/logout' && request.method==='POST') return withCors(await logout(request,env),corsOrigin);
      if(p==='/api/me' && request.method==='GET') return json({user:publicUser(user)},200,corsOrigin);
      if(p==='/api/location' && request.method==='POST') return withCors(await setLocation(request,env,user),corsOrigin);
      if(p==='/api/users/search' && request.method==='GET') return withCors(await searchUsers(url,env,user),corsOrigin);
      if(p==='/api/friends' && request.method==='GET') return withCors(await listFriends(env,user),corsOrigin);
      if(p==='/api/friends' && request.method==='POST') return withCors(await addFriend(request,env,user),corsOrigin);
      if(p==='/api/messages' && request.method==='POST') return withCors(await createMessage(request,env,user),corsOrigin);
      if(p==='/api/messages' && request.method==='GET') return withCors(await listMessages(env,user),corsOrigin);
      return json({error:'지원하지 않는 경로입니다.'},404,corsOrigin);
    }catch(e){
      console.error(e); return json({error:'서버에서 요청을 처리하지 못했습니다.'},500,corsOrigin);
    }
  }
};

function corsHeaders(origin){const h={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}; if(origin){h['access-control-allow-origin']=origin;h['vary']='Origin';h['access-control-allow-methods']='GET,POST,OPTIONS';h['access-control-allow-headers']='content-type,authorization';}return h;}
function json(data,status=200,origin=''){return new Response(JSON.stringify(data),{status,headers:corsHeaders(origin)});}
function withCors(response,origin){const h=new Headers(response.headers);for(const [k,v] of Object.entries(corsHeaders(origin)))h.set(k,v);return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});}
function bad(message,status=400){return json({error:message},status);}
function now(){return Date.now();}
function randomId(prefix){return `${prefix}_${crypto.randomUUID()}`;}
function rand(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;}
function normalizeHandle(v){return String(v||'').trim().toLowerCase();}
function publicUser(u){return {id:u.id,handle:u.handle,nickname:u.nickname,avatar:u.avatar,lat:u.last_lat??null,lon:u.last_lon??null,updatedAt:u.last_location_at??null};}

async function bodyJson(req){try{return await req.json();}catch{return null;}}
async function signup(req,env){
  const b=await bodyJson(req); if(!b)return bad('잘못된 요청입니다.');
  const handle=normalizeHandle(b.handle), nickname=String(b.nickname||'').trim(), pin=String(b.pin||'');
  if(!/^[a-z0-9_]{3,20}$/.test(handle))return bad('아이디는 영문 소문자, 숫자, _ 조합 3~20자여야 합니다.');
  if(nickname.length<2||nickname.length>24)return bad('닉네임은 2~24자로 입력해 주세요.');
  if(pin.length<6||pin.length>128)return bad('PIN/비밀번호는 6~128자로 입력해 주세요.');
  const exists=await env.DB.prepare('SELECT id FROM users WHERE handle=?').bind(handle).first(); if(exists)return bad('이미 사용 중인 아이디입니다.',409);
  const salt=randomBytes(16), hash=await hashPassword(pin,salt); const id=randomId('u'), created=now(), avatar=AVATARS[Math.floor(rand()*AVATARS.length)];
  await env.DB.prepare('INSERT INTO users(id,handle,nickname,avatar,password_salt,password_hash,created_at) VALUES(?,?,?,?,?,?,?)').bind(id,handle,nickname,avatar,b64(salt),b64(hash),created).run();
  const token=await newSession(env,id); return json({token,user:{id,handle,nickname,avatar,lat:null,lon:null,updatedAt:null}},201);
}
async function login(req,env){
  const b=await bodyJson(req); const handle=normalizeHandle(b?.handle), pin=String(b?.pin||'');
  const u=await env.DB.prepare('SELECT * FROM users WHERE handle=?').bind(handle).first(); if(!u)return bad('아이디 또는 비밀번호가 맞지 않습니다.',401);
  const hash=await hashPassword(pin,fromB64(u.password_salt)); if(!timingSafeEqual(hash,fromB64(u.password_hash)))return bad('아이디 또는 비밀번호가 맞지 않습니다.',401);
  const token=await newSession(env,u.id); return json({token,user:publicUser(u)});
}
async function logout(req,env){const token=bearer(req);if(token)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256hex(token)).run();return json({ok:true});}
async function newSession(env,userId){const token=b64url(randomBytes(32));const hash=await sha256hex(token);const t=now();await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(hash,userId,t+30*86400000,t).run();return token;}
async function authenticate(req,env){const token=bearer(req);if(!token)return null;const h=await sha256hex(token);return await env.DB.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(h,now()).first();}
function bearer(req){const h=req.headers.get('authorization')||'';return h.startsWith('Bearer ')?h.slice(7).trim():'';}
async function setLocation(req,env,user){const b=await bodyJson(req);let lat=Number(b?.lat),lon=Number(b?.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return bad('유효한 위치 좌표가 아닙니다.');lat=Math.round(lat*1000)/1000;lon=Math.round(lon*1000)/1000;const t=now();await env.DB.prepare('UPDATE users SET last_lat=?,last_lon=?,last_location_at=? WHERE id=?').bind(lat,lon,t,user.id).run();user.last_lat=lat;user.last_lon=lon;user.last_location_at=t;return json({user:publicUser(user)});}
async function searchUsers(url,env,user){const q=(url.searchParams.get('q')||'').trim().toLowerCase();if(q.length<2)return json({users:[]});const like=`%${q.replace(/[%_]/g,'')}%`;const rows=await env.DB.prepare('SELECT id,handle,nickname,avatar,last_location_at FROM users WHERE id<>? AND (handle LIKE ? OR lower(nickname) LIKE ?) ORDER BY handle LIMIT 12').bind(user.id,like,like).all();return json({users:(rows.results||[]).map(u=>({id:u.id,handle:u.handle,nickname:u.nickname,avatar:u.avatar,lat:null,lon:null,updatedAt:u.last_location_at??null}))});}
async function listFriends(env,user){const r=await env.DB.prepare('SELECT u.id,u.handle,u.nickname,u.avatar,u.last_location_at FROM friends f JOIN users u ON u.id=f.friend_id WHERE f.user_id=? ORDER BY u.nickname').bind(user.id).all();return json({friends:(r.results||[]).map(u=>({id:u.id,handle:u.handle,nickname:u.nickname,avatar:u.avatar,lat:u.last_location_at?1:null,lon:null,updatedAt:u.last_location_at??null}))});}
async function addFriend(req,env,user){const b=await bodyJson(req),friendId=String(b?.userId||'');if(!friendId||friendId===user.id)return bad('친구를 선택해 주세요.');const exists=await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(friendId).first();if(!exists)return bad('사용자를 찾을 수 없습니다.',404);const t=now();await env.DB.batch([env.DB.prepare('INSERT OR IGNORE INTO friends(user_id,friend_id,created_at) VALUES(?,?,?)').bind(user.id,friendId,t),env.DB.prepare('INSERT OR IGNORE INTO friends(user_id,friend_id,created_at) VALUES(?,?,?)').bind(friendId,user.id,t)]);return json({ok:true},201);}
async function createMessage(req,env,user){
  const b=await bodyJson(req),toId=String(b?.toUserId||''),text=String(b?.body||'').trim(),courierId=String(b?.courierId||'');const c=COURIERS[courierId];
  if(!c)return bad('지원하지 않는 전달자입니다.'); if(!toId||toId===user.id)return bad('받는 사람을 선택해 주세요.'); if(!text||text.length>500)return bad('메시지는 1~500자로 입력해 주세요.');
  const friend=await env.DB.prepare('SELECT 1 ok FROM friends WHERE user_id=? AND friend_id=?').bind(user.id,toId).first();if(!friend)return bad('친구에게만 편지를 보낼 수 있습니다.',403);
  const to=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(toId).first();if(!to)return bad('받는 사람을 찾을 수 없습니다.',404);
  if(user.last_lat==null||user.last_lon==null||to.last_lat==null||to.last_lon==null)return bad('두 사람 모두 최근 위치를 업데이트해야 합니다.');
  const distance=Math.max(.1,haversine(user.last_lat,user.last_lon,to.last_lat,to.last_lon)), serviceHours=distance/c.speed, created=now(), arrival=created+Math.max(1000,serviceHours*3600000);
  const fail=rand()<c.fail, failureAt=fail?Math.floor(created+(arrival-created)*(.22+rand()*.62)):null; const sealed=await encryptMessage(text,env.MESSAGE_KEY); const id=randomId('m');
  await env.DB.prepare(`INSERT INTO messages(id,from_id,to_id,courier_id,distance_km,service_hours,created_at,arrival_at,failure_at,body_iv,body_cipher) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(id,user.id,toId,courierId,distance,serviceHours,created,arrival,failureAt,sealed.iv,sealed.cipher).run();
  return json({message:{id,fromId:user.id,toId,courierId,distanceKm:distance,serviceHours,createdAt:created,arrivalAt:arrival,failureAt:null,status:'transit'}},201);
}
async function listMessages(env,user){
  const r=await env.DB.prepare('SELECT * FROM messages WHERE from_id=? OR to_id=? ORDER BY created_at DESC LIMIT 200').bind(user.id,user.id).all();const rows=r.results||[], ids=[...new Set(rows.flatMap(m=>[m.from_id,m.to_id]))];
  const users={};for(const id of ids){const u=await env.DB.prepare('SELECT id,handle,nickname,avatar FROM users WHERE id=?').bind(id).first();if(u)users[id]=u;}
  const out=[];for(const m of rows){const status=messageStatus(m),sender=m.from_id===user.id;let body=null;if(sender||(status==='delivered'&&!m.failure_at))body=await decryptMessage(m.body_iv,m.body_cipher,env.MESSAGE_KEY);out.push({id:m.id,fromId:m.from_id,toId:m.to_id,courierId:m.courier_id,distanceKm:m.distance_km,serviceHours:m.service_hours,createdAt:m.created_at,arrivalAt:m.arrival_at,failureAt:status==='failed'?m.failure_at:null,status,body,from:users[m.from_id],to:users[m.to_id]});}
  return json({messages:out});
}
function messageStatus(m){const t=now();if(m.failure_at&&t>=m.failure_at)return'failed';if(t>=m.arrival_at)return'delivered';return'transit';}
function haversine(lat1,lon1,lat2,lon2){const R=6371,r=x=>x*Math.PI/180,dLat=r(lat2-lat1),dLon=r(lon2-lon1),a=Math.sin(dLat/2)**2+Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}

async function hashPassword(pin,salt){const key=await crypto.subtle.importKey('raw',enc.encode(pin),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:210000},key,256);return new Uint8Array(bits);}
function timingSafeEqual(a,b){if(a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a[i]^b[i];return v===0;}
function randomBytes(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return a;}
async function sha256hex(v){const d=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(v)));return [...d].map(x=>x.toString(16).padStart(2,'0')).join('');}
function b64(bytes){let s='';for(const x of bytes)s+=String.fromCharCode(x);return btoa(s);}
function fromB64(s){const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a;}
function b64url(bytes){return b64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function aesKey(secret){if(!secret)throw new Error('MESSAGE_KEY secret is required');let raw;try{raw=fromB64(secret);}catch{raw=enc.encode(secret);}if(raw.length!==32)raw=new Uint8Array(await crypto.subtle.digest('SHA-256',raw));return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);}
async function encryptMessage(text,secret){const iv=randomBytes(12),key=await aesKey(secret),cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(text)));return{iv:b64(iv),cipher:b64(cipher)};}
async function decryptMessage(iv,cipher,secret){const key=await aesKey(secret),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(iv)},key,fromB64(cipher));return dec.decode(plain);}
