const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.FULL_TRACK_SMOKE_OUT||path.join(os.tmpdir(),'life-unloaded-v0.5.9-full-track');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const CHROME=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data.json'),'utf8'));
const decisions=data.events.filter(event=>event.kind==='decision');
const eventFor=(id,phase)=>decisions.find(event=>event.episode?.id===id&&(phase===undefined||event.episode.phase===phase));
const episodeIds=['secondary_diversion','university_interruption','professional_certification','adult_reeducation','business_expansion','wealth_peak','retirement_transition','parental_inheritance','long_term_care','will_planning'];
const expectedRoutes={
  secondary_diversion:['academic','vocational','employment','invalidated'],
  university_interruption:['resumed','alternate_completed','working_exit','invalidated'],
  professional_certification:['passed','retake','alternative_skill','withdrawn'],
  adult_reeducation:['completed','low_intensity','non_degree','forced_exit'],
  business_expansion:['scaled','downsized','sold','debt_failure'],
  wealth_peak:['controlled','cashed_out','management_exit','invalidated'],
  retirement_transition:['retired','semi_retired','continued','forced'],
  parental_inheritance:['accepted','limited','renounced','disputed'],
  long_term_care:['stable','changed','minimum_support','family_break'],
  will_planning:['documented','partial','deferred','invalidated']
};
fs.mkdirSync(OUT,{recursive:true});

async function openPlayable(page){
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
  await page.locator('[data-act="new"]').click();
  await page.locator('[data-act="birth-next"]').click();
  await page.locator('[data-act="random-attributes"]').click();
  await page.locator('[data-act="attributes-done"]').click();
  await page.locator('[data-card]').first().click();
  await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({cardAges:[0,18,35,55]}));
}

async function fitSheet(page,label){
  await page.waitForTimeout(300);
  const geometry=await page.evaluate(()=>{
    const sheet=document.querySelector('.choice-sheet')?.getBoundingClientRect();
    return{innerWidth,innerHeight,scrollWidth:document.documentElement.scrollWidth,sheet,buttons:[...document.querySelectorAll('.choice-sheet button')].map(item=>item.getBoundingClientRect())};
  });
  assert.ok(geometry.scrollWidth<=geometry.innerWidth+1,`${label}: horizontal overflow`);
  assert.ok(geometry.sheet&&geometry.sheet.left>=-1&&geometry.sheet.right<=geometry.innerWidth+1,`${label}: sheet outside viewport`);
  for(const button of geometry.buttons)assert.ok(button.left>=-1&&button.right<=geometry.innerWidth+1,`${label}: option outside viewport`);
}

async function fitDrawer(page,label){
  const geometry=await page.evaluate(()=>{
    const drawer=document.querySelector('.drawer');
    const rect=drawer?.getBoundingClientRect();
    if(drawer)drawer.scrollTop=drawer.scrollHeight;
    return{innerWidth,innerHeight,scrollWidth:document.documentElement.scrollWidth,rect,text:drawer?.innerText||'',scrollable:drawer?drawer.scrollHeight>=drawer.clientHeight:false};
  });
  assert.ok(geometry.scrollWidth<=geometry.innerWidth+1,`${label}: horizontal overflow`);
  assert.ok(geometry.rect&&geometry.rect.left>=-1&&geometry.rect.right<=geometry.innerWidth+1,`${label}: drawer outside viewport`);
  assert.ok(geometry.rect.top>=-1&&geometry.rect.bottom<=geometry.innerHeight+1,`${label}: drawer outside viewport height`);
  assert.match(geometry.text,/退休·已退休/);
  assert.match(geometry.text,/照护·安排稳定/);
}

async function startChoice(page,event){
  assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),event.id),event.id);
  let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.sceneQueue[0].kind,'situation');
  const age=run.age;
  await page.locator('[data-act="episode-next"]').click();
  run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.age,age);
  assert.equal(run.sceneQueue[0].kind,'choice');
  return age;
}

