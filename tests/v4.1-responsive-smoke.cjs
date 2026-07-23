const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');

const baseUrl=process.argv[2]||'http://127.0.0.1:8765/';
const out=path.resolve(__dirname,'..','test-results','v0.4.1-responsive-ui');
const viewports=[{name:'s26',width:360,height:773},{name:'short-browser',width:360,height:640},{name:'small-phone',width:320,height:568}];
const assert=(value,message)=>{if(!value)throw new Error(message)};
fs.mkdirSync(out,{recursive:true});

async function reachable(page,locator,label){await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox(),viewport=page.viewportSize();assert(box,`${label}: no box`);assert(box.x>=-1&&box.x+box.width<=viewport.width+1,`${label}: horizontal overflow`);assert(box.y>=-1&&box.y+box.height<=viewport.height+1,`${label}: vertical overflow`);const hit=await page.evaluate(({x,y})=>Boolean(document.elementFromPoint(x,y)?.closest('button,[role="button"]')),{x:box.x+box.width/2,y:box.y+box.height/2});assert(hit,`${label}: covered`)}

(async()=>{
  const browser=await chromium.launch({headless:true});const reports=[];
  for(const viewport of viewports){
    const context=await browser.newContext({viewport,deviceScaleFactor:3,isMobile:true,hasTouch:true});const page=await context.newPage(),errors=[];page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});page.on('pageerror',error=>errors.push(String(error)));
    await page.goto(`${baseUrl}?debug=1`,{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),`${viewport.name}: document overflow`);
    await reachable(page,page.locator('[data-act=new]'),`${viewport.name}: start`);await page.click('[data-act=new]');await page.click('[data-act=toAttrs]');await page.click('[data-act=randomAttrs]');await page.click('[data-act=confirmAttrs]');await reachable(page,page.locator('[data-card]').last(),`${viewport.name}: card`);await page.locator('[data-card]').first().click();await page.waitForTimeout(240);
    await reachable(page,page.locator('.life-stream'),`${viewport.name}: timeline`);await page.screenshot({path:path.join(out,`${viewport.name}-timeline.png`),fullPage:false});
    await page.click('[data-act=status]');await reachable(page,page.locator('.drawer [data-act=closeOverlay]'),`${viewport.name}: status close`);assert((await page.locator('.spec-list').innerText()).includes('工作安排'),`${viewport.name}: status state missing`);await page.screenshot({path:path.join(out,`${viewport.name}-status.png`),fullPage:false});await page.click('.drawer [data-act=closeOverlay]');
    await page.evaluate(()=>window.__LIFE_DEBUG__.forceStoryline('familyMoney',1));const choices=page.locator('[data-choice]');assert(await choices.count()===4,`${viewport.name}: four branch choices missing`);await reachable(page,choices.last(),`${viewport.name}: last choice`);await page.screenshot({path:path.join(out,`${viewport.name}-choice.png`),fullPage:false});await choices.last().click();await page.waitForTimeout(240);
    await page.evaluate(()=>window.__LIFE_DEBUG__.autoFinishCurrent());await page.waitForSelector('.ending-review');assert(!await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),`${viewport.name}: ending overflow`);await page.screenshot({path:path.join(out,`${viewport.name}-ending.png`),fullPage:true});assert(errors.length===0,`${viewport.name}: ${errors.join(' | ')}`);reports.push({viewport,errors,screenshots:['timeline','status','choice','ending']});await context.close();
  }
  await browser.close();console.log(JSON.stringify({version:'0.4.1',reports,output:out},null,2));
})().catch(error=>{console.error(error);process.exit(1)});
