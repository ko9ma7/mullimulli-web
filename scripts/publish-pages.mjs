import { existsSync, mkdtempSync, readdirSync, cpSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1').replace(/%20/g, ' ');
const VERSION = '4.3.0';
const DEFAULT_REPO = 'ko9ma7/mullimulli-web';

function cmd(name,args,{cwd=root,allowFailure=false,stdio='pipe'}={}){
  const exe = process.platform==='win32' && name==='git' ? 'git.exe' : process.platform==='win32' && name==='gh' ? 'gh.exe' : name;
  const r=spawnSync(exe,args,{cwd,encoding:'utf8',stdio:stdio==='inherit'?'inherit':['ignore','pipe','pipe'],windowsHide:false});
  if(r.error) throw r.error;
  if(!allowFailure && r.status!==0){
    const detail=[r.stdout,r.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`${name} ${args.join(' ')} 실패 (${r.status})${detail?`\n${detail}`:''}`);
  }
  return r;
}
function ok(s){console.log(`\u2713 ${s}`)}
function info(s){console.log(`\n${s}`)}
function fail(s){console.error(`\n\u2715 ${s}`)}
function commandExists(name){
  const checker=process.platform==='win32'?'where':'which';
  return spawnSync(checker,[name],{stdio:'ignore'}).status===0;
}
function gh(args,opts={}){return cmd('gh',args,opts)}
function git(args,opts={}){return cmd('git',args,opts)}

function ensurePrereqs(){
  if(!commandExists('gh')) throw new Error('GitHub CLI(gh)가 없습니다. https://cli.github.com/ 에서 설치한 뒤 다시 실행해주세요.');
  if(!commandExists('git')) throw new Error('Git이 없습니다. https://git-scm.com/ 에서 설치한 뒤 다시 실행해주세요.');
  const a=gh(['auth','status','-h','github.com'],{allowFailure:true});
  if(a.status!==0){
    info('[1] GitHub 로그인이 필요합니다. 브라우저 승인을 완료해주세요.');
    gh(['auth','login','-h','github.com','-p','https','-w'],{stdio:'inherit'});
  }
  ok('GitHub 로그인 확인');
}

function ensureWorkflowScope(){
  const s=gh(['auth','status','-h','github.com'],{allowFailure:true});
  const text=`${s.stdout||''}\n${s.stderr||''}`;
  if(/workflow/.test(text)) { ok('GitHub workflow 권한 확인'); return; }
  info('[2] GitHub Actions workflow 파일을 올릴 권한이 필요합니다. 브라우저에서 승인해주세요.');
  gh(['auth','refresh','-h','github.com','-s','workflow'],{stdio:'inherit'});
  const again=gh(['auth','status','-h','github.com'],{allowFailure:true});
  const againText=`${again.stdout||''}\n${again.stderr||''}`;
  if(!/workflow/.test(againText)) throw new Error('GitHub OAuth에 workflow 권한을 추가하지 못했습니다.');
  ok('GitHub workflow 권한 추가 완료');
}

function copyProjectTree(target){
  const skip=new Set(['.git','.setup-online-state.json','.wrangler','node_modules']);
  for(const entry of readdirSync(root,{withFileTypes:true})){
    if(skip.has(entry.name)) continue;
    cpSync(join(root,entry.name),join(target,entry.name),{recursive:true,force:true,preserveTimestamps:true});
  }
}

function repoInfo(repo){
  const r=gh(['repo','view',repo,'--json','nameWithOwner,defaultBranchRef,url']);
  const obj=JSON.parse(r.stdout);
  return {repo:obj.nameWithOwner||repo,branch:obj.defaultBranchRef?.name||'main',url:obj.url};
}

function uploadProject(repo,branch){
  gh(['auth','setup-git'],{allowFailure:true});
  const temp=mkdtempSync(join(tmpdir(),'mullimulli-publish-'));
  try{
    info('[3] 최신 프로젝트를 GitHub에 업로드합니다.');
    git(['clone',`https://github.com/${repo}.git`,temp]);
    const managed=['.github','docs','worker','scripts','data','design','qa','site','README.md','START_HERE.txt','ONLINE_ACCOUNT_SETUP_WINDOWS.md','SITE_METADATA.md','GITHUB_UPLOAD_GUIDE.md','PUBLISH_UPDATE.cmd','FIX_GITHUB_PAGES.cmd','DEPLOYMENT_CHECK.md','CHANGELOG-v4.2.md','CHANGELOG-v4.0.md','CHANGELOG-v3.9.md','SETUP_ONLINE.cmd','온라인계정_자동설정.cmd','LICENSE','.gitignore','.nojekyll'];
    for(const name of managed) rmSync(join(temp,name),{recursive:true,force:true});
    copyProjectTree(temp);
    git(['checkout',branch],{cwd:temp,allowFailure:true});
    git(['config','user.name','Mullimulli Publisher'],{cwd:temp});
    git(['config','user.email','41898282+github-actions[bot]@users.noreply.github.com'],{cwd:temp});
    git(['add','-A'],{cwd:temp});
    const st=git(['status','--porcelain'],{cwd:temp});
    if(String(st.stdout||'').trim()){
      git(['commit','-m',`Deploy Mullimulli v${VERSION}`],{cwd:temp});
      // Keep full stderr so permission errors are visible.
      git(['push','origin',`HEAD:${branch}`],{cwd:temp});
      ok(`v${VERSION} push 완료`);
    } else {
      ok('원격 저장소가 이미 같은 파일입니다.');
    }
  } finally { rmSync(temp,{recursive:true,force:true}); }
}

function verifyRemoteFiles(repo,branch){
  info('[4] 원격 저장소의 배포 파일을 확인합니다.');
  const wf=gh(['api',`repos/${repo}/contents/.github/workflows/deploy.yml?ref=${encodeURIComponent(branch)}`],{allowFailure:true});
  if(wf.status!==0) throw new Error('원격 저장소에 .github/workflows/deploy.yml이 없습니다. 웹 업로드만으로는 이 폴더가 빠질 수 있습니다.');
  const v=gh(['api',`repos/${repo}/contents/docs/version.txt?ref=${encodeURIComponent(branch)}`]);
  const obj=JSON.parse(v.stdout);
  const content=Buffer.from(obj.content||'','base64').toString('utf8');
  if(!content.includes(`MULLIMULLI ${VERSION}`)) throw new Error(`원격 docs/version.txt가 v${VERSION}이 아닙니다.`);
  ok('deploy.yml + version.txt 원격 확인 완료');
}

async function waitRun(repo){
  info('[5] GitHub Pages workflow를 실행합니다.');
  const run=gh(['workflow','run','deploy.yml','-R',repo,'--ref','main'],{allowFailure:true});
  if(run.status!==0){
    const detail=[run.stdout,run.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`deploy.yml 실행 요청 실패${detail?`\n${detail}`:''}`);
  }
  await new Promise(r=>setTimeout(r,3500));
  const list=gh(['run','list','-R',repo,'--workflow','deploy.yml','--limit','5','--json','databaseId,status,conclusion,url,createdAt']);
  const arr=JSON.parse(list.stdout);
  const latest=arr[0];
  if(!latest?.databaseId) throw new Error('Deploy GitHub Pages 실행을 찾지 못했습니다.');
  console.log(`Actions: ${latest.url}`);
  gh(['run','watch',String(latest.databaseId),'-R',repo,'--exit-status'],{stdio:'inherit'});
  ok('GitHub Pages Actions 성공');
}

async function verifyLive(repo){
  const [owner,name]=repo.split('/');
  const url=`https://${owner}.github.io/${name}/version.txt`;
  info('[6] 실제 공개 페이지 버전을 확인합니다.');
  for(let i=0;i<40;i++){
    try{
      const r=await fetch(`${url}?v=${Date.now()}`,{cache:'no-store'});
      const t=await r.text();
      if(r.ok && t.includes(`MULLIMULLI ${VERSION}`)){
        ok(`실제 사이트 v${VERSION} 반영 확인`);
        console.log(`사이트: https://${owner}.github.io/${name}/`);
        console.log(`버전: ${url}`);
        return;
      }
    }catch{}
    await new Promise(r=>setTimeout(r,3000));
  }
  throw new Error(`Actions는 성공했지만 실제 ${url}에서 v${VERSION}을 아직 확인하지 못했습니다.`);
}

async function main(){
  console.log('============================================================');
  console.log(` Mullimulli GitHub Pages repair / publish v${VERSION}`);
  console.log(' Cloudflare/D1은 건드리지 않고 GitHub Pages만 고칩니다.');
  console.log('============================================================');
  if(!existsSync(join(root,'.github','workflows','deploy.yml'))) throw new Error('이 폴더 자체에 .github/workflows/deploy.yml이 없습니다. ZIP을 다시 풀어주세요.');
  if(!readFileSync(join(root,'docs','version.txt'),'utf8').includes(`MULLIMULLI ${VERSION}`)) throw new Error('현재 폴더의 docs/version.txt 버전이 맞지 않습니다.');
  ensurePrereqs();
  ensureWorkflowScope();
  const ri=repoInfo(DEFAULT_REPO);
  ok(`저장소 ${ri.repo} / ${ri.branch}`);
  uploadProject(ri.repo,ri.branch);
  verifyRemoteFiles(ri.repo,ri.branch);
  await waitRun(ri.repo);
  await verifyLive(ri.repo);
  console.log('\n============================================================');
  console.log(' 완료: GitHub 저장소와 실제 Pages가 같은 v4.3입니다.');
  console.log('============================================================');
}
main().catch(e=>{fail(e?.message||String(e)); process.exitCode=1;});