async function chooseAndFinish(page,event,index){
  const age=await startChoice(page,event);
  await page.locator(`[data-choice="${index}"]`).click();
  let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.age,age);
  assert.equal(run.sceneQueue[0].kind,'result');
  await page.locator('[data-act="episode-next"]').click();
  run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
  assert.equal(run.age,age+1);
  return run;
}

async function prepareFinal(page,id,event){
  const age=Math.max(event.ageMin,Math.min(event.ageMax,60));
  const patch={
    age,
    phase:'playing',
    sceneQueue:[],
    currentDecision:null,
    yearStarted:true,
    education:{status:'completed',level:4,path:'college'},
    employment:{status:'employed',employerType:'private',career:'受雇岗位'},
    activity:{mode:'work'},
    finance:{cash:500000,available:500000},
    business:{status:'operating',mode:'independent',operatingSkill:72,equity:200000000,scale:'national',control:80},
    health:{status:'limited',conditionSeverity:48,disability:'persistent',careNeed:2},
    episodes:{[id]:{status:'active',phase:event.episode.phase,startedAt:Math.max(0,age-event.episode.phase+1),nextPhaseAge:age,deadlineAge:age+1,route:'prepared',boundActors:{},commitments:[],closureReason:null}}
  };
  if(id==='parental_inheritance')patch.people=[{id:'debug_parent',relation:'father',bornAt:age-84,alive:false,status:'deceased',bond:55}];
  await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun(value),patch);
}

