const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {launchChromium}=require('./playwright-runtime.cjs');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.FULL_TRACK_SMOKE_OUT||path.join(os.tmpdir(),'life-unloaded-v0.6.8-full-track');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data.json'),'utf8'));
const decisions=data.events.filter(event=>event.kind==='decision');
const laterBeats=data.events.filter(event=>event.kind==='beat'&&event.track==='later');
const eventFor=(id,phase)=>decisions.find(event=>event.episode?.id===id&&(phase===undefined||event.episode.phase===phase));
const beatFor=id=>laterBeats.find(event=>event.id===id);
const episodeIds=['secondary_diversion','professional_certification','adult_reeducation','business_expansion','wealth_peak','retirement_transition','parental_inheritance','long_term_care','will_planning'];
const expectedRoutes={
  secondary_diversion:['academic','vocational','employment','alternative_school'],
  professional_certification:['passed','retake','alternative_skill','withdrawn'],
  adult_reeducation:['completed','low_intensity','non_degree','forced_exit'],
  business_expansion:['scaled','downsized','sold','debt_failure'],
  wealth_peak:['controlled','cashed_out','management_exit','invalidated'],
  retirement_transition:['retired','semi_retired','continued','forced'],
  parental_inheritance:['accepted','limited','renounced','disputed'],
  long_term_care:['stable','changed','minimum_support','family_break'],
  will_planning:['documented','partial','deferred','invalidated']
};
fs.mkdirSync(OUT,{recursive:true});

async function openPlayable(page){
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
  await page.locator('[data-act="new"]').click();
  await page.locator('[data-act="birth-next"]').click();
  await page.locator('[data-act="random-attributes"]').click();
  await page.locator('[data-act="attributes-done"]').click();
  await page.locator('[data-card]').first().click();
  await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({cardAges:[0,18,35,55]}));
}

async function fitSheet(page,label){
  await page.waitForTimeout(300);
  const geometry=await page.evaluate(()=>{
    const sheet=document.querySelector('.choice-sheet')?.getBoundingClientRect();
    return{innerWidth,innerHeight,scrollWidth:document.documentElement.scrollWidth,sheet,buttons:[...document.querySelectorAll('.choice-sheet button')].map(item=>item.getBoundingClientRect())};
  });
  assert.ok(geometry.scrollWidth<=geometry.innerWidth+1,`${label}: horizontal overflow`);
  assert.ok(geometry.sheet&&geometry.sheet.left>=-1&&geometry.sheet.right<=geometry.innerWidth+1,`${label}: sheet outside viewport`);
  for(const button of geometry.buttons)assert.ok(button.left>=-1&&button.right<=geometry.innerWidth+1,`${label}: option outside viewport`);
}

async function fitDrawer(page,label){
  const geometry=await page.evaluate(()=>{
    const drawer=document.querySelector('.drawer');
    const rect=drawer?.getBoundingClientRect();
    if(drawer)drawer.scrollTop=drawer.scrollHeight;
    return{innerWidth,innerHeight,scrollWidth:document.documentElement.scrollWidth,rect,text:drawer?.innerText||'',scrollable:drawer?drawer.scrollHeight>=drawer.clientHeight:false};
  });
  assert.ok(geometry.scrollWidth<=geometry.innerWidth+1,`${label}: horizontal overflow`);
  assert.ok(geometry.rect&&geometry.rect.left>=-1&&geometry.rect.right<=geometry.innerWidth+1,`${label}: drawer outside viewport`);
  assert.ok(geometry.rect.top>=-1&&geometry.rect.bottom<=geometry.innerHeight+1,`${label}: drawer outside viewport height`);
  assert.match(geometry.text,/工作转段·已退出工作/);
  assert.match(geometry.text,/照护·安排稳定/);
}

async function drawerTextFor(page,education){
  await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({education:value}),education);
  await page.locator('[data-act="open-drawer"]').click();
  await page.waitForTimeout(900);
  const text=await page.locator('.drawer').innerText();
  await page.locator('.drawer [data-act="close-drawer"]').click();
  return text;
}

async function startChoice(page,event){
  assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),event.id),event.id);
  let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.sceneQueue[0].kind,'situation');
  const age=run.age;
  await page.locator('[data-act="episode-next"]').click();
  run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.age,age);
  assert.equal(run.sceneQueue[0].kind,'choice');
  return age;
}

