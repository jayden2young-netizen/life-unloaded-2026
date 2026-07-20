const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const baseUrl=process.argv[2]||'http://127.0.0.1:8765/';
const outputDir=path.resolve(__dirname,'..','test-results','v3.1-browser');
fs.mkdirSync(outputDir,{recursive:true});
function assert(condition,message){if(!condition)throw new Error(message)}

(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage();const errors=[];const failed=[];
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('requestfailed',request=>failed.push(request.url()));
  await page.goto(`${baseUrl}?debug=1`,{waitUntil:'networkidle'});
  await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);

  const noOverflow=async label=>{const size=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert(size.doc<=size.client,`${label}: horizontal overflow`)};
  await noOverflow('390-home');
  await page.click('[data-act=new]');
  const birthText=await page.locator('main').innerText();
  assert(/男性|女性/.test(birthText),'birth gender missing');
  assert(birthText.includes('家庭画像'),'family portrait label missing');
  assert(!/家庭原型|familyClass|本局时代环境|缓慢收缩|AI效率崇拜/.test(birthText),'birth leaks hidden structure');
  await page.click('[data-act=toAttrs]');await page.click('[data-act=randomAttrs]');await page.click('[data-act=confirmAttrs]');

  const cardText=await page.locator('main').innerText();
  assert(await page.locator('.omen-card').count()===3,'card view must show three omens');
  assert(!/触发牌|改写牌|人物牌|条件牌|代价牌|组合牌|unlock|rewrite|combo|《/.test(cardText),'card identity leaked');
  await page.locator('[data-card]').first().click();await page.waitForSelector('.resource-strip');
  const labels=await page.locator('.res span').allInnerTexts();
  assert(JSON.stringify(labels)===JSON.stringify(['现金','健康','精神','关系']),`resource labels ${labels.join(',')}`);
  const gameText=await page.locator('main').innerText();
  assert(!/主线：|人生主线|核心矛盾|当前最强欲望|事件链|家庭版|自我版|城市版|时代版/.test(gameText),'game UI leaks backstage labels');
  assert(await page.locator('.event-icon').count()===1,'event should show one emoji');
  const choice=page.locator('[data-choice]:not([disabled])').first();assert(await choice.count()===1,'no playable choice');await choice.click();
  await page.waitForSelector('.result-card');const resultText=await page.locator('main').innerText();
  assert(!/[＋+]\s*\d|[－-]\s*\d/.test(resultText),'result exposes numeric deltas');
  assert(await page.locator('.delta').count()===0,'result delta chips remain');
  await page.click('[data-act=afterResult]');
  await page.click('[data-act=status]');const drawerText=await page.locator('.drawer').innerText();
  assert(/男性|女性/.test(drawerText),'status gender missing');
  assert(drawerText.includes('现在的生活')&&drawerText.includes('资产负债'),'status public facts missing');
  assert(!/核心矛盾|当前最强欲望|持有卡牌|事件链/.test(drawerText),'status leaks backstage state');
  await page.click('[data-act=closeOverlay]');
  await page.screenshot({path:path.join(outputDir,'iphone-390-game.png'),fullPage:true});

  await page.setViewportSize({width:375,height:812});await noOverflow('375-game');
  const boxes=await page.locator('.resource-strip').boundingBox();assert(boxes&&boxes.x>=0&&boxes.x+boxes.width<=375,'375 resources overlap viewport');
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('life-unloaded-2026-v1')));
  assert(save.gameVersion==='3.1.0'&&save.schemaVersion===3,'save version mismatch');
  for(const key of ['gender','lifeDNA','desires','mainConflicts','chainProgress','endingEvidence','contentRevision'])assert(key in save.run,`save missing ${key}`);

  await page.evaluate(()=>window.__LIFE_DEBUG__.autoFinishCurrent());await page.waitForSelector('.ending-review');
  const endingText=await page.locator('main').innerText();
  assert(/你活了\s*\d+\s*岁/.test(endingText),'lifespan missing');
  assert(endingText.includes('一生最核心的矛盾'),'ending conflict missing');
  assert(endingText.includes('这一生绕不过的几件事'),'ending evidence label missing');
  await noOverflow('375-ending');await page.screenshot({path:path.join(outputDir,'iphone-375-ending.png'),fullPage:true});

  assert(errors.length===0,`console errors: ${errors.join(' | ')}`);
  assert(failed.length===0,`failed requests: ${failed.join(',')}`);
  const summary={version:'3.1.0',coreLives:1,viewports:['390x844','375x812'],labels,birthText:birthText.split('\n').slice(0,8),endingAge:Number((endingText.match(/你活了\s*(\d+)/)||[])[1]),errors,failed};
  fs.writeFileSync(path.join(outputDir,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
