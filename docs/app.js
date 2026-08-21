const CONFIG = window.MULLIMULLI_CONFIG || {};
const API_BASE = (CONFIG.apiBaseUrl || '').replace(/\/$/, '');
const DEMO_SCALE = Math.max(1, Number(CONFIG.demoTimeAcceleration || 1));
const BUILD_VERSION = CONFIG.buildVersion || '3.0.0';
const STORE_KEY = 'mullimulli.demo.v2';
const SESSION_KEY = 'mullimulli.session.v1';
const THEME_KEY = 'mullimulli.theme.v1';
const API_TOKEN_KEY = 'mullimulli.api.token';
const DEMO_DATA_VERSION = 3;
const LEGACY_SAMPLE_HANDLES = new Set(['sunnyday', 'windcloud', 'moonstar', 'happy01', 'bluewhale', 'travelerrr', 'starr_y']);
const AVATARS = ['🦊','🐰','🐱','🐻','🦝','🐶','🐼','🐿️','🦉','🐧','🐸','🦦','🐯','🐨','🦄','🌙','⭐','🌿'];

const COURIERS = window.MULLIMULLI_COURIERS || [];
const DISTANCE_FILTERS = window.MULLIMULLI_DISTANCE_FILTERS || [];
const SYSTEM_ADMIN = profileDefaults({id:'u_admin',handle:'admin',nickname:'멀리멀리 관리자',avatar:'🕊️',system:true,lat:null,lon:null,updatedAt:null,discoverable:false,allowFriendAdd:false,bio:'거리별 배송 시간을 시험하는 시스템 우편함입니다.'});
const DEMO_SELF = profileDefaults({id:'u_starlight',handle:'starlight',nickname:'나의 테스트 계정',avatar:'🦊',lat:37.5665,lon:126.9780,updatedAt:Date.now()-1000*60*9,bio:'멀리멀리 기능을 확인하는 로컬 테스트 계정입니다.'});
const DEMO_DISTANCE_PRESETS = [0.5,2,8,25,80,300,1000,5000,12000];

const state = {
  me:null,
  tab:'send',
  courier:'pigeon',
  courierFilter:'recommended',
  courierSort:'recommended',
  routePreview:null,
  selectedFriend:null,
  search:'',
  theme:localStorage.getItem(THEME_KEY) || 'light',
  refreshTimer:null,
  authMode:'login',
  demoDistanceKm:25
};

document.body.classList.add(`theme-${state.theme}`);

