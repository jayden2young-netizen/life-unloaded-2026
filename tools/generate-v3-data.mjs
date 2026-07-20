import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const stages = {
  infancy: [0, 6], childhood: [7, 12], adolescence: [13, 18], youth: [19, 25],
  adult: [26, 35], midlife: [36, 50], preRetire: [51, 65], elder: [66, 105]
};

const worldTags = [
  ['slow','缓慢收缩','收入增长放慢，稳定岗位的排队长度继续增长。',{career:-1,public:2,stability:1}],
  ['ai','AI效率崇拜','组织先学会展示AI，再学习如何承担它造成的新工作量。',{ai:3,career:-1,workload:2}],
  ['countyLive','县域直播年','仓库、果园和县城门店都被要求拥有一个直播间。',{county:3,content:2}],
  ['house','房产复苏幻觉','报价变化很勤快，成交仍保持克制。',{house:3,cashflow:-1}],
  ['public','稳定岗位迁徙','不确定性上升后，编制再次成为高溢价商品。',{public:3,competition:2}],
  ['emotion','情绪消费繁荣','实物消费降级，孤独仍愿意按月续费。',{content:2,loneliness:1}],
  ['weather','极端天气常态化','天气预报逐渐像一份风险披露书。',{health:-1,risk:2}],
  ['care','照护经济上升','老人更多，孩子更贵，中间的人更忙。',{care:3,cost:1}],
  ['factory','制造业升级','机器更聪明了，招聘条件也更精确了。',{factory:3,ai:1}],
  ['content','人人都是媒体','表达门槛下降，注意力门槛继续上升。',{content:3,peace:-1}],
  ['health','健康资产化','健康从习惯变成了持续付费服务。',{health:1,cost:1}],
  ['side','副业全民化','一份工作难以提供安全感，两份工作难以提供睡眠。',{side:3,peace:-1}],
  ['credential','认证膨胀','岗位没有增加，证明自己适合岗位的材料增加了。',{education:2,career:-1}],
  ['platform','平台劳动扩张','更多人拥有自由接单的资格，也拥有随时掉线的风险。',{platform:3,stability:-1}],
  ['silver','银发商业年','老年生活被重新发现，主要因为它终于被计算成市场。',{elder:3,fraud:1}],
  ['pet','宠物情感经济','一些人推迟生育，但没有推迟购买陪伴。',{pet:3,care:1}]
].map(([id,name,desc,mods])=>({id,name,desc,mods}));

const locations = [
  {id:'tier1',name:'一线城市',weight:16,note:'机会密度很高，生活也按机会密度收费。',mods:{cost:78,education:72,medical:80,network:55,mobility:74}},
  {id:'tier2',name:'二线城市',weight:31,note:'看起来什么都有，只是每一项都需要排队。',mods:{cost:56,education:62,medical:64,network:60,mobility:61}},
  {id:'county',name:'县城',weight:30,note:'办事更近，边界更远。',mods:{cost:37,education:48,medical:45,network:82,mobility:43}},
  {id:'town',name:'乡镇',weight:23,note:'资源更薄，人生的振幅更大。',mods:{cost:25,education:36,medical:32,network:74,mobility:34}}
];

const archetypeRows = [
  ['high_expectation','高期待夹心家庭','middle','爱以成绩单和养老计划的形式出现。','父母年老后仍习惯替你填写人生表格。',{control:24,educationExpectation:28,emotionalExpression:-12,stabilityNeed:12}],
  ['warm_shop','情绪稳定的小生意家庭','working','钱不总够，饭桌上的话通常说得明白。','小店可能消失，家里说话的方式会留下。',{cashflow:-8,emotionalExpression:25,riskTolerance:8,selfEsteem:10}],
  ['paper_middle','账面中产高负债家庭','middle','资产看起来体面，现金流长期低声报警。','晚年的房本比家庭群更热闹。',{housing:28,hiddenDebt:28,cashflow:-22,stabilityNeed:18}],
  ['son_preference','重男轻女家庭','working','资源分配被称为传统，受损的人被要求理解传统。','年老后的照护账单重新解释了当年的偏心。',{genderTraditionalism:38,emotionalExpression:-18,control:14}],
  ['son_investment','儿子投资品家庭','working','儿子被当成需要长期投入、未来回本的项目。','当回报没有按期出现，亲情开始像催收。',{genderTraditionalism:25,control:23,achievementNeed:22,stabilityNeed:12}],
  ['system_control','控制型体制家庭','middle','流程正确比感受正确更容易获得表扬。','退休后，家里仍保留一套没有公章的审批制度。',{control:32,organizationDependence:26,riskTolerance:-20,educationExpectation:16}],
  ['cold_affluent','冷漠但物质充足家庭','affluent','需要很少被拒绝，情绪很少被询问。','遗产分配比拥抱更早完成。',{cashflow:32,emotionalExpression:-30,attachmentAnxiety:18,selfEsteem:-5}],
  ['warm_poor','温暖但经济困难家庭','precarious','家里没有安全垫，但有人会在你跌倒时伸手。','晚年不一定富裕，探望很少需要预约。',{cashflow:-30,emotionalExpression:30,careBurden:12,selfEsteem:12}],
  ['constant_conflict','长期争吵家庭','working','所有人都说为了这个家，家因此长期无法安静。','父母衰老后，旧争吵换成了新的听众。',{emotionalExpression:-24,attachmentAnxiety:28,selfEsteem:-15,control:12}],
  ['grandparents','隔代抚养家庭','working','父母出现在汇款记录里，祖辈出现在每一天。','照护关系在晚年完成了一次漫长回环。',{careBurden:20,attachmentAnxiety:8,traditionTrust:16}],
  ['single_parent','单亲家庭','working','一个成年人承担两份角色，也偶尔忘记自己还需要生活。','你是否接过那份疲惫，决定了晚年的距离。',{cashflow:-15,careBurden:18,independence:16}],
  ['blended','重组家庭','middle','边界、称呼和资源需要重新谈判。','多年后，真正留下的人重新定义了亲缘。',{attachmentAnxiety:12,control:6,openness:10}],
  ['many_children','多子女资源竞争家庭','working','分享被写成美德，争取被解释为不懂事。','兄弟姐妹在照护和遗产里再次排座次。',{siblingCompetition:32,cashflow:-12,careBurden:18}],
  ['migrant_workers','外出务工家庭','precarious','团聚按春节计算，成长按电话时长记录。','返乡后，彼此需要重新认识。',{migration:25,cashflow:-10,attachmentAnxiety:15,digitalLiteracy:6}],
  ['county_network','县城熟人网络家庭','working','办事有人，隐私也有人。','熟人网络在晚年既是扶手，也是广播站。',{network:32,privacy:-25,traditionTrust:15}],
  ['town_business','乡镇小生意家庭','working','家庭、店铺和现金流使用同一扇门。','你最终继承的可能不是店，而是判断人情的速度。',{riskTolerance:15,cashflow:5,network:18}],
  ['demolition_wait','拆迁等待家庭','working','未来财富长期停留在传闻和红线图上。','补偿到账前后，亲戚都变得非常精确。',{housing:18,riskTolerance:15,internalNewsTrust:28}],
  ['old_city_asset','老城区账面资产家庭','middle','房子很值钱，楼道、管线和现金流各有意见。','资产留下了，关于怎么使用它的争论也留下了。',{housing:35,cashflow:-12,mobility:-12}],
  ['new_migrant_city','一线城市新市民家庭','working','户口、学位和租约共同定义归属。','晚年是否留下，取决于城市有没有记住你。',{migration:30,stabilityNeed:18,cashflow:-8,educationExpectation:18}],
  ['teachers','教师家庭','middle','每个问题都可能变成一次教育。','退休后，家里终于少了一位班主任。',{educationExpectation:30,control:12,information:15}],
  ['medical','医疗家庭','middle','懂得风险不等于有时间照顾自己。','晚年对身体更清醒，也更难假装不知道。',{medicalAccess:28,healthBaseline:8,workload:16}],
  ['state_dual','国企双职工家庭','middle','稳定像空气，直到有人想离开。','组织退休后，家庭需要发明新的身份。',{organizationDependence:30,stabilityNeed:28,riskTolerance:-16}],
  ['manufacturing','制造业技术家庭','working','技能被尊重，身体损耗通常写在说明书外。','机器升级后，经验可能变成资产，也可能变成旧型号。',{technicalSkill:22,healthBaseline:-5,workload:20}],
  ['real_estate','地产链家庭','middle','收入、饭局和周期共用一条曲线。','房子仍在，行业的称呼换了几轮。',{housing:30,riskTolerance:24,cashflow:10,hiddenDebt:18}],
  ['startup','高风险创业家庭','affluent','成功故事讲得很早，失败账单寄得更晚。','晚年仍有人把下一次机会称为最后一次。',{riskTolerance:35,cashflow:18,hiddenDebt:20,stabilityNeed:-20}],
  ['clan','宗族影响较强家庭','working','关系能提供保护，也会索取服从。','祠堂、群聊和照护继续分配位置。',{network:24,control:20,genderTraditionalism:20,privacy:-18}],
  ['mother_breadwinner','女性主要收入家庭','working','家里的经济现实比传统称呼更早完成更新。','她退休后，全家才发现收入之外还有大量无薪工作。',{genderTraditionalism:-15,careBurden:15,openness:12}],
  ['father_absent','父亲长期缺席家庭','working','缺席被解释为工作，留下的人负责解释其他一切。','父子或父女关系可能在很晚才开始说真话。',{attachmentAnxiety:20,emotionalExpression:-18,independence:12}],
  ['mother_overcare','母亲过度照护家庭','middle','帮助总是及时到达，边界因此很难长大。','她老去后，你需要区分照护、偿还和爱。',{control:24,careBurden:22,independence:-15,attachmentAnxiety:10}],
  ['connected_control','家里有人但控制很强','affluent','捷径存在，使用说明由家庭永久保管。','当关系网退休，你第一次需要单独证明自己。',{network:35,control:35,organizationDependence:18,selfEsteem:-8}]
];
const familyArchetypes = archetypeRows.map(([id,name,familyClass,note,lateEcho,dnaMods],i)=>({
  id,name,familyClass,note,lateEcho,dnaMods,weight: i<8?4:3,
  locationAffinity: i%4===0?['tier1','tier2']:i%4===1?['tier2','county']:i%4===2?['county','town']:[],
  advantages:[['关系有人接住','较早理解规则','能承受生活波动','拥有可继承的经验'][i%4]],
  hiddenRisks:[['边界被家庭吞没','现金流在关键时刻断裂','照护责任集中','把组织评价当成自我价值'][i%4]],
  chainAffinity:[['family_control','housing_cycle','care_parents','hometown_return','sibling_resources','career_identity'][i%6]]
}));

