const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {launchChromium}=require('./playwright-runtime.cjs');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.FULL_TRACK_SMOKE_OUT||path.join(os.tmpdir(),'life-unloaded-episode-regression');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data.json'),'utf8'));
const decisions=data.events.filter(event=>event.kind==='decision');
const laterBeats=data.events.filter(event=>event.kind==='beat'&&event.track==='later');
const socialDecisions=decisions.filter(event=>event.track==='social');
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
  assert.match(geometry.text,/退休安排·已退出工作/);
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
  const run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.sceneQueue[0].kind,'choice');
  const age=run.age;
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
  assert.deepEqual(
    Object.fromEntries(['beat','decision','consequence','blackSwan'].map(kind=>[
      kind,
      data.events.filter(event=>event.kind===kind).length
    ])),
    {beat:480,decision:205,consequence:205,blackSwan:20}
  );
  assert.ok(decisions.every(event=>!('arc' in event)));
  assert.equal(socialDecisions.length,8);
  assert.ok(socialDecisions.every(event=>event.situation&&event.choices.some(choice=>
    choice.outcomeTags?.includes('social:intent:solitude')||
    ['leftAlone','changedCircle','leftOnTime','refusedFavor','declinedHousing','usedFormalRoute'].includes(choice.route)
  )),'social decisions lost their shared facts or reasonable refusal route');
  assert.equal(socialDecisions.find(event=>event.id==='decision_206').actors[0].optional,true,'later social choice still required an old friend');
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
    assert.equal(migrated.gameVersion,'0.6.11');
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
    previousReleaseSave.schemaVersion=12;
    previousReleaseSave.meta.schemaVersion=12;
    previousReleaseSave.gameVersion='0.6.8';
    previousReleaseSave.run.schemaVersion=12;
    previousReleaseSave.run.gameVersion='0.6.8';
    previousReleaseSave.run.age=42;
    const preservedAge=previousReleaseSave.run.age;
    await page.addInitScript(({key,value})=>{
      if(sessionStorage.getItem('v068-previous-release-loaded'))return;
      localStorage.setItem(key,JSON.stringify(value));
      sessionStorage.setItem('v068-previous-release-loaded','1');
    },{key:SAVE_KEY,value:previousReleaseSave});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const schema12Migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.equal(schema12Migrated.run,null,'v0.6.8 Schema 12 active run was not cleared');
    assert.notEqual(preservedAge,undefined);
    await openPlayable(page);

    const inheritanceStart=eventFor('parental_inheritance',1);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:60,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,people:[
      {id:'father_inheritance',relation:'father',alive:false,bornAt:-28,status:'deceased',bond:55},
      {id:'mother_inheritance',relation:'mother',alive:true,bornAt:-26,status:'family',bond:55}
    ]}));
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),inheritanceStart.id),inheritanceStart.id);
    assert.match((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).currentDecision.situation,/另一位仍在世/);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({phase:'playing',sceneQueue:[],currentDecision:null,episodes:{parental_inheritance:{status:'inactive',phase:0,startedAt:null,nextPhaseAge:null,deadlineAge:null,route:null,boundActors:{},commitments:[],closureReason:null}},people:[
      {id:'father_inheritance',relation:'father',alive:false,bornAt:-28,status:'deceased',bond:55},
      {id:'mother_inheritance',relation:'mother',alive:false,bornAt:-26,status:'deceased',bond:55}
    ]}));
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),inheritanceStart.id),inheritanceStart.id);
    assert.match((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).currentDecision.situation,/父母都已去世/);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({phase:'playing',sceneQueue:[],currentDecision:null,episodes:{parental_inheritance:{status:'inactive',phase:0,startedAt:null,nextPhaseAge:null,deadlineAge:null,route:null,boundActors:{},commitments:[],closureReason:null}}}));

    const diversion=eventFor('secondary_diversion',1);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({attrs:{intellect:10},education:{status:'completed',level:2,path:'middleSchool'},development:{learningHabit:90,attendance:96,teacherSupport:82,peerSupport:70,selfAdvocacy:75,careLoad:2,traumaLoad:2,routeKnowledge:75,languagePreparation:20}}));
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),diversion.id),diversion.id);
    let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    const diversionAge=run.age;
    assert.equal(run.sceneQueue[0].kind,'choice');
    assert.ok((await page.locator('.choice-sheet').innerText()).includes(diversion.situation));
    await page.waitForTimeout(300);
    const promptSituationLayout=await page.evaluate(()=>{
      const situation=document.querySelector('.choice-sheet>.episode-copy');
      const prompt=document.querySelector('#choice-dialog-title');
      const following=situation?.nextElementSibling;
      const style=situation?getComputedStyle(situation):null;
      return situation&&prompt?{
        promptFirst:Boolean(prompt.compareDocumentPosition(situation)&Node.DOCUMENT_POSITION_FOLLOWING),
        promptGap:situation.getBoundingClientRect().top-prompt.getBoundingClientRect().bottom,
        followingGap:following?following.getBoundingClientRect().top-situation.getBoundingClientRect().bottom:null,
        fontSize:parseFloat(style.fontSize),
        lineHeight:parseFloat(style.lineHeight),
        marginBottom:parseFloat(style.marginBottom)
      }:{promptFirst:false,promptGap:0,followingGap:null,fontSize:0,lineHeight:0,marginBottom:0};
    });
    assert.equal(promptSituationLayout.promptFirst,true,'prompt must appear before the situation copy');
    assert.ok(promptSituationLayout.promptGap>=12,`prompt and situation gap too small: ${promptSituationLayout.promptGap}px`);
    assert.ok(promptSituationLayout.followingGap>=14,`situation and following content gap too small: ${promptSituationLayout.followingGap}px`);
    assert.equal(promptSituationLayout.fontSize,15,'situation copy font size regressed');
    assert.ok(promptSituationLayout.lineHeight>=26,'situation copy line height regressed');
    assert.equal(promptSituationLayout.marginBottom,18,'situation copy bottom margin regressed');
    assert.equal(await page.locator('[data-act="episode-next"]').count(),0);
    await fitSheet(page,'choice-360x773');
    await page.screenshot({path:path.join(OUT,'01-choice-360x773.png'),fullPage:false});
    await page.evaluate(({key,eventId})=>{
      const stored=JSON.parse(localStorage.getItem(key));
      stored.run.sceneQueue=[
        {kind:'situation',eventId,text:stored.run.currentDecision.situation},
        {kind:'choice',eventId}
      ];
      localStorage.setItem(key,JSON.stringify(stored));
    },{key:SAVE_KEY,eventId:diversion.id});
    await page.setViewportSize({width:360,height:640});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,diversionAge);
    assert.equal(run.sceneQueue[0].kind,'choice');
    assert.equal(run.sceneQueue.length,1,'legacy situation + choice queue was not collapsed');
    assert.equal(run.currentDecision.situation,diversion.situation);
    await fitSheet(page,'choice-360x640');
    await page.screenshot({path:path.join(OUT,'02-choice-360x640.png'),fullPage:false});
    await page.locator('[data-choice="0"]').click();
    await page.setViewportSize({width:320,height:568});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,diversionAge);
    assert.equal(run.sceneQueue[0].kind,'result');
    assert.equal(await page.locator('#episode-dialog-title').innerText(),run.sceneQueue[0].text);
    assert.equal(await page.locator('[data-act="episode-next"]').innerText(),'继续');
    assert.doesNotMatch(await page.locator('.episode-sheet').innerText(),/这一步已经落定|记到账上/);
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
        if(id==='long_term_care'&&index===3)await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({later:{care:'familyOnly'}}));
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
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes(longTermCareStartId),true,'care assessment was incorrectly blocked by an earlier housing choice');
    const careStart=eventFor('long_term_care',1);
    assert.ok(careStart.choices.every(choice=>!choice.effects.some(command=>command.type==='transitionHousing')),'care assessment consumed or rewrote housing');

    const residenceOnly=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__;
      debug.patchRun({
        age:35,
        finance:{cash:500000,liabilities:[{id:'school_mortgage',kind:'mortgage',principal:200000,rate:.04,status:'current',arrears:0,enforcementEligible:true,housingSecured:true}]},
        employment:{status:'employed',incomeAnnualGross:120000,incomeStability:'fixed'},
        housing:{status:'mortgaged',value:500000,arrangement:'solo',region:'tier2',stability:'stable',accessibility:'standard',costShare:'self',coResidentRefs:[],history:[]}
      });
      const transition=debug.transitionHousing({status:'supported',value:0,arrangement:'dormitory',region:'tier2',stability:'temporary',accessibility:'standard',costShare:'supported',coResidentRefs:[],kind:'background',reason:'testSchoolResidence',residenceOnly:true},{sourceEventId:'test-school',choiceId:'test-school'});
      const before=debug.snapshot().finance.liabilities.find(item=>item.id==='school_mortgage').principal;
      debug.settleYear();
      const after=debug.snapshot();
      return{transition,before,after};
    });
    assert.equal(residenceOnly.transition.result.applied,true);
    assert.equal(residenceOnly.transition.housing.status,'mortgaged','school residence erased property tenure');
    assert.equal(residenceOnly.transition.housing.value,500000,'school residence erased property value');
    assert.equal(residenceOnly.transition.housing.arrangement,'dormitory');
    assert.ok(residenceOnly.after.finance.liabilities.find(item=>item.id==='school_mortgage').principal<residenceOnly.before,'mortgage stopped while the owner lived in a dormitory');

    const socialCommands=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__;
      debug.patchRun({
        age:35,people:[],social:{primaryPersonId:null,secondaryPersonId:null},decisionHistory:[],
        relationships:{activePartnerId:null,lastPartnerId:null,partnerStatus:'none',network:12},
        employment:{status:'employed',applicationStatus:'none',pendingOfferId:'none',referralPersonId:null,referralStatus:'none'},
        finance:{cash:500000,liabilities:[]},
        housing:{status:'owned',value:600000,arrangement:'solo',region:'tier2',stability:'stable',accessibility:'standard',costShare:'self',coResidentRefs:[],history:[]}
      });
      const primary=debug.applyCommands([
        {type:'createSocialPerson',target:'people',value:{slot:'primary',displayName:'阿宁',source:'campus',tie:'close',proximity:'local',turn:'deepened',support:'unseen'}}
      ],{sourceEventId:'social-primary',choiceId:'social-primary'});
      const referral=debug.applyCommands([
        {type:'createSocialPerson',target:'people',value:{slot:'secondary',displayName:'小周',source:'work',tie:'friend',proximity:'local',turn:'deepened',support:'unseen'}},
        {type:'createEmploymentReferral',target:'employment',value:{slot:'secondary',status:'available'}}
      ],{sourceEventId:'social-referral',choiceId:'social-referral'});
      debug.patchRun({employment:{applicationChannel:'openRecruitment'}});
      const openJob=debug.applyCommands([
        {type:'applyEmploymentProfile',target:'employment',value:'store_clerk'}
      ],{sourceEventId:'open-job',choiceId:'open-job'});
      const beforeThird=debug.snapshot();
      const third=debug.applyCommands([
        {type:'add',target:'finance.cash',value:4321},
        {type:'createSocialPerson',target:'people',value:{slot:'primary',displayName:'第三人',source:'interest'}}
      ],{sourceEventId:'social-third',choiceId:'social-third'});
      const afterThird=debug.snapshot();
      const residence=debug.applyCommands([
        {type:'socialCoResidence',target:'housing',value:{slot:'primary',status:'supported',value:0,stability:'temporary',accessibility:'standard',residenceOnly:true,kind:'choice',housingChoiceKind:'socialCoResidence',reason:'socialTemporaryStay'}}
      ],{sourceEventId:'social-home',choiceId:'social-home'});
      const afterResidence=debug.snapshot();
      const movedRemote=debug.applyCommands([
        {type:'updateSocialPerson',target:'people',value:{slot:'primary',proximity:'remote',turn:'drifted'}}
      ],{sourceEventId:'social-remote',choiceId:'social-remote'});
      const afterRemote=debug.snapshot();
      debug.applyCommands([
        {type:'updateSocialPerson',target:'people',value:{slot:'primary',proximity:'local',turn:'reconnected'}}
      ],{sourceEventId:'social-local',choiceId:'social-local'});
      const dating=debug.applyCommands([
        {type:'transitionSocialToDating',target:'relationships.partnerStatus',value:{slot:'primary'}}
      ],{sourceEventId:'social-date',choiceId:'social-date'});
      return{primary,referral,openJob,beforeThird,third,afterThird,residence,afterResidence,movedRemote,afterRemote,dating,afterDating:debug.snapshot()};
    });
    assert.equal(socialCommands.primary.result.ok,true);
    assert.equal(socialCommands.referral.result.ok,true,'same-transaction social referral failed');
    assert.equal(socialCommands.referral.run.employment.referralPersonId,'social_secondary');
    assert.equal(socialCommands.referral.run.employment.referralStatus,'available');
    assert.equal(socialCommands.referral.run.employment.status,'employed','referral granted or replaced a job');
    assert.equal(socialCommands.openJob.result.ok,true);
    assert.equal(socialCommands.openJob.run.employment.referralStatus,'available','unrelated open recruitment consumed the friend referral');
    assert.equal(socialCommands.third.result.ok,false,'third lifetime social person was created');
    assert.equal(socialCommands.afterThird.finance.cash,socialCommands.beforeThird.finance.cash,'failed third-person transaction left an earlier write');
    assert.deepEqual(socialCommands.afterThird.social,socialCommands.beforeThird.social);
    assert.equal(socialCommands.residence.result.ok,true);
    assert.equal(socialCommands.afterResidence.housing.status,'owned','temporary friend stay erased property tenure');
    assert.equal(socialCommands.afterResidence.housing.value,600000,'temporary friend stay erased property value');
    assert.equal(socialCommands.afterResidence.housing.arrangement,'shared');
    assert.deepEqual(socialCommands.afterResidence.housing.coResidentRefs,['social_primary']);
    assert.equal(socialCommands.afterResidence.housing.costShare,'self');
    assert.equal(socialCommands.afterResidence.housing.history.at(-1).housingChoiceKind,'socialCoResidence');
    assert.deepEqual(socialCommands.afterRemote.housing.coResidentRefs,[],'remote friend remained a concrete co-resident');
    assert.equal(socialCommands.afterRemote.housing.status,'owned','co-resident cleanup evicted the player or erased property');
    assert.equal(socialCommands.dating.result.ok,true);
    const datingPerson=socialCommands.afterDating.people.find(item=>item.id==='social_primary');
    assert.equal(socialCommands.afterDating.relationships.activePartnerId,'social_primary');
    assert.equal(socialCommands.afterDating.relationships.partnerStatus,'dating');
    assert.equal(datingPerson.relation,'partner');
    assert.equal(datingPerson.social.displayName,'阿宁');
    assert.equal(datingPerson.social.source,'campus');
    assert.equal(socialCommands.afterDating.social.primaryPersonId,'social_primary','dating released the lifetime social slot');

    const socialEndings=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__;
      debug.patchRun({people:[],social:{primaryPersonId:null,secondaryPersonId:null},relationships:{network:8},pressures:{loneliness:12},decisionHistory:[{outcomeTags:['social:intent:solitude']}]});
      const solitude={intent:debug.latestSocialIntent(),signal:debug.socialEndingSignal(),run:debug.snapshot()};
      debug.patchRun({relationships:{network:75},pressures:{loneliness:12},decisionHistory:[]});
      const broad=debug.socialEndingSignal();
      debug.patchRun({relationships:{network:8},pressures:{loneliness:65},decisionHistory:[{outcomeTags:['social:intent:connect']}]});
      const lonely=debug.socialEndingSignal();
      return{solitude,broad,lonely};
    });
    assert.equal(socialEndings.solitude.intent,'solitude');
    assert.equal(socialEndings.solitude.signal.kind,'activeSolitude');
    assert.equal(socialEndings.solitude.signal.floor,55);
    assert.equal(socialEndings.solitude.run.pressures.loneliness,12,'active solitude changed loneliness by itself');
    assert.equal(socialEndings.broad.kind,'broadNetwork');
    assert.equal(socialEndings.lonely.kind,'passiveLoneliness');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({
      phase:'playing',sceneQueue:[],currentDecision:null,people:[],
      social:{primaryPersonId:null,secondaryPersonId:null},
      decisionHistory:[{outcomeTags:['social:intent:solitude']}],pressures:{loneliness:12},
      development:{learningHabit:48,teacherSupport:50,peerSupport:30},
      education:{readiness:87},relationships:{partnerBond:91},
      mobility:{lastOverseasSystem:'us',dailyAdaptation:48,chineseCommunityTies:68,localTies:24,belonging:77,workAuthorization:'verified'},
      desires:{freedom:{claimed:true,fulfillment:73}},
      episodes:{school_harm:{status:'active',phase:2,startedAt:15,nextPhaseAge:16,deadlineAge:19,route:'disclosure',boundActors:{},commitments:[],closureReason:null}}
    }));
    await page.locator('[data-act="open-drawer"]').click();
    let statusText=await page.locator('.drawer').innerText();
    assert.match(statusText,/主要独来独往/);
    assert.match(statusText,/日常还在适应/);
    assert.match(statusText,/华人联系稳定/);
    assert.match(statusText,/本地联系很少/);
    assert.match(statusText,/自由 · 现在最在意/);
    assert.match(statusText,/校园伤害/);
    assert.doesNotMatch(statusText,/准备度87|关系 91|生活适应48|华人联系68|本地联系24|归属77|自由 · 已认领 · 73|第2阶段/);
    await page.locator('.drawer [data-act="close-drawer"]').click();

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({decisionHistory:[],people:[],social:{primaryPersonId:null,secondaryPersonId:null}}));
    await page.locator('[data-act="open-drawer"]').click();
    statusText=await page.locator('.drawer').innerText();
    assert.match(statusText,/认识一些人，但没有常联系的朋友/);
    await page.locator('.drawer [data-act="close-drawer"]').click();

    await page.evaluate(()=>window.__LIFE_DEBUG__.applyCommands([
      {type:'createSocialPerson',target:'people',value:{slot:'primary',displayName:'小禾',source:'interest',tie:'friend',proximity:'local',turn:'met',support:'unseen'}}
    ],{sourceEventId:'status-person',choiceId:'status-person'}));
    await page.locator('[data-act="open-drawer"]').click();
    statusText=await page.locator('.drawer').innerText();
    assert.match(statusText,/小禾 · 朋友/);
    await page.locator('.drawer [data-act="close-drawer"]').click();

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:60,people:[],social:{primaryPersonId:null,secondaryPersonId:null},usedEvents:[],decisionHistory:[],sceneQueue:[],currentDecision:null,yearStarted:true}));
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes('decision_206'),true,'late solitude/new-circle decision was unreachable without an old friend');
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.forceDecision('decision_206')),'decision_206');
    const laterSocialView=JSON.parse(await page.evaluate(()=>window.render_game_to_text())).run.decision;
    assert.deepEqual(laterSocialView.choices.map(choice=>choice.enabled),[false,false,true,true]);
    assert.match(await page.locator('.choice-sheet').innerText(),/通讯录、附近活动和一整天空闲/,'social situation was not rendered before the choices');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:25,phase:'playing',people:[],social:{primaryPersonId:null,secondaryPersonId:null},usedEvents:[],decisionHistory:[],scheduledConsequences:[],sceneQueue:[],currentDecision:null,yearStarted:true}));
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.forceDecision('decision_204')),'decision_204');
    await page.locator('[data-choice="0"]').click();
    await page.waitForTimeout(250);
    const stableSocialBeforeReload=await page.evaluate(()=>{const run=window.__LIFE_DEBUG__.snapshot(),history=run.decisionHistory.at(-1),scheduled=run.scheduledConsequences.find(item=>item.sourceDecisionId==='decision_204');return{history,scheduled,count:run.decisionHistory.filter(item=>item.eventId==='decision_204').length}});
    assert.ok(stableSocialBeforeReload.history.socialOutcomeVariantId);
    assert.match(stableSocialBeforeReload.history.memoryKey,new RegExp(`${stableSocialBeforeReload.history.socialOutcomeVariantId}$`));
    assert.equal(stableSocialBeforeReload.scheduled.socialOutcomeVariantId,stableSocialBeforeReload.history.socialOutcomeVariantId);
    assert.equal(stableSocialBeforeReload.scheduled.memoryKey,stableSocialBeforeReload.history.memoryKey);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const stableSocialAfterReload=await page.evaluate(()=>{const run=window.__LIFE_DEBUG__.snapshot(),history=run.decisionHistory.at(-1),scheduled=run.scheduledConsequences.find(item=>item.sourceDecisionId==='decision_204');return{history,scheduled,count:run.decisionHistory.filter(item=>item.eventId==='decision_204').length}});
    assert.equal(stableSocialAfterReload.count,1,'refresh duplicated social decision settlement');
    assert.equal(stableSocialAfterReload.history.socialOutcomeVariantId,stableSocialBeforeReload.history.socialOutcomeVariantId,'refresh rerolled social outcome');
    assert.equal(stableSocialAfterReload.scheduled.memoryKey,stableSocialBeforeReload.scheduled.memoryKey,'refresh changed social echo memory');

    const invalidatedSocialEcho=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__;
      debug.patchRun({age:40,people:[],social:{primaryPersonId:null,secondaryPersonId:null},usedEvents:[],decisionHistory:[],scheduledConsequences:[],sceneQueue:[],currentDecision:null,yearStarted:true,finance:{liabilities:[{id:'social-crisis-debt',kind:'consumer',principal:120000,rate:.08,status:'current',arrears:0,enforcementEligible:true,housingSecured:false}]}});
      debug.applyCommands([{type:'createSocialPerson',target:'people',value:{slot:'primary',displayName:'小禾',source:'interest',tie:'friend',proximity:'local',turn:'met',support:'unseen'}}],{sourceEventId:'social-echo-person',choiceId:'social-echo-person'});
      debug.forceDecision('decision_205');
      document.querySelector('[data-choice="0"]').click();
      return new Promise(resolve=>setTimeout(()=>{
        const settled=debug.snapshot(),schedule=settled.scheduledConsequences.find(item=>item.sourceDecisionId==='decision_205');
        debug.patchRun({people:settled.people.map(item=>item.id==='social_primary'?{...item,alive:false}:item),age:schedule.dueAge});
        const due=debug.dueConsequence(),after=debug.snapshot();
        resolve({schedule,due,status:after.scheduledConsequences.find(item=>item.id===schedule.id)?.status});
      },250));
    });
    assert.ok(invalidatedSocialEcho.schedule.actorIds.socialPerson==='social_primary');
    assert.equal(invalidatedSocialEcho.due,null,'dead social actor still spoke through a delayed echo');
    assert.equal(invalidatedSocialEcho.status,'invalidated');

    const invalidatedCreatedActorEcho=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__;
      debug.patchRun({seed:'review2',age:25,people:[],social:{primaryPersonId:null,secondaryPersonId:null},usedEvents:[],decisionHistory:[],scheduledConsequences:[],sceneQueue:[],currentDecision:null,yearStarted:true});
      debug.forceDecision('decision_204');
      document.querySelector('[data-choice="0"]').click();
      return new Promise(resolve=>setTimeout(()=>{
        const settled=debug.snapshot(),history=settled.decisionHistory.at(-1),schedule=settled.scheduledConsequences.find(item=>item.sourceDecisionId==='decision_204'),person=settled.people.find(item=>item.id==='social_primary');
        debug.patchRun({people:settled.people.map(item=>item.id==='social_primary'?{...item,alive:false}:item),age:schedule.dueAge});
        const due=debug.dueConsequence(),after=debug.snapshot();
        resolve({history,schedule,person,due,status:after.scheduledConsequences.find(item=>item.id===schedule.id)?.status});
      },250));
    });
    assert.equal(invalidatedCreatedActorEcho.history.socialOutcomeVariantId,'offline_persistent','created-actor echo fixture no longer reaches the persistent branch');
    assert.equal(invalidatedCreatedActorEcho.person.id,'social_primary');
    assert.equal(invalidatedCreatedActorEcho.schedule.actorIds.primary,'social_primary','newly created social actor was not bound to the delayed echo');
    assert.equal(invalidatedCreatedActorEcho.due,null,'newly created dead actor still spoke through a delayed echo');
    assert.equal(invalidatedCreatedActorEcho.status,'invalidated');

    const transaction=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__;
      debug.patchRun({
        age:40,
        education:{status:'completed'},
        finance:{cash:42000,liabilities:[]},
        housing:{status:'owned',value:600000,arrangement:'solo',region:'tier2',stability:'stable',accessibility:'standard',costShare:'self',coResidentRefs:[],history:[]}
      });
      const before=debug.snapshot();
      const outcome=debug.applyCommands([
        {type:'set',target:'education.status',value:'enrolled'},
        {type:'add',target:'finance.cash',value:-8000},
        {type:'transitionHousing',target:'housing',value:{status:'renting',value:0,arrangement:'solo',region:'tier2',stability:'conditional',accessibility:'standard',costShare:'self',coResidentRefs:[],kind:'choice',reason:'invalidPropertyDrop',housingChoiceKind:'laterFit'}}
      ],{sourceEventId:'transaction-test',choiceId:'transaction-test'});
      return{before,outcome,after:debug.snapshot()};
    });
    assert.equal(transaction.outcome.result.ok,false,'invalid housing command unexpectedly committed');
    assert.equal(transaction.after.education.status,transaction.before.education.status,'failed command group left an enrollment write');
    assert.equal(transaction.after.finance.cash,transaction.before.finance.cash,'failed command group left a cash write');
    assert.deepEqual(transaction.after.housing,transaction.before.housing,'failed command group left housing history or state');
    assert.deepEqual(transaction.after.finance.liabilities,transaction.before.finance.liabilities,'failed command group left debt writes');
    const contractTransaction=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__,before=debug.snapshot(),outcome=debug.applyCommands([
        {type:'add',target:'finance.cash',value:9999},
        {type:'unknownCommand',target:'finance.cash',value:1}
      ],{sourceEventId:'contract-transaction-test',choiceId:'contract-transaction-test'}),after=debug.snapshot();
      return{before,outcome,after};
    });
    assert.equal(contractTransaction.outcome.result.ok,false,'invalid contract command unexpectedly committed');
    assert.equal(contractTransaction.after.finance.cash,contractTransaction.before.finance.cash,'contract failure left an earlier cash write');
    const businessCommandTransaction=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__,before=debug.snapshot(),outcome=debug.applyCommands([
        {type:'add',target:'finance.cash',value:4321},
        {type:'applyEmploymentProfile',target:'employment',value:'profile-that-does-not-exist'}
      ],{sourceEventId:'business-command-transaction',choiceId:'business-command-transaction'}),after=debug.snapshot();
      return{before,outcome,after};
    });
    assert.equal(businessCommandTransaction.outcome.result.ok,false,'failed business helper unexpectedly committed');
    assert.equal(businessCommandTransaction.after.finance.cash,businessCommandTransaction.before.finance.cash,'failed business helper left an earlier cash write');
    const handoverTransaction=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__;
      debug.patchRun({employment:{status:'unemployed',incomeAnnualGross:0,salary:0}});
      const before=debug.snapshot(),outcome=debug.applyCommands([
        {type:'add',target:'finance.cash',value:4321},
        {type:'completeEmploymentHandover',target:'employment',value:'threeMonths'}
      ],{sourceEventId:'handover-transaction',choiceId:'handover-transaction'});
      return{before,outcome,after:debug.snapshot()};
    });
    assert.equal(handoverTransaction.outcome.result.ok,false,'invalid employment handover unexpectedly committed');
    assert.equal(handoverTransaction.after.finance.cash,handoverTransaction.before.finance.cash,'failed handover left an earlier cash write');

    const zeroIncomeMortgage=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__;
      debug.patchRun({
        employment:{status:'unemployed',incomeAnnualGross:0,salary:0},
        finance:{lastIncome:180000,liabilities:[{id:'zero_income_mortgage',kind:'mortgage',principal:300000,rate:.04,status:'current',arrears:0,enforcementEligible:true,housingSecured:true}]}
      });
      return debug.snapshot().finance.mortgagePaymentStress;
    });
    assert.equal(zeroIncomeMortgage,true,'zero-income mortgage holder did not enter payment stress');

    const gigIncomeMortgage=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__;
      debug.patchRun({
        employment:{status:'gig',incomeAnnualGross:180000,salary:0},
        finance:{lastIncome:180000,liabilities:[{id:'gig_income_mortgage',kind:'mortgage',principal:300000,rate:.04,status:'current',arrears:0,enforcementEligible:true,housingSecured:true}]}
      });
      return debug.snapshot().finance.mortgagePaymentStress;
    });
    assert.equal(gigIncomeMortgage,false,'stable gig income was ignored by mortgage stress derivation');

    const careerIdentity=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__;
      debug.patchRun({employment:{status:'employed',profileId:'doctor',career:'医生',incomeAnnualGross:240000,salary:20000,workHours:48,arrangement:'onsite'},activity:{mode:'work'}});
      return debug.applyCommands([{type:'scaleEmployment',target:'employment',value:.55}],{sourceEventId:'semi-retirement',choiceId:'semi-retirement'}).run;
    });
    assert.equal(careerIdentity.employment.profileId,'doctor','semi-retirement replaced the player career');
    assert.equal(careerIdentity.employment.career,'医生');
    assert.equal(careerIdentity.employment.arrangement,'reducedHours');
    assert.equal(careerIdentity.activity.mode,'flexible');

    const inheritanceShares=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__,base=debug.snapshot(),parent=(id,relation,alive)=>({id,relation,alive,bornAt:-30,gender:relation==='father'?'male':'female',health:0,bond:50});
      const evaluate=(people)=>{
        debug.patchRun({people,originHousehold:{...base.originHousehold,assets:200000,debt:0},finance:{cash:0,liabilities:[]}});
        return debug.applyCommands([{type:'resolveInheritance',target:'originHousehold.assets',value:'accepted'}],{sourceEventId:'inheritance-test',choiceId:`inheritance-${people.length}`}).run.finance.cash;
      };
      return{
        one:evaluate([parent('father','father',false),parent('mother','mother',true)]),
        sole:evaluate([parent('mother','mother',false)]),
        both:evaluate([parent('father','father',false),parent('mother','mother',false)]),
        sibling:evaluate([parent('father','father',false),parent('mother','mother',false),{id:'sibling',relation:'sibling',alive:true,bornAt:2,gender:'female',health:70,bond:50}])
      };
    });
    assert.ok(inheritanceShares.both>inheritanceShares.one,'two deceased parents did not change the transferable estate share');
    assert.equal(inheritanceShares.sole,inheritanceShares.both,'sole registered parent did not transfer the full deceased-parent share');
    assert.ok(inheritanceShares.sibling<inheritanceShares.both,'living sibling did not reduce the player inheritance share');

    const lateSeparation=await page.evaluate(()=>{
      const debug=window.__LIFE_DEBUG__,run=debug.snapshot(),partner={id:'late_partner',relation:'partner',alive:true,bornAt:4,gender:run.gender==='female'?'male':'female',health:70,bond:65,housingIncomeAnnualGross:80000,housingIncomeStability:'fixed'};
      debug.patchRun({people:[...run.people.filter(item=>item.id!==partner.id),partner],relationships:{partnerStatus:'partnered',activePartnerId:partner.id,lastPartnerId:null}});
      return debug.applyCommands([{type:'transitionPartner',target:'people',value:'exPartner'}],{sourceEventId:'late-separation',choiceId:'late-separation'}).run;
    });
    assert.equal(lateSeparation.relationships.activePartnerId,null,'late separation left an active partner reference');
    assert.equal(lateSeparation.people.find(item=>item.id==='late_partner').relation,'exPartner');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({
      age:45,naturalDeathAge:105,yearStarted:true,sceneQueue:[],phase:'playing',currentDecision:null,
      episodes:{
        shop_opening:{status:'active',phase:2,startedAt:43,nextPhaseAge:44,deadlineAge:45,route:'testing',boundActors:{},commitments:[],closureReason:null},
        career_break:{status:'active',phase:2,startedAt:43,nextPhaseAge:44,deadlineAge:45,route:'self',boundActors:{},commitments:[],closureReason:null}
      }
    }));
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.forceEpisodeClosures(['shop_opening','career_break'],'deadline')),true);
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).sceneQueue.length,2,'same-age closures were not collected together');
    await page.locator('[data-act="episode-next"]').click();
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age,45,'the first of two same-age closures advanced the year');
    await page.locator('[data-act="episode-next"]').click();
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age,46,'two same-age closures did not advance exactly once');

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
      location:{id:'tier2',name:'二线城市',weight:24,mods:{cost:112,education:108,medical:108,network:106,mobility:108}},
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
