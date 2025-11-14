<template>
  <div class="news-center" :class="{'admin-mode': viewMode === 'admin'}">
    <div class="news-side" v-if="viewMode !== 'admin'">
      <div class="news-header">
  <input v-model="filters.keyword" placeholder="搜索关键词" class="news-input" @keyup.enter="applyFilters" />
  <select v-model="filters.categoryId" class="news-select" @change="applyFilters">
          <option value="">全部分类</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
  <select v-model="filters.sort" class="news-select" @change="applyFilters">
          <option value="newest">按时间(新->旧)</option>
          <option value="oldest">按时间(旧->新)</option>
          <option value="hot">按热度</option>
          <option value="commented">按评论</option>
        </select>
  <button class="news-button" @click="applyFilters">筛选</button>
        <button class="news-button primary" @click="startCreate" v-if="token">发布新闻</button>
      </div>
      <div class="news-hot" v-if="hotNews.length">
        <h4>热门新闻</h4>
        <ul>
          <li v-for="item in hotNews" :key="`hot-${item.id}`" @click="openDetail(item.id)">
            <span class="title">{{ item.title }}</span>
            <span class="metric">🔥 {{ item.score ? item.score.toFixed(0) : item.viewCount }}</span>
          </li>
        </ul>
      </div>
      <div class="news-hot" v-if="recentNews.length">
        <h4>最新发布</h4>
        <ul>
          <li v-for="item in recentNews" :key="`recent-${item.id}`" @click="openDetail(item.id)">
            <span class="title">{{ item.title }}</span>
            <span class="metric">{{ formatDate(item.publishedAt) }}</span>
          </li>
        </ul>
      </div>
    </div>
  <div class="news-main" :class="{'admin-main': viewMode === 'admin'}">
      <div v-if="viewMode === 'list'" class="news-list">
        <div v-if="articles.length === 0" class="news-empty">暂无符合条件的新闻</div>
        <div v-for="item in articles" :key="item.id" class="news-card" @click="openDetail(item.id)">
          <div class="news-card-cover" v-if="item.coverImage">
            <img :src="item.coverImage" alt="cover" />
          </div>
          <div class="news-card-body">
            <div class="news-card-title">{{ item.title }}</div>
            <div class="news-card-meta">
              <span>{{ formatDate(item.publishedAt) }}</span>
              <span>作者: {{ item.author }}</span>
              <span>分类: {{ item.categoryName }}</span>
              <span>阅读: {{ item.viewCount || 0 }}</span>
              <span>评论: {{ item.commentCount || 0 }}</span>
            </div>
            <div class="news-card-summary">{{ item.summary || '暂无摘要' }}</div>
          </div>
        </div>
        <div class="news-pagination" v-if="pagination.total > pagination.pageSize">
          <button class="news-button" :disabled="pagination.page === 1" @click="changePage(pagination.page - 1)">上一页</button>
          <span>第 {{ pagination.page }} / {{ totalPages }} 页</span>
          <button class="news-button" :disabled="pagination.page >= totalPages" @click="changePage(pagination.page + 1)">下一页</button>
        </div>
      </div>
      <div v-else-if="viewMode === 'detail' && currentArticle" class="news-detail">
        <div class="detail-header">
          <h2>{{ currentArticle.title }}</h2>
          <div class="detail-meta">
            <span>{{ formatDate(currentArticle.publishedAt) }}</span>
            <span>作者: {{ currentArticle.author }}</span>
            <span>分类: {{ currentArticle.categoryName }}</span>
            <span>阅读: {{ currentArticle.viewCount || 0 }}</span>
            <span>评论: {{ currentArticle.commentCount || 0 }}</span>
          </div>
          <div class="detail-actions">
            <button class="news-button" @click="backToList">返回列表</button>
            <button class="news-button" v-if="canEdit" @click="startEdit">编辑</button>
            <button class="news-button danger" v-if="canEdit" @click="confirmDelete">删除</button>
          </div>
        </div>
        <div class="detail-content" v-html="currentArticle.content"></div>
        <div class="detail-attachments" v-if="attachments.length">
          <h4>附件</h4>
          <ul>
            <li v-for="file in attachments" :key="file.id">
              <a :href="file.filePath" target="_blank" rel="noopener">{{ file.filename }}</a>
              <span class="size">{{ formatSize(file.fileSize) }}</span>
            </li>
          </ul>
        </div>
        <div class="detail-comments">
          <h4>评论 ({{ comments.pagination.total }})</h4>
          <div class="comment-box" v-if="token">
            <textarea v-model="newComment" placeholder="输入评论内容"></textarea>
            <button class="news-button primary" @click="submitComment" :disabled="!newComment.trim()">发表评论</button>
          </div>
          <div v-else class="news-empty">登录后可参与评论</div>
          <div class="comment-list">
            <div class="comment-item" v-for="item in comments.data" :key="item.id">
              <div class="comment-author">
                <span>{{ item.username }}</span>
                <span>{{ formatDate(item.createdAt) }}</span>
                <button class="news-button danger" v-if="canDeleteComment(item)" @click="deleteComment(item)">删除</button>
              </div>
              <div class="comment-content">{{ item.content }}</div>
            </div>
          </div>
          <div class="news-pagination" v-if="comments.pagination.total > comments.pagination.pageSize">
            <button class="news-button" :disabled="comments.pagination.page === 1" @click="changeCommentPage(comments.pagination.page - 1)">上一页</button>
            <span>第 {{ comments.pagination.page }} / {{ commentTotalPages }} 页</span>
            <button class="news-button" :disabled="comments.pagination.page >= commentTotalPages" @click="changeCommentPage(comments.pagination.page + 1)">下一页</button>
          </div>
        </div>
      </div>
  <div v-else-if="(viewMode === 'create' || viewMode === 'edit')" class="news-editor">
        <h2>{{ viewMode === 'create' ? '发布新闻' : '编辑新闻' }}</h2>
        <div class="editor-form">
          <label>标题</label>
          <input v-model="editorForm.title" class="news-input" />
          <label>分类</label>
          <select v-model="editorForm.categoryId" class="news-select" :disabled="!categories.length">
            <option disabled value="">
              {{ categories.length ? '请选择分类' : '暂无分类，请先在管理后台创建' }}
            </option>
            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
          <label>封面图</label>
          <div class="editor-upload">
            <label class="upload-control">
              <input type="file" class="file-input" @change="onCoverUpload" accept="image/*" />
              <div class="upload-text">
                <strong>选择封面</strong>
                <span>支持 PNG/JPG，大小 &lt; 5MB</span>
              </div>
            </label>
            <div class="upload-meta" v-if="coverFileName || editorForm.coverImage">
              <span class="file-name">{{ coverFileName || '已上传封面' }}</span>
              <button type="button" class="upload-remove" @click="clearCover">移除</button>
            </div>
            <div class="preview" v-if="editorForm.coverImage">
              <img :src="editorForm.coverImage" alt="cover" />
            </div>
          </div>
          <label>摘要</label>
          <textarea v-model="editorForm.summary" rows="3"></textarea>
          <label>正文 (支持HTML)</label>
          <textarea v-model="editorForm.content" rows="10"></textarea>
          <label>附件 (pdf/txt)</label>
          <div class="editor-upload">
            <label class="upload-control">
              <input type="file" class="file-input" multiple @change="onAttachmentUpload" accept=".pdf,.txt" />
              <div class="upload-text">
                <strong>上传附件</strong>
                <span>支持 PDF / TXT，可多选</span>
              </div>
            </label>
            <ul class="attachment-list" v-if="editorForm.attachments.length">
              <li v-for="file in editorForm.attachments" :key="file.filePath">
                {{ file.filename }}
                <button class="news-button danger" @click="removeAttachment(file)">移除</button>
              </li>
            </ul>
            <div class="upload-hint" v-else>暂无附件</div>
          </div>
          <div class="editor-actions">
            <button class="news-button" @click="backToList">取消</button>
            <button class="news-button primary" @click="submitEditor">保存</button>
          </div>
        </div>
      </div>
      <div v-else-if="viewMode === 'admin'" class="news-admin">
        <div class="admin-toolbar">
          <div class="toolbar-group">
            <button class="news-button" @click="backToList">返回</button>
            <button class="news-button primary" @click="startCreateCategory">新增分类</button>
          </div>
          <div class="toolbar-group">
            <button class="news-button" :disabled="isBackingUp" @click="triggerBackup">
              {{ isBackingUp ? '备份中...' : '立即备份' }}
            </button>
            <button
              class="news-button danger"
              :disabled="!backupInfo || !backupInfo.exists || isRestoring"
              @click="triggerRestore"
            >
              {{ isRestoring ? '恢复中...' : '恢复数据' }}
            </button>
            <button
              v-if="isRoot"
              class="news-button primary"
              :disabled="isSeeding"
              @click="triggerSeed"
            >
              {{ isSeeding ? '生成中...' : '生成测试数据' }}
            </button>
            <button
              class="news-button danger"
              v-if="isRoot"
              :disabled="isResetting"
              @click="triggerReset"
            >
              {{ isResetting ? '清空中...' : '清空测试数据' }}
            </button>
          </div>
        </div>
        <div class="admin-section admin-card backup-card">
          <h3>备份状态</h3>
          <div class="backup-info">
            <div class="backup-line">
              <span v-if="backupInfo && backupInfo.exists">
                上次备份：{{ formatDate(backupInfo.createdAt) }} · {{ backupInfo.adminName || '未知' }} · {{ formatSize(backupInfo.size || 0) }}
              </span>
              <span v-else>尚未生成备份</span>
            </div>
            <div class="backup-line" v-if="backupInfo && backupInfo.lastRestoreAt">
              上次恢复：{{ formatDate(backupInfo.lastRestoreAt) }} · {{ backupInfo.lastRestoreAdminName || '未知' }}
            </div>
          </div>
        </div>
        <div class="admin-section admin-card">
          <h3>文章管理</h3>
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 50px;">ID</th>
                <th>标题</th>
                <th style="width: 120px;">分类</th>
                <th style="width: 120px;">作者</th>
                <th style="width: 140px;">发布时间</th>
                <th style="width: 140px;">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="article in articles" :key="`admin-article-${article.id}`">
                <td>{{ article.id }}</td>
                <td class="table-title" @click="openDetail(article.id)">{{ article.title }}</td>
                <td>{{ article.categoryName }}</td>
                <td>{{ article.author }}</td>
                <td>{{ formatDate(article.publishedAt) }}</td>
                <td class="admin-actions">
                  <button class="news-button" @click="editArticle(article)">编辑</button>
                  <button class="news-button danger" @click="deleteArticle(article)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="admin-pagination" v-if="pagination.total > pagination.pageSize">
            <button class="news-button" :disabled="pagination.page === 1" @click="changePage(pagination.page - 1)">上一页</button>
            <span>第 {{ pagination.page }} / {{ totalPages }} 页</span>
            <button class="news-button" :disabled="pagination.page >= totalPages" @click="changePage(pagination.page + 1)">下一页</button>
          </div>
        </div>
        <div class="admin-section admin-card">
          <h3>分类管理</h3>
          <table class="admin-table admin-table--compact">
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>描述</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="category in categories" :key="category.id">
                <td>{{ category.id }}</td>
                <td>
                  <input v-model="category.editName" class="news-input" />
                </td>
                <td>
                  <input v-model="category.editDescription" class="news-input" />
                </td>
                <td class="admin-actions">
                  <button class="news-button primary" @click="saveCategory(category)">保存</button>
                  <button class="news-button danger" @click="removeCategory(category)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="admin-section admin-card">
          <h3>操作日志</h3>
          <div class="log-list">
            <div v-for="item in auditLogs" :key="item.id" class="log-item">
              <span>{{ formatDate(item.createdAt) }}</span>
              <span>{{ item.admin || '系统' }}</span>
              <span>{{ item.action }}</span>
              <span>{{ item.targetType }}#{{ item.targetId }}</span>
            </div>
          </div>
        </div>
        <div class="admin-section admin-card" v-if="stats">
          <h3>统计概览</h3>
          <div class="heatmap-wrapper">
            <div class="heatmap-block">
              <strong>分类热力</strong>
              <div class="heatmap" v-if="stats.perCategory && stats.perCategory.length">
                <div
                  v-for="item in stats.perCategory"
                  :key="`stat-cat-${item.categoryId}`"
                  class="heat-cell"
                  :style="getHeatStyle(item.newsCount, maxCategoryCount)"
                  :title="`${item.categoryName}: ${item.newsCount} 条`"
                >
                  <span class="heat-label">{{ item.categoryName }}</span>
                  <span class="heat-value">{{ item.newsCount }}</span>
                </div>
              </div>
              <div class="heat-empty" v-else>暂无分类数据</div>
            </div>
            <div class="heatmap-block">
              <strong>作者热力 (TOP50)</strong>
              <div class="heatmap" v-if="stats.perAuthor && stats.perAuthor.length">
                <div
                  v-for="item in stats.perAuthor"
                  :key="`stat-author-${item.userId}`"
                  class="heat-cell"
                  :style="getHeatStyle(item.newsCount, maxAuthorCount)"
                  :title="`${item.username}: ${item.newsCount} 条`"
                >
                  <span class="heat-label">{{ item.username }}</span>
                  <span class="heat-value">{{ item.newsCount }}</span>
                </div>
              </div>
              <div class="heat-empty" v-else>暂无作者数据</div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="news-empty">请选择新闻或使用左侧筛选</div>
    </div>
  </div>
