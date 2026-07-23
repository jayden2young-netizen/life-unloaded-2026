import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const output=path.join(here,'..','data.json');
const VERSION='5.0.4',SCHEMA_VERSION=7,CONTENT_REVISION=7;
const stages={infancy:[0,5],childhood:[6,12],adolescence:[13,18],youth:[19,29],establishment:[30,44],midlife:[45,59],later:[60,74],elder:[75,105]};
const stageNames=Object.keys(stages);
const stageFor=(min,max)=>stageNames.filter(name=>Math.max(min,stages[name][0])<=Math.min(max,stages[name][1]));
const p=(path,op,value)=>({path,op,value});
const c=(type,target,value,extra={})=>({type,target,value,...extra});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

const locations=[
  {id:'tier1',name:'一线城市',weight:14,mods:{cost:135,education:118,medical:120,network:120,mobility:125}},
  {id:'tier2',name:'二线城市',weight:24,mods:{cost:112,education:108,medical:108,network:106,mobility:108}},
  {id:'county',name:'县城',weight:32,mods:{cost:90,education:92,medical:88,network:98,mobility:85}},
  {id:'town',name:'乡镇',weight:30,mods:{cost:76,education:78,medical:76,network:92,mobility:70}}
];

const desires={freedom:{name:'自由'},security:{name:'安全'},achievement:{name:'成就'},wealth:{name:'财富'},love:{name:'亲密'},familyBelonging:{name:'归属'},recognition:{name:'认可'},exploration:{name:'探索'},peace:{name:'安宁'},care:{name:'照护'},body:{name:'身体'},status:{name:'地位'},creation:{name:'创造'}};
const conflicts=[
  {id:'freedom_belonging',name:'离开还是留下',desires:['freedom','familyBelonging']},
  {id:'security_achievement',name:'稳妥还是冒险',desires:['security','achievement']},
  {id:'love_self',name:'亲密还是边界',desires:['love','freedom']},
  {id:'wealth_peace',name:'更多还是够用',desires:['wealth','peace']},
  {id:'recognition_creation',name:'被看见还是做自己',desires:['recognition','creation']},
  {id:'care_body',name:'照顾别人还是保住自己',desires:['care','body']}
];

const familyNames=['城郊双职工家庭','县城小生意家庭','乡镇务农家庭','一线城市新市民家庭','教师家庭','医护家庭','个体运输家庭','基层公职家庭','工厂职工家庭','单亲务工家庭','隔代照护家庭','多子女经营家庭','技术工人家庭','自由职业家庭','小城房产家庭','返乡创业家庭','外出经商家庭','社区服务家庭','文艺从业家庭','平台劳动家庭','负债置业家庭','拆迁安置家庭','稳定储蓄家庭','高控制家庭','低表达家庭','照护压力家庭','跨城婚姻家庭','流动租住家庭','小康专业家庭','隐性债务家庭'];
const familyClasses=['working','smallBusiness','rural','newUrban','professional'];
const jobPools={working:['工厂职工','门店店员','物流司机','物业人员'],smallBusiness:['小店经营者','餐饮经营者','个体运输者','维修店主'],rural:['务农者','乡镇工人','村医助理','农机手'],newUrban:['平台骑手','客服人员','建筑工人','家政人员'],professional:['教师','护士','工程技术员','基层职员']};
const familyArchetypes=familyNames.map((name,index)=>{
  const familyClass=familyClasses[index%5],single=/单亲/.test(name),multi=/多子女/.test(name),debt=/负债|债务|经营/.test(name),rural=/乡镇|务农|返乡/.test(name);
  return{id:`family_${String(index+1).padStart(2,'0')}`,name,familyClass,weight:10+index%4,locationAffinity:rural?['county','town']:index%3===0?['tier1','tier2']:['tier2','county'],parentCount:single?1:2,siblingRange:multi?[2,3]:index%4===0?[1,2]:[0,1],housingOptions:rural?['自建房','老宅']:index%3===0?['租住房','按揭商品房']:['单位住房','老城区住房','按揭商品房'],assetRange:rural?[30000,260000]:[20000+(index%5)*20000,180000+(index%4)*120000],debtRange:debt?[80000,480000]:[0,90000],cashflow:clamp(34+(index*7)%58,20,92),control:/高控制|基层公职/.test(name)?78:clamp(30+(index*11)%55,20,82),expression:clamp(28+(index*13)%60,20,88),careBurden:/照护|隔代/.test(name)?82:clamp(25+(index*9)%55,15,80),riskTolerance:clamp(24+(index*17)%68,15,90),digitalLiteracy:clamp(20+(index*19)%70,15,92),parentJobs:jobPools[familyClass],advantages:[index%2?'互相照应':'信息较早',index%3?'能吃苦':'有稳定住房'],risks:[debt?'隐性债务':index%2?'照护责任':'现金流波动'],lateEcho:index%2?'晚年时，旧家庭分工又回到饭桌上。':'父母留下的一件物品重新定义了你对家的理解。',contentRevision:CONTENT_REVISION};
});

const secretSubjects=['一笔未结清的经营贷款','父亲替亲戚做过的担保','母亲中断过的升学计划','一套没有完成过户的房子','一段长期隐瞒的失业期','祖辈留下的慢性病史','父母分开保管的账本','一笔被当作存款的保险','从未告诉你的同父异母手足','家里替别人垫付的医药费','小店真实的月度流水','父母婚姻中的长期分居','被借走多年没有归还的钱','一次失败加盟留下的设备','家里一直代管的压岁钱','一份缴费年限不足的社保记录','父母曾拒绝的一次迁城机会','旧房实际存在的产权争议','母亲长期服药的原因','父亲戒酒前的那几年','亲戚名下却由家里偿还的车','一份被藏起的录取通知书','祖父母真正承担的育儿费用','家里给弟妹预留的教育金','父母没有说出口的离婚协议','一次工伤后的补偿款','家里坚持保留的小额现金','被注销前仍欠费的公司','父母替你准备的首付款来源','一笔无法继承的集体资产','家里真正依赖的兼职收入','一张写错受益人的保单','亲戚口中的稳赚项目','父母共同隐瞒的信用卡账单','一处长期空置的县城门面','家庭成员真实的照护诊断','父亲交出的银行卡密码','母亲保存的租房收据','一次没有报警的网络诈骗','家里不愿提起的借名买房','一项被夸大的职业资格','祖辈口头承诺的遗产','小生意欠下的供应商货款','父母彼此都以为对方知道的秘密'];
const familySecrets=secretSubjects.map((subject,index)=>({id:`secret_${String(index+1).padStart(2,'0')}`,name:subject,text:`你看到${subject}的原始凭据，家庭说法第一次和数字对上。`,age:15+(index*7)%51,familyClasses:[familyClasses[index%5],familyClasses[(index+2)%5]],requirements:{all:[],any:[],none:[]},effects:[index%4===0?c('add','originHousehold.debt',25000):c('add','finance.cash',(index%3-1)*6000),c('add','pressures.family',index%2?6:-2),c('add','relationships.originBond',index%3?-3:2),c('tag','history',`secret:${index+1}`)],contentRevision:CONTENT_REVISION}));

