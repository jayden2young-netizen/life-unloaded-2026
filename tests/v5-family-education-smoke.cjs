const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.FAMILY_EDUCATION_SMOKE_OUT||path.join(os.tmpdir(),'life-unloaded-v0.5.10-family-education');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const CHROME=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data.json'),'utf8'));
const decisions=data.events.filter(event=>event.kind==='decision');
const phase=(id,number)=>decisions.find(event=>event.episode?.id===id&&event.episode.phase===number);
fs.mkdirSync(OUT,{recursive:true});

async function snapshot(page){return page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())}
async function textState(page){return page.evaluate(()=>JSON.parse(window.render_game_to_text()))}
async function fit(page,label){
  const result=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth,sheets:[...document.querySelectorAll('.choice-sheet,.drawer')].map(node=>node.getBoundingClientRect()),buttons:[...document.querySelectorAll('.choice-sheet button')].map(node=>node.getBoundingClientRect())}));
  assert.ok(result.scrollWidth<=result.innerWidth+1,`${label}: horizontal overflow`);
  for(const box of[...result.sheets,...result.buttons])assert.ok(box.left>=-1&&box.right<=result.innerWidth+1,`${label}: element outside viewport`);
}
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
async function enterPhase(page,event,patch={},options={}){
  await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,...value}),patch);
  assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),event.id),event.id);
  const before=await snapshot(page);
  assert.equal(before.sceneQueue[0].kind,'situation');
  await page.locator('[data-act="episode-next"]').click();
  let choice=await snapshot(page);
  assert.equal(choice.age,before.age);
  assert.equal(choice.sceneQueue[0].kind,'choice');
  if(options.reloadChoice){
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    choice=await snapshot(page);
    assert.equal(choice.age,before.age);
    assert.equal(choice.sceneQueue[0].kind,'choice');
    assert.equal(choice.currentDecision.id,event.id);
  }
  return before.age;
}
async function chooseAndFinish(page,index,{reload=false}={}){
  const before=await snapshot(page);
  await page.locator(`[data-choice="${index}"]:not([disabled])`).click();
  let result=await snapshot(page);
  assert.equal(result.age,before.age);
  assert.equal(result.sceneQueue[0].kind,'result');
  assert.equal(result.timeline.length,before.timeline.length);
  if(reload){
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    result=await snapshot(page);
    assert.equal(result.age,before.age);
    assert.equal(result.sceneQueue[0].kind,'result');
    assert.equal(result.timeline.length,before.timeline.length);
  }
  await page.locator('[data-act="episode-next"]').click();
  const finished=await snapshot(page);
  assert.equal(finished.age,before.age+1);
  assert.equal(finished.timeline.length,before.timeline.length+1);
  return finished;
}
async function advanceToPhase(page,id,number){
  await page.waitForTimeout(220);
  for(let guard=0;guard<8;guard++){
    const run=await snapshot(page);
    if(run.phase==='episode'&&run.currentDecision?.episode?.id===id&&run.currentDecision.episode.phase===number){
      assert.equal(run.sceneQueue[0].kind,'situation');
      await page.locator('[data-act="episode-next"]').click();
      const choice=await snapshot(page);
      assert.equal(choice.age,run.age);
      assert.equal(choice.sceneQueue[0].kind,'choice');
      return run.age;
    }
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
  }
  assert.fail(`${id} phase ${number} did not advance naturally`);
}

