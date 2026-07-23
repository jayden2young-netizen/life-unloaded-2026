const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.CAREER_EPISODE_SMOKE_OUT||path.join(ROOT,'test-results','v0.5.6-career-episodes');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const CHROME=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
fs.mkdirSync(OUT,{recursive:true});

async function fit(page,label,selector='.choice-sheet'){
  const result=await page.evaluate(target=>{
    const box=document.querySelector(target)?.getBoundingClientRect();
    return{
      scrollWidth:document.documentElement.scrollWidth,
      innerWidth,
      box,
      buttons:[...document.querySelectorAll(`${target} button`)].map(button=>{const rect=button.getBoundingClientRect();return{text:button.textContent.trim().slice(0,24),left:rect.left,right:rect.right}})
    };
  },selector);
  assert.ok(result.scrollWidth<=result.innerWidth+1,`${label}: horizontal overflow`);
  assert.ok(result.box&&result.box.left>=-1&&result.box.right<=result.innerWidth+1,`${label}: panel outside viewport`);
  for(const button of result.buttons)assert.ok(button.left>=-1&&button.right<=result.innerWidth+1,`${label}: button outside viewport: ${button.text}`);
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

function activeRecord(id,age,phase,deadlineYears,label,route=null){
  return{
    status:'active',
    phase,
    startedAt:age-Math.max(0,phase-1),
    nextPhaseAge:age,
    deadlineAge:age+deadlineYears,
    route,
    boundActors:label?{organization:{kind:'organization',id:`${id}:${age}`,label}}:{},
    commitments:[],
    closureReason:null
  };
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

    const oldSave={schemaVersion:8,gameVersion:'0.5.5',meta:{histories:[{title:'上一版完整人生',age:76}],codex:['codex_01'],settings:{haptic:false},stats:{runs:4},seen:{events:{decision_033:1},cards:{},families:{},endings:{}},recentSeeds:['v055-finished']},run:{schemaVersion:8,gameVersion:'0.5.5',contentRevision:12,phase:'playing',age:34}};
    await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SAVE_KEY,value:oldSave});
    await page.goto(URL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.equal(migrated.schemaVersion,8);
    assert.equal(migrated.gameVersion,'0.5.9');
    assert.equal(migrated.run,null);
    assert.equal(migrated.meta.histories[0].title,'上一版完整人生');
    assert.deepEqual(migrated.meta.codex,['codex_01']);
    assert.equal(migrated.meta.settings.haptic,false);
    assert.equal(migrated.meta.stats.runs,4);
    assert.equal(migrated.meta.seen.events.decision_033,1);
    assert.deepEqual(migrated.meta.recentSeeds,['v055-finished']);

    await context.close();
    context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    page=await context.newPage();
    page.setDefaultTimeout(7000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    await openPlayable(page);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:30,cardAges:[0,18,35,55],education:{status:'completed',level:4},employment:{status:'employed',employerType:'private',career:'受雇岗位'},activity:{mode:'work'},finance:{cash:90000,liabilities:[]},usedEvents:[]}));

    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.forceDecision('decision_017')),'decision_017');
    let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    const phaseAge=run.age,timelineBefore=run.timeline.length,cashBefore=run.finance.cash;
    await page.waitForTimeout(300);
    await fit(page,'public-situation-360x773');
    await page.screenshot({path:path.join(OUT,'01-public-situation-360x773.png'),fullPage:true});

    await page.setViewportSize({width:360,height:640});
    await page.locator('[data-act="episode-next"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,phaseAge);
    assert.equal(run.sceneQueue[0].kind,'choice');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,phaseAge);
    assert.equal(run.sceneQueue[0].kind,'choice');
    assert.equal(run.finance.cash,cashBefore);
    assert.equal(run.timeline.length,timelineBefore);
    await page.waitForTimeout(300);
    await fit(page,'public-choice-refresh-360x640');
    await page.screenshot({path:path.join(OUT,'02-public-choice-refresh-360x640.png'),fullPage:true});

    await page.locator('[data-choice="0"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,phaseAge);
    assert.equal(run.sceneQueue[0].kind,'result');
    await page.setViewportSize({width:320,height:568});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.sceneQueue[0].kind,'result');
    assert.equal(run.timeline.length,timelineBefore);
    await page.waitForTimeout(300);
    await fit(page,'public-result-refresh-320x568');
    await page.screenshot({path:path.join(OUT,'03-public-result-refresh-320x568.png'),fullPage:true});
    await page.locator('[data-act="episode-next"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,phaseAge+1);
    assert.equal(run.timeline.length,timelineBefore+1);
    assert.equal(run.episodes.public_exam.status,'active');
    assert.equal(run.episodes.public_exam.phase,2);
    assert.equal(run.episodes.public_exam.deadlineAge-phaseAge,2);
    assert.equal(run.episodes.public_exam.boundActors.organization.label,'本轮报考单位');

    for(const [width,height]of[[360,773],[360,640],[320,568]]){
      await page.setViewportSize({width,height});
      await page.locator('[data-act="open-drawer"]').click();
      await page.waitForTimeout(300);
      assert.match(await page.locator('.drawer').innerText(),/公务员招录 · 第2阶段/);
      await fit(page,`drawer-${width}x${height}`,'.drawer');
      await page.screenshot({path:path.join(OUT,`drawer-${width}x${height}.png`),fullPage:true});
      await page.locator('button[data-act="close-drawer"]').click();
    }

    run=await forceEpisode(page,'decision_018',0);
    assert.equal(run.episodes.public_exam.status,'resolved');
    assert.equal(run.episodes.public_exam.closureReason,'appointed');
    assert.equal(run.employment.employerType,'public');

    for(const ending of[
      {index:1,route:'retake',status:'resolved',beforeStatus:'employed',beforeEmployer:'private',employment:'employed',employer:'private'},
      {index:2,route:'market_exit',status:'abandoned',beforeStatus:'unemployed',beforeEmployer:'none',employment:'employed',employer:'private'},
      {index:3,route:'withdrawn',status:'abandoned',beforeStatus:'employed',beforeEmployer:'private',employment:'employed',employer:'private'}
    ]){
      const age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
      await page.evaluate(({ageValue,record,beforeStatus,beforeEmployer})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',sceneQueue:[],currentDecision:null,employment:{status:beforeStatus,employerType:beforeEmployer},episodes:{public_exam:record}}),{ageValue:age,record:activeRecord('public_exam',age,2,1,'本轮报考单位','applied'),beforeStatus:ending.beforeStatus,beforeEmployer:ending.beforeEmployer});
      run=await forceEpisode(page,'decision_018',ending.index);
      assert.equal(run.episodes.public_exam.closureReason,ending.route);
      assert.equal(run.episodes.public_exam.status,ending.status);
      assert.equal(run.employment.status,ending.employment);
      assert.equal(run.employment.employerType,ending.employer);
    }
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({employment:{status:'employed',employerType:'private'},activity:{mode:'work'}}));
    run=await forceEpisode(page,'decision_017',2);
    assert.equal(run.episodes.public_exam.status,'abandoned');
    assert.equal(run.episodes.public_exam.closureReason,'withdrawn');
    assert.equal(run.employment.status,'employed');
    assert.equal(run.employment.employerType,'private');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({employment:{status:'employed',employerType:'private',career:'受雇岗位'},activity:{mode:'work'}}));
    const layoffAge=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
    run=await forceEpisode(page,'decision_011',0);
    assert.equal(run.episodes.layoff_reemployment.status,'active');
    assert.equal(run.episodes.layoff_reemployment.phase,2);
    assert.equal(run.episodes.layoff_reemployment.deadlineAge-layoffAge,2);
    assert.equal(run.episodes.layoff_reemployment.boundActors.organization.label,'原用人单位');
    for(const ending of[
      {index:0,route:'same_field',status:'resolved',employment:'employed'},
      {index:1,route:'bridge_job',status:'resolved',employment:'employed'},
      {index:2,route:'retrained',status:'resolved',employment:'employed'},
      {index:3,route:'long_search',status:'abandoned',employment:'unemployed'}
    ]){
      const age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
      await page.evaluate(({ageValue,record})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',sceneQueue:[],currentDecision:null,episodes:{layoff_reemployment:record}}),{ageValue:age,record:activeRecord('layoff_reemployment',age,2,1,'原用人单位','documented_exit')});
      run=await forceEpisode(page,'decision_012',ending.index);
      assert.equal(run.episodes.layoff_reemployment.closureReason,ending.route);
      assert.equal(run.episodes.layoff_reemployment.status,ending.status);
      assert.equal(run.employment.status,ending.employment);
    }
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({employment:{status:'employed',employerType:'private'},activity:{mode:'work'}}));
    run=await forceEpisode(page,'decision_011',1);
    assert.equal(run.episodes.layoff_reemployment.status,'resolved');
    assert.equal(run.episodes.layoff_reemployment.closureReason,'internal_transfer');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({employment:{status:'employed',employerType:'private'},activity:{mode:'work'}}));
    const breakAge=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
    run=await forceEpisode(page,'decision_040',0);
    assert.equal(run.episodes.career_break.status,'active');
    assert.equal(run.episodes.career_break.phase,2);
    assert.equal(run.episodes.career_break.deadlineAge-breakAge,3);
    run=await forceEpisode(page,'decision_041',0);
    assert.equal(run.episodes.career_break.phase,3);
    for(const ending of[
      {index:0,route:'continue',status:'resolved',employment:'none'},
      {index:1,route:'low_intensity',status:'resolved',employment:'gig'},
      {index:2,route:'full_time',status:'resolved',employment:'employed'},
      {index:3,route:'forced_return',status:'abandoned',employment:'employed'}
    ]){
      const age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
      await page.evaluate(({ageValue,record})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',sceneQueue:[],currentDecision:null,episodes:{career_break:record}}),{ageValue:age,record:activeRecord('career_break',age,3,1,null,'on_budget')});
      run=await forceEpisode(page,'decision_042',ending.index);
      assert.equal(run.episodes.career_break.closureReason,ending.route);
      assert.equal(run.episodes.career_break.status,ending.status);
      assert.equal(run.employment.status,ending.employment);
    }

    let age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
    await page.evaluate(({ageValue,publicRecord})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',yearStarted:false,yearQueue:[],sceneQueue:[],currentDecision:null,usedEvents:[],employment:{status:'employed',employerType:'private'},activity:{mode:'work'},episodes:{public_exam:publicRecord,layoff_reemployment:{status:'inactive'},career_break:{status:'inactive'}}}),{ageValue:age,publicRecord:activeRecord('public_exam',age,2,1,'本轮报考单位','applied')});
    const eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
    assert.ok(!eligible.includes('decision_011'),'same career lane started a second episode');
    assert.ok(eligible.includes('decision_040'),'different lifestyle lane was blocked');

    age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
    const publicDeadline=activeRecord('public_exam',age,2,0,'本轮报考单位','applied');
    publicDeadline.deadlineAge=age;
    await page.evaluate(({ageValue,record})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',yearStarted:false,yearQueue:[],sceneQueue:[],currentDecision:null,employment:{status:'unemployed',employerType:'none'},episodes:{public_exam:record,layoff_reemployment:{status:'resolved'},career_break:{status:'resolved'}}}),{ageValue:age,record:publicDeadline});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.match(run.sceneQueue[0].text,/两轮招录周期|材料袋|普通求职/);
    await page.locator('[data-act="episode-next"]').click();
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).episodes.public_exam.closureReason,'deadline');

    age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
    await page.evaluate(({ageValue,record})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',yearStarted:false,yearQueue:[],sceneQueue:[],currentDecision:null,employment:{status:'employed',employerType:'private'},episodes:{public_exam:{status:'resolved'},layoff_reemployment:record,career_break:{status:'resolved'}}}),{ageValue:age,record:activeRecord('layoff_reemployment',age,2,1,'原用人单位','documented_exit')});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.match(run.sceneQueue[0].text,/新.*劳动合同|离职证明|重新落脚/);
    await page.locator('[data-act="episode-next"]').click();
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).episodes.layoff_reemployment.closureReason,'invalidated');

    age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
    const breakDeadline=activeRecord('career_break',age,3,0,null,'on_budget');
    breakDeadline.deadlineAge=age;
    await page.evaluate(({ageValue,record})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',yearStarted:false,yearQueue:[],sceneQueue:[],currentDecision:null,employment:{status:'none',employerType:'none'},activity:{mode:'leisure'},episodes:{public_exam:{status:'resolved'},layoff_reemployment:{status:'resolved'},career_break:record}}),{ageValue:age,record:breakDeadline});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.match(run.sceneQueue[0].text,/预算复盘|备用金|被动返工/);
    await page.locator('[data-act="episode-next"]').click();
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).episodes.career_break.closureReason,'deadline');

    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({
      ok:true,
      migration:'v0.5.5-run-cleared-meta-preserved',
      episodes:{
        public_exam:['appointed','retake','market_exit','withdrawn','deadline'],
        layoff_reemployment:['internal_transfer','same_field','bridge_job','retrained','long_search','invalidated'],
        career_break:['continue','low_intensity','full_time','forced_return','deadline']
      },
      sameAgeAndRefresh:true,
      laneLimit:true,
      viewports:['360x773','360x640','320x568'],
      screenshots:fs.readdirSync(OUT).sort(),
      errors
    },null,2));
    await context.close();
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