const secretNames = [
  '账本外的旧债','可能被征收的老家土地','长期未提及的共有房','家族遗传健康风险','认识关键人物的亲戚','父母婚姻的延迟裂缝','冷门但成熟的家族生意','替亲戚做过的担保','多年不联系的海外亲属','被隐瞒的失业经历','没有登记的合伙份额','祖辈留下的照护承诺','一位被家庭除名的亲人','父母早年的创业失败','并不稳固的单位身份','兄弟姐妹的教育借款','家里曾卖掉的一套房','母亲中断过的职业','父亲长期未治疗的病','一笔用途模糊的彩礼','等待确权的宅基地','亲戚代持的资产','被高估的收藏品','一次未公开的工伤','父母对你专业的私下安排','家庭群外的小额互助网','一位真正可信任的旧同事','祖辈留下的手艺','长期缴纳不足的社保','被忽视的商业保险','家里保存的旧录取通知书','一段没有完成的迁移','父母对性别的真实期待','一份尚未兑现的拆迁协议','家族中的照护默认名单','一笔并不属于父母的存款','早年被放弃的兴趣设备','亲属之间的口头遗嘱','一场没有追责的投资损失','父母曾拒绝的一次机会','家里真实的现金流','一位失联多年的手足','被长期压下的心理问题','没有秘密，只有尚未发生的事'
];
const familySecrets = secretNames.map((name,i)=>({
  id:`secret_${String(i+1).padStart(2,'0')}`,name,age:i===43?99:16+(i*7)%47,
  text:i===43?'':`${name}并没有消失，只是等到你能够承担后果时才被重新说起。`,
  effects:i===43?{}:{resources:{cash:((i%5)-2)*9000,assets:i%4===0?70000:0,debt:i%6===0?50000:0,relation:i%3===0?-7:3},hidden:{familyBurden:i%2?6:-2,selfEsteem:i%4===0?-4:2},desires:{security:i%2?7:-3,familyBelonging:i%3?3:-5}}
}));

const attributes = {
  intellect:{name:'智力',desc:'学习、判断与识别信息差',icon:'🧠'}, physique:{name:'体质',desc:'恢复、耐力与长期损耗',icon:'💪'},
  looks:{name:'外貌',desc:'第一印象与被凝视的概率',icon:'✨'}, stability:{name:'情绪稳定',desc:'抵抗内耗与冲动',icon:'🧘'},
  social:{name:'社交',desc:'合作、人脉与边界协商',icon:'🤝'}, ambition:{name:'野心',desc:'跃迁意愿与风险敞口',icon:'🚀'}
};
const desireRows = [
  ['love','爱与伴侣'],['familyBelonging','家庭归属'],['wealth','财富'],['stability','稳定'],['freedom','自由'],['achievement','成就'],['recognition','被认可'],['exploration','探索'],['care','照护他人'],['peace','内心平静'],['body','身体与亲密'],['status','社会身份'],['security','安全感']
];
const desires = Object.fromEntries(desireRows.map(([id,name])=>[id,{name,min:0,max:100}]));

const mainConflicts = [
  ['control_autonomy','家庭控制 vs 自主生活',['freedom','familyBelonging'],['family','boundary']],
  ['intimacy_defense','亲密需求 vs 害怕受伤',['love','security'],['relationship','self']],
  ['stability_dream','稳定收入 vs 自我实现',['stability','achievement'],['career','identity']],
  ['city_family','城市机会 vs 家庭责任',['exploration','care'],['city','family']],
  ['wealth_health','财富野心 vs 身体损耗',['wealth','peace'],['career','health']],
  ['recognition_peace','被认可 vs 内心平静',['recognition','peace'],['identity','health']],
  ['marriage_freedom','婚姻期待 vs 个体自由',['love','freedom'],['marriage','boundary']],
  ['tradition_boundary','传统家庭角色 vs 自我边界',['familyBelonging','freedom'],['gender','family']],
  ['house_mobility','房产安全感 vs 流动自由',['security','exploration'],['house','city']],
  ['care_self','照护他人 vs 自我人生',['care','achievement'],['care','boundary']],
  ['face_desire','体面生活 vs 真实欲望',['status','body'],['face','self']],
  ['organization_skill','组织身份 vs 个人能力',['status','achievement'],['career','organization']],
  ['escape_hometown','逃离故乡 vs 对故乡的责任',['exploration','familyBelonging'],['hometown','care']]
].map(([id,name,desireKeys,themes])=>({id,name,desireKeys,themes}));

