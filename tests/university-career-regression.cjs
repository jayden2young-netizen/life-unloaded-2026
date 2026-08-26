const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {launchChromium}=require('./playwright-runtime.cjs');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.UNIVERSITY_CAREER_SMOKE_OUT||path.join(os.tmpdir(),'life-unloaded-university-career');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data.json'),'utf8'));
const decisions=data.events.filter(event=>event.kind==='decision');
const eventFor=(id,phase)=>decisions.find(event=>event.episode?.id===id&&event.episode.phase===phase);
const scheduleFor=(sourceDecisionId,age,suffix='fixture')=>{
  const source=decisions.find(event=>event.id===sourceDecisionId),choice=source?.choices?.find(item=>item.consequences?.length),spec=choice?.consequences?.[0];
  assert.ok(source&&choice&&spec,`${sourceDecisionId}: missing consequence fixture`);
  return{id:`${spec.eventId}:${choice.memoryKey}:${age}:${suffix}`,eventId:spec.eventId,memoryKey:choice.memoryKey,sourceDecisionId:source.id,sourceChoiceId:choice.id,dueAge:age,expiresAge:Math.min(105,age+6),priority:0,status:'scheduled'};
};
const episodeIds=['undergraduate_domestic','undergraduate_overseas_orientation','undergraduate_us','undergraduate_europe','undergraduate_change','overseas_undergraduate_belonging','postgraduate_application','postgraduate_domestic','postgraduate_us','postgraduate_europe','overseas_postgraduate_belonging','professional_entry_qualification','first_job_application','long_term_first_job_reentry'];
fs.mkdirSync(OUT,{recursive:true});

async function snapshot(page){return page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())}
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
async function preparePhase(page,id,phase,patch={}){
  const event=eventFor(id,phase),age=Math.max(event.ageMin,Math.min(event.ageMax,patch.age??24));
  const episode=phase===1?{}:{[id]:{status:'active',phase,startedAt:Math.max(0,age-phase+1),nextPhaseAge:age,deadlineAge:age+2,route:'prepared',boundActors:{},commitments:[],closureReason:null}};
  await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({age:value.age,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,episodes:value.episodes,...value.patch}),{age,episodes:episode,patch});
  assert.equal(await page.evaluate(eventId=>window.__LIFE_DEBUG__.forceDecision(eventId),event.id),event.id,`${id}/${phase}: not eligible`);
  assert.equal((await snapshot(page)).sceneQueue[0].kind,'choice');
  return event;
}
async function choose(page,index){
  const before=await snapshot(page);
  await page.locator(`[data-choice="${index}"]:not([disabled])`).click();
  let run=await snapshot(page);
  assert.equal(run.age,before.age);
  assert.equal(run.sceneQueue[0].kind,'result');
  assert.equal(run.timeline.length,before.timeline.length);
  await page.locator('[data-act="episode-next"]').click();
  run=await snapshot(page);
  if(before.currentDecision.episode.ageAdvanceYears===0)assert.ok([before.age,before.age+1].includes(run.age));
  else assert.equal(run.age,before.age+1,JSON.stringify({eventId:before.currentDecision.id,episode:before.currentDecision.episode,after:{age:run.age,phase:run.phase,yearStarted:run.yearStarted,yearQueue:run.yearQueue,currentDecision:run.currentDecision,sceneQueue:run.sceneQueue}}));
  assert.equal(run.timeline.length,before.timeline.length+1);
  return run;
}
async function fit(page,label){
  const result=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,boxes:[...document.querySelectorAll('.choice-sheet,.drawer,.choice-sheet button')].map(node=>node.getBoundingClientRect())}));
  assert.ok(result.scrollWidth<=result.width+1,`${label}: horizontal overflow`);
  for(const box of result.boxes)assert.ok(box.left>=-1&&box.right<=result.width+1,`${label}: element outside viewport`);
}
async function optionEnabled(page,index){return page.locator(`[data-choice="${index}"]`).isEnabled()}

