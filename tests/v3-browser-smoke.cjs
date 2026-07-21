const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');
const baseUrl=process.argv[2]||'http://127.0.0.1:8765/';
const out=path.resolve(__dirname,'..','test-results','v3.2.1-browser');fs.mkdirSync(out,{recursive:true});
const assert=(value,message)=>{if(!value)throw new Error(message)};

(async()=>{
  const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(`${baseUrl}?debug=1`,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
  const overflow=async()=>page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  const gameState=async()=>JSON.parse(await page.evaluate(()=>window.render_game_to_text()));
  assert(!await overflow(),'390 home overflow');const home=await page.locator('main').innerText();assert(!/中国人生模拟|真正的岔路|无音乐|无广告/.test(home),'removed home copy is still visible');assert(home.includes('离线运行 · 自动存档'),'short home footer missing');
  await page.click('[data-act=new]');await page.click('[data-act=toAttrs]');await page.click('[data-act=randomAttrs]');await page.click('[data-act=confirmAttrs]');
  assert(await page.locator('.choice-sheet.card-sheet').count()===1,'innate card bottom sheet missing');assert(await page.locator('[data-card]').count()===3,'three card options expected');
  await page.reload({waitUntil:'networkidle'});await page.click('[data-act=continue]');assert(await page.locator('.choice-sheet.card-sheet').count()===1,'card sheet did not survive reload');
  await page.locator('[data-card]').first().click();await page.waitForTimeout(250);let state=await gameState();assert(state.version==='3.2.1','wrong runtime version');assert(state.run.visibleTimeline.at(-1).kind==='card','selected card did not collapse into timeline');
  const idleBefore=JSON.stringify(state.run);await page.waitForTimeout(1300);state=await gameState();assert(JSON.stringify(state.run)===idleBefore,'life advanced without a player tap');
  let sawSameAge=false,sawDecision=false,previousAge=null;
  for(let step=0;step<40&&!sawDecision;step++){
    const beforeCount=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot().timeline.length);await page.click('.life-stream');await page.waitForTimeout(230);const after=await gameState();const afterCount=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot().timeline.length);const delta=afterCount-beforeCount;assert(delta<=1,'one tap revealed more than one visible event');
    if(after.run.overlay==='decision'){sawDecision=true;break}const newest=after.run.visibleTimeline.at(-1);if(newest&&previousAge===newest.age)sawSameAge=true;if(delta===1)previousAge=newest.age;
  }
  assert(sawDecision,'no decision bottom sheet appeared');assert(await page.locator('.choice-sheet [data-choice]').count()>=2,'decision choices missing');
  const beforeChoice=await gameState();await page.locator('[data-choice]').first().click();await page.waitForTimeout(250);const afterChoice=await gameState();assert(afterChoice.run.phase==='playing'&&afterChoice.run.overlay===null,'decision sheet did not close');assert(afterChoice.run.visibleTimeline.at(-1).kind==='decision','decision did not collapse into timeline');assert(!await page.locator('.compact-result').count(),'legacy result panel is visible');
  assert(sawSameAge,'no separately revealed same-year event observed');await page.screenshot({path:path.join(out,'390-manual-stream.png'),fullPage:true});
  await page.setViewportSize({width:375,height:812});assert(!await overflow(),'375 stream overflow');await page.evaluate(()=>window.__LIFE_DEBUG__.autoFinishCurrent());await page.waitForSelector('.ending-review');
  const ending=await page.locator('main').innerText();assert(/你活了\s*\d+\s*岁/.test(ending),'ending age missing');const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('life-unloaded-2026-v1')));assert(save.schemaVersion===4&&save.gameVersion==='3.2.1','save version wrong');assert(save.run.decisionCount>=12&&save.run.decisionCount<=18,`decision count ${save.run.decisionCount}`);
  await page.screenshot({path:path.join(out,'375-ending.png'),fullPage:true});assert(errors.length===0,`console errors: ${errors.join(' | ')}`);console.log(JSON.stringify({version:'3.2.1',age:save.run.age,events:save.run.timeline.length,decisions:save.run.decisionCount,errors},null,2));await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
