<template>
  <div class="ai-assistant" :class="{'dark-theme': isDarkTheme, 'light-theme': !isDarkTheme}">
    <div class="sidebar" :class="{ 'sidebar-collapsed': !sidebarOpen }">
      <div class="sidebar-header">
        <div class="logo">
          <img class="logo-icon" :src="logoImage" alt="AI Logo">
          <span class="logo-text" v-if="sidebarOpen">NaiLoongGpt</span>
        </div>
        <button class="icon-btn" @click="sidebarOpen = !sidebarOpen" v-if="sidebarOpen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <button class="new-chat-btn" @click="startNewChat">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14m-7-7h14"/>
        </svg>
        <span v-if="sidebarOpen">新建对话</span>
      </button>

      <div class="sidebar-content" v-if="sidebarOpen">
        <div class="sidebar-section">
          <div class="section-title">快捷操作</div>
          <button class="sidebar-item" @click="recommendHotNews">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span>推荐热门</span>
          </button>
          <button class="sidebar-item" @click="summarizeLatest">
            <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>总结动态</span>
          </button>
        </div>
      </div>

      <div class="sidebar-footer">
        <button class="sidebar-item" @click="isDarkTheme = !isDarkTheme">
          <svg v-if="isDarkTheme" class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <span v-if="sidebarOpen">{{ isDarkTheme ? '浅色' : '深色' }}</span>
        </button>
        <button class="sidebar-item" @click="showConfig = true">
          <svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m5.656-17.656l-4.243 4.243m-2.828 2.828l-4.243 4.243m16.97.001l-4.243-4.243m-2.828-2.828l-4.243-4.243"/>
          </svg>
          <span v-if="sidebarOpen">设置</span>
        </button>
      </div>

      <button class="sidebar-toggle-btn" @click="sidebarOpen = !sidebarOpen" v-if="!sidebarOpen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="main-content">
      <div class="config-overlay" v-if="showConfig" @click.self="closeConfig">
        <div class="config-dialog">
          <div class="config-header">
            <h3 class="config-title">配置 API 密钥</h3>
            <button class="close-btn" @click="closeConfig">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div class="config-body">
            <div class="form-field">
              <label class="field-label">SiliconFlow API Key</label>
              <div class="field-input-wrapper">
                <input 
                  :type="apiKeyVisible ? 'text' : 'password'" 
                  v-model="apiKey" 
                  placeholder="请输入您的 API Key..."
                  class="field-input"
                  @keydown.enter="saveApiKey"
                />
                <button
                  type="button"
                  class="field-visibility-btn"
                  @click="apiKeyVisible = !apiKeyVisible"
                >
                  {{ apiKeyVisible ? '隐藏' : '显示' }}
                </button>
              </div>
              <p class="field-hint">
                <svg class="hint-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                您的密钥将安全地保存在本地浏览器中
              </p>
              <label class="prompt-optout">
                <input type="checkbox" v-model="configPromptOptOut">
                <span>不再提示（可在左侧 "设置" 中重新打开配置）</span>
              </label>
            </div>
          </div>

          <div class="config-footer">
            <button class="btn-secondary" @click="closeConfig">取消</button>
            <button class="btn-primary" @click="saveApiKey" :disabled="!apiKey.trim()">保存配置</button>
          </div>
        </div>
      </div>

      <div class="chat-container" ref="chatContainer">
        <div v-if="messages.length === 0" class="welcome-screen">
          <div class="welcome-header">
            <div class="welcome-icon-wrapper">
              <img class="welcome-icon" :src="logoImage" alt="AI Logo">
            </div>
            <h1 class="welcome-title">奶龙大王</h1>
            <p class="welcome-subtitle">专业的数据库资讯分析与内容创作助手</p>
          </div>
          
          <div class="quick-actions">
            <button class="action-card" @click="recommendHotNews">
              <div class="card-icon card-icon-hot">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <div class="card-text">
                <div class="card-title">推荐热门新闻</div>
                <div class="card-desc">获取最受关注的数据库资讯</div>
              </div>
            </button>
            
            <button class="action-card" @click="summarizeLatest">
              <div class="card-icon card-icon-summary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div class="card-text">
                <div class="card-title">总结最新动态</div>
                <div class="card-desc">快速了解数据库领域趋势</div>
              </div>
            </button>
            
            <button class="action-card" @click="showExampleQuery('发布一篇关于数据库优化的文章')">
              <div class="card-icon card-icon-publish">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <div class="card-text">
                <div class="card-title">智能发布文章</div>
                <div class="card-desc">AI 协助创建优质内容</div>
              </div>
            </button>
            
            <button class="action-card" @click="showExampleQuery('分析数据库性能趋势')">
              <div class="card-icon card-icon-analyze">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="20" x2="12" y2="10"/>
                  <line x1="18" y1="20" x2="18" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="16"/>
                </svg>
              </div>
              <div class="card-text">
                <div class="card-title">数据分析洞察</div>
                <div class="card-desc">深入理解行业数据</div>
              </div>
            </button>
          </div>
        </div>

        <div v-else class="messages-list">
          <div 
            v-for="(msg, index) in messages" 
            :key="index" 
            :class="['message-row', msg.role === 'user' ? 'message-row-user' : 'message-row-assistant']"
          >
            <div class="message-content">
              <div class="message-avatar">
                <div v-if="msg.role === 'user'" class="avatar avatar-user">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div v-else class="avatar avatar-assistant">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                    <path d="M2 17L12 22L22 17"/>
                    <path d="M2 12L12 17L22 12"/>
                  </svg>
                </div>
              </div>
              
              <div class="message-body">
                <div class="message-header">
                  <span class="message-role">{{ msg.role === 'user' ? '你' : 'AI 助手' }}</span>
                </div>
                <div class="message-text">
                  <div v-if="msg.role === 'assistant' && msg.isLoading" class="loading-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <div v-else v-html="formatMessage(msg.content)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="input-area">
        <div class="input-wrapper">
          <textarea 
            v-model="userInput" 
            placeholder="向 AI 助手提问..." 
            @keydown.enter.exact.prevent="sendMessage"
            @input="autoResize"
            ref="inputBox"
            rows="1"
            :disabled="isThinking"
            class="input-field"
          ></textarea>
          <button 
            class="send-btn" 
            @click="sendMessage" 
            :disabled="!userInput.trim() || isThinking"
            :class="{'send-btn-active': userInput.trim() && !isThinking}"
          >
            <svg v-if="!isThinking" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
            <div v-else class="spinner"></div>
          </button>
        </div>
        <div class="input-hint">Enter 发送 · Shift + Enter 换行</div>
      </div>
    </div>
  </div>
