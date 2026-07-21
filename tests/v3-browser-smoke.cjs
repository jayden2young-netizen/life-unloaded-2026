const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');
const baseUrl=process.argv[2]||'http://127.0.0.1:8765/';
const out=path.resolve(__dirname,'..','test-results','v4.0.0-causal-life');fs.mkdirSync(out,{recursive:true});
const assert=(value,message)=>{if(!value)throw new Error(message)};

(async()=>{
  const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(`${baseUrl}?debug=1`,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
  const gameState=async()=>JSON.parse(await page.evaluate(()=>window.render_game_to_text()));

  await page.addInitScript(save=>{if(!sessionStorage.getItem('v4-migration-seeded')){localStorage.setItem('life-unloaded-2026-v1',save);sessionStorage.setItem('v4-migration-seeded','1')}},JSON.stringify({schemaVersion:4,gameVersion:'3.2.4',meta:{histories:[{title:'旧人生',age:70,score:50,family:'old'}],codex:[],settings:{haptic:false}},run:{schemaVersion:4,phase:'playing',age:30}}));
  await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
  const migrated=await page.evaluate(()=>({save:JSON.parse(localStorage.getItem('life-unloaded-2026-v1')),backup:localStorage.getItem('life-unloaded-2026-v3.2-backup')}));
  assert(migrated.backup,'v3.2 backup missing');assert((await gameState()).run===null,'old active run was not cleared');assert(migrated.save.schemaVersion===4,'migration mutated old save before player started');

  await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
  await page.click('[data-act=new]');await page.click('[data-act=toAttrs]');await page.click('[data-act=randomAttrs]');await page.click('[data-act=confirmAttrs]');
  assert(await page.locator('[data-card]').count()===3,'innate cards missing');await page.locator('[data-card]').first().click();await page.waitForTimeout(250);
  await page.click('[data-act=status]');assert(await page.locator('.desire-list span').count()===3,'top desires missing');assert(await page.locator('.pressure-grid span').count()===5,'pressure bands missing');await page.screenshot({path:path.join(out,'390-status.png'),fullPage:false});await page.click('.drawer [data-act=closeOverlay]');

  let sawDecision=false;
  for(let step=0;step<50&&!sawDecision;step++){const state=await gameState();if(state.run.overlay==='decision'){sawDecision=true;break}if(state.run.overlay==='card'){await page.locator('[data-card]').first().click();await page.waitForTimeout(230);continue}await page.click('.life-stream');await page.waitForTimeout(230)}
  assert(sawDecision,'no decision reached');
  await page.evaluate(()=>window.__LIFE_DEBUG__.forceDecision('decision_022'));
  assert((await gameState()).run.decision.id==='decision_022','deterministic major decision was not opened');
  await page.locator('[data-choice]').first().click();await page.waitForTimeout(250);
  let state=await gameState();assert(state.run.scheduledEchoes.length===1,'choice did not schedule an echo');const scheduledEcho=state.run.scheduledEchoes[0],dueAge=scheduledEcho.dueAge;
  await page.evaluate(age=>window.__LIFE_DEBUG__.forceAge(age),dueAge);
  let sawEcho=false;
  for(let step=0;step<16&&!sawEcho;step++){state=await gameState();if(state.run.overlay==='card'){await page.locator('[data-card]').first().click();await page.waitForTimeout(230);continue}if(state.run.overlay==='decision'){await page.locator('[data-choice]').first().click();await page.waitForTimeout(230);continue}await page.click('.life-stream');await page.waitForTimeout(230);state=await gameState();sawEcho=(await page.evaluate(id=>window.__LIFE_DEBUG__.snapshot().usedEchoes.includes(id),scheduledEcho.eventId))&&state.run.visibleTimeline.some(x=>x.kind==='echo')}
  assert(sawEcho,'scheduled echo did not fire before expiry');

  const baseline=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  const secretAge=baseline.birth.family.secret.age;await page.evaluate(({age,deathAge})=>{window.__LIFE_DEBUG__.patchRun({deathAge:Math.max(deathAge,age+2)});window.__LIFE_DEBUG__.forceAge(age)},{age:secretAge,deathAge:baseline.deathAge});
  let secretVerified=false;for(let step=0;step<16&&!secretVerified;step++){state=await gameState();if(state.run.overlay==='card'){await page.locator('[data-card]').first().click();await page.waitForTimeout(230);continue}if(state.run.overlay==='decision'){await page.locator('[data-choice]').first().click();await page.waitForTimeout(230);continue}await page.click('.life-stream');await page.waitForTimeout(230);secretVerified=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot().secretRevealed))}
  assert(secretVerified,'family secret did not reveal at its configured age');await page.evaluate(run=>window.__LIFE_DEBUG__.patchRun(run),baseline);
  for(const status of['gig','selfEmployed','unemployed','retired','careLeave']){await page.evaluate(status=>window.__LIFE_DEBUG__.patchRun({age:30,employment:{status},yearStarted:false,yearQueue:[]}),status);const ids=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));assert(!ids.includes('decision_052'),`${status} can receive employed-only layoff decision`)}
  await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:30,relationships:{partner:{status:'none',bond:0,sinceAge:null},children:[]},yearStarted:false,yearQueue:[]}));
  let eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));assert(!eligible.includes('decision_054'),'childless run can receive child decision');assert(!eligible.includes('decision_053'),'single run can receive partner debt decision');
  await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({relationships:{partner:{status:'partnered',bond:70,sinceAge:24},children:[{bornAt:25,bond:60}]}}));eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));assert(!eligible.includes('decision_054'),'five-year-old child can receive school-age event');
  await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({relationships:{children:[{bornAt:24,bond:60}]}}));eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));assert(eligible.includes('decision_054'),'six-year-old child cannot receive school-age event');

  await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:33,employment:{status:'unemployed',unemployedYears:2},res:{cash:0,debt:100000,health:25},pressures:{money:70,career:70,body:70},crisisYears:{employment:2,money:2,health:2},lastSettledAge:32,yearStarted:false,yearQueue:[]}));
  const beforeCascade=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());const afterCascade=await page.evaluate(()=>window.__LIFE_DEBUG__.settleCurrentYear());assert(afterCascade.res.debt>beforeCascade.res.debt,'debt interest did not compound');assert(afterCascade.res.health<beforeCascade.res.health,'body pressure did not reduce health');
  for(const type of['employment','money','health'])assert((await page.evaluate(type=>window.__LIFE_DEBUG__.crisisCandidateIds(type),type)).length>0,`${type} crisis has no paid recovery route`);
  const endingA=await page.evaluate(()=>window.__LIFE_DEBUG__.previewEndingProfile({boundary:1,refuse:1})),endingB=await page.evaluate(()=>window.__LIFE_DEBUG__.previewEndingProfile({care:1,family:1}));assert(endingA==='autonomy'&&endingB==='family_care'&&endingA!==endingB,'specific outcome combinations do not change ending trajectory');
  await page.evaluate(run=>window.__LIFE_DEBUG__.patchRun(run),baseline);

  await page.click('[data-act=status]');await page.screenshot({path:path.join(out,'390-gameplay.png'),fullPage:false});await page.click('.drawer [data-act=closeOverlay]');
  await page.evaluate(()=>window.__LIFE_DEBUG__.autoFinishCurrent());await page.waitForSelector('.ending-review');
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('life-unloaded-2026-v1')));assert(save.schemaVersion===5&&save.gameVersion==='4.0.0','save version wrong');assert(save.run.ending?.id&&save.run.ending?.profileId,'combination ending missing');assert(save.run.echoCount>=1,'echo count missing');assert(save.meta.codex.length>=1,'codex did not unlock');assert(save.run.decisionCount>=10&&save.run.decisionCount<=15,`forced-age path decision count ${save.run.decisionCount}`);
  await page.screenshot({path:path.join(out,'390-ending.png'),fullPage:true});assert(errors.length===0,`console errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({version:'4.0.0',age:save.run.age,events:save.run.timeline.length,decisions:save.run.decisionCount,echoes:save.run.echoCount,secretVerified,ending:save.run.ending.profileId,codexUnlocked:save.meta.codex.length,errors},null,2));await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
