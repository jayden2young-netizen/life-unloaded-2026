(async()=>{
  'use strict';

  const APP_KEY='life-unloaded-2026-v1';
  const V32_BACKUP_KEY='life-unloaded-2026-v3.2-backup';
  const V401_BACKUP_KEY='life-unloaded-2026-v4.0.1-backup';
  const CORRUPT_KEY='life-unloaded-2026-corrupt-backup';
  const VERSION='4.1.0';
  const SCHEMA_VERSION=6;
  const CONTENT_REVISION=5;
  const DEBUG=new URLSearchParams(location.search).get('debug')==='1';
  const app=document.getElementById('app');
  const CARD_AGES=[18,30,50];
  const STAGE_QUOTAS={infancy:0,childhood:1,adolescence:2,youth:2,adult:3,midlife:3,preRetire:2,elder:2};
  const STAGE_NAMES={infancy:'幼年',childhood:'童年',adolescence:'青春期',youth:'青年',adult:'成家立业',midlife:'中年',preRetire:'退休前后',elder:'晚年'};
  const EMPLOYMENT_NAMES={student:'在读',employed:'稳定就业',gig:'灵活就业',selfEmployed:'自主经营',unemployed:'失业求职',retired:'退休',careLeave:'照护离岗'};
  const PARTNER_NAMES={none:'单身',dating:'恋爱中',partnered:'稳定伴侣',married:'已婚',separated:'分居',divorced:'离异',widowed:'丧偶'};
  const ARRANGEMENT_NAMES={onsite:'现场工作',remote:'远程工作',hybrid:'混合办公',splitShift:'天地班'};
  const STORYLINE_NAMES={familyMoney:'带有账单的爱',splitShift:'一天被切成两半',remoteNomad:'有 Wi-Fi 的地方，不一定是生活',franchise:'所有人都叫他老板的那几个月',childLife:'子女成长'};
  const FEATURED_STORYLINES=['familyMoney','splitShift','remoteNomad','franchise'];
  const DESIRE_THEMES={love:['relationship','marriage'],familyBelonging:['family','care'],wealth:['money','house'],stability:['career','organization'],freedom:['boundary','city','identity'],achievement:['career','education'],recognition:['identity','digital'],exploration:['city','digital'],care:['care','family'],peace:['health','identity'],body:['health','relationship'],status:['career','organization'],security:['money','house']};
  const STATUS_CASH={student:-6000,employed:18000,gig:0,selfEmployed:6000,unemployed:-18000,retired:6000,careLeave:-12000};
  const occupations={
    tier1:['互联网运营','医院行政','金融后台员工','物业工程师','平台司机','国企职员','软件外包工程师','自由设计师'],
    tier2:['制造业技术员','社区合同工','医院护士','银行柜员','物流调度员','民办教师','个体餐饮经营者','软件实施工程师'],
    county:['县中教师','事业单位职员','建材店经营者','保险业务员','货运司机','电商客服','乡镇卫生院护士','个体商户'],
    town:['种植户','养殖户','建筑劳务人员','农机维修工','快递站经营者','乡村教师','流动摊贩','外出务工人员']
  };
  const sectorForCareer=career=>/医院|护士|卫生/.test(career)?'healthcare':/教师|教育/.test(career)?'education':/金融|银行|保险/.test(career)?'finance':/互联网|软件|电商|数字/.test(career)?'digital':/制造|工程|维修|建筑/.test(career)?'industry':/司机|物流|快递|平台/.test(career)?'platform':'services';

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
  function normalizeMeta(meta={}){const fresh=defaultMeta(),seen=meta.seenContent||{},validCodex=new Set(DATA.codex.map(x=>x.id));return{...fresh,...meta,schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,settings:{...fresh.settings,...(meta.settings||{})},stats:{...fresh.stats,...(meta.stats||{})},seenContent:{events:{...(seen.events||{})},cards:{...(seen.cards||{})},families:{...(seen.families||{})},endings:{...(seen.endings||{})}},histories:Array.isArray(meta.histories)?meta.histories.slice(0,30):[],codex:Array.isArray(meta.codex)?meta.codex.filter(id=>validCodex.has(id)).slice(0,DATA.codex.length):[],recentLives:Array.isArray(meta.recentLives)?meta.recentLives.slice(0,5):[]}}

  function buildIndex(){
    const kinds={beat:[],decision:[],echo:[],blackSwan:[]},byStage={};
    for(const stage of Object.keys(DATA.stages))byStage[stage]={beat:[],decision:[],echo:[],blackSwan:[]};
    for(const event of DATA.events){(kinds[event.kind]||kinds.beat).push(event);for(const stage of event.stage||[])if(byStage[stage])byStage[stage][event.kind]?.push(event)}
    return{kinds,byStage,event:new Map(DATA.events.map(x=>[x.id,x])),family:new Map(DATA.familyArchetypes.map(x=>[x.id,x])),cards:new Map(Object.values(DATA.cards).flat().map(x=>[x.id,x])),ending:new Map(DATA.endingTitles.map(x=>[x.id,x])),endingProfile:new Map((DATA.endingProfiles||[]).map(x=>[x.id,x])),conflict:new Map((DATA.mainConflicts||[]).map(x=>[x.id,x])),echoByDecision:new Map(kinds.echo.map(x=>[x.sourceDecisionId,x]))};
  }
  function stageForAge(age){return Object.entries(DATA.stages).find(([,range])=>age>=range[0]&&age<=range[1])?.[0]||'elder'}
  function genderName(g){return g==='female'?'女性':'男性'}
  function haptic(pattern=10){if(!simulationMode&&state.meta.settings.haptic&&navigator.vibrate)navigator.vibrate(pattern)}
  function partnerStatus(run=state.run){return run.relationships?.partner?.status||'none'}
  function childAges(run=state.run){return(run.relationships?.children||[]).map(child=>Math.max(0,run.age-child.bornAt))}
  function supportScore(run=state.run){const rel=run.relationships||{},values=[rel.parents?.bond,rel.network];if(rel.partner?.status!=='none')values.push(rel.partner?.bond);if(rel.children?.length)values.push(rel.children.reduce((n,x)=>n+x.bond,0)/rel.children.length);return clamp(values.filter(Number.isFinite).reduce((n,x)=>n+x,0)/Math.max(1,values.filter(Number.isFinite).length),0,100)}
  function topDesires(run=state.run,count=3){return Object.entries(run.desires||{}).sort((a,b)=>b[1].drive-a[1].drive).slice(0,count).map(([key,value])=>({key,...value,name:DATA.desires[key]?.name||key}))}
  function tagCount(run,key){return Number(run.outcomeTags?.[key]||0)}
  function addTag(run,key,amount=1){if(key)increment(run.outcomeTags,key,amount)}
  function defaultCareer(run){const pool=occupations[run.birth?.location?.id]||occupations.tier2;return pool[stable(run.seed,`career-${run.age}`,pool.length)]}
  function repairEducationEmployment(run){
    if(!run?.employment||!run.lifeFacts)return;
    if(run.age>=22&&run.lifeFacts.education==='大学在读'){run.lifeFacts.education='大学毕业';run.milestones={...(run.milestones||{}),graduated:true}}
    if(run.age>=25&&run.employment.status==='student'){run.employment.status='unemployed';run.employment.career='毕业求职';run.employment.sector='services';run.employment.unemployedYears=Math.max(1,run.employment.unemployedYears||0)}
    if(run.employment.status==='employed'&&(!run.employment.career||/在读|学生|寻找|尚未|备考|求职/.test(run.employment.career)))run.employment.career=defaultCareer(run);
    if(run.employment.status==='gig'&&(!run.employment.career||/在读|学生/.test(run.employment.career)))run.employment.career='灵活就业';
    if(run.employment.status==='selfEmployed'&&(!run.employment.career||/在读|学生/.test(run.employment.career)))run.employment.career='自主经营';
    if(run.employment.status==='retired'&&(!run.employment.career||/在读|学生/.test(run.employment.career)))run.employment.career='退休生活';
  }

  function seededDNA(seed,birth,archetype){
    const mods=archetype?.dnaMods||{};const value=(key,base=50)=>clamp(base+stable(seed,key,71)-35+(mods[key]||0),0,100);
    const siblings=stable(seed,'siblings',100)<38?0:1+stable(seed,'siblings-count',3);
    const dna={familyClass:archetype?.familyClass||'working',siblingCount:siblings,onlyChild:siblings===0,parentControl:value('control'),emotionalExpression:value('emotionalExpression'),educationExpectation:value('educationExpectation'),genderTraditionalism:value('genderTraditionalism'),careBurden:value('careBurden'),cashflow:value('cashflow'),housing:value('housing'),hiddenDebt:value('hiddenDebt'),healthBaseline:value('healthBaseline',58),information:value('information'),riskTolerance:value('riskTolerance'),digitalLiteracy:value('digitalLiteracy'),fraudRisk:value('fraudRisk'),openness:value('openness'),medicalAccess:clamp(birth.location.mods?.medical||50,0,100)};
    for(const key of Object.keys(mods))if(dna[key]===undefined)dna[key]=value(key);return dna;
  }
  function initializeDesires(run){
    const attrMap={intellect:['achievement','exploration'],physique:['body','peace'],looks:['love','recognition'],stability:['stability','security'],social:['love','care'],ambition:['wealth','achievement','status']};
    const values={};for(const key of Object.keys(DATA.desires)){let drive=45+stable(run.seed,`desire-${key}`,21)-10;if(key==='freedom')drive+=(run.lifeDNA.parentControl-50)*.25;if(key==='familyBelonging')drive+=(run.lifeDNA.emotionalExpression-50)*.2;if(key==='stability')drive+=(run.lifeDNA.stabilityNeed??50)-50;if(key==='achievement')drive+=(run.lifeDNA.achievementNeed??50)-50;values[key]={drive:clamp(drive,10,90),fulfillment:50}}
    for(const[attr,keys]of Object.entries(attrMap))for(const key of keys){const spec=DATA.desires[key]||{min:0,max:100};values[key].drive=clamp(values[key].drive+(run.attrs[attr]-4)*4,Math.max(10,spec.min),Math.min(90,spec.max))}run.desires=values;
  }
  function chooseConflicts(run){const pool=[...(DATA.mainConflicts||[])].sort((a,b)=>{const av=a.desireKeys.reduce((n,key)=>n+(run.desires[key]?.drive||0),0)+stable(run.seed,a.id,20);const bv=b.desireKeys.reduce((n,key)=>n+(run.desires[key]?.drive||0),0)+stable(run.seed,b.id,20);return bv-av});return pool.slice(0,2).map(x=>x.id)}
  function defaultStoryline(){return{status:'inactive',step:0,route:null,startedAt:null,nextDecisionAge:null}}
  function defaultStorylines(){return Object.fromEntries(FEATURED_STORYLINES.map(id=>[id,defaultStoryline()]))}
  function ensureStoryline(run,id){return run.storylines[id]||(run.storylines[id]=defaultStoryline())}
  function normalizeEmployment(run){
    run.employment=run.employment||{status:'student',career:'在读',sector:'education',tenure:0,unemployedYears:0};
    run.employment.arrangement=['onsite','remote','hybrid','splitShift'].includes(run.employment.arrangement)?run.employment.arrangement:'onsite';
    const schedule=run.employment.schedule||{};run.employment.schedule={stability:clamp(schedule.stability??70,0,100),splitGapHours:clamp(schedule.splitGapHours??0,0,8),timezoneLoad:clamp(schedule.timezoneLoad??0,0,100)};
  }
  function normalizeV41State(run){
    normalizeEmployment(run);run.familyFinance={boundary:'separate',businessStress:0,transparency:0,reportingPressure:0,...(run.familyFinance||{})};run.familyFinance.boundary=['separate','negotiated','shared'].includes(run.familyFinance.boundary)?run.familyFinance.boundary:'separate';
    run.mobility={mode:'home',visaPressure:0,platformDependence:0,rootlessness:0,...(run.mobility||{})};run.mobility.mode=['home','domesticNomad','overseasNomad'].includes(run.mobility.mode)?run.mobility.mode:'home';
    run.business={mode:'none',status:'none',capitalInvested:0,brandLockin:0,operatingSkill:clamp(35+(run.attrs?.ambition||4)*4+(run.lifeFacts?.skills||0)*3,0,100),sunkCost:0,...(run.business||{})};run.business.mode=['none','independent','franchise'].includes(run.business.mode)?run.business.mode:'none';run.business.status=['none','testing','operating','closed'].includes(run.business.status)?run.business.status:'none';
    run.storylines={...defaultStorylines(),...(run.storylines||{})};for(const[id,record]of Object.entries(run.storylines))run.storylines[id]={...defaultStoryline(),...record,status:['inactive','active','resolved','abandoned'].includes(record?.status)?record.status:'inactive',step:Math.max(0,Number(record?.step)||0)};
    run.storylineSlots={main:null,secondary:null,...(run.storylineSlots||{})};run.storylineDecisionCount=Math.max(0,Number(run.storylineDecisionCount)||0);return run;
  }
  function syncDerivedFacts(run=state.run){if(!run)return;repairEducationEmployment(run);run.lifeFacts.jobStatus=run.employment.status;run.lifeFacts.career=run.employment.career;run.lifeFacts.relationship=partnerStatus(run);run.lifeFacts.children=run.relationships.children.length;run.lifeFacts.debt=run.res.debt>0?1:0;run.res.relation=supportScore(run)}

  function createRun(seed=makeSeed()){
    const run={seed,rngState:hashSeed(seed),schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,contentRevision:CONTENT_REVISION,phase:'birth',age:0};state.run=run;
    run.gender=chance(.5)?'female':'male';
    const location=weightedPick(DATA.locations);const recentFamilies=new Set(state.meta.recentLives.map(x=>x.family));
    const family=weightedPick(DATA.familyArchetypes,item=>{const seen=state.meta.seenContent.families[contentKey(item)]||0;return(item.weight||1)*(item.locationAffinity?.includes(location.id)?1.8:1)*(recentFamilies.has(item.id)?.25:1)*(seen===0?1.4:seen===1?.7:.4)});increment(state.meta.seenContent.families,contentKey(family));
    const secret=weightedPick(DATA.familySecrets,item=>item.familyClasses?.includes(family.familyClass)?2.2:1);
    run.birth={location,family:{archetype:family,father:pick(occupations[location.id]),mother:pick(occupations[location.id]),secret,house:['租住房','按揭商品房','老城区住房','自建房','单位住房'][stable(seed,'house',5)]}};
    run.lifeDNA=seededDNA(seed,run.birth,family);
    run.attrs={intellect:1,physique:1,looks:1,stability:1,social:1,ambition:1};run.points=20;
    run.res={cash:clamp(Math.round((run.lifeDNA.cashflow-35)*1000),0,60000),assets:run.lifeDNA.housing>70?420000:run.lifeDNA.housing>48?120000:20000,debt:run.lifeDNA.hiddenDebt>72?90000:0,health:clamp(62+run.lifeDNA.healthBaseline*.25,45,92),spirit:72,relation:60};
    run.employment={status:'student',career:'在读',sector:'education',tenure:0,unemployedYears:0,arrangement:'onsite',schedule:{stability:70,splitGapHours:0,timezoneLoad:0}};
    run.relationships={parents:{alive:2,bond:clamp(45+run.lifeDNA.emotionalExpression*.25,35,80),careLoad:0},partner:{status:'none',bond:0,sinceAge:null},children:[],network:clamp(42+run.lifeDNA.information*.15+(location.mods.network-50)*.2,30,78)};
    run.lifeFacts={education:'未入学',jobStatus:'student',career:'尚未进入社会',city:location.id,housing:'family',relationship:'none',children:0,debt:run.res.debt?1:0,skills:0,digitalExperience:0,workExperience:0,savings:0,boundaries:0,careDuty:0};
    initializeDesires(run);run.mainConflicts=chooseConflicts(run);
    run.memories=[];run.pressures={money:0,family:0,career:0,body:0,loneliness:0};run.scheduledEchoes=[];run.flags={};run.outcomeTags={};run.crisisYears={employment:0,money:0,health:0};run.familyFinance={boundary:'separate',businessStress:0,transparency:0,reportingPressure:0};run.mobility={mode:'home',visaPressure:0,platformDependence:0,rootlessness:0};run.business={mode:'none',status:'none',capitalInvested:0,brandLockin:0,operatingSkill:clamp(35+run.attrs.ambition*4,0,100),sunkCost:0};run.storylines=defaultStorylines();run.storylineSlots={main:null,secondary:null};run.storylineDecisionCount=0;
    for(const tag of family.advantageTags||[]){addTag(run,`origin:${tag}`);if(tag==='support')run.relationships.network=clamp(run.relationships.network+8,0,100);if(tag==='evidence')run.lifeFacts.evidenceHabit=1;if(tag==='skill')run.lifeFacts.skills++;if(tag==='resilience')run.res.spirit=clamp(run.res.spirit+5,0,100);if(tag==='resource')run.res.cash+=5000}
    for(const tag of family.riskTags||[]){addTag(run,`risk:${tag}`);if(run.pressures[tag]!==undefined)run.pressures[tag]=10;else if(tag==='care')run.pressures.family=10;else run.pressures.body=6}
    run.cards=[];run.cardAges=[];run.adversityDraws=0;run.timeline=[];run.usedEvents=[];run.usedDecisions=[];run.usedEchoes=[];run.seenThisYear=[];
    run.stageDecisionCounts={};run.decisionCount=0;run.targetDecisions=12+stable(seed,'decision-target',4);run.lastDecisionAge=-9;
    run.yearQueue=[];run.yearStarted=false;run.currentDecision=null;run.badStreak=0;run.echoCount=0;run.secretRevealed=false;run.familyEchoDone=false;run.swanCount=0;run.lastSwanAge=-20;run.lastMajorAge=-9;run.originBeatCount=0;run.milestones={};run.conflictDecisionStages={};
    const baseLife=64+stable(seed,'lifespan',31);const bodyBonus=Math.round((run.lifeDNA.healthBaseline-50)/10)+(run.attrs.physique-1);run.deathAge=clamp(baseLife+bodyBonus,42,101);
    run.startNet=run.res.assets+run.res.cash-run.res.debt;run.ending=null;normalizeV41State(run);syncDerivedFacts(run);return run;
  }

  function migrateRun(old){
    if(!old||typeof old!=='object'||![5,SCHEMA_VERSION].includes(Number(old.schemaVersion)))return null;
    old.schemaVersion=SCHEMA_VERSION;old.gameVersion=VERSION;old.contentRevision=CONTENT_REVISION;old.yearStarted=Boolean(old.yearStarted);old.scheduledEchoes=Array.isArray(old.scheduledEchoes)?old.scheduledEchoes.filter(item=>INDEX.event.get(item.eventId)?.choiceOutcomes?.[item.memoryKey]):[];old.usedEchoes=Array.isArray(old.usedEchoes)?old.usedEchoes:[];old.outcomeTags=old.outcomeTags||{};old.flags=old.flags||{};old.crisisYears=old.crisisYears||{employment:0,money:0,health:0};old.conflictDecisionStages=old.conflictDecisionStages||{};old.milestones=old.milestones||{};normalizeV41State(old);
    if(old.currentDecision?.id){const current=INDEX.event.get(old.currentDecision.id);if(current?.kind==='decision')old.currentDecision=current;else{old.currentDecision=null;old.currentCrisis=null;if(old.phase==='decision'){old.phase='playing';old.yearStarted=false}}}
    syncDerivedFacts(old);return old;
  }

  function loadState(){
    const base={view:'home',meta:defaultMeta(),run:null,overlay:null,toast:null,recovery:null};let raw='';
    try{raw=localStorage.getItem(APP_KEY)||''}catch(error){base.recovery={error:String(error),raw};return base}if(!raw)return base;
    try{const parsed=JSON.parse(raw);base.meta=normalizeMeta(parsed.meta||{});state=base;const oldSchema=Number(parsed.schemaVersion||parsed.run?.schemaVersion||3);
      if(oldSchema===5){if(!localStorage.getItem(V401_BACKUP_KEY))localStorage.setItem(V401_BACKUP_KEY,raw);base.run=migrateRun(parsed.run);base.meta.migrationNotice=true;localStorage.setItem(APP_KEY,JSON.stringify({schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,meta:base.meta,run:base.run}))}
      else if(oldSchema<5){if(!localStorage.getItem(V32_BACKUP_KEY))localStorage.setItem(V32_BACKUP_KEY,raw);base.meta.migrationNotice=true;base.run=null}
      else base.run=migrateRun(parsed.run);return base}
    catch(error){try{localStorage.setItem(CORRUPT_KEY,raw)}catch{}base.recovery={error:String(error),raw};return base}
  }
  function persist(){if(simulationMode||state.recovery)return;try{localStorage.setItem(APP_KEY,JSON.stringify({schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,meta:state.meta,run:state.run}))}catch{showToast('存档空间不足，请先导出档案')}}
  function save(immediate=false){if(simulationMode)return;if(saveTimer)clearTimeout(saveTimer);if(immediate)persist();else saveTimer=setTimeout(()=>{saveTimer=null;persist()},120)}

  function factsMeet(facts={},run=state.run){
    const ages=childAges(run),status=run.employment.status,relationship=partnerStatus(run);
    if(facts.childrenMin!==undefined&&ages.length<facts.childrenMin)return false;
    if(facts.childrenMax!==undefined&&ages.length>facts.childrenMax)return false;
    if(facts.childAgeAny&&!ages.some(age=>age>=facts.childAgeAny[0]&&age<=facts.childAgeAny[1]))return false;
    if(facts.relationshipAny&&!facts.relationshipAny.includes(relationship))return false;
    if(facts.jobAny&&!facts.jobAny.includes(status))return false;
    if(facts.jobNone?.includes(status))return false;
    if(facts.skillsMin!==undefined&&Number(run.lifeFacts.skills||0)<facts.skillsMin)return false;
    if(facts.digitalExperienceMin!==undefined&&Number(run.lifeFacts.digitalExperience||0)<facts.digitalExperienceMin)return false;
    if(facts.siblingMin!==undefined&&Number(run.lifeDNA.siblingCount||0)<facts.siblingMin)return false;
    if(facts.housingAny&&!facts.housingAny.includes(run.lifeFacts.housing))return false;
    if(facts.arrangementAny&&!facts.arrangementAny.includes(run.employment.arrangement))return false;
    if(facts.sectorAny&&!facts.sectorAny.includes(run.employment.sector))return false;
    if(facts.mobilityModeAny&&!facts.mobilityModeAny.includes(run.mobility.mode))return false;
    if(facts.businessModeAny&&!facts.businessModeAny.includes(run.business.mode))return false;
    if(facts.businessStatusAny&&!facts.businessStatusAny.includes(run.business.status))return false;
    if(facts.flagsAll?.some(flag=>!run.flags[flag]))return false;
    if(facts.flagsNone?.some(flag=>run.flags[flag]))return false;return true;
  }
  function eligible(event,run=state.run){
    if(run.age<event.ageMin||run.age>event.ageMax)return false;if(run.usedEvents.includes(event.id))return false;
    const req=event.requirements||{};if(req.facts&&!factsMeet(req.facts,run))return false;if(req.factsAny?.length&&!req.factsAny.some(facts=>factsMeet(facts,run)))return false;
    if(req.memoriesAny?.length&&!req.memoriesAny.some(key=>run.memories.some(m=>m.key===key)))return false;
    if(req.locationAny&&!req.locationAny.includes(run.birth.location.id))return false;
    if(req.familyAny&&!req.familyAny.includes(run.birth.family.archetype.id))return false;
    if(req.conflictAny&&!req.conflictAny.some(id=>run.mainConflicts.includes(id)))return false;
    if(req.desireTopAny&&!topDesires(run).some(x=>req.desireTopAny.includes(x.key)))return false;
    if(req.outcomeTagsAny&&!req.outcomeTagsAny.some(tag=>tagCount(run,tag)))return false;
    if(req.outcomeTagsAll?.some(tag=>!tagCount(run,tag)))return false;
    if(req.storyline){const record=ensureStoryline(run,req.storyline.id);if(req.storyline.statusAny&&!req.storyline.statusAny.includes(record.status))return false;if(req.storyline.stepMin!==undefined&&record.step<req.storyline.stepMin)return false;if(req.storyline.stepMax!==undefined&&record.step>req.storyline.stepMax)return false;if(req.storyline.routeAny&&!req.storyline.routeAny.includes(record.route))return false}
    for(const[key,value]of Object.entries(req.resourceMin||{}))if(Number(run.res[key]||0)<value)return false;
    for(const[key,value]of Object.entries(req.resourceMax||{}))if(Number(run.res[key]||0)>value)return false;
    if(event.gender?.length&&!event.gender.includes(run.gender))return false;return true;
  }
  function eventWeight(event){
    const seen=state.meta.seenContent.events[contentKey(event)]||0;let weight=(event.weight||10)*(seen===0?2.2:seen===1?.65:.25);
    if(state.meta.recentLives[0]?.events?.includes(contentKey(event)))weight*=.2;
    if(event.theme===state.run.timeline.at(-1)?.theme)weight*=.45;
    if(event.intensity==='high'&&state.run.age-state.run.lastMajorAge<2)weight*=.18;
    if(cardMechanics().includes('network')&&event.theme==='relationship')weight*=1.2;
    if(cardMechanics().includes('digital')&&event.theme==='digital')weight*=1.2;
    const attrs=event.relevantAttrs||[];if(attrs.length){const average=attrs.reduce((n,key)=>n+(state.run.attrs[key]||4),0)/attrs.length;weight*=1+(average-4)*.08}
    const location=state.run.birth.location.id,locationMods=state.run.birth.location.mods||{};if((location==='tier1'&&['career','digital','house'].includes(event.theme))||(location==='county'&&['family','relationship'].includes(event.theme))||(location==='town'&&['family','care'].includes(event.theme)))weight*=1.25;
    if(event.theme==='city')weight*=clamp(1+(locationMods.mobility-50)*.008,.7,1.35);if(event.theme==='relationship')weight*=clamp(1+(locationMods.network-50)*.005,.75,1.3);if(event.theme==='health')weight*=clamp(1+(50-locationMods.medical)*.005,.8,1.25);
    const desireKeys=topDesires(state.run).filter(item=>(DESIRE_THEMES[item.key]||[]).includes(event.theme));if(desireKeys.length)weight*=1.25;
    if(state.run.mainConflicts.some(id=>INDEX.conflict.get(id)?.themes?.includes(event.theme)))weight*=1.35;
    if(state.run.employment.status==='unemployed'&&['career','money'].includes(event.theme))weight*=1.6;
    if(state.run.res.health<40&&event.theme==='health')weight*=1.7;
    if(state.run.age<18&&state.run.originBeatCount<2&&['family','education'].includes(event.theme))weight*=1.8;
    return Math.max((event.weight||10)*.4,Math.min((event.weight||10)*2.5,weight));
  }
  function selectFrom(kind){let pool=(INDEX.byStage[stageForAge(state.run.age)]?.[kind]||INDEX.kinds[kind]).filter(event=>eligible(event)&&!(kind==='decision'&&event.storyline));if(kind==='beat'&&state.run.age<18&&state.run.originBeatCount<2){const originPool=pool.filter(event=>['family','education'].includes(event.theme));if(originPool.length)pool=originPool}return weightedPick(pool,eventWeight)}

  function cardMechanics(){return state.run.cards.map(id=>INDEX.cards.get(id)?.mechanic).filter(Boolean)}
  function applyCardShield(event,effects){
    const mechanics=cardMechanics(),used=state.run.cardUses||(state.run.cardUses={});
    const use=(mechanic,condition,fn)=>{const card=state.run.cards.find(id=>INDEX.cards.get(id)?.mechanic===mechanic&&!used[id]);if(card&&condition){fn();used[card]=true;addTag(state.run,`cardUsed:${mechanic}`)}};
    use('healthUp',event.theme==='health'&&Number(effects.resources?.health)<0,()=>effects.resources.health=Math.ceil(effects.resources.health/2));
    use('save',(event.theme==='money'||event.theme==='house')&&Number(effects.resources?.cash)<0,()=>effects.resources.cash=Math.ceil(effects.resources.cash/2));
    use('evidence',['career','money','digital'].includes(event.theme),()=>{effects.resources={...(effects.resources||{}),spirit:(effects.resources?.spirit||0)+2}});
    use('network',['relationship','family','care'].includes(event.theme),()=>{effects.resources={...(effects.resources||{}),relation:(effects.resources?.relation||0)+2}});
  }
  function applyEffects(raw={},event={theme:'ordinary'},context={}){
    const effects=copy(raw);applyCardShield(event,effects);const run=state.run,changed=[];
    for(const[key,rawValue]of Object.entries(effects.resources||{})){let value=Number(rawValue);if(key==='relation'){run.relationships.network=clamp(run.relationships.network+value,0,100);continue}if(key==='health'&&value>0)value=Math.round(value*clamp(.72+run.attrs.physique*.04+(run.birth.location.mods.medical||50)/500,.85,1.25));run.res[key]=clamp((run.res[key]||0)+value,key==='cash'?-999999999:0,key==='cash'||key==='assets'||key==='debt'?999999999:100);changed.push(key)}
    if(effects.employment){const previous=run.employment.status,patch={...effects.employment};delete patch.schedule;delete patch.scheduleDelta;if(['employed','gig','selfEmployed'].includes(previous)){run.employment.previousCareer=run.employment.career;run.employment.previousSector=run.employment.sector}run.employment={...run.employment,...patch};if(effects.employment.schedule)run.employment.schedule={...run.employment.schedule,...effects.employment.schedule};for(const[key,value]of Object.entries(effects.employment.scheduleDelta||{}))run.employment.schedule[key]=clamp((run.employment.schedule[key]||0)+Number(value),0,key==='splitGapHours'?8:100);if(run.employment.status!==previous){run.employment.tenure=0;run.employment.unemployedYears=run.employment.status==='unemployed'?Math.max(1,run.employment.unemployedYears||0):0;if(run.employment.status==='employed'&&(!run.employment.career||/在读|学生|寻找|尚未|备考|求职/.test(run.employment.career)))run.employment.career=defaultCareer(run);if(run.employment.status==='gig'&&!effects.employment.career)run.employment.career='灵活就业';if(run.employment.status==='selfEmployed'&&!effects.employment.career)run.employment.career='自主经营';if(run.employment.status==='retired'&&!effects.employment.career)run.employment.career='退休生活';run.employment.sector=effects.employment.sector||sectorForCareer(run.employment.career||'');if(!['employed','gig','selfEmployed'].includes(run.employment.status)&&!effects.employment.arrangement){run.employment.arrangement='onsite';run.employment.schedule={stability:70,splitGapHours:0,timezoneLoad:0}}}}
    for(const[key,value]of Object.entries(effects.lifeFacts||{})){if(typeof value==='number'&&typeof run.lifeFacts[key]==='number')run.lifeFacts[key]+=value;else run.lifeFacts[key]=value}
    for(const[key,value]of Object.entries(effects.pressures||{}))run.pressures[key]=clamp((run.pressures[key]||0)+Number(value),0,100);
    const rel=effects.relationships||{};if(rel.partnerStatus){run.relationships.partner.status=rel.partnerStatus;run.relationships.partner.sinceAge=run.age;if(rel.partnerStatus==='none')run.relationships.partner.bond=0}
    if(rel.partnerBond)run.relationships.partner.bond=clamp(run.relationships.partner.bond+Number(rel.partnerBond),0,100);
    if(rel.parentsBond)run.relationships.parents.bond=clamp(run.relationships.parents.bond+Number(rel.parentsBond),0,100);
    if(rel.network)run.relationships.network=clamp(run.relationships.network+Number(rel.network),0,100);
    if(rel.addChild)for(let i=0;i<Number(rel.addChild);i++)run.relationships.children.push({bornAt:run.age,bond:clamp(55+Number(rel.childBond||0),0,100)});
    if(rel.childBond&&run.relationships.children.length)for(const child of run.relationships.children)child.bond=clamp(child.bond+Number(rel.childBond),0,100);
    for(const[key,value]of Object.entries(effects.desires||{})){const desire=run.desires[key],spec=DATA.desires[key];if(!desire||!spec)continue;const field=event.kind==='secret'?'drive':'fulfillment';desire[field]=clamp(desire[field]+Number(value),field==='drive'?Math.max(10,spec.min):spec.min,field==='drive'?Math.min(90,spec.max):spec.max)}
    for(const flag of effects.flagsAdd||[])run.flags[flag]=true;for(const tag of effects.outcomeTagsAdd||[])addTag(run,tag);
    const applyStructured=(target,patch,ranges)=>{for(const[key,value]of Object.entries(patch||{})){if(typeof value==='number'){const range=ranges[key]||[0,100];target[key]=clamp((target[key]||0)+value,range[0],range[1])}else target[key]=value}};
    applyStructured(run.familyFinance,effects.familyFinance,{businessStress:[0,100],transparency:[0,100],reportingPressure:[0,100]});applyStructured(run.mobility,effects.mobility,{visaPressure:[0,100],platformDependence:[0,100],rootlessness:[0,100]});applyStructured(run.business,effects.business,{capitalInvested:[0,999999999],brandLockin:[0,100],operatingSkill:[0,100],sunkCost:[0,100]});
    if(effects.storylineAdvance){const spec=effects.storylineAdvance,record=ensureStoryline(run,spec.id),wasInactive=record.status==='inactive';record.status=spec.status||record.status;record.step=Math.max(0,Number(spec.nextStep??record.step));record.route=spec.route??record.route;if(wasInactive&&record.status!=='inactive')record.startedAt=run.age;const min=Math.max(0,Number(spec.delayMin)||0),max=Math.max(min,Number(spec.delayMax??min));record.nextDecisionAge=run.age+min+(max>min?Math.floor(rng()*(max-min+1)):0);if(wasInactive&&FEATURED_STORYLINES.includes(spec.id)){if(!run.storylineSlots.main)run.storylineSlots.main=spec.id;else if(run.storylineSlots.main!==spec.id&&!run.storylineSlots.secondary)run.storylineSlots.secondary=spec.id}}
    if(effects.scheduleEcho&&context.memoryKey&&chance(Number(effects.scheduleEcho.chance??1))){const spec=effects.scheduleEcho,echo=INDEX.echoByDecision.get(event.id),eventId=spec.eventId||echo?.id;if(eventId){const span=Math.max(0,spec.delayMax-spec.delayMin),dueAge=run.age+spec.delayMin+Math.floor(rng()*(span+1));run.scheduledEchoes.push({id:`${eventId}:${context.memoryKey}`,eventId,memoryKey:context.memoryKey,sourceChoiceId:context.id,dueAge,expiresAge:dueAge+4})}}
    syncDerivedFacts(run);unlockCodex(event,...(effects.outcomeTagsAdd||[]));
    return changed;
  }
  function unlockCodex(...sources){
    const run=state.run;if(!run)return;const ids=new Set(sources.filter(x=>typeof x==='object').map(x=>x?.id).filter(Boolean));
    for(const entry of DATA.codex){if(state.meta.codex.includes(entry.id))continue;const rule=entry.unlockRules||{},tagMatch=rule.outcomeTagsAny?.some(tag=>tagCount(run,tag)),eventMatch=rule.eventIdsAny?.some(id=>ids.has(id)),stateMatch=rule.statesAny?.some(value=>[run.employment.status,partnerStatus(run)].includes(value));if(tagMatch||eventMatch||stateMatch)state.meta.codex.push(entry.id)}
  }
  function addTimeline(event,text=event.text,kind=event.kind){
    const run=state.run;run.timeline.push({age:run.age,icon:event.icon||'•',text,kind,theme:event.theme,id:event.id});if(run.timeline.length>180)run.timeline.shift();
    if(kind==='echo'){run.echoCount++;run.usedEchoes.push(event.id)}if(event.intensity==='high')run.lastMajorAge=run.age;if(run.age<18&&['family','education'].includes(event.theme))run.originBeatCount++;
    run.usedEvents.push(event.id);increment(state.meta.seenContent.events,contentKey(event));unlockCodex(event,text);
  }
  function addChoiceTimeline(event,choice){
    const run=state.run;run.timeline.push({age:run.age,icon:event.icon||'•',text:`${event.prompt} 你选了“${choice.text}”。${choice.resultText}`,kind:'decision',theme:event.theme,id:event.id,hints:choice.consequenceHints||[]});if(run.timeline.length>180)run.timeline.shift();
    run.usedEvents.push(event.id);increment(state.meta.seenContent.events,contentKey(event));unlockCodex(event,choice.text,choice.resultText,choice.consequenceHints?.join(' '));
  }
  function addCardTimeline(card){
    const run=state.run;run.timeline.push({age:run.age,icon:card.omenIcon||'🃏',text:`抽到《${card.displayName}》：${card.effectHint}`,kind:'card',theme:'card',id:card.id});if(run.timeline.length>180)run.timeline.shift();unlockCodex(card);
  }
  function milestoneFacts(run=state.run){
    const age=run.age;if(age>=7&&!run.milestones.primary){run.lifeFacts.education='小学';run.milestones.primary=true}if(age>=13&&!run.milestones.middle){run.lifeFacts.education='初中';run.milestones.middle=true}if(age>=16&&!run.milestones.secondary){run.lifeFacts.education=run.attrs.intellect>=5?'普通高中':'职校或高中';run.milestones.secondary=true}
    if(age>=19&&!run.milestones.education){const education=run.birth.location.mods.education+run.lifeDNA.educationExpectation+(run.attrs.intellect-4)*10+(run.lifeFacts.educationProgress||0)*8;run.lifeFacts.education=education>=145?'大学在读':education>=112?'大专或职校毕业':'中学毕业';run.milestones.education=true}
    if(age>=22&&run.lifeFacts.education==='大学在读'){run.lifeFacts.education='大学毕业';run.milestones.graduated=true}
    if(age>=25&&run.employment.status==='student'){run.employment.status='unemployed';run.employment.career='毕业求职';run.employment.sector='services';run.employment.unemployedYears=Math.max(1,run.employment.unemployedYears||0)}
    repairEducationEmployment(run);
    if(age>=60&&run.employment.status==='employed'&&run.attrs.stability>=5&&!run.milestones.retired){run.employment.status='retired';run.employment.career='退休生活';run.milestones.retired=true;addTag(run,'retired')}
    syncDerivedFacts(run);
  }

  function estimatedIncome(run=state.run){const base={student:30000,employed:90000,gig:60000,selfEmployed:75000,unemployed:24000,retired:48000,careLeave:30000}[run.employment.status]||30000;return Math.max(30000,base+(run.lifeFacts.skills||0)*6000)}
  function activeCrisis(run=state.run){if(run.crisisYears.employment>=2)return'employment';if(run.crisisYears.money>=2)return'money';if(run.crisisYears.health>=2)return'health';return null}
  function settleYear(run=state.run){
    if(run.age<19||run.lastSettledAge===run.age)return;run.lastSettledAge=run.age;
    const previous={...run.crisisYears},pressureRecovery=run.attrs.stability>=7?2:1;for(const key of Object.keys(run.pressures))run.pressures[key]=Math.max(0,run.pressures[key]-pressureRecovery);
    let cashFlow=STATUS_CASH[run.employment.status]||0;if(run.employment.status==='gig')cashFlow=-6000+stable(run.seed,`gig-${run.age}`,24001);const cost=run.birth.location.mods.cost;cashFlow+=(cost>=70?-10000:cost>=50?-4000:cost>=30?0:2000)+(run.attrs.stability-4)*2000;
    const schedule=run.employment.schedule;if(run.employment.arrangement==='splitShift'){const gap=schedule.splitGapHours;run.pressures.body=clamp(run.pressures.body+Math.max(2,Math.round(gap*.8))-(run.attrs.stability>=7?1:0),0,100);run.pressures.family=clamp(run.pressures.family+Math.max(1,Math.round(gap*.45)),0,100);run.res.spirit=clamp(run.res.spirit-Math.max(1,Math.round(gap*.35)),0,100);if(schedule.stability<45){run.relationships.network=clamp(run.relationships.network-2,0,100);if(partnerStatus(run)!=='none')run.relationships.partner.bond=clamp(run.relationships.partner.bond-2,0,100)}}
    if(['remote','hybrid'].includes(run.employment.arrangement)){cashFlow+=run.employment.arrangement==='remote'?3000:1500;if(run.mobility.mode==='home'&&run.employment.arrangement==='remote')run.pressures.loneliness=clamp(run.pressures.loneliness+2,0,100);if(schedule.timezoneLoad>30){run.pressures.body=clamp(run.pressures.body+Math.ceil(schedule.timezoneLoad/25),0,100);run.res.spirit=clamp(run.res.spirit-Math.ceil(schedule.timezoneLoad/35),0,100)}if(run.mobility.mode==='overseasNomad'){cashFlow-=6000+Math.round(run.mobility.visaPressure*40);run.pressures.family=clamp(run.pressures.family+2,0,100);run.mobility.visaPressure=clamp(run.mobility.visaPressure+2,0,100)}if(run.mobility.platformDependence>50)cashFlow+=stable(run.seed,`platform-${run.age}`,16001)-10000;else if((run.lifeFacts.skills||0)>=2)cashFlow+=4000}
    if(run.familyFinance.businessStress>=40){run.pressures.family=clamp(run.pressures.family+Math.ceil(run.familyFinance.businessStress/25),0,100);run.pressures.money=clamp(run.pressures.money+2,0,100)}if(run.familyFinance.boundary==='shared'&&run.familyFinance.reportingPressure>=50)run.res.spirit=clamp(run.res.spirit-2,0,100);
    if(run.business.status==='operating'){const locationDrag=cost>=70?9000:cost>=50?5000:2000,skillGain=(run.business.operatingSkill-50)*260,variance=stable(run.seed,`business-${run.age}`,30001)-15000;let businessFlow=skillGain+variance-locationDrag;if(run.business.mode==='franchise')businessFlow-=5000+run.business.brandLockin*120;else businessFlow+=2000;businessFlow=clamp(Math.round(businessFlow),-30000,30000);cashFlow+=businessFlow;run.business.sunkCost=clamp(run.business.sunkCost+(businessFlow<0?4:1),0,100);if(businessFlow<0){run.familyFinance.businessStress=clamp(run.familyFinance.businessStress+5,0,100);run.pressures.money=clamp(run.pressures.money+5,0,100);run.res.spirit=clamp(run.res.spirit-3,0,100);run.relationships.parents.bond=clamp(run.relationships.parents.bond-1,0,100)}else{run.business.operatingSkill=clamp(run.business.operatingSkill+2,0,100);run.familyFinance.businessStress=clamp(run.familyFinance.businessStress-2,0,100)}if(run.business.mode==='franchise'&&run.business.operatingSkill>=70&&run.business.brandLockin<=45&&run.res.cash>=30000&&cost<70)addTag(run,'franchiseSurvivor')}
    const minors=childAges(run).filter(age=>age<18).length;cashFlow-=minors*8000;if(run.lifeFacts.careDuty>0)cashFlow-=6000;if(['partnered','married'].includes(partnerStatus(run))&&run.relationships.partner.bond>=60)cashFlow+=6000;
    run.res.cash+=cashFlow;run.res.debt=Math.round(run.res.debt*1.06);const principal=Math.min(run.res.cash,Math.round(run.res.debt*.05));if(principal>0){run.res.cash-=principal;run.res.debt-=principal}
    if(run.res.cash<0){run.res.debt+=Math.abs(run.res.cash);run.res.cash=0;run.pressures.money=clamp(run.pressures.money+8,0,100)}
    if(run.employment.status==='unemployed'){run.employment.unemployedYears++;run.pressures.career=clamp(run.pressures.career+6,0,100);run.pressures.money=clamp(run.pressures.money+5,0,100)}else{run.employment.unemployedYears=0;run.employment.tenure++}
    if(run.pressures.body>=70)run.res.health=clamp(run.res.health-2,0,100);else if(run.pressures.body>=40)run.res.health=clamp(run.res.health-1,0,100);else if(run.attrs.physique>=6&&run.res.health<run.lifeDNA.healthBaseline)run.res.health=clamp(run.res.health+1,0,100);
    const debtRatio=run.res.debt/estimatedIncome(run);run.crisisYears.employment=run.employment.status==='unemployed'?run.crisisYears.employment+1:0;run.crisisYears.money=debtRatio>1.5?run.crisisYears.money+1:0;run.crisisYears.health=run.res.health<30?run.crisisYears.health+1:0;
    if(debtRatio>.5)run.pressures.money=clamp(run.pressures.money+(debtRatio>1.5?8:3),0,100);if(run.res.health<40)run.pressures.body=clamp(run.pressures.body+3,0,100);
    for(const key of Object.keys(previous))if(previous[key]>=2&&run.crisisYears[key]===0)addTag(run,'recovery');syncDerivedFacts(run);
  }
  function crisisCandidates(type){
    if(!type)return[];return(INDEX.byStage[stageForAge(state.run.age)]?.decision||[]).filter(event=>!event.storyline&&eligible(event)).filter(event=>event.choices.some(choice=>{
      const effects=choice.effects||{};if(type==='employment')return['employed','gig','selfEmployed'].includes(effects.employment?.status)||Number(effects.lifeFacts?.skills)>0;
      if(type==='money')return Number(effects.resources?.cash)>0||['save','legal','cashUp'].some(tag=>effects.outcomeTagsAdd?.includes(tag));
      return Number(effects.resources?.health)>0||effects.outcomeTagsAdd?.includes('healthUp');
    }))
  }
  function crisisDecision(type){return weightedPick(crisisCandidates(type),eventWeight)}
  function dueEcho(){const run=state.run,schedule=run.scheduledEchoes.filter(x=>x.dueAge<=run.age&&x.expiresAge>=run.age&&!run.usedEchoes.includes(x.eventId)).sort((a,b)=>a.dueAge-b.dueAge)[0];if(!schedule)return null;const event=INDEX.event.get(schedule.eventId);if(!event)return null;const outcome=event.choiceOutcomes?.[schedule.memoryKey];return{...event,runtimeText:outcome?.text||event.text,runtimeEffects:outcome?.effects||event.effects,scheduleId:schedule.id}}
  function dueSecret(){const run=state.run,secret=run.birth.family.secret;if(run.secretRevealed||!secret||run.age<secret.age)return null;return{...secret,kind:'secret',intensity:'high',runtimeText:`${secret.name}：${secret.text}`,runtimeEffects:secret.effects}}
  function dueFamilyEcho(){const run=state.run,text=run.birth.family.archetype.lateEcho;if(run.familyEchoDone||run.age<68||!text)return null;return{id:`family_echo_${run.birth.family.archetype.id}`,kind:'familyEcho',ageMin:68,ageMax:105,icon:'↩️',text,runtimeText:text,theme:'family',intensity:'medium',effects:{relationships:{parentsBond:3},desires:{familyBelonging:3},outcomeTagsAdd:['familyEcho']},contentRevision:CONTENT_REVISION}}

  function revealNext(){
    const run=state.run;if(run.phase!=='playing'||!run.yearQueue.length)return false;
    const event=run.yearQueue.shift();applyEffects(event.runtimeEffects||event.effects||{},event);addTimeline(event,event.runtimeText||event.text,event.kind);run.seenThisYear.push(event.id);
    if(event.kind==='secret')run.secretRevealed=true;if(event.kind==='familyEcho')run.familyEchoDone=true;if(event.scheduleId)run.scheduledEchoes=run.scheduledEchoes.filter(x=>x.id!==event.scheduleId);
    if(['health','money','career'].includes(event.theme)&&event.tone!=='light')run.badStreak++;else run.badStreak=Math.max(0,run.badStreak-1);
    save();render();return true;
  }
  function beginYear(){
    const run=state.run;if(run.age>run.deathAge||run.age>105){finishLife();return true}milestoneFacts(run);run.seenThisYear=run.timeline.filter(item=>item.age===run.age).map(item=>item.id);run.scheduledEchoes=run.scheduledEchoes.filter(item=>item.expiresAge>=run.age);
    const dueCard=CARD_AGES.find(age=>run.age>=age&&!run.cardAges.includes(age));if(dueCard!==undefined){startCardDraw('stage',dueCard);return}
    if(run.badStreak>=3&&run.age>=18&&run.adversityDraws<1){run.adversityDraws++;startCardDraw('adversity',run.age);return}
    run.yearStarted=true;const capacity=Math.max(0,2-run.seenThisYear.length);if(!capacity){run.yearQueue=[];return false}
    const crisis=activeCrisis(run),special=crisis?null:dueSecret()||dueEcho()||dueFamilyEcho();let primary=selectFrom('beat');
    if(!primary){primary={id:`quiet_${run.age}`,kind:'beat',icon:'·',text:'这一年没有大事，日子照常往前。',theme:'ordinary',effects:{},contentRevision:CONTENT_REVISION}}
    run.yearQueue=[primary];if(special&&capacity>1)run.yearQueue.push(special);
    if(!special&&!crisis&&capacity>1&&chance(.20)){const second=selectFrom('beat');if(second&&second.id!==primary.id)run.yearQueue.push(second)}
    const swanRate=run.age<18?.005:run.age<=65?.009:.006;if(run.swanCount<2&&run.age-run.lastSwanAge>=10&&chance(swanRate)){const swan=selectFrom('blackSwan');if(swan){run.yearQueue[special&&run.yearQueue.length>1?0:Math.min(1,run.yearQueue.length-1)]=swan;run.swanCount++;run.lastSwanAge=run.age}}
    run.yearQueue=run.yearQueue.slice(0,capacity);
    return false;
  }
  function transitionDecision(){const run=state.run;if(run.age<21||run.age>24||run.employment.status!=='student'||run.milestones.workTransition)return null;const event=INDEX.event.get('decision_036');return event&&eligible(event)?event:null}
  function civilServiceDecision(){const run=state.run,event=INDEX.event.get('decision_037');if(!event||run.decisionCount>=run.targetDecisions)return null;return eligible(event)?event:null}
  function storylineStartWeight(event){const run=state.run,id=event.storyline.id,top=new Set(topDesires(run).map(x=>x.key));let weight=event.storyline.priority||10;if(id==='familyMoney'){if(run.lifeDNA.cashflow<45||run.lifeDNA.hiddenDebt>55||run.lifeDNA.parentControl>60)weight+=8;if(run.lifeDNA.siblingCount)weight+=5;if(['freedom','security','familyBelonging'].some(key=>top.has(key)))weight+=5}if(id==='splitShift'){if(['services','retail','healthcare','platform'].includes(run.employment.sector))weight+=9;if(run.res.cash<15000||run.employment.status==='unemployed')weight+=6}if(id==='remoteNomad'){weight+=(run.lifeFacts.digitalExperience||0)*2+(run.lifeFacts.skills||0)*2;if(['exploration','freedom'].some(key=>top.has(key)))weight+=7}if(id==='franchise'){if(['unemployed','gig','selfEmployed'].includes(run.employment.status))weight+=7;if(run.birth.family.archetype.familyClass==='working'||run.lifeDNA.riskTolerance>60)weight+=5;if(run.age>=36)weight+=3}return weight+stable(run.seed,`storyline-${id}`,7)}
  function storylineStartEligible(event){const weight=storylineStartWeight(event),roll=stable(state.run.seed,`storyline-start-${event.storyline.id}`,100);return roll<clamp(weight*2,24,72)}
  function reservedStorylineChoices(run=state.run){const featured=FEATURED_STORYLINES.reduce((total,id)=>{const record=ensureStoryline(run,id);return total+(record.status==='active'?Math.max(0,4-record.step+1):0)},0),child=ensureStoryline(run,'childLife');return featured+(child.status==='active'?Math.max(0,5-child.step+1):0)}
  function storylineDecision(){
    const run=state.run,events=INDEX.kinds.decision.filter(event=>event.storyline&&!run.usedEvents.includes(event.id));
    const active=events.filter(event=>{const record=ensureStoryline(run,event.storyline.id);return record.status==='active'&&record.step===event.storyline.step&&run.age>=Number(record.nextDecisionAge??0)&&eligible(event)}).sort((a,b)=>(b.storyline.priority||0)-(a.storyline.priority||0)||storylineStartWeight(b)-storylineStartWeight(a));if(active.length)return active[0];
    if(run.decisionCount>=run.targetDecisions)return null;const starts=events.filter(event=>{if(event.storyline.role!=='start'||!eligible(event))return false;const id=event.storyline.id,record=ensureStoryline(run,id);if(record.status!=='inactive')return false;if(id==='childLife')return run.relationships.children.length>0&&run.decisionCount+5<=run.targetDecisions;const slotAvailable=!run.storylineSlots.main||!run.storylineSlots.secondary;if(!slotAvailable||run.storylineDecisionCount+4>6||run.decisionCount+4>run.targetDecisions||!storylineStartEligible(event))return false;return true}).sort((a,b)=>storylineStartWeight(b)-storylineStartWeight(a));return starts[0]||null;
  }
  function conflictDecision(){const run=state.run,stage=stageForAge(run.age);if(['infancy','childhood'].includes(stage)||run.conflictDecisionStages[stage])return null;const themes=new Set(run.mainConflicts.flatMap(id=>INDEX.conflict.get(id)?.themes||[]));return weightedPick((INDEX.byStage[stage]?.decision||[]).filter(event=>!event.storyline&&eligible(event)&&themes.has(event.theme)),eventWeight)}
  function shouldOfferDecision(){
    const run=state.run,stage=stageForAge(run.age),quota=STAGE_QUOTAS[stage]||0,count=run.stageDecisionCounts[stage]||0,story=storylineDecision(),reserved=reservedStorylineChoices(run);if(run.decisionCount>=run.targetDecisions)return false;if(reserved&&run.decisionCount+reserved>=run.targetDecisions)return Boolean(story);if(activeCrisis(run)&&crisisCandidates(activeCrisis(run)).length)return true;if(transitionDecision())return true;if(civilServiceDecision()||story)return true;if(count>=quota||run.decisionCount+reserved>=run.targetDecisions)return false;
    const range=DATA.stages[stage],remaining=Math.max(0,range[1]-run.age),need=quota-count;if(run.age-run.lastDecisionAge<2&&remaining>need)return false;
    if(remaining<=need)return true;return chance(Math.min(.55,(need/(remaining+1))*1.45));
  }
  function offerDecision(){
    const run=state.run,story=storylineDecision(),preserve=reservedStorylineChoices(run)&&run.decisionCount+reservedStorylineChoices(run)>=run.targetDecisions,crisis=preserve?null:activeCrisis(run),crisisEvent=crisisDecision(crisis),event=preserve?story:crisisEvent||transitionDecision()||civilServiceDecision()||story||conflictDecision()||selectFrom('decision');if(!event)return false;run.phase='decision';run.currentDecision=event;run.currentCrisis=crisisEvent?crisis:null;save();render();return true;
  }
  function finishYear(){
    const run=state.run;if(run.phase!=='playing')return true;if(run.seenThisYear.length<2&&shouldOfferDecision()&&offerDecision())return true;
    settleYear(run);if(run.age>=45&&run.res.health<20&&chance(run.res.health<10?.25:.08)){run.deathAge=run.age;finishLife();return true}
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
    applyEffects(choice.effects||{},event,choice);addTag(run,choice.id);run.memories.push({key:choice.memoryKey,decisionId:event.id,choiceId:choice.id,age:run.age,choice:choice.text,result:choice.resultText,echoText:event.echoText,tags:choice.effects?.outcomeTagsAdd||[]});
    if(run.currentCrisis==='employment'&&(choice.effects?.employment?.status||choice.effects?.lifeFacts?.skills)){if(!choice.effects?.employment?.status)run.employment.status='gig';run.employment.unemployedYears=0;run.crisisYears.employment=0;addTag(run,'recovery')}
    if(run.currentCrisis==='money'&&(Number(choice.effects?.resources?.cash)>0||choice.effects?.outcomeTagsAdd?.some(tag=>['save','legal','cashUp'].includes(tag)))){run.res.debt=Math.max(0,run.res.debt-12000);run.crisisYears.money=0;addTag(run,'recovery')}
    if(run.currentCrisis==='health'&&Number(choice.effects?.resources?.health)>0){run.crisisYears.health=0;addTag(run,'recovery')}
    if(event.id==='decision_036'){run.milestones.workTransition=true;addTag(run,'firstJobTurn')}
    if(event.storyline&&FEATURED_STORYLINES.includes(event.storyline.id))run.storylineDecisionCount++;
    if(run.mainConflicts.some(id=>INDEX.conflict.get(id)?.themes?.includes(event.theme)))run.conflictDecisionStages[stageForAge(run.age)]=true;
    run.usedDecisions.push(event.id);run.decisionCount++;increment(run.stageDecisionCounts,stageForAge(run.age));run.lastDecisionAge=run.age;
    settleYear(run);syncDerivedFacts(run);addChoiceTimeline(event,choice);run.currentDecision=null;run.currentCrisis=null;run.phase='playing';run.yearStarted=false;run.age++;
    run.badStreak=(choice.consequenceHints||[]).some(x=>/↓|风险|压力|债务/.test(x))?run.badStreak+1:Math.max(0,run.badStreak-1);haptic(18);save();render();setTimeout(()=>inputLocked=false,220);
  }

  function cardOptions(kind){
    const recent=new Set(state.meta.recentLives.flatMap(x=>x.cards||[])),owned=new Set(state.run.cards);const pool=[...DATA.cards[kind]].filter(card=>!owned.has(card.id)),result=[];
    while(result.length<3&&pool.length){const chosen=weightedPick(pool,card=>{const seen=state.meta.seenContent.cards[contentKey(card)]||0;return(seen===0?3:seen===1?.7:.25)*(recent.has(contentKey(card))?.25:1)});result.push(chosen);pool.splice(pool.indexOf(chosen),1)}return result;
  }
  function startCardDraw(kind,age){const run=state.run;run.phase='card';run.drawKind=kind;run.drawAt=age;run.drawOptions=cardOptions(kind);state.view='game';save();render();return true}
  function chooseCard(id){
    const run=state.run,card=run.drawOptions?.find(x=>x.id===id);if(!card||inputLocked)return;inputLocked=true;run.cards.push(id);increment(state.meta.seenContent.cards,contentKey(card));
    if(run.drawKind==='stage')run.cardAges.push(run.drawAt);applyEffects(card.effects||{}, {id:card.id,kind:'card',theme:'card'});addTag(run,`card:${card.mechanic}`);addCardTimeline(card);
    run.drawOptions=[];run.phase='playing';state.view='game';haptic([10,30,12]);save();render();setTimeout(()=>inputLocked=false,220);
  }

  function startPlaying(){state.run.phase='playing';state.view='game';save();render()}
  function finalSignal(run,tag){const net=run.res.assets+run.res.cash-run.res.debt,status=run.employment.status,relationship=partnerStatus(run),facts=run.lifeFacts;return({
    boundary:()=>facts.boundaries>0,care:()=>facts.careDuty>0||run.relationships.parents.careLoad>0,partner:()=>['dating','partnered','married'].includes(relationship),single:()=>['none','separated','divorced','widowed'].includes(relationship),noChild:()=>run.relationships.children.length===0,
    compromise:()=>facts.compromises>0,career:()=>['employed','retired'].includes(status),stay:()=>facts.stayed>0||run.employment.tenure>=8,quit:()=>['unemployed','careLeave'].includes(status),skill:()=>facts.skills>0,gig:()=>['gig','selfEmployed'].includes(status),riskUp:()=>facts.riskExposure>0,
    cashUp:()=>net>run.startNet,debt:()=>run.res.debt>estimatedIncome(run)*.5,save:()=>run.res.cash>30000&&run.res.debt<estimatedIncome(run)*.5,housing:()=>facts.housing==='owned',move:()=>facts.moved>0,healthUp:()=>run.res.health>=60,study:()=>facts.educationProgress>0||facts.skills>1,healthDown:()=>run.res.health<45,recovery:()=>tagCount(run,'recovery')>0,refuse:()=>facts.refusals>0,relationUp:()=>supportScore(run)>=60,family:()=>run.relationships.parents.alive>0||run.relationships.children.length>0
  }[tag]?.()||false)}
  function endingProfile(run){
    const ranked=DATA.endingProfiles.map(profile=>{const outcome=profile.signals.filter(tag=>tagCount(run,tag)),final=profile.signals.filter(tag=>finalSignal(run,tag)&&!outcome.includes(tag)),matched=new Set([...outcome,...final]).size,qualified=outcome.length>=2||(outcome.length>=1&&final.length>=1);return{profile,qualified,score:(qualified?1000:0)+matched*100+profile.signals.reduce((n,tag)=>n+tagCount(run,tag),0)}}).sort((a,b)=>b.score-a.score);
    return ranked.find(x=>x.qualified)?.profile||ranked[0]?.profile||{id:'ordinary',signals:[]};
  }
  function endingTitle(run,profile){const titles=DATA.endingTitles.filter(x=>x.profileId===profile.id).sort((a,b)=>(state.meta.seenContent.endings[contentKey(a)]||0)-(state.meta.seenContent.endings[contentKey(b)]||0)||stable(run.seed,a.id,100)-stable(run.seed,b.id,100));return titles[0]||DATA.endingTitles[0]}
  function fragmentEligible(fragment,run,profile){const req=fragment.requirements||{};if(req.locationAny&&!req.locationAny.includes(run.birth.location.id))return false;if(req.conflictAny&&!req.conflictAny.some(id=>run.mainConflicts.includes(id)))return false;if(req.outcomeTagsAny&&!req.outcomeTagsAny.some(tag=>tagCount(run,tag)||finalSignal(run,tag)))return false;if(req.outcomeTagsAll?.some(tag=>!tagCount(run,tag)&&!finalSignal(run,tag)))return false;if(req.storyline){const record=ensureStoryline(run,req.storyline.id);if(req.storyline.statusAny&&!req.storyline.statusAny.includes(record.status))return false}if(req.endingProfileAny&&!req.endingProfileAny.includes(profile.id))return false;return true}
  function endingFragment(group,run,profile){const eligible=(DATA.endingFragments[group]||[]).filter(x=>fragmentEligible(x,run,profile)),storylineEligible=eligible.filter(x=>x.requirements?.storyline),pool=storylineEligible.length?storylineEligible:eligible.length?eligible:DATA.endingFragments[group]||[];return pool[stable(run.seed,`fragment-${group}`,Math.max(1,pool.length))]?.text||''}
  function finishLife(){
    const run=state.run;if(run.phase==='ended')return;run.phase='ended';run.age=Math.min(run.age,run.deathAge);
    settleYear(run);const net=run.res.assets+run.res.cash-run.res.debt,debtRatio=run.res.debt/estimatedIncome(run),financial=clamp(50+(net-run.startNet)/10000-debtRatio*15,0,100),fulfillment=topDesires(run).reduce((n,x)=>n+x.fulfillment,0)/3,agency=clamp(run.decisionCount*4+tagCount(run,'recovery')*15,0,100),support=supportScore(run);
    const score=clamp(Math.round(run.res.health*.20+run.res.spirit*.15+support*.15+financial*.15+fulfillment*.20+agency*.15),1,99),profile=endingProfile(run),titleData=endingTitle(run,profile);
    const facts=run.memories.slice(-5).map(m=>({age:m.age,title:m.choice,result:m.result}));while(facts.length<3&&run.timeline.length){const t=run.timeline[Math.max(0,run.timeline.length-1-facts.length*3)];facts.unshift({age:t.age,title:t.text,result:'这件事留在了你的时间线上。'})}
    const conflict=INDEX.conflict.get(run.mainConflicts[0])?.name||'留下还是离开';const first=facts[0],last=facts.at(-1);
    const origin=endingFragment('origins',run,profile),conflictFragment=endingFragment('conflicts',run,profile),turn=endingFragment('turns',run,profile),judgment=endingFragment('judgments',run,profile),review=`${origin}${conflictFragment}${first?`${first.age}岁时，你选择了“${first.title}”。`:''}${last&&last!==first?`${last.age}岁，生活又因“${last.title}”换了方向。`:''}${turn}${judgment}`;
    run.ending={id:titleData.id,profileId:profile.id,age:run.age,title:titleData.title,score,net,review,mainConflict:conflict,facts,gained:[endingFragment('gains',run,profile),topDesires(run)[0]?`最接近的愿望：${topDesires(run)[0].name}`:'仍有回应的关系'].filter(Boolean),lost:[endingFragment('losses',run,profile),run.pressures.money>=60?'被债务占用的一部分自由':run.pressures.body>=60?'一部分没有休息够的身体':'无法同时走完的岔路'].filter(Boolean)};
    addTag(run,profile.id);unlockCodex({id:titleData.id},profile.id);increment(state.meta.stats,'runs');state.meta.stats.best=Math.max(state.meta.stats.best||0,score);increment(state.meta.seenContent.endings,contentKey(titleData));
    const life={title:run.ending.title,endingId:titleData.id,profileId:profile.id,age:run.age,score,net,gender:run.gender,family:run.birth.family.archetype.id,events:run.usedEvents.map(id=>contentKey(INDEX.event.get(id)||{id,contentRevision:CONTENT_REVISION})),cards:run.cards.map(id=>contentKey(INDEX.cards.get(id))),decisions:run.decisionCount};
    state.meta.histories.unshift({...life,familyName:run.birth.family.archetype.name});state.meta.histories=state.meta.histories.slice(0,30);state.meta.recentLives.unshift(life);state.meta.recentLives=state.meta.recentLives.slice(0,5);state.view='ending';save(true);render();
  }

  function roleLine(){const run=state.run;if(run.age<7)return'被家里照顾';if(run.age<19)return run.lifeFacts.education;if(run.employment.status==='unemployed'&&run.employment.previousCareer)return`原${run.employment.previousCareer}`;return run.employment.career||EMPLOYMENT_NAMES[run.employment.status]||'生活继续'}
  function pressureName(value){return value>=80?'危机':value>=60?'严重':value>=30?'明显':'平稳'}
  function go(view){state.view=view;state.overlay=null;window.scrollTo(0,0);render()}
  function showToast(text){if(simulationMode)return;state.toast=text;render();setTimeout(()=>{if(state.toast===text){state.toast=null;render()}},1500)}

  function homeView(){const active=state.run&&state.run.phase!=='ended';return`<main class="screen center"><span class="version">v${VERSION}</span><div><h1>人生尚未加载</h1></div>${state.meta.migrationNotice?'<section class="card migration-note"><strong>规则已经升级</strong><p class="tiny">v4.0.1 存档已备份；当前人生、档案、图鉴与设置均已保留。</p></section>':''}<div class="mt stack">${active?'<button class="btn primary" data-act="continue">继续这一生</button>':'<button class="btn primary" data-act="new">🎲 开始新人生</button>'}<div class="menu-list"><button class="menu-item" data-nav="archive"><strong>🗂️ 人生档案</strong><span>›</span></button><button class="menu-item" data-nav="codex"><strong>📖 社会图鉴</strong><span>›</span></button><button class="menu-item" data-nav="settings"><strong>⚙️ 设置</strong><span>›</span></button></div></div><p class="tiny">离线运行 · 自动存档</p></main>`}
  function birthView(){const run=state.run,f=run.birth.family;return`<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">出生信息</div><span></span></div><section class="card hero"><div class="eyebrow">${genderName(run.gender)} · ${esc(run.birth.location.name)}</div><div class="birth-place">${esc(f.archetype.name)}</div><p>${esc(f.archetype.note)}</p><p class="tiny">${esc(run.birth.location.note)}</p><p class="tiny origin-hint">起点优势：${esc(f.archetype.advantages.join('、'))} · 潜在压力：${esc(f.archetype.hiddenRisks.join('、'))}</p></section><dl class="spec-list"><div class="spec"><dt>父亲</dt><dd>${esc(f.father)}</dd></div><div class="spec"><dt>母亲</dt><dd>${esc(f.mother)}</dd></div><div class="spec"><dt>兄弟姐妹</dt><dd>${run.lifeDNA.siblingCount?`${run.lifeDNA.siblingCount}人`:'独生'}</dd></div><div class="spec"><dt>住房</dt><dd>${esc(f.house)}</dd></div></dl><div class="bottom-actions"><button class="btn primary" data-act="toAttrs">分配初始属性</button></div></main>`}
  function attributesView(){const run=state.run;return`<main class="screen attributes-screen"><div class="topbar"><button class="iconbtn" data-nav="birth">‹</button><div class="title">出生加点</div><span></span></div><div class="remain row"><div><div class="eyebrow">剩余点数</div><div class="big-number">${run.points}</div></div><span class="pill">每项上限 8</span></div><section class="card">${Object.entries(DATA.attributes).map(([key,a])=>`<div class="attr-row"><div><div class="attr-name"><span class="attr-emoji">${a.icon}</span>${esc(a.name)}</div><div class="attr-desc">${esc(a.desc)}</div></div><div class="stepper"><button data-step="${key}" data-delta="-1">−</button><b>${run.attrs[key]}</b><button data-step="${key}" data-delta="1">＋</button></div></div>`).join('')}</section><div class="bottom-actions attributes-actions"><button class="btn ghost" data-act="randomAttrs">随机分配</button><button class="btn primary" data-act="confirmAttrs" ${run.points?'disabled':''}>确认出生</button></div></main>`}
  function cardView(){const run=state.run;const title=run.drawKind==='innate'?'选一张先天牌':run.drawKind==='adversity'?'坏日子留下一张牌':`${run.drawAt}岁 · 学会一件事`;return`<main class="screen"><div class="topbar"><span></span><div class="title">${title}</div><span></span></div><p>牌面说清用途，具体哪一天生效仍由人生决定。</p><div class="stack mt">${run.drawOptions.map((card,i)=>`<button class="card fate-card clear-card" style="animation-delay:${i*.05}s" data-card="${card.id}"><div class="omen-icon">${card.omenIcon}</div><div><div class="fate-title">《${esc(card.displayName)}》</div><div class="fate-text">${esc(card.effectHint)}</div></div><span class="chev">›</span></button>`).join('')}</div></main>`}
  function resourceHeader(){const run=state.run;return`<header class="game-header"><div class="row"><div class="grow"><div class="age">${run.age}岁</div><div class="role">${esc(run.birth.location.name)} · ${esc(roleLine())}</div></div><button class="iconbtn" data-act="status">☰</button></div><div class="resource-strip"><div class="res"><span>现金</span><b>${money(run.res.cash)}</b></div><div class="res"><span>健康</span><b>${Math.round(run.res.health)}</b></div><div class="res"><span>精神</span><b>${Math.round(run.res.spirit)}</b></div><div class="res"><span>关系</span><b>${Math.round(run.res.relation)}</b></div></div></header>`}
  function streamRows(){const rows=state.run.timeline.slice(-9);return rows.length?rows.map((item,i)=>`<div class="stream-row ${['decision','card'].includes(item.kind)?'chosen':''}" style="animation-delay:${Math.min(i,7)*.02}s"><span class="stream-age">${item.age}岁</span><span class="stream-icon">${item.icon}</span><div><p>${esc(item.text)}</p>${item.hints?.length?`<div class="stream-hints">${item.hints.map(h=>`<span>${esc(h)}</span>`).join('')}</div>`:''}</div></div>`).join(''):'<div class="stream-empty">轻触这里，开始这一生。</div>'}
  function gameView(){
    const run=state.run;return`<main class="screen stream-screen">${resourceHeader()}<section class="life-stream" data-act="advance" role="button" tabindex="0" aria-label="轻触继续人生">${streamRows()}${run.phase==='playing'?'<div class="stream-cursor"><i></i> 轻触继续</div>':''}</section></main>`;
  }
  function endingView(){const run=state.run,e=run.ending;return`<main class="screen"><div class="eyebrow ending-kicker">这一生滚到了最后</div><div class="lifespan">你活了 <b>${e.age}</b> 岁</div><div class="score-ring" style="--score:${e.score}"><div><b>${e.score}</b><span>人生综合值</span></div></div><div class="ending-title">《${esc(e.title)}》</div><p class="ending-review">${esc(e.review)}</p><section class="card mt"><div class="section-title first">一生最核心的矛盾</div><p>${esc(e.mainConflict)}</p><div class="stat-grid mt-sm"><div class="stat-box"><span>最终净值</span><b>${money(e.net)}</b></div><div class="stat-box"><span>亲手选择</span><b>${run.decisionCount}</b></div><div class="stat-box"><span>活过的事件</span><b>${run.timeline.length}</b></div><div class="stat-box"><span>旧事回响</span><b>${run.echoCount}</b></div></div></section><div class="two-col mt"><section class="card soft"><div class="section-title first">得到的东西</div>${e.gained.map(x=>`<p class="fact">＋ ${esc(x)}</p>`).join('')}</section><section class="card soft"><div class="section-title first">失去的东西</div>${e.lost.map(x=>`<p class="fact">－ ${esc(x)}</p>`).join('')}</section></div><div class="section-title">这一生绕不过的几件事</div><section class="card timeline">${e.facts.map(x=>`<div class="time-item"><span class="time-age">${x.age}岁</span><div><strong>${esc(x.title)}</strong><p class="tiny">${esc(x.result)}</p></div></div>`).join('')}</section><div class="stack mt"><button class="btn primary" data-act="new">再投一次</button><button class="btn ghost" data-nav="archive">查看人生档案</button></div></main>`}
  function archiveView(){const h=state.meta.histories;return`<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">人生档案</div><span class="pill">${h.length}次</span></div><section class="card">${h.length?h.map(x=>`<div class="archive-item"><div class="row"><div><div class="archive-title">《${esc(x.title)}》</div><div class="archive-meta">${esc(x.familyName||x.family)} · ${x.age}岁 · ${x.decisions||0}次选择</div></div><span class="pill">${x.score}</span></div></div>`).join(''):'<p>还没有走完的人生。</p>'}</section></main>`}
  function codexView(){const unlocked=new Set(state.meta.codex);return`<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">社会图鉴</div><span class="pill">${unlocked.size}/${DATA.codex.length}</span></div><section class="card">${DATA.codex.map(x=>unlocked.has(x.id)?`<div class="codex-item"><span class="codex-category">${esc(x.category)}</span><h3>${esc(x.name)}</h3><p>${esc(x.text)}</p></div>`:`<div class="codex-item locked"><span class="codex-category">${esc(x.category)}</span><h3>尚未看清</h3><p>${esc(x.lockedHint)}</p></div>`).join('')}</section></main>`}
  function settingsView(){return`<main class="screen"><div class="topbar"><button class="iconbtn" data-nav="home">‹</button><div class="title">设置</div><span></span></div><section class="card"><button class="menu-item" data-act="toggleHaptic"><strong>轻触反馈</strong><span class="switch ${state.meta.settings.haptic?'on':''}"><i></i></span></button><button class="menu-item" data-act="export"><strong>导出存档</strong><span>›</span></button><button class="menu-item" data-act="reset"><strong class="danger-text">清除全部数据</strong><span>›</span></button></section></main>`}
  function overlayView(){if(state.overlay!=='status')return'';const run=state.run,desires=topDesires(run),children=childAges(run),employmentName=EMPLOYMENT_NAMES[run.employment.status],employmentDetail=roleLine(),activeStory=FEATURED_STORYLINES.find(id=>['active','resolved'].includes(run.storylines[id].status));return`<div class="drawer-wrap" data-act="closeOverlay"><div class="drawer" onclick="event.stopPropagation()"><div class="handle"></div><div class="row"><div><div class="eyebrow">${run.age}岁 · ${genderName(run.gender)}</div><h2>${esc(run.birth.family.archetype.name)}</h2></div><button class="iconbtn" data-act="closeOverlay">×</button></div><p>${esc(run.birth.family.archetype.note)}</p><div class="section-title">现在的生活</div><dl class="spec-list"><div class="spec"><dt>学历</dt><dd>${esc(run.lifeFacts.education)}</dd></div><div class="spec"><dt>工作</dt><dd>${esc(employmentName)}${employmentDetail!==employmentName?` · ${esc(employmentDetail)}`:''}</dd></div><div class="spec"><dt>工作安排</dt><dd>${esc(ARRANGEMENT_NAMES[run.employment.arrangement])}</dd></div><div class="spec"><dt>婚恋</dt><dd>${esc(PARTNER_NAMES[partnerStatus(run)])}${run.relationships.partner.status!=='none'?` · 关系${Math.round(run.relationships.partner.bond)}`:''}</dd></div><div class="spec"><dt>子女</dt><dd>${children.length?children.map(age=>`${age}岁`).join('、'):'无'}</dd></div><div class="spec"><dt>连续经历</dt><dd>${activeStory?esc(STORYLINE_NAMES[activeStory]):'尚未展开'}</dd></div></dl><div class="section-title">最在意的事</div><div class="desire-list">${desires.map(x=>`<span>${esc(x.name)} · ${x.fulfillment>=65?'接近':x.fulfillment<40?'缺口':'拉扯'}</span>`).join('')}</div><div class="section-title">现实压力</div><div class="pressure-grid">${Object.entries(run.pressures).map(([key,value])=>`<span>${{money:'金钱',family:'家庭',career:'职业',body:'身体',loneliness:'孤独'}[key]} · ${pressureName(value)}</span>`).join('')}</div><div class="section-title">资产负债</div><div class="stat-grid"><div class="stat-box"><span>现金</span><b>${money(run.res.cash)}</b></div><div class="stat-box"><span>资产</span><b>${money(run.res.assets)}</b></div><div class="stat-box"><span>负债</span><b>${money(run.res.debt)}</b></div><div class="stat-box"><span>净值</span><b>${money(run.res.assets+run.res.cash-run.res.debt)}</b></div></div><button class="btn ghost mt" data-nav="home">返回首页</button></div></div>`}
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
  function beginNew(){if(state.run&&state.run.phase!=='ended'&&!confirm('当前人生还没结束。确定重新开始？'))return;state.meta.migrationNotice=false;createRun();state.view='birth';save(true);render()}
  function exportText(text,name){const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
  function action(name){
    const run=state.run;
    if(name==='new')beginNew();else if(name==='continue'){if(run.phase==='birth')go('birth');else if(run.phase==='attributes')go('attributes');else if(run.phase==='ended')go('ending');else go('game')}
    else if(name==='toAttrs'){run.phase='attributes';go('attributes');save()}else if(name==='randomAttrs')randomAttrs();
    else if(name==='confirmAttrs'){if(run.points)return;initializeDesires(run);run.mainConflicts=chooseConflicts(run);run.business.operatingSkill=clamp(45+(run.attrs.ambition-4)*5+(run.attrs.intellect-4)*3+(run.lifeFacts.skills||0)*3,20,82);run.deathAge=clamp(run.deathAge+run.attrs.physique-1,42,105);startCardDraw('innate',0)}
    else if(name==='advance')advanceOneBeat();else if(name==='status'){state.overlay='status';render()}else if(name==='closeOverlay'){state.overlay=null;render()}
    else if(name==='toggleHaptic'){state.meta.settings.haptic=!state.meta.settings.haptic;save();render()}else if(name==='export')exportText(JSON.stringify({schemaVersion:SCHEMA_VERSION,gameVersion:VERSION,meta:state.meta,run:state.run},null,2),'人生尚未加载-v4.1.0-存档.json');
    else if(name==='reset'&&confirm('清除全部人生档案和存档？')){localStorage.removeItem(APP_KEY);state={view:'home',meta:defaultMeta(),run:null,overlay:null,toast:null,recovery:null};render()}
    else if(name==='exportCorrupt')exportText(state.recovery.raw||'','人生尚未加载-损坏存档.json');else if(name==='clearCorrupt'&&confirm('确认清除损坏存档？')){localStorage.removeItem(APP_KEY);state={view:'home',meta:defaultMeta(),run:null,overlay:null,toast:null,recovery:null};render()}
    else if(name==='debugFinish'){const report=autoFinishCurrent();showToast(`完成：${report?.age||0}岁，${report?.decisions||0}次选择`)}
  }
  function bind(){app.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>go(el.dataset.nav));app.querySelectorAll('[data-act]').forEach(el=>el.onclick=()=>action(el.dataset.act));app.querySelectorAll('[data-step]').forEach(el=>el.onclick=()=>stepAttr(el.dataset.step,Number(el.dataset.delta)));app.querySelectorAll('[data-card]').forEach(el=>el.onclick=()=>chooseCard(el.dataset.card));app.querySelectorAll('[data-choice]').forEach(el=>el.onclick=()=>chooseDecision(Number(el.dataset.choice)));const stream=app.querySelector('.life-stream');if(stream)stream.onkeydown=event=>{if((event.key==='Enter'||event.key===' ')&&state.run?.phase==='playing'){event.preventDefault();advanceOneBeat()}}}

  function renderGameToText(){const run=state.run;return JSON.stringify({view:state.view,version:VERSION,codexUnlocked:state.meta.codex.length,run:run?{phase:run.phase,age:run.age,canAdvance:state.view==='game'&&run.phase==='playing',overlay:run.phase==='decision'?'decision':run.phase==='card'?'card':null,resources:run.res,employment:run.employment,familyFinance:run.familyFinance,mobility:run.mobility,business:run.business,storylines:run.storylines,storylineDecisionCount:run.storylineDecisionCount,relationships:{partner:run.relationships.partner,children:childAges(run),support:Math.round(supportScore(run))},topDesires:topDesires(run).map(x=>({key:x.key,fulfillment:Math.round(x.fulfillment)})),pressures:run.pressures,scheduledEchoes:run.scheduledEchoes.map(x=>({eventId:x.eventId,dueAge:x.dueAge,memoryKey:x.memoryKey})),usedEchoes:run.usedEchoes,secretRevealed:run.secretRevealed,visibleTimeline:run.timeline.slice(-6).map(x=>({age:x.age,text:x.text,kind:x.kind,id:x.id})),decision:run.currentDecision?{id:run.currentDecision.id,prompt:run.currentDecision.prompt,storyline:run.currentDecision.storyline,choices:run.currentDecision.choices.map((x,index)=>({index,text:x.text,memoryKey:x.memoryKey}))}:null,cards:run.phase==='card'?run.drawOptions.map(x=>({id:x.id,name:x.displayName,effect:x.effectHint})):null,decisionCount:run.decisionCount,ending:run.ending?{id:run.ending.id,profileId:run.ending.profileId,title:run.ending.title,age:run.ending.age,facts:run.ending.facts.length,review:run.ending.review}:null}:null})}
  window.render_game_to_text=renderGameToText;
  window.advanceTime=ms=>{const steps=Math.max(1,Math.floor(Number(ms||800)/800));for(let i=0;i<steps;i++)if(state.run?.phase==='playing')advanceOneBeat(true);return renderGameToText()};

  function autoFinishCurrent(){
    if(!state.run)return null;const before=simulationMode;simulationMode=true;let guard=0;
    try{while(state.run.phase!=='ended'&&guard++<1000){const run=state.run;if(run.phase==='birth'){run.phase='attributes';continue}if(run.phase==='attributes'){randomAttrs();startCardDraw('innate',0);continue}if(run.phase==='card'){chooseCard(run.drawOptions[0].id);inputLocked=false;continue}if(run.phase==='decision'){chooseDecision(Math.floor(rng()*run.currentDecision.choices.length));inputLocked=false;continue}advanceOneBeat(true)}return{age:state.run.age,decisions:state.run.decisionCount,events:state.run.timeline.length,ending:state.run.ending?.title,guard}}
    finally{simulationMode=before;if(!simulationMode)save(true);render()}
  }

  function forceStoryline(id,step=1){
    if(!DEBUG||!state.run||![...FEATURED_STORYLINES,'childLife'].includes(id))return null;const run=state.run,targetStep=Math.max(1,Number(step)||1),event=INDEX.kinds.decision.find(item=>item.storyline?.id===id&&item.storyline.step===targetStep);if(!event)return null;
    if(id==='familyMoney')run.lifeDNA.siblingCount=Math.max(1,run.lifeDNA.siblingCount||0);if(id==='splitShift'){run.employment.status='employed';run.employment.sector='services';run.employment.career='门店职员'}if(id==='remoteNomad'){run.employment.status='gig';run.employment.sector='digital';run.lifeFacts.skills=Math.max(1,run.lifeFacts.skills||0);run.lifeFacts.digitalExperience=Math.max(1,run.lifeFacts.digitalExperience||0)}if(id==='franchise'){run.employment.status=run.employment.status==='student'?'unemployed':run.employment.status;run.res.cash=Math.max(20000,run.res.cash)}if(id==='childLife'&&!run.relationships.children.length)run.relationships.children.push({bornAt:Math.max(18,event.ageMin-(event.requirements?.facts?.childAgeAny?.[0]||6)),bond:60});
    const record=ensureStoryline(run,id);Object.assign(record,{status:targetStep===1?'inactive':'active',step:targetStep===1?0:targetStep,route:null,startedAt:targetStep===1?null:Math.max(0,event.ageMin-2),nextDecisionAge:event.ageMin});if(FEATURED_STORYLINES.includes(id)&&targetStep>1&&!run.storylineSlots.main)run.storylineSlots.main=id;
    run.age=Math.max(event.ageMin,Math.min(event.ageMax,run.age));run.deathAge=Math.max(run.deathAge,run.age+8);run.usedEvents=run.usedEvents.filter(eventId=>eventId!==event.id);run.usedDecisions=run.usedDecisions.filter(eventId=>eventId!==event.id);run.currentDecision=event;run.currentCrisis=null;run.phase='decision';run.yearStarted=true;state.view='game';syncDerivedFacts(run);save(true);render();return event.id;
  }

  try{
    app.innerHTML='<main class="loading-screen"><div><div class="loading-mark">◌</div><h2>正在加载人生数据库</h2><p>一年一年，马上开始。</p></div></main>';
    const response=await fetch(`./data.json?v=${VERSION}`,{cache:'no-store'});if(!response.ok)throw new Error(`人生数据库加载失败（HTTP ${response.status}）`);DATA=await response.json();if(DATA.schemaVersion!==SCHEMA_VERSION)throw new Error(`数据版本不兼容：需要 ${SCHEMA_VERSION}，实际 ${DATA.schemaVersion}`);
    INDEX=buildIndex();state=loadState();render();window.__LIFE_BOOTED__=true;
    if(DEBUG)window.__LIFE_DEBUG__={snapshot:()=>copy(state.run),advance:()=>advanceOneBeat(true),autoFinishCurrent,forceStoryline,forceAge:age=>{if(state.run){state.run.age=clamp(age,0,105);state.run.yearStarted=false;state.run.yearQueue=[];milestoneFacts();render()}},forceDecision:id=>{const event=INDEX.event.get(id);if(state.run&&event?.kind==='decision'){state.run.age=event.ageMin;state.run.currentDecision=event;state.run.currentCrisis=null;state.run.phase='decision';state.run.yearStarted=true;render()}},patchRun:patch=>{if(state.run){for(const[key,value]of Object.entries(patch||{})){if(value&&typeof value==='object'&&!Array.isArray(value)&&state.run[key]&&typeof state.run[key]==='object')state.run[key]={...state.run[key],...copy(value)};else state.run[key]=copy(value)}normalizeV41State(state.run);syncDerivedFacts(state.run);render()}},eligibleIds:kind=>(INDEX.byStage[stageForAge(state.run.age)]?.[kind]||[]).filter(event=>eligible(event)).map(x=>x.id),priorityDecisionIds:()=>({transition:transitionDecision()?.id||null,civilService:civilServiceDecision()?.id||null,storyline:storylineDecision()?.id||null}),crisisCandidateIds:type=>crisisCandidates(type).map(event=>event.id),settleCurrentYear:()=>{settleYear(state.run);render();return copy(state.run)},previewEndingProfile:outcomeTags=>{const run=copy(state.run);run.outcomeTags=copy(outcomeTags||{});return endingProfile(run).id},counts:()=>Object.fromEntries(Object.entries(INDEX.kinds).map(([k,v])=>[k,v.length]))};
  }catch(error){console.error(error);app.innerHTML=`<main class="boot-fallback"><div><div class="boot-label">启动失败</div><h1>人生数据库没有加载成功</h1><p>${esc(error.message||error)}</p></div><div class="boot-card"><p>请确认 index.html、style.css、game.js 与 data.json 位于同一目录。</p><button class="btn primary mt" onclick="location.reload()">重新加载</button></div></main>`}

  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.run)save(true)});window.addEventListener('pagehide',()=>save(true));
})();