const effectSets = [
  {attributes:{intellect:1},hidden:{information:5},desires:{achievement:5,peace:-2}},
  {attributes:{stability:1},resources:{spirit:5},desires:{peace:7,recognition:-3}},
  {attributes:{social:1},resources:{relation:6},desires:{familyBelonging:4,freedom:-2}},
  {attributes:{physique:1},resources:{health:7},hidden:{healthHabit:6},desires:{body:4}},
  {hidden:{digitalLiteracy:8},desires:{exploration:5,security:-2},flagsAdd:['digital_native']},
  {hidden:{organizationDependence:8},resources:{cash:8000},desires:{stability:7,freedom:-4}},
  {relationships:[{id:'old_friend',delta:12}],desires:{love:4,recognition:3},flagsAdd:['person_old_friend']},
  {resources:{cash:18000,spirit:-4},hidden:{riskTolerance:6},desires:{wealth:7,peace:-4}},
  {hidden:{selfEsteem:7,openness:4},desires:{freedom:5,recognition:-3}},
  {resources:{health:-3,spirit:8},hidden:{stress:-5},desires:{peace:8,status:-3}}
];

const innateTitles = ['早熟','情绪隔离','被认真听过一次','电子原住民','耐耗材质','容易被记住的脸','家里有人','时代错位','未被记录的善意','县城顶流','单线程大脑','普通得恰到好处','能把说明书看完','不合时宜的耐心','对数字敏感','很早学会做饭','知道什么时候闭嘴','总能找到替代路线','不怕重新开始','对权威保持半步距离','身体记得节奏','能在陌生人中求助','看起来很可靠','不容易被群体点燃','善于保存证据','对小生意有直觉','能忍住即时满足','对空间和方向敏感','在争吵中保持表达','很早拥有一位朋友','不把失败解释成命运','对新工具不自卑','会观察照护者的疲惫','有一个安全的兴趣角落','懂得拒绝免费劳动','能从口音里听见故乡','对关系中的控制敏感','愿意承认不知道','有恢复快乐的速度','相信生活可以重写'];
const stageTitles = ['会写提示词','稳定睡眠','公文语感','可出售的副业技能','及时退出','一个靠谱的朋友','长期负债耐受','开始运动','注意力防火墙','向未来借运','麻木也是护甲','照护能力','会装作听懂','懂一点劳动合同','能把复杂事讲清楚','一个多年没联系的同学','不再追问所有人的认可','便宜但稳定的爱好','一份可迁移的技能','记账不是自律表演','知道医院怎么挂号','能与父母结束争论','遇事先保存聊天记录','在小地方拥有信用','能在大城市求助','拒绝无偿加班的勇气','一段没有结婚的稳定关系','一位跨年龄朋友','愿意做长期复健','接受职业不是身份','能把照护分给别人','重新学习的耐心','没有发布的作品','旧账号的少量关注者','一位严格但公平的老师','一次被善待的离职','不依赖酒桌的关系','能识别情绪操控','不把房价当人格测试','愿意定期体检','可以卖掉的面子','不把忙碌当成功','从错误专业里带走的能力','稳定更新的小工具','知道如何申请公共服务','一份不体面的现金流','能在亲戚群里沉默','接受孩子不是项目','对诈骗保持具体怀疑','晚年学习新界面的耐心','重新恋爱的开放度','能独自吃好一顿饭','与兄弟姐妹重新谈边界','不替伴侣承担全部人生','能接受身体变化','一个不会催婚的朋友','把遗嘱说清楚','愿意退出高风险投资','知道何时求医','允许自己休息','不再替组织保守秘密','把兴趣留到退休后','愿意被年轻人教一次','知道幸福没有统一格式'];
const adversityTitles = ['最低点有人接电话','失败没有形成档案','被裁后仍保留技能','债务谈判窗口','一次及时检查','关系外的支持网络','允许从头开始','没有被羞耻绑住','短暂的喘息','旧技能突然值钱','有人愿意提供证明','一次没有利息的帮助','终于承认需要治疗','从控制关系中离开','资产没有全部锁死','照护责任得到分担','一次法律援助','把坏运气停在这一年','生活保留了小出口','仍然能选择下一步'];

function buildCards(titles,kind){
  return titles.map((title,i)=>({
    id:`${kind}_${String(i+1).padStart(2,'0')}`,title,
    type:['触发牌','改写牌','人物牌','条件牌','代价牌','组合牌'][i%6],
    icon:['🧭','🛡️','🤝','🧰','🕰️','🧩'][i%6],
    text:`${title}不会替你消除代价，但会在合适的节点改变可见的选项。`,
    effects:effectSets[i%effectSets.length],
    mechanic:['unlock','rewrite','person','conditional','cost','combo'][i%6],
    comboWith:i%6===5?[`${kind}_${String(Math.max(1,i)).padStart(2,'0')}`]:[],
    condition:i%6===3?{locations:[locations[i%locations.length].id]}:null
  }));
}
const cards = {innate:buildCards(innateTitles,'innate'),stage:buildCards(stageTitles,'stage'),adversity:buildCards(adversityTitles,'adversity')};

const themeEffects = {
  family:{resources:{relation:4,spirit:-2},desires:{familyBelonging:5,freedom:-3},hidden:{familyBurden:3}},
  education:{attributes:{intellect:1},resources:{spirit:-2},desires:{achievement:5,recognition:3}},
  peer:{resources:{relation:5,spirit:2},hidden:{selfEsteem:3},desires:{recognition:4}},
  digital:{hidden:{digitalLiteracy:6,information:4},desires:{exploration:5,peace:-2}},
  gender:{hidden:{selfEsteem:-2,genderPressure:6},desires:{recognition:4,freedom:4}},
  career:{resources:{cash:9000,spirit:-3},desires:{achievement:5,stability:3},hidden:{organizationDependence:2}},
  relationship:{resources:{relation:6,spirit:2},desires:{love:7,security:3}},
  house:{resources:{assets:35000,debt:18000},desires:{security:6,freedom:-3}},
  health:{resources:{health:-4,spirit:-2},hidden:{healthHabit:3},desires:{peace:4}},
  care:{resources:{relation:5,spirit:-4,cash:-5000},desires:{care:6,freedom:-4},hidden:{careBurden:5}},
  city:{hidden:{migration:6,information:3},desires:{exploration:6,familyBelonging:-2}},
  money:{resources:{cash:12000,spirit:-2},desires:{wealth:7,security:4}},
  identity:{hidden:{selfEsteem:5,organizationDependence:-3},desires:{status:4,peace:3}},
  adult_gray:{resources:{cash:-6000,spirit:-3},hidden:{loneliness:-2,riskTolerance:2},desires:{body:4,love:-2}},
  elder:{resources:{health:-2,relation:4},hidden:{digitalLiteracy:2,fraudRisk:-2},desires:{peace:5,exploration:3}}
};