</template>

<script>
import {
  fetchNewsList,
  fetchNewsDetail,
  fetchCategories,
  fetchComments,
  createComment,
  deleteComment as deleteCommentApi,
  fetchHotNews,
  fetchRecentNews,
  createNews,
  updateNews,
  deleteNews,
  incrementView,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchAuditLogs,
  fetchStats,
  fetchProfile,
  fetchBackupInfo,
  backupNews,
  restoreNews,
  resetNews,
  seedNews
} from '../../services/newsApi';

export default {
  name: 'NewsCenter',
  props: {
    token: {
      type: String,
      default: ''
    },
    currentUser: {
      type: Object,
      default: () => ({})
    },
    defaultView: {
      type: String,
      default: 'list'
    }
  },
  data() {
    return {
      filters: {
        keyword: '',
        categoryId: '',
        sort: 'newest',
        page: 1,
        pageSize: 10
      },
      defaultPageSize: 10,
      adminPageSize: 5,
      articles: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0
      },
      categories: [],
      hotNews: [],
      recentNews: [],
  viewMode: this.defaultView,
      currentArticle: null,
      attachments: [],
      comments: {
        data: [],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 0
        }
      },
      newComment: '',
      editorForm: {
        id: null,
        title: '',
        summary: '',
        content: '',
        categoryId: '',
        coverImage: '',
        attachments: []
      },
      coverFileName: '',
      auditLogs: [],
      stats: null,
      profile: null,
      backupInfo: null,
      isBackingUp: false,
      isRestoring: false,
      isResetting: false,
      isSeeding: false
    };
  },
  computed: {
    totalPages() {
      return Math.max(1, Math.ceil(this.pagination.total / this.pagination.pageSize));
    },
    commentTotalPages() {
      return Math.max(1, Math.ceil(this.comments.pagination.total / this.comments.pagination.pageSize));
    },
    canEdit() {
      if (!this.currentArticle || !this.profile) {
        return false;
      }
      return this.isAdmin || this.profile.id === this.currentArticle.authorId;
    },
    isAdmin() {
      return this.profile && this.profile.role === 'admin';
    },
    isRoot() {
      return this.profile && this.profile.username === 'root';
    },
    maxCategoryCount() {
      if (!this.stats || !Array.isArray(this.stats.perCategory) || !this.stats.perCategory.length) {
        return 0;
      }
      return Math.max(...this.stats.perCategory.map(item => Number(item.newsCount) || 0));
    },
    maxAuthorCount() {
      if (!this.stats || !Array.isArray(this.stats.perAuthor) || !this.stats.perAuthor.length) {
        return 0;
      }
      return Math.max(...this.stats.perAuthor.map(item => Number(item.newsCount) || 0));
    }
  },
  watch: {
    token: {
      immediate: true,
      async handler(newToken) {
        if (newToken) {
          await this.loadProfile();
          if (this.viewMode === 'admin' && this.isAdmin) {
            await Promise.all([this.loadAudit(), this.loadBackupInfo()]);
          } else if (!this.isAdmin) {
            this.backupInfo = null;
          }
        } else {
          this.profile = null;
          this.backupInfo = null;
        }
      }
    },
    defaultView: {
      immediate: true,
      handler(newView) {
        this.applyViewMode(newView);
      }
    }
  },
  mounted() {
    this.init();
  },
  methods: {
    async init() {
      try {
        await Promise.all([this.loadCategories(), this.loadArticles(), this.loadHot(), this.loadRecent()]);
        if (this.viewMode === 'admin' && this.token) {
          await Promise.all([this.loadAudit(), this.loadBackupInfo()]);
        }
      } catch (err) {
        console.warn('Failed to initialise news data', err.message);
      }
    },
    applyViewMode(mode) {
      if (!mode) {
        return;
      }
      if (this.viewMode !== mode) {
        this.viewMode = mode;
      }
      if (mode === 'admin' && this.token) {
        let needReload = false;
        if (this.filters.pageSize !== this.adminPageSize) {
          this.filters.pageSize = this.adminPageSize;
          this.filters.page = 1;
          needReload = true;
        }
        if (needReload) {
          this.loadArticles();
        }
        this.loadAudit();
        this.loadBackupInfo();
      } else if (mode !== 'admin') {
        let needReload = false;
        if (this.filters.pageSize !== this.defaultPageSize) {
          this.filters.pageSize = this.defaultPageSize;
          this.filters.page = 1;
          needReload = true;
        }
        if (needReload) {
          this.loadArticles();
        }
        this.backupInfo = null;
      }
    },
    applyFilters() {
      this.filters.page = 1;
      this.loadArticles();
    },
    async loadProfile() {
      try {
        this.profile = await fetchProfile(this.token);
        if (this.viewMode === 'admin' && this.isAdmin) {
          await Promise.all([this.loadAudit(), this.loadBackupInfo()]);
        } else if (!this.isAdmin) {
          this.backupInfo = null;
        }
      } catch (err) {
        console.warn('Failed to load profile', err.message);
        this.profile = null;
        this.backupInfo = null;
      }
    },
    async loadCategories() {
      try {
        const data = await fetchCategories();
        this.categories = data.map(item => ({
          ...item,
          editName: item.name,
          editDescription: item.description || ''
        }));
        if (!this.editorForm.categoryId && this.categories.length) {
          this.editorForm.categoryId = this.categories[0].id;
        }
        if (this.filters.categoryId && !this.categories.some(cat => cat.id === this.filters.categoryId)) {
          this.filters.categoryId = '';
        }
      } catch (err) {
        console.warn('Failed to load categories', err.message);
        this.categories = [];
        this.editorForm.categoryId = '';
      }
    },
    async loadArticles() {
      try {
        const params = { ...this.filters };
        const payload = await fetchNewsList(params, this.token);
        this.articles = payload.data;
        this.pagination = payload.pagination;
      } catch (err) {
        console.warn('Failed to load articles', err.message);
        this.articles = [];
        this.pagination = {
          page: this.filters.page,
          pageSize: this.filters.pageSize,
          total: 0
        };
      }
    },
    async loadHot() {
      try {
        this.hotNews = await fetchHotNews(10);
      } catch (err) {
        console.warn('Failed to load hot news', err.message);
        this.hotNews = [];
      }
    },
    async loadRecent() {
      try {
        this.recentNews = await fetchRecentNews(10);
      } catch (err) {
        console.warn('Failed to load recent news', err.message);
        this.recentNews = [];
      }
    },
    changePage(page) {
      this.filters.page = page;
      this.loadArticles();
    },
    async openDetail(id) {
      const loaded = await this.fetchArticle(id);
      if (!loaded) {
        return;
      }
      this.viewMode = 'detail';
      this.comments.pagination.page = 1;
      await Promise.all([
        this.loadComments(),
        this.incrementViewCount()
      ]);
    },
    async fetchArticle(id) {
      const data = await fetchNewsDetail(id, this.token);
      if (!data) {
        return false;
      }
      this.currentArticle = data;
      this.attachments = data.attachments || [];
      return true;
    },
    async loadComments() {
      if (!this.currentArticle) {
        return;
      }
      const payload = await fetchComments(
        this.currentArticle.id,
        {
          page: this.comments.pagination.page,
          pageSize: this.comments.pagination.pageSize
        },
        this.token
      );
      this.comments = payload;
    },
    changeCommentPage(page) {
      this.comments.pagination.page = page;
      this.loadComments();
    },
    async submitComment() {
      if (!this.newComment.trim() || !this.currentArticle) {
        return;
      }
      try {
        await createComment(this.currentArticle.id, this.newComment.trim(), this.token);
        this.newComment = '';
        await Promise.all([
          this.loadComments(),
          this.loadArticles(),
          this.refreshCurrentArticle(),
          this.loadHot()
        ]);
      } catch (err) {
        window.alert(err.message || '发表评论失败');
      }
    },
    canDeleteComment(comment) {
      if (!this.profile) {
        return false;
      }
      return this.isAdmin || comment.userId === this.profile.id;
    },
    async deleteComment(comment) {
      if (!this.currentArticle) {
        return;
      }
      try {
        await deleteCommentApi(this.currentArticle.id, comment.id, this.token);
        await Promise.all([
          this.loadComments(),
          this.loadArticles(),
          this.refreshCurrentArticle(),
          this.loadHot()
        ]);
      } catch (err) {
        window.alert(err.message || '删除评论失败');
      }
    },
    backToList() {
      this.viewMode = 'list';
      this.currentArticle = null;
      this.editorForm.id = null;
      this.coverFileName = '';
    },
    async startCreate() {
      if (!this.categories.length) {
        await this.loadCategories();
      }
      this.viewMode = 'create';
      this.editorForm = {
        id: null,
        title: '',
        summary: '',
        content: '',
        categoryId: this.categories.length ? this.categories[0].id : '',
        coverImage: '',
        attachments: []
      };
      this.coverFileName = '';
    },
    async startEdit() {
      if (!this.currentArticle) {
        return;
      }
      if (!this.categories.length) {
        await this.loadCategories();
      }
      this.viewMode = 'edit';
      this.editorForm = {
        id: this.currentArticle.id,
        title: this.currentArticle.title,
        summary: this.currentArticle.summary || '',
        content: this.currentArticle.content,
        categoryId: this.currentArticle.categoryId,
        coverImage: this.currentArticle.coverImage,
        attachments: (this.attachments || []).map(item => ({ ...item }))
      };
      this.coverFileName = this.extractFileName(this.currentArticle.coverImage);
    },
    async submitEditor() {
      const payload = {
        title: this.editorForm.title,
        summary: this.editorForm.summary,
        content: this.editorForm.content,
        categoryId: this.editorForm.categoryId,
        coverImage: this.editorForm.coverImage,
        attachments: this.editorForm.attachments
      };
      try {
        if (this.viewMode === 'create') {
          await createNews(payload, this.token);
        } else {
          await updateNews(this.editorForm.id, payload, this.token);
        }
        await Promise.all([this.loadArticles(), this.loadHot(), this.loadRecent()]);
        this.viewMode = 'list';
        this.coverFileName = '';
        window.alert('新闻已保存');
      } catch (err) {
        window.alert(err.message || '保存新闻失败');
      }
    },
    async confirmDelete() {
      if (!this.currentArticle) {
        return;
      }
      if (!window.confirm('确认删除该新闻吗？')) {
        return;
      }
      try {
        await deleteNews(this.currentArticle.id, this.token);
        await Promise.all([this.loadArticles(), this.loadHot(), this.loadRecent()]);
        this.backToList();
        window.alert('新闻已删除');
      } catch (err) {
        window.alert(err.message || '删除新闻失败');
      }
    },
    async deleteArticle(article) {
      if (!article || !article.id) {
        return;
      }
      if (!window.confirm(`确定删除《${article.title}》吗？`)) {
        return;
      }
      try {
        await deleteNews(article.id, this.token);
        await Promise.all([this.loadArticles(), this.loadHot(), this.loadRecent()]);
        if (this.viewMode === 'admin') {
          await this.loadAudit();
        }
        window.alert('新闻已删除');
      } catch (err) {
        window.alert(err.message || '删除新闻失败');
      }
    },
    async editArticle(article) {
      if (!article || !article.id) {
        return;
      }
      const loaded = await this.fetchArticle(article.id);
      if (loaded) {
        await this.startEdit();
      }
    },
    async onCoverUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }
      try {
        const data = await this.uploadFile(file);
        this.editorForm.coverImage = data.filePath;
        this.coverFileName = file.name;
      } catch (err) {
        window.alert('封面上传失败');
      } finally {
        event.target.value = '';
      }
    },
    async onAttachmentUpload(event) {
      const files = Array.from(event.target.files || []);
      if (!files.length) {
        return;
      }
      for (const file of files) {
        try {
          const data = await this.uploadFile(file);
          this.editorForm.attachments.push({
            filename: data.filename || file.name,
            filePath: data.filePath,
            fileType: file.type,
            fileSize: data.size || file.size
          });
        } catch (err) {
          window.alert(`附件 ${file.name} 上传失败`);
        }
      }
      event.target.value = '';
    },
    removeAttachment(file) {
      this.editorForm.attachments = this.editorForm.attachments.filter(item => item.filePath !== file.filePath);
    },
    clearCover() {
      this.editorForm.coverImage = '';
      this.coverFileName = '';
    },
    extractFileName(path) {
      if (!path) {
        return '';
      }
      const segments = path.split('/');
      const raw = segments[segments.length - 1] || '';
      try {
        return decodeURIComponent(raw) || raw;
      } catch (err) {
        return raw;
      }
    },
    async refreshCurrentArticle() {
      if (!this.currentArticle) {
        return;
      }
      await this.fetchArticle(this.currentArticle.id);
    },
    async incrementViewCount() {
      if (!this.currentArticle) {
        return;
      }
      try {
        await incrementView(this.currentArticle.id);
      } catch (err) {
        console.warn('Failed to increment view', err.message);
      }
    },
    switchAdmin() {
      this.applyViewMode('admin');
    },
    async loadAudit() {
      if (!this.token) {
        return;
      }
      try {
        this.auditLogs = await fetchAuditLogs(200, this.token);
      } catch (err) {
        console.warn('Failed to load audit log', err.message);
        this.auditLogs = [];
      }
      try {
        this.stats = await fetchStats(this.token);
      } catch (err) {
        console.warn('Failed to load stats', err.message);
        this.stats = null;
      }
    },
    async loadBackupInfo() {
      if (!this.token || !this.isAdmin) {
        this.backupInfo = null;
        return;
      }
      try {
        this.backupInfo = await fetchBackupInfo(this.token);
      } catch (err) {
        console.warn('Failed to load backup info', err.message);
        this.backupInfo = null;
      }
    },
    async triggerBackup() {
      if (!this.token || !this.isAdmin || this.isBackingUp) {
        return;
      }
      this.isBackingUp = true;
      try {
        const info = await backupNews(this.token);
        this.backupInfo = info;
        await this.loadAudit();
        window.alert('备份完成');
      } catch (err) {
        window.alert(err.message || '备份失败');
      } finally {
        this.isBackingUp = false;
      }
    },
    async triggerRestore() {
      if (!this.token || !this.isAdmin || this.isRestoring) {
        return;
      }
      if (!this.backupInfo || !this.backupInfo.exists) {
        window.alert('尚未生成备份');
        return;
      }
      if (!window.confirm('确认恢复到最近一次备份吗？该操作会覆盖当前新闻数据。')) {
        return;
      }
      this.isRestoring = true;
      try {
        await restoreNews(this.token);
        await Promise.all([
          this.loadCategories(),
          this.loadArticles(),
          this.loadHot(),
          this.loadRecent(),
          this.loadAudit()
        ]);
        await this.loadBackupInfo();
        this.backToList();
        window.alert('数据已根据备份恢复');
      } catch (err) {
        window.alert(err.message || '恢复失败');
      } finally {
        this.isRestoring = false;
      }
    },
    async triggerReset() {
      if (!this.token || !this.isAdmin || this.isResetting) {
        return;
      }
      if (!this.isRoot) {
        window.alert('仅 root 用户可执行该操作');
        return;
      }
      if (!window.confirm('确定清空所有测试数据吗？该操作不可撤销。')) {
        return;
      }
      this.isResetting = true;
      try {
        this.filters.page = 1;
        await resetNews(this.token);
        await Promise.all([
          this.loadCategories(),
          this.loadArticles(),
          this.loadHot(),
          this.loadRecent()
        ]);
        await Promise.all([this.loadAudit(), this.loadBackupInfo()]);
        this.backToList();
        window.alert('所有测试数据已清空');
      } catch (err) {
        window.alert(err.message || '清空失败');
      } finally {
        this.isResetting = false;
      }
    },
    async triggerSeed() {
      if (!this.token || !this.isAdmin || this.isSeeding) {
        return;
      }
      if (!this.isRoot) {
        window.alert('仅 root 用户可执行该操作');
        return;
      }
      if (!window.confirm('将生成示例数据并覆盖当前内容，是否继续？')) {
        return;
      }
      this.isSeeding = true;
      try {
        this.filters.page = 1;
        await seedNews(this.token, {});
        await Promise.all([
          this.loadCategories(),
          this.loadArticles(),
          this.loadHot(),
          this.loadRecent()
        ]);
        await Promise.all([this.loadAudit(), this.loadBackupInfo()]);
        this.backToList();
        window.alert('测试数据已生成');
      } catch (err) {
        window.alert(err.message || '生成测试数据失败');
      } finally {
        this.isSeeding = false;
      }
    },
    startCreateCategory() {
      this.categories.push({
        id: `temp-${Date.now()}`,
        name: '',
        description: '',
        editName: '',
        editDescription: ''
      });
    },
    async saveCategory(category) {
      const payload = {
        name: category.editName,
        description: category.editDescription
      };
      if (!payload.name) {
        window.alert('分类名称不能为空');
        return;
      }
      if (String(category.id).startsWith('temp-')) {
        const response = await createCategory(payload, this.token);
        category.id = response.id;
      } else {
        await updateCategory(category.id, payload, this.token);
      }
      await Promise.all([this.loadCategories(), this.loadArticles()]);
      if (this.viewMode === 'admin') {
        await this.loadAudit();
      }
      window.alert('分类保存成功');
    },
    async removeCategory(category) {
      if (String(category.id).startsWith('temp-')) {
        this.categories = this.categories.filter(item => item !== category);
        return;
      }
      if (!window.confirm('确定删除该分类吗？')) {
        return;
      }
      try {
        await deleteCategory(category.id, this.token);
        await Promise.all([this.loadCategories(), this.loadArticles()]);
        if (this.viewMode === 'admin') {
          await this.loadAudit();
        }
        window.alert('分类已删除');
      } catch (err) {
        window.alert(err.message);
      }
    },
    async uploadFile(file) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/upload/file', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || '文件上传失败');
      }
      return res.json();
    },
    formatDate(date) {
      if (!date) {
        return '';
      }
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    },
    formatSize(bytes) {
      if (!bytes) {
        return '0B';
      }
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = bytes;
      let unitIndex = 0;
      while (size > 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      return `${size.toFixed(1)}${units[unitIndex]}`;
    },
    getHeatStyle(count, max) {
      const value = Number(count) || 0;
      const ceiling = Math.max(Number(max) || 0, 1);
      const ratio = Math.min(value / ceiling, 1);
      const alpha = 0.18 + ratio * 0.6;
      const borderAlpha = Math.max(alpha - 0.1, 0.2);
      return {
        backgroundColor: `rgba(58, 142, 230, ${alpha})`,
        borderColor: `rgba(58, 142, 230, ${borderAlpha})`
      };
    }
  }
};
</script>

