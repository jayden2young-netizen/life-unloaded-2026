(async () => {
  'use strict';

  const APP_KEY = 'life-unloaded-2026-v1';
  const V2_BACKUP_KEY = 'life-unloaded-2026-v2-backup';
  const CORRUPT_KEY = 'life-unloaded-2026-corrupt-backup';
  const VERSION = '3.0.0';
  const SCHEMA_VERSION = 3;
  const DEBUG = new URLSearchParams(location.search).get('debug') === '1';
  const app = document.getElementById('app');
  const stageDrawAges = [6, 12, 18, 23, 30, 40, 55, 68];
  const categoryTargets = {mainline:.45,stage:.25,social:.15,familyEcho:.10,blackSwan:.05};
  const occupations = {
    tier1:['互联网运营','医院行政','金融后台员工','物业工程师','平台司机','国企职员','软件外包工程师','自由设计师'],
    tier2:['制造业技术员','社区合同工','医院护士','银行柜员','物流调度员','民办教师','个体餐饮经营者','软件实施工程师'],
    county:['县中教师','事业单位职员','建材店经营者','保险业务员','货运司机','电商客服','乡镇卫生院护士','个体商户'],
    town:['种植户','养殖户','建筑劳务人员','农机维修工','快递站经营者','乡村教师','流动摊贩','外出务工人员']
  };

  let DATA;
  let INDEX;
  let state;
  let saveTimer = null;
  let inputLocked = false;
  let simulationMode = false;
  let lastCandidateWeights = [];

  const clamp = (n,a,b) => Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
  const deepCopy = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]));
  const money = value => {
    let n = Math.round(Number(value)||0); const sign=n<0?'-':''; n=Math.abs(n);
    if(n>=100000000) return `${sign}${(n/100000000).toFixed(n>=1000000000?0:1)}亿`;
    if(n>=10000) return `${sign}${(n/10000).toFixed(n>=100000?0:1)}万`;
    return sign+n.toLocaleString('zh-CN');
  };
  const hashSeed = text => {let h=2166136261>>>0;for(let i=0;i<String(text).length;i++){h^=String(text).charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
  const stableNumber = (seed,key,max=100) => hashSeed(`${seed}:${key}`)%max;
  const rng = () => {let s=state.run.rngState>>>0;s=(Math.imul(1664525,s)+1013904223)>>>0;state.run.rngState=s;return s/4294967296};
  const chance = p => rng()<p;
  const pick = arr => arr[Math.floor(rng()*arr.length)];
  const weightedPick = (items,weightOf=x=>x.weight??1) => {
    const weighted=items.map(item=>({item,weight:Math.max(0,Number(weightOf(item))||0)}));
    const sum=weighted.reduce((n,x)=>n+x.weight,0);if(!sum)return items[0];let roll=rng()*sum;
    for(const entry of weighted){roll-=entry.weight;if(roll<=0)return entry.item}return items[items.length-1];
  };
  const makeSeed = () => {
    const bytes=new Uint32Array(2);crypto.getRandomValues(bytes);
    return `CN26-${bytes[0].toString(36).slice(-4).toUpperCase().padStart(4,'0')}-${bytes[1].toString(36).slice(-4).toUpperCase().padStart(4,'0')}`;
  };
  const countMap = ids => ids.reduce((out,id)=>(out[id]=(out[id]||0)+1,out),{});

  function defaultMeta(){
    return {
      schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,histories:[],codex:[],settings:{haptic:true,reducedMotion:false},stats:{runs:0,deaths:0,best:0},
      seenContent:{events:{},cards:{},chains:{},families:{},mainlines:{},endings:{}},recentLives:[],lastRun:null
    };
  }

  function normalizeMeta(meta={}){
    const fresh=defaultMeta();const seen=meta.seenContent||{};
    return {
      ...fresh,...meta,schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,
      settings:{...fresh.settings,...(meta.settings||{})},stats:{...fresh.stats,...(meta.stats||{})},
      seenContent:{events:{...(seen.events||{})},cards:{...(seen.cards||{})},chains:{...(seen.chains||{})},families:{...(seen.families||{})},mainlines:{...(seen.mainlines||{})},endings:{...(seen.endings||{})}},
      histories:Array.isArray(meta.histories)?meta.histories.slice(0,30):[],codex:Array.isArray(meta.codex)?meta.codex:[],recentLives:Array.isArray(meta.recentLives)?meta.recentLives.slice(0,5):[]
    };
  }

  function buildIndex(){
    const allEvents=[...DATA.events,...DATA.eventChains.flatMap(chain=>chain.nodes.map(node=>({...node,chainId:chain.id})))];
    const byStage={};for(const stage of Object.keys(DATA.stages))byStage[stage]=[];
    for(const event of allEvents)for(const stage of event.stage||[])if(byStage[stage])byStage[stage].push(event);
    return {
      allEvents,byStage,event:new Map(allEvents.map(e=>[e.id,e])),family:new Map(DATA.familyArchetypes.map(x=>[x.id,x])),
      chain:new Map(DATA.eventChains.map(x=>[x.id,x])),conflict:new Map(DATA.mainConflicts.map(x=>[x.id,x])),
      cards:new Map(Object.values(DATA.cards).flat().map(x=>[x.id,x])),ending:new Map(DATA.endingTitles.map(x=>[x.id,x]))
    };
  }

  function stageForAge(age){
    return Object.entries(DATA.stages).find(([,range])=>age>=range[0]&&age<=range[1])?.[0]||'elder';
  }
  function stageName(stage){return {infancy:'幼年',childhood:'童年',adolescence:'青春期',youth:'青年',adult:'结构形成',midlife:'中年清算',preRetire:'身份松动',elder:'余生'}[stage]||stage}
  function genderName(gender){return gender==='female'?'女性':'男性'}

  function seededDNA(seed,birth,gender,archetype){
    const n=(key,base=50,spread=45)=>clamp(base+stableNumber(seed,key,spread*2+1)-spread,0,100);
    const mods=archetype?.dnaMods||{};const siblingCount=stableNumber(seed,'siblings',100)<38?0:1+stableNumber(seed,'sibling-count',3);
    const value=(key,base=50)=>clamp(n(key,base)+(mods[key]||0),0,100);
    return {
      familyClass:archetype?.familyClass||'working',onlyChild:siblingCount===0,siblingCount,
      familyRole:siblingCount===0?'唯一的家庭项目':['长子女','中间的孩子','最小的孩子'][stableNumber(seed,'family-role',3)],
      parentControl:value('control'),emotionalExpression:value('emotionalExpression'),educationExpectation:value('educationExpectation'),
      genderTraditionalism:value('genderTraditionalism'),familyRiskTolerance:value('riskTolerance'),careBurden:value('careBurden'),cashflow:value('cashflow'),
      housing:value('housing'),hiddenDebt:value('hiddenDebt'),migration:value('migration'),healthBaseline:value('healthBaseline',58),selfEsteem:value('selfEsteem'),
      attachment:['secure','anxious','avoidant','mixed'][stableNumber(seed,'attachment',4)],information:value('information'),stabilityNeed:value('stabilityNeed'),
      riskTolerance:value('riskTolerance'),organizationDependence:value('organizationDependence'),digitalLiteracy:value('digitalLiteracy'),fraudRisk:value('fraudRisk'),
      internalNewsTrust:value('internalNewsTrust'),openness:value('openness'),medicalAccess:clamp((birth?.location?.mods?.medical||50)+(mods.medicalAccess||0),0,100)
    };
  }

  function defaultDesires(seed,dna,attrs={}){
    const get=(key,base)=>clamp(base+stableNumber(seed,`desire-${key}`,31)-15,12,88);
    return {
      love:get('love',52),familyBelonging:get('family',55),wealth:get('wealth',50)+(attrs.ambition||1)*2,stability:clamp(get('stability',dna.stabilityNeed),0,100),
      freedom:clamp(get('freedom',58)-dna.parentControl*.15,0,100),achievement:get('achievement',52)+(attrs.ambition||1)*2,recognition:get('recognition',50),
      exploration:clamp(get('exploration',dna.openness),0,100),care:clamp(get('care',dna.careBurden),0,100),peace:get('peace',52),body:get('body',45),status:get('status',48),security:get('security',58)
    };
  }

  function chooseConflicts(seed,dna,desireValues){
    const scored=DATA.mainConflicts.map(conflict=>({conflict,score:conflict.desireKeys.reduce((n,key)=>n+Math.abs((desireValues[key]||50)-50),0)+stableNumber(seed,conflict.id,45)}));
    scored.sort((a,b)=>b.score-a.score);return scored.slice(0,2+(stableNumber(seed,'conflict-count',100)>62?1:0)).map(x=>x.conflict.id);
  }

  function selectChainsForRun(run,meta){
    const wanted=3;const previous=new Set(meta.recentLives[0]?.chains||[]);const earlyStages=new Set(['infancy','childhood','adolescence']);
    const candidates=DATA.eventChains.map(chain=>{
      let weight=chain.weight||10;
      if(chain.mainConflicts?.some(id=>run.mainConflicts.includes(id)))weight*=2.2;
      if(chain.genderAffinity===run.gender)weight*=1.35;
      if(chain.familyArchetypes?.includes(run.birth.family.archetype.id))weight*=1.5;
      if(previous.has(chain.id))weight*=.2;
      const seen=meta.seenContent.chains[chain.id]||0;weight*=seen===0?1.8:seen===1?.7:.35;
      return {chain,weight};
    });
    const selected=[];const early=candidates.filter(x=>earlyStages.has(x.chain.nodes[0]?.stage?.[0]));
    while(selected.length<2&&early.length){const chosen=weightedPick(early,x=>x.weight);selected.push(chosen.chain.id);early.splice(early.indexOf(chosen),1);const allIndex=candidates.indexOf(chosen);if(allIndex>=0)candidates.splice(allIndex,1)}
    while(selected.length<wanted&&candidates.length){const chosen=weightedPick(candidates,x=>x.weight);selected.push(chosen.chain.id);candidates.splice(candidates.indexOf(chosen),1)}
    return selected;
  }

  function createRun(seed=makeSeed(),meta=state.meta){
    const run={seed,rngState:hashSeed(seed),schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,phase:'birth',age:0};
    state.run=run;
    run.gender=chance(.5)?'female':'male';
    run.world={year:2026,tags:[]};const worldPool=[...DATA.worldTags];while(run.world.tags.length<3){const tag=weightedPick(worldPool);run.world.tags.push(tag);worldPool.splice(worldPool.indexOf(tag),1)}
    const location=weightedPick(DATA.locations);const recentFamily=new Set(meta.recentLives.map(x=>x.family));
    const family=weightedPick(DATA.familyArchetypes,archetype=>{
      let weight=archetype.weight||1;if(archetype.locationAffinity?.includes(location.id))weight*=1.8;if(recentFamily.has(archetype.id))weight*=.25;
      const seen=meta.seenContent.families[archetype.id]||0;return weight*(seen===0?2:seen===1?.7:.3);
    });
    const secret=weightedPick(DATA.familySecrets.filter(x=>x.age<99||chance(.15)));
    run.birth={location,family:{archetype:family,familyClass:family.familyClass,father:pick(occupations[location.id]),mother:pick(occupations[location.id]),secret,house:['租住房','按揭商品房','老城区住房','自建房','单位住房'][Math.floor(rng()*5)]}};
    run.lifeDNA=seededDNA(seed,run.birth,run.gender,family);
    run.attrs={intellect:1,physique:1,looks:1,stability:1,social:1,ambition:1};run.points=20;
    run.desires=defaultDesires(seed,run.lifeDNA,run.attrs);run.mainConflicts=chooseConflicts(seed,run.lifeDNA,run.desires);
    run.res={cash:Math.round((run.lifeDNA.cashflow-50)*900),assets:run.lifeDNA.housing>70?420000:run.lifeDNA.housing>48?120000:20000,debt:run.lifeDNA.hiddenDebt>72?90000:0,health:clamp(65+run.lifeDNA.healthBaseline*.2,45,92),spirit:72,relation:60};
    run.hidden={information:run.lifeDNA.information/10,risk:run.lifeDNA.riskTolerance/20,adapt:run.lifeDNA.digitalLiteracy/20,selfEsteem:run.lifeDNA.selfEsteem,stress:20,healthHabit:20,careBurden:run.lifeDNA.careBurden/5,digitalLiteracy:run.lifeDNA.digitalLiteracy,fraudRisk:run.lifeDNA.fraudRisk,genderPressure:run.lifeDNA.genderTraditionalism/5,organizationDependence:run.lifeDNA.organizationDependence};
    run.flags={};run.cards=[];run.stageDrawn=[];run.adversityDraws=0;run.pending=[];run.timeline=[];run.endingEvidence=[];run.usedEvents=[];run.eventCounts={};run.exclusiveUsed={};run.cooldowns={};run.themeHistory=[];run.categoryCounts={mainline:0,stage:0,social:0,familyEcho:0,blackSwan:0};run.toneStreak={good:0,bad:0};run.needsBalance=null;
    run.currentEvent=null;run.currentResult=null;run.eventCount=0;run.education='尚未分流';run.career='尚未进入社会';run.relationshipStatus='单身';run.relationships=[];run.children=0;run.ending=null;
    run.activeChains=selectChainsForRun(run,meta);run.chainProgress=Object.fromEntries(run.activeChains.map(id=>[id,{step:0,status:'active'}]));
    return run;
  }

  function migrateRun(old){
    if(!old||typeof old!=='object')return null;const seed=old.seed||`MIGRATED-${Date.now()}`;
    const location=DATA.locations.find(x=>x.id===old.birth?.location?.id)||DATA.locations[stableNumber(seed,'location',DATA.locations.length)];
    const family=DATA.familyArchetypes[stableNumber(seed,'archetype',DATA.familyArchetypes.length)];
    const gender=old.gender|| (stableNumber(seed,'gender',2)?'female':'male');
    const birth={location,family:{archetype:family,familyClass:family.familyClass,father:old.birth?.family?.father||occupations[location.id][0],mother:old.birth?.family?.mother||occupations[location.id][1],secret:DATA.familySecrets.find(x=>x.id===old.birth?.family?.secret?.id)||DATA.familySecrets[stableNumber(seed,'secret',DATA.familySecrets.length)],house:old.birth?.family?.house||'普通住房'}};
    const dna=old.lifeDNA||seededDNA(seed,birth,gender,family);const attrs={intellect:1,physique:1,looks:1,stability:1,social:1,ambition:1,...(old.attrs||{})};
    const desireValues={...defaultDesires(seed,dna,attrs),...(old.desires||{})};const oldPhase=old.phase;
    const phase=['birthReveal','birth'].includes(oldPhase)?'birth':oldPhase==='attributes'?'attributes':oldPhase==='ended'?'ended':'playing';
    const run={
      ...old,schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,seed,rngState:Number(old.rngState)||hashSeed(seed),phase,gender,birth,lifeDNA:dna,attrs,desires:desireValues,
      mainConflicts:Array.isArray(old.mainConflicts)?old.mainConflicts:chooseConflicts(seed,dna,desireValues),
      res:{cash:0,assets:0,debt:0,health:75,spirit:70,relation:60,...(old.res||{})},hidden:{information:0,risk:0,adapt:0,selfEsteem:dna.selfEsteem,stress:20,healthHabit:20,careBurden:dna.careBurden/5,digitalLiteracy:dna.digitalLiteracy,fraudRisk:dna.fraudRisk,genderPressure:dna.genderTraditionalism/5,organizationDependence:dna.organizationDependence,...(old.hidden||{})},
      flags:{...(old.flags||{})},cards:(old.cards||[]).map(card=>typeof card==='string'?card:card.id).filter(id=>INDEX.cards.has(id)),stageDrawn:old.stageDrawn||[],adversityDraws:old.adversityDraws||0,pending:[],timeline:Array.isArray(old.timeline)?old.timeline:[],endingEvidence:old.endingEvidence||[],usedEvents:[],eventCounts:{},exclusiveUsed:{},cooldowns:{},themeHistory:[],categoryCounts:{mainline:0,stage:0,social:0,familyEcho:0,blackSwan:0},toneStreak:{good:0,bad:0},needsBalance:null,currentEvent:null,currentResult:null,eventCount:old.eventCount||0,
      education:old.education||'尚未分流',career:old.career||'尚未进入社会',relationshipStatus:old.flags?.married?'已婚':old.flags?.partner?'稳定关系':'单身',relationships:old.relationships||[],children:old.children??(old.flags?.child?1:0),ending:old.ending||null
    };
    run.activeChains=Array.isArray(old.activeChains)?old.activeChains:DATA.eventChains.slice(0,3).map((_,i)=>DATA.eventChains[(stableNumber(seed,`chain-${i}`,DATA.eventChains.length)+i)%DATA.eventChains.length].id);
    run.chainProgress=old.chainProgress||Object.fromEntries(run.activeChains.map(id=>[id,{step:0,status:'active'}]));return run;
  }

  function loadState(){
    const base={view:'home',meta:defaultMeta(),run:null,overlay:null,toast:null,recovery:null};let raw=null;
    try{raw=localStorage.getItem(APP_KEY)}catch(error){base.recovery={error:String(error),raw:''};return base}
    if(!raw)return base;
    try{
      const parsed=JSON.parse(raw);const wasV2=(parsed.schemaVersion||parsed.meta?.schemaVersion||2)<3;
      if(wasV2&&!localStorage.getItem(V2_BACKUP_KEY))localStorage.setItem(V2_BACKUP_KEY,raw);
      base.meta=normalizeMeta(parsed.meta||{});base.run=migrateRun(parsed.run);return base;
    }catch(error){
      try{localStorage.setItem(CORRUPT_KEY,raw)}catch(ignore){}
      base.recovery={error:String(error),raw};return base;
    }
  }

  function persist(){
    if(simulationMode||state.recovery)return;try{localStorage.setItem(APP_KEY,JSON.stringify({schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,meta:state.meta,run:state.run}))}catch(error){showToast('存档空间不足，请先导出档案')}
  }
  function save(immediate=false){if(simulationMode)return;if(saveTimer)clearTimeout(saveTimer);if(immediate)persist();else saveTimer=setTimeout(()=>{saveTimer=null;persist()},90)}
  function haptic(pattern=12){if(!simulationMode&&state.meta.settings.haptic&&navigator.vibrate)navigator.vibrate(pattern)}
  function showToast(text){if(simulationMode)return;state.toast=text;render();setTimeout(()=>{if(state.toast===text){state.toast=null;render()}},1600)}
  function go(view){state.view=view;state.overlay=null;if(!simulationMode)window.scrollTo(0,0);render()}
  function addTimeline(text,age=state.run.age,tags=[]){state.run.timeline.push({age,text,tags});if(state.run.timeline.length>80)state.run.timeline.shift()}
  function increment(map,key,amount=1){map[key]=(map[key]||0)+amount}

  function ruleValue(actual,rule){
    if(rule&&typeof rule==='object')return (rule.min===undefined||actual>=rule.min)&&(rule.max===undefined||actual<=rule.max);
    return actual>=Number(rule||0);
  }
  function meets(req={},run=state.run){
    if(!req)return true;const flags=run.flags||{};
    if(req.flagsAll?.some(x=>!flags[x]))return false;if(req.flagsAny?.length&&!req.flagsAny.some(x=>flags[x]))return false;if(req.flagsNone?.some(x=>flags[x]))return false;
    if(req.attributes&&Object.entries(req.attributes).some(([k,v])=>!ruleValue(run.attrs[k]||0,v)))return false;
    if(req.attributesAny&&Object.entries(req.attributesAny).length&&!Object.entries(req.attributesAny).some(([k,v])=>ruleValue(run.attrs[k]||0,v)))return false;
    if(req.hidden&&Object.entries(req.hidden).some(([k,v])=>!ruleValue(run.hidden[k]||0,v)))return false;
    if(req.desires&&Object.entries(req.desires).some(([k,v])=>!ruleValue(run.desires[k]||0,v)))return false;
    if(req.dna&&Object.entries(req.dna).some(([k,v])=>!ruleValue(run.lifeDNA[k]||0,v)))return false;
    if(req.cardsAll?.some(id=>!run.cards.includes(id)))return false;if(req.cardsAny?.length&&!req.cardsAny.some(id=>run.cards.includes(id)))return false;
    if(req.relationship&&run.relationshipStatus!==req.relationship)return false;if(req.career&&run.career!==req.career)return false;if(req.education&&run.education!==req.education)return false;
    if(req.children!==undefined&&!ruleValue(run.children,req.children))return false;return true;
  }

  function eventEligible(event){
    const run=state.run;if(run.age<event.ageMin||(!event.chainId&&run.age>event.ageMax))return false;if(event.gender?.length&&!event.gender.includes(run.gender))return false;
    if(event.locations?.length&&!event.locations.includes(run.birth.location.id))return false;if(event.familyArchetypes?.length&&!event.familyArchetypes.includes(run.birth.family.archetype.id))return false;
    if(event.familyClasses?.length&&!event.familyClasses.includes(run.lifeDNA.familyClass))return false;if(!meets(event.requirements,run))return false;
    if((run.eventCounts[event.id]||0)>=(event.maxPerLife||1))return false;if(event.exclusiveGroup&&run.exclusiveUsed[event.exclusiveGroup])return false;
    if((run.cooldowns[event.id]||0)>run.eventCount)return false;
    if(event.chainId){const progress=run.chainProgress[event.chainId];if(!progress||progress.status!=='active'||progress.step!==(event.chainStep||0))return false}
    return event.choices?.some(choice=>meets(choice.requirements,run));
  }

  function desireThemeFactor(event){
    const map={career:['achievement','stability'],relationship:['love','security'],family:['familyBelonging','care'],care:['care','familyBelonging'],money:['wealth','security'],house:['security','stability'],digital:['exploration','recognition'],identity:['freedom','peace'],health:['peace','body'],adult_gray:['body','love'],gender:['freedom','recognition'],city:['exploration','freedom'],education:['achievement','recognition'],elder:['peace','security']};
    const keys=event.themes?.flatMap(theme=>map[theme]||[])||[];if(!keys.length)return 1;const average=keys.reduce((n,k)=>n+(state.run.desires[k]||50),0)/keys.length;return .75+average/125;
  }

  function eventWeight(event){
    const run=state.run;let weight=event.weight||10;
    if(event.genderAffinity)weight*=event.genderAffinity===run.gender?1.5:.86;
    if(event.familyArchetypes?.includes(run.birth.family.archetype.id))weight*=1.7;
    if(event.mainConflicts?.some(id=>run.mainConflicts.includes(id)))weight*=2.05;
    weight*=desireThemeFactor(event);
    for(const tag of run.world.tags)if(event.worldTagMods?.[tag.id])weight*=event.worldTagMods[tag.id];
    const seen=state.meta.seenContent.events[event.id]||0;weight*=seen===0?2.5:seen===1?.5:.15;
    const previous=state.meta.recentLives[0];if(!event.chainId&&previous?.events?.includes(event.id))return 0;
    const recent=run.themeHistory.slice(-2);if(recent.length===2&&event.themes?.some(t=>recent.every(x=>x===t)))weight*=.12;else if(event.themes?.some(t=>recent.includes(t)))weight*=.55;
    const category=event.category||'stage';const total=Math.max(1,run.eventCount);const actual=(run.categoryCounts[category]||0)/total;const target=categoryTargets[category]??.25;weight*=clamp(1+(target-actual)*2.4,.45,2.2);
    if(event.chainId){const progress=run.chainProgress[event.chainId];const node=INDEX.chain.get(event.chainId)?.nodes[progress?.step||0];weight*=run.age>(node?.ageMax||run.age)?8:3.4}
    if(run.needsBalance==='good'&&event.category==='familyEcho')weight*=2.4;if(run.needsBalance==='bad'&&event.category==='blackSwan')weight*=.08;
    return Math.max(0,weight);
  }

  function materializeEvent(event){
    const variant=event.variants?.[state.run.gender]||{};const choices=event.choices.map((choice,i)=>({...choice,...(variant.choices?.[i]||{})}));return {...event,...variant,choices};
  }

  function fallbackEvent(kind='neutral'){
    const positive=kind==='good';const complication=kind==='bad';
    return {id:`fallback_${kind}_${state.run.eventCount}`,title:positive?'有人替你接住了一次':complication?'好运开始要求维护':'没有发生大事的一段时间',icon:positive?'🫶':complication?'◌':'🌤️',stage:[stageForAge(state.run.age)],ageMin:state.run.age,ageMax:state.run.age,gender:['male','female'],requirements:{},weight:1,category:'familyEcho',themes:['identity'],mainConflicts:[],cooldown:0,maxPerLife:1,text:positive?'连续的坏消息之后，一项具体帮助终于到达。':complication?'一段顺利没有消失，只是开始要求时间、责任和维护。':'生活没有成为新闻，却仍在缓慢改变你。',choices:[
      {text:positive?'接受帮助':'维持现在的节奏',resultText:positive?'你没有把求助解释成失败。':'这段时间没有成为故事，但成为了生活。',requirements:{},effects:{resources:{spirit:positive?10:4,health:positive?5:2,relation:3},desires:{peace:5}}},
      {text:'联系一个很久没见的人',resultText:'你们都改变了，但还认得彼此。',requirements:{},effects:{resources:{relation:7,spirit:4},relationships:[{id:'old_friend',delta:8}]}},
      {text:'整理财务和身体',resultText:'没有奇迹发生，风险少了一点。',requirements:{},effects:{resources:{cash:-1200,health:6},hidden:{risk:-2,healthHabit:5}}}
    ]};
  }

  function dueCardDraw(){
    const run=state.run;const adversity=run.badStreak>=3&&run.adversityDraws<2&&chance(.48);if(adversity)return {kind:'adversity',age:run.age};
    const age=stageDrawAges.find(value=>run.age>=value&&!run.stageDrawn.includes(value));return age===undefined?null:{kind:'stage',age};
  }

  function cardOptions(kind){
    const pool=[...DATA.cards[kind]];const previous=state.meta.recentLives[0]?.cards||[];const result=[];
    while(result.length<3&&pool.length){
      const choice=weightedPick(pool,card=>{const seen=state.meta.seenContent.cards[card.id]||0;let weight=seen===0?3:seen===1?.7:.25;if(previous.includes(card.id))weight*=.15;if(card.condition?.locations&&!card.condition.locations.includes(state.run.birth.location.id))weight*=.1;return weight});
      result.push(choice);pool.splice(pool.indexOf(choice),1);
    }
    return result;
  }

  function startCardDraw(kind,age=state.run.age){state.run.phase='card';state.run.drawKind=kind;state.run.drawAt=age;state.run.drawOptions=cardOptions(kind);state.view='card';save();render()}

  function selectEvent(){
    const run=state.run;if(run.phase==='ended')return;
    if(shouldEndLife())return finishRun();
    const secret=run.birth.family.secret;if(secret.age<=run.age&&!run.flags[`secret_${secret.id}`]){
      run.flags[`secret_${secret.id}`]=true;run.currentEvent={id:`reveal_${secret.id}`,title:'家庭秘密结算',icon:'🔒',stage:[stageForAge(run.age)],ageMin:run.age,ageMax:run.age,category:'familyEcho',themes:['family'],mainConflicts:['care_self'],maxPerLife:1,text:secret.text,choices:[{text:'面对已经发生的事',resultText:'秘密不是答案，只是延迟发送的现实。',requirements:{},effects:secret.effects}]};run.currentResult=null;save();render();return;
    }
    const due=run.pending.find(item=>item.age<=run.age);if(due){run.pending=run.pending.filter(x=>x!==due);run.currentEvent=due.event;run.currentResult=null;save();render();return}
    const draw=dueCardDraw();if(draw)return startCardDraw(draw.kind,draw.age);
    const activeChainNodes=run.activeChains.map(id=>{const progress=run.chainProgress[id];return progress?.status==='active'?INDEX.chain.get(id)?.nodes[progress.step]:null}).filter(Boolean).map(node=>({...node,chainId:node.chainId||run.activeChains.find(id=>INDEX.chain.get(id)?.nodes.includes(node))}));
    if(run.forceChainResolution){
      const forced=activeChainNodes.filter(event=>run.age>=event.ageMin&&eventEligible(event)).sort((a,b)=>(b.chainStep||0)-(a.chainStep||0))[0];
      if(forced){run.currentEvent=materializeEvent(forced);run.currentResult=null;run.phase='playing';if(!run.usedEvents.includes(forced.id)){run.usedEvents.push(forced.id);increment(state.meta.seenContent.events,forced.id)}save();render();return}
    }
    let candidates=[...(INDEX.byStage[stageForAge(run.age)]||[]),...activeChainNodes].filter((event,index,array)=>array.findIndex(x=>x.id===event.id)===index).filter(eventEligible);
    if(run.needsBalance==='good')candidates=[fallbackEvent('good'),...candidates];else if(run.needsBalance==='bad')candidates=[fallbackEvent('bad'),...candidates];
    if(!candidates.length)candidates=[fallbackEvent('neutral')];
    const weighted=candidates.map(event=>({event,weight:event.id.startsWith('fallback_')?(run.needsBalance?60:1):eventWeight(event)})).filter(x=>x.weight>0);
    lastCandidateWeights=weighted.sort((a,b)=>b.weight-a.weight).slice(0,30).map(x=>({id:x.event.id,title:x.event.title,weight:Number(x.weight.toFixed(2))}));
    const selected=weighted.length?weightedPick(weighted,x=>x.weight).event:fallbackEvent('neutral');run.currentEvent=materializeEvent(selected);run.currentResult=null;run.phase='playing';
    if(run.needsBalance)run.needsBalance=null;
    if(!run.usedEvents.includes(selected.id)){run.usedEvents.push(selected.id);increment(state.meta.seenContent.events,selected.id)}
    save();render();
  }

  function applyEffects(effects={}){
    const run=state.run;const deltas=[];const labels={cash:'现金',assets:'资产',debt:'负债',health:'健康',spirit:'精神',relation:'关系'};
    for(const [key,value] of Object.entries(effects.resources||{})){run.res[key]=(run.res[key]||0)+Number(value||0);if(['health','spirit','relation'].includes(key))run.res[key]=clamp(run.res[key],0,100);if(['cash','assets','debt'].includes(key))run.res[key]=clamp(run.res[key],-999999999,999999999);deltas.push({k:labels[key]||key,v:value})}
    for(const [key,value] of Object.entries(effects.attributes||{})){run.attrs[key]=clamp((run.attrs[key]||1)+Number(value||0),1,10);deltas.push({k:DATA.attributes[key]?.name||key,v:value})}
    for(const [key,value] of Object.entries(effects.hidden||{})){run.hidden[key]=clamp((run.hidden[key]||0)+Number(value||0),-100,100);deltas.push({k:key,v:value,hidden:true})}
    for(const [key,value] of Object.entries(effects.desires||{})){run.desires[key]=clamp((run.desires[key]||50)+Number(value||0),0,100);deltas.push({k:DATA.desires[key]?.name||key,v:value,hidden:true})}
    for(const flag of effects.flagsAdd||[])run.flags[flag]=true;for(const flag of effects.flagsRemove||[])delete run.flags[flag];
    for(const relation of effects.relationships||[]){let person=run.relationships.find(x=>x.id===relation.id);if(!person){person={id:relation.id,name:relation.id==='old_friend'?'多年旧友':'人生中的一个人',closeness:0};run.relationships.push(person)}person.closeness=clamp(person.closeness+(relation.delta||0),-100,100)}
    if(effects.career)run.career=effects.career;if(effects.education)run.education=effects.education;if(effects.relationshipStatus)run.relationshipStatus=effects.relationshipStatus;if(effects.children!==undefined)run.children=Math.max(0,run.children+effects.children);
    for(const cardId of effects.cardsAdd||[])if(INDEX.cards.has(cardId)&&!run.cards.includes(cardId))run.cards.push(cardId);
    for(const scheduled of effects.schedule||[])run.pending.push({age:run.age+(scheduled.delay||1),event:scheduled.event});return deltas;
  }

  function chooseCard(id){
    const run=state.run;if(inputLocked)return;const card=run.drawOptions?.find(x=>x.id===id);if(!card)return;inputLocked=true;
    run.cards.push(card.id);increment(state.meta.seenContent.cards,card.id);applyEffects(card.effects);addTimeline(`获得《${card.title}》。`,run.age,['card',card.mechanic]);run.endingEvidence.push({age:run.age,title:`获得《${card.title}》`,result:card.text,tags:['card',card.mechanic],weight:2});
    if(run.drawKind==='stage')run.stageDrawn.push(run.drawAt);if(run.drawKind==='adversity'){run.adversityDraws++;run.badStreak=0}
    run.phase='playing';run.drawOptions=null;run.drawKind=null;state.view='game';haptic([20,35,20]);save();inputLocked=false;selectEvent();
  }

  function chooseEvent(index){
    const run=state.run;if(inputLocked||run.currentResult)return;const event=run.currentEvent;const choice=event?.choices?.[index];if(!choice)return;if(!meets(choice.requirements,run)){showToast('当前条件不足');return}
    inputLocked=true;const deltas=applyEffects(choice.effects||{});increment(run.eventCounts,event.id);if(event.exclusiveGroup)run.exclusiveUsed[event.exclusiveGroup]=true;if(event.cooldown)run.cooldowns[event.id]=run.eventCount+event.cooldown;
    const category=event.category||'stage';increment(run.categoryCounts,category);run.eventCount++;run.themeHistory.push(event.themes?.[0]||'ordinary');run.themeHistory=run.themeHistory.slice(-6);
    const positives=deltas.filter(x=>!x.hidden&&x.v>0).length,negatives=deltas.filter(x=>!x.hidden&&x.v<0).length;const tone=negatives>positives?'bad':positives>negatives?'good':'mixed';
    run.toneStreak.good=tone==='good'?run.toneStreak.good+1:0;run.toneStreak.bad=tone==='bad'?run.toneStreak.bad+1:0;run.badStreak=run.toneStreak.bad;
    if(run.toneStreak.bad>=4)run.needsBalance='good';if(run.toneStreak.good>=4)run.needsBalance='bad';
    if(event.chainId){const progress=run.chainProgress[event.chainId];if(progress){progress.step++;const chain=INDEX.chain.get(event.chainId);if(progress.step>=chain.nodes.length){progress.status='completed';increment(state.meta.seenContent.chains,event.chainId);addTimeline(`完成事件链《${chain.title}》。`,run.age,['chain'])}}}
    if(Object.values(run.chainProgress).filter(x=>x.status==='completed').length>=2)run.forceChainResolution=false;
    for(const theme of event.themes||[]){const codex=DATA.codex[Math.abs(hashSeed(theme))%DATA.codex.length];if(codex&&!state.meta.codex.includes(codex.id))state.meta.codex.push(codex.id)}
    const result=choice.resultText||'事情继续向前。';run.currentResult={text:result,deltas};addTimeline(`${event.title}：${result}`,run.age,event.endingTags||event.themes||[]);
    run.endingEvidence.push({age:run.age,title:event.title,result,tags:event.endingTags||event.themes||[],weight:event.chainId?5:event.mainConflicts?.some(id=>run.mainConflicts.includes(id))?4:2});
    haptic(10);save();inputLocked=false;render();
  }

  function driftDesires(){
    const run=state.run;const stage=stageForAge(run.age);const shifts={infancy:{security:1,familyBelonging:1},childhood:{recognition:1,exploration:1},adolescence:{freedom:2,recognition:1,body:1},youth:{achievement:1,love:1,exploration:1},adult:{stability:1,security:1,care:1},midlife:{peace:2,health:1,recognition:-1},preRetire:{peace:2,status:-1,care:1},elder:{peace:2,exploration:1,status:-2}}[stage]||{};
    for(const [key,value] of Object.entries(shifts))if(run.desires[key]!==undefined)run.desires[key]=clamp(run.desires[key]+value,0,100);
    if(run.hidden.stress>55)run.desires.peace=clamp(run.desires.peace+2,0,100);if(run.relationshipStatus==='单身'&&run.age>35)run.desires.love=clamp(run.desires.love+(chance(.5)?1:-1),0,100);
  }

  function continueAfterResult(){
    const run=state.run;if(!run.currentResult)return;run.currentEvent=null;run.currentResult=null;
    const stage=stageForAge(run.age);const step=stage==='infancy'||stage==='childhood'||stage==='adolescence'?1:stage==='youth'?1+Math.floor(rng()*2):stage==='adult'||stage==='midlife'?2+Math.floor(rng()*2):stage==='preRetire'?2+Math.floor(rng()*2):3+Math.floor(rng()*2);
    run.age+=step;
    const employed=run.career!=='尚未进入社会';const income=employed?(run.flags.manager?52000:run.flags.public_job?32000:run.flags.business?chance(.58)?48000:-18000:26000):run.age<20?0:14000;
    const locationCost={tier1:22000,tier2:14500,county:8500,town:6200}[run.birth.location.id];const careCost=run.children*5000+Math.max(0,run.hidden.careBurden)*120;
    run.res.cash=clamp(run.res.cash+income-locationCost-careCost,-999999999,999999999);if(run.res.cash<0){run.res.debt=clamp(run.res.debt+Math.abs(run.res.cash),0,999999999);run.res.cash=0;run.hidden.risk=clamp(run.hidden.risk+2,-100,100);run.res.spirit=clamp(run.res.spirit-4,0,100)}
    const ageWear=run.age>70?4:run.age>55?2:run.age>35?1:0;const habit=Math.max(-1,(run.hidden.healthHabit-35)/35);run.res.health=clamp(run.res.health-ageWear+habit,0,100);run.hidden.stress=clamp(run.hidden.stress+(employed?1:0)-(run.desires.peace>70?1:0),0,100);if(run.hidden.stress>60)run.res.spirit=clamp(run.res.spirit-2,0,100);
    for(const key of Object.keys(run.cooldowns))if(run.cooldowns[key]<=run.eventCount)delete run.cooldowns[key];driftDesires();save();selectEvent();
  }

  function annualMortalityRisk(run){
    const age=run.age;let base=age<40?.00015:age<55?.0015:age<65?.005:age<75?.016:age<85?.045:age<95?.11:age<103?.22:.42;
    const healthFactor=clamp((105-run.res.health)/55,.55,2.3);const stressFactor=1+Math.max(0,run.hidden.stress-50)/90;const careFactor=run.relationships.some(x=>x.closeness>45)||run.res.relation>68?.82:1.08;return clamp(base*healthFactor*stressFactor*careFactor,0,.72);
  }
  function shouldEndLife(){
    const run=state.run;if(run.res.health<=0||run.age>=108)return true;if(run.age<18)return false;const risk=annualMortalityRisk(run);const fatal=chance(1-Math.pow(1-risk,Math.max(1,run.age>65?3:1)));
    if(fatal&&Object.values(run.chainProgress).filter(x=>x.status==='completed').length<2){run.forceChainResolution=true;return false}return fatal;
  }

  function endingFacts(run){
    const evidence=[...run.endingEvidence].sort((a,b)=>b.weight-a.weight);const chosen=[];const ages=new Set();
    for(const item of evidence){const bucket=Math.floor(item.age/15);if(!ages.has(bucket)||chosen.length<2){chosen.push(item);ages.add(bucket)}if(chosen.length===3)break}
    while(chosen.length<3)chosen.push({age:chosen.length?run.age:0,title:chosen.length?'你继续生活':'你的出发点',result:chosen.length?`你在${stageName(stageForAge(run.age))}仍保留选择。`:`你出生在${run.birth.location.name}的${run.birth.family.archetype.name}。`,tags:['life'],weight:1});
    return chosen;
  }

  function chooseEndingTitle(run){
    const tags=new Set(run.endingEvidence.flatMap(x=>x.tags||[]));const previous=state.meta.recentLives[0]?.ending;
    return weightedPick(DATA.endingTitles,title=>{let weight=title.weight||10;if(title.themes?.some(t=>tags.has(t)))weight*=2.2;const seen=state.meta.seenContent.endings[title.id]||0;weight*=seen===0?2.5:seen===1?.55:.18;if(previous===title.id)weight*=.1;return weight});
  }

  function finishRun(){
    const run=state.run;if(run.phase==='ended')return;run.phase='ended';const net=run.res.assets+run.res.cash-run.res.debt;const facts=endingFacts(run);const title=chooseEndingTitle(run);
    const familyIndex=DATA.familyArchetypes.findIndex(x=>x.id===run.birth.family.archetype.id);const conflictIndex=DATA.mainConflicts.findIndex(x=>x.id===run.mainConflicts[0]);
    const f=DATA.endingFragments;const review=[f.origins[Math.abs(familyIndex)%f.origins.length],f.conflicts[Math.abs(conflictIndex)%f.conflicts.length],f.turns[stableNumber(run.seed,'ending-turn',f.turns.length)],f.gains[stableNumber(run.seed,'ending-gain',f.gains.length)],f.losses[stableNumber(run.seed,'ending-loss',f.losses.length)],f.judgments[Number(title.id.split('_')[1])%f.judgments.length]].join('');
    const score=Math.round(clamp(net/45000+run.res.health*.2+run.res.spirit*.2+run.res.relation*.18+run.hidden.selfEsteem*.08-run.hidden.stress*.08,0,100));
    const completedChains=Object.entries(run.chainProgress).filter(([,p])=>p.status==='completed').map(([id])=>id);const mainConflict=INDEX.conflict.get(run.mainConflicts[0]);
    const gained=[run.relationships.some(x=>x.closeness>40)?'仍能联系的关系':null,run.res.assets>run.res.debt?'可使用的资产':null,run.hidden.healthHabit>35?'与身体合作的习惯':null,run.desires.freedom>65?'为自己做决定的能力':null].filter(Boolean).slice(0,3);
    const lost=[run.res.health<55?'一部分健康':null,run.res.debt>run.res.cash?'长期现金流':null,run.res.relation<45?'部分重要关系':null,run.hidden.stress>60?'大量安静时间':null].filter(Boolean).slice(0,3);
    run.ending={id:title.id,title:title.title,age:run.age,score,net,review,facts,gained:gained.length?gained:['一些没有被记录的可能'],lost:lost.length?lost:['部分原本可以属于你的时间'],mainConflict:mainConflict?.name||'生活与自我之间的长期谈判',completedChains};
    increment(state.meta.seenContent.endings,title.id);increment(state.meta.seenContent.families,run.birth.family.archetype.id);for(const id of run.mainConflicts)increment(state.meta.seenContent.mainlines,id);
    const history={seed:run.seed,age:run.age,gender:run.gender,family:run.birth.family.archetype.name,title:title.title,score,net,location:run.birth.location.name,date:new Date().toISOString(),facts:facts.map(x=>x.title)};
    state.meta.histories.unshift(history);state.meta.histories=state.meta.histories.slice(0,30);state.meta.stats.runs++;state.meta.stats.best=Math.max(state.meta.stats.best,score);if(run.res.health<=0)state.meta.stats.deaths++;
    state.meta.recentLives.unshift({seed:run.seed,events:[...run.usedEvents],cards:[...run.cards],chains:[...completedChains],family:run.birth.family.archetype.id,mainlines:[...run.mainConflicts],ending:title.id});state.meta.recentLives=state.meta.recentLives.slice(0,5);
    save(true);go('ending');
  }

  function roleLine(){
    const run=state.run;if(run.age<7)return '家庭系统新用户';if(run.age<13)return '义务教育参与者';if(run.age<19)return '教育分流候选人';if(run.age<25&&run.education!=='尚未分流')return run.education;
    if(run.flags.public_job)return '公共岗位从业者';if(run.flags.manager)return '组织协调责任人';if(run.flags.business)return '自雇经营者';if(run.age>=60&&run.flags.retired)return '退休居民';return run.career;
  }

  function render(){
    if(simulationMode)return;let html='';
    if(state.recovery)html=recoveryView();else if(state.view==='home')html=homeView();else if(state.view==='birth')html=birthView();else if(state.view==='attributes')html=attributesView();else if(state.view==='card')html=cardView();else if(state.view==='game')html=gameView();else if(state.view==='ending')html=endingView();else if(state.view==='archive')html=archiveView();else if(state.view==='codex')html=codexView();else if(state.view==='settings')html=settingsView();
    app.innerHTML=html+(state.overlay?overlayView():'')+(state.toast?`<div class="toast">${esc(state.toast)}</div>`:'');bind();
  }

  function homeView(){
    const cont=state.run&&state.run.phase!=='ended';return `<main class="screen center"><div class="version">v${VERSION}</div><div class="eyebrow">🎲 2026 · 中国人生模拟</div><h1>人生尚未加载</h1><p class="hero-sub">出生无法选择。加点可以。世界不保证公平，只保证继续运行。</p><div class="mt stack"><button class="btn primary" data-act="new">🎲 开始新人生</button>${cont?`<button class="btn" data-act="continue">继续：${state.run.age}岁 · ${esc(state.run.birth.location.name)}</button>`:''}</div><div class="menu-list"><button class="menu-item" data-nav="archive"><strong>🗂️ 人生档案</strong><span class="chev">›</span></button><button class="menu-item" data-nav="codex"><strong>📖 社会图鉴</strong><span class="muted">${state.meta.codex.length}/${DATA.codex.length}</span></button><button class="menu-item" data-nav="settings"><strong>⚙️ 设置</strong><span class="chev">›</span></button></div>${DEBUG?debugPanel():''}<div class="mt tiny">离线运行 · 无音乐 · 无广告 · 无账号 · 自动存档</div></main>`;
  }

  function birthView(){
    const run=state.run,b=run.birth,dna=run.lifeDNA;return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">👶 投胎结果</div><span class="pill">${esc(run.seed)}</span></div><div class="eyebrow">📍 你出生了</div><div class="birth-place">${esc(b.location.name)} · ${genderName(run.gender)}</div><p class="mt-sm">${esc(b.location.note)}</p><section class="card hero mt"><div class="row start"><div><div class="eyebrow">家庭原型</div><h2 style="margin-top:8px">${esc(b.family.archetype.name)}</h2></div><span class="pill">${esc(b.family.familyClass)}</span></div><p>${esc(b.family.archetype.note)}</p><dl class="spec-list"><div class="spec"><dt>家庭角色</dt><dd>${esc(dna.familyRole)}</dd></div><div class="spec"><dt>兄弟姐妹</dt><dd>${dna.onlyChild?'独生':`${dna.siblingCount}人`}</dd></div><div class="spec"><dt>父亲</dt><dd>${esc(b.family.father)}</dd></div><div class="spec"><dt>母亲</dt><dd>${esc(b.family.mother)}</dd></div><div class="spec"><dt>住房</dt><dd>${esc(b.family.house)}</dd></div></dl></section><section class="card soft mt-sm"><div class="eyebrow">🌍 本局时代环境</div><div class="taglist left">${run.world.tags.map(t=>`<span class="pill">${esc(t.name)}</span>`).join('')}</div></section><div class="bottom-actions"><button class="btn primary" data-act="toAttrs">🎛️ 分配你的天赋</button></div></main>`;
  }

  function attributesView(){
    const run=state.run;return `<main class="screen attributes-screen"><div class="topbar"><button class="iconbtn" data-nav="birth">‹</button><div class="title">🎛️ 出生加点</div><span></span></div><div class="remain row"><div><div class="eyebrow">可分配点数</div><div class="big-number">${run.points}</div></div><span class="pill">每项上限 8</span></div><section class="card">${Object.entries(DATA.attributes).map(([key,a])=>`<div class="attr-row"><div><div class="attr-name"><span class="attr-emoji">${a.icon}</span><span>${esc(a.name)}</span></div><div class="attr-desc">${esc(a.desc)}</div></div><div class="stepper"><button data-step="${key}" data-delta="-1">−</button><b>${run.attrs[key]}</b><button data-step="${key}" data-delta="1">＋</button></div></div>`).join('')}</section><div class="mt tiny">高属性也会制造代价。高野心更容易跃迁，也更容易把运气误认成能力。</div><div class="bottom-actions attributes-actions"><button class="btn ghost" data-act="randomAttrs">🎲 随机分配</button><button class="btn primary" data-act="confirmAttrs" ${run.points?'disabled':''}>确认出生</button></div></main>`;
  }

  function cardView(){
    const run=state.run;const title=run.drawKind==='innate'?'选择一张先天牌':run.drawKind==='adversity'?'逆境留下了一个出口':`${run.drawAt}岁 · 选择一张人生牌`;
    return `<main class="screen"><div class="topbar"><span></span><div class="title">🃏 ${esc(title)}</div><span></span></div><p>卡牌改变条件、人物和后续事件，不只修改数值。</p><div class="stack mt">${run.drawOptions.map((card,i)=>`<button class="card fate-card" style="animation-delay:${i*.06}s;text-align:left" data-card="${card.id}"><div><div class="fate-type">${card.icon} ${esc(card.type)}</div><div class="fate-title">《${esc(card.title)}》</div><div class="fate-text">${esc(card.text)}</div></div><div class="row mt-sm"><span class="tiny">${esc(card.mechanic)}</span><span class="chev">›</span></div></button>`).join('')}</div></main>`;
  }

  function deltaHtml(deltas){const visible=deltas.filter(x=>!x.hidden);return visible.length?`<div class="delta-list">${visible.map(d=>`<span class="delta ${d.v>=0?'pos':'neg'}">${esc(d.k)} ${d.v>=0?'+':''}${d.v}</span>`).join('')}</div>`:''}
  function gameView(){
    const run=state.run,event=run.currentEvent;if(!event){setTimeout(selectEvent,0);return '<main class="loading-screen"><div><div class="loading-mark">◌</div><p>正在寻找下一段人生……</p></div></main>'}
    return `<main class="screen"><header class="game-header"><div class="row"><div class="grow"><div class="age">${run.age}岁</div><div class="role">${esc(run.birth.location.name)} · ${esc(roleLine())}</div></div><button class="iconbtn" data-act="status">☰</button></div><div class="resource-strip"><div class="res"><span>现金</span><b>${money(run.res.cash)}</b></div><div class="res"><span>健康</span><b>${Math.round(run.res.health)}</b></div><div class="res"><span>精神</span><b>${Math.round(run.res.spirit)}</b></div><div class="res"><span>关系</span><b>${Math.round(run.res.relation)}</b></div></div></header><div class="conflict-line">主线：${esc(INDEX.conflict.get(run.mainConflicts[0])?.name||'仍在形成')}</div><section class="card event-card ${run.currentResult?'result-card':''}">${run.currentResult?`<div><div class="eyebrow">选择已生效</div><div class="event-title">${esc(event.title)}</div><div class="result-text">${esc(run.currentResult.text)}</div>${deltaHtml(run.currentResult.deltas)}</div><div class="event-foot"><span>已经写入时间线</span><span>${stageName(stageForAge(run.age))}</span></div>`:`<div><div class="event-icon">${event.icon}</div><div class="event-title">${esc(event.title)}</div><div class="event-body">${esc(event.text)}</div></div><div class="event-foot"><span>${stageName(stageForAge(run.age))}</span><span>${event.chainId?'人生主线':'人生事件'}</span></div>`}</section>${run.currentResult?`<div class="choices"><button class="btn primary" data-act="afterResult">继续</button></div>`:`<div class="choices">${event.choices.map((choice,i)=>{const locked=!meets(choice.requirements,run);return `<button class="choice ${locked?'locked':''}" data-choice="${i}" ${locked?'disabled':''}>${esc(choice.text)}${locked?'<small>条件不足</small>':''}</button>`}).join('')}</div>`}</main>`;
  }

  function endingView(){
    const run=state.run,e=run.ending;return `<main class="screen"><div class="eyebrow ending-kicker">本次人生服务已结束</div><div class="lifespan">你活了 <b>${e.age}</b> 岁</div><div class="score-ring" style="--score:${e.score}"><div><b>${e.score}</b><span>人生综合值</span></div></div><div class="ending-title">《${esc(e.title)}》</div><p class="ending-review">${esc(e.review)}</p><section class="card mt"><div class="section-title first">一生最核心的矛盾</div><p>${esc(e.mainConflict)}</p><div class="stat-grid mt-sm"><div class="stat-box"><span>最终净值</span><b>${money(e.net)}</b></div><div class="stat-box"><span>完成主线</span><b>${e.completedChains.length}</b></div><div class="stat-box"><span>健康</span><b>${Math.round(run.res.health)}</b></div><div class="stat-box"><span>关系</span><b>${Math.round(run.res.relation)}</b></div></div></section><div class="two-col mt"><section class="card soft"><div class="section-title first">得到的东西</div>${e.gained.map(x=>`<p class="fact">＋ ${esc(x)}</p>`).join('')}</section><section class="card soft"><div class="section-title first">失去的东西</div>${e.lost.map(x=>`<p class="fact">－ ${esc(x)}</p>`).join('')}</section></div><div class="section-title">系统引用的真实经历</div><section class="card timeline">${e.facts.map(x=>`<div class="time-item"><span class="time-age">${x.age}岁</span><div><strong>${esc(x.title)}</strong><p class="tiny">${esc(x.result)}</p></div></div>`).join('')}</section><div class="mt stack"><button class="btn primary" data-act="new">再投一次</button><button class="btn ghost" data-nav="archive">查看人生档案</button></div></main>`;
  }

  function archiveView(){const histories=state.meta.histories;return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">🗂️ 人生档案</div><span class="pill">${histories.length}次</span></div><section class="card"><div class="stat-grid"><div class="stat-box"><span>完成次数</span><b>${state.meta.stats.runs}</b></div><div class="stat-box"><span>最高综合值</span><b>${state.meta.stats.best}</b></div></div></section><div class="section-title">最近的人生</div><section class="card">${histories.length?histories.map(h=>`<div class="archive-item"><div class="row"><div><div class="archive-title">《${esc(h.title)}》</div><div class="archive-meta">${esc(h.gender==='female'?'女性':'男性')} · ${esc(h.family||h.location)} · ${h.age}岁 · ${money(h.net)}</div></div><span class="pill">${h.score}</span></div></div>`).join(''):'<p>还没有完成的人生。</p>'}</section></main>`}
  function codexView(){return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">📖 社会图鉴</div><span class="pill">${state.meta.codex.length}/${DATA.codex.length}</span></div><p>你遇见过的结构，会从现实退到词条里。</p><section class="card mt">${DATA.codex.map(item=>`<div class="codex-item"><h3>${esc(item.name)}</h3><p>${esc(item.text)}</p></div>`).join('')}</section></main>`}
  function settingsView(){return `<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">⚙️ 设置</div><span></span></div><section class="card"><button class="menu-item" data-act="toggleHaptic"><strong>轻触反馈</strong><span class="switch ${state.meta.settings.haptic?'on':''}"><i></i></span></button><button class="menu-item" data-act="export"><strong>导出存档</strong><span class="chev">›</span></button><button class="menu-item" data-act="reset"><strong class="danger-text">清除全部数据</strong><span class="chev">›</span></button></section><div class="mt tiny">数据仅保存在当前浏览器。首次迁移 v2 时会保留一份原始备份。</div></main>`}

  function overlayView(){
    if(state.overlay!=='status')return '';const run=state.run;const topDesires=Object.entries(run.desires).sort((a,b)=>b[1]-a[1]).slice(0,4);
    return `<div class="drawer-wrap" data-act="closeOverlay"><div class="drawer" onclick="event.stopPropagation()"><div class="handle"></div><div class="row"><div><div class="eyebrow">${run.age}岁 · ${genderName(run.gender)}</div><h2>${esc(run.birth.family.archetype.name)}</h2></div><button class="iconbtn" data-act="closeOverlay">×</button></div><div class="section-title">核心矛盾</div><div class="stack">${run.mainConflicts.map(id=>`<div class="card soft"><strong>${esc(INDEX.conflict.get(id)?.name)}</strong></div>`).join('')}</div><div class="section-title">当前最强欲望</div><div class="desire-grid">${topDesires.map(([id,value])=>`<div class="stat-box"><span>${esc(DATA.desires[id].name)}</span><b>${Math.round(value)}</b></div>`).join('')}</div><div class="section-title">资产负债</div><div class="stat-grid"><div class="stat-box"><span>现金</span><b>${money(run.res.cash)}</b></div><div class="stat-box"><span>资产</span><b>${money(run.res.assets)}</b></div><div class="stat-box"><span>负债</span><b>${money(run.res.debt)}</b></div><div class="stat-box"><span>净值</span><b>${money(run.res.assets+run.res.cash-run.res.debt)}</b></div></div><div class="section-title">持有卡牌</div><div class="taglist left">${run.cards.map(id=>`<span class="pill">${esc(INDEX.cards.get(id)?.title||id)}</span>`).join('')||'<span class="tiny">尚未获得卡牌</span>'}</div><button class="btn ghost mt" data-nav="home">暂停并返回首页</button></div></div>`;
  }

  function recoveryView(){return `<main class="screen center"><div class="eyebrow">存档恢复</div><h1>旧存档没有安全加载</h1><p>页面已停止继续写入，原始内容已保留。你可以先导出，再清除损坏存档并重新开始。</p><section class="card mt"><p class="tiny">${esc(state.recovery.error)}</p></section><div class="stack mt"><button class="btn primary" data-act="exportCorrupt">导出损坏存档</button><button class="btn danger" data-act="clearCorrupt">清除并重新开始</button><button class="btn ghost" data-act="retryLoad">重新尝试加载</button></div></main>`}
  function debugPanel(){return `<section class="debug-panel mt"><div class="eyebrow">DEBUG ONLY</div><div class="row mt-sm"><span>事件 ${DATA.events.length} · 链节点 ${DATA.eventChains.reduce((n,c)=>n+c.nodes.length,0)}</span><button class="btn small" data-act="debugFive">模拟5局</button></div><pre id="debug-output">使用 window.__LIFE_DEBUG__ 查看隐藏状态和候选权重。</pre></section>`}

  function stepAttr(key,delta){const run=state.run;if(delta>0&&run.points>0&&run.attrs[key]<8){run.attrs[key]++;run.points--}else if(delta<0&&run.attrs[key]>1){run.attrs[key]--;run.points++}haptic(6);save();render()}
  function randomAttrs(){const run=state.run;for(const key of Object.keys(run.attrs))run.attrs[key]=1;run.points=20;while(run.points>0){const keys=Object.keys(run.attrs).filter(key=>run.attrs[key]<8);run.attrs[pick(keys)]++;run.points--}run.desires=defaultDesires(run.seed,run.lifeDNA,run.attrs);save();render()}
  function beginNewRun(){if(state.run&&state.run.phase!=='ended'&&!confirm('当前人生尚未结束。确定重新投胎？'))return;createRun();state.view='birth';save(true);render()}

  function exportText(text,name){const blob=new Blob([text],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();URL.revokeObjectURL(url)}
  function action(name){
    if(name==='new')beginNewRun();else if(name==='continue'){const run=state.run;if(run.phase==='birth')go('birth');else if(run.phase==='attributes')go('attributes');else if(run.phase==='card')go('card');else{go('game');if(!run.currentEvent)selectEvent()}}
    else if(name==='toAttrs'){state.run.phase='attributes';go('attributes');save()}
    else if(name==='randomAttrs')randomAttrs();else if(name==='confirmAttrs'){if(state.run.points)return;state.run.phase='card';state.run.drawKind='innate';state.run.drawAt=0;state.run.drawOptions=cardOptions('innate');go('card');save()}
    else if(name==='status'){state.overlay='status';render()}else if(name==='closeOverlay'){state.overlay=null;render()}else if(name==='afterResult')continueAfterResult();
    else if(name==='toggleHaptic'){state.meta.settings.haptic=!state.meta.settings.haptic;save();haptic(20);render()}
    else if(name==='export')exportText(JSON.stringify({schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,meta:state.meta,run:state.run},null,2),'人生尚未加载-v3-存档.json');
    else if(name==='reset'){if(confirm('清除全部人生档案、图鉴与存档？此操作不可撤销。')){localStorage.removeItem(APP_KEY);state={view:'home',meta:defaultMeta(),run:null,overlay:null,toast:null,recovery:null};render()}}
    else if(name==='exportCorrupt')exportText(state.recovery.raw||'','人生尚未加载-损坏存档.json');else if(name==='clearCorrupt'){if(confirm('确认清除当前损坏存档？已保存的 v2 备份不会删除。')){localStorage.removeItem(APP_KEY);state={view:'home',meta:defaultMeta(),run:null,overlay:null,toast:null,recovery:null};render()}}
    else if(name==='retryLoad'){state=loadState();render()}else if(name==='debugFive'){const report=simulateLives(5);const output=document.getElementById('debug-output');if(output)output.textContent=JSON.stringify(report,null,2)}
  }

  function bind(){
    app.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>go(el.dataset.nav));app.querySelectorAll('[data-act]').forEach(el=>el.onclick=()=>action(el.dataset.act));
    app.querySelectorAll('[data-step]').forEach(el=>el.onclick=()=>stepAttr(el.dataset.step,Number(el.dataset.delta)));app.querySelectorAll('[data-card]').forEach(el=>el.onclick=()=>chooseCard(el.dataset.card));app.querySelectorAll('[data-choice]').forEach(el=>el.onclick=()=>chooseEvent(Number(el.dataset.choice)));
  }

  function renderGameToText(){
    const run=state.run;return JSON.stringify({view:state.view,version:VERSION,run:run?{phase:run.phase,age:run.age,gender:run.gender,location:run.birth?.location?.id,family:run.birth?.family?.archetype?.id,resources:run.res,mainConflicts:run.mainConflicts,currentEvent:run.currentEvent?{id:run.currentEvent.id,title:run.currentEvent.title,choices:run.currentEvent.choices.map((choice,index)=>({index,text:choice.text,locked:!meets(choice.requirements,run)}))}:null,ending:run.ending?{title:run.ending.title,age:run.ending.age,facts:run.ending.facts.length}:null}:null});
  }
  window.render_game_to_text=renderGameToText;window.advanceTime=()=>{render();return renderGameToText()};

  function simulateLives(count=5){
    const original=state;const originalSimulation=simulationMode;simulationMode=true;const reports=[];const simMeta=defaultMeta();
    try{
      for(let i=0;i<count;i++){
        state={view:'home',meta:simMeta,run:null,overlay:null,toast:null,recovery:null};createRun(`SIM3-${String(i+1).padStart(2,'0')}-${(0xabc123+i*7919).toString(36).toUpperCase()}`,simMeta);randomAttrs();state.run.phase='card';state.run.drawKind='innate';state.run.drawAt=0;state.run.drawOptions=cardOptions('innate');chooseCard(state.run.drawOptions[0].id);
        let guard=0,lockedChoices=0,ageBackwards=false,lastAge=state.run.age;
        while(state.run.phase!=='ended'&&guard++<220){
          const run=state.run;if(run.age<lastAge)ageBackwards=true;lastAge=run.age;
          if(run.phase==='card'){chooseCard(run.drawOptions[0].id);continue}
          if(run.currentResult){continueAfterResult();continue}
          if(!run.currentEvent){selectEvent();continue}
          const available=run.currentEvent.choices.map((choice,index)=>meets(choice.requirements,run)?index:-1).filter(index=>index>=0);if(!available.length){lockedChoices++;break}chooseEvent(available[Math.floor(rng()*available.length)]);
        }
        const run=state.run;const duplicateCount=run.usedEvents.length-new Set(run.usedEvents).size;reports.push({seed:run.seed,gender:run.gender,family:run.birth.family.archetype.name,mainlines:run.mainConflicts.map(id=>INDEX.conflict.get(id)?.name),age:run.age,events:run.eventCount,cards:run.cards.length,completedChains:Object.values(run.chainProgress).filter(x=>x.status==='completed').length,chainStates:Object.fromEntries(Object.entries(run.chainProgress).map(([id,value])=>[id,{step:value.step,status:value.status}])),ending:run.ending?.title||null,endingFacts:run.ending?.facts?.length||0,guard,lockedChoices,ageBackwards,duplicates:duplicateCount,nan:Object.values(run.res).some(Number.isNaN),cashOverflow:Math.abs(run.res.cash)>999999999});
      }
      const pairs=[];for(let i=0;i<simMeta.recentLives.length;i++)for(let j=i+1;j<simMeta.recentLives.length;j++){const a=new Set(simMeta.recentLives[i].events),b=new Set(simMeta.recentLives[j].events);const intersection=[...a].filter(x=>b.has(x)).length;const union=new Set([...a,...b]).size;pairs.push(union?intersection/union:0)}
      return {runs:reports,averagePairwiseEventOverlap:pairs.length?Number((pairs.reduce((n,x)=>n+x,0)/pairs.length).toFixed(3)):0};
    }finally{state=original;simulationMode=originalSimulation;render()}
  }

  function autoFinishCurrent(){
    if(!state.run)return null;let guard=0;const previousSimulation=simulationMode;simulationMode=true;
    try{
      while(state.run.phase!=='ended'&&guard++<220){const run=state.run;if(run.phase==='card'){chooseCard(run.drawOptions[0].id);continue}if(run.currentResult){continueAfterResult();continue}if(!run.currentEvent){selectEvent();continue}const available=run.currentEvent.choices.map((choice,index)=>meets(choice.requirements,run)?index:-1).filter(index=>index>=0);if(!available.length)throw new Error(`事件 ${run.currentEvent.id} 没有可用选项`);chooseEvent(available[Math.floor(rng()*available.length)])}
      return state.run.ending;
    }finally{simulationMode=previousSimulation;render()}
  }

  try{
    app.innerHTML='<main class="loading-screen"><div><div class="loading-mark">◌</div><h2>正在加载人生数据库</h2><p>第一次见面需要多读一些命运。</p></div></main>';
    const response=await fetch(`./data.json?v=${VERSION}`,{cache:'no-store'});if(!response.ok)throw new Error(`人生数据库加载失败（HTTP ${response.status}）`);DATA=await response.json();if(DATA.schemaVersion!==SCHEMA_VERSION)throw new Error(`数据版本不兼容：需要 ${SCHEMA_VERSION}，实际 ${DATA.schemaVersion}`);
    INDEX=buildIndex();state=loadState();render();window.__LIFE_BOOTED__=true;
    if(DEBUG)window.__LIFE_DEBUG__={snapshot:()=>deepCopy(state.run),weights:()=>deepCopy(lastCandidateWeights),forceAge:age=>{if(state.run){state.run.age=clamp(Number(age),0,108);state.run.currentEvent=null;selectEvent()}},forceGender:gender=>{if(state.run&&['male','female'].includes(gender)){state.run.gender=gender;render()}},forceFamily:id=>{const family=INDEX.family.get(id);if(state.run&&family){state.run.birth.family.archetype=family;state.run.birth.family.familyClass=family.familyClass;render()}},simulateLives,autoFinishCurrent};
  }catch(error){
    console.error(error);app.innerHTML=`<main class="boot-fallback"><div><div class="boot-label">启动失败</div><h1>人生数据库没有加载成功</h1><p>${esc(error.message||error)}</p></div><div class="boot-card"><p>请确认 index.html、style.css、game.js 与 data.json 位于同一目录。</p><button class="btn primary mt" onclick="location.reload()">重新加载</button></div></main>`;
  }

  document.addEventListener('visibilitychange',()=>{if(document.hidden)save(true)});window.addEventListener('pagehide',()=>save(true));
})();