const track=(label,lane,age,gate,objects,actions,prompts,verbs)=>({label,lane,age,gate,objects,actions,prompts,verbs});
const TRACKS={};
TRACKS.education=track('教育与能力','personal',[5,45],[],['课桌里那张志愿表','实训室的旧机床','补习班门口的折叠凳','图书馆到期的借书单','报名网站灰色的按钮','老师改了三遍的推荐信','夜校教室最后一排','证书考试的塑封袋'],['被你折了三次。','在雨天留下指印。','旁边多了一行铅笔字。','后来成了报名凭证。'],['老师让你在普高和职校之间签字。','录取结果和家里的预算同时到了。','专业不合适，但转专业要多读一年。','一张行业证书要花掉半年的周末。','你可以停学工作，也可以借钱继续。','单位愿意报销进修，但要签服务期。','失业后，夜校给你留了一个名额。','四十岁时，你又收到一封入学通知。'],[['选更难但更远的路','先把费用和回报算清','选择能尽快工作的路线'],['接受录取并承担费用','申请资助再决定','放弃这次机会'],['补齐课程申请转专业','读完现有专业再转向','直接退学开始工作'],['报名并固定学习时间','先找真实从业者核实','不为证书停下生活'],['借款继续完成学业','边工作边读','暂停学业保住现金'],['签服务期换取进修','自己付费保留自由','拒绝绑定并自学'],['去夜校重建技能','接零工慢慢学习','暂时只处理眼前账单'],['重新成为学生','只选短期课程','把名额留在邮件里']]);
TRACKS.employment=track('受雇工作','career',[18,68],[p('education.status','notIn',['notStarted','enrolled'])],['工牌背面的排班表','会议室没擦净的白板','工资条最下面一行','同事抽屉里的离职信','电梯口贴出的组织架构','电脑里锁住的绩效表','午休时响起的招聘电话','合同最后一页的空格'],['比职位名称更诚实。','在加班后显得更清楚。','旁边多了一个手写问号。','后来决定了你去哪一层。'],['一份工作发来录用通知，但试用期工资很低。','领导提出涨薪，同时把周末写进职责。','公司开始裁员，你可以转岗或拿补偿。','猎头给出更高薪资，但合同只有一年。','你被要求替团队承担一次失误。','晋升意味着开始管理曾经的同事。','行业收缩，单位鼓励无薪休假。','退休前，公司希望你留下带新人。'],[['接受并积累经验','谈清工资和转正条件','拒绝后继续求职'],['接受职位和新增责任','只接受明确的工作边界','放弃涨薪保住时间'],['内部转岗','核对补偿后离开','主动辞职转行'],['跳槽承担合同风险','拿报价和现单位谈判','留在原岗位'],['保存证据如实说明','私下补救保住团队','替上级签字承担'],['接受管理岗位','只做专业路线','拒绝晋升'],['休假并学习新技能','要求依法处理合同','先离职再说'],['返聘并约定期限','只做短期顾问','按计划退休']]);
TRACKS.public=track('公共职业','career',[18,65],[p('education.level','gte',3)],['报名表上的基层岗位','政审材料的牛皮纸袋','窗口边磨白的号码牌','值班室没有关的台灯','群众递来的旧文件袋','调岗名单上的铅笔圈','考核表里的空白格','退休审批旁的缴费记录'],['被订书机咬出一个角。','在下班后仍压着桌面。','旁边放着一杯凉透的茶。','后来比口号更难处理。'],['考公报名只剩一个偏远岗位。','资格审查要求你补齐学历和经历材料。','基层岗位稳定，但三年内不能调动。','熟人希望你在规则边缘帮一次忙。','晋升机会要求长期异地驻点。','一次投诉把窗口和个人同时推到台前。','你可以留在体制内，也可放弃编制转行。','退休手续发现缴费记录少了一段。'],[['报名并接受地点','再准备一年扩大选择','放弃考试进入市场'],['逐项补齐真实材料','咨询后更正经历','放弃这次报名'],['接受岗位和服务期','争取书面调动条件','不为稳定签下三年'],['按流程拒绝','只提供公开信息','冒险替熟人操作'],['接受驻点换晋升','留在原岗位','离开公共部门'],['公开材料承担解释','内部处理减少影响','辞职避开后续'],['保留编制继续工作','办停薪安排再判断','辞职转向新行业'],['补缴并延后退休','申请复核记录','接受较低待遇退休']]);
TRACKS.remote=track('远程与迁移','career',[20,65],[p('capabilities.portableSkill','gte',1)],['视频会议里冻结的半张脸','短租房门后的路由器','客户发来的时区换算表','平台后台跳动的结算数字','咖啡店只剩一个插座','行李箱里的第二块屏幕','签证页快到期的日期','固定城市刚装好的书桌'],['让一天从凌晨开始。','比旅行照片更占位置。','在关机后仍亮着。','后来成了你留下的理由。'],['你得到一份可以远程完成的合同。','你要在居家、国内旅居和海外旅居中选择。','客户要求你长期配合另一个时区。','平台突然修改抽成和推荐规则。','收入尚可，但你已经几周没有见人。','你可以把旅居生活做成公开内容。','签证与汇率同时收紧。','你需要决定继续漂流还是建立固定基地。'],[['核对合同后接受','保留本地工作做混合模式','拒绝不稳定合同'],['国内低成本旅居','海外旅居承担手续','留在家中远程'],['提高报价限制时区','接受时差换取合同','退出这个客户'],['把客户带到独立渠道','继续依赖平台流量','转回本地工作'],['安排固定线下生活','继续独处提高产量','回办公室工作'],['有限分享并保留隐私','把生活完全内容化','不把生活变成产品'],['回国建立基地','承担成本继续海外','暂停远程合同'],['租下长期住处','继续按季节迁移','回到原来的城市']]);
TRACKS.business=track('经营与财富','career',[22,70],[p('finance.available','gte',5000)],['样板店发亮的收银台','供应商盖章的进货单','装修报价最后一页','后台看不到来源的流水','亲友群里的老板称呼','仓库里没拆封的设备','股权协议右下角的比例','审计报告里缩小的数字'],['比开业花篮留得更久。','在月底重新算了一遍。','旁边压着一张个人担保。','后来决定你还能不能退出。'],['有人邀请你加盟正在走红的品牌。','总部只带你参观一间样板店。','开店资金可以来自积蓄、家人或高息借款。','门店连续亏损，总部建议继续投流。','你发现强制采购吃掉了大部分毛利。','独立经营出现增长，投资人提出换取股权。','企业开始跨城扩张，但现金流跟不上估值。','你已站在财富顶端，控制权却越来越薄。'],[['先做小规模测试','核对真实门店流水','直接签约抢位置'],['联系退出加盟的店主','只相信总部数据','结束考察'],['只投入可承受的积蓄','接受家庭共同投资','签个人担保借款'],['关店及时止损','脱离品牌独立经营','继续借款投流'],['谈判取消强制采购','缩小菜单保住现金','继续按总部要求进货'],['融资但保留控制条款','拒绝融资稳步增长','出售多数股权'],['停止扩张修复现金流','融资继续抢市场','出售部分业务'],['保住控制权放慢增长','继续融资冲击全球市场','退出经营兑现财富']]);
TRACKS.leisure=track('不工作与自由','personal',[18,70],[],['游戏存档旁的闹钟','工作日空着的地铁站','父母转来的生活费','半年没有更新的简历','廉价旅馆的延住单','朋友问起工作的停顿','银行卡自动扣款提醒','重新排满的一周日历'],['让上午变得很长。','比假期更难命名。','在月底显出真实价格。','后来成了主动或被动的分界。'],['你想用一年时间什么工作都不做。','家里愿意继续供养，但要定期汇报生活。','伴侣可以承担开支，却希望你接手家务。','储蓄只够再维持六个月。','你开始分不清休息和逃避。','朋友邀请你参与一个低强度项目。','长期空档开始影响重新就业。','你要决定继续闲置、重新工作或换一种生活。'],[['设定预算和结束日期','立刻辞职尽情生活','保留兼职再休息'],['接受支持并谈清边界','接受钱也接受汇报','拒绝支持自己承担'],['承担家务建立交换','只接受经济支持','重新寻找收入'],['缩减开支延长自由','借钱维持现在生活','结束休息开始求职'],['寻求帮助重建作息','继续把日子交给屏幕','出门旅行换环境'],['参与项目保持手感','拒绝任何工作安排','把项目变成长期职业'],['补技能解释空档','从基层岗位重新开始','继续等待理想机会'],['保留自由但建立收入','回到全职工作','继续不工作接受后果']]);
TRACKS.partnership=track('亲密关系','family',[16,90],[],['两个人共用的购物清单','没发出去的晚安消息','租房合同上的两个名字','纪念日订错的那张票','争吵后留在桌上的钥匙','家庭群里没回应的问题','离婚协议夹着的照片','病房外另一把折叠椅'],['比承诺更早暴露习惯。','在沉默里变得更重。','旁边多了一笔共同支出。','后来决定谁还愿意留下。'],['你和一个人开始认真讨论关系。','同居能省房租，也会合并大量日常。','对方希望结婚，你更在意边界。','共同账户出现一笔没有说明的支出。','工作迁移让你们必须异地或同行。','关系长期消耗，分开也有现实成本。','离婚后，对方提出重新建立联系。','晚年时，有人愿意与你共同生活。'],[['认真开始并说明期待','保持约会不急于承诺','结束暧昧保留空间'],['同居但保留独立账户','完全合并生活','暂不共同居住'],['登记并写清财务边界','保持伴侣关系不登记','结束关系'],['一起核对账目','先隐瞒自己的支出','各自收回账户权限'],['一起迁移承担代价','异地维持关系','结束关系各自生活'],['接受咨询尝试修复','分居一段时间','正式结束关系'],['保持礼貌但不复合','重新约会慢慢判断','彻底断开联系'],['共同生活保留照护协议','只做互助朋友','选择独自生活']]);
TRACKS.children=track('子女与代际','family',[20,90],[],['体检单上的复查日期','幼儿园门口的小水壶','家长群里刷新的通知','补习班退费的收据','孩子锁住的房门','志愿表上陌生的专业','第一份工资的转账截图','空房间里留下的旧书桌'],['让家庭计划停了一下。','比预算表多出一行。','旁边写着孩子自己的意见。','后来照见了你小时候。'],['你们开始讨论要不要成为父母。','生育计划遇到健康和时间问题。','一个孩子进入家庭，照护由谁承担仍未决定。','孩子上学后，教育投入开始挤压生活。','青春期的孩子要求更多隐私和自主。','孩子选择一条你认为不稳定的道路。','成年孩子想用兼职收入去旅行。','晚年时，你需要决定是否期待孩子照护。'],[['准备成为父母','了解收养等其他路径','明确选择无子女'],['接受治疗和不确定性','暂停计划保住身体','结束生育计划'],['共同分担并购买服务','由一人暂停工作照护','主要交给祖辈'],['按能力提供教育资源','减少投入保住家庭生活','借钱追逐更好机会'],['承认边界重新约定规则','加强监督查看设备','暂时不介入'],['支持选择并设风险底线','要求走稳定路线','让孩子自己承担全部后果'],['尊重孩子花自己的钱','资助但要求查看账目','阻止旅行要求存钱'],['提前签订照护和财务安排','默认孩子会负责','安排社会化养老']]);
TRACKS.finance=track('住房与债务','career',[18,100],[],['房东发来的续租消息','银行短信里的还款日','担保合同上的连带责任','信用卡账单的最低还款','中介递来的购房测算','催收信封上的红色日期','法院系统里的案件编号','遗嘱旁边的债务清单'],['让月底提前到来。','比资产数字更具体。','旁边写着另一个人的名字。','后来决定了谁承担余款。'],['你要在继续租房和支付首付之间选择。','亲友请求你为一笔贷款担保。','现金不足，信用消费可以维持当前生活。','利率上升后，每月还款超过收入三成。','债务开始逾期，催收联系到了家人。','你可以出售资产、协商重组或继续借新还旧。','一笔投资可能翻倍，也可能失去本金。','整理遗嘱时，资产和债务必须写在同一页。'],[['继续租房保留流动性','支付首付承担长期贷款','回到家庭住房'],['拒绝担保但提供信息','只担保有限金额','签下连带责任'],['缩减消费保持现金流','使用分期短暂维持','借高息资金填补'],['出售非必要资产还款','与债权人协商重组','继续按原计划硬撑'],['主动联系家人说明','寻求法律和债务咨询','继续隐瞒并借新债'],['出售资产及时止损','协商延长期限','借新还旧保住表面'],['小额投入验证判断','集中投入追求翻倍','放弃投资保留现金'],['列明全部资产与债务','只写想留下的资产','暂缓立遗嘱先处理债务']]);
TRACKS.health=track('健康与照护','personal',[0,105],[],['疫苗本上的下一针日期','牙科诊室的小镜子','视力表最下面一排','午休后绕楼的一圈','体检报告折起的一角','药盒里剩下的最后一格','康复室的弹力带','床头柜上的护理计划'],['提醒了一次。','被认真记了下来。','让生活慢了一点。','后来改变了安排。'],['复查确认这次异常需要继续观察。','治疗会影响日常，但拖延可能加重问题。','恢复速度开始取决于休息、训练和原本的体质。','指标已经稳定，你要决定怎样结束这段治疗。','一次较重的健康变化留下了功能限制。','治疗和照护开始挤压原来的生活。','恢复进入平台期，你仍有几种可行安排。','多年后，你要决定继续治疗、带病生活还是停止消耗。'],[['完成复查建立记录','先观察并约定复查日期','忽略结果继续生活'],['暂停部分事务接受治疗','边调整生活边治疗','拖延到无法回避'],['坚持训练并按时复诊','使用辅助工具保留生活','只靠意志硬撑'],['完成疗程回到普通生活','保留长期管理方案','停止管理接受后果'],['尽快评估并开始康复','先使用辅助工具适应','拒绝评估继续硬撑'],['购买专业照护减轻负担','和可信的人明确分工','隐瞒状态独自承担'],['调整方案继续康复','接受限制重建日常','放弃训练减少外出'],['完成治疗与医疗意愿','维持管理并保留自主','停止治疗不再讨论']]);
TRACKS.habits=track('习惯与失控','personal',[13,85],[],['手机里凌晨的充值记录','酒瓶旁没拆的药盒','投注页面跳出的赔率','购物车里重复的订单','被删除三次的借款软件','朋友替你保管的银行卡','治疗小组发来的签到表','复发后重新写下的日期'],['让一天少了几个小时。','比快乐持续得更久。','旁边出现一笔说不清的支出。','后来成了你承认问题的证据。'],['一种习惯开始稳定占用你的时间和钱。','你第一次为了它向别人撒谎。','损失之后，你相信下一次可以赢回来。','工作和关系开始察觉你的变化。','家人提出代管资金并陪你治疗。','短暂恢复后，旧环境再次出现。','违法风险和债务逼近同一天。','多年后，你要决定如何讲述那段失控。'],[['设限并记录使用','继续但不借钱','完全放任这次冲动'],['承认并说明真实情况','补一个更大的谎','切断相关账户'],['停止追损接受损失','借钱试图翻本','请求他人暂管资金'],['主动说明并治疗','隐藏问题保住工作','辞职躲开所有人'],['接受治疗和资金限制','只接受口头监督','拒绝干预离开家庭'],['避开旧环境继续恢复','相信自己已经可以控制','再次投入旧习惯'],['寻求法律和医疗帮助','卖掉资产偿还','继续隐瞒并冒险'],['公开承担后果和经验','只对亲近的人说明','把那几年彻底抹去']]);
TRACKS.later=track('退休与身后','personal',[55,105],[],['社保记录里的缴费月份','退休证旁的新门禁卡','返聘合同上的结束日期','社区活动室的报名表','父母留下的钥匙串','养老机构的费用清单','公证处装订好的遗嘱','孩子或朋友保存的语音'],['让未来第一次有了数字。','比年龄更早改变身份。','旁边列着可以求助的人。','后来成为别人记住你的方式。'],['退休年龄临近，但缴费和储蓄并不完整。','单位提出返聘，你也想保留自己的时间。','正式工作结束后，一周突然空了下来。','父母离世后留下资产、债务和未完成的关系。','你开始需要持续照护。','伴侣或朋友提出共同养老安排。','你需要决定遗产、债务和医疗意愿。','身体已接近终点，你还能留下最后一项安排。'],[['继续工作补足缴费','降低生活成本按期退休','转向灵活工作'],['短期返聘并写明期限','长期返聘保持收入','拒绝返聘开始退休'],['建立固定兴趣和社交','照护家人填满时间','把日子交给屏幕'],['核对遗产和债务','只保留有纪念意义的物品','拒绝处理交给亲属'],['购买专业照护','与家人明确分工','独自承担减少求助'],['签订共同生活和费用协议','保持往来但分别生活','拒绝任何共同安排'],['完成公证并列明债务','只做口头交代','暂不处理'],['留下真实的告别和授权','只处理财务文件','不再做新的安排']]);

