<template>
  <div class="news-center" :class="{'admin-mode': viewMode === 'admin'}">
    <!-- 优化顶部导航栏，增加视觉层次 -->
    <div class="top-nav" v-if="viewMode === 'list'">
      <div class="nav-container">
        <div class="nav-left">
          <div class="brand-logo">📰</div>
          <h1 class="brand-title">新闻中心</h1>
        </div>
        <div class="nav-actions">
          <button class="action-btn action-btn--primary" @click="startCreate" v-if="token" title="发布新内容">
            <span class="btn-icon">+</span>
            <span class="btn-text">发布</span>
          </button>
          <button class="action-btn" @click="switchAdmin" v-if="isAdmin" title="管理后台">
            <span class="btn-icon">⚙</span>
          </button>
        </div>
      </div>
    </div>

    <div class="news-main" :class="{'admin-main': viewMode === 'admin', 'list-main': viewMode === 'list'}">
      <!-- 列表模式 -->
      <div v-if="viewMode === 'list'" class="news-list-container">
        <!-- 重新设计搜索栏，增加筛选选项 -->
        <div class="search-section">
          <div class="search-bar">
            <img class="search-icon" :src="searchIcon" alt="搜索" loading="lazy" />
            <input 
              v-model="filters.keyword" 
              placeholder="搜索文章标题、作者..." 
              class="search-input"
              @keyup.enter="applyFilters" 
            />
            <button v-if="filters.keyword" class="clear-btn" @click="filters.keyword = ''; applyFilters()">×</button>
          </div>
          <div class="filter-row" v-if="categories.length">
            <button 
              class="filter-chip" 
              :class="{'filter-chip--active': filters.categoryId === '' && !filters.authorId}"
              @click="filters.categoryId = ''; filters.authorId = ''; applyFilters()"
            >
              全部
            </button>
            <button 
              v-for="cat in categories.slice(0, 6)" 
              :key="cat.id"
              class="filter-chip"
              :class="{'filter-chip--active': filters.categoryId === cat.id}"
              @click="filters.categoryId = cat.id; filters.authorId = ''; applyFilters()"
            >
              {{ cat.name }}
            </button>
            <button 
              class="filter-chip" 
              :class="{'filter-chip--active': filters.authorId && profile && filters.authorId === profile.id}"
              @click="toggleMyArticles"
              v-if="token && profile"
            >
              我的文章
            </button>
          </div>
        </div>

        <!-- 优化"常看的号"布局 -->
        <div class="featured-section" v-if="hotNews.length">
          <div class="section-header">
            <h3 class="section-title">热门作者</h3>
            <span class="section-badge">{{ hotNews.length }}</span>
          </div>
          <div class="author-grid">
            <div 
              class="author-card" 
              v-for="item in hotNews.slice(0, 8)" 
              :key="`hot-${item.id}`" 
              @click="openDetail(item.id)"
            >
              <div class="author-avatar" :style="{background: stringToColor(item.author || item.title)}">
                {{ (item.author || item.title).substring(0, 1) }}
              </div>
              <div class="author-info">
                <div class="author-name">{{ (item.author || item.title).substring(0, 8) }}</div>
                <div class="author-meta">{{ item.viewCount || 0 }} 阅读</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 重新设计文章卡片，更清爽的布局 -->
        <div class="articles-section">
          <div class="section-header">
            <h3 class="section-title">最新文章</h3>
            <div class="sort-controls">
              <button 
                class="sort-btn" 
                :class="{'sort-btn--active': filters.sort === 'newest'}"
                @click="filters.sort = 'newest'; applyFilters()"
              >
                最新
              </button>
              <button 
                class="sort-btn" 
                :class="{'sort-btn--active': filters.sort === 'hot'}"
                @click="filters.sort = 'hot'; applyFilters()"
              >
                最热
              </button>
            </div>
          </div>
          
          <div v-if="articles.length === 0" class="empty-state">
            <div class="empty-icon">📭</div>
            <p class="empty-text">暂无文章</p>
          </div>
          
          <div class="article-list">
            <article 
              v-for="item in articles" 
              :key="item.id" 
              class="article-card" 
              @click="openDetail(item.id)"
            >
              <div class="article-header">
                <div class="author-badge">
                  <div class="author-avatar-sm" :style="{background: stringToColor(item.author)}">
                    {{ (item.author || 'A').substring(0, 1) }}
                  </div>
                  <span class="author-name-sm">{{ item.author || '未知作者' }}</span>
                </div>
                <span class="article-time">{{ formatTimeAgo(item.publishedAt) }}</span>
              </div>
              
              <div class="article-body">
                <div class="article-content">
                  <h2 class="article-title">{{ item.title }}</h2>
                  <p class="article-excerpt" v-if="item.summary">{{ item.summary }}</p>
                </div>
                <div class="article-thumbnail" v-if="item.coverImage">
                  <img :src="item.coverImage" :alt="item.title" />
                </div>
              </div>
              
              <div class="article-footer">
                <span class="stat-item">
                  <span class="stat-icon">👁</span>
                  {{ item.viewCount || 0 }}
                </span>
                <span class="stat-item" v-if="item.commentCount > 0">
                  <span class="stat-icon">💬</span>
                  {{ item.commentCount }}
                </span>
                <span class="category-tag" v-if="item.categoryName">{{ item.categoryName }}</span>
              </div>
            </article>
          </div>
          
          <!-- 改进分页样式 -->
          <div class="pagination" v-if="pagination.total > pagination.pageSize">
            <button 
              class="pagination-btn" 
              :disabled="pagination.page === 1" 
              @click="changePage(pagination.page - 1)"
            >
              ← 上一页
            </button>
            <span class="pagination-info">第 {{ pagination.page }} / {{ totalPages }} 页</span>
            <button 
              class="pagination-btn" 
              :disabled="pagination.page >= totalPages" 
              @click="changePage(pagination.page + 1)"
            >
              下一页 →
            </button>
          </div>
        </div>
      </div>

      <!-- 优化详情页设计 -->
      <div v-else-if="viewMode === 'detail' && currentArticle" class="article-detail">
        <div class="detail-container">
          <!-- 返回按钮 -->
          <button class="back-button" @click="backToList">
            <span class="back-icon">←</span>
            <span>返回列表</span>
          </button>
          
          <!-- 文章头部 -->
          <header class="detail-header">
            <h1 class="detail-title">{{ currentArticle.title }}</h1>
            <div class="detail-meta-bar">
              <div class="meta-left">
                <div class="author-badge-lg">
                  <div class="author-avatar-lg" :style="{background: stringToColor(currentArticle.author)}">
                    {{ (currentArticle.author || 'A').substring(0, 1) }}
                  </div>
                  <div class="author-details">
                    <span class="author-name-lg">{{ currentArticle.author }}</span>
                    <span class="publish-date">{{ formatDate(currentArticle.publishedAt) }}</span>
                  </div>
                </div>
              </div>
              <div class="meta-right">
                <span class="view-count">
                  <span class="meta-icon">👁</span>
                  {{ currentArticle.viewCount || 0 }} 阅读
                </span>
              </div>
            </div>
          </header>
          
          <!-- 文章内容 -->
          <div class="detail-content" v-html="currentArticle.content"></div>
          
          <!-- 附件区域 -->
          <div class="attachments-box" v-if="attachments.length">
            <h4 class="attachments-title">📎 附件下载</h4>
            <ul class="attachments-list">
              <li v-for="file in attachments" :key="file.id" class="attachment-item">
                <a :href="file.filePath" target="_blank" rel="noopener" class="attachment-link">
                  <span class="file-icon">📄</span>
                  <span class="file-name">{{ file.filename }}</span>
                  <span class="file-size">{{ formatSize(file.fileSize) }}</span>
                </a>
              </li>
            </ul>
          </div>

          <!-- 操作按钮 -->
          <div class="detail-actions" v-if="canEdit">
            <button class="action-btn action-btn--secondary" @click="startEdit">
              <span class="btn-icon">✏️</span>
              <span class="btn-text">编辑</span>
            </button>
            <button class="action-btn action-btn--danger" @click="confirmDelete">
              <span class="btn-icon">🗑</span>
              <span class="btn-text">删除</span>
            </button>
          </div>

          <!-- 优化评论区设计 -->
          <div class="comments-section">
            <div class="comments-header">
              <h3 class="comments-title">
                <span class="comments-icon">💬</span>
                评论 ({{ comments.pagination.total || 0 }})
              </h3>
              <button class="write-btn" @click="$refs.commentInput && $refs.commentInput.focus()" v-if="token">
                写评论
              </button>
            </div>
            
            <!-- 评论输入框 -->
            <div class="comment-composer" v-if="token">
              <div class="composer-avatar" :style="{background: stringToColor(profile ? profile.username : 'User')}">
                {{ profile ? profile.username.substring(0, 1) : 'U' }}
              </div>
              <div class="composer-input-area">
                <textarea 
                  ref="commentInput" 
                  v-model="newComment" 
                  placeholder="写下你的想法..."
                  class="composer-textarea"
                ></textarea>
                <div class="composer-actions">
                  <button 
                    class="submit-comment-btn" 
                    @click="submitComment" 
                    :disabled="!newComment.trim()"
                  >
                    发布评论
                  </button>
                </div>
              </div>
            </div>
            
            <!-- 评论列表 -->
            <div class="comments-list">
              <div v-if="comments.data.length === 0" class="empty-comments">
                <p>还没有评论，快来抢沙发吧～</p>
              </div>
              
              <div class="comment-item" v-for="item in comments.data" :key="item.id">
                <div class="comment-avatar" :style="{background: stringToColor(item.username)}">
                  {{ item.username.substring(0, 1) }}
                </div>
                <div class="comment-content-wrap">
                  <div class="comment-header">
                    <span class="comment-author">{{ item.username }}</span>
                    <span class="comment-time">{{ formatTimeAgo(item.createdAt) }}</span>
                  </div>
                  <p class="comment-text">{{ item.content }}</p>
                  <div class="comment-actions" v-if="canDeleteComment(item)">
                    <button class="comment-delete-btn" @click="deleteComment(item)">删除</button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 评论分页 -->
            <div class="pagination" v-if="comments.pagination.total > comments.pagination.pageSize">
              <button 
                class="pagination-btn" 
                :disabled="comments.pagination.page === 1" 
                @click="changeCommentPage(comments.pagination.page - 1)"
              >
                ← 上一页
              </button>
              <span class="pagination-info">第 {{ comments.pagination.page }} / {{ commentTotalPages }} 页</span>
              <button 
                class="pagination-btn" 
                :disabled="comments.pagination.page >= commentTotalPages" 
                @click="changeCommentPage(comments.pagination.page + 1)"
              >
                下一页 →
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 优化编辑器界面 -->
      <div v-else-if="(viewMode === 'create' || viewMode === 'edit')" class="editor-view">
        <div class="editor-container">
          <div class="editor-header">
            <h2 class="editor-title">{{ viewMode === 'create' ? '📝 发布新文章' : '✏️ 编辑文章' }}</h2>
            <button class="close-btn" @click="backToList" title="关闭">×</button>
          </div>
          
          <div class="editor-form">
            <div class="form-group">
              <label class="form-label">文章标题</label>
              <input v-model="editorForm.title" class="form-input" placeholder="输入吸引人的标题..." />
            </div>
            
            <div class="form-row">
              <div class="form-group form-group--half">
                <label class="form-label">分类</label>
                <select v-model="editorForm.categoryId" class="form-select" :disabled="!categories.length">
                  <option disabled value="">
                    {{ categories.length ? '请选择分类' : '暂无分类，请先在管理后台创建' }}
                  </option>
                  <option v-for="category in categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">封面图片</label>
              <div class="upload-area">
                <label class="upload-trigger" v-if="!editorForm.coverImage">
                  <input type="file" class="file-input-hidden" @change="onCoverUpload" accept="image/*" />
                  <div class="upload-placeholder">
                    <span class="upload-icon">🖼</span>
                    <div class="upload-text">
                      <p class="upload-title">点击上传封面</p>
                      <p class="upload-hint">支持 PNG、JPG 格式，大小不超过 5MB</p>
                    </div>
                  </div>
                </label>
                <div class="image-preview" v-if="editorForm.coverImage">
                  <img :src="editorForm.coverImage" alt="封面预览" />
                  <button type="button" class="remove-image-btn" @click="clearCover">
                    <span>×</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">摘要</label>
              <textarea 
                v-model="editorForm.summary" 
                rows="3" 
                class="form-textarea"
                placeholder="简短描述文章内容，吸引读者点击..."
              ></textarea>
            </div>
            
            <div class="form-group">
              <label class="form-label">正文内容</label>
              <textarea 
                v-model="editorForm.content" 
                rows="12" 
                class="form-textarea form-textarea--content"
                placeholder="支持 HTML 格式，开始创作吧..."
              ></textarea>
            </div>
            
            <div class="form-group">
              <label class="form-label">附件文件</label>
              <div class="upload-area">
                <label class="upload-trigger upload-trigger--file">
                  <input type="file" class="file-input-hidden" multiple @change="onAttachmentUpload" accept=".pdf,.txt" />
                  <span class="upload-file-icon">📎</span>
                  <span class="upload-file-text">选择文件上传</span>
                  <span class="upload-file-hint">(支持 PDF、TXT 格式)</span>
                </label>
                <ul class="file-list" v-if="editorForm.attachments.length">
                  <li v-for="file in editorForm.attachments" :key="file.filePath" class="file-item">
                    <span class="file-icon">📄</span>
                    <span class="file-name">{{ file.filename }}</span>
                    <button class="file-remove-btn" @click="removeAttachment(file)">×</button>
                  </li>
                </ul>
                <p class="upload-empty" v-else>暂无附件</p>
              </div>
            </div>
            
            <div class="form-actions">
              <button class="form-btn form-btn--cancel" @click="backToList">取消</button>
              <button class="form-btn form-btn--submit" @click="submitEditor">
                {{ viewMode === 'create' ? '发布文章' : '保存修改' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 管理模式 -->
      <div v-else-if="viewMode === 'admin'" class="admin-view">
        <!-- 优化管理后台布局 -->
        <div class="admin-header">
          <h2 class="admin-title">⚙️ 管理后台</h2>
          <button class="back-btn" @click="backToList">← 返回前台</button>
        </div>
        
        <div class="admin-toolbar">
          <div class="toolbar-section">
            <button class="toolbar-btn toolbar-btn--primary" @click="startCreateCategory">
              + 新增分类
            </button>
          </div>
          <div class="toolbar-section">
            <button class="toolbar-btn" :disabled="isBackingUp" @click="triggerBackup">
              {{ isBackingUp ? '备份中...' : '💾 立即备份' }}
            </button>
            <button
              class="toolbar-btn"
              :disabled="!backupInfo || !backupInfo.exists || isRestoring"
              @click="triggerRestore"
            >
              {{ isRestoring ? '恢复中...' : '↩️ 恢复数据' }}
            </button>
            <button
              v-if="isRoot"
              class="toolbar-btn"
              :disabled="isSeeding"
              @click="promptSeedOptions"
            >
              {{ isSeeding ? '生成中...' : '🎲 生成测试数据' }}
            </button>
            <button
              class="toolbar-btn toolbar-btn--danger"
              v-if="isRoot"
              :disabled="isResetting"
              @click="triggerReset"
            >
              {{ isResetting ? '清空中...' : '🗑 清空测试数据' }}
            </button>
          </div>
        </div>
        
        <!-- 备份状态卡片 -->
        <div class="admin-card">
          <h3 class="card-title">💾 备份状态</h3>
          <div class="backup-info">
            <div class="info-row">
              <span class="info-label">上次备份：</span>
              <span class="info-value" v-if="backupInfo && backupInfo.exists">
                {{ formatDate(backupInfo.createdAt) }} · {{ backupInfo.adminName || '未知' }} · {{ formatSize(backupInfo.size || 0) }}
              </span>
              <span class="info-value info-value--empty" v-else>尚未生成备份</span>
            </div>
            <div class="info-row" v-if="backupInfo && backupInfo.lastRestoreAt">
              <span class="info-label">上次恢复：</span>
              <span class="info-value">
                {{ formatDate(backupInfo.lastRestoreAt) }} · {{ backupInfo.lastRestoreAdminName || '未知' }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- 文章管理 -->
        <div class="admin-card">
          <h3 class="card-title">📰 文章管理</h3>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 60px;">ID</th>
                  <th>标题</th>
                  <th style="width: 120px;">分类</th>
                  <th style="width: 120px;">作者</th>
                  <th style="width: 160px;">发布时间</th>
                  <th style="width: 160px;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="article in articles" :key="`admin-article-${article.id}`">
                  <td class="cell-id">{{ article.id }}</td>
                  <td class="cell-title" @click="openDetail(article.id)">{{ article.title }}</td>
                  <td><span class="table-badge">{{ article.categoryName }}</span></td>
                  <td>{{ article.author }}</td>
                  <td class="cell-date">{{ formatDate(article.publishedAt) }}</td>
                  <td class="cell-actions">
                    <button class="table-btn table-btn--edit" @click="editArticle(article)">编辑</button>
                    <button class="table-btn table-btn--delete" @click="deleteArticle(article)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pagination" v-if="pagination.total > pagination.pageSize">
            <button class="pagination-btn" :disabled="pagination.page === 1" @click="changePage(pagination.page - 1)">
              ← 上一页
            </button>
            <span class="pagination-info">第 {{ pagination.page }} / {{ totalPages }} 页</span>
            <button class="pagination-btn" :disabled="pagination.page >= totalPages" @click="changePage(pagination.page + 1)">
              下一页 →
            </button>
          </div>
        </div>
        
        <!-- 分类管理 -->
        <div class="admin-card">
          <h3 class="card-title">🏷 分类管理</h3>
          <div class="table-wrapper">
            <table class="data-table data-table--compact">
              <thead>
                <tr>
                  <th style="width: 60px;">ID</th>
                  <th style="width: 200px;">名称</th>
                  <th>描述</th>
                  <th style="width: 160px;">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="category in categories" :key="category.id">
                  <td class="cell-id">{{ category.id }}</td>
                  <td>
                    <input v-model="category.editName" class="table-input" placeholder="分类名称" />
                  </td>
                  <td>
                    <input v-model="category.editDescription" class="table-input" placeholder="分类描述" />
                  </td>
                  <td class="cell-actions">
                    <button class="table-btn table-btn--save" @click="saveCategory(category)">保存</button>
                    <button class="table-btn table-btn--delete" @click="removeCategory(category)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- 操作日志 -->
        <div class="admin-card">
          <h3 class="card-title">📋 操作日志</h3>
          <div class="log-container">
            <div v-for="item in auditLogs" :key="item.id" class="log-entry">
              <span class="log-time">{{ formatDate(item.createdAt) }}</span>
              <span class="log-admin">{{ item.admin || '系统' }}</span>
              <span class="log-action">{{ item.action }}</span>
              <span class="log-target">{{ item.targetType }}#{{ item.targetId }}</span>
            </div>
          </div>
        </div>
        
        <!-- 统计概览 -->
        <div class="admin-card" v-if="stats">
          <h3 class="card-title">📊 统计概览</h3>
          <div class="stats-grid">
            <div class="stat-block">
              <h4 class="stat-block-title">分类热力图</h4>
              <div class="pie-chart-container" v-if="stats.perCategory && stats.perCategory.length">
                <div class="pie-chart" :style="getPieChartStyle(stats.perCategory)"></div>
                <div class="pie-legend">
                  <div v-for="(item, index) in stats.perCategory" :key="index" class="legend-item">
                    <span class="legend-color" :style="{background: getPieColor(index)}"></span>
                    <span class="legend-label">{{ item.categoryName }} ({{ item.newsCount }})</span>
                  </div>
                </div>
              </div>
              <p class="stat-empty" v-else>暂无数据</p>
            </div>
            <div class="stat-block">
              <h4 class="stat-block-title">作者热力图 (TOP 50)</h4>
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
              <p class="stat-empty" v-else>暂无数据</p>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <div class="empty-icon">📰</div>
        <p class="empty-text">请选择文章查看详情</p>
      </div>
    </div>

    <div class="seed-dialog-overlay" v-if="showSeedDialog">
      <div class="seed-dialog">
        <div class="seed-dialog__header">
          <h3>生成测试数据</h3>
          <button class="seed-dialog__close" type="button" @click="closeSeedDialog">×</button>
        </div>
        <p class="seed-dialog__hint">选择生成方式，所有现有数据都会被覆盖。</p>
        <div class="seed-dialog__options">
          <button class="seed-option" type="button" @click="confirmSeedMode('default')" :disabled="isSeeding">
            <div class="seed-option__title">标准示例</div>
            <div class="seed-option__desc">生成轻量示例数据（默认大小）</div>
          </button>
          <button class="seed-option seed-option--massive" type="button" @click="confirmSeedMode('massive')" :disabled="isSeeding">
            <div class="seed-option__title">10 万条大全</div>
            <div class="seed-option__desc">强制生成总计 100000 条测试数据，耗时更久</div>
          </button>
        </div>
        <div class="seed-dialog__footer">
          <button class="seed-dialog__cancel" type="button" @click="closeSeedDialog">取消</button>
        </div>
      </div>
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
import searchIcon from '@/assets/images/search.svg';

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
        authorId: '',
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
      isSeeding: false,
      showSeedDialog: false,
      searchIcon
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
    toggleMyArticles() {
      if (!this.profile || !this.profile.id) {
        return;
      }
      const myId = this.profile.id;
      if (this.filters.authorId === myId) {
        this.filters.authorId = '';
      } else {
        this.filters.authorId = myId;
        this.filters.categoryId = '';
      }
      this.applyFilters();
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
    promptSeedOptions() {
      if (!this.token || !this.isAdmin || this.isSeeding) {
        return;
      }
      if (!this.isRoot) {
        window.alert('仅 root 用户可执行该操作');
        return;
      }
      this.showSeedDialog = true;
    },
    closeSeedDialog() {
      if (this.isSeeding) {
        return;
      }
      this.showSeedDialog = false;
    },
    confirmSeedMode(mode) {
      if (this.isSeeding) {
        return;
      }
      this.showSeedDialog = false;
      this.triggerSeed(mode);
    },
    async triggerSeed(mode = 'default') {
      if (!this.token || !this.isAdmin || this.isSeeding) {
        return;
      }
      if (!this.isRoot) {
        window.alert('仅 root 用户可执行该操作');
        return;
      }
      const isMassive = mode === 'massive';
      const confirmText = isMassive
        ? '将生成约 10 万条测试数据（耗费时间较长），是否继续？'
        : '将生成示例数据并覆盖当前内容，是否继续？';
      if (!window.confirm(confirmText)) {
        return;
      }
      this.isSeeding = true;
      this.showSeedDialog = false;
      try {
        this.filters.page = 1;
        const payload = isMassive
          ? { mode: 'massive', targetTotal: 100000 }
          : { mode: 'default' };
        const result = await seedNews(this.token, payload);
        await Promise.all([
          this.loadCategories(),
          this.loadArticles(),
          this.loadHot(),
          this.loadRecent()
        ]);
        await Promise.all([this.loadAudit(), this.loadBackupInfo()]);
        this.backToList();
        const totalEntries = result && result.plan && result.plan.totalEntries;
        const planParams = result && result.plan && result.plan.parameters;
        const detailLines = planParams
          ? `\n用户: ${planParams.users || 0}\n分类: ${planParams.categories || 0}\n新闻: ${planParams.news || 0}\n评论: ${(planParams.totalComments != null) ? planParams.totalComments : (planParams.news * (planParams.commentsPerNews || 0))}`
          : '';
        const defaultMessage = totalEntries ? `测试数据已生成，共 ${totalEntries} 条${detailLines}` : `测试数据已生成${detailLines}`;
        if (isMassive) {
          window.alert(`已生成 ${totalEntries || '100000'} 条测试数据${detailLines}`);
        } else {
          window.alert(defaultMessage);
        }
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
    getPieChartStyle(data) {
      if (!data || !data.length) return {};
      
      const total = data.reduce((sum, item) => sum + item.newsCount, 0);
      let currentPercent = 0;
      let gradientString = 'conic-gradient(';
      
      data.forEach((item, index) => {
        const percentage = (item.newsCount / total) * 100;
        const color = this.getPieColor(index);
        const endPercent = currentPercent + percentage;
        gradientString += `${color} ${currentPercent}% ${endPercent}%, `;
        currentPercent = endPercent;
      });
      
      gradientString = gradientString.slice(0, -2) + ')'; // Remove last comma
      
      return {
        background: gradientString
      };
    },
    stringToColor(str) {
      if (!str) return '#9ca3af';
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = hash % 360;
      return `hsl(${hue}, 45%, 55%)`;
    },
    formatTimeAgo(date) {
      if (!date) return '';
      const d = new Date(date);
      const now = new Date();
      const diff = (now - d) / 1000;
      if (diff < 60) return '刚刚';
      if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
      return this.formatDate(date).split(' ')[0];
    }
  }
};
</script>

<style scoped>
/* 全新的现代化配色方案 - 低饱和度、高对比度的中性色系 */

/* ===== 基础变量 ===== */
* {
  box-sizing: border-box;
}

.news-center {
  --color-bg-primary: #fafafa;
  --color-bg-secondary: #ffffff;
  --color-bg-tertiary: #f5f5f5;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #525252;
  --color-text-tertiary: #737373;
  --color-border-light: #e5e5e5;
  --color-border-medium: #d4d4d4;
  --color-accent: #64748b;
  --color-accent-hover: #475569;
  --color-success: #10b981;
  --color-danger: #ef4444;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.1);
  
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--color-bg-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: var(--color-text-primary);
}

.news-center.admin-mode {
  --color-bg-primary: #f8f9fa;
}

/* ===== 顶部导航栏 ===== */
.top-nav {
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.brand-logo {
  font-size: 28px;
  line-height: 1;
}

.brand-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: -0.5px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-bg-primary);
  border-color: var(--color-border-medium);
  transform: translateY(-1px);
}

.action-btn--primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.action-btn--primary:hover {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}

.btn-icon {
  font-size: 18px;
  line-height: 1;
}

.btn-text {
  line-height: 1;
}

/* ===== 主内容区 ===== */
.news-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.news-main.list-main {
  background: var(--color-bg-primary);
}

.news-main.admin-main {
  padding: var(--spacing-lg);
  background: var(--color-bg-primary);
}

/* ===== 列表容器 ===== */
.news-list-container {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--spacing-lg) var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

/* ===== 搜索区域 ===== */
.search-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.search-bar:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.1);
}

.search-icon {
  width: 20px;
  height: 20px;
  margin-right: var(--spacing-sm);
  display: inline-block;
  flex-shrink: 0;
  object-fit: contain;
  opacity: 0.85;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.search-bar:focus-within .search-icon {
  opacity: 1;
  transform: scale(1.05);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--color-text-primary);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.clear-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: var(--color-border-medium);
}

/* ===== 筛选栏 ===== */
.filter-row {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.filter-chip {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.filter-chip:hover {
  border-color: var(--color-border-medium);
  background: var(--color-bg-tertiary);
}

.filter-chip--active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

/* ===== 特色区域 - 热门作者 ===== */
.featured-section {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.section-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 var(--spacing-sm);
  background: var(--color-bg-tertiary);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.author-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--spacing-md);
}

.author-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg-tertiary);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.author-card:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.author-info {
  flex: 1;
  min-width: 0;
}

.author-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.author-meta {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

/* ===== 文章区域 ===== */
.articles-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.sort-controls {
  display: flex;
  gap: var(--spacing-xs);
}

.sort-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-btn:hover {
  background: var(--color-bg-tertiary);
}

.sort-btn--active {
  color: var(--color-accent);
  background: rgba(100, 116, 139, 0.1);
}

/* ===== 文章列表 ===== */
.article-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.article-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.article-card:hover {
  border-color: var(--color-border-medium);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.article-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.author-badge {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.author-avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 600;
}

.author-name-sm {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.article-time {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.article-body {
  display: flex;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.article-content {
  flex: 1;
  min-width: 0;
}

.article-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.4;
  margin: 0 0 var(--spacing-sm);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-excerpt {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-thumbnail {
  width: 140px;
  height: 100px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg-tertiary);
}

.article-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-footer {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border-light);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.stat-icon {
  font-size: 14px;
}

.category-tag {
  margin-left: auto;
  padding: 2px var(--spacing-sm);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl) var(--spacing-lg);
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.empty-text {
  font-size: 15px;
  color: var(--color-text-tertiary);
  margin: 0;
}

/* ===== 分页 ===== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg) 0;
}

.pagination-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--color-bg-tertiary);
  border-color: var(--color-border-medium);
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* ===== 详情页 ===== */
.article-detail {
  background: var(--color-bg-secondary);
  min-height: 100vh;
}

.detail-container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: var(--spacing-xl);
}

.back-button:hover {
  background: var(--color-bg-primary);
  border-color: var(--color-border-medium);
}

.back-icon {
  font-size: 16px;
  line-height: 1;
}

.detail-header {
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-xl);
  border-bottom: 1px solid var(--color-border-light);
}

.detail-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.3;
  margin: 0 0 var(--spacing-lg);
  letter-spacing: -0.5px;
}

.detail-meta-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.author-badge-lg {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.author-avatar-lg {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  font-weight: 600;
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.author-name-lg {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.publish-date {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.view-count {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 14px;
  color: var(--color-text-secondary);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.meta-icon {
  font-size: 16px;
}

.detail-content {
  font-size: 17px;
  line-height: 1.8;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xl);
}

.detail-content img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  margin: var(--spacing-lg) 0;
}

.detail-content p {
  margin: var(--spacing-md) 0;
}

.detail-content h1, .detail-content h2, .detail-content h3 {
  margin-top: var(--spacing-xl);
  margin-bottom: var(--spacing-md);
  color: var(--color-text-primary);
}

/* ===== 附件区域 ===== */
.attachments-box {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.attachments-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-md);
}

.attachments-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.attachment-item {
  margin: 0;
}

.attachment-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text-primary);
  transition: all 0.2s ease;
}

.attachment-link:hover {
  border-color: var(--color-accent);
  background: var(--color-bg-primary);
}

.file-icon {
  font-size: 20px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.file-size {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* ===== 详情页操作按钮 ===== */
.detail-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-xl);
  border-bottom: 1px solid var(--color-border-light);
}

.action-btn--secondary {
  background: var(--color-bg-tertiary);
  border-color: var(--color-border-light);
  color: var(--color-text-primary);
}

.action-btn--secondary:hover {
  background: var(--color-bg-primary);
  border-color: var(--color-border-medium);
}

.action-btn--danger {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
}

.action-btn--danger:hover {
  background: #dc2626;
  border-color: #dc2626;
}

/* ===== 评论区 ===== */
.comments-section {
  margin-top: var(--spacing-xl);
}

.comments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.comments-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.comments-icon {
  font-size: 22px;
}

.write-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.write-btn:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}

/* ===== 评论输入框 ===== */
.comment-composer {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
}

.composer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.composer-input-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.composer-textarea {
  width: 100%;
  min-height: 100px;
  padding: var(--spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;
}

.composer-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.1);
}

.composer-textarea::placeholder {
  color: var(--color-text-tertiary);
}

.composer-actions {
  display: flex;
  justify-content: flex-end;
}

.submit-comment-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-comment-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}

