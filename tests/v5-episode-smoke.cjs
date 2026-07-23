const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.EPISODE_SMOKE_OUT||path.join(ROOT,'test-results','v0.5.5-episodes');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const CHROME=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
fs.mkdirSync(OUT,{recursive:true});

async function fit(page,label){
  const result=await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    innerWidth,
    sheet:document.querySelector('.choice-sheet')?.getBoundingClientRect(),
    buttons:[...document.querySelectorAll('.choice-sheet button')].map(button=>{const box=button.getBoundingClientRect();return{text:button.textContent.trim().slice(0,24),left:box.left,right:box.right}})
  }));
  assert.ok(result.scrollWidth<=result.innerWidth+1,`${label}: horizontal overflow`);
  assert.ok(result.sheet&&result.sheet.left>=-1&&result.sheet.right<=result.innerWidth+1,`${label}: sheet outside viewport`);
  for(const button of result.buttons)assert.ok(button.left>=-1&&button.right<=result.innerWidth+1,`${label}: button outside viewport: ${button.text}`);
}

async function fitDrawer(page,label){
  const result=await page.evaluate(()=>{const box=document.querySelector('.drawer')?.getBoundingClientRect();return{scrollWidth:document.documentElement.scrollWidth,innerWidth,box}});
  assert.ok(result.scrollWidth<=result.innerWidth+1,`${label}: horizontal overflow`);
  assert.ok(result.box&&result.box.left>=-1&&result.box.right<=result.innerWidth+1,`${label}: drawer outside viewport`);
}

async function openPlayable(page){
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
  await page.locator('[data-act="new"]').click();
  await page.locator('[data-act="birth-next"]').click();
  await page.locator('[data-act="random-attributes"]').click();
  await page.locator('[data-act="attributes-done"]').click();
  await page.locator('[data-card]').first().click();
}