const TRACK_NODE_AGES={
  education:[[14,17],[17,23],[18,26],[18,45],[16,30],[22,52],[24,58],[35,70]],
  employment:[[18,45],[21,58],[21,62],[22,58],[20,62],[25,62],[25,66],[55,72]],
  public:[[18,42],[18,45],[20,48],[20,62],[25,58],[25,62],[25,62],[55,72]],
  remote:[[22,55],[23,58],[23,62],[23,62],[24,65],[24,62],[25,65],[28,72]],
  business:[[24,55],[24,58],[24,58],[25,62],[25,65],[28,68],[32,72],[38,78]],
  leisure:[[18,55],[18,55],[20,60],[20,62],[20,62],[22,65],[24,68],[25,72]],
  partnership:[[16,55],[18,60],[20,65],[20,68],[22,68],[24,72],[30,78],[55,95]],
  children:[[20,48],[20,50],[20,55],[25,60],[30,65],[35,70],[38,75],[50,95]],
  finance:[[18,65],[20,70],[20,70],[22,72],[22,75],[25,78],[25,82],[50,105]],
  health:[[3,80],[4,85],[6,90],[8,95],[12,90],[16,95],[25,100],[45,105]],
  habits:[[13,55],[14,60],[16,65],[16,68],[18,72],[18,78],[18,80],[35,90]],
  later:[[55,75],[55,78],[55,85],[55,90],[55,100],[55,100],[55,105],[60,105]]
};
TRACKS.children.verbs[1]=['继续治疗并等待结果','转向收养等其他路径','结束生育计划'];

