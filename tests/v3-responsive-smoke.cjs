require('./v4.1-responsive-smoke.cjs');/* legacy v4.0.1 responsive path retained below for release archaeology
const fs=require('node:fs');
const path=require('node:path');

const baseUrl=process.argv[2]||'http://127.0.0.1:8765/';
const out=path.resolve(__dirname,'..','test-results','v4.0.1-responsive-ui');
const viewports=[
  {name:'s26',width:360,height:773},
  {name:'short-browser',width:360,height:640},
  {name:'small-phone',width:320,height:568}
];
const assert=(value,message)=>{if(!value)throw new Error(message)};
fs.mkdirSync(out,{recursive:true});

async function assertVisibleInViewport(page,locator,label){
  const box=await locator.boundingBox();
  const viewport=page.viewportSize();
  assert(box,`${label}: no layout box`);
  assert(box.x>=-1&&box.x+box.width<=viewport.width+1,`${label}: outside viewport horizontally`);
  assert(box.y>=-1&&box.y+box.height<=viewport.height+1,`${label}: outside viewport vertically`);
  const hit=await page.evaluate(({x,y})=>{
    const node=document.elementFromPoint(x,y);
    return Boolean(node&&node.closest('button,[role="button"]'));
  },{x:box.x+box.width/2,y:box.y+box.height/2});
  assert(hit,`${label}: center point is covered`);
}

async function assertReachable(page,locator,label){
  await locator.scrollIntoViewIfNeeded();
  await assertVisibleInViewport(page,locator,label);
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  const reports=[];
  for(const viewport of viewports){
    const context=await browser.newContext({viewport,deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const page=await context.newPage();
    const errors=[];
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
    page.on('pageerror',error=>errors.push(String(error)));
    await page.goto(`${baseUrl}?debug=1`,{waitUntil:'networkidle'});
    await page.evaluate(()=>localStorage.clear());
    await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),`${viewport.name}: horizontal overflow`);

    await assertReachable(page,page.locator('[data-act=new]'),`${viewport.name}: start`);
    await page.click('[data-act=new]');
    await assertReachable(page,page.locator('[data-act=toAttrs]'),`${viewport.name}: birth continue`);
    await page.click('[data-act=toAttrs]');
    await assertReachable(page,page.locator('[data-act=randomAttrs]'),`${viewport.name}: random attributes`);
    await page.click('[data-act=randomAttrs]');
    await assertReachable(page,page.locator('[data-act=confirmAttrs]'),`${viewport.name}: confirm birth`);
    await page.click('[data-act=confirmAttrs]');

    const cards=page.locator('[data-card]');
    assert(await cards.count()===3,`${viewport.name}: card choices missing`);
    await assertVisibleInViewport(page,cards.last(),`${viewport.name}: last card initially visible`);
    await cards.last().click();

    let sawDecision=false;
    for(let step=0;step<50;step++){
      const state=JSON.parse(await page.evaluate(()=>window.render_game_to_text()));
      if(state.run?.overlay==='decision'){sawDecision=true;break}
      await assertReachable(page,page.locator('.life-stream'),`${viewport.name}: timeline advance`);
      await page.click('.life-stream');
      await page.waitForTimeout(30);
    }
    assert(sawDecision,`${viewport.name}: no decision reached`);
    const choices=page.locator('[data-choice]');
    assert(await choices.count()>=2,`${viewport.name}: decision choices missing`);
    await assertVisibleInViewport(page,choices.last(),`${viewport.name}: last decision choice initially visible`);
    await page.screenshot({path:path.join(out,`${viewport.name}.png`),fullPage:false});
    reports.push({viewport,errors});
    assert(errors.length===0,`${viewport.name}: console errors: ${errors.join(' | ')}`);
    await context.close();
  }
  await browser.close();
  console.log(JSON.stringify(reports,null,2));
})().catch(error=>{console.error(error);process.exit(1)});*/