async function chooseAndFinish(page,event,index){
  const age=await startChoice(page,event);
  await page.locator(`[data-choice="${index}"]`).click();
  let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.age,age);
  assert.equal(run.sceneQueue[0].kind,'result');
  await page.locator('[data-act="episode-next"]').click();
  run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.age,age+1);
  return run;
}

async function prepareFinal(page,id,event){
  const age=Math.max(event.ageMin,Math.min(event.ageMax,60));
  const patch={
    age,
    phase:'playing',
    sceneQueue:[],
    currentDecision:null,
    yearStarted:true,
    education:{status:'completed',level:4,path:'college'},
    employment:{status:'employed',employerType:'private',career:'受雇岗位'},
    activity:{mode:'work'},
    finance:{cash:500000,available:500000},
    business:{status:'operating',mode:'independent',operatingSkill:72,equity:200000000,scale:'national',control:80},
    health:{status:'limited',conditionSeverity:48,disability:'persistent',careNeed:2},
    episodes:{[id]:{status:'active',phase:event.episode.phase,startedAt:Math.max(0,age-event.episode.phase+1),nextPhaseAge:age,deadlineAge:age+1,route:'prepared',boundActors:{},commitments:[],closureReason:null}}
  };
  if(id==='parental_inheritance')patch.people=[{id:'debug_parent',relation:'father',bornAt:age-84,alive:false,status:'deceased',bond:55}];
  await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun(value),patch);
}

