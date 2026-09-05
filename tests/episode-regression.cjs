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
const nextRngState=value=>{let x=value>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0};
const episodeIds=['secondary_diversion','professional_certification','adult_reeducation','business_expansion','wealth_peak','retirement_transition','parental_inheritance','long_term_care','will_planning'];
const expectedRoutes={
  secondary_diversion:['academic','vocational','employment','alternative_school'],
  professional_certification:['passed','retake','alternative_skill','withdrawn'],
  adult_reeducation:['completed','low_intensity','non_degree','forced_exit'],
  business_expansion:['scaled','downsized','sold','debt_failure'],
  wealth_peak:['controlled','cashed_out','management_exit','invalidated'],
  retirement_transition:['stopped','reduced','continued','left_search','light_work','kept_searching'],
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
  assert.equal(run.sceneQueue[0].kind,'result',`${event.id}/${index}: choice did not settle`);
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
    {beat:517,decision:214,consequence:214,blackSwan:20}
  );
  assert.ok(decisions.every(event=>!('arc' in event)));
  assert.equal(socialDecisions.length,9);
  assert.ok(socialDecisions.filter(event=>event.id!=='decision_210').every(event=>event.situation&&event.choices.some(choice=>
    choice.outcomeTags?.includes('social:intent:solitude')||
    ['leftAlone','changedCircle','leftOnTime','refusedFavor','declinedHousing','usedFormalRoute'].includes(choice.route)
  )),'social decisions lost their shared facts or reasonable refusal route');
  assert.equal(socialDecisions.find(event=>event.id==='decision_206').actors[0].optional,true,'later social choice still required an old friend');
  assert.ok(laterBeats.every(event=>event.ageMin>=55),'later beat appeared before midlife');
  assert.equal(laterBeats.length,51);
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
  assert.equal(decisions.filter(event=>event.track==='later').length,12);
  assert.equal(data.events.filter(event=>event.kind==='beat'&&event.track==='housing').length,35);
  assert.equal(decisions.filter(event=>event.track==='housing').length,6);
  assert.deepEqual(beatFor('beat_384').requirements.all,[{path:'health.status',op:'in',value:['treating','managed','limited']}]);
  const workResolution=eventFor('retirement_transition',1);
  assert.ok(workResolution.choices.slice(0,3).every(choice=>choice.requirements.all.some(rule=>rule.path==='employment.status'&&rule.op==='in')));
  assert.ok(workResolution.choices.slice(3).every(choice=>choice.requirements.all.some(rule=>rule.path==='employment.status'&&rule.op==='notIn')));
  assert.ok(data.episodeCatalog.long_term_care.abandonedRoutes.includes('refused'));
  const parentLossRows=decisions.filter(event=>event.episode?.id==='parent_loss').sort((a,b)=>a.episode.phase-b.episode.phase);
  assert.deepEqual(parentLossRows.map(event=>[event.id,event.episode.phase,event.episode.role]),[
    ['decision_214',1,'start'],['decision_215',2,'progress'],['decision_216',3,'resolve']
  ]);
  assert.ok(data.episodeCatalog.parent_loss?.deadline&&data.episodeCatalog.parent_loss?.invalidated);
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
    assert.equal(migrated.gameVersion,'0.7.0');
    assert.equal(migrated.run,null);
    assert.equal(migrated.meta.histories[0].title,'v0.5.8完整人生');
    assert.equal(migrated.meta.settings.haptic,false);
    assert.equal(migrated.meta.stats.runs,8);
    assert.equal(migrated.meta.seen.events.beat_001,3,'schema migration must preserve seen history');
    assert.deepEqual(migrated.meta.recentSeeds,['v058-finished']);
    await context.close();

    context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    page=await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    await openPlayable(page);
    const acuteDecisionIds=['decision_114','decision_115','decision_116','decision_117'];
    const presentationFor=async(id,age)=>{
      await page.evaluate(({age})=>window.__LIFE_DEBUG__.patchRun({
        age,phase:'playing',currentDecision:null,sceneQueue:[],yearStarted:true,yearQueue:[],
        usedEvents:[],episodes:{},health:{status:'monitoring',currentCondition:'acute-test'}
      }),{age});
      await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),id);
      return page.evaluate(()=>window.__LIFE_DEBUG__.snapshot().currentDecision);
    };
    const childStart=await presentationFor('decision_114',3);
    assert.equal(childStart.situation,'一次急诊后，医生说还有个问题没弄清。旧报告和检查单被家里装进同一个文件袋，下一次复查也约好了。');
    for(const id of acuteDecisionIds){
      const source=decisions.find(event=>event.id===id),variant=source.presentationVariants[0],child=await presentationFor(id,17),adult=await presentationFor(id,18);
      assert.equal(child.situation,variant.situation,`${id}: age 17 did not use minor situation`);
      assert.equal(child.prompt,variant.prompt,`${id}: age 17 did not use minor prompt`);
      assert.deepEqual(child.choices.map(choice=>choice.text),variant.choices.map(choice=>choice.text),`${id}: age 17 did not use minor choices`);
      assert.equal(adult.situation,source.situation,`${id}: age 18 did not use adult situation`);
      assert.equal(adult.prompt,source.prompt,`${id}: age 18 did not use adult prompt`);
      assert.deepEqual(
        child.choices.map(choice=>({id:choice.id,route:choice.route,effects:choice.effects})),
        source.choices.map(choice=>({id:choice.id,route:choice.route,effects:choice.effects})),
        `${id}: presentation variant changed mechanics`,
      );
    }

    const revision36Decision=structuredClone(decisions.find(event=>event.id==='decision_114'));
    delete revision36Decision.presentationVariants;
    const revision36Save=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    revision36Save.run.contentRevision=36;
    revision36Save.run.age=17;
    revision36Save.run.phase='episode';
    revision36Save.run.currentDecision=revision36Decision;
    revision36Save.run.sceneQueue=[{kind:'choice',eventId:revision36Decision.id}];
    revision36Save.run.yearStarted=true;
    revision36Save.run.yearQueue=[];
    revision36Save.run.usedEvents=['revision37-migration-sentinel'];
    revision36Save.run.timeline=[{id:'revision37-migration-sentinel',age:16,icon:'·',kind:'beat',track:'health',text:'迁移前已经发生。'}];
    revision36Save.run.decisionCount=4;
    revision36Save.run.episodes={acute_illness:{status:'active',phase:1,startedAt:17,nextPhaseAge:18,deadlineAge:21,route:null,boundActors:{},commitments:[],closureReason:null}};
    await page.addInitScript(({key,value})=>{
      if(sessionStorage.getItem('revision37-choice-refresh-loaded'))return;
      localStorage.setItem(key,JSON.stringify(value));
      sessionStorage.setItem('revision37-choice-refresh-loaded','1');
    },{key:SAVE_KEY,value:revision36Save});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    let revision37Migrated=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(revision37Migrated.contentRevision,37);
    assert.equal(revision37Migrated.currentDecision.situation,'一次急诊后，医生说还有个问题没弄清。旧报告和检查单被家里装进同一个文件袋，下一次复查也约好了。');
    assert.deepEqual(revision37Migrated.usedEvents,['revision37-migration-sentinel']);
    assert.equal(revision37Migrated.timeline.length,1);
    assert.equal(revision37Migrated.decisionCount,4);
    assert.deepEqual(revision37Migrated.sceneQueue,[{kind:'choice',eventId:'decision_114'}]);
    assert.equal(revision37Migrated.episodes.acute_illness.phase,1);

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({
      age:33,phase:'playing',currentDecision:null,sceneQueue:[],yearStarted:true,yearQueue:[],usedEvents:[],episodes:{},
      finance:{cash:711234,lastIncome:88468,lastExpense:17920,liabilities:[],hasArrears:false}
    }));
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes('decision_108'),false,'comfortable cash state still qualified for decision_108');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({finance:{cash:1000,lastIncome:30000,lastExpense:50000,liabilities:[],hasArrears:false}}));
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes('decision_108'),true,'real uncovered annual shortfall did not qualify for decision_108');

    const unstablePartner={id:'unstable_housing_partner',relation:'partner',alive:true,status:'living',bornAt:5,bond:70,housingIncomeAnnualGross:120000,housingIncomeStability:'business'};
    await page.evaluate(partner=>{
      const debug=window.__LIFE_DEBUG__,run=debug.snapshot();
      debug.patchRun({
        age:38,phase:'playing',currentDecision:null,sceneQueue:[],yearStarted:true,yearQueue:[],usedEvents:[],
        location:{id:'tier1',name:'一线城市',weight:18,mods:{cost:135,education:120,medical:122,network:118,mobility:116}},
        finance:{cash:100000,liabilities:[]},
        employment:{status:'employed',incomeAnnualGross:150000,incomeStability:'fixed'},
        relationships:{activePartnerId:partner.id,partnerStatus:'partnered'},
        people:[...run.people.filter(item=>item.id!==partner.id),partner],
        housing:{status:'family',value:0,arrangement:'originFamily',region:'tier1',stability:'stable',accessibility:'standard',costShare:'supported',coResidentRefs:[],history:[]}
      });
      debug.forceDecision('decision_196');
    },unstablePartner);
    const jointHousingChoice=page.locator('[data-choice="0"]');
    assert.equal(await jointHousingChoice.isDisabled(),false,'partner-unstable housing choice became unavailable');
    assert.equal(await jointHousingChoice.locator('small').textContent(),'这处住处要靠两份收入；对方进账一少，日子就会吃紧。');
    await fitSheet(page,'partner-unstable-housing-hint-360x773');

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
    const habitMetadata=await page.evaluate(()=>window.__LIFE_DEBUG__.episodeMetadata('habit_alcohol_formation')),
      shopMetadata=await page.evaluate(()=>window.__LIFE_DEBUG__.episodeMetadata('shop_opening'));
    assert.deepEqual([habitMetadata.cataloged,habitMetadata.lane,habitMetadata.ageBound],[false,'personal',false]);
    assert.match(habitMetadata.label,/酒精/);
    assert.deepEqual([shopMetadata.cataloged,shopMetadata.label,shopMetadata.lane],[false,'开店','career']);

    const stageBase={infancy:1,childhood:2,adolescence:3,youth:5,establishment:4,midlife:3,later:2,elder:3};
    for(let target=22;target<=28;target++){
      await page.evaluate(({target})=>window.__LIFE_DEBUG__.patchRun({seed:`stage-budget-${target}`,targetDecisions:target,stageDecisionCounts:{},lifecycleStageOverrides:{}}),{target});
      const budgets=await page.evaluate(()=>window.__LIFE_DEBUG__.decisionStageBudgets());
      assert.equal(Object.values(budgets).reduce((sum,value)=>sum+value,0),target,`${target}: stage budget total`);
      for(const [stage,base] of Object.entries(stageBase))
        assert.ok([Math.max(stage==='infancy'?0:1,base-1),base,base+1].includes(budgets[stage]),`${target}/${stage}: invalid seeded extra`);
    }
    const adoptionStart=eventFor('adoption_process',1),adoptionReview=eventFor('adoption_process',2),
      qualificationStart=eventFor('professional_entry_qualification',1),schoolHarmStart=eventFor('school_harm',1),
      firstJobStart=eventFor('first_job_application',1);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({
      age:35,targetDecisions:18,stageDecisionCounts:{establishment:99},lifecycleStageOverrides:{},
      usedEvents:['decision_161','decision_162'],decisionHistory:[],lastDecisionAge:30,
      desires:{security:{claimed:true}},episodes:{},phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,yearQueue:[],
      relationships:{partnerStatus:'none',activePartnerId:null,childCount:0,adoptionOffered:true,adoptionStatus:'offered'},
      health:{physical:75,careNeed:0}
    }));
    let budgetLayers=await page.evaluate(()=>window.__LIFE_DEBUG__.decisionCandidateLayers());
    assert.ok(budgetLayers.ordinary.includes(adoptionStart.id),'adoption did not remain available inside the ordinary stage budget');
    assert.ok(!budgetLayers.ageBound.includes(adoptionStart.id),'adoption still bypassed an exhausted stage budget');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({
      age:25,stageDecisionCounts:{youth:99},episodes:{},usedEvents:['decision_161','decision_162'],
      education:{status:'completed',highestCompleted:'postgraduate',professionalQualificationIntent:'none',nextStage:'career'},
      employment:{status:'unemployed',firstJobAge:null},relationships:{adoptionOffered:true,adoptionStatus:'declined'}
    }));
    budgetLayers=await page.evaluate(()=>window.__LIFE_DEBUG__.decisionCandidateLayers());
    assert.ok(budgetLayers.ordinary.includes(qualificationStart.id),'professional qualification did not remain available inside the ordinary stage budget');
    assert.ok(!budgetLayers.ageBound.includes(qualificationStart.id),'professional qualification still bypassed an exhausted stage budget');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({
      age:15,stageDecisionCounts:{adolescence:99},episodes:{},usedEvents:['decision_161','decision_162'],
      development:{severeSchoolHarm:true,schoolHarmResolved:false},education:{status:'enrolled',nextStage:'secondary'}
    }));
    budgetLayers=await page.evaluate(()=>window.__LIFE_DEBUG__.decisionCandidateLayers());
    assert.ok(budgetLayers.ageBound.includes(schoolHarmStart.id),'severe unresolved school harm lost its urgent entry');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({
      age:22,stageDecisionCounts:{youth:99},episodes:{secondary_diversion:{status:'abandoned',route:'employment'}},usedEvents:['decision_161','decision_162'],
      development:{severeSchoolHarm:false,schoolHarmResolved:true},
      education:{status:'completed',level:2,path:'middleSchool',highestCompleted:'middleSchool',nextStage:'firstJob'},
      employment:{status:'none',firstJobAge:null}
    }));
    budgetLayers=await page.evaluate(()=>window.__LIFE_DEBUG__.decisionCandidateLayers());
    const firstJobFixture=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.ok(budgetLayers.ageBound.includes(firstJobStart.id),`first-job transition lost its urgent entry: ${JSON.stringify({education:firstJobFixture.education,employment:firstJobFixture.employment,episodes:firstJobFixture.episodes,layers:budgetLayers})}`);

    await page.evaluate(({startId})=>window.__LIFE_DEBUG__.patchRun({
      age:36,stageDecisionCounts:{establishment:99},usedEvents:['decision_161','decision_162',startId],
      relationships:{partnerStatus:'none',activePartnerId:null,childCount:0,adoptionOffered:true,adoptionStatus:'assessing'},
      episodes:{adoption_process:{status:'active',phase:2,startedAt:35,nextPhaseAge:36,deadlineAge:39,route:'submitted',boundActors:{},commitments:[],closureReason:null}}
    }),{startId:adoptionStart.id});
    budgetLayers=await page.evaluate(()=>window.__LIFE_DEBUG__.decisionCandidateLayers());
    assert.ok(budgetLayers.activeEpisode.includes(adoptionReview.id),'an adoption already in progress was blocked by the stage budget');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({episodes:null}));

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({
      age:31,targetDecisions:18,decisionCount:99,stageDecisionCounts:{adolescence:99,youth:99,establishment:0},
      usedEvents:['decision_161','decision_162'],decisionHistory:[],desires:{security:{claimed:true}},
      education:{status:'completed',level:3,path:'vocational',nextStage:'career'},
      employment:{status:'employed',profileId:'warehouse_picker',career:'仓储分拣员',jobTier:'T0',rank:0,sector:'logistics',employerType:'private',contractType:'fixedTerm',contract:'fixedTerm',arrangement:'onsite',incomeStability:'fixed',salary:4200,incomeAnnualGross:50400,tenure:3,firstJobAge:24,applicationStatus:'employed',growthType:'none',growthCount:0,lastGrowthAge:null},
      activity:{mode:'work'},episodes:{},phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,yearQueue:[],lastDecisionAge:29
    }));
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.decisionQuotaOpen()),true,'early stage overage still consumed the establishment budget');
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.nextDecisionId()),eventFor('career_growth',1).id,'global decision count blocked career growth');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({stageDecisionCounts:{establishment:99},lifecycleStageOverrides:{}}));
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.decisionQuotaOpen()),false);
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.nextDecisionId()),eventFor('career_growth',1).id,'career growth did not receive its one stage lifecycle override');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:30,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,yearQueue:[],usedEvents:[],decisionHistory:[],decisionCount:0,lastDecisionAge:-99}));
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.forceDecision('decision_162')),'decision_162');
    await page.locator('[data-choice="1"]').click();
    await page.waitForTimeout(240);
    let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.desires.wealth.claimed,true);
    assert.equal(run.desires.security.claimed,true);
    const identityHistory=run.decisionHistory.slice();
    const schedulerPatch={
      age:35,rngState:0x12345678,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:false,yearQueue:[],
      usedEvents:['decision_161','decision_162'],decisionHistory:identityHistory,decisionCount:1,lastDecisionAge:30,targetDecisions:20,
      education:{status:'completed',level:4,path:'college',nextStage:'none'},
      employment:{status:'employed',firstJobAge:24,lastJob:{career:'受雇岗位'},career:'受雇岗位',incomeAnnualGross:120000},
      activity:{mode:'work',years:1},finance:{cash:200000,available:200000,totalDebt:0},
      housing:{status:'renting',region:'tier2',arrangement:'solo',stability:'stable',costShare:'self',coResidentRefs:[]},
      social:{primaryPersonId:null,secondaryPersonId:null},relationships:{partnerStatus:'none',activePartnerId:null,familyPlanningOffered:false,familyPlanningClosed:false,adoptionOffered:true,adoptionStatus:'declined'},
      episodes:{},timeline:[]
    };
    await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun(value),schedulerPatch);
    const beforeCandidateProbe=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    let layers=await page.evaluate(()=>window.__LIFE_DEBUG__.decisionCandidateLayers());
    for(const id of['decision_008','decision_197','decision_204'])assert.ok(layers.ordinary.includes(id),`${id} missing from unified ordinary pool`);
    assert.deepEqual(layers.protected,['decision_197']);
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.nextDecisionId()),'decision_197');
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.nextDecisionId()),'decision_197');
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).rngState,beforeCandidateProbe.rngState,'candidate inspection advanced RNG');
    for(let step=0;step<6;step++){
      run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
      if(run.currentDecision)break;
      await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    }
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.ok(run.currentDecision,JSON.stringify({phase:run.phase,age:run.age,yearStarted:run.yearStarted,queue:run.yearQueue.map(item=>[item.id,item.annualRole]),timeline:run.timeline.slice(-3),cardAges:run.cardAges}));
    assert.equal(run.currentDecision.id,'decision_197','normal annual scheduling did not honor the protected purchase entry');
    assert.equal(run.rngState,nextRngState(nextRngState(beforeCandidateProbe.rngState)),'year start should consume one mortality roll and one annual-plan roll');
    await fitSheet(page,'protected-purchase-360x773');
    await page.screenshot({path:path.join(OUT,'protected-purchase-360x773.png'),fullPage:true});
    const selectedRng=run.rngState;
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.currentDecision.id,'decision_197');
    assert.equal(run.rngState,selectedRng,'refresh changed selected decision RNG');
    await page.locator('[data-choice="3"]').click();
    await page.waitForTimeout(240);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.decisionHistory.at(-1).eventId,'decision_197');
    const consumedHistory=run.decisionHistory.slice();
    await page.evaluate(({patch,history})=>window.__LIFE_DEBUG__.patchRun({...patch,usedEvents:['decision_161','decision_162'],decisionHistory:history,decisionCount:2}),{patch:schedulerPatch,history:consumedHistory});
    layers=await page.evaluate(()=>window.__LIFE_DEBUG__.decisionCandidateLayers());
    assert.equal(layers.protected.length,0,'waiting on the purchase panel did not consume protection');
    await page.evaluate(()=>{const run=window.__LIFE_DEBUG__.snapshot();const desires=Object.fromEntries(Object.entries(run.desires).map(([key,value])=>[key,value&&typeof value==='object'?{...value,claimed:false}:value]));window.__LIFE_DEBUG__.patchRun({desires,housing:{history:[],keyChoiceCount:0},decisionHistory:[],usedEvents:['decision_161','decision_162']})});
    layers=await page.evaluate(()=>window.__LIFE_DEBUG__.decisionCandidateLayers());
    assert.equal(layers.protected.length,0);
    assert.ok(layers.ordinary.includes('decision_197'),'unclaimed housing disappeared from the ordinary pool');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({finance:{available:1000,cash:1000}}));
    layers=await page.evaluate(()=>window.__LIFE_DEBUG__.decisionCandidateLayers());
    assert.ok(!layers.ordinary.includes('decision_197'),'ineligible purchase entered the ordinary pool');

    const adultExplorationHistory=[{
      age:30,eventId:'decision_162',choiceId:'explore',choice:'给自己留一条换路，也留一件想做的事',result:'',outcomeTags:[]
    }],protectedAtLimit={
      ...schedulerPatch,
      age:35,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:false,yearQueue:[],
      usedEvents:['decision_161','decision_162'],decisionHistory:adultExplorationHistory,decisionCount:20,lastDecisionAge:30,targetDecisions:20,
      stageDecisionCounts:{establishment:99},lifecycleStageOverrides:{},
      desires:{freedom:{claimed:true},exploration:{claimed:true}},
      education:{status:'completed',level:4,path:'college',nextStage:'career'},
      employment:{status:'unemployed',firstJobAge:24,lastJob:{career:'受雇岗位'},career:null,incomeAnnualGross:0},
      activity:{mode:'seeking',years:3},finance:{cash:200000,available:200000,totalDebt:0},
      housing:{status:'renting',region:'tier2',arrangement:'solo',stability:'stable',costShare:'self',coResidentRefs:[]},
      relationships:{partnerStatus:'none',activePartnerId:null,familyPlanningOffered:false,familyPlanningClosed:false,adoptionOffered:true,adoptionStatus:'declined'},
      episodes:{},timeline:[]
    };
    await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun(value),protectedAtLimit);
    layers=await page.evaluate(()=>window.__LIFE_DEBUG__.decisionCandidateLayers());
    assert.ok(layers.crisis.length>0,'fixture did not include a competing crisis candidate');
    assert.deepEqual(layers.protected,['decision_204']);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.currentDecision.id,'decision_204','a crisis stole the protected over-limit slot');
    await page.locator('[data-choice="2"]').click();
    await page.waitForTimeout(240);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.decisionCount,21,'first protected opportunity did not add exactly one decision');

    const relationshipStart=eventFor('relationship_start',1),
      twoClaimHistory=[
        {age:14,eventId:'decision_161',choiceId:'family',choice:'别把重要的人落在身后',result:'',outcomeTags:[]},
        {age:26,eventId:relationshipStart.id,choiceId:'meet',choice:'继续认识',result:'',outcomeTags:[]},
        ...identityHistory,
      ];
    await page.evaluate(({patch,history,relationshipStartId})=>window.__LIFE_DEBUG__.patchRun({...patch,
      age:35,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:false,yearQueue:[],
      usedEvents:['decision_161','decision_162',relationshipStartId],decisionHistory:history,decisionCount:21,lastDecisionAge:30,targetDecisions:20,
      desires:{freedom:{claimed:false},exploration:{claimed:false},wealth:{claimed:true},security:{claimed:true}},
      employment:{status:'employed',firstJobAge:24,lastJob:{career:'受雇岗位'},career:'受雇岗位',incomeAnnualGross:120000},
      activity:{mode:'work',years:1},
      finance:{cash:200000,available:200000,totalDebt:0},
      housing:{status:'renting',region:'tier2',arrangement:'solo',stability:'stable',costShare:'self',coResidentRefs:[]},
      social:{primaryPersonId:null,secondaryPersonId:null},relationships:{partnerStatus:'none',activePartnerId:null,familyPlanningOffered:false,familyPlanningClosed:false,adoptionOffered:true,adoptionStatus:'declined'},
      episodes:{},timeline:[]}),{patch:protectedAtLimit,history:twoClaimHistory,relationshipStartId:relationshipStart.id});
    layers=await page.evaluate(()=>window.__LIFE_DEBUG__.decisionCandidateLayers());
    assert.deepEqual(layers.protected,['decision_197'],'the adult claim did not retain exactly its own purchase protection');
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.currentDecision.id,'decision_197','the second legal identity claim did not receive its protected addition');
    await page.locator('[data-choice="3"]').click();
    await page.waitForTimeout(240);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.decisionCount,22,'two identity claims exceeded the approved two protected additions');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({
      age:36,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:false,yearQueue:[],lastDecisionAge:30,episodes:{},
      employment:{status:'unemployed',profileId:'none',career:'待业中',tenure:0,firstJobAge:24,lastJob:null},activity:{mode:'seeking',years:0}
    }));
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.phase,'playing','ordinary candidates bypassed the original target after both protections were consumed');
    assert.equal(run.decisionCount,22,'ordinary candidates added a third over-target decision');
    const failedFirstJob=eventFor('first_job_application',5),failedChoice=failedFirstJob.choices[1];
    await page.evaluate(({eventId,choiceId})=>window.__LIFE_DEBUG__.patchRun({age:35,desires:{reclaimed:false},employment:{status:'unemployed',firstJobAge:null},activity:{mode:'seeking',years:3},relationships:{partnerStatus:'none',activePartnerId:null,adoptionOffered:true,adoptionStatus:'declined'},usedEvents:['decision_161',eventId],decisionHistory:[{age:29,eventId,choiceId,choice:'保留原区间，继续找',result:'',outcomeTags:[]}],decisionCount:2,lastDecisionAge:30,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,episodes:{first_job_application:{status:'resolved',phase:5,startedAt:24,nextPhaseAge:29,deadlineAge:30,route:'continued_search',boundActors:{},commitments:[],closureReason:'continued_search'}}}),{eventId:failedFirstJob.id,choiceId:failedChoice.id});
    layers=await page.evaluate(()=>window.__LIFE_DEBUG__.decisionCandidateLayers());
    assert.ok(layers.dueLifecycle.includes(eventFor('long_term_first_job_reentry',1).id));
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.nextDecisionId()),'decision_162','first-job reentry bypassed mandatory identity');
    const readyCertification={status:'active',phase:2,startedAt:34,nextPhaseAge:35,deadlineAge:37,route:'verified',boundActors:{},commitments:[],closureReason:null};
    await page.evaluate(record=>window.__LIFE_DEBUG__.patchRun({usedEvents:['decision_161','decision_162'],episodes:{professional_certification:record}}),readyCertification);
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.nextDecisionId()),eventFor('professional_certification',2).id,'first-job reentry bypassed a ready active episode');
    await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun(value),schedulerPatch);

    const certificationResolve=eventFor('professional_certification',2);
    const certificationRecord=route=>({status:'active',phase:2,startedAt:34,nextPhaseAge:35,deadlineAge:37,route,boundActors:{},commitments:[],closureReason:null});
    await page.evaluate(({id,record})=>window.__LIFE_DEBUG__.patchRun({age:35,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,usedEvents:[],episodes:{[id]:record}}),{id:'professional_certification',record:certificationRecord('verified')});
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),certificationResolve.id),certificationResolve.id);
    assert.match((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).currentDecision.situation,/考试结果/);
    await page.evaluate(({id,record})=>window.__LIFE_DEBUG__.patchRun({phase:'playing',sceneQueue:[],currentDecision:null,usedEvents:[],episodes:{[id]:record}}),{id:'professional_certification',record:certificationRecord('skill_route')});
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),certificationResolve.id),certificationResolve.id);
    assert.match((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).currentDecision.situation,/岗位训练/);

    const companionshipResolve=eventFor('late_companionship',2),latePartner={id:'late_partner_fixture',relation:'partner',bornAt:3,alive:true,status:'living',bond:70,legalStatus:'married',gender:'male',health:70};
    await page.evaluate(({event,partner})=>window.__LIFE_DEBUG__.patchRun({age:70,gender:'female',people:[partner],relationships:{activePartnerId:partner.id,lastPartnerId:null,partnerStatus:'married',partnerBond:70},phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,usedEvents:[],episodes:{late_companionship:{status:'active',phase:2,startedAt:68,nextPhaseAge:70,deadlineAge:71,route:'cohabitation',boundActors:{partner:{kind:'person',id:partner.id,alive:true}},commitments:[],closureReason:null}}}),{event:companionshipResolve.id,partner:latePartner});
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),companionshipResolve.id),companionshipResolve.id);
    await page.locator('[data-choice="0"]').click();
    await page.waitForTimeout(240);
    await page.locator('[data-act="episode-next"]').click();
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).relationships.partnerStatus,'married','late companionship downgraded marriage');
    const separatingPartner={...latePartner,id:'late_partner_separation'};
    await page.evaluate(partner=>window.__LIFE_DEBUG__.patchRun({age:70,gender:'female',people:[partner],relationships:{activePartnerId:partner.id,lastPartnerId:null,partnerStatus:'married',partnerBond:70},phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,usedEvents:[],episodes:{late_companionship:{status:'active',phase:2,startedAt:68,nextPhaseAge:70,deadlineAge:71,route:'cohabitation',boundActors:{partner:{kind:'person',id:partner.id,alive:true}},commitments:[],closureReason:null}}}),separatingPartner);
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),companionshipResolve.id),companionshipResolve.id);
    await page.locator('[data-choice="2"]').click();
    await page.waitForTimeout(240);
    await page.locator('[data-act="episode-next"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.relationships.partnerStatus,'none','late companionship separation left a stale relationship status');
    assert.equal(run.relationships.activePartnerId,null);
    assert.equal(run.people.find(person=>person.id===separatingPartner.id).relation,'exPartner');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({people:[],relationships:{activePartnerId:null,lastPartnerId:null,partnerStatus:'none'},housing:{status:'renting',arrangement:'solo',region:'tier2',stability:'stable',costShare:'self',coResidentRefs:[]},phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true}));

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
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
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
        if(id==='retirement_transition'){
          const checkpoint=await page.evaluate(()=>window.__LIFE_DEBUG__.lifecycleCheckpointAge('retirement_transition'));
          const working=index<3;
          await page.evaluate(({checkpoint,working})=>window.__LIFE_DEBUG__.patchRun({
            age:checkpoint,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,usedEvents:[],timeline:[],
            episodes:{retirement_transition:{status:'inactive'}},later:{retirement:'none'},
            employment:working
              ? {status:'employed',profileId:'admin_assistant',career:'行政助理',jobTier:'T1',rank:1,sector:'general',employerType:'private',contractType:'fixedTerm',contract:'fixedTerm',incomeStability:'fixed',salary:6000,incomeAnnualGross:72000,tenure:4,firstJobAge:25,applicationStatus:'employed',lastJob:null}
              : {status:'unemployed',profileId:'none',career:'待业中',jobTier:null,rank:0,sector:'none',employerType:'none',contractType:'none',contract:'none',incomeStability:'none',salary:0,incomeAnnualGross:0,tenure:0,firstJobAge:25,applicationStatus:'searching',lastJob:{profileId:'admin_assistant',career:'行政助理',tier:'T1',sector:'general',employerType:'private',contractType:'fixedTerm',salary:6000,incomeAnnualGross:72000,incomeStability:'fixed',tenure:4}},
            activity:{mode:working?'work':'seeking'}
          }),{checkpoint,working});
        }
        if(id==='long_term_care'&&index===3)await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({later:{care:'familyOnly'}}));
        run=await chooseAndFinish(page,finalEvent,index);
        assert.equal(run.episodes[id].closureReason,finalEvent.choices[index].route,`${id}/${index}: closure route`);
        assert.ok(['resolved','abandoned'].includes(run.episodes[id].status),`${id}/${index}: terminal status`);
        routeResults[id].push(finalEvent.choices[index].route);
      }
    }

	    const [lossMoment,lossBelongings,lossContact]=parentLossRows;
	    let deathTransaction=null;
	    for(let candidate=0;candidate<64&&!deathTransaction;candidate++){
	      const parent={id:`same_year_parent_${candidate}`,relation:'father',bornAt:-60,alive:true,status:'living',bond:55};
	      await page.evaluate(parentValue=>window.__LIFE_DEBUG__.patchRun({
	        age:40,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:false,yearQueue:[],usedEvents:[],timeline:[],decisionHistory:[],episodes:{parent_loss:{status:'inactive'},parental_inheritance:{status:'inactive'}},
	        people:[parentValue],relationships:{parentLost:false,lastParentLossAge:null,lastParentLossPersonId:null}
	      }),parent);
	      const updated=await page.evaluate(()=>window.__LIFE_DEBUG__.updatePeople());
	      if(!updated.people[0].alive)deathTransaction=updated;
	    }
	    assert.ok(deathTransaction,'could not obtain a deterministic parent-death transaction fixture');
	    assert.equal(deathTransaction.relationships.parentLost,true,'parentLost was not synchronized inside the death year');
	    assert.equal(deathTransaction.relationships.lastParentLossAge,40);
	    assert.equal(deathTransaction.relationships.lastParentLossPersonId,deathTransaction.people[0].id);
	    assert.ok(await page.evaluate(id=>window.__LIFE_DEBUG__.eligibleIds('decision').includes(id),lossMoment.id),'parent-loss first phase was not eligible in the death year');
	    const lostParent={id:'parent_loss_father',relation:'father',bornAt:-40,alive:false,status:'deceased',bond:55};
    const livingParent={id:'parent_loss_mother',relation:'mother',bornAt:-38,alive:true,status:'living',bond:58};
    await page.evaluate(({lostParent,livingParent})=>window.__LIFE_DEBUG__.patchRun({
      age:40,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,yearQueue:[],usedEvents:[],timeline:[],decisionHistory:[],outcomeTags:{'parentLoss:firstCall':0,'parentLoss:inheritance':0,'parentLoss:belongings':0,'parentLoss:contact':0},episodes:{parent_loss:{status:'inactive'},parental_inheritance:{status:'inactive'}},
      people:[lostParent,livingParent],relationships:{parentLost:true,lastParentLossAge:40,lastParentLossPersonId:lostParent.id}
    }),{lostParent,livingParent});
    run=await chooseAndFinish(page,lossMoment,0);
    assert.equal(run.episodes.parent_loss.status,'active');
    assert.equal(run.episodes.parent_loss.phase,2);
    assert.equal(run.episodes.parent_loss.boundActors.lostParent.id,lostParent.id);
    assert.equal(run.outcomeTags['parentLoss:firstCall'],1);
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.eligibleIds('decision').includes(id),lossBelongings.id),false,'belongings appeared before inheritance procedure');
    await page.evaluate(id=>window.__LIFE_DEBUG__.patchRun({age:41,people:[{id:'parent_loss_father',relation:'father',bornAt:-40,alive:false,status:'deceased',bond:55},{id,relation:'mother',bornAt:-38,alive:false,status:'deceased',bond:58}],relationships:{lastParentLossAge:41,lastParentLossPersonId:id}}),livingParent.id);
    const parentLossInheritanceStart=eventFor('parental_inheritance',1);
    run=await chooseAndFinish(page,parentLossInheritanceStart,0);
    assert.equal(run.outcomeTags['parentLoss:inheritance'],1);
    run=await chooseAndFinish(page,lossBelongings,0);
    assert.equal(run.episodes.parent_loss.phase,3);
    assert.equal(run.episodes.parent_loss.nextPhaseAge,45);
    assert.equal(run.episodes.parent_loss.startedAt,40,'second parent loss reset the original episode clock');
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.eligibleIds('decision').includes(id),lossContact.id),false,'long-tail contact appeared before five real years');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:45,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,yearQueue:[]}));
    run=await chooseAndFinish(page,lossContact,0);
    assert.equal(run.episodes.parent_loss.status,'resolved');
    assert.equal(run.episodes.parent_loss.phase,3);
    assert.equal(run.outcomeTags['parentLoss:contact'],1);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({episodes:{parental_inheritance:{status:'resolved'}}}));

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
    const checkpoint=await page.evaluate(()=>window.__LIFE_DEBUG__.lifecycleCheckpointAge('retirement_transition'));
    const checkpointStage=checkpoint<=59?'midlife':'later';
    await page.evaluate(({checkpoint,checkpointStage,episodes})=>window.__LIFE_DEBUG__.patchRun({
      age:checkpoint,targetDecisions:18,decisionCount:99,stageDecisionCounts:{[checkpointStage]:99},lifecycleStageOverrides:{[checkpointStage]:true},
      usedEvents:['decision_161','decision_162'],decisionHistory:[],desires:{security:{claimed:true}},
      education:{status:'completed',level:3,path:'vocational',nextStage:'career'},episodes,
      employment:{status:'employed',profileId:'admin_assistant',career:'行政助理',jobTier:'T1',rank:1,sector:'general',employerType:'private',contractType:'fixedTerm',contract:'fixedTerm',incomeStability:'fixed',salary:6000,incomeAnnualGross:72000,tenure:4,firstJobAge:25,applicationStatus:'employed'},
      activity:{mode:'work'},later:{retirement:'none'},phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,yearQueue:[]
    }),{checkpoint,checkpointStage,episodes:noActiveEpisodes});
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.nextDecisionId()),workTransition.id,'due work transition was blocked by both the stage budget and lifecycle override');
    for(const status of ['employed','gig','selfEmployed']){
      await page.evaluate(({status,episodes,checkpoint})=>window.__LIFE_DEBUG__.patchRun({age:checkpoint,episodes,usedEvents:[],timeline:[],yearQueue:[],later:{retirement:'none',inheritance:'none',care:'none',will:'none'},employment:{status,firstJobAge:25,tenure:3,profileId:'admin_assistant'},activity:{mode:'work'}}),{status,episodes:noActiveEpisodes,checkpoint});
      eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
      assert.ok(eligible.includes(workTransition.id),`${status}: current paid work could not enter work transition`);
    }
    const leaveJob={profileId:'admin_assistant',career:'行政助理',tier:'T1',sector:'general',employerType:'private',contractType:'fixedTerm',salary:6000,incomeAnnualGross:72000,incomeStability:'fixed',tenure:4};
    await page.evaluate(({episodes,checkpoint,leaveJob})=>window.__LIFE_DEBUG__.patchRun({
      age:checkpoint,episodes,usedEvents:[],timeline:[],later:{retirement:'none'},
      employment:{status:'careLeave',profileId:'none',career:'停薪留职',firstJobAge:25,tenure:0,lastJob:leaveJob,careLeaveUntilAge:checkpoint+2,applicationStatus:'withdrawn'},
      activity:{mode:'flexible'}
    }),{episodes:noActiveEpisodes,checkpoint,leaveJob});
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),workTransition.id),workTransition.id);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.match(run.currentDecision.situation,/停薪留职/);
    assert.deepEqual(await page.locator('[data-choice]').evaluateAll(nodes=>nodes.map(node=>!node.disabled)),[true,true,true,false,false,false]);
    run=await chooseAndFinish(page,workTransition,2);
    assert.equal(run.employment.profileId,'admin_assistant','continuing after care leave did not restore the held job');
    assert.equal(run.later.retirement,'working');
    await page.evaluate(({episodes,checkpoint})=>window.__LIFE_DEBUG__.patchRun({
      age:checkpoint,episodes,usedEvents:[],timeline:[],later:{retirement:'none'},
      employment:{status:'selfEmployed',firstJobAge:25,tenure:5,profileId:'small_shop_owner',career:'小店经营者'},
      business:{status:'operating',mode:'independent',scale:'local',operatingSkill:50,equity:80000},activity:{mode:'work'}
    }),{episodes:noActiveEpisodes,checkpoint});
    run=await chooseAndFinish(page,workTransition,0);
    assert.equal(run.employment.status,'retired','self-employed stop did not leave paid work');
    assert.equal(run.business.status,'closed','self-employed stop left the business earning money');
    await page.evaluate(({episodes,checkpoint})=>window.__LIFE_DEBUG__.patchRun({
      age:checkpoint,episodes,usedEvents:[],timeline:[],later:{retirement:'none'},
      employment:{status:'unemployed',profileId:'none',career:'待业中',firstJobAge:25,tenure:0,lastJob:{profileId:'small_shop_owner',career:'小店经营者',tier:'T2',sector:'retail',employerType:'self',contractType:'business',salary:0,incomeAnnualGross:0,incomeStability:'business',tenure:5},applicationStatus:'searching'},
      business:{status:'sold',mode:'independent',scale:'local',operatingSkill:50,equity:0},activity:{mode:'seeking'}
    }),{episodes:noActiveEpisodes,checkpoint});
    run=await chooseAndFinish(page,workTransition,4);
    assert.ok(['employed','gig'].includes(run.employment.status),'former self-employment restored a closed business as paid work');
    assert.ok(run.employment.incomeAnnualGross>0,'former self-employment light work had no income');
    assert.equal(run.business.status,'sold','light work silently reopened a sold business');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({
      age:70,activity:{mode:'retired'},employment:{status:'retired',profileId:'none',career:'已退休',publicExperience:20,incomeAnnualGross:0,salary:0},business:{status:'closed'},finance:{cash:100000,liabilities:[]}
    }));
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.settleYear());
    assert.equal(run.finance.lastIncome,0,'work transition created retirement income without a qualification or funding source');
    for(const sample of [
      {label:'long-search',status:'unemployed',firstJobAge:25,mode:'seeking',lastJob:{profileId:'admin_assistant',tenure:3}},
      {label:'never-worked',status:'unemployed',firstJobAge:null,mode:'seeking',lastJob:null},
      {label:'short-history',status:'unemployed',firstJobAge:25,mode:'leisure',lastJob:{profileId:'admin_assistant',tenure:2}}
    ]){
      await page.evaluate(({sample,episodes,checkpoint})=>window.__LIFE_DEBUG__.patchRun({age:checkpoint,episodes,usedEvents:[],later:{retirement:'none'},employment:{status:sample.status,firstJobAge:sample.firstJobAge,lastJob:sample.lastJob,tenure:0},activity:{mode:sample.mode}}),{sample,episodes:noActiveEpisodes,checkpoint});
      eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
      assert.equal(eligible.includes(workTransition.id),sample.label==='long-search',`${sample.label}: wrong work-history transition eligibility`);
    }
    for(const age of [checkpoint-1,81]){
      await page.evaluate(({age,episodes})=>window.__LIFE_DEBUG__.patchRun({age,episodes,usedEvents:[],employment:{status:'employed',firstJobAge:25,tenure:4,profileId:'admin_assistant'},activity:{mode:'work'}}),{age,episodes:noActiveEpisodes});
      eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
      assert.equal(eligible.includes(workTransition.id),age===81,`${age}: work transition checkpoint handling failed`);
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
      debug.patchRun({
        people:[
          {id:'social_primary',relation:'social',bornAt:20,alive:true,status:'living',social:{displayName:'阿宁',source:'campus',metAtAge:20,tie:'friend',proximity:'local',turn:'kept',support:'mutual'}},
          {id:'social_secondary',relation:'social',bornAt:22,alive:true,status:'living',social:{displayName:'小周',source:'workplace',metAtAge:24,tie:'friend',proximity:'local',turn:'kept',support:'mutual'}}
        ],
        social:{primaryPersonId:'social_primary',secondaryPersonId:'social_secondary'},
        relationships:{network:75}
      });
      const evidencedBroad=debug.socialEndingSignal();
      debug.patchRun({people:[],social:{primaryPersonId:null,secondaryPersonId:null},relationships:{network:8},pressures:{loneliness:65},decisionHistory:[{outcomeTags:['social:intent:connect']}]});
      const lonely=debug.socialEndingSignal();
      return{solitude,broad,evidencedBroad,lonely};
    });
    assert.equal(socialEndings.solitude.intent,'solitude');
    assert.equal(socialEndings.solitude.signal.kind,'activeSolitude');
    assert.equal(socialEndings.solitude.signal.floor,55);
    assert.equal(socialEndings.solitude.run.pressures.loneliness,12,'active solitude changed loneliness by itself');
    assert.equal(socialEndings.broad.kind,'neutral','abstract network score created a social ending without people');
    assert.equal(socialEndings.evidencedBroad.kind,'broadNetwork');
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
      const current=debug.snapshot().currentDecision,
        decision={prompt:current.prompt,situation:current.situation};
      document.querySelector('[data-choice="0"]').click();
      return new Promise(resolve=>setTimeout(()=>{
        const settled=debug.snapshot(),schedule=settled.scheduledConsequences.find(item=>item.sourceDecisionId==='decision_205');
        debug.patchRun({people:settled.people.map(item=>item.id==='social_primary'?{...item,alive:false}:item),age:schedule.dueAge});
        const due=debug.dueConsequence(),after=debug.snapshot();
        resolve({decision,schedule,due,status:after.scheduledConsequences.find(item=>item.id===schedule.id)?.status});
      },250));
    });
    assert.equal(invalidatedSocialEcho.decision.prompt,'要不要向朋友开口求助？');
    assert.match(invalidatedSocialEcho.decision.situation,/小禾也许能搭把手.*向小禾求助.*公共渠道/);
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

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({episodes:null}));
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({
      age:45,naturalDeathAge:105,rngState:0x12345678,yearStarted:false,yearQueue:[],sceneQueue:[],phase:'playing',currentDecision:null,
      cardAges:[0,18,35,55],relationships:{familyPlanningClosed:true,adoptionOffered:true,adoptionStatus:'declined'},
      finance:{reliefPending:false},
      episodes:{shop_opening:{status:'active',phase:2,startedAt:43,nextPhaseAge:44,deadlineAge:45,route:'testing',boundActors:{},commitments:[],closureReason:null}}
    }));
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.phase,'episode','a due closure was not launched from the persisted annual plan');
    assert.equal(run.sceneQueue[0].fromAnnualPlan,true);
    assert.ok(run.yearQueue.length>0,'a due closure swallowed the rest of its annual plan');
    const closureQueueIds=run.yearQueue.map(item=>item.id),closureRng=run.rngState;
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.deepEqual(run.yearQueue.map(item=>item.id),closureQueueIds,'refresh redrew the year after a planned closure');
    assert.equal(run.rngState,closureRng);
    await page.locator('[data-act="episode-next"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,45,'a planned closure advanced the age before the rest of the year');
    assert.equal(run.yearStarted,true);
    const remainingAfterClosure=run.yearQueue.length;
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.ok(run.yearQueue.length<remainingAfterClosure||run.age>45,'the year did not continue after its planned closure');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({phase:'playing',currentDecision:null,sceneQueue:[],yearStarted:false,yearQueue:[],episodes:null}));

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
