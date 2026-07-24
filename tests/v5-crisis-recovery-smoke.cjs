const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.CRISIS_RECOVERY_SMOKE_OUT||path.join(ROOT,'test-results','v0.5.7-crisis-recovery');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const CHROME=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
fs.mkdirSync(OUT,{recursive:true});

async function fit(page,label,selector='.choice-sheet'){
  const result=await page.evaluate(target=>{
    const box=document.querySelector(target)?.getBoundingClientRect();
    return{scrollWidth:document.documentElement.scrollWidth,innerWidth,box,buttons:[...document.querySelectorAll(`${target} button`)].map(button=>{const rect=button.getBoundingClientRect();return{text:button.textContent.trim().slice(0,24),left:rect.left,right:rect.right}})};
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
  const before=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(before.sceneQueue[0].kind,'situation');
  await page.locator('[data-act="episode-next"]').click();
  assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age,before.age);
  await page.locator(`[data-choice="${index}"]`).click();
  const result=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(result.age,before.age);
  assert.equal(result.sceneQueue[0].kind,'result');
  await page.waitForTimeout(190);
  await page.locator('[data-act="episode-next"]').click();
  return page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
}

function activeRecord(id,age,phase,deadlineYears,label=null,route=null){
  return{status:'active',phase,startedAt:age-Math.max(0,phase-1),nextPhaseAge:age,deadlineAge:age+deadlineYears,route,boundActors:label?{organization:{kind:'organization',id:`${id}:${age}`,label}}:{},commitments:[],closureReason:null};
}

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:fs.existsSync(CHROME)?CHROME:undefined});
  const errors=[];
  try{
    let context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    let page=await context.newPage();
    page.setDefaultTimeout(7000);
    const observe=()=>{page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)})};
    observe();

    const oldSave={schemaVersion:8,gameVersion:'0.5.6',meta:{histories:[{title:'上一版完整人生',age:76}],codex:['codex_01'],settings:{haptic:false},stats:{runs:5},seen:{events:{decision_072:1},cards:{},families:{},endings:{}},recentSeeds:['v056-finished']},run:{schemaVersion:8,gameVersion:'0.5.6',contentRevision:13,phase:'playing',age:38}};
    await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SAVE_KEY,value:oldSave});
    await page.goto(URL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.equal(migrated.gameVersion,'0.5.10');
    assert.equal(migrated.run,null);
    assert.equal(migrated.meta.histories[0].title,'上一版完整人生');
    assert.deepEqual(migrated.meta.codex,['codex_01']);
    assert.equal(migrated.meta.settings.haptic,false);
    assert.equal(migrated.meta.stats.runs,5);
    assert.equal(migrated.meta.seen.events.decision_072,1);
    assert.deepEqual(migrated.meta.recentSeeds,['v056-finished']);

    await context.close();
    context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    page=await context.newPage();
    page.setDefaultTimeout(7000);
    observe();
    await openPlayable(page);
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({age:30,cardAges:[0,18,35,55],education:{status:'completed',level:4},finance:{cash:150000,liabilities:[]},health:{status:'well',conditionSeverity:0},habits:{type:'none',stage:'none',risk:0,recoveryYears:0},usedEvents:[]}));

    assert.equal(await page.evaluate(()=>window.__LIFE_DEBUG__.forceDecision('decision_065')),'decision_065');
    let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    const phaseAge=run.age,timelineBefore=run.timeline.length,cashBefore=run.finance.cash;
    await page.waitForTimeout(300);
    await fit(page,'guarantee-situation-360x773');
    await page.screenshot({path:path.join(OUT,'01-guarantee-situation-360x773.png'),fullPage:true});

    await page.setViewportSize({width:360,height:640});
    await page.locator('[data-act="episode-next"]').click();
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,phaseAge);
    assert.equal(run.sceneQueue[0].kind,'choice');
    assert.equal(run.finance.cash,cashBefore);
    assert.equal(run.timeline.length,timelineBefore);
    await page.waitForTimeout(300);
    await fit(page,'guarantee-choice-refresh-360x640');
    await page.screenshot({path:path.join(OUT,'02-guarantee-choice-refresh-360x640.png'),fullPage:true});

    await page.locator('[data-choice="1"]').click();
    await page.setViewportSize({width:320,height:568});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,phaseAge);
    assert.equal(run.sceneQueue[0].kind,'result');
    assert.equal(run.timeline.length,timelineBefore);
    await page.waitForTimeout(300);
    await fit(page,'guarantee-result-refresh-320x568');
    await page.screenshot({path:path.join(OUT,'03-guarantee-result-refresh-320x568.png'),fullPage:true});
    await page.locator('[data-act="episode-next"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,phaseAge+1);
    assert.equal(run.timeline.length,timelineBefore+1);
    assert.equal(run.episodes.guarantee_recourse.phase,2);
    assert.equal(run.episodes.guarantee_recourse.deadlineAge-phaseAge,3);
    assert.equal(run.episodes.guarantee_recourse.boundActors.organization.label,'本轮担保债权人');

    for(const[width,height]of[[360,773],[360,640],[320,568]]){
      await page.setViewportSize({width,height});
      await page.locator('[data-act="open-drawer"]').click();
      await page.waitForTimeout(300);
      assert.match(await page.locator('.drawer').innerText(),/担保追偿 · 第2阶段/);
      await fit(page,`drawer-${width}x${height}`,'.drawer');
      await page.screenshot({path:path.join(OUT,`drawer-${width}x${height}.png`),fullPage:true});
      await page.locator('button[data-act="close-drawer"]').click();
    }

    const guaranteeEndings=['recovered','restructured','relationship_break','default_failure'];
    for(const[index,route]of guaranteeEndings.entries()){
      const age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
      await page.evaluate(({ageValue,record})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',sceneQueue:[],currentDecision:null,finance:{cash:150000,liabilities:[{id:`g-${ageValue}`,kind:'guarantee',principal:80000,balance:80000,rate:.065,guaranteed:true,status:'active'}]},episodes:{guarantee_recourse:record}}),{ageValue:age,record:activeRecord('guarantee_recourse',age,3,1,'本轮担保债权人','verified_claim')});
      run=await forceEpisode(page,'decision_069',index);
      assert.equal(run.episodes.guarantee_recourse.closureReason,route);
      assert.equal(run.episodes.guarantee_recourse.status,index<2?'resolved':'abandoned');
    }

    const acuteEndings=['cured','managed','limited','treatment_exit'];
    for(const[index,route]of acuteEndings.entries()){
      const age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
      await page.evaluate(({ageValue,record})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',sceneQueue:[],currentDecision:null,health:{status:'recovering',conditionSeverity:35,currentCondition:'acute'},episodes:{acute_illness:record}}),{ageValue:age,record:activeRecord('acute_illness',age,4,1,null,'rehabilitated')});
      run=await forceEpisode(page,'decision_075',index);
      assert.equal(run.episodes.acute_illness.closureReason,route);
      assert.equal(run.episodes.acute_illness.status,index===3?'abandoned':'resolved');
    }

    const habitStarts={gambling:80,alcohol:86,gaming:92,shopping:98,medication:104};
    const habitRoutes={formation:['stopped','exposed','dependent','uncontrolled'],treatment:['recovery','continuing','support_exit','uncontrolled'],relapse:['recovery_reset','treatment_return','lapse_only','relapse']};
    const offsets={formation:1,treatment:3,relapse:5};
    const habitSamples=[];
    for(const[typeIndex,[type,start]]of Object.entries(habitStarts).entries())for(const[kindIndex,[kind,routes]]of Object.entries(habitRoutes).entries()){
      const index=(typeIndex+kindIndex)%routes.length,route=routes[index];
      const age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age,stage=kind==='formation'?'repeating':kind==='treatment'?'treatment':'recovery';
      const episodeId=`habit_${type}_${kind}`,decisionId=`decision_${String(start+offsets[kind]).padStart(3,'0')}`;
      await page.evaluate(({ageValue,record,episodeId,type,stage})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',sceneQueue:[],currentDecision:null,habits:{type,stage,risk:20,recoveryYears:stage==='recovery'?2:0},episodes:{[episodeId]:record}}),{ageValue:age,record:activeRecord(episodeId,age,2,1,null,'prepared'),episodeId,type,stage});
      run=await forceEpisode(page,decisionId,index);
      assert.equal(run.episodes[episodeId].closureReason,route);
      assert.equal(run.episodes[episodeId].status,['support_exit','uncontrolled','relapse'].includes(route)?'abandoned':'resolved');
      habitSamples.push(`${episodeId}:${route}`);
    }

    let age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
    await page.evaluate(({ageValue,financeRecord})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',sceneQueue:[],currentDecision:null,health:{status:'monitoring',conditionSeverity:25},habits:{type:'none',stage:'none',risk:0,recoveryYears:0},episodes:{guarantee_recourse:financeRecord,acute_illness:{status:'inactive'}}}),{ageValue:age,financeRecord:activeRecord('guarantee_recourse',age,2,2,'本轮担保债权人','limited_guarantee')});
    let eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
    assert.ok(eligible.includes('decision_072'),'finance episode blocked a different personal lane');
    await page.evaluate(({ageValue,healthRecord})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,episodes:{guarantee_recourse:{status:'resolved'},acute_illness:healthRecord}}),{ageValue:age,healthRecord:activeRecord('acute_illness',age,2,2,null,'confirmed')});
    eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
    assert.ok(!eligible.includes('decision_080'),'active personal episode allowed a second personal episode');

    const guaranteeInvalid=activeRecord('guarantee_recourse',age,3,1,'本轮担保债权人','verified_claim');
    await page.evaluate(({ageValue,record})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',yearStarted:false,yearQueue:[],sceneQueue:[],currentDecision:null,finance:{liabilities:[]},episodes:{guarantee_recourse:record,acute_illness:{status:'resolved'}}}),{ageValue:age,record:guaranteeInvalid});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.match(run.sceneQueue[0].text,/结清|失效|追偿路线/);
    await page.locator('[data-act="episode-next"]').click();
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).episodes.guarantee_recourse.closureReason,'invalidated');

    age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
    const acuteDeadline=activeRecord('acute_illness',age,4,0,null,'assisted');acuteDeadline.deadlineAge=age;
    await page.evaluate(({ageValue,record})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',yearStarted:false,yearQueue:[],sceneQueue:[],currentDecision:null,health:{status:'recovering',conditionSeverity:20},episodes:{guarantee_recourse:{status:'resolved'},acute_illness:record}}),{ageValue:age,record:acuteDeadline});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.match(run.sceneQueue[0].text,/第四年|功能评估|长期管理/);
    await page.locator('[data-act="episode-next"]').click();
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).episodes.acute_illness.closureReason,'deadline');

    age=(await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).age;
    const habitDeadline=activeRecord('habit_gambling_treatment',age,2,0,null,'assessed');habitDeadline.deadlineAge=age;
    await page.evaluate(({ageValue,record})=>window.__LIFE_DEBUG__.patchRun({age:ageValue,phase:'playing',yearStarted:false,yearQueue:[],sceneQueue:[],currentDecision:null,habits:{type:'gambling',stage:'treatment',risk:20,recoveryYears:0},episodes:{acute_illness:{status:'resolved'},habit_gambling_treatment:record}}),{ageValue:age,record:habitDeadline});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.match(run.sceneQueue[0].text,/赌博·治疗|两年|复核/);
    await page.locator('[data-act="episode-next"]').click();
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot())).episodes.habit_gambling_treatment.closureReason,'deadline');

    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,migration:'v0.5.6-run-cleared-meta-preserved',endings:{guarantee:guaranteeEndings,acute:acuteEndings,habitSamples},sameAgeAndRefresh:true,laneLimit:true,forcedClosures:['guarantee-invalidated','acute-deadline','habit-deadline'],viewports:['360x773','360x640','320x568'],screenshots:fs.readdirSync(OUT).sort(),errors},null,2));
    await context.close();
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
