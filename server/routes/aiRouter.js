const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { loadConfig, updateConfig } = require('../config');
const { query } = require('../mysql');

const router = express.Router();

const ARTICLE_INTENT_RE = /(生成|写|撰写|起草|发布|发送|发).{0,24}(文章|新闻|稿|文案|新闻中心)|(文章|新闻|稿|文案|新闻中心).{0,24}(生成|发布|发送|发|草稿|写入|上架)/;
const DEFAULT_DEEPSEEK_ENDPOINT = 'https://api.deepseek.com';

function publicAiConfig(ai = {}) {
  const provider = ai.provider || 'deepseek';
  return {
    enabled: Boolean(ai.enabled),
    provider,
    providerLabel: provider === 'openai' ? 'OpenAI' : (provider === 'custom' ? '自定义' : 'DeepSeek'),
    model: ai.model || (provider === 'openai' ? 'gpt-4.1' : 'deepseek-v4-flash'),
    endpoint: ai.endpoint || ai.baseUrl || (provider === 'deepseek' ? DEFAULT_DEEPSEEK_ENDPOINT : ''),
    hasApiKey: Boolean(ai.apiKey)
  };
}

async function localAnswer(user, prompt, newsItems = []) {
  const titles = newsItems.map(item => `《${item.title}》`).join('、') || '新闻中心暂无可用内容';
  const detail = formatNewsContext(newsItems);
  if (ARTICLE_INTENT_RE.test(prompt)) {
    return [
      `${user.username}，我已根据新闻中心的数据为你生成一篇可发布草稿。`,
      detail ? `参考来源：\n${detail}` : '当前新闻中心可用内容较少，草稿会以通用社区资讯口吻生成。',
      '你可以直接发布到新闻中心，也可以先填入发布页继续修改。'
    ].join('\n');
  }
  return [
    `${user.username}，我根据新闻中心数据库整理了一版回复：`,
    `你的问题是“${prompt}”。`,
    detail || `当前可参考 ${titles}。`,
    '如果你要继续写成文章，可以告诉我主题、分类和语气，我会生成可发布草稿。'
  ].join('\n');
}

function compactText(value, maxLength = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function stripMarkdown(value) {
  return String(value || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}[-*]\s+/gm, '')
    .trim();
}

