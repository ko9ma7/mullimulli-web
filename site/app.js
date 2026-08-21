const CONFIG = window.MULLIMULLI_CONFIG || {};
const API_BASE = (CONFIG.apiBaseUrl || '').replace(/\/$/, '');
const DEMO_SCALE = Math.max(1, Number(CONFIG.demoTimeAcceleration || 86400));
const STORE_KEY = 'mullimulli.demo.v1';
const SESSION_KEY = 'mullimulli.session.v1';
const THEME_KEY = 'mullimulli.theme.v1';

const COURIERS = [
  {id:'pigeon', name:'비둘기', emoji:'🕊️', speed:60, fail:0.08, note:'균형형'},
  {id:'plane', name:'종이비행기', emoji:'✈️', speed:120, fail:0.16, note:'빠름'},
  {id:'butterfly', name:'나비', emoji:'🦋', speed:12, fail:0.18, note:'느림'},
  {id:'bee', name:'꿀벌', emoji:'🐝', speed:24, fail:0.12, note:'보통'},
  {id:'hedgehog', name:'고슴도치', emoji:'🦔', speed:4, fail:0.10, note:'아주 느림'},
  {id:'turtle', name:'거북이', emoji:'🐢', speed:0.7, fail:0.06, note:'타임캡슐'},
  {id:'snail', name:'달팽이', emoji:'🐌', speed:0.03, fail:0.03, note:'초장기'}
];

const SEED_USERS = [
  {id:'u_starlight', handle:'starlight', nickname:'별빛걷는자', avatar:'🦊', lat:37.5665, lon:126.9780, updatedAt:Date.now()-1000*60*9},
  {id:'u_sun', handle:'sunnyday', nickname:'햇살가득한날', avatar:'🐰', lat:35.1796, lon:129.0756, updatedAt:Date.now()-1000*60*21},
  {id:'u_wind', handle:'windcloud', nickname:'바람따라구름', avatar:'🐿️', lat:33.4996, lon:126.5312, updatedAt:Date.now()-1000*60*48},
  {id:'u_moon', handle:'moonstar', nickname:'달빛소나타', avatar:'🐱', lat:36.3504, lon:127.3845, updatedAt:Date.now()-1000*60*35},
  {id:'u_forest', handle:'tinyforest', nickname:'숲속작은새', avatar:'🦝', lat:37.4563, lon:126.7052, updatedAt:Date.now()-1000*60*17}
];

const state = {
  me:null,
  tab:'send',
  courier:'pigeon',
  selectedFriend:null,
  search:'',
  theme:localStorage.getItem(THEME_KEY) || 'light',
  refreshTimer:null,
  authMode:'login'
};

document.body.classList.add(`theme-${state.theme}`);

function uid(prefix='id'){ return `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`; }
function escapeHtml(v=''){ return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function clamp(n,min,max){ return Math.min(max,Math.max(min,n)); }
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
function fmtDate(ts){ return new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ts)); }
function fmtAgo(ts){
  const sec=Math.max(0,Math.floor((Date.now()-ts)/1000));
  if(sec<60)return '방금 전'; if(sec<3600)return `${Math.floor(sec/60)}분 전`; if(sec<86400)return `${Math.floor(sec/3600)}시간 전`; return `${Math.floor(sec/86400)}일 전`;
}
function toast(message){
  const el=document.createElement('div'); el.className='toast'; el.textContent=message;
  document.querySelector('#toast-region').append(el); setTimeout(()=>el.remove(),3200);
}
function setTheme(theme){
  ['theme-light','theme-dark','theme-system'].forEach(c=>document.body.classList.remove(c));
  state.theme=theme; document.body.classList.add(`theme-${theme}`); localStorage.setItem(THEME_KEY,theme); render();
}
function demoDb(){
  let db;
  try{ db=JSON.parse(localStorage.getItem(STORE_KEY)||'null'); }catch{}
  if(!db){
    db={users:SEED_USERS,friends:{u_starlight:['u_sun','u_wind','u_moon','u_forest']},messages:[],pins:{starlight:'123456'}};
    localStorage.setItem(STORE_KEY,JSON.stringify(db));
  }
  return db;
}
function saveDemo(db){ localStorage.setItem(STORE_KEY,JSON.stringify(db)); }
function demoMe(){ const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); if(!s)return null; return demoDb().users.find(u=>u.id===s.userId)||null; }
function currentCourier(){ return COURIERS.find(c=>c.id===state.courier)||COURIERS[0]; }
function userById(id){ return demoDb().users.find(u=>u.id===id); }
function routeEstimate(friend,courier=currentCourier()){
  if(API_BASE) return {distance:null,hours:null,eta:null};
  if(!state.me?.lat || !friend?.lat) return {distance:null,hours:null,eta:null};
  const distance=Math.max(.1,haversine(state.me,friend));
  const hours=distance/courier.speed;
  return {distance,hours,eta:Date.now()+hours*3600*1000};
}
function statusFor(m){
  if(API_BASE && m.status) return m.status;
  const now=Date.now();
  if(m.failureAt && now>=m.failureAt) return 'failed';
  if(now>=m.arrivalAt) return 'delivered';
  return 'transit';
}
function progressFor(m){
  const status=statusFor(m); if(status==='delivered'||status==='failed') return 100;
  return clamp(((Date.now()-m.createdAt)/(m.arrivalAt-m.createdAt))*100,1,99);
}