.submit-comment-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 评论列表 ===== */
.comments-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.empty-comments {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-tertiary);
  font-size: 14px;
}

.comment-item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
}

.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.comment-content-wrap {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.comment-author {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.comment-time {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.comment-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-sm);
}

.comment-actions {
  display: flex;
  gap: var(--spacing-md);
}

.comment-delete-btn {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s ease;
}

.comment-delete-btn:hover {
  color: var(--color-danger);
}

.pie-chart-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
  padding: var(--spacing-md);
}

.pie-chart {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  box-shadow: var(--shadow-sm);
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  flex: 1;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 编辑器视图 ===== */
.editor-view {
  background: var(--color-bg-primary);
  min-height: 100vh;
  padding: var(--spacing-xl) var(--spacing-md);
}

.editor-container {
  max-width: 900px;
  margin: 0 auto;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-tertiary);
}

.editor-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.editor-form {
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
}

.form-group--half {
  min-width: 0;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  font-family: inherit;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.1);
}

.form-textarea {
  resize: vertical;
  line-height: 1.6;
}

.form-textarea--content {
  min-height: 300px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
}

/* ===== 上传区域 ===== */
.upload-area {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.upload-trigger {
  display: block;
  cursor: pointer;
}

.file-input-hidden {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  border: 2px dashed var(--color-border-medium);
  border-radius: var(--radius-lg);
  background: var(--color-bg-tertiary);
  transition: all 0.2s ease;
}

.upload-placeholder:hover {
  border-color: var(--color-accent);
  background: var(--color-bg-primary);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md);
  opacity: 0.6;
}

