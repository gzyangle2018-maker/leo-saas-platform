const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const app = express();
app.use(express.json({ limit: '10mb' }));

// ================== 配置区域 ==================
// 方式1：直接在这里填写（仅本地测试，生产环境请改用环境变量）
// const BASE_URL = 'https://dataler.com/v1';
// const API_KEY = 'Bearer sk-xxxxxxxx';

// 方式2：通过环境变量读取（推荐）
const BASE_URL = process.env.API_BASE_URL || 'https://api.openai.com/v1';
const API_KEY = process.env.API_KEY || '';

// 可灵视频专用配置（如使用官方 API 或独立中转站）
const KLING_BASE_URL = process.env.KLING_API_BASE_URL || '';
const KLING_API_KEY = process.env.KLING_API_KEY || '';

// 如果需要为不同平台配置不同的地址和Key，可以展开下面的对象
// const PROVIDER_CONFIG = {
//   OpenAI:   { base: 'https://api.openai.com/v1',      key: 'sk-xxx' },
//   Anthropic:{ base: 'https://api.anthropic.com/v1',    key: 'sk-ant-xxx' },
//   // ...
// };
// =============================================

// CORS 支持（允许前端直接调用，但生产环境建议限制域名）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 代理 OpenAI 兼容端点（前端配置 relayUrl = http://localhost:3000 即可走代理）
async function proxyRequest(req, res, endpoint) {
  if (!API_KEY) {
    return res.status(500).json({ error: '未配置 API_KEY，请在 proxy.js 或环境变量中设置' });
  }
  try {
    const resp = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: API_KEY.startsWith('Bearer ') ? API_KEY : `Bearer ${API_KEY}`
      },
      body: JSON.stringify(req.body)
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.post('/chat/completions',  (req, res) => proxyRequest(req, res, '/chat/completions'));
app.post('/images/generations', (req, res) => proxyRequest(req, res, '/images/generations'));
app.post('/videos/generations', (req, res) => proxyRequest(req, res, '/videos/generations'));

// 可灵视频专用端点（支持官方 API 或独立中转站）
app.post('/kling/video', async (req, res) => {
  const klingUrl = (KLING_BASE_URL || BASE_URL).replace(/\/$/, '');
  const klingKey = KLING_API_KEY || API_KEY;
  if (!klingKey) {
    return res.status(500).json({ error: '未配置可灵 API_KEY' });
  }
  try {
    const resp = await fetch(`${klingUrl}/videos/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: klingKey.startsWith('Bearer ') ? klingKey : `Bearer ${klingKey}`
      },
      body: JSON.stringify(req.body)
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 可灵视频轮询端点
app.get('/kling/video/status', async (req, res) => {
  const klingUrl = (KLING_BASE_URL || BASE_URL).replace(/\/$/, '');
  const klingKey = KLING_API_KEY || API_KEY;
  const taskId = req.query.task_id;
  if (!klingKey) return res.status(500).json({ error: '未配置可灵 API_KEY' });
  if (!taskId) return res.status(400).json({ error: '缺少 task_id' });
  try {
    const resp = await fetch(`${klingUrl}/videos/generations/${taskId}`, {
      headers: { Authorization: klingKey.startsWith('Bearer ') ? klingKey : `Bearer ${klingKey}` }
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 静态文件托管（让前端通过 http://localhost:3000/ 访问）
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy + Static Server running at http://localhost:${PORT}`);
  console.log(`API Base: ${BASE_URL}`);
  console.log(`前端访问: http://localhost:${PORT}/index.html`);
});