function profileDefaults(user={}){
  return {
    bio:'',
    discoverable:true,
    showLocationAge:true,
    allowFriendAdd:true,
    ...user
  };
}
function uid(prefix='id'){ return `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`; }
function escapeHtml(v=''){ return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function clamp(n,min,max){ return Math.min(max,Math.max(min,n)); }
function normalizeSearch(v=''){ return String(v).trim().replace(/^@+/, '').toLowerCase(); }
function haversine(a,b){
  const R=6371, toRad=d=>d*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLon=toRad(b.lon-a.lon);
  const x=Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function fmtDuration(hours){
  if(!Number.isFinite(hours)) return '위치 필요';
  if(hours < 1/60) return '1분 미만';
  if(hours < 1) return `약 ${Math.max(1,Math.round(hours*60))}분`;
  if(hours < 24) return `약 ${Math.round(hours*10)/10}시간`;
  if(hours < 24*30) return `약 ${Math.round(hours/24*10)/10}일`;
  if(hours < 24*365) return `약 ${Math.round(hours/(24*30)*10)/10}개월`;
  return `약 ${Math.round(hours/(24*365)*10)/10}년`;
}
function fmtSpeed(kmh){
  if(!Number.isFinite(kmh)) return '-';
  if(kmh>=1) return `${Math.round(kmh*100)/100} km/h`;
  const meters=kmh*1000;
  if(meters>=1) return `${Math.round(meters*100)/100} m/h`;
  return `${Math.round(meters*100000)/1000} cm/h`;
}
function fmtDate(ts){ return new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ts)); }
function fmtAgo(ts){
  if(!ts) return '업데이트 없음';
  const sec=Math.max(0,Math.floor((Date.now()-ts)/1000));
  if(sec<60)return '방금 전';
  if(sec<3600)return `${Math.floor(sec/60)}분 전`;
  if(sec<86400)return `${Math.floor(sec/3600)}시간 전`;
  return `${Math.floor(sec/86400)}일 전`;
}
function toast(message){
  const region=document.querySelector('#toast-region');
  if(!region) return;
  const el=document.createElement('div'); el.className='toast'; el.textContent=message;
  region.append(el); setTimeout(()=>el.remove(),3600);
}
function setTheme(theme){
  ['theme-light','theme-dark','theme-system'].forEach(c=>document.body.classList.remove(c));
  state.theme=theme; document.body.classList.add(`theme-${theme}`); localStorage.setItem(THEME_KEY,theme); render();
}
function newDemoDb(){
  return {version:DEMO_DATA_VERSION,users:[{...DEMO_SELF},{...SYSTEM_ADMIN}],friends:{u_starlight:[]},messages:[],pins:{starlight:'123456'}};
}
function migrateDemoDb(raw){
  const db=raw && typeof raw==='object' ? raw : newDemoDb();
  db.users=Array.isArray(db.users)?db.users:[];
  db.friends=db.friends&&typeof db.friends==='object'?db.friends:{};
  db.messages=Array.isArray(db.messages)?db.messages:[];
  db.pins=db.pins&&typeof db.pins==='object'?db.pins:{};

  // v3 removes the old fake friends while preserving accounts the user actually created.
  const removedIds=new Set(db.users.filter(u=>LEGACY_SAMPLE_HANDLES.has(String(u.handle||'').toLowerCase())).map(u=>u.id));
  db.users=db.users.filter(u=>!removedIds.has(u.id)).map(u=>profileDefaults(u));
  if(!db.users.some(u=>u.id===DEMO_SELF.id)) db.users.unshift({...DEMO_SELF});
  if(!db.users.some(u=>u.id===SYSTEM_ADMIN.id)) db.users.push({...SYSTEM_ADMIN});
  else db.users=db.users.map(u=>u.id===SYSTEM_ADMIN.id?{...SYSTEM_ADMIN}:u);
  db.pins.starlight ||= '123456';

  const validIds=new Set(db.users.map(u=>u.id));
  for(const id of Object.keys(db.friends)){
    if(!validIds.has(id)){ delete db.friends[id]; continue; }
    db.friends[id]=[...new Set((db.friends[id]||[]).filter(fid=>validIds.has(fid)&&fid!==id&&!removedIds.has(fid)&&fid!==SYSTEM_ADMIN.id))];
  }
  for(const u of db.users) db.friends[u.id] ||= [];
  // Local demo friendships behave like the online backend: adding once links both sides.
  for(const [id,list] of Object.entries(db.friends)){
    for(const fid of list){
      db.friends[fid] ||= [];
      if(!db.friends[fid].includes(id)) db.friends[fid].push(id);
    }
  }
  db.version=DEMO_DATA_VERSION;
  return db;
}
function demoDb(){
  let raw=null;
  try{ raw=JSON.parse(localStorage.getItem(STORE_KEY)||'null'); }catch{}
  const db=migrateDemoDb(raw);
  localStorage.setItem(STORE_KEY,JSON.stringify(db));
  return db;
}
function saveDemo(db){ db.version=DEMO_DATA_VERSION; localStorage.setItem(STORE_KEY,JSON.stringify(db)); }
function demoMe(){
  let s=null; try{s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{}
  if(!s)return null;
  return demoDb().users.find(u=>u.id===s.userId)||null;
}
function currentCourier(){ return COURIERS.find(c=>c.id===state.courier)||COURIERS[0]; }
function userById(id){ return demoDb().users.find(u=>u.id===id); }
function demoAdmin(){ return demoDb().users.find(u=>u.id===SYSTEM_ADMIN.id)||SYSTEM_ADMIN; }
function isDemoAdmin(friend){ return !API_BASE && friend?.id===SYSTEM_ADMIN.id; }
function recipientReady(friend){ return !!friend && !!state.me?.updatedAt && (isDemoAdmin(friend) || !!friend.updatedAt); }
function serviceHoursFor(distance,courier){
  if(!Number.isFinite(distance)||!courier) return null;
  const travel=(distance*(courier.routeFactor||1))/Math.max(0.000001,courier.speed);
  return Math.max(Number(courier.minHours||0),travel);
}
function syntheticPointFrom(origin,distanceKm){
  if(origin?.lat==null||origin?.lon==null) return {lat:null,lon:null};
  const lat=Number(origin.lat), lon=Number(origin.lon);
  const dLon=distanceKm/(111.32*Math.max(.2,Math.cos(lat*Math.PI/180)));
  return {lat,lon:Number((lon+dLon).toFixed(4))};
}
function previewDistance(friend){
  if(!friend) return null;
  if(isDemoAdmin(friend)) return state.me?.lat!=null ? state.demoDistanceKm : null;
  if(!API_BASE && state.me?.lat!=null && friend?.lat!=null) return Math.max(.1,haversine(state.me,friend));
  if(API_BASE && state.routePreview?.friendId===friend.id && Number.isFinite(state.routePreview.distanceKm)) return state.routePreview.distanceKm;
  return null;
}
async function loadRoutePreview(friend){
  if(!friend){ state.routePreview=null; return; }
  if(!API_BASE){ const d=previewDistance(friend); state.routePreview=d==null?null:{friendId:friend.id,distanceKm:d}; return; }
  if(state.routePreview?.friendId===friend.id && Number.isFinite(state.routePreview.distanceKm)) return;
  state.routePreview={friendId:friend.id,distanceKm:null,loading:true};
  try{
    const data=await api('/api/route-preview',{method:'POST',body:JSON.stringify({toUserId:friend.id})});
    state.routePreview={friendId:friend.id,distanceKm:Number(data.distanceKm),loading:false};
  }catch(e){ state.routePreview={friendId:friend.id,distanceKm:null,loading:false,error:e.message}; }
}
function routeEstimate(friend,courier=currentCourier()){
  const distance=previewDistance(friend);
  if(distance==null) return {distance:null,hours:null,eta:null};
  const hours=serviceHoursFor(distance,courier);
  return {distance,hours,eta:Date.now()+hours*3600*1000};
}
function distanceLabel(distance){
  if(!Number.isFinite(distance)) return '거리 확인 전';
  if(distance<3) return '초근거리';
  if(distance<15) return '동네 거리';
  if(distance<50) return '도시 거리';
  if(distance<200) return '광역 거리';
  if(distance<800) return '지역 장거리';
  if(distance<2500) return '국가·국경 거리';
  return '대륙·세계 거리';
}
function rangeLabel(c){
  if(c.capsule) return c.maxKm>=20000?'거리 제한 없음에 가까움':`최대 ${c.maxKm.toLocaleString()}km 권장`;
  if(c.minKm<=0) return `0~${c.maxKm.toLocaleString()}km 권장`;
  return `${c.minKm.toLocaleString()}~${c.maxKm.toLocaleString()}km 권장`;
}
function courierMatchesDistance(c,distance){ return Number.isFinite(distance) && distance>=c.minKm && distance<=c.maxKm; }
function filterCouriers(distance){
  let list=[...COURIERS];
  const filter=DISTANCE_FILTERS.find(x=>x.id===state.courierFilter);
  if(state.courierFilter==='recommended' && Number.isFinite(distance)) list=list.filter(c=>!c.capsule&&courierMatchesDistance(c,distance));
  else if(filter?.capsule) list=list.filter(c=>c.capsule);
  else if(Number.isFinite(filter?.minKm) && Number.isFinite(filter?.maxKm)) list=list.filter(c=>!c.capsule && c.maxKm>=filter.minKm && c.minKm<=filter.maxKm);
  if(!list.length) list=[...COURIERS];
  if(state.courierSort==='fast') list.sort((a,b)=>serviceHoursFor(distance||100,a)-serviceHoursFor(distance||100,b));
  else if(state.courierSort==='slow') list.sort((a,b)=>serviceHoursFor(distance||100,b)-serviceHoursFor(distance||100,a));
  else if(state.courierSort==='safe') list.sort((a,b)=>a.fail-b.fail);
  else if(Number.isFinite(distance)) list.sort((a,b)=>Number(courierMatchesDistance(b,distance))-Number(courierMatchesDistance(a,distance)) || a.fail-b.fail || serviceHoursFor(distance,a)-serviceHoursFor(distance,b));
  return list;
}
function statusFor(m){
  if(API_BASE && m.status) return m.status;
  const t=Date.now();
  if(m.failureAt && t>=m.failureAt) return 'failed';
  if(t>=m.arrivalAt) return 'delivered';
  return 'transit';
}
function progressFor(m){
  const status=statusFor(m); if(status==='delivered'||status==='failed') return 100;
  return clamp(((Date.now()-m.createdAt)/(m.arrivalAt-m.createdAt))*100,1,99);
}

async function api(path,opts={}){
  const token=localStorage.getItem(API_TOKEN_KEY)||'';
  let res;
  try{
    res=await fetch(`${API_BASE}${path}`,{...opts,headers:{'content-type':'application/json',...(token?{'authorization':`Bearer ${token}`}:{ }),...(opts.headers||{})}});
  }catch{
    throw new Error('온라인 API에 연결하지 못했습니다. Worker 주소와 CORS 설정을 확인해 주세요.');
  }
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||'요청을 처리하지 못했습니다.');
  return data;
}
async function login(handle,pin){
  if(API_BASE){
    const data=await api('/api/login',{method:'POST',body:JSON.stringify({handle,pin})});
    localStorage.setItem(API_TOKEN_KEY,data.token); state.me=profileDefaults(data.user); return;
  }
  const db=demoDb(); const clean=String(handle||'').trim().toLowerCase(); const u=db.users.find(x=>x.handle.toLowerCase()===clean);
  if(!u || db.pins[u.handle]!==pin) throw new Error('아이디 또는 PIN이 맞지 않습니다. 기본 데모 계정은 starlight / 123456 입니다.');
  localStorage.setItem(SESSION_KEY,JSON.stringify({userId:u.id})); state.me=profileDefaults(u);
}
async function signup(handle,nickname,pin){
  if(API_BASE){
    const data=await api('/api/signup',{method:'POST',body:JSON.stringify({handle,nickname,pin})});
    localStorage.setItem(API_TOKEN_KEY,data.token); state.me=profileDefaults(data.user); return;
  }
  const db=demoDb(); handle=String(handle||'').trim().toLowerCase(); nickname=String(nickname||'').trim();
  if(!/^[a-z0-9_]{3,20}$/.test(handle)) throw new Error('아이디는 영문 소문자, 숫자, _ 조합 3~20자로 입력해 주세요.');
  if(db.users.some(u=>u.handle===handle)) throw new Error('이미 사용 중인 아이디입니다.');
  if(nickname.length<2||nickname.length>24) throw new Error('닉네임은 2~24자로 입력해 주세요.');
  if(String(pin).length<6) throw new Error('PIN은 6자 이상 입력해 주세요.');
  const u=profileDefaults({id:uid('u'),handle,nickname,avatar:AVATARS[Math.floor(Math.random()*AVATARS.length)],lat:null,lon:null,updatedAt:null});
  db.users.push(u); db.pins[handle]=String(pin); db.friends[u.id]=[]; saveDemo(db); localStorage.setItem(SESSION_KEY,JSON.stringify({userId:u.id})); state.me=u;
}
async function logout(){
  if(API_BASE){try{await api('/api/logout',{method:'POST'});}catch{} localStorage.removeItem(API_TOKEN_KEY);} else localStorage.removeItem(SESSION_KEY);
  state.me=null; state.selectedFriend=null; state.routePreview=null; render();
}
async function getFriends(){
  if(API_BASE) return (await api('/api/friends')).friends.map(profileDefaults);
  const db=demoDb(); return (db.friends[state.me.id]||[]).map(id=>db.users.find(u=>u.id===id)).filter(Boolean).map(profileDefaults);
}
async function findUsers(q){
  const needle=normalizeSearch(q); if(!needle) return [];
  if(API_BASE) return (await api(`/api/users/search?q=${encodeURIComponent(needle)}`)).users.map(profileDefaults);
  const db=demoDb(), friendIds=new Set(db.friends[state.me.id]||[]);
  return db.users
    .filter(u=>u.id!==state.me.id&&!u.system&&u.discoverable!==false&&(u.handle.toLowerCase().includes(needle)||String(u.nickname||'').toLowerCase().includes(needle)))
    .sort((a,b)=>Number(b.handle.toLowerCase()===needle)-Number(a.handle.toLowerCase()===needle)||Number(String(b.nickname||'').toLowerCase()===needle)-Number(String(a.nickname||'').toLowerCase()===needle)||a.handle.localeCompare(b.handle))
    .slice(0,12)
    .map(u=>({...profileDefaults(u),isFriend:friendIds.has(u.id)}));
}
async function addFriend(userId){
  if(API_BASE) return await api('/api/friends',{method:'POST',body:JSON.stringify({userId})});
  const db=demoDb(), target=db.users.find(u=>u.id===userId);
  if(!target) throw new Error('사용자를 찾을 수 없습니다.');
  if(target.system) throw new Error('시스템 우편함은 친구로 추가할 수 없습니다.');
  if(target.allowFriendAdd===false) throw new Error('이 사용자는 현재 친구 추가를 받지 않습니다.');
  db.friends[state.me.id] ||= []; db.friends[target.id] ||= [];
  if(!db.friends[state.me.id].includes(target.id)) db.friends[state.me.id].push(target.id);
  if(!db.friends[target.id].includes(state.me.id)) db.friends[target.id].push(state.me.id);
  saveDemo(db); return {ok:true};
}
async function updateProfile(changes){
  const nickname=String(changes.nickname||'').trim(), bio=String(changes.bio||'').trim(), avatar=String(changes.avatar||'🙂');
  if(nickname.length<2||nickname.length>24) throw new Error('닉네임은 2~24자로 입력해 주세요.');
  if(bio.length>100) throw new Error('소개는 100자 이하로 입력해 주세요.');
  if(!AVATARS.includes(avatar)) throw new Error('지원하지 않는 프로필 아이콘입니다.');
  const payload={nickname,bio,avatar,discoverable:!!changes.discoverable,showLocationAge:!!changes.showLocationAge,allowFriendAdd:!!changes.allowFriendAdd};
  if(API_BASE){ const data=await api('/api/profile',{method:'POST',body:JSON.stringify(payload)}); state.me=profileDefaults(data.user); return state.me; }
  const db=demoDb(), me=db.users.find(u=>u.id===state.me.id); if(!me) throw new Error('현재 계정을 찾을 수 없습니다.');
  Object.assign(me,payload); saveDemo(db); state.me=profileDefaults(me); return state.me;
}
async function updateLocation(){
  if(!navigator.geolocation) throw new Error('이 브라우저에서는 위치 기능을 사용할 수 없습니다.');
  const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:10000,maximumAge:60000}));
  const lat=Number(pos.coords.latitude.toFixed(3)), lon=Number(pos.coords.longitude.toFixed(3));
  if(API_BASE){ const data=await api('/api/location',{method:'POST',body:JSON.stringify({lat,lon})}); state.me=profileDefaults(data.user); }
  else { const db=demoDb(); const me=db.users.find(u=>u.id===state.me.id); Object.assign(me,{lat,lon,updatedAt:Date.now()}); saveDemo(db); state.me=profileDefaults(me); }
}
async function sendMessage(toId,body,courierId){
  if(API_BASE) return await api('/api/messages',{method:'POST',body:JSON.stringify({toUserId:toId,body,courierId})});
  const db=demoDb(), to=db.users.find(u=>u.id===toId), c=COURIERS.find(x=>x.id===courierId);
  if(!to) throw new Error('받는 사람을 찾을 수 없습니다.');
  if(state.me.lat==null) throw new Error('먼저 내 위치를 업데이트해 주세요.');
  const adminTest=isDemoAdmin(to);
  if(!adminTest&&to.lat==null) throw new Error('받는 사람도 최근 위치를 업데이트해야 합니다.');
  if(!adminTest&&!(db.friends[state.me.id]||[]).includes(to.id)) throw new Error('친구에게만 편지를 보낼 수 있습니다.');
  const distance=adminTest?state.demoDistanceKm:Math.max(.1,haversine(state.me,to));
  const target=adminTest?syntheticPointFrom(state.me,distance):to;
  const serviceHours=serviceHoursFor(distance,c);
  const realDuration=Math.max(60000,serviceHours*3600*1000/DEMO_SCALE);
  const willFail=crypto.getRandomValues(new Uint32Array(1))[0]/2**32 < c.fail;
  const failureAt=willFail ? Date.now()+realDuration*(.22+(crypto.getRandomValues(new Uint32Array(1))[0]/2**32)*.62) : null;
  const m={id:uid('m'),fromId:state.me.id,toId:to.id,body,courierId,createdAt:Date.now(),arrivalAt:Date.now()+realDuration,failureAt,distanceKm:distance,serviceHours,originSnapshot:{lat:state.me.lat,lon:state.me.lon},targetSnapshot:{lat:target.lat,lon:target.lon},demoAdminTest:adminTest};
  db.messages.unshift(m); saveDemo(db); return m;
}
async function getMessages(){
  if(API_BASE) return (await api('/api/messages')).messages;
  return demoDb().messages.filter(m=>m.fromId===state.me.id||m.toId===state.me.id);
}