(async()=>{
  assert.equal(data.version,'0.5.9');
  assert.equal(data.schemaVersion,8);
  assert.equal(data.contentRevision,16);
  assert.ok(decisions.every(event=>!('arc' in event)));
  for(const id of episodeIds){
    const rows=decisions.filter(event=>event.episode?.id===id).sort((a,b)=>a.episode.phase-b.episode.phase);
    assert.ok(rows.length>=1&&rows.length<=3,`${id}: phase count`);
    assert.ok(rows.every(event=>event.episode.deadlineYears<=4),`${id}: exceeds four years`);
    assert.deepEqual(rows.at(-1).choices.map(choice=>choice.route),expectedRoutes[id],`${id}: endings`);
    assert.ok(data.episodeCatalog[id]?.deadline&&data.episodeCatalog[id]?.invalidated,`${id}: closure copy`);
  }

  const browser=await chromium.launch({headless:true,executablePath:fs.existsSync(CHROME)?CHROME:undefined});
  const errors=[];
  try{
    let context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    let page=await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});

    const oldSave={schemaVersion:8,gameVersion:'0.5.8',meta:{histories:[{title:'v0.5.8完整人生',age:81}],codex:['codex_01'],settings:{haptic:false},stats:{runs:8},seen:{events:{beat_001:3},cards:{},families:{},endings:{}},recentSeeds:['v058-finished']},run:{schemaVersion:8,gameVersion:'0.5.8',contentRevision:15,phase:'playing',age:61,arcs:{later_1:{status:'active'}}}};
    await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SAVE_KEY,value:oldSave});
    await page.goto(URL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    const migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    assert.equal(migrated.gameVersion,'0.5.9');
    assert.equal(migrated.run,null);
    assert.equal(migrated.meta.histories[0].title,'v0.5.8完整人生');
    assert.equal(migrated.meta.settings.haptic,false);
    assert.equal(migrated.meta.stats.runs,8);
    assert.deepEqual(migrated.meta.recentSeeds,['v058-finished']);
    await context.close();

    context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    page=await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    await openPlayable(page);

    const diversion=eventFor('secondary_diversion',1);
    assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),diversion.id),diversion.id);
    let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    const diversionAge=run.age;
    await fitSheet(page,'situation-360x773');
    await page.screenshot({path:path.join(OUT,'01-situation-360x773.png'),fullPage:false});
    await page.locator('[data-act="episode-next"]').click();
    await page.setViewportSize({width:360,height:640});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,diversionAge);
    assert.equal(run.sceneQueue[0].kind,'choice');
    await fitSheet(page,'choice-360x640');
    await page.screenshot({path:path.join(OUT,'02-choice-360x640.png'),fullPage:false});
    await page.locator('[data-choice="0"]').click();
    await page.setViewportSize({width:320,height:568});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.age,diversionAge);
    assert.equal(run.sceneQueue[0].kind,'result');
    await fitSheet(page,'result-320x568');
    await page.screenshot({path:path.join(OUT,'03-result-320x568.png'),fullPage:false});
    await page.locator('[data-act="episode-next"]').click();
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.equal(run.episodes.secondary_diversion.closureReason,'academic');

    const routeResults={secondary_diversion:['academic']};
    await page.setViewportSize({width:360,height:773});
    for(const id of episodeIds){
      const rows=decisions.filter(event=>event.episode?.id===id).sort((a,b)=>a.episode.phase-b.episode.phase);
      const finalEvent=rows.at(-1);
      const startIndex=id==='secondary_diversion'?1:0;
      routeResults[id]??=[];
      for(let index=startIndex;index<finalEvent.choices.length;index++){
        if(finalEvent.episode.role!=='start')await prepareFinal(page,id,finalEvent);
        run=await chooseAndFinish(page,finalEvent,index);
        assert.equal(run.episodes[id].closureReason,finalEvent.choices[index].route,`${id}/${index}: closure route`);
        assert.ok(['resolved','abandoned'].includes(run.episodes[id].status),`${id}/${index}: terminal status`);
        routeResults[id].push(finalEvent.choices[index].route);
      }
    }

    const sameLaneAge=45;
    await page.evaluate(age=>window.__LIFE_DEBUG__.patchRun({age,phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,education:{status:'completed',level:4,path:'college'},employment:{status:'employed'},business:{status:'operating',operatingSkill:70,equity:200000,scale:'regional'},episodes:{university_interruption:{status:'active',phase:2,startedAt:44,nextPhaseAge:45,deadlineAge:46,route:'leave',boundActors:{},commitments:[],closureReason:null}}}),sameLaneAge);
    let eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
    assert.ok(!eligible.includes(eventFor('professional_certification',1).id),'same education lane allowed a second episode');
    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({episodes:{business_expansion:{status:'active',phase:2,startedAt:44,nextPhaseAge:45,deadlineAge:48,route:'validated',boundActors:{organization:{kind:'organization',id:'business_expansion:44',label:'本轮扩张单元'}},commitments:[],closureReason:null}}}));
    eligible=await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'));
    assert.ok(!eligible.includes(eventFor('retirement_transition',1).id),'two active episodes allowed a third start');

    await page.evaluate(()=>window.__LIFE_DEBUG__.patchRun({later:{retirement:'retired',inheritance:'limited',care:'stable',will:'documented'}}));
    const drawerViewports=[[360,773],[360,640],[320,568]];
    for(const[width,height]of drawerViewports){
      await page.setViewportSize({width,height});
      await page.locator('[data-act="open-drawer"]').click();
      await page.waitForTimeout(300);
      await fitDrawer(page,`drawer-${width}x${height}`);
      await page.screenshot({path:path.join(OUT,`drawer-${width}x${height}.png`),fullPage:false});
      await page.locator('.drawer [data-act="close-drawer"]').click();
    }

    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,migration:'v0.5.8-run-cleared-meta-preserved',episodes:episodeIds.length,endings:Object.values(expectedRoutes).reduce((sum,routes)=>sum+routes.length,0),routeResults,sameAgeCards:true,refreshRestored:['choice','result'],laneLimit:true,legacyArcFields:0,laterStateDrawer:true,viewports:['360x773','360x640','320x568'],screenshots:fs.readdirSync(OUT).sort(),errors},null,2));
    await context.close();
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
