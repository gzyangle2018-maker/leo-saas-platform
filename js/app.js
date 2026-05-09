import { callLLM, generateImage, generateImageChat } from './api.js';

const App = {
  currentPage: 'chat',
  store: null,
  designRefs: [],
  firstFrame: '',
  lastFrame: '',
  designProvider: '',
  designModel: '',

  init() {
    this.loadStore();
    this.nav('chat');
  },

  loadStore() {
    try {
      this.store = JSON.parse(localStorage.getItem('qoderwork_store')) || this.defaultStore();
    } catch {
      this.store = this.defaultStore();
    }
  },

  save() {
    localStorage.setItem('qoderwork_store', JSON.stringify(this.store));
  },

  defaultStore() {
    return {
      llmProviders: [
        { id: 1, name: 'OpenAI', apiUrl: 'https://api.openai.com/v1', models: ['GPT-5.5','GPT-5.4','GPT-4o','GPT-4.1','o3','o1','DALL-E 3','gpt-4o-image'], status: 'connected', apiKey: '' },
        { id: 2, name: 'Google', apiUrl: 'https://generativelanguage.googleapis.com', models: ['Gemini 3.1 Pro','Gemini 3.1 Ultra','Gemini 2.5 Pro','Gemini 2.0 Flash'], status: 'connected', apiKey: '' },
        { id: 3, name: 'Anthropic', apiUrl: 'https://api.anthropic.com', models: ['Claude Opus 4.7','Claude Sonnet 4.6','Claude 4 Sonnet','Claude 3.7 Sonnet'], status: 'connected', apiKey: '' },
        { id: 4, name: 'xAI', apiUrl: 'https://api.x.ai/v1', models: ['Grok 3','Grok 3 Mini','Grok 2'], status: 'connected', apiKey: '' },
        { id: 5, name: 'DeepSeek', apiUrl: 'https://api.deepseek.com/v1', models: ['DeepSeek-V3','DeepSeek-R1','DeepSeek-Coder-V2'], status: 'connected', apiKey: '' },
        { id: 6, name: 'Perplexity', apiUrl: 'https://api.perplexity.ai', models: ['Sonar 2','Sonar Pro','Sonar Reasoning'], status: 'connected', apiKey: '' }
      ],
      llmAutoSwitch: true,
      designGallery: []
    };
  },

  toast(msg, type = 'info') {
    const colors = { info: 'bg-blue-600', success: 'bg-emerald-600', error: 'bg-red-600', warning: 'bg-amber-600' };
    const el = document.createElement('div');
    el.className = `toast ${colors[type] || colors.info}`;
    el.innerHTML = `<div class="flex items-center gap-2"><i class="fas ${type==='success'?'fa-check-circle':type==='error'?'fa-exclamation-circle':type==='warning'?'fa-exclamation-triangle':'fa-info-circle'}"></i><span>${msg}</span></div>`;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => { el.style.animation = 'toastIn .3s reverse'; setTimeout(() => el.remove(), 300); }, 3000);
  },

  nav(page) {
    this.currentPage = page;
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    const active = document.querySelector(`[data-page="${page}"]`);
    if (active) active.classList.add('active');
    const content = document.getElementById('pageContent');
    content.innerHTML = '';
    content.classList.remove('fade-in'); void content.offsetWidth; content.classList.add('fade-in');
    switch(page) {
      case 'chat': this.renderChat(content); break;
      case 'design': this.renderDesignCenter(content); break;
      case 'settings': this.renderSettings(content); break;
    }
  },

  renderChat(container) {
    const providers = this.store.llmProviders || [];
    const provOptions = providers.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    container.innerHTML = `
      <div class="max-w-3xl mx-auto h-full flex flex-col fade-in">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-semibold text-sm">AI 助手</h3>
          <span class="badge bg-emerald-500/15 text-emerald-400 text-[11px]" id="chatStatus">就绪</span>
        </div>
        <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-4 scrollbar card mb-4" style="min-height:300px"></div>
        <div class="flex gap-2 mb-3">
          <select id="chatProvider" class="select-field text-xs py-2" style="width:auto;min-width:100px" onchange="App.updateChatModels()">${provOptions}</select>
          <select id="chatModel" class="select-field text-xs py-2 flex-1"></select>
        </div>
        <div class="flex gap-2">
          <input id="chatInput" type="text" class="input-field text-sm" placeholder="输入消息，按 Enter 发送..." onkeydown="if(event.key==='Enter')App.sendChat()">
          <button onclick="App.sendChat()" class="btn-primary px-4 rounded-xl shrink-0"><i class="fas fa-paper-plane text-sm"></i></button>
        </div>
      </div>`;
    this.updateChatModels();
  },

  updateChatModels() {
    const provider = document.getElementById('chatProvider').value;
    const prov = this.store.llmProviders.find(p => p.name === provider);
    const select = document.getElementById('chatModel');
    if (!select) return;
    select.innerHTML = '';
    if (prov && prov.models && prov.models.length) {
      prov.models.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; select.appendChild(o); });
    } else {
      select.innerHTML = '<option>无可用模型</option>';
    }
  },

  appendChat(role, html) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
    div.innerHTML = `<div class="max-w-[85%] rounded-xl px-4 py-2.5 text-[13px] leading-relaxed ${role === 'user' ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white' : 'bg-white/[0.05] text-slate-300 border border-white/5'}">${html}</div>`;
    container.appendChild(div); container.scrollTop = container.scrollHeight;
  },

  async sendChat() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    let provider = document.getElementById('chatProvider').value;
    let model = document.getElementById('chatModel').value;
    this.appendChat('user', msg); input.value = '';
    const allProviders = this.store.llmProviders || [];
    const autoSwitch = this.store.llmAutoSwitch !== false;
    let tried = [];

    const tryProvider = async (provName, modelName) => {
      const prov = allProviders.find(p => p.name === provName);
      if (!prov || !prov.apiKey) return { error: `${provName} API密钥未配置` };
      tried.push(provName);
      this.appendChat('assistant', `<i class="fas fa-circle-notch fa-spin text-blue-400"></i> 正在使用 ${provName} / ${modelName}...`);
      document.getElementById('chatStatus').textContent = '请求中';
      document.getElementById('chatStatus').className = 'badge bg-blue-500/15 text-blue-400 text-[11px]';
      try {
        const res = await callLLM({ model: modelName, messages: [{ role: 'user', content: msg }], temperature: 0.7 });
        const messages = document.getElementById('chatMessages'); messages.lastElementChild?.remove();
        if (res.error) {
          if (autoSwitch) {
            const nextProv = allProviders.find(p => p.apiKey && !tried.includes(p.name));
            if (nextProv) {
              const nextModel = (nextProv.models && nextProv.models[0]) || 'default';
              this.appendChat('assistant', `⚠️ ${provName} 请求失败: ${res.error.substring(0,80)}。正在自动切换至 ${nextProv.name}...`);
              setTimeout(() => { const messages = document.getElementById('chatMessages'); messages.lastElementChild?.remove(); tryProvider(nextProv.name, nextModel); }, 1200);
              return { switched: true };
            }
          }
          this.appendChat('assistant', '❌ 错误: ' + res.error);
          document.getElementById('chatStatus').textContent = '错误';
          document.getElementById('chatStatus').className = 'badge bg-red-500/15 text-red-400 text-[11px]';
          return { error: res.error };
        }
        const content = res.choices?.[0]?.message?.content || res.content || JSON.stringify(res);
        this.appendChat('assistant', content);
        document.getElementById('chatStatus').textContent = '就绪';
        document.getElementById('chatStatus').className = 'badge bg-emerald-500/15 text-emerald-400 text-[11px]';
        return { success: true };
      } catch (e) {
        const messages = document.getElementById('chatMessages'); messages.lastElementChild?.remove();
        this.appendChat('assistant', '❌ 请求失败: ' + e.message);
        document.getElementById('chatStatus').textContent = '错误';
        document.getElementById('chatStatus').className = 'badge bg-red-500/15 text-red-400 text-[11px]';
      }
    };
    tryProvider(provider, model);
  },

  renderDesignCenter(container) {
    const gallery = this.store.designGallery || [];
    const refs = this.designRefs || [];
    const providers = this.store.llmProviders || [];
    const provOptions = providers.map(p => `<option value="${p.name}" ${p.apiKey ? '' : 'disabled'}>${p.name}${p.apiKey ? '' : ' (未配置密钥)'}</option>`).join('');
    const currentProv = this.designProvider || providers.find(p => p.apiKey)?.name || 'OpenAI';
    const currentModel = this.designModel || '';
    container.innerHTML = `
    <div class="max-w-5xl mx-auto fade-in">
      <div class="text-center mb-6">
        <h3 class="font-semibold text-lg mb-1 glow-text">AI 设计中心</h3>
        <p class="text-xs text-slate-500">参考图 + 风格标签 + 关键帧，一键生成图片与视频素材</p>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div class="lg:col-span-2 space-y-4">
          <div class="card p-5">
            <div class="mb-3 flex flex-wrap gap-3">
              <div class="flex-1 min-w-[140px]">
                <label class="block text-[11px] text-slate-500 mb-1 font-medium">提供商</label>
                <select id="designProvider" class="select-field text-xs py-1.5" onchange="App.onDesignProviderChange()">${provOptions}</select>
              </div>
              <div class="flex-1 min-w-[140px]">
                <label class="block text-[11px] text-slate-500 mb-1 font-medium">模型</label>
                <select id="designModel" class="select-field text-xs py-1.5">${this.getDesignModelOptions(currentProv, currentModel)}</select>
              </div>
              <div class="flex-1 min-w-[100px]">
                <label class="block text-[11px] text-slate-500 mb-1 font-medium">类型</label>
                <select id="designType" class="select-field text-xs py-1.5" style="min-width:90px" onchange="App.toggleDesignType()">
                  <option value="image">图片</option>
                  <option value="video">视频</option>
                </select>
              </div>
            </div>
            <div class="mb-3">
              <label class="block text-[11px] text-slate-500 mb-1 font-medium">生成描述</label>
              <textarea id="designPrompt" rows="3" class="input-field text-sm" placeholder="描述你想生成的画面..."></textarea>
            </div>
            <div class="mb-3">
              <label class="block text-[11px] text-slate-500 mb-1.5 font-medium">快速风格</label>
              <div class="flex flex-wrap">
                ${['赛博朋克','二次元','写实','油画','水墨','像素','3D渲染','极简','复古','梦幻'].map(t => `<span class="style-chip" onclick="App.addDesignTag('${t}')">${t}</span>`).join('')}
              </div>
            </div>
            <div id="imageControls" class="space-y-3">
              <div class="flex flex-wrap gap-3">
                <div class="param-card flex-1 min-w-[140px]">
                  <label class="block text-[11px] text-slate-500 mb-1 font-medium">尺寸</label>
                  <select id="designSizePreset" class="select-field text-xs py-1.5" style="min-width:120px" onchange="App.applyDesignSize()">
                    <option value="1024x1024">1:1 方图</option>
                    <option value="1024x1792">9:16 竖图</option>
                    <option value="1792x1024">16:9 横图</option>
                    <option value="1536x1024">3:2 横图</option>
                    <option value="1024x1536">2:3 竖图</option>
                    <option value="custom">自定义</option>
                  </select>
                  <div id="customSizeWrap" class="hidden flex items-center gap-2 mt-2">
                    <input id="designWidth" type="number" value="1024" class="input-field text-xs py-1" style="width:70px" placeholder="宽"><span class="text-slate-600 text-xs">×</span><input id="designHeight" type="number" value="1024" class="input-field text-xs py-1" style="width:70px" placeholder="高">
                  </div>
                </div>
                <div class="param-card flex-1 min-w-[100px]">
                  <label class="block text-[11px] text-slate-500 mb-1 font-medium">画质</label>
                  <select id="designQuality" class="select-field text-xs py-1.5" style="min-width:90px">
                    <option value="standard">标准</option>
                    <option value="hd">高清</option>
                  </select>
                </div>
                <div class="param-card flex-1 min-w-[100px]">
                  <label class="block text-[11px] text-slate-500 mb-1 font-medium">数量</label>
                  <select id="designN" class="select-field text-xs py-1.5" style="min-width:70px">
                    <option value="1">1张</option>
                    <option value="2">2张</option>
                    <option value="4">4张</option>
                  </select>
                </div>
              </div>
              <div class="param-card">
                <label class="block text-[11px] text-slate-500 mb-2 font-medium">参考图附件 <span class="text-slate-600 font-normal">(最多3张)</span></label>
                <div class="flex flex-wrap gap-2 items-center">
                  ${refs.map((r, i) => `<div class="ref-thumb" onclick="App.removeDesignRef(${i})"><img src="${r}"><div class="remove"><i class="fas fa-times"></i></div></div>`).join('')}
                  ${refs.length < 3 ? `<div class="ref-thumb flex items-center justify-center text-slate-500 hover:text-blue-400" onclick="App.addDesignRef()"><i class="fas fa-plus text-lg"></i></div>` : ''}
                </div>
              </div>
            </div>
            <div id="videoControls" class="hidden space-y-3">
              <div class="flex flex-wrap gap-3">
                <div class="param-card flex-1 min-w-[100px]">
                  <label class="block text-[11px] text-slate-500 mb-1 font-medium">比例</label>
                  <select id="videoRatio" class="select-field text-xs py-1.5" style="min-width:100px">
                    <option value="16:9">16:9 横屏</option>
                    <option value="9:16">9:16 竖屏</option>
                    <option value="1:1">1:1 方屏</option>
                  </select>
                </div>
                <div class="param-card flex-1 min-w-[100px]">
                  <label class="block text-[11px] text-slate-500 mb-1 font-medium">时长</label>
                  <select id="videoDuration" class="select-field text-xs py-1.5" style="min-width:90px">
                    <option value="5s">5秒</option>
                    <option value="10s">10秒</option>
                  </select>
                </div>
              </div>
              <div class="param-card">
                <label class="block text-[11px] text-slate-500 mb-2 font-medium">关键帧</label>
                <div class="flex gap-4 items-center">
                  <div class="text-center">
                    <div class="frame-box" onclick="App.setVideoFrame('first')">${this.firstFrame ? `<img src="${this.firstFrame}">` : `<i class="fas fa-plus text-slate-500 text-xs"></i>`}</div>
                    <div class="text-[10px] text-slate-500 mt-1">首帧</div>
                  </div>
                  <div class="text-center">
                    <div class="frame-box" onclick="App.setVideoFrame('last')">${this.lastFrame ? `<img src="${this.lastFrame}">` : `<i class="fas fa-plus text-slate-500 text-xs"></i>`}</div>
                    <div class="text-[10px] text-slate-500 mt-1">尾帧</div>
                  </div>
                  <button onclick="App.clearVideoFrames()" class="text-[11px] text-slate-500 hover:text-red-400 transition ml-2"><i class="fas fa-trash-alt mr-1"></i>清空</button>
                </div>
              </div>
            </div>
            <div class="mt-4">
              <button id="genDesignBtn" onclick="App.generateDesign()" class="gen-btn w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center">
                <i class="fas fa-wand-magic-sparkles mr-2"></i>开始生成
              </button>
            </div>
          </div>
        </div>
        <div class="lg:col-span-1">
          <div class="card p-4 h-full">
            <div class="flex justify-between items-center mb-3">
              <h4 class="text-xs font-semibold text-slate-400">生成历史</h4>
              <span class="text-[10px] text-slate-600">${gallery.length}/50</span>
            </div>
            <div class="space-y-3 max-h-[520px] overflow-y-auto scrollbar pr-1">
              ${gallery.length === 0 ? `<div class="empty-state py-8"><i class="fas fa-image text-2xl mb-2"></i><div class="text-[11px]">暂无生成记录</div></div>` : gallery.map((g, i) => `
                <div class="group relative rounded-xl overflow-hidden border border-white/5 bg-white/[0.02]">
                  ${g.type === 'video' ? `<div class="aspect-video bg-black flex items-center justify-center"><i class="fas fa-play-circle text-2xl text-white/40"></i></div>` : g.url ? `<img src="${g.url}" class="w-full aspect-square object-cover cursor-pointer" onclick="window.open('${g.url}','_blank')">` : `<div class="aspect-square bg-white/5 flex items-center justify-center text-[10px] text-slate-500">文本结果</div>`}
                  <div class="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition"><button onclick="App.deleteDesign(${i})" class="w-6 h-6 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center hover:bg-red-500/80"><i class="fas fa-times"></i></button></div>
                  <div class="p-2">
                    <div class="text-[10px] text-slate-400 truncate" title="${g.prompt}">${g.prompt}</div>
                    <div class="flex justify-between items-center mt-1">
                      <span class="text-[10px] text-slate-600">${g.createdAt}</span>
                      <span class="badge ${g.type === 'video' ? 'bg-purple-500/15 text-purple-400' : g.textResult ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'} text-[10px]">${g.type === 'video' ? '视频' : g.textResult ? '描述' : '图片'}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;
    const dp = document.getElementById('designProvider');
    if (dp) dp.value = currentProv;
    this.onDesignProviderChange();
    const dm = document.getElementById('designModel');
    if (dm && currentModel) dm.value = currentModel;
  },

  getDesignModelOptions(provName, selected) {
    const providers = this.store.llmProviders || [];
    const prov = providers.find(p => p.name === provName);
    if (!prov || !prov.models || !prov.models.length) return '<option value="">无可用模型</option>';
    return prov.models.map(m => `<option value="${m}" ${selected === m ? 'selected' : ''}>${m}</option>`).join('');
  },

  onDesignProviderChange() {
    const provName = document.getElementById('designProvider').value;
    this.designProvider = provName;
    const modelSelect = document.getElementById('designModel');
    if (modelSelect) {
      const providers = this.store.llmProviders || [];
      const prov = providers.find(p => p.name === provName);
      const defaultModel = prov?.models?.[0] || '';
      modelSelect.innerHTML = this.getDesignModelOptions(provName, defaultModel);
      this.designModel = defaultModel;
    }
  },

  toggleDesignType() {
    const type = document.getElementById('designType').value;
    document.getElementById('imageControls').classList.toggle('hidden', type !== 'image');
    document.getElementById('videoControls').classList.toggle('hidden', type !== 'video');
  },

  applyDesignSize() {
    const preset = document.getElementById('designSizePreset').value;
    const wrap = document.getElementById('customSizeWrap');
    if (preset === 'custom') { wrap.classList.remove('hidden'); }
    else { wrap.classList.add('hidden'); const [w, h] = preset.split('x'); document.getElementById('designWidth').value = w; document.getElementById('designHeight').value = h; }
  },

  addDesignRef() {
    if ((this.designRefs || []).length >= 3) return this.toast('最多3张参考图', 'warning');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (!this.designRefs) this.designRefs = [];
        this.designRefs.push(ev.target.result);
        this.renderDesignCenter(document.getElementById('pageContent'));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  },

  removeDesignRef(index) {
    if (this.designRefs) { this.designRefs.splice(index, 1); this.renderDesignCenter(document.getElementById('pageContent')); }
  },

  setVideoFrame(frame) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (frame === 'first') this.firstFrame = ev.target.result;
        else this.lastFrame = ev.target.result;
        this.renderDesignCenter(document.getElementById('pageContent'));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  },

  clearVideoFrames() {
    this.firstFrame = ''; this.lastFrame = '';
    this.renderDesignCenter(document.getElementById('pageContent'));
  },

  addDesignTag(tag) {
    const ta = document.getElementById('designPrompt');
    ta.value = (ta.value ? ta.value + ' ' : '') + tag + '风格，';
    ta.focus();
  },

  async generateDesign() {
    const prompt = document.getElementById('designPrompt').value.trim();
    const type = document.getElementById('designType').value;
    const providerName = document.getElementById('designProvider').value;
    const model = document.getElementById('designModel').value;
    if (!prompt) return this.toast('请输入生成描述', 'error');
    if (!providerName) return this.toast('请选择提供商', 'error');
    const btn = document.getElementById('genDesignBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>生成中...';
    try {
      if (type === 'image') {
        const preset = document.getElementById('designSizePreset').value;
        const size = preset === 'custom' ? `${document.getElementById('designWidth').value}x${document.getElementById('designHeight').value}` : preset;
        const quality = document.getElementById('designQuality').value;
        const res = await generateImage({ model, prompt, size, quality });
        if (res.error) {
          const providers = this.store.llmProviders || [];
          const prov = providers.find(p => p.name === providerName);
          const fallbackModel = model.includes('gpt-4o') ? model : (prov?.models?.find(m => m.includes('gpt-4o')) || model);
          this.toast('DALL-E 接口不可用，尝试通过 Chat 生成描述...', 'warning');
          const chatRes = await generateImageChat({ model: fallbackModel, prompt, size });
          if (chatRes.error) {
            this.toast('生成失败: ' + chatRes.error, 'error');
          } else {
            const gallery = this.store.designGallery || [];
            gallery.unshift({ url: '', prompt: prompt + '\n\n[Chat生成描述]\n' + chatRes.content, type: 'image', size, quality, createdAt: new Date().toLocaleString('zh-CN'), provider: providerName, model: fallbackModel, textResult: true });
            this.store.designGallery = gallery.slice(0, 50); this.designRefs = [];
            this.save();
            this.toast('已生成详细图片描述（当前中转站不支持直接出图）', 'success');
            this.renderDesignCenter(document.getElementById('pageContent'));
          }
        } else if (res.data && res.data[0] && res.data[0].url) {
          const url = res.data[0].url;
          const gallery = this.store.designGallery || [];
          gallery.unshift({ url, prompt, type: 'image', size, quality, createdAt: new Date().toLocaleString('zh-CN'), provider: providerName, model });
          this.store.designGallery = gallery.slice(0, 50); this.designRefs = [];
          this.save();
          this.toast('图片生成成功', 'success');
          this.renderDesignCenter(document.getElementById('pageContent'));
        } else if (res.url) {
          const gallery = this.store.designGallery || [];
          gallery.unshift({ url: res.url, prompt, type: 'image', size, quality, createdAt: new Date().toLocaleString('zh-CN'), provider: providerName, model });
          this.store.designGallery = gallery.slice(0, 50); this.designRefs = [];
          this.save();
          this.toast('图片生成成功', 'success');
          this.renderDesignCenter(document.getElementById('pageContent'));
        } else {
          this.toast('生成返回异常，请检查API配置', 'error');
          console.log('generate-image response:', res);
        }
      } else {
        this.toast('视频生成需配置对应API（如Runway、Pika等）', 'warning');
      }
    } catch (e) {
      this.toast('生成请求失败: ' + e.message, 'error');
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-wand-magic-sparkles mr-2"></i>开始生成';
    }
  },

  deleteDesign(index) {
    const gallery = this.store.designGallery || [];
    if (gallery[index]) { gallery.splice(index, 1); this.store.designGallery = gallery; this.save(); this.nav('design'); }
  },

  renderSettings(container) {
    const providers = this.store.llmProviders || [];
    const colorMap = { OpenAI: 'text-emerald-400', Google: 'text-blue-400', Anthropic: 'text-purple-400', xAI: 'text-slate-400', DeepSeek: 'text-cyan-400', Perplexity: 'text-teal-400' };
    const autoSwitch = this.store.llmAutoSwitch !== false;
    container.innerHTML = `<div class="max-w-3xl fade-in"><div class="flex justify-between items-center mb-5"><h3 class="font-semibold text-sm">LLM 大模型配置</h3><div class="flex items-center gap-3"><label class="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer"><input type="checkbox" id="llmAutoSwitch" ${autoSwitch ? 'checked' : ''} class="accent-blue-500 w-4 h-4 rounded"><span>请求失败时自动切换下一个可用模型</span></label></div></div><div class="space-y-4">${providers.map(p => {
      const iconColor = colorMap[p.name] || 'text-slate-400';
      return `<div class="card p-4"><div class="flex justify-between items-center mb-4"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5"><i class="fas fa-brain ${iconColor} text-lg"></i></div><div><div class="font-semibold text-sm">${p.name}</div><div class="text-[11px] text-slate-600">${(p.models || []).length} 个模型</div></div></div><span class="badge ${p.apiKey ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}">${p.apiKey ? '已配置' : '未配置'}</span></div><div class="mb-3"><label class="block text-[11px] text-slate-500 mb-1.5 font-medium uppercase tracking-wider">API Key</label><div class="flex gap-2"><input id="apiKey_${p.id}" type="password" value="${p.apiKey || ''}" class="input-field text-sm font-mono" placeholder="sk-..."><button onclick="const el=document.getElementById('apiKey_${p.id}');el.type=el.type==='password'?'text':'password';" class="btn-secondary px-3 rounded-lg text-xs"><i class="fas fa-eye"></i></button></div></div><div class="mb-3"><label class="block text-[11px] text-slate-500 mb-1.5 font-medium uppercase tracking-wider">API 中转地址</label><input id="apiUrl_${p.id}" value="${p.apiUrl || ''}" class="input-field text-sm font-mono" placeholder="https://api.example.com/v1"></div><div class="flex gap-2 pt-2"><button onclick="App.saveProviderSettings(${p.id})" class="btn-primary px-4 py-2 rounded-xl text-xs font-semibold">保存</button><button onclick="App.resetProviderModels(${p.id})" class="btn-secondary px-4 py-2 rounded-xl text-xs">重置默认模型</button></div></div>`;
    }).join('')}</div></div>`;
  },

  saveProviderSettings(id) {
    const p = this.store.llmProviders.find(x => x.id === id);
    if (!p) return;
    const keyEl = document.getElementById(`apiKey_${p.id}`);
    const urlEl = document.getElementById(`apiUrl_${p.id}`);
    if (keyEl) p.apiKey = keyEl.value.trim();
    if (urlEl) p.apiUrl = urlEl.value.trim();
    const autoSwitchEl = document.getElementById('llmAutoSwitch');
    this.store.llmAutoSwitch = autoSwitchEl ? autoSwitchEl.checked : true;
    this.save();
    this.toast('配置已保存', 'success');
  },

  resetProviderModels(id) {
    const defaults = {
      OpenAI: ['GPT-5.5', 'GPT-5.4', 'GPT-4o', 'GPT-4.1', 'o3', 'o1', 'DALL-E 3', 'gpt-4o-image'],
      Google: ['Gemini 3.1 Pro', 'Gemini 3.1 Ultra', 'Gemini 2.5 Pro', 'Gemini 2.0 Flash'],
      Anthropic: ['Claude Opus 4.7', 'Claude Sonnet 4.6', 'Claude 4 Sonnet', 'Claude 3.7 Sonnet'],
      xAI: ['Grok 3', 'Grok 3 Mini', 'Grok 2'],
      DeepSeek: ['DeepSeek-V3', 'DeepSeek-R1', 'DeepSeek-Coder-V2'],
      Perplexity: ['Sonar 2', 'Sonar Pro', 'Sonar Reasoning']
    };
    const p = this.store.llmProviders.find(x => x.id === id);
    if (p && defaults[p.name]) { p.models = defaults[p.name].slice(); }
    this.save(); this.nav('settings'); this.toast('已恢复默认模型列表', 'success');
  }
};

window.App = App;
App.init();
