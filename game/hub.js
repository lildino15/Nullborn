/* Nullborn: The rise of the forgotten - Hub client (vanilla JS) */
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const H={email:null,status:null,profile:null,party:null,dungeon:null,saveName:null,crystals:0,vendor:null,appearance:null,
  battle:{runId:null,sel:null,moveTiles:[],armed:false},invTab:'all',bsTab:'upgrade',bsWeapon:null,vendorMode:false};

const api={
  async req(path,body){
    const r=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
    let j=null;try{j=await r.json()}catch(e){}
    if(!r.ok)throw new Error((j&&j.error)||('Request failed ('+r.status+')'));
    return j;
  },
  get(p){return this.req(p)}, post(p,b){return this.req(p,b||{})}
};
function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(t._h);t._h=setTimeout(()=>t.hidden=true,2600)}
function show(id){$$('.screen').forEach(s=>s.classList.toggle('active',s.id===id));window.scrollTo(0,0)}
function openModal(html){$('#modal-root').innerHTML='<div class="modal-veil" id="mveil"><div class="modal panel">'+html+'</div></div>';$('#mveil').addEventListener('click',e=>{if(e.target.id==='mveil')closeModal()})}
function closeModal(){$('#modal-root').innerHTML=''}
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');if(!g)return;
  const to=g.dataset.go;
  if(to==='town')enterTown();
  else if(to==='recruit')openRecruit();
  else if(to==='blacksmith')openBlacksmith();
  else if(to==='inventory')openInventory();
  else if(to==='relations')openRelations();
  else if(to==='dungeon')openDungeon();
  else if(to==='types')show('screen-types');
  else if(to==='quests')openQuests();
  else if(to==='prepare')openPrepare();
  else if(to==='rest')openRest();
  else if(to==='customize')openCustomize();
});

/* ---------- auth ---------- */
let authMode='login';
$$('#auth-tabs .tab').forEach(t=>t.addEventListener('click',()=>{
  $$('#auth-tabs .tab').forEach(x=>x.classList.toggle('active',x===t));
  authMode=t.dataset.authtab;$('#btn-auth-go').textContent=authMode==='login'?'Sign In':'Create Account';$('#auth-err').textContent='';
}));
$('#btn-auth-go').addEventListener('click',async()=>{
  const email=$('#auth-email').value.trim(),pass=$('#auth-pass').value;
  $('#auth-err').textContent='';
  try{
    await api.post(authMode==='login'?'/api/auth/login':'/api/auth/register',{email,password:pass});
    H.email=email;toast(authMode==='login'?'Welcome back.':'Account created. Welcome to Elyndra.');
    await enterTown();
  }catch(e){$('#auth-err').textContent=e.message}
});
$('#btn-start').addEventListener('click',async()=>{
  try{const me=await api.get('/api/auth/me');if(me.user){H.email=me.user.email;await enterTown();return}}catch(e){}
  show('screen-auth');
});

/* ---------- town ---------- */
async function refreshTop(){
  try{
    const [st,pr]=await Promise.all([api.get('/api/adventure-status'),api.get('/api/hero-profile')]);
    H.status=st;H.profile=pr;
    $('#tb-gold').textContent=(pr.gold??st.gold??0).toLocaleString();
    const name=H.saveName||'Rook';
    $('#town-heroname').textContent=name;
    $('#town-herosub').textContent='Lv. '+(pr.hero?.level||1)+' - The Nullborn';
    const needQuest=!st.story;$('#badge-guild').hidden=!needQuest;
  }catch(e){toast(e.message)}
  try{const m=await api.get('/api/market');H.crystals=m.crystals||0;$('#tb-crystal').textContent=H.crystals}catch(e){}
}
async function enterTown(){
  try{const s=await api.get('/api/save');H.saveName=(s.state&&s.state.name)||null}catch(e){}
  try{const a=await api.get('/api/appearance');H.appearance=a.appearance}catch(e){}
  await refreshTop();show('screen-town');
  if(H.status&&!H.status.story&&!localStorage.getItem('hubPrologue'))startDialogue(true);
}
$('#btn-settings').addEventListener('click',()=>{
  openModal('<h3>Settings</h3>'+
    '<div class="toggle-row"><span>Game</span><b class="gold-text" style="margin-left:auto">Nullborn: The rise of the forgotten</b></div>'+
    '<div class="toggle-row"><span>Account</span><span class="muted" style="margin-left:auto">'+esc(H.email||'')+'</span></div>'+
    '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">'+
    '<a class="btn-ghost" style="text-align:center;text-decoration:none" href="/index.html">Classic client</a>'+
    '<button class="btn-ghost" id="m-logout">Sign out</button>'+
    '<button class="btn-gold" id="m-close">Close</button></div>');
  $('#m-close').onclick=closeModal;
  $('#m-logout').onclick=async()=>{try{await api.post('/api/auth/logout')}catch(e){}closeModal();location.reload()};
});
function openQuests(){
  const st=H.status||{};
  const row=(label,done,extra)=>'<div class="mrow"><span>'+label+(extra?' <span class="muted small">'+extra+'</span>':'')+'</span><span class="'+(done?'quest-done':'quest-todo')+'">'+(done?'Complete':'Pending')+'</span></div>';
  openModal('<h3>Quests</h3>'+
    row('Prologue: The Fall',!!st.story)+
    row('Chapter Two: Lyra',!!st.chapter2)+
    row('Chapter Three: First Bell',!!st.chapter3)+
    row('Finale',!!st.finale)+
    row('Common Dungeon',false,'Floor '+(st.dungeonFloor||1)+' - best '+(st.dungeonCompleted||0))+
    '<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">'+
    '<button class="btn-ghost" id="m-prologue">Watch prologue</button>'+
    '<button class="btn-gold" id="m-close">Close</button></div>');
  $('#m-close').onclick=closeModal;
  $('#m-prologue').onclick=()=>{closeModal();startDialogue(false)};
}
async function openPrepare(){
  try{H.party=await api.get('/api/party')}catch(e){toast(e.message);return}
  const p=H.party;
  const rows=(p.roster||[]).map(n=>{
    const on=(p.active||[]).includes(n.id);
    return '<div class="mrow"><span><b>'+esc(n.name)+'</b> <span class="muted small">'+esc(n.role)+' - HP '+n.hp+'/'+n.maxHp+'</span></span>'+
      '<button class="deploy-pill'+(on?' on':'')+'" data-dep="'+n.id+'">'+(on?'Deployed':'Deploy')+'</button></div>';
  }).join('')||'<p class="muted">No companions yet. Hire some at the Guild.</p>';
  openModal('<h3>Prepare Party</h3><p class="muted small">Up to 3 companions fight beside you. They act on their own in battle.</p>'+rows+
    '<button class="btn-gold btn-big" id="m-close" style="margin-top:10px">Done</button>');
  $('#m-close').onclick=closeModal;
  $$('#modal-root [data-dep]').forEach(b=>b.addEventListener('click',async()=>{
    try{const j=await api.post('/api/party',{action:'deploy',id:b.dataset.dep});H.party=j;await refreshTop();openPrepare();toast('Party updated.')}catch(e){toast(e.message)}
  }));
}
function openRest(){
  openModal('<h3>Rest</h3><p>You rest at the Ravenford inn. The fire is warm, the bed is soft, and for a little while the dungeon feels far away.</p>'+
    '<p class="muted small">Your hero HP is fully restored each time you enter the dungeon.</p>'+
    '<button class="btn-gold btn-big" id="m-close">Rise</button>');
  $('#m-close').onclick=closeModal;
}

/* ---------- recruit ---------- */
const RECRUIT_STYLE={
  Rin:{img:'/art/hub/hub-darius.webp',bio:'A steady warrior of the guild. Holds the line so others can strike.',stars:3},
  Orin:{img:'/art/hub/hub-kael.webp',bio:'A keen-eyed ranger. Deadly at range, quiet in camp.',stars:4},
  Selene:{img:'/art/hub/hub-lyra.webp',bio:'A gentle healer. Mends wounds and lifts hearts.',stars:4}
};
// Full-body battle sprites (2D figures, not portraits)
const SPR='/art/sprites/';
const ALLY_SPRITES={Rin:SPR+'spr-rin.webp',Orin:SPR+'spr-orin.webp',Selene:SPR+'spr-selene.webp'};
const HERO_SPRITE=SPR+'spr-rook.webp';
const WALL_TILES=[SPR+'tile-rock.webp',SPR+'tile-wall.webp',SPR+'tile-rock2.webp'];
function foeSprite(name){
  const n=String(name||'').toLowerCase();
  if(/wolf|matriarch|rat/.test(n))return SPR+'spr-wolf.webp';
  if(/goblin|imp/.test(n))return SPR+'spr-goblin.webp';
  if(/slime/.test(n))return SPR+'spr-slime.webp';
  if(/bat/.test(n))return SPR+'spr-bat.webp';
  if(/spider|broodmother|beetle/.test(n))return SPR+'spr-spider.webp';
  if(/wisp/.test(n))return SPR+'spr-wisp.webp';
  if(/skeleton|revenant|undead/.test(n))return SPR+'spr-skeleton.webp';
  if(/golem|sentinel|construct/.test(n))return SPR+'spr-golem.webp';
  return SPR+'spr-wolf.webp';
}
/* ---------- character customization ---------- */
const CC={
  base:'/art/custom/cc-base.webp',
  hairStyles:['short','long','messy','ponytail','buzz','mohawk'],
  hairFilters:{black:'brightness(0.28)',brown:'sepia(0.9) hue-rotate(-25deg) saturate(1.5) brightness(0.62)',blonde:'sepia(0.55) saturate(2.4) hue-rotate(-8deg) brightness(1.22)',red:'sepia(1) hue-rotate(-42deg) saturate(2.4) brightness(0.85)',silver:'grayscale(0.85) brightness(1.42)',blue:'sepia(0.9) hue-rotate(175deg) saturate(2.2) brightness(0.9)'},
  hairHex:{black:'#1c1c1c',brown:'#5a3a22',blonde:'#d9b36a',red:'#a83a22',silver:'#c9c9d2',blue:'#3d6bdc'},
  eyeShapes:['sharp','round','narrow','wide'],
  eyeColors:{brown:'#6b4226',blue:'#3d9bdc',green:'#3fae5a',amber:'#d99a2b',red:'#e5484d',violet:'#9b5de5'},
  beards:['none','stubble','full','goatee','mustache','handlebar'],
  defaults:{hairStyle:'messy',hairColor:'black',eyeShape:'sharp',eyeColor:'blue',beard:'none'}
};
function heroFaceHTML(ap){
  ap={...CC.defaults,...(ap||{})};
  const hf=CC.hairFilters[ap.hairColor]||'none';
  const iris=CC.eyeColors[ap.eyeColor]||'#3d9bdc';
  const irisBg='radial-gradient(circle,#0a0a0a 26%,'+iris+' 30%,'+iris+' 62%,transparent 72%)';
  let h='<img class="cc-layer" src="'+CC.base+'" alt="">';
  h+='<img class="cc-layer cc-hair" src="/art/custom/cc-hair-'+ap.hairStyle+'.webp" alt="" style="filter:'+hf+'">';
  if(ap.beard!=='none')h+='<img class="cc-layer cc-beard" src="/art/custom/cc-beard-'+ap.beard+'.webp" alt="" style="filter:'+hf+'">';
  h+='<img class="cc-layer cc-eyes" src="/art/custom/cc-eyes-'+ap.eyeShape+'.webp" alt="">';
  h+='<div class="cc-iris" style="left:37.5%;top:38%;background:'+irisBg+'"></div>';
  h+='<div class="cc-iris" style="left:62.5%;top:38%;background:'+irisBg+'"></div>';
  return h;
}
let CCSEL=null;
async function openCustomize(){
  show('screen-customize');
  try{const j=await api.get('/api/appearance');H.appearance=j.appearance;CCSEL={...j.appearance}}catch(e){CCSEL={...CC.defaults}}
  renderCustomize();
}
function ccOptRow(el,opts,cur,onPick,thumb){
  $(el).innerHTML=opts.map(o=>{
    const t=thumb(o);
    return '<button class="cc-opt'+(o===cur?' sel':'')+'" data-v="'+o+'">'+t+'<span class="cc-opt-label">'+o+'</span></button>';
  }).join('');
  $(el).querySelectorAll('.cc-opt').forEach(b=>b.addEventListener('click',()=>{onPick(b.dataset.v);renderCustomize()}));
}
function ccSwatchRow(el,hexMap,cur,onPick){
  $(el).innerHTML=Object.keys(hexMap).map(k=>'<button class="cc-swatch'+(k===cur?' sel':'')+'" data-v="'+k+'" title="'+k+'" style="background:'+hexMap[k]+'"></button>').join('');
  $(el).querySelectorAll('.cc-swatch').forEach(b=>b.addEventListener('click',()=>{onPick(b.dataset.v);renderCustomize()}));
}
function renderCustomize(){
  if(!CCSEL)CCSEL={...CC.defaults};
  $('#cc-preview').innerHTML=heroFaceHTML(CCSEL);
  ccOptRow('#cc-hairStyles',CC.hairStyles,CCSEL.hairStyle,v=>CCSEL.hairStyle=v,
    s=>'<img src="/art/custom/cc-hair-'+s+'.webp" alt="'+s+'">');
  ccSwatchRow('#cc-hairColors',CC.hairHex,CCSEL.hairColor,v=>CCSEL.hairColor=v);
  ccOptRow('#cc-eyeShapes',CC.eyeShapes,CCSEL.eyeShape,v=>CCSEL.eyeShape=v,
    s=>'<img src="/art/custom/cc-eyes-'+s+'.webp" alt="'+s+'">');
  ccSwatchRow('#cc-eyeColors',CC.eyeColors,CCSEL.eyeColor,v=>CCSEL.eyeColor=v);
  ccOptRow('#cc-beards',CC.beards,CCSEL.beard,v=>CCSEL.beard=v,
    s=>s==='none'?'<img src="/art/custom/cc-base.webp" alt="none" style="filter:grayscale(1) brightness(0.6)">':'<img src="/art/custom/cc-beard-'+s+'.webp" alt="'+s+'">');
}
$('#cc-save').addEventListener('click',async()=>{
  if(!CCSEL)return;
  try{const j=await api.post('/api/appearance',CCSEL);H.appearance=j.appearance;toast('Appearance saved. Your hero wears the new look.')}
  catch(e){toast(e.message)}
});
async function openRecruit(){
  show('screen-recruit');
  const list=$('#recruit-list');list.innerHTML='<p class="muted" style="padding:20px;text-align:center">Loading guild roster…</p>';
  try{H.party=await api.get('/api/party')}catch(e){list.innerHTML='<p class="err" style="padding:20px">'+esc(e.message)+'</p>';return}
  const p=H.party,owned=new Set((p.roster||[]).map(n=>n.name));
  list.innerHTML=(p.options||[]).map(o=>{
    const s=RECRUIT_STYLE[o.name]||{img:'/art/hub/hub-rook.webp',bio:'',stars:3};
    const has=owned.has(o.name);
    return '<div class="recruit-card panel"><img src="'+s.img+'" alt="'+esc(o.name)+'">'+
      '<div class="rc-info"><div class="rc-name">'+esc(o.name)+'</div>'+
      '<div class="rc-sub">Lv. 1 &nbsp;'+esc(o.role)+'</div>'+
      '<div class="stars">'+'★'.repeat(s.stars)+'☆'.repeat(5-s.stars)+'</div>'+
      '<div class="rc-bio">'+esc(s.bio)+'</div></div>'+
      '<div class="rc-right">'+(has?'<span class="rc-owned">In party</span>':
        '<button class="btn-gold" data-rec="'+esc(o.name)+'">Recruit</button><span class="rc-cost"><span class="coin"></span>'+o.cost+'</span>')+'</div></div>';
  }).join('');
  $$('#recruit-list [data-rec]').forEach(b=>b.addEventListener('click',async()=>{
    b.disabled=true;
    try{await api.post('/api/party',{action:'recruit',name:b.dataset.rec});toast(b.dataset.rec+' joins your party.');await refreshTop();openRecruit()}
    catch(e){toast(e.message);b.disabled=false}
  }));
}

/* ---------- blacksmith ---------- */
$$('#bs-tabs .tab').forEach(t=>t.addEventListener('click',()=>{
  $$('#bs-tabs .tab').forEach(x=>x.classList.toggle('active',x===t));H.bsTab=t.dataset.bstab;renderBS();
}));
async function openBlacksmith(){show('screen-blacksmith');await refreshTop();renderBS()}
function bsWeaponList(sel){
  const ws=(H.profile&&H.profile.weapons)||[];
  if(!ws.length)return '<p class="muted">No weapons yet. Forge one, or find one in the dungeon.</p>';
  return '<div class="weapon-pick">'+ws.map(w=>
    '<button class="weapon-opt'+(sel===w.id?' sel':'')+'" data-wsel="'+w.id+'"><span class="bs-wicon">🗡</span><span><b>'+esc(w.name)+'</b><br><span class="muted small">Lv. '+(w.upgrade||0)+' · Atk '+w.atk+'</span></span>'+(H.profile.equippedId===w.id?'<span class="eq">EQUIPPED</span>':'')+'</button>'
  ).join('')+'</div>';
}
function renderBS(){
  const el=$('#bs-content'),ws=(H.profile&&H.profile.weapons)||[];
  if(!H.bsWeapon&&ws.length)H.bsWeapon=ws[0].id;
  const w=ws.find(x=>x.id===H.bsWeapon);
  if(H.bsTab==='upgrade'){
    if(!w){el.innerHTML=bsWeaponList(null);bindWSel(el);return}
    const lv=w.upgrade||0,cost=10+lv*10,need=lv+1,maxed=lv>=5;
    el.innerHTML=bsWeaponList(w.id)+
      '<div class="panel" style="padding:14px"><div class="bs-weapon"><span class="bs-wicon">🗡</span><div><div class="rc-name">'+esc(w.name)+'</div><div class="muted small">Lv. '+lv+' → '+(lv+1)+'</div></div></div>'+
      '<div class="statline"><span>Atk</span><span>'+w.atk+' <span class="up">→ '+(w.atk+1)+'</span></span></div>'+
      '<div class="costline"><span>Cost</span><span><span class="coin"></span> '+cost+' &nbsp;⛏ '+need+'</span></div>'+
      '<button class="btn-gold btn-big" id="bs-up" '+(maxed?'disabled':'')+'>'+(maxed?'Max Level':'Upgrade')+'</button></div>';
    bindWSel(el);
    const b=$('#bs-up');if(b)b.addEventListener('click',async()=>{
      b.disabled=true;
      try{await api.post('/api/verified/floor1',{action:'forge',recipe:'upgrade',weaponId:w.id});toast(w.name+' upgraded.');await refreshTop();renderBS()}
      catch(e){toast(e.message);b.disabled=false}
    });
  }else if(H.bsTab==='forge'){
    const iron=(H.profile.materials||{})['Iron Fragment']||0;
    el.innerHTML='<div class="panel" style="padding:14px"><div class="bs-weapon"><span class="bs-wicon">🗡</span><div><div class="rc-name">Ironfang Blade</div><div class="muted small">Atk 5 · A trusty guild-forged blade</div></div></div>'+
      '<div class="costline"><span>Cost</span><span><span class="coin"></span> 15 &nbsp;⛏ 2 <span class="muted small">(you have '+iron+')</span></span></div>'+
      '<button class="btn-gold btn-big" id="bs-forge">Forge</button></div>';
    $('#bs-forge').addEventListener('click',async ev=>{
      ev.target.disabled=true;
      try{await api.post('/api/verified/floor1',{action:'forge',recipe:'ironfang'});toast('Ironfang Blade forged and equipped.');await refreshTop();renderBS()}
      catch(e){toast(e.message);ev.target.disabled=false}
    });
  }else{
    el.innerHTML='<div class="panel soon"><div style="font-size:40px">⚒</div><h3 class="serif gold-text">'+(H.bsTab==='refine'?'Refine':'Repair')+'</h3><p class="muted">The master smith is still setting up this bench.<br>Coming soon.</p></div>';
  }
}
function bindWSel(el){el.querySelectorAll('[data-wsel]').forEach(b=>b.addEventListener('click',()=>{H.bsWeapon=b.dataset.wsel;renderBS()}))}

/* ---------- inventory ---------- */
$$('#inv-tabs .tab').forEach(t=>t.addEventListener('click',()=>{
  $$('#inv-tabs .tab').forEach(x=>x.classList.toggle('active',x===t));H.invTab=t.dataset.invtab;renderInv();
}));
$('#btn-sort').addEventListener('click',()=>{H.sortDesc=!H.sortDesc;renderInv()});
async function openInventory(){
  show('screen-inventory');await refreshTop();
  if(H.vendor===null){try{H.vendor=await api.get('/api/vendor')}catch(e){H.vendor=false}}
  renderInv();
}
const MAT_ICON={'Iron Fragment':'⛏','Crystal Shard':'💎','Mooncap Mushroom':'🍄','Ancient Rune':'✧','Astral Relic':'🔮','Sentinel Core':'🛡','Mirefang Fang':'🦷','Ashen Carapace':'🐚','Frozen Reliquary':'❄','Stormglass Heart':'🌩','Rift-Touched Scale':'🐉','Astral Grave Dust':'✨','Fallen Star Heart':'⭐'};
function invItems(){
  const pr=H.profile||{},mats=pr.materials||{},ws=[...(pr.weapons||[])];
  if(H.sortDesc)ws.sort((a,b)=>b.atk-a.atk);
  const items=[];
  ws.forEach(w=>items.push({kind:'weapon',id:w.id,name:w.name,icon:'🗡',sub:'Atk '+w.atk+' · Lv.'+(w.upgrade||0),eq:pr.equippedId===w.id,w}));
  Object.keys(mats).forEach(k=>{if(mats[k]>0)items.push({kind:'material',name:k,icon:MAT_ICON[k]||'📦',qty:mats[k],sub:'Material'})});
  return items;
}
function renderInv(){
  const all=invItems(),t=H.invTab;
  const list=all.filter(i=>t==='all'||(t==='weapons'&&i.kind==='weapon')||(t==='items'&&i.kind==='material')||(t==='armor'&&false)||(t==='key'&&false));
  const grid=$('#inv-grid');
  if(!list.length){
    grid.innerHTML='<div class="inv-empty">'+(t==='armor'?'No armor yet.<br>Armor has not reached Ravenford.':t==='key'?'No key items yet.<br>Quest treasures will appear here.':'Your pack is empty.<br>Brave the dungeon to find loot.')+'</div>';
  }else{
    grid.innerHTML=list.map(i=>'<div class="inv-cell'+(i.eq?' equipped':'')+'" data-ikind="'+i.kind+'" data-iid="'+esc(i.id||i.name)+'"><span class="ic">'+i.icon+'</span><span class="nm">'+esc(i.name)+'</span>'+(i.qty?'<span class="qty">×'+i.qty+'</span>':'')+(i.eq?'<span class="qty" style="color:var(--gold-hi)">E</span>':'')+'</div>').join('');
  }
  const kinds=new Set(all.map(i=>i.name)).size;
  $('#inv-count').textContent=kinds+'/60';
  const vb=$('#inv-vendorbar');
  if(H.vendor&&H.vendor!==-0&&typeof H.vendor==='object'){
    vb.hidden=false;
    vb.innerHTML='<span>Vendor buying '+(H.vendorMode?'ON — tap an item to sell':'— sell spare loot for gold')+'</span><button class="btn-ghost small" id="vb-toggle">'+(H.vendorMode?'Done':'Sell')+'</button>';
    $('#vb-toggle').onclick=()=>{H.vendorMode=!H.vendorMode;renderInv()};
  }else vb.hidden=true;
  grid.querySelectorAll('.inv-cell').forEach(c=>c.addEventListener('click',()=>invTap(c)));
}
async function invTap(c){
  const kind=c.dataset.ikind,id=c.dataset.iid;
  if(H.vendorMode&&H.vendor&&typeof H.vendor==='object'){
    if(!confirm('Sell 1 × '+id+'?'))return;
    try{
      const j=await api.post('/api/vendor',kind==='weapon'?{action:'sell',kind:'weapon',id}:{action:'sell',kind:'material',key:id,qty:1});
      toast('Sold. '+(j.gold!=null?'Gold: '+j.gold:''));
      await refreshTop();renderInv();
    }catch(e){toast(e.message)}
    return;
  }
  if(kind==='weapon'){
    if((H.profile.equippedId)===id){toast('Already equipped.');return}
    try{await api.post('/api/verified/floor1',{action:'equip',weaponId:id});toast('Equipped.');await refreshTop();renderInv()}
    catch(e){toast(e.message)}
  }
}