async function api(path,opts={}){
  const token=localStorage.getItem('mullimulli.api.token')||'';
  const res=await fetch(`${API_BASE}${path}`,{...opts,headers:{'content-type':'application/json',...(token?{'authorization':`Bearer ${token}`}:{ }),...(opts.headers||{})}});
  const data=await res.json().catch(()=>({})); if(!res.ok) throw new Error(data.error||'요청을 처리하지 못했습니다.'); return data;
}

async function login(handle,pin){
  if(API_BASE){ const data=await api('/api/login',{method:'POST',body:JSON.stringify({handle,pin})}); localStorage.setItem('mullimulli.api.token',data.token); state.me=data.user; return; }
  const db=demoDb(); const u=db.users.find(x=>x.handle.toLowerCase()===handle.toLowerCase());
  if(!u || db.pins[u.handle]!==pin) throw new Error('아이디 또는 PIN이 맞지 않습니다. 데모 계정은 starlight / 123456 입니다.');
  localStorage.setItem(SESSION_KEY,JSON.stringify({userId:u.id})); state.me=u;
}
async function signup(handle,nickname,pin){
  if(API_BASE){ const data=await api('/api/signup',{method:'POST',body:JSON.stringify({handle,nickname,pin})}); localStorage.setItem('mullimulli.api.token',data.token); state.me=data.user; return; }
  const db=demoDb(); handle=handle.trim().toLowerCase();
  if(!/^[a-z0-9_]{3,20}$/.test(handle)) throw new Error('아이디는 영문 소문자, 숫자, _ 조합 3~20자로 입력해 주세요.');
  if(db.users.some(u=>u.handle===handle)) throw new Error('이미 사용 중인 아이디입니다.');
  if(nickname.trim().length<2) throw new Error('닉네임은 2자 이상 입력해 주세요.');
  if(pin.length<6) throw new Error('PIN은 6자 이상 입력해 주세요.');
  const avatars=['🦊','🐰','🐱','🐻','🦝','🐶','🐼'];
  const u={id:uid('u'),handle,nickname:nickname.trim(),avatar:avatars[Math.floor(Math.random()*avatars.length)],lat:null,lon:null,updatedAt:null};
  db.users.push(u); db.pins[handle]=pin; db.friends[u.id]=['u_sun','u_wind','u_moon']; saveDemo(db); localStorage.setItem(SESSION_KEY,JSON.stringify({userId:u.id})); state.me=u;
}
async function logout(){ if(API_BASE){try{await api('/api/logout',{method:'POST'});}catch{} localStorage.removeItem('mullimulli.api.token');} else localStorage.removeItem(SESSION_KEY); state.me=null; render(); }
async function getFriends(){
  if(API_BASE){ return (await api('/api/friends')).friends; }
  const db=demoDb(); return (db.friends[state.me.id]||[]).map(id=>db.users.find(u=>u.id===id)).filter(Boolean);
}
async function findUsers(q){
  if(!q.trim()) return [];
  if(API_BASE) return (await api(`/api/users/search?q=${encodeURIComponent(q.trim())}`)).users;
  const db=demoDb(), needle=q.trim().toLowerCase(); return db.users.filter(u=>u.id!==state.me.id && (u.handle.toLowerCase().includes(needle)||u.nickname.toLowerCase().includes(needle))).slice(0,8);
}
async function addFriend(userId){
  if(API_BASE){ await api('/api/friends',{method:'POST',body:JSON.stringify({userId})}); return; }
  const db=demoDb(); db.friends[state.me.id] ||= []; if(!db.friends[state.me.id].includes(userId)) db.friends[state.me.id].push(userId); saveDemo(db);
}
async function updateLocation(){
  if(!navigator.geolocation) throw new Error('이 브라우저에서는 위치 기능을 사용할 수 없습니다.');
  const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:10000,maximumAge:60000}));
  const lat=Number(pos.coords.latitude.toFixed(3)), lon=Number(pos.coords.longitude.toFixed(3));
  if(API_BASE){ const data=await api('/api/location',{method:'POST',body:JSON.stringify({lat,lon})}); state.me=data.user; }
  else { const db=demoDb(); const me=db.users.find(u=>u.id===state.me.id); Object.assign(me,{lat,lon,updatedAt:Date.now()}); saveDemo(db); state.me=me; }
}
async function sendMessage(toId,body,courierId){
  if(API_BASE){ return await api('/api/messages',{method:'POST',body:JSON.stringify({toUserId:toId,body,courierId})}); }
  const db=demoDb(), to=db.users.find(u=>u.id===toId), c=COURIERS.find(x=>x.id===courierId);
  if(!to) throw new Error('받는 사람을 찾을 수 없습니다.'); if(!state.me.lat||!to.lat) throw new Error('보내는 사람과 받는 사람 모두 최근 위치가 필요합니다.');
  const distance=Math.max(.1,haversine(state.me,to)); const serviceHours=distance/c.speed;
  const realDuration=Math.max(8000,serviceHours*3600*1000/DEMO_SCALE);
  const willFail=crypto.getRandomValues(new Uint32Array(1))[0]/2**32 < c.fail;
  const failureAt=willFail ? Date.now()+realDuration*(.22+(crypto.getRandomValues(new Uint32Array(1))[0]/2**32)*.62) : null;
  const m={id:uid('m'),fromId:state.me.id,toId:to.id,body,courierId,createdAt:Date.now(),arrivalAt:Date.now()+realDuration,failureAt,distanceKm:distance,serviceHours,originSnapshot:{lat:state.me.lat,lon:state.me.lon},targetSnapshot:{lat:to.lat,lon:to.lon}};
  db.messages.unshift(m); saveDemo(db); return m;
}
async function getMessages(){ if(API_BASE) return (await api('/api/messages')).messages; return demoDb().messages.filter(m=>m.fromId===state.me.id||m.toId===state.me.id); }

