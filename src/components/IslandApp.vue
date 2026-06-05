<template>
  <div class="island-app" :class="['island-theme-' + settings.theme, 'island-font-' + settings.fontSize]">
    <section v-if="!isLoggedIn" class="island-login">
      <aside class="island-login__rail">
        <div class="island-login__brand">
          <img class="island-brand-logo" :src="assets.aiRobot" alt="Q信 Logo" />
          <span>Q信</span>
        </div>
        <img class="island-login__avatar" :src="user.avatar" alt="登录用户头像" />
        <button
          v-for="item in loginActions"
          :key="item.key"
          type="button"
          class="island-login__rail-button"
          :class="{ active: item.key === loginMode }"
          @click="setLoginAction(item.key)"
        >
          <IslandSvgIcon :name="item.icon" />
          <span>{{ item.label }}</span>
        </button>
        <img class="island-login__rail-scene" :src="assets.sidebarScene" alt="小岛装饰" />
      </aside>

      <div
        class="island-login__intro"
        :class="{
          'island-login__intro--typing': loginFocus === 'account',
          'island-login__intro--password': loginFocus === 'password',
          'island-login__intro--error': loginError
        }"
        :style="loginCharacterStyle"
        @mousemove="handleLoginMouseMove"
      >
        <div class="island-login__stage-brand">
          <img class="island-brand-logo island-brand-logo--small" :src="assets.aiRobot" alt="Q信 Logo" />
          <strong>Q信</strong>
        </div>
        <div class="island-characters-wrapper">
          <div class="island-characters-scene">
            <div class="island-character island-char-tall">
              <div class="island-eyes island-eyes--tall">
                <span class="island-eyeball"><i></i></span>
                <span class="island-eyeball"><i></i></span>
              </div>
            </div>
            <div class="island-character island-char-dark">
              <div class="island-eyes island-eyes--dark">
                <span class="island-eyeball"><i></i></span>
                <span class="island-eyeball"><i></i></span>
              </div>
            </div>
            <div class="island-character island-char-dome">
              <div class="island-eyes island-eyes--dome">
                <span class="island-bare-eye"></span>
                <span class="island-bare-eye"></span>
              </div>
              <span class="island-dome-mouth"></span>
            </div>
            <div class="island-character island-char-round">
              <div class="island-eyes island-eyes--round">
                <span class="island-bare-eye"></span>
                <span class="island-bare-eye"></span>
              </div>
              <span class="island-round-mouth"></span>
            </div>
          </div>
        </div>
        <div class="island-login__stage-footer">
          <span>聊天</span>
          <span>新闻</span>
          <span>AI 助手</span>
        </div>
      </div>

        <form class="island-login__card" @submit.prevent="submitLoginAction">
          <div class="island-login__card-brand">
          <img class="island-brand-logo island-brand-logo--large" :src="assets.aiRobot" alt="Q信 Logo" />
            <span>Q信</span>
          <small>{{ loginModeSubtitle }}</small>
        </div>

        <h2 class="island-login__mode-title">{{ loginModeTitle }}</h2>

        <div class="island-tabs" v-if="loginMode === 'login'">
          <button
            type="button"
            :class="{ active: loginTab === 'account' }"
            @click="loginTab = 'account'"
          >
            账号登录
          </button>
          <button
            type="button"
            :class="{ active: loginTab === 'scan' }"
            @click="loginTab = 'scan'; startQrLogin()"
          >
            扫码登录
          </button>
        </div>

        <div v-if="loginMode === 'login' && loginTab === 'account'" class="island-login__fields">
          <label class="island-field">
            <span>账号</span>
            <input v-model.trim="loginForm.account" type="text" placeholder="请输入账号 / 手机号 / 邮箱" @focus="loginFocus = 'account'" @blur="loginFocus = 'idle'" />
          </label>
          <label class="island-field">
            <span>密码</span>
            <input v-model.trim="loginForm.password" type="password" placeholder="请输入密码" @focus="loginFocus = 'password'" @blur="loginFocus = 'idle'" />
          </label>
          <div class="island-login__options">
            <button
              type="button"
              class="island-check"
              :class="{ active: loginForm.remember }"
              @click="loginForm.remember = !loginForm.remember"
            >
              <span></span>
              记住密码
            </button>
            <button type="button" class="island-link-button" @click="setLoginAction('reset')">忘记密码?</button>
          </div>
          <div class="island-server-connect">
            <label class="island-field">
              <span>后端服务地址</span>
              <input v-model.trim="serverOriginInput" type="text" placeholder="http://127.0.0.1:3123" @keyup.enter="saveServerOrigin" />
            </label>
            <button type="button" class="island-soft-button" @click="saveServerOrigin">连接</button>
            <small>{{ serverStatusText }}</small>
          </div>
        </div>

        <div v-else-if="loginMode === 'login' && loginTab === 'scan'" class="island-login__qr">
          <canvas v-if="qrImageSrc" ref="qrCanvas" width="200" height="200" class="island-qr-canvas"></canvas>
          <div v-else class="island-qr-loading">
            <span>加载中...</span>
          </div>
          <p v-if="!qrPolling">打开 Q信移动端扫码登录。</p>
          <p v-else>等待手机端确认...</p>
          <button v-if="qrImageSrc" type="button" class="island-link-button" @click="refreshQrCode">刷新二维码</button>
        </div>

        <div v-else-if="loginMode === 'register'" class="island-login__fields">
          <label class="island-field">
            <span>昵称</span>
            <input v-model.trim="registerForm.name" type="text" placeholder="给你的小岛身份取个名字" />
          </label>
          <label class="island-field">
            <span>账号</span>
            <input v-model.trim="registerForm.account" type="text" placeholder="请输入手机号 / 邮箱 / Q号" />
          </label>
          <label class="island-field">
            <span>密码</span>
            <input v-model.trim="registerForm.password" type="password" placeholder="设置登录密码" />
          </label>
          <label class="island-field">
            <span>确认密码</span>
            <input v-model.trim="registerForm.confirmPassword" type="password" placeholder="再次输入密码" />
          </label>
          <button
            type="button"
            class="island-check"
            :class="{ active: registerForm.agree }"
            @click="registerForm.agree = !registerForm.agree"
          >
            <span></span>
            我已阅读并同意用户协议          </button>
        </div>

        <div v-else-if="loginMode === 'reset'" class="island-login__fields">
          <label class="island-field">
            <span>账号</span>
            <input v-model.trim="resetForm.account" type="text" placeholder="请输入注册账号 / 手机号 / 邮箱" />
          </label>
          <label class="island-field">
            <span>验证码</span>
            <div class="island-field__with-action">
              <input v-model.trim="resetForm.code" type="text" placeholder="输入 6 位验证码" />
              <button type="button" @click="sendResetCode">
                {{ resetForm.codeSent ? "重新发送" : "发送验证码" }}
              </button>
            </div>
          </label>
          <label class="island-field">
            <span>新密码</span>
            <input v-model.trim="resetForm.password" type="password" placeholder="设置新的登录密码" />
          </label>
          <label class="island-field">
            <span>确认密码</span>
            <input v-model.trim="resetForm.confirmPassword" type="password" placeholder="再次输入新密码" />
          </label>
          <p class="island-login__support-text">
            这是本地模拟找回流程，验证码发送后可直接提交重置，并把账号回填到登录表单。
          </p>
        </div>

        <div v-else class="island-login__about-card">
          <img :src="assets.islandHero" alt="Q信小岛生活插画" />
          <div>
            <h3>Q信</h3>
            <p>一款绿色、轻量、温暖的桌面即时通讯工具，包含聊天、新闻中心、AI 助手与管理后台。</p>
          </div>
        </div>

        <button v-if="loginMode !== 'about'" type="submit" class="island-primary-button island-login__submit">
          {{ loginSubmitLabel }}
          <IslandSvgIcon name="send" />
        </button>
        <button v-else type="button" class="island-primary-button island-login__submit" @click="setLoginAction('login')">
          返回登录
          <IslandSvgIcon name="back" />
        </button>
        <p class="island-login__hint" v-if="loginMode === 'login'">
          还没有账号？<button type="button" @click="setLoginAction('register')">立即注册</button>
        </p>
        <p class="island-login__hint" v-else>
          已有账号？<button type="button" @click="setLoginAction('login')">返回登录</button>
        </p>
        <img class="island-login__mascot" :src="assets.loginMascot" alt="海岛动物角色" />
      </form>
    </section>

    <IslandLayout
      v-else
      :nav-items="visibleNavItems"
      :active-page="activePage"
      :user="user"
      :sidebar-scene="assets.sidebarScene"
      @navigate="navigate"
    >
      <section class="island-page" :class="'island-page--' + activePage">
        <header class="island-page__header" v-if="activePage !== 'chat' && activePage !== 'ai'">
          <div>
            <p class="island-eyebrow">{{ pageEyebrow }}</p>
            <h1>{{ pageTitle }}</h1>
            <span>{{ pageSubtitle }}</span>
          </div>
          <div class="island-page__tools">
            <button type="button" class="island-icon-button" aria-label="搜索" @click="handleHeaderTool('search')">
              <IslandSvgIcon name="search" />
            </button>
            <button type="button" class="island-icon-button" aria-label="成员" @click="handleHeaderTool('users')">
              <IslandSvgIcon name="users" />
            </button>
            <button type="button" class="island-icon-button" aria-label="通知" @click="handleHeaderTool('bell')">
              <IslandSvgIcon name="bell" />
            </button>
          </div>
        </header>

        <template v-if="activePage === 'chat'">
          <section class="island-split">
            <aside class="island-list-panel">
              <div class="island-search">
                <IslandSvgIcon name="search" />
                <input v-model.trim="sessionKeyword" type="text" placeholder="搜索会话或联系人" />
              </div>
              <div class="island-section-title">
                <span>最近会话</span>
                <button type="button">筛选</button>
              </div>
              <article
                v-for="session in filteredSessions"
                :key="session.id"
                role="button"
                tabindex="0"
                class="island-session-card"
                :class="{ active: selectedSessionId === session.id, 'island-session-card--muted': isUnconfirmedFriend(session), 'island-session-card--pending': friendStatus(session) === 'sent' || friendStatus(session) === 'received' }"
                @click="selectSession(session.id)"
                @keydown.enter.prevent="selectSession(session.id)"
              >
                <img :src="session.avatar" :alt="session.name + '头像'" />
                <span class="island-session-card__body">
                  <strong>{{ session.name }}</strong>
                  <small>{{ session.preview }}</small>
                </span>
                <span class="island-session-card__meta">
                  <time>{{ session.time }}</time>
                  <b v-if="session.unread">{{ session.unread }}</b>
                  <button
                    v-if="session.raw && session.raw.type === 'user' && !session.friend"
                    type="button"
                    class="island-add-friend"
                    :disabled="friendStatus(session) === 'sent'"
                    @click.stop="addFriend(session)"
                  >
                    {{ friendButtonLabel(session) }}
                  </button>
                </span>
              </article>
            </aside>

            <section class="island-chat-card">
              <div v-if="currentSession" class="island-chat-card__inner">
                <header class="island-chat-card__header">
                  <img :src="currentSession.avatar" :alt="currentSession.name + '头像'" />
                  <div>
                    <h1>{{ currentSession.name }}</h1>
                    <p>{{ currentSession.description }}</p>
                  </div>
                  <div class="island-chat-card__actions">
                    <button
                      v-if="currentSession.raw && currentSession.raw.type === 'user' && !currentSession.friend"
                      type="button"
                      class="island-soft-button"
                      :disabled="friendStatus(currentSession) === 'sent'"
                      @click="addFriend(currentSession)"
                    >
                      {{ friendButtonLabel(currentSession) }}
                    </button>
                    <button
                      v-if="currentSession.raw && currentSession.raw.type === 'user' && currentSession.friend"
                      type="button"
                      class="island-soft-button island-soft-button--danger"
                      @click="deleteFriend(currentSession)"
                    >
                      删除好友
                    </button>
                    <button type="button" class="island-icon-button"><IslandSvgIcon name="search" /></button>
                    <button type="button" class="island-icon-button"><IslandSvgIcon name="users" /></button>
                  </div>
                </header>

                <div class="island-message-list">
                  <article
                    v-for="message in currentMessages"
                    :key="message.id"
                    class="island-message"
                    :class="{ 'island-message--mine': message.mine }"
                  >
                    <img :src="message.avatar" :alt="message.author + '头像'" />
                    <div>
                      <p class="island-message__meta">{{ message.author }} <span>{{ message.time }}</span></p>
                      <div class="island-message__bubble">
                        <img v-if="settings.imagePreview && (message.type === 'image' || message.image)" class="island-message__image" :src="message.image || message.text" :alt="message.text" />
                        <a v-else-if="message.type === 'image' || message.image" class="island-message__file" :href="message.image || message.text" target="_blank" rel="noopener" download="qxin-image.png">
                          <IslandSvgIcon name="image" />
                          <span>图片预览已关闭，点击打开</span>
                        </a>
                        <a v-else-if="message.type === 'file'" class="island-message__file" :href="message.fileUrl || message.text" target="_blank" rel="noopener" :download="fileName(message.fileUrl || message.text)">
                          <IslandSvgIcon name="file" />
                          <span>{{ fileName(message.fileUrl || message.text) }}</span>
                        </a>
                        <span v-else class="island-emoji-text">
                          <template v-for="(part, partIndex) in emojiParts(message.text)">
                            <img
                              v-if="part.type === 'emoji'"
                              :key="message.id + '-emoji-' + partIndex"
                              class="island-emoji-img"
                              :src="part.src"
                              :alt="part.title"
                              :title="part.title"
                            />
                            <span v-else :key="message.id + '-text-' + partIndex">{{ part.text }}</span>
                          </template>
                        </span>
                      </div>
                    </div>
                  </article>
                </div>

                <footer class="island-composer">
                  <div class="island-composer__tools">
                    <button type="button" class="island-icon-button" @click.stop="toggleEmojiPanel" :disabled="isChatLocked || !settings.emojiRecommend">
                      <IslandSvgIcon name="about" />
                    </button>
                    <button type="button" class="island-icon-button" @click="triggerUpload('image')" :disabled="isChatLocked">
                      <IslandSvgIcon name="image" />
                    </button>
                    <button type="button" class="island-icon-button" @click="triggerUpload('file')" :disabled="isChatLocked">
                      <IslandSvgIcon name="plus" />
                    </button>
                    <input ref="chatImageInput" class="island-hidden-input" type="file" accept="image/png,image/jpg,image/jpeg" @change="handleChatFileChange($event, 'image')" />
                    <input ref="chatFileInput" class="island-hidden-input" type="file" accept=".txt,.pdf" @change="handleChatFileChange($event, 'file')" />
                    <span v-if="isUploadingChatFile" class="island-upload-progress">上传中{{ uploadProgress }}%</span>
                    <transition name="island-emoji-panel">
                      <div v-if="isEmojiPanelOpen" class="island-emoji-panel" @click.stop>
                        <div class="island-emoji-panel__head">
                          <strong>表情</strong>
                          <button type="button" @click="isEmojiPanelOpen = false">收起</button>
                        </div>
                        <div class="island-emoji-grid">
                          <button
                            v-for="item in emojiList"
                            :key="item.title"
                            type="button"
                            class="island-emoji-item"
                            :title="item.title"
                            @click="pickEmoji(item)"
                          >
                            <img :src="emojiBaseUrl + item.url" :alt="item.title" />
                          </button>
                        </div>
                      </div>
                    </transition>
                  </div>
                  <textarea
                    v-model="chatDraft"
                    rows="1"
                    :disabled="isChatLocked"
                    :placeholder="chatPlaceholder"
                    @keydown.enter.exact="handleChatEnter"
                    @keydown.enter.ctrl.exact.prevent="handleChatCtrlEnter"
                  ></textarea>
                  <button
                    type="button"
                    class="island-primary-button"
                    :disabled="isChatLocked"
                    @click="sendChatMessage()"
                  >
                    发送                     <IslandSvgIcon name="send" />
                  </button>
                </footer>
              </div>

              <div v-else class="island-empty-chat">
                <h1>开始聊天吧</h1>
                <p>选择一个会话，开启愉快的沟通之旅。</p>
                <img :src="assets.welcomeIsland" alt="小岛欢迎插画" />
                <div class="island-empty-chat__stats">
                  <button
                    v-for="stat in emptyChatStats"
                    :key="stat.key"
                    type="button"
                    class="island-empty-stat-card"
                    @click="handleEmptyChatStat(stat.key)"
                  >
                    <IslandSvgIcon :name="stat.icon" />
                    <strong>{{ stat.title }}</strong>
                    <span>{{ stat.text }}</span>
                  </button>
                </div>
                <div class="island-note-card">
                  <strong>小贴士</strong>
                  <p>使用 @ 提及好友，对方将收到提醒；长按消息可进行更多操作。</p>
                </div>
              </div>
            </section>
          </section>
        </template>

        <template v-else-if="activePage === 'news'">
          <section v-if="newsView === 'list'" class="island-news-shell">
            <aside class="island-news-aside">
              <div class="island-search">
                <IslandSvgIcon name="search" />
                <input ref="newsSearchInput" v-model.trim="newsKeyword" type="text" placeholder="搜索新闻、作者、话题" />
              </div>
              <button
                v-for="category in newsCategories"
                :key="category"
                type="button"
                class="island-category-row"
                :class="{ active: activeCategory === category }"
                @click="activeCategory = category"
              >
                <IslandSvgIcon name="news" />
                <span>{{ category }}</span>
              </button>
              <div class="island-topic-card">
                <h3>热门话题</h3>
                <ol>
                  <li v-for="topic in hotTopics" :key="topic.title">
                    <span>{{ topic.title }}</span>
                    <small>{{ topic.count }}</small>
                  </li>
                </ol>
              </div>
              <img :src="assets.seaStrip" alt="海面小船装饰" />
            </aside>

            <div class="island-news-main">
              <div class="island-news-hero">
                <div>
                  <span>校园焦点</span>
                  <h2>新学期，新起点，新征程</h2>
                  <p>一起开启属于我们的轻松岛屿生活。</p>
                  <button type="button" class="island-primary-button" @click="openArticle(featuredArticle.id)">
                    查看详情
                    <IslandSvgIcon name="send" />
                  </button>
                </div>
                <img :src="assets.newsHero" alt="生活新闻小岛插画" />
              </div>

              <div class="island-filter-tabs">
                <button
                  v-for="category in newsCategories"
                  :key="'tab-' + category"
                  type="button"
                  :class="{ active: activeCategory === category }"
                  @click="activeCategory = category"
                >
                  {{ category }}
                </button>
              </div>

              <div class="island-article-scroll">
                <div v-if="!filteredArticles.length" class="island-empty-result">
                  <strong>没有找到相关新闻</strong>
                  <span>换个关键词或分类试试</span>
                </div>
                <div class="island-article-grid">
                  <article
                    v-for="article in filteredArticles"
                    :key="article.id"
                    class="island-article-card"
                    @click="openArticle(article.id)"
                  >
                    <img :src="article.cover" :alt="article.title" />
                    <span>{{ article.category }}</span>
                    <h3>{{ article.title }}</h3>
                    <p>{{ article.summary }}</p>
                    <footer>
                      <img :src="article.authorAvatar" :alt="article.author + '头像'" />
                      <strong>{{ article.author }}</strong>
                      <time>{{ article.date }}</time>
                      <small>{{ article.views }} 阅读</small>
                    </footer>
                  </article>
                </div>
              </div>
            </div>
          </section>

          <section v-else class="island-detail-shell">
            <aside class="island-detail-list">
              <button type="button" class="island-back-button" @click="backToNews">
                <IslandSvgIcon name="back" />
                返回列表
              </button>
              <h3>最新动态</h3>
              <button
                v-for="article in articles.slice(0, 5)"
                :key="'side-' + article.id"
                type="button"
                class="island-detail-item"
                :class="{ active: currentArticle && currentArticle.id === article.id }"
                @click="openArticle(article.id)"
              >
                <img :src="article.authorAvatar" :alt="article.author + '头像'" />
                <span>
                  <strong>{{ article.title }}</strong>
                  <small>{{ article.author }} 路 {{ article.date }}</small>
                </span>
              </button>
              <img :src="assets.seaStrip" alt="海面装饰" />
            </aside>

            <article class="island-article-detail" v-if="currentArticle">
              <header>
                <h1>{{ currentArticle.title }}</h1>
                <div class="island-article-detail__meta">
                  <img :src="currentArticle.authorAvatar" :alt="currentArticle.author + '头像'" />
                  <span>{{ currentArticle.author }}</span>
                  <time>{{ currentArticle.date }} 10:30</time>
                  <small>{{ currentArticle.views }} 阅读</small>
                </div>
              </header>
              <img class="island-article-detail__cover" :src="assets.articleHero" :alt="currentArticle.title" />
              <p>在快节奏的生活中，我们常常忘记停下脚步，感受身边的美好。海岛生活不只是一种度假方式，也是一种生活态度。</p>
              <p>放慢脚步，你会发现幸福其实很简单。无论是独自旅行，还是与朋友相伴，海岛总能带给我们治愈与能量。</p>
              <div class="island-tags">
                <span v-for="tag in currentArticle.tags" :key="tag">{{ tag }}</span>
              </div>
              <div class="island-comment-composer">
                <img :src="user.avatar" alt="我的头像" />
                <input v-model.trim="commentDraft" type="text" placeholder="说点什么吧..." @keyup.enter="addComment" />
                <button type="button" class="island-primary-button" @click="addComment">发送</button>
              </div>
              <section class="island-comments">
                <header>
                  <h3>全部评论（{{ comments.length }}）</h3>
                  <button type="button">按时间</button>
                </header>
                <article v-for="comment in comments" :key="comment.id">
                  <img :src="comment.avatar" :alt="comment.author + '头像'" />
                  <div>
                    <strong>{{ comment.author }}</strong>
                    <time>{{ comment.time }}</time>
                    <p>{{ comment.text }}</p>
                  </div>
                </article>
              </section>
            </article>

            <aside class="island-related-panel">
              <h3>相关文章</h3>
              <div v-for="article in relatedArticles" :key="'related-' + article.id" class="island-related-item">
                <img :src="article.cover" :alt="article.title" />
                <span>
                  <strong>{{ article.title }}</strong>
                  <small>{{ article.views }} 阅读</small>
                </span>
              </div>
              <h3>附件下载</h3>
              <button type="button" class="island-attachment">海岛旅行清单.xlsx <IslandSvgIcon name="send" /></button>
              <button type="button" class="island-attachment">海岛景点地图.pdf <IslandSvgIcon name="send" /></button>
              <img :src="assets.loginMascot" alt="海岛动物装饰" />
            </aside>
          </section>
        </template>

        <template v-else-if="activePage === 'publish'">
          <section class="island-publish-shell">
            <form class="island-publish-form" @submit.prevent="publishArticle">
              <label class="island-field">
                <span>标题 *</span>
                <input v-model.trim="publishForm.title" maxlength="80" placeholder="请输入新闻标题（5-80个字）" />
              </label>
              <div class="island-form-row">
                <label class="island-field">
                  <span>标签</span>
                  <input v-model.trim="publishForm.tags" placeholder="输入标签后按回车添加，最多5个标签" />
                </label>
                <label class="island-field">
                  <span>分类 *</span>
                  <select v-model="publishForm.category">
                    <option v-for="category in newsCategories.slice(2)" :key="'publish-' + category" :value="category">{{ category }}</option>
                  </select>
                </label>
              </div>
              <label class="island-field">
                <span>摘要</span>
                <input v-model.trim="publishForm.summary" maxlength="200" placeholder="请输入新闻摘要（10-200个字）" />
              </label>
              <label class="island-field island-field--textarea">
                <span>正文内容 *</span>
                <div class="island-editor-toolbar">
                  <button type="button">撤销</button>
                  <button type="button">B</button>
                  <button type="button">I</button>
                  <button type="button">H1</button>
                  <button type="button">列表</button>
                  <button type="button">链接</button>
                  <button type="button">图片</button>
                </div>
                <textarea v-model.trim="publishForm.content" placeholder="请输入正文内容..."></textarea>
              </label>
              <div class="island-upload-card">
                <IslandSvgIcon name="plus" />
                <span>点击上传文件</span>
                <small>支持图片、文档、压缩包，单个文件不超过20MB</small>
              </div>
              <div class="island-publish-settings">
                <label><input type="radio" value="public" v-model="publishForm.visibility" /> 公开</label>
                <label><input type="radio" value="friends" v-model="publishForm.visibility" /> 仅好友可见</label>
                <label><input type="radio" value="private" v-model="publishForm.visibility" /> 仅自己可见</label>
              </div>
            </form>

            <aside class="island-publish-preview">
              <h3>预览效果</h3>
              <article class="island-article-card island-article-card--preview">
                <img :src="assets.publishPreview" alt="新闻封面预览" />
                <span>{{ publishForm.category }}</span>
                <h3>{{ publishForm.title || '这是新闻标题的预览效果' }}</h3>
                <p>{{ publishForm.summary || '这里是新闻摘要的预览区域，将显示发布后的摘要内容。' }}</p>
                <footer>
                  <img :src="user.avatar" alt="我的头像" />
                  <strong>{{ user.name }}</strong>
                  <time>2025.12.30</time>
                </footer>
              </article>
              <div class="island-note-card">
                <strong>小贴士</strong>
                <p>标题简洁有吸引力，封面建议使用高清图片，发布前请仔细检查内容。</p>
              </div>
              <div class="island-publish-actions">
                <button type="button" class="island-soft-button" @click="pulse('草稿已保存')">存为草稿</button>
                <button type="button" class="island-soft-button" @click="pulse('预览已刷新')">预览</button>
                <button type="button" class="island-primary-button" @click="publishArticle">
                  发布
                  <IslandSvgIcon name="send" />
                </button>
              </div>
            </aside>
          </section>
        </template>

        <template v-else-if="activePage === 'ai'">
          <section class="island-ai-shell">
            <aside class="island-list-panel island-ai-list">
              <div class="island-search">
                <IslandSvgIcon name="search" />
                <input v-model.trim="aiKeyword" type="text" placeholder="搜索会话或联系人" />
              </div>
              <div class="island-section-title">
                <span>最近会话</span>
                <button type="button" @click="newAiThread">
                  <IslandSvgIcon name="plus" />
                </button>
              </div>
              <div
                v-for="thread in filteredAiThreads"
                :key="thread.id"
                role="button"
                tabindex="0"
                class="island-session-card"
                :class="{ active: activeAiThreadId === thread.id }"
                @click="selectAiThread(thread.id)"
                @keydown.enter.prevent="selectAiThread(thread.id)"
                @keydown.space.prevent="selectAiThread(thread.id)"
              >
                <img :src="assets.aiRobot" :alt="thread.title" />
                <span class="island-session-card__body">
                  <strong>{{ thread.title }}</strong>
                  <small>{{ thread.model }}</small>
                </span>
                <span class="island-session-card__meta">
                  <time>{{ thread.time }}</time>
                  <b v-if="thread.badge">{{ thread.badge }}</b>
                  <button type="button" class="island-session-card__delete" title="删除会话" @click.stop="deleteAiThread(thread.id)">
                    <IslandSvgIcon name="trash" />
                  </button>
                </span>
              </div>
              <button type="button" class="island-new-chat-button" @click="newAiThread">
                <IslandSvgIcon name="plus" />
                新建对话
              </button>
            </aside>

            <section class="island-ai-main">
              <header class="island-ai-header">
                <img :src="assets.aiRobot" alt="AI 机器人头像" />
                <div>
                  <h1>AI 助手</h1>
                  <p>智能对话 · {{ aiModel }}</p>
                </div>
                <div class="island-ai-header__actions">
                  <div
                    class="island-ai-model-select"
                    :class="{ open: aiModelMenuOpen === 'header' }"
                    @focusout="closeAiModelMenuOnBlur"
                  >
                    <button
                      type="button"
                      class="island-ai-model-select__button"
                      aria-haspopup="listbox"
                      :aria-expanded="aiModelMenuOpen === 'header' ? 'true' : 'false'"
                      @click.stop="toggleAiModelMenu('header')"
                    >
                      <span>切换模型</span>
                      <strong>{{ aiModel }}</strong>
                      <i aria-hidden="true"></i>
                    </button>
                    <div class="island-ai-model-select__menu" role="listbox">
                      <button
                        v-for="model in aiModelOptions"
                        :key="'header-' + model"
                        type="button"
                        role="option"
                        :aria-selected="aiModel === model ? 'true' : 'false'"
                        :class="{ active: aiModel === model }"
                        @click.stop="selectAiModel(model)"
                      >
                        {{ model }}
                      </button>
                    </div>
                  </div>
                  <button type="button" class="island-soft-button" @click="openAiConfig">
                    <IslandSvgIcon name="setting" />
                    设置
                  </button>
                  <button type="button" class="island-icon-button" @click="pulse('更多 AI 操作已展开')">
                    <IslandSvgIcon name="plus" />
                  </button>
                </div>
              </header>

              <div v-if="aiMessages.length === 0" class="island-ai-welcome">
                <img :src="assets.aiRobot" alt="AI 助手插画" />
                <div>
                  <h2>你好呀！我是你的 AI 助手～</h2>
                  <p>我可以帮你答疑解惑、总结整理、创意写作、内容生成，让我们一起探索更多可能吧！</p>
                </div>
              </div>

              <div class="island-ai-prompts">
                <button
                  v-for="prompt in aiPrompts"
                  :key="prompt"
                  type="button"
                  @click="askAi(prompt)"
                >
                  {{ prompt }}
                </button>
              </div>

              <h2 class="island-ai-tools-title">快捷工具</h2>
              <div class="island-ai-tools">
                <article v-for="tool in aiTools" :key="tool.title" @click="askAi(tool.prompt)">
                  <IslandSvgIcon :name="tool.icon" />
                  <span>
                    <strong>{{ tool.title }}</strong>
                    <small>{{ tool.desc }}</small>
                  </span>
                </article>
              </div>

              <div class="island-ai-messages" v-if="aiMessages.length">
                <article
                  v-for="message in aiMessages"
                  :key="message.id"
                  :class="{ mine: message.role === 'user' }"
                >
                  <img :src="message.role === 'user' ? user.avatar : assets.aiRobot" :alt="message.role === 'user' ? '我的头像' : 'AI 头像'" />
                  <div class="island-ai-message-card">
                    <p>{{ message.text }}</p>
                    <section v-if="message.articleDraft" class="island-ai-draft-card">
                      <strong>{{ message.articleDraft.title }}</strong>
                      <small>{{ message.articleDraft.summary }}</small>
                      <div>
                        <button type="button" class="island-soft-button" @click="useAiArticleDraft(message.articleDraft, false)">填入发布页</button>
                        <button type="button" class="island-primary-button" @click="useAiArticleDraft(message.articleDraft, true)">
                          发布到新闻中心
                          <IslandSvgIcon name="send" />
                        </button>
                      </div>
                    </section>
                  </div>
                </article>
              </div>

              <footer class="island-composer island-ai-composer">
                <div class="island-ai-attachments" v-if="aiAttachments.length">
                  <span v-for="file in aiAttachments" :key="file.id">
                    <IslandSvgIcon :name="file.type === 'image' ? 'image' : 'file'" />
                    {{ file.name }}
                    <button type="button" @click="removeAiAttachment(file.id)">×</button>
                  </span>
                </div>
                <textarea
                  v-model.trim="aiDraft"
                  rows="1"
                  placeholder="说点什么吧...（Enter 发送，Shift+Enter 换行）"
                  @keydown.enter.exact.prevent="sendAiMessage"
                ></textarea>
                <div class="island-composer__tools">
                  <button type="button" class="island-icon-button" @click="toggleEmojiPanel">
                    <IslandSvgIcon name="about" />
                  </button>
                  <button type="button" class="island-icon-button" @click="triggerAiUpload('image')">
                    <IslandSvgIcon name="image" />
                  </button>
                  <button type="button" class="island-icon-button" @click="triggerAiUpload('file')">
                    <IslandSvgIcon name="file" />
                  </button>
                  <button type="button" class="island-icon-button" @click="askAi('请帮我优化这段内容，让它更清晰、更有感染力')">
                    <IslandSvgIcon name="ai" />
                  </button>
                </div>
                <div
                  class="island-ai-model-select island-ai-model-select--compact"
                  :class="{ open: aiModelMenuOpen === 'composer' }"
                  @focusout="closeAiModelMenuOnBlur"
                >
                  <button
                    type="button"
                    class="island-ai-model-select__button"
                    aria-haspopup="listbox"
                    :aria-expanded="aiModelMenuOpen === 'composer' ? 'true' : 'false'"
                    @click.stop="toggleAiModelMenu('composer')"
                  >
                    <span>模型</span>
                    <strong>{{ aiModel }}</strong>
                    <i aria-hidden="true"></i>
                  </button>
                  <div class="island-ai-model-select__menu" role="listbox">
                    <button
                      v-for="model in aiModelOptions"
                      :key="'composer-' + model"
                      type="button"
                      role="option"
                      :aria-selected="aiModel === model ? 'true' : 'false'"
                      :class="{ active: aiModel === model }"
                      @click.stop="selectAiModel(model)"
                    >
                      {{ model }}
                    </button>
                  </div>
                </div>
                <span v-if="isUploadingAiFile" class="island-upload-progress">上传中{{ aiUploadProgress }}%</span>
                <button type="button" class="island-primary-button" @click="sendAiMessage">
                  发送
                  <IslandSvgIcon name="send" />
                </button>
                <transition name="island-emoji-panel">
                  <div v-if="isEmojiPanelOpen" class="island-emoji-panel" @click.stop>
                    <div class="island-emoji-panel__head">
                      <strong>选择表情</strong>
                      <button type="button" @click="isEmojiPanelOpen = false">关闭</button>
                    </div>
                    <div class="island-emoji-grid">
                      <button
                        v-for="item in emojiList"
                        :key="'ai-' + item.title"
                        type="button"
                        class="island-emoji-item"
                        @click="pickAiEmoji(item)"
                      >
                        <img :src="emojiBaseUrl + item.url" :alt="item.title" />
                      </button>
                    </div>
                  </div>
                </transition>
                <input ref="aiImageInput" class="island-hidden-input" type="file" accept=".png,.jpg,.jpeg,.gif,image/png,image/jpeg,image/jpg,image/gif" @change="handleAiFileChange($event, 'image')" />
                <input ref="aiFileInput" class="island-hidden-input" type="file" accept=".txt,.pdf,text/plain,application/pdf" @change="handleAiFileChange($event, 'file')" />
              </footer>

              <div v-if="aiConfigOpen" class="island-modal-backdrop" @click.self="aiConfigOpen = false">
                <section class="island-ai-config">
                  <header>
                    <h2>AI API 配置</h2>
                    <button type="button" @click="aiConfigOpen = false">×</button>
                  </header>
                  <label>
                    <span>启用外部 API</span>
                    <input type="checkbox" v-model="aiConfig.enabled" />
                  </label>
                  <label>
                    <span>服务商</span>
                    <select v-model="aiConfig.provider">
                      <option value="deepseek">DeepSeek</option>
                      <option value="openai">OpenAI</option>
                      <option value="custom">自定义</option>
                    </select>
                  </label>
                  <label>
                    <span>模型</span>
                    <input v-model.trim="aiConfig.model" type="text" placeholder="例如 deepseek-v4-flash / gpt-4.1" />
                  </label>
                  <label>
                    <span>接口地址</span>
                    <input v-model.trim="aiConfig.endpoint" type="text" placeholder="https://api.deepseek.com" />
                  </label>
                  <label>
                    <span>API Key</span>
                    <input v-model.trim="aiConfig.apiKey" type="password" :placeholder="aiConfig.hasApiKey ? '已保存，留空则不修改' : '请输入 API Key'" />
                  </label>
                  <footer>
                    <button type="button" class="island-soft-button" @click="loadAiConfig(false)">重置</button>
                    <button type="button" class="island-primary-button" @click="saveAiConfig">保存配置</button>
                  </footer>
                </section>
              </div>
            </section>
          </section>
        </template>

        <template v-else-if="activePage === 'admin'">
          <section class="island-admin">
            <div class="island-admin__stats">
              <article v-for="stat in adminStats" :key="stat.label" class="island-stat-card">
                <IslandSvgIcon :name="stat.icon" />
                <span>{{ stat.label }}</span>
                <strong>{{ adminReady ? stat.value : 0 }}</strong>
                <small>{{ stat.note }}</small>
              </article>
            </div>

            <div class="island-admin__grid">
              <section class="island-admin-card island-admin-card--wide">
                <header>
                  <h2>文章管理</h2>
                  <div class="island-search island-search--small">
                    <IslandSvgIcon name="search" />
                    <input v-model.trim="adminKeyword" type="text" placeholder="搜索文章标题 / 作者" />
                  </div>
                  <button type="button" class="island-soft-button" @click="loadAdminData(true)">刷新</button>
                  <button type="button" class="island-primary-button" @click="navigate('publish')">
                    新建文章
                  </button>
                </header>
                <table>
                  <thead>
                    <tr>
                      <th>标题</th>
                      <th>作者</th>
                      <th>分类</th>
                      <th>状态</th>
                      <th>浏览量</th>
                      <th>发布时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in filteredAdminRows" :key="row.id || row.title">
                      <td>{{ row.title }}</td>
                      <td>{{ row.author }}</td>
                      <td>{{ row.category }}</td>
                      <td><span class="island-status-pill">{{ row.status }}</span></td>
                      <td>{{ row.views }}</td>
                      <td>{{ row.date }}</td>
                      <td>
                        <button type="button" @click="editAdminArticle(row)">编辑</button>
                        <button type="button" @click="removeAdminArticle(row)">删除</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section class="island-admin-card">
                <header><h2>分类管理</h2></header>
                <button v-for="category in adminCategories" :key="category.name" type="button" class="island-admin-list-row" @click="activeCategory = category.name; navigate('news')">
                  <span>{{ category.name }}</span>
                  <strong>{{ category.count }}</strong>
                </button>
              </section>

              <section class="island-admin-card">
                <header>
                  <h2>用户增长趋势</h2>
                  <span class="island-chart-meta">近 12 天 · {{ adminGrowthTotal }} 人</span>
                </header>
                <div v-if="userGrowthBars.length" class="island-line-chart island-line-chart--users">
                  <button
                    v-for="point in userGrowthBars"
                    :key="point.date"
                    type="button"
                    :title="point.date + ' 新增 ' + point.newUsers + ' 人，累计 ' + point.totalUsers + ' 人'"
                  >
                    <span :style="{ height: point.height + '%' }">
                      <i>{{ point.newUsers ? '+' + point.newUsers : '0' }}</i>
                    </span>
                    <small>{{ point.label }}</small>
                  </button>
                </div>
                <p v-else class="island-chart-empty">暂无用户增长数据</p>
              </section>

              <section class="island-admin-card">
                <header><h2>内容数据概览</h2></header>
                <div class="island-overview">
                  <div class="island-overview__hero">
                    <div class="island-donut">
                      <strong>{{ adminOverviewTotal }}</strong>
                      <span>文章总数</span>
                    </div>
                    <div class="island-overview__metrics">
                      <article v-for="item in adminOverviewCards" :key="item.label">
                        <span>{{ item.label }}</span>
                        <strong>{{ item.value }}</strong>
                        <small>{{ item.note }}</small>
                      </article>
                    </div>
                  </div>
                  <div class="island-overview__section">
                    <h3>分类占比</h3>
                    <button
                      v-for="item in adminCategoryBreakdown"
                      :key="item.name"
                      type="button"
                      class="island-overview-row"
                      @click="activeCategory = item.name; navigate('news')"
                    >
                      <span>{{ item.name }}</span>
                      <em><i :style="{ width: item.percent + '%' }"></i></em>
                      <strong>{{ item.count }}</strong>
                    </button>
                  </div>
                  <div class="island-overview__section">
                    <h3>热门内容</h3>
                    <button
                      v-for="item in adminTopArticles"
                      :key="item.id || item.title"
                      type="button"
                      class="island-overview-article"
                      @click="openArticleFromAdmin(item)"
                    >
                      <span>{{ item.title }}</span>
                      <small>{{ item.category }} · {{ item.views }} 次浏览</small>
                    </button>
                  </div>
                </div>
              </section>

              <section class="island-admin-card">
                <header><h2>审核日志</h2></header>
                <div v-for="log in auditLogs" :key="log.text" class="island-audit-row">
                  <img :src="log.avatar" :alt="log.user + '头像'" />
                  <span>{{ log.user }} {{ log.text }}</span>
                  <time>{{ log.time }}</time>
                </div>
                <img class="island-admin__mascot" :src="assets.adminMascot" alt="管理员小岛角色" />
              </section>
            </div>
          </section>

          <div v-if="showDeleteConfirm" class="island-modal-overlay" @click.self="showDeleteConfirm = false; deleteTarget = null">
            <div class="island-modal-card island-delete-dialog">
              <img class="island-delete-dialog__scene" :src="assets.adminMascot" alt="" aria-hidden="true" />
              <span class="island-delete-dialog__icon">
                <IslandSvgIcon name="trash" />
              </span>
              <div class="island-delete-dialog__body">
                <small>内容管理</small>
                <h2>确认删除这篇文章？</h2>
                <p>《<strong>{{ deleteTarget && deleteTarget.title || '未命名' }}</strong>》将从新闻中心和管理列表中移除。</p>
                <p class="island-delete-dialog__warning">删除后无法恢复，请确认这不是仍需保留的内容。</p>
              </div>
              <div class="island-modal-actions island-delete-dialog__actions">
                <button type="button" class="island-soft-button" @click="showDeleteConfirm = false; deleteTarget = null">取消</button>
                <button type="button" class="island-primary-button island-primary-button--danger" @click="confirmDeleteArticle">确认删除</button>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="activePage === 'setting'">
          <section class="island-settings island-settings--reference">
            <article class="island-settings-card island-profile-card">
              <h2>我的资料</h2>
              <div class="island-profile-card__body">
                <span class="island-profile-card__avatar">
                  <img :src="user.avatar" alt="我的头像" />
                  <button type="button" aria-label="编辑头像" @click="runSettingAction('profile')">
                    <IslandSvgIcon name="publish" />
                  </button>
                </span>
                <div>
                  <h3>{{ user.name }}</h3>
                  <p>让每一天都充满绿意与希望</p>
                </div>
              </div>
              <dl>
                <div><dt>账号</dt><dd>{{ user.name }}</dd></div>
                <div><dt>Q号</dt><dd>10001</dd></div>
                <div><dt>状态</dt><dd>在线</dd></div>
              </dl>
            </article>

            <article class="island-settings-card">
              <h2>外观</h2>
              <div class="island-theme-choice">
                <button type="button" :class="{ active: settings.theme === 'fresh' }" @click="setAppearance('theme', 'fresh')"><span></span>清新绿</button>
                <button type="button" :class="{ active: settings.theme === 'light' }" @click="setAppearance('theme', 'light')"><span></span>浅色</button>
                <button type="button" :class="{ active: settings.theme === 'dark' }" @click="setAppearance('theme', 'dark')"><span></span>深色</button>
              </div>
              <div class="island-font-size">
                <span>字体大小</span>
                <button type="button" :class="{ active: settings.fontSize === 'small' }" @click="setAppearance('fontSize', 'small')">小</button>
                <button type="button" :class="{ active: settings.fontSize === 'medium' }" @click="setAppearance('fontSize', 'medium')">标准</button>
                <button type="button" :class="{ active: settings.fontSize === 'large' }" @click="setAppearance('fontSize', 'large')">大</button>
              </div>
              <label class="island-field">
                <span>语言</span>
                <select v-model="settings.language" @change="setAppearance('language', settings.language)">
                  <option>简体中文</option>
                  <option>English</option>
                </select>
              </label>
            </article>

            <article class="island-settings-card">
              <h2>通知设置</h2>
              <button
                v-for="item in notificationItems"
                :key="item.key"
                type="button"
                class="island-toggle-row"
                @click="toggleNotification(item.key)"
              >
                <span>
                  <strong>{{ item.label }}</strong>
                  <small>{{ item.desc }}</small>
                </span>
                <i :class="{ active: settings[item.key] }"></i>
              </button>
              <img :src="assets.settingsMascot" alt="设置页海岛角色" />
            </article>

            <article class="island-settings-card">
              <h2>消息设置</h2>
              <label class="island-settings-line">发送消息快捷键
                <select v-model="settings.sendShortcut" @change="setMessageSetting('sendShortcut', settings.sendShortcut)">
                  <option value="enter">Enter 发送，Shift+Enter 换行</option>
                  <option value="ctrlEnter">Ctrl+Enter 发送，Enter 换行</option>
                </select>
              </label>
              <label class="island-settings-line">消息记录
                <select v-model="settings.historyDays" @change="setMessageSetting('historyDays', settings.historyDays)">
                  <option value="7">保留最近 7 天</option>
                  <option value="30">保留最近 30 天</option>
                  <option value="90">保留最近 90 天</option>
                  <option value="forever">永久保留</option>
                </select>
              </label>
              <button type="button" class="island-toggle-row" @click="toggleMessageSetting('autoDownload')">
                <span><strong>自动下载文件</strong><small>开启后自动下载接收的文件</small></span>
                <i :class="{ active: settings.autoDownload }"></i>
              </button>
              <button type="button" class="island-toggle-row" @click="toggleMessageSetting('imagePreview')">
                <span><strong>图片预览</strong><small>在聊天窗口中预览图片</small></span>
                <i :class="{ active: settings.imagePreview }"></i>
              </button>
              <button type="button" class="island-toggle-row" @click="toggleMessageSetting('emojiRecommend')">
                <span><strong>表情推荐</strong><small>输入时推荐相关表情</small></span>
                <i :class="{ active: settings.emojiRecommend }"></i>
              </button>
            </article>

            <article class="island-settings-card">
              <h2>隐私与安全</h2>
              <label class="island-settings-line">谁可以看我的资料
                <select v-model="settings.profileVisible" @change="persistSettings">
                  <option>所有人</option>
                  <option>仅好友</option>
                  <option>仅自己</option>
                </select>
              </label>
              <button type="button" class="island-toggle-row" @click="settings.friendVerify = !settings.friendVerify; persistSettings()">
                <span><strong>加我为好友验证</strong><small>{{ settings.friendVerify ? '需要验证' : '允许直接添加' }}</small></span>
                <i :class="{ active: settings.friendVerify }"></i>
              </button>
              <button type="button" class="island-settings-line" @click="runSettingAction('block')">屏蔽列表 <span>{{ settings.blockedCount }} 人</span></button>
              <button type="button" class="island-settings-line" @click="runSettingAction('devices')">登录设备管理 <span>{{ settings.deviceCount }} 台设备</span></button>
              <button type="button" class="island-settings-line" @click="runSettingAction('security')">账号安全中心 <span>修改密码、手机绑定等</span></button>
            </article>

            <article class="island-settings-card">
              <h2>数据与存储</h2>
              <button type="button" class="island-settings-line" @click="runSettingAction('cache')">缓存管理 <span>已使用 {{ settings.cacheUsed }} MB</span></button>
              <button type="button" class="island-settings-line" @click="runSettingAction('backup')">聊天记录迁移 <span>备份与恢复聊天记录</span></button>
              <button type="button" class="island-settings-line" @click="runSettingAction('files')">文件管理 <span>管理接收的文件</span></button>
              <div class="island-settings-line island-storage-summary">存储空间 <span>{{ settingsStorageLabel }}</span></div>
              <div class="island-storage-bar"><span :style="{ width: settingsStoragePercent }"></span></div>
              <button type="button" class="island-primary-button" @click="clearSettingsCache">立即清理</button>
            </article>
            <article class="island-settings-card island-db-card">
              <h2>数据库配置 <small>管理后端服务的数据库连接信息</small></h2>
              <div class="island-db-grid">
                <div class="island-db-item">
                  <IslandSvgIcon name="news" />
                  <strong>MySQL 数据库</strong>
                  <span v-if="testingDb" class="island-db-testing">测试中...</span>
                  <span v-else-if="dbTestResult.mysql !== null" :class="dbTestResult.mysql ? 'island-db-ok' : 'island-db-fail'">
                    {{ dbTestResult.mysql ? '✅ 已连接 (' + dbTestResult.mysqlLatency + 'ms)' : '❌ 连接失败' }}
                  </span>
                  <span v-else>{{ aboutInfo && aboutInfo.mysql && aboutInfo.mysql.ready ? '已连接' : '待确认' }}</span>
                  <p v-if="dbTestResult.mysqlError" class="island-db-error">{{ dbTestResult.mysqlError }}</p>
                  <p>地址 {{ dbSummary.mysql }}</p>
                  <button type="button" class="island-soft-button" :disabled="testingDb" @click="testDbConnection">
                    {{ testingDb ? '测试中...' : '测试连接' }}
                  </button>
                </div>
                <div class="island-db-item">
                  <IslandSvgIcon name="admin" />
                  <strong>Redis 缓存</strong>
                  <span v-if="testingDb" class="island-db-testing">测试中...</span>
                  <span v-else-if="dbTestResult.redis !== null" :class="dbTestResult.redis ? 'island-db-ok' : 'island-db-fail'">
                    {{ dbTestResult.redis ? '✅ 已连接 (' + dbTestResult.redisLatency + 'ms)' : '⚠ 未启用' }}
                  </span>
                  <span v-else>{{ aboutInfo && aboutInfo.redis && aboutInfo.redis.ready ? '已连接' : '待确认' }}</span>
                  <p v-if="dbTestResult.redisError" class="island-db-error">{{ dbTestResult.redisError }}</p>
                  <p>地址 {{ dbSummary.redis }}</p>
                  <button type="button" class="island-soft-button" :disabled="testingDb" @click="testDbConnection">
                    {{ testingDb ? '测试中...' : '测试连接' }}
                  </button>
                </div>
              </div>
            </article>
          </section>

          <!-- Profile Edit Dialog -->
          <div v-if="showProfileEditor" class="island-modal-overlay" @click.self="showProfileEditor = false">
            <div class="island-modal-card">
              <h2>编辑资料</h2>
              <label class="island-field"><span>昵称</span><input v-model="profileForm.name" placeholder="你的昵称" /></label>
              <label class="island-field"><span>头像地址</span><input v-model="profileForm.avatarUrl" placeholder="头像图片URL" /></label>
              <label class="island-field"><span>个性签名</span><input v-model="profileForm.signature" placeholder="让每一天都充满绿意与希望" /></label>
              <div class="island-modal-actions">
                <button type="button" class="island-soft-button" @click="showProfileEditor = false">取消</button>
                <button type="button" class="island-primary-button" @click="saveProfile">保存</button>
              </div>
            </div>
          </div>

          <!-- Password Change Dialog -->
          <div v-if="showPasswordDialog" class="island-modal-overlay" @click.self="showPasswordDialog = false">
            <div class="island-modal-card">
              <h2>修改密码</h2>
              <label class="island-field"><span>旧密码</span><input v-model="passwordForm.oldPwd" type="password" placeholder="输入旧密码" /></label>
              <label class="island-field"><span>新密码</span><input v-model="passwordForm.newPwd" type="password" placeholder="输入新密码" /></label>
              <label class="island-field"><span>确认密码</span><input v-model="passwordForm.confirmPwd" type="password" placeholder="再次输入新密码" /></label>
              <div class="island-modal-actions">
                <button type="button" class="island-soft-button" @click="showPasswordDialog = false">取消</button>
                <button type="button" class="island-primary-button" @click="changePassword">确认修改</button>
              </div>
            </div>
          </div>

          <!-- Block List Dialog -->
          <div v-if="showBlockList" class="island-modal-overlay" @click.self="showBlockList = false">
            <div class="island-modal-card">
              <h2>屏蔽列表 <small>({{ settings.blockedCount }} 人)</small></h2>
              <p v-if="settings.blockedCount === 0" style="color:var(--island-muted);text-align:center;padding:20px">暂无被屏蔽的联系人</p>
              <div v-else class="island-modal-list">
                <div v-for="user in blockedUsers" :key="user.id" class="island-modal-row">
                  <span>{{ user.name || user.username }}</span>
                  <button type="button" class="island-soft-button" @click="unblockUser(user)">解除</button>
                </div>
              </div>
              <div class="island-modal-actions">
                <button type="button" class="island-primary-button" @click="showBlockList = false">关闭</button>
              </div>
            </div>
          </div>

          <!-- Device Management Dialog -->
          <div v-if="showDevicesPanel" class="island-modal-overlay" @click.self="showDevicesPanel = false">
            <div class="island-modal-card">
              <h2>登录设备管理 <small>({{ loginDevices.length || settings.deviceCount }} 台设备)</small></h2>
              <div class="island-modal-list">
                <div v-for="(dev, i) in loginDevices" :key="i" class="island-modal-row">
                  <span><strong>{{ dev.name || dev.deviceType || '设备' }}</strong><small style="margin-left:8px">{{ dev.ip }}</small></span>
                  <span style="color:var(--island-muted);font-size:13px">{{ dev.time | friendlyTime }}</span>
                </div>
                <p v-if="!loginDevices.length" style="color:var(--island-muted);text-align:center;padding:20px">当前在线设备信息将在登录后显示</p>
              </div>
              <div class="island-modal-actions">
                <button type="button" class="island-primary-button" @click="showDevicesPanel = false">关闭</button>
              </div>
            </div>
          </div>

          <!-- Cache Management Dialog -->
          <div v-if="showCachePanel" class="island-modal-overlay" @click.self="showCachePanel = false">
            <div class="island-modal-card">
              <h2>缓存管理</h2>
              <div style="text-align:center;padding:16px">
                <p>本地缓存 <strong>{{ settings.cacheUsed }} MB</strong></p>
                <p style="color:var(--island-muted)">聊天图片、表情、头像等缓存文件</p>
                <div style="margin:12px 0;background:var(--island-line);border-radius:8px;height:8px">
                  <div :style="{ width: Math.min(settings.cacheUsed / 10 * 100, 100) + '%', background: 'var(--island-green-500)', height: '100%', borderRadius: '8px' }"></div>
                </div>
              </div>
              <div class="island-modal-actions">
                <button type="button" class="island-soft-button" @click="showCachePanel = false">取消</button>
                <button type="button" class="island-primary-button" @click="clearSettingsCache(); showCachePanel = false">立即清理</button>
              </div>
            </div>
          </div>

          <!-- Backup Dialog -->
          <div v-if="showBackupPanel" class="island-modal-overlay" @click.self="showBackupPanel = false">
            <div class="island-modal-card">
              <h2>聊天记录迁移</h2>
              <p style="color:var(--island-muted);text-align:center;padding:8px">将聊天记录导出为 JSON 文件，便于备份和恢复</p>
              <div class="island-modal-actions">
                <button type="button" class="island-soft-button" @click="showBackupPanel = false">取消</button>
                <button type="button" class="island-soft-button" @click="triggerMessageRestore">导入备份</button>
                <button type="button" class="island-primary-button" @click="exportMessages(); showBackupPanel = false">导出聊天记录</button>
              </div>
              <input ref="messageBackupInput" class="island-hidden-input" type="file" accept="application/json,.json" @change="restoreMessagesFromFile" />
            </div>
          </div>

          <!-- File Management Dialog -->
          <div v-if="showFilesPanel" class="island-modal-overlay" @click.self="showFilesPanel = false">
            <div class="island-modal-card">
              <h2>文件管理</h2>
              <p v-if="!uploadedFiles.length" style="color:var(--island-muted);text-align:center;padding:20px">暂无接收的文件</p>
              <div v-else class="island-modal-list">
                <div v-for="(file, i) in uploadedFiles" :key="i" class="island-modal-row">
                  <span>{{ file.name || file.filename }}</span>
                  <span style="color:var(--island-muted);font-size:13px">{{ file.sizeLabel || (file.size ? (file.size / 1024).toFixed(1) + ' KB' : '') }}</span>
                  <button type="button" class="island-soft-button" @click="openStoredFile(file)">打开</button>
                </div>
              </div>
              <div class="island-modal-actions">
                <button type="button" class="island-soft-button" @click="refreshUploadedFiles">刷新</button>
                <button type="button" class="island-primary-button" @click="showFilesPanel = false">关闭</button>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="activePage === 'about'">
          <section class="island-about">
            <img class="island-about__scene" :src="assets.islandHero" alt="" aria-hidden="true" />
            <div class="island-about__grid">
              <article class="island-about-card">
                <h2>应用信息</h2>
                <div class="island-about-card__media">
                  <img :src="user.avatar" alt="Q信头像" />
                  <div>
                    <h3>Q信 <span>v{{ aboutInfo && aboutInfo.version ? aboutInfo.version : '1.0.0' }}</span></h3>
                    <p>Build {{ aboutInfo && aboutInfo.build ? aboutInfo.build : '2025.12.30' }}</p>
                  </div>
                </div>
                <p>专为效率与沟通而生，界面清爽，功能丰富，让团队协作与好友交流更加轻松愉快。</p>
              </article>

              <article class="island-about-card">
                <h2>项目介绍</h2>
                <p>Q信是一款面向所有人的即时通讯工具，支持单聊、群聊、文件传输、表情互动等丰富扩展功能。</p>
                <p>项目致力于打造一个简单、稳定、安全且可持续发展的沟通平台，连接每一个重要的瞬间。</p>
              </article>

              <article class="island-about-card">
                <h2>作者信息</h2>
                <div class="island-about-card__media">
                  <img :src="avatars.tealBoy" alt="作者头像" />
                  <div>
                    <h3>开发者：今明</h3>
                    <p>邮箱：tenz_z@foxmail.com</p>
                    <p>地址：中国 · 广州</p>
                  </div>
                </div>
              </article>

              <article class="island-about-card">
                <h2>项目仓库</h2>
                <div class="island-about-card__media">
                  <svg height="48" width="48" viewBox="0 0 16 16" version="1.1" aria-hidden="true" style="border-radius:0;"><path fill="#1F2328" d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.46-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path></svg>
                  <div>
                    <h3 style="margin-bottom: 2px">GitHub</h3>
                    <p style="font-size:12px; margin: 0;">https://github.com/Tanz-coding/mychat.git</p>
                  </div>
                </div>
                <p>欢迎 Star ⭐ 与贡献代码！</p>
              </article>

              <article class="island-about-card island-features-card">
                <h2>功能特色</h2>
                <ul>
                  <li><i class="island-feature-dot"></i><div><strong>清新界面</strong><span>精心打磨的界面设计，带来愉悦的使用体验。</span></div></li>
                  <li><i class="island-feature-dot"></i><div><strong>高效沟通</strong><span>支持单聊、群聊、表情、文件等消息类型。</span></div></li>
                  <li><i class="island-feature-dot"></i><div><strong>安全可靠</strong><span>本地加密存储，最大限度保护你的隐私数据安全。</span></div></li>
                  <li><i class="island-feature-dot"></i><div><strong>持续生长</strong><span>功能持续迭代，社区驱动开发，越用越好用。</span></div></li>
                </ul>
              </article>

              <article class="island-about-card">
                <h2>更新日志</h2>
                <ol class="island-timeline">
                  <li v-for="item in changelog" :key="item.version">
                    <strong>{{ item.version }}</strong>
                    <span>{{ item.date }}</span>
                    <p>{{ item.text }}</p>
                  </li>
                </ol>
              </article>

              <article class="island-about-card island-about-card--thanks">
                <h2>感谢</h2>
                <p>感谢所有为 Q信 提供建议和支持的朋友们，<br />因为你们，这个小工具才会越来越温暖。</p>
                <img :src="assets.picnicFriends" alt="小动物野餐插画" />
              </article>
            </div>
          </section>
        </template>
      </section>

      <transition name="island-toast">
        <div v-if="toast" class="island-toast">{{ toast }}</div>
      </transition>
    </IslandLayout>
  </div>
