import {beat as b,choice as c,episodeDecision as e,track} from './helpers.mjs';

const p=(path,op,value)=>({path,op,value});
const req=(all=[],any=[],none=[])=>({all,any,none});
const add=(target,value)=>({type:'add',target,value});
const tag=(target,value)=>({type:'tag',target,value});
const retired=['retired','forced'];
const workHistory=req([p('employment.firstJobAge','neq',null)]);
const noWorkHistory=req([p('employment.firstJobAge','eq',null)]);
const childActors=[{slot:'child',relationAny:['child','adoptedChild','stepChild'],alive:true,optional:false}];
const partnerActors=[{slot:'partner',relation:'partner',alive:true,personIdPath:'relationships.activePartnerId',optional:false}];
const recurrence=key=>({key,sameEventYears:8,sameGroupYears:3});
const daily=(text,key,extra={})=>[text,{age:[60,105],recurrence:recurrence(key),effects:[],weight:7,...extra}];
const oneShot=(age,prompt,echoText,...choices)=>({
  age:[age[0],Math.min(age[1],103)],
  prompt,
  echoText,
  choices:choices.map(choice=>({consequenceDelay:1,...choice}))
});

const tx=[
 ['工作日的闹钟关掉以后，你花了几周才不在七点准时醒。',{age:[55,105],retirement:retired}],
 ['社区活动表贴在电梯里，你拍了一张。',{age:[60,105]}],
 ['工作群退掉以后，手机上午安静许多。',{age:[55,105],retirement:retired}],
 ['做过的那份工作偶尔还会出现在梦里，醒来却不用赶路。',{age:[55,105],requirements:workHistory}],
 ['体检日期写在月历上，旁边是买菜清单。',{age:[60,105]}],
 ['你学会用手机挂号，也会误点两次返回。',{age:[60,105]}],
 ['公园那条路修好了，长椅换了新的。',{age:[60,105]}],
 ['孩子来电话时，你刚把收音机声音调小。',{age:[60,105],actors:childActors}],
 ['返聘合同按月续，工牌颜色和从前不同。',{age:[55,105],retirement:['semiRetired']}],
 ['反诈讲座门口摆着小礼物，真正要听的内容藏在后半场。',{age:[60,105]}],
 ['有人听说你白天有空，顺手把三件事都托了过来。',{age:[55,105]}],
 ['短途旅行群出发前，把集合时间和退票规则说了三遍。',{age:[60,105],retirement:['retired','semiRetired','forced']}],
 ['广场舞音响很大，队伍仍分不清左右。',{age:[60,105]}],
 ['旧工作留下的号码忽然来电，你看了几秒才想起是谁。',{age:[55,105],requirements:workHistory}],
 ['遗嘱公证预约很难抢，弹窗广告倒先出现。',{age:[60,105],willContext:true}],
 ['紧急联系人改成孩子后，对方回了一个收到。',{age:[60,105],actors:childActors}],
 ['房东发来续租消息，你先看了看下一年的预算。',{age:[60,105],requirements:req([p('housing.status','eq','renting')])}],
 ['从没被工作日历管住过的人，也要重新回答：这段时间算什么。',{age:[55,105],requirements:noWorkHistory}],
 ['常去的小店换了招牌，你走过门口才发现已经停业。',{age:[60,105]}],
 ['返聘单位临时加班，你第一次直接说不去。',{age:[55,105],retirement:['semiRetired']}],
 ['孩子提起同住，你先问能不能保留一扇只由自己关的门。',{age:[60,105],actors:childActors}],
 ['陪诊预约要求填联系人，你先把哪些事需要帮忙说清楚。',{age:[60,105],healthContext:true}],
 ['伴侣记不清药名，你把药盒重新贴了标签。',{age:[60,105],healthContext:true,actors:partnerActors,requirements:req([p('relationships.partnerStatus','in',['dating','partnered','married'])])}],
 ['遗嘱里的旧账户注销了，文件又重做一遍。',{age:[60,105],willContext:true}],
 ['淋浴凳送到以后，洗澡这件事又能由你自己慢慢完成。',{age:[60,105],healthContext:true}],
 ['照护账单涨了，你把本月能减的开支重新圈了一遍。',{age:[60,105],healthContext:true,effects:[add('finance.cash',-3000),add('pressures.money',3)]}],
 ['反诈电话来得及时，转账页面停在最后一步。',{age:[60,105],effects:[add('capabilities.riskSense',1)]}],
 ['手机一整天都很热闹，却没有一句是你真想回的。',{age:[60,105],requirements:req([p('pressures.loneliness','gte',30)])}],
 ['一张表要求授权签字，你把还能自己决定的部分逐项圈出来。',{age:[60,105],healthContext:true}],
 ['治疗讨论越说越快，你把自己的选择重新念了一遍。',{age:[60,105],healthContext:true}],
 ['重要文件分散在几个抽屉里，你先写了一张位置清单。',{age:[65,105],endOfLifeContext:true}],
 ['治疗目标改成保住还能做的事，日历上的普通安排没有停。',{age:[65,105],requirements:req([p('health.status','in',['treating','managed','limited'])])}],

 daily('买菜清单写到一半，你先把冰箱里快蔫的菜挪到最前面。','later.errands'),
 daily('自助机又让你扫一次码，你退回去找到了人工窗口的号码牌。','later.errands'),
 daily('常坐的那班车临时改道，你在站牌前多等了一会儿。','later.errands'),
 daily('水电账单到了，你把几个自动扣款的日期重新排开。','later.errands'),

 daily('验证码刚看清就过期了，你关掉页面，喝口水再来一遍。','later.digital_learning'),
 daily('线上课讲到一半卡住，你在纸上先写下了没听懂的地方。','later.digital_learning'),
 daily('手机弹出一串权限，你没有急着点同意，先逐项看了一遍。','later.digital_learning'),
 daily('图书馆的新机器认不出旧借书证，工作人员给了你一张手写号。','later.digital_learning'),

 daily('早餐比昨天晚了一个钟头，煎蛋边缘反而刚好脆。','later.daily_pleasure'),
 daily('一件颜色很亮的衣服挂在镜子前，你试了又试，还是买下了。','later.daily_pleasure'),
 daily('数独本做到最后两格，你故意留到明天再填。','later.daily_pleasure'),
 daily('下午忽然下雨，你把原来的安排取消，坐着听完了一整场。','later.daily_pleasure'),

 daily('一个人吃完饭，你没开电视，也不觉得屋里少了什么。','later.solitude_participation'),
 daily('活动室门开着，你在门口看了一会儿，决定今天只坐半小时。','later.solitude_participation'),
 daily('有人劝你多参加活动，你笑着说今天想自己待着。','later.solitude_participation'),
 daily('周围说话声很多，你却找不到一句想接的话。','later.solitude_participation',{requirements:req([p('pressures.loneliness','gte',25)])})
];

