const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { loadConfig, updateConfig } = require('../config');
const { query } = require('../mysql');

const router = express.Router();

function publicAiConfig(ai = {}) {
  const provider = ai.provider || 'deepseek';
  return {
    enabled: Boolean(ai.enabled),
    provider,
    providerLabel: provider === 'openai' ? 'OpenAI' : (provider === 'custom' ? '自定义' : 'DeepSeek'),
    model: ai.model || (provider === 'openai' ? 'gpt-4.1' : 'deepseek-chat'),
    endpoint: ai.endpoint || ai.baseUrl || '',
    hasApiKey: Boolean(ai.apiKey)
  };
}

async function localAnswer(user, prompt) {
  let hotNews = [];
  try {
    hotNews = await query(
      'SELECT title, category_name, summary FROM news ORDER BY view_count DESC, created_at DESC LIMIT 3'
    );
  } catch (error) {
    hotNews = [];
  }
  const titles = hotNews.map(item => `《${item.title}》`).join('、') || '新闻中心暂无可用内容';
  return [
    `${user.username}，我根据当前系统数据整理了一版回复：`,
    `你的问题是“${prompt}”。可以先把目标、相关对象、现有材料和下一步动作拆开处理。`,
    `如果要结合 Q信内容运营，当前可参考 ${titles}。`,
    '我可以继续帮你生成发布文案、聊天回复、后台处理建议或新闻摘要。'
  ].join('\n');
}

router.post('/chat', requireAuth, asyncHandler(async (req, res) => {
  const prompt = String((req.body && req.body.prompt) || '').trim();
  if (!prompt) {
    return res.status(400).json({ message: '请输入问题' });
  }
  const config = loadConfig();
  const ai = config.ai || {};
  const endpoint = ai.endpoint || ai.baseUrl;
  if (ai.enabled && ai.apiKey && endpoint) {
    try {
      const response = await fetch(`${endpoint.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ai.apiKey}`
        },
        body: JSON.stringify({
          model: ai.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: '你是 Q信 MyChat 的 AI 助手，回答要简洁、温暖、可执行。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        })
      });
      if (response.ok) {
        const payload = await response.json();
        const answer = payload && payload.choices && payload.choices[0] && payload.choices[0].message
          ? payload.choices[0].message.content
          : '';
        if (answer) {
          return res.json({ answer, provider: 'configured' });
        }
      }
    } catch (error) {
      console.error('AI provider failed:', error.message);
    }
  }
  const answer = await localAnswer(req.user, prompt);
  res.json({ answer, provider: 'local' });
}));

router.get('/config', requireAuth, asyncHandler(async (req, res) => {
  const config = loadConfig({ refresh: true });
  res.json(publicAiConfig(config.ai || {}));
}));

router.put('/config', requireAuth, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const current = loadConfig({ refresh: true });
  const currentAi = current.ai || {};
  const provider = String(body.provider || currentAi.provider || 'deepseek').trim();
  const nextAi = {
    enabled: Boolean(body.enabled),
    provider,
    model: String(body.model || '').trim() || (provider === 'openai' ? 'gpt-4.1' : 'deepseek-chat'),
    endpoint: String(body.endpoint || body.baseUrl || '').trim()
  };
  if (body.apiKey) {
    nextAi.apiKey = String(body.apiKey).trim();
  } else if (currentAi.apiKey) {
    nextAi.apiKey = currentAi.apiKey;
  }
  const updated = updateConfig({ ai: nextAi });
  res.json(publicAiConfig(updated.ai || {}));
}));

module.exports = router;
