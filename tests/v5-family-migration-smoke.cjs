const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.FAMILY_MIGRATION_SMOKE_OUT||path.join(ROOT,'test-results','v0.5.8-family-migration');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const CHROME=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data.json'),'utf8'));
const decisions=data.events.filter(event=>event.kind==='decision');
const eventFor=(episodeId,phase=1)=>decisions.find(event=>event.episode?.id===episodeId&&event.episode.phase===phase);
const migratedIds=['relationship_start','marriage_crisis','divorce','reconciliation','late_companionship','becoming_parent','adoption_process','school_entry','adolescence_boundary','adult_child_boundary','first_remote_contract','platform_dependence','overseas_visa','establish_base'];
fs.mkdirSync(OUT,{recursive:true});

async function fit(page,label){
  const result=await page.evaluate(()=>{
    const sheet=document.querySelector('.choice-sheet')?.getBoundingClientRect();
    return{scrollWidth:document.documentElement.scrollWidth,innerWidth,sheet,buttons:[...document.querySelectorAll('.choice-sheet button')].map(button=>button.getBoundingClientRect())};
  });
  assert.ok(result.scrollWidth<=result.innerWidth+1,`${label}: horizontal overflow`);
  assert.ok(result.sheet&&result.sheet.left>=-1&&result.sheet.right<=result.innerWidth+1,`${label}: sheet outside viewport`);
  for(const button of result.buttons)assert.ok(button.left>=-1&&button.right<=result.innerWidth+1,`${label}: button outside viewport`);
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

async function enterChoice(page,id){
  assert.equal(await page.evaluate(value=>window.__LIFE_DEBUG__.forceDecision(value),id),id);
  const start=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(start.sceneQueue[0].kind,'situation');
  await page.locator('[data-act="episode-next"]').click();
  const choice=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(choice.age,start.age);
  assert.equal(choice.sceneQueue[0].kind,'choice');
  return start;
}

async function chooseAndFinish(page,index){
  const before=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  await page.locator(`[data-choice="${index}"]`).click();
  const result=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(result.age,before.age);
  assert.equal(result.sceneQueue[0].kind,'result');
  await page.locator('[data-act="episode-next"]').click();
  const finished=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(finished.age,before.age+1);
  return finished;
}

(async()=>{
  assert.equal(data.version,'0.5.8');
  assert.equal(data.schemaVersion,8);
  assert.equal(data.contentRevision,15);
  assert.ok(migratedIds.every(id=>eventFor(id)&&data.episodeCatalog[id]?.deadline&&data.episodeCatalog[id]?.invalidated));
  assert.ok(['remote','partnership','children'].every(track=>!decisions.some(event=>event.track===track&&event.arc)));
  for(const id of migratedIds){
    const rows=decisions.filter(event=>event.episode?.id===id).sort((a,b)=>a.episode.phase-b.episode.phase);
    assert.ok(rows.length>=1&&rows.length<=3,`${id}: invalid phase count`);
    assert.ok(rows.every(row=>row.episode.deadlineYears<=3),`${id}: deadline exceeds three years`);
    assert.equal(rows.at(-1).choices.length,4,`${id}: final phase lacks four outcomes`);
  }

  const browser=await chromium.launch({headless:true,executablePath:fs.existsSync(CHROME)?CHROME:undefined});
  const errors=[];
  try{
    let context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    let page=await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});

    const oldSave={schemaVersion:8,gameVersion:'0.5.7',meta:{histories:[{title:'上一版完整人生',age:78}],codex:['codex_01'],settings:{haptic:false},stats:{runs:6},seen:{events:{beat_001:2},cards:{},families:{},endings:{}},recentSeeds:['v057-finished']},run:{schemaVersion:8,gameVersion:'0.5.7',contentRevision:14,phase:'playing',age:42}};
    await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SAVE_KEY,value:oldSave});
    await page.goto(URL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.equal(migrated.gameVersion,'0.5.8');
    assert.equal(migrated.run,null);
    assert.equal(migrated.meta.histories[0].title,'上一版完整人生');
    assert.equal(migrated.meta.settings.haptic,false);
    assert.equal(migrated.meta.stats.runs,6);
    assert.deepEqual(migrated.meta.recentSeeds,['v057-finished']);

    await context.close();
    context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    page=await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    await openPlayable(page);

    const relationshipStart=eventFor('relationship_start',1);
    const phaseAge=(await enterChoice(page,relationshipStart.id)).age;
    await page.setViewportSize({width:360,height:640});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,phaseAge);
    assert.equal(run.sceneQueue[0].kind,'choice');
    await page.waitForTimeout(900);
    await fit(page,'relationship-choice-360x640');
    await page.screenshot({path:path.join(OUT,'01-relationship-choice-360x640.png'),fullPage:true});

    await page.locator('[data-choice="0"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    const activeId=run.relationships.activePartnerId;
    assert.ok(activeId);
    assert.equal(run.age,phaseAge);
    assert.equal(run.sceneQueue[0].kind,'result');
    await page.setViewportSize({width:320,height:568});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.relationships.activePartnerId,activeId);
    assert.equal(run.sceneQueue[0].kind,'result');
    await page.waitForTimeout(900);
    await fit(page,'relationship-result-320x568');
    await page.screenshot({path:path.join(OUT,'02-relationship-result-320x568.png'),fullPage:true});
    await page.locator('[data-act="episode-next"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.episodes.relationship_start.phase,2);
    assert.equal(run.episodes.relationship_start.boundActors.partner.id,activeId);

    await page.setViewportSize({width:360,height:773});
    await enterChoice(page,eventFor('relationship_start',2).id);
    run=await chooseAndFinish(page,0);
    assert.equal(run.episodes.relationship_start.status,'resolved');
    assert.equal(run.relationships.partnerStatus,'married');
    assert.equal(run.relationships.activePartnerId,activeId);

    await enterChoice(page,eventFor('school_entry').id);
    run=await chooseAndFinish(page,0);
    assert.equal(run.episodes.school_entry.status,'resolved');
    assert.equal(run.episodes.school_entry.closureReason,'enrolled');
    assert.ok(run.people.some(person=>['child','adoptedChild','stepChild'].includes(person.relation)&&run.age-person.bornAt>=5&&run.age-person.bornAt<=8));

    await enterChoice(page,eventFor('first_remote_contract').id);
    run=await chooseAndFinish(page,0);
    assert.equal(run.episodes.first_remote_contract.status,'resolved');
    assert.equal(run.episodes.first_remote_contract.closureReason,'accepted');
    assert.equal(run.employment.arrangement,'remote');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,episodes:{relationship_start:{status:'active',phase:2,startedAt:30,nextPhaseAge:31,deadlineAge:32,route:'committed',boundActors:{partner:{kind:'person',id:'partner_1'}},commitments:[],closureReason:null},school_entry:{status:'active',phase:1,startedAt:31,nextPhaseAge:31,deadlineAge:32,route:null,boundActors:{child:{kind:'person',id:'child_1'}},commitments:[],closureReason:null}}}));
    const eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
    assert.ok(!eligible.includes(eventFor('first_remote_contract').id),'two active episodes allowed a third episode to start');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,episodes:{platform_dependence:{status:'active',phase:2,startedAt:30,nextPhaseAge:31,deadlineAge:33,route:'buffered',boundActors:{organization:{kind:'organization',id:'platform_dependence:30',label:'本轮接单平台'}},commitments:[],closureReason:null}}}));
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.forceEpisodeClosure('platform_dependence','invalidated')),true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.match(run.sceneQueue[0].text,/停权|关闭地区|平台/);

    await page.setViewportSize({width:360,height:773});
    await page.waitForTimeout(900);
    await page.screenshot({path:path.join(OUT,'03-platform-invalidated-360x773.png'),fullPage:true});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,migration:'v0.5.7-run-cleared-meta-preserved',episodes:migratedIds.length,legacyArcsRemoved:['remote','partnership','children'],sameAgeAndRefresh:true,activePartnerBinding:true,ageBoundSchoolEntry:true,singlePhaseResolution:true,laneLimit:true,forcedClosure:'platform-invalidated',viewports:['360x773','360x640','320x568'],screenshots:fs.readdirSync(OUT).sort(),errors},null,2));
    await context.close();
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
