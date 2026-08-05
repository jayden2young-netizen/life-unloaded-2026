const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const OUT=process.env.DEBT_SMOKE_OUT||path.join(os.tmpdir(),'life-unloaded-v0.6.6-debt');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const SAVE_KEY='life-unloaded-2026-v1';
const CHROME=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data.json'),'utf8'));
const decisions=data.events.filter(event=>event.kind==='decision');
const phase=(id,number)=>decisions.find(event=>event.episode?.id===id&&event.episode.phase===number);
const gateEvent=gate=>decisions.find(event=>event.choices.some(choice=>choice.debtGate===gate));
const cardFor=mechanic=>data.cards.find(card=>card.mechanic===mechanic);
const profile=id=>data.employmentCatalog.profiles.find(item=>item.id===id);
const tierIndex={T0:0,T1:1,T2:2,T3:3,T4:4};
fs.mkdirSync(OUT,{recursive:true});

const snapshot=page=>page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
const textState=page=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const liability=(kind='consumer',extra={})=>({
  id:`${kind}_debt`,kind,sourceId:kind,principal:80000,rate:.08,status:'delinquent',arrears:3,
  enforcementEligible:kind!=='living',housingSecured:kind==='mortgage',startedAt:27,...extra,
});
const resetFinance={
  debtStage:'current',enforcementStatus:'none',enforcementDebtId:null,dishonestStatus:'clear',
  restrictedConsumption:false,seizedAssets:[],housingDisposition:'none',repaymentAgreement:null,
  repaymentAgreementFulfilled:false,reliefPending:false,
};

async function patchPlaying(page,patch={}){
  return page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({phase:'playing',sceneQueue:[],currentDecision:null,yearStarted:true,...value}),patch);
}
async function openEpisodeChoice(page,event,patch={}){
  await patchPlaying(page,patch);
  assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),event.id),event.id);
  let run=await snapshot(page);
  assert.equal(run.sceneQueue[0].kind,'situation');
  await page.locator('[data-act="episode-next"]').click();
  await page.waitForTimeout(220);
  run=await snapshot(page);
  assert.equal(run.sceneQueue[0].kind,'choice');
  return textState(page);
}
async function openDecisionChoice(page,event,patch={}){
  await patchPlaying(page,patch);
  assert.equal(await page.evaluate(id=>window.__LIFE_DEBUG__.forceDecision(id),event.id),event.id);
  if(event.episode){
    await page.locator('[data-act="episode-next"]').click();
    await page.waitForTimeout(220);
  }
  return textState(page);
}
async function choose(page,index){
  await page.locator(`[data-choice="${index}"]:not([disabled])`).click();
  await page.waitForTimeout(220);
  return snapshot(page);
}
async function fit(page,label){
  const result=await page.evaluate(()=>({
    width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    boxes:[...document.querySelectorAll('.choice-sheet,.choice-sheet button')].map(node=>node.getBoundingClientRect()),
  }));
  assert.ok(result.scrollWidth<=result.width+1,`${label}: horizontal overflow`);
  for(const box of result.boxes)assert.ok(box.left>=-1&&box.right<=result.width+1,`${label}: choice outside viewport`);
}