const scenarioCatalog = {
  infancy:[
    ['first_cry','谁先抱起你','family','control_autonomy','最早的照护不是记忆，却成为身体理解安全的方式。'],
    ['name','名字里的期待','gender','tradition_boundary','家里讨论你的名字，也顺便讨论希望你成为什么样的人。'],
    ['illness','第一次高烧','health','wealth_health','一次夜间发烧让家庭的医疗资源和情绪方式同时现形。'],
    ['sibling','家里多了一个孩子','family','care_self','新的孩子改变了注意力、预算和你的位置。'],
    ['work_separation','父母要去很远的地方工作','family','city_family','收入与陪伴第一次被放在同一张桌上比较。'],
    ['language','你学会说“不”','identity','control_autonomy','一个很小的拒绝，测试了家里允许多大的边界。'],
    ['toy','一件超出预算的玩具','money','house_mobility','愿望第一次有了价格，父母的表情成为收据。'],
    ['kindergarten','幼儿园名额','education','stability_dream','教育竞争比你更早到达学校门口。'],
    ['grandparent','祖辈的偏爱','gender','tradition_boundary','偏爱带来温暖，也开始重新排列家庭位置。'],
    ['secret_sign','没有解释的争吵','family','intimacy_defense','你听不懂内容，但身体记住了门被关上的声音。']
  ],
  childhood:[
    ['grade','成绩单先到谁手里','education','recognition_peace','分数被用来讨论努力、天赋和家庭面子。'],
    ['car_gate','校门口的车型','money','face_desire','同学没有教你阶层，但放学队伍很擅长。'],
    ['interest','被安排的兴趣班','family','control_autonomy','兴趣被写进日程后，喜欢变成了需要证明的东西。'],
    ['leftbehind','一次长时间分离','family','city_family','陪伴由电话和汇款共同承担。'],
    ['first_phone','第一台联网设备','digital','organization_skill','互联网给了你出口，也开始收取注意力。'],
    ['bully','同伴把你放到圈外','peer','intimacy_defense','被排斥不一定留下伤口，但会改变进入人群的姿势。'],
    ['housework','谁应该先做家务','gender','tradition_boundary','一项小家务展示了家庭角色并不平均。'],
    ['teacher','老师记住了你','education','recognition_peace','被一个成年人认真看见，可能改变你对能力的解释。'],
    ['relative_compare','亲戚家的孩子','family','face_desire','比较被包装成关心，结果通常只留下排名。'],
    ['cold_interest','冷门兴趣的开端','digital','stability_dream','你开始喜欢一件暂时不能兑换成分数的事。']
  ],
  adolescence:[
    ['body_change','身体突然成为公共话题','gender','tradition_boundary','青春期让身体变化，也让周围人获得了评论资格。'],
    ['only_understand','唯一理解你的人','relationship','intimacy_defense','长期忽视后，一份强烈关注显得像出口，也可能带着控制。'],
    ['height_pressure','身高与成功预演','gender','recognition_peace','同龄人的玩笑提前排练了成年评价体系。'],
    ['safety_route','回家路线','gender','tradition_boundary','安全建议常以限制自由的方式到达。'],
    ['streaming','短视频里的捷径','digital','stability_dream','屏幕里有人跳过过程，现实仍按步骤收费。'],
    ['exam_track','教育分流','education','stability_dream','普高、职校和艺体被同时描述成选择与命运。'],
    ['family_control','志愿还没到你手里','family','control_autonomy','家里提前讨论了专业、城市和一份尚不存在的工作。'],
    ['friend_secret','朋友交给你的秘密','peer','intimacy_defense','信任到来时，也带来你无法独自解决的问题。'],
    ['gender_resource','资源往谁那边倾斜','gender','tradition_boundary','补习、设备和期待并没有平均分配。'],
    ['account','一个只有几十人的账号','digital','stability_dream','关注者很少，但你第一次持续生产属于自己的东西。']
  ],
  youth:[
    ['major','专业和现实第一次见面','education','stability_dream','专业介绍里没有写行业周期和家庭现金流。'],
    ['first_city','第一次真正离家','city','city_family','自由来得很快，房租也来得很准时。'],
    ['first_job','第一份正式工作','career','organization_skill','岗位说明写了能力，办公室补充了服从。'],
    ['exam_public','考公考编周期','career','stability_dream','稳定被做成题库，青春被做成备考周期。'],
    ['outsourcing','工牌颜色','career','organization_skill','你做同样的事，却从工牌颜色理解了组织边界。'],
    ['love_first','一段没有标准答案的关系','relationship','intimacy_defense','亲密让人被看见，也让防御失去部分用途。'],
    ['adult_gray','无需承诺的接触','adult_gray','face_desire','你开始区分身体、孤独、亲密和责任。'],
    ['creator','内容创作的自由幻觉','digital','recognition_peace','你拥有发布按钮，也开始被数据决定心情。'],
    ['talent_subsidy','人才补贴的条件','city','house_mobility','城市欢迎你，前提是材料、期限和资格都同意。'],
    ['parents_call','家里希望你回去','family','escape_hometown','电话没有命令，只是把责任说得非常具体。']
  ],
  adult:[
    ['ai_workload','AI提高了效率','career','wealth_health','你通过AI认证后，工作量按认证后的效率重新计算。'],
    ['layoff','岗位被重新定义','career','organization_skill','公司说没有裁员，只是未来不再需要这个岗位名称。'],
    ['bride_price','彩礼与婚房审计','relationship','marriage_freedom','两家人尝试把感情、房产和未来现金流放进同一张表。'],
    ['birth_choice','是否成为父母','care','care_self','生育不是一个按钮，而是一段职业、身体与关系的重排。'],
    ['mortgage','房贷窗口','house','house_mobility','一套房承诺稳定，也要求你稳定地偿还。'],
    ['harassment','越过边界的玩笑','gender','tradition_boundary','权力把冒犯说成氛围，沉默被误写成同意。'],
    ['side_job','副业开始占用睡眠','money','wealth_health','第二份收入使用第一份工作的剩余体力。'],
    ['pet','一份不问职业的陪伴','care','intimacy_defense','照护一个生命改变了你对责任和亲密的理解。'],
    ['return','返乡机会','city','escape_hometown','故乡提供低成本，也重新提出边界问题。'],
    ['paid_intimacy','付费的亲密错觉','adult_gray','face_desire','疲惫的夜晚，你考虑用金钱缩短孤独，却无法购买后续解释。']
  ],
  midlife:[
    ['mid_layoff','四十岁后的招聘页面','career','organization_skill','经验很多，招聘系统仍希望你选择应届或三年以内。'],
    ['parent_care','父母的第一次长期住院','care','care_self','照护排班把兄弟姐妹、距离和旧账放到一起。'],
    ['marriage_shift','关系不再自动运行','relationship','marriage_freedom','共同生活多年后，沉默也形成了固定分工。'],
    ['child_school','孩子的人生项目','education','control_autonomy','你发现自己开始使用父母当年的句子。'],
    ['chronic','体检报告开始连续','health','wealth_health','身体不再接受用下一年休息来偿还这一年。'],
    ['women_invisible','职业透明化','gender','organization_skill','你仍在完成工作，机会却开始绕过你。'],
    ['provider_break','主要收入者的停顿','gender','recognition_peace','收入暂停后，家庭地位和自我价值一起被重新估价。'],
    ['business_cycle','生意的第二个周期','money','wealth_health','第一次成功被当成能力，第二次波动开始解释运气。'],
    ['old_account','旧账号突然有了流量','digital','stability_dream','多年无人问津的内容被时代重新定价。'],
    ['new_life','重新选择生活方式','identity','recognition_peace','你第一次不以升职或家庭评价来描述下一步。']
  ],
  preRetire:[
    ['retire_plan','退休倒计时','identity','organization_skill','组织开始计算你离开的日期，你开始计算离开后的名字。'],
    ['rework','退休后再就业邀请','career','recognition_peace','岗位说需要经验，价格却按临时帮助计算。'],
    ['partner_health','伴侣的健康变化','care','care_self','共同生活进入新的分工，爱开始包含大量预约。'],
    ['adult_children','成年子女的边界','family','control_autonomy','关心很容易越过边界，尤其当你相信自己更有经验。'],
    ['asset_clear','资产清算会议','house','house_mobility','房产、现金和口头承诺终于需要落到纸面。'],
    ['hometown_again','再次考虑返乡','city','escape_hometown','故乡变得更方便，也更不像记忆里的故乡。'],
    ['hobby_return','旧兴趣重新开机','identity','recognition_peace','一件多年没有绩效意义的事重新占据下午。'],
    ['menopause','身体进入新阶段','gender','wealth_health','变化不是衰退说明书，却常被周围人草率命名。'],
    ['father_silence','和父亲学习说话','gender','intimacy_defense','两代人都擅长承担，不擅长说明害怕。'],
    ['care_split','照护责任重新分配','care','care_self','谁有时间，常被解释成谁应该承担。']
  ],
  elder:[
    ['digital_phone','子女远程管理你的手机','digital','control_autonomy','安全设置保护了你，也让成年后的自主再次需要申请。'],
    ['health_product','保健项目说明会','elder','wealth_health','对方不只出售产品，也出售被重视和仍能掌控身体的感觉。'],
    ['ai_fraud','内部消息由AI生成','elder','organization_skill','骗局熟悉你的语气，也熟悉你相信自己不会被骗。'],
    ['late_love','晚年关系','relationship','intimacy_defense','亲密不再以婚姻为唯一格式，却仍需要边界和诚实。'],
    ['ai_companion','不会不耐烦的陪伴','digital','intimacy_defense','AI总能回复，真正的问题是你还愿不愿意联系真人。'],
    ['community_role','社区里的新身份','identity','recognition_peace','离开组织后，你在更小的地方重新被需要。'],
    ['travel','一次不赶行程的旅居','city','escape_hometown','身体限制了速度，却没有取消好奇。'],
    ['inheritance','把话说在前面','family','care_self','遗嘱不是不吉利，而是避免爱被资产翻译。'],
    ['late_business','晚年创业','money','wealth_health','你想证明仍能创造价值，也需要确认风险由谁承担。'],
    ['goodbye','一次提前的告别','identity','recognition_peace','告别让人承认有限，也让仍拥有的时间变得具体。']
  ]
};