.upload-text {
  text-align: center;
}

.upload-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}

.upload-hint {
  font-size: 13px;
  color: var(--color-text-tertiary);
  margin: 0;
}

.upload-trigger--file {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
  transition: all 0.2s ease;
}

.upload-trigger--file:hover {
  border-color: var(--color-border-medium);
  background: var(--color-bg-primary);
}

.upload-file-icon {
  font-size: 20px;
}

.upload-file-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.upload-file-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-left: auto;
}

.upload-empty {
  font-size: 13px;
  color: var(--color-text-tertiary);
  text-align: center;
  padding: var(--spacing-md);
  margin: 0;
}

/* ===== 图片预览 ===== */
.image-preview {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border-light);
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.remove-image-btn {
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-image-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
}

/* ===== 文件列表 ===== */
.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
}

.file-item .file-icon {
  font-size: 18px;
}

.file-item .file-name {
  flex: 1;
  font-size: 13px;
  color: var(--color-text-primary);
}

.file-remove-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.file-remove-btn:hover {
  background: var(--color-danger);
  color: white;
}

/* ===== 表单操作按钮 ===== */
.form-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
}

.form-btn {
  padding: var(--spacing-md) var(--spacing-xl);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.form-btn--cancel {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.form-btn--cancel:hover {
  background: var(--color-bg-primary);
  border-color: var(--color-border-medium);
}

.form-btn--submit {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.form-btn--submit:hover {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* ===== 管理后台 ===== */
.admin-view {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.admin-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.back-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: var(--color-bg-tertiary);
  border-color: var(--color-border-medium);
}

.admin-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.toolbar-section {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.toolbar-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--color-bg-primary);
  border-color: var(--color-border-medium);
}

.toolbar-btn--primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.toolbar-btn--primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.toolbar-btn--danger {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
}

.toolbar-btn--danger:hover:not(:disabled) {
  background: #dc2626;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 管理卡片 ===== */
.admin-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-lg);
}

/* ===== 备份信息 ===== */
.backup-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.info-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 14px;
}

.info-label {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.info-value {
  color: var(--color-text-primary);
}

.info-value--empty {
  color: var(--color-text-tertiary);
  font-style: italic;
}

/* ===== 数据表格 ===== */
.table-wrapper {
  overflow-x: auto;
  margin-bottom: var(--spacing-md);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table thead {
  background: var(--color-bg-tertiary);
}

.data-table th {
  padding: var(--spacing-md);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-border-medium);
  white-space: nowrap;
}

.data-table td {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text-secondary);
}

.data-table tbody tr:hover {
  background: var(--color-bg-tertiary);
}

.cell-id {
  font-weight: 600;
  color: var(--color-text-tertiary);
}

.cell-title {
  cursor: pointer;
  color: var(--color-accent);
  font-weight: 500;
  transition: color 0.2s ease;
}

.cell-title:hover {
  color: var(--color-accent-hover);
  text-decoration: underline;
}

.cell-date {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.cell-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.table-badge {
  display: inline-block;
  padding: 2px var(--spacing-sm);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.table-input {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
}

.table-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.table-btn {
  padding: 4px var(--spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.table-btn--edit {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.table-btn--edit:hover {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.table-btn--save {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.table-btn--save:hover {
  background: #059669;
}

.table-btn--delete {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
}

.table-btn--delete:hover {
  background: #dc2626;
}

.data-table--compact td {
  padding: var(--spacing-sm) var(--spacing-md);
}

/* ===== 日志列表 ===== */
.log-container {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.log-entry {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.log-time {
  color: var(--color-text-tertiary);
  min-width: 140px;
}

.log-admin {
  font-weight: 500;
  color: var(--color-text-primary);
  min-width: 80px;
}

.log-action {
  color: var(--color-accent);
  font-weight: 500;
}

.log-target {
  color: var(--color-text-tertiary);
  font-size: 12px;
  margin-left: auto;
}

/* ===== 统计图表 ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.stat-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.stat-block-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.heatmap {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.heat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid;
  border-radius: var(--radius-sm);
  min-width: 70px;
  transition: all 0.2s ease;
  cursor: default;
}

.heat-cell:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.heat-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
}

.heat-value {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.stat-empty {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--color-text-tertiary);
  font-size: 14px;
  margin: 0;
}

/* ===== 种子数据对话框 ===== */
.seed-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.seed-dialog {
  width: min(520px, 92vw);
  background: var(--color-bg-primary);
  border-radius: 18px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.35);
  border: 1px solid var(--color-border-light);
  padding: var(--spacing-lg);
}

.seed-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.seed-dialog__header h3 {
  margin: 0;
  font-size: 20px;
}

.seed-dialog__close {
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.seed-dialog__hint {
  margin: 0 0 var(--spacing-md);
  color: var(--color-text-tertiary);
  font-size: 13px;
}

.seed-dialog__options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--spacing-md);
}

.seed-option {
  border: 1px solid var(--color-border-light);
  border-radius: 14px;
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.seed-option:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: var(--color-accent);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.15);
}

.seed-option:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.seed-option__title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
}

.seed-option__desc {
  font-size: 13px;
  color: var(--color-text-tertiary);
  line-height: 1.4;
}

.seed-option--massive {
  border: 1px solid var(--color-accent);
  background: linear-gradient(120deg, rgba(16, 163, 127, 0.08), rgba(16, 163, 127, 0.02));
}

.seed-dialog__footer {
  margin-top: var(--spacing-lg);
  display: flex;
  justify-content: flex-end;
}

.seed-dialog__cancel {
  border: none;
  background: var(--color-bg-tertiary);
  border-radius: 999px;
  padding: 8px 18px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

/* ===== 响应式设计 ===== */
@media (max-width: 768px) {
  .nav-container {
    padding: var(--spacing-md);
  }
  
  .brand-title {
    font-size: 18px;
  }
  
  .btn-text {
    display: none;
  }
  
  .news-list-container {
    padding: var(--spacing-md);
  }
  
  .featured-section,
  .admin-card {
    padding: var(--spacing-md);
  }
  
  .author-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
  
  .article-card {
    padding: var(--spacing-md);
  }
  
  .article-title {
    font-size: 16px;
  }
  
  .article-thumbnail {
    width: 100px;
    height: 75px;
  }
  
  .detail-container {
    padding: var(--spacing-lg) var(--spacing-md);
  }
  
  .detail-title {
    font-size: 24px;
  }
  
  .editor-container {
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .admin-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .toolbar-section {
    width: 100%;
  }
  
  .toolbar-btn {
    flex: 1;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .log-entry {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
  
  .log-time,
  .log-admin {
    min-width: auto;
  }
  
  .log-target {
    margin-left: 0;
  }
}

/* ===== 滚动条样式 ===== */
.news-main::-webkit-scrollbar,
.log-container::-webkit-scrollbar,
.table-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.news-main::-webkit-scrollbar-track,
.log-container::-webkit-scrollbar-track,
.table-wrapper::-webkit-scrollbar-track {
  background: var(--color-bg-tertiary);
}

.news-main::-webkit-scrollbar-thumb,
.log-container::-webkit-scrollbar-thumb,
.table-wrapper::-webkit-scrollbar-thumb {
  background: var(--color-border-medium);
  border-radius: 4px;
}

.news-main::-webkit-scrollbar-thumb:hover,
.log-container::-webkit-scrollbar-thumb:hover,
.table-wrapper::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

@media (max-width: 768px) {
  .pie-chart-container {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
