const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'test-results','v0.5.1-employment-language');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const CHROME=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
fs.mkdirSync(OUT,{recursive:true});

(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:CHROME});
  const context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error'&&!/Failed to load resource.*404/.test(message.text()))errors.push(`console: ${message.text()}`)});
  page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))errors.push(`http ${response.status()}: ${response.url()}`)});
  try{
    await page.goto(URL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
    assert.match(await page.locator('.hero-sub').innerText(),/你出生在什么家/);
    await page.locator('[data-act="new"]').click();
    assert.equal(await page.locator('.topbar .title').innerText(),'你出生了');
    assert.match(await page.locator('.card.hero').innerText(),/家里有房有债，但都不是刚出生的你的/);
    await page.locator('[data-act="birth-next"]').click();
    assert.equal(await page.locator('.topbar .title').innerText(),'你天生更靠什么');
    await page.locator('[data-act="random-attributes"]').click();
    await page.locator('[data-act="attributes-done"]').click();
    await page.locator('[data-card]').first().click();

    const forced=await page.evaluate(()=>window.__LIFE_DEBUG__.forceDecision('decision_009'));
    assert.equal(forced,'decision_009');
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.choice-sheet h2').innerText(),'HR发来录用通知：试用期少两千，转正时间只写了“视表现而定”。');
    assert.deepEqual(await page.locator('[data-choice]').allInnerTexts(),['先进去再说','让HR写进邮件','不去了，继续投']);
    await page.screenshot({path:path.join(OUT,'employment-decision-360x773.png'),fullPage:true});

    await page.locator('[data-choice="1"]').click();
    await page.waitForTimeout(250);
    let run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.match(run.timeline.at(-1).text,/HR补了一封邮件/);
    const schedule=run.scheduledConsequences.find(item=>item.sourceDecisionId==='decision_009');
    assert.ok(schedule,'employment consequence was not scheduled');
    run.scheduledConsequences=run.scheduledConsequences.map(item=>item.id===schedule.id?{...item,dueAge:run.age,expiresAge:run.age+5}:item);
    await page.evaluate(patch=>window.__LIFE_DEBUG__.patchRun(patch),{scheduledConsequences:run.scheduledConsequences,cardAges:[0,18]});
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    await page.evaluate(()=>window.__LIFE_DEBUG__.advance());
    await page.waitForTimeout(250);
    run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.match(run.timeline.at(-1).text,/多拿回了两个月工资/);
    assert.equal(run.timeline.at(-1).kind,'consequence');
    await page.screenshot({path:path.join(OUT,'employment-consequence-360x773.png'),fullPage:true});

    await page.locator('[data-act="open-drawer"]').click();
    const drawer=await page.locator('.drawer').innerText();
    for(const label of['现在在干嘛','手里净资产','习惯与依赖','还有几件事没完'])assert.match(drawer,new RegExp(label));
    const geometry=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth}));
    assert.ok(geometry.scrollWidth<=geometry.innerWidth+1,'horizontal overflow');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,decision:'decision_009',choice:'decision_009_choice_2',consequence:schedule.eventId,screenshots:fs.readdirSync(OUT).sort(),errors},null,2));
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
