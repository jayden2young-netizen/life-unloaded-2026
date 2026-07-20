const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const baseUrl=process.argv[2]||'http://127.0.0.1:8765/';
const outputDir=path.resolve(__dirname,'..','test-results','v3-browser');
fs.mkdirSync(outputDir,{recursive:true});

function assert(condition,message){if(!condition)throw new Error(message)}

(async()=>{
  const browser=await chromium.launch({headless:true});
  const viewports=[{width:390,height:844,name:'iphone-390'},{width:375,height:812,name:'iphone-375'}];
  const summaries=[];
  for(const viewport of viewports){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const page=await context.newPage();const errors=[];const failed=[];
    page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});page.on('pageerror',error=>errors.push(String(error)));page.on('requestfailed',request=>failed.push(request.url()));
    await page.goto(`${baseUrl}?debug=1`,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const homeOverflow=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert(homeOverflow.doc<=homeOverflow.client,`${viewport.name}: home horizontal overflow`);
    await page.click('[data-act=new]');assert(await page.locator('.birth-place').isVisible(),`${viewport.name}: birth missing`);const birthText=await page.locator('.birth-place').innerText();assert(/男性|女性/.test(birthText),`${viewport.name}: gender not displayed`);
    await page.click('[data-act=toAttrs]');await page.click('[data-act=randomAttrs]');await page.click('[data-act=confirmAttrs]');await page.locator('[data-card]').first().click();await page.waitForSelector('.resource-strip');
    const labels=await page.locator('.res span').allInnerTexts();assert(JSON.stringify(labels)===JSON.stringify(['现金','健康','精神','关系']),`${viewport.name}: resource labels ${labels.join(',')}`);assert(!/[💰❤️🧠🤝]/u.test(labels.join('')),`${viewport.name}: emoji still in resources`);
    const gameOverflow=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert(gameOverflow.doc<=gameOverflow.client,`${viewport.name}: game horizontal overflow`);
    const available=page.locator('[data-choice]:not([disabled])');assert(await available.count()>0,`${viewport.name}: all choices locked`);await available.first().click();await page.waitForSelector('.result-card');await page.click('[data-act=afterResult]');
    await page.click('[data-act=status]');const drawerText=await page.locator('.drawer').innerText();assert(/男性|女性/.test(drawerText),`${viewport.name}: status gender missing`);assert(drawerText.includes('核心矛盾'),`${viewport.name}: conflicts missing`);await page.click('[data-act=closeOverlay]');
    const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('life-unloaded-2026-v1')));assert(save.schemaVersion===3,`${viewport.name}: save schema`);for(const key of ['gender','lifeDNA','desires','mainConflicts','chainProgress','endingEvidence'])assert(key in save.run,`${viewport.name}: save missing ${key}`);assert(save.meta.seenContent,`${viewport.name}: seenContent missing`);
    const simulations=await page.evaluate(()=>window.__LIFE_DEBUG__.simulateLives(5));assert(simulations.runs.length===5,`${viewport.name}: simulation count`);
    for(const [index,run] of simulations.runs.entries()){assert(run.ending,`simulation ${index+1}: no ending`);assert(run.guard<220,`simulation ${index+1}: guard exhausted`);assert(run.lockedChoices===0,`simulation ${index+1}: locked choices`);assert(!run.ageBackwards,`simulation ${index+1}: age backwards`);assert(!run.nan,`simulation ${index+1}: NaN`);assert(!run.cashOverflow,`simulation ${index+1}: cash overflow`);assert(run.duplicates===0,`simulation ${index+1}: duplicate event`);assert(run.endingFacts>=3,`simulation ${index+1}: fewer than 3 ending facts`);assert(run.completedChains>=2,`simulation ${index+1}: fewer than 2 completed chains`)}
    await page.evaluate(()=>window.__LIFE_DEBUG__.autoFinishCurrent());await page.waitForSelector('.ending-review');const endingText=await page.locator('main').innerText();assert(/你活了\s*\d+\s*岁/.test(endingText),`${viewport.name}: lifespan missing`);assert(endingText.includes('系统引用的真实经历'),`${viewport.name}: ending evidence missing`);
    await page.screenshot({path:path.join(outputDir,`${viewport.name}-ending.png`),fullPage:true});
    summaries.push({viewport,labels,birthText,simulations,errors,failed});assert(errors.length===0,`${viewport.name}: console errors ${errors.join(' | ')}`);assert(failed.length===0,`${viewport.name}: failed requests ${failed.join(',')}`);await context.close();
  }

  const failureContext=await browser.newContext({viewport:{width:390,height:844}});const failurePage=await failureContext.newPage();await failurePage.route('**/data.json*',route=>route.fulfill({status:404,contentType:'application/json',body:'{}'}));await failurePage.goto(`${baseUrl}?failure=1`,{waitUntil:'networkidle'});const failureText=await failurePage.locator('body').innerText();assert(failureText.includes('人生数据库没有加载成功'),'data failure page missing');assert(failureText.includes('重新加载'),'data failure retry missing');await failureContext.close();
  fs.writeFileSync(path.join(outputDir,'summary.json'),JSON.stringify(summaries,null,2));console.log(JSON.stringify(summaries.map(x=>({viewport:x.viewport,overlap:x.simulations.averagePairwiseEventOverlap,runs:x.simulations.runs})),null,2));await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