const anglePhrases = [
  ['家庭版','家里先给出了一套看似完整的解释。'],
  ['自我版','你发现自己的真实反应与标准答案并不一致。'],
  ['城市版','所在地方的资源和价格改变了可选路线。'],
  ['时代版','一项社会趋势把私人问题重新包装成普遍选择。']
];
const choiceSets = {
  family:[['接受安排','先把冲突压下去。'],['说出需要','家庭第一次听见具体边界。'],['找外部支持','你把问题带到家庭之外。']],
  education:[['沿着标准路线','确定性提高，自由度下降。'],['保留自己的方向','成绩之外留下了一部分自我。'],['寻找替代路径','你获得了额外信息，也承担绕路成本。']],
  career:[['证明自己还能扛','短期保住位置，身体记下了账。'],['重新谈条件','边界变清楚，机会也少了一些。'],['准备离开','不确定性增加，自主性开始恢复。']],
  relationship:[['继续靠近','亲密增加，防御暂时下降。'],['把边界说清楚','关系经受一次不浪漫但必要的谈判。'],['暂时离开','你保住空间，也接受失去可能。']],
  money:[['先抓住现金流','眼前压力下降，长期代价上升。'],['降低欲望','账单变小，体面感受到挑战。'],['换一种收入方式','你承担学习成本，获得一点选择权。']],
  health:[['继续撑一下','事情完成了，身体没有忘记。'],['现在停下来','损失变得可见，伤害没有继续扩大。'],['寻求专业帮助','你为确定性付费，也减少了猜测。']],
  default:[['顺着现有路线','你换取了一段暂时稳定。'],['承认真实感受','选择没有立刻解决问题，但改变了你。'],['寻找第三条路','你承担额外成本，保留了更多可能。']]
};

function mergeEffects(base,extra){
  const out=structuredClone(base||{});
  for(const [group,value] of Object.entries(extra||{})){
    if(Array.isArray(value)) out[group]=[...(out[group]||[]),...value];
    else if(value&&typeof value==='object') out[group]={...(out[group]||{}),...value};
    else out[group]=value;
  }
  return out;
}

const maleSensitive = new Set(['height_pressure','provider_break','father_silence','retire_plan','mid_layoff','first_job','mortgage','layoff','work_separation','exam_public','business_cycle']);
const femaleSensitive = new Set(['gender_resource','safety_route','body_change','housework','harassment','birth_choice','women_invisible','menopause','parent_care','care_split','name','grandparent','sibling','paid_intimacy']);

function makeBaseEvents(){
  const out=[];
  for(const [stage,scenarios] of Object.entries(scenarioCatalog)){
    const [ageMin,ageMax]=stages[stage];
    scenarios.forEach((scenario,sidx)=>{
      const [slug,title,theme,conflict,core]=scenario;
      anglePhrases.forEach(([angle,angleText],aidx)=>{
        const genderAffinity=maleSensitive.has(slug)?'male':femaleSensitive.has(slug)?'female':null;
        const baseChoices=choiceSets[theme]||choiceSets.default;
        const baseEffect=themeEffects[theme]||themeEffects.identity;
        const choices=baseChoices.map(([text,resultText],cidx)=>({
          text,resultText,
          requirements:cidx===2?{attributesAny:{intellect:3,social:3},cardsAny:[]}:{},
          effects:mergeEffects(baseEffect,cidx===0?{desires:{stability:4,freedom:-2}}:cidx===1?{hidden:{selfEsteem:4},desires:{freedom:4,recognition:-2}}:{hidden:{information:5},desires:{exploration:5}})
        }));
        out.push({
          id:`${stage}_${slug}_${aidx+1}`,title:`${title} · ${angle}`,icon:['◌','◆','◇','✦'][aidx],stage:[stage],ageMin,ageMax,
          gender:['male','female'],genderAffinity,locations:[],familyArchetypes:[],familyClasses:[],requirements:{},
          weight:10+(sidx%3),category:aidx===0?'familyEcho':aidx===2?'social':aidx===3?'blackSwan':'stage',themes:[theme],mainConflicts:[conflict],
          chainId:null,chainStep:null,exclusiveGroup:`${stage}_${slug}`,cooldown:3,maxPerLife:1,freshness:1,
          worldTagMods:{[worldTags[(sidx+aidx)%worldTags.length].id]:1.35},
          variants:genderAffinity?{
            male:{text:`${core}${angleText}${genderAffinity==='male'?' 对男性的评价更常被翻译成能不能承担。':' 你也可能遇见这套结构，只是周围人不一定承认。'}`},
            female:{text:`${core}${angleText}${genderAffinity==='female'?' 对女性的要求更常以关心和保护的名义到达。':' 你也可能承担这份责任，只是它不总被写进传统剧本。'}`}
          }:{},
          text:`${core}${angleText}`,choices,endingTags:[theme,conflict]
        });
      });
    });
  }
  return out;
}

