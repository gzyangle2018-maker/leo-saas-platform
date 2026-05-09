export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    const API_BASE_URL = (env.API_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const API_KEY = env.API_KEY || '';
    const KLING_BASE_URL = (env.KLING_API_BASE_URL || API_BASE_URL).replace(/\/$/, '');
    const KLING_API_KEY = env.KLING_API_KEY || API_KEY;

    const corsHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    };

    // 通用代理函数
    async function proxyTo(endpoint, base, key) {
      if (!key) {
        return new Response(JSON.stringify({ error: '未配置 API_KEY，请在 Workers 环境变量中设置' }), {
          status: 500, headers: corsHeaders
        });
      }
      try {
        const resp = await fetch(`${base}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: key.startsWith('Bearer ') ? key : `Bearer ${key}`
          },
          body: request.body
        });
        const data = await resp.json();
        return new Response(JSON.stringify(data), { status: resp.status, headers: corsHeaders });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // OpenAI 兼容端点
    if (url.pathname === '/chat/completions') return proxyTo('/chat/completions', API_BASE_URL, API_KEY);
    if (url.pathname === '/images/generations') return proxyTo('/images/generations', API_BASE_URL, API_KEY);
    if (url.pathname === '/videos/generations') return proxyTo('/videos/generations', API_BASE_URL, API_KEY);

    // 可灵视频端点
    if (url.pathname === '/kling/video') return proxyTo('/videos/generations', KLING_BASE_URL, KLING_API_KEY);

    if (url.pathname === '/kling/video/status') {
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

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });
  }
};
