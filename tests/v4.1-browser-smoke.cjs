const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');

const baseUrl=process.argv[2]||'http://127.0.0.1:8765/';
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const eventById=new Map(data.events.map(event=>[event.id,event]));
const out=path.join(root,'test-results','v4.1.0-real-life-storylines');
fs.mkdirSync(out,{recursive:true});
const assert=(value,message)=>{if(!value)throw new Error(message)};

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=[];
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  page.on('pageerror',error=>errors.push(String(error)));
  const gameState=async()=>JSON.parse(await page.evaluate(()=>window.render_game_to_text()));

  await page.goto(`${baseUrl}?debug=1`,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
  await page.click('[data-act=new]');
  await page.click('[data-act=toAttrs]');
  await page.click('[data-act=randomAttrs]');
  await page.click('[data-act=confirmAttrs]');
  await page.locator('[data-card]').first().click();
  await page.waitForTimeout(260);

  const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('life-unloaded-2026-v1')));
  original.schemaVersion=5;original.gameVersion='4.0.1';original.run.schemaVersion=5;original.run.gameVersion='4.0.1';original.run.contentRevision=4;
  delete original.run.familyFinance;delete original.run.mobility;delete original.run.business;delete original.run.storylines;delete original.run.storylineSlots;delete original.run.storylineDecisionCount;delete original.run.employment.arrangement;delete original.run.employment.schedule;
  original.meta.histories=[{title:'迁移保留标记',age:77,score:61,family:'family_01'}];
  await page.addInitScript(save=>{if(!sessionStorage.getItem('v4.1-migration-seeded')){localStorage.setItem('life-unloaded-2026-v1',JSON.stringify(save));sessionStorage.setItem('v4.1-migration-seeded','1')}},original);
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
  let migrated=await page.evaluate(()=>({save:JSON.parse(localStorage.getItem('life-unloaded-2026-v1')),backup:JSON.parse(localStorage.getItem('life-unloaded-2026-v4.0.1-backup'))}));
  assert(migrated.backup.schemaVersion===5,'schema 5 backup missing');assert(migrated.save.schemaVersion===6&&migrated.save.gameVersion==='4.1.0','schema 5 save was not upgraded');assert(migrated.save.run.seed===original.run.seed&&migrated.save.run.phase===original.run.phase,'active life was not preserved');assert(migrated.save.meta.histories[0].title==='迁移保留标记','meta history was not preserved');
  let state=await gameState();assert(state.run.familyFinance&&state.run.mobility&&state.run.business&&state.run.storylines,'new schema 6 objects missing');assert(state.run.employment.arrangement==='onsite','employment arrangement default missing');

  const chosen=[];
  async function chooseStoryline(id,step,index){
    const forced=await page.evaluate(({id,step})=>window.__LIFE_DEBUG__.forceStoryline(id,step),{id,step});
    assert(forced,`${id} step ${step} could not be forced`);state=await gameState();assert(state.run.decision?.storyline?.id===id&&state.run.decision.storyline.step===step,`${id} wrong forced decision`);
    const decisionId=state.run.decision.id,memoryKey=state.run.decision.choices[index].memoryKey,expectedEcho=eventById.get(`echo_${decisionId.slice(-3)}`).choiceOutcomes[memoryKey].text;
    await page.locator('[data-choice]').nth(index).click();await page.waitForTimeout(260);state=await gameState();const schedule=state.run.scheduledEchoes.find(item=>item.memoryKey===memoryKey);assert(schedule,`${decisionId} did not schedule its branch echo`);
    await page.evaluate(age=>window.__LIFE_DEBUG__.forceAge(age),schedule.dueAge);
    let saw=false;for(let turn=0;turn<8&&!saw;turn++){state=await gameState();if(state.run.overlay==='card'){await page.locator('[data-card]').first().click();await page.waitForTimeout(240);continue}if(state.run.overlay==='decision'){await page.locator('[data-choice]').first().click();await page.waitForTimeout(240);continue}await page.click('.life-stream');await page.waitForTimeout(240);state=await gameState();saw=state.run.usedEchoes.includes(schedule.eventId)&&state.run.visibleTimeline.some(item=>item.kind==='echo'&&item.text===expectedEcho)}
    assert(saw,`${decisionId} branch-specific echo did not appear`);chosen.push({id,step,decisionId,memoryKey,echoId:schedule.eventId,echoText:expectedEcho});
  }

  await chooseStoryline('familyMoney',1,3);
  await chooseStoryline('splitShift',1,0);
  await chooseStoryline('remoteNomad',1,0);
  await chooseStoryline('franchise',1,0);
  await chooseStoryline('remoteNomad',4,1);

  await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:40,lastSettledAge:39,employment:{status:'employed',arrangement:'splitShift',schedule:{stability:35,splitGapHours:6,timezoneLoad:0}},business:{status:'testing'},res:{cash:40000}}));
  const splitBaseline=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  const splitSettled=await page.evaluate(()=>window.__LIFE_DEBUG__.settleCurrentYear());
  await page.evaluate(run=>window.__LIFE_DEBUG__.patchRun(run),splitBaseline);
  await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({employment:{arrangement:'onsite',schedule:{stability:35,splitGapHours:0,timezoneLoad:0}}}));
  const onsiteSettled=await page.evaluate(()=>window.__LIFE_DEBUG__.settleCurrentYear());
  assert(splitSettled.res.cash-splitBaseline.res.cash===onsiteSettled.res.cash-splitBaseline.res.cash,'split shift incorrectly adds annual wages');assert(splitSettled.pressures.body>onsiteSettled.pressures.body,'split shift did not add body pressure');

  await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:41,lastSettledAge:40,employment:{status:'selfEmployed',arrangement:'onsite',career:'加盟门店'},business:{mode:'franchise',status:'operating',capitalInvested:60000,brandLockin:30,operatingSkill:74,sunkCost:20},familyFinance:{businessStress:45},res:{cash:50000}}));
  const businessBefore=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());const businessAfter=await page.evaluate(()=>window.__LIFE_DEBUG__.settleCurrentYear());assert(businessAfter.business.sunkCost>businessBefore.business.sunkCost,'operating business did not settle');assert(businessAfter.familyFinance.businessStress!==businessBefore.familyFinance.businessStress,'business result did not affect family finance');

  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);state=await gameState();assert(state.run.business.status==='operating'&&state.run.storylines.remoteNomad.status==='resolved','schema 6 state did not survive refresh');if(state.view==='home'){await page.click('[data-act=continue]');state=await gameState()}
  await page.click('[data-act=status]');const statusText=await page.locator('.spec-list').innerText();assert(statusText.includes('工作安排')&&statusText.includes('连续经历'),'new state lines missing from drawer');await page.screenshot({path:path.join(out,'360x773-status.png'),fullPage:false});await page.click('.drawer [data-act=closeOverlay]');
  await page.screenshot({path:path.join(out,'360x773-timeline.png'),fullPage:false});

  for(const id of['decision_071','decision_076']){await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),id);await page.locator('[data-choice]').first().click();await page.waitForTimeout(240)}

  await page.evaluate(()=>{const run=window.__LIFE_DEBUG__.snapshot(),storylines=run.storylines;for(const id of['familyMoney','splitShift','franchise'])storylines[id]={...storylines[id],status:'abandoned'};window.__LIFE_DEBUG__.patchRun({storylines,storylineSlots:{main:'remoteNomad',secondary:null},deathAge:105,targetDecisions:12})});
  await page.evaluate(()=>window.__LIFE_DEBUG__.autoFinishCurrent());await page.waitForSelector('.ending-review');const finalSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('life-unloaded-2026-v1')));const storylineFragmentTexts=Object.values(data.endingFragments).flat().filter(fragment=>fragment.requirements.storyline).map(fragment=>fragment.text);assert(storylineFragmentTexts.some(text=>finalSave.run.ending.review.includes(text)),'ending did not cite a concrete storyline fact');assert(finalSave.run.storylineDecisionCount<=6,'storyline choice cap exceeded');assert(finalSave.run.decisionCount>=12&&finalSave.run.decisionCount<=15,`life decision target changed: ${finalSave.run.decisionCount}/${finalSave.run.targetDecisions}`);await page.screenshot({path:path.join(out,'360x773-ending.png'),fullPage:true});
  assert(errors.length===0,`console errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({version:'4.1.0',migration:{backup:5,current:6,runPreserved:true},storylines:chosen,settlement:{splitBody:splitSettled.pressures.body,onsiteBody:onsiteSettled.pressures.body,businessCash:businessAfter.res.cash},ending:{age:finalSave.run.age,profile:finalSave.run.ending.profileId,decisions:finalSave.run.decisionCount,review:finalSave.run.ending.review},codexUnlocked:finalSave.meta.codex.length,errors,screenshots:out},null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