const decisions=[
 e({id:'retirement_transition',lane:'later',phase:1,role:'start',delayYears:1,deadlineYears:2},
   '工作还在继续，但工时、收入缺口和身体负担已经不再适合含糊带过。你把现在能做多久、少做多少会差多少钱，放到同一张纸上。',
   '先从哪一项开始谈？','那张纸后来成了工作转段的依据。',
   c('把工作量和缺口算清','你把工时、收入、债务和日常开销逐项核对，没把年龄当成待遇证明。','下一次谈去留时，手里有了自己的数字。'),
   c('谈一段有期限的减量','你把少做哪些、做到哪天和怎样交接写了下来。','工作还在，边界先有了日期。'),
   c('先定下次复核日期','眼下继续做，但你写下了再次核对收入和身体负担的时间。','继续不是无限往后拖。')),
 e({id:'retirement_transition',lane:'later',phase:2,role:'resolve',delayYears:0,deadlineYears:2},
   '一年后，实际收入、工作量和身体反应都有了记录。接下来怎么做，不能再只靠一句“先这样”。',
   '这次工作转段，最后怎么定？','工作和日常终于不再抢同一块模糊的时间。',
   c('停下来，重新排日子','你完成交接，关掉工作提醒，先把吃饭、看病和自己的安排放回日历。','收入变了，星期一也第一次不再属于工作。'),
   c('减到有边界的少量工作','你只接有期限、有范围的活，做完再决定下一段。','别人再说“顺手帮忙”，合同也不会自动续上。'),
   c('继续做，留下复核点','你保留现在的工作，也把下次检查工时、收入和身体负担的日期写好。','继续工作是当下的选择，不是默认答案。'),
   c('岗位或身体已经撑不住','工作没法照原样继续。你完成能做的交接，先压住支出和最急的日常。','这不是原计划，但退出也有了明确起点。')),
 e({id:'parental_inheritance',lane:'later',phase:1,role:'start',delayYears:1,deadlineYears:2},
   '父母去世后，旧钥匙、死亡证明、账户资料和欠款通知一起到了。遗产有多少、债有多少、还涉及谁，目前都没有查清。',
   '先碰什么？','那串旧钥匙先和资产、债务清单放在了一起。',
   c('查登记、债务和相关方','你先核对文件和登记，不把口头说法当成已经属于自己的东西。','下一次沟通时，大家至少面对同一份清单。'),
   c('东西不动，委托核对','账户和物件先不处理。你把委托范围、文件和保管位置分别登记。','哪些能办、哪些有争议，逐项显了出来。'),
   c('准备放弃，先别动遗产','你没有提取账户或转卖物件，先确认正式程序和期限。','有人催签字时，你仍保留完整决定。')),
 e({id:'parental_inheritance',lane:'later',phase:2,role:'resolve',delayYears:0,deadlineYears:2},
   '遗产、债务和可能相关的继承方已经查到能够处理的范围。账户、旧物和没解决的争议都要在期限内有个去向。',
   '父母留下的东西，最后怎么处理？','资产、债务和旧物不再只是“以后再说”。',
   c('按清点范围接受','你按确认范围处理债务和交割，凭证全部留了下来。','真正到账的和传言不同，手续却终于交接完了。'),
   c('只处理确认的部分','能确认的物件和小额资产先办，争议部分另立清单。','结论有限，但没有继续占住全部生活。'),
   c('依法放弃','你完成正式放弃，没有因为催促就先动东西。','旧钥匙还了回去，这次没有取得财产。'),
   c('转入正式争议处理','口头协商已经走不下去。你停了私下分配，保留现有证据。','关系未必修好，东西却不再由谁先拿到算谁的。')),
 e({id:'long_term_care',lane:'later',phase:1,role:'start',delayYears:1,deadlineYears:4},
   '洗澡、穿衣、走路、吃饭或按时用药，已有几件事需要协助。评估表摆在桌上，哪些还能自己做、哪些愿意让人帮，要由你来说明。',
   '先怎么确认需要什么？','那份评估把“还能撑”拆成了具体的事。',
   c('做功能与照护评估','你把能独立完成和需要协助的事逐项说明，也问清可用服务的边界。','结论下来后，帮助不再靠别人猜。'),
   c('先补最急的辅助工具','照明、洗澡椅和紧急呼叫先到位，正式评估的预约仍保留。','几件事先容易了，长期缺口也记了下来。'),
   c('暂时不评估','你取消预约，写下哪些帮助目前不接受，也保留重新联系的方式。','困难没有消失，决定权也没有一起交出去。')),
 e({id:'long_term_care',lane:'later',phase:2,role:'continue',delayYears:1,deadlineYears:4},
   '评估结果下来了。上门服务、现有照护者、社区资源和机构各有费用与限度；夜里和去医院的空缺仍要有人面对。',
   '这些帮助怎么落进每天？','第一轮真实排班把纸上的缺口都照了出来。',
   c('把服务和现有帮助搭起来','上门、陪诊、采购和紧急联系人分别安排，没有把全部任务压给一个人。','临时有人来不了时，替代方式还能接上。'),
   c('选择短期机构服务','你核对服务、费用和医疗衔接后，先安排一个短期照护周期。','这段时间有人接住日常，之后仍要按实际情况复评。'),
   c('只留一名固定照护者','一个人接下大部分工作，没有另外购买服务。','几个月后，那个人的休息也成了必须面对的缺口。')),
 e({id:'long_term_care',lane:'later',phase:3,role:'resolve',delayYears:0,deadlineYears:4},
   '照护已经走了两年。费用、身体变化、服务质量和照护者负担都有记录，原来的办法也可能不再合适。',
   '这次照护，怎么继续？','照护不再只靠临时救火。',
   c('保留有效部分，定期复评','能用的服务留下，复评日期和紧急替代方式也写好。','日常有了连续性，不必每次从头解释。'),
   c('身体变了，换个模式','原有帮助已经不够。你重新选择服务强度或机构。','交接很累，新的日常仍慢慢接了起来。'),
   c('缩到最低，留求助入口','预算只够保留最必要的上门、辅具和紧急联系。','日子勉强走，重新申请的入口还在。'),
   c('固定照护者撑不住了','那个人无法继续全包。你停止默认续下去，改用现有能找到的服务。','关系留下疲惫，照护却不再靠沉默维持。')),
 e({id:'will_planning',lane:'later',phase:1,role:'start',delayYears:1,deadlineYears:2},
   '账户、欠款、想留下的物件和重要文件散在不同地方。医疗意愿也需要另行记录，不能和财产混成一张纸。',
   '先从哪里理？','那份清单先让重要东西有了位置。',
   c('列出账户、债务和物件','你核对仍有效的账户、欠款和物件，发现一项旧信息需要更新。','正式写时，不会把已经失效的内容继续放进去。'),
   c('先理最重要的，医疗另记','关键文件和需要使用的联系渠道先记好，医疗沟通单独放在另一处。','两类文件互不冒充，也各自找得到。'),
   c('先处理权属和债务','有些东西还说不清。你没有用一份模糊文件盖过去，先列出待办。','遗嘱没写完，最容易冲突的部分先动了。')),
 e({id:'will_planning',lane:'later',phase:2,role:'resolve',delayYears:0,deadlineYears:2},
   '清单理完了。怎么签、如何更新、原件放哪、怎样在需要时找到，都要落实；口头交代不能替代正式文件。',
   '这次怎么落定？','文件有了清楚状态和存放位置。',
   c('按要求签好并留位置','你完成签署与见证，把原件位置和查找方式分别记好。','以后账户变化，文件也要一起复查。'),
   c('先完成能确认的部分','能定的先签，权属不清的留出明确缺口和补办日期。','文件不全，但不会让人误以为全部办妥。'),
   c('暂不签，写明原因','你停下这轮签署，把未完成原因和资料位置写清。','风险仍在，却没有多出一份含糊文件。'),
   c('条件变了，旧稿作废','账户或见证条件变化，你标记旧稿作废并收回副本。','旧版本不再继续流转。')),

 oneShot([60,105],'热门课程只剩候补。报名页催你尽快确认，真正想学的那门却不知道什么时候有空位。','后来再看到候补两个字，你已经有了自己的处理办法。',
   c('等候补','你保留名额，也给自己定了不再等的日期。','名额后来空出时，你没有把整段时间都押在它身上。',{route:'waitlisted',effects:[],consequenceEffects:[add('agency',1),tag('history','echo:later')]}),
   c('换一门冷门课','你选了人少的课程，第一节就坐到了前排。','原本只是替代的东西，后来真学了进去。',{route:'alternative',effects:[add('capabilities.learning',1)],consequenceEffects:[add('capabilities.learning',1),tag('history','echo:later')]}),
   c('按自己的办法学','你找来书和公开视频，把进度写在纸上。','没人点名，学过的那几页仍留了下来。',{route:'self_taught',effects:[add('capabilities.learning',1)],consequenceEffects:[add('capabilities.learning',1),tag('history','echo:later')]}),
   c('这次不报','你关掉报名页，把时间留给别的事。','空下来的下午没有自动变成浪费。',{route:'declined',effects:[add('desires.peace.fulfillment',1)],consequenceEffects:[add('desires.peace.fulfillment',1),tag('history','echo:later')]})),
 oneShot([55,105],'有人听说你“时间多”，想把一件临时帮忙变成每周固定安排。你不讨厌这件事，只是不想默认答应。','那次谈过以后，“有空”不再等于随时都能叫到你。',
   c('固定接下来','你答应固定时段，其他时间仍按自己的安排走。','被需要有了位置，也占掉了固定的一块时间。',{route:'regular',effects:[add('pressures.family',2)],consequenceEffects:[add('agency',1),tag('history','echo:later')]}),
   c('只帮这一次','你把这次做完，也明确没有下一次默认续上。','人情留住了，日历没有跟着被接管。',{route:'once',effects:[add('capabilities.boundary',1)],consequenceEffects:[add('capabilities.boundary',1),tag('history','echo:later')]}),
   c('先谈清边界','你问清频率、结束日期和临时变动怎么说。','真正能长期做的部分反而更清楚。',{route:'bounded',effects:[add('capabilities.boundary',2)],consequenceEffects:[add('capabilities.boundary',1),tag('history','echo:later')]}),
   c('直接拒绝','你没有编借口，只说这件事不接。','对方有点失望，你的时间仍归自己。',{route:'refused',effects:[add('capabilities.boundary',2),add('pressures.family',1)],consequenceEffects:[add('desires.peace.fulfillment',1),tag('history','echo:later')]})),
 oneShot([60,105],'一个账号连续几周记得你说过的小事，也总在固定时间回应。最近对方开始要求保密，说只差一笔钱就能解决麻烦。','那段每天准时出现的回应，后来和付款请求一起留在了记忆里。',
   c('设预算，继续看','你把它当付费娱乐，只用预先划出的那点钱。','回应还在，但它不能再越过你定下的数字。',{route:'budgeted',effects:[add('finance.cash',-300),add('capabilities.riskSense',1)],consequenceEffects:[add('capabilities.riskSense',1),tag('history','echo:later')]}),
   c('去公开渠道核验','你保存聊天记录，从公开信息核对身份和说法。','一些细节对不上，信任没有替证据作主。',{route:'verified',effects:[add('capabilities.riskSense',3),add('pressures.loneliness',1)],consequenceEffects:[add('capabilities.riskSense',1),tag('history','echo:later')]}),
   c('停止付款并举报','你关掉付款入口，保留记录后提交投诉。','固定回应突然消失，安静下来也需要适应。',{route:'reported',effects:[add('capabilities.riskSense',2),add('pressures.loneliness',2)],consequenceEffects:[add('capabilities.riskSense',1),add('pressures.loneliness',1),tag('history','echo:later')]}),
   c('相信对方并付款','你转了钱，随后等来的解释越来越短。','意识到损失后，你先保存记录，再决定告诉谁。',{route:'paid',effects:[add('finance.cash',-12000),add('pressures.money',6),add('pressures.loneliness',4)],consequenceEffects:[add('pressures.money',2),tag('history','echo:later')]})),
 oneShot([60,105],'免费礼物和健康讲座把你带进一个封闭群。里面轮番发“专家”语音、限时名额和退款承诺，你已经付过一笔订金。','退出那张群聊以后，健康焦虑和每天的热闹并没有同时消失。',
   c('查公开信息','你把宣传词逐项拿去公开渠道核对，先不补尾款。','群里说得最满的几项，反而找不到可靠出处。',{route:'verified',effects:[add('finance.cash',-500),add('capabilities.healthLiteracy',2),add('capabilities.riskSense',2)],consequenceEffects:[add('capabilities.healthLiteracy',1),tag('history','echo:later')]}),
   c('只收少量试用','你不加购，只接受订金范围内的一份货。','宣传里的承诺仍没有因此成真，你把后续支出截住了。',{route:'limited',effects:[add('finance.cash',-500),add('pressures.money',1)],consequenceEffects:[add('pressures.money',1),tag('history','echo:later')]}),
   c('退出群聊止损','你关掉提醒，不再参加下一场活动。','每天的问候一起停了，清静和空落同时来了。',{route:'exited',effects:[add('finance.cash',-500),add('capabilities.riskSense',1),add('pressures.loneliness',2)],consequenceEffects:[add('pressures.loneliness',1),tag('history','echo:later')]}),
   c('留证退款投诉','你保存订单、语音和承诺，按公开入口申请退款。','款项未必立刻回来，但对方不能再只靠口头拖延。',{route:'refunded',effects:[add('finance.cash',-500),add('capabilities.riskSense',2),add('pressures.money',-1)],consequenceEffects:[add('capabilities.riskSense',1),tag('history','echo:later')]}))
];

export const LATER_COPY=track(
  '晚年生活',
  tx.map(([text,extra],index)=>b(index<12?'ordinary':index<24?'awkward':index<40?'friction':'pressure',text,extra)),
  decisions
);