function courierCards(){ return COURIERS.map(c=>`<button class="courier-card ${state.courier===c.id?'selected':''}" data-courier="${c.id}" aria-pressed="${state.courier===c.id}"><span class="courier-emoji">${c.emoji}</span><span class="courier-name">${c.name}</span><div class="courier-meta">${c.note}<br>${c.speed} km/h</div><div class="courier-risk">실패 확률 ${Math.round(c.fail*100)}%</div></button>`).join(''); }
function navButton(tab,label,emoji){ return `<button data-tab="${tab}" aria-current="${state.tab===tab?'page':'false'}"><span>${emoji}</span>${label}</button>`; }

function renderAuth(){
  document.querySelector('#app').innerHTML=`<main class="auth-wrap"><section class="auth-card" aria-labelledby="auth-title"><div class="auth-visual"><div class="brand">${logoSvg()}<span>멀리멀리</span></div><h1>메시지가<br><span style="color:var(--primary)">여행이 되는 곳.</span></h1><p>비둘기부터 달팽이까지. 누구에게 어떤 전달자를 보낼지 정하면, 편지는 실제 거리와 서비스 기준 속도만큼 이동합니다. 이미 떠난 편지는 되돌릴 수 없습니다.</p><div class="auth-mascot">🕊️</div><div class="auth-plane">✈️</div></div><div class="auth-form"><h2 id="auth-title">${state.authMode==='login'?'다시 만났네요':'새 여행자 만들기'}</h2><p>${API_BASE?'온라인 서비스에 연결되어 있습니다.':'현재는 GitHub Pages 단독 실행용 데모 모드입니다.'}</p><div class="auth-tabs"><button class="${state.authMode==='login'?'active':''}" data-auth-mode="login">로그인</button><button class="${state.authMode==='signup'?'active':''}" data-auth-mode="signup">가입</button></div><form id="auth-form"><div class="field"><label for="handle">아이디</label><input id="handle" name="handle" autocomplete="username" placeholder="영문 소문자 아이디" required /></div>${state.authMode==='signup'?`<div class="field"><label for="nickname">닉네임</label><input id="nickname" name="nickname" maxlength="24" placeholder="친구에게 보일 이름" required /></div>`:''}<div class="field"><label for="pin">PIN / 비밀번호</label><input id="pin" name="pin" type="password" autocomplete="${state.authMode==='login'?'current-password':'new-password'}" minlength="6" placeholder="6자 이상" required /></div><div class="form-error" id="auth-error"></div><button class="btn btn-primary" style="width:100%" type="submit">${state.authMode==='login'?'로그인':'가입하고 시작'}</button></form>${!API_BASE?`<div class="demo-entry"><div class="hint">바로 체험하려면 데모 계정을 사용하세요.</div><button id="demo-login" class="btn btn-secondary" style="width:100%;margin-top:8px">starlight / 123456로 입장</button></div>`:''}</div></section></main>`;
  bindAuth();
}
function bindAuth(){
  document.querySelectorAll('[data-auth-mode]').forEach(b=>b.onclick=()=>{state.authMode=b.dataset.authMode;renderAuth();});
  const form=document.querySelector('#auth-form'); form.onsubmit=async e=>{e.preventDefault(); const fd=new FormData(form), err=document.querySelector('#auth-error'); err.textContent=''; try{ if(state.authMode==='login') await login(fd.get('handle'),fd.get('pin')); else await signup(fd.get('handle'),fd.get('nickname'),fd.get('pin')); await afterLogin(); }catch(ex){err.textContent=ex.message;} };
  const d=document.querySelector('#demo-login'); if(d)d.onclick=async()=>{await login('starlight','123456');await afterLogin();};
}
async function afterLogin(){ state.selectedFriend=(await getFriends())[0]||null; render(); startRefresh(); }
function logoSvg(){return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M9 29 54 10 39 54 30 38 19 46l3-13Z" fill="#e7b768" stroke="#244d3b" stroke-width="3" stroke-linejoin="round"/><path d="m22 33 23-14-15 19" fill="none" stroke="#244d3b" stroke-width="3" stroke-linecap="round"/></svg>`}

async function render(){
  if(!state.me){ renderAuth(); return; }
  const [friends,messages]=await Promise.all([getFriends(),getMessages()]);
  if(!state.selectedFriend && friends[0]) state.selectedFriend=friends[0];
  const sent=messages.filter(m=>m.fromId===state.me.id), inbox=messages.filter(m=>m.toId===state.me.id);
  const stats={delivered:messages.filter(m=>statusFor(m)==='delivered').length,transit:messages.filter(m=>statusFor(m)==='transit').length,failed:messages.filter(m=>statusFor(m)==='failed').length};
  document.querySelector('#app').innerHTML=`<div class="app-shell"><header class="topbar"><div class="brand">${logoSvg()}<span>멀리멀리</span></div><nav class="nav" aria-label="주요 메뉴">${navButton('send','보내기','✉️')}${navButton('journeys','여정','🧭')}${navButton('inbox','받은편지','📬')}${navButton('friends','친구','👥')}${navButton('about','설명','ℹ️')}</nav><button class="profile-chip" id="profile-menu"><span class="avatar">${state.me.avatar||'🙂'}</span><span class="profile-text"><strong>${escapeHtml(state.me.nickname)}</strong><small style="display:block;color:var(--muted)">@${escapeHtml(state.me.handle)}</small></span><span class="status-dot" aria-label="접속 중"></span></button></header><main id="main" class="main"><section class="hero"><div class="hero-copy"><h1>느리게, 멀리,<br><span>마음을 전하세요.</span></h1><p>전달자를 고르면 메시지는 보내는 순간의 두 사람 마지막 위치를 기준으로 여행을 시작합니다. 이동 중에는 취소할 수 없고, 때로는 길에서 사라질 수도 있습니다.</p><div class="hero-actions"><button class="btn btn-primary" data-tab="send">✈️ 편지 보내기</button><button class="btn btn-secondary" data-tab="journeys">🧭 내 여정 보기</button></div></div><div class="hero-art"><div class="flight-scene"><img class="hero-bird-img" src="./assets/hero-bird.png" alt="편지를 나르는 비둘기 일러스트" loading="eager" /><div class="route-line"></div><div class="paper one">✈️</div><div class="paper two">🦋</div></div><div class="hero-stat"><span class="eyebrow">현재 여행 중</span><b>${stats.transit}개</b><span class="hint">${API_BASE?'실제 시간':'데모는 시간이 빠르게 흐릅니다'}</span></div></div></section><div class="layout"><div class="content-stack">${state.tab==='send'?sendPanel(friends):state.tab==='journeys'?journeysPanel(sent):state.tab==='inbox'?inboxPanel(inbox):state.tab==='friends'?friendsPanel(friends):aboutPanel()}</div><aside class="side-stack">${profilePanel()}${friendsMini(friends)}${statsPanel(stats)}</aside></div></main><nav class="bottom-nav" aria-label="모바일 메뉴">${bottomButton('send','보내기','✉️')}${bottomButton('journeys','여정','🧭')}${bottomButton('inbox','받기','📬')}${bottomButton('friends','친구','👥')}${bottomButton('about','설명','ℹ️')}</nav></div>`;
  bindMain(friends);
}
function bottomButton(tab,label,emoji){return `<button data-tab="${tab}" class="${state.tab===tab?'active':''}"><span>${emoji}</span>${label}</button>`}
function sendPanel(friends){
  const f=state.selectedFriend||friends[0], c=currentCourier(), est=f?routeEstimate(f,c):{distance:null,hours:null};
  return `<section class="panel"><div class="panel-head"><div><span class="eyebrow">1. 전달자 선택</span><h2>누가 이 편지를 옮길까요?</h2></div>${!API_BASE?'<span class="demo-badge">⚡ 데모 86,400×</span>':''}</div><div class="courier-row">${courierCards()}</div></section><section class="panel"><div class="panel-head"><div><span class="eyebrow">2. 편지 쓰기</span><h2>도착할 때까지 열리지 않는 메시지</h2></div></div><div class="send-grid"><div><div class="field"><label>받는 사람</label><input id="friend-search" value="${escapeHtml(state.search)}" placeholder="닉네임 또는 @아이디 검색" autocomplete="off" /></div><div id="friend-results" class="friend-search-results">${friends.map(x=>friendChoice(x,f?.id===x.id)).join('')}</div></div><form id="send-form"><div class="field"><label for="message-body">메시지</label><textarea id="message-body" maxlength="500" placeholder="도착한 뒤에 읽었으면 하는 말을 적어보세요." required></textarea><div class="hint">수신자는 도착 전에는 내용을 볼 수 없습니다.</div></div><div class="estimate"><div class="estimate-grid"><div class="metric"><span>전달자</span><b>${c.emoji} ${c.name}</b></div><div class="metric"><span>거리</span><b>${est.distance?`${est.distance.toFixed(1)} km`:(API_BASE?'발송 시 계산':'위치 필요')}</b></div><div class="metric"><span>서비스 시간</span><b>${API_BASE?'발송 시 계산':fmtDuration(est.hours)}</b></div></div><div class="immutable-note"><span>🔒</span><div><strong>한 번 보내면 취소할 수 없습니다.</strong><br>출발지와 도착지는 발송 순간의 마지막 위치로 고정됩니다. 중간 실패 여부도 발송 후 바꿀 수 없습니다.</div></div></div><div class="send-footer"><span class="char-count"><span id="chars">0</span>/500</span><button class="btn btn-primary" type="submit" ${f&&((API_BASE&&state.me.updatedAt&&f.updatedAt)||(!API_BASE&&state.me.lat&&f.lat))?'':'disabled'}>편지 출발시키기 ✈️</button></div>${!state.me.updatedAt?'<p class="hint">먼저 오른쪽의 “내 위치 업데이트”를 눌러 위치를 저장해 주세요.</p>':''}</form></div></section>`;
}
function friendChoice(x,selected){ return `<button type="button" class="friend-row" data-select-friend="${x.id}" aria-pressed="${selected}"><span class="friend-main"><span class="avatar">${x.avatar}</span><span><strong>${escapeHtml(x.nickname)}</strong><small>@${escapeHtml(x.handle)} · ${x.updatedAt?`위치 ${fmtAgo(x.updatedAt)}`:'위치 없음'}</small></span></span><span>${selected?'✓':'→'}</span></button>`; }
function journeysPanel(messages){
  return `<section class="panel"><div class="panel-head"><div><span class="eyebrow">보낸 편지</span><h2>현재 진행 중인 여정</h2></div><span class="hint">취소 기능은 제공되지 않습니다.</span></div><div class="journey-list">${messages.length?messages.map(m=>journeyCard(m,true)).join(''):`<div class="empty"><div class="big">🧭</div><strong>아직 떠난 편지가 없어요.</strong><p>첫 메시지를 보내면 이곳에서 이동 과정을 볼 수 있습니다.</p></div>`}</div></section>`;
}
function inboxPanel(messages){
  return `<section class="panel"><div class="panel-head"><div><span class="eyebrow">받은 편지</span><h2>나에게 오고 있는 메시지</h2></div></div><div class="journey-list">${messages.length?messages.map(m=>journeyCard(m,false)).join(''):`<div class="empty"><div class="big">📬</div><strong>아직 받은 편지가 없어요.</strong><p>친구가 보낸 편지가 도착하면 여기에서 열 수 있습니다.</p></div>`}</div></section>`;
}
function journeyCard(m,isSender){
  const c=COURIERS.find(x=>x.id===m.courierId)||COURIERS[0], status=statusFor(m), other=(isSender?m.to:m.from)||userById(isSender?m.toId:m.fromId)||{nickname:'친구',handle:'friend',avatar:'🙂'};
  const labels={transit:'여행 중',delivered:'도착',failed:'전달 실패'}; const pct=progressFor(m);
  let preview='';
  if(isSender) preview=`<div class="message-preview">${escapeHtml(m.body)}</div>`;
  else if(status==='delivered') preview=`<div class="message-preview">${escapeHtml(m.body||'도착한 편지입니다.')}</div>`;
  else if(status==='failed') preview=`<div class="message-preview">이 편지는 목적지에 도착하지 못해 내용이 사라졌습니다.</div>`;
  else preview=`<div class="message-preview locked">아직 열 수 없는 메시지입니다. 도착할 때까지 기다려 주세요.</div>`;
  return `<article class="journey"><div class="journey-top"><div class="journey-title"><span class="courier-emoji">${c.emoji}</span><div><strong>${escapeHtml(other.nickname)} ${isSender?'에게':'에게서'}</strong><small>@${escapeHtml(other.handle)} · ${c.name} · ${Number(m.distanceKm||0).toFixed(1)} km</small></div></div><span class="pill ${status}">${labels[status]}</span></div><div class="progress"><i style="width:${pct}%"></i></div><div class="journey-meta"><span>출발 ${fmtDate(m.createdAt)}</span><span>${status==='transit'?`예상 도착 ${fmtDate(m.arrivalAt)}`:status==='delivered'?`도착 ${fmtDate(m.arrivalAt)}`:`실패 ${fmtDate(m.failureAt)}`}</span></div>${preview}</article>`;
}
function friendsPanel(friends){ return `<section class="panel"><div class="panel-head"><div><span class="eyebrow">연결</span><h2>친구를 아이디로 찾기</h2></div></div><div class="field"><label for="global-search">닉네임 또는 아이디</label><input id="global-search" placeholder="예: sunnyday" /></div><div id="global-results" class="friend-search-results"><div class="empty">검색하면 가입한 사용자가 여기에 표시됩니다.</div></div><h3 style="margin:24px 0 8px">내 친구 ${friends.length}</h3><div class="friend-search-results">${friends.map(f=>friendChoice(f,false)).join('')}</div></section>`; }
function aboutPanel(){return `<section class="panel explain"><div class="panel-head"><div><span class="eyebrow">서비스 규칙</span><h2>기다리는 시간이 메시지의 일부입니다.</h2></div></div><p><strong>① 위치 스냅샷</strong> — 발송 순간의 보내는 사람·받는 사람 마지막 위치만 사용합니다. 이후 누군가 이동해도 이미 출발한 편지의 목적지는 바뀌지 않습니다.</p><p><strong>② 서비스 기준 속도</strong> — 동물과 사물의 속도는 실제 생태 수치가 아니라 서비스 안에서 정의한 게임 규칙입니다. 거리 ÷ 기준 속도로 도착 시간을 계산합니다.</p><p><strong>③ 중간 실패</strong> — 전달자마다 실패 확률이 있습니다. 실패가 정해진 편지는 전체 여정의 중간 지점 어딘가에서 소실되고 내용은 수신자에게 공개되지 않습니다.</p><p><strong>④ 취소 불가</strong> — 서버에는 발송된 메시지를 사용자가 삭제하거나 취소하는 API가 없습니다. 이 불편함이 서비스의 핵심 재미입니다.</p><p><strong>⑤ 타임캡슐</strong> — 거북이·달팽이처럼 매우 느린 전달자를 선택하면 장거리에서는 수개월~수년이 걸릴 수 있습니다.</p><p class="hint">GitHub Pages만으로 실행할 때는 한 브라우저 안에서 체험하는 데모 저장소를 사용합니다. 실제 여러 사용자가 서로 메시지를 주고받으려면 이 프로젝트에 포함된 Cloudflare Worker + D1 백엔드를 배포해 config.js의 API 주소를 연결합니다.</p></section>`}
function profilePanel(){ return `<section class="panel"><div class="profile-card"><span class="avatar">${state.me.avatar||'🙂'}</span><div><strong>${escapeHtml(state.me.nickname)}</strong><small>@${escapeHtml(state.me.handle)}</small></div></div><div class="location-box"><div class="location-line"><div><strong>마지막 위치</strong><div class="hint">${state.me.updatedAt?`${fmtAgo(state.me.updatedAt)} 업데이트`:'아직 저장되지 않음'}</div></div><button id="update-location" class="btn btn-secondary">위치 업데이트</button></div><div class="hint" style="margin-top:8px">좌표는 친구에게 직접 공개하지 않고 거리 계산에만 사용합니다.</div></div><div style="display:flex;gap:8px;margin-top:12px"><button id="theme-toggle" class="btn btn-secondary" style="flex:1">${state.theme==='dark'?'☀️ 밝게':'🌙 어둡게'}</button><button id="logout" class="btn btn-secondary">로그아웃</button></div></section>`; }
function friendsMini(friends){ return `<section class="panel"><div class="panel-head"><h3>친구</h3><button class="ghost" data-tab="friends">모두 보기</button></div><div class="friend-mini-list">${friends.slice(0,4).map(f=>`<div class="friend-mini"><span class="left"><span class="avatar">${f.avatar}</span><span><strong>${escapeHtml(f.nickname)}</strong><small style="display:block;color:var(--muted)">@${escapeHtml(f.handle)}</small></span></span><span class="status-dot"></span></div>`).join('')}</div></section>`; }
function statsPanel(s){ return `<section class="panel"><div class="panel-head"><h3>내 편지 기록</h3></div><div class="stats"><div class="stat"><b>${s.delivered}</b><span>도착</span></div><div class="stat"><b>${s.transit}</b><span>여행 중</span></div><div class="stat"><b>${s.failed}</b><span>실패</span></div></div></section>`; }

function bindMain(friends){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render();window.scrollTo({top:0,behavior:'smooth'});});
  document.querySelectorAll('[data-courier]').forEach(b=>b.onclick=()=>{state.courier=b.dataset.courier;render();});
  document.querySelectorAll('[data-select-friend]').forEach(b=>b.onclick=()=>{state.selectedFriend=friends.find(f=>f.id===b.dataset.selectFriend)||state.selectedFriend; state.tab='send';render();});
  const body=document.querySelector('#message-body'); if(body)body.oninput=()=>document.querySelector('#chars').textContent=body.value.length;
  const form=document.querySelector('#send-form'); if(form) form.onsubmit=async e=>{e.preventDefault(); if(!state.selectedFriend)return; const text=body.value.trim(); if(!text)return; confirmSend(text);};
  const search=document.querySelector('#friend-search'); if(search) search.oninput=async()=>{state.search=search.value; const results=await findUsers(search.value); const holder=document.querySelector('#friend-results'); holder.innerHTML=(results.length?results:friends).map(x=>friendChoice(x,state.selectedFriend?.id===x.id)).join(''); holder.querySelectorAll('[data-select-friend]').forEach(b=>b.onclick=()=>{state.selectedFriend=(results.length?results:friends).find(f=>f.id===b.dataset.selectFriend);render();});};
  const global=document.querySelector('#global-search'); if(global) global.oninput=async()=>{const results=await findUsers(global.value); const holder=document.querySelector('#global-results'); holder.innerHTML=results.length?results.map(u=>`<div class="friend-row"><span class="friend-main"><span class="avatar">${u.avatar||'🙂'}</span><span><strong>${escapeHtml(u.nickname)}</strong><small>@${escapeHtml(u.handle)}</small></span></span><button class="btn btn-secondary" data-add-friend="${u.id}">친구 추가</button></div>`).join(''):'<div class="empty">검색 결과가 없습니다.</div>'; holder.querySelectorAll('[data-add-friend]').forEach(b=>b.onclick=async()=>{await addFriend(b.dataset.addFriend);toast('친구에 추가했습니다.');render();});};
  const loc=document.querySelector('#update-location'); if(loc)loc.onclick=async()=>{loc.disabled=true;loc.textContent='확인 중…';try{await updateLocation();toast('마지막 위치를 업데이트했습니다.');render();}catch(e){toast(`위치를 저장하지 못했습니다: ${e.message||'권한을 확인해 주세요.'}`);loc.disabled=false;loc.textContent='위치 업데이트';}};
  const theme=document.querySelector('#theme-toggle'); if(theme)theme.onclick=()=>setTheme(state.theme==='dark'?'light':'dark');
  const out=document.querySelector('#logout'); if(out)out.onclick=logout;
  const profile=document.querySelector('#profile-menu'); if(profile)profile.onclick=()=>openProfileModal();
}
function confirmSend(text){
  const c=currentCourier(), f=state.selectedFriend, est=routeEstimate(f,c);
  const wrap=document.createElement('div'); wrap.className='modal-backdrop'; wrap.innerHTML=`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h3 id="confirm-title">정말 출발시킬까요?</h3><p><strong>${c.emoji} ${c.name}</strong>이 ${escapeHtml(f.nickname)}에게 ${API_BASE?'발송 순간 서버가 계산한 시간만큼':`약 <strong>${fmtDuration(est.hours)}</strong> 동안`} 이동합니다. 발송 후에는 취소하거나 목적지를 바꿀 수 없습니다.</p><div class="immutable-note"><span>⚠️</span><div>실패 확률은 ${Math.round(c.fail*100)}%이며, 실패하면 수신자는 메시지 내용을 볼 수 없습니다.</div></div><div class="modal-actions"><button class="btn btn-secondary" data-close>아직 보내지 않기</button><button class="btn btn-primary" data-confirm>출발시키기</button></div></section>`; document.body.append(wrap); wrap.querySelector('[data-close]').onclick=()=>wrap.remove(); wrap.onclick=e=>{if(e.target===wrap)wrap.remove();}; wrap.querySelector('[data-confirm]').onclick=async()=>{const btn=wrap.querySelector('[data-confirm]');btn.disabled=true;btn.textContent='출발 중…';try{await sendMessage(f.id,text,c.id);wrap.remove();state.tab='journeys';toast('편지가 출발했습니다. 이제 취소할 수 없습니다.');render();}catch(e){toast(e.message);btn.disabled=false;btn.textContent='출발시키기';}};
}
function openProfileModal(){ const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<section class="modal" role="dialog" aria-modal="true"><h3>${escapeHtml(state.me.nickname)}</h3><p>@${escapeHtml(state.me.handle)}<br>${API_BASE?'온라인 백엔드 연결됨':'로컬 데모 프로필'}</p><div class="modal-actions"><button class="btn btn-secondary" data-close>닫기</button></div></section>`;document.body.append(wrap);wrap.querySelector('[data-close]').onclick=()=>wrap.remove();wrap.onclick=e=>{if(e.target===wrap)wrap.remove();};}
function startRefresh(){ clearInterval(state.refreshTimer); state.refreshTimer=setInterval(()=>{if(state.me && ['journeys','inbox'].includes(state.tab))render();},1000); }

(async function init(){
  if(API_BASE){
    try{ const token=localStorage.getItem('mullimulli.api.token'); if(token) state.me=(await api('/api/me')).user; }catch{ localStorage.removeItem('mullimulli.api.token'); }
  }else state.me=demoMe();
  if(state.me){ try{state.selectedFriend=(await getFriends())[0]||null;}catch{} startRefresh(); }
  render();
})();