<style scoped>
.news-center {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: #fff;
}
.news-center.admin-mode {
  background: #f5f6f8;
}
.news-side {
  width: 240px;
  border-right: 1px solid #e5e7eb;
  padding: 12px;
  box-sizing: border-box;
  overflow-y: auto;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.news-main {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #ffffff;
}
.admin-main {
  padding: 16px 24px;
  background: transparent;
}
.news-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #ffffff;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
.news-button {
  padding: 6px 12px;
  margin-top: 4px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  color: #344054;
  font-weight: 500;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.news-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.news-button.primary {
  background: #3a8ee6;
  color: #fff;
  border-color: #3a8ee6;
}
.news-button.danger {
  background: #f56c6c;
  color: #fff;
  border-color: #f56c6c;
}
.news-button:not(:disabled):hover {
  background: #e5e7eb;
  border-color: #cbd0d8;
}
.news-button.primary:not(:disabled):hover {
  background: #3278c2;
  border-color: #3278c2;
}
.news-button.danger:not(:disabled):hover {
  background: #d95353;
  border-color: #d95353;
}
.news-hot h4 {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2933;
}
.news-hot ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.news-hot li {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  cursor: pointer;
  border-bottom: 1px dashed #d8dee4;
  transition: color 0.15s ease;
}
.news-hot li .title {
  flex: 1;
  margin-right: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.news-hot li .metric {
  color: #999;
  font-size: 12px;
}
.news-hot li:hover {
  color: #3a8ee6;
}
.news-hot {
  background: #ffffff;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e5e7eb;
}
.news-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.news-card {
  display: flex;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: #ffffff;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.news-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
}
.news-card-cover {
  width: 120px;
  height: 100px;
  overflow: hidden;
}
.news-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.news-card-body {
  flex: 1;
  padding: 8px;
  box-sizing: border-box;
}
.news-card-title {
  font-weight: 600;
  font-size: 16px;
  color: #1f2933;
}
.news-card-meta span {
  margin-right: 10px;
  font-size: 12px;
  color: #6b7280;
}
.news-card-summary {
  margin-top: 6px;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.5;
}
.news-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}
.news-empty {
  text-align: center;
  color: #888;
  padding: 20px 0;
}
.news-detail {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.detail-header h2 {
  margin: 0;
}
.detail-meta span {
  margin-right: 10px;
  color: #666;
  font-size: 12px;
}
.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.detail-content {
  padding: 10px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  max-height: 280px;
  overflow-y: auto;
}
.detail-attachments ul {
  list-style: none;
  padding: 0;
}
.detail-attachments li {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.detail-attachments .size {
  color: #999;
  font-size: 12px;
}
.detail-comments textarea {
  width: 100%;
  min-height: 80px;
  padding: 8px;
  box-sizing: border-box;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
.comment-item {
  border-bottom: 1px solid #f0f0f0;
  padding: 8px 0;
}
.comment-author {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #666;
}
.comment-content {
  margin-top: 4px;
  font-size: 14px;
  color: #333;
}
.news-editor textarea {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
.editor-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.news-editor {
  max-width: 720px;
  margin: 0 auto;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}
.news-editor h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2933;
  margin-bottom: 12px;
}
.editor-form {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  gap: 12px;
  border: 1px solid #e5e7eb;
}
.editor-form label {
  font-weight: 600;
  color: #1f2d3d;
  font-size: 14px;
}
.news-input,
.news-select,
.editor-form textarea {
  border: 1px solid #d8dee6;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: #ffffff;
}
.news-input:focus,
.news-select:focus,
.editor-form textarea:focus {
  outline: none;
  border-color: #3a8ee6;
  box-shadow: 0 0 0 2px rgba(58, 142, 230, 0.18);
  background: #ffffff;
}
.editor-upload {
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 12px;
  gap: 10px;
}
.editor-upload {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.editor-upload .file-input {
  display: none;
}
.upload-control {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #d0d7e2;
  border-radius: 6px;
  background: #f8fafc;
  color: #2f5597;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.upload-control::before {
  content: '';
  width: 20px;
  height: 20px;
  background: url('~@/assets/images/selectfile.svg') no-repeat center;
  background-size: contain;
}
.upload-control:hover {
  background-color: #edf2f7;
  border-color: #b9c4d3;
}
.upload-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.upload-text strong {
  font-size: 14px;
  font-weight: 600;
  color: #1f2d3d;
}
.upload-text span {
  font-size: 12px;
  color: #60708c;
}
.upload-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f5f7fa;
  border-radius: 6px;
  padding: 6px 10px;
  border: 1px solid #dce2ec;
  color: #1f2d3d;
  font-size: 13px;
}
.upload-meta .file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 12px;
}
.upload-remove {
  border: none;
  background: none;
  color: #f56c6c;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}
.upload-remove:hover {
  background: rgba(245, 108, 108, 0.16);
}
.upload-hint {
  font-size: 12px;
  color: #7b8da0;
}
.editor-upload img {
  width: 120px;
  height: 80px;
  object-fit: cover;
  border: 1px solid #d8dee4;
  border-radius: 4px;
}
.preview {
  border-radius: 6px;
  overflow: hidden;
  max-width: 200px;
}
.attachment-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.attachment-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: #f7f8fa;
  border: 1px solid #e0e4eb;
  border-radius: 6px;
  font-size: 13px;
  color: #1f2d3d;
}
.editor-actions {
  display: flex;
  gap: 8px;
}
.news-admin .admin-toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.news-admin .admin-toolbar .toolbar-group {
  display: flex;
  gap: 8px;
  align-items: center;
}
.news-admin {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.admin-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(31, 35, 41, 0.04);
  overflow-x: auto;
}
.admin-pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}
.news-admin h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2933;
}
.news-admin .admin-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
  min-width: 680px;
}
.news-admin .admin-table th,
.news-admin .admin-table td {
  border: 1px solid #e0e0e0;
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
  vertical-align: middle;
}
.news-admin .admin-table th {
  background: #f5f7fa;
  font-weight: 600;
  color: #374151;
}
.news-admin .admin-table .table-title {
  cursor: pointer;
  color: #1f2d3d;
}
.news-admin .admin-table .table-title:hover {
  text-decoration: underline;
}
.news-admin .admin-actions {
  display: flex;
  gap: 8px;
}
.news-admin .admin-table--compact td {
  vertical-align: middle;
}
.news-admin .admin-table--compact .news-input {
  width: 100%;
  padding: 4px 8px;
  font-size: 13px;
}
.news-admin .admin-table--compact .admin-actions {
  justify-content: flex-start;
}
.news-admin table thead tr {
  background: #f8f9fb;
}
.news-admin .admin-table input.news-input {
  width: 100%;
  box-sizing: border-box;
  height: 32px;
}
.news-admin table thead th {
  font-weight: 600;
  color: #374151;
}
.news-admin table tbody tr:nth-child(even) {
  background: #fafbfc;
}
.news-admin table {
  width: 100%;
  border-collapse: collapse;
}
.news-admin th,
.news-admin td {
  border: 1px solid #e0e0e0;
  padding: 6px;
  text-align: left;
}
.log-list {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 6px;
}
.log-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #555;
  padding: 4px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.log-item:last-child {
  border-bottom: none;
}
.stats-block {
  margin-top: 10px;
}
.stats-block ul {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  max-height: 120px;
  overflow-y: auto;
}
.stats-block li {
  font-size: 12px;
  color: #555;
  padding: 2px 0;
}
.heatmap-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.heatmap-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.heatmap {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}
.heat-cell {
  border: 1px solid rgba(58, 142, 230, 0.3);
  border-radius: 8px;
  padding: 8px;
  color: #0f172a;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: transform 0.15s ease;
}
.heat-cell:hover {
  transform: translateY(-1px);
}
.heat-label {
  font-size: 13px;
  font-weight: 600;
}
.heat-value {
  font-size: 12px;
  color: #1f2937;
}
.heat-empty {
  font-size: 12px;
  color: #6b7280;
}
.backup-card .backup-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #374151;
}
.backup-card .backup-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
