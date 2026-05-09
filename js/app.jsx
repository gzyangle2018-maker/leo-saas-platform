/* ===== API Functions (merged from api.js) ===== */
const PROXY_BASE_URL = '';
function getProxyBaseUrl(cfgRelayUrl) { return (cfgRelayUrl || PROXY_BASE_URL).replace(/\/$/, ''); }
function getApiModelId(modelId) {
  const map = { best:'gpt-4o',gpt54:'gpt-4o',gpt55max:'gpt-4-turbo',claude46sonnet:'claude-3-5-sonnet-20241022',claude47opusmax:'claude-3-opus-20240229',gemini31pro:'gemini-1.5-pro-latest',grok3:'grok-beta',sonar2:'sonar',deepseekv3:'deepseek-chat',deepseekr2:'deepseek-reasoner',wenxin4:'ernie-bot-4',tongyiqwen3:'qwen-max',spark4:'Spark4.0-Ultra',glm5:'glm-4',doubao15:'Doubao-pro-32k',kimi15:'kimi-latest',minimax6:'abab6.5-chat',o3:'o3-mini',o4mini:'gpt-4o-mini',grok2:'grok-beta',gptimage2:'dall-e-3',dalle3:'dall-e-3',nanobanana2:'dall-e-3',nanobananapro:'dall-e-3',midjourneyv7:'midjourney',sdxl:'stability-ai/sdxl',fluxpro:'flux-pro',ideogram2:'ideogram',recraft3:'recraft',kling2:'kling',jimeng2:'jimeng',grokvideo:'sora',sora:'sora',seedance2:'seedance',runway4:'runway-gen4',luma2:'luma',klingvid:'kling',pika2:'pika' };
  return map[modelId] || modelId;
}
async function callChatAPI(baseUrl,apiKey,modelId,messages){const res=await fetch(`${baseUrl}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model:modelId,messages,temperature:0.7})});if(!res.ok){const err=await res.text();throw new Error(`HTTP ${res.status}: ${err.slice(0,200)}`)}return res.json()}
async function callImageAPI(baseUrl,apiKey,modelId,prompt,size,style){const res=await fetch(`${baseUrl}/images/generations`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model:modelId,prompt,size,n:1,quality:style==='vivid'?'hd':'standard'})});if(!res.ok){const err=await res.text();throw new Error(`HTTP ${res.status}: ${err.slice(0,200)}`)}return res.json()}
async function callVideoAPI(baseUrl,apiKey,modelId,prompt,ratio,dur){const isKling=modelId==='kling'||modelId==='klingvid';const endpoint=isKling?`${baseUrl}/kling/video`:`${baseUrl}/videos/generations`;const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model:modelId,size:ratio.replace(':','x'),duration:dur.replace('s','')})});if(!res.ok){if(res.status===404)throw new Error('该API暂不支持视频生成端点');const err=await res.text();throw new Error(`HTTP ${res.status}: ${err.slice(0,200)}`)}const data=await res.json();if(isKling&&data.data?.task_id&&!data.data?.url){const taskId=data.data.task_id;for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,5000));const pollRes=await fetch(`${baseUrl}/kling/video/status?task_id=${taskId}`,{headers:{Authorization:`Bearer ${apiKey}`}});if(!pollRes.ok)continue;const pollData=await pollRes.json();if(pollData.data?.url)return pollData;if(pollData.data?.task_status==='failed')throw new Error('可灵视频生成失败')}throw new Error('可灵视频生成超时')}return data}
async function callLLM(messages){const cfg=window._apiConfig?window._apiConfig.find(a=>a.enabled):null;if(!cfg||!cfg.apiKey)throw new Error('请先配置API');const baseUrl=getProxyBaseUrl(cfg.relayUrl)||cfg.relayUrl;return callChatAPI(baseUrl,cfg.apiKey,getApiModelId(cfg.modelId||'best'),messages)}
/* ============================================ */

const {useState,useEffect,useRef,useCallback,createContext,useContext}=React;

/* ================== Data ================== */
const TEXT_MODELS=[
{id:'best',name:'Best',provider:'Auto',icon:'fa-star',color:'#111827',desc:'自动选择最佳模型'},
{id:'sonar2',name:'Sonar 2',provider:'Perplexity',icon:'fa-search',color:'#1e3a5f',desc:'实时搜索增强对话'},
{id:'gpt54',name:'GPT-5.4',provider:'OpenAI',icon:'fa-brain',color:'#10a37f',desc:'OpenAI最新旗舰模型'},
{id:'gpt55max',name:'GPT-5.5 Max',provider:'OpenAI',icon:'fa-brain',color:'#10a37f',desc:'OpenAI最强推理模型'},
{id:'gemini31pro',name:'Gemini 3.1 Pro',provider:'Google',icon:'fa-gem',color:'#4285f4',desc:'Google多模态旗舰'},
{id:'claude46sonnet',name:'Claude Sonnet 4.6',provider:'Anthropic',icon:'fa-feather',color:'#d97757',desc:'Anthropic均衡型模型'},
{id:'claude47opusmax',name:'Claude Opus 4.7 Max',provider:'Anthropic',icon:'fa-feather',color:'#cc785c',desc:'Anthropic最强推理'},
{id:'grok3',name:'Grok-3',provider:'xAI',icon:'fa-robot',color:'#ff6b6b',desc:'xAI实时信息模型'},
{id:'wenxin4',name:'文心 4.0',provider:'Baidu',icon:'fa-paw',color:'#2932e1',desc:'百度文心一言'},
{id:'tongyiqwen3',name:'通义千问 3',provider:'Alibaba',icon:'fa-cloud',color:'#ff6a00',desc:'阿里通义千问'},
{id:'spark4',name:'Spark 4.0',provider:'iFlytek',icon:'fa-microphone',color:'#0056ff',desc:'讯飞星火认知大模型'},
{id:'glm5',name:'GLM-5',provider:'Zhipu',icon:'fa-atom',color:'#1a80e5',desc:'智谱清言GLM系列'},
{id:'doubao15',name:'豆包 1.5',provider:'ByteDance',icon:'fa-music',color:'#3c8cff',desc:'字节跳动豆包'},
{id:'kimi15',name:'Kimi 1.5',provider:'Moonshot',icon:'fa-moon',color:'#000000',desc:'月之暗面Kimi'},
{id:'deepseekv3',name:'DeepSeek-V3',provider:'DeepSeek',icon:'fa-anchor',color:'#4d6bfa',desc:'DeepSeek深度求索'},
{id:'deepseekr2',name:'DeepSeek-R2',provider:'DeepSeek',icon:'fa-anchor',color:'#4d6bfa',desc:'DeepSeek推理模型'},
{id:'minimax6',name:'MiniMax-6',provider:'MiniMax',icon:'fa-bolt',color:'#ff0050',desc:'MiniMax海螺AI'},
];

const IMAGE_MODELS=[
{id:'gptimage2',name:'GPT Image 2',provider:'OpenAI',icon:'fa-image',color:'#10a37f',desc:'OpenAI最新图像生成'},
{id:'dalle3',name:'DALL-E 3',provider:'OpenAI',icon:'fa-palette',color:'#10a37f',desc:'高质量文生图'},
{id:'nanobanana2',name:'Nano Banana 2',provider:'Nano',icon:'fa-lemon',color:'#f59e0b',desc:'Nano Banana图像'},
{id:'nanobananapro',name:'Nano Banana Pro',provider:'Nano',icon:'fa-lemon',color:'#f97316',desc:'Nano Banana专业版'},
{id:'midjourneyv7',name:'Midjourney V7',provider:'Midjourney',icon:'fa-wand-magic-sparkles',color:'#1a1a2e',desc:'艺术创作标杆'},
{id:'sdxl',name:'Stable Diffusion XL',provider:'Stability',icon:'fa-layer-group',color:'#7c3aed',desc:'开源图像生成'},
{id:'fluxpro',name:'Flux Pro',provider:'Black Forest',icon:'fa-fire',color:'#dc2626',desc:'Flux高质量图像'},
{id:'ideogram2',name:'Ideogram 2.0',provider:'Ideogram',icon:'fa-font',color:'#2563eb',desc:'文字渲染专家'},
{id:'recraft3',name:'Recraft V3',provider:'Recraft',icon:'fa-pen-nib',color:'#059669',desc:'矢量与插画生成'},
{id:'kling2',name:'可灵 2.0',provider:'Kuaishou',icon:'fa-video',color:'#ff0050',desc:'快手可灵图像'},
{id:'jimeng2',name:'即梦 2.0',provider:'ByteDance',icon:'fa-magic',color:'#3c8cff',desc:'字节即梦作图'},
];

const VIDEO_MODELS=[
{id:'grokvideo',name:'Grok Video',provider:'xAI',icon:'fa-video',color:'#ff6b6b',desc:'xAI视频生成模型'},
{id:'sora',name:'Sora',provider:'OpenAI',icon:'fa-film',color:'#10a37f',desc:'OpenAI文生视频'},
{id:'seedance2',name:'Seedance 2.0',provider:'ByteDance',icon:'fa-film',color:'#3c8cff',desc:'字节视频生成'},
{id:'runway4',name:'Runway Gen-4',provider:'Runway',icon:'fa-clapperboard',color:'#ff6b00',desc:'专业级视频生成'},
{id:'luma2',name:'Luma Dream Machine 2',provider:'Luma',icon:'fa-sun',color:'#f59e0b',desc:'Luma视频创作'},
{id:'klingvid',name:'可灵视频',provider:'Kuaishou',icon:'fa-video',color:'#ff0050',desc:'快手可灵视频'},
{id:'pika2',name:'Pika 2.0',provider:'Pika',icon:'fa-play-circle',color:'#ec4899',desc:'Pika视频生成'},
];

const TOOL_TAGS=['GPT Image 2','Seedance 2.0','Nano Banana Pro','Design','Branding','E-Commerce'];

const INITIAL_MEMBERS=[
{id:1,name:'张三',email:'zhangsan@company.com',password:'zs123456',avatar:'ZS',color:'linear-gradient(135deg,#3b82f6,#06b6d4)',role:'member',dailyQuota:200,usedToday:87,totalUsed:3250,status:'online',joinDate:'2026-01-15'},
{id:2,name:'李四',email:'lisi@company.com',password:'ls123456',avatar:'LS',color:'linear-gradient(135deg,#8b5cf6,#ec4899)',role:'member',dailyQuota:150,usedToday:134,totalUsed:4890,status:'online',joinDate:'2026-02-01'},
{id:3,name:'王五',email:'wangwu@company.com',password:'ww123456',avatar:'WW',color:'linear-gradient(135deg,#f59e0b,#ef4444)',role:'member',dailyQuota:100,usedToday:45,totalUsed:1890,status:'offline',joinDate:'2026-02-20'},
];

const INITIAL_CONVERSATIONS=[
{id:1,memberId:1,memberName:'张三',model:'GPT-5.4',type:'text',content:'帮我写一个Python脚本批量处理CSV',response:'好的，这是一个完整的Python脚本...',timestamp:'2026-04-25 09:30',tokens:320},
{id:2,memberId:2,memberName:'李四',model:'Claude Sonnet 4.6',type:'text',content:'分析这份市场调研报告的关键发现',response:'根据报告，关键发现包括...',timestamp:'2026-04-25 10:15',tokens:480},
{id:3,memberId:2,memberName:'李四',model:'GPT Image 2',type:'image',content:'生成一张未来科技城市概念图，赛博朋克风格',response:'[图片已生成]',timestamp:'2026-04-25 11:00',tokens:150},
{id:4,memberId:1,memberName:'张三',model:'DeepSeek-V3',type:'text',content:'优化这段SQL查询性能',response:'优化后的SQL如下...',timestamp:'2026-04-25 14:00',tokens:280},
{id:5,memberId:3,memberName:'王五',model:'Grok Video',type:'video',content:'生成产品宣传短视频',response:'[视频已生成]',timestamp:'2026-04-25 15:20',tokens:200},
];

const INITIAL_CODES=[
{code:'yangle666',password:'yangle666',status:'active',expiry:'2099-12-31',maxUses:999,usedCount:0,machineId:null,machineName:null},
{code:'ACTIVE-2026-001',password:'abc123',status:'active',expiry:'2026-12-31',maxUses:5,usedCount:2,machineId:null,machineName:null},
{code:'ACTIVE-2026-002',password:'def456',status:'active',expiry:'2026-06-30',maxUses:3,usedCount:0,machineId:null,machineName:null},
{code:'ACTIVE-2026-003',password:'ghi789',status:'used',expiry:'2026-12-31',maxUses:1,usedCount:1,machineId:'MACH-abc123',machineName:'DESKTOP-ABC'},
];

const INITIAL_API_CONFIG=[
{provider:'OpenAI',apiKey:'',relayUrl:'',enabled:true,models:['GPT-5.4','GPT-5.5 Max','GPT Image 2','Sora','DALL-E 3']},
{provider:'Anthropic',apiKey:'',relayUrl:'',enabled:true,models:['Claude Sonnet 4.6','Claude Opus 4.7 Max']},
{provider:'Google',apiKey:'',relayUrl:'',enabled:true,models:['Gemini 3.1 Pro']},
{provider:'xAI',apiKey:'',relayUrl:'',enabled:true,models:['Grok-3','Grok Video']},
{provider:'Perplexity',apiKey:'',relayUrl:'',enabled:true,models:['Sonar 2']},
{provider:'Baidu',apiKey:'',relayUrl:'',enabled:false,models:['文心 4.0']},
{provider:'Alibaba',apiKey:'',relayUrl:'',enabled:false,models:['通义千问 3']},
{provider:'iFlytek',apiKey:'',relayUrl:'',enabled:false,models:['Spark 4.0']},
{provider:'Zhipu',apiKey:'',relayUrl:'',enabled:false,models:['GLM-5']},
{provider:'ByteDance',apiKey:'',relayUrl:'',enabled:false,models:['豆包 1.5','即梦 2.0','Seedance 2.0']},
{provider:'Kuaishou',apiKey:'',relayUrl:'',enabled:false,models:['可灵 2.0','可灵视频']},
{provider:'Moonshot',apiKey:'',relayUrl:'',enabled:false,models:['Kimi 1.5']},
{provider:'DeepSeek',apiKey:'',relayUrl:'',enabled:false,models:['DeepSeek-V3','DeepSeek-R2']},
{provider:'MiniMax',apiKey:'',relayUrl:'',enabled:false,models:['MiniMax-6']},
];

const INITIAL_PROJECTS=[
{id:1,name:'春季品牌视觉',type:'design',thumb:'https://picsum.photos/seed/p1/400/300',updated:'2小时前'},
{id:2,name:'产品宣传片',type:'video',thumb:'https://picsum.photos/seed/p2/400/300',updated:'昨天'},
{id:3,name:'电商主图套装',type:'image',thumb:'https://picsum.photos/seed/p3/400/300',updated:'3天前'},
{id:4,name:'企业介绍PPT',type:'doc',thumb:'https://picsum.photos/seed/p4/400/300',updated:'1周前'},
];

const INITIAL_USAGE_RECORDS=[
{id:1,memberId:1,memberName:'张三',type:'text',model:'GPT-5.4',tokens:320,timestamp:'2026-04-25 09:30'},
{id:2,memberId:2,memberName:'李四',type:'text',model:'Claude Sonnet 4.6',tokens:480,timestamp:'2026-04-25 10:15'},
{id:3,memberId:2,memberName:'李四',type:'image',model:'GPT Image 2',tokens:150,timestamp:'2026-04-25 11:00'},
{id:4,memberId:1,memberName:'张三',type:'text',model:'DeepSeek-V3',tokens:280,timestamp:'2026-04-25 14:00'},
{id:5,memberId:3,memberName:'王五',type:'video',model:'Grok Video',tokens:200,timestamp:'2026-04-25 15:20'},
];

const TODAY=new Date().toISOString().split('T')[0];

/* ================== Utils & Storage ================== */
function hash(str){let h=0;for(let i=0;i<str.length;i++){h=((h<<5)-h)+str.charCodeAt(i);h|=0}return Math.abs(h).toString(36).substring(0,8)}
function getMachineId(){return 'MACH-'+hash(navigator.userAgent+navigator.platform+screen.width+'x'+screen.height+screen.colorDepth)}
function getMachineName(){return navigator.platform||'Unknown Device'}

const STORAGE_KEY='qoderwork_data';
function loadStorage(){
  try{const raw=localStorage.getItem(STORAGE_KEY);if(raw)return JSON.parse(raw)}catch(e){}
  return{};
}
function saveStorage(data){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}catch(e){}
}
function getMachineName(){return navigator.platform.replace(/Win32/,'Windows').replace(/MacIntel/,'macOS')+' '+hash(navigator.userAgent).substring(0,4).toUpperCase()}
function validateActivation(codes,code,password){const c=codes.find(x=>x.code===code);if(!c)return{ok:false,msg:'激活码不存在'};if(c.password!==password)return{ok:false,msg:'密码错误'};if(c.status==='expired'||new Date(c.expiry)<new Date())return{ok:false,msg:'激活码已过期'};if(c.status==='used'&&c.usedCount>=c.maxUses&&c.machineId&&c.machineId!==getMachineId())return{ok:false,msg:'激活码使用次数已达上限'};return{ok:true,data:c}}
/* ================== Context ================== */
const AppContext=createContext(null);
function AppProvider({children}){
  const stored=loadStorage();

  const [activated,setActivated]=useState(stored.activated||false);
  const [role,setRole]=useState(stored.role||null);
  const [currentUser,setCurrentUser]=useState(stored.currentUser||null);
  const [activePage,setActivePage]=useState('home');
  const [members,setMembers]=useState(stored.members||INITIAL_MEMBERS);
  const [conversations,setConversations]=useState(stored.conversations||INITIAL_CONVERSATIONS);
  const [codes,setCodes]=useState(stored.codes||INITIAL_CODES);
  const [apiConfig,setApiConfig]=useState(stored.apiConfig||INITIAL_API_CONFIG);
  const [projects,setProjects]=useState(stored.projects||INITIAL_PROJECTS);
  const [toasts,setToasts]=useState([]);
  const [selTextModel,setSelTextModel]=useState(TEXT_MODELS[2]);
  const [selImgModel,setSelImgModel]=useState(IMAGE_MODELS[0]);
  const [selVidModel,setSelVidModel]=useState(VIDEO_MODELS[0]);
  const [chatMsgs,setChatMsgs]=useState([]);
  const [isTyping,setIsTyping]=useState(false);
  const [showUserMenu,setShowUserMenu]=useState(false);
  const [usageRecords,setUsageRecords]=useState(stored.usageRecords||INITIAL_USAGE_RECORDS);
  const [theme,setTheme]=useState(stored.theme||'light');

  // Apply theme
  useEffect(()=>{document.documentElement.setAttribute('data-theme',theme)},[theme]);

  // Persist to localStorage
  useEffect(()=>{
    saveStorage({activated,role,currentUser,members,conversations,codes,apiConfig,projects,usageRecords,theme});
  },[activated,role,currentUser,members,conversations,codes,apiConfig,projects,usageRecords,theme]);

  const toggleTheme=useCallback(()=>setTheme(t=>t==='light'?'dark':'light'),[]);

  const addToast=useCallback((message,type='info')=>{const id=Date.now();setToasts(p=>[...p,{id,message,type}]);setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3000)},[]);
  const login=useCallback((userRole,userData)=>{setRole(userRole);setCurrentUser(userData);setActivePage('home');addToast(userRole==='admin'?'管理员登录成功':'欢迎回来，'+userData.name,'success')},[addToast]);
  const logout=useCallback(()=>{setRole(null);setCurrentUser(null);setActivePage('home');setChatMsgs([]);setShowUserMenu(false)},[]);
  const addConv=useCallback((conv)=>setConversations(p=>[conv,...p]),[]);
  const updMember=useCallback((id,up)=>setMembers(p=>p.map(m=>m.id===id?{...m,...up}:m)),[]);
  const delMember=useCallback((id)=>setMembers(p=>p.filter(m=>m.id!==id)),[]);
  const addMember=useCallback((m)=>setMembers(p=>[...p,{...m,id:Date.now(),totalUsed:0,usedToday:0,status:'offline'}]),[]);
  const updCode=useCallback((code,up)=>setCodes(p=>p.map(c=>c.code===code?{...c,...up}:c)),[]);
  const addCode=useCallback((c)=>setCodes(p=>[...p,{...c,usedCount:0,machineId:null,machineName:null}]),[]);
  const delCode=useCallback((code)=>setCodes(p=>p.filter(c=>c.code!==code)),[]);
  const updApi=useCallback((provider,up)=>setApiConfig(p=>p.map(a=>a.provider===provider?{...a,...up}:a)),[]);
  const addProject=useCallback((pr)=>setProjects(p=>[{...pr,id:Date.now(),updated:'刚刚'},...p]),[]);
  const addUsageRecord=useCallback((record)=>{
    const tokens=record.tokens||0;
    const r={...record,id:Date.now(),timestamp:new Date().toISOString().replace('T',' ').slice(0,16)};
    setUsageRecords(p=>[r,...p]);
    setMembers(p=>p.map(m=>{
      if(m.id===record.memberId){
        return{...m,usedToday:(m.usedToday||0)+tokens,totalUsed:(m.totalUsed||0)+tokens};
      }
      return m;
    }));
    if(currentUser&&currentUser.id===record.memberId){
      setCurrentUser(p=>({...p,usedToday:(p.usedToday||0)+tokens,totalUsed:(p.totalUsed||0)+tokens}));
    }
  },[currentUser]);

  return (
    <AppContext.Provider value={{
      activated,setActivated,role,currentUser,activePage,setActivePage,
      members,setMembers,conversations,setConversations,codes,setCodes,apiConfig,setApiConfig,projects,setProjects,
      toasts,addToast,login,logout,selTextModel,setSelTextModel,selImgModel,setSelImgModel,selVidModel,setSelVidModel,
      chatMsgs,setChatMsgs,isTyping,setIsTyping,showUserMenu,setShowUserMenu,
      addConv,updMember,delMember,addMember,updCode,addCode,delCode,updApi,addProject,
      usageRecords,addUsageRecord,theme,toggleTheme
    }}>
      {children}
      <ToastContainer/>
    </AppContext.Provider>
  );
}
function useApp(){return useContext(AppContext)}

/* ================== Components ================== */
function ToastContainer(){const{toasts}=useApp();if(!toasts.length)return null;return(
  <div className="toast-container">
    {toasts.map(t=>(
      <div key={t.id} className="toast">
        <i className={`fas ${t.type==='success'?'fa-check-circle text-green-500':t.type==='error'?'fa-times-circle text-red-500':t.type==='warning'?'fa-exclamation-circle text-orange-500':'fa-info-circle text-blue-500'}`}></i>
        <span className="text-sm font-medium text-gray-700">{t.message}</span>
      </div>
    ))}
  </div>
)}

function Modal({isOpen,onClose,title,children,size='md'}){if(!isOpen)return null;const sz={sm:'max-w-md',md:'max-w-lg',lg:'max-w-2xl',xl:'max-w-4xl'};return(
  <div className="modal-overlay" onClick={onClose}>
    <div className={`${sz[size]} modal-content`} onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <h3 className="text-base font-semibold">{title}</h3>
        <button onClick={onClose} className="btn-ghost !p-1"><i className="fas fa-times"></i></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
)}

function ConfirmModal({isOpen,onClose,onConfirm,title,message,confirmText='确认',cancelText='取消',type='danger'}){if(!isOpen)return null;return(
  <div className="modal-overlay" onClick={onClose}>
    <div className="max-w-sm modal-content p-6 text-center" onClick={e=>e.stopPropagation()}>
      <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{background:type==='danger'?'rgba(239,68,68,0.1)':'rgba(37,99,235,0.1)'}}>
        <i className={`fas ${type==='danger'?'fa-exclamation-triangle text-red-500':'fa-question-circle text-blue-500'}`}></i>
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-5">{message}</p>
      <div className="flex gap-2 justify-center">
        <button onClick={onClose} className="btn-secondary">{cancelText}</button>
        <button onClick={()=>{onConfirm();onClose();}} className={`${type==='danger'?'bg-red-500 hover:bg-red-600':'btn-primary'} text-white px-5 py-2 rounded-xl text-sm font-medium transition-all`}>{confirmText}</button>
      </div>
    </div>
  </div>
)}

/* ================== Sidebar ================== */
function Sidebar(){
  const {activePage,setActivePage,currentUser,logout,role,showUserMenu,setShowUserMenu,theme,toggleTheme}=useApp();
  const ref=useRef(null);
  useEffect(()=>{function handle(e){if(ref.current&&!ref.current.contains(e.target))setShowUserMenu(false)}document.addEventListener('mousedown',handle);return()=>document.removeEventListener('mousedown',handle)},[setShowUserMenu]);

  const memberItems=[
    {key:'home',icon:'fa-home',label:'首页'},
    {key:'chat',icon:'fa-comments',label:'对话'},
    {key:'image',icon:'fa-image',label:'作图'},
    {key:'video',icon:'fa-video',label:'视频'},
    {key:'projects',icon:'fa-folder-open',label:'项目'},
  ];
  const adminItems=[
    {key:'home',icon:'fa-home',label:'首页'},
    {key:'chat',icon:'fa-comments',label:'对话'},
    {key:'image',icon:'fa-image',label:'作图'},
    {key:'video',icon:'fa-video',label:'视频'},
    {key:'projects',icon:'fa-folder-open',label:'项目'},
    {key:'admin-dash',icon:'fa-chart-line',label:'概览'},
    {key:'admin-records',icon:'fa-history',label:'记录'},
    {key:'admin-members',icon:'fa-users',label:'成员'},
    {key:'admin-codes',icon:'fa-key',label:'激活码'},
    {key:'admin-api',icon:'fa-plug',label:'API配置'},
  ];
  const items=role==='admin'?adminItems:memberItems;

  return (
    <aside className="h-screen flex flex-col" style={{width:64,borderRight:'1px solid var(--bdr)',background:'var(--bg2)'}}>
      <div className="h-14 flex items-center justify-center shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'var(--txt)'}}>
          <i className="fas fa-cube text-white text-xs"></i>
        </div>
      </div>
      <nav className="flex-1 flex flex-col items-center py-2 overflow-y-auto">
        {items.map(item=>(
          <button key={item.key} onClick={()=>setActivePage(item.key)} className={`sidebar-item ${activePage===item.key?'active':''}`} title={item.label}>
            <i className={`fas ${item.icon}`}></i>
          </button>
        ))}
      </nav>
      <div className="p-2 flex flex-col items-center gap-2 shrink-0 relative" ref={ref}>
        <button onClick={toggleTheme} className="sidebar-item" style={{width:36,height:36,fontSize:14}} title={theme==='light'?'切换深色模式':'切换浅色模式'}>
          <i className={`fas ${theme==='light'?'fa-moon':'fa-sun'}`} style={{color:theme==='light'?'#6b7280':'#fbbf24'}}></i>
        </button>
        <button onClick={()=>setShowUserMenu(!showUserMenu)} className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{background:currentUser?.color||'var(--txt)'}}>
          {currentUser?.avatar}
        </button>
        {showUserMenu&&(
          <div className="dropdown" style={{bottom:52,right:8,top:'auto'}}>
            <div className="px-3 py-2 border-b" style={{borderColor:'var(--bdr)'}}>
              <p className="text-sm font-semibold">{currentUser?.name}</p>
              <p className="text-xs" style={{color:'var(--txt3)'}}>{currentUser?.role==='admin'?'管理员':'组员'}</p>
            </div>
            <div className="py-1">
              <button onClick={()=>{setActivePage('home');setShowUserMenu(false);}} className="w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 hover:opacity-80" style={{color:'var(--txt2)'}}><i className="fas fa-home text-xs w-4"></i>首页</button>
              <button onClick={()=>{setActivePage('projects');setShowUserMenu(false);}} className="w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 hover:opacity-80" style={{color:'var(--txt2)'}}><i className="fas fa-folder text-xs w-4"></i>我的项目</button>
            </div>
            <div className="border-t py-1" style={{borderColor:'var(--bdr)'}}>
              <button onClick={logout} className="w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 hover:opacity-80" style={{color:'var(--red)'}}><i className="fas fa-sign-out-alt text-xs w-4"></i>退出登录</button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ================== Activation Page ================== */
function ActivationPage(){
  const {codes,setCodes,setActivated,login,addToast}=useApp();
  const [code,setCode]=useState('');
  const [pwd,setPwd]=useState('');
  const [loading,setLoading]=useState(false);

  const handleActivate=()=>{
    if(!code.trim()||!pwd.trim()){addToast('请输入激活码和密码','warning');return}
    setLoading(true);
    setTimeout(()=>{
      const r=validateActivation(codes,code.trim(),pwd.trim());
      if(!r.ok){addToast(r.msg,'error');setLoading(false);return}
      const c=r.data;
      const mid=getMachineId();
      const mname=getMachineName();
      if(c.status==='used'&&c.machineId&&c.machineId!==mid){addToast('该激活码已绑定其他设备','error');setLoading(false);return}
      setCodes(p=>p.map(x=>x.code===c.code?{...x,status:'used',usedCount:x.usedCount+1,machineId:mid,machineName:mname}:x));
      setActivated(true);
      const adminData={id:0,name:'管理员',avatar:'AD',color:'linear-gradient(135deg,#3b82f6,#8b5cf6)',role:'admin',dailyQuota:99999,usedToday:0};
      login('admin',adminData);
      addToast('激活成功！已以管理员身份进入系统','success');
      setLoading(false);
    },800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--bg2)'}}>
      <div className="w-full max-w-md mx-4 fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{background:'var(--txt)'}}>
            <i className="fas fa-cube text-2xl text-white"></i>
          </div>
          <h1 className="text-3xl font-bold mb-1">AI 调度中台</h1>
          <p className="text-sm text-gray-400">统一调度 · 智能管理 · 高效协作</p>
        </div>
        <div className="glass p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">激活码</label>
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="请输入激活码" className="input"/>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">密码</label>
            <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="请输入密码" className="input" onKeyDown={e=>e.key==='Enter'&&handleActivate()}/>
          </div>
          <div className="glass2 p-3 text-xs text-gray-500 space-y-1">
            <p><i className="fas fa-info-circle mr-1"></i>每个激活码绑定一台设备</p>
            <p><i className="fas fa-desktop mr-1"></i>当前设备: {getMachineName()}</p>
            <p><i className="fas fa-fingerprint mr-1"></i>设备ID: {getMachineId()}</p>
          </div>
          <button onClick={handleActivate} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading?<i className="fas fa-circle-notch fa-spin"></i>:<i className="fas fa-unlock"></i>}
            {loading?'激活中...':'激活设备'}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">支持 GPT · Claude · Gemini · Grok · DeepSeek · 通义 · 文心 · Kimi 等</p>
      </div>
    </div>
  );
}

/* ================== Login Page ================== */
function LoginPage(){
  const {login,members,addToast}=useApp();
  const [account,setAccount]=useState('');
  const [pwd,setPwd]=useState('');
  const [loading,setLoading]=useState(false);

  const handleLogin=()=>{
    if(!account.trim()||!pwd.trim()){addToast('请输入账号和密码','warning');return}
    setLoading(true);
    setTimeout(()=>{
      if((account.trim()==='admin'||account.trim()==='yangle666')&&pwd.trim()==='yangle666'){
        login('admin',{id:0,name:'管理员',avatar:'AD',color:'linear-gradient(135deg,#3b82f6,#8b5cf6)',role:'admin',dailyQuota:99999,usedToday:0});
        setLoading(false);return;
      }
      const member=members.find(m=>(m.email===account.trim()||m.name===account.trim())&&m.password===pwd.trim());
      if(member){login('member',{...member,status:'online'});setLoading(false);return;}
      addToast('账号或密码错误','error');
      setLoading(false);
    },600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--bg2)'}}>
      <div className="w-full max-w-sm mx-4 fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{background:'var(--txt)'}}>
            <i className="fas fa-cube text-2xl text-white"></i>
          </div>
          <h1 className="text-2xl font-bold mb-1">AI 调度中台</h1>
          <p className="text-sm text-gray-400">账号登录</p>
        </div>
        <div className="glass p-5 space-y-3">
          <input value={account} onChange={e=>setAccount(e.target.value)} placeholder="用户名 / 邮箱" className="input" onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
          <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="密码" className="input" onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
          <button onClick={handleLogin} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading?<i className="fas fa-circle-notch fa-spin"></i>:<i className="fas fa-sign-in-alt"></i>}
            {loading?'登录中...':'登录'}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">管理员默认账号 admin / yangle666</p>
      </div>
    </div>
  );
}

/* ================== Home Page ================== */
function HomePage(){
  const {currentUser,setActivePage,conversations,projects}=useApp();
  const userConvs=conversations.filter(c=>c.memberId===currentUser?.id).slice(0,4);
  const usagePct=Math.round((currentUser?.usedToday||0)/(currentUser?.dailyQuota||1)*100);

  return (
    <div className="h-full overflow-y-auto fade-in">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">欢迎回来，{currentUser?.name}</h2>
            <p className="text-sm text-gray-400 mt-0.5">今天想创作点什么？</p>
          </div>
          <div className="glass px-4 py-2 flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">今日用量</p>
              <p className="text-lg font-bold">{currentUser?.usedToday}<span className="text-sm font-normal text-gray-400"> / {currentUser?.dailyQuota}</span></p>
            </div>
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10" style={{transform:'rotate(-90deg)'}} viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
                <circle cx="20" cy="20" r="16" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeDasharray={100.5} strokeDashoffset={100.5-(100.5*usagePct/100)}/>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-600">{usagePct}%</span>
            </div>
          </div>
        </div>

        <div className="glass p-2 mb-8">
          <div className="flex items-center gap-3 px-4 py-3">
            <i className="fas fa-magic text-gray-400"></i>
            <input placeholder="描述你想创作的内容..." className="flex-1 bg-transparent outline-none text-sm" readOnly onClick={()=>setActivePage('chat')}/>
            <button className="btn-ghost text-gray-400" onClick={()=>setActivePage('chat')}><i className="fas fa-paper-plane"></i></button>
          </div>
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
            <button onClick={()=>setActivePage('chat')} className="pill"><i className="fas fa-comments text-gray-400"></i>AI对话</button>
            <button onClick={()=>setActivePage('image')} className="pill"><i className="fas fa-image text-purple-500"></i>作图</button>
            <button onClick={()=>setActivePage('video')} className="pill"><i className="fas fa-video text-orange-500"></i>视频</button>
            <button onClick={()=>setActivePage('chat')} className="pill"><i className="fas fa-upload text-gray-400"></i>上传文件</button>
            <button onClick={()=>setActivePage('chat')} className="pill"><i className="fas fa-globe text-gray-400"></i>联网搜索</button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TOOL_TAGS.map(t=>(<span key={t} className="tag">{t}</span>))}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[{key:'chat',icon:'fa-comments',title:'AI对话',desc:'多模型智能问答',col:'#2563eb'},{key:'image',icon:'fa-image',title:'AI作图',desc:'文生图/图生图',col:'#8b5cf6'},{key:'video',icon:'fa-video',title:'AI视频',desc:'文生视频创作',col:'#f97316'}].map(a=> (
            <button key={a.key} onClick={()=>setActivePage(a.key)} className="card text-left group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white transition-transform group-hover:scale-110" style={{background:a.col}}>
                <i className={`fas ${a.icon} text-sm`}></i>
              </div>
              <h3 className="font-semibold text-sm mb-0.5">{a.title}</h3>
              <p className="text-xs text-gray-400">{a.desc}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><i className="fas fa-clock text-gray-400"></i>最近使用</h3>
            <div className="space-y-2">
              {userConvs.length?userConvs.map(c=> (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs" style={{background:c.type==='image'?'rgba(139,92,246,0.1)':c.type==='video'?'rgba(249,115,22,0.1)':'rgba(37,99,235,0.1)',color:c.type==='image'?'#8b5cf6':c.type==='video'?'#f97316':'#2563eb'}}>
                    <i className={`fas ${c.type==='image'?'fa-image':c.type==='video'?'fa-video':'fa-comment'}`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{c.content}</p>
                    <p className="text-xs text-gray-400">{c.model} · {c.timestamp.split(' ')[1]}</p>
                  </div>
                </div>
              )):<p className="text-xs text-gray-400 py-4 text-center">暂无使用记录</p>}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><i className="fas fa-folder text-gray-400"></i>最近项目</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>setActivePage('projects')} className="card flex flex-col items-center justify-center p-4 border-dashed border-2 hover:border-gray-300" style={{minHeight:100}}>
                <i className="fas fa-plus text-gray-300 text-xl mb-1"></i>
                <span className="text-xs text-gray-400">新建项目</span>
              </button>
              {projects.slice(0,3).map(p=> (
                <div key={p.id} className="card p-0 overflow-hidden group">
                  <div className="aspect-[4/3] bg-gray-100 relative">
                    <img src={p.thumb} alt={p.name} className="w-full h-full object-cover"/>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.updated}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================== Chat Page ================== */
function ChatPage(){
  const {currentUser,selTextModel,setSelTextModel,chatMsgs,setChatMsgs,isTyping,setIsTyping,addConv,addToast,addUsageRecord,apiConfig}=useApp();
  const [input,setInput]=useState('');
  const [showModelSel,setShowModelSel]=useState(false);
  const [selTag,setSelTag]=useState('全部');
  const endRef=useRef(null);

  const providers=['全部',...new Set(TEXT_MODELS.map(m=>m.provider))];
  const filtered=selTag==='全部'?TEXT_MODELS:TEXT_MODELS.filter(m=>m.provider===selTag);

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[chatMsgs,isTyping]);

  const handleSend=async()=>{
    if(!input.trim()||isTyping)return;
    const um={id:Date.now(),role:'user',content:input};
    setChatMsgs(p=>[...p,um]);
    setInput('');
    setIsTyping(true);

    const cfg=apiConfig.find(a=>a.provider===selTextModel.provider&&a.enabled);
    if(!cfg||!cfg.apiKey){setIsTyping(false);addToast('请先在该模型的API配置中填写API Key','warning');return}

    const baseUrl=getProxyBaseUrl(cfg.relayUrl);
    const modelId=getApiModelId(selTextModel.id);
    const messages=chatMsgs.filter(m=>m.role==='user'||m.role==='assistant').slice(-10).map(m=>({role:m.role,content:m.content}));
    messages.push({role:'user',content:input});

    try{
      const data=await callChatAPI(baseUrl,cfg.apiKey,modelId,messages);
      const content=data.choices?.[0]?.message?.content||'[空回复]';
      const am={id:Date.now()+1,role:'assistant',content,model:selTextModel.name};
      setChatMsgs(p=>[...p,am]);
      const tk=data.usage?.total_tokens||Math.ceil(content.length/2)||0;
      addConv({id:Date.now(),memberId:currentUser?.id,memberName:currentUser?.name,model:selTextModel.name,type:'text',content:um.content,response:content,timestamp:new Date().toISOString().replace('T',' ').slice(0,16),tokens:tk});
      addUsageRecord({memberId:currentUser?.id,memberName:currentUser?.name,type:'text',model:selTextModel.name,tokens:tk});
    }catch(e){
      const errMsg=e.message.includes('Failed to fetch')?'网络请求失败，请检查：1) 是否通过HTTP服务器运行（非file://）；2) API地址是否正确；3) 是否开启VPN/代理。':e.message;
      const am={id:Date.now()+1,role:'assistant',content:`❌ 请求失败：${errMsg}`,model:selTextModel.name};
      setChatMsgs(p=>[...p,am]);
    }finally{
      setIsTyping(false);
    }
  };

  return (
    <div className="h-full flex flex-col fade-in">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className="relative">
          <button onClick={()=>setShowModelSel(!showModelSel)} className="pill active flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{background:selTextModel.color}}>
              <i className={`fas ${selTextModel.icon} text-white text-[8px]`}></i>
            </div>
            {selTextModel.name}
            <i className="fas fa-chevron-down text-xs ml-1"></i>
          </button>
          {showModelSel&&(
            <div className="absolute top-full left-0 mt-2 border rounded-2xl shadow-xl p-3 z-30 w-80" style={{background:'var(--bg)',borderColor:'var(--bdr)'}}>
              <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
                {providers.map(p=>(<button key={p} onClick={()=>setSelTag(p)} className={`pill text-xs ${selTag===p?'active':''}`}>{p}</button>))}
              </div>
              <div className="max-h-72 overflow-y-auto space-y-0.5">
                {filtered.map(m=> (
                  <div key={m.id} onClick={()=>{setSelTextModel(m);setShowModelSel(false);}} className={`model-opt ${selTextModel.id===m.id?'sel':''}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{background:m.color}}>
                      <i className={`fas ${m.icon} text-white text-[9px]`}></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-400">{selTextModel.desc}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {chatMsgs.length===0&&(
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{background:'var(--bg2)'}}>
              <i className="fas fa-robot text-2xl text-gray-300"></i>
            </div>
            <p className="text-base font-medium text-gray-600 mb-0.5">开始与 {selTextModel.name} 对话</p>
            <p className="text-xs">输入问题，AI将为您提供智能回答</p>
            <div className="mt-5 flex flex-wrap gap-2 max-w-lg justify-center">
              {['帮我写Python代码','分析商业案例','翻译英文段落','给创意灵感'].map(s=> (
                <button key={s} onClick={()=>setInput(s)} className="pill text-xs">{s}</button>
              ))}
            </div>
          </div>
        )}
        {chatMsgs.map(msg=> (
          <div key={msg.id} className={`flex ${msg.role==='user'?'justify-end':'justify-start'}`}>
            <div className={msg.role==='user'?'chat-user':'chat-ai'}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.model&&<p className="text-[10px] mt-1.5 opacity-50">{msg.model}</p>}
            </div>
          </div>
        ))}
        {isTyping&&(
          <div className="flex justify-start">
            <div className="chat-ai"><div className="typing"><span></span><span></span><span></span></div></div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="glass flex items-end gap-2 p-2">
          <button className="btn-ghost text-gray-400" title="上传文件"><i className="fas fa-paperclip"></i></button>
          <button className="btn-ghost text-gray-400" title="联网搜索"><i className="fas fa-globe"></i></button>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend()}}}
            placeholder="输入问题..." rows={1} className="flex-1 bg-transparent text-sm outline-none resize-none py-2 px-1 max-h-28" style={{minHeight:36}}/>
          <button onClick={handleSend} disabled={!input.trim()||isTyping} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${input.trim()&&!isTyping?'btn-primary !p-0':'bg-gray-200 text-gray-400'}`}>
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================== ImageGen Page ================== */
function ImageGenPage(){
  const {currentUser,selImgModel,setSelImgModel,addConv,addToast,addUsageRecord,apiConfig}=useApp();
  const [step,setStep]=useState(1);
  const [links,setLinks]=useState('');
  const [productInfo,setProductInfo]=useState('');
  const [sellingPoints,setSellingPoints]=useState('');
  const [promptList,setPromptList]=useState([]);
  const [generatedImages,setGeneratedImages]=useState([]);
  const [loading,setLoading]=useState(false);
  const [showSel,setShowSel]=useState(false);
  const [editModal,setEditModal]=useState(null);
  const [editPrompt,setEditPrompt]=useState('');
  const [screenshot,setScreenshot]=useState(null);
  const [size,setSize]=useState('1024x1024');
  const [style,setStyle]=useState('vivid');
  const stepTitles=['批量收集信息','提取卖点','生成提示词','批量出图'];

  const getLLMCfg=()=>{
    const textModel=TEXT_MODELS.find(m=>m.id==='gpt54')||TEXT_MODELS[2];
    const cfg=apiConfig.find(a=>a.provider===textModel.provider&&a.enabled);
    if(!cfg||!cfg.apiKey)return null;
    return{baseUrl:getProxyBaseUrl(cfg.relayUrl),apiKey:cfg.apiKey,modelId:getApiModelId(textModel.id)};
  };

  const callLLM=async(messages)=>{
    const cfg=getLLMCfg();
    if(!cfg)throw new Error('请先配置文本模型API（如GPT-5.4）');
    const data=await callChatAPI(cfg.baseUrl,cfg.apiKey,cfg.modelId,messages);
    return data.choices?.[0]?.message?.content||'';
  };

  // Step 1: 收集信息
  const handleCollect=async()=>{
    if(!links.trim()&&!productInfo.trim()){addToast('请输入产品链接或产品信息','warning');return}
    setLoading(true);
    try{
      const sys='你是一个Amazon Listing Intake Collector。只收集和整理信息，不生成最终文案。将运营提供的产品信息整合为结构化输出：产品本体卡、兼容边界卡、页面证据卡、误购/退货风险卡、视觉证据卡、数据缺口清单、Ready Gate判定。';
      const user=`产品链接/ASIN：\n${links}\n\n产品信息：\n${productInfo}\n\n请按结构化格式输出收集结果。`;
      const content=await callLLM([{role:'system',content:sys},{role:'user',content:user}]);
      setProductInfo(content);
      addToast('信息收集完成','success');
      setStep(2);
    }catch(e){addToast(`收集失败：${e.message}`,'error')}
    finally{setLoading(false)}
  };

  // Step 2: 提取卖点
  const handleExtract=async()=>{
    if(!productInfo.trim()){addToast('请先完成信息收集','warning');return}
    setLoading(true);
    try{
      const sys='你是一个专门服务Amazon类目的「结构化产品卖点提炼与合规模板」专家。严禁编造参数、认证、材质、尺寸、适配机型。所有信息不确定时必须标记为「待确认」。输出语言：简体中文。';
      const user=`以下是收集到的产品信息：\n\n${productInfo}\n\n请严格按照以下结构输出：\n一、基础认知与卖点提炼：AI解析-产品标题、A解析-功能卖点（5-8条）、核心功能与技术参数、主要用户群体（3-5类）、典型使用场景（10-20个）、核心技术卖点（3-5条）、已验证购买理由（3-6条）、明显痛点问题（4-8条）、材质工艺、竞品对比优势（3-6条）。\n二、产品组成&禁止元素：产品组件清单（标注核心主体/可辅助出现/不宜作为主体）、画面禁止元素清单。\n三、参考风格与图片优先级：参考风格、图片证据点优先级（P1/P2/P3）、主图合规提醒、不确定信息清单。`;
      const content=await callLLM([{role:'system',content:sys},{role:'user',content:user}]);
      setSellingPoints(content);
      addToast('卖点提取完成','success');
      setStep(3);
    }catch(e){addToast(`提取失败：${e.message}`,'error')}
    finally{setLoading(false)}
  };

  // Step 3: 生成提示词
  const handleGenPrompts=async()=>{
    if(!sellingPoints.trim()){addToast('请先完成卖点提取','warning');return}
    setLoading(true);
    try{
      const sys='你是服务Amazon跨境3C品牌的「顶级视觉总监+提示词架构师」。把Gem1已提炼完成的结构化结果，直接转换成可执行的Amazon图片方案与高质量英文提示词，用于主图1-8、高级A+。';
      const user=`以下是Gem1提炼的结构化卖点报告：\n\n${sellingPoints}\n\n请输出：\n1. Global Style Lock（全局风格锁）\n2. Main Image Mapping（主图1-8映射表）\n3. Main_01到Main_08执行稿（每张含What/Why/Proof/Headline/Composition/3条英文Prompt A/B/C）\n4. A+ Section Allocation（7个Section数量分配表）\n5. A+ Slot执行稿（每个Slot含What/Why/Proof/3条英文Prompt A/B/C）\n6. Execution Notes\n\n每张图必须输出3条完整英文Prompt，包含product/scene/camera angle/lighting/composition/whitespace/typography/negative constraints。`;
      const content=await callLLM([{role:'system',content:sys},{role:'user',content:user}]);
      const extracted=[];
      const lines=content.split('\n');
      let cur={id:0,title:'',promptA:'',promptB:'',promptC:'',section:''};
      lines.forEach(line=>{
        if(/^(Main_|A\+|Slot|图片编号|Prompt Variant A)/i.test(line)||line.includes('执行稿')||line.includes('Slot')){
          if(cur.promptA)extracted.push({...cur,id:Date.now()+extracted.length});
          cur={id:Date.now()+extracted.length,title:line.replace(/[*#]/g,'').trim(),promptA:'',promptB:'',promptC:'',section:''};
        }else if(/^Prompt Variant A/i.test(line)||/^A[\.、]/i.test(line))cur.promptA=line.replace(/^Prompt Variant A[\.、:-]*/i,'').trim();
        else if(/^Prompt Variant B/i.test(line)||/^B[\.、]/i.test(line))cur.promptB=line.replace(/^Prompt Variant B[\.、:-]*/i,'').trim();
        else if(/^Prompt Variant C/i.test(line)||/^C[\.、]/i.test(line))cur.promptC=line.replace(/^Prompt Variant C[\.、:-]*/i,'').trim();
        else if(cur.title&&!cur.promptA&&line.length>30)cur.promptA=line.trim();
        else if(cur.promptA&&!cur.promptB&&line.length>30)cur.promptB=line.trim();
        else if(cur.promptB&&!cur.promptC&&line.length>30)cur.promptC=line.trim();
      });
      if(cur.promptA)extracted.push(cur);
      const clean=extracted.filter(p=>p.promptA.length>20).map((p,i)=>({...p,id:i+1,selected:true,variant:'A'}));
      setPromptList(clean);
      addToast(`已生成 ${clean.length} 条提示词`,'success');
      setStep(4);
    }catch(e){addToast(`提示词生成失败：${e.message}`,'error')}
    finally{setLoading(false)}
  };

  // Step 4: 批量出图
  const handleBatchGen=async()=>{
    const selected=promptList.filter(p=>p.selected);
    if(!selected.length){addToast('请至少选择一条提示词','warning');return}
    const cfg=apiConfig.find(a=>a.provider===selImgModel.provider&&a.enabled);
    if(!cfg||!cfg.apiKey){addToast('请先配置图像模型API','warning');return}
    const baseUrl=getProxyBaseUrl(cfg.relayUrl);
    const modelId=getApiModelId(selImgModel.id);
    setLoading(true);
    const results=[];
    for(const p of selected){
      try{
        const promptText=p['prompt'+p.variant]||p.promptA;
        const data=await callImageAPI(baseUrl,cfg.apiKey,modelId,promptText,size,style);
        const imgUrl=data.data?.[0]?.url;
        if(imgUrl){
          results.push({id:p.id,title:p.title,url:imgUrl,prompt:promptText,variant:p.variant,size,status:'done'});
          addUsageRecord({memberId:currentUser?.id,memberName:currentUser?.name,type:'image',model:selImgModel.name,tokens:150});
        }
      }catch(e){results.push({id:p.id,title:p.title,url:'',prompt:'',error:e.message,status:'error'})}
    }
    setGeneratedImages(results);
    addConv({id:Date.now(),memberId:currentUser?.id,memberName:currentUser?.name,model:selImgModel.name,type:'image',content:`批量生成 ${results.length} 张图片`,response:'[批量图片已生成]',timestamp:new Date().toISOString().replace('T',' ').slice(0,16),tokens:results.filter(r=>r.status==='done').length*150});
    addToast(`批量出图完成：${results.filter(r=>r.status==='done').length} 张成功`,'success');
    setLoading(false);
  };

  // 单张修改
  const handleEdit=async()=>{
    if(!editModal||!editPrompt.trim())return;
    const cfg=apiConfig.find(a=>a.provider===selImgModel.provider&&a.enabled);
    if(!cfg||!cfg.apiKey){addToast('请先配置图像模型API','warning');return}
    setLoading(true);
    try{
      const baseUrl=getProxyBaseUrl(cfg.relayUrl);
      const modelId=getApiModelId(selImgModel.id);
      const finalPrompt=`参考原图进行修改：${editPrompt}。原图描述：${editModal.prompt}`;
      const data=await callImageAPI(baseUrl,cfg.apiKey,modelId,finalPrompt,size,style);
      const imgUrl=data.data?.[0]?.url;
      if(!imgUrl)throw new Error('无图片URL');
      setGeneratedImages(p=>p.map(img=>img.id===editModal.id?{...img,url:imgUrl,prompt:finalPrompt,editHistory:[...(img.editHistory||[]),{prompt:editPrompt,timestamp:new Date().toLocaleString('zh-CN')}],status:'done'}:img));
      addToast('修改完成','success');
      addUsageRecord({memberId:currentUser?.id,memberName:currentUser?.name,type:'image',model:selImgModel.name,tokens:150});
      setEditModal(null);setEditPrompt('');setScreenshot(null);
    }catch(e){addToast(`修改失败：${e.message}`,'error')}
    finally{setLoading(false)}
  };

  const handleScreenshot=(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>setScreenshot(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full overflow-y-auto fade-in">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">批量生图</h2>
            <div className="flex items-center gap-1 bg-gray-100 rounded-full px-1 py-1">
              {stepTitles.map((t,i)=> (
                <button key={i} onClick={()=>{if(i+1<step)setStep(i+1)}} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${step===i+1?'shadow-sm':''}`} style={step===i+1?{background:'var(--bg)',color:'var(--txt)',boxShadow:'var(--shadow)'}:step>i+1?{color:'var(--green)'}:{color:'var(--txt3)'}}>
                  {step>i+1?<i className="fas fa-check mr-1"></i>:<span className="mr-1">{i+1}</span>}{t}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <button onClick={()=>setShowSel(!showSel)} className="pill active flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{background:selImgModel.color}}><i className={`fas ${selImgModel.icon} text-white text-[8px]`}></i></div>
              {selImgModel.name}<i className="fas fa-chevron-down text-xs ml-1"></i>
            </button>
            {showSel&&(
              <div className="absolute top-full right-0 mt-2 border rounded-2xl shadow-xl p-2 z-30 w-72" style={{background:'var(--bg)',borderColor:'var(--bdr)'}}>
                {IMAGE_MODELS.map(m=> (
                  <div key={m.id} onClick={()=>{setSelImgModel(m);setShowSel(false);}} className={`model-opt ${selImgModel.id===m.id?'sel':''}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{background:m.color}}><i className={`fas ${m.icon} text-white text-[9px]`}></i></div>
                    <div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-gray-400">{m.desc}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 1 */}
        {step===1&&(
          <div className="space-y-4">
            <div className="glass p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">Amazon 产品链接 / ASIN（支持批量，每行一个）</label>
                <textarea value={links} onChange={e=>setLinks(e.target.value)} placeholder="例如：\nB08N5WRWNW\nB09V3KXJPB\nhttps://www.amazon.com/dp/B08N5WRWNW" className="input" rows={4}/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1.5 block">产品描述 / 评论 / 竞品信息（粘贴已知信息）</label>
                <textarea value={productInfo} onChange={e=>setProductInfo(e.target.value)} placeholder="粘贴产品标题、五点描述、当前文案、评论摘要、竞品对比等信息..." className="input" rows={8}/>
              </div>
              <button onClick={handleCollect} disabled={loading} className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm ${loading?'bg-gray-200 text-gray-400 cursor-not-allowed':'btn-primary'}`}>
                {loading?<><i className="fas fa-circle-notch fa-spin"></i>AI 收集中...</>:<><i className="fas fa-search"></i>批量收集并结构化</>}
              </button>
            </div>
            {productInfo&&(
              <div className="glass p-5">
                <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold">已收集的结构化信息</h3><span className="text-xs text-green-600"><i className="fas fa-check mr-1"></i>完成</span></div>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-3 max-h-96 overflow-y-auto">{productInfo}</pre>
              </div>
            )}
          </div>
        )}

        {/* Step 2 */}
        {step===2&&(
          <div className="space-y-4">
            <div className="glass p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Step 1 收集结果</h3>
                <button onClick={()=>setStep(1)} className="text-xs text-blue-600 hover:underline">返回修改</button>
              </div>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto mb-4">{productInfo}</pre>
              <button onClick={handleExtract} disabled={loading} className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm ${loading?'bg-gray-200 text-gray-400 cursor-not-allowed':'btn-primary'}`}>
                {loading?<><i className="fas fa-circle-notch fa-spin"></i>AI 提炼中...</>:<><i className="fas fa-lightbulb"></i>提取结构化卖点</>}
              </button>
            </div>
            {sellingPoints&&(
              <div className="glass p-5">
                <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold">卖点提炼报告</h3><span className="text-xs text-green-600"><i className="fas fa-check mr-1"></i>完成</span></div>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-3 max-h-96 overflow-y-auto">{sellingPoints}</pre>
              </div>
            )}
          </div>
        )}

        {/* Step 3 */}
        {step===3&&(
          <div className="space-y-4">
            <div className="glass p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Step 2 卖点报告</h3>
                <button onClick={()=>setStep(2)} className="text-xs text-blue-600 hover:underline">返回修改</button>
              </div>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto mb-4">{sellingPoints}</pre>
              <button onClick={handleGenPrompts} disabled={loading} className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm ${loading?'bg-gray-200 text-gray-400 cursor-not-allowed':'btn-primary'}`}>
                {loading?<><i className="fas fa-circle-notch fa-spin"></i>AI 生成中...</>:<><i className="fas fa-magic"></i>批量生成图片提示词</>}
              </button>
            </div>
            {promptList.length>0&&(
              <div className="glass p-5">
                <h3 className="text-sm font-semibold mb-3">提示词列表（共 {promptList.length} 条）</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {promptList.map(p=> (
                    <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                      <input type="checkbox" checked={p.selected} onChange={()=>setPromptList(lst=>lst.map(x=>x.id===p.id?{...x,selected:!x.selected}:x))} className="mt-1"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 mb-1">{p.title||`图片 ${p.id}`}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-2">{p.promptA}</p>
                      </div>
                      <select value={p.variant} onChange={e=>setPromptList(lst=>lst.map(x=>x.id===p.id?{...x,variant:e.target.value}:x))} className="text-xs border rounded-lg px-2 py-1" style={{background:'var(--bg)',borderColor:'var(--bdr)',color:'var(--txt)'}}>
                        <option value="A">A版</option><option value="B">B版</option><option value="C">C版</option>
                      </select>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">已选择 {promptList.filter(p=>p.selected).length} 条</span>
                  <button onClick={()=>setStep(4)} className="btn-primary text-sm px-4 py-2 rounded-lg">进入出图 <i className="fas fa-arrow-right ml-1"></i></button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4 */}
        {step===4&&(
          <div className="space-y-4">
            <div className="glass p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">批量出图设置</h3>
                <button onClick={()=>setStep(3)} className="text-xs text-blue-600 hover:underline">返回修改提示词</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">图片尺寸</label>
                  <div className="flex gap-2">
                    {['1024x1024','1024x1792','1792x1024'].map(s=> (
                      <button key={s} onClick={()=>setSize(s)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${size===s?'btn-primary':'glass2'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">风格</label>
                  <div className="flex gap-2">
                    {[{k:'vivid',l:'鲜艳'},{k:'natural',l:'自然'}].map(s=> (
                      <button key={s.k} onClick={()=>setStyle(s.k)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${style===s.k?'btn-primary':'glass2'}`}>{s.l}</button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handleBatchGen} disabled={loading||!promptList.filter(p=>p.selected).length} className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm ${loading||!promptList.filter(p=>p.selected).length?'bg-gray-200 text-gray-400 cursor-not-allowed':'btn-primary'}`}>
                {loading?<><i className="fas fa-circle-notch fa-spin"></i>批量生成中...</>:<><i className="fas fa-images"></i>批量生成 {promptList.filter(p=>p.selected).length} 张图片</>}
              </button>
            </div>

            {generatedImages.length>0&&(
              <div>
                <h3 className="text-sm font-semibold mb-3">生成结果</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {generatedImages.map(img=> (
                    <div key={img.id} className="card p-0 overflow-hidden fade-in">
                      {img.status==='done'?(
                        <div className="aspect-square bg-gray-100 relative group">
                          <img src={img.url} alt={img.title} className="w-full h-full object-cover"/>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                            <button onClick={()=>{navigator.clipboard.writeText(img.url);addToast('链接已复制','success')}} className="text-white text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg"><i className="fas fa-copy mr-1"></i>复制</button>
                            <button onClick={()=>setEditModal(img)} className="text-white text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg"><i className="fas fa-edit mr-1"></i>修改</button>
                          </div>
                        </div>
                      ):(
                        <div className="aspect-square bg-red-50 flex flex-col items-center justify-center p-4">
                          <i className="fas fa-exclamation-circle text-red-400 text-2xl mb-2"></i>
                          <p className="text-xs text-red-500 text-center">{img.error||'生成失败'}</p>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-xs font-medium truncate">{img.title||`图片 ${img.id}`}</p>
                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{img.prompt}</p>
                        {img.editHistory?.length>0&&<p className="text-[10px] text-blue-500 mt-1"><i className="fas fa-history mr-1"></i>已修改 {img.editHistory.length} 次</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editModal} onClose={()=>{setEditModal(null);setEditPrompt('');setScreenshot(null)}} title={`修改图片：${editModal?.title||''}`}>
        {editModal&&(
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-xl overflow-hidden"><img src={editModal.url} alt="" className="w-full max-h-64 object-contain"/></div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">修改描述（支持中文）</label>
              <textarea value={editPrompt} onChange={e=>setEditPrompt(e.target.value)} placeholder="描述需要修改的地方，例如：把背景换成深蓝色、增加一个USB-C接口特写、调整光线更柔和..." className="input" rows={3}/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">上传参考截图（可选）</label>
              <input type="file" accept="image/*" onChange={handleScreenshot} className="text-xs"/>
              {screenshot&&<img src={screenshot} alt="参考" className="mt-2 w-full max-h-32 object-contain rounded-xl border border-gray-200"/>}
            </div>
            <button onClick={handleEdit} disabled={loading||!editPrompt.trim()} className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm ${loading||!editPrompt.trim()?'bg-gray-200 text-gray-400 cursor-not-allowed':'btn-primary'}`}>
              {loading?<><i className="fas fa-circle-notch fa-spin"></i>修改中...</>:<><i className="fas fa-magic"></i>基于描述重新生成</>}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ================== VideoGen Page ================== */
function VideoGenPage(){
  const {currentUser,selVidModel,setSelVidModel,addConv,addToast,addUsageRecord,apiConfig}=useApp();
  const [prompt,setPrompt]=useState('');
  const [dur,setDur]=useState('5s');
  const [ratio,setRatio]=useState('16:9');
  const [gen,setGen]=useState(false);
  const [videos,setVideos]=useState([]);
  const [showSel,setShowSel]=useState(false);

  const handleGen=async()=>{
    if(!prompt.trim()||gen)return;
    setGen(true);

    const cfg=apiConfig.find(a=>a.provider===selVidModel.provider&&a.enabled);
    if(!cfg||!cfg.apiKey){setGen(false);addToast('请先在该模型的API配置中填写API Key','warning');return}

    const baseUrl=getProxyBaseUrl(cfg.relayUrl);
    const modelId=getApiModelId(selVidModel.id);

    try{
      const data=await callVideoAPI(baseUrl,cfg.apiKey,modelId,prompt,ratio,dur);
      const vidUrl=data.data?.[0]?.url;
      if(!vidUrl)throw new Error('返回数据中没有视频URL');
      const nw={id:Date.now(),prompt,dur,ratio,thumb:vidUrl,timestamp:new Date().toLocaleString('zh-CN')};
      setVideos(p=>[nw,...p]);
      setPrompt('');
      addToast('视频生成成功！','success');
      addConv({id:Date.now(),memberId:currentUser?.id,memberName:currentUser?.name,model:selVidModel.name,type:'video',content:prompt,response:'[视频已生成]',timestamp:new Date().toISOString().replace('T',' ').slice(0,16),tokens:200});
      addUsageRecord({memberId:currentUser?.id,memberName:currentUser?.name,type:'video',model:selVidModel.name,tokens:200});
    }catch(e){
      const errMsg=e.message.includes('Failed to fetch')?'网络请求失败，请检查：1) 是否通过HTTP服务器运行（非file://）；2) API地址是否正确；3) 是否开启VPN/代理。':e.message;
      addToast(`视频生成失败：${errMsg}`,'error');
    }finally{
      setGen(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto fade-in">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-bold">AI 视频</h2>
          <div className="relative">
            <button onClick={()=>setShowSel(!showSel)} className="pill active flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{background:selVidModel.color}}>
                <i className={`fas ${selVidModel.icon} text-white text-[8px]`}></i>
              </div>
              {selVidModel.name}
              <i className="fas fa-chevron-down text-xs ml-1"></i>
            </button>
            {showSel&&(
              <div className="absolute top-full left-0 mt-2 border rounded-2xl shadow-xl p-2 z-30 w-72" style={{background:'var(--bg)',borderColor:'var(--bdr)'}}>
                {VIDEO_MODELS.map(m=> (
                  <div key={m.id} onClick={()=>{setSelVidModel(m);setShowSel(false);}} className={`model-opt ${selVidModel.id===m.id?'sel':''}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{background:m.color}}>
                      <i className={`fas ${m.icon} text-white text-[9px]`}></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="glass p-5 space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">视频描述</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="描述想要生成的视频内容，例如：一个宇航员在火星表面行走，身后是红色的沙丘和蓝色的地球..." className="input" rows={4}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">时长</label>
              <div className="flex gap-2">
                {['5s','10s','15s'].map(d=> (
                  <button key={d} onClick={()=>setDur(d)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${dur===d?'btn-primary':'glass2'}`}>{d}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">比例</label>
              <div className="flex gap-2">
                {['16:9','9:16','1:1'].map(r=> (
                  <button key={r} onClick={()=>setRatio(r)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${ratio===r?'btn-primary':'glass2'}`}>{r}</button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleGen} disabled={!prompt.trim()||gen} className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-sm ${prompt.trim()&&!gen?'btn-primary':'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            {gen?<><i className="fas fa-circle-notch fa-spin"></i>生成中...</>:<><i className="fas fa-film"></i>生成视频</>}
          </button>
        </div>

        {videos.length>0&&(
          <div className="grid grid-cols-2 gap-4">
            {videos.map(v=> (
              <div key={v.id} className="card p-0 overflow-hidden fade-in">
                <div className="aspect-video bg-gray-100 relative group">
                  <img src={v.thumb} alt={v.prompt} className="w-full h-full object-cover"/>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><i className="fas fa-play text-gray-800"></i></div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-600 line-clamp-2">{v.prompt}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{v.dur} · {v.ratio} · {v.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================== Projects Page ================== */
function ProjectsPage(){
  const {projects,setActivePage,addProject}=useApp();
  const [showNew,setShowNew]=useState(false);
  const [newName,setNewName]=useState('');
  const [newType,setNewType]=useState('design');

  const handleCreate=()=>{
    if(!newName.trim())return;
    addProject({name:newName,type:newType,thumb:`https://picsum.photos/seed/${Date.now()}/400/300`});
    setNewName('');setShowNew(false);
  };

  return (
    <div className="h-full overflow-y-auto fade-in">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">我的项目</h2>
          <button onClick={()=>setShowNew(true)} className="btn-primary text-sm flex items-center gap-2"><i className="fas fa-plus"></i>新建项目</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={()=>setShowNew(true)} className="card flex flex-col items-center justify-center border-dashed border-2 hover:border-gray-300" style={{minHeight:180}}>
            <i className="fas fa-plus text-gray-300 text-2xl mb-2"></i>
            <span className="text-sm text-gray-400">新建项目</span>
          </button>
          {projects.map(p=> (
            <div key={p.id} className="card p-0 overflow-hidden group">
              <div className="aspect-[4/3] bg-gray-100 relative">
                <img src={p.thumb} alt={p.name} className="w-full h-full object-cover"/>
                <div className="absolute top-2 right-2">
                  <span className="tag text-[10px] bg-white/80 backdrop-blur-sm">{p.type==='design'?'设计':p.type==='video'?'视频':p.type==='image'?'图片':'文档'}</span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{p.updated}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Modal isOpen={showNew} onClose={()=>setShowNew(false)} title="新建项目">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">项目名称</label>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="输入项目名称" className="input"/>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1 block">项目类型</label>
            <div className="flex gap-2">
              {[{k:'design',l:'设计'},{k:'image',l:'图片'},{k:'video',l:'视频'},{k:'doc',l:'文档'}].map(t=> (
                <button key={t.k} onClick={()=>setNewType(t.k)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${newType===t.k?'btn-primary':'glass2'}`}>{t.l}</button>
              ))}
            </div>
          </div>
          <button onClick={handleCreate} className="btn-primary w-full">创建</button>
        </div>
      </Modal>
    </div>
  );
}

/* ================== Admin Dashboard ================== */
function AdminDashboard(){
  const {conversations,members}=useApp();
  const totalReq=conversations.length;
  const totalTokens=conversations.reduce((s,c)=>s+c.tokens,0);
  const online=members.filter(m=>m.status==='online').length;

  return (
    <div className="h-full overflow-y-auto fade-in">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <h2 className="text-xl font-bold mb-6">管理概览</h2>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[{t:'总请求',v:totalReq,icon:'fa-chart-line',c:'#2563eb'},{t:'总Token',v:totalTokens.toLocaleString(),icon:'fa-coins',c:'#8b5cf6'},{t:'在线成员',v:online,icon:'fa-user-check',c:'#10b981'},{t:'总成员',v:members.length,icon:'fa-users',c:'#f97316'}].map(s=> (
            <div key={s.t} className="card">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{background:s.c}}>
                  <i className={`fas ${s.icon} text-xs`}></i>
                </div>
                <span className="text-xs text-gray-500">{s.t}</span>
              </div>
              <p className="text-2xl font-bold">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="glass p-5">
            <h3 className="font-semibold text-sm mb-3">模型使用分布</h3>
            <div className="space-y-3">
              {['GPT-5.4','Claude Sonnet 4.6','GPT Image 2','DeepSeek-V3','Grok-3'].map((m,i)=> {
                const v=[35,25,20,12,8][i];
                return (
                  <div key={m}>
                    <div className="flex justify-between text-xs mb-1"><span>{m}</span><span>{v}%</span></div>
                    <div className="progress"><div style={{width:`${v}%`,background:['#2563eb','#d97757','#8b5cf6','#4d6bfa','#ff6b6b'][i]}}></div></div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="glass p-5">
            <h3 className="font-semibold text-sm mb-3">成员今日用量</h3>
            <div className="space-y-3">
              {members.map(m=> {
                const pct=Math.round(m.usedToday/m.dailyQuota*100);
                return (
                  <div key={m.id}>
                    <div className="flex justify-between text-xs mb-1"><span>{m.name}</span><span>{m.usedToday}/{m.dailyQuota}</span></div>
                    <div className="progress"><div style={{width:`${pct}%`,background:pct>80?'#ef4444':pct>50?'#f97316':'#2563eb'}}></div></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================== Admin Records ================== */
function AdminRecords(){
  const {conversations}=useApp();
  const [filter,setFilter]=useState('all');
  const filtered=filter==='all'?conversations:conversations.filter(c=>c.type===filter);

  return (
    <div className="h-full overflow-y-auto fade-in">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">使用记录</h2>
          <div className="flex gap-2">
            {[{k:'all',l:'全部'},{k:'text',l:'文本'},{k:'image',l:'图片'},{k:'video',l:'视频'}].map(f=> (
              <button key={f.k} onClick={()=>setFilter(f.k)} className={`pill text-xs ${filter===f.k?'active':''}`}>{f.l}</button>
            ))}
          </div>
        </div>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">成员</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">模型</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">类型</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">内容</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Token</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">时间</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c=> (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">{c.memberName}</td>
                  <td className="px-4 py-3"><span className="tag">{c.model}</span></td>
                  <td className="px-4 py-3">
                    <span className={`tag ${c.type==='image'?'bg-purple-50 text-purple-600':c.type==='video'?'bg-orange-50 text-orange-600':'bg-blue-50 text-blue-600'}`}>
                      {c.type==='text'?'文本':c.type==='image'?'图片':'视频'}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{c.content}</td>
                  <td className="px-4 py-3">{c.tokens}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{c.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================== Admin Members ================== */
function AdminMembers(){
  const {members,updMember,delMember,addMember,addToast,usageRecords}=useApp();
  const [showAdd,setShowAdd]=useState(false);
  const [showEdit,setShowEdit]=useState(null);
  const [showUsage,setShowUsage]=useState(null);
  const [form,setForm]=useState({name:'',email:'',password:'',dailyQuota:200});

  const handleAdd=()=>{
    if(!form.name||!form.email||!form.password){addToast('请填写完整信息','warning');return}
    const avatar=form.name.substring(0,2).toUpperCase();
    const colors=['linear-gradient(135deg,#3b82f6,#06b6d4)','linear-gradient(135deg,#8b5cf6,#ec4899)','linear-gradient(135deg,#f59e0b,#ef4444)','linear-gradient(135deg,#10b981,#3b82f6)'];
    addMember({name:form.name,email:form.email,password:form.password,avatar,avatarColor:colors[members.length%colors.length],role:'member',dailyQuota:form.dailyQuota,status:'offline',joinDate:TODAY});
    setForm({name:'',email:'',password:'',dailyQuota:200});setShowAdd(false);
    addToast('成员添加成功','success');
  };

  return (
    <div className="h-full overflow-y-auto fade-in">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">成员管理</h2>
          <button onClick={()=>setShowAdd(true)} className="btn-primary text-sm flex items-center gap-2"><i className="fas fa-plus"></i>添加成员</button>
        </div>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">成员</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">密码</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">用量</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">加入时间</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">操作</th>
            </tr></thead>
            <tbody>
              {members.map(m=> (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{background:m.color||m.avatarColor}}>{m.avatar}</div>
                      <div><p className="font-medium text-sm">{m.name}</p><p className="text-xs text-gray-400">{m.email}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="font-mono text-xs text-gray-500">{m.password}</span></td>
                  <td className="px-4 py-3">{m.usedToday}/{m.dailyQuota}</td>
                  <td className="px-4 py-3"><span className={`tag ${m.status==='online'?'bg-green-50 text-green-600':'bg-gray-100 text-gray-500'}`}>{m.status==='online'?'在线':'离线'}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{m.joinDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={()=>{navigator.clipboard.writeText(`账号：${m.email}（或 ${m.name}）\n密码：${m.password}`);addToast('账号信息已复制','success');}} className="btn-ghost text-xs" title="复制账号密码"><i className="fas fa-copy"></i></button>
                      <button onClick={()=>setShowUsage(m)} className="btn-ghost text-xs" title="查看用量"><i className="fas fa-chart-bar"></i></button>
                      <button onClick={()=>setShowEdit(m)} className="btn-ghost text-xs"><i className="fas fa-edit"></i></button>
                      <button onClick={()=>{delMember(m.id);addToast('已删除','success');}} className="btn-ghost text-xs text-red-500"><i className="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal isOpen={showAdd} onClose={()=>setShowAdd(false)} title="添加成员">
        <div className="space-y-3">
          <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="姓名" className="input"/>
          <input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="邮箱（登录账号）" className="input"/>
          <input value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="登录密码" className="input"/>
          <input type="number" value={form.dailyQuota} onChange={e=>setForm(p=>({...p,dailyQuota:parseInt(e.target.value)||0}))} placeholder="每日额度" className="input"/>
          <button onClick={handleAdd} className="btn-primary w-full">添加</button>
        </div>
      </Modal>
      <Modal isOpen={!!showEdit} onClose={()=>setShowEdit(null)} title="编辑成员">
        {showEdit&&(
          <div className="space-y-3">
            <input value={showEdit.name} onChange={e=>setShowEdit(p=>({...p,name:e.target.value}))} placeholder="姓名" className="input"/>
            <input value={showEdit.password} onChange={e=>setShowEdit(p=>({...p,password:e.target.value}))} placeholder="登录密码" className="input"/>
            <input type="number" value={showEdit.dailyQuota} onChange={e=>setShowEdit(p=>({...p,dailyQuota:parseInt(e.target.value)||0}))} placeholder="每日额度" className="input"/>
            <button onClick={()=>{updMember(showEdit.id,{name:showEdit.name,password:showEdit.password,dailyQuota:showEdit.dailyQuota});setShowEdit(null);addToast('已更新','success');}} className="btn-primary w-full">保存</button>
          </div>
        )}
      </Modal>
      <Modal isOpen={!!showUsage} onClose={()=>setShowUsage(null)} title={`${showUsage?.name} 的用量详情`} size="lg">
        {showUsage&&(
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="glass p-3 text-center">
                <p className="text-xs text-gray-400">今日用量</p>
                <p className="text-lg font-bold">{showUsage.usedToday||0}<span className="text-xs font-normal text-gray-400"> / {showUsage.dailyQuota}</span></p>
              </div>
              <div className="glass p-3 text-center">
                <p className="text-xs text-gray-400">累计用量</p>
                <p className="text-lg font-bold">{showUsage.totalUsed||0}</p>
              </div>
              <div className="glass p-3 text-center">
                <p className="text-xs text-gray-400">调用次数</p>
                <p className="text-lg font-bold">{usageRecords.filter(r=>r.memberId===showUsage.id).length}</p>
              </div>
            </div>
            <div className="glass overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-500">类型</th>
                  <th className="text-left px-3 py-2 text-gray-500">模型</th>
                  <th className="text-left px-3 py-2 text-gray-500">Tokens</th>
                  <th className="text-left px-3 py-2 text-gray-500">时间</th>
                </tr></thead>
                <tbody>
                  {usageRecords.filter(r=>r.memberId===showUsage.id).map(r=> (
                    <tr key={r.id} className="border-b border-gray-50">
                      <td className="px-3 py-2"><span className={`tag text-[10px] ${r.type==='text'?'bg-blue-50 text-blue-600':r.type==='image'?'bg-purple-50 text-purple-600':'bg-orange-50 text-orange-600'}`}>{r.type==='text'?'对话':r.type==='image'?'作图':'视频'}</span></td>
                      <td className="px-3 py-2">{r.model}</td>
                      <td className="px-3 py-2 font-mono">{r.tokens}</td>
                      <td className="px-3 py-2 text-gray-400">{r.timestamp}</td>
                    </tr>
                  ))}
                  {!usageRecords.filter(r=>r.memberId===showUsage.id).length&&(
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400">暂无使用记录</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ================== Admin Activation Codes ================== */
function AdminActivationCodes(){
  const {codes,addCode,updCode,delCode,addToast}=useApp();
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({code:'',password:'',maxUses:1,expiry:'2026-12-31'});

  const handleAdd=()=>{
    if(!form.code||!form.password){addToast('请填写完整信息','warning');return}
    if(codes.find(c=>c.code===form.code)){addToast('激活码已存在','error');return}
    addCode({code:form.code,password:form.password,status:'active',expiry:form.expiry,maxUses:parseInt(form.maxUses)||1});
    setForm({code:'',password:'',maxUses:1,expiry:'2026-12-31'});setShowAdd(false);
    addToast('激活码添加成功','success');
  };

  return (
    <div className="h-full overflow-y-auto fade-in">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">激活码管理</h2>
          <button onClick={()=>setShowAdd(true)} className="btn-primary text-sm flex items-center gap-2"><i className="fas fa-plus"></i>生成激活码</button>
        </div>
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">激活码</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">密码</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">使用次数</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">绑定设备</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">过期时间</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">操作</th>
            </tr></thead>
            <tbody>
              {codes.map(c=> (
                <tr key={c.code} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.password}</td>
                  <td className="px-4 py-3"><span className={`tag ${c.status==='active'?'bg-green-50 text-green-600':c.status==='used'?'bg-blue-50 text-blue-600':'bg-red-50 text-red-600'}`}>{c.status==='active'?'未使用':c.status==='used'?'已使用':'已过期'}</span></td>
                  <td className="px-4 py-3">{c.usedCount}/{c.maxUses}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.machineName||'-'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{c.expiry}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={()=>{navigator.clipboard.writeText(`激活码：${c.code}\n密码：${c.password}`);addToast('已复制','success');}} className="btn-ghost text-xs"><i className="fas fa-copy"></i></button>
                      <button onClick={()=>{delCode(c.code);addToast('已删除','success');}} className="btn-ghost text-xs text-red-500"><i className="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal isOpen={showAdd} onClose={()=>setShowAdd(false)} title="生成激活码">
        <div className="space-y-3">
          <input value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))} placeholder="激活码（如 ACTIVE-2026-004）" className="input"/>
          <input value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="密码" className="input"/>
          <input type="number" value={form.maxUses} onChange={e=>setForm(p=>({...p,maxUses:parseInt(e.target.value)||1}))} placeholder="最大使用次数" className="input"/>
          <input type="date" value={form.expiry} onChange={e=>setForm(p=>({...p,expiry:e.target.value}))} className="input"/>
          <button onClick={handleAdd} className="btn-primary w-full">生成</button>
        </div>
      </Modal>
    </div>
  );
}

/* ================== Admin API Config ================== */
function AdminAPIConfig(){
  const {apiConfig,updApi,addToast}=useApp();
  const [editProv,setEditProv]=useState(null);

  return (
    <div className="h-full overflow-y-auto fade-in">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <h2 className="text-xl font-bold mb-6">API 配置</h2>
        <p className="text-sm text-gray-400 mb-4">配置各平台的 API Key 或中转链接，为空则使用默认配置</p>
        <div className="space-y-3">
          {apiConfig.map(cfg=> (
            <div key={cfg.provider} className="glass p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs" style={{background:cfg.enabled?'#2563eb':'#9ca3af'}}>
                    <i className="fas fa-server"></i>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{cfg.provider}</p>
                    <p className="text-xs text-gray-400">{cfg.models.join(' · ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{cfg.enabled?'已启用':'已禁用'}</span>
                  <button onClick={()=>updApi(cfg.provider,{enabled:!cfg.enabled})} className={`w-10 h-6 rounded-full transition-all relative ${cfg.enabled?'bg-blue-500':'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${cfg.enabled?'left-5':'left-1'}`}></div>
                  </button>
                  <button onClick={()=>setEditProv(editProv===cfg.provider?null:cfg.provider)} className="btn-ghost text-xs"><i className={`fas fa-chevron-${editProv===cfg.provider?'up':'down'}`}></i></button>
                </div>
              </div>
              {editProv===cfg.provider&&(
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">API Key</label>
                    <input type="password" value={cfg.apiKey} onChange={e=>updApi(cfg.provider,{apiKey:e.target.value})} placeholder="sk-..." className="input"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">中转 / Relay URL（可选）</label>
                    <input value={cfg.relayUrl} onChange={e=>updApi(cfg.provider,{relayUrl:e.target.value})} placeholder="https://api.example.com/v1" className="input"/>
                  </div>
                  <button onClick={()=>addToast('配置已保存','success')} className="btn-primary text-sm">保存配置</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================== App ================== */
function App(){
  const {activated,role,activePage}=useApp();

  if(!activated)return <ActivationPage/>;
  if(!role)return <LoginPage/>;

  const renderPage=()=>{
    switch(activePage){
      case 'home':return <HomePage/>;
      case 'chat':return <ChatPage/>;
      case 'image':return <ImageGenPage/>;
      case 'video':return <VideoGenPage/>;
      case 'projects':return <ProjectsPage/>;
      case 'admin-dash':return <AdminDashboard/>;
      case 'admin-records':return <AdminRecords/>;
      case 'admin-members':return <AdminMembers/>;
      case 'admin-codes':return <AdminActivationCodes/>;
      case 'admin-api':return <AdminAPIConfig/>;
      default:return <HomePage/>;
    }
  };

  return (
    <div className="h-screen flex">
      <Sidebar/>
      <main className="flex-1 overflow-hidden" style={{background:'var(--bg2)'}}>
        <div className="h-full m-2 rounded-2xl border overflow-hidden" style={{background:'var(--bg)',borderColor:'var(--bdr)'}}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

const root=ReactDOM.createRoot(document.getElementById('root'));
root.render(<AppProvider><App/></AppProvider>);