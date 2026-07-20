(async () => {
  'use strict';

  const APP_KEY = 'life-unloaded-2026-v1';
  const VERSION = '2.0.0';
  const app = document.getElementById('app');

  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const deepCopy=o=>JSON.parse(JSON.stringify(o));
  const money=n=>{
    const sign=n<0?'-':''; n=Math.abs(Math.round(n));
    if(n>=10000) return sign+(n/10000).toFixed(n>=100000?0:1)+'万';
    return sign+n.toLocaleString('zh-CN');
  };
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
  const hashSeed=str=>{let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
  const rng=()=>{let s=state.run.rngState>>>0;s=(Math.imul(1664525,s)+1013904223)>>>0;state.run.rngState=s;return s/4294967296};
  const pick=(arr)=>arr[Math.floor(rng()*arr.length)];
  const weighted=(arr)=>{const sum=arr.reduce((a,x)=>a+(x.weight??1),0);let r=rng()*sum;for(const x of arr){r-=x.weight??1;if(r<=0)return x}return arr[arr.length-1]};
  const chance=p=>rng()<p;
  const uid=()=>Math.random().toString(36).slice(2,9);

  const defaultMeta=()=>({
    histories:[], codex:[], settings:{haptic:true,reducedMotion:false}, stats:{runs:0,deaths:0,best:0}, lastRun:null
  });
  let state={view:'home',meta:defaultMeta(),run:null,overlay:null,toast:null};

  function load(){
    try{const raw=localStorage.getItem(APP_KEY);if(raw){const data=JSON.parse(raw);state.meta={...defaultMeta(),...data.meta};state.run=data.run||null;if(state.run&&state.run.currentEvent){const fresh=EVENTS.find(e=>e.id===state.run.currentEvent.id);if(fresh)state.run.currentEvent=fresh;}}}
    catch(e){console.warn(e)}
  }
  function save(){
    try{localStorage.setItem(APP_KEY,JSON.stringify({meta:state.meta,run:state.run}))}catch(e){console.warn(e)}
  }
  function haptic(pattern=12){if(state.meta.settings.haptic && navigator.vibrate)navigator.vibrate(pattern)}
  function showToast(text){state.toast=text;render();setTimeout(()=>{if(state.toast===text){state.toast=null;render()}},1500)}
  function go(view){state.view=view;state.overlay=null;window.scrollTo(0,0);render()}

  const DATA_URL = './data.json';
  const reviveData = value => {
    if (Array.isArray(value)) return value.map(reviveData);
    if (value && typeof value === 'object') {
      if (typeof value.__fn__ === 'string') {
        // data.json is authored and shipped with this game; functions are not accepted from users.
        return Function('chance', `return (${value.__fn__})`)(chance);
      }
      const out = {};
      for (const [key, item] of Object.entries(value)) out[key] = reviveData(item);
      return out;
    }
    return value;
  };
  const dataResponse = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: 'no-store' });
  if (!dataResponse.ok) throw new Error(`人生数据库加载失败（HTTP ${dataResponse.status}）`);
  const DATA = reviveData(await dataResponse.json());
  const {
    WORLD_TAGS, LOCATIONS, OCCUPATIONS, ECONOMIES, RELATIONS, HOUSES,
    BURDENS, SECRETS, ATTRS, FATE_CARDS, STAGE_CARDS, CODEX, ENDINGS, EVENTS
  } = DATA;

  function generateWorld(){
    const tags=[];const pool=[...WORLD_TAGS];while(tags.length<3){const i=Math.floor(rng()*pool.length);tags.push(pool.splice(i,1)[0])}
    return {tags,year:2026};
  }
  function generateBirth(){
    const loc=weighted(LOCATIONS.map(x=>({...x,weight:x.weight+(state.run.world.tags.some(t=>t.id==='county')&&['county','town'].includes(x.id)?4:0)})));
    const father=pick(OCCUPATIONS[loc.id]);let mother=pick(OCCUPATIONS[loc.id]);if(mother===father)mother=pick(OCCUPATIONS[loc.id]);
    const economy=pick(ECONOMIES),relation=pick(RELATIONS),house=pick(HOUSES[loc.id]),burden=pick(BURDENS),secret=pick(SECRETS);
    return {location:loc,family:{father,mother,economy,relation,house,burden,secret}};
  }
  function newRun(){
    const code='CN26-'+Math.random().toString(36).slice(2,6).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
    state.run={
      seed:code,rngState:hashSeed(code),phase:'birthReveal',age:0,world:null,birth:null,
      attrs:{intellect:1,physique:1,looks:1,stability:1,social:1,ambition:1},points:20,
      res:{cash:0,assets:0,debt:0,health:78,spirit:72,relation:60},
      hidden:{info:0,risk:0,adapt:0,self:0},flags:{},cards:[],stageDrawn:[],pending:[],timeline:[],usedEvents:[],currentEvent:null,currentResult:null,badStreak:0,eventCount:0,education:'未分流',career:'尚未进入社会',ending:null
    };
    state.run.world=generateWorld();state.run.birth=generateBirth();
    const eco={困难:-12000,紧张:-3000,普通:8000,宽裕:26000,富足:80000,'账面富足':12000}[state.run.birth.family.economy]||0;
    state.run.res.cash=eco;state.run.res.assets=state.run.birth.family.house.includes('多套')?1300000:state.run.birth.family.house.includes('商品房')?420000:state.run.birth.family.house.includes('自建')?250000:state.run.birth.family.house.includes('老破')?500000:30000;
    if(state.run.birth.family.burden.includes('房贷'))state.run.res.debt=320000;
    state.run.flags.familyCrack=state.run.birth.family.relation.includes('冲突');
    state.view='birth';save();render();
  }

  function applyEffects(effects={},record=true){
    const r=state.run;const deltas=[];
    const map={cash:['res','cash'],assets:['res','assets'],debt:['res','debt'],health:['res','health'],spirit:['res','spirit'],relation:['res','relation'],info:['hidden','info'],risk:['hidden','risk'],adapt:['hidden','adapt'],self:['hidden','self']};
    for(const [k,v] of Object.entries(effects)){
      if(k==='flag'){r.flags[v]=true;continue} if(k==='consumeFlag'){delete r.flags[v];continue} if(k==='age'){r.age+=v;continue}
      if(ATTRS[k]){r.attrs[k]=clamp(r.attrs[k]+v,1,10);deltas.push({k:ATTRS[k].name,v});continue}
      if(k==='education'){r.hidden.adapt+=v;r.education=v>=2?'高等教育路径':r.education;deltas.push({k:'教育',v});continue}
      if(k==='public'){r.hidden.info+=Math.ceil(v/2);r.flags.publicTrack=true;deltas.push({k:'体制适配',v});continue}
      if(map[k]){const [a,b]=map[k];r[a][b]+=v;if(['health','spirit','relation'].includes(k))r[a][b]=clamp(r[a][b],0,100);if(['info','risk','adapt','self'].includes(k))r[a][b]=clamp(r[a][b],-5,12);deltas.push({k:{cash:'现金',assets:'资产',debt:'负债',health:'健康',spirit:'精神',relation:'关系',info:'信息差',risk:'风险',adapt:'时代适配',self:'自我认知'}[k],v});continue}
      if(k==='ambition'){r.attrs.ambition=clamp(r.attrs.ambition+v,1,10);deltas.push({k:'野心',v})}
    }
    if(record)return deltas;
  }
  function addTimeline(text,age=state.run.age){state.run.timeline.push({age,text});if(state.run.timeline.length>60)state.run.timeline.shift()}
  function unlock(tags=[]){for(const t of tags){if(CODEX[t]&&!state.meta.codex.includes(t))state.meta.codex.push(t)}}

  function getFateOptions(source=FATE_CARDS){const pool=source.filter(c=>!state.run.cards.some(x=>x.id===c.id));const out=[];while(out.length<3&&pool.length){out.push(pool.splice(Math.floor(rng()*pool.length),1)[0])}return out}
  function chooseFate(id){
    const c=state.run.drawOptions.find(x=>x.id===id);state.run.cards.push(c);applyEffects(c.effects);addTimeline(`获得命牌《${c.title}》。`,0);state.run.phase='playing';state.run.age=6;state.run.drawOptions=null;state.view='game';haptic(30);save();nextBeat();
  }
  function drawStageCard(age){state.run.phase='stageDraw';state.run.drawAt=age;state.run.drawOptions=getFateOptions(STAGE_CARDS);state.view='fate';save();render()}
  function chooseStageCard(id){
    const c=state.run.drawOptions.find(x=>x.id===id);state.run.cards.push(c);applyEffects(c.effects);addTimeline(`在人生节点获得《${c.title}》。`);state.run.stageDrawn.push(state.run.drawAt);state.run.phase='playing';state.run.drawOptions=null;state.view='game';haptic([20,35,20]);save();selectEvent();
  }

  function ageStage(age){if(age<13)return '童年';if(age<19)return '教育分流';if(age<26)return '青年';if(age<36)return '结构形成';if(age<51)return '中年清算';if(age<66)return '身份松动';return '余生'}
  function roleLine(){
    const r=state.run;if(r.age<7)return '家庭系统新用户';if(r.age<13)return '义务教育参与者';if(r.age<19)return '分流候选人';
    if(r.flags.publicJob)return '公共岗位从业者';if(r.flags.manager)return '组织协调责任人';if(r.flags.selfEmployed||r.flags.business)return '自雇经营者';if(r.flags.freelance)return '灵活就业者';if(r.flags.optimized)return '重新进入市场的人';if(r.flags.retired)return '退休居民';if(r.flags.college&&r.age<24)return '高等教育在读';return r.career==='尚未进入社会'?'城市普通劳动者':r.career;
  }
  function locationEligible(e){return !e.locations||e.locations.includes(state.run.birth.location.id)}
  function ageEligible(e){return state.run.age>=e.ages[0]&&state.run.age<=e.ages[1]}
  function selectEvent(){
    const r=state.run;
    if(r.res.health<=0||r.age>=88||(r.age>68&&chance((r.age-66)/120))){return finishRun()}
    const secret=r.birth.family.secret;if(secret.age<=r.age&&!r.flags['secret_'+secret.id]){
      r.flags['secret_'+secret.id]=true;r.currentEvent={id:'secret_'+secret.id,title:'家庭秘密结算',icon:'⌁',text:secret.text,tags:['relation','risk'],choices:[{text:'面对已经发生的事',result:'有些秘密不是答案，只是延迟发送的现实。',effects:secret.effect}]};save();render();return;
    }
    const due=r.pending.filter(p=>p.age<=r.age);if(due.length){const p=due[0];r.pending=r.pending.filter(x=>x!==p);r.currentEvent={id:'pending_'+uid(),title:p.title,icon:'↳',text:p.text,tags:p.tags||[],choices:p.choices||[{text:'接受结算',result:p.result||'过去没有消失，它只是选择了今天到达。',effects:p.effects||{}}]};save();render();return}
    const drawAges=[6,12,18,22,30,40,55];const nextDraw=drawAges.find(a=>a<=r.age&&!r.stageDrawn.includes(a));if(nextDraw!==undefined)return drawStageCard(nextDraw);
    let candidates=EVENTS.filter(e=>ageEligible(e)&&locationEligible(e)&&e.condition(r)&&!r.usedEvents.includes(e.id));
    if(!candidates.length)candidates=EVENTS.filter(e=>ageEligible(e)&&locationEligible(e)&&e.condition(r));
    if(!candidates.length){
      r.currentEvent={id:'fallback_'+uid(),title:'平静的一段时间',icon:'—',text:'没有重大新闻落在你身上。生活仍在用一些很小的事情缓慢改变你。',tags:[],choices:[
        {text:'维持现在的节奏',result:'这段时间没有成为故事，但成为了生活。',effects:{health:3,spirit:4}},
        {text:'联系一个很久没见的人',result:'你们都改变了，但还认得彼此。',effects:{relation:6,spirit:3}},
        {text:'整理财务和身体',result:'没有奇迹发生，风险少了一点。',effects:{cash:-2000,health:5,risk:-1}}
      ]};r.currentResult=null;save();render();return;
    }
    const enriched=candidates.map(e=>{
      let w=e.weight||1;
      if(e.tags.includes('ai')&&r.world.tags.some(t=>t.id==='ai'))w*=2.3;
      if(e.tags.includes('public')&&r.world.tags.some(t=>t.id==='public'))w*=2;
      if(e.tags.includes('content')&&r.world.tags.some(t=>t.id==='content'))w*=2;
      if(e.tags.includes('side')&&r.world.tags.some(t=>t.id==='side'))w*=2;
      if(e.tags.includes('house')&&r.world.tags.some(t=>t.id==='house'))w*=1.8;
      return {...e,weight:w};
    });
    r.currentEvent=weighted(enriched);r.usedEvents.push(r.currentEvent.id);r.currentResult=null;save();render();
  }
  function nextBeat(){selectEvent()}
  function chooseEvent(index){
    const r=state.run;if(r.currentResult)return;const ch=r.currentEvent.choices[index];if(ch.require&&!ch.require(r)){showToast('当前条件不足');return}
    const resolvedEffects=typeof ch.effects==='function'?ch.effects(r):(ch.effects||{});const deltas=applyEffects(resolvedEffects);if(ch.tags)unlock(ch.tags);unlock(r.currentEvent.tags||[]);
    if(ch.delay){r.pending.push({age:r.age+ch.delay,title:ch.delayTitle||'延迟后果',text:ch.delayText||'过去的选择重新出现。',effects:ch.delayEffects||{},tags:ch.delayTags||[]})}
    const negative=deltas.filter(d=>d.v<0).length>deltas.filter(d=>d.v>0).length;r.badStreak=negative?r.badStreak+1:0;
    r.currentResult={text:ch.result||'事情继续向前。',deltas};r.eventCount++;addTimeline(`${r.currentEvent.title}：${ch.result||ch.text}`);
    if(r.currentEvent.id==='gaokao')r.education=r.flags.college?'高等教育路径':r.flags.earlyWork?'提前就业':'重新选择';
    if(r.flags.publicJob)r.career='公共岗位从业者';else if(r.flags.manager)r.career='组织管理岗位';else if(r.flags.freelance)r.career='自由职业者';else if(r.flags.employed)r.career='城市企业员工';else if(r.flags.business)r.career='个体经营者';
    haptic(10);save();render();
  }
  function continueAfterResult(){
    const r=state.run;r.currentEvent=null;r.currentResult=null;
    let step=r.age<18?Math.floor(rng()*2)+1:r.age<55?Math.floor(rng()*3)+1:Math.floor(rng()*5)+2;
    r.age+=step;
    // Passive economy and aging
    const income=r.flags.manager?42000:r.flags.publicJob?26000:r.flags.business?chance(.55)?38000:-12000:r.flags.freelance?18000:r.flags.employed?24000:r.age<22?0:16000;
    const costs=r.birth.location.mods.cost?9000+r.birth.location.mods.cost*3500:9000;
    r.res.cash+=income-costs-(r.flags.child?7000:0)-(r.flags.boughtHouse?18000:0);
    if(r.flags.boughtHouse&&r.res.debt>0){const pay=Math.min(r.res.debt,16000);r.res.debt-=pay;r.res.cash-=pay}
    if(r.age>35)r.res.health=clamp(r.res.health-(1+Math.floor(rng()*3)),0,100);
    if(r.age>55)r.res.health=clamp(r.res.health-(2+Math.floor(rng()*4)),0,100);
    if(r.res.cash<0){r.res.debt+=Math.abs(r.res.cash);r.res.cash=0;r.hidden.risk=clamp(r.hidden.risk+1,-5,12);r.res.spirit=clamp(r.res.spirit-4,0,100)}
    save();selectEvent();
  }
  function finishRun(){
    const r=state.run;r.phase='ended';
    const net=r.res.assets-r.res.debt+r.res.cash;
    const score=Math.round(clamp((net/30000)+r.res.health*.22+r.res.spirit*.22+r.res.relation*.18+r.hidden.self*3-r.hidden.risk*2,0,100));
    const end=ENDINGS.find(e=>e.test(r));r.ending={...end,score,net};
    const tags=[];if(r.flags.aiUser)tags.push('AI熟练工');if(r.flags.boughtHouse)tags.push('房贷幸存者');if(r.flags.migrated)tags.push('城市迁移者');if(r.flags.caregiver)tags.push('家庭照护者');if(r.flags.creator)tags.push('注意力劳动者');if(r.flags.publicJob)tags.push('稳定岗位持有者');if(!tags.length)tags.push('普通人生参与者');r.ending.tags=tags.slice(0,3);
    const history={seed:r.seed,age:r.age,title:end.title,score,net,location:r.birth.location.name,date:new Date().toISOString(),tags:r.ending.tags};
    state.meta.histories.unshift(history);state.meta.histories=state.meta.histories.slice(0,30);state.meta.stats.runs++;state.meta.stats.best=Math.max(state.meta.stats.best,score);if(r.res.health<=0)state.meta.stats.deaths++;
    state.meta.lastRun=null;save();go('ending');
  }

  function render(){
    let html='';
    if(state.view==='home')html=homeView();
    else if(state.view==='birth')html=birthView();
    else if(state.view==='attributes')html=attributesView();
    else if(state.view==='fate')html=fateView();
    else if(state.view==='game')html=gameView();
    else if(state.view==='ending')html=endingView();
    else if(state.view==='archive')html=archiveView();
    else if(state.view==='codex')html=codexView();
    else if(state.view==='settings')html=settingsView();
    app.innerHTML=html+(state.overlay?overlayView():'')+(state.toast?`<div class="toast">${esc(state.toast)}</div>`:'');
    bind();
  }

  function homeView(){
    const cont=state.run&&state.run.phase!=='ended';
    return `<main class="screen center">
      <div class="version">v${VERSION}</div>
      <div class="eyebrow">2026 · 中国人生模拟</div>
      <h1>人生尚未加载</h1>
      <p class="hero-sub">出生无法选择。加点可以。世界不保证公平，只保证继续运行。</p>
      <div class="mt stack">
        <button class="btn primary" data-act="new">开始新人生</button>
        ${cont?`<button class="btn" data-act="continue">继续：${state.run.age}岁 · ${esc(state.run.birth.location.name)}</button>`:''}
      </div>
      <div class="menu-list">
        <button class="menu-item" data-nav="archive"><strong>人生档案</strong><span class="chev">›</span></button>
        <button class="menu-item" data-nav="codex"><strong>社会图鉴</strong><span class="muted">${state.meta.codex.length}/${Object.keys(CODEX).length}</span></button>
        <button class="menu-item" data-nav="settings"><strong>设置</strong><span class="chev">›</span></button>
      </div>
      <div class="mt tiny">单文件离线运行。无背景音乐、无广告、无账号、无付费抽卡。</div>
    </main>`;
  }
  function birthView(){
    const r=state.run,b=r.birth;
    return `<main class="screen">
      <div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">投胎结果</div><span class="pill">${esc(r.seed)}</span></div>
      <div class="eyebrow">你出生了</div>
      <div class="birth-place">${esc(b.location.name)}</div>
      <p class="mt-sm">${esc(b.location.note)}</p>
      <section class="card hero mt">
        <div class="row"><div><div class="eyebrow">家庭评级</div><h2 style="margin-top:8px">${esc(b.family.economy)}</h2></div><span class="pill">秘密未解锁</span></div>
        <dl class="spec-list">
          <div class="spec"><dt>父亲</dt><dd>${esc(b.family.father)}</dd></div>
          <div class="spec"><dt>母亲</dt><dd>${esc(b.family.mother)}</dd></div>
          <div class="spec"><dt>住房</dt><dd>${esc(b.family.house)}</dd></div>
          <div class="spec"><dt>家庭关系</dt><dd>${esc(b.family.relation)}</dd></div>
          <div class="spec"><dt>家庭负担</dt><dd>${esc(b.family.burden)}</dd></div>
        </dl>
      </section>
      <section class="card soft mt-sm"><div class="eyebrow">本局时代环境</div><div class="taglist" style="justify-content:flex-start">${r.world.tags.map(t=>`<span class="pill">${esc(t.name)}</span>`).join('')}</div><p class="tiny mt-sm">这些标签只描述环境，不保证任何一条路线获胜。</p></section>
      <div class="bottom-actions"><button class="btn primary" data-act="toAttrs">分配你的天赋</button></div>
    </main>`;
  }
  function attributesView(){
    const r=state.run;
    return `<main class="screen">
      <div class="topbar"><button class="iconbtn" data-nav="birth">‹</button><div class="title">出生加点</div><span></span></div>
      <div class="remain row"><div><div class="eyebrow">可分配点数</div><div class="big-number">${r.points}</div></div><span class="pill">每项上限 8</span></div>
      <section class="card">${Object.entries(ATTRS).map(([k,a])=>`<div class="attr-row"><div><div class="attr-name">${a.name}</div><div class="attr-desc">${a.desc}</div></div><div class="stepper"><button data-step="${k}" data-delta="-1">−</button><b>${r.attrs[k]}</b><button data-step="${k}" data-delta="1">＋</button></div></div>`).join('')}</section>
      <div class="mt tiny">高属性也会制造代价。高野心更容易跃迁，也更容易把运气误认成能力。</div>
      <div class="bottom-actions"><button class="btn ghost" data-act="randomAttrs">随机分配</button><button class="btn primary" data-act="confirmAttrs" ${r.points?'disabled':''}>确认出生</button></div>
    </main>`;
  }
  function fateView(){
    const r=state.run;const title=r.phase==='stageDraw'?`${r.drawAt}岁 · 选择一张人生牌`:'选择一张先天命牌';
    return `<main class="screen"><div class="topbar"><span></span><div class="title">${title}</div><span></span></div>
      <p>${r.phase==='stageDraw'?'时代给了你三个方向，只能留下一个。':'每张牌都带来优势，也留下一个隐蔽的价格。'}</p>
      <div class="stack mt">${r.drawOptions.map((c,i)=>`<button class="card fate-card" style="animation-delay:${i*.06}s;text-align:left" data-card="${c.id}"><div><div class="fate-type">${esc(c.type)}</div><div class="fate-title">《${esc(c.title)}》</div><div class="fate-text">${esc(c.text)}</div></div><div class="row mt-sm"><span class="tiny">点击选择</span><span class="chev">›</span></div></button>`).join('')}</div>
    </main>`;
  }
  function gameView(){
    const r=state.run,e=r.currentEvent;if(!e)return `<div class="loading-screen"><div><div class="loading-mark">·</div><p>人生正在继续运行</p></div></div>`;
    return `<main class="screen">
      <header class="game-header">
        <div class="row"><div class="grow"><div class="age">${r.age}岁</div><div class="role">${esc(r.birth.location.name)} · ${esc(roleLine())}</div></div><button class="iconbtn" data-act="status">☰</button></div>
        <div class="resource-strip">
          <div class="res"><span>现金</span><b>${money(r.res.cash)}</b></div>
          <div class="res"><span>健康</span><b>${Math.round(r.res.health)}</b></div>
          <div class="res"><span>精神</span><b>${Math.round(r.res.spirit)}</b></div>
          <div class="res"><span>关系</span><b>${Math.round(r.res.relation)}</b></div>
        </div>
      </header>
      <section class="card event-card ${r.currentResult?'result-card':''}">
        ${r.currentResult?`<div><div class="eyebrow">选择已生效</div><div class="event-title" style="margin-top:10px">${esc(e.title)}</div><div class="result-text">${esc(r.currentResult.text)}</div>${deltaHtml(r.currentResult.deltas)}</div><div class="event-foot"><span>过去已经写入时间线</span><span>${ageStage(r.age)}</span></div>`:`<div><div class="event-icon">${e.icon}</div><div class="event-title">${esc(e.title)}</div><div class="event-body">${esc(e.text)}</div></div><div class="event-foot"><span>${ageStage(r.age)}</span><span>人生编号 ${esc(r.seed)}</span></div>`}
      </section>
      ${r.currentResult?`<div class="choices"><button class="btn primary" data-act="afterResult">继续</button></div>`:`<div class="choices">${e.choices.map((c,i)=>{const locked=c.require&&!c.require(r);return `<button class="choice ${locked?'locked':''}" data-choice="${i}">${esc(c.text)}${locked?'<small>条件不足</small>':''}</button>`}).join('')}</div>`}
    </main>`;
  }
  function deltaHtml(ds){if(!ds.length)return '';return `<div class="delta-list">${ds.map(d=>`<span class="delta ${d.v>=0?'pos':'neg'}">${esc(d.k)} ${d.v>=0?'+':''}${typeof d.v==='number'&&Math.abs(d.v)>=1000?money(d.v):d.v}</span>`).join('')}</div>`}
  function endingView(){
    const r=state.run,e=r.ending;
    return `<main class="screen">
      <div class="eyebrow" style="text-align:center;margin-top:24px">本次人生服务已结束</div>
      <div class="score-ring" style="--score:${e.score}"><div><b>${e.score}</b><span>人生综合值</span></div></div>
      <div class="ending-title">《${esc(e.title)}》</div><div class="ending-line">${esc(e.line)}</div>
      <div class="taglist">${e.tags.map(t=>`<span class="pill">${esc(t)}</span>`).join('')}</div>
      <section class="card mt">
        <div class="stat-grid">
          <div class="stat-box"><span>寿命</span><b>${r.age}岁</b></div>
          <div class="stat-box"><span>最终净资产</span><b>${money(e.net)}</b></div>
          <div class="stat-box"><span>健康</span><b>${Math.round(r.res.health)}</b></div>
          <div class="stat-box"><span>精神</span><b>${Math.round(r.res.spirit)}</b></div>
          <div class="stat-box"><span>重要关系</span><b>${Math.max(1,Math.round(r.res.relation/17))}人</b></div>
          <div class="stat-box"><span>关键选择</span><b>${r.eventCount}次</b></div>
        </div>
      </section>
      <section class="card mt-sm"><div class="row"><div><div class="eyebrow">人生编号</div><h3 style="margin-top:7px">${esc(r.seed)}</h3></div><button class="btn small" data-act="copySeed">复制</button></div></section>
      <section class="mt"><div class="section-title">关键人生片段</div><div class="timeline">${r.timeline.slice(-18).map(x=>`<div class="time-item"><div class="time-age">${x.age}岁</div><div class="time-text">${esc(x.text)}</div></div>`).join('')}</div></section>
      <div style="height:130px"></div>
      <div class="bottom-actions"><button class="btn" data-nav="archive">人生档案</button><button class="btn primary" data-act="new">再投一次</button></div>
    </main>`;
  }
  function archiveView(){
    const hs=state.meta.histories;
    return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">人生档案</div><span class="pill">${hs.length}次</span></div>
      <section class="card"><div class="stat-grid"><div class="stat-box"><span>完成次数</span><b>${state.meta.stats.runs}</b></div><div class="stat-box"><span>最高综合值</span><b>${state.meta.stats.best}</b></div></div></section>
      <div class="section-title">最近的人生</div>
      <section class="card">${hs.length?hs.map(h=>`<div class="archive-item"><div class="row"><div><div class="archive-title">《${esc(h.title)}》</div><div class="archive-meta">${esc(h.location)} · ${h.age}岁 · 净资产 ${money(h.net)}</div></div><span class="pill">${h.score}</span></div></div>`).join(''):'<p>还没有完成的人生。开始一次投胎，档案才会建立。</p>'}</section>
    </main>`;
  }
  function codexView(){
    const keys=Object.keys(CODEX);
    return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">社会图鉴</div><span class="pill">${state.meta.codex.length}/${keys.length}</span></div>
      <p>你见过的机制，会从现实里退到词条里。未解锁内容仍保持模糊。</p>
      <section class="card mt">${keys.map(k=>{const open=state.meta.codex.includes(k),c=CODEX[k];return `<div class="codex-item"><h3>${open?esc(c.title):'未识别机制'}</h3><p class="${open?'':'locked-text'}">${open?esc(c.text):'这段解释需要在某一次人生中亲自遇见。'}</p></div>`}).join('')}</section>
    </main>`;
  }
  function settingsView(){
    return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">设置</div><span></span></div>
      <section class="card">
        <button class="menu-item" data-act="toggleHaptic"><strong>轻触反馈</strong><span class="switch ${state.meta.settings.haptic?'on':''}"><i></i></span></button>
        <button class="menu-item" data-act="export"><strong>导出存档</strong><span class="chev">›</span></button>
        <button class="menu-item" data-act="reset"><strong style="color:var(--bad)">清除全部数据</strong><span class="chev">›</span></button>
      </section>
      <div class="mt tiny">游戏不联网。数据仅保存在当前浏览器的 localStorage。iOS网页对震动支持有限。</div>
    </main>`;
  }
  function overlayView(){
    if(state.overlay==='status'){
      const r=state.run;return `<div class="drawer-wrap" data-act="closeOverlay"><div class="drawer" onclick="event.stopPropagation()"><div class="handle"></div><div class="row"><div><div class="eyebrow">${r.age}岁 · ${ageStage(r.age)}</div><h2 style="margin-top:7px">${esc(roleLine())}</h2></div><button class="iconbtn" data-act="closeOverlay">×</button></div>
        <div class="section-title">资产负债</div><div class="stat-grid"><div class="stat-box"><span>现金</span><b>${money(r.res.cash)}</b></div><div class="stat-box"><span>资产</span><b>${money(r.res.assets)}</b></div><div class="stat-box"><span>负债</span><b>${money(r.res.debt)}</b></div><div class="stat-box"><span>净值</span><b>${money(r.res.assets+r.res.cash-r.res.debt)}</b></div></div>
        <div class="section-title">身体与关系</div>${['health','spirit','relation'].map(k=>`<div class="card soft mt-sm"><div class="row"><span>${{health:'健康',spirit:'精神',relation:'关系'}[k]}</span><b>${Math.round(r.res[k])}</b></div><div class="meter"><i style="width:${r.res[k]}%"></i></div></div>`).join('')}
        <div class="section-title">持有卡牌</div><div class="stack">${r.cards.map(c=>`<div class="card soft"><div class="row"><strong>《${esc(c.title)}》</strong><span class="pill">${esc(c.type)}</span></div><p class="tiny mt-sm">${esc(c.text)}</p></div>`).join('')||'<p>尚未获得卡牌。</p>'}</div>
        <div class="section-title">时代环境</div><div class="stack">${r.world.tags.map(t=>`<div class="card soft"><strong>${esc(t.name)}</strong><p class="tiny mt-sm">${esc(t.desc)}</p></div>`).join('')}</div>
        <button class="btn ghost mt" data-nav="home">暂停并返回首页</button>
      </div></div>`;
    }
    return '';
  }

  function bind(){
    app.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>go(el.dataset.nav));
    app.querySelectorAll('[data-act]').forEach(el=>el.onclick=()=>action(el.dataset.act));
    app.querySelectorAll('[data-step]').forEach(el=>el.onclick=()=>stepAttr(el.dataset.step,Number(el.dataset.delta)));
    app.querySelectorAll('[data-card]').forEach(el=>el.onclick=()=>state.run.phase==='stageDraw'?chooseStageCard(el.dataset.card):chooseFate(el.dataset.card));
    app.querySelectorAll('[data-choice]').forEach(el=>el.onclick=()=>chooseEvent(Number(el.dataset.choice)));
  }
  function stepAttr(k,d){const r=state.run;if(d>0&&r.points>0&&r.attrs[k]<8){r.attrs[k]++;r.points--}else if(d<0&&r.attrs[k]>1){r.attrs[k]--;r.points++}haptic(6);save();render()}
  function randomAttrs(){const r=state.run;for(const k in r.attrs)r.attrs[k]=1;r.points=20;while(r.points>0){const ks=Object.keys(r.attrs).filter(k=>r.attrs[k]<8);const k=pick(ks);r.attrs[k]++;r.points--}save();render()}
  function action(a){
    if(a==='new'){if(state.run&&state.run.phase!=='ended'&&!confirm('当前人生尚未结束。确定重新投胎？'))return;newRun()}
    else if(a==='continue'){go(state.run.phase==='birthReveal'?'birth':state.run.phase==='attributes'?'attributes':state.run.phase==='fate'||state.run.phase==='stageDraw'?'fate':'game')}
    else if(a==='toAttrs'){state.run.phase='attributes';go('attributes');save()}
    else if(a==='confirmAttrs'){state.run.phase='fate';state.run.drawOptions=getFateOptions();go('fate');save()}
    else if(a==='status'){state.overlay='status';render()}
    else if(a==='closeOverlay'){state.overlay=null;render()}
    else if(a==='afterResult')continueAfterResult()
    else if(a==='copySeed'){navigator.clipboard?.writeText(state.run.seed).then(()=>showToast('人生编号已复制')).catch(()=>showToast(state.run.seed))}
    else if(a==='toggleHaptic'){state.meta.settings.haptic=!state.meta.settings.haptic;save();haptic(20);render()}
    else if(a==='export'){
      const blob=new Blob([JSON.stringify({meta:state.meta,run:state.run},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const x=document.createElement('a');x.href=url;x.download='人生尚未加载-存档.json';x.click();URL.revokeObjectURL(url);showToast('存档已导出');
    }
    else if(a==='reset'){if(confirm('清除全部人生档案、图鉴与存档？此操作不可撤销。')){try{localStorage.removeItem(APP_KEY)}catch(e){}state={view:'home',meta:defaultMeta(),run:null,overlay:null,toast:null};render()}}
  }

  document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
  load();render();window.__LIFE_BOOTED__=true;
})().catch(error => {
  console.error(error);
  window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise: Promise.reject(error), reason: error }));
});