</template>

<script>
import * as newsApi from '../services/newsApi';
import { marked } from 'marked';
import aiLogo from '../assets/images/ai-logo.png';

export default {
  name: 'AiAssistant',
  props: {
    token: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      apiKey: '',
      showConfig: false,
      sidebarOpen: true,
      userInput: '',
      messages: [],
      isThinking: false,
      model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
      categories: [],
      isDarkTheme: true,
      logoImage: aiLogo,
      configPromptOptOut: false,
      apiKeyVisible: true
    };
  },
  mounted() {
    const savedKey = localStorage.getItem('siliconflow_api_key');
    const promptDisabled = localStorage.getItem('ai_config_prompt_disabled') === 'true';

    if (savedKey) {
      this.apiKey = savedKey;
    }

    this.configPromptOptOut = promptDisabled;
    this.showConfig = !promptDisabled;
    
    const savedTheme = localStorage.getItem('theme_preference');
    if (savedTheme) {
      this.isDarkTheme = savedTheme === 'dark';
    }
    
    this.fetchCategories();
    
    if (window.innerWidth < 768) {
      this.sidebarOpen = false;
    }
  },
  watch: {
    isDarkTheme(newVal) {
      localStorage.setItem('theme_preference', newVal ? 'dark' : 'light');
    },
    configPromptOptOut(newVal) {
      localStorage.setItem('ai_config_prompt_disabled', newVal ? 'true' : 'false');
    }
  },
  methods: {
    async fetchCategories() {
      try {
        const res = await newsApi.fetchCategories();
        this.categories = res || [];
      } catch (e) {
        console.error('获取分类失败', e);
      }
    },
    
    closeConfig() {
      if (this.apiKey.trim() || this.configPromptOptOut) {
        this.showConfig = false;
      }
    },

    saveApiKey() {
      if (this.apiKey.trim()) {
        localStorage.setItem('siliconflow_api_key', this.apiKey.trim());
        this.showConfig = false;
      }
    },
    
    startNewChat() {
      this.messages = [];
      this.userInput = '';
    },
    
    showExampleQuery(query) {
      this.userInput = query;
      this.$refs.inputBox.focus();
    },
    
    autoResize() {
      const textarea = this.$refs.inputBox;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
      }
    },
    
    async sendMessage() {
      if (!this.userInput.trim()) return;
      if (!this.apiKey) {
        this.showConfig = true;
        return;
      }

      const content = this.userInput;
      this.userInput = '';
      this.$refs.inputBox.style.height = 'auto';
      
      this.messages.push({ role: 'user', content });
      this.scrollToBottom();

      this.isThinking = true;
      this.messages.push({ role: 'assistant', content: '', isLoading: true });
      this.scrollToBottom();

      try {
        const aiMsgIndex = this.messages.length - 1;
        const response = await this.callAiApi(content, [], (partialContent) => {
          this.$set(this.messages, aiMsgIndex, {
            role: 'assistant',
            content: partialContent,
            isLoading: false
          });
          this.scrollToBottom();
        });
        
        let command = null;
        try {
          const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
          if (jsonMatch) {
            command = JSON.parse(jsonMatch[1]);
          } else {
            const firstBrace = response.indexOf('{');
            const lastBrace = response.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              const jsonStr = response.substring(firstBrace, lastBrace + 1);
              command = JSON.parse(jsonStr);
            }
          }
        } catch (e) {
          console.warn('尝试解析JSON指令失败', e);
        }

        if (command && command.action === 'publish' && command.data) {
          try {
            if (!this.token) {
              throw new Error('未检测到登录Token，请先登录');
            }
            
            await newsApi.createNews(command.data, this.token);
            
            this.$set(this.messages, aiMsgIndex, {
              role: 'assistant',
              content: `✅ 文章《${command.data.title}》已成功发布！`,
              isLoading: false
            });
            return;
          } catch (e) {
            console.error('执行AI指令失败', e);
            this.$set(this.messages, aiMsgIndex, {
              role: 'assistant',
              content: `❌ 发布失败: ${e.message}\n\n(原始回复已保留)`,
              isLoading: false
            });
            return;
          }
        }

        this.$set(this.messages, aiMsgIndex, {
          role: 'assistant',
          content: response,
          isLoading: false
        });
      } catch (error) {
        const aiMsgIndex = this.messages.length - 1;
        this.$set(this.messages, aiMsgIndex, {
          role: 'assistant',
          content: `出错啦: ${error.message}`,
          isLoading: false
        });
      } finally {
        this.isThinking = false;
        this.scrollToBottom();
      }
    },

    async callAiApi(prompt, contextMessages = [], onUpdate) {
      const history = this.messages
        .filter(m => !m.isLoading)
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const categoryInfo = this.categories.length > 0 
        ? this.categories.map(c => `${c.id}: ${c.name}`).join(', ')
        : '1: 默认分类';
      const defaultCategoryId = this.categories.length > 0 ? this.categories[0].id : 1;

      const messages = [
        { role: 'system', content: `你是一个专业的数据库新闻助手，可以帮助用户总结文章、推荐热门内容以及回答数据库相关问题。
If the user wants to publish an article (e.g., "help me publish an article about..."), please generate a JSON object based on the information provided by the user, in the following format:
\`\`\`json
{
  "action": "publish",
  "data": {
    "title": "Article title",
    "content": "Article main content (supports HTML)",
    "summary": "Article summary (generate automatically if not provided)",
    "categoryId": ${defaultCategoryId}
  }
}
\`\`\`
Available category IDs: [${categoryInfo}].
Please ensure the JSON format is correct and contains only this JSON block, without any additional explanations. The default category ID is ${defaultCategoryId}.` },
        ...contextMessages,
        ...history
      ];

      const res = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2048,
          stream: true
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'API请求失败');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';

      let reading = true;
      while (reading) {
        const { done, value } = await reader.read();
        if (done) {
          reading = false;
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                if (onUpdate) onUpdate(fullContent);
              }
            } catch (e) {
              console.error('Error parsing stream data', e);
            }
          }
        }
      }
      
      return fullContent;
    },

    async recommendHotNews() {
      if (!this.apiKey) {
        this.showConfig = true;
        return;
      }
      
      this.isThinking = true;
      this.messages.push({ role: 'user', content: '请推荐一些热门的数据库新闻' });
      this.messages.push({ role: 'assistant', content: '', isLoading: true });
      
      try {
        const hotNews = await newsApi.fetchHotNews(5);
        const newsContext = hotNews.map((n, i) => `${i+1}. ${n.title} (作者: ${n.author})`).join('\n');
        
        const systemContext = [
          { role: 'system', content: `以下是当前的热门新闻列表：\n${newsContext}\n请根据这些内容，向用户推荐并简要点评。` }
        ];
        
        const aiMsgIndex = this.messages.length - 1;
        const response = await this.callAiApi('请推荐一些热门的数据库新闻', systemContext, (partialContent) => {
          this.$set(this.messages, aiMsgIndex, {
            role: 'assistant',
            content: partialContent,
            isLoading: false
          });
          this.scrollToBottom();
        });
        
        this.$set(this.messages, aiMsgIndex, {
          role: 'assistant',
          content: response,
          isLoading: false
        });
      } catch (e) {
        const aiMsgIndex = this.messages.length - 1;
        this.$set(this.messages, aiMsgIndex, {
          role: 'assistant',
          content: `获取新闻失败: ${e.message}`,
          isLoading: false
        });
      } finally {
        this.isThinking = false;
        this.scrollToBottom();
      }
    },

    async summarizeLatest() {
      if (!this.apiKey) {
        this.showConfig = true;
        return;
      }
      
      this.isThinking = true;
      this.messages.push({ role: 'user', content: '总结一下最新的数据库动态' });
      this.messages.push({ role: 'assistant', content: '', isLoading: true });
      
      try {
        const latestNews = await newsApi.fetchNewsList({ page: 1, pageSize: 5 });
        const newsContext = latestNews.list.map((n, i) => `${i+1}. ${n.title} (${n.summary})`).join('\n');

        const systemContext = [
          { role: 'system', content: `以下是最新发布的文章：\n${newsContext}\n请总结这些文章的主要趋势和看点。` }
        ];

        const aiMsgIndex = this.messages.length - 1;
        const response = await this.callAiApi('总结一下最新的数据库动态', systemContext, (partialContent) => {
          this.$set(this.messages, aiMsgIndex, {
            role: 'assistant',
            content: partialContent,
            isLoading: false
          });
          this.scrollToBottom();
        });
        
        this.$set(this.messages, aiMsgIndex, {
          role: 'assistant',
          content: response,
          isLoading: false
        });
      } catch (e) {
        const aiMsgIndex = this.messages.length - 1;
        this.$set(this.messages, aiMsgIndex, {
          role: 'assistant',
          content: `获取新闻失败: ${e.message}`,
          isLoading: false
        });
      } finally {
        this.isThinking = false;
        this.scrollToBottom();
      }
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.chatContainer;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    },
    
    formatMessage(content) {
      if (typeof marked !== 'undefined') {
        return marked.parse(content);
      }
      return content.replace(/\n/g, '<br>');
    }
  }
};
</script>