/* ---------- relationships ---------- */
const STORY_BONDS=[
  {name:'Lyra',img:'/art/hub/hub-lyra.webp',desc:'A quiet mage who found you in the snow.'},
  {name:'Kael',img:'/art/hub/hub-kael.webp',desc:'A former soldier, now a wanderer.'},
  {name:'Seraphine',img:'/art/hub/hub-seraphine.webp',desc:'Quick, cheerful, and deadly with a bow.'},
  {name:'Darius',img:'/art/hub/hub-darius.webp',desc:'A loyal protector with a noble heart.'}
];
function friendLevel(bond){return 1+Math.floor((bond||0)/34)}
async function openRelations(){
  show('screen-relations');await refreshTop();
  const list=$('#rel-list'),p=H.profile||{};
  try{if(!H.party)H.party=await api.get('/api/party')}catch(e){}
  const roster=((H.party&&H.party.roster)||[]);
  const rmap={};((H.party&&H.party.roster)||[]).forEach(n=>rmap[n.name]=n);
  let html='';
  roster.forEach(n=>{
    const img=(RECRUIT_STYLE[n.name]||{}).img||'/art/hub/hub-rook.webp';
    html+='<div class="rel-card panel"><img src="'+img+'" alt="'+esc(n.name)+'"><div class="rc-info"><div class="rc-name">'+esc(n.name)+'</div><div class="rc-sub">Friendship '+friendLevel(n.bond)+'</div><div class="friend-bar"><div class="friend-fill" style="width:'+Math.min(100,n.bond||0)+'%"></div></div></div></div>';
  });
  const lyraBond=p.lyraBond||(H.status&&H.status.lyraBond)||0;
  if(!rmap['Lyra'])html+='<div class="rel-card panel"><img src="/art/hub/hub-lyra.webp" alt="Lyra"><div class="rc-info"><div class="rc-name">Lyra</div><div class="rc-sub">Friendship '+friendLevel(lyraBond)+'</div><div class="friend-bar"><div class="friend-fill" style="width:'+Math.min(100,lyraBond)+'%"></div></div></div></div>';
  STORY_BONDS.slice(1).forEach(s=>{
    if(rmap[s.name])return;
    html+='<div class="rel-card panel locked"><img src="'+s.img+'" alt="'+esc(s.name)+'"><div class="rc-info"><div class="rc-name">'+esc(s.name)+'</div><div class="rc-sub">'+esc(s.desc)+'</div><div class="rc-sub" style="margin-top:4px">Bond grows as the tale unfolds…</div></div></div>';
  });
  list.innerHTML=html||'<p class="muted" style="padding:20px;text-align:center">No bonds yet. Your story is just beginning.</p>';
}

/* ---------- dungeon select ---------- */
async function openDungeon(){
  show('screen-dungeon');await refreshTop();
  const st=H.status||{};
  $('#dg-reclv').textContent=Math.max(1,st.dungeonFloor||1);
  $('#dg-deep').textContent='Floor '+(st.dungeonCompleted||0)+' / 10';
  $('#dg-foes').innerHTML=['🐀','👺','🕷','🐺'].map(e=>'<span class="foe-ico">'+e+'</span>').join('');
  $('#dg-rewards').innerHTML=['<span class="rw-ico">🪙</span>','<span class="rw-ico">⛏</span>','<span class="rw-ico">🗡</span>','<span class="rw-ico">💎</span>'].join('');
  const btn=$('#btn-enter-dungeon');
  btn.textContent=st.dungeonActive?'Resume Floor '+(st.dungeonFloor||1):'Enter Dungeon';
  btn.onclick=async()=>{
    btn.disabled=true;
    try{await api.post('/api/common-dungeon',{action:'enter'});await openBattle()}
    catch(e){toast(e.message);btn.disabled=false}
  };
}

/* ---------- types wheel ---------- */
(function typesWheel(){
  const svg=$('#elem-wheel');if(!svg)return;
  const E=[
    {n:'Fire',x:170,y:52,c:'#ff7a3c',icon:'🔥'},
    {n:'Water',x:282,y:150,c:'#4aa8ff',icon:'💧'},
    {n:'Wind',x:226,y:252,c:'#7ae0a3',icon:'🍃'},
    {n:'Earth',x:114,y:252,c:'#d8a24a',icon:'⛰'},
    {n:'Light',x:58,y:150,c:'#ffe27a',icon:'✦'},
    {n:'Dark',x:170,y:150,c:'#9a6bff',icon:'🌙'}
  ];
  const strong=[['Fire','Wind'],['Wind','Water'],['Water','Fire'],['Light','Dark'],['Dark','Light'],['Earth','Wind']];
  const by={};E.forEach(e=>by[e.n]=e);
  let s='<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#3ddc84"/></marker></defs>';
  strong.forEach(([a,b])=>{
    const A=by[a],B=by[b],mx=(A.x+B.x)/2,my=(A.y+B.y)/2-14;
    s+='<path d="M'+A.x+','+A.y+' Q'+mx+','+my+' '+B.x+','+B.y+'" stroke="#3ddc84" stroke-width="1.6" fill="none" marker-end="url(#ah)" opacity=".85"/>';
  });
  E.forEach(e=>{
    s+='<circle cx="'+e.x+'" cy="'+e.y+'" r="30" fill="#141828" stroke="'+e.c+'" stroke-width="2"/>';
    s+='<text x="'+e.x+'" y="'+e.y+7+'" text-anchor="middle" font-size="20">'+e.icon+'</text>';
    s+='<text x="'+e.x+'" y="'+(e.y+46)+'" text-anchor="middle" fill="#eae8f7" font-size="12">'+e.n+'</text>';
  });
  svg.innerHTML=s;
})();