(async()=>{
  assert.equal(data.version,'0.6.8');
  assert.equal(data.schemaVersion,12);
  assert.equal(data.contentRevision,26);
  assert.deepEqual(
    Object.fromEntries(['beat','decision','consequence','blackSwan'].map(kind=>[
      kind,
      data.events.filter(event=>event.kind===kind).length
    ])),
    {beat:456,decision:197,consequence:197,blackSwan:20}
  );
  assert.ok(decisions.every(event=>!('arc' in event)));
  assert.ok(laterBeats.every(event=>event.ageMin>=55),'later beat appeared before midlife');
  assert.equal(laterBeats.length,48);
  const recurringBeats=laterBeats.filter(event=>event.recurrence);
  assert.deepEqual(recurringBeats.map(event=>event.id),Array.from({length:16},(_,index)=>`beat_${409+index}`));
  assert.deepEqual(
    Object.fromEntries(['later.errands','later.digital_learning','later.daily_pleasure','later.solitude_participation'].map(key=>[
      key,recurringBeats.filter(event=>event.recurrence.key===key).map(event=>event.id)
    ])),
    {
      'later.errands':['beat_409','beat_410','beat_411','beat_412'],
      'later.digital_learning':['beat_413','beat_414','beat_415','beat_416'],
      'later.daily_pleasure':['beat_417','beat_418','beat_419','beat_420'],
      'later.solitude_participation':['beat_421','beat_422','beat_423','beat_424']
    }
  );
  assert.ok(recurringBeats.every(event=>event.weight===7&&event.intensity==='low'&&event.effects.length===0));
  assert.ok(recurringBeats.every(event=>event.recurrence.sameEventYears===8&&event.recurrence.sameGroupYears===3));
  assert.deepEqual(beatFor('beat_353').requirements.all.find(rule=>rule.path==='later.retirement')?.value,['retired','forced']);
  assert.equal(beatFor('beat_356').requirements.all.find(rule=>rule.path==='employment.firstJobAge')?.op,'neq');
  assert.equal(beatFor('beat_360').actors[0]?.slot,'child');
  assert.equal(beatFor('beat_369').requirements.all.find(rule=>rule.path==='housing.status')?.value,'renting');
  assert.equal(beatFor('beat_370').requirements.all.find(rule=>rule.path==='employment.firstJobAge')?.op,'eq');
  assert.equal(beatFor('beat_375').actors[0]?.slot,'partner');
  assert.equal(beatFor('beat_380').requirements.all.find(rule=>rule.path==='pressures.loneliness')?.op,'gte');
  assert.equal(decisions.filter(event=>event.track==='later').length,13);
  assert.equal(data.events.filter(event=>event.kind==='beat'&&event.track==='housing').length,32);
  assert.equal(decisions.filter(event=>event.track==='housing').length,6);
  assert.deepEqual(beatFor('beat_384').requirements.all,[{path:'health.status',op:'in',value:['treating','managed','limited']}]);
  const workResolution=eventFor('retirement_transition',2);
  assert.ok(workResolution.choices.slice(0,3).every(choice=>choice.requirements.all.some(rule=>rule.path==='employment.status'&&rule.op==='in')));
  assert.equal(workResolution.choices[3].requirements.all.some(rule=>rule.path==='employment.status'),false);
  assert.ok(data.episodeCatalog.long_term_care.abandonedRoutes.includes('refused'));
  const establishBaseStart=eventFor('establish_base',1),establishBaseFollowup=eventFor('establish_base',2);
  assert.ok(establishBaseStart.choices.every(choice=>choice.housingChoiceKind==='workMigration'&&choice.effects.some(effect=>effect.type==='transitionHousing'&&effect.value.kind==='choice')),'establish-base trial did not consume the work-migration housing choice');
  assert.ok(establishBaseFollowup.choices.every(choice=>!choice.housingChoiceKind&&choice.effects.some(effect=>effect.type==='transitionHousing'&&effect.value.kind==='background')),'establish-base follow-up could be locked by repeating the same housing choice kind');
  for(const decisionId of ['decision_189','decision_190','decision_191','decision_192']){
    const decision=decisions.find(event=>event.id===decisionId),echo=data.events.find(event=>event.id===decisionId.replace('decision_','echo_'));
    assert.equal(decision.ageMax,103,`${decisionId}: consequence can be scheduled after the playable lifespan`);
    assert.ok(decision.choices.every(choice=>choice.consequences.every(spec=>spec.delayMin===1&&spec.delayMax===1)),`${decisionId}: consequence delay is not fixed to one year`);
    assert.ok(Object.values(echo.choiceOutcomes).every(outcome=>!outcome.effects.some(effect=>effect.target==='pressures.loneliness'&&effect.value===4)),`${decisionId}: generic loneliness echo leaked into an authored route`);
  }
  assert.ok(decisions.find(event=>event.id==='decision_192').choices.every(choice=>choice.effects.some(effect=>effect.type==='add'&&effect.target==='finance.cash'&&effect.value===-500)),'health marketing deposit was not settled on every route');
  for(const id of episodeIds){
    const rows=decisions.filter(event=>event.episode?.id===id).sort((a,b)=>a.episode.phase-b.episode.phase);
    assert.ok(rows.length>=1&&rows.length<=3,`${id}: phase count`);
    assert.ok(rows.every(event=>event.episode.deadlineYears<=4),`${id}: exceeds four years`);
    assert.deepEqual(rows.at(-1).choices.map(choice=>choice.route),expectedRoutes[id],`${id}: endings`);
    assert.ok(data.episodeCatalog[id]?.deadline&&data.episodeCatalog[id]?.invalidated,`${id}: closure copy`);
  }

  const browser=await launchChromium();
  const errors=[];
  try{
    let context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    let page=await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});

    const oldSave={schemaVersion:8,gameVersion:'0.5.8',meta:{histories:[{title:'v0.5.8完整人生',age:81}],codex:['codex_01'],settings:{haptic:false},stats:{runs:8},seen:{events:{beat_001:3},cards:{},families:{},endings:{}},recentSeeds:['v058-finished']},run:{schemaVersion:8,gameVersion:'0.5.8',contentRevision:15,phase:'playing',age:61,arcs:{later_1:{status:'active'}}}};
    await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SAVE_KEY,value:oldSave});
    await page.goto(URL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.equal(migrated.gameVersion,'0.6.8');
    assert.equal(migrated.run,null);
    assert.equal(migrated.meta.histories[0].title,'v0.5.8完整人生');
    assert.equal(migrated.meta.settings.haptic,false);
    assert.equal(migrated.meta.stats.runs,8);
    assert.equal(migrated.meta.seen.events.beat_001,undefined);
    assert.deepEqual(migrated.meta.recentSeeds,['v058-finished']);
    await context.close();

    context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    page=await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    await openPlayable(page);

    const previousReleaseSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    previousReleaseSave.schemaVersion=11;
    previousReleaseSave.meta.schemaVersion=11;
    previousReleaseSave.gameVersion='0.6.7';
    previousReleaseSave.run.schemaVersion=11;
    previousReleaseSave.run.gameVersion='0.6.7';
    previousReleaseSave.run.age=42;
    const preservedAge=previousReleaseSave.run.age;
    await page.addInitScript(({key,value})=>{
      if(sessionStorage.getItem('v068-previous-release-loaded'))return;
      localStorage.setItem(key,JSON.stringify(value));
      sessionStorage.setItem('v068-previous-release-loaded','1');
    },{key:SAVE_KEY,value:previousReleaseSave});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const schema11Migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.equal(schema11Migrated.run,null,'v0.6.7 Schema 11 active run was not cleared');
    assert.notEqual(preservedAge,undefined);
    await openPlayable(page);

    const diversion=eventFor('secondary_diversion',1);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({attrs:{intellect:10},education:{status:'completed',level:2,path:'middleSchool'},development:{learningHabit:90,attendance:96,teacherSupport:82,peerSupport:70,selfAdvocacy:75,careLoad:2,traumaLoad:2,routeKnowledge:75,languagePreparation:20}}));
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),diversion.id),diversion.id);
    let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    const diversionAge=run.age;
    await fitSheet(page,'situation-360x773');
    await page.screenshot({path:path.join(OUT,'01-situation-360x773.png'),fullPage:false});
    await page.locator('[data-act="episode-next"]').click();
    await page.setViewportSize({width:360,height:640});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,diversionAge);
    assert.equal(run.sceneQueue[0].kind,'choice');
    await fitSheet(page,'choice-360x640');
    await page.screenshot({path:path.join(OUT,'02-choice-360x640.png'),fullPage:false});
    await page.locator('[data-choice="0"]').click();
    await page.setViewportSize({width:320,height:568});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,diversionAge);
    assert.equal(run.sceneQueue[0].kind,'result');
    await fitSheet(page,'result-320x568');
    await page.screenshot({path:path.join(OUT,'03-result-320x568.png'),fullPage:false});
    await page.locator('[data-act="episode-next"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.episodes.secondary_diversion.closureReason,'academic');

    const routeResults={secondary_diversion:['academic']};
    await page.setViewportSize({width:360,height:773});
    for(const id of episodeIds){
      const rows=decisions.filter(event=>event.episode?.id===id).sort((a,b)=>a.episode.phase-b.episode.phase);
      const finalEvent=rows.at(-1);
      const startIndex=id==='secondary_diversion'?1:0;
      routeResults[id]??=[];
      for(let index=startIndex;index<finalEvent.choices.length;index++){
        if(id==='secondary_diversion'&&index===3)await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({development:{routeExposure:['alternativeSchool']}}));
        if(finalEvent.episode.role!=='start')await prepareFinal(page,id,finalEvent);
        run=await chooseAndFinish(page,finalEvent,index);
        assert.equal(run.episodes[id].closureReason,finalEvent.choices[index].route,`${id}/${index}: closure route`);
        assert.ok(['resolved','abandoned'].includes(run.episodes[id].status),`${id}/${index}: terminal status`);
        routeResults[id].push(finalEvent.choices[index].route);
      }
    }

    const sameLaneAge=45;
    await page.evaluate(age=>window.__LIFE_DEBUG__.patchRun({age,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,education:{status:'enrolled',level:4,path:'college'},employment:{status:'employed'},business:{status:'operating',operatingSkill:70,equity:200000,scale:'regional'},episodes:{adult_reeducation:{status:'active',phase:2,startedAt:44,nextPhaseAge:45,deadlineAge:47,route:'formal_program',boundActors:{},commitments:[],closureReason:null}}}),sameLaneAge);
    let eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
    assert.ok(!eligible.includes(eventFor('professional_certification',1).id),'same education lane allowed a second episode');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({episodes:{business_expansion:{status:'active',phase:2,startedAt:44,nextPhaseAge:45,deadlineAge:48,route:'validated',boundActors:{organization:{kind:'organization',id:'business_expansion:44',label:'本轮扩张单元'}},commitments:[],closureReason:null}}}));
    eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
    assert.ok(!eligible.includes(eventFor('retirement_transition',1).id),'two active episodes allowed a third start');

    const workTransition=eventFor('retirement_transition',1);
    const noActiveEpisodes={
      adult_reeducation:{status:'resolved'},
      business_expansion:{status:'resolved'},
      retirement_transition:{status:'inactive'}
    };
    for(const status of ['employed','gig','selfEmployed']){
      await page.evaluate(({status,episodes})=>window.__LIFE_DEBUG__.patchRun({age:60,episodes,usedEvents:[],timeline:[],yearQueue:[],later:{retirement:'none',inheritance:'none',care:'none',will:'none'},employment:{status,firstJobAge:25},activity:{mode:'work'}}),{status,episodes:noActiveEpisodes});
      eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
      assert.ok(eligible.includes(workTransition.id),`${status}: current paid work could not enter work transition`);
    }
    for(const sample of [
      {label:'long-search',status:'unemployed',firstJobAge:25,mode:'seeking'},
      {label:'never-worked',status:'unemployed',firstJobAge:null,mode:'seeking'},
      {label:'left-labour-force',status:'unemployed',firstJobAge:25,mode:'leisure'}
    ]){
      await page.evaluate(({sample,episodes})=>window.__LIFE_DEBUG__.patchRun({age:60,episodes,usedEvents:[],later:{retirement:'none'},employment:{status:sample.status,firstJobAge:sample.firstJobAge},activity:{mode:sample.mode}}),{sample,episodes:noActiveEpisodes});
      eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
      assert.ok(!eligible.includes(workTransition.id),`${sample.label}: non-working player entered work transition`);
    }
    for(const age of [54,81]){
      await page.evaluate(({age,episodes})=>window.__LIFE_DEBUG__.patchRun({age,episodes,usedEvents:[],employment:{status:'employed',firstJobAge:25},activity:{mode:'work'}}),{age,episodes:noActiveEpisodes});
      eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
      assert.ok(!eligible.includes(workTransition.id),`${age}: work transition escaped 55-80 age window`);
    }

    await page.evaluate(episodes=>window.__LIFE_DEBUG__.patchRun({
      age:65,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,episodes,
      health:{status:'limited',conditionSeverity:30,disability:'persistent',careNeed:2}
    }),noActiveEpisodes);
    run=await chooseAndFinish(page,eventFor('long_term_care',1),2);
    assert.equal(run.episodes.long_term_care.status,'abandoned','refusing assessment did not end the current care episode');
    assert.equal(run.episodes.long_term_care.closureReason,'refused','refusing assessment received the wrong closure reason');

    await page.evaluate(episodes=>window.__LIFE_DEBUG__.patchRun({
      age:70,naturalDeathAge:105,rngState:123456789,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:false,
      episodes:{...episodes,long_term_care:{status:'active',phase:2,startedAt:68,nextPhaseAge:70,deadlineAge:72,route:'assessed',boundActors:{},commitments:[],closureReason:null}},
      health:{status:'well',conditionSeverity:0,disability:'none',careNeed:0}
    }),noActiveEpisodes);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.sceneQueue[0]?.reason,'invalidated','recovered care episode did not use invalidated closure');
    await page.locator('[data-act="episode-next"]').click();

    await page.evaluate(episodes=>window.__LIFE_DEBUG__.patchRun({
      age:62,episodes,usedEvents:[],timeline:[],yearQueue:[],people:[],
      later:{retirement:'none',inheritance:'none',care:'none',will:'none'},
      employment:{status:'unemployed',firstJobAge:null,firstJobOutcome:'longSearch'},
      activity:{mode:'seeking'},housing:{status:'renting',value:0},
      relationships:{partnerStatus:'none',activePartnerId:null,childCount:0,network:12},
      health:{status:'well',disability:'none',careNeed:0,conditionSeverity:0},
      pressures:{loneliness:45}
    }),noActiveEpisodes);
    let eligibleBeats=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('beat'));
    assert.ok(eligibleBeats.includes('beat_354'),'ordinary later-life beat unavailable in vertical slice');
    assert.ok(eligibleBeats.includes('beat_370'),'never-worked echo unavailable in vertical slice');
    assert.ok(eligibleBeats.includes('beat_409'),'recurring daily beat unavailable in vertical slice');
    assert.ok(eligibleBeats.includes('beat_380'),'loneliness echo unavailable despite matching pressure');
    for(const id of ['beat_353','beat_356','beat_360','beat_375'])
      assert.ok(!eligibleBeats.includes(id),`${id}: vertical slice received a false career or family fact`);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:65,later:{will:'documented'},health:{status:'well',conditionSeverity:0,disability:'none',careNeed:0}}));
    eligibleBeats=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('beat'));
    assert.ok(!eligibleBeats.includes('beat_384'),'will status alone fabricated an active treatment goal');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({health:{status:'treating'}}));
    eligibleBeats=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('beat'));
    assert.ok(eligibleBeats.includes('beat_384'),'active treatment state could not reach treatment-goal beat');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:62,later:{will:'none'},health:{status:'well',conditionSeverity:0,disability:'none',careNeed:0}}));
    eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
    assert.ok(eligible.includes('decision_189'),'course waitlist choice unavailable in vertical slice');
    assert.ok(eligible.includes('decision_191'),'emotional inducement choice unavailable in vertical slice');

    for(const id of ['beat_354','beat_370']){
      await page.evaluate(event=>window.__LIFE_DEBUG__.patchRun({yearQueue:[event],yearStarted:true}),beatFor(id));
      await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
      assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).timeline.at(-1).id,id,`${id}: representative beat was not actually displayed`);
    }
    const decisionHistoryBefore=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot().decisionHistory.length);
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.forceDecision('decision_191')),'decision_191');
    assert.match(await page.locator('.choice-sheet').innerText(),/连续几周|设预算/);
    await fitSheet(page,'later-risk-360x773');
    await page.screenshot({path:path.join(OUT,'04-later-risk-360x773.png'),fullPage:false});
    await page.locator('[data-choice="0"]').click();
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).decisionHistory.length,decisionHistoryBefore+1);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).decisionHistory.length,decisionHistoryBefore+1,'refresh duplicated later-life decision settlement');

    const recurring=beatFor('beat_409'),sameGroup=beatFor('beat_410');
    await page.evaluate(id=>window.__LIFE_DEBUG__.patchRun({age:70,usedEvents:[id],timeline:[],yearQueue:[]}),recurring.id);
    eligibleBeats=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('beat'));
    assert.ok(eligibleBeats.includes(recurring.id),'recurring beat remained permanently blocked by usedEvents');
    await page.evaluate(id=>window.__LIFE_DEBUG__.patchRun({timeline:[{id,age:63,kind:'beat',track:'later',text:'old'}]}),recurring.id);
    eligibleBeats=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('beat'));
    assert.ok(!eligibleBeats.includes(recurring.id),'same recurring sentence returned before eight years');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:71}));
    eligibleBeats=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('beat'));
    assert.ok(eligibleBeats.includes(recurring.id),'same recurring sentence did not return after eight years');
    await page.evaluate(id=>window.__LIFE_DEBUG__.patchRun({timeline:[{id,age:69,kind:'beat',track:'later',text:'same group'}]}),sameGroup.id);
    eligibleBeats=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('beat'));
    assert.ok(!eligibleBeats.includes(recurring.id),'recurrence group returned before three years');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:72}));
    eligibleBeats=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('beat'));
    assert.ok(eligibleBeats.includes(recurring.id),'recurrence group did not return after three years');
    await page.evaluate(event=>window.__LIFE_DEBUG__.patchRun({yearQueue:[event]}),sameGroup);
    eligibleBeats=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('beat'));
    assert.ok(!eligibleBeats.includes(recurring.id),'same recurrence group entered one year queue twice');
    await page.evaluate(event=>window.__LIFE_DEBUG__.patchRun({timeline:[],yearQueue:[event],yearStarted:true,usedEvents:[event.id]}),recurring);
    const beforeRecurring=await page.evaluate(()=>{const run=window.__LIFE_DEBUG__.snapshot();return{peace:run.desires.peace.fulfillment,network:run.relationships.network,used:run.usedEvents.filter(id=>id==='beat_409').length}});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    const afterRecurring=await page.evaluate(()=>{const run=window.__LIFE_DEBUG__.snapshot();return{peace:run.desires.peace.fulfillment,network:run.relationships.network,used:run.usedEvents.filter(id=>id==='beat_409').length,timeline:run.timeline.filter(item=>item.id==='beat_409').length}});
    assert.deepEqual(afterRecurring,{...beforeRecurring,timeline:1},'recurring beat accumulated durable effects or unique history');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).timeline.filter(item=>item.id==='beat_409').length,1,'refresh duplicated recurring beat');

    const educationBase={status:'completed',level:3,path:'highSchool',applicationStatus:'vocationalExit',graduateApplicationStatus:'none'};
    let drawerText=await drawerTextFor(page,{...educationBase,courseworkEvidence:0,campusEvidence:0,practiceEvidence:0,researchEvidence:0});
    assert.match(drawerText,/高等教育\s+尚无明显侧重 · 本科改走职教 · 研究生未申请/);
    assert.doesNotMatch(drawerText,/学习证据|本科申请|研究生申请|求职记录|已经报到|vocationalExit/);
    drawerText=await drawerTextFor(page,{...educationBase,courseworkEvidence:1,campusEvidence:2,practiceEvidence:8,researchEvidence:3});
    assert.match(drawerText,/侧重实践/);
    drawerText=await drawerTextFor(page,{...educationBase,courseworkEvidence:8,campusEvidence:2,practiceEvidence:8,researchEvidence:3});
    assert.match(drawerText,/课程与实践并重/);
    drawerText=await drawerTextFor(page,{...educationBase,courseworkEvidence:8,campusEvidence:8,practiceEvidence:8,researchEvidence:3});
    assert.match(drawerText,/方向较均衡/);

    const longTermCareStartId=eventFor('long_term_care',1).id;
    await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__,run=debug.snapshot(),state={...run.housing};
      debug.patchRun({
        age:70,
        health:{...run.health,careNeed:2,status:'limited'},
        episodes:{long_term_care:{status:'inactive'}},
        housing:{...run.housing,history:[...(run.housing.history||[]),{age:69,year:2095,kind:'choice',reason:'usedLaterFit',sourceEventId:'used-later-fit',choiceId:'used-later-fit',housingChoiceKind:'laterFit',debtException:false,state}]}
      });
    });
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes(longTermCareStartId),false,'long-term-care episode started after laterFit was already consumed');

    const affordabilityCashGate=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__;
      debug.patchRun({
        age:30,
        finance:{cash:0,liabilities:[]},
        employment:{status:'employed',incomeAnnualGross:150000,incomeStability:'fixed'},
        housing:{status:'renting',value:0,arrangement:'solo',region:'tier2',stability:'stable',accessibility:'standard',costShare:'self',coResidentRefs:[],history:[]}
      });
      const candidate={status:'renting',value:0,arrangement:'solo',region:'tier2',stability:'stable',accessibility:'standard',costShare:'self',coResidentRefs:[]};
      return{current:debug.housingAffordability(candidate,{current:true}),newLease:debug.housingAffordability(candidate,{current:false})};
    });
    assert.notEqual(affordabilityCashGate.current.reason?.startsWith('现金还差'),true,'current renting incorrectly required a new deposit');
    assert.equal(affordabilityCashGate.newLease.level,'infeasible');
    assert.match(affordabilityCashGate.newLease.reason,/现金还差/);

    const partnerContributionCap=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__,run=debug.snapshot(),partner={id:'affordability_partner',relation:'partner',alive:true,bornAt:5,bond:70,housingIncomeAnnualGross:2000000,housingIncomeStability:'fixed'};
      debug.patchRun({
        age:35,
        finance:{cash:100000,liabilities:[]},
        employment:{status:'employed',incomeAnnualGross:20000,incomeStability:'fixed'},
        relationships:{activePartnerId:partner.id,partnerStatus:'partnered'},
        people:[...run.people.filter(item=>item.id!==partner.id),partner],
        housing:{status:'family',value:0,arrangement:'originFamily',region:'tier1',stability:'stable',accessibility:'standard',costShare:'supported',coResidentRefs:[],history:[]}
      });
      return debug.housingAffordability({status:'renting',value:0,arrangement:'partner',region:'tier1',stability:'stable',accessibility:'standard',costShare:'joint',coResidentRefs:[partner.id]},{current:false});
    });
    assert.equal(partnerContributionCap.level,'infeasible','partner gross income bypassed the capped housing contribution');
    assert.ok(partnerContributionCap.availableIncome<partnerContributionCap.reliableIncome,'full partner income was still counted as spendable housing income');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({
      age:35,
      finance:{cash:1000,liabilities:[]},
      employment:{status:'employed',incomeAnnualGross:150000,incomeStability:'fixed'},
      housing:{status:'family',value:0,arrangement:'originFamily',region:'tier2',stability:'stable',accessibility:'standard',costShare:'supported',coResidentRefs:[],history:[]}
    }));
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes('decision_197'),false,'purchase panel appeared before any purchase route was affordable');
    await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__,run=debug.snapshot();
      debug.patchRun({
      age:35,
      finance:{cash:500000,liabilities:[]},
      employment:{status:'employed',incomeAnnualGross:150000,incomeStability:'fixed'},
      relationships:{activePartnerId:'housing_partner',partnerStatus:'partnered'},
      people:[...run.people,{id:'housing_partner',relation:'partner',alive:true,bornAt:5,bond:70,housingIncomeAnnualGross:100000,housingIncomeStability:'fixed'}],
      housing:{status:'family',value:0,arrangement:'originFamily',region:'tier2',stability:'stable',accessibility:'standard',costShare:'supported',coResidentRefs:[],history:[]}
      });
    });
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes('decision_197'),true,'affordable purchase panel was not eligible');
    const housingTransitions=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__,apply=(kind,value,index)=>debug.transitionHousing({...value,kind:'choice',housingChoiceKind:kind},{sourceEventId:`housing-test-${index}`,choiceId:`housing-test-${index}`});
      const dorm=debug.transitionHousing({status:'supported',arrangement:'dormitory',stability:'conditional',costShare:'supported',coResidentRefs:[],kind:'background',reason:'testDormitory'},{sourceEventId:'housing-test-dormitory'});
      const first=apply('firstIndependent',{status:'renting',arrangement:'shared',stability:'conditional',costShare:'self',coResidentRefs:[],reason:'testFirst'},1);
      const second=apply('partnerReconfiguration',{status:'renting',arrangement:'partner',stability:'stable',costShare:'joint',coResidentRefs:['housing_partner'],reason:'testPartnerMove'},2);
      const third=apply('homePurchase',{status:'mortgaged',arrangement:'partner',region:'tier2',stability:'stable',costShare:'joint',coResidentRefs:['housing_partner'],reason:'testBuy'},3);
      const fourth=apply('laterFit',{accessibility:'adapted',reason:'testFourth'},4);
      const propertyOverwrite=debug.transitionHousing({status:'renting',value:0,arrangement:'solo',kind:'background',reason:'invalidPropertyOverwrite'},{sourceEventId:'housing-test-property-overwrite'});
      const afterPurchase=debug.snapshot();
      debug.patchRun({
        employment:{...afterPurchase.employment,incomeAnnualGross:20000,incomeStability:'fixed'},
        people:afterPurchase.people.map(item=>item.id==='housing_partner'?{...item,housingIncomeAnnualGross:0}:item)
      });
      const mortgageOnlyException=debug.housingChoiceAllowed('debtRelief',true);
      const debt=debug.transitionHousing({accessibility:'adapted',kind:'choice',reason:'testDebtRelief',housingChoiceKind:'debtRelief',debtException:true},{sourceEventId:'housing-test-debt',choiceId:'housing-test-debt'});
      const repeat=debug.transitionHousing({accessibility:'adapted',kind:'choice',reason:'testDebtRelief',housingChoiceKind:'debtRelief',debtException:true},{sourceEventId:'housing-test-debt',choiceId:'housing-test-debt'});
      return{dorm,first,second,third,fourth,propertyOverwrite,mortgageOnlyException,debt,repeat,state:debug.snapshot().housing};
    });
    assert.equal(housingTransitions.dorm.result.applied,true,'education dormitory background was not recorded');
    assert.ok(housingTransitions.first.result.applied&&housingTransitions.second.result.applied&&housingTransitions.third.result.applied);
    assert.equal(housingTransitions.fourth.result.applied,false,'fourth ordinary housing choice was allowed');
    assert.equal(housingTransitions.propertyOverwrite.result.applied,false,'ordinary move erased an owned or mortgaged home');
    assert.match(housingTransitions.propertyOverwrite.result.reason,/产权住房/);
    assert.equal(housingTransitions.mortgageOnlyException.allowed,true,'mortgage-only failure did not open the one debt housing exception');
    assert.equal(housingTransitions.debt.result.applied,true,'debt-caused fourth housing choice was blocked');
    assert.equal(housingTransitions.repeat.result.reason,'duplicate','refresh-equivalent housing transition duplicated history');
    assert.equal(housingTransitions.state.keyChoiceCount,4);
    assert.equal(housingTransitions.state.history.at(-1).housingChoiceKind,'debtRelief');
    assert.equal(housingTransitions.state.history.at(-1).debtException,true);

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({later:{retirement:'retired',inheritance:'limited',care:'stable',will:'documented'}}));
    const drawerViewports=[[360,773],[360,640],[320,568]];
    for(const[width,height]of drawerViewports){
      await page.setViewportSize({width,height});
      await page.locator('[data-act="open-drawer"]').click();
      await page.waitForTimeout(900);
      await fitDrawer(page,`drawer-${width}x${height}`);
      await page.screenshot({path:path.join(OUT,`drawer-${width}x${height}.png`),fullPage:false});
      await page.locator('.drawer [data-act="close-drawer"]').click();
    }

    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,migration:'v0.5.8-run-cleared-meta-preserved',episodes:episodeIds.length,endings:Object.values(expectedRoutes).reduce((sum,routes)=>sum+routes.length,0),routeResults,sameAgeCards:true,refreshRestored:['choice','result','later-decision'],laneLimit:true,legacyArcFields:0,laterStateDrawer:true,representativeLaterPath:true,viewports:['360x773','360x640','320x568'],screenshots:fs.readdirSync(OUT).sort(),errors},null,2));
    await context.close();
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