</template>

<script>
import IslandLayout from "./IslandLayout.vue";
import IslandSvgIcon from "./island-ui/IslandSvgIcon.vue";
import { Manager } from "socket.io-client";
import QRCode from "qrcode";
import { expressions } from "./emoji";
import { EMOJI_BASE_URL } from "./config";
import { createComment, createNews, deleteNews, fetchAuditLogs, fetchNewsList, fetchStats, updateNews } from "../services/newsApi";
import {
  acceptFriend as acceptFriendApi,
  askAssistant,
  deleteFriend as deleteFriendApi,
  fetchAbout,
  fetchAiConfig,
  fetchFriends,
  fetchSettings,
  registerAccount as registerAccountApi,
  requestFriend as requestFriendApi,
  saveAiConfig as saveAiConfigApi,
  saveSettings,
  uploadIslandFile
} from "../services/islandApi";

import islandHero from "../assets/images/island-ui/island-hero.png";
import welcomeIsland from "../assets/images/island-ui/welcome-island.png";
import aiRobot from "../assets/images/island-ui/ai-robot.png";
import loginMascot from "../assets/images/island-ui/login-mascot.png";
import picnicFriends from "../assets/images/island-ui/picnic-friends.png";
import settingsMascot from "../assets/images/island-ui/settings-mascot.png";
import adminMascot from "../assets/images/island-ui/admin-mascot.png";
import newsHero from "../assets/images/island-ui/news-hero-scene.png";
import articleHero from "../assets/images/island-ui/article-hero.png";
import publishPreview from "../assets/images/island-ui/publish-preview.png";
import seaStrip from "../assets/images/island-ui/sea-strip.png";
import sidebarScene from "../assets/images/island-ui/sidebar-island.png";