const trackOrder=Object.keys(TRACKS);

const requirementsFor=id=>({all:[...TRACKS[id].gate],any:[],none:[]});
const actorsFor=(id,index,kind='beat')=>{
  const role=index%8;
  if(id==='leisure'&&kind==='decision'&&role===2)return[{slot:'partner',relation:'partner',alive:true,statusAny:['partnered','married'],optional:false}];
  if(id==='partnership'&&role>0){const statuses=[null,['dating','partnered','married'],['dating','partnered'],['partnered','married'],['dating','partnered','married'],['partnered','married','separated'],['divorced','separated'],['dating','partnered','married']][role];return[{slot:'partner',relation:'partner',alive:true,statusAny:statuses,optional:false}]}
  if(id==='children'&&(kind==='beat'?role>0:role>1)){const ranges=kind==='beat'?[null,[3,7],[5,15],[6,18],[12,19],[16,25],[18,30],[25,60]]:[null,null,[0,5],[5,13],[12,19],[16,26],[18,26],[25,60]],range=ranges[role];return[{slot:'child',relationAny:['child','adoptedChild','stepChild'],alive:true,ageMin:range[0],ageMax:range[1],optional:false}]}
  return[];
};
const beatEffects=(id,index)=>{
  const phase=Math.floor(index/8),light=phase===0,hard=phase===3;
  const effects={
    education:[c('add','capabilities.skill',light?1:hard?-1:2),c('add','desires.achievement.fulfillment',light?1:hard?-2:2)],
    employment:[c('add','employment.experience',1),c('add','pressures.career',hard?7:phase===2?4:-1)],
    public:[c('add','employment.publicExperience',1),c('add','pressures.career',hard?6:2)],
    remote:[c('add','mobility.platformDependence',phase===2?5:1),c('add','pressures.loneliness',hard?6:light?-1:2)],
    business:[c('add','business.operatingSkill',light?1:2),c('add','finance.cash',hard?-12000:light?1800:-4500)],
    leisure:[c('add','desires.freedom.fulfillment',light?2:1),c('add','capabilities.employability',hard?-3:-1)],
    partnership:[c('add','relationships.partnerBond',hard?-6:light?2:phase===1?3:-2),c('add','pressures.family',hard?5:-1)],
    children:[c('add','relationships.childBond',hard?-4:2),c('add','pressures.family',hard?6:2)],
    finance:[c('add','finance.cash',hard?-15000:light?-1800:phase===1?3500:-6000),c('add','pressures.money',hard?7:phase===2?4:-1)],
    health:[c('add','health.physical',hard?-7:light?1:phase===1?2:-3),c('add','pressures.body',hard?7:phase===2?4:-1)],
    habits:[c('add','habits.risk',hard?8:phase===2?5:1),c('add','health.mental',hard?-5:light?-1:-2)],
    later:[c('add','desires.peace.fulfillment',light?2:1),c('add','relationships.network',hard?-3:1)]
  }[id];
  if(index%3===0)effects.push(c('tag','history',`${id}:beat:${phase}:${index%8}`));
  return effects;
};

const req=(all=[],any=[],none=[])=>({all,any,none});
const healthBeat=(age,text,intensity,requirements,effects,weight=8)=>({age,text,intensity,requirements,effects,weight});
const activeHealth=p('health.status','in',['monitoring','treating','recovering','managed','limited']);
const HEALTH_BEATS=[
  healthBeat([0,5],'疫苗本盖章后，家里记下了下一针日期。','low',req(),[c('add','capabilities.healthLiteracy',1),c('add','health.physical',1)],9),
  healthBeat([6,15],'牙医用小镜子指出一颗需要认真刷的牙。','low',req(),[c('add','capabilities.healthLiteracy',1),c('add','health.physical',1)],8),
  healthBeat([10,22],'你把视力表最下面一排看错了两个。','low',req(),[c('add','capabilities.healthLiteracy',1)],7),
  healthBeat([16,65],'午休后的一小圈路，让肩背松下来。','low',req(),[c('add','health.physical',1),c('add','pressures.body',-2)],8),
  healthBeat([18,75],'连续睡足几晚后，闹钟第一次没那么刺耳。','low',req(),[c('add','health.mental',1),c('add','pressures.body',-2)],8),
  healthBeat([30,80],'常规体检的数字都落在不用追赶的范围里。','low',req(),[c('add','capabilities.healthLiteracy',1)],7),
  healthBeat([50,95],'社区步道上，你找到不会逞强的速度。','low',req(),[c('add','health.physical',1),c('add','pressures.loneliness',-1)],8),
  healthBeat([65,105],'浴室加了一根扶手，日常没有因此变小。','low',req(),[c('add','capabilities.careSkill',1),c('add','health.physical',1)],9),

  healthBeat([0,8],'一场高烧退得慢，医生留下了复查日期。','medium',req([p('health.status','in',['well','managed'])]),[c('healthIncident','health',13,{condition:'infection'})],2),
  healthBeat([8,25],'跑动时的一次扭伤，比平常多疼了几天。','medium',req([p('health.status','in',['well','managed'])]),[c('healthIncident','health',12,{condition:'injury'})],2),
  healthBeat([18,65],'饭后反复的不适，终于让你预约了门诊。','medium',req([p('health.status','in',['well','managed'])],[p('pressures.body','gte',20),p('health.physical','lte',65)]),[c('healthIncident','health',14,{condition:'digestive'})],2),
  healthBeat([20,65],'一次站起时的眩晕，让排班表停了下来。','medium',req([p('health.status','in',['well','managed']),p('employment.arrangement','eq','splitShift')]),[c('healthIncident','health',16,{condition:'fatigue'})],4),
  healthBeat([35,78],'体检单上一个箭头，需要几个月后再确认。','medium',req([p('health.status','in',['well','managed'])]),[c('healthIncident','health',15,{condition:'screening'})],3),
  healthBeat([16,75],'失眠连续出现，白天开始漏掉熟悉的细节。','medium',req([p('health.status','in',['well','managed'])],[p('pressures.career','gte',35),p('pressures.family','gte',35),p('pressures.money','gte',35)]),[c('healthIncident','health',15,{condition:'sleep'})],4),
  healthBeat([18,82],'一次意外擦伤没有按预期恢复，门诊建议复查。','medium',req([p('health.status','in',['well','managed'])]),[c('healthIncident','health',20,{condition:'accident'})],1.5),
  healthBeat([60,105],'一次跌倒没有骨折，却改变了你走路的信心。','medium',req([p('health.status','in',['well','managed'])]),[c('healthIncident','health',18,{condition:'fall'})],3),

  healthBeat([3,105],'复查结果比上一次稳定，观察期可以缩短。','medium',req([activeHealth]),[c('healthRecovery','health',9)],18),
  healthBeat([6,105],'按时用药后，最影响日常的症状先退了。','medium',req([activeHealth]),[c('healthRecovery','health',10)],18),
  healthBeat([8,105],'康复师把训练动作减到你能长期做到的量。','medium',req([p('health.status','in',['treating','recovering','limited'])]),[c('healthRecovery','health',12)],20),
  healthBeat([12,105],'你第一次完整记录了睡眠、疼痛和用药。','medium',req([activeHealth]),[c('add','capabilities.healthLiteracy',2),c('healthRecovery','health',8)],17),
  healthBeat([16,105],'请假单批下来后，身体终于得到连续的休息。','medium',req([p('health.status','in',['monitoring','treating','recovering'])]),[c('healthRecovery','health',11),c('add','pressures.career',2)],16),
  healthBeat([18,105],'家人学会了帮忙，而不是替你决定。','medium',req([activeHealth]),[c('healthRecovery','health',8),c('add','relationships.originBond',2)],15),
  healthBeat([25,105],'辅助工具让一件困难的事重新可以独立完成。','medium',req([p('health.status','in',['managed','limited','recovering'])]),[c('healthRecovery','health',7)],15),
  healthBeat([45,105],'医生同意把复诊间隔从三个月延到半年。','medium',req([p('health.status','in',['recovering','managed'])]),[c('healthRecovery','health',13,{resolve:true})],20),

  healthBeat([8,90],'复查数字突然恶化，原定计划被迫暂停。','high',req([activeHealth,p('health.conditionSeverity','gte',25)]),[c('healthIncident','health',18,{condition:'setback'})],10),
  healthBeat([16,90],'一次急诊把没有处理的问题全部摆到台面上。','high',req([activeHealth,p('health.conditionSeverity','gte',35)]),[c('healthIncident','health',24,{condition:'acute'})],12),
  healthBeat([18,90],'治疗副作用让工作和日常必须重新排期。','high',req([p('health.status','in',['treating','limited']),p('health.conditionSeverity','gte',28)]),[c('add','pressures.body',8),c('add','pressures.career',5)],11),
  healthBeat([18,95],'身体拒绝继续硬撑，你停下了几项责任。','high',req([activeHealth,p('pressures.body','gte',60)]),[c('healthRecovery','health',10),c('add','pressures.family',4)],12),
  healthBeat([25,100],'康复进入平台期，训练记录几个月没有变化。','high',req([p('health.status','in',['recovering','limited']),p('health.conditionSeverity','gte',20)]),[c('add','pressures.body',5),c('add','health.mental',-3)],10),
  healthBeat([35,105],'长期指标被确认需要管理，但不再等于失控。','high',req([p('health.status','in',['monitoring','treating']),p('health.conditionSeverity','gte',22)]),[c('set','health.status','managed'),c('add','capabilities.healthLiteracy',2)],13),
  healthBeat([55,105],'正式照护接手了最消耗体力的那部分日常。','high',req([p('health.status','in',['limited','managed']),p('health.careNeed','gte',1)]),[c('healthRecovery','health',9),c('add','pressures.family',-5)],13),
  healthBeat([65,105],'治疗方案不再追求回到从前，只保住还能做的事。','high',req([p('health.status','in',['limited','managed']),p('health.conditionSeverity','gte',30)]),[c('healthRecovery','health',8),c('add','desires.body.fulfillment',2)],12)
];