async function forceEpisode(page,id,index){
  assert.equal(await page.evaluate(value=>window.__LIFE_DEBUG__.forceDecision(value),id),id);
  const start=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(start.sceneQueue[0].kind,'situation');
  await page.locator('[data-act="episode-next"]').click();
  assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age,start.age);
  await page.locator(`[data-choice="${index}"]`).click();
  const result=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(result.age,start.age);
  assert.equal(result.sceneQueue[0].kind,'result');
  await page.locator('[data-act="episode-next"]').click();
  return page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
}

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:fs.existsSync(CHROME)?CHROME:undefined});
  const errors=[];
  try{
    let context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    let page=await context.newPage();
    page.setDefaultTimeout(7000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});

    const oldSave={schemaVersion:7,gameVersion:'0.5.4',meta:{histories:[{title:'上一版完整人生',age:76}],codex:['codex_01'],settings:{haptic:false},stats:{runs:3},seen:{events:{beat_001:2},cards:{},families:{},endings:{}},recentSeeds:['old-finished']},run:{schemaVersion:7,gameVersion:'0.5.4',phase:'playing',age:33}};
    await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SAVE_KEY,value:oldSave});
    await page.goto(URL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.equal(migrated.schemaVersion,8);
    assert.equal(migrated.gameVersion,'0.5.7');
    assert.equal(migrated.run,null);
    assert.equal(migrated.meta.histories[0].title,'上一版完整人生');
    assert.deepEqual(migrated.meta.codex,['codex_01']);
    assert.equal(migrated.meta.settings.haptic,false);
    assert.equal(migrated.meta.stats.runs,3);
    assert.equal(migrated.meta.seen.events.beat_001,2);
    assert.deepEqual(migrated.meta.recentSeeds,['old-finished']);

    await context.close();
    context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    page=await context.newPage();
    page.setDefaultTimeout(7000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    await openPlayable(page);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:30,cardAges:[0,18,35,55],finance:{cash:180000,liabilities:[]},business:{mode:'none',status:'none',equity:0}}));

    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.forceDecision('decision_033')),'decision_033');
    let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    const phaseAge=run.age,timelineBefore=run.timeline.length,cashBefore=run.finance.cash;
    assert.equal(run.sceneQueue[0].kind,'situation');
    await page.waitForTimeout(300);
    await fit(page,'situation-360x773');
    await page.screenshot({path:path.join(OUT,'01-situation-360x773.png'),fullPage:true});

    await page.setViewportSize({width:360,height:640});
    await page.locator('[data-act="episode-next"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,phaseAge);
    assert.equal(run.sceneQueue[0].kind,'choice');
    const savedChoice=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.equal(savedChoice.schemaVersion,8);
    assert.equal(savedChoice.gameVersion,'0.5.7');
    assert.equal(savedChoice.run.sceneQueue[0].kind,'choice');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    const reloadedChoice=await page.evaluate(key=>({stored:JSON.parse(localStorage.getItem(key)),load:window.__LIFE_LOAD_DEBUG__}),SAVE_KEY);
    assert.ok(run,`choice refresh cleared run: ${JSON.stringify({reloadedChoice,errors})}`);
    assert.equal(run.age,phaseAge);
    assert.equal(run.sceneQueue[0].kind,'choice');
    assert.equal(run.finance.cash,cashBefore);
    assert.equal(run.timeline.length,timelineBefore);
    await page.waitForTimeout(300);
    await fit(page,'choice-360x640');
    await page.screenshot({path:path.join(OUT,'02-choice-refresh-360x640.png'),fullPage:true});

    await page.locator('[data-choice="0"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    const resultCash=run.finance.cash;
    assert.equal(run.age,phaseAge);
    assert.equal(run.sceneQueue[0].kind,'result');
    assert.equal(run.timeline.length,timelineBefore);
    await page.setViewportSize({width:320,height:568});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.sceneQueue[0].kind,'result');
    assert.equal(run.finance.cash,resultCash);
    assert.equal(run.timeline.length,timelineBefore);
    await page.waitForTimeout(300);
    await fit(page,'result-320x568');
    await page.screenshot({path:path.join(OUT,'03-result-refresh-320x568.png'),fullPage:true});

    await page.locator('[data-act="episode-next"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,phaseAge+1);
    assert.equal(run.timeline.length,timelineBefore+1);
    assert.equal(run.episodes.shop_opening.status,'active');
    assert.equal(run.episodes.shop_opening.phase,2);
    assert.equal(run.episodes.shop_opening.deadlineAge-phaseAge,5);
    assert.equal(run.episodes.shop_opening.boundActors.organization.label,'本轮考察的门店');
    for(const [width,height]of[[360,773],[360,640],[320,568]]){
      await page.setViewportSize({width,height});
      await page.locator('[data-act="open-drawer"]').click();
      await page.waitForTimeout(300);
      assert.match(await page.locator('.drawer').innerText(),/开店 · 第2阶段/);
      await fitDrawer(page,`drawer-${width}x${height}`);
      await page.screenshot({path:path.join(OUT,`drawer-${width}x${height}.png`),fullPage:true});
      await page.locator('button[data-act="close-drawer"]').click();
    }

    run=await forceEpisode(page,'decision_034',0);
    assert.equal(run.episodes.shop_opening.phase,3);
    const endAge=run.age;
    run=await forceEpisode(page,'decision_035',0);
    assert.equal(run.episodes.shop_opening.status,'resolved');
    assert.equal(run.episodes.shop_opening.closureReason,'survived');
    assert.equal(run.business.status,'operating');
    assert.ok(run.age-endAge===1);

    const endings=[
      {index:1,route:'independent',status:'resolved',business:'operating',mode:'independent'},
      {index:2,route:'stop_loss',status:'abandoned',business:'closed',mode:'none'},
      {index:3,route:'debt_failure',status:'abandoned',business:'closed',mode:'franchise'}
    ];
    for(const ending of endings){
      const age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
      await page.evaluate(({ageValue})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,business:{status:'operating',mode:'franchise',equity:0},episodes:{shop_opening:{status:'active',phase:3,startedAt:ageValue-2,nextPhaseAge:ageValue,deadlineAge:ageValue+3,route:'lean',boundActors:{organization:{kind:'organization',id:`shop_opening:${ageValue-2}`,label:'本轮考察的门店'}},commitments:[],closureReason:null}}}),{ageValue:age});
      run=await forceEpisode(page,'decision_035',ending.index);
      assert.equal(run.episodes.shop_opening.closureReason,ending.route);
      assert.equal(run.episodes.shop_opening.status,ending.status);
      assert.equal(run.business.status,ending.business);
      assert.equal(run.business.mode,ending.mode);
      if(ending.route==='debt_failure')assert.ok(run.finance.liabilities.some(item=>item.kind==='business'&&item.guaranteed));
    }

    let age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
    await page.evaluate(({ageValue})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:false,yearQueue:[],cardAges:[0,18,35,55],business:{status:'operating'},episodes:{shop_opening:{status:'active',phase:3,startedAt:ageValue-5,nextPhaseAge:ageValue,deadlineAge:ageValue,route:'lean',boundActors:{organization:{kind:'organization',id:`shop_opening:${ageValue-5}`,label:'本轮考察的门店'}},commitments:[],closureReason:null}}}),{ageValue:age});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.phase,'episode');
    assert.equal(run.sceneQueue[0].forced,true);
    assert.match(run.sceneQueue[0].text,/五年/);
    await page.locator('[data-act="episode-next"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.episodes.shop_opening.closureReason,'deadline');

    age=run.age;
    await page.evaluate(({ageValue})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:false,yearQueue:[],cardAges:[0,18,35,55],business:{status:'closed'},episodes:{shop_opening:{status:'active',phase:2,startedAt:ageValue-1,nextPhaseAge:ageValue,deadlineAge:ageValue+4,route:'verified',boundActors:{organization:{kind:'organization',id:`shop_opening:${ageValue-1}`,label:'本轮考察的门店'}},commitments:[],closureReason:null}}}),{ageValue:age});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.sceneQueue[0].forced,true);
    assert.match(run.sceneQueue[0].text,/退租|库存|设备/);
    await page.locator('[data-act="episode-next"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.episodes.shop_opening.closureReason,'invalidated');

    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,migration:'schema7-run-cleared-meta-preserved',episode:'shop_opening',endings:['survived','independent','stop_loss','debt_failure','deadline','invalidated'],viewports:['360x773','360x640','320x568'],screenshots:fs.readdirSync(OUT).sort(),errors},null,2));
    await context.close();
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
