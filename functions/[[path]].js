export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // API 端点列表
  const apiPaths = ['/chat/completions', '/images/generations', '/videos/generations', '/kling/video'];
  
  // 非 API 请求，交给静态文件服务
  if (!apiPaths.includes(url.pathname)) {
    return context.next();
  }

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: corsHeaders });
  }

  const model = body.model || '';
  const API_BASE_URL = (env.DATALER_URL || 'https://dataler.com/v1').replace(/\/$/, '');

  // 根据 model 选择对应的 API Key
  let apiKey = env.DATALER_API_KEY || '';
  let baseUrl = API_BASE_URL;

  if (model.includes('kling')) {
    apiKey = env.KLING_API_KEY || apiKey;
    baseUrl = (env.KLING_URL || baseUrl).replace(/\/$/, '');
  } else if (model.includes('claude')) {
    apiKey = env.CLAUDE_API_KEY || apiKey;
  } else if (model.includes('gemini')) {
    apiKey = env.GEMINI_API_KEY || apiKey;
  } else if (model.includes('gpt') || model.includes('o3') || model.includes('o4') || model.includes('dall-e')) {
    apiKey = env.GPT_API_KEY || apiKey;
  }

  if (!apiKey) {
    return new Response(JSON.stringify({ error: `未配置 model="${model}" 对应的 API_KEY，请在 Pages 环境变量中设置` }), {
      status: 500, headers: corsHeaders
    });
  }

  async function proxyTo(endpoint) {
    try {
      const resp = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), { status: resp.status, headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  }

  if (url.pathname === '/chat/completions') return proxyTo('/chat/completions');
  if (url.pathname === '/images/generations') return proxyTo('/images/generations');
  if (url.pathname === '/videos/generations') return proxyTo('/videos/generations');
  if (url.pathname === '/kling/video') return proxyTo('/videos/generations');

  return context.next();
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 非 API 请求，交给静态文件服务
  if (url.pathname !== '/kling/video/status') {
    return context.next();
  }

  const KLING_BASE_URL = (env.KLING_URL || env.DATALER_URL || 'https://dataler.com/v1').replace(/\/$/, '');
  const KLING_API_KEY = env.KLING_API_KEY || env.DATALER_API_KEY || '';

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  const taskId = url.searchParams.get('task_id');
  if (!taskId) return new Response(JSON.stringify({ error: '缺少 task_id' }), { status: 400, headers: corsHeaders });
  if (!KLING_API_KEY) return new Response(JSON.stringify({ error: '未配置可灵 API_KEY' }), { status: 500, headers: corsHeaders });
  try {
    const resp = await fetch(`${KLING_BASE_URL}/videos/generations/${taskId}`, {
      headers: { Authorization: KLING_API_KEY.startsWith('Bearer ') ? KLING_API_KEY : `Bearer ${KLING_API_KEY}` }
    });
    const data = await resp.json();
    return new Response(JSON.stringify(data), { status: resp.status, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