(async()=>{
  assert.deepEqual([data.version,data.schemaVersion,data.contentRevision],['0.5.10',9,17]);
  assert.equal(data.events.filter(event=>event.id.startsWith('origin_context_')).length,24);
  assert.ok(data.familyArchetypes.find(family=>family.name==='医护家庭').parentJobs.every(job=>/护士|医生|医技|医院/.test(job)));
  assert.ok(data.familyArchetypes.find(family=>family.name==='平台劳动家庭').parentJobs.every(job=>/平台|骑手|网约车|电商|直播/.test(job)));
  assert.deepEqual(decisions.filter(event=>event.episode?.id==='undergraduate_application').map(event=>event.episode.role),['start','continue','continue','resolve']);
  const browser=await chromium.launch({headless:true,executablePath:fs.existsSync(CHROME)?CHROME:undefined});
  const errors=[];
  try{
    let context=await browser.newContext({viewport:{width:360,height:773}});
    let page=await context.newPage();
    page.setDefaultTimeout(9000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    const oldSave={schemaVersion:8,gameVersion:'0.5.9',meta:{histories:[{title:'v0.5.9完整人生',age:82}],codex:['codex_01'],settings:{haptic:false},stats:{runs:9},seen:{events:{beat_001:2},cards:{},families:{},endings:{}},recentSeeds:['v059-finished']},run:{schemaVersion:8,gameVersion:'0.5.9',contentRevision:16,phase:'playing',age:17,education:{status:'completed',level:2}}};
    await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SAVE_KEY,value:oldSave});
    await page.goto(URL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.deepEqual([migrated.schemaVersion,migrated.gameVersion,migrated.run],[9,'0.5.10',null]);
    assert.equal(migrated.meta.histories[0].title,'v0.5.9完整人生');
    assert.equal(migrated.meta.settings.haptic,false);
    assert.equal(migrated.meta.stats.runs,9);
    assert.deepEqual(migrated.meta.recentSeeds,['v059-finished']);
    assert.equal(migrated.meta.seen.events.beat_001,undefined);
    await context.close();

    context=await browser.newContext({viewport:{width:360,height:773}});
    page=await context.newPage();
    page.setDefaultTimeout(9000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    await openPlayable(page);
    let run=await snapshot(page);
    assert.ok(run.originHousehold.context&&run.development&&Number.isFinite(run.education.readiness));
    assert.ok(run.originHousehold.people.filter(person=>['father','mother'].includes(person.relation)).every(parent=>parent.occupation&&parent.occupationImpact&&Number.isFinite(parent.educationExposure)));

    const unsafeContext={...run.originHousehold.context,resourceTier:'strained',resources:25,emotionalSafety:30,parentPresence:55};
    await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({age:2,originHousehold:{context:value},yearStarted:false,yearQueue:[],usedEvents:[],timeline:[]}),unsafeContext);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.match(run.timeline.at(-1).text,/争吵|没人解释/);
    assert.ok(run.development.traumaLoad>0);

    const presentContext={...unsafeContext,resourceTier:'comfortable',resources:88,educationCapital:85,educationBudget:88,parentPresence:82,caregiverAvailability:80,emotionalSafety:78,housingStability:82};
    await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({age:7,originHousehold:{context:value},yearStarted:false,yearQueue:[],usedEvents:[],timeline:[]}),presentContext);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.match(run.timeline.at(-1).text,/书桌|兴趣课|父母/);

    const comfortableUnsafe={...presentContext,emotionalSafety:32};
    await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({age:7,originHousehold:{context:value},yearStarted:false,yearQueue:[],usedEvents:[],timeline:[]}),comfortableUnsafe);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.match(run.timeline.at(-1).text,/错一道题|值得培养/);

    await enterPhase(page,phase('secondary_diversion',1),{age:15,attrs:{intellect:1},education:{status:'completed',level:2,path:'middleSchool'},development:{learningHabit:15,attendance:55,teacherSupport:25,peerSupport:30,selfAdvocacy:20,careLoad:65,traumaLoad:55,routeKnowledge:10,languagePreparation:0,routeExposure:[]}});
    let rendered=await textState(page);
    const academic=rendered.run.decision.choices.find(choice=>/普高/.test(choice.text));
    assert.equal(academic.visible,true);
    assert.equal(academic.enabled,false);
    assert.match(academic.reason,/成绩|出勤|准备/);
    assert.equal(rendered.run.decision.choices.some(choice=>/可办理学校/.test(choice.text)),false);
    const beforeLocked=await snapshot(page);
    await page.evaluate(()=>document.querySelector('[data-choice="0"]').click());
    assert.equal((await snapshot(page)).sceneQueue[0].kind,beforeLocked.sceneQueue[0].kind);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({development:{routeExposure:['alternativeSchool']}}));
    rendered=await textState(page);
    assert.equal(rendered.run.decision.choices.some(choice=>/可办理学校/.test(choice.text)),true);
    await page.setViewportSize({width:360,height:640});
    await fit(page,'secondary-locked-360x640');
    await page.waitForTimeout(900);
    await page.screenshot({path:path.join(OUT,'01-secondary-locked-360x640.png'),fullPage:true});

    const strongEducation={status:'completed',level:3,path:'highSchool',applicationIntent:'none',applicationStatus:'none',domesticOffer:false,overseasOffer:false,fundingStatus:'none',entryPermitReady:false,enrollmentRegion:'none'};
    const strongDevelopment={learningHabit:90,attendance:96,teacherSupport:85,peerSupport:75,selfAdvocacy:80,careLoad:5,traumaLoad:4,routeKnowledge:88,languagePreparation:82,routeExposure:['overseas','scholarship']};
    await page.setViewportSize({width:360,height:773});
    await enterPhase(page,phase('undergraduate_application',1),{age:18,attrs:{intellect:10},originHousehold:{context:presentContext},education:strongEducation,development:strongDevelopment,episodes:{undergraduate_application:{status:'inactive'}},usedEvents:[]},{reloadChoice:true});
    run=await chooseAndFinish(page,0);
    assert.equal(run.education.applicationIntent,'domestic');
    await advanceToPhase(page,'undergraduate_application',2);
    assert.equal((await textState(page)).run.decision.choices.find(choice=>/国内考试/.test(choice.text)).enabled,true);
    run=await chooseAndFinish(page,0);
    assert.equal(run.education.domesticOffer,true);
    assert.equal(run.education.applicationStatus,'offered');
    assert.equal(run.episodes.undergraduate_application.phase,3);
    await advanceToPhase(page,'undergraduate_application',3);
    await page.setViewportSize({width:320,height:568});
    await fit(page,'domestic-funding-320x568');
    run=await chooseAndFinish(page,0,{reload:true});
    assert.equal(run.education.domesticEntryReady,true);
    await page.setViewportSize({width:360,height:773});
    await advanceToPhase(page,'undergraduate_application',4);
    run=await chooseAndFinish(page,0);
    assert.equal(run.education.status,'enrolled');
    assert.equal(run.education.enrollmentRegion,'domestic');
    assert.equal(run.education.nextStage,'undergraduate');
    assert.equal(run.episodes.undergraduate_application.status,'resolved');

    const usedWithoutUndergrad=run.usedEvents.filter(id=>!decisions.some(event=>event.id===id&&event.episode?.id==='undergraduate_application'));
    const overseasDevelopment={...strongDevelopment,routeExposure:['overseas']};
    await enterPhase(page,phase('undergraduate_application',1),{age:18,attrs:{intellect:10},originHousehold:{context:presentContext},education:{...strongEducation},development:overseasDevelopment,episodes:{undergraduate_application:{status:'inactive'}},usedEvents:usedWithoutUndergrad});
    rendered=await textState(page);
    assert.equal(rendered.run.decision.choices.find(choice=>/海外本科作为主线/.test(choice.text)).enabled,true);
    run=await chooseAndFinish(page,2);
    assert.equal(run.education.applicationIntent,'overseas');
    await advanceToPhase(page,'undergraduate_application',2);
    run=await chooseAndFinish(page,1);
    assert.equal(run.education.overseasOffer,true);
    assert.equal(run.education.overseasOfferType,'direct');
    await advanceToPhase(page,'undergraduate_application',3);
    rendered=await textState(page);
    assert.equal(rendered.run.decision.choices.find(choice=>/家庭预算/.test(choice.text)).enabled,true);
    assert.equal(rendered.run.decision.choices.some(choice=>/奖学金/.test(choice.text)),false);
    run=await chooseAndFinish(page,1);
    assert.equal(run.education.entryPermitReady,false);
    assert.equal(run.education.overseasDepartureReady,true);
    assert.equal(run.education.overseasEntryReady,false);
    await advanceToPhase(page,'undergraduate_application',4);
    run=await chooseAndFinish(page,1);
    assert.equal(run.education.entryPermitReady,true);
    assert.equal(run.education.overseasEntryReady,true);
    assert.equal(run.education.status,'enrolled');
    assert.equal(run.education.enrollmentRegion,'overseas');
    assert.equal(run.education.applicationStatus,'enrolled');
    assert.equal(run.education.nextStage,'undergraduate');

    await page.locator('[data-act="open-drawer"]').click();
    await fit(page,'overseas-drawer-360x773');
    const drawer=await page.locator('.drawer').innerText();
    assert.match(drawer,/成长与教育/);
    assert.match(drawer,/海外本科已报到/);
    await page.waitForTimeout(900);
    await page.screenshot({path:path.join(OUT,'02-overseas-enrolled-drawer-360x773.png'),fullPage:true});
    await page.locator('.drawer [data-act="close-drawer"]').click();

    const poorContext={...presentContext,resources:20,educationBudget:10};
    await enterPhase(page,phase('undergraduate_application',3),{age:19,originHousehold:{context:poorContext,assets:0,debt:50000},finance:{cash:0},education:{...strongEducation,domesticOffer:true,domesticOfferType:'admitted',applicationStatus:'offered'},development:{...strongDevelopment,routeExposure:[]},episodes:{undergraduate_application:{status:'active',phase:3,startedAt:18,nextPhaseAge:19,deadlineAge:22,route:'domestic_submitted',boundActors:{},commitments:[],closureReason:null}}});
    rendered=await textState(page);
    const domesticFunding=rendered.run.decision.choices.find(choice=>/国内录取/.test(choice.text));
    assert.equal(domesticFunding.visible,true);
    assert.equal(domesticFunding.enabled,false);
    assert.match(domesticFunding.reason,/费用|资助/);
    run=await chooseAndFinish(page,3);
    assert.equal(run.education.nextStage,'reapply');
    assert.equal(run.education.entryPermitReady,false);

    const lowLocation={...run.location,mods:{...run.location.mods,education:0}};
    const marginalDevelopment={learningHabit:55,attendance:86,teacherSupport:48,peerSupport:50,selfAdvocacy:52,careLoad:2,traumaLoad:2,routeKnowledge:55,languagePreparation:0,routeExposure:[]};
    await enterPhase(page,phase('undergraduate_application',2),{age:18,location:lowLocation,attrs:{intellect:2},originHousehold:{context:{...presentContext,educationBudget:45}},education:{...strongEducation,applicationIntent:'domestic'},development:marginalDevelopment,episodes:{undergraduate_application:{status:'active',phase:2,startedAt:17,nextPhaseAge:18,deadlineAge:21,route:'domestic_plan',boundActors:{},commitments:[],closureReason:null}}});
    run=await snapshot(page);
    assert.equal(run.education.domesticEligible,true);
    assert.equal(run.education.domesticOfferReady,false);
    run=await chooseAndFinish(page,0);
    assert.equal(run.education.applicationStatus,'notAdmitted');
    assert.equal(run.education.nextStage,'reapply');
    assert.equal(run.episodes.undergraduate_application.status,'abandoned');
    assert.equal(run.episodes.undergraduate_application.closureReason,'not_admitted');

    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,migration:'schema-8-run-cleared-meta-preserved-indexed-seen-reset',familyMilestones:['strained-unsafe','comfortable-present','comfortable-unsafe'],gating:['core-visible-locked','special-hidden-until-exposed','domestic-funding-locked','scholarship-hidden'],routes:['domestic-enrolled','overseas-enrolled','not-admitted','deferred'],phaseScheduling:'natural-after-start',sameAgeCards:true,refreshRestored:['choice','result'],timelinePerPhase:1,viewports:['360x773','360x640','320x568'],screenshots:fs.readdirSync(OUT).sort(),errors},null,2));
    await context.close();
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
