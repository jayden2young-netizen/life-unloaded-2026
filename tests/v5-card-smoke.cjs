const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'test-results','v0.5.5-cards');
const URL=process.env.LIFE_URL||'http://127.0.0.1:8765/?debug=1';
const prompts=new Map([
  [0,'你带着什么开始这一生？'],
  [18,'成年时，你最先学会了什么？'],
  [35,'这些年，什么成了你的底气？'],
  [55,'走到这里，你留下了哪样本事？']
]);
fs.mkdirSync(OUT,{recursive:true});

let browser;
(async()=>{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:360,height:773},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
  await page.goto(URL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__LIFE_BOOTED__===true);
  await page.locator('[data-act="new"]').click();
  await page.locator('[data-act="birth-next"]').click();
  await page.locator('[data-act="random-attributes"]').click();
  await page.locator('[data-act="attributes-done"]').click();

  for(const age of prompts.keys()){
    if(age!==0)await page.evaluate(value=>window.__LIFE_DEBUG__.patchRun({age:value}),age);
    const options=age===0
      ?await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot().cardOptions)
      :await page.evaluate(value=>window.__LIFE_DEBUG__.forceCardDraw(value),age);
    await page.waitForTimeout(360);
    assert.equal(options.length,3,`age ${age}: card choice count`);
    assert.ok(options.every(card=>card.drawAge===age),`age ${age}: mixed draw-age pool`);
    assert.equal(new Set(options.map(card=>card.displayName)).size,3,`age ${age}: duplicate titles`);
    assert.ok(options.every(card=>!/[·・]\s*(起步|转折|中段|回稳|余生)|你更容易在|保留一个可用选项/.test(`${card.displayName}${card.text}`)),`age ${age}: generated copy leaked`);
    assert.equal((await page.locator('.card-sheet h2').innerText()).trim(),prompts.get(age));
    const geometry=await page.evaluate(()=>({
      scrollWidth:document.documentElement.scrollWidth,
      innerWidth,
      cards:[...document.querySelectorAll('[data-card]')].map(node=>{
        const box=node.getBoundingClientRect();
        return{left:box.left,right:box.right,width:box.width};
      })
    }));
    assert.ok(geometry.scrollWidth<=geometry.innerWidth+1,`age ${age}: horizontal overflow`);
    assert.ok(geometry.cards.every(card=>card.left>=-1&&card.right<=geometry.innerWidth+1&&card.width>0),`age ${age}: card outside viewport`);
    if(age===35)await page.screenshot({path:path.join(OUT,'cards-age-35-360x773.png'),fullPage:true});
    const chosen=options[0];
    await page.locator(`[data-card="${chosen.id}"]`).click();
    const run=await page.evaluate(()=>window.__LIFE_DEBUG__.snapshot());
    assert.ok(run.cards.includes(chosen.id),`age ${age}: selected card not saved`);
    assert.ok(run.cardAges.includes(age),`age ${age}: draw age not saved`);
    assert.match(run.timeline.at(-1).text,new RegExp(chosen.displayName));
  }

  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ages:[...prompts.keys()],screenshots:[path.join(OUT,'cards-age-35-360x773.png')],errors},null,2));
})().finally(async()=>{if(browser)await browser.close()}).catch(error=>{console.error(error);process.exitCode=1});
