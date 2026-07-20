const {chromium}=require('playwright');
const fs=require('node:fs');const path=require('node:path');
const baseUrl=process.argv[2]||'http://127.0.0.1:8765/';
const out=path.resolve(__dirname,'..','test-results','v3.2-browser');fs.mkdirSync(out,{recursive:true});
const assert=(value,message)=>{if(!value)throw new Error(message)};

(async()=>{
  const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(`${baseUrl}?debug=1`,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
  const overflow=async()=>page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  assert(!await overflow(),'390 home overflow');await page.click('[data-act=new]');await page.click('[data-act=toAttrs]');await page.click('[data-act=randomAttrs]');await page.click('[data-act=confirmAttrs]');
  assert(await page.locator('.clear-card').count()===3,'three clear cards expected');const cardText=await page.locator('main').innerText();assert(cardText.includes('《')&&!cardText.includes('含糊'),'card names and effects not visible');
  await page.locator('[data-card]').first().click();await page.waitForSelector('.life-stream');await page.evaluate(()=>window.advanceTime(4800));
  const state=JSON.parse(await page.evaluate(()=>window.render_game_to_text()));assert(state.version==='3.2.0','wrong runtime version');assert(state.run.visibleTimeline.length>0,'timeline did not advance');
  await page.screenshot({path:path.join(out,'390-stream.png'),fullPage:true});await page.setViewportSize({width:375,height:812});assert(!await overflow(),'375 stream overflow');
  await page.evaluate(()=>window.__LIFE_DEBUG__.autoFinishCurrent());await page.waitForSelector('.ending-review');const ending=await page.locator('main').innerText();assert(/你活了\s*\d+\s*岁/.test(ending),'ending age missing');
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('life-unloaded-2026-v1')));assert(save.schemaVersion===4&&save.gameVersion==='3.2.0','save migration version wrong');assert(save.run.decisionCount>=12&&save.run.decisionCount<=18,`decision count ${save.run.decisionCount}`);assert(save.run.timeline.length>=save.run.age,'fewer than one event per year');
  await page.screenshot({path:path.join(out,'375-ending.png'),fullPage:true});assert(errors.length===0,`console errors: ${errors.join(' | ')}`);console.log(JSON.stringify({version:'3.2.0',age:save.run.age,events:save.run.timeline.length,decisions:save.run.decisionCount,errors},null,2));await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