/* ---------- tactical battle (server-authoritative) ---------- */
async function openBattle(){
  try{H.dungeon=await api.get('/api/common-dungeon')}catch(e){toast(e.message);return}
  const run=H.dungeon.run;
  if(!run){openDungeon();return}
  H.battle={runId:run.id,sel:null,moveTiles:[],armed:false};
  show('screen-battle');renderBattle();
}
function battleOcc(run){
  const m=new Map();
  m.set(run.heroX+','+run.heroY,{kind:'hero'});
  (run.allies||[]).forEach(a=>m.set(a.x+','+a.y,{kind:'ally',ref:a}));
  (run.enemies||[]).forEach(e=>{if(e.hp>0)m.set(e.x+','+e.y,{kind:'foe',ref:e})});
  return m;
}
function renderBattle(){
  const d=H.dungeon,run=d.run;if(!run){openDungeon();return}
  const N=run.mapSize||7;
  $('#turn-counter').textContent='Turn '+(run.turn||0);
  $('#battle-floor').textContent='Floor '+run.floor+(run.boss?' · BOSS':'');
  const banner=$('#boss-banner');
  const telegraph=(run.enemies||[]).find(e=>e.telegraph);
  if(run.boss||run.special||telegraph){
    banner.hidden=false;
    banner.innerHTML=(run.boss?'<b>'+esc(run.name)+'</b> · Weak: '+esc(run.weakness||'?')+'<br>':'')+
      (run.special?'<b>Sanctuary encounter</b> — no losses if you fall.<br>':'')+
      (telegraph?'<b>Warning:</b> '+esc(telegraph.name)+' is charging an attack! Move or Guard.':'');
  }else banner.hidden=true;
  renderTurnOrder(run);
  // grid
  const grid=$('#battle-grid');grid.style.gridTemplateColumns='repeat('+N+',1fr)';
  const walls=new Set((run.walls||[]).map(w=>w.x+','+w.y));
  const occ=battleOcc(run);
  const mv=new Set(H.battle.moveTiles.map(t=>t.x+','+t.y));
  // threat tiles: show selected foe's attack range in red (Wartales-style)
  const threat=new Set();
  const selFoe=H.battle.sel&&H.battle.sel.kind==='foe'?(run.enemies||[]).find(e=>e.id===H.battle.sel.id&&e.hp>0):null;
  if(selFoe){
    const r=(selFoe.type==='Spirit'||String(selFoe.name).includes('Wisp'))?3:1;
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      const d=Math.abs(dx)+Math.abs(dy);if(!d||d>r)continue;
      const nx=selFoe.x+dx,ny=selFoe.y+dy;
      if(nx>=0&&ny>=0&&nx<N&&ny<N&&!walls.has(nx+','+ny))threat.add(nx+','+ny);
    }
  }
  let html='';
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const k=x+','+y,o=occ.get(k),w=walls.has(k);
    let cls='cell'+(w?' wall':'')+(mv.has(k)?' move-hl':'')+(threat.has(k)?' atk-hl':'');
    let cellStyle=w?' style="background-image:url(\''+WALL_TILES[(x*3+y*7)%3]+'\');background-size:cover"':'';
    let inner='';
    if(o){
      if(o.kind==='hero'){const pct=run.heroMaxHp?Math.max(0,Math.round(100*run.heroHp/run.heroMaxHp)):0;inner='<div class="tok hero sprimg"><img src="'+HERO_SPRITE+'" alt="Hero"></div><div class="active-diamond">◆</div><div class="hp-mini ally"><i style="width:'+pct+'%"></i></div>'}
      else if(o.kind==='ally'){const dead=o.ref.hp<=0;const img=ALLY_SPRITES[o.ref.name]||SPR+'spr-rin.webp';const pct=o.ref.maxHp?Math.max(0,Math.round(100*o.ref.hp/o.ref.maxHp)):0;inner='<div class="tok ally sprimg" style="'+(dead?'filter:grayscale(1);opacity:.5':'')+'"><img src="'+img+'" alt="'+esc(o.ref.name)+'"></div><div class="hp-mini ally"><i style="width:'+pct+'%"></i></div>'}
      else if(o.kind==='foe'){inner='<div class="tok '+(o.ref.boss?'boss':'foe')+' sprimg"><img src="'+foeSprite(o.ref.name)+'" alt="'+esc(o.ref.name)+'"></div><div class="hp-mini foe"><i style="width:'+Math.round(100*o.ref.hp/o.ref.maxHp)+'%"></i></div>'}
      if(H.battle.sel&&((H.battle.sel.kind==='hero'&&o.kind==='hero')||(H.battle.sel.kind!=='hero'&&o.ref&&H.battle.sel.id===o.ref.id)))cls+=' sel';
    }
    const loot=(run.loot||[]).find(l=>!l.claimed&&l.found&&l.x===x&&l.y===y);
    if(loot&&!o)inner='<div class="tok loot">✦</div>';
    html+='<div class="'+cls+'" data-x="'+x+'" data-y="'+y+'"'+cellStyle+'>'+inner+'</div>';
  }
  grid.innerHTML=html;
  grid.querySelectorAll('.cell').forEach(c=>c.addEventListener('click',()=>cellTap(run,+c.dataset.x,+c.dataset.y)));
  // unit panel (hero default)
  const sel=H.battle.sel;
  const ally=sel&&sel.kind==='ally'?(run.allies||[]).find(a=>a.id===sel.id):null;
  if(ally){
    $('#up-portrait').innerHTML='<img class="cc-layer" src="'+((RECRUIT_STYLE[ally.name]||{}).img||'/art/hub/hub-rook.webp')+'" alt="">';
    $('#up-name').textContent=ally.name;$('#up-lv').textContent='Ally';$('#up-class').textContent=ally.role+' · acts on its own';
    setHp('#up-hp','#up-hptext',ally.hp,ally.maxHp);
  }else{
    $('#up-portrait').innerHTML=heroFaceHTML(H.appearance);
    $('#up-name').textContent=H.saveName||'Rook';$('#up-lv').textContent='Lv. '+(d.hero?.level||1);$('#up-class').textContent='The Nullborn';
    setHp('#up-hp','#up-hptext',run.heroHp,run.heroMaxHp);
  }
  $('#ba-potions').textContent='Items ('+(run.potions||0)+')';
  $('#battle-log').innerHTML=(run.log||[]).slice().reverse().map(l=>'<div>'+esc(l)+'</div>').join('');
  renderEnemyPanel(run);
}
function setHp(bar,text,hp,max){const p=max?Math.max(0,Math.round(100*hp/max)):0;$(bar).style.width=p+'%';$(text).textContent=hp+'/'+max}
/* Turn-order avatar bar: hero + allies (blue) then foes (red), diamond on the active unit */
function renderTurnOrder(run){
  const el=$('#turn-order');if(!el)return;
  const units=[{kind:'hero',name:H.saveName||'Rook',face:true,hp:run.heroHp,max:run.heroMaxHp,active:true}];
  (run.allies||[]).forEach(a=>units.push({kind:'ally',name:a.name,img:((RECRUIT_STYLE[a.name]||{}).img||'/art/hub/hub-rook.webp'),hp:a.hp,max:a.maxHp}));
  (run.enemies||[]).filter(e=>e.hp>0).forEach(e=>units.push({kind:'foe',name:e.name,img:foeSprite(e.name),hp:e.hp,max:e.maxHp}));
  let html='';
  units.forEach((u,i)=>{
    const pct=u.max?Math.max(0,Math.round(100*u.hp/u.max)):0;
    const col=u.kind==='foe'?'#e5484d':'#3d9bdc';
    html+=(i?'<span class="to-arrow">›</span>':'')+
      '<div class="to-unit'+(u.kind==='foe'?' foe':'')+(u.active?' active':'')+'" title="'+esc(u.name)+'">'+
      (u.face?'<div class="cc-face">'+heroFaceHTML(H.appearance)+'</div>':'<img src="'+u.img+'" alt="'+esc(u.name)+'">')+
      '<div class="to-hp"><i style="width:'+pct+'%;background:'+col+'"></i></div></div>';
  });
  el.innerHTML=html;
}
const ACTION_DESC={
  attack:'Attack — Deal physical damage to a target within range. Tap an enemy to see the forecast.',
  rune:'Fire Rune — Hurl searing flame at a foe within 3 tiles.',
  items:'Items — Quaff a potion to restore HP.',
  guard:'Guard — Brace for impact. Reduces incoming damage until your next move.'
};
function setActionDesc(k){const el=$('#action-desc');if(el)el.textContent=ACTION_DESC[k]||''}
function renderEnemyPanel(run){
  const sel=H.battle.sel,ep=$('#enemy-panel');
  const foe=sel&&sel.kind==='foe'?(run.enemies||[]).find(e=>e.id===sel.id&&e.hp>0):null;
  if(!foe){ep.hidden=true;$('#forecast-panel').hidden=true;return}
  ep.hidden=false;
  $('#ep-sprite').src=foeSprite(foe.name);
  $('#ep-name').textContent=(foe.boss?'👹 ':'')+foe.name;
  $('#ep-lv').textContent='Lv. '+run.floor;
  setHp('#ep-hp','#ep-hptext',foe.hp,foe.maxHp);
  $('#ep-hptext').textContent=foe.hp+'/'+foe.maxHp;
  $('#ep-weak').textContent=foe.weakness||'?';$('#ep-strong').textContent=foe.resistance||'—';
  showForecast(run,foe);
}
function dmgMods(){
  const might=(H.dungeon.hero?.might)||0,focus=(H.dungeon.hero?.focus)||0;
  const w=((H.profile||{}).weapons||[]).find(x=>x.id===(H.profile||{}).equippedId);
  const wb=Math.min(8,Math.max(0,(w?w.atk:2)-2));
  return{might,focus,wb};
}
function showForecast(run,foe){
  const fp=$('#forecast-panel'),{might,focus,wb}=dmgMods();
  const dist=Math.abs((run.heroX??3)-foe.x)+Math.abs((run.heroY??6)-foe.y);
  const bossFire=run.boss&&foe.element?{weak:run.weakness==='Fire',res:run.resistance==='Fire'}:{weak:false,res:false};
  const atk=[
    {id:'strike',n:'Blade Strike',r:1,min:5+might*2+wb,max:9+might*2+wb},
    {id:'fire',n:'Fire Rune',r:3,min:7+focus*2+wb+(bossFire.weak?4:0)-(bossFire.res?3:0),max:11+focus*2+wb+(bossFire.weak?4:0)-(bossFire.res?3:0)},
    {id:'skill',n:'Null Pulse',r:4,min:15+might*2+wb,max:21+might*2+wb,cd:run.skillCooldown||0}
  ];
  const eRange=(foe.type==='Spirit'||foe.name.includes('Wisp'))?3:1;
  let rows='';
  atk.forEach(a=>{
    const inR=dist<=a.r,cdOk=!a.cd;
    let verdict='';
    if(inR&&cdOk){
      if(a.min>=foe.hp)verdict='<span class="fc-ko">K.O. guaranteed</span>';
      else if(a.max>=foe.hp)verdict='<span class="fc-ko">K.O. possible</span>';
      else{
        const survives=foe.hp-a.min>0;
        const counter=survives&&dist<=eRange?Math.min(7,foe.attack||3):0;
        verdict=counter?'<span class="fc-warn">Counter ~'+counter+'</span>':'<span class="muted">No counter</span>';
      }
    }
    rows+='<div class="fc-row"><span>'+a.n+' <span class="muted">(rng '+a.r+')</span></span>'+
      (inR&&cdOk?'<button class="btn-gold small" data-fatk="'+a.id+'" style="padding:6px 12px">~'+a.min+'–'+a.max+' dmg</button>'
        :'<span class="muted small">'+(a.cd?'Cooldown '+a.cd:'Out of range ('+dist+')')+'</span>')+'</div>'+
      (verdict?'<div class="fc-row"><span></span><span>'+verdict+'</span></div>':'');
  });
  fp.innerHTML='<h4>Battle Forecast — '+esc(foe.name)+'</h4>'+rows+'<p class="muted small" style="margin:6px 0 0">Estimates from your Might, Focus and weapon. Allies and monsters act after you.</p>';
  fp.hidden=false;
  fp.querySelectorAll('[data-fatk]').forEach(b=>b.addEventListener('click',()=>doAction(b.dataset.fatk,foe.id)));
}
function cellTap(run,x,y){
  const k=x+','+y,occ=battleOcc(run);
  const mv=H.battle.moveTiles.find(t=>t.x===x&&t.y===y);
  if(mv){doAction('move',null,x,y);return}
  const o=occ.get(k);
  if(o&&o.kind==='hero'){
    H.battle.sel={kind:'hero'};
    const N=run.mapSize||7,walls=new Set((run.walls||[]).map(w=>w.x+','+w.y));
    H.battle.moveTiles=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:run.heroX+dx,y:run.heroY+dy}))
      .filter(p=>p.x>=0&&p.y>=0&&p.x<N&&p.y<N&&!walls.has(p.x+','+p.y)&&!occ.has(p.x+','+p.y));
    renderBattle();
  }else if(o&&o.kind==='ally'){H.battle.sel={kind:'ally',id:o.ref.id};H.battle.moveTiles=[];renderBattle()}
  else if(o&&o.kind==='foe'){H.battle.sel={kind:'foe',id:o.ref.id};H.battle.moveTiles=[];renderBattle()}
  else{H.battle.sel=null;H.battle.moveTiles=[];renderBattle()}
}
async function doAction(action,targetId,x,y){
  const run=H.dungeon.run;if(!run)return;
  const body={action,runId:H.battle.runId};
  if(targetId)body.targetId=targetId;
  if(action==='move'){body.x=x;body.y=y}
  H.battle.sel=null;H.battle.moveTiles=[];
  try{
    const j=await api.post('/api/common-dungeon',body);
    H.dungeon=j;await refreshTop();
    if(j.victory){
      const v=j.victory;
      openModal('<h3>Floor '+v.floor+' Cleared</h3>'+
        '<div class="mrow"><span>Gold</span><b class="gold-text">+'+v.gold+'</b></div>'+
        '<div class="mrow"><span>Loot</span><b>'+esc(v.item||'—')+'</b></div>'+
        '<div class="mrow"><span>Experience</span><b>+'+v.xp+' XP</b></div>'+
        (v.boss?'<div class="mrow"><span>Boss</span><b class="fc-ko">Vanquished</b></div>':'')+
        '<button class="btn-gold btn-big" id="m-close" style="margin-top:10px">Delve Deeper</button>');
      $('#m-close').onclick=()=>{closeModal();openDungeon()};
      return;
    }
    if(j.defeat){
      openModal('<h3>Defeat</h3><p>You fall in the dark… but the spark endures. '+(j.sanctuary?'The sanctuary claims nothing from you.':'')+'</p><button class="btn-gold btn-big" id="m-close">Return to Ravenford</button>');
      $('#m-close').onclick=()=>{closeModal();enterTown()};
      return;
    }
    renderBattle();
  }catch(e){toast(e.message);renderBattle()}
}
$('#ba-attack').addEventListener('click',()=>{H.battle.sel={kind:'hero'};setActionDesc('attack');toast('Tap an enemy to see the forecast.');renderBattle()});
$('#ba-rune').addEventListener('click',()=>{H.battle.sel={kind:'hero'};setActionDesc('rune');toast('Tap an enemy — Fire Rune strikes at range 3.');renderBattle()});
$('#ba-items').addEventListener('click',()=>{setActionDesc('items');doAction('potion')});
$('#ba-guard').addEventListener('click',()=>{setActionDesc('guard');doAction('guard')});
$('#btn-retreat').addEventListener('click',async()=>{
  if(!confirm('Retreat from this floor?'))return;
  try{await api.post('/api/common-dungeon',{action:'retreat'});openDungeon()}catch(e){toast(e.message)}
});
$('#btn-battle-leave').addEventListener('click',()=>openDungeon());

