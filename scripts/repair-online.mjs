import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const workerDir=join(root,'worker');
const wranglerToml=join(workerDir,'wrangler.toml');
const wranglerPs=join(root,'scripts','run-wrangler.ps1');
const DB_NAME='mullimulli-db';
const WORKER_URL='https://mullimulli-api.mullimulli-api.workers.dev';
let cloudflareEnv={};

function section(t){console.log(`\n=== ${t} ===`)}
function ok(t){console.log(`✓ ${t}`)}
function info(t){console.log(`  ${t}`)}
function run(command,args=[],opts={}){
  const r=spawnSync(command,args,{cwd:opts.cwd||root,encoding:'utf8',shell:false,stdio:opts.capture?['ignore','pipe','pipe']:'inherit',env:{...process.env,...(opts.env||{})}});
  if(r.error) throw r.error;
  if(r.status!==0&&!opts.allowFailure){const d=opts.capture?String(r.stderr||r.stdout||'').trim():'';throw new Error(`${command} failed (exit ${r.status})${d?`\n${d}`:''}`)}
  return r;
}
function wrangler(args,opts={}){
  if(process.platform==='win32') return run('powershell.exe',['-NoLogo','-NoProfile','-ExecutionPolicy','Bypass','-File',wranglerPs,...args],{cwd:workerDir,...opts,env:{...cloudflareEnv,...(opts.env||{})}});
  return run('npx',['--yes','wrangler@latest',...args],{cwd:workerDir,...opts,env:{...cloudflareEnv,...(opts.env||{})}});
}
function parseJsonLoose(text){const t=String(text||'').trim();if(!t)return null;try{return JSON.parse(t)}catch{};for(const s of [t.indexOf('['),t.indexOf('{')].filter(i=>i>=0).sort((a,b)=>a-b)){for(const eChar of [']','}']){const e=t.lastIndexOf(eChar);if(e>s){try{return JSON.parse(t.slice(s,e+1))}catch{}}}}return null}
function extractToken(v){if(!v||typeof v!=='object')return null;if(typeof v.token==='string')return v.token.trim();if(typeof v.result?.token==='string')return v.result.token.trim();return null}
function prepareAuth(){
  let r=wrangler(['auth','token','--json'],{capture:true,allowFailure:true,env:{}});
  let tok=extractToken(parseJsonLoose(r.stdout));
  if(!tok){info('Cloudflare 로그인이 필요합니다. 브라우저 승인 창을 완료해 주세요.');wrangler(['login','--device']);r=wrangler(['auth','token','--json'],{capture:true,allowFailure:true,env:{}});tok=extractToken(parseJsonLoose(r.stdout));}
  if(!tok) throw new Error('Cloudflare OAuth 토큰을 읽지 못했습니다.');
  cloudflareEnv={CLOUDFLARE_API_TOKEN:tok}; ok('Cloudflare 로그인 확인');
}
function dbItems(v){if(Array.isArray(v))return v;if(Array.isArray(v?.result))return v.result;if(Array.isArray(v?.databases))return v.databases;return []}
function getDb(){
  const r=wrangler(['d1','list','--json'],{capture:true});const db=dbItems(parseJsonLoose(r.stdout)).find(x=>x?.name===DB_NAME||x?.database_name===DB_NAME);
  if(!db) throw new Error(`${DB_NAME}를 찾지 못했습니다.`); return {id:db.uuid||db.id||db.database_id};
}
function patchWrangler(id){let s=readFileSync(wranglerToml,'utf8');s=s.replace(/^database_id\s*=\s*"[^"]*"/m,`database_id = "${id}"`);if(!/https:\/\/ko9ma7\.github\.io/.test(s)){s=s.replace(/^ALLOWED_ORIGINS\s*=\s*"[^"]*"/m,'ALLOWED_ORIGINS = "http://localhost:8080,http://127.0.0.1:8080,https://ko9ma7.github.io"');}writeFileSync(wranglerToml,s)}
function extractResults(v){if(Array.isArray(v)){for(const x of v){if(Array.isArray(x?.results))return x.results;if(Array.isArray(x?.result?.[0]?.results))return x.result[0].results}}if(Array.isArray(v?.results))return v.results;if(Array.isArray(v?.result?.[0]?.results))return v.result[0].results;return []}
function query(sql){const r=wrangler(['d1','execute',DB_NAME,'--remote','--command',sql,'--json','--yes'],{capture:true});return extractResults(parseJsonLoose(r.stdout))}
function execSql(sql){wrangler(['d1','execute',DB_NAME,'--remote','--command',sql,'--yes'])}
function ensureSchema(){
  const tables=new Set(query("SELECT name FROM sqlite_master WHERE type='table'").map(x=>String(x.name||'')));
  if(!tables.has('users')){info('users 테이블이 없어 전체 스키마를 생성합니다.');wrangler(['d1','execute',DB_NAME,'--remote','--file','./schema.sql','--yes']);return;}
  const cols=new Set(query('PRAGMA table_info(users)').map(x=>String(x.name||'')));
  const safeAdds=[
    ['avatar',"ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT '🙂';"],
    ['bio',"ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';"],
    ['discoverable','ALTER TABLE users ADD COLUMN discoverable INTEGER NOT NULL DEFAULT 1;'],
    ['show_location_age','ALTER TABLE users ADD COLUMN show_location_age INTEGER NOT NULL DEFAULT 1;'],
    ['allow_friend_add','ALTER TABLE users ADD COLUMN allow_friend_add INTEGER NOT NULL DEFAULT 1;'],
    ['last_lat','ALTER TABLE users ADD COLUMN last_lat REAL;'],
    ['last_lon','ALTER TABLE users ADD COLUMN last_lon REAL;'],
    ['last_location_at','ALTER TABLE users ADD COLUMN last_location_at INTEGER;']
  ];
  for(const [name,sql] of safeAdds){if(!cols.has(name)){info(`users.${name} 보완`);execSql(sql)}}
  wrangler(['d1','execute',DB_NAME,'--remote','--file','./schema.sql','--yes']);
}
function validateSchema(){
  const requiredTables=['users','sessions','friends','messages'];
  const requiredCols=['id','handle','nickname','avatar','bio','discoverable','show_location_age','allow_friend_add','password_salt','password_hash','last_lat','last_lon','last_location_at','created_at'];
  const tables=new Set(query("SELECT name FROM sqlite_master WHERE type='table'").map(x=>String(x.name||'')));
  const cols=new Set(query('PRAGMA table_info(users)').map(x=>String(x.name||'')));
  const missingTables=requiredTables.filter(x=>!tables.has(x));const missingCols=requiredCols.filter(x=>!cols.has(x));
  if(missingTables.length||missingCols.length) throw new Error(`DB 스키마가 아직 불완전합니다. 누락 테이블: ${missingTables.join(', ')||'없음'} / 누락 users 필드: ${missingCols.join(', ')||'없음'}`);
  const counts=query("SELECT (SELECT COUNT(*) FROM users) AS users,(SELECT COUNT(*) FROM friends) AS friends,(SELECT COUNT(*) FROM messages) AS messages")[0]||{};
  ok(`DB 스키마 정상 (users ${counts.users??'?'}, friends ${counts.friends??'?'}, messages ${counts.messages??'?'})`);
}