const chainRows = [
  ['cold_account','冷门兴趣账号','digital','stability_dream','childhood','少量关注者陪你穿过很长的无人问津。','时代突然给它标价。','它最终成为资产、入口或温柔的黑历史。'],
  ['family_control','家庭控制','family','control_autonomy','childhood','父母替你做了第一个重要选择。','控制逐步进入专业、城市和伴侣。','父母衰老后，权力关系需要重新谈判。'],
  ['bride_house','彩礼和婚房','relationship','marriage_freedom','youth','关系开始接受双方家庭审计。','住房和彩礼让爱拥有了现金流。','共同方案或长期怨恨延伸到中晚年。'],
  ['county_escape','县城逃离与返乡','city','escape_hometown','adolescence','你第一次把离开当成完整计划。','城市提供机会，也持续收取距离。','返乡可能是失败、选择或新的责任。'],
  ['public_exam','考公与长期备考','career','stability_dream','youth','稳定被拆成题型、排名和报名费。','一次次上岸传闻重写你的时间感。','你最终获得岗位，或重新定义稳定。'],
  ['bigtech_outsource','大厂、外包和优化','career','organization_skill','youth','工牌先区分了人与人的组织距离。','AI与周期重新定义岗位。','离开组织后，技能是否留下成为答案。'],
  ['ai_work','AI技能与工作量','career','wealth_health','youth','你因会用工具而被看见。','效率提升被组织写进新基线。','你可能成为管理AI的人，也可能先被工作量耗尽。'],
  ['birth_break','生育与职业中断','care','care_self','adult','是否生育开启一组不对称成本。','照护、收入和身体发生长期重排。','多年后，关系质量比选择标签更重要。'],
  ['unmarried','坚定不婚后的变化','relationship','marriage_freedom','youth','你拒绝把婚姻当成人生默认值。','孤独、自由与外部期待轮流出现。','晚年的亲密可能使用另一种格式。'],
  ['divorce_rebuild','离婚后的重新生活','relationship','intimacy_defense','adult','一段关系结束，现实分割才刚开始。','财务、子女和社交网络需要重建。','你重新理解承诺与独处。'],
  ['care_parents','照护父母','care','care_self','adult','父母第一次需要持续帮助。','距离和兄弟姐妹开始计算责任。','照护结束后，你需要找回自己的生活。'],
  ['sibling_resources','兄弟姐妹资源分配','family','tradition_boundary','childhood','资源差异最初只是一件小事。','教育、婚房和照护让差异扩大。','晚年遗产迫使所有人说出旧账。'],
  ['chronic_illness','慢性病','health','wealth_health','youth','一个容易忽略的指标开始出现。','工作和生活习惯决定它的速度。','你学会与身体合作，或继续把它当障碍。'],
  ['housing_cycle','房产周期','house','house_mobility','youth','第一套房被描述成唯一窗口。','流动性、负债和城市变化开始结算。','房子留下多少安全，取决于它拿走多少自由。'],
  ['business','创业','money','wealth_health','youth','一个小机会要求你投入真实资源。','现金流比故事更早做出判断。','经验、债务或事业成为晚年回响。'],
  ['acquaintance','熟人社会','family','control_autonomy','childhood','关系网第一次替你打开门。','每一次帮助都留下没有利率的账。','晚年你决定继续维护网络还是退出广播。'],
  ['career_change','中年转行','career','stability_dream','adult','旧行业开始收缩。','学习新技能时，你不再拥有年轻标签。','新职业未必体面，却可能更接近真实生活。'],
  ['retire_identity','退休后身份丧失','identity','organization_skill','midlife','职位仍在，离开的日期已出现。','退休让组织称呼突然停止。','你在社区、兴趣或关系里重新命名自己。'],
  ['elder_fraud','晚年骗局','elder','recognition_peace','preRetire','内部消息与熟人推荐逐渐靠近。','孤独、权威信任和过度自信共同抬高风险。','损失之后，重要的是是否仍能相信自己。'],
  ['late_love','晚年恋爱','relationship','intimacy_defense','preRetire','你重新遇见不以婚育为目标的亲密。','财产、子女和身体边界需要说清。','关系可能结束，也可能让余生重新有具体称呼。'],
  ['left_behind','留守与重新团聚','family','city_family','infancy','成长由祖辈和电话共同完成。','团聚后，血缘并不能自动恢复熟悉。','多年后你重新决定怎样陪伴下一代。'],
  ['teacher_expectation','教师家庭的标准答案','education','control_autonomy','childhood','家里太懂教育，错误显得更难被允许。','专业与工作继续接受家庭批改。','父母退休后，你们第一次讨论没有答案的问题。'],
  ['factory_upgrade','制造业升级','career','organization_skill','youth','经验与新设备第一次并肩工作。','升级带来效率，也淘汰一部分身体和技能。','你成为师傅、转行者或旧型号专家。'],
  ['platform_worker','平台劳动','career','stability_dream','youth','自由接单看起来没有上级。','算法用另一种方式安排时间。','你最终积累客户、损耗身体或寻找组织保障。'],
  ['content_creator','内容创作','digital','recognition_peace','adolescence','表达第一次得到陌生人回应。','流量把生活切成可发布片段。','你留下作品、账号资产或被数据掏空的几年。'],
  ['pet_family','宠物与替代家庭','care','intimacy_defense','youth','一份稳定陪伴进入生活。','照护成本与迁移计划发生冲突。','你重新理解家庭不只由血缘组成。'],
  ['appearance','外貌规训与医美','gender','face_desire','adolescence','评价让身体成为项目。','消费提供改变，也扩大焦虑。','你可能重新拥有身体，或继续参加无终点审计。'],
  ['harassment_boundary','职场边界','gender','tradition_boundary','youth','一次越界被解释成玩笑。','证据、权力与收入让选择变得复杂。','多年后你决定怎样保护自己和后来者。'],
  ['father_son','父子情感失语','gender','intimacy_defense','childhood','关心长期通过成绩和钱表达。','两代人都避免说出害怕。','疾病或退休让沉默终于有了裂缝。'],
  ['mother_daughter','母女边界','gender','control_autonomy','childhood','照护与控制使用相似语气。','身体、婚恋和职业成为争论入口。','母亲老去后，你重新区分爱与偿还。'],
  ['migration_hukou','户口、学位与归属','city','city_family','childhood','城市资格第一次影响学校。','工作和住房继续决定留下的成本。','晚年你选择在哪个地方被称为本地人。'],
  ['hidden_debt','家庭隐债','money','house_mobility','adolescence','账本里出现解释不清的缺口。','担保、房贷和人情让债务扩大。','你选择继续隐瞒、共同承担或终止循环。'],
  ['inheritance','遗产与口头承诺','family','care_self','midlife','父母第一次讨论以后。','照护贡献和财产期待发生碰撞。','把话写清楚，或让下一代继续猜。'],
  ['friendship','一位长期朋友','peer','intimacy_defense','childhood','你们在尚未拥有资源时认识。','城市和职业让联系变稀。','晚年仍有人知道你不写在简历里的部分。'],
  ['adult_loneliness','成年孤独消费','adult_gray','face_desire','youth','孤独第一次被明确标价。','短暂缓解与长期空虚并不按时报到。','你学会购买陪伴、建立关系或接受独处。'],
  ['sexual_intimacy','性与亲密分离','adult_gray','intimacy_defense','youth','身体需求和关系承诺不再自动绑定。','隐瞒、健康和自我认知进入选择。','多年后你重新定义诚实与亲密。'],
  ['health_habit','健康习惯','health','wealth_health','adolescence','睡眠和运动看起来没有即时奖励。','中年开始兑现年轻时的积累。','晚年身体边界决定生活半径。'],
  ['internal_news','内部消息迷信','money','recognition_peace','adult','一次关系网消息带来小收益。','成功强化了你对消息差的信任。','晚年骗局正好使用了这份自信。'],
  ['organization','组织忠诚','career','organization_skill','youth','组织在你最需要时提供身份。','忠诚逐渐替代可迁移能力。','离开后，你需要确认自己还剩什么。'],
  ['education_devalue','学历贬值','education','stability_dream','adolescence','学历被承诺成通行证。','更多人拥有同一张票，入口没有同步增加。','你最终靠学历、技能或关系重新定位。'],
  ['remote_care','远程照护','care','city_family','adult','你在另一个城市处理父母的预约。','手机成为照护工具，也成为控制工具。','距离没有消失，但责任可以重新分配。'],
  ['community','社区关系','identity','recognition_peace','midlife','你第一次在工作之外被需要。','小型公共事务带来新的关系。','晚年社区成为生活基础设施。'],
  ['late_learning','晚年学习','digital','organization_skill','preRetire','你决定学习一个不为升职服务的工具。','挫败感与好奇心同时出现。','跨年龄关系和新能力扩大了晚年半径。'],
  ['travel_life','旅居与流动','city','house_mobility','midlife','你第一次认真想过不固定居住。','房产、医疗和关系限制移动。','余生可能拥有多个落脚点，而非唯一归属。'],
  ['family_business','家族生意','money','control_autonomy','adolescence','家里希望你理解一门生意。','继承意味着现金流，也意味着角色。','你接手、改造或让它在自己手里结束。'],
  ['care_career','照护型职业','care','care_self','youth','你进入一份持续照顾他人的工作。','专业能力与情绪劳动共同消耗。','晚年你是否还能照顾自己成为答案。'],
  ['black_swan','一次不按计划到达的变化','identity','recognition_peace','youth','偶然改变了原本稳定的路线。','你尝试把运气解释成能力或失败。','多年后，它只是人生转弯处，而非全部意义。'],
  ['hometown_business','返乡小生意','money','escape_hometown','adult','低成本和熟人网络提供机会。','隐私、关系债和市场规模同时限制增长。','你留下一个生意，或留下对故乡更真实的理解。']
];

function nodeStages(start){
  const order=Object.keys(stages);let idx=Math.max(0,order.indexOf(start));
  return Array.from({length:5},(_,i)=>order[Math.min(order.length-1,idx+i)]);
}
function makeChains(){
  const beatContext=['当时你还不知道，它会在多年后重新解释今天。','此前的选择开始产生真实成本，退出和继续都不再免费。','关系、资源与自我认知在这里出现了不同方向。','早年的路线进入长期结算，结果与当初想象并不完全相同。','你终于能从更远的位置理解这段经历留下了什么。'];
  return chainRows.map(([id,title,theme,conflict,start,premise,turn,echo],ci)=>({
    id,title,theme,mainConflicts:[conflict],weight:18,genderAffinity:maleSensitive.has(id)?'male':femaleSensitive.has(id)?'female':null,
    familyArchetypes:familyArchetypes.filter((_,i)=>i%12===ci%12).map(x=>x.id),
    nodes:nodeStages(start).map((stage,step)=>{
      const [ageMin,ageMax]=stages[stage];
      const beat=`${[premise,`事情继续发展：${turn}`,`你必须决定这条路线还要占据多少人生。`,turn,echo][step]}${beatContext[step]}`;
      return {
        id:`chain_${id}_${step+1}`,title:`${title} · ${['起点','第一次代价','路线分岔','长期结算','多年回响'][step]}`,
        icon:['◍','↗','◇','⏳','◎'][step],stage:[stage],ageMin,ageMax,gender:['male','female'],locations:[],familyArchetypes:[],familyClasses:[],requirements:{},
        weight:25+step*4,category:'mainline',themes:[theme],mainConflicts:[conflict],chainId:id,chainStep:step,exclusiveGroup:null,cooldown:0,maxPerLife:1,freshness:1,
        text:beat,variants:{},endingTags:[theme,conflict,id],choices:[
          {text:'继续投入',resultText:`你让《${title}》继续成为人生主线。`,requirements:{},effects:mergeEffects(themeEffects[theme]||themeEffects.identity,{flagsAdd:[`${id}_continue_${step}`],desires:{achievement:4,stability:2}})},
          {text:'重新谈条件',resultText:`你没有立刻退出，但改变了参与《${title}》的方式。`,requirements:{},effects:{hidden:{selfEsteem:5,information:3},desires:{freedom:5,peace:3},flagsAdd:[`${id}_boundary_${step}`]}},
          {text:'把生活转向别处',resultText:`这条线没有消失，只是不再拥有全部解释权。`,requirements:{},effects:{resources:{spirit:4},desires:{freedom:6,achievement:-2},flagsAdd:[`${id}_redirect_${step}`]}}
        ]
      };
    })
  }));
}

const endingTitleNames = ['终于不再证明','稳定服务终身会员','一个仍然有人记得的人','体面地活成了现金流','没有结婚，但没有孤独','家庭系统的最后一任管理员','从县城离开，又回到了县城','房产很多，自由很少','时代没有等你，但你也没有完全停下','被优化，但没有被格式化','一生都在上岸','从组织里毕业','把照护还给所有人','没有成功，但睡得很好','在熟人社会保持秘密','长期主义的意外受益者','把故乡重新变成选择','没有房本的安全感','终于允许自己休息','一份没有KPI的晚年','关系没有标准答案','把身体从工作里赎回','仍愿意学习的人','家庭群里最后的解释者','没有赢得时代，拿回了自己','资产很多，现金流很诚实','一位不再可靠的可靠先生','她不再参加完整女人考试','从担保人变回自己','在算法之外保留生活','有一些人知道你怎样泡茶','没有留下宏大故事','退休后重新有了名字','把自由用在了留下','拒绝成为家庭项目','把爱从责任里分出来','仍然相信具体的人','没有继承控制','身体记住了所有加班','与慢性病共同生活','房贷结束后才开始旅行','在第二份职业里活过来','不再把忙碌当价值','一生更换了三次故乡','把内部消息留在群里','晚年没有退出好奇心','一个谨慎但不封闭的人','关系很少，但都是真的','孩子没有成为你的绩效','从彩礼表格里走出来','没有买到完美安全','在小生意里理解周期','终于和父亲说了实话','照护者也被照护过','没有被孤独定价','把遗嘱说清楚的人','AI会回复，朋友会记得','仍然有人等你吃饭','在七十岁学会新界面','没有让一次失败解释一生','房子没有替你生活','普通得足够具体','系统仍无法判断幸福','人生没有加载完成'];
const endingTitles = endingTitleNames.map((title,i)=>({id:`ending_${String(i+1).padStart(2,'0')}`,title,themes:[[...Object.keys(themeEffects)][i%Object.keys(themeEffects).length]],weight:10}));