/* ---------- dialogue ---------- */
const PROLOGUE=[
  {n:'???',t:'Can you hear me? …Good. The fall did not break you.'},
  {n:'???',t:'I have no name. I am the spark that caught you in the dark.'},
  {n:'Lyra',t:'…It is still here. The wolf… it watches over us.'},
  {n:'Rook',t:'Then we keep moving. Whatever I was before — it starts here.'},
  {n:'???',t:'Nullborn… We should keep that name between us.'}
];
let dlgIdx=0,dlgFirst=false;
function startDialogue(first){dlgIdx=0;dlgFirst=first;show('screen-dialogue');renderDlg()}
function renderDlg(){
  const d=PROLOGUE[dlgIdx];
  $('#dlg-name').textContent=d.n;$('#dlg-text').textContent=d.t;
  $('#dlg-next').textContent=dlgIdx===PROLOGUE.length-1?'✓':'»';
}
$('#dlg-next').addEventListener('click',()=>{
  if(dlgIdx<PROLOGUE.length-1){dlgIdx++;renderDlg()}
  else endDialogue();
});
$('#dlg-skip').addEventListener('click',endDialogue);
function endDialogue(){
  localStorage.setItem('hubPrologue','1');
  if(dlgFirst)enterTown();else show('screen-town');
}

/* ---------- boot ---------- */
(async function boot(){
  try{const me=await api.get('/api/auth/me');if(me.user){H.email=me.user.email;await enterTown();return}}catch(e){}
  show('screen-title');
})();
