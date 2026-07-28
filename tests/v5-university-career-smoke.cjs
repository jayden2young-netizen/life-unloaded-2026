const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.UNIVERSITY_CAREER_SMOKE_OUT||path.join(os.tmpdir(),'life-unloaded-v0.6.1-university-career');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const CHROME=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data.json'),'utf8'));
const decisions=data.events.filter(event=>event.kind==='decision');
const eventFor=(id,phase)=>decisions.find(event=>event.episode?.id===id&&event.episode.phase===phase);
const episodeIds=['undergraduate_domestic','undergraduate_overseas_orientation','undergraduate_us','undergraduate_europe','undergraduate_change','overseas_undergraduate_belonging','postgraduate_application','postgraduate_domestic','postgraduate_us','postgraduate_europe','overseas_postgraduate_belonging','first_job_application'];
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
  await page.locator('[data-act="episode-next"]').click();
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
  assert.equal(run.age,before.age+1);
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
  assert.deepEqual([data.version,data.schemaVersion,data.contentRevision],['0.6.1',11,20]);
  for(const id of episodeIds){
    const rows=decisions.filter(event=>event.episode?.id===id).sort((a,b)=>a.episode.phase-b.episode.phase);
    assert.ok(rows.length>=1&&rows.length<=4,`${id}: phase count`);
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
  const firstJobResolverSource=runtimeSource.match(/function resolveFirstJobApplication[\s\S]*?function [^(]+\(/)?.[0]||'';
  assert.doesNotMatch(firstJobResolverSource,/discriminationLoad/);
  assert.match(firstJobResolverSource,/applicationChannel/);
  assert.match(firstJobResolverSource,/workAuthorization/);
  const changeResolution=eventFor('undergraduate_change',2);
  for(const [index,intent] of ['major','leave','transfer'].entries()){
    assert.ok(changeResolution.choices[index].requirements.all.some(rule=>rule.path==='education.changeIntent'&&rule.op==='eq'&&rule.value===intent));
  }
  const laterJobOpportunity=decisions.find(event=>event.track==='employment'&&!event.episode);
  assert.ok(laterJobOpportunity.requirements.all.some(rule=>rule.path==='education.nextStage'&&rule.op==='eq'&&rule.value==='career'));
  assert.ok(laterJobOpportunity.requirements.all.some(rule=>rule.path==='employment.status'&&rule.op==='in'&&rule.value.includes('unemployed')));

  const browser=await chromium.launch({headless:true,executablePath:fs.existsSync(CHROME)?CHROME:undefined});
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
    assert.deepEqual([migrated.schemaVersion,migrated.gameVersion,migrated.run],[11,'0.6.1',null]);
    assert.equal(migrated.meta.histories[0].title,'v0.5.11完整人生');
    assert.equal(migrated.meta.settings.haptic,false);
    assert.equal(migrated.meta.stats.runs,11);
    assert.deepEqual(migrated.meta.recentSeeds,['v0511-finished']);
    assert.equal(migrated.meta.seen.events.beat_001,undefined);
    assert.equal(migrated.meta.seen.events.origin_context_2_stable,1);
    await context.close();

    context=await browser.newContext({viewport:{width:360,height:773}});
    page=await context.newPage();
    page.setDefaultTimeout(9000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    await openPlayable(page);

    const bachelorBase={education:{status:'enrolled',level:4,path:'college',enrollmentRegion:'domestic',nextStage:'undergraduate',undergraduateSystem:'domestic',highestCompleted:'secondary',courseworkEvidence:18,campusEvidence:8,practiceEvidence:18,researchEvidence:8},employment:{status:'none',entryCredential:'none',applicationStatus:'none'},activity:{mode:'study'}};
    await preparePhase(page,'undergraduate_domestic',4,bachelorBase);
    let run=await choose(page,0);
    assert.equal(run.education.highestCompleted,'undergraduate');
    assert.equal(run.education.nextStage,'firstJob');
    assert.equal(run.employment.entryCredential,'bachelor');

    const bachelorJob={education:{status:'completed',level:4,path:'college',highestCompleted:'undergraduate',nextStage:'firstJob',courseworkEvidence:24,practiceEvidence:24,researchEvidence:8},employment:{status:'none',entryCredential:'bachelor',applicationRegion:'domestic',applicationStatus:'applying'},activity:{mode:'seeking'}};
    await preparePhase(page,'first_job_application',3,bachelorJob);
    run=await choose(page,0);
    assert.equal(run.employment.applicationStatus,'offered');
    await preparePhase(page,'first_job_application',4,{...bachelorJob,employment:{...bachelorJob.employment,applicationStatus:'offered'}});
    assert.equal(await optionEnabled(page,0),true);
    assert.equal(await optionEnabled(page,1),true);
    assert.equal(await optionEnabled(page,2),false);
    run=await choose(page,1);
    assert.equal(run.employment.firstJobOutcome,'bachelorAligned');
    assert.equal(run.employment.status,'employed');

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

    const postgraduateJob={education:{status:'completed',level:5,path:'postgraduate',highestCompleted:'postgraduate',nextStage:'firstJob',courseworkEvidence:30,practiceEvidence:18,researchEvidence:34},employment:{status:'none',entryCredential:'postgraduate',applicationRegion:'domestic',applicationStatus:'applying'},activity:{mode:'seeking'}};
    await preparePhase(page,'first_job_application',3,postgraduateJob);
    run=await choose(page,0);
    assert.equal(run.employment.applicationStatus,'offered');
    await preparePhase(page,'first_job_application',4,{...postgraduateJob,employment:{...postgraduateJob.employment,applicationStatus:'offered'}});
    assert.equal(await optionEnabled(page,0),false);
    assert.equal(await optionEnabled(page,2),true);
    run=await choose(page,2);
    assert.equal(run.employment.firstJobOutcome,'postgraduateSpecialist');
    assert.equal(run.employment.rank,2);

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
    const noDiscrimination=await choose(page,1);
    await preparePhase(page,'first_job_application',3,{...overseasJob,mobility:{...overseasJob.mobility,discriminationLoad:100}});
    const highDiscrimination=await choose(page,1);
    assert.equal(noDiscrimination.employment.applicationStatus,highDiscrimination.employment.applicationStatus);
    await preparePhase(page,'first_job_application',3,{...overseasJob,mobility:{...overseasJob.mobility,workAuthorization:'restricted'}});
    const restrictedAuthorization=await choose(page,1);
    assert.equal(restrictedAuthorization.employment.applicationStatus,'searching');

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
    assert.match(drawerText,/华人联系26／本地联系22/);

    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,migration:'schema-9-run-cleared-meta-preserved',episodes:episodeIds.length,bachelorOutcome:'bachelorAligned',postgraduateOutcome:'postgraduateSpecialist',leaveAndResume:true,transfer:true,workAuthorizationRestricted:true,continuedJobSearch:true,coNationalAndLocalTies:true,discriminationNotHiringMultiplier:true,graduateFailure:true,fundingGap:true,viewports:['360x773','360x640','320x568'],screenshots:fs.readdirSync(OUT).sort(),errors},null,2));
    await context.close();
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