const annualBeats=[];
for(const id of trackOrder){
  const spec=TRACKS[id];
  for(let index=0;index<32;index++){
    if(id==='health'){
      const row=HEALTH_BEATS[index];
      annualBeats.push({id:`beat_${String(annualBeats.length+1).padStart(3,'0')}`,kind:'beat',track:id,stage:stageFor(...row.age),ageMin:row.age[0],ageMax:row.age[1],icon:'+',text:row.text,intensity:row.intensity,requirements:row.requirements,actors:[],effects:row.effects,assertions:[],weight:row.weight,contentRevision:CONTENT_REVISION});
      continue;
    }
    const requirements=requirementsFor(id),actors=actorsFor(id,index,'beat'),role=index%8,ageRange=TRACK_NODE_AGES[id][role];
    if(id==='employment')requirements.all.push(p('employment.status','eq','employed'));
    if(id==='public')requirements.all.push(p('employment.employerType','eq','public'));
    if(id==='remote')requirements.any.push(p('employment.arrangement','in',['remote','hybrid']),p('mobility.mode','in',['domesticNomad','overseasNomad']));
    if(id==='business')requirements.all.push(p('business.status','in',['testing','operating']));
    if(id==='leisure')requirements.all.push(p('activity.mode','in',['sabbatical','leisure']));
    if(id==='habits')requirements.all.push(p('habits.risk','gte',1));
    if(id==='children')requirements.all.push(p('relationships.childCount',role===0?'eq':'gte',role===0?0:1));
    if(id==='partnership'&&index%8===0)requirements.all.push(p('relationships.partnerStatus','in',['none','divorced','widowed']));
    if(id==='finance'&&[1,3,7].includes(role))requirements.all.push(p('finance.totalDebt','gte',1));
    if(id==='finance'&&[5,6].includes(role))requirements.all.push(p('finance.hasArrears','eq',true));
    annualBeats.push({id:`beat_${String(annualBeats.length+1).padStart(3,'0')}`,kind:'beat',track:id,stage:stageFor(...ageRange),ageMin:ageRange[0],ageMax:ageRange[1],icon:{education:'▤',employment:'▥',public:'⌂',remote:'⌁',business:'◇',leisure:'○',partnership:'♡',children:'♧',finance:'¥',health:'+',habits:'◌',later:'↩'}[id],text:`${spec.objects[role]}${spec.actions[Math.floor(index/8)]}`,intensity:index<8?'low':index<24?'medium':'high',requirements,actors,effects:beatEffects(id,index),assertions:actors.map(actor=>({actor:actor.slot,mustExist:!actor.optional})),weight:10+index%4,contentRevision:CONTENT_REVISION});
  }
}
const originTexts=['出生证上的地址和父母租约并不相同。','家里第一次为你单独开了一个小抽屉。','父母在夜里讨论谁请假照顾你。','社区医院的疫苗本盖下第一枚章。','旧相册里有人总是站在画面外。','家里把压岁钱记进一本红色账本。','你第一次发现同学家的房间只属于自己。','一次搬家让上学路线多了四十分钟。','父母为一张补习班收据争执到深夜。','亲戚送来的旧电脑先问了弟妹意见。','家里开始讨论中学要不要跨区。','你听见父母第一次说起工作不稳定。','班主任把家庭情况表压在作业下面。','父母让你保管一把家门钥匙。','毕业照里有些同学已经决定离开。','成年前夜，家里的账本第一次向你打开。'];
originTexts.forEach((text,index)=>annualBeats.push({id:`beat_${String(annualBeats.length+1).padStart(3,'0')}`,kind:'beat',track:'origin',stage:stageFor(index,Math.min(18,index+3)),ageMin:index,ageMax:Math.min(18,index+3),icon:'⌂',text,intensity:index<8?'low':'medium',requirements:{all:[],any:[],none:[]},actors:[],effects:[c('add','relationships.originBond',index%3-1),c('add','desires.familyBelonging.fulfillment',index%2?1:-1),c('tag','history',`origin:${index+1}`)],assertions:[],weight:16,contentRevision:CONTENT_REVISION}));