<style scoped>
.ai-assistant {
  display: flex;
  height: 100%;
  max-height: 100%;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Helvetica Neue', Arial, sans-serif;
  transition: background-color 0.3s ease, color 0.3s ease;
  overflow: hidden;
}

/* 深色主题 */
.dark-theme {
  --bg-primary: #0d0d0d;
  --bg-secondary: #171717;
  --bg-tertiary: #1f1f1f;
  --bg-hover: #2a2a2a;
  --bg-active: #3a3a3a;
  --border-color: #2a2a2a;
  --border-hover: #3a3a3a;
  --text-primary: #ececec;
  --text-secondary: #b4b4b4;
  --text-tertiary: #8e8e8e;
  --accent-primary: #10a37f;
  --accent-hover: #0d8f6e;
  --accent-light: #1a7f64;
  --avatar-user: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --avatar-ai: linear-gradient(135deg, #10a37f 0%, #0d8f6e 100%);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* 浅色主题 */
.light-theme {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --bg-hover: #e5e7eb;
  --bg-active: #d1d5db;
  --border-color: #e5e7eb;
  --border-hover: #d1d5db;
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-tertiary: #6b7280;
  --accent-primary: #10a37f;
  --accent-hover: #0d8f6e;
  --accent-light: #e0f2ed;
  --avatar-user: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --avatar-ai: linear-gradient(135deg, #10a37f 0%, #0d8f6e 100%);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* 侧边栏样式 */
.sidebar {
  width: 260px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, transform 0.3s ease;
  position: relative;
}

.sidebar-collapsed {
  width: 64px;
}

.sidebar-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  min-height: 64px;
  gap: 8px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 12px;
  font-weight: 600;
  font-size: 16px;
  color: var(--text-primary);
  text-align: center;
}

.logo-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  object-fit: cover;
  display: block;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.6);
  background: var(--bg-primary);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.logo-text {
  white-space: nowrap;
}

.icon-btn {
  width: 32px;
  height: 32px;
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.icon-btn svg {
  width: 100%;
  height: 100%;
}

.new-chat-btn {
  margin: 12px 12px 8px;
  padding: 10px 14px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.new-chat-btn:hover {
  background: var(--bg-active);
  border-color: var(--border-hover);
}

.btn-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.sidebar-collapsed .new-chat-btn {
  padding: 10px;
}

.sidebar-collapsed .new-chat-btn span {
  display: none;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.sidebar-section {
  margin-bottom: 12px;
}

.section-title {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0 0 4px 0;
}

.sidebar-item {
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  transition: background 0.2s ease;
  text-align: left;
}

.sidebar-item:hover {
  background: var(--bg-hover);
}

.sidebar-collapsed .sidebar-item {
  justify-content: center;
  padding: 10px;
}

.sidebar-collapsed .sidebar-item span {
  display: none;
}

.item-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 8px;
  border-top: 1px solid var(--border-color);
}

.sidebar-toggle-btn {
  position: absolute;
  top: 16px;
  right: -12px;
  width: 24px;
  height: 24px;
  padding: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.sidebar-toggle-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.sidebar-toggle-btn svg {
  width: 100%;
  height: 100%;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
  min-height: 0;
  width: 100%;
}

/* 配置对话框 */
.config-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.config-dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.config-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  width: 32px;
  height: 32px;
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.close-btn svg {
  width: 100%;
  height: 100%;
}

.config-body {
  padding: 24px;
}

.form-field {
  margin-bottom: 16px;
  width: 100%;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.field-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  flex: 1;
  min-width: 0;
}

.field-input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.field-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-visibility-btn {
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.field-visibility-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.field-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.hint-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.prompt-optout {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  user-select: none;
}

.prompt-optout input {
  width: 16px;
  height: 16px;
}

.config-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-secondary,
.btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-active);
}

.btn-primary {
  background: var(--accent-primary);
  color: #ffffff;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-primary:disabled {
  background: var(--bg-active);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

/* 聊天容器 */
.chat-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* 欢迎屏幕 */
.welcome-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.welcome-header {
  text-align: center;
  margin-bottom: 48px;
}

.welcome-icon-wrapper {
  margin: 0 auto 24px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
}

.welcome-icon {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.4);
  animation: float 3s ease-in-out infinite;
  display: block;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.welcome-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.welcome-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  width: 100%;
}

.action-card {
  padding: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.action-card:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.card-icon {
  width: 40px;
  height: 40px;
  padding: 8px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon svg {
  width: 100%;
  height: 100%;
  color: #ffffff;
}

.card-icon-hot {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
}

.card-icon-summary {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.card-icon-publish {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.card-icon-analyze {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.card-text {
  flex: 1;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.card-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* 消息列表 */
.messages-list {
  padding: 24px 0;
}

.message-row {
  padding: 16px 24px;
  transition: background-color 0.2s ease;
}

.message-row-assistant {
  background: var(--bg-secondary);
}

.message-content {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 12px;
  display: flex;
  gap: 16px;
}

.message-avatar {
  flex-shrink: 0;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.avatar svg {
  width: 100%;
  height: 100%;
  color: #ffffff;
}

.avatar-user {
  background: var(--avatar-user);
}

.avatar-assistant {
  background: var(--avatar-ai);
}

.message-body {
  flex: 1;
  min-width: 0;
}

.message-header {
  margin-bottom: 8px;
}

.message-role {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.message-text {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-primary);
  word-wrap: break-word;
}

.loading-dots {
  display: flex;
  gap: 6px;
  padding: 12px 0;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  animation: bounce 1.4s infinite ease-in-out;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 输入区域 */
.input-area {
  padding: 12px 20px 20px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  box-sizing: border-box;
  overflow-x: hidden;
}

.input-wrapper {
  width: 100%;
  max-width: 780px;
  margin: 0 auto 6px;
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-wrapper:focus-within {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.input-field {
  flex: 1;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  font-family: inherit;
  max-height: 160px;
}

.input-field::placeholder {
  color: var(--text-tertiary);
}

.send-btn {
  width: 32px;
  height: 32px;
  padding: 6px;
  background: var(--bg-hover);
  border: none;
  border-radius: 10px;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn-active {
  background: var(--accent-primary);
  color: #ffffff;
}

.send-btn-active:hover {
  background: var(--accent-hover);
}

.send-btn svg {
  width: 100%;
  height: 100%;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--border-color);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.input-hint {
  width: 100%;
  max-width: 780px;
  margin: 0 auto;
  padding: 0 6px;
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);
  }
  
  .sidebar-collapsed {
    transform: translateX(0);
  }
  
  .welcome-title {
    font-size: 24px;
  }
  
  .quick-actions {
    grid-template-columns: 1fr;
  }
  
  .message-row {
    padding: 16px;
  }
  
  .input-area {
    padding: 12px 16px 16px;
  }
}

/* Markdown 样式 */
.message-text :deep(p) {
  margin: 0 0 12px 0;
}

.message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.message-text :deep(code) {
  padding: 2px 6px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}

.message-text :deep(pre) {
  padding: 16px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.message-text :deep(pre code) {
  padding: 0;
  background: transparent;
  border: none;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin: 12px 0;
  padding-left: 24px;
}

.message-text :deep(li) {
  margin: 6px 0;
}

.message-text :deep(strong) {
  font-weight: 600;
  color: var(--text-primary);
}

.message-text :deep(a) {
  color: var(--accent-primary);
  text-decoration: none;
}

.message-text :deep(a:hover) {
  text-decoration: underline;
}
</style>