async function signupSelfTest(){
  const suffix=Math.random().toString(36).slice(2,10);
  const handle=`diag_${suffix}`.slice(0,20);
  const pin=`T9${Math.random().toString(36).slice(2,12)}!`;
  let userId=null;
  try{
    const res=await fetch(`${WORKER_URL}/api/signup`,{method:'POST',headers:{'content-type':'application/json','origin':'https://ko9ma7.github.io'},body:JSON.stringify({handle,nickname:'진단계정',pin})});
    const data=await res.json().catch(()=>null);
    if(!res.ok||!data?.token||!data?.user?.id) throw new Error(`실제 가입 API 테스트 실패 (${res.status}): ${JSON.stringify(data)}`);
    userId=data.user.id;
    const loginRes=await fetch(`${WORKER_URL}/api/login`,{method:'POST',headers:{'content-type':'application/json','origin':'https://ko9ma7.github.io'},body:JSON.stringify({handle,pin})});
    const loginData=await loginRes.json().catch(()=>null);
    if(!loginRes.ok||!loginData?.token) throw new Error(`실제 로그인 API 테스트 실패 (${loginRes.status}): ${JSON.stringify(loginData)}`);
    ok('실제 가입 + 로그인 API 테스트 성공');
  } finally {
    if(userId){
      const safe=userId.replace(/'/g,"''");
      try{execSql(`DELETE FROM sessions WHERE user_id='${safe}'; DELETE FROM users WHERE id='${safe}';`);ok('진단용 임시 계정 정리 완료');}catch(e){info('진단용 임시 계정 정리는 다음 실행 때 다시 시도할 수 있습니다.');}
    }
  }
}

async function health(){
  const res=await fetch(`${WORKER_URL}/api/health`,{cache:'no-store'});const data=await res.json().catch(()=>null);
  if(!res.ok||!data?.ok) throw new Error(`배포 후 health 실패: ${JSON.stringify(data)}`);
  if(Number(data?.passwordKdf?.iterations)!==100000) throw new Error(`Worker가 아직 잘못된 비밀번호 KDF 설정을 사용합니다: ${JSON.stringify(data?.passwordKdf)}`);
  ok(`Worker + D1 health 정상 (v${data.version}, users ${data.database?.userCount??'?'}, PBKDF2 ${data.passwordKdf.iterations}회)`);
}

try{
  section('1. Cloudflare 로그인');prepareAuth();
  section('2. 기존 D1 확인');const db=getDb();patchWrangler(db.id);ok(`${DB_NAME} (${db.id})`);
  section('3. D1 스키마 무손실 복구');ensureSchema();validateSchema();
  section('4. Worker v4.4 재배포 (PBKDF2 100,000회 호환 수정)');wrangler(['deploy']);
  section('5. 실제 API + D1 상태 확인');await health();
  section('6. 실제 가입/로그인 동작 확인');await signupSelfTest();
  console.log('\n============================================================');
  console.log('SUCCESS: 온라인 계정 서버 복구가 끝났습니다.');
  console.log('PBKDF2 210,000회 오류를 Cloudflare 호환 100,000회로 수정했습니다.');
  console.log('기존 계정/친구/편지는 삭제하지 않았습니다.');
  console.log('사이트에서 Ctrl+F5 후 로그인/가입을 다시 시도하세요.');
  console.log('============================================================\n');
}catch(e){console.error('\nREPAIR FAILED\n'+(e?.stack||e));process.exitCode=1}