const decisionEffects=(id,index,option)=>{
  const route=['deliberate','negotiated','risk'][option],effects=[c('tag','history',`${id}:${route}`),c('add','agency',[4,3,2][option])],add=(path,value)=>effects.push(c('add',path,value)),set=(path,value)=>value!==undefined&&effects.push(c('set',path,value));
  if(id==='education'){add('capabilities.skill',[3,2,1][option]);add('finance.cash',[-8000,-3000,2000][option]);if(index===0)set('education.path',['academic','evaluating','vocational'][option]);if(index===2&&option===2){set('education.status','interrupted');set('activity.mode','work')}}
  if(id==='employment'){const states=[['employed','employed','unemployed'],['employed','employed','employed'],['employed','unemployed','unemployed'],['employed','employed','employed'],['employed','employed','employed'],['employed','employed','employed'],['employed','employed','unemployed'],['employed','selfEmployed','retired']][index],modes=[['work','work','seeking'],['work','work','work'],['work','seeking','seeking'],['work','work','work'],['work','work','work'],['work','work','work'],['study','work','seeking'],['work','flexible','retired']][index],salaryChanges=[[3000,5000,0],[10000,5000,0],[0,0,0],[12000,5000,0],[0,0,0],[16000,4000,0],[0,0,0],[5000,2000,0]][index];set('employment.status',states[option]);set('activity.mode',modes[option]);add('employment.salary',salaryChanges[option]);if(index===2&&option===1)add('finance.cash',30000);add('pressures.career',[4,1,-2][option])}
  if(id==='public'){const states=[['employed','unemployed','unemployed'],['employed','unemployed','unemployed'],['employed','employed','unemployed'],['employed','employed','employed'],['employed','employed','unemployed'],['employed','employed','unemployed'],['employed','careLeave','unemployed'],['employed','retired','retired']][index],modes=states.map(value=>value==='employed'?'work':value==='careLeave'?'flexible':value==='retired'?'retired':'seeking');set('employment.status',states[option]);set('activity.mode',modes[option]);set('employment.employerType',states[option]==='employed'?'public':option===2?'private':'none');set('employment.sector',states[option]==='employed'?'public':'general');add('capabilities.publicCredential',[2,1,0][option]);add('pressures.career',[3,1,-2][option])}
  if(id==='remote'){if(index===0){set('employment.arrangement',['remote','hybrid','onsite'][option]);if(option<2){set('employment.status',option===0?'gig':'employed');set('employment.career',option===0?'远程合同工作':'混合办公岗位');set('employment.sector','digital');set('activity.mode','work')}}if(index===1)set('mobility.mode',['domesticNomad','overseasNomad','home'][option]);if(index===3&&option===2){set('employment.arrangement','onsite');set('activity.mode','seeking');set('employment.status','unemployed')}if(index===4&&option===2)set('employment.arrangement','onsite');if(index===6)set('mobility.mode',[ 'home','overseasNomad','home'][option]);if(index===7)set('mobility.mode',[ 'home','domesticNomad','home'][option]);add('mobility.platformDependence',[-3,8,-5][option]);add('mobility.rootlessness',[2,7,-4][option]);add('capabilities.portableSkill',option===0?2:1)}
  if(id==='business'){const statuses=[['testing','testing','operating'],['testing','testing','closed'],['operating','operating','operating'],['closed','operating','operating'],['operating','operating','operating'],['operating','operating','operating'],['operating','operating','operating'],['operating','operating','closed']][index],cash=[[-5000,-2000,-60000],[-2000,0,0],[-20000,-40000,-60000],[-10000,-15000,-50000],[-3000,-8000,-15000],[0,0,0],[-20000,-60000,0],[0,0,0]][index];set('business.status',statuses[option]);if(index===0)set('business.mode',option===2?'franchise':'independent');if(index===3)set('business.mode',option===1?'independent':option===2?'franchise':'none');if(index===4&&option===0)set('business.mode','independent');add('business.operatingSkill',[4,2,0][option]);add('business.equity',index>=5?[50000,120000,600000][option]:0);add('finance.cash',cash[option]);if(option===2&&[0,2,3].includes(index))effects.push(c('addLiability','finance.liabilities',90000,{kind:'business',rate:.09,guaranteed:true}))}
  if(id==='leisure'){const modes=[['sabbatical','leisure','flexible'],['sabbatical','leisure','leisure'],['care','leisure','seeking'],['leisure','leisure','seeking'],['sabbatical','leisure','leisure'],['flexible','leisure','work'],['study','work','leisure'],['flexible','work','leisure']][index],funding=[['self','self','mixed'],['family','family','self'],['partner','partner','self'],['self','debt','self'],['self','self','self'],['mixed','self','self'],['self','self','family'],['mixed','self','family']][index];set('activity.mode',modes[option]);set('activity.funding',funding[option]);if(index===5&&option===0)set('employment.status','gig');if(index===5&&option===2)set('employment.status','selfEmployed');if(index===6&&option===1||index===7&&option===1)set('employment.status','employed');add('desires.freedom.fulfillment',[4,6,-1][option]);add('capabilities.employability',[-1,-4,2][option]);add('finance.cash',[-5000,-9000,2000][option])}
  if(id==='partnership'){const states=[['dating','dating','none'],['partnered','partnered','dating'],['married','partnered','separated'],['partnered','partnered','partnered'],['partnered','partnered','separated'],['partnered','separated','divorced'],['divorced','dating','none'],['partnered','dating','none']][index];set('relationships.partnerStatus',states[option]);add('relationships.partnerBond',[5,2,-6][option]);add('pressures.family',option===2?4:-1)}
  if(id==='children'){if(index===0)set('relationships.parenthoodIntent',['planned','adoption','childfree'][option]);if(index===1&&option<2)effects.push(c('createPerson','people',1,{relation:option===0?'child':'adoptedChild'}));add('relationships.childBond',[4,1,-3][option]);add('pressures.family',[-1,4,2][option]);if(index>1)add('finance.cash',option===2?0:-6000)}
  if(id==='finance'){add('finance.cash',[-6000,-15000,8000][option]);add('pressures.money',[-3,1,6][option]);if((index===0&&option===1)||(index===1&&option>0)||(index===2&&option>0))effects.push(c('addLiability','finance.liabilities',index===0?260000:option===2?120000:40000,{kind:index===0?'mortgage':'consumer',rate:option===2?.12:.06,guaranteed:index===1}));if(index===0)set('housing.status',['renting','mortgaged','family'][option]);if(index===3&&option===0)effects.push(c('repayDebt','finance.liabilities',30000));if(index===3&&option===1)effects.push(c('restructureDebt','finance.liabilities',1,{rate:.045}));if(index===4&&option<2)effects.push(c('restructureDebt','finance.liabilities',1,{rate:option===0?.055:.04}));if(index===4&&option===2)effects.push(c('addLiability','finance.liabilities',20000,{kind:'consumer',rate:.12}));if(index===5&&option===0)effects.push(c('repayDebt','finance.liabilities',80000));if(index===5&&option===1)effects.push(c('restructureDebt','finance.liabilities',1,{rate:.045}));if(index===5&&option===2)effects.push(c('addLiability','finance.liabilities',60000,{kind:'consumer',rate:.12}))}
  if(id==='health'){
    const recovery=[[14,8,-8],[16,10,-10],[18,11,-9],[26,14,-10],[17,9,-12],[15,9,-10],[18,10,-11],[24,13,-12]][index][option];
    if(recovery>0)effects.push(c('healthRecovery','health',recovery,{resolve:index===3||index===7}));else effects.push(c('healthIncident','health',Math.abs(recovery),{condition:index>=4?'limitation':'setback'}));
    add('health.mental',[3,1,-3][option]);add('pressures.body',[-5,-2,6][option]);add('finance.cash',[-8000,-3000,0][option]);
    if(index===3&&option===1)set('health.status','managed');if(index===3&&option===2)set('health.status','managed');if(index===4&&option===2){set('health.disability','persistent');set('health.status','limited')}if(index===7&&option===1)set('health.status','managed');
  }
  if(id==='habits'){const stages=[['exposed','repeating','dependent'],['treatment','repeating','recovery'],['recovery','dependent','treatment'],['treatment','uncontrolled','uncontrolled'],['treatment','repeating','uncontrolled'],['recovery','relapse','relapse'],['treatment','uncontrolled','uncontrolled'],['recovery','recovery','repeating']][index];set('habits.stage',stages[option]);add('habits.risk',[-10,3,10][option]);add('health.mental',[5,-2,-7][option]);add('finance.cash',[-4000,-6000,-18000][option]);if(option===2&&index>=5)effects.push(c('addLiability','finance.liabilities',35000,{kind:'habit',rate:.14}))}
  if(id==='later'){const modes=index===0?['work','retired','flexible']:index===1?['work','work','retired']:['retired','retired','retired'];set('activity.mode',modes[option]);set('employment.status',modes[option]==='retired'?'retired':modes[option]==='flexible'?'gig':'employed');add('desires.peace.fulfillment',[3,2,-1][option]);add('relationships.network',[2,1,-3][option]);if(index>=6)set('legacy.plan',['documented','partial','none'][option])}
  return{effects,route,outcomeTags:[id,`${id}:${route}`,index===7?`${id}:legacy`:`${id}:turn`]};
};

const decisions=[];
for(const id of trackOrder){
  const spec=TRACKS[id];
  for(let index=0;index<8;index++){
    const eventId=`decision_${String(decisions.length+1).padStart(3,'0')}`,requirements=requirementsFor(id),actors=actorsFor(id,index,'decision'),ageRange=TRACK_NODE_AGES[id][index];
    if(id==='employment'&&index>0)requirements.all.push(p('employment.status','eq','employed'));
    if(id==='public'&&index>1)requirements.all.push(p('employment.employerType','eq','public'));
    if(id==='remote'&&index>0)requirements.any.push(p('employment.arrangement','in',['remote','hybrid']),p('mobility.mode','in',['domesticNomad','overseasNomad']));
    if(id==='business'&&index>0)requirements.all.push(p('business.status','in',['testing','operating']));
    if(id==='leisure'&&index>0)requirements.all.push(p('activity.mode','in',['sabbatical','leisure']));
    if(id==='habits'&&index>0)requirements.all.push(p('habits.risk','gte',1));
    if(id==='children')requirements.all.push(p('relationships.childCount',index<=1?'eq':'gte',index<=1?0:1));
    if(id==='partnership'&&index===0)requirements.all.push(p('relationships.partnerStatus','in',['none','divorced','widowed']));
    if(id==='health'&&index===0)requirements.all.push(p('health.status','in',['monitoring','treating','recovering']),p('health.conditionSeverity','gte',5));
    if(id==='health'&&index===4)requirements.any.push(p('health.status','eq','limited'),p('health.conditionSeverity','gte',35),p('health.disability','neq','none'));
    if(id==='finance'&&index===4)requirements.all.push(p('finance.totalDebt','gte',10000));
    const choices=spec.verbs[index].map((text,option)=>{const result=decisionEffects(id,index,option),memoryKey=`${eventId}_c${option+1}`,arcExit=option===2&&((index===0&&['employment','public','remote','partnership'].includes(id))||(id==='children'&&(index===0||index===1))||(id==='business'&&index===1));if(id==='partnership'&&index===0&&option<2)result.effects.push(c('createPerson','people',1,{relation:'partner'}));return{id:`${eventId}_choice_${option+1}`,text,resultText:`你选择了“${text}”，这项安排开始改变之后的机会。`,hints:[option===0?'投入较多，保留长期可能':option===1?'代价和余地同时存在':'短期更容易，长期风险更高'],requirements:[],effects:result.effects,commitments:index%3===0?[{type:'review',track:id,dueIn:2+option}]:[],consequences:[{eventId:`echo_${String(decisions.length+1).padStart(3,'0')}`,delayMin:1+option,delayMax:3+option}],outcomeTags:result.outcomeTags,memoryKey,route:result.route,arcExit};});
    decisions.push({id:eventId,kind:'decision',track:id,stage:stageFor(...ageRange),ageMin:ageRange[0],ageMax:ageRange[1],icon:annualBeats.find(event=>event.track===id)?.icon||'·',prompt:spec.prompts[index],requirements,actors,choices,arc:{id:`${id}_${Math.floor(index/4)+1}`,node:index%4+1,role:index%4===0?'start':index%4===3?'resolve':'continue',lane:spec.lane},assertions:actors.map(actor=>({actor:actor.slot,mustExist:!actor.optional})),weight:16+index%3,contentRevision:CONTENT_REVISION});
  }
}