function courierCards(friend){
  const distance=previewDistance(friend), list=filterCouriers(distance);
  return list.map(c=>{
    const matched=courierMatchesDistance(c,distance), eta=Number.isFinite(distance)?fmtDuration(serviceHoursFor(distance,c)):'거리 확인 후 계산';
    return `<button class="courier-card ${state.courier===c.id?'selected':''} ${matched?'recommended':''}" data-courier="${c.id}" aria-pressed="${state.courier===c.id}"><span class="courier-topline"><span class="courier-kind">${escapeHtml(c.kind)}</span>${matched?'<span class="courier-match">추천</span>':''}</span><span class="courier-emoji">${c.emoji}</span><span class="courier-name">${escapeHtml(c.name)}</span><div class="courier-meta">${escapeHtml(c.note)}<br>기준 ${fmtSpeed(c.speed)} · 최소 ${fmtDuration(c.minHours)}</div><div class="courier-eta">${eta}</div><div class="courier-range">${rangeLabel(c)}</div><div class="courier-risk">성공률 ${100-Math.round(c.fail*100)}%</div></button>`;
  }).join('');
}
function courierFilterBar(){
  return `<div class="courier-toolbar"><div class="courier-filters" aria-label="거리별 전달자 필터">${DISTANCE_FILTERS.map(x=>`<button type="button" class="filter-chip ${state.courierFilter===x.id?'active':''}" data-courier-filter="${x.id}">${escapeHtml(x.label)}</button>`).join('')}</div><label class="courier-sort"><span>정렬</span><select id="courier-sort"><option value="recommended" ${state.courierSort==='recommended'?'selected':''}>추천순</option><option value="fast" ${state.courierSort==='fast'?'selected':''}>빠른 순</option><option value="slow" ${state.courierSort==='slow'?'selected':''}>느린 순</option><option value="safe" ${state.courierSort==='safe'?'selected':''}>안전한 순</option></select></label></div>`;
}
function navButton(tab,label,emoji){ return `<button data-tab="${tab}" aria-current="${state.tab===tab?'page':'false'}"><span>${emoji}</span>${label}</button>`; }
function bottomButton(tab,label,emoji){return `<button data-tab="${tab}" class="${state.tab===tab?'active':''}"><span>${emoji}</span>${label}</button>`;}
function logoSvg(){return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M9 29 54 10 39 54 30 38 19 46l3-13Z" fill="#e7b768" stroke="#244d3b" stroke-width="3" stroke-linejoin="round"/><path d="m22 33 23-14-15 19" fill="none" stroke="#244d3b" stroke-width="3" stroke-linecap="round"/></svg>`;}

function renderAuth(){
  document.querySelector('#app').innerHTML=`<main class="auth-wrap"><section class="auth-card" aria-labelledby="auth-title"><div class="auth-visual"><div class="brand">${logoSvg()}<span>멀리멀리</span></div><h1>메시지가<br><span style="color:var(--primary)">여행이 되는 곳.</span></h1><p>거리와 전달 방식에 따라 메시지가 실제 시간 동안 이동합니다. 이미 떠난 편지는 되돌릴 수 없습니다.</p><div class="auth-mascot">🕊️</div><div class="auth-plane">✈️</div></div><div class="auth-form"><h2 id="auth-title">${state.authMode==='login'?'다시 만났네요':'새 여행자 만들기'}</h2><p>${API_BASE?'온라인 계정 서버에 연결되어 있습니다.':'로컬 데모입니다. 같은 브라우저에서 만든 계정끼리만 서로 검색됩니다.'}</p><div class="auth-tabs"><button class="${state.authMode==='login'?'active':''}" data-auth-mode="login">로그인</button><button class="${state.authMode==='signup'?'active':''}" data-auth-mode="signup">가입</button></div><form id="auth-form"><div class="field"><label for="handle">아이디</label><input id="handle" name="handle" autocomplete="username" placeholder="영문 소문자 아이디" required /></div>${state.authMode==='signup'?`<div class="field"><label for="nickname">닉네임</label><input id="nickname" name="nickname" maxlength="24" placeholder="친구에게 보일 이름" required /></div>`:''}<div class="field"><label for="pin">PIN / 비밀번호</label><input id="pin" name="pin" type="password" autocomplete="${state.authMode==='login'?'current-password':'new-password'}" minlength="6" placeholder="6자 이상" required /></div><div class="form-error" id="auth-error"></div><button class="btn btn-primary" style="width:100%" type="submit">${state.authMode==='login'?'로그인':'가입하고 시작'}</button></form>${!API_BASE?`<div class="demo-entry"><div class="hint">기본 체험 계정은 친구 0명으로 시작합니다.</div><button id="demo-login" class="btn btn-secondary" style="width:100%;margin-top:8px">starlight / 123456로 입장</button></div>`:''}</div></section></main>`;
  bindAuth();
}
function bindAuth(){
  document.querySelectorAll('[data-auth-mode]').forEach(b=>b.onclick=()=>{state.authMode=b.dataset.authMode;renderAuth();});
  const form=document.querySelector('#auth-form');
  form.onsubmit=async e=>{e.preventDefault(); const fd=new FormData(form), err=document.querySelector('#auth-error'); err.textContent=''; try{ if(state.authMode==='login') await login(fd.get('handle'),fd.get('pin')); else await signup(fd.get('handle'),fd.get('nickname'),fd.get('pin')); await afterLogin(); }catch(ex){err.textContent=ex.message;} };
  const d=document.querySelector('#demo-login'); if(d)d.onclick=async()=>{await login('starlight','123456');await afterLogin();};
}
async function afterLogin(){ const friends=await getFriends(); state.selectedFriend=friends[0]||(!API_BASE?demoAdmin():null); state.routePreview=null; await render(); startRefresh(); }

async function render(){
  if(!state.me){ renderAuth(); return; }
  const [friends,messages]=await Promise.all([getFriends(),getMessages()]);
  if(state.selectedFriend&&!isDemoAdmin(state.selectedFriend)&&!friends.some(f=>f.id===state.selectedFriend.id)) state.selectedFriend=null;
  if(!state.selectedFriend) state.selectedFriend=friends[0]||(!API_BASE?demoAdmin():null);
  if(state.selectedFriend && API_BASE && state.routePreview?.friendId!==state.selectedFriend.id) await loadRoutePreview(state.selectedFriend);
  const sent=messages.filter(m=>m.fromId===state.me.id), inbox=messages.filter(m=>m.toId===state.me.id);
  const stats={delivered:messages.filter(m=>statusFor(m)==='delivered').length,transit:messages.filter(m=>statusFor(m)==='transit').length,failed:messages.filter(m=>statusFor(m)==='failed').length};
  document.querySelector('#app').innerHTML=`<div class="app-shell"><header class="topbar"><div class="brand">${logoSvg()}<span>멀리멀리</span></div><nav class="nav" aria-label="주요 메뉴">${navButton('send','보내기','✉️')}${navButton('journeys','여정','🧭')}${navButton('inbox','받은편지','📬')}${navButton('friends','친구','👥')}${navButton('about','설명','ℹ️')}</nav><button class="profile-chip" id="profile-menu"><span class="avatar">${state.me.avatar||'🙂'}</span><span class="profile-text"><strong>${escapeHtml(state.me.nickname)}</strong><small style="display:block;color:var(--muted)">@${escapeHtml(state.me.handle)}</small></span><span class="status-dot" aria-label="접속 중"></span></button></header><main id="main" class="main"><section class="hero"><div class="hero-copy"><h1>느리게, 멀리,<br><span>마음을 전하세요.</span></h1><p>전달자를 고르면 메시지는 보내는 순간의 두 사람 마지막 위치를 기준으로 여행을 시작합니다. 이동 중에는 취소할 수 없고, 때로는 길에서 사라질 수도 있습니다.</p><div class="hero-actions"><button class="btn btn-primary" data-tab="send">✈️ 편지 보내기</button><button class="btn btn-secondary" data-tab="journeys">🧭 내 여정 보기</button></div></div><div class="hero-art"><div class="flight-scene"><img class="hero-bird-img" src="./assets/hero-bird.png" alt="편지를 나르는 비둘기 일러스트" loading="eager" /><div class="route-line"></div><div class="paper one">✈️</div><div class="paper two">🦋</div></div><div class="hero-stat"><span class="eyebrow">현재 여행 중</span><b>${stats.transit}개</b><span class="hint">${API_BASE?'온라인 · 실제 서비스 시간':'로컬 데모 · 실제 시간 1×'}</span></div></div></section><div class="layout"><div class="content-stack">${state.tab==='send'?sendPanel(friends):state.tab==='journeys'?journeysPanel(sent):state.tab==='inbox'?inboxPanel(inbox):state.tab==='friends'?friendsPanel(friends):aboutPanel()}</div><aside class="side-stack">${profilePanel()}${friendsMini(friends)}${statsPanel(stats)}</aside></div></main><nav class="bottom-nav" aria-label="모바일 메뉴">${bottomButton('send','보내기','✉️')}${bottomButton('journeys','여정','🧭')}${bottomButton('inbox','받기','📬')}${bottomButton('friends','친구','👥')}${bottomButton('about','설명','ℹ️')}</nav></div>`;
  bindMain(friends);
}
function sendPanel(friends){
  const f=state.selectedFriend||friends[0]||(!API_BASE?demoAdmin():null), c=currentCourier(), est=f?routeEstimate(f,c):{distance:null,hours:null};
  const distance=est.distance, distanceText=Number.isFinite(distance)?`${distance.toFixed(1)} km · ${distanceLabel(distance)}`:(state.routePreview?.loading?'거리 계산 중…':'두 사람 위치가 필요합니다');
  const compatibility=Number.isFinite(distance)?(courierMatchesDistance(c,distance)?'이 거리에 잘 맞는 전달자':'권장 거리 밖의 모험적인 선택'):'거리 확인 후 추천';
  const adminTest=!API_BASE?`<div class="demo-recipient"><div class="demo-recipient-head"><div><strong>🕊️ 관리자 테스트 우편함</strong><p>기본 친구는 없습니다. 내 위치 기준 가상 거리만 바꿔 전달 시간을 시험합니다.</p></div><button type="button" class="btn btn-secondary ${isDemoAdmin(f)?'selected-soft':''}" data-select-admin>${isDemoAdmin(f)?'선택됨':'관리자로 테스트'}</button></div>${isDemoAdmin(f)?`<div class="distance-presets" aria-label="관리자 테스트 거리">${DEMO_DISTANCE_PRESETS.map(km=>`<button type="button" class="filter-chip ${state.demoDistanceKm===km?'active':''}" data-demo-distance="${km}">${km<1?`${Math.round(km*1000)}m`:`${km.toLocaleString()}km`}</button>`).join('')}</div>`:''}</div>`:'';
  const friendRows=friends.length?friends.map(x=>friendChoice(x,f?.id===x.id)).join(''):'<div class="empty compact"><strong>아직 친구가 없습니다.</strong><p>친구 메뉴에서 실제 가입한 @아이디를 검색해 추가하세요.</p></div>';
  return `<section class="panel"><div class="panel-head"><div><span class="eyebrow">1. 거리별 배달 서비스</span><h2>거리와 기다림에 맞춰 골라보세요.</h2><p class="panel-sub">${f?`${escapeHtml(f.nickname)}까지 `:''}<strong>${distanceText}</strong> · 총 ${COURIERS.length}가지 전달 방식</p></div>${!API_BASE?`<span class="demo-badge">⏱️ ${DEMO_SCALE===1?'실제 시간 1×':`QA ${DEMO_SCALE.toLocaleString()}×`}</span>`:''}</div>${courierFilterBar()}<div class="courier-row">${courierCards(f)}</div></section><section class="panel"><div class="panel-head"><div><span class="eyebrow">2. 편지 쓰기</span><h2>도착할 때까지 열리지 않는 메시지</h2></div></div>${adminTest}<div class="send-grid"><div><div class="field"><label>받는 사람</label><input id="friend-search" value="${escapeHtml(state.search)}" placeholder="내 친구의 닉네임 또는 @아이디" autocomplete="off" /></div><div id="friend-results" class="friend-search-results">${friendRows}</div></div><form id="send-form"><div class="field"><label for="message-body">메시지</label><textarea id="message-body" maxlength="500" placeholder="도착한 뒤에 읽었으면 하는 말을 적어보세요." required></textarea><div class="hint">수신자는 도착 전에는 내용을 볼 수 없습니다.</div></div><div class="estimate"><div class="estimate-grid"><div class="metric"><span>전달자</span><b>${c.emoji} ${escapeHtml(c.name)}</b><small>${compatibility}</small></div><div class="metric"><span>거리</span><b>${Number.isFinite(est.distance)?`${est.distance.toFixed(1)} km`:(state.routePreview?.loading?'계산 중…':'위치 필요')}</b><small>${Number.isFinite(est.distance)?distanceLabel(est.distance):'친구 좌표는 공개되지 않습니다'}</small></div><div class="metric"><span>서비스 시간</span><b>${fmtDuration(est.hours)}</b><small>성공률 ${100-Math.round(c.fail*100)}% · 최소 ${fmtDuration(c.minHours)}</small></div></div><div class="immutable-note"><span>🔒</span><div><strong>한 번 보내면 취소할 수 없습니다.</strong><br>서비스 시간은 거리·기준 속도·우회 계수·최소 대기시간으로 계산합니다.</div></div></div><div class="send-footer"><span class="char-count"><span id="chars">0</span>/500</span><button class="btn btn-primary" type="submit" ${recipientReady(f)?'':'disabled'}>편지 출발시키기 ✈️</button></div>${!state.me.updatedAt?'<p class="hint">먼저 오른쪽의 “내 위치 업데이트”를 눌러 위치를 저장해 주세요.</p>':''}</form></div></section>`;
}
function locationAgeText(user){ return user.showLocationAge===false?'위치 시각 비공개':user.updatedAt?`위치 ${fmtAgo(user.updatedAt)}`:'위치 없음'; }
function friendChoice(x,selected){
  return `<button type="button" class="friend-row" data-select-friend="${x.id}" aria-pressed="${selected}"><span class="friend-main"><span class="avatar">${x.avatar||'🙂'}</span><span><strong>${escapeHtml(x.nickname)}${x.system?' <em class="system-tag">SYSTEM</em>':''}</strong><small>@${escapeHtml(x.handle)} · ${x.system?'테스트 계정':locationAgeText(x)}</small></span></span><span>${selected?'✓':'→'}</span></button>`;
}
function journeysPanel(messages){
  return `<section class="panel"><div class="panel-head"><div><span class="eyebrow">보낸 편지</span><h2>현재 진행 중인 여정</h2></div><span class="hint">취소 기능은 제공되지 않습니다.</span></div><div class="journey-list">${messages.length?messages.map(m=>journeyCard(m,true)).join(''):`<div class="empty"><div class="big">🧭</div><strong>아직 떠난 편지가 없어요.</strong><p>첫 메시지를 보내면 이곳에서 이동 과정을 볼 수 있습니다.</p></div>`}</div></section>`;
}
function inboxPanel(messages){
  return `<section class="panel"><div class="panel-head"><div><span class="eyebrow">받은 편지</span><h2>나에게 오고 있는 메시지</h2></div></div><div class="journey-list">${messages.length?messages.map(m=>journeyCard(m,false)).join(''):`<div class="empty"><div class="big">📬</div><strong>아직 받은 편지가 없어요.</strong><p>친구가 보낸 편지가 도착하면 여기에서 열 수 있습니다.</p></div>`}</div></section>`;
}
function journeyCard(m,isSender){
  const c=COURIERS.find(x=>x.id===m.courierId)||COURIERS[0], status=statusFor(m), other=profileDefaults((isSender?m.to:m.from)||userById(isSender?m.toId:m.fromId)||{nickname:'친구',handle:'friend',avatar:'🙂'});
  const labels={transit:'여행 중',delivered:'도착',failed:'전달 실패'}, pct=progressFor(m);
  let preview='';
  if(isSender) preview=`<div class="message-preview">${escapeHtml(m.body||'')}</div>`;
  else if(status==='delivered') preview=`<div class="message-preview">${escapeHtml(m.body||'도착한 편지입니다.')}</div>`;
  else if(status==='failed') preview=`<div class="message-preview">이 편지는 목적지에 도착하지 못해 내용이 사라졌습니다.</div>`;
  else preview=`<div class="message-preview locked">아직 열 수 없는 메시지입니다. 도착할 때까지 기다려 주세요.</div>`;
  return `<article class="journey"><div class="journey-top"><div class="journey-title"><span class="courier-emoji">${c.emoji}</span><div><strong>${escapeHtml(other.nickname)} ${isSender?'에게':'에게서'}</strong><small>@${escapeHtml(other.handle)} · ${escapeHtml(c.name)} · ${Number(m.distanceKm||0).toFixed(1)} km</small></div></div><span class="pill ${status}">${labels[status]}</span></div><div class="progress"><i style="width:${pct}%"></i></div><div class="journey-meta"><span>출발 ${fmtDate(m.createdAt)}</span><span>${status==='transit'?`예상 도착 ${fmtDate(m.arrivalAt)}`:status==='delivered'?`도착 ${fmtDate(m.arrivalAt)}`:`실패 ${fmtDate(m.failureAt)}`}</span></div>${preview}</article>`;
}
function friendDirectoryRow(user,friendIds){
  const isFriend=user.isFriend||friendIds.has(user.id), canAdd=user.allowFriendAdd!==false;
  return `<div class="friend-directory-row"><button type="button" class="friend-profile-hit" data-view-profile="${user.id}"><span class="avatar">${user.avatar||'🙂'}</span><span class="friend-copy"><strong>${escapeHtml(user.nickname)}</strong><small>@${escapeHtml(user.handle)}</small>${user.bio?`<span>${escapeHtml(user.bio)}</span>`:''}</span></button><div class="friend-actions">${isFriend?'<span class="friend-state">친구</span>':canAdd?`<button class="btn btn-secondary compact-btn" data-add-friend="${user.id}">친구 추가</button>`:'<span class="friend-state muted-state">추가 받지 않음</span>'}</div></div>`;
}
function friendsPanel(friends){
  const mode=API_BASE
    ? `<div class="connection-banner online"><strong>● 온라인 계정 연결됨</strong><span>현재 Worker/D1에 가입된 다른 계정을 검색하고 친구로 추가할 수 있습니다.</span></div>`
    : `<div class="connection-banner local"><strong>○ 로컬 데모 모드</strong><span>이 브라우저의 같은 사이트 주소에서 만든 계정만 검색됩니다. 다른 브라우저·시크릿 창·휴대폰에서 만든 부계정은 공유되지 않습니다. 실제 계정 검색은 Worker API를 연결해야 합니다.</span></div>`;
  const friendRows=friends.length?friends.map(f=>friendDirectoryRow({...f,isFriend:true},new Set(friends.map(x=>x.id)))).join(''):'<div class="empty"><div class="big">📭</div><strong>친구 0명</strong><p>샘플 친구는 자동으로 만들지 않습니다. 알고 있는 @아이디나 닉네임으로 검색해 주세요.</p></div>';
  return `<section class="panel"><div class="panel-head"><div><span class="eyebrow">연결</span><h2>친구를 아이디로 찾기</h2></div></div>${mode}<div class="field search-field"><label for="global-search">닉네임 또는 @아이디</label><input id="global-search" placeholder="예: @myfriend_01 또는 친구 닉네임" autocomplete="off" /><div class="hint">@를 붙여도 되고 빼도 됩니다.</div></div><div id="global-results" class="friend-search-results search-directory"><div class="empty compact">검색어를 입력하면 가입한 사용자가 여기에 표시됩니다.</div></div><div class="section-title-row"><h3>내 친구 ${friends.length}</h3></div><div class="friend-search-results search-directory">${friendRows}</div></section>`;
}
function aboutPanel(){
  return `<section class="panel explain"><div class="panel-head"><div><span class="eyebrow">서비스 규칙</span><h2>거리가 달라지면, 어울리는 전달자도 달라집니다.</h2></div></div><p><strong>① 위치 스냅샷</strong> — 발송 순간의 보내는 사람·받는 사람 마지막 위치만 사용합니다.</p><p><strong>② 50가지 거리 서비스</strong> — 초근거리 동물·곤충부터 장거리 이동 수단과 타임캡슐까지 선택할 수 있습니다.</p><p><strong>③ 서비스 기준 시간</strong> — 거리 ÷ 속도에 그치지 않고 전달자별 최소 대기시간과 우회 계수를 함께 적용합니다.</p><p><strong>④ 중간 실패</strong> — 실패가 정해진 편지는 여정 중간에 사라지고 수신자에게 내용이 공개되지 않습니다.</p><p><strong>⑤ 취소 불가</strong> — 발송된 메시지를 사용자가 삭제하거나 취소하는 API는 없습니다.</p><p><strong>⑥ 프로필 공개 범위</strong> — 닉네임·아이콘·한 줄 소개를 설정할 수 있고, 검색 노출·친구 추가 허용·마지막 위치 업데이트 시각 공개 여부를 직접 선택할 수 있습니다.</p><p><strong>⑦ 친구 검색</strong> — GitHub Pages 로컬 데모는 브라우저 저장소를 사용하므로 다른 기기와 계정 목록을 공유하지 않습니다. 실제 서비스는 포함된 Cloudflare Worker + D1을 연결해야 합니다.</p><p class="hint">빌드 ${escapeHtml(BUILD_VERSION)} · ${API_BASE?'온라인 API 연결':'로컬 데모'}</p></section>`;
}
function profilePanel(){
  return `<section class="panel"><div class="profile-card"><span class="avatar">${state.me.avatar||'🙂'}</span><div><strong>${escapeHtml(state.me.nickname)}</strong><small>@${escapeHtml(state.me.handle)}</small>${state.me.bio?`<p class="profile-bio">${escapeHtml(state.me.bio)}</p>`:''}</div></div><button id="profile-settings" class="btn btn-secondary profile-settings-btn">프로필 설정</button><div class="privacy-summary"><span>${state.me.discoverable!==false?'🔎 검색 허용':'🙈 검색 숨김'}</span><span>${state.me.allowFriendAdd!==false?'🤝 친구 추가 허용':'⛔ 친구 추가 닫힘'}</span></div><div class="location-box"><div class="location-line"><div><strong>마지막 위치</strong><div class="hint">${state.me.updatedAt?`${fmtAgo(state.me.updatedAt)} 업데이트`:'아직 저장되지 않음'}</div></div><button id="update-location" class="btn btn-secondary">위치 업데이트</button></div><div class="hint" style="margin-top:8px">좌표 자체는 친구에게 공개하지 않고 거리 계산에만 사용합니다.</div></div><div class="profile-panel-actions"><button id="theme-toggle" class="btn btn-secondary">${state.theme==='dark'?'☀️ 밝게':'🌙 어둡게'}</button><button id="logout" class="btn btn-secondary">로그아웃</button></div></section>`;
}
function friendsMini(friends){
  return `<section class="panel"><div class="panel-head"><h3>친구</h3><button class="ghost" data-tab="friends">모두 보기</button></div><div class="friend-mini-list">${friends.length?friends.slice(0,4).map(f=>`<button class="friend-mini friend-mini-button" data-view-profile="${f.id}"><span class="left"><span class="avatar">${f.avatar}</span><span><strong>${escapeHtml(f.nickname)}</strong><small>@${escapeHtml(f.handle)}</small></span></span><span>›</span></button>`).join(''):'<div class="empty compact"><strong>친구 0명</strong><p>샘플 계정은 자동으로 추가하지 않습니다.</p></div>'}</div></section>`;
}
function statsPanel(s){ return `<section class="panel"><div class="panel-head"><h3>내 편지 기록</h3></div><div class="stats"><div class="stat"><b>${s.delivered}</b><span>도착</span></div><div class="stat"><b>${s.transit}</b><span>여행 중</span></div><div class="stat"><b>${s.failed}</b><span>실패</span></div></div></section>`; }

function bindMain(friends){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render();window.scrollTo({top:0,behavior:'smooth'});});
  document.querySelectorAll('[data-courier]').forEach(b=>b.onclick=()=>{state.courier=b.dataset.courier;render();});
  document.querySelectorAll('[data-courier-filter]').forEach(b=>b.onclick=()=>{state.courierFilter=b.dataset.courierFilter;const list=filterCouriers(previewDistance(state.selectedFriend));if(list.length&&!list.some(c=>c.id===state.courier))state.courier=list[0].id;render();});
  const courierSort=document.querySelector('#courier-sort'); if(courierSort)courierSort.onchange=()=>{state.courierSort=courierSort.value;render();};
  document.querySelectorAll('[data-select-friend]').forEach(b=>b.onclick=()=>{state.selectedFriend=friends.find(f=>f.id===b.dataset.selectFriend)||state.selectedFriend; state.routePreview=null; state.courierFilter='recommended'; state.tab='send';render();});
  const adminButton=document.querySelector('[data-select-admin]'); if(adminButton)adminButton.onclick=()=>{state.selectedFriend=demoAdmin();state.routePreview=null;state.courierFilter='recommended';render();};
  document.querySelectorAll('[data-demo-distance]').forEach(b=>b.onclick=()=>{state.demoDistanceKm=Number(b.dataset.demoDistance);state.routePreview=null;state.courierFilter='recommended';const list=filterCouriers(state.demoDistanceKm);if(list.length&&!list.some(c=>c.id===state.courier))state.courier=list[0].id;render();});
  const body=document.querySelector('#message-body'); if(body)body.oninput=()=>document.querySelector('#chars').textContent=body.value.length;
  const form=document.querySelector('#send-form'); if(form) form.onsubmit=e=>{e.preventDefault(); if(!state.selectedFriend)return; const text=body.value.trim(); if(!text)return; confirmSend(text);};
  const search=document.querySelector('#friend-search');
  if(search) search.oninput=()=>{
    state.search=search.value; const needle=normalizeSearch(search.value); const holder=document.querySelector('#friend-results');
    const rows=needle?friends.filter(x=>x.handle.toLowerCase().includes(needle)||x.nickname.toLowerCase().includes(needle)):friends;
    holder.innerHTML=rows.length?rows.map(x=>friendChoice(x,state.selectedFriend?.id===x.id)).join(''):'<div class="empty compact">내 친구 중 일치하는 사람이 없습니다. 친구 메뉴에서 먼저 추가해 주세요.</div>';
    holder.querySelectorAll('[data-select-friend]').forEach(b=>b.onclick=()=>{state.selectedFriend=rows.find(f=>f.id===b.dataset.selectFriend);state.routePreview=null;state.courierFilter='recommended';render();});
  };
  const global=document.querySelector('#global-search');
  if(global){
    let searchSeq=0;
    global.oninput=async()=>{
      const seq=++searchSeq, holder=document.querySelector('#global-results'), q=global.value;
      if(!normalizeSearch(q)){holder.innerHTML='<div class="empty compact">검색어를 입력하면 가입한 사용자가 여기에 표시됩니다.</div>';return;}
      holder.innerHTML='<div class="empty compact">검색 중…</div>';
      try{
        const results=await findUsers(q); if(seq!==searchSeq)return;
        const friendIds=new Set(friends.map(f=>f.id));
        holder.innerHTML=results.length?results.map(u=>friendDirectoryRow(u,friendIds)).join(''):'<div class="empty"><strong>검색 결과가 없습니다.</strong><p>'+(!API_BASE?'다른 브라우저나 기기에서 만든 계정은 로컬 데모에 나타나지 않습니다.':'아이디 또는 닉네임을 다시 확인해 주세요.')+'</p></div>';
        bindDirectoryActions(holder,friends);
      }catch(e){ if(seq!==searchSeq)return; holder.innerHTML=`<div class="empty"><strong>검색하지 못했습니다.</strong><p>${escapeHtml(e.message)}</p></div>`; }
    };
  }
  bindDirectoryActions(document,friends);
  const loc=document.querySelector('#update-location'); if(loc)loc.onclick=async()=>{loc.disabled=true;loc.textContent='확인 중…';try{await updateLocation();toast('마지막 위치를 업데이트했습니다.');render();}catch(e){toast(`위치를 저장하지 못했습니다: ${e.message||'권한을 확인해 주세요.'}`);loc.disabled=false;loc.textContent='위치 업데이트';}};
  const theme=document.querySelector('#theme-toggle'); if(theme)theme.onclick=()=>setTheme(state.theme==='dark'?'light':'dark');
  const out=document.querySelector('#logout'); if(out)out.onclick=logout;
  const profile=document.querySelector('#profile-menu'); if(profile)profile.onclick=openProfileSettingsModal;
  const settings=document.querySelector('#profile-settings'); if(settings)settings.onclick=openProfileSettingsModal;
}
function bindDirectoryActions(root,friends){
  root.querySelectorAll?.('[data-add-friend]').forEach(b=>b.onclick=async()=>{b.disabled=true;b.textContent='추가 중…';try{await addFriend(b.dataset.addFriend);toast('친구에 추가했습니다. 서로의 친구 목록에 연결됩니다.');state.selectedFriend=null;await render();}catch(e){toast(e.message);b.disabled=false;b.textContent='친구 추가';}});
  root.querySelectorAll?.('[data-view-profile]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.viewProfile;
    let user=friends.find(f=>f.id===id);
    if(!user&&!API_BASE) user=demoDb().users.find(u=>u.id===id);
    if(user) openPublicProfileModal(profileDefaults(user),friends.some(f=>f.id===id));
  });
}
function confirmSend(text){
  const c=currentCourier(), f=state.selectedFriend, est=routeEstimate(f,c);
  const wrap=document.createElement('div'); wrap.className='modal-backdrop'; wrap.innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h3 id="confirm-title">정말 출발시킬까요?</h3><p><strong>${c.emoji} ${escapeHtml(c.name)}</strong> 전달자가 ${escapeHtml(f.nickname)}에게 ${API_BASE?'발송 순간 서버가 계산한 시간만큼':`<strong>${fmtDuration(est.hours)}</strong> 동안`} 이동합니다. 발송 후에는 취소하거나 목적지를 바꿀 수 없습니다.</p><div class="immutable-note"><span>⚠️</span><div>실패 확률은 ${Math.round(c.fail*100)}%이며, 실패하면 수신자는 메시지 내용을 볼 수 없습니다.</div></div><div class="modal-actions"><button class="btn btn-secondary" data-close>아직 보내지 않기</button><button class="btn btn-primary" data-confirm>출발시키기</button></div></section>`; document.body.append(wrap);
  wrap.querySelector('[data-close]').onclick=()=>wrap.remove(); wrap.onclick=e=>{if(e.target===wrap)wrap.remove();};
  wrap.querySelector('[data-confirm]').onclick=async()=>{const btn=wrap.querySelector('[data-confirm]');btn.disabled=true;btn.textContent='출발 중…';try{await sendMessage(f.id,text,c.id);wrap.remove();state.tab='journeys';toast('편지가 출발했습니다. 이제 취소할 수 없습니다.');render();}catch(e){toast(e.message);btn.disabled=false;btn.textContent='출발시키기';}};
}
function openProfileSettingsModal(){
  const me=profileDefaults(state.me), wrap=document.createElement('div'); wrap.className='modal-backdrop';
  wrap.innerHTML=`<section class="modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title"><div class="modal-head"><div><span class="eyebrow">상대에게 보이는 정보</span><h3 id="profile-title">프로필 설정</h3></div><button class="icon-close" data-close aria-label="닫기">×</button></div><form id="profile-form"><div class="profile-preview"><span class="avatar large-avatar" id="profile-preview-avatar">${me.avatar}</span><div><strong id="profile-preview-name">${escapeHtml(me.nickname)}</strong><small>@${escapeHtml(me.handle)}</small><p id="profile-preview-bio">${escapeHtml(me.bio||'한 줄 소개가 없습니다.')}</p></div></div><div class="field"><label>프로필 아이콘</label><div class="avatar-picker">${AVATARS.map(a=>`<button type="button" class="avatar-option ${a===me.avatar?'selected':''}" data-avatar="${a}" aria-label="${a} 아이콘">${a}</button>`).join('')}</div><input type="hidden" id="profile-avatar" value="${escapeHtml(me.avatar)}" /></div><div class="field"><label for="profile-nickname">닉네임</label><input id="profile-nickname" maxlength="24" value="${escapeHtml(me.nickname)}" required /></div><div class="field"><label for="profile-bio">한 줄 소개 <span class="hint">최대 100자</span></label><textarea id="profile-bio" maxlength="100" placeholder="친구에게 보일 짧은 소개를 적어보세요.">${escapeHtml(me.bio||'')}</textarea></div><div class="profile-switches"><label class="switch-row"><span><strong>검색에서 내 프로필 찾기</strong><small>닉네임이나 @아이디 검색 결과에 표시합니다.</small></span><input type="checkbox" id="profile-discoverable" ${me.discoverable!==false?'checked':''}></label><label class="switch-row"><span><strong>친구 추가 받기</strong><small>다른 사용자가 나를 친구로 추가할 수 있습니다.</small></span><input type="checkbox" id="profile-allow-friend" ${me.allowFriendAdd!==false?'checked':''}></label><label class="switch-row"><span><strong>위치 업데이트 시각 보이기</strong><small>좌표는 숨기고 “21분 전 업데이트” 같은 시각만 친구에게 보입니다.</small></span><input type="checkbox" id="profile-location-age" ${me.showLocationAge!==false?'checked':''}></label></div><div class="form-error" id="profile-error"></div><div class="modal-actions"><button type="button" class="btn btn-secondary" data-close>취소</button><button type="submit" class="btn btn-primary">저장</button></div></form></section>`;
  document.body.append(wrap);
  const close=()=>wrap.remove(); wrap.querySelectorAll('[data-close]').forEach(b=>b.onclick=close); wrap.onclick=e=>{if(e.target===wrap)close();};
  const avatarInput=wrap.querySelector('#profile-avatar'), previewAvatar=wrap.querySelector('#profile-preview-avatar');
  wrap.querySelectorAll('[data-avatar]').forEach(b=>b.onclick=()=>{wrap.querySelectorAll('[data-avatar]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');avatarInput.value=b.dataset.avatar;previewAvatar.textContent=b.dataset.avatar;});
  const nickname=wrap.querySelector('#profile-nickname'), bio=wrap.querySelector('#profile-bio'); nickname.oninput=()=>wrap.querySelector('#profile-preview-name').textContent=nickname.value||'닉네임'; bio.oninput=()=>wrap.querySelector('#profile-preview-bio').textContent=bio.value||'한 줄 소개가 없습니다.';
  wrap.querySelector('#profile-form').onsubmit=async e=>{e.preventDefault(); const submit=e.submitter, err=wrap.querySelector('#profile-error'); err.textContent=''; submit.disabled=true;submit.textContent='저장 중…';try{await updateProfile({avatar:avatarInput.value,nickname:nickname.value,bio:bio.value,discoverable:wrap.querySelector('#profile-discoverable').checked,allowFriendAdd:wrap.querySelector('#profile-allow-friend').checked,showLocationAge:wrap.querySelector('#profile-location-age').checked});close();toast('프로필을 저장했습니다.');render();}catch(ex){err.textContent=ex.message;submit.disabled=false;submit.textContent='저장';}};
}
function openPublicProfileModal(user,isFriend){
  const wrap=document.createElement('div'); wrap.className='modal-backdrop';
  wrap.innerHTML=`<section class="modal public-profile-modal" role="dialog" aria-modal="true"><div class="modal-head"><div></div><button class="icon-close" data-close aria-label="닫기">×</button></div><div class="public-profile-hero"><span class="avatar public-avatar">${user.avatar||'🙂'}</span><h3>${escapeHtml(user.nickname)}</h3><p class="public-handle">@${escapeHtml(user.handle)}</p>${user.bio?`<p class="public-bio">${escapeHtml(user.bio)}</p>`:'<p class="public-bio muted-copy">소개가 없습니다.</p>'}</div><div class="public-profile-facts"><div><span>친구 상태</span><strong>${isFriend?'서로 친구':'아직 친구 아님'}</strong></div><div><span>위치 정보</span><strong>${user.showLocationAge===false?'업데이트 시각 비공개':user.updatedAt?fmtAgo(user.updatedAt):'업데이트 없음'}</strong></div></div><div class="modal-actions"><button class="btn btn-secondary" data-close>닫기</button>${isFriend?`<button class="btn btn-primary" data-send-to="${user.id}">편지 보내기</button>`:''}</div></section>`;
  document.body.append(wrap); const close=()=>wrap.remove(); wrap.querySelectorAll('[data-close]').forEach(b=>b.onclick=close); wrap.onclick=e=>{if(e.target===wrap)close();}; const send=wrap.querySelector('[data-send-to]'); if(send)send.onclick=()=>{state.selectedFriend=user;state.routePreview=null;state.tab='send';close();render();};
}
function startRefresh(){ clearInterval(state.refreshTimer); state.refreshTimer=setInterval(()=>{if(state.me && ['journeys','inbox'].includes(state.tab))render();},1000); }

(async function init(){
  if(API_BASE){
    try{ const token=localStorage.getItem(API_TOKEN_KEY); if(token) state.me=profileDefaults((await api('/api/me')).user); }catch{ localStorage.removeItem(API_TOKEN_KEY); }
  }else state.me=demoMe();
  if(state.me){ try{const friends=await getFriends();state.selectedFriend=friends[0]||(!API_BASE?demoAdmin():null);}catch{} startRefresh(); }
  render();
})();