(async()=>{
  assert.deepEqual([data.version,data.schemaVersion,data.contentRevision],['0.6.6',11,24]);
  assert.deepEqual(decisions.filter(event=>event.episode?.id==='debt_enforcement').map(event=>event.id),['decision_186','decision_187','decision_188']);
  assert.deepEqual(Object.fromEntries(Object.entries(data.debtSourceCatalog).map(([id,spec])=>[id,spec.enforcementEligible])),{
    mortgage:true,consumer:true,business:true,guarantee:true,habit:true,living:false,
  });
  assert.equal(JSON.stringify(data.debtSourceCatalog).includes('@author/'),false);
  for(const gate of ['homePurchase','highCostEducation','businessFinance','midHighJob','familyExpansion','newCredit'])assert.ok(gateEvent(gate),`missing ${gate} gate`);
  assert.ok(phase('debt_enforcement',2).requirements.all.some(rule=>rule.path==='finance.enforcementStatus'&&rule.op==='in'),'enforcement needs an explicit notice premise');

  const browser=await chromium.launch({headless:true,...(fs.existsSync(CHROME)?{executablePath:CHROME}:{})});
  try{
    const errors=[];
    const context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
    page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
    await page.goto(URL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    await page.locator('[data-act="new"]').click();
    await page.locator('[data-act="birth-next"]').click();
    await page.locator('[data-act="random-attributes"]').click();
    await page.locator('[data-act="attributes-done"]').click();
    await page.locator('[data-card]').first().click();

    const currentSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
    currentSave.gameVersion='0.6.5';
    currentSave.run.gameVersion='0.6.5';
    for(const key of Object.keys(resetFinance))delete currentSave.run.finance[key];
    await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SAVE_KEY,value:currentSave});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    let run=await snapshot(page);
    assert.ok(run,'v0.6.5 Schema 11 run is retained');
    assert.equal(run.gameVersion,'0.6.6');
    assert.equal(run.finance.debtStage,'current');
    assert.equal(run.finance.restrictedConsumption,false);

    await patchPlaying(page,{age:32,finance:{...resetFinance,cash:100000,liabilities:[]},housing:{status:'renting',value:0}});
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes('decision_186'),false,'no debt has no overdue entry');
    await patchPlaying(page,{finance:{...resetFinance,liabilities:[liability('living')]}});
    run=await snapshot(page);
    assert.equal(run.finance.debtStage,'current');
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes('decision_186'),false,'living shortfall is not an enforcement source');
    await patchPlaying(page,{finance:{...resetFinance,liabilities:[liability('unconfigured',{enforcementEligible:undefined})]}});
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes('decision_186'),false,'unconfigured debt source is not inferred as enforceable');
    await patchPlaying(page,{age:32,activity:{mode:'work'},finance:{...resetFinance,cash:0,liabilities:[liability('consumer',{principal:1000,status:'current',arrears:0})]}});
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.settleYear());
    assert.equal(run.finance.liabilities.find(item=>item.id==='consumer_debt').status,'delinquent');
    assert.equal(run.finance.debtStage,'overdue','the first missed payment enters overdue');
    await patchPlaying(page,{finance:{...resetFinance,cash:100000,liabilities:[liability('consumer')]}});
    run=await snapshot(page);
    assert.equal(run.finance.debtStage,'overdue');
    assert.equal(run.finance.dishonestStatus,'clear');
    assert.equal(run.finance.restrictedConsumption,false);
    assert.equal((await page.evaluate(()=>window.__LIFE_DEBUG__.eligibleIds('decision'))).includes('decision_186'),true);

    await openEpisodeChoice(page,phase('debt_enforcement',1),{age:32,finance:{...resetFinance,cash:500000,liabilities:[liability('consumer')]}});
    run=await choose(page,0);
    assert.equal(run.finance.debtStage,'current');
    assert.equal(run.finance.dishonestStatus,'clear');
    assert.equal(run.finance.repaymentAgreement.type,'preEnforcement');
    await page.locator('[data-act="episode-next"]').click();
    await page.waitForTimeout(220);
    run=await snapshot(page);
    assert.equal(run.episodes.debt_enforcement.status,'resolved','agreement closes the enforcement route before execution');

    await openEpisodeChoice(page,phase('debt_enforcement',1),{age:32,finance:{...resetFinance,cash:500000,liabilities:[liability('consumer')]}});
    run=await choose(page,2);
    assert.equal(run.finance.debtStage,'overdue');
    await page.locator('[data-act="episode-next"]').click();
    await page.waitForTimeout(220);
    await openEpisodeChoice(page,phase('debt_enforcement',2),{finance:{cash:500000}});
    run=await choose(page,2);
    assert.equal(run.finance.debtStage,'enforcement');
    assert.equal(run.finance.dishonestStatus,'listed');
    assert.equal(run.finance.restrictedConsumption,true);
    assert.ok(run.finance.seizedAssets.includes('account'));

    const restricted={finance:{cash:500000,debtStage:'enforcement',enforcementStatus:'active',enforcementDebtId:'consumer_debt',dishonestStatus:'listed',restrictedConsumption:true,liabilities:[liability('consumer')]}};
    for(const [gate,index] of [['homePurchase',1],['businessFinance',2],['familyExpansion',0],['newCredit',1]]){
      const state=await openDecisionChoice(page,gateEvent(gate),restricted);
      const choice=state.run.decision.choices.find(item=>item.index===index);
      assert.equal(choice.enabled,false,`${gate} is restricted`);
      assert.match(choice.reason,/执行未结|限制仍在/);
      assert.ok(state.run.decision.choices.some(item=>item.enabled),`${gate} panel keeps an outlet`);
    }
    const familyCard=cardFor('cashBuffer');
    await openDecisionChoice(page,gateEvent('familyExpansion'),{...restricted,cards:[familyCard.id],cardAges:[0]});
    assert.match(await page.locator('[data-choice="0"] small').innerText(),/暂不可选：执行未结/,'disabled reason remains visible when a card matches');
    let state=await openDecisionChoice(page,gateEvent('highCostEducation'),{
      ...restricted,originHousehold:{assets:400000,debt:0,context:{educationBudget:90}},
      education:{overseasOffer:true,overseasOfferType:'direct',extraApplicationYearUsed:true},
      development:{routeExposure:['overseas'],languagePreparation:40,routeKnowledge:40},
    });
    assert.equal(state.run.decision.choices.find(item=>item.index===1).enabled,false);
    state=await openDecisionChoice(page,gateEvent('midHighJob'),{
      ...restricted,employment:{status:'employed',profileId:'software_engineer',tier:'T2'},activity:{mode:'work'},
    });
    assert.equal(state.run.decision.choices.find(item=>item.index===0).enabled,false);
    assert.ok(state.run.decision.choices.slice(1).some(item=>item.enabled),'ordinary work alternatives remain');

    const firstJob=phase('first_job_application',3);
    await openEpisodeChoice(page,firstJob,{
      ...restricted,age:25,
      education:{status:'completed',level:5,path:'postgraduate',highestCompleted:'postgraduate',credentials:['medical_practice','legal_practice','university_teaching'],courseworkEvidence:80,practiceEvidence:80,researchEvidence:80},
      employment:{status:'none',entryCredential:'postgraduate',applicationRegion:'domestic',applicationChannel:'openRecruitment',firstJobEntryPath:'openRecruitment',applicationStatus:'applying',pendingOfferId:'none'},
      capabilities:{employability:80},activity:{mode:'seeking'},
    });
    run=await choose(page,0);
    if(run.employment.pendingOfferId!=='none')assert.ok(tierIndex[profile(run.employment.pendingOfferId).tier]<=2,'restricted first job cannot offer T3/T4');

    state=await openEpisodeChoice(page,phase('debt_enforcement',3),restricted);
    assert.equal(state.run.decision.choices.find(item=>item.index===0).enabled,false);
    assert.match(state.run.decision.choices.find(item=>item.index===0).reason,/没有可处置/);
    assert.equal(state.run.decision.choices.find(item=>item.index===2).enabled,true,'minimum living route remains');
    for(const viewport of[{width:360,height:773},{width:360,height:640},{width:320,height:568}]){
      await page.setViewportSize(viewport);await page.waitForTimeout(120);await fit(page,`${viewport.width}x${viewport.height}`);
    }
    await page.screenshot({path:path.join(OUT,'no-housing-minimum-outlet-320x568.png'),fullPage:false});
    run=await choose(page,3);
    await page.locator('[data-act="episode-next"]').click();
    await page.waitForTimeout(220);
    run=await snapshot(page);
    assert.notEqual(run.phase,'ended');
    assert.equal(run.housing.status,'renting');
    assert.notEqual(run.finance.housingDisposition,'disposed');

    await page.setViewportSize({width:360,height:773});
    await openEpisodeChoice(page,phase('debt_enforcement',3),{
      ...restricted,housing:{status:'owned',value:150000},finance:{...restricted.finance,liabilities:[liability('consumer',{principal:40000}),liability('consumer',{id:'other_debt',principal:50000,rate:.2,status:'current',arrears:0})]},
    });
    const ownedBefore=await snapshot(page);
    run=await choose(page,0);
    assert.equal(run.housing.status,'renting');
    assert.equal(run.housing.value,0);
    assert.equal(run.finance.housingDisposition,'disposed');
    assert.match(run.sceneQueue[0].text,/房本/);
    assert.equal(run.finance.liabilities.find(item=>item.id==='consumer_debt').status,'settled','sale pays the bound execution debt');
    assert.equal(run.finance.liabilities.find(item=>item.id==='other_debt').principal,50000,'unrelated higher-rate debt does not steal execution proceeds');
    assert.equal(run.finance.netWorth,ownedBefore.finance.netWorth,'sale proceeds preserve net worth before annual costs');

    await openEpisodeChoice(page,phase('debt_enforcement',3),{
      ...restricted,housing:{status:'mortgaged',value:200000},finance:{...restricted.finance,enforcementDebtId:'mortgage_debt',liabilities:[liability('mortgage',{principal:120000})]},
    });
    run=await choose(page,0);
    assert.equal(run.housing.status,'renting');
    assert.equal(run.finance.housingDisposition,'disposed');
    assert.match(run.sceneQueue[0].text,/按揭/);

    await patchPlaying(page,{housing:{status:'mortgaged',value:0},finance:{...resetFinance,liabilities:[liability('mortgage',{principal:0,status:'settled',arrears:0})]}});
    run=await snapshot(page);
    assert.equal(run.housing.status,'owned');
    assert.equal(run.housing.value,260000,'old mortgaged saves retain a concrete home value after payoff');

    await patchPlaying(page,{
      yearStarted:false,
      housing:{status:'renting',value:0},
      finance:{...resetFinance,debtStage:'consequence',enforcementStatus:'consequence',enforcementDebtId:'consumer_debt',dishonestStatus:'listed',restrictedConsumption:true,seizedAssets:['account','housing'],housingDisposition:'disposed',repaymentAgreement:{type:'incomeDeduction',debtId:'consumer_debt',status:'active'},liabilities:[liability('consumer',{principal:0,status:'settled',arrears:0}),liability('living',{id:'living_gap',principal:5000,status:'current',arrears:0})]},
    });
    run=await snapshot(page);
    assert.equal(run.finance.reliefPending,true);
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    run=await snapshot(page);
    assert.equal(run.sceneQueue[0].debtRelief,true);
    assert.match(run.sceneQueue[0].text,/限制状态显示解除/);
    await page.locator('[data-act="episode-next"]').click();
    await page.waitForTimeout(220);
    run=await snapshot(page);
    assert.equal(run.finance.debtStage,'current');
    assert.equal(run.finance.enforcementStatus,'resolved');
    assert.equal(run.finance.dishonestStatus,'clear');
    assert.equal(run.finance.restrictedConsumption,false);
    assert.equal(run.finance.repaymentAgreement.status,'fulfilled');
    assert.equal(run.housing.status,'renting');
    assert.equal(run.finance.housingDisposition,'disposed','relief never restores the old house');
    assert.equal(run.finance.liabilities.find(item=>item.id==='living_gap').principal,5000,'unrelated living shortfall remains without blocking relief');
    assert.equal(JSON.stringify(run).includes('@author/'),false,'author keys never enter player state');

    assert.deepEqual(errors,[]);
    await context.close();
    console.log(JSON.stringify({ok:true,entry:'real delinquent debt only',housing:['renting','owned','mortgaged'],outlets:['work','minimum living','repayment','refusal'],relief:'administrative node then restrictions clear',screenshot:path.join(OUT,'no-housing-minimum-outlet-320x568.png')},null,2));
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