const globalRows=[
  {track:'identity',age:[14,17],prompt:'你第一次认真决定，这一生最不愿失去什么。',verbs:['认领自由，即使它会带来不稳定','认领安全，即使它会限制远方','认领关系，即使它会占用自己'],desire:[['freedom','exploration'],['security','achievement'],['love','familyBelonging']]},
  {track:'education',age:[15,17],prompt:'义务教育结束后，三条路都需要你签字。',verbs:['进入普通高中继续升学','进入职业教育尽快掌握技能','先工作并保留以后学习的入口'],education:['highSchool','vocational','middleSchool']},
  {track:'education',age:[18,22],prompt:'成年后的第一条去向，不再由年龄自动替你决定。',verbs:['继续高等教育','接受一份正式工作','一边零工一边探索'],education:['college','highSchool','highSchool']},
  {track:'identity',age:[30,55],prompt:'你发现早年认领的欲望已经不完全适合现在。',verbs:['付出代价重新排序欲望','保留原来的核心追求','不再给人生指定唯一目标'],desire:[['peace','body'],['achievement','security'],['freedom','creation']],reclaim:true}
];
for(const row of globalRows){
  const id=`decision_${String(decisions.length+1).padStart(3,'0')}`;
  const choices=row.verbs.map((text,index)=>{const educationStatus=row.age[0]===18?(index===0?'enrolled':'completed'):(index===2?'completed':'enrolled'),effects=[row.education?c('transition','education',row.education[index],{status:educationStatus}):c('claimDesire','desires',row.desire[index],{replace:Boolean(row.reclaim)})];if(row.age[0]===18&&index===1)effects.push(c('set','employment.status','employed'),c('set','employment.career','基层岗位'),c('set','employment.sector','services'),c('set','activity.mode','work'));if(row.age[0]===18&&index===2)effects.push(c('set','employment.status','gig'),c('set','employment.career','灵活就业'),c('set','employment.sector','platform'),c('set','activity.mode','work'));return{id:`${id}_choice_${index+1}`,text,resultText:`你把“${text}”写进了之后的人生。`,hints:['这会改变事件权重与结局解释'],requirements:[],effects,commitments:[],consequences:[{eventId:`echo_${String(decisions.length+1).padStart(3,'0')}`,delayMin:2,delayMax:5}],outcomeTags:[row.track,index===0?'chosenA':index===1?'chosenB':'chosenC'],memoryKey:`${id}_c${index+1}`,route:['deliberate','stable','open'][index]}});
  decisions.push({id,kind:'decision',track:row.track,stage:stageFor(...row.age),ageMin:row.age[0],ageMax:row.age[1],icon:'◎',prompt:row.prompt,requirements:{all:[row.reclaim?p('desires.reclaimed','eq',false):p('age','gte',row.age[0])],any:[],none:[]},actors:[],choices,arc:null,assertions:[],priority:30,weight:30,contentRevision:CONTENT_REVISION});
}

const echoPressure={education:'career',employment:'career',public:'career',remote:'loneliness',business:'money',leisure:'money',partnership:'family',children:'family',finance:'money',health:'body',habits:'money',later:'loneliness'};
const echoes=decisions.map((decision,index)=>({id:`echo_${String(index+1).padStart(3,'0')}`,kind:'consequence',track:decision.track,stage:stageNames,ageMin:Math.min(105,decision.ageMin+1),ageMax:105,icon:'↩',text:'过去的选择带着具体账单回来了。',sourceDecisionId:decision.id,requirements:{all:[],any:[],none:[]},actors:[],choiceOutcomes:Object.fromEntries(decision.choices.map((choice,choiceIndex)=>[choice.memoryKey,{text:`${choice.resultText.replace(/。$/,'')}。${choiceIndex===0?'早先投入的东西开始显出回报。':choiceIndex===1?'当初保留的余地如今派上用场。':'当时推迟的代价没有消失。'}`,effects:[choiceIndex===0?c('add','agency',1):choiceIndex===1?c('add','capabilities.resilience',1):c('add',`pressures.${echoPressure[decision.track]||'money'}`,4),c('tag','history',`echo:${decision.track}`)],outcomeTags:[...choice.outcomeTags,'echo']}])) ,assertions:[],weight:22,contentRevision:CONTENT_REVISION}));

const swanRows=[
  [0,5,'一次罕见感染让全家在病房外轮流守夜。','health','mixed'],[3,12,'一次交通事故改变了你熟悉的上学路线。','health','loss'],[16,25,'一项全国竞赛把你送到从未去过的城市。','education','gain'],[18,30,'行业突然扩张，你的冷门技能变得抢手。','employment','gain'],[18,35,'一次骗局卷走了你和家人共同准备的钱。','finance','loss'],[20,38,'旧作品被意外传播，陌生人开始认识你。','remote','gain'],[22,40,'重大公共事件让原有工作一夜暂停。','employment','mixed'],[25,50,'一家小企业的股权在新市场中快速升值。','business','gain'],[25,55,'合作方失联，担保责任落到你名下。','finance','loss'],[30,58,'关键客户把十年订单交给了你的团队。','business','gain'],[30,60,'一次监管变化让高利润模式无法继续。','business','loss'],[35,62,'早年忽视的身体指标突然恶化。','health','loss'],[35,65,'一位旧同事邀请你参与真正透明的项目。','business','gain'],[40,68,'家庭成员的重病改变了所有人的分工。','health','mixed'],[45,72,'长期投资经历完整周期后终于兑现。','finance','gain'],[55,80,'一场自然灾害损坏了主要住房。','finance','loss'],[60,88,'旧档案证明一项资产确实属于家庭。','finance','gain'],[65,95,'一次跌倒让独立生活暂时中断。','health','loss'],[70,100,'多年未联系的人重新提出共同养老。','partnership','mixed'],[75,105,'你留下的公开经验帮助了一个陌生家庭。','later','gain']
];
const blackSwans=swanRows.map((row,index)=>{const[min,max,text,track,valence]=row,effects=valence==='gain'?[c('add',track==='finance'?'finance.cash':track==='business'?'business.equity':'health.mental',track==='finance'?60000:track==='business'?200000:8)]:valence==='loss'?(track==='health'?[c('healthIncident','health',28,{condition:'blackSwan'}),c('add','pressures.body',8)]:[c('add','finance.cash',-60000),c('add','pressures.body',8)]):[c('add','health.mental',-3),c('add','relationships.network',3)];effects.push(c('tag','history',`swan:${valence}`));return{id:`swan_${String(index+1).padStart(2,'0')}`,kind:'blackSwan',track,stage:stageFor(min,max),ageMin:min,ageMax:max,icon:'✦',text,intensity:'high',requirements:{all:[],any:[],none:[]},actors:[],effects,assertions:[],valence,weight:1,contentRevision:CONTENT_REVISION}});

const mechanics=['portableSkill','evidence','network','resilience','cashBuffer','healthLiteracy','boundary','learning','riskSense','creativity','careSkill','negotiation'];
const cardNames=['随身工具箱','留痕习惯','认识一个人','慢恢复','备用现金','身体说明书','关门能力','重新学习','先看最坏情况','做点新东西','照护手册','把条件写下来'];
const cards=[];
for(let round=0;round<6;round++)for(let index=0;index<12;index++)cards.push({id:`card_${String(cards.length+1).padStart(2,'0')}`,kind:round===0?'innate':round<4?'stage':'adversity',displayName:`${cardNames[index]}${round?` · ${['起步','转折','中段','回稳','余生'][round-1]}`:''}`,text:`你更容易在${['迁移工作','关键争议','关系断点','危机恢复','现金中断','健康选择','家庭边界','职业转向','风险决策','创作机会','照护安排','合同谈判'][index]}中保留一个可用选项。`,mechanic:mechanics[index],effects:[c('add',`capabilities.${mechanics[index]}`,round===0?2:1),c('tag','history',`card:${mechanics[index]}`)],contentRevision:CONTENT_REVISION});