(async()=>{
  assert.deepEqual(data.employmentCatalog.regionalCoefficients,{tier1:1.2,tier2:1,county:.82,town:.72});
  assert.deepEqual(data.employmentCatalog.salaryBands,{low:.9,mid:1,high:1.1});
  assert.deepEqual(
    Object.fromEntries(Object.entries(data.employmentCatalog.tiers).map(([id,tier])=>[id,tier.monthlyBase])),
    {T0:4200,T1:6000,T2:12000,T3:20000,T4:0}
  );
  const profiles=Object.fromEntries(data.employmentCatalog.profiles.map(profile=>[profile.id,profile]));
  assert.deepEqual(
    ['doctor','lawyer','university_lecturer'].map(id=>[profiles[id].tier,profiles[id].credentials]),
    [['T3',['medical_practice']],['T3',['legal_practice']],['T3',['university_teaching']]]
  );
  assert.ok(data.employmentCatalog.profiles.filter(profile=>profile.tier==='T4').every(profile=>profile.firstJobEligible===false));
  assert.deepEqual(data.employmentCatalog.recruitmentScenarios.map(scenario=>scenario.id),Array.from({length:14},(_,index)=>`E${String(index+1).padStart(2,'0')}`));
  for(const scenario of data.employmentCatalog.recruitmentScenarios){
    assert.ok(scenario.situation&&scenario.prompt,`${scenario.id}: missing playable copy`);
    assert.equal(scenario.choices.length,3,`${scenario.id}: choice count`);
    assert.ok(scenario.choices.every(choice=>choice.text&&choice.resultText&&typeof choice.offerIntent==='boolean'),`${scenario.id}: incomplete choice`);
  }
  const promotionDecision=decisions.find(event=>event.id==='decision_048');
  assert.deepEqual(
    promotionDecision.choices[0].requirements.all.find(rule=>rule.path==='employment.profileId')?.value.sort(),
    Object.keys(data.employmentCatalog.promotionMap).sort()
  );
  assert.ok(decisions.find(event=>event.prompt.startsWith('长期岗位合同到期前')).choices[1].effects.some(effect=>effect.type==='completeEmploymentHandover'));
  assert.ok(decisions.find(event=>event.prompt.startsWith('外面的岗位薪水更高')).choices[1].effects.some(effect=>effect.type==='takeCareLeave'));
  for(let id=163;id<=183;id++)assert.ok(decisions.some(event=>event.id===`decision_${String(id).padStart(3,'0')}`),`decision_${id}: missing`);
  const encodedResearchSeeds=new Set([
    ...data.employmentCatalog.recruitmentScenarios.map(scenario=>scenario.id),
    ...decisions.flatMap(event=>event.choices).flatMap(choice=>choice.effects)
      .filter(effect=>effect.type==='tag'&&String(effect.value).startsWith('research:E'))
      .map(effect=>String(effect.value).slice('research:'.length))
  ]);
  const expectedResearchSeeds=['E01','E02','E03','E04','E05','E06','E07','E08','E09','E10','E11','E12','E13','E14','E17','E20','E24','E25','E26','E30','E34','E37','E41','E44','E51','E52','E55','E56','E59','E62','E63','E64','E65','E66','E67','E68','E69','E70','E71','E72'];
  assert.deepEqual([...encodedResearchSeeds].sort(),expectedResearchSeeds.sort());
  assert.deepEqual(
    decisions.filter(event=>event.episode?.id==='first_job_application').map(event=>[event.ageMin,event.ageMax]),
    [[16,28],[17,29],[18,30],[19,31],[20,32]]
  );
  assert.deepEqual(
    decisions.filter(event=>event.episode?.id==='first_job_application').map(event=>event.episode.deadlineYears),
    [5,5,5,5,5],
    'the fifth first-job phase does not fit inside the authored deadline'
  );
  assert.ok(eventFor('undergraduate_application',1).requirements.all.some(rule=>rule.path==='education.nextStage'&&rule.op==='eq'&&rule.value==='undergraduateApplication'));
  assert.deepEqual(eventFor('first_job_application',1).requirements.all.find(rule=>rule.path==='education.nextStage'),{path:'education.nextStage',op:'in',value:['firstJob','workOrVocational']});
  for(const id of episodeIds){
    const rows=decisions.filter(event=>event.episode?.id===id).sort((a,b)=>a.episode.phase-b.episode.phase);
    assert.ok(rows.length>=1&&rows.length<=5,`${id}: phase count`);
    assert.deepEqual(rows.map(row=>row.episode.phase),rows.map((_,index)=>index+1),`${id}: phase sequence`);
    assert.equal(rows[0].episode.role,'start',`${id}: first phase role`);
    if(rows.length>1)assert.equal(rows.at(-1).episode.role,'resolve',`${id}: final phase role`);
    for(const row of rows.slice(1,-1))assert.equal(row.episode.role,'continue',`${id}/${row.episode.phase}: middle phase role`);
    assert.ok(data.episodeCatalog[id]?.deadline&&data.episodeCatalog[id]?.invalidated,`${id}: closure copy`);
  }
  const domesticText=decisions.filter(event=>event.episode?.id==='undergraduate_domestic').map(event=>`${event.situation}${event.prompt}`).join('');
  const usText=decisions.filter(event=>event.episode?.id==='undergraduate_us').map(event=>`${event.situation}${event.prompt}`).join('');
  const europeText=decisions.filter(event=>event.episode?.id==='undergraduate_europe').map(event=>`${event.situation}${event.prompt}`).join('');
  assert.match(usText,/degree audit|工作授权|国际学生办公室/);
  assert.doesNotMatch(usText,/考试注册分散在三个页面|当地行政登记/);
  assert.match(europeText,/学分|考试注册|当地语言/);
  assert.doesNotMatch(europeText,/degree audit|国际学生办公室/);
  assert.doesNotMatch(domesticText,/工作授权|入境|当地语言/);
  const rules=requirements=>[...(requirements?.all||[]),...(requirements?.any||[]),...(requirements?.none||[])];
  const allRequirementRules=decisions.flatMap(event=>[...rules(event.requirements),...event.choices.flatMap(choice=>rules(choice.requirements))]);
  assert.deepEqual(allRequirementRules.filter(rule=>rule.path==='mobility.discriminationLoad'),[]);
  const runtimeSource=fs.readFileSync(path.join(ROOT,'game.js'),'utf8');
  const firstJobResolverSource=runtimeSource.match(/function firstJobCandidates[\s\S]*?function resolveFirstJobApplication[\s\S]*?function [^(]+\(/)?.[0]||'';
  assert.doesNotMatch(firstJobResolverSource,/discriminationLoad/);
  assert.match(firstJobResolverSource,/firstJobEntryPath/);
  assert.match(firstJobResolverSource,/workAuthorization/);
  const changeResolution=eventFor('undergraduate_change',2);
  for(const [index,intent] of ['major','leave','transfer'].entries()){
    assert.ok(changeResolution.choices[index].requirements.all.some(rule=>rule.path==='education.changeIntent'&&rule.op==='eq'&&rule.value===intent));
  }
  const laterJobOpportunity=decisions.find(event=>event.track==='employment'&&!event.episode);
  assert.ok(laterJobOpportunity.requirements.all.some(rule=>rule.path==='education.nextStage'&&rule.op==='eq'&&rule.value==='career'));
  assert.ok(laterJobOpportunity.requirements.all.some(rule=>rule.path==='employment.status'&&rule.op==='in'&&rule.value.includes('unemployed')));

  const browser=await launchChromium();
  const errors=[];
  try{
    let context=await browser.newContext({viewport:{width:360,height:773}});
    let page=await context.newPage();
    page.setDefaultTimeout(9000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});

    const oldSave={schemaVersion:9,gameVersion:'0.5.11',meta:{histories:[{title:'v0.5.11完整人生',age:80}],codex:['codex_01'],settings:{haptic:false},stats:{runs:11},seen:{events:{beat_001:3,'origin_context_2_stable':1},cards:{},families:{},endings:{}},recentSeeds:['v0511-finished']},run:{schemaVersion:9,gameVersion:'0.5.11',contentRevision:18,phase:'playing',age:22,education:{status:'enrolled',nextStage:'undergraduate'},episodes:{undergraduate_domestic:{status:'active'}}}};
    await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SAVE_KEY,value:oldSave});
    await page.goto(URL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.deepEqual([migrated.schemaVersion,migrated.gameVersion,migrated.run],[14,'0.7.0',null]);
    assert.equal(migrated.meta.histories[0].title,'v0.5.11完整人生');
    assert.equal(migrated.meta.settings.haptic,false);
    assert.equal(migrated.meta.stats.runs,11);
    assert.deepEqual(migrated.meta.recentSeeds,['v0511-finished']);
    assert.equal(migrated.meta.seen.events.beat_001,3,'schema migration must preserve seen history');
    assert.equal(migrated.meta.seen.events.origin_context_2_stable,1);
    await context.close();

    context=await browser.newContext({viewport:{width:360,height:773}});
    page=await context.newPage();
    page.setDefaultTimeout(9000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    await openPlayable(page);

    let run=await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:17,education:{status:'completed',level:3,path:'highSchool',nextStage:'firstJob'},employment:{status:'none'},episodes:null,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,yearQueue:[]}));
    assert.equal(run.education.nextStage,'undergraduateApplication');
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:16,education:{status:'completed',level:2,path:'middleSchool',nextStage:'firstJob'},episodes:{secondary_diversion:{status:'abandoned',route:'employment'}}}));
    assert.equal(run.education.nextStage,'firstJob');
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes(eventFor('first_job_application',1).id),true);

    await page.evaluate(()=>{
      const current=window.__LIFE_DEBUG__.snapshot(),desires=structuredClone(current.desires);
      const claim=Object.keys(desires).find(key=>desires[key]&&typeof desires[key]==='object'&&Object.hasOwn(desires[key],'claimed'));
      desires[claim].claimed=true;
      window.__LIFE_DEBUG__.patchRun({
        age:17,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,yearQueue:[],
        education:{status:'completed',level:3,path:'highSchool',nextStage:'undergraduateApplication',fullTimeUndergraduateClosed:false},
        employment:{status:'none'},activity:{mode:'study'},desires,usedEvents:[],decisionHistory:[],timeline:[],
        episodes:{
          undergraduate_application:{status:'inactive'},
          acute_illness:{status:'active',phase:2,startedAt:16,nextPhaseAge:17,deadlineAge:20,route:'treatment',boundActors:{},commitments:[],closureReason:null}
        }
      });
    });
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.nextDecisionId()),eventFor('undergraduate_application',1).id);
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes(eventFor('first_job_application',1).id),false);

    await preparePhase(page,'undergraduate_application',1,{age:17,education:{status:'completed',level:3,path:'highSchool',nextStage:'undergraduateApplication',fullTimeUndergraduateClosed:false},employment:{status:'none'},activity:{mode:'study'}});
    run=await choose(page,3);
    assert.equal(run.education.nextStage,'workOrVocational');
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes(eventFor('first_job_application',1).id),true);

    const firstJobPhase3=eventFor('first_job_application',3),scenarioWitnesses={};
    for(const scenario of data.employmentCatalog.recruitmentScenarios){
      const tier=scenario.tiers[0],credential=tier==='T3'?'postgraduate':tier==='T2'?'bachelor':tier==='T0'?'middleSchool':'highSchool';
      const highestCompleted=tier==='T3'?'postgraduate':tier==='T2'?'undergraduate':tier==='T0'?'middleSchool':'upperSecondary';
      const witnessPatch={
        age:Math.max(18,Math.min(30,scenario.age[0])),
        phase:'playing',sceneQueue:[],currentDecision:null,episodes:null,
        location:{id:scenario.locations?.[0]||'tier1'},
        education:{status:'completed',level:tier==='T3'?5:tier==='T2'?4:3,highestCompleted,nextStage:'firstJob',credentials:['medical_practice','legal_practice','university_teaching'],courseworkEvidence:60,practiceEvidence:60,researchEvidence:60},
        employment:{status:'none',entryCredential:credential,applicationRegion:scenario.applicationRegions?.[0]||'domestic',applicationChannel:scenario.applicationChannels?.[0]||'openRecruitment',firstJobEntryPath:scenario.applicationChannels?.[0]||'openRecruitment',applicationStatus:'applying',pendingOfferId:'none'},
        mobility:{workAuthorization:'verified'},
        capabilities:{employability:60},
        activity:{mode:'seeking'}
      };
      let found=null;
      for(let seedIndex=0;seedIndex<200&&!found;seedIndex++){
        const seed=`scenario-${scenario.id}-${seedIndex}`;
        const current=await page.evaluate(({patch,seed,eventId})=>{
          window.__LIFE_DEBUG__.patchRun({...patch,seed});
          window.__LIFE_DEBUG__.forceDecision(eventId);
          return window.__LIFE_DEBUG__.snapshot().currentDecision;
        },{patch:witnessPatch,seed,eventId:firstJobPhase3.id});
        if(current?.recruitmentScenarioId===scenario.id)found={seed,current};
      }
      assert.ok(found,`${scenario.id}: no runtime witness`);
      assert.equal(found.current.situation,scenario.situation);
      assert.deepEqual(found.current.choices.map(choice=>choice.text),scenario.choices.map(choice=>choice.text));
      assert.ok(found.current.choices.every((choice,index)=>choice.memoryKey===`${firstJobPhase3.id}:${scenario.id}:${index+1}`));
      assert.ok(found.current.choices.every(choice=>choice.consequences.length===0&&choice.commitments.length===0));
      assert.ok(found.current.choices.every(choice=>choice.outcomeTags.includes(`recruitment:${scenario.id}`)));
      scenarioWitnesses[scenario.id]=found.seed;
    }
    run=await choose(page,0);
    assert.equal(run.employment.applicationStatus,'searching');
    assert.equal(run.employment.pendingOfferId,'none');

    const staleApplicationSchedule=scheduleFor('decision_006',20,'enrolled-cleanup');
    await page.evaluate(schedule=>window.__LIFE_DEBUG__.patchRun({
      age:20,
      education:{status:'enrolled',level:4,path:'college',nextStage:'undergraduate',highestCompleted:'secondary',fullTimeUndergraduateClosed:false},
      episodes:{undergraduate_application:{status:'active',phase:4,startedAt:17,nextPhaseAge:20,deadlineAge:22,route:'overseas_family_funded',boundActors:{},commitments:[],closureReason:null}},
      scheduledConsequences:[schedule],yearQueue:[],sceneQueue:[],currentDecision:null,phase:'playing'
    }),staleApplicationSchedule);
    run=await snapshot(page);
    assert.equal(run.episodes.undergraduate_application.status,'resolved','an enrolled Revision 34 life retained the old application episode');
    assert.equal(run.episodes.undergraduate_application.closureReason,'undergraduate_enrolled');
    assert.equal(run.scheduledConsequences[0].status,'invalidated','an enrolled life retained an application-stage consequence');
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).some(id=>['decision_004','decision_005','decision_006','decision_007'].includes(id)),false,'an enrolled life could re-enter application stages');

    const graduationSchedules=[
      scheduleFor('decision_016',24,'orientation'),
      scheduleFor('decision_017',24,'us-course-selection'),
      scheduleFor('decision_020',24,'europe-registration'),
      scheduleFor('decision_018',24,'post-entry-echo')
    ];
    const bachelorBase={education:{status:'enrolled',level:4,path:'college',enrollmentRegion:'domestic',nextStage:'undergraduate',undergraduateSystem:'domestic',highestCompleted:'secondary',courseworkEvidence:18,campusEvidence:8,practiceEvidence:18,researchEvidence:8},employment:{status:'none',entryCredential:'none',applicationStatus:'none'},activity:{mode:'study'},scheduledConsequences:graduationSchedules};
    await preparePhase(page,'undergraduate_domestic',4,bachelorBase);
    const bachelorCompletionAge=(await snapshot(page)).age;
    run=await choose(page,0);
    assert.equal(run.age,bachelorCompletionAge+1,'finishing undergraduate study incorrectly opened an unrelated same-age education episode');
    assert.equal(run.education.highestCompleted,'undergraduate');
    assert.equal(run.education.nextStage,'firstJob');
    assert.equal(run.employment.entryCredential,'bachelor');
    for(const schedule of graduationSchedules.slice(0,3))assert.equal(run.scheduledConsequences.find(item=>item.id===schedule.id)?.status,'invalidated',`${schedule.id}: obsolete undergraduate procedure survived graduation`);
    assert.equal(run.scheduledConsequences.find(item=>item.id===graduationSchedules[3].id)?.status,'scheduled','a post-entry undergraduate echo was over-invalidated');

    const bachelorJob={seed:'professional-9',location:{id:'tier1'},education:{status:'completed',level:4,path:'college',highestCompleted:'undergraduate',nextStage:'firstJob',courseworkEvidence:24,practiceEvidence:24,researchEvidence:8},employment:{status:'none',entryCredential:'bachelor',applicationRegion:'domestic',applicationChannel:'specialist',firstJobEntryPath:'specialist',applicationStatus:'applying'},activity:{mode:'seeking'}};
    await preparePhase(page,'first_job_application',3,bachelorJob);
    const recruitmentBeforeReload=await snapshot(page);
    assert.match(recruitmentBeforeReload.currentDecision.recruitmentScenarioId,/^E(?:0[1-9]|1[0-4])$/);
    const recruitmentChoiceText=recruitmentBeforeReload.currentDecision.choices.map(choice=>choice.text);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const recruitmentAfterReload=await snapshot(page);
    assert.equal(recruitmentAfterReload.currentDecision.recruitmentScenarioId,recruitmentBeforeReload.currentDecision.recruitmentScenarioId);
    assert.deepEqual(recruitmentAfterReload.currentDecision.choices.map(choice=>choice.text),recruitmentChoiceText);
    run=await choose(page,0);
    assert.equal(run.employment.applicationStatus,'offered');
    const bachelorOffer=run.employment;
    assert.notEqual(bachelorOffer.pendingOfferId,'none');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    assert.equal((await snapshot(page)).employment.pendingOfferId,bachelorOffer.pendingOfferId);
    await preparePhase(page,'first_job_application',4,{...bachelorJob,employment:bachelorOffer});
    assert.equal(await optionEnabled(page,0),true);
    assert.equal(await optionEnabled(page,1),true);
    assert.equal(await optionEnabled(page,2),false);
    run=await choose(page,0);
    assert.ok(['employed','gig'].includes(run.employment.status));
    assert.equal(run.employment.firstJobOutcome,run.employment.profileId);
    assert.ok(['T1','T2'].includes(run.employment.jobTier));
    assert.ok(run.employment.salary>0&&run.employment.incomeAnnualGross>0);
    assert.equal(run.employment.pendingOfferId,'none');

    const noOfferJob={seed:'bridge-entry',location:{id:'tier2'},education:{status:'completed',level:3,path:'vocational',highestCompleted:'upperSecondary',nextStage:'firstJob',courseworkEvidence:8,practiceEvidence:8,researchEvidence:0},employment:{status:'unemployed',entryCredential:'highSchool',applicationRegion:'domestic',applicationChannel:'openRecruitment',firstJobEntryPath:'openRecruitment',applicationStatus:'searching',pendingOfferId:'none',firstJobAge:null},activity:{mode:'seeking'}};
    const naturalNoOfferJob={...noOfferJob,seed:scenarioWitnesses.E01,age:16,episodes:null};
    await preparePhase(page,'first_job_application',1,naturalNoOfferJob);
    run=await choose(page,0);
    assert.equal(run.episodes.first_job_application.deadlineAge,21);
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),eventFor('first_job_application',2).id),eventFor('first_job_application',2).id);
    run=await choose(page,0);
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),eventFor('first_job_application',3).id),eventFor('first_job_application',3).id);
    const naturalScenario=(await snapshot(page)).currentDecision.recruitmentScenarioId;
    const noOfferIndex=data.employmentCatalog.recruitmentScenarios.find(item=>item.id===naturalScenario).choices.findIndex(choice=>!choice.offerIntent);
    assert.ok(noOfferIndex>=0,`${naturalScenario}: natural fixture had no no-offer choice`);
    run=await choose(page,noOfferIndex);
    const naturalNoOfferBefore=await snapshot(page);
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),eventFor('first_job_application',4).id),eventFor('first_job_application',4).id);
    run=await snapshot(page);
    assert.equal(run.phase,'playing');
    assert.equal(run.sceneQueue.length,0);
    assert.equal(run.age,naturalNoOfferBefore.age);
    assert.equal(run.decisionCount,naturalNoOfferBefore.decisionCount);
    assert.equal(run.timeline.length,naturalNoOfferBefore.timeline.length+1);
    assert.match(run.timeline.at(-1).text,/没有工牌.*招聘网站照旧要点开/);
    assert.equal(run.episodes.first_job_application.phase,5);
    assert.ok(run.episodes.first_job_application.deadlineAge>run.age,'phase five expired at the start of its own year');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:false,yearQueue:[]}));
    for(let guard=0;guard<6;guard++){
      run=await snapshot(page);
      if(run.currentDecision?.episode?.id==='first_job_application'&&run.currentDecision.episode.phase===5)break;
      await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    }
    run=await snapshot(page);
    assert.equal(run.currentDecision?.episode?.phase,5,'natural year planning closed the new first-job phase before showing it');
    assert.equal(await optionEnabled(page,0),true,'legal bridge job was unavailable on the natural fifth phase');

    await page.evaluate(({patch,age})=>window.__LIFE_DEBUG__.patchRun({age,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,episodes:{first_job_application:{status:'active',phase:4,startedAt:16,nextPhaseAge:age,deadlineAge:age+2,route:'prepared',boundActors:{},commitments:[],closureReason:null}},...patch}),{patch:noOfferJob,age:20});
    const directNoOfferBefore=await snapshot(page);
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),eventFor('first_job_application',4).id),eventFor('first_job_application',4).id);
    run=await snapshot(page);
    assert.equal(run.currentDecision,null);
    assert.equal(run.sceneQueue.length,0);
    assert.equal(run.decisionCount,directNoOfferBefore.decisionCount);
    assert.equal(run.episodes.first_job_application.status,'active');
    assert.equal(run.episodes.first_job_application.phase,5);
    assert.equal(run.employment.firstJobAge,null);
    await preparePhase(page,'first_job_application',5,{...noOfferJob,age:run.age,employment:run.employment});
    run=await choose(page,0);
    assert.ok(['employed','gig'].includes(run.employment.status));
    assert.ok(['T0','T1'].includes(run.employment.jobTier));
    assert.equal(run.episodes.first_job_application.status,'resolved');
    assert.equal(run.episodes.first_job_application.closureReason,'bridge_job');
    const blockedBridge={...noOfferJob,age:25,location:{id:'us'},mobility:{workAuthorization:'restricted'},employment:{...noOfferJob.employment,applicationRegion:'us'}};
    await preparePhase(page,'first_job_application',5,blockedBridge);
    assert.equal(await optionEnabled(page,0),false,'unavailable overseas bridge job remained selectable');
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.bridgeFirstJobCandidates())).length,0);
    assert.match((await snapshot(page)).currentDecision.situation,/没有一份资格、地区和合同条件都允许/);

    const changeBase={education:{status:'enrolled',level:4,path:'college',enrollmentRegion:'domestic',nextStage:'undergraduate',undergraduateSystem:'domestic',highestCompleted:'secondary',changeIntent:'none'},pressures:{career:20},activity:{mode:'study'}};
    await preparePhase(page,'undergraduate_change',1,changeBase);
    run=await choose(page,1);
    assert.equal(run.education.status,'interrupted');
    assert.equal(run.education.changeIntent,'leave');
    await preparePhase(page,'undergraduate_change',2,{...changeBase,education:{...changeBase.education,status:'interrupted',changeIntent:'leave'},activity:{mode:'flexible'}});
    assert.equal(await optionEnabled(page,0),false);
    assert.equal(await optionEnabled(page,1),true);
    assert.equal(await optionEnabled(page,2),false);
    run=await choose(page,1);
    assert.equal(run.education.status,'enrolled');
    assert.equal(run.education.changeResult,'resumed');
    await preparePhase(page,'undergraduate_change',1,changeBase);
    run=await choose(page,2);
    assert.equal(run.education.changeIntent,'transfer');
    await preparePhase(page,'undergraduate_change',2,{...changeBase,education:{...changeBase.education,changeIntent:'transfer'}});
    assert.equal(await optionEnabled(page,2),true);
    run=await choose(page,2);
    assert.equal(run.education.changeResult,'transferred');

    const postgraduateBase={education:{status:'enrolled',level:5,path:'postgraduate',postgraduateSystem:'domestic',highestCompleted:'undergraduate',nextStage:'postgraduate',courseworkEvidence:28,practiceEvidence:14,researchEvidence:26},employment:{status:'none',entryCredential:'bachelor',applicationStatus:'none'},activity:{mode:'study'}};
    await preparePhase(page,'postgraduate_domestic',3,postgraduateBase);
    run=await choose(page,0);
    assert.equal(run.education.highestCompleted,'postgraduate');
    assert.equal(run.employment.entryCredential,'postgraduate');
    assert.equal(run.education.nextStage,'firstJob');

    const postgraduateJob={location:{id:'tier1'},education:{status:'completed',level:5,path:'postgraduate',highestCompleted:'postgraduate',nextStage:'firstJob',courseworkEvidence:30,practiceEvidence:18,researchEvidence:34},employment:{status:'none',entryCredential:'postgraduate',applicationRegion:'domestic',applicationChannel:'specialist',applicationStatus:'applying'},activity:{mode:'seeking'}};
    await preparePhase(page,'first_job_application',3,postgraduateJob);
    run=await choose(page,0);
    assert.equal(run.employment.applicationStatus,'offered');
    const postgraduateOffer=run.employment;
    await preparePhase(page,'first_job_application',4,{...postgraduateJob,employment:postgraduateOffer});
    assert.equal(await optionEnabled(page,0),true);
    assert.equal(await optionEnabled(page,1),true);
    run=await choose(page,0);
    assert.equal(run.employment.firstJobOutcome,run.employment.profileId);
    assert.ok(['T2','T3'].includes(run.employment.jobTier));
    assert.notEqual(run.employment.jobTier,'T4');

    const qualificationBase={age:24,education:{status:'completed',level:5,path:'postgraduate',highestCompleted:'postgraduate',nextStage:'firstJob',credentials:[],professionalQualificationIntent:'none'},employment:{status:'none',entryCredential:'postgraduate',applicationStatus:'none'},activity:{mode:'seeking'}};
    for(const [qualificationIndex,credential] of ['medical_practice','legal_practice','university_teaching'].entries()){
      await preparePhase(page,'professional_entry_qualification',1,qualificationBase);
      run=await choose(page,qualificationIndex);
      assert.equal(run.education.professionalQualificationIntent,credential);
      await preparePhase(page,'professional_entry_qualification',2,{...qualificationBase,education:{...qualificationBase.education,professionalQualificationIntent:credential}});
      run=await choose(page,0);
      assert.ok(run.education.credentials.includes(credential));
      assert.equal(run.education.nextStage,'firstJob');
    }
    await preparePhase(page,'professional_entry_qualification',1,qualificationBase);
    run=await choose(page,1);
    await preparePhase(page,'professional_entry_qualification',2,{...qualificationBase,education:{...qualificationBase.education,professionalQualificationIntent:'legal_practice'}});
    run=await choose(page,1);
    assert.equal(run.education.credentials.includes('legal_practice'),false);
    assert.equal(run.education.professionalQualificationIntent,'none');

    const professionalSearch={...postgraduateJob,seed:'professional-9',education:{...postgraduateJob.education,credentials:['medical_practice']},employment:{...postgraduateJob.employment,firstJobEntryPath:'specialist'}};
    await preparePhase(page,'first_job_application',3,professionalSearch);
    assert.equal((await snapshot(page)).currentDecision.recruitmentScenarioId,'E04');
    run=await choose(page,0);
    assert.equal(run.employment.pendingOfferId,'doctor');
    await preparePhase(page,'first_job_application',4,{...professionalSearch,employment:run.employment});
    run=await choose(page,0);
    assert.equal(run.employment.profileId,'doctor');
    assert.equal(run.employment.jobTier,'T3');

    const unqualifiedSearch={...professionalSearch,education:{...professionalSearch.education,credentials:[]},employment:{...postgraduateJob.employment,firstJobEntryPath:'specialist'}};
    await preparePhase(page,'first_job_application',3,unqualifiedSearch);
    run=await choose(page,0);
    assert.ok(!['doctor','lawyer','university_lecturer'].includes(run.employment.pendingOfferId));

    const publicJob={status:'employed',profileId:'public_clerk',career:'公共部门职员',jobTier:'T2',rank:2,sector:'public',employerType:'public',contractType:'service',contract:'service',arrangement:'onsite',incomeStability:'fixedPlusBonus',salary:15800,incomeAnnualGross:205000,tenure:7,applicationStatus:'employed',pendingOfferId:'none'};
    const careerGrowth=eventFor('career_growth',1),growthSamples=[
      ['warehouse_picker','employed','responsibility',null],
      ['factory_operator','employed','responsibility',null],
      ['admin_assistant','employed','responsibility',null],
      ['accountant','employed','professional',null],
      ['store_clerk','employed','promotion','store_supervisor'],
      ['crowd_rider','gig','responsibility',null],
    ];
    for(const [profileId,status,growthType,promotionTarget] of growthSamples){
      const profile=profiles[profileId],monthly=profile.tier==='T0'?4200:profile.tier==='T1'?6000:12000;
      await preparePhase(page,'career_growth',1,{age:30,location:{id:'tier2'},employment:{status,profileId,career:profile.name,jobTier:profile.tier,rank:Number(profile.tier.slice(1)),sector:profile.sector,employerType:profile.employerType,contractType:profile.contractType,contract:profile.contractType,arrangement:profile.arrangement,incomeStability:profile.incomeStability,salary:monthly,incomeAnnualGross:monthly*12,tenure:3,firstJobAge:24,applicationStatus:'employed',pendingOfferId:'none',growthType:'none',growthCount:0,lastGrowthAge:null},activity:{mode:status==='gig'?'flexible':'work'}});
      const beforeGrowth=await snapshot(page);
      assert.match(beforeGrowth.currentDecision.situation,new RegExp(profile.name));
      run=await choose(page,0);
      assert.equal(run.employment.growthType,growthType,profileId);
      assert.equal(run.employment.growthCount,1,profileId);
      if(promotionTarget)assert.equal(run.employment.profileId,promotionTarget,profileId);
      else assert.ok(run.employment.incomeAnnualGross>beforeGrowth.employment.incomeAnnualGross,profileId);
    }
    const debtLimitedProfile=profiles.software_engineer;
    await page.evaluate(({profile,eventId})=>window.__LIFE_DEBUG__.patchRun({
      age:30,phase:'playing',sceneQueue:[],currentDecision:null,episodes:null,usedEvents:[],
      employment:{status:'employed',profileId:profile.id,career:profile.name,jobTier:profile.tier,rank:2,sector:profile.sector,employerType:profile.employerType,contractType:profile.contractType,contract:profile.contractType,arrangement:profile.arrangement,incomeStability:profile.incomeStability,salary:12000,incomeAnnualGross:144000,tenure:3,firstJobAge:24,applicationStatus:'employed',pendingOfferId:'none',growthType:'none',growthCount:0,lastGrowthAge:null},
      finance:{
        debtStage:'enforcement',enforcementStatus:'active',enforcementDebtId:'growth_debt',dishonestStatus:'listed',restrictedConsumption:true,
        liabilities:[{id:'growth_debt',kind:'consumer',principal:40000,rate:.08,status:'delinquent',arrears:2,enforcementEligible:true,housingSecured:false}]
      },relationships:{activePartnerId:null,partnerStatus:'none',familyPlanningClosed:true},activity:{mode:'work'}
    }),{profile:debtLimitedProfile,eventId:careerGrowth.id});
    assert.ok((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes(careerGrowth.id),'a debt-limited promotion removed the whole career-growth panel');
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),careerGrowth.id),careerGrowth.id);
    assert.equal(await page.locator('[data-choice="0"]').isEnabled(),false,'debt restriction did not block the high-tier promotion itself');
    assert.equal(await page.locator('[data-choice="1"]').isEnabled(),true,'debt restriction also removed the legal keep-current-job choice');
    run=await choose(page,1);
    assert.equal(run.employment.profileId,'software_engineer');
    assert.equal(run.employment.growthCount,0);
    await preparePhase(page,'career_growth',1,{
      age:40,usedEvents:[],relationships:{activePartnerId:null,partnerStatus:'none',familyPlanningClosed:true},
      employment:{status:'employed',profileId:'admin_assistant',career:'行政助理',jobTier:'T1',rank:1,sector:'administration',employerType:'private',contractType:'openEnded',contract:'openEnded',arrangement:'onsite',incomeStability:'fixed',salary:6000,incomeAnnualGross:72000,tenure:3,firstJobAge:24,applicationStatus:'employed',pendingOfferId:'none',growthType:'responsibility',growthCount:1,lastGrowthAge:28},
      activity:{mode:'work'}
    });
    run=await choose(page,1);
    assert.equal(run.employment.lastGrowthAge,28,'declining growth rewrote the age of an older job growth');
    await page.locator('[data-act="open-drawer"]').click();
    const declinedGrowthDrawer=await page.locator('.drawer').innerText();
    assert.match(declinedGrowthDrawer,/行政助理已经连续做了 4 年/);
    assert.doesNotMatch(declinedGrowthDrawer,/行政助理已经有过一次写进职责或收入的成长/);
    await page.locator('.drawer [data-act="close-drawer"]').click();
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:30,usedEvents:[],episodes:{},finance:{dishonestStatus:'clear',restrictedConsumption:false},employment:{status:'selfEmployed',profileId:'small_shop_owner',career:'小店经营者',tenure:5,firstJobAge:24},activity:{mode:'work'}}));
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes(careerGrowth.id),false,'self-employed work used company growth copy');
    const careLeaveDecision=decisions.find(event=>event.prompt.startsWith('外面的岗位薪水更高'));
    await page.evaluate(({eventId,employment})=>{
      window.__LIFE_DEBUG__.patchRun({age:40,phase:'playing',sceneQueue:[],currentDecision:null,episodes:null,employment,activity:{mode:'work'}});
      window.__LIFE_DEBUG__.forceDecision(eventId);
    },{eventId:careLeaveDecision.id,employment:publicJob});
    await page.locator('[data-choice="1"]:not([disabled])').click();
    await page.waitForFunction(()=>window.__LIFE_DEBUG__.snapshot().age===41);
    run=await snapshot(page);
    assert.equal(run.employment.status,'careLeave');
    assert.equal(run.employment.career,'停薪留职');
    assert.equal(run.employment.applicationStatus,'withdrawn');
    assert.equal(run.employment.lastJob.profileId,'public_clerk');
    assert.equal(run.employment.careLeaveUntilAge,run.age);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.settleYear());
    assert.ok(['employed','gig'].includes(run.employment.status));
    assert.equal(run.employment.profileId,'public_clerk');
    assert.equal(run.employment.salary,15800);
    assert.equal(run.employment.incomeAnnualGross,205000);
    assert.equal(run.employment.tenure,8);

    const handoverDecision=decisions.find(event=>event.prompt.startsWith('长期岗位合同到期前'));
    const handoverJob={...publicJob,profileId:'admin_assistant',career:'行政助理',jobTier:'T1',rank:1,sector:'general',employerType:'private',contractType:'fixedTerm',contract:'fixedTerm',incomeStability:'fixed',salary:6000,incomeAnnualGross:72000,tenure:4};
    await page.evaluate(({eventId,employment})=>{
      window.__LIFE_DEBUG__.patchRun({age:50,phase:'playing',sceneQueue:[],currentDecision:null,episodes:null,employment,activity:{mode:'work'}});
      window.__LIFE_DEBUG__.forceDecision(eventId);
    },{eventId:handoverDecision.id,employment:handoverJob});
    const handoverAge=(await snapshot(page)).age;
    await page.locator('[data-choice="1"]:not([disabled])').click();
    await page.waitForFunction(age=>window.__LIFE_DEBUG__.snapshot().age===age+1,handoverAge);
    run=await snapshot(page);
    assert.equal(run.employment.status,'unemployed');
    assert.equal(run.employment.lastJob.profileId,'admin_assistant');
    assert.equal(run.employment.incomeAnnualGross,0);

    await preparePhase(page,'layoff_reemployment',2,{age:42,employment:{...publicJob,status:'unemployed',profileId:'none',career:'待业中',jobTier:null,rank:0,sector:'none',employerType:'none',contractType:'none',contract:'none',incomeStability:'none',salary:0,incomeAnnualGross:0,lastJob:{profileId:'public_clerk',career:'公共部门职员',tier:'T2',sector:'public',employerType:'public',contractType:'service',salary:15800,incomeAnnualGross:205000,incomeStability:'fixedPlusBonus',tenure:8}},activity:{mode:'seeking'}});
    run=await choose(page,0);
    assert.equal(run.employment.profileId,'public_clerk');

    const shopCloseJob={...handoverJob,status:'employed',applicationStatus:'employed'};
    await preparePhase(page,'shop_opening',3,{age:32,employment:shopCloseJob,business:{status:'operating',mode:'independent',operatingSkill:35,equity:20000},finance:{cash:50000},activity:{mode:'work'}});
    run=await choose(page,2);
    assert.equal(run.business.status,'closed');
    assert.equal(run.employment.status,'employed');
    assert.equal(run.employment.profileId,'admin_assistant');

    await preparePhase(page,'wealth_peak',2,{age:55,employment:shopCloseJob,business:{status:'operating',mode:'independent',scale:'national',operatingSkill:70,equity:1e8},finance:{cash:50000},activity:{mode:'work'}});
    run=await choose(page,2);
    assert.equal(run.business.status,'sold');
    assert.equal(run.employment.status,'employed');
    assert.equal(run.employment.profileId,'admin_assistant');

    const firstJobFailure=eventFor('first_job_application',5),firstJobFailureChoice=firstJobFailure.choices[1];
    const reentryBase={age:34,education:{status:'completed',level:4,path:'college',highestCompleted:'undergraduate',nextStage:'career'},employment:{status:'unemployed',entryCredential:'bachelor',applicationStatus:'searching',firstJobAge:null,firstJobEntryPath:'reentry'},activity:{mode:'seeking'},decisionHistory:[{age:27,eventId:firstJobFailure.id,choiceId:firstJobFailureChoice.id,choice:firstJobFailureChoice.text,result:firstJobFailureChoice.resultText,outcomeTags:[]}],usedEvents:['decision_161',firstJobFailure.id],episodes:{first_job_application:{status:'resolved',phase:5,startedAt:22,nextPhaseAge:27,deadlineAge:28,route:'continued_search',boundActors:{},commitments:[],closureReason:'continued_search'}}};
    await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({...value,age:32,phase:'playing',sceneQueue:[],currentDecision:null}),reentryBase);
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.nextDecisionId()),'decision_162','reentry must not bypass the adult identity decision');
    await page.evaluate(()=>{const run=window.__LIFE_DEBUG__.snapshot();window.__LIFE_DEBUG__.patchRun({usedEvents:[...new Set([...(run.usedEvents||[]),'decision_162'])],desires:{reclaimed:true}})});
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.nextDecisionId()),eventFor('long_term_first_job_reentry',1).id);
    await preparePhase(page,'long_term_first_job_reentry',3,reentryBase);
    run=await choose(page,0);
    assert.equal(run.employment.status==='employed'||run.employment.status==='gig',true);
    assert.ok(['T0','T1','T2'].includes(run.employment.jobTier));
    assert.notEqual(run.employment.jobTier,'T3');

    const overseasBase={education:{status:'enrolled',level:4,path:'college',enrollmentRegion:'overseas',undergraduateSystem:'us',nextStage:'undergraduate'},mobility:{mode:'studyAbroad',lastOverseasSystem:'us',hostLanguage:12,dailyAdaptation:0,localTies:0,chineseCommunityTies:0,belonging:0,discriminationLoad:0}};
    await preparePhase(page,'overseas_undergraduate_belonging',1,overseasBase);
    await page.waitForTimeout(400);
    await page.screenshot({path:path.join(OUT,'01-overseas-situation-360x773.png'),fullPage:false});
    await fit(page,'overseas-360x773');
    run=await choose(page,1);
    assert.ok(run.mobility.chineseCommunityTies>0);
    await preparePhase(page,'overseas_undergraduate_belonging',2,{...overseasBase,mobility:{...overseasBase.mobility,chineseCommunityTies:8}});
    await page.setViewportSize({width:360,height:640});
    await page.waitForTimeout(400);
    await fit(page,'network-360x640');
    await page.screenshot({path:path.join(OUT,'02-network-choice-360x640.png'),fullPage:false});
    run=await choose(page,0);
    assert.ok(run.mobility.chineseCommunityTies>0&&run.mobility.localTies>0);
    await preparePhase(page,'overseas_undergraduate_belonging',3,{...overseasBase,mobility:{...overseasBase.mobility,chineseCommunityTies:13,localTies:5,belonging:5}});
    await page.setViewportSize({width:320,height:568});
    await page.waitForTimeout(400);
    await fit(page,'discrimination-320x568');
    await page.screenshot({path:path.join(OUT,'03-boundary-choice-320x568.png'),fullPage:false});
    run=await choose(page,1);
    assert.ok(run.mobility.discriminationLoad>0);
    assert.ok(run.mobility.localTies>0);

    const overseasJob={education:{status:'completed',level:5,path:'postgraduate',highestCompleted:'postgraduate',nextStage:'firstJob',courseworkEvidence:30,practiceEvidence:24,researchEvidence:30},employment:{status:'none',entryCredential:'postgraduate',applicationRegion:'us',applicationChannel:'specialist',applicationStatus:'applying'},mobility:{hostLanguage:30,localTies:15,discriminationLoad:0,visaPressure:10,lastOverseasSystem:'us',workAuthorization:'verified'},activity:{mode:'seeking'}};
    await preparePhase(page,'first_job_application',3,overseasJob);
    assert.equal((await snapshot(page)).currentDecision.recruitmentScenarioId,'E08');
    const continuedOverseas=await choose(page,0);
    assert.equal(continuedOverseas.employment.pendingOfferId,'none');
    assert.equal(continuedOverseas.employment.applicationStatus,'searching');
    await preparePhase(page,'first_job_application',3,overseasJob);
    assert.equal((await snapshot(page)).currentDecision.recruitmentScenarioId,'E08');
    const withdrawnOverseas=await choose(page,1);
    assert.equal(withdrawnOverseas.employment.pendingOfferId,'none');
    assert.equal(withdrawnOverseas.employment.applicationStatus,'withdrawn');
    await preparePhase(page,'first_job_application',3,overseasJob);
    assert.equal((await snapshot(page)).currentDecision.recruitmentScenarioId,'E08');
    const returnedDomestic=await choose(page,2);
    assert.equal(returnedDomestic.employment.applicationRegion,'domestic');
    assert.notEqual(returnedDomestic.employment.pendingOfferId,'none');
    await preparePhase(page,'first_job_application',4,{...overseasJob,employment:returnedDomestic.employment});
    run=await choose(page,0);
    assert.ok(['employed','gig'].includes(run.employment.status));
    assert.ok(['tier1','tier2','county','town'].includes(run.location.id));

    const weakGraduate={education:{status:'completed',level:4,path:'college',highestCompleted:'undergraduate',nextStage:'postgraduateApplication',graduateApplicationIntent:'us',graduateApplicationStatus:'submitted',courseworkEvidence:2,practiceEvidence:1,researchEvidence:1,readiness:20},development:{languagePreparation:5},activity:{mode:'study'}};
    await preparePhase(page,'postgraduate_application',3,weakGraduate);
    run=await choose(page,1);
    assert.equal(run.education.graduateApplicationStatus,'notAdmitted');
    assert.equal(run.education.nextStage,'firstJob');

    const fundingGap={education:{status:'completed',level:4,path:'college',highestCompleted:'undergraduate',nextStage:'postgraduateApplication',graduateApplicationIntent:'europe',graduateApplicationStatus:'submitted',courseworkEvidence:40,practiceEvidence:25,researchEvidence:30,readiness:80,scholarshipAwarded:false},development:{languagePreparation:45},originHousehold:{context:{educationBudget:20},assets:0,debt:0},finance:{cash:1000},activity:{mode:'study'}};
    await preparePhase(page,'postgraduate_application',3,fundingGap);
    run=await choose(page,1);
    assert.equal(run.education.graduateApplicationStatus,'offered');
    assert.equal(run.education.graduateFundingStatus,'gap');
    await preparePhase(page,'postgraduate_application',4,{...fundingGap,education:{...fundingGap.education,graduateApplicationStatus:'offered',graduateApplicationResult:'offered',graduateOfferRegion:'europe',graduateFundingStatus:'gap'}});
    assert.equal(await optionEnabled(page,2),false);
    assert.equal(await optionEnabled(page,3),true);

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({phase:'playing',sceneQueue:[],currentDecision:null,mobility:{lastOverseasSystem:'europe',hostLanguage:28,dailyAdaptation:35,localTies:22,chineseCommunityTies:26,belonging:20,discriminationLoad:8}}));
    await page.locator('[data-act="open-drawer"]').click();
    await page.waitForTimeout(400);
    await fit(page,'drawer-320x568');
    await page.screenshot({path:path.join(OUT,'04-overseas-drawer-320x568.png'),fullPage:false});
    const drawerText=await page.locator('.drawer').innerText();
    assert.match(drawerText,/海外生活/);
    assert.match(drawerText,/华人联系很少/);
    assert.match(drawerText,/本地联系很少/);
    assert.doesNotMatch(drawerText,/归属20|生活适应35|华人联系26|本地联系22/);

    await page.locator('.drawer [data-act="close-drawer"]').click();
    await page.evaluate(({key,event})=>{
      const debug=window.__LIFE_DEBUG__;
      debug.patchRun({age:20,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,yearQueue:[],usedEvents:[],education:{status:'completed',level:3,path:'vocational',nextStage:'career'},employment:{status:'unemployed',applicationStatus:'searching',pendingOfferId:'none',firstJobAge:null},activity:{mode:'seeking'},episodes:{first_job_application:{status:'active',phase:4,startedAt:16,nextPhaseAge:20,deadlineAge:22,route:'long_search',boundActors:{},commitments:[],closureReason:null}}});
      const saved=JSON.parse(localStorage.getItem(key));
      saved.run.contentRevision=35;
      saved.run.phase='episode';
      saved.run.currentDecision=event;
      saved.run.sceneQueue=[{kind:'choice',eventId:event.id}];
      localStorage.setItem(key,JSON.stringify(saved));
      const setItem=Storage.prototype.setItem;
      Storage.prototype.setItem=function(storageKey,value){
        if(storageKey===key)return;
        return setItem.call(this,storageKey,value);
      };
    },{key:SAVE_KEY,event:eventFor('first_job_application',4)});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await snapshot(page);
    assert.equal(run.phase,'playing');
    assert.equal(run.currentDecision,null);
    assert.equal(run.yearQueue[0].id,eventFor('first_job_application',4).id);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.sceneQueue.length,0);
    assert.equal(run.episodes.first_job_application.phase,5);

    await page.evaluate(({key,event})=>{
      const debug=window.__LIFE_DEBUG__;
      debug.patchRun({seed:'revision35-domestic',age:18,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,yearQueue:[],usedEvents:[],attrs:{intellect:10},education:{status:'completed',level:3,path:'highSchool',highestCompleted:'secondary',nextStage:'undergraduateApplication',undergraduateSystem:'none',enrollmentRegion:'none',applicationIntent:'domestic',applicationRoute:'none',applicationStatus:'planning',applicationAttemptCount:0,domesticOffer:false,domesticOfferType:'none',fullTimeUndergraduateClosed:false},development:{learningHabit:90,attendance:96,teacherSupport:85,peerSupport:75,selfAdvocacy:80,careLoad:5,traumaLoad:4,routeKnowledge:88,languagePreparation:0,routeExposure:[]},episodes:{undergraduate_application:{status:'active',phase:2,startedAt:17,nextPhaseAge:18,deadlineAge:22,route:'domestic_plan',boundActors:{},commitments:[],closureReason:null}}});
      const saved=JSON.parse(localStorage.getItem(key));
      saved.run.contentRevision=35;
      saved.run.phase='episode';
      saved.run.currentDecision=event;
      saved.run.sceneQueue=[{kind:'choice',eventId:event.id}];
      localStorage.setItem(key,JSON.stringify(saved));
      const setItem=Storage.prototype.setItem;
      Storage.prototype.setItem=function(storageKey,value){
        if(storageKey===key)return;
        return setItem.call(this,storageKey,value);
      };
    },{key:SAVE_KEY,event:eventFor('undergraduate_application',2)});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await snapshot(page);
    assert.equal(run.phase,'playing');
    assert.equal(run.yearQueue[0].id,eventFor('undergraduate_application',2).id);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.sceneQueue[0].kind,'result');
    assert.equal(run.sceneQueue[0].automatic,true);
    assert.match(run.sceneQueue[0].text,/提交了志愿.*录取结果/);

    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,migration:'old-run-cleared-meta-preserved',episodes:episodeIds.length,unifiedEmploymentCatalog:true,professionalCredentials:true,longTermReentry:true,researchSeeds:40,overseasOffersDisabled:true,domesticReturn:true,leaveAndResume:true,transfer:true,continuedJobSearch:true,coNationalAndLocalTies:true,graduateFailure:true,fundingGap:true,viewports:['360x773','360x640','320x568'],screenshots:fs.readdirSync(OUT).sort(),errors},null,2));
    await context.close();
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
