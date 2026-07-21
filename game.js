(async()=>{
  'use strict';

  const APP_KEY='life-unloaded-2026-v1';
  const V31_BACKUP_KEY='life-unloaded-2026-v3.1-backup';
  const CORRUPT_KEY='life-unloaded-2026-corrupt-backup';
  const VERSION='3.2.2';
  const SCHEMA_VERSION=4;
  const DEBUG=new URLSearchParams(location.search).get('debug')==='1';
  const app=document.getElementById('app');
  const CARD_AGES=[18,30,50];
  const STAGE_QUOTAS={infancy:0,childhood:1,adolescence:2,youth:2,adult:3,midlife:3,preRetire:2,elder:2};
  const STAGE_NAMES={infancy:'幼年',childhood:'童年',adolescence:'青春期',youth:'青年',adult:'成家立业',midlife:'中年',preRetire:'退休前后',elder:'晚年'};
  const occupations={
    tier1:['互联网运营','医院行政','金融后台员工','物业工程师','平台司机','国企职员','软件外包工程师','自由设计师'],
    tier2:['制造业技术员','社区合同工','医院护士','银行柜员','物流调度员','民办教师','个体餐饮经营者','软件实施工程师'],
    county:['县中教师','事业单位职员','建材店经营者','保险业务员','货运司机','电商客服','乡镇卫生院护士','个体商户'],
    town:['种植户','养殖户','建筑劳务人员','农机维修工','快递站经营者','乡村教师','流动摊贩','外出务工人员']
  };

  let DATA,INDEX,state;
  let saveTimer=null,inputLocked=false,simulationMode=false;

  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):a));
  const copy=value=>JSON.parse(JSON.stringify(value));
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const hashSeed=text=>{let h=2166136261>>>0;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const stable=(seed,key,max=100)=>hashSeed(`${seed}:${key}`)%max;
  const rng=()=>{let s=state.run.rngState>>>0;s=(Math.imul(1664525,s)+1013904223)>>>0;state.run.rngState=s;return s/4294967296};
  const chance=p=>rng()<p;
  const pick=arr=>arr[Math.floor(rng()*arr.length)];
  const weightedPick=(items,weightOf=x=>x.weight??1)=>{
    if(!items.length)return null;
    const list=items.map(item=>({item,weight:Math.max(0,Number(weightOf(item))||0)}));
    const sum=list.reduce((n,x)=>n+x.weight,0);if(!sum)return items[0];let roll=rng()*sum;
    for(const entry of list){roll-=entry.weight;if(roll<=0)return entry.item}return items.at(-1);
  };
  const money=value=>{let n=Math.round(Number(value)||0),sign=n<0?'-':'';n=Math.abs(n);if(n>=1e8)return`${sign}${(n/1e8).toFixed(n>=1e9?0:1)}亿`;if(n>=1e4)return`${sign}${(n/1e4).toFixed(n>=1e5?0:1)}万`;return sign+n.toLocaleString('zh-CN')};
  const makeSeed=()=>{const b=new Uint32Array(2);crypto.getRandomValues(b);return`CN26-${b[0].toString(36).slice(-4).toUpperCase()}-${b[1].toString(36).slice(-4).toUpperCase()}`};
  const increment=(map,key,amount=1)=>map[key]=(map[key]||0)+amount;
  const contentKey=item=>`${item.id}@r${item.contentRevision||DATA.contentRevision}`;

  function defaultMeta(){return{schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,histories:[],codex:[],settings:{haptic:true,reducedMotion:false},stats:{runs:0,best:0},seenContent:{events:{},cards:{},families:{},endings:{}},recentLives:[]}}
  function normalizeMeta(meta={}){const fresh=defaultMeta(),seen=meta.seenContent||{};return{...fresh,...meta,schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,settings:{...fresh.settings,...(meta.settings||{})},stats:{...fresh.stats,...(meta.stats||{})},seenContent:{events:{...(seen.events||{})},cards:{...(seen.cards||{})},families:{...(seen.families||{})},endings:{...(seen.endings||{})}},histories:Array.isArray(meta.histories)?meta.histories.slice(0,30):[],recentLives:Array.isArray(meta.recentLives)?meta.recentLives.slice(0,5):[]}}

  function buildIndex(){
    const kinds={beat:[],decision:[],echo:[],blackSwan:[]},byStage={};
    for(const stage of Object.keys(DATA.stages))byStage[stage]={beat:[],decision:[],echo:[],blackSwan:[]};
    for(const event of DATA.events){(kinds[event.kind]||kinds.beat).push(event);for(const stage of event.stage||[])if(byStage[stage])byStage[stage][event.kind]?.push(event)}
    return{kinds,byStage,event:new Map(DATA.events.map(x=>[x.id,x])),family:new Map(DATA.familyArchetypes.map(x=>[x.id,x])),cards:new Map(Object.values(DATA.cards).flat().map(x=>[x.id,x])),ending:new Map(DATA.endingTitles.map(x=>[x.id,x])),conflict:new Map((DATA.mainConflicts||[]).map(x=>[x.id,x]))};
  }
  function stageForAge(age){return Object.entries(DATA.stages).find(([,range])=>age>=range[0]&&age<=range[1])?.[0]||'elder'}
  function genderName(g){return g==='female'?'女性':'男性'}
  function haptic(pattern=10){if(!simulationMode&&state.meta.settings.haptic&&navigator.vibrate)navigator.vibrate(pattern)}

  function seededDNA(seed,birth,archetype){
    const mods=archetype?.dnaMods||{};const value=(key,base=50)=>clamp(base+stable(seed,key,71)-35+(mods[key]||0),0,100);
    const siblings=stable(seed,'siblings',100)<38?0:1+stable(seed,'siblings-count',3);
    return{familyClass:archetype?.familyClass||'working',siblingCount:siblings,onlyChild:siblings===0,parentControl:value('control'),emotionalExpression:value('emotionalExpression'),educationExpectation:value('educationExpectation'),genderTraditionalism:value('genderTraditionalism'),careBurden:value('careBurden'),cashflow:value('cashflow'),housing:value('housing'),hiddenDebt:value('hiddenDebt'),healthBaseline:value('healthBaseline',58),information:value('information'),riskTolerance:value('riskTolerance'),digitalLiteracy:value('digitalLiteracy'),fraudRisk:value('fraudRisk'),openness:value('openness'),medicalAccess:clamp(birth.location.mods?.medical||50,0,100)};
  }
  function chooseConflicts(seed){const pool=[...(DATA.mainConflicts||[])].sort((a,b)=>stable(seed,b.id)-stable(seed,a.id));return pool.slice(0,2).map(x=>x.id)}

  function createRun(seed=makeSeed()){
    const run={seed,rngState:hashSeed(seed),schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,contentRevision:3,phase:'birth',age:0};state.run=run;
    run.gender=chance(.5)?'female':'male';
    const location=weightedPick(DATA.locations);const recentFamilies=new Set(state.meta.recentLives.map(x=>x.family));
    const family=weightedPick(DATA.familyArchetypes,item=>(item.weight||1)*(recentFamilies.has(item.id)?.25:1));
    const secret=weightedPick(DATA.familySecrets);
    run.birth={location,family:{archetype:family,father:pick(occupations[location.id]),mother:pick(occupations[location.id]),secret,house:['租住房','按揭商品房','老城区住房','自建房','单位住房'][stable(seed,'house',5)]}};
    run.lifeDNA=seededDNA(seed,run.birth,family);run.mainConflicts=chooseConflicts(seed);
    run.attrs={intellect:1,physique:1,looks:1,stability:1,social:1,ambition:1};run.points=20;
    run.res={cash:Math.round((run.lifeDNA.cashflow-50)*700),assets:run.lifeDNA.housing>70?420000:run.lifeDNA.housing>48?120000:20000,debt:run.lifeDNA.hiddenDebt>72?90000:0,health:clamp(62+run.lifeDNA.healthBaseline*.25,45,92),spirit:72,relation:60};
    run.lifeFacts={education:'未入学',jobStatus:'none',career:'尚未进入社会',city:location.id,housing:'family',relationship:'single',children:0,debt:run.res.debt?1:0,skills:0,digitalExperience:0,workExperience:0,savings:0,boundaries:0,careDuty:0};
    run.memories=[];run.relationships={};run.pressures={money:0,family:0,career:0,body:0,loneliness:0};run.scheduledEchoes=[];run.opportunities=[];
    run.cards=[];run.cardAges=[];run.adversityDraws=0;run.timeline=[];run.usedEvents=[];run.usedDecisions=[];run.usedEchoes=[];run.seenThisYear=[];
    run.stageDecisionCounts={};run.decisionCount=0;run.targetDecisions=12+stable(seed,'decision-target',7);run.lastDecisionAge=-9;
    run.yearQueue=[];run.yearStarted=false;run.currentDecision=null;run.currentResult=null;run.badStreak=0;run.echoCount=0;
    const baseLife=64+stable(seed,'lifespan',31);const bodyBonus=Math.round((run.lifeDNA.healthBaseline-50)/10)+(run.attrs.physique-1);run.deathAge=clamp(baseLife+bodyBonus,42,101);
    run.ending=null;return run;
  }

  function migrateRun(old){
    if(!old||typeof old!=='object')return null;if(old.schemaVersion===SCHEMA_VERSION){
      if(old.gameVersion==='3.2.0'&&old.phase==='result'){old.currentDecision=null;old.currentResult=null;old.phase='playing';old.yearStarted=false;old.age=clamp((old.age||0)+1,0,105)}
      old.gameVersion=VERSION;old.yearStarted=Boolean(old.yearStarted);old.paused=false;return old
    }
    const seed=old.seed||`MIGRATED-${Date.now()}`;const savedMeta=state?.meta||defaultMeta();const holder=state;state={meta:savedMeta,run:null};const fresh=createRun(seed);state=holder;
    fresh.age=clamp(old.age||0,0,105);fresh.gender=old.gender||fresh.gender;fresh.attrs={...fresh.attrs,...(old.attrs||{})};fresh.res={...fresh.res,...(old.res||{})};
    const location=DATA.locations.find(x=>x.id===old.birth?.location?.id);const family=DATA.familyArchetypes.find(x=>x.id===old.birth?.family?.archetype?.id);
    if(location)fresh.birth.location=location;if(family)fresh.birth.family.archetype=family;
    fresh.birth.family.father=old.birth?.family?.father||fresh.birth.family.father;fresh.birth.family.mother=old.birth?.family?.mother||fresh.birth.family.mother;fresh.birth.family.house=old.birth?.family?.house||fresh.birth.family.house;
    fresh.lifeDNA={...fresh.lifeDNA,...(old.lifeDNA||{})};fresh.mainConflicts=old.mainConflicts||fresh.mainConflicts;
    fresh.cards=(old.cards||[]).map(x=>typeof x==='string'?x:x.id).filter(id=>INDEX.cards.has(id));fresh.cardAges=old.stageDrawn||[];
    fresh.timeline=(old.timeline||[]).slice(-120).map(x=>({age:x.age??fresh.age,icon:'•',text:String(x.text||'').replace(/：.*$/,'').slice(0,32),kind:'legacy'}));
    fresh.phase=old.phase==='ended'?'ended':old.phase==='birth'||old.phase==='attributes'?old.phase:'playing';fresh.ending=old.ending||null;fresh.points=old.points??fresh.points;
    milestoneFacts(fresh);return fresh;
  }

  function loadState(){
    const base={view:'home',meta:defaultMeta(),run:null,overlay:null,toast:null,recovery:null};let raw='';
    try{raw=localStorage.getItem(APP_KEY)||''}catch(error){base.recovery={error:String(error),raw};return base}if(!raw)return base;
    try{const parsed=JSON.parse(raw);base.meta=normalizeMeta(parsed.meta||{});state=base;if((parsed.schemaVersion||parsed.run?.schemaVersion||3)<4&&!localStorage.getItem(V31_BACKUP_KEY))localStorage.setItem(V31_BACKUP_KEY,raw);base.run=migrateRun(parsed.run);return base}
    catch(error){try{localStorage.setItem(CORRUPT_KEY,raw)}catch{}base.recovery={error:String(error),raw};return base}
  }
  function persist(){if(simulationMode||state.recovery)return;try{localStorage.setItem(APP_KEY,JSON.stringify({schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,meta:state.meta,run:state.run}))}catch{showToast('存档空间不足，请先导出档案')}}
  function save(immediate=false){if(simulationMode)return;if(saveTimer)clearTimeout(saveTimer);if(immediate)persist();else saveTimer=setTimeout(()=>{saveTimer=null;persist()},120)}

  function factsMeet(facts={},run=state.run){
    if(facts.childrenMin!==undefined&&Number(run.lifeFacts.children||0)<facts.childrenMin)return false;
    if(facts.relationshipAny&&!facts.relationshipAny.includes(run.lifeFacts.relationship))return false;
    if(facts.jobAny&&!facts.jobAny.includes(run.lifeFacts.jobStatus))return false;return true;
  }
  function eligible(event,run=state.run){
    if(run.age<event.ageMin||run.age>event.ageMax)return false;if(run.usedEvents.includes(event.id))return false;
    const req=event.requirements||{};if(req.facts&&!factsMeet(req.facts,run))return false;
    if(req.memoriesAny?.length&&!req.memoriesAny.some(key=>run.memories.some(m=>m.key===key)))return false;
    if(event.gender?.length&&!event.gender.includes(run.gender))return false;return true;
  }
  function eventWeight(event){
    const seen=state.meta.seenContent.events[contentKey(event)]||0;let weight=(event.weight||10)*(seen===0?2.2:seen===1?.65:.25);
    if(state.meta.recentLives[0]?.events?.includes(contentKey(event)))weight*=.2;
    if(event.theme===state.run.timeline.at(-1)?.theme)weight*=.45;
    if(event.kind==='echo')weight*=1+state.run.memories.length*.04;
    if(cardMechanics().includes('network')&&event.theme==='relationship')weight*=1.2;
    if(cardMechanics().includes('digital')&&event.theme==='digital')weight*=1.2;
    return weight;
  }
  function selectFrom(kind){const pool=(INDEX.byStage[stageForAge(state.run.age)]?.[kind]||INDEX.kinds[kind]).filter(event=>eligible(event));return weightedPick(pool,eventWeight)}

  function cardMechanics(){return state.run.cards.map(id=>INDEX.cards.get(id)?.mechanic).filter(Boolean)}
  function applyCardShield(event,effects){
    const mechanics=cardMechanics(),used=state.run.cardUses||(state.run.cardUses={});
    const use=(mechanic,condition,fn)=>{const card=state.run.cards.find(id=>INDEX.cards.get(id)?.mechanic===mechanic&&!used[id]);if(card&&condition){fn();used[card]=true;state.run.opportunities.push(INDEX.cards.get(card).displayName)}};
    use('healthUp',event.theme==='health'&&Number(effects.resources?.health)<0,()=>effects.resources.health=Math.ceil(effects.resources.health/2));
    use('save',(event.theme==='money'||event.theme==='house')&&Number(effects.resources?.cash)<0,()=>effects.resources.cash=Math.ceil(effects.resources.cash/2));
    use('evidence',['career','money','digital'].includes(event.theme),()=>{effects.resources={...(effects.resources||{}),spirit:(effects.resources?.spirit||0)+2}});
    use('network',['relationship','family','care'].includes(event.theme),()=>{effects.resources={...(effects.resources||{}),relation:(effects.resources?.relation||0)+2}});
  }
  function applyEffects(raw={},event={theme:'ordinary'}){
    const effects=copy(raw);applyCardShield(event,effects);const run=state.run,changed=[];
    for(const[key,value]of Object.entries(effects.resources||{})){run.res[key]=clamp((run.res[key]||0)+Number(value),key==='cash'?-999999999:0,key==='cash'||key==='assets'||key==='debt'?999999999:100);changed.push(key)}
    for(const[key,value]of Object.entries(effects.lifeFacts||{})){if(typeof value==='number'&&typeof run.lifeFacts[key]==='number')run.lifeFacts[key]+=value;else run.lifeFacts[key]=value}
    for(const[key,value]of Object.entries(effects.pressures||{}))run.pressures[key]=clamp((run.pressures[key]||0)+Number(value),0,100);
    return changed;
  }
  function addTimeline(event,text=event.text,kind=event.kind){
    const run=state.run;run.timeline.push({age:run.age,icon:event.icon||'•',text,kind,theme:event.theme,id:event.id});if(run.timeline.length>180)run.timeline.shift();
    if(kind==='echo')run.echoCount++;
    run.usedEvents.push(event.id);increment(state.meta.seenContent.events,contentKey(event));
  }
  function addChoiceTimeline(event,choice){
    const run=state.run;run.timeline.push({age:run.age,icon:event.icon||'•',text:`${event.prompt} 你选了“${choice.text}”。${choice.resultText}`,kind:'decision',theme:event.theme,id:event.id,hints:choice.consequenceHints||[]});if(run.timeline.length>180)run.timeline.shift();
    run.usedEvents.push(event.id);increment(state.meta.seenContent.events,contentKey(event));
  }
  function addCardTimeline(card){
    const run=state.run;run.timeline.push({age:run.age,icon:card.omenIcon||'🃏',text:`抽到《${card.displayName}》：${card.effectHint}`,kind:'card',theme:'card',id:card.id});if(run.timeline.length>180)run.timeline.shift();
  }
  function milestoneFacts(run=state.run){
    const age=run.age;if(age>=7)run.lifeFacts.education='小学';if(age>=13)run.lifeFacts.education='初中';if(age>=16)run.lifeFacts.education=run.attrs.intellect>=5?'普通高中':'职校或高中';
    if(age>=19)run.lifeFacts.education=run.attrs.intellect>=6?'大学在读':run.attrs.intellect>=4?'大专或职校毕业':'中学毕业';
    if(age>=23&&run.lifeFacts.jobStatus==='none'){run.lifeFacts.jobStatus='employed';run.lifeFacts.career=pick(occupations[run.birth.location.id])}
    if(age>=60&&run.lifeFacts.jobStatus==='employed'&&run.attrs.stability>=5)run.lifeFacts.jobStatus='retired';
  }

  function revealNext(){
    const run=state.run;if(run.phase!=='playing'||!run.yearQueue.length)return false;
    const event=run.yearQueue.shift();applyEffects(event.effects||{},event);addTimeline(event);run.seenThisYear.push(event.id);
    if(['health','money','career'].includes(event.theme)&&event.tone!=='light')run.badStreak++;else run.badStreak=Math.max(0,run.badStreak-1);
    save();render();return true;
  }
  function beginYear(){
    const run=state.run;if(run.age>run.deathAge||run.age>105){finishLife();return true}milestoneFacts(run);run.seenThisYear=[];
    const dueCard=CARD_AGES.find(age=>run.age>=age&&!run.cardAges.includes(age));if(dueCard!==undefined){startCardDraw('stage',dueCard);return}
    if(run.badStreak>=3&&run.age>=18&&run.adversityDraws<1){run.adversityDraws++;startCardDraw('adversity',run.age);return}
    run.yearStarted=true;
    const stage=stageForAge(run.age);const possibleEcho=(INDEX.byStage[stage]?.echo||[]).filter(e=>eligible(e));let primary=null;
    if(possibleEcho.length&&chance(.18))primary=weightedPick(possibleEcho,eventWeight);else primary=selectFrom('beat');
    if(!primary){primary={id:`quiet_${run.age}`,kind:'beat',icon:'·',text:'这一年没有大事，日子照常往前。',theme:'ordinary',effects:{},contentRevision:3}}
    run.yearQueue=[primary];
    if(chance(.35)){let second=selectFrom('beat');if(possibleEcho.length&&chance(.28))second=weightedPick(possibleEcho.filter(x=>x.id!==primary.id),eventWeight)||second;if(second&&second.id!==primary.id)run.yearQueue.push(second)}
    if(chance(.008)){const swan=selectFrom('blackSwan');if(swan)run.yearQueue[run.yearQueue.length-1]=swan}
    return false;
  }
  function shouldOfferDecision(){
    const run=state.run,stage=stageForAge(run.age),quota=STAGE_QUOTAS[stage]||0,count=run.stageDecisionCounts[stage]||0;if(count>=quota||run.decisionCount>=run.targetDecisions)return false;
    const range=DATA.stages[stage],remaining=Math.max(0,range[1]-run.age),need=quota-count;if(run.age-run.lastDecisionAge<2&&remaining>need)return false;
    if(remaining<=need)return true;return chance(Math.min(.55,(need/(remaining+1))*1.45));
  }
  function offerDecision(){
    const run=state.run,event=selectFrom('decision');if(!event)return false;run.phase='decision';run.currentDecision=event;save();render();return true;
  }
  function finishYear(){
    const run=state.run;if(run.phase!=='playing')return true;if(shouldOfferDecision()&&offerDecision())return true;
    if(run.age>=60&&run.res.health<20&&chance(.12)){run.deathAge=run.age;finishLife();return true}
    run.yearStarted=false;run.age++;save();return false;
  }
  function advanceOneBeat(force=false){
    const run=state.run;if(!run||run.phase!=='playing'||(!force&&state.view!=='game')||inputLocked)return false;
    if(!simulationMode)inputLocked=true;
    try{
      for(let guard=0;guard<8;guard++){
        if(!run.yearStarted&&beginYear())return true;
        if(run.phase!=='playing')return true;
        if(run.yearQueue.length)return revealNext();
        if(finishYear())return true;
      }
      return false;
    }finally{if(simulationMode)inputLocked=false;else setTimeout(()=>inputLocked=false,180)}
  }

  function chooseDecision(index){
    const run=state.run,event=run.currentDecision,choice=event?.choices?.[index];if(!choice||inputLocked)return;inputLocked=true;
    const changed=applyEffects(choice.effects||{},event);run.memories.push({key:choice.memoryKey,decisionId:event.id,age:run.age,choice:choice.text,result:choice.resultText,echoText:event.echoText});
    run.usedDecisions.push(event.id);run.decisionCount++;increment(run.stageDecisionCounts,stageForAge(run.age));run.lastDecisionAge=run.age;
    addChoiceTimeline(event,choice);run.currentDecision=null;run.currentResult=null;run.phase='playing';run.yearStarted=false;run.age++;
    run.badStreak=(choice.consequenceHints||[]).some(x=>/↓|风险|压力|债务/.test(x))?run.badStreak+1:Math.max(0,run.badStreak-1);haptic(18);save();render();setTimeout(()=>inputLocked=false,220);
  }

  function cardOptions(kind){
    const recent=new Set(state.meta.recentLives.flatMap(x=>x.cards||[])),owned=new Set(state.run.cards);const pool=[...DATA.cards[kind]].filter(card=>!owned.has(card.id)),result=[];
    while(result.length<3&&pool.length){const chosen=weightedPick(pool,card=>{const seen=state.meta.seenContent.cards[contentKey(card)]||0;return(seen===0?3:seen===1?.7:.25)*(recent.has(contentKey(card))?.25:1)});result.push(chosen);pool.splice(pool.indexOf(chosen),1)}return result;
  }
  function startCardDraw(kind,age){const run=state.run;run.phase='card';run.drawKind=kind;run.drawAt=age;run.drawOptions=cardOptions(kind);state.view='game';save();render();return true}
  function chooseCard(id){
    const run=state.run,card=run.drawOptions?.find(x=>x.id===id);if(!card||inputLocked)return;inputLocked=true;run.cards.push(id);increment(state.meta.seenContent.cards,contentKey(card));
    if(run.drawKind==='stage')run.cardAges.push(run.drawAt);applyEffects(card.effects||{}, {theme:'card'});run.opportunities.push(card.displayName);addCardTimeline(card);
    run.drawOptions=[];run.phase='playing';state.view='game';haptic([10,30,12]);save();render();setTimeout(()=>inputLocked=false,220);
  }

  function startPlaying(){state.run.phase='playing';state.view='game';save();render()}
  function endingTitle(run){
    const preferred=DATA.endingTitles.filter(x=>x.themes?.some(theme=>run.timeline.some(t=>t.theme===theme)));return weightedPick(preferred.length?preferred:DATA.endingTitles)?.title||'这一生按时结束';
  }
  function finishLife(){
    const run=state.run;if(run.phase==='ended')return;run.phase='ended';run.age=Math.min(run.age,run.deathAge);
    const net=run.res.assets+run.res.cash-run.res.debt,score=clamp(Math.round(run.res.health*.22+run.res.spirit*.22+run.res.relation*.22+clamp(net/20000,0,22)+run.memories.length*.6),1,99);
    const facts=run.memories.slice(-5).map(m=>({age:m.age,title:m.choice,result:m.result}));while(facts.length<3&&run.timeline.length){const t=run.timeline[Math.max(0,run.timeline.length-1-facts.length*3)];facts.unshift({age:t.age,title:t.text,result:'这件事留在了你的时间线上。'})}
    const conflict=INDEX.conflict.get(run.mainConflicts[0])?.name||'留下还是离开';const first=facts[0],last=facts.at(-1);
    const review=`你从${run.birth.location.name}的${run.birth.family.archetype.name}出发。${first?`${first.age}岁时，你选择了“${first.title}”。`:''}${last&&last!==first?`${last.age}岁，生活又因“${last.title}”换了方向。`:''}你活了${run.age}岁，留下${run.memories.length}次真正由自己作出的决定。最后拥有的不是标准答案，而是一条只有这些经历才能拼出的路。`;
    run.ending={age:run.age,title:endingTitle(run),score,net,review,mainConflict:conflict,facts,gained:[run.lifeFacts.skills?'能带走的技能':'几段仍有回应的关系',run.cards.length?'几次命运留下的余地':'对日常的耐心'],lost:[run.pressures.body>20?'一部分没有休息够的身体':'一些没有兑现的计划',run.pressures.money>20?'被账单占用的自由':'无法同时走完的岔路']};
    increment(state.meta.stats,'runs');state.meta.stats.best=Math.max(state.meta.stats.best||0,score);increment(state.meta.seenContent.endings,run.ending.title);
    const life={title:run.ending.title,age:run.age,score,net,gender:run.gender,family:run.birth.family.archetype.id,events:run.usedEvents.map(id=>contentKey(INDEX.event.get(id)||{id,contentRevision:3})),cards:run.cards.map(id=>contentKey(INDEX.cards.get(id))),decisions:run.decisionCount};
    state.meta.histories.unshift({...life,familyName:run.birth.family.archetype.name});state.meta.histories=state.meta.histories.slice(0,30);state.meta.recentLives.unshift(life);state.meta.recentLives=state.meta.recentLives.slice(0,5);state.view='ending';save(true);render();
  }

  function roleLine(){const run=state.run;if(run.age<7)return'被家里照顾';if(run.age<19)return run.lifeFacts.education;if(run.lifeFacts.jobStatus==='retired')return'退休生活';if(run.lifeFacts.jobStatus==='unemployed')return'正在找下一份工作';if(run.lifeFacts.jobStatus==='gig')return'灵活就业';return run.lifeFacts.career||'普通上班族'}
  function go(view){state.view=view;state.overlay=null;window.scrollTo(0,0);render()}
  function showToast(text){if(simulationMode)return;state.toast=text;render();setTimeout(()=>{if(state.toast===text){state.toast=null;render()}},1500)}

  function homeView(){const active=state.run&&state.run.phase!=='ended';return`<main class="screen center"><span class="version">v${VERSION}</span><div><h1>人生尚未加载</h1></div><div class="mt stack">${active?'<button class="btn primary" data-act="continue">继续这一生</button>':'<button class="btn primary" data-act="new">🎲 开始新人生</button>'}<div class="menu-list"><button class="menu-item" data-nav="archive"><strong>🗂️ 人生档案</strong><span>›</span></button><button class="menu-item" data-nav="codex"><strong>📖 社会图鉴</strong><span>›</span></button><button class="menu-item" data-nav="settings"><strong>⚙️ 设置</strong><span>›</span></button></div></div><p class="tiny">离线运行 · 自动存档</p></main>`}
  function birthView(){const run=state.run,f=run.birth.family;return`<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">出生信息</div><span></span></div><section class="card hero"><div class="eyebrow">${genderName(run.gender)} · ${esc(run.birth.location.name)}</div><div class="birth-place">${esc(f.archetype.name)}</div><p>${esc(f.archetype.note)}</p></section><dl class="spec-list"><div class="spec"><dt>父亲</dt><dd>${esc(f.father)}</dd></div><div class="spec"><dt>母亲</dt><dd>${esc(f.mother)}</dd></div><div class="spec"><dt>兄弟姐妹</dt><dd>${run.lifeDNA.siblingCount?`${run.lifeDNA.siblingCount}人`:'独生'}</dd></div><div class="spec"><dt>住房</dt><dd>${esc(f.house)}</dd></div></dl><div class="bottom-actions"><button class="btn primary" data-act="toAttrs">分配初始属性</button></div></main>`}
  function attributesView(){const run=state.run;return`<main class="screen attributes-screen"><div class="topbar"><button class="iconbtn" data-nav="birth">‹</button><div class="title">出生加点</div><span></span></div><div class="remain row"><div><div class="eyebrow">剩余点数</div><div class="big-number">${run.points}</div></div><span class="pill">每项上限 8</span></div><section class="card">${Object.entries(DATA.attributes).map(([key,a])=>`<div class="attr-row"><div><div class="attr-name"><span class="attr-emoji">${a.icon}</span>${esc(a.name)}</div><div class="attr-desc">${esc(a.desc)}</div></div><div class="stepper"><button data-step="${key}" data-delta="-1">−</button><b>${run.attrs[key]}</b><button data-step="${key}" data-delta="1">＋</button></div></div>`).join('')}</section><div class="bottom-actions attributes-actions"><button class="btn ghost" data-act="randomAttrs">随机分配</button><button class="btn primary" data-act="confirmAttrs" ${run.points?'disabled':''}>确认出生</button></div></main>`}
  function cardView(){const run=state.run;const title=run.drawKind==='innate'?'选一张先天牌':run.drawKind==='adversity'?'坏日子留下一张牌':`${run.drawAt}岁 · 学会一件事`;return`<main class="screen"><div class="topbar"><span></span><div class="title">${title}</div><span></span></div><p>牌面说清用途，具体哪一天生效仍由人生决定。</p><div class="stack mt">${run.drawOptions.map((card,i)=>`<button class="card fate-card clear-card" style="animation-delay:${i*.05}s" data-card="${card.id}"><div class="omen-icon">${card.omenIcon}</div><div><div class="fate-title">《${esc(card.displayName)}》</div><div class="fate-text">${esc(card.effectHint)}</div></div><span class="chev">›</span></button>`).join('')}</div></main>`}
  function resourceHeader(){const run=state.run;return`<header class="game-header"><div class="row"><div class="grow"><div class="age">${run.age}岁</div><div class="role">${esc(run.birth.location.name)} · ${esc(roleLine())}</div></div><button class="iconbtn" data-act="status">☰</button></div><div class="resource-strip"><div class="res"><span>现金</span><b>${money(run.res.cash)}</b></div><div class="res"><span>健康</span><b>${Math.round(run.res.health)}</b></div><div class="res"><span>精神</span><b>${Math.round(run.res.spirit)}</b></div><div class="res"><span>关系</span><b>${Math.round(run.res.relation)}</b></div></div></header>`}
  function streamRows(){const rows=state.run.timeline.slice(-9);return rows.length?rows.map((item,i)=>`<div class="stream-row ${['decision','card'].includes(item.kind)?'chosen':''}" style="animation-delay:${Math.min(i,7)*.02}s"><span class="stream-age">${item.age}岁</span><span class="stream-icon">${item.icon}</span><div><p>${esc(item.text)}</p>${item.hints?.length?`<div class="stream-hints">${item.hints.map(h=>`<span>${esc(h)}</span>`).join('')}</div>`:''}</div></div>`).join(''):'<div class="stream-empty">轻触这里，开始这一生。</div>'}
  function gameView(){
    const run=state.run;return`<main class="screen stream-screen">${resourceHeader()}<section class="life-stream" data-act="advance" role="button" tabindex="0" aria-label="轻触继续人生">${streamRows()}${run.phase==='playing'?'<div class="stream-cursor"><i></i> 轻触继续</div>':''}</section></main>`;
  }
  function endingView(){const run=state.run,e=run.ending;return`<main class="screen"><div class="eyebrow ending-kicker">这一生滚到了最后</div><div class="lifespan">你活了 <b>${e.age}</b> 岁</div><div class="score-ring" style="--score:${e.score}"><div><b>${e.score}</b><span>人生综合值</span></div></div><div class="ending-title">《${esc(e.title)}》</div><p class="ending-review">${esc(e.review)}</p><section class="card mt"><div class="section-title first">一生最核心的矛盾</div><p>${esc(e.mainConflict)}</p><div class="stat-grid mt-sm"><div class="stat-box"><span>最终净值</span><b>${money(e.net)}</b></div><div class="stat-box"><span>亲手选择</span><b>${run.decisionCount}</b></div><div class="stat-box"><span>活过的事件</span><b>${run.timeline.length}</b></div><div class="stat-box"><span>旧事回响</span><b>${run.echoCount}</b></div></div></section><div class="two-col mt"><section class="card soft"><div class="section-title first">得到的东西</div>${e.gained.map(x=>`<p class="fact">＋ ${esc(x)}</p>`).join('')}</section><section class="card soft"><div class="section-title first">失去的东西</div>${e.lost.map(x=>`<p class="fact">－ ${esc(x)}</p>`).join('')}</section></div><div class="section-title">这一生绕不过的几件事</div><section class="card timeline">${e.facts.map(x=>`<div class="time-item"><span class="time-age">${x.age}岁</span><div><strong>${esc(x.title)}</strong><p class="tiny">${esc(x.result)}</p></div></div>`).join('')}</section><div class="stack mt"><button class="btn primary" data-act="new">再投一次</button><button class="btn ghost" data-nav="archive">查看人生档案</button></div></main>`}
  function archiveView(){const h=state.meta.histories;return`<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">人生档案</div><span class="pill">${h.length}次</span></div><section class="card">${h.length?h.map(x=>`<div class="archive-item"><div class="row"><div><div class="archive-title">《${esc(x.title)}》</div><div class="archive-meta">${esc(x.familyName||x.family)} · ${x.age}岁 · ${x.decisions||0}次选择</div></div><span class="pill">${x.score}</span></div></div>`).join(''):'<p>还没有走完的人生。</p>'}</section></main>`}
  function codexView(){const unlocked=DATA.codex.filter(x=>state.meta.codex.includes(x.id));return`<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">社会图鉴</div><span class="pill">${unlocked.length}/${DATA.codex.length}</span></div><section class="card">${unlocked.length?unlocked.map(x=>`<div class="codex-item"><h3>${esc(x.name)}</h3><p>${esc(x.text)}</p></div>`).join(''):'<p>真正遇见过的内容才会出现在这里。</p>'}</section></main>`}
  function settingsView(){return`<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">设置</div><span></span></div><section class="card"><button class="menu-item" data-act="toggleHaptic"><strong>轻触反馈</strong><span class="switch ${state.meta.settings.haptic?'on':''}"><i></i></span></button><button class="menu-item" data-act="export"><strong>导出存档</strong><span>›</span></button><button class="menu-item" data-act="reset"><strong class="danger-text">清除全部数据</strong><span>›</span></button></section></main>`}
  function overlayView(){if(state.overlay!=='status')return'';const run=state.run;return`<div class="drawer-wrap" data-act="closeOverlay"><div class="drawer" onclick="event.stopPropagation()"><div class="handle"></div><div class="row"><div><div class="eyebrow">${run.age}岁 · ${genderName(run.gender)}</div><h2>${esc(run.birth.family.archetype.name)}</h2></div><button class="iconbtn" data-act="closeOverlay">×</button></div><p>${esc(run.birth.family.archetype.note)}</p><div class="section-title">现在的生活</div><dl class="spec-list"><div class="spec"><dt>学历</dt><dd>${esc(run.lifeFacts.education)}</dd></div><div class="spec"><dt>工作</dt><dd>${esc(roleLine())}</dd></div><div class="spec"><dt>婚恋</dt><dd>${run.lifeFacts.relationship==='partnered'?'有稳定伴侣':'单身'}</dd></div><div class="spec"><dt>子女</dt><dd>${run.lifeFacts.children||0}</dd></div></dl><div class="section-title">资产负债</div><div class="stat-grid"><div class="stat-box"><span>现金</span><b>${money(run.res.cash)}</b></div><div class="stat-box"><span>资产</span><b>${money(run.res.assets)}</b></div><div class="stat-box"><span>负债</span><b>${money(run.res.debt)}</b></div><div class="stat-box"><span>净值</span><b>${money(run.res.assets+run.res.cash-run.res.debt)}</b></div></div><button class="btn ghost mt" data-nav="home">返回首页</button></div></div>`}
  function interactionOverlayView(){
    const run=state.run;if(state.view!=='game'||!run)return'';
    if(run.phase==='decision'&&run.currentDecision){const e=run.currentDecision;return`<div class="modal-wrap locked-modal"><section class="choice-sheet" role="dialog" aria-modal="true" aria-label="人生选择"><div class="handle"></div><div class="decision-emoji">${e.icon}</div><h2>${esc(e.prompt)}</h2><div class="choices">${e.choices.map((c,i)=>`<button class="choice" data-choice="${i}">${esc(c.text)}</button>`).join('')}</div></section></div>`}
    if(run.phase==='card'){const title=run.drawKind==='innate'?'选一张先天牌':run.drawKind==='adversity'?'坏日子留下一张牌':`${run.drawAt}岁 · 学会一件事`;return`<div class="modal-wrap locked-modal"><section class="choice-sheet card-sheet" role="dialog" aria-modal="true" aria-label="${title}"><div class="handle"></div><div class="sheet-title">${title}</div><p>选中的牌会留在这一年。</p><div class="stack mt-sm">${run.drawOptions.map(card=>`<button class="card clear-card" data-card="${card.id}"><div class="omen-icon">${card.omenIcon}</div><div><div class="fate-title">《${esc(card.displayName)}》</div><div class="fate-text">${esc(card.effectHint)}</div></div><span class="chev">›</span></button>`).join('')}</div></section></div>`}
    return'';
  }
  function recoveryView(){return`<main class="screen center"><div class="eyebrow">存档恢复</div><h1>存档没有安全加载</h1><p>原始内容已经保留。你可以先导出，再清除损坏数据。</p><section class="card mt"><p class="tiny">${esc(state.recovery.error)}</p></section><div class="stack mt"><button class="btn primary" data-act="exportCorrupt">导出损坏存档</button><button class="btn danger" data-act="clearCorrupt">清除并重新开始</button></div></main>`}
  function debugPanel(){return`<section class="debug-panel mt"><div class="eyebrow">DEBUG ONLY</div><div class="row mt-sm"><span>年度400 · 选择100 · 回响80</span><button class="btn small" data-act="debugFinish">走完当前局</button></div></section>`}
  function render(){
    let html;if(state.recovery)html=recoveryView();else html=({home:homeView,birth:birthView,attributes:attributesView,card:cardView,game:gameView,ending:endingView,archive:archiveView,codex:codexView,settings:settingsView}[state.view]||homeView)();
    if(DEBUG&&state.view==='home')html=html.replace('</main>',debugPanel()+'</main>');app.innerHTML=html+overlayView()+interactionOverlayView()+(state.toast?`<div class="toast">${esc(state.toast)}</div>`:'');bind();
  }

  function stepAttr(key,delta){const run=state.run;if(delta>0&&run.points>0&&run.attrs[key]<8){run.attrs[key]++;run.points--}else if(delta<0&&run.attrs[key]>1){run.attrs[key]--;run.points++}haptic(6);save();render()}
  function randomAttrs(){const run=state.run;for(const key of Object.keys(run.attrs))run.attrs[key]=1;run.points=20;while(run.points){const keys=Object.keys(run.attrs).filter(key=>run.attrs[key]<8);run.attrs[pick(keys)]++;run.points--}save();render()}
  function beginNew(){if(state.run&&state.run.phase!=='ended'&&!confirm('当前人生还没结束。确定重新开始？'))return;createRun();state.view='birth';save(true);render()}
  function exportText(text,name){const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
  function action(name){
    const run=state.run;
    if(name==='new')beginNew();else if(name==='continue'){if(run.phase==='birth')go('birth');else if(run.phase==='attributes')go('attributes');else if(run.phase==='ended')go('ending');else go('game')}
    else if(name==='toAttrs'){run.phase='attributes';go('attributes');save()}else if(name==='randomAttrs')randomAttrs();
    else if(name==='confirmAttrs'){if(run.points)return;run.deathAge=clamp(run.deathAge+run.attrs.physique-1,42,105);startCardDraw('innate',0)}
    else if(name==='advance')advanceOneBeat();else if(name==='status'){state.overlay='status';render()}else if(name==='closeOverlay'){state.overlay=null;render()}
    else if(name==='toggleHaptic'){state.meta.settings.haptic=!state.meta.settings.haptic;save();render()}else if(name==='export')exportText(JSON.stringify({schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,meta:state.meta,run:state.run},null,2),'人生尚未加载-v3.2.2-存档.json');
    else if(name==='reset'&&confirm('清除全部人生档案和存档？')){localStorage.removeItem(APP_KEY);state={view:'home',meta:defaultMeta(),run:null,overlay:null,toast:null,recovery:null};render()}
    else if(name==='exportCorrupt')exportText(state.recovery.raw||'','人生尚未加载-损坏存档.json');else if(name==='clearCorrupt'&&confirm('确认清除损坏存档？')){localStorage.removeItem(APP_KEY);state={view:'home',meta:defaultMeta(),run:null,overlay:null,toast:null,recovery:null};render()}
    else if(name==='debugFinish'){const report=autoFinishCurrent();showToast(`完成：${report?.age||0}岁，${report?.decisions||0}次选择`)}
  }
  function bind(){app.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>go(el.dataset.nav));app.querySelectorAll('[data-act]').forEach(el=>el.onclick=()=>action(el.dataset.act));app.querySelectorAll('[data-step]').forEach(el=>el.onclick=()=>stepAttr(el.dataset.step,Number(el.dataset.delta)));app.querySelectorAll('[data-card]').forEach(el=>el.onclick=()=>chooseCard(el.dataset.card));app.querySelectorAll('[data-choice]').forEach(el=>el.onclick=()=>chooseDecision(Number(el.dataset.choice)));const stream=app.querySelector('.life-stream');if(stream)stream.onkeydown=event=>{if((event.key==='Enter'||event.key===' ')&&state.run?.phase==='playing'){event.preventDefault();advanceOneBeat()}}}

  function renderGameToText(){const run=state.run;return JSON.stringify({view:state.view,version:VERSION,run:run?{phase:run.phase,age:run.age,canAdvance:state.view==='game'&&run.phase==='playing',overlay:run.phase==='decision'?'decision':run.phase==='card'?'card':null,resources:run.res,visibleTimeline:run.timeline.slice(-6).map(x=>({age:x.age,text:x.text,kind:x.kind})),decision:run.currentDecision?{prompt:run.currentDecision.prompt,choices:run.currentDecision.choices.map((x,index)=>({index,text:x.text}))}:null,cards:run.phase==='card'?run.drawOptions.map(x=>({id:x.id,name:x.displayName,effect:x.effectHint})):null,decisionCount:run.decisionCount,ending:run.ending?{title:run.ending.title,age:run.ending.age,facts:run.ending.facts.length}:null}:null})}
  window.render_game_to_text=renderGameToText;
  window.advanceTime=ms=>{const steps=Math.max(1,Math.floor(Number(ms||800)/800));for(let i=0;i<steps;i++)if(state.run?.phase==='playing')advanceOneBeat(true);return renderGameToText()};

  function autoFinishCurrent(){
    if(!state.run)return null;const before=simulationMode;simulationMode=true;let guard=0;
    try{while(state.run.phase!=='ended'&&guard++<1000){const run=state.run;if(run.phase==='birth'){run.phase='attributes';continue}if(run.phase==='attributes'){randomAttrs();startCardDraw('innate',0);continue}if(run.phase==='card'){chooseCard(run.drawOptions[0].id);inputLocked=false;continue}if(run.phase==='decision'){chooseDecision(Math.floor(rng()*run.currentDecision.choices.length));inputLocked=false;continue}advanceOneBeat(true)}return{age:state.run.age,decisions:state.run.decisionCount,events:state.run.timeline.length,ending:state.run.ending?.title,guard}}
    finally{simulationMode=before;render()}
  }

  try{
    app.innerHTML='<main class="loading-screen"><div><div class="loading-mark">◌</div><h2>正在加载人生数据库</h2><p>一年一年，马上开始。</p></div></main>';
    const response=await fetch(`./data.json?v=${VERSION}`,{cache:'no-store'});if(!response.ok)throw new Error(`人生数据库加载失败（HTTP ${response.status}）`);DATA=await response.json();if(DATA.schemaVersion!==SCHEMA_VERSION)throw new Error(`数据版本不兼容：需要 ${SCHEMA_VERSION}，实际 ${DATA.schemaVersion}`);
    INDEX=buildIndex();state=loadState();render();window.__LIFE_BOOTED__=true;
    if(DEBUG)window.__LIFE_DEBUG__={snapshot:()=>copy(state.run),advance:()=>advanceOneBeat(true),autoFinishCurrent,forceAge:age=>{if(state.run){state.run.age=clamp(age,0,105);milestoneFacts();render()}},counts:()=>Object.fromEntries(Object.entries(INDEX.kinds).map(([k,v])=>[k,v.length]))};
  }catch(error){console.error(error);app.innerHTML=`<main class="boot-fallback"><div><div class="boot-label">启动失败</div><h1>人生数据库没有加载成功</h1><p>${esc(error.message||error)}</p></div><div class="boot-card"><p>请确认 index.html、style.css、game.js 与 data.json 位于同一目录。</p><button class="btn primary mt" onclick="location.reload()">重新加载</button></div></main>`}

  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.run)save(true)});window.addEventListener('pagehide',()=>save(true));
})();
