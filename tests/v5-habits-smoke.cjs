const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.HABITS_SMOKE_OUT||path.join(ROOT,'test-results','v0.5.5-habits');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const CHROME=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
fs.mkdirSync(OUT,{recursive:true});

async function openPlayable(page){
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
  await page.locator('[data-act="new"]').click();
  await page.locator('[data-act="birth-next"]').click();
  await page.locator('[data-act="random-attributes"]').click();
  await page.locator('[data-act="attributes-done"]').click();
  await page.locator('[data-card]').first().click();
}

async function forceChoice(page,id,index){
  assert.equal(await page.evaluate(value=>window.__LIFE_DEBUG__.forceDecision(value),id),id);
  await page.locator(`[data-choice="${index}"]`).click();
  await page.waitForTimeout(240);
  return page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
}

async function assertDrawer(page,label,filename){
  await page.locator('[data-act="open-drawer"]').click();
  await page.waitForTimeout(180);
  const text=await page.locator('.drawer').innerText();
  assert.match(text,/成瘾与戒断/);
  assert.match(text,new RegExp(label));
  const habitTerm=page.locator('.spec dt',{hasText:'成瘾与戒断'});
  await habitTerm.evaluate(node=>node.parentElement.scrollIntoView({block:'center'}));
  const geometry=await page.evaluate(()=>{
    const drawer=document.querySelector('.drawer'),box=drawer.getBoundingClientRect(),habit=[...document.querySelectorAll('.spec')].find(node=>node.querySelector('dt')?.textContent.includes('成瘾与戒断'))?.getBoundingClientRect();
    return{scrollWidth:document.documentElement.scrollWidth,innerWidth,innerHeight,top:box.top,bottom:box.bottom,clientHeight:drawer.clientHeight,scrollHeight:drawer.scrollHeight,habitTop:habit?.top,habitBottom:habit?.bottom};
  });
  assert.ok(geometry.scrollWidth<=geometry.innerWidth+1,`${filename}: horizontal overflow`);
  assert.ok(geometry.top>=-1&&geometry.bottom<=geometry.innerHeight+1,`${filename}: drawer exceeds viewport`);
  assert.ok(geometry.clientHeight<=geometry.innerHeight+1,`${filename}: drawer cannot fit or scroll`);
  assert.ok(geometry.habitTop>=0&&geometry.habitBottom<=geometry.innerHeight,`${filename}: addiction field cannot be scrolled into view`);
  await page.screenshot({path:path.join(OUT,filename),fullPage:false});
}

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:CHROME});
  const errors=[];
  const makePage=async viewport=>{
    const context=await browser.newContext({viewport,deviceScaleFactor:1});
    const page=await context.newPage();
    page.setDefaultTimeout(7000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))errors.push(`http ${response.status()}: ${response.url()}`)});
    return{context,page};
  };
  try{
    let session=await makePage({width:360,height:773});
    let {context,page}=session;
    await openPlayable(page);
    const startAge=18;
    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.forceDecision('decision_080')),'decision_080');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({}));
    const prompt=await page.locator('.choice-sheet h2').innerText();
    const ageBeforeRefresh=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).currentDecision.id,'decision_080');
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age,ageBeforeRefresh);
    assert.equal(await page.locator('.choice-sheet h2').innerText(),prompt);
    assert.equal(await page.locator('[data-choice]').count(),3);
    await page.locator('[data-choice="2"]').click();
    await page.waitForTimeout(240);
    let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.deepEqual({type:run.habits.type,stage:run.habits.stage},{type:'gambling',stage:'repeating'});
    await assertDrawer(page,'赌博·反复下注','gambling-repeating-360x773.png');
    await page.locator('button[data-act="close-drawer"]').click();
    run=await forceChoice(page,'decision_081',2);
    assert.equal(run.habits.stage,'uncontrolled');
    await assertDrawer(page,'赌博·追损失控','gambling-uncontrolled-360x773.png');
    await page.locator('button[data-act="close-drawer"]').click();
    run=await forceChoice(page,'decision_082',0);
    assert.equal(run.habits.stage,'recovery');
    assert.equal(run.arcs.habits_gambling.status,'resolved');
    assert.ok(run.age-startAge<=5,'gambling arc exceeds five years');
    await assertDrawer(page,'赌博·恢复(?:中|1年)','gambling-recovery-360x773.png');
    await context.close();

    for(const fixture of[
      {viewport:{width:360,height:640},habits:{type:'alcohol',stage:'treatment',risk:35,recoveryYears:0},label:'酒精·治疗中',file:'alcohol-treatment-360x640.png'},
      {viewport:{width:320,height:568},habits:{type:'gaming',stage:'recovery',risk:18,recoveryYears:2},label:'游戏·恢复2年',file:'gaming-recovery-320x568.png'}
    ]){
      session=await makePage(fixture.viewport);
      context=session.context;page=session.page;
      await openPlayable(page);
      await page.evaluate(habits=>window.__LIFE_DEBUG__.patchRun({habits}),fixture.habits);
      await assertDrawer(page,fixture.label,fixture.file);
      await context.close();
    }

    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,refreshDecision:'decision_080',resolvedArc:'habits_gambling',viewports:['360x773','360x640','320x568'],screenshots:fs.readdirSync(OUT).sort(),errors},null,2));
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