const endingProfiles=[
  ['ordinaryContent','你没有赢下所有比较，但日子最终适合自己。','常见',['lifeEnded','decisionDiversity']],
  ['freeLife','你没有工牌，却认真支付了自由的账单。','少见',['leisure:deliberate','freedom']],
  ['driftedLife','你能在任何地方工作，也因此很少真正下班。','罕见',['remote:risk','leisure:risk']],
  ['familyCycle','你成功保住所有退路，因此从未真正离开。','罕见',['children:negotiated','familyControlCycle']],
  ['cycleBreaker','你没有摆脱家庭，只让下一代少交了一张报表。','极罕',['children:deliberate','cycleBroken']],
  ['publicDuty','稳定没有替你回答，哪些责任值得承担。','少见',['public:deliberate','public:legacy']],
  ['fragmentedWorker','工资按月到账，完整的一天却很少出现。','少见',['employment:risk','health']],
  ['rootedRemote','你保留了网络，也重新拥有一个可以关门的地址。','罕见',['remote:deliberate','later']],
  ['founder','老板称呼退潮以后，真实流水仍留在账上。','罕见',['business:deliberate','business:legacy']],
  ['wealthApex','你的财富有了全球排名，生活却没有统一计价单位。','传奇',['business','wealthApex']],
  ['debtLegacy','遗嘱和欠款写在同一页，谁也不能只继承前半张。','极罕',['finance:risk','debtCrisis']],
  ['recovered','你没有把复发写成结局，也没有假装它从未发生。','极罕',['habits:deliberate','recovery']],
  ['lostControl','你一直相信还有下一次，直到下一次没有回来。','罕见',['habits:risk','debtCrisis']],
  ['parentLegacy','孩子没有复述你的原话，这是你留下的少数证据。','罕见',['children:deliberate','children:legacy']],
  ['childfree','没有后代不等于没有关系，空房间也不是空人生。','少见',['children:risk','peace']],
  ['earlyExit','人生没有活到模板年龄，但发生过的都是真的。','极罕',['earlyDeath','lifeEnded']]
].map(([id,summary,rarity,signals])=>({id,summary,rarity,signals,contentRevision:CONTENT_REVISION}));
const titleSets={ordinaryContent:['够用的人生','没有登上热搜的一生','把灯按时关掉','日子终于不欠谁'],freeLife:['星期一也没有闹钟','主动退出排行榜','无工牌生活实验','时间重新属于自己'],driftedLife:['所有地址都可退订','有 Wi-Fi 的地方','任何地方都在工作','行李箱没有故乡'],familyCycle:['账本换了封面','所有退路都还在','一家人的钱','报表传到了下一代'],cycleBreaker:['最后一张家庭报表','担保止于此处','你把密码还给自己','下一代不必交账'],publicDuty:['窗口灯熄灭以后','编制里的漫长四季','号码牌背面的人','稳定也有重量'],fragmentedWorker:['被切开的白天','八小时以外','空档不算生活','排班表上的人'],rootedRemote:['有网，也有门牌','关机后的城市','远程的固定地址','把时区留在门外'],founder:['老板称呼退潮以后','真实流水','样板店之外','小店活过了品牌'],wealthApex:['数字失去单位','全球估值的孤岛','控制权稀释之前','世界首富没有下班'],debtLegacy:['遗嘱和欠款','最后一位担保人','百万负债说明书','余额不足的一生'],recovered:['复发没有成为结局','重新拿回银行卡','清醒日历','承认之后'],lostControl:['下一次没有回来','被隐藏的账单','赔率吞掉清晨','失控留下的空位'],parentLegacy:['孩子没有复述你','旅行不需要报表','代际回声停下','家不是审计'],childfree:['空房间不是空人生','没有后代的晚餐','照护另有名字','把晚年交给协议'],earlyExit:['句号来得太早','没有活到模板年龄','短人生的完整证据','时间没有保证书']};
const endingTitles=endingProfiles.flatMap(profile=>titleSets[profile.id].map((title,index)=>({id:`ending_${profile.id}_${index+1}`,profileId:profile.id,title,contentRevision:CONTENT_REVISION})));

const codex=trackOrder.flatMap((id,index)=>[
  {id:`codex_${String(index*2+1).padStart(2,'0')}`,name:`${TRACKS[id].label}：进入`,category:TRACKS[id].label,lockedHint:'走进一条新的现实路线',unlockRules:{outcomeTagsAny:[`${id}:deliberate`,`${id}:negotiated`,`${id}:risk`]},contentRevision:CONTENT_REVISION},
  {id:`codex_${String(index*2+2).padStart(2,'0')}`,name:`${TRACKS[id].label}：代价`,category:TRACKS[id].label,lockedHint:'看见这条路线的长期后果',unlockRules:{outcomeTagsAny:[`${id}:legacy`,`echo:${id}`]},contentRevision:CONTENT_REVISION}
]);
codex.push(
  {id:'codex_25',name:'全球财富顶点',category:'极端人生',lockedHint:'让企业股权进入全球规模',unlockRules:{stateAny:[p('business.equity','gte',1e12)]},contentRevision:CONTENT_REVISION},
  {id:'codex_26',name:'百万负债遗嘱',category:'极端人生',lockedHint:'让债务、死亡风险与遗嘱同时成立',unlockRules:{stateAll:[p('finance.totalDebt','gte',1e6),p('legacy.plan','eq','documented')]},contentRevision:CONTENT_REVISION},
  {id:'codex_27',name:'主动不工作',category:'生活方式',lockedHint:'在不工作时维持一段真实生活',unlockRules:{outcomeTagsAny:['leisure:deliberate']},contentRevision:CONTENT_REVISION},
  {id:'codex_28',name:'重新建立生活',category:'恢复',lockedHint:'从成瘾或重大危机中恢复',unlockRules:{outcomeTagsAny:['habits:deliberate','recovery']},contentRevision:CONTENT_REVISION},
  {id:'codex_29',name:'代际循环终止',category:'家庭',lockedHint:'让下一代不再重复一项控制',unlockRules:{outcomeTagsAny:['children:deliberate','cycleBroken']},contentRevision:CONTENT_REVISION},
  {id:'codex_30',name:'短人生',category:'生命',lockedHint:'在模板年龄之前留下真实转折',unlockRules:{outcomeTagsAny:['earlyDeath']},contentRevision:CONTENT_REVISION}
);

const realityRules={education:'义务教育与后续学历使用独立在读、完成和中断状态；职业资格另行记录。',employment:'裁员、晋升和排班只适用于真实受雇者；求职、退出劳动市场与主动休闲不得混用。',retirement:'退休取决于出生年代、单位类型、缴费年限和个人选择，不用固定年龄覆盖。',debt:'个人债务逐笔计息；生活缺口合并记录，担保、逾期、重组和遗产处理保留独立状态。',family:'伴侣与子女是带年龄、存亡、关系和法律身份的人物实体。',platform:'远程与旅居需要可迁移能力或真实远程收入，平台依赖增加波动。',franchise:'加盟成本包含品牌、装修、设备、原料、投流和担保，成功需要技能、现金缓冲与低锁定。'};
const trackCoverage=Object.fromEntries(trackOrder.map(id=>[id,{beats:annualBeats.filter(event=>event.track===id).length,decisions:decisions.filter(event=>event.track===id&&event.arc).length,transitions:decisions.filter(event=>event.track===id&&!event.arc).length,roles:['entry','development','daily','conflict','crisis','recovery','exit','legacy']} ]));
const data={version:VERSION,gameVersion:VERSION,schemaVersion:SCHEMA_VERSION,contentRevision:CONTENT_REVISION,stages,locations,desires,conflicts,familyArchetypes,familySecrets,cards,events:[...annualBeats,...decisions,...echoes,...blackSwans],endingProfiles,endingTitles,codex,realityRules,trackCoverage};
fs.writeFileSync(output,`${JSON.stringify(data,null,2)}\n`,'utf8');
console.log(JSON.stringify({version:VERSION,events:{beat:annualBeats.length,decision:decisions.length,consequence:echoes.length,blackSwan:blackSwans.length,total:data.events.length},cards:cards.length,families:familyArchetypes.length,secrets:familySecrets.length,endings:endingTitles.length,codex:codex.length},null,2));