const origins = ['你从一个把稳定写在饭桌中央的家庭出发。','你出生的地方机会不多，熟人很多。','你很早就知道钱不只是数字，也是家里的语气。','你的童年物质充足，情绪说明书长期缺页。','你由祖辈和电话共同养大。','家里愿意爱你，却不总知道怎样表达。','你从一套账面体面的高负债生活出发。','你在一线城市的租约和学位之间长大。','你很早见过家庭角色并不平均。','你出生在一门小生意和一张饭桌之间。','你的家庭相信组织，也相信正确流程。','你从长期争吵里学会观察空气。','你获得过真实支持，因此没有把脆弱当失败。','你很早被当作家庭未来的一部分。','你在资源竞争中学会争取，也学会内疚。','你从一个边界很薄、关系很密的地方出发。'];
const conflictFragments = ['前半生不断在家庭控制与自主之间谈判。','你多次用稳定交换自由，又用自由怀念稳定。','你想被认可，也越来越想拥有安静。','城市提供机会，家庭持续发送责任。','财富目标向前走时，身体在后面记账。','你渴望亲密，又害怕把自己交给关系。','婚姻期待和个体自由长期使用同一张日历。','你照护很多人，也花了很久才把自己列入名单。','房产给你安全感，也限制了移动。','组织提供身份，同时延迟了你确认个人能力。','你想离开故乡，却从未真正取消与它的关系。','体面生活和真实欲望多次发生冲突。','传统角色要求你服从，你逐步学会协商。','你把成功当作爱的证明，后来才停止考试。','你害怕不确定，却没有完全放弃探索。','你在关系里学会边界，而非只学会离开。'];
const turns = ['一次早年的选择在中年重新回来，证明生活很少真正删除记录。','你经历职业停顿后，不再把岗位名称当成全部身份。','父母衰老让权力关系反转，你第一次可以温和地拒绝。','一段关系结束后，你没有沿用原来的生活方式。','身体发出连续警告后，你终于把休息视作行动。','旧兴趣在无人问津多年后重新成为入口。','你没有等到完美机会，而是在较差条件下换了方向。','一次照护经历改变了你对责任的理解。','房贷没有立刻摧毁生活，却长期改变了选择顺序。','你在离开组织后确认，能力并没有随工牌一起失效。','一位旧友让你记起简历之外的自己。','你曾相信内部消息，后来开始相信可核实的事实。','一次迁移没有解决全部问题，却扩大了可选范围。','你拒绝把一次背叛变成永久人格。','孩子或晚辈没有按计划成长，你因此学会放手。','晚年学习新工具，让好奇心重新获得具体形式。'];
const gains = ['你最终得到了一些不需要证明的关系。','你留下了可以迁移的能力，而不只是一段工龄。','你获得了不完美但可持续的现金流。','你保住了对新事物的好奇。','你终于拥有说“不”之后仍能继续生活的信心。','你得到了一种不以婚姻为唯一格式的亲密。','你留下了真实作品和少量真正理解它的人。','你拥有了与身体合作的晚年。','你重新获得了时间，而非只获得退休身份。','你与子女亲近，但没有把他们当养老项目。','你把家庭责任分回给了家庭。','你拥有一处住所，也保留了离开的能力。','你在社区和兴趣里获得新的名字。','你终于相信普通生活不需要宏大辩护。','你保存了几个能在夜里拨通的号码。','你学会把安全感放在多种东西里。'];
const losses = ['你失去了一部分健康，它们曾被写成敬业。','你错过了几次没有标准答案的可能。','一些关系在长期沉默中自然失效。','你为住房支付了比利息更多的自由。','你失去了一段被组织完整命名的人生。','你花了很多年满足并不属于自己的期待。','你与故乡的熟悉感没有完全回来。','一项旧技能被时代提前折旧。','你承担过本应由多人分担的照护。','你失去的钱没有全部回来，但判断力留下了。','你曾把身体当作无限续费的耗材。','一段亲密因为缺少诚实而结束。','你错过了某些陪伴，因为总以为以后有时间。','一些资产很值钱，却没有在需要时变成现金。','你放弃过一个喜欢但无法解释用途的兴趣。','你失去了一部分对权威的信任，也因此更自由。'];
const judgments = ['系统判断：你没有赢得时代，但最终拿回了自己。','系统判断：你得到稳定，也看清稳定从不免费。','系统判断：你的成功不够宏大，生活足够具体。','系统判断：你没有建立标准答案，却建立了可持续的日常。','系统判断：资产解释不了幸福，关系也不能替身体结算。','系统判断：你没有摆脱所有结构，但学会了辨认它们。','系统判断：你仍然有人记得，不只是因为你有用。','系统判断：自由不是随时离开，而是能够选择留下。','系统判断：你停止证明之后，人生才开始拥有自己的语气。','系统判断：你把部分坏运气停在了自己这一代。','系统判断：你没有完全理解幸福，至少不再交给别人定义。','系统判断：你用很多代价换来体面，最后也为自己留了位置。','系统判断：你接受身体有限，但没有让好奇心同时退休。','系统判断：你曾经失去方向，却没有把迷路当成人格。','系统判断：组织忘记了你的工号，具体的人仍记得你。','系统判断：人生没有加载完成，但已经足够成为一生。'];
const endingFragments={origins,conflicts:conflictFragments,turns,gains,losses,judgments};

const codexNames=['AI提效','组织优化','灵活就业','账面财富','稳定溢价','人情债','情绪价值','学历门槛','副业','婚恋审计','健康资产','熟人浓度','注意力市场','照护责任','风险敞口','工牌颜色','现金流','家庭边界','长期关系','数字孤独','内部消息','银发经济','平台劳动','性别期待','职业透明化','组织身份','迁移成本','房产流动性','成人灰度','晚年自主'];
const codex=codexNames.map((name,i)=>({id:`codex_${String(i+1).padStart(2,'0')}`,name,text:`${name}不是单一选择，而是一组资源、关系、概率和长期后果共同形成的结构。`}));

const data={
  schemaVersion:3,gameVersion:'3.0.0',stages,worldTags,locations,familyArchetypes,familySecrets,attributes,desires,mainConflicts,cards,
  eventChains:makeChains(),events:makeBaseEvents(),endingTitles,endingFragments,codex
};

fs.writeFileSync(path.join(root,'data.json'),JSON.stringify(data,null,2)+'\n','utf8');
console.log(JSON.stringify({
  events:data.events.length,chains:data.eventChains.length,chainNodes:data.eventChains.reduce((n,c)=>n+c.nodes.length,0),
  totalNodes:data.events.length+data.eventChains.reduce((n,c)=>n+c.nodes.length,0),families:data.familyArchetypes.length,secrets:data.familySecrets.length,
  cards:Object.fromEntries(Object.entries(data.cards).map(([k,v])=>[k,v.length])),endingTitles:data.endingTitles.length,
  endingFragments:Object.values(data.endingFragments).reduce((n,x)=>n+x.length,0)
},null,2));