import coverCampus from "../assets/images/news-covers/campus-start.png";
import coverClub from "../assets/images/news-covers/club-recruit.png";
import coverLibrary from "../assets/images/news-covers/library-books.png";
import coverLab from "../assets/images/news-covers/lab-breakthrough.png";
import coverVolunteer from "../assets/images/news-covers/volunteer-day.png";
import coverAlumni from "../assets/images/news-covers/alumni-story.png";

export default {
  name: "IslandApp",
  components: {
    IslandLayout,
    IslandSvgIcon
  },
  data() {
    const avatarBase = (process.env.BASE_URL || "") + "static/img/avatar/";
    const avatarGroup = avatarBase + "group-icon.png";
    const avatarBoy = avatarBase + "20180414165754.jpg";
    const avatarGirl = avatarBase + "20180414170003.jpg";
    const avatarTealBoy = avatarBase + "20180414165815.jpg";
    const avatarElder = avatarBase + "20180414165936.jpg";
    const avatarBlueGirl = avatarBase + "20180414165955.jpg";
    let socketURL = "";
    if (typeof window !== "undefined") {
      if (window._HOST) {
        socketURL = window._HOST;
      } else if (window.location && (window.location.port === "8080" || window.location.hostname === "localhost")) {
        socketURL = "http://127.0.0.1:3000";
      } else {
        socketURL = window.location.origin;
      }
    }
    const assets = {
      islandHero,
      welcomeIsland,
      aiRobot,
      loginMascot,
      picnicFriends,
      settingsMascot,
      adminMascot,
      newsHero,
      articleHero,
      publishPreview,
      seaStrip,
      sidebarScene
    };
    const avatars = {
      group: avatarGroup,
      boy: avatarBoy,
      girl: avatarGirl,
      tealBoy: avatarTealBoy,
      elder: avatarElder,
      blueGirl: avatarBlueGirl
    };

    return {
      assets,
      avatars,
      isLoggedIn: false,
      socket: null,
      isConnect: false,
      socketConnecting: false,
      socketURL,
      serverOriginInput: socketURL,
      serverStatusText: "正在连接内置后端...",
      token: "",
      loginUserRaw: null,
      isAdmin: false,
      pendingLoginPayload: null,
      loginMode: "login",
      loginTab: "account",
      qrSessionId: "",
      qrPollTimer: null,
      qrPolling: false,
      qrImageSrc: "",
      loginFocus: "idle",
      loginMouse: { x: 0, y: 0 },
      loginError: false,
      loginForm: { account: "", password: "", remember: true },
      registerForm: { name: "", account: "", password: "", confirmPassword: "", agree: true },
      resetForm: { account: "", code: "", password: "", confirmPassword: "", codeSent: false },
      user: { name: "island_user", role: "online", avatar: avatarGirl },
      activePage: "chat",
      toast: "",
      navItems: [
        { key: "chat", label: "会话", icon: "chat" },
        { key: "news", label: "新闻中心", icon: "news" },
        { key: "publish", label: "发布", icon: "publish" },
        { key: "ai", label: "AI 助手", icon: "ai" },
        { key: "admin", label: "管理后台", icon: "admin" },
        { key: "setting", label: "设置", icon: "setting" },
        { key: "about", label: "关于", icon: "about" }
      ],
      loginActions: [
        { key: "login", label: "登录", icon: "chat" },
        { key: "register", label: "注册", icon: "publish" },
        { key: "reset", label: "找回密码", icon: "setting" },
        { key: "about", label: "关于", icon: "about" }
      ],
      sessionKeyword: "",
      selectedSessionId: "",
      chatDraft: "",
      friendIds: {},
      friendRequests: {},
      uploadProgress: 0,
      isUploadingChatFile: false,
      isEmojiPanelOpen: false,
      emojiList: expressions,
      emojiBaseUrl: EMOJI_BASE_URL,
      onlineUsers: [],
      sessions: [
        {
          id: "group_001",
          name: "群聊天室",
          description: "一起享受小岛的每一天",
          avatar: avatarGroup,
          preview: "群聊消息实时同步",
          time: "online",
          unread: 0,
          friend: true,
          raw: { id: "group_001", name: "群聊天室", avatarUrl: avatarGroup, type: "group" }
        }
      ],
      messages: { group_001: [] },
      newsKeyword: "",
      newsView: "list",
      currentArticleId: 1,
      activeCategory: "全部",
      newsCategories: ["全部", "推荐", "社区动态", "活动聚会", "科技趋势", "生活指南", "人物故事", "通知公告"],
      hotTopics: [
        { title: "岛屿生活进行时", count: 3286 },
        { title: "周末活动报名", count: 2154 },
        { title: "秋日随手拍", count: 1897 }
      ],
      articles: [
        {
          id: 1,
          title: "Q信岛屿社区开启全新生活季",
          category: "社区动态",
          summary: "轻松的海风、热闹的会话与新鲜资讯，一起记录更美好的每一天。",
          author: "小岛编辑部",
          authorAvatar: avatarBoy,
          date: "2025.09.10",
          views: 3256,
          cover: coverCampus,
          tags: ["社区生活", "新鲜事", "岛屿"]
        },
        {
          id: 2,
          title: "周末海边市集与兴趣活动开放报名",
          category: "活动聚会",
          summary: "加入你感兴趣的活动，遇见志同道合的朋友。",
          author: "活动助手",
          authorAvatar: avatarTealBoy,
          date: "2025.09.09",
          views: 2891,
          cover: coverClub,
          tags: ["活动", "聚会", "报名"]
        }
      ],
      commentDraft: "",
      comments: [],
      publishForm: { title: "", tags: "", category: "社区动态", summary: "", content: "", visibility: "public" },
      editingArticleId: null,
      aiKeyword: "",
      aiModel: "DeepSeek",
      activeAiThreadId: "welcome",
      aiDraft: "",
      aiMessages: [],
      aiAttachments: [],
      isUploadingAiFile: false,
      aiUploadProgress: 0,
      aiModelOptions: ["DeepSeek", "OpenAI", "Q信生活助手"],
      aiModelMenuOpen: "",
      aiConfigOpen: false,
      aiConfig: {
        enabled: false,
        provider: "deepseek",
        model: "deepseek-v4-flash",
        endpoint: "https://api.deepseek.com",
        apiKey: "",
        hasApiKey: false
      },
      aiThreads: [],
      aiHistory: {},
      aiPrompts: [
        "帮我总结这篇文档的要点",
        "写一份活动策划方案",
        "推荐 5 本提升效率的书",
        "生成一段社交媒体宣传文案"
      ],
      aiTools: [
        { title: "总结提炼", desc: "快速提炼要点，生成摘要", icon: "news", prompt: "请帮我总结以下内容的重点，并生成一版摘要" },
        { title: "内容推荐", desc: "根据需求，智能推荐内容", icon: "about", prompt: "请根据我的需求推荐一组可执行内容方向" },
        { title: "文章生成", desc: "多种风格，一键生成文章", icon: "publish", prompt: "请帮我生成一篇结构清晰、语气自然的文章草稿" },
        { title: "创意灵感", desc: "激发灵感，拓展思路", icon: "ai", prompt: "请给我 10 个新颖但可落地的创意灵感" }
      ],
      adminReady: false,
      adminLoading: false,
      showDeleteConfirm: false,
      deleteTarget: null,
      adminKeyword: "",
      adminStats: [
        { label: "文章总数", value: "0", note: "等待数据库统计", icon: "news" },
        { label: "创作者数", value: "0", note: "等待数据库统计", icon: "users" },
        { label: "分类数", value: "0", note: "等待数据库统计", icon: "about" },
        { label: "系统状态", value: "待确认", note: "等待接口返回", icon: "setting" }
      ],
      adminRows: [],
      adminCategories: [],
      userGrowth: [],
      auditLogs: [],
      settings: {
        language: "简体中文",
        theme: "fresh",
        fontSize: "medium",
        messageNotice: true,
        soundNotice: true,
        desktopNotice: true,
        groupNotice: true,
        specialCare: true,
        messageNotify: true,
        newsNotify: true,
        aiNotify: false,
        enterToSend: true,
        sendShortcut: "enter",
        historyDays: "30",
        autoDownload: false,
        imagePreview: true,
        emojiRecommend: true,
        profileVisible: "所有人",
        friendVerify: true,
        blockedCount: 0,
        deviceCount: 3,
        cacheUsed: 256,
        storageUsed: 1.2,
        storageLimit: 5
      },
      settingsSaving: false,
      // Setting dialogs state
      showProfileEditor: false,
      profileForm: { name: "", avatarUrl: "", signature: "" },
      showPasswordDialog: false,
      passwordForm: { oldPwd: "", newPwd: "", confirmPwd: "" },
      showBlockList: false,
      showDevicesPanel: false,
      showCachePanel: false,
      showBackupPanel: false,
      showFilesPanel: false,
      blockedUsers: [],
      loginDevices: [],
      uploadedFiles: [],
      lastBackupAt: "",
      testingDb: false,
      dbTestResult: { mysql: null, mysqlError: "", mysqlLatency: 0, redis: null, redisError: "", redisLatency: 0 },
      aboutInfo: null,
      notificationItems: [
        { key: "messageNotice", label: "消息通知", desc: "接收新消息提醒" },
        { key: "soundNotice", label: "声音提醒", desc: "收到消息时播放提示音" },
        { key: "desktopNotice", label: "桌面通知", desc: "在桌面右下角显示通知" },
        { key: "groupNotice", label: "群消息提醒", desc: "接收群聊消息提醒" },
        { key: "specialCare", label: "特别关注", desc: "优先提醒重要联系人" }
      ],
      changelog: [
        { version: "v1.0.0", date: "2025.12.30", text: "接入数据库登录、好友与新闻能力。" },
        { version: "v0.9.0", date: "2025.12.16", text: "新增岛屿风格界面与表情面板。" }
      ]
    };
  },
  computed: {
    visibleNavItems() {
      if (this.isAdmin) {
        return this.navItems;
      }
      return this.navItems.filter(function(item) {
        return item.key !== "admin";
      });
    },
    pageTitle() {
      const map = {
        news: "新闻中心",
        publish: "发布新闻",
        admin: "管理员后台",
        setting: "设置",
        about: "关于 Q信"
      };
      return map[this.activePage] || "Q信";
    },
    pageSubtitle() {
      const map = {
        news: "发现新鲜事，记录美好每一天",
        publish: "编辑并发布一条新闻，与大家分享新鲜事",
        admin: "欢迎回来，管理员",
        setting: "管理偏好、通知、隐私与数据存储",
        about: "一款轻量、绿色、温暖的桌面即时通讯工具"
      };
      return map[this.activePage] || "";
    },
    pageEyebrow() {
      const map = {
        news: "岛屿新闻",
        publish: "内容创作",
        admin: "系统管理",
        setting: "个人偏好",
        about: "Q信"
      };
      return map[this.activePage] || "Q信";
    },
    loginModeTitle() {
      const map = {
        login: "账号登录",
        register: "注册账号",
        reset: "找回密码",
        about: "关于 Q信"
      };
      return map[this.loginMode] || map.login;
    },
    loginModeSubtitle() {
      const map = {
        login: "一起享受小岛的每一天",
        register: "创建属于你的海岛身份",
        reset: "安全找回你的 Q信账号",
        about: "轻量、绿色、温暖的桌面通讯工具"
      };
      return map[this.loginMode] || map.login;
    },
    loginSubmitLabel() {
      const map = {
        login: "登录",
        register: "完成注册",
        reset: "重置密码"
      };
      return map[this.loginMode] || map.login;
    },
    loginCharacterStyle() {
      const x = Math.max(-15, Math.min(15, this.loginMouse.x));
      const y = Math.max(-10, Math.min(10, this.loginMouse.y));
      return {
        "--login-face-x": x + "px",
        "--login-face-y": y + "px",
        "--login-skew": Math.max(-6, Math.min(6, -x / 2.4)) + "deg",
        "--login-pupil-x": Math.max(-5, Math.min(5, x / 3)) + "px",
        "--login-pupil-y": Math.max(-5, Math.min(5, y / 2.5)) + "px"
      };
    },
    filteredSessions() {
      const keyword = this.sessionKeyword.toLowerCase();
      return this.sessions.filter(function(session) {
        return !keyword || session.name.toLowerCase().indexOf(keyword) !== -1 || session.preview.toLowerCase().indexOf(keyword) !== -1;
      });
    },
    currentSession() {
      const id = this.selectedSessionId;
      return this.sessions.find(function(session) {
        return session.id === id;
      });
    },
    currentMessages() {
      return this.messages[this.selectedSessionId] || [];
    },
    unreadTotal() {
      return this.sessions.reduce(function(total, session) {
        return total + (Number(session.unread) || 0);
      }, 0);
    },
    mentionMessages() {
      const names = [this.user && this.user.name, this.loginUserRaw && this.loginUserRaw.username, this.loginUserRaw && this.loginUserRaw.name, "我"]
        .filter(Boolean)
        .map(function(name) {
          return "@" + String(name);
        });
      const result = [];
      Object.keys(this.messages || {}).forEach((sessionId) => {
        (this.messages[sessionId] || []).forEach(function(message) {
          const text = String(message.text || "");
          if (!message.mine && names.some(function(name) { return text.indexOf(name) !== -1; })) {
            result.push({ sessionId, message });
          }
        });
      });
      return result;
    },
    favoriteMessages() {
      const result = [];
      Object.keys(this.messages || {}).forEach((sessionId) => {
        (this.messages[sessionId] || []).forEach(function(message) {
          if (message.favorite || message.starred || message.collected || message.isFavorite) {
            result.push({ sessionId, message });
          }
        });
      });
      return result;
    },
    emptyChatStats() {
      return [
        { key: "unread", icon: "chat", title: "未读消息", text: `${this.unreadTotal} 条未读` },
        { key: "mentions", icon: "users", title: "提到我的", text: `${this.mentionMessages.length} 条消息` },
        { key: "favorites", icon: "about", title: "收藏消息", text: `${this.favoriteMessages.length} 条收藏` }
      ];
    },
    isChatLocked() {
      return Boolean(this.currentSession && this.currentSession.raw && this.currentSession.raw.type === "user" && !this.currentSession.friend);
    },
    lockedChatPlaceholder() {
      if (!this.currentSession) {
        return "请选择会话";
      }
      const status = this.friendStatus(this.currentSession);
      if (status === "sent") {
        return "好友申请中，等待对方通过";
      }
      if (status === "received") {
        return "先接受好友申请，再开始聊天";
      }
      return "添加好友后即可开始聊天";
    },
    chatPlaceholder() {
      if (this.isChatLocked) {
        return this.lockedChatPlaceholder;
      }
      if (this.settings.sendShortcut === "ctrlEnter") {
        return "说点什么吧...（Ctrl+Enter 发送，Enter 换行）";
      }
      return "说点什么吧...（Enter 发送，Shift+Enter 换行）";
    },
    filteredArticles() {
      const keyword = this.newsKeyword.toLowerCase();
      const category = this.activeCategory;
      return this.articles.filter(function(article) {
        const matchesCategory = category === "全部" || category === "推荐" || article.category === category;
        const haystack = [article.title, article.summary, article.author, article.category].join(" ").toLowerCase();
        return matchesCategory && (!keyword || haystack.indexOf(keyword) !== -1);
      });
    },
    featuredArticle() {
      return this.articles[0];
    },
    currentArticle() {
      if (!this.featuredArticle) {
        return null;
      }
      const id = this.currentArticleId || this.featuredArticle.id;
      return this.articles.find(function(article) {
        return article.id === id;
      });
    },
    relatedArticles() {
      const currentId = this.currentArticle ? this.currentArticle.id : 0;
      return this.articles.filter(function(article) {
        return article.id !== currentId;
      }).slice(0, 4);
    },
    filteredAiThreads() {
      const keyword = this.aiKeyword.toLowerCase();
      return this.aiThreads.filter(function(thread) {
        return !keyword || thread.title.toLowerCase().indexOf(keyword) !== -1 || thread.model.toLowerCase().indexOf(keyword) !== -1;
      });
    },
    filteredAdminRows() {
      const keyword = this.adminKeyword.toLowerCase();
      return this.adminRows.filter(function(row) {
        const haystack = [row.title, row.author, row.category, row.status].join(" ").toLowerCase();
        return !keyword || haystack.indexOf(keyword) !== -1;
      });
    },
    adminOverviewTotal() {
      const totalStat = this.adminStats.find(function(item) {
        return item.label === "文章总数";
      });
      return this.adminReady && totalStat ? totalStat.value : String(this.adminRows.length || this.articles.length || 0);
    },
    adminOverviewCards() {
      const total = this.adminRows.length || this.articles.length || 0;
      const published = this.adminRows.filter(function(row) {
        return row.rawStatus === "published" || row.status === "已发布";
      }).length;
      const draft = this.adminRows.filter(function(row) {
        return row.rawStatus === "draft" || row.status === "草稿";
      }).length;
      const views = this.adminRows.reduce(function(sum, row) {
        return sum + (Number(row.views) || 0);
      }, 0);
      const topCategory = this.adminCategories.slice().sort(function(a, b) {
        return Number(b.count || 0) - Number(a.count || 0);
      })[0];
      return [
        { label: "已发布", value: String(published || total), note: "可在新闻中心阅读" },
        { label: "草稿", value: String(draft), note: "待完善内容" },
        { label: "总浏览", value: String(views), note: "来自新闻指标" },
        { label: "热门分类", value: topCategory ? topCategory.name : "暂无", note: topCategory ? `${topCategory.count} 篇内容` : "等待数据" }
      ];
    },
    adminCategoryBreakdown() {
      const rows = this.adminCategories.filter(function(item) {
        return item.name !== "全部" && item.name !== "推荐";
      });
      const total = rows.reduce(function(sum, item) {
        return sum + (Number(item.count) || 0);
      }, 0);
      return rows
        .slice()
        .sort(function(a, b) {
          return Number(b.count || 0) - Number(a.count || 0);
        })
        .slice(0, 5)
        .map(function(item) {
          const count = Number(item.count) || 0;
          return {
            name: item.name,
            count,
            percent: total ? Math.max(8, Math.round((count / total) * 100)) : 8
          };
        });
    },
    adminTopArticles() {
      return this.adminRows
        .slice()
        .sort(function(a, b) {
          return (Number(b.views) || 0) - (Number(a.views) || 0);
        })
        .slice(0, 3);
    },
    userGrowthBars() {
      const rows = Array.isArray(this.userGrowth) ? this.userGrowth : [];
      if (!rows.length) {
        return [];
      }
      const maxTotal = Math.max.apply(null, rows.map(function(item) {
        return Number(item.totalUsers || item.newUsers || 0);
      }).concat([1]));
      return rows.map(function(item) {
        const totalUsers = Number(item.totalUsers || 0);
        const newUsers = Number(item.newUsers || 0);
        return {
          date: item.date || item.label,
          label: item.label || item.date,
          newUsers,
          totalUsers,
          height: Math.max(12, Math.round((Math.max(totalUsers, newUsers) / maxTotal) * 100))
        };
      });
    },
    adminGrowthTotal() {
      const bars = this.userGrowthBars;
      if (!bars.length) {
        return "0";
      }
      return String(bars[bars.length - 1].totalUsers || 0);
    },
    dbSummary() {
      const mysql = this.aboutInfo && this.aboutInfo.mysql ? this.aboutInfo.mysql : {};
      const redis = this.aboutInfo && this.aboutInfo.redis ? this.aboutInfo.redis : {};
      return {
        mysql: mysql.host ? `${mysql.host}:${mysql.port || 3306}` : "由 db/config.json 管理",
        redis: redis.host ? `${redis.host}:${redis.port || 6379}` : "由 db/config.json 管理"
      };
    },
    settingsStorageLabel() {
      const used = Number(this.settings.storageUsed || 0);
      const limit = Number(this.settings.storageLimit || 5);
      return `已使用 ${used} GB / 共 ${limit} GB`;
    },
    settingsStoragePercent() {
      const used = Number(this.settings.storageUsed || 0);
      const limit = Number(this.settings.storageLimit || 5);
      if (!limit) {
        return "0%";
      }
      return Math.min(100, Math.round((used / limit) * 100)) + "%";
    }
  },
  mounted() {
    this.refreshServerOrigin();
    if (window.electron && typeof window.electron.onServerStatus === "function") {
      this.removeServerStatusListener = window.electron.onServerStatus((payload) => {
        if (payload && payload.message) {
          this.serverStatusText = payload.message;
          this.pulse(payload.message);
        }
      });
    }
    this.loadAiThreads();
    this.loadSettings();
    window.setTimeout(() => {
      this.adminReady = true;
    }, 300);
  },
  beforeDestroy() {
    if (typeof this.removeServerStatusListener === "function") {
      this.removeServerStatusListener();
    }
    this.stopQrPolling();
    if (this.socket) {
      this.socket.close();
    }
  },
  methods: {
    normalizeServerOrigin(origin) {
      const raw = String(origin || "").trim().replace(/\/+$/, "");
      if (!raw) {
        return "http://127.0.0.1:3123";
      }
      return /^https?:\/\//i.test(raw) ? raw : "http://" + raw;
    },
    applyServerOrigin(origin, message) {
      const normalized = this.normalizeServerOrigin(origin);
      this.socketURL = normalized;
      this.serverOriginInput = normalized;
      if (this.$axios && this.$axios.defaults) {
        this.$axios.defaults.baseURL = normalized;
      }
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      this.isConnect = false;
      this.socketConnecting = false;
      if (message) {
        this.serverStatusText = message;
      }
      return normalized;
    },
    refreshServerOrigin() {
      if (window.electron && typeof window.electron.getServerOrigin === "function") {
        window.electron.getServerOrigin()
          .then((payload) => {
            const origin = payload && payload.origin ? payload.origin : this.socketURL;
            this.applyServerOrigin(origin, "已准备连接 " + this.normalizeServerOrigin(origin));
          })
          .catch(() => {
            this.applyServerOrigin(this.socketURL, "请确认后端服务地址");
          });
      } else {
        this.applyServerOrigin(this.socketURL || window.location.origin, "已连接当前网页服务");
      }
    },
    saveServerOrigin() {
      const origin = this.normalizeServerOrigin(this.serverOriginInput);
      if (window.electron && typeof window.electron.setServerOrigin === "function") {
        window.electron.setServerOrigin(origin)
          .then((payload) => {
            const nextOrigin = payload && payload.origin ? payload.origin : origin;
            this.applyServerOrigin(nextOrigin, "已切换到 " + nextOrigin);
            this.pulse("后端地址已更新，请重新登录");
          })
          .catch((error) => {
            this.serverStatusText = error && error.message ? error.message : "后端地址保存失败";
          });
        return;
      }
      this.applyServerOrigin(origin, "已切换到 " + origin);
    },
    setLoginAction(mode) {
      this.loginMode = mode;
      if (mode !== "login") {
        this.loginTab = "account";
        this.stopQrPolling();
      }
      if (mode === "reset" && !this.resetForm.account) {
        this.resetForm.account = this.loginForm.account;
      }
    },
    submitLoginAction() {
      if (this.loginMode === "register") {
        this.registerAccount();
        return;
      }
      if (this.loginMode === "reset") {
        this.resetPassword();
        return;
      }
      this.login();
    },
    handleLoginMouseMove(event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2.2;
      this.loginMouse = {
        x: (event.clientX - cx) / 18,
        y: (event.clientY - cy) / 22
      };
    },
    triggerLoginError() {
      this.loginError = false;
      window.clearTimeout(this.loginErrorTimer);
      this.$nextTick(() => {
        this.loginError = true;
        this.loginErrorTimer = window.setTimeout(() => {
          this.loginError = false;
        }, 2500);
      });
    },
    login() {
      if (this.loginTab === "scan") {
        this.startQrLogin();
        return;
      }
      if (this.loginTab === "account" && (!this.loginForm.account || !this.loginForm.password)) {
        this.pulse("请输入账号和密码");
        this.triggerLoginError();
        return;
      }
      const loginPayload = {
        name: this.loginForm.account,
        username: this.loginForm.account,
        password: this.loginForm.password,
        avatarUrl: this.user.avatar
      };
      this.pendingLoginPayload = loginPayload;
      if (this.socket && this.isConnect) {
        this.socketConnecting = true;
        this.socket.emit("login", loginPayload);
        this.pulse("正在连接后端登录...");
      } else if (this.socket) {
        this.socketConnecting = true;
        this.socket.connect();
        this.pulse("正在连接后端登录...");
      } else {
        this.initSocket();
        this.pulse("正在连接后端登录...");
      }
    },
    async startQrLogin() {
      this.stopQrPolling();
      this.qrImageSrc = "";
      try {
        const res = await fetch("/api/auth/qr/generate");
        if (!res.ok) throw new Error("生成二维码失败");
        const data = await res.json();
        this.qrSessionId = data.sessionId;
        // Generate QR code as data URL
        const qrContent = JSON.stringify({
          action: "qr_login",
          sessionId: data.sessionId,
          host: data.host
        });
        this.qrImageSrc = await QRCode.toDataURL(qrContent, { width: 200, margin: 1 });
        this.$nextTick(() => {
          if (this.$refs.qrCanvas && this.qrImageSrc) {
            const img = new Image();
            img.onload = () => {
              const ctx = this.$refs.qrCanvas.getContext("2d");
              if (ctx) {
                ctx.clearRect(0, 0, 200, 200);
                ctx.drawImage(img, 0, 0, 200, 200);
              }
            };
            img.src = this.qrImageSrc;
          }
        });
        this.qrPolling = true;
        this.pollQrStatus();
      } catch (err) {
        this.pulse("生成二维码失败：" + (err.message || "网络错误"));
        this.qrPolling = false;
      }
    },
    pollQrStatus() {
      if (!this.qrSessionId || !this.qrPolling) return;
      this.qrPollTimer = window.setTimeout(async () => {
        if (!this.qrPolling || !this.qrSessionId) return;
        try {
          const res = await fetch(`/api/auth/qr/status/${this.qrSessionId}`);
          const data = await res.json();
          if (data.status === "confirmed") {
            this.stopQrPolling();
            this.pulse("扫码成功！正在登录...");
            // Auto-login with the returned token
            if (data.token && data.user) {
              this.token = data.token;
              this.loginUserRaw = data.user;
              this.user.name = data.user.username || data.user.name;
              this.user.role = data.user.role || "online";
              this.user.avatar = data.user.avatarUrl || this.user.avatar;
              this.isLoggedIn = true;
              this.isAdmin = data.user.role === "admin";
              // Init socket with the new token
              this.initSocket();
              this.pulse("扫码登录成功！");
            } else {
              this.pulse("确认成功，请手动登录");
            }
          } else if (data.status === "expired") {
            this.stopQrPolling();
            this.pulse("二维码已过期，请刷新");
          } else {
            // Keep desktop login confirmation responsive after the phone approves it.
            this.pollQrStatus();
          }
        } catch (err) {
          this.pollQrStatus(); // Retry on error
        }
      }, 600);
    },
    stopQrPolling() {
      this.qrPolling = false;
      if (this.qrPollTimer) {
        window.clearTimeout(this.qrPollTimer);
        this.qrPollTimer = null;
      }
    },
    refreshQrCode() {
      this.startQrLogin();
    },
    async registerAccount() {
      if (!this.registerForm.name || !this.registerForm.account || !this.registerForm.password) {
        this.pulse("请补全昵称、账号和密码");
        return;
      }
      if (this.registerForm.password !== this.registerForm.confirmPassword) {
        this.pulse("两次输入的密码不一致");
        return;
      }
      if (!this.registerForm.agree) {
        this.pulse("请先同意用户协议");
        return;
      }
      try {
        const payload = await registerAccountApi({
          username: this.registerForm.account,
          password: this.registerForm.password,
          avatarUrl: this.user.avatar
        });
        this.user = {
          name: payload.user && payload.user.username ? payload.user.username : this.registerForm.account,
          role: "在线",
          avatar: payload.user && payload.user.avatarUrl ? payload.user.avatarUrl : this.user.avatar
        };
        this.loginForm.account = this.registerForm.account;
        this.loginForm.password = this.registerForm.password;
        this.setLoginAction("login");
        this.pulse("注册成功，可以登录了");
      } catch (error) {
        this.triggerLoginError();
        this.pulse(error.message || "注册失败，请稍后重试");
      }
    },
    sendResetCode() {
      if (!this.resetForm.account) {
        this.pulse("请先输入需要找回的账号");
        return;
      }
      this.resetForm.codeSent = true;
      this.resetForm.code = "246810";
      this.pulse("验证码已发送，请查收");
    },
    resetPassword() {
      if (!this.resetForm.account || !this.resetForm.code || !this.resetForm.password) {
        this.pulse("请补全账号、验证码和新密码");
        return;
      }
      if (!this.resetForm.codeSent) {
        this.pulse("请先发送验证码");
        return;
      }
      if (this.resetForm.password !== this.resetForm.confirmPassword) {
        this.pulse("两次输入的新密码不一致");
        return;
      }
      this.loginForm.account = this.resetForm.account;
      this.loginForm.password = this.resetForm.password;
      this.resetForm.password = "";
      this.resetForm.confirmPassword = "";
      this.setLoginAction("login");
      this.pulse("密码已重置，请重新登录");
    },
    navigate(page) {
      if (page === "admin" && !this.isAdmin) {
        this.pulse("只有管理员账号可以使用管理后台");
        this.activePage = "chat";
        return;
      }
      this.activePage = page;
      if (page === "news") {
        this.newsView = "list";
      }
      if (page === "admin") {
        this.adminReady = false;
        this.loadAdminData();
        window.setTimeout(() => {
          this.adminReady = true;
        }, 80);
      }
      if (page === "setting") {
        this.loadSettings();
      }
      if (page === "ai") {
        this.loadAiConfig(true);
      }
      if (page === "about") {
        this.loadAboutInfo();
      }
    },
    handleHeaderTool(type) {
      if (type === "search") {
        if (this.activePage === "news" && this.$refs.newsSearchInput) {
          this.newsView = "list";
          this.$nextTick(() => this.$refs.newsSearchInput && this.$refs.newsSearchInput.focus());
          this.pulse("可以搜索新闻标题、作者和话题");
          return;
        }
        if (this.activePage === "admin") {
          this.adminKeyword = "";
          this.pulse("已重置后台搜索");
          return;
        }
        this.pulse("当前页面暂无独立搜索");
        return;
      }
      if (type === "users") {
        if (this.isAdmin) {
          this.navigate("admin");
        } else {
          this.pulse("当前在线用户：" + this.onlineUsers.length + " 人");
        }
        return;
      }
      if (type === "bell") {
        this.settings.messageNotice = !this.settings.messageNotice;
        this.persistSettings();
        this.pulse(this.settings.messageNotice ? "消息通知已开启" : "消息通知已关闭");
      }
    },
    friendStatus(session) {
      if (!session || !session.raw || session.raw.type !== "user") {
        return "accepted";
      }
      if (session.friend || this.friendIds[session.id]) {
        return "accepted";
      }
      return this.friendRequests[session.id] || "none";
    },
    isUnconfirmedFriend(session) {
      return Boolean(session && session.raw && session.raw.type === "user" && !session.friend);
    },
    friendButtonLabel(session) {
      const status = this.friendStatus(session);
      if (status === "sent") {
        return "申请中";
      }
      if (status === "received") {
        return "接受";
      }
      return "加好友";
    },
    selectSession(id) {
      const session = this.sessions.find(function(item) {
        return item.id === id;
      });
      if (session) {
        if (session.raw && session.raw.type === "user" && !session.friend) {
          const status = this.friendStatus(session);
          if (status === "sent") {
            this.pulse("好友申请中，等待对方通过");
          } else if (status === "received") {
            this.pulse("请先接受好友申请，再开始私聊");
          } else {
            this.pulse("请先添加好友，再开始私聊");
          }
          return;
        }
        this.selectedSessionId = id;
        session.unread = 0;
      }
    },
    handleEmptyChatStat(key) {
      if (key === "unread") {
        const session = this.sessions.find(function(item) {
          return Number(item.unread || 0) > 0;
        });
        if (session) {
          this.selectSession(session.id);
          this.pulse("已跳转到未读会话：" + session.name);
        } else {
          this.pulse("当前没有未读消息");
        }
        return;
      }
      if (key === "mentions") {
        const mention = this.mentionMessages[0];
        if (mention) {
          this.selectSession(mention.sessionId);
          this.pulse("已跳转到提到你的消息");
        } else {
          this.pulse("当前没有提到你的消息");
        }
        return;
      }
      if (key === "favorites") {
        const favorite = this.favoriteMessages[0];
        if (favorite) {
          this.selectSession(favorite.sessionId);
          this.pulse("已跳转到收藏消息所在会话");
        } else {
          this.pulse("当前没有收藏消息");
        }
      }
    },
    async addFriend(session) {
      if (!session || !session.id) {
        return;
      }
      if (this.friendStatus(session) === "sent") {
        this.pulse("好友申请中，等待对方通过");
        return;
      }
      if (this.friendStatus(session) === "received") {
        this.acceptFriend(session);
        return;
      }
      try {
        if (this.token) {
          await requestFriendApi(session.id, this.token);
        }
      } catch (error) {
        this.pulse(error.message || "Friend request failed");
        return;
      }
      this.$set(this.friendRequests, session.id, "sent");
      session.description = "Friend request pending";
      session.preview = "Waiting for approval";
      if (this.socket && this.isConnect && session.raw) {
        this.socket.emit("friend-request", this.loginUserRaw, session.raw);
      }
      this.pulse("已发送好友申请给 " + session.name);
    },
    async acceptFriend(session) {
      if (!session || !session.id) {
        return;
      }
      try {
        if (this.token) {
          await acceptFriendApi(session.id, this.token);
        }
      } catch (error) {
        this.pulse(error.message || "通过好友失败");
        return;
      }
      this.$set(this.friendIds, session.id, true);
      this.$delete(this.friendRequests, session.id);
      session.friend = true;
      session.description = "Friend · online";
      session.preview = this.messages[session.id] && this.messages[session.id].length ? session.preview : "You are friends now";
      if (!this.messages[session.id]) {
        this.$set(this.messages, session.id, []);
      }
      this.selectedSessionId = session.id;
      if (this.socket && this.isConnect && session.raw) {
        this.socket.emit("friend-accept", this.loginUserRaw, session.raw);
      }
      this.pulse("Friend added: " + session.name);
    },
    async deleteFriend(session) {
      if (!session || !session.id || !session.raw || session.raw.type !== "user") {
        return;
      }
      try {
        if (this.token) {
          await deleteFriendApi(session.id, this.token);
        }
        this.$delete(this.friendIds, session.id);
        this.$delete(this.friendRequests, session.id);
        session.friend = false;
        session.description = "Not friends";
        session.preview = "Add as friend before chatting";
        if (this.selectedSessionId === session.id) {
          this.selectedSessionId = "group_001";
        }
        if (this.socket && this.isConnect && session.raw) {
          this.socket.emit("friend-delete", this.loginUserRaw, session.raw);
        }
        this.pulse("Friend removed: " + session.name);
      } catch (error) {
        this.pulse(error.message || "Delete friend failed");
      }
    },
    toggleEmojiPanel() {
      if (this.activePage === "chat" && this.isChatLocked) {
        this.pulse(this.lockedChatPlaceholder);
        return;
      }
      this.isEmojiPanelOpen = !this.isEmojiPanelOpen;
    },
    pickEmoji(item) {
      if (!item || !item.title) {
        return;
      }
      this.chatDraft += item.title;
      this.isEmojiPanelOpen = false;
    },
    pickAiEmoji(item) {
      if (!item || !item.title) {
        return;
      }
      this.aiDraft += item.title;
      this.isEmojiPanelOpen = false;
    },
    emojiParts(text) {
      const value = String(text || "");
      if (!value) {
        return [{ type: "text", text: "" }];
      }
      const emojiMap = {};
      this.emojiList.forEach((item) => {
        emojiMap[item.title] = item.url;
      });
      const parts = [];
      const reg = /\[.*?\]/g;
      let lastIndex = 0;
      let match = reg.exec(value);
      while (match) {
        if (match.index > lastIndex) {
          parts.push({ type: "text", text: value.slice(lastIndex, match.index) });
        }
        const title = match[0];
        if (emojiMap[title]) {
          parts.push({ type: "emoji", title, src: this.emojiBaseUrl + emojiMap[title] });
        } else {
          parts.push({ type: "text", text: title });
        }
        lastIndex = match.index + title.length;
        match = reg.exec(value);
      }
      if (lastIndex < value.length) {
        parts.push({ type: "text", text: value.slice(lastIndex) });
      }
      return parts;
    },
    triggerUpload(type) {
      if (this.isChatLocked) {
        this.pulse(this.lockedChatPlaceholder);
        return;
      }
      const refName = type === "image" ? "chatImageInput" : "chatFileInput";
      const input = this.$refs[refName];
      if (input) {
        input.click();
      }
    },
    handleChatFileChange(event, type) {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }
      if (type === "image") {
        const isImage = /\.(png|jpg|jpeg)$/i.test(file.name);
        if (!isImage) {
          this.pulse("请选择 PNG 或 JPG 图片");
          event.target.value = "";
          return;
        }
        if (file.size > 1024 * 1024) {
          this.pulse("图片大小不能超过 1MB");
          event.target.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          this.sendChatMessage(reader.result, "image");
          event.target.value = "";
        };
        reader.readAsDataURL(file);
        return;
      }
      const isFile = /\.(txt|pdf)$/i.test(file.name);
      if (!isFile) {
        this.pulse("请选择 TXT 或 PDF 文件");
        event.target.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.pulse("文件大小不能超过 5MB");
        event.target.value = "";
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      this.isUploadingChatFile = true;
      this.uploadProgress = 0;
      this.$axios.post("/upload/file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            this.uploadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          }
        }
      }).then((res) => {
        if (res.data && res.data.filePath) {
          this.sendChatMessage(res.data.filePath, "file");
          this.pulse("文件上传成功");
        } else {
          this.pulse("文件上传失败");
        }
      }).catch(() => {
        this.pulse("文件上传失败，请稍后重试");
      }).finally(() => {
        this.isUploadingChatFile = false;
        this.uploadProgress = 0;
        event.target.value = "";
      });
    },
    fileName(filePath) {
      return String(filePath || "附件").split("/").pop() || "附件";
    },
    handleChatEnter(event) {
      if (this.settings.sendShortcut === "enter") {
        event.preventDefault();
        this.sendChatMessage();
      }
    },
    handleChatCtrlEnter() {
      if (this.settings.sendShortcut === "ctrlEnter") {
        this.sendChatMessage();
      }
    },
    sendChatMessage(content, messageType) {
      const outgoingType = messageType || "text";
      const isEventPayload = content && typeof content === "object" && (
        (typeof Event !== "undefined" && content instanceof Event) ||
        typeof content.preventDefault === "function" ||
        typeof content.stopPropagation === "function" ||
        content.target
      );
      const safeContent = isEventPayload ? "" : content;
      const baseContent = safeContent || this.chatDraft;
      const outgoingContent = outgoingType === "text" ? String(baseContent || "").trim() : baseContent;
      if (!this.currentSession) {
        this.pulse("请先选择一个会话");
        return;
      }
      if (this.currentSession && this.currentSession.raw && this.currentSession.raw.type === "user" && !this.currentSession.friend) {
        this.pulse(this.lockedChatPlaceholder);
        return;
      }
      if (this.currentSession && this.currentSession.raw && this.currentSession.raw.type === "user" && !this.currentSession.raw.roomId) {
        this.pulse("好友当前离线，暂时不能发送");
        return;
      }
      if (!outgoingContent) {
        this.pulse("请先输入消息");
        return;
      }
      const id = this.selectedSessionId || "group_001";
      const list = this.messages[id] || [];
      list.push({
        id: Date.now(),
        author: "我",
        avatar: this.user.avatar,
        time: "刚刚",
        text: outgoingType === "file" ? this.fileName(outgoingContent) : outgoingContent,
        image: outgoingType === "image" ? outgoingContent : "",
        fileUrl: outgoingType === "file" ? outgoingContent : "",
        type: outgoingType,
        mine: true
      });
      this.$set(this.messages, id, list);
      const session = this.sessions.find(function(item) {
        return item.id === id;
      });
      if (session) {
        session.preview = outgoingType === "image" ? "已发送图片" : (outgoingType === "file" ? "已发送文件：" + this.fileName(outgoingContent) : outgoingContent);
        session.time = "刚刚";
      }
      if (this.socket && this.isConnect && this.currentSession) {
        const from = this.loginUserRaw || {
          id: "island-local",
          name: this.user.name,
          avatarUrl: this.user.avatar
        };
        const to = this.currentSession.raw || {
          id: this.currentSession.id,
          name: this.currentSession.name,
          type: this.currentSession.id === "group_001" ? "group" : "user"
        };
        this.socket.emit("message", from, to, outgoingContent, outgoingType);
      }
      if (outgoingType === "text") {
        this.chatDraft = "";
      }
      this.updateStorageUsage();
      this.pulse("消息已发送");
    },
    openArticle(id) {
      this.currentArticleId = id;
      this.newsView = "detail";
      this.activePage = "news";
    },
    backToNews() {
      this.newsView = "list";
    },
    addComment() {
      if (!this.commentDraft) {
        this.pulse("请输入评论内容");
        return;
      }
      this.comments.unshift({
        id: Date.now(),
        author: this.user.name,
        avatar: this.user.avatar,
        time: "刚刚",
        text: this.commentDraft
      });
      if (this.currentArticle && this.token) {
        createComment(this.currentArticle.id, this.commentDraft, this.token).catch(function() {});
      }
      this.commentDraft = "";
      this.pulse("评论已发布");
    },
    formatNewsDate(value) {
      if (!value) {
        return new Date().toISOString().slice(0, 10).replace(/-/g, ".");
      }
      return String(value).slice(0, 10).replace(/-/g, ".");
    },
    normalizeNewsItem(item, index) {
      const source = item || {};
      const covers = [coverCampus, coverClub, coverLibrary, coverLab, coverVolunteer, coverAlumni];
      const category = source.categoryName || source.category || source.categoryLabel || "社区动态";
      const tags = Array.isArray(source.tags)
        ? source.tags
        : String(source.tags || category || "生活方式").split(/[,，\s]+/).filter(Boolean);
      return {
        id: source.id || ("local-news-" + Date.now() + "-" + index),
        title: source.title || "生活新闻",
        category,
        summary: source.summary || source.description || "这里是新闻摘要。",
        content: source.content || source.body || source.summary || "",
        author: source.author || source.authorName || (this.user && this.user.name) || "小岛日报",
        authorAvatar: source.authorAvatar || (this.avatars && this.avatars.boy),
        date: this.formatNewsDate(source.publishedAt || source.createdAt || source.date),
        rawDate: source.publishedAt || source.createdAt || source.date || "",
        views: Number(source.viewCount || source.views || 0),
        cover: source.coverImage || source.cover || covers[index % covers.length],
        tags: tags.length ? tags : ["生活方式"],
        status: source.status || "published",
        raw: source
      };
    },
    getArticlePayloadFromForm() {
      return {
        title: this.publishForm.title,
        summary: this.publishForm.summary,
        content: this.publishForm.content,
        categoryName: this.publishForm.category,
        coverImage: this.assets.publishPreview,
        tags: this.publishForm.tags,
        status: this.publishForm.visibility === "private" ? "draft" : "published"
      };
    },
    buildAdminRow(article) {
      const statusMap = {
        published: "已发布",
        draft: "草稿",
        archived: "已归档"
      };
      return {
        id: article.id,
        title: article.title,
        author: article.author,
        category: article.category,
        status: statusMap[article.status] || article.status || "已发布",
        rawStatus: article.status || "published",
        views: String(article.views || 0),
        date: article.date,
        article
      };
    },
    refreshAdminFromLocal() {
      const visibleCategories = this.newsCategories.filter(function(name) {
        return name !== "全部" && name !== "推荐";
      });
      const counts = {};
      this.articles.forEach(function(article) {
        counts[article.category] = (counts[article.category] || 0) + 1;
      });
      this.adminRows = this.articles.map((article) => this.buildAdminRow(article));
      this.adminCategories = visibleCategories.map(function(name) {
        return { name, count: counts[name] || 0 };
      }).filter(function(item) {
        return item.count > 0 || visibleCategories.indexOf(item.name) !== -1;
      });
      this.adminStats = [
        { label: "文章总数", value: String(this.articles.length), note: "新闻中心实时数据", icon: "news" },
        { label: "创作者数", value: String(new Set(this.articles.map((article) => article.author)).size || 1), note: "按作者去重", icon: "users" },
        { label: "分类数", value: String(visibleCategories.length), note: "分类与发布页一致", icon: "about" },
        { label: "系统状态", value: this.token ? "正常" : "本地", note: this.token ? "接口可访问" : "使用本地数据", icon: "setting" }
      ];
    },
    refreshAdminCategoriesFromRows() {
      const visibleCategories = this.newsCategories.filter(function(name) {
        return name !== "全部" && name !== "推荐";
      });
      const counts = {};
      this.adminRows.forEach(function(row) {
        counts[row.category] = (counts[row.category] || 0) + 1;
      });
      this.adminCategories = visibleCategories.map(function(name) {
        return { name, count: counts[name] || 0 };
      });
    },
    publishArticle() {
      if (!this.publishForm.title || !this.publishForm.content) {
        this.pulse("请补全标题和正文");
        return;
      }
      const articlePayload = this.getArticlePayloadFromForm();
      const editingId = this.editingArticleId;
      const localArticle = this.normalizeNewsItem(Object.assign({}, articlePayload, {
        id: editingId || "local-" + Date.now(),
        category: this.publishForm.category,
        author: this.user.name,
        authorName: this.user.name,
        authorAvatar: this.user.avatar,
        createdAt: new Date().toISOString(),
        viewCount: 0
      }), 0);
      const existingIndex = editingId ? this.articles.findIndex((item) => item.id === editingId) : -1;
      if (existingIndex !== -1) {
        this.$set(this.articles, existingIndex, Object.assign({}, this.articles[existingIndex], localArticle));
      } else {
        this.articles.unshift(localArticle);
      }
      this.currentArticleId = localArticle.id;
      this.activeCategory = "全部";
      this.newsKeyword = "";
      if (this.token) {
        const request = editingId && String(editingId).indexOf("local-") !== 0
          ? updateNews(editingId, articlePayload, this.token)
          : createNews(articlePayload, this.token);
        request
          .then((saved) => {
            const savedSource = saved && (saved.article || saved.item || saved.news || saved);
            const savedArticle = savedSource && savedSource.title
              ? this.normalizeNewsItem(savedSource, 0)
              : Object.assign({}, localArticle, { id: savedSource && savedSource.id ? savedSource.id : localArticle.id });
            const index = this.articles.findIndex((item) => item.id === localArticle.id);
            if (index !== -1 && savedArticle) {
              this.$set(this.articles, index, savedArticle);
              this.currentArticleId = savedArticle.id;
            }
            this.refreshAdminFromLocal();
            this.loadAdminData(true);
          })
          .catch((error) => {
            this.pulse(error.message || "新闻已在本地显示，后端同步失败");
          });
      }
      this.refreshAdminFromLocal();
      this.publishForm = { title: "", tags: "", category: "社区动态", summary: "", content: "", visibility: "public" };
      this.editingArticleId = null;
      this.pulse(editingId ? "新闻已更新并显示在新闻中心" : "新闻已发布并显示在新闻中心");
      this.navigate("news");
    },
    openAiConfig() {
      this.aiConfigOpen = true;
      this.loadAiConfig(false);
    },
    toggleAiModelMenu(menu) {
      this.aiModelMenuOpen = this.aiModelMenuOpen === menu ? "" : menu;
    },
    selectAiModel(model) {
      this.aiModel = model;
      this.aiModelMenuOpen = "";
      const thread = this.aiThreads.find((item) => item.id === this.activeAiThreadId);
      if (thread) {
        thread.model = model;
        this.persistAiThreads();
      }
    },
    closeAiModelMenuOnBlur(event) {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        this.aiModelMenuOpen = "";
      }
    },
    async loadAiConfig(silent) {
      if (!this.token) {
        return;
      }
      try {
        const payload = await fetchAiConfig(this.token);
        this.aiConfig = {
          enabled: Boolean(payload.enabled),
          provider: payload.provider || "deepseek",
          model: payload.model || "deepseek-v4-flash",
          endpoint: payload.endpoint || "",
          apiKey: "",
          hasApiKey: Boolean(payload.hasApiKey)
        };
        this.aiModel = payload.providerLabel || (payload.provider === "openai" ? "OpenAI" : "DeepSeek");
      } catch (error) {
        if (!silent) {
          this.pulse(error.message || "AI 配置读取失败");
        }
      }
    },
    async saveAiConfig() {
      if (!this.token) {
        this.pulse("请先登录");
        return;
      }
      try {
        const payload = await saveAiConfigApi(this.aiConfig, this.token);
        this.aiConfig = {
          enabled: Boolean(payload.enabled),
          provider: payload.provider || this.aiConfig.provider,
          model: payload.model || this.aiConfig.model,
          endpoint: payload.endpoint || this.aiConfig.endpoint,
          apiKey: "",
          hasApiKey: Boolean(payload.hasApiKey)
        };
        this.aiModel = payload.providerLabel || (payload.provider === "openai" ? "OpenAI" : "DeepSeek");
        this.aiConfigOpen = false;
        this.pulse("AI API 配置已保存");
      } catch (error) {
        this.pulse(error.message || "AI 配置保存失败");
      }
    },
    triggerAiUpload(type) {
      const refName = type === "image" ? "aiImageInput" : "aiFileInput";
      const input = this.$refs[refName];
      if (input) {
        input.click();
      }
    },
    async handleAiFileChange(event, type) {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }
      const isImage = type === "image";
      const allowed = isImage ? /\.(png|jpg|jpeg|gif)$/i : /\.(txt|pdf)$/i;
      if (!allowed.test(file.name)) {
        this.pulse(isImage ? "请选择 PNG、JPG 或 GIF 图片" : "请选择 TXT 或 PDF 文件");
        event.target.value = "";
        return;
      }
      try {
        this.isUploadingAiFile = true;
        this.aiUploadProgress = 0;
        const payload = await uploadIslandFile(file, (progress) => {
          this.aiUploadProgress = progress;
        });
        const filePath = payload && payload.filePath ? payload.filePath : "";
        if (!filePath) {
          throw new Error("文件上传失败");
        }
        this.aiAttachments.push({
          id: Date.now() + "-" + file.name,
          name: payload.filename || file.name,
          url: filePath,
          type: isImage ? "image" : "file"
        });
        this.pulse("附件上传成功");
      } catch (error) {
        this.pulse(error.message || "附件上传失败");
      } finally {
        this.isUploadingAiFile = false;
        this.aiUploadProgress = 0;
        event.target.value = "";
      }
    },
    removeAiAttachment(id) {
      this.aiAttachments = this.aiAttachments.filter(function(file) {
        return file.id !== id;
      });
    },
    newAiThread() {
      const id = "thread-" + Date.now();
      this.aiThreads.unshift({
        id,
        title: "新的 AI 对话",
        model: this.aiModel,
        time: "刚刚"
      });
      this.$set(this.aiHistory, id, []);
      this.activeAiThreadId = id;
      this.aiMessages = [];
      this.persistAiThreads();
      this.pulse("已创建新对话");
    },
    deleteAiThread(id) {
      const index = this.aiThreads.findIndex(function(thread) {
        return thread.id === id;
      });
      if (index === -1) {
        return;
      }
      this.aiThreads.splice(index, 1);
      this.$delete(this.aiHistory, id);
      if (!this.aiThreads.length) {
        this.aiThreads = [{ id: "welcome", title: "AI 助手", model: "智能对话 · " + this.aiModel, time: "现在", badge: 0 }];
        this.$set(this.aiHistory, "welcome", []);
      }
      if (this.activeAiThreadId === id) {
        this.activeAiThreadId = this.aiThreads[0].id;
        this.aiMessages = (this.aiHistory[this.activeAiThreadId] || []).slice();
      }
      this.persistAiThreads();
      this.pulse("会话已删除");
    },
    selectAiThread(id) {
      this.activeAiThreadId = id;
      this.aiMessages = (this.aiHistory[id] || []).slice();
    },
    loadAiThreads() {
      try {
        const raw = window.localStorage.getItem("qxin_ai_threads");
        if (raw) {
          const parsed = JSON.parse(raw);
          this.aiThreads = Array.isArray(parsed.threads) ? parsed.threads : [];
          this.aiHistory = parsed.history || {};
        }
      } catch (error) {
        this.aiThreads = [];
        this.aiHistory = {};
      }
      if (!this.aiThreads.length) {
        this.aiThreads = [{ id: "welcome", title: "AI 助手", model: "智能对话 · " + this.aiModel, time: "现在", badge: 0 }];
        this.aiHistory = { welcome: [] };
      }
      this.activeAiThreadId = this.aiThreads[0].id;
      this.aiMessages = (this.aiHistory[this.activeAiThreadId] || []).slice();
    },
    persistAiThreads() {
      try {
        window.localStorage.setItem("qxin_ai_threads", JSON.stringify({
          threads: this.aiThreads.slice(0, 20),
          history: this.aiHistory
        }));
      } catch (error) {
        // 本地存储不可用时静默失败
      }
    },
    askAi(prompt) {
      this.aiDraft = prompt;
      this.sendAiMessage();
    },
    shouldAutoPublishAiDraft(text) {
      return /(发到|发布到|发送到|写入|同步到|加入).{0,12}新闻中心|新闻中心.{0,12}(发布|发送|发出去|上架)/.test(String(text || ""));
    },
    stripAiMarkdown(text) {
      return String(text || "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
        .replace(/^\s{0,3}#{1,6}\s+/gm, "")
        .replace(/^\s{0,3}[-*]\s+/gm, "")
        .trim();
    },
    getAiArticleTopic(prompt) {
      const text = this.stripAiMarkdown(prompt);
      const topicMatch = text.match(/(?:主题|标题|题目)(?:是|为|：|:)?\s*([^，。！？,;；\n]+)/);
      if (topicMatch && topicMatch[1]) {
        return topicMatch[1].trim();
      }
      return text
        .replace(/^(请|帮我|给我|根据|基于|生成|写|撰写|起草|发布|发送|发|一条)+/, "")
        .replace(/(文章|新闻|稿|文案|到新闻中心|发到新闻中心|记得发到新闻中心|发送|发布|发)+/g, "")
        .trim()
        .slice(0, 28) || "Q信新闻";
    },
    buildAiDraftFromAnswer(answer, prompt) {
      const cleanAnswer = this.stripAiMarkdown(answer);
      const topic = this.getAiArticleTopic(prompt);
      const titleMatch = cleanAnswer.match(/标题[：:]\s*([^\n。]+)/);
      const summaryMatch = cleanAnswer.match(/摘要[：:]\s*([\s\S]*?)(?:\n|正文[：:]|$)/);
      const content = cleanAnswer
        .replace(/^好的[，,]?\s*/, "")
        .replace(/将发布到新闻中心[：:]?\s*/g, "")
        .trim();
      return {
        title: this.stripAiMarkdown(titleMatch && titleMatch[1] ? titleMatch[1] : topic).slice(0, 32),
        summary: this.stripAiMarkdown(summaryMatch && summaryMatch[1] ? summaryMatch[1] : `围绕${topic}整理的一篇新闻中心发布稿。`).slice(0, 120),
        categoryName: "社区动态",
        tags: ["AI 生成", "新闻中心"],
        content: content || `【导语】${topic}是 Q信新闻中心本次发布的重点内容。\n\n【正文】Q信致力于为用户提供清晰、温暖、可执行的沟通体验。围绕${topic}，平台将持续优化即时通讯、新闻发布和 AI 助手能力，让用户更高效地获取信息、整理内容并完成日常交流。\n\n【结语】欢迎大家继续关注 Q信新闻中心，了解更多产品动态与使用说明。`
      };
    },
    async sendAiMessage() {
      if (!this.aiDraft && !this.aiAttachments.length) {
        this.pulse("请输入问题");
        return;
      }
      const attachments = this.aiAttachments.slice();
      const text = this.aiDraft || "请分析我上传的附件";
      const attachmentSummary = attachments.map((file) => {
        return `${file.type === "image" ? "图片" : "附件"}：${file.name}（${file.url}）`;
      }).join("\n");
      const promptText = attachmentSummary ? `${text}\n\n已上传附件：\n${attachmentSummary}` : text;
      this.aiMessages.push({
        id: Date.now(),
        role: "user",
        text: attachmentSummary ? `${text}\n${attachmentSummary}` : text
      });
      this.updateAiThreadAfterMessage(text);
      this.aiDraft = "";
      this.aiAttachments = [];
      try {
        const payload = await askAssistant(promptText, this.token);
        const cleanAnswer = this.stripAiMarkdown(payload.answer || "AI 助手暂时没有返回内容。");
        const shouldAutoPublish = this.shouldAutoPublishAiDraft(promptText);
        let articleDraft = payload.articleDraft || (shouldAutoPublish ? this.buildAiDraftFromAnswer(cleanAnswer, promptText) : null);
        let assistantText = cleanAnswer;
        if (articleDraft && shouldAutoPublish) {
          try {
            const published = await this.publishAiArticleDraft(articleDraft);
            assistantText = "已发布到新闻中心：" + published.title + "。你可以在新闻中心列表和管理后台中查看。";
            articleDraft = null;
          } catch (publishError) {
            assistantText = "新闻稿已生成，但发布到新闻中心失败：" + (publishError.message || "请稍后重试") + "。你可以点击下方按钮再次发布。";
          }
        }
        this.aiMessages.push({
          id: Date.now() + 1,
          role: "assistant",
          text: assistantText,
          articleDraft,
          newsReferences: payload.newsReferences || []
        });
      } catch (error) {
        this.aiMessages.push({
          id: Date.now() + 1,
          role: "assistant",
          text: this.stripAiMarkdown(error.message || "AI 助手暂时不可用，请稍后重试。")
        });
      }
      this.$set(this.aiHistory, this.activeAiThreadId, this.aiMessages.slice());
      this.persistAiThreads();
    },
    async publishAiArticleDraft(draft) {
      if (!this.token) {
        throw new Error("请先登录后再发布");
      }
      const fallbackCategory = this.newsCategories.indexOf(draft.categoryName) !== -1 ? draft.categoryName : "社区动态";
      const articlePayload = {
        title: this.stripAiMarkdown(draft.title || "Q信新闻"),
        summary: this.stripAiMarkdown(draft.summary || ""),
        content: this.stripAiMarkdown(draft.content || draft.summary || "这是一篇由 AI 助手生成的新闻稿。"),
        categoryName: fallbackCategory,
        coverImage: this.assets.publishPreview,
        tags: Array.isArray(draft.tags) ? draft.tags.join("，") : (draft.tags || "AI 生成，新闻中心"),
        status: "published"
      };
      const saved = await createNews(articlePayload, this.token);
      const savedSource = saved && (saved.article || saved.item || saved.news || saved);
      const localArticle = this.normalizeNewsItem(Object.assign({}, articlePayload, {
        id: savedSource && savedSource.id ? savedSource.id : "local-ai-" + Date.now(),
        category: fallbackCategory,
        author: this.user.name,
        authorName: this.user.name,
        authorAvatar: this.user.avatar,
        createdAt: new Date().toISOString(),
        viewCount: 0
      }), 0);
      this.articles.unshift(localArticle);
      this.currentArticleId = localArticle.id;
      this.activeCategory = "全部";
      this.newsKeyword = "";
      this.refreshAdminFromLocal();
      this.loadAdminData(true);
      this.loadNewsFromApi();
      return localArticle;
    },
    useAiArticleDraft(draft, publishNow) {
      if (!draft) {
        return;
      }
      const fallbackCategory = this.newsCategories.indexOf(draft.categoryName) !== -1 ? draft.categoryName : "社区动态";
      this.publishForm = {
        title: this.stripAiMarkdown(draft.title || ""),
        tags: this.stripAiMarkdown(Array.isArray(draft.tags) ? draft.tags.join("，") : (draft.tags || "")),
        category: fallbackCategory,
        summary: this.stripAiMarkdown(draft.summary || ""),
        content: this.stripAiMarkdown(draft.content || ""),
        visibility: "public"
      };
      this.editingArticleId = null;
      if (publishNow) {
        this.publishArticle();
        return;
      }
      this.activePage = "publish";
      this.pulse("AI 草稿已填入发布页");
    },
    updateAiThreadAfterMessage(text) {
      if (!this.activeAiThreadId) {
        this.newAiThread();
      }
      const thread = this.aiThreads.find((item) => item.id === this.activeAiThreadId);
      if (thread) {
        if (!thread.title || thread.title === "AI 助手" || thread.title === "新的 AI 对话") {
          thread.title = String(text || "AI 对话").slice(0, 18);
        }
        thread.model = this.aiModel;
        thread.time = "刚刚";
        thread.badge = 0;
      }
    },
    ensureDesktopNotificationPermission() {
      if (typeof window === "undefined" || !("Notification" in window)) {
        this.pulse("当前环境不支持桌面通知");
        return;
      }
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          this.pulse(permission === "granted" ? "桌面通知授权成功" : "桌面通知未授权");
        }).catch(() => this.pulse("桌面通知授权失败"));
      }
    },
    playNotificationSound() {
      try {
        const audio = new Audio((process.env.BASE_URL || "") + "static/8400.mp3");
        audio.volume = 0.35;
        audio.play().catch(function() {});
      } catch (error) {
        // 浏览器禁止自动播放时忽略
      }
    },
    notifyIncomingMessage(session, from, message, type) {
      if (!this.settings.messageNotice) {
        return;
      }
      if (session && session.raw && session.raw.type === "group" && !this.settings.groupNotice) {
        return;
      }
      const title = from && from.name ? from.name : (session && session.name ? session.name : "Q信新消息");
      const body = type === "image" ? "发来一张图片" : (type === "file" ? "发来文件：" + this.fileName(message) : String(message || ""));
      if (this.settings.soundNotice) {
        this.playNotificationSound();
      }
      if (this.settings.desktopNotice && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(title, { body: body.slice(0, 80) });
        } catch (error) {
          // 通知失败不影响聊天
        }
      }
    },
    triggerAutoDownload(url, type) {
      if (!url) {
        return;
      }
      try {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = type === "image" ? "qxin-image.png" : this.fileName(url);
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } catch (error) {
        this.pulse("自动下载失败，可在文件管理中手动打开");
      }
    },
    applyHistoryRetention() {
      const days = this.settings.historyDays;
      if (!days || days === "forever") {
        return;
      }
      const keepAfter = Date.now() - Number(days) * 24 * 60 * 60 * 1000;
      Object.keys(this.messages || {}).forEach((sessionId) => {
        const kept = (this.messages[sessionId] || []).filter(function(message) {
          const timestamp = Number(message.id) || Date.now();
          return timestamp >= keepAfter;
        });
        this.$set(this.messages, sessionId, kept);
      });
    },
    updateStorageUsage() {
      let bytes = 0;
      try {
        bytes += JSON.stringify(this.messages || {}).length;
        bytes += JSON.stringify(this.aiHistory || {}).length;
      } catch (error) {
        bytes = 0;
      }
      const files = this.refreshUploadedFiles();
      bytes += files.length * 128 * 1024;
      const usedGb = Math.max(0.01, bytes / 1024 / 1024 / 1024);
      this.$set(this.settings, "storageUsed", Number(usedGb.toFixed(2)));
      this.$set(this.settings, "cacheUsed", Math.max(0, Math.round(bytes / 1024 / 1024)));
    },
    pulse(message) {
      this.toast = message;
      window.clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => {
        this.toast = "";
      }, 1800);
    },
    initSocket() {
      if (this.socket) {
        return;
      }
      try {
        const manager = new Manager(this.socketURL, {
          transports: ["websocket"],
          reconnectionAttempts: 4,
          reconnectionDelay: 600,
          timeout: 8000,
          forceNew: true,
          autoConnect: false
        });
        const socket = manager.socket("/");
        this.socket = socket;
        socket.on("connect", () => {
          this.isConnect = true;
          this.socketConnecting = false;
          if (this.pendingLoginPayload) {
            socket.emit("login", this.pendingLoginPayload);
          }
        });
        socket.on("disconnect", () => {
          this.isConnect = false;
          this.socketConnecting = false;
        });
        socket.on("connect_error", () => {
          this.pendingLoginPayload = null;
          this.isConnect = false;
          this.socketConnecting = false;
          this.triggerLoginError();
          this.pulse("连接后端失败，请确认后端服务已启动");
        });
        socket.io.on("reconnect_attempt", () => {
          if (this.token) {
            socket.io.opts.extraHeaders = { token: this.token };
          }
        });
        socket.io.on("reconnect_failed", () => {
          this.pendingLoginPayload = null;
          this.socketConnecting = false;
          this.pulse("后端重连失败，请稍后重试");
        });
        socket.on("loginSuccess", this.handleSocketLoginSuccess);
        socket.on("loginFail", (message) => {
          this.pendingLoginPayload = null;
          this.socketConnecting = false;
          this.isLoggedIn = false;
          this.triggerLoginError();
          this.pulse(message || "登录失败，请换一个账号重试");
        });
        socket.on("message", this.handleSocketMessage);
        socket.on("file-message", this.handleSocketMessage);
        socket.on("system", this.handleSocketSystem);
        socket.on("history-message", this.handleSocketHistory);
        socket.on("friend-request", this.handleFriendRequest);
        socket.on("friend-accepted", this.handleFriendAccepted);
        socket.on("friend-deleted", this.handleFriendDeleted);
        socket.on("friend-error", (message) => this.pulse(message || "好友操作失败"));
        this.socketConnecting = true;
        socket.connect();
      } catch (error) {
        this.socket = null;
        this.socketConnecting = false;
      }
    },
    handleSocketLoginSuccess(data, users) {
      if (data && data.user) {
        this.loginUserRaw = data.user;
        this.pendingLoginPayload = null;
        this.socketConnecting = false;
        this.isLoggedIn = true;
        this.isAdmin = data.user.role === "admin";
        this.user = {
          name: data.user.name || data.user.username || this.user.name,
          role: this.isAdmin ? "管理员" : "在线",
          avatar: data.user.avatarUrl || this.user.avatar
        };
        if (!this.isAdmin && this.activePage === "admin") {
          this.activePage = "chat";
        }
      }
      if (data && data.token) {
        this.token = data.token;
      }
      if (data && data.friends) {
        this.applyFriendSnapshot(data.friends);
      }
      if (Array.isArray(users) && users.length) {
        this.syncSessionsFromUsers(users);
      }
      this.loadFriends();
      this.loadSettings();
      this.loadAboutInfo();
      if (this.isAdmin) {
        this.loadAdminData();
      }
      this.loadNewsFromApi();
      this.pulse("欢迎回来，" + this.user.name);
    },
    applyFriendSnapshot(snapshot) {
      const friendIds = {};
      const friendRequests = {};
      const ensureSession = (item, status) => {
        if (!item || !item.id) {
          return;
        }
        if (status === "accepted") {
          friendIds[item.id] = true;
        } else {
          friendRequests[item.id] = status;
        }
        this.upsertOnlineUser(Object.assign({}, item, { type: "user" }));
      };
      (snapshot.accepted || []).forEach((item) => ensureSession(item, "accepted"));
      (snapshot.sent || []).forEach((item) => ensureSession(item, "sent"));
      (snapshot.received || []).forEach((item) => ensureSession(item, "received"));
      this.friendIds = friendIds;
      this.friendRequests = friendRequests;
    },
    syncSessionsFromUsers(users) {
      const normalized = [];
      const currentById = {};
      (this.sessions || []).forEach((session) => {
        if (session && session.id) {
          currentById[session.id] = session;
        }
      });
      users.forEach((item, index) => {
        if (!item || (this.loginUserRaw && item.id === this.loginUserRaw.id)) {
          return;
        }
        const id = item.id || String(index);
        const existed = currentById[id];
        const isGroup = item.type === "group";
        const requestState = this.friendRequests[id];
        const isFriend = isGroup || Boolean(this.friendIds[id]);
        normalized.push({
          id,
          name: item.name || (isGroup ? "群聊天室" : "岛民"),
          description: isGroup ? "一起享受小岛的每一天" : (isFriend ? "好友 · 在线" : (requestState === "sent" ? "好友申请中" : (requestState === "received" ? "收到好友申请" : "未添加好友"))),
          avatar: item.avatarUrl || (isGroup ? this.avatars.group : this.avatars.boy),
          preview: existed ? existed.preview : (isGroup ? "群聊消息实时同步" : (requestState === "sent" ? "等待对方通过后即可聊天" : "添加好友后开始聊天")),
          time: "在线",
          unread: existed ? existed.unread || 0 : 0,
          friend: isFriend,
          raw: Object.assign({}, item, { type: isGroup ? "group" : "user" })
        });
      });
      (this.sessions || []).forEach((session) => {
        if (!session || !session.id || normalized.some((item) => item.id === session.id)) {
          return;
        }
        const requestState = this.friendRequests[session.id];
        const shouldKeep = session.friend || Boolean(this.friendIds[session.id]) || Boolean(requestState) || session.id === this.selectedSessionId;
        if (!shouldKeep) {
          return;
        }
        const kept = Object.assign({}, session);
        if (kept.raw && kept.raw.type === "user") {
          kept.friend = Boolean(this.friendIds[kept.id]);
          kept.description = kept.friend ? "好友 · 离线" : (requestState === "sent" ? "好友申请中" : (requestState === "received" ? "收到好友申请" : "未添加好友"));
          kept.time = kept.friend ? "离线" : kept.time;
        }
        normalized.push(kept);
      });
      this.sessions = normalized;
    },
    handleSocketMessage(from, to, message, type) {
      const sessionId = to && to.type === "group" ? to.id : (from && from.id);
      if (!sessionId) {
        return;
      }
      if (to && to.type !== "group" && from && (!this.loginUserRaw || from.id !== this.loginUserRaw.id)) {
        this.upsertOnlineUser(from);
      }
      if (!this.messages[sessionId]) {
        this.$set(this.messages, sessionId, []);
      }
      this.messages[sessionId].push({
        id: Date.now(),
        author: from && from.name ? from.name : "岛民",
        avatar: from && from.avatarUrl ? from.avatarUrl : this.avatars.boy,
        time: "刚刚",
        text: type === "image" ? "已发送图片" : (type === "file" ? this.fileName(message) : String(message || "")),
        image: type === "image" ? String(message || "") : "",
        fileUrl: type === "file" ? String(message || "") : "",
        type: type || "text",
        mine: this.loginUserRaw && from && from.id === this.loginUserRaw.id
      });
      const incoming = !(this.loginUserRaw && from && from.id === this.loginUserRaw.id);
      const session = this.sessions.find((item) => item.id === sessionId);
      if (session) {
        session.preview = type === "image" ? "已发送图片" : (type === "file" ? "已发送文件：" + this.fileName(message) : String(message || ""));
        session.time = "刚刚";
        if (this.selectedSessionId !== sessionId) {
          session.unread = (session.unread || 0) + 1;
        }
      }
      if (incoming) {
        this.notifyIncomingMessage(session, from, message, type);
        if (this.settings.autoDownload && (type === "file" || type === "image")) {
          this.triggerAutoDownload(String(message || ""), type);
        }
      }
      this.updateStorageUsage();
    },
    upsertOnlineUser(user) {
      if (!user || !user.id || (this.loginUserRaw && user.id === this.loginUserRaw.id)) {
        return;
      }
      const existed = this.sessions.find((item) => item.id === user.id);
      if (existed) {
        existed.raw = user;
        existed.time = "在线";
        existed.avatar = user.avatarUrl || existed.avatar;
        existed.description = existed.friend ? "好友 · 在线" : (this.friendRequests[user.id] === "sent" ? "好友申请中" : (this.friendRequests[user.id] === "received" ? "收到好友申请" : "未添加好友"));
        return;
      }
      this.sessions.push({
        id: user.id,
        name: user.name || "岛民",
        description: this.friendIds[user.id] ? "好友 · 在线" : (this.friendRequests[user.id] === "sent" ? "好友申请中" : (this.friendRequests[user.id] === "received" ? "收到好友申请" : "未添加好友")),
        avatar: user.avatarUrl || this.avatars.boy,
        preview: this.friendRequests[user.id] === "received" ? "收到好友申请" : "添加好友后开始聊天",
        time: "在线",
        unread: 0,
        friend: Boolean(this.friendIds[user.id]),
        raw: user
      });
    },
    removeOnlineUser(userId) {
      const session = this.sessions.find((item) => item.id === userId);
      if (session) {
        session.time = "离线";
        session.description = session.friend ? "好友 · 离线" : "对方已离线";
        session.raw = Object.assign({}, session.raw || {}, { roomId: "" });
      }
    },
    handleFriendRequest(from) {
      if (!from || !from.id || (this.loginUserRaw && from.id === this.loginUserRaw.id)) {
        return;
      }
      this.$set(this.friendRequests, from.id, "received");
      this.upsertOnlineUser(from);
      const session = this.sessions.find((item) => item.id === from.id);
      if (session) {
        session.friend = false;
        session.description = "收到好友申请";
        session.preview = "对方想添加你为好友";
        session.unread = (session.unread || 0) + 1;
      }
      this.pulse(from.name + " 请求添加你为好友");
    },
    handleFriendAccepted(from) {
      if (!from || !from.id || (this.loginUserRaw && from.id === this.loginUserRaw.id)) {
        return;
      }
      this.$set(this.friendIds, from.id, true);
      this.$delete(this.friendRequests, from.id);
      this.upsertOnlineUser(from);
      const session = this.sessions.find((item) => item.id === from.id);
      if (session) {
        session.friend = true;
        session.description = "好友 · 在线";
        session.preview = "你们已经成为好友，可以开始聊天";
      }
      this.pulse(from.name + " 已通过你的好友申请");
    },
    handleFriendDeleted(from) {
      if (!from || !from.id || (this.loginUserRaw && from.id === this.loginUserRaw.id)) {
        return;
      }
      this.$delete(this.friendIds, from.id);
      this.$delete(this.friendRequests, from.id);
      const session = this.sessions.find((item) => item.id === from.id);
      if (session) {
        session.friend = false;
        session.description = "未添加好友";
        session.preview = "对方已解除好友关系";
      }
      if (this.selectedSessionId === from.id) {
        this.selectedSessionId = "group_001";
      }
      this.pulse((from.name || "对方") + " 已删除好友关系");
    },
    handleSocketSystem(user, type) {
      const name = user && user.name ? user.name : "岛民";
      if (type === "join" && user && (!this.loginUserRaw || user.id !== this.loginUserRaw.id)) {
        this.upsertOnlineUser(user);
      }
      if (type === "logout" && user && user.id) {
        this.removeOnlineUser(user.id);
      }
      this.pulse(type === "join" ? name + " 已上线" : name + " 已离线");
    },
    handleSocketHistory(channelId, messages) {
      if (Array.isArray(channelId)) {
        messages = channelId;
        channelId = "group_001";
      }
      if (!Array.isArray(messages)) {
        return;
      }
      if (!this.messages[channelId]) {
        this.$set(this.messages, channelId, []);
      }
      messages.forEach((item) => {
        this.handleSocketMessage(item.from, item.to, item.content, item.type);
      });
      this.applyHistoryRetention();
      this.updateStorageUsage();
    },
    loadFriends() {
      if (!this.token) {
        return;
      }
      fetchFriends(this.token)
        .then((payload) => {
          if (payload && payload.friends) {
            this.applyFriendSnapshot(payload.friends);
            this.syncSessionsFromUsers([].concat(
              [{
                id: "group_001",
                name: "群聊天室",
                avatarUrl: this.avatars.group,
                type: "group"
              }],
              payload.friends.accepted || [],
              payload.friends.sent || [],
              payload.friends.received || []
            ));
          }
        })
        .catch((error) => this.pulse(error.message || "好友列表加载失败"));
    },
    loadSettings() {
      try {
        const local = window.localStorage.getItem("qxin_settings");
        if (local) {
          this.settings = Object.assign({}, this.settings, JSON.parse(local));
        }
      } catch (error) {
        // 本地设置读取失败时继续使用默认值
      }
      this.applyHistoryRetention();
      this.updateStorageUsage();
      this.applyAppearance();
      if (!this.token) {
        return;
      }
      fetchSettings(this.token)
        .then((payload) => {
          if (payload && payload.settings) {
            this.settings = Object.assign({}, this.settings, payload.settings);
            this.applyHistoryRetention();
            this.updateStorageUsage();
            this.applyAppearance();
          }
        })
        .catch(function() {});
    },
    setSetting(key, value) {
      this.$set(this.settings, key, value);
      this.persistSettings();
    },
    setAppearance(key, value) {
      this.$set(this.settings, key, value);
      this.persistSettings();
      this.applyAppearance();
      const labels = {
        fresh: "清新绿",
        light: "浅色",
        dark: "深色",
        small: "小字号",
        medium: "标准字号",
        large: "大字号"
      };
      if (key === "theme") {
        this.pulse("外观已切换为" + (labels[value] || value));
      } else if (key === "fontSize") {
        this.pulse("字体大小已切换为" + (labels[value] || value));
      } else if (key === "language") {
        this.pulse("语言已切换为" + value);
      }
    },
    setMessageSetting(key, value) {
      this.$set(this.settings, key, value);
      if (key === "historyDays") {
        this.applyHistoryRetention();
        this.updateStorageUsage();
      }
      this.persistSettings();
      const messages = {
        sendShortcut: "发送快捷键已更新",
        historyDays: "消息记录保留规则已更新"
      };
      this.pulse(messages[key] || "消息设置已保存");
    },
    toggleMessageSetting(key) {
      this.$set(this.settings, key, !this.settings[key]);
      if (key === "imagePreview" && !this.settings.imagePreview) {
        this.pulse("图片预览已关闭，聊天中将显示为可打开的文件");
      } else if (key === "autoDownload" && this.settings.autoDownload) {
        this.pulse("自动下载已开启，收到文件时会尝试保存");
      } else if (key === "emojiRecommend" && !this.settings.emojiRecommend) {
        this.isEmojiPanelOpen = false;
        this.pulse("表情推荐已关闭");
      } else {
        this.pulse("消息设置已保存");
      }
      this.persistSettings();
    },
    applyAppearance() {
      if (typeof document === "undefined") {
        return;
      }
      document.documentElement.lang = this.settings.language === "English" ? "en" : "zh-CN";
      document.documentElement.setAttribute("data-qxin-theme", this.settings.theme || "fresh");
      document.documentElement.setAttribute("data-qxin-font", this.settings.fontSize || "medium");
    },
    toggleNotification(key) {
      this.$set(this.settings, key, !this.settings[key]);
      if (key === "desktopNotice" && this.settings.desktopNotice) {
        this.ensureDesktopNotificationPermission();
      }
      if (key === "soundNotice" && this.settings.soundNotice) {
        this.playNotificationSound();
      }
      this.persistSettings();
      const item = this.notificationItems.find(function(entry) {
        return entry.key === key;
      });
      this.pulse((item ? item.label : "通知") + (this.settings[key] ? "已开启" : "已关闭"));
    },
    runSettingAction(action) {
      switch (action) {
        case "profile":
          this.profileForm.name = this.user.name || "";
          this.profileForm.avatarUrl = this.user.avatar || "";
          this.showProfileEditor = true;
          break;
        case "block": this.showBlockList = true; break;
        case "devices": this.showDevicesPanel = true; break;
        case "security": this.showPasswordDialog = true; break;
        case "cache": this.updateStorageUsage(); this.showCachePanel = true; break;
        case "backup": this.showBackupPanel = true; break;
        case "files": this.refreshUploadedFiles(); this.showFilesPanel = true; break;
        default: this.pulse("设置项已打开");
      }
    },
    async saveProfile() {
      if (!this.token) { this.pulse("请先登录"); return; }
      try {
        const res = await fetch("/api/auth/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + this.token },
          body: JSON.stringify({ name: this.profileForm.name, avatarUrl: this.profileForm.avatarUrl, signature: this.profileForm.signature })
        });
        if (!res.ok) throw new Error((await res.json()).message || "保存失败");
        const data = await res.json();
        if (data.user) {
          this.user.name = data.user.name;
          this.user.avatar = data.user.avatarUrl || this.user.avatar;
          this.loginUserRaw = Object.assign({}, this.loginUserRaw, data.user);
        }
        this.showProfileEditor = false;
        this.pulse("资料已更新");
      } catch (err) {
        this.pulse(err.message || "保存失败");
      }
    },
    async changePassword() {
      const { oldPwd, newPwd, confirmPwd } = this.passwordForm;
      if (!oldPwd || !newPwd) { this.pulse("请输入旧密码和新密码"); return; }
      if (newPwd !== confirmPwd) { this.pulse("两次密码不一致"); return; }
      if (newPwd.length < 3) { this.pulse("新密码至少3位"); return; }
      try {
        const res = await fetch("/api/auth/password", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + this.token },
          body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
        });
        if (!res.ok) throw new Error((await res.json()).message || "修改失败");
        this.showPasswordDialog = false;
        this.passwordForm = { oldPwd: "", newPwd: "", confirmPwd: "" };
        this.pulse("密码修改成功");
      } catch (err) {
        this.pulse(err.message || "密码修改失败");
      }
    },
    exportMessages() {
      const backup = {
        app: "Q信",
        version: 1,
        exportedAt: new Date().toISOString(),
        user: this.user.name,
        sessions: this.sessions.map(function(session) {
          return {
            id: session.id,
            name: session.name,
            description: session.description,
            avatar: session.avatar,
            raw: session.raw || null
          };
        }),
        messages: this.messages
      };
      this.downloadJson(backup, "qxin-chat-backup-" + Date.now() + ".json");
      this.lastBackupAt = backup.exportedAt;
      this.pulse("聊天记录已导出");
    },
    downloadJson(payload, filename) {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    },
    triggerMessageRestore() {
      const input = this.$refs.messageBackupInput;
      if (input) {
        input.click();
      }
    },
    restoreMessagesFromFile(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const payload = JSON.parse(reader.result || "{}");
          if (!payload.messages || typeof payload.messages !== "object") {
            throw new Error("备份文件格式不正确");
          }
          Object.keys(payload.messages).forEach((key) => {
            if (Array.isArray(payload.messages[key])) {
              this.$set(this.messages, key, payload.messages[key]);
            }
          });
          if (Array.isArray(payload.sessions)) {
            payload.sessions.forEach((session) => {
              if (session && session.id && !this.sessions.find((item) => item.id === session.id)) {
                this.sessions.push(Object.assign({ unread: 0, friend: true }, session));
              }
            });
          }
          this.applyHistoryRetention();
          this.refreshUploadedFiles();
          this.updateStorageUsage();
          this.showBackupPanel = false;
          this.pulse("聊天记录已导入");
        } catch (error) {
          this.pulse(error.message || "导入失败，请检查备份文件");
        } finally {
          event.target.value = "";
        }
      };
      reader.readAsText(file, "utf-8");
    },
    refreshUploadedFiles() {
      const files = [];
      Object.keys(this.messages || {}).forEach((sessionId) => {
        const session = this.sessions.find((item) => item.id === sessionId);
        (this.messages[sessionId] || []).forEach((message) => {
          const url = message.fileUrl || (message.type === "image" ? message.image : "");
          if (!url) {
            return;
          }
          files.push({
            name: message.type === "image" ? "聊天图片" : this.fileName(url),
            filename: this.fileName(url),
            url,
            type: message.type,
            sessionName: session ? session.name : sessionId,
            sizeLabel: message.type === "image" ? "图片" : "文件"
          });
        });
      });
      this.uploadedFiles = files;
      return files;
    },
    openStoredFile(file) {
      if (!file || !file.url) {
        this.pulse("文件地址不可用");
        return;
      }
      window.open(file.url, "_blank", "noopener");
    },
    clearSettingsCache() {
      try {
        window.localStorage.removeItem("qxin_ai_threads");
      } catch (error) {
        // 本地缓存不可用时忽略
      }
      this.$set(this.settings, "cacheUsed", 0);
      this.$set(this.settings, "storageUsed", 0);
      this.refreshUploadedFiles();
      this.persistSettings();
      this.pulse("缓存清理完成");
    },
    persistSettings() {
      try {
        window.localStorage.setItem("qxin_settings", JSON.stringify(this.settings));
      } catch (error) {
        // 本地存储不可用时仍尝试后端保存
      }
      if (!this.token || this.settingsSaving) {
        if (!this.token) {
          this.pulse("设置已保存到本地");
        }
        return;
      }
      this.settingsSaving = true;
      saveSettings(this.settings, this.token)
        .then((payload) => {
          if (payload && payload.settings) {
            this.settings = Object.assign({}, this.settings, payload.settings);
            this.applyAppearance();
          }
          this.pulse("设置已保存");
        })
        .catch((error) => this.pulse(error.message || "设置保存失败"))
        .finally(() => {
          this.settingsSaving = false;
        });
    },
    editAdminArticle(row) {
      if (!row) {
        return;
      }
      const article = row.article || this.articles.find((item) => item.id === row.id || item.title === row.title);
      if (!article) {
        this.pulse("未找到要编辑的文章");
        return;
      }
      this.editingArticleId = article.id;
      this.publishForm = {
        title: article.title,
        tags: (article.tags || []).join("，"),
        category: article.category,
        summary: article.summary,
        content: article.content || article.summary,
        visibility: article.status === "draft" ? "private" : "public"
      };
      this.navigate("publish");
      this.pulse("已载入文章，可继续编辑");
    },
    openArticleFromAdmin(row) {
      if (!row) {
        return;
      }
      this.currentArticleId = row.id;
      this.activeCategory = "全部";
      this.newsView = "detail";
      this.navigate("news");
    },
    removeAdminArticle(row) {
      if (!row) return;
      this.deleteTarget = row;
      this.showDeleteConfirm = true;
    },
    confirmDeleteArticle() {
      const row = this.deleteTarget;
      if (!row) return;
      const id = row.id;
      this.showDeleteConfirm = false;
      this.deleteTarget = null;
      // Optimistic remove from list
      this.articles = this.articles.filter(a => a.id !== id);
      this.adminRows = this.adminRows.filter(r => r.id !== id);
      this.refreshAdminFromLocal();
      if (this.currentArticleId === id && this.featuredArticle) {
        this.currentArticleId = this.featuredArticle.id;
      }
      if (this.token && id && String(id).indexOf("local-") !== 0 && String(id).indexOf("local-news-") !== 0) {
        deleteNews(id, this.token)
          .then(() => this.loadAdminData(true))
          .catch(err => this.pulse(err.message || "后端删除失败，已从列表移除"));
      }
      this.pulse("《" + (row.title || "未命名") + "》已删除");
    },
    loadAdminData(force) {
      if (!this.token || !this.isAdmin || (this.adminLoading && !force)) {
        this.refreshAdminFromLocal();
        return;
      }
      this.adminLoading = true;
      Promise.all([
        fetchStats(this.token).catch(() => null),
        fetchNewsList({ page: 1, pageSize: 8, status: "all" }, this.token).catch(() => null),
        fetchAuditLogs(8, this.token).catch(() => null)
      ])
        .then(([stats, newsPayload, logs]) => {
          if (stats) {
            const totalNews = stats.totalNews || stats.newsTotal || stats.news || (stats.perCategory || []).reduce((sum, item) => sum + Number(item.newsCount || 0), 0);
            const authorCount = stats.totalAuthors || (stats.perAuthor || []).length;
            const categoryCount = stats.totalCategories || (stats.perCategory || []).length;
            this.adminStats = [
              { label: "文章总数", value: String(totalNews), note: "来自数据库统计", icon: "news" },
              { label: "创作者数", value: String(authorCount), note: "来自数据库统计", icon: "users" },
              { label: "分类数", value: String(categoryCount), note: "来自数据库统计", icon: "about" },
              { label: "系统状态", value: "正常", note: "接口可访问", icon: "setting" }
            ];
            if (Array.isArray(stats.perCategory) && stats.perCategory.length) {
              const remoteCounts = {};
              stats.perCategory.forEach(function(item) {
                remoteCounts[item.categoryName] = item.newsCount;
              });
              this.adminCategories = this.newsCategories.slice(2).map(function(name) {
                return { name, count: remoteCounts[name] || 0 };
              });
            }
            this.userGrowth = Array.isArray(stats.userGrowth) ? stats.userGrowth : [];
          }
          const list = Array.isArray(newsPayload) ? newsPayload : (newsPayload && (newsPayload.data || newsPayload.list || newsPayload.items)) || [];
          if (list.length) {
            this.adminRows = list.map((item, index) => this.buildAdminRow(this.normalizeNewsItem(item, index)));
            this.refreshAdminCategoriesFromRows();
          }
          if (Array.isArray(logs) && logs.length) {
            this.auditLogs = logs.map((log) => ({
              user: log.username || log.admin || log.user || "admin",
              text: log.action || log.text || "更新了内容",
              time: log.createdAt || log.time || "",
              avatar: this.avatars.elder
            }));
          }
        })
        .finally(() => {
          if (!this.adminRows.length || !this.adminCategories.length) {
            this.refreshAdminFromLocal();
          }
          this.adminLoading = false;
        });
    },
    loadAboutInfo() {
      fetchAbout()
        .then((payload) => {
          this.aboutInfo = payload;
        })
        .catch(function() {});
      this.testDbConnection();
    },
    async testDbConnection() {
      this.testingDb = true;
      this.dbTestResult = { mysql: null, mysqlError: "", mysqlLatency: 0, redis: null, redisError: "", redisLatency: 0 };
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        if (data.mysql) {
          this.dbTestResult.mysql = data.mysql.ready;
          this.dbTestResult.mysqlError = data.mysql.error || "";
          this.dbTestResult.mysqlLatency = data.mysql.latency || 0;
        }
        if (data.redis) {
          this.dbTestResult.redis = data.redis.ready;
          this.dbTestResult.redisError = data.redis.error || "";
          this.dbTestResult.redisLatency = data.redis.latency || 0;
        }
      } catch (err) {
        this.dbTestResult.mysql = false;
        this.dbTestResult.mysqlError = err.message || "请求失败";
        this.dbTestResult.redis = false;
        this.dbTestResult.redisError = err.message || "请求失败";
      }
      this.testingDb = false;
    },
    loadNewsFromApi() {
      fetchNewsList({ page: 1, pageSize: 12 }, this.token)
        .then((payload) => {
          const list = Array.isArray(payload) ? payload : (payload && (payload.data || payload.list || payload.items)) || [];
          if (!list.length) {
            this.refreshAdminFromLocal();
            return;
          }
          this.articles = list.map((item, index) => this.normalizeNewsItem(item, index));
          this.refreshAdminFromLocal();
        })
        .catch(() => {
          this.refreshAdminFromLocal();
        });
    }
  }
};
</script>