function getPromptTerms(prompt) {
  return String(prompt || '')
    .split(/[，。！？、\s,.;:!?()[\]{}"'“”‘’《》]+/)
    .map(item => item.trim())
    .filter(item => item.length >= 2)
    .slice(0, 4);
}

async function loadNewsContext(prompt) {
  const fields = `
    SELECT n.id, n.title, n.summary, LEFT(n.content, 420) AS content,
           n.published_at AS publishedAt,
           u.username AS author,
           c.name AS categoryName,
           COALESCE(m.view_count, 0) AS viewCount,
           COALESCE(m.comment_count, 0) AS commentCount
    FROM news n
    JOIN users u ON u.id = n.author_id
    JOIN news_categories c ON c.id = n.category_id
    LEFT JOIN news_metrics m ON m.news_id = n.id
  `;
  const terms = getPromptTerms(prompt);
  const params = [];
  let where = "WHERE n.status = 'published'";
  if (terms.length) {
    const likeSql = terms.map(() => '(n.title LIKE ? OR n.summary LIKE ? OR n.content LIKE ? OR c.name LIKE ?)').join(' OR ');
    where += ` AND (${likeSql})`;
    terms.forEach(term => {
      const keyword = `%${term}%`;
      params.push(keyword, keyword, keyword, keyword);
    });
  }
  try {
    const matched = await query(
      `${fields} ${where} ORDER BY COALESCE(m.view_count, 0) DESC, n.published_at DESC, n.created_at DESC LIMIT 6`,
      params
    );
    if (matched.length) {
      return matched;
    }
    return query(
      `${fields} WHERE n.status = 'published' ORDER BY n.published_at DESC, n.created_at DESC LIMIT 6`
    );
  } catch (error) {
    console.warn('Failed to load AI news context:', error.message);
    return [];
  }
}

function formatNewsContext(items) {
  if (!items.length) {
    return '';
  }
  return items.map((item, index) => {
    const summary = compactText(item.summary || item.content, 140) || '暂无摘要';
    return `${index + 1}. 《${item.title}》(${item.categoryName || '未分类'})：${summary}`;
  }).join('\n');
}

function buildArticleDraft(prompt, items) {
  const source = items[0] || {};
  const categoryName = source.categoryName || '社区动态';
  const promptText = compactText(prompt, 120);
  const topicMatch = promptText.match(/(?:主题|标题|题目)(?:是|为|：|:)\s*([^，。！？,;；\n]+)/);
  const cleanPrompt = compactText(topicMatch ? topicMatch[1] : promptText, 48)
    .replace(/^(请|帮我|给我|根据|基于|生成|写|撰写|起草|发布|发送|发|一条)+/, '')
    .replace(/(文章|新闻|稿|文案|到新闻中心|发送|发布|发)+$/g, '')
    .trim();
  const topic = cleanPrompt || source.title || 'Q信社区新动态';
  const title = topic.length > 24 ? topic.slice(0, 24) : topic;
  const references = items.slice(0, 3).map(item => `《${item.title}》`).join('、') || '新闻中心近期内容';
  return {
    title: title.indexOf('：') === -1 ? `${title}：来自 Q信新闻中心的新观察` : title,
    summary: `围绕${topic}，结合${references}整理的一篇新闻中心发布草稿。`,
    categoryName,
    tags: [categoryName, 'AI 生成', '新闻中心'],
    content: [
      `【导语】${topic}正在成为 Q信新闻中心近期值得关注的话题。结合数据库中的最新文章与热门内容，可以看到用户对社区动态、活动信息和实用资讯的关注度持续提升。`,
      `【背景】本次草稿参考了${references}等内容，延续新闻中心真实数据中的主题线索，帮助读者快速理解事件背景、主要看点和后续行动。`,
      '【正文】从现有内容看，用户更关注信息是否清晰、行动入口是否明确，以及内容是否能直接服务日常沟通和社区参与。因此，文章可以重点突出时间、地点、参与方式、影响范围和后续更新安排。',
      '【结语】后续可继续通过新闻中心发布进展、收集评论反馈，并在 AI 助手中生成摘要、推送文案或活动复盘，让内容生产和用户互动形成闭环。'
    ].join('\n\n')
  };
}

router.post('/chat', requireAuth, asyncHandler(async (req, res) => {
  const prompt = String((req.body && req.body.prompt) || '').trim();
  if (!prompt) {
    return res.status(400).json({ message: '请输入问题' });
  }
  const newsItems = await loadNewsContext(prompt);
  const newsContext = formatNewsContext(newsItems);
  const articleDraft = ARTICLE_INTENT_RE.test(prompt) ? buildArticleDraft(prompt, newsItems) : null;
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
            {
              role: 'system',
              content: [
                '你是 Q信 的 AI 助手，回答要简洁、温暖、可执行。',
                '回答需要优先结合新闻中心数据库上下文；如果上下文为空，再说明当前没有足够新闻数据。',
                '如果用户要求生成或发布文章，请给出清晰标题、摘要和正文结构。',
                '回答必须使用纯文本，不要使用 Markdown，不要输出星号、加粗标记或代码块。'
              ].join('\n')
            },
            { role: 'system', content: `新闻中心数据库上下文：\n${newsContext || '暂无可用新闻内容'}` },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          thinking: { type: 'disabled' }
        })
      });
      if (response.ok) {
        const payload = await response.json();
        const answer = payload && payload.choices && payload.choices[0] && payload.choices[0].message
          ? stripMarkdown(payload.choices[0].message.content)
          : '';
        if (answer) {
          return res.json({
            answer,
            provider: 'configured',
            articleDraft,
            newsReferences: newsItems.map(item => ({ id: item.id, title: item.title, categoryName: item.categoryName }))
          });
        }
      }
    } catch (error) {
      console.error('AI provider failed:', error.message);
    }
  }
  const answer = await localAnswer(req.user, prompt, newsItems);
  res.json({
    answer,
    provider: 'local',
    articleDraft,
    newsReferences: newsItems.map(item => ({ id: item.id, title: item.title, categoryName: item.categoryName }))
  });
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
    model: String(body.model || '').trim() || (provider === 'openai' ? 'gpt-4.1' : 'deepseek-v4-flash'),
    endpoint: String(body.endpoint || body.baseUrl || currentAi.endpoint || currentAi.baseUrl || (provider === 'deepseek' ? DEFAULT_DEEPSEEK_ENDPOINT : '')).trim()
  };
  if (body.apiKey) {
    nextAi.apiKey = String(body.apiKey).trim();
  }
  const updated = updateConfig({ ai: nextAi });
  res.json(publicAiConfig(updated.ai || {}));
}));

module.exports = router;
