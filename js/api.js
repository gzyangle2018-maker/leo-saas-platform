// ===== Cloudflare 部署配置 =====
// 本地开发保持 'http://localhost:3000'
// Cloudflare 部署后，把下面改成你的 Workers URL，例如：
// 'https://ai-dispatcher-proxy.你的用户名.workers.dev'
const PROXY_BASE_URL = '';
// ================================

export function getProxyBaseUrl(cfgRelayUrl) {
  return (cfgRelayUrl || PROXY_BASE_URL).replace(/\/$/, '');
}

export function getApiModelId(modelId) {
  const map = {
    best: 'gpt-4o',
    gpt54: 'gpt-4o',
    gpt55max: 'gpt-4-turbo',
    claude46sonnet: 'claude-3-5-sonnet-20241022',
    claude47opusmax: 'claude-3-opus-20240229',
    gemini31pro: 'gemini-1.5-pro-latest',
    grok3: 'grok-beta',
    sonar2: 'sonar',
    deepseekv3: 'deepseek-chat',
    deepseekr2: 'deepseek-reasoner',
    wenxin4: 'ernie-bot-4',
    tongyiqwen3: 'qwen-max',
    spark4: 'Spark4.0-Ultra',
    glm5: 'glm-4',
    doubao15: 'Doubao-pro-32k',
    kimi15: 'kimi-latest',
    minimax6: 'abab6.5-chat',
    o3: 'o3-mini',
    o4mini: 'gpt-4o-mini',
    grok2: 'grok-beta',
    gptimage2: 'dall-e-3',
    dalle3: 'dall-e-3',
    nanobanana2: 'dall-e-3',
    nanobananapro: 'dall-e-3',
    midjourneyv7: 'midjourney',
    sdxl: 'stability-ai/sdxl',
    fluxpro: 'flux-pro',
    ideogram2: 'ideogram',
    recraft3: 'recraft',
    kling2: 'kling',
    jimeng2: 'jimeng',
    grokvideo: 'sora',
    sora: 'sora',
    seedance2: 'seedance',
    runway4: 'runway-gen4',
    luma2: 'luma',
    klingvid: 'kling',
    pika2: 'pika'
  };
  return map[modelId] || modelId;
}

export async function callChatAPI(baseUrl, apiKey, modelId, messages) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model: modelId, messages, temperature: 0.7 })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

export async function callImageAPI(baseUrl, apiKey, modelId, prompt, size, style) {
  const res = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      prompt,
      size,
      n: 1,
      quality: style === 'vivid' ? 'hd' : 'standard'
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

export async function callVideoAPI(baseUrl, apiKey, modelId, prompt, ratio, dur) {
  const isKling = modelId === 'kling' || modelId === 'klingvid';
  const endpoint = isKling ? `${baseUrl}/kling/video` : `${baseUrl}/videos/generations`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      prompt,
      size: ratio.replace(':', 'x'),
      duration: dur.replace('s', '')
    })
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        '该API暂不支持视频生成端点（/videos/generations）。视频模型API通常需要单独对接，请联系中转站提供商获取视频API地址。'
      );
    }
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();

  // 可灵异步轮询：如果返回 task_id 但没有直接 url，则轮询状态
  if (isKling && data.data?.task_id && !data.data?.url) {
    const taskId = data.data.task_id;
    const maxPoll = 30;
    for (let i = 0; i < maxPoll; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const pollRes = await fetch(`${baseUrl}/kling/video/status?task_id=${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (!pollRes.ok) continue;
      const pollData = await pollRes.json();
      if (pollData.data?.url) return pollData;
      if (pollData.data?.task_status === 'failed') throw new Error('可灵视频生成失败：' + (pollData.data?.task_status_msg || '未知错误'));
    }
    throw new Error('可灵视频生成超时，请稍后通过任务ID查询结果');
  }

  return data;
}
