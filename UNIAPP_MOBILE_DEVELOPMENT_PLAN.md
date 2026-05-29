# Q信 MyChat uni-app 手机端开发交接计划

本文档用于交给另一个对话继续开发 Q信 MyChat 手机端。请把它当作实施说明，而不是产品愿景稿。手机端必须复用现有后端能力，保持当前 Q信岛屿风格，覆盖聊天、新闻中心、发布、AI 助手、设置与必要的管理员能力。

## 1. 项目背景

当前项目路径：

`D:\数据库实验\课程设计\03_项目源码\mychat`

现有项目是 Vue 2 + Express + Socket.IO + MySQL/Redis 的桌面/网页端 Q信 MyChat，主界面集中在：

- `src/components/IslandApp.vue`
- `src/assets/css/island-theme.less`
- `src/services/islandApi.js`
- `src/services/newsApi.js`
- `server/index.js`
- `server/io.js`
- `server/routes/*.js`
- `server/services/*.js`

后端已经提供这些核心能力：

- 账号登录、注册、个人资料、改密
- 好友列表、好友申请、通过申请、删除好友
- Socket.IO 实时群聊、私聊、系统上下线通知、历史群聊消息
- 文件上传，支持图片、TXT、PDF
- 新闻中心列表、详情、评论、发布、编辑、删除、分类、浏览数
- 管理员新闻统计、审核日志、备份恢复、数据重置、造测试数据
- AI 助手，能读取新闻中心数据库上下文回答，也能生成可发布文章草稿
- 用户设置、通知设置、外观设置、消息设置、数据与存储设置
- 手机扫码确认桌面端二维码登录

开发手机端时不要重写后端，不要改 `db/config.json`。如果接口需要小幅补充，优先新增兼容接口，不破坏现有桌面端。

## 2. 手机端目标

使用 uni-app 开发一个移动端应用，建议放在现有仓库下：

`D:\数据库实验\课程设计\03_项目源码\mychat\mobile`

首期目标平台：

- H5：用于最快联调和课程展示。
- App Android：用于手机端完整体验、扫码登录、通知、文件选择。
- 微信小程序：可作为第二阶段，Socket.IO、文件上传、登录态和跨域处理需要单独适配。

推荐技术方案：

- uni-app + Vue 3 + Pinia + SCSS。
- 如果课程环境更偏 HBuilderX 快速开发，可使用 uni-app Vue 2，但状态管理、组合式封装仍按模块化思路组织。
- 网络请求统一用 `uni.request`，不要在手机端直接复制浏览器 `fetch`。
- 实时通信用 `socket.io-client`。App/H5 可直接使用；小程序端需要验证兼容性，必要时改用后端新增 WebSocket 原生通道。

## 3. 产品范围

手机端必须保留 Q信的真实产品结构，不能改成只展示 UI 的静态页面。

核心模块：

1. 登录注册
2. 会话列表
3. 群聊与私聊
4. 好友与申请
5. 新闻中心
6. 新闻详情与评论
7. 发布/编辑新闻
8. AI 助手
9. 设置与个人资料
10. 扫码确认桌面端登录
11. 管理员轻量后台

手机端不建议完整照搬桌面端管理后台大屏。移动端管理员能力应做成轻量运维视图：统计卡片、文章管理、审核日志、删除确认、数据备份入口。

## 4. 信息架构

底部 Tab 推荐 5 个：

- 会话：聊天会话、群聊、未读、提到我的、收藏消息
- 新闻：新闻首页、分类、搜索、详情、评论
- 发布：新闻发布/编辑；普通用户可发布自己的内容，管理员可管理更多内容
- AI：AI 助手对话、文章生成、引用新闻、发布草稿
- 我的：资料、好友、设置、数据与存储、关于、管理员入口

页面路由建议：

```text
pages/
  auth/login.vue
  auth/register.vue
  auth/forgot.vue
  auth/qr-confirm.vue
  chat/index.vue
  chat/room.vue
  contacts/index.vue
  contacts/request.vue
  news/index.vue
  news/detail.vue
  publish/edit.vue
  ai/index.vue
  mine/index.vue
  mine/profile.vue
  mine/settings.vue
  mine/storage.vue
  admin/index.vue
  admin/articles.vue
  admin/logs.vue
  admin/categories.vue
```

全局分包建议：

- 主包：登录、会话、聊天、新闻首页、我的。
- 分包 `news-package`：新闻详情、评论、发布编辑。
- 分包 `admin-package`：管理员页面。
- 分包 `ai-package`：AI 助手与文章草稿。

## 5. 视觉风格

手机端继续使用“清新岛屿风格”，但必须移动化。

总体气质：

- 清新、温暖、轻量、像一个小岛社区通信工具。
- 不使用桌面端大侧边栏。
- 不做营销落地页，打开后就是可用应用。
- 不使用假数据占满页面，尽量读取真实接口。
- 不使用过多装饰图压过信息。

色彩：

- 主色：深绿 `#174a35`、活力绿 `#6fb34f`
- 辅色：海蓝 `#9ed9e8`
- 背景：奶油白 `#fffaf0`、浅纸色 `rgba(255,250,238,.92)`
- 文本：深墨绿 `#2e332d`
- 弱文本：灰绿 `#7f8277`
- 危险色：柔和珊瑚红 `#c95a6b`

移动端布局规则：

- 页面背景使用浅海岛渐变或淡纹理，但内容区域必须清楚。
- 卡片圆角控制在 12 到 18 px，按钮圆角可稍大但不要全屏胶囊化。
- 底部 Tab 使用图标 + 短文字。
- 聊天页输入栏固定底部，适配安全区。
- 新闻列表优先信息密度：标题、摘要、分类、作者、时间、浏览量。
- AI 页面使用对话式布局，不要做大面积欢迎空页。
- 管理员页面以可扫描列表和统计为主，避免桌面后台压缩版。

可复用素材：

- 桌面端头像、AI 机器人、小岛插画可以从 `src/assets/images` 中迁移到 `mobile/static/images`。
- 不要继续使用桌面端鼠标光标 SVG；手机端无鼠标。
- 表情 GIF 可继续使用 `public/*.gif`，移动端建议放到 `mobile/static/emoji` 或通过静态路径加载。

## 6. 目录结构建议

```text
mobile/
  pages.json
  manifest.json
  App.vue
  main.js
  static/
    images/
    emoji/
  src/
    api/
      request.js
      auth.js
      friends.js
      chat.js
      news.js
      ai.js
      settings.js
      upload.js
      system.js
    socket/
      index.js
      handlers.js
    store/
      auth.js
      chat.js
      news.js
      ai.js
      settings.js
    components/
      IslandButton.vue
      IslandCard.vue
      IslandAvatar.vue
      EmptyState.vue
      NewsCard.vue
      MessageBubble.vue
      EmojiPanel.vue
      SafeBottomBar.vue
    styles/
      tokens.scss
      base.scss
      components.scss
    utils/
      format.js
      storage.js
      route.js
      validators.js
```

## 7. 登录态与请求封装

统一请求封装要求：

- `baseURL` 从配置读取：
  - 开发 H5：`http://127.0.0.1:3000`
  - 真机调试：使用电脑局域网 IP，例如 `http://192.168.x.x:3000`
  - 发布：替换为服务器地址
- token 存在 `uni.setStorageSync('qxin_token', token)`。
- 用户信息存在 `uni.setStorageSync('qxin_user', user)`。
- 每个鉴权接口都带：

```text
Authorization: Bearer <token>
```

建议响应处理：

- `2xx`：返回 JSON。
- `204`：返回 `null`。
- `401`：清理 token，跳转登录页。
- `403`：toast 提示无权限。
- 其他错误：优先显示后端 `message`。

请求封装伪代码：

```js
export function request({ url, method = 'GET', data, auth = true }) {
  const token = uni.getStorageSync('qxin_token')
  return new Promise((resolve, reject) => {
    uni.request({
      url: API_BASE + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {})
      },
      success(res) {
        if (res.statusCode === 204) return resolve(null)
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve(res.data)
        if (res.statusCode === 401) {
          uni.removeStorageSync('qxin_token')
          uni.removeStorageSync('qxin_user')
          uni.reLaunch({ url: '/pages/auth/login' })
        }
        reject(new Error((res.data && res.data.message) || '请求失败'))
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络连接失败'))
      }
    })
  })
}
```

## 8. 后端接口清单

以下接口基于当前 Express 后端。

### 8.1 基础

#### 健康检查

`GET /api/health`

返回：

```json
{
  "mysql": { "ready": true, "host": "", "port": 3306, "latency": 0 },
  "redis": { "ready": true, "host": "", "port": 6379, "latency": 0 }
}
```

用途：

- 我的/关于页展示服务状态。
- 管理员轻量后台展示数据库连接。

#### 关于系统

`GET /api/system/about`

返回：

```json
{
  "name": "mychat",
  "version": "1.1.0",
  "build": "local-dev",
  "time": 1710000000000,
  "counts": {
    "users": 0,
    "news": 0,
    "comments": 0,
    "friendships": 0
  },
  "mysql": { "ready": true },
  "redis": { "ready": true }
}
```

### 8.2 认证与用户

#### 登录

`POST /api/auth/login`

请求：

```json
{
  "username": "admin",
  "password": "1234"
}
```

兼容字段：

- `username`
- `account`
- `name`

返回：

```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "name": "admin",
    "role": "admin",
    "avatarUrl": "/static/img/avatar/default.png",
    "email": ""
  },
  "token": "jwt-token"
}
```

手机端行为：

- 登录成功后存储 token 和 user。
- 初始化 Socket.IO。
- 根据 `role === 'admin'` 显示管理员入口。

#### 注册

`POST /api/auth/register`

请求：

```json
{
  "username": "user001",
  "password": "1234",
  "email": "user001@example.com",
  "avatarUrl": "/static/img/avatar/default.png"
}
```

返回同登录。

#### 获取当前用户

`GET /api/auth/me`

鉴权：需要 token。

返回：

```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "name": "admin",
    "role": "admin",
    "avatarUrl": "/static/img/avatar/default.png",
    "email": ""
  }
}
```

#### 修改密码

`PUT /api/auth/password`

请求：

```json
{
  "oldPassword": "1234",
  "newPassword": "5678"
}
```

返回：

```json
{ "message": "密码修改成功" }
```

#### 修改资料

`PUT /api/auth/profile`

请求：

```json
{
  "name": "新的昵称",
  "avatarUrl": "/assets/files/avatar.png",
  "email": "new@example.com"
}
```

返回：

```json
{ "user": {} }
```

注意：当前后端不保存个性签名。如果手机端需要签名，前端可先本地保存，或后端新增字段。

### 8.3 二维码登录

手机端用于扫描桌面端二维码后确认登录。

桌面端生成二维码：

`GET /api/auth/qr/generate`

返回：

```json
{
  "sessionId": "uuid",
  "host": "http://192.168.x.x:3000"
}
```

手机端确认：

`POST /api/auth/qr/confirm`

鉴权：手机端已登录。

请求：

```json
{
  "sessionId": "uuid"
}
```

返回：

```json
{
  "status": "confirmed",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "avatarUrl": ""
  }
}
```

手机端页面逻辑：

1. 调用 `uni.scanCode`。
2. 解析二维码内容中的 `sessionId`。
3. 弹出确认页：是否允许电脑端登录 Q信。
4. 用户确认后调用 `/api/auth/qr/confirm`。
5. 成功后 toast：已确认登录。

二维码有效期：120 秒。

### 8.4 好友

#### 获取好友列表

`GET /api/friends`

返回：

```json
{
  "friends": {
    "accepted": [],
    "sent": [],
    "received": []
  }
}
```

好友对象：

```json
{
  "id": 2,
  "name": "user2",
  "username": "user2",
  "role": "user",
  "avatarUrl": "/static/img/avatar/default.png",
  "type": "user",
  "status": "accepted"
}
```

#### 发起好友申请

`POST /api/friends/request`

请求：

```json
{ "targetId": 2 }
```

返回：

```json
{ "status": "sent" }
```

#### 通过好友申请

`POST /api/friends/:id/accept`

返回：

```json
{ "status": "accepted" }
```

#### 删除好友

`DELETE /api/friends/:id`

返回：

```json
{ "status": "deleted" }
```

手机端功能：

- 好友列表分组：好友、收到的申请、已发送。
- 支持从在线用户或用户 ID 添加好友。
- 好友状态与 Socket 事件同步。

### 8.5 Socket.IO 实时聊天

连接地址：

```text
http://<server-host>:3000
```

连接配置：

```js
io(BASE_URL, {
  transports: ['websocket'],
  auth: { token },
  extraHeaders: { token }
})
```

App/H5 推荐带 `auth.token`。小程序端如果 `extraHeaders` 不稳定，以 `auth` 为主。

服务端事件：

#### 自动 token 登录

连接时服务端读取 token，成功后发：

`loginSuccess`

返回参数：

```js
data = {
  user,
  token,
  friends
}
users = [
  { id: 'group_001', name: '群聊天室', avatarUrl: 'static/img/avatar/group-icon.png', type: 'group' },
  { id: 2, name: 'user2', username: 'user2', type: 'user', roomId: 'socket-id' }
]
```

#### 账号密码登录

如果没有 token，可发：

`login`

参数：

```js
{
  username: 'admin',
  password: '1234'
}
```

手机端建议仍以 REST 登录为主，Socket 只做 token 连接。

#### 发送消息

事件：

`message`

参数：

```js
from = currentUser
to = session.raw
message = '文本内容或文件地址'
type = 'text' | 'image' | 'file'
```

群聊：

```js
to = {
  id: 'group_001',
  name: '群聊天室',
  type: 'group'
}
```

私聊：

```js
to = {
  id: 2,
  name: 'user2',
  type: 'user',
  roomId: 'socket-id'
}
```

接收事件：

- `message(from, to, message, type)`
- `file-message(from, to, message, type)`
- `system(user, action)`，action 为 `join` 或 `logout`
- `history-message(sessionId, messages)`
- `friend-request(from, to)`
- `friend-request-sent(from, to, result)`
- `friend-accepted(from, to, result)`
- `friend-deleted(from, to)`
- `friend-error(message)`
- `loginFail(message)`

聊天端状态设计：

- `sessions`: 会话列表，包含群聊、在线用户、好友。
- `messages`: 按 sessionId 存消息数组。
- `unreadMap`: 未读数。
- `currentSessionId`: 当前会话。
- `onlineUsers`: Socket 返回的在线用户。
- `friends`: REST 或 Socket 返回的好友关系。

消息对象建议：

```js
{
  id: Date.now(),
  sessionId: 'group_001',
  author: 'admin',
  avatar: '/static/img/avatar/default.png',
  time: '刚刚',
  text: '[微笑] 你好',
  type: 'text',
  image: '',
  fileUrl: '',
  mine: true,
  status: 'sending' | 'sent' | 'failed'
}
```

### 8.6 文件上传

`POST /upload/file`

表单字段：

```text
file
```

限制：

- 图片：jpeg、jpg、png、gif
- 文档：txt、pdf
- 默认最大 5 MB

返回：

```json
{
  "filePath": "/assets/files/1710000000000.png",
  "filename": "原始文件名.png",
  "size": 12345
}
```

uni-app 实现：

```js
uni.uploadFile({
  url: API_BASE + '/upload/file',
  filePath,
  name: 'file',
  header: { Authorization: `Bearer ${token}` },
  success(res) {
    const data = JSON.parse(res.data)
  }
})
```

注意：当前上传接口没有强制鉴权。手机端仍建议带 token，后续可给后端补鉴权。

### 8.7 新闻中心

#### 新闻列表

`GET /api/news`

查询参数：

```text
page=1
pageSize=10
categoryId=1
keyword=搜索词
authorId=1
status=published|draft
startDate=2026-01-01
endDate=2026-12-31
sort=newest|hot
```

返回由 `newsService.listNews` 生成，通常包含：

```json
{
  "data": [
    {
      "id": 1,
      "title": "新闻标题",
      "summary": "摘要",
      "coverImage": "",
      "publishedAt": "2026-05-24T00:00:00.000Z",
      "authorId": 1,
      "author": "admin",
      "categoryId": 1,
      "categoryName": "社区动态",
      "status": "published",
      "viewCount": 10,
      "commentCount": 2,
      "likeCount": 0,
      "score": 0
    }
  ],
  "page": 1,
  "pageSize": 10,
  "total": 100
}
```

手机端要兼容 `data`、`list`、`items` 三种数组字段，桌面端已有这种兼容经验。

#### 热门新闻

`GET /api/news/hot?limit=10`

#### 最近新闻

`GET /api/news/recent?limit=10`

#### 新闻详情

`GET /api/news/:id`

返回：

```json
{
  "id": 1,
  "title": "新闻标题",
  "summary": "摘要",
  "content": "正文",
  "coverImage": "",
  "status": "published",
  "authorId": 1,
  "author": "admin",
  "categoryId": 1,
  "categoryName": "社区动态",
  "viewCount": 10,
  "commentCount": 2,
  "attachments": []
}
```

进入详情页时调用：

`POST /api/news/:id/views`

用于增加浏览量。

#### 发布新闻

`POST /api/news`

鉴权：需要 token。

请求：

```json
{
  "title": "新闻标题",
  "slug": "optional-slug",
  "summary": "新闻摘要",
  "content": "新闻正文",
  "categoryId": 1,
  "categoryName": "社区动态",
  "status": "published",
  "coverImage": "/assets/files/cover.png",
  "attachments": [
    {
      "filename": "附件.pdf",
      "filePath": "/assets/files/xxx.pdf",
      "fileType": "application/pdf",
      "fileSize": 12345
    }
  ]
}
```

注意：

- `title`、`content`、`categoryId` 必填。
- 后端已经兼容 `categoryName`，如果没有 `categoryId` 会查找或创建分类。
- 普通用户只能管理自己的新闻；管理员可管理全部。

返回：

```json
{ "id": 123 }
```

#### 编辑新闻

`PUT /api/news/:id`

请求字段同发布。

#### 删除新闻

`DELETE /api/news/:id`

返回 204。

手机端删除必须使用海岛风格确认弹窗，不要使用系统默认生硬确认框作为最终效果。

#### 分类

`GET /api/news/categories`

返回：

```json
[
  {
    "id": 1,
    "name": "社区动态",
    "description": "社区动态相关内容",
    "createdAt": "",
    "updatedAt": ""
  }
]
```

管理员：

- `POST /api/news/categories`
- `PUT /api/news/categories/:id`
- `DELETE /api/news/categories/:id`

#### 评论

列表：

`GET /api/news/:id/comments?page=1&pageSize=20`

返回：

```json
{
  "data": [
    {
      "id": 1,
      "content": "评论内容",
      "createdAt": "",
      "userId": 1,
      "username": "admin",
      "avatarUrl": ""
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 10
}
```

新增：

`POST /api/news/:id/comments`

请求：

```json
{ "content": "评论内容" }
```

删除：

`DELETE /api/news/:id/comments/:commentId`

### 8.8 管理员新闻能力

管理员接口都要求：

- 已登录
- `user.role === 'admin'`

统计：

`GET /api/news/stats`

返回字段：

```json
{
  "perCategory": [],
  "perAuthor": [],
  "totals": {},
  "totalNews": 0,
  "totalUsers": 0,
  "totalAuthors": 0,
  "totalCategories": 0,
  "userGrowth": [
    {
      "date": "2026-05-24",
      "newUsers": 1,
      "totalUsers": 10
    }
  ]
}
```

审核日志：

`GET /api/news/audit/logs?limit=200`

备份：

- `GET /api/news/admin/backup`
- `POST /api/news/admin/backup`
- `POST /api/news/admin/restore`

危险操作：

- `POST /api/news/admin/reset`，仅 root 可用。
- `POST /api/news/admin/seed`，仅 root 可用。

手机端管理员页面建议：

- 首页：文章总数、用户数、分类数、作者数、近 12 天用户增长。
- 文章管理：搜索、筛选、编辑、删除。
- 分类管理：新增、编辑、删除。
- 审核日志：只读列表。
- 备份恢复：放在二级页面，并二次确认。
- reset/seed 默认不展示，或只给 root 展示。

### 8.9 AI 助手

#### AI 对话

`POST /api/ai/chat`

鉴权：需要 token。

请求：

```json
{
  "prompt": "请根据新闻中心生成一篇活动文章"
}
```

返回：

```json
{
  "answer": "AI 回复",
  "provider": "local",
  "articleDraft": {
    "title": "草稿标题",
    "summary": "草稿摘要",
    "categoryName": "社区动态",
    "tags": ["社区动态", "AI 生成", "新闻中心"],
    "content": "正文"
  },
  "newsReferences": [
    { "id": 1, "title": "参考新闻", "categoryName": "社区动态" }
  ]
}
```

手机端行为：

- AI 回复以聊天气泡展示。
- 如果返回 `articleDraft`，显示草稿卡片。
- 草稿卡片按钮：
  - 填入发布页
  - 直接发布到新闻中心
- 直接发布时调用 `POST /api/news`，使用 `categoryName` 自动建分类或匹配分类。

#### AI 配置

`GET /api/ai/config`

返回：

```json
{
  "enabled": true,
  "provider": "deepseek",
  "providerLabel": "DeepSeek",
  "model": "deepseek-chat",
  "endpoint": "https://api.deepseek.com/v1",
  "hasApiKey": true
}
```

`PUT /api/ai/config`

请求：

```json
{
  "enabled": true,
  "provider": "deepseek",
  "model": "deepseek-chat",
  "endpoint": "https://api.deepseek.com/v1",
  "apiKey": "optional"
}
```

建议：手机端普通用户不展示 API Key 配置。管理员或设置页高级选项可以展示。

### 8.10 设置

获取：

`GET /api/settings`

保存：

`PUT /api/settings`

当前桌面端设置字段建议手机端沿用：

```json
{
  "theme": "fresh",
  "fontSize": "medium",
  "language": "简体中文",
  "messageNotice": true,
  "soundNotice": true,
  "desktopNotice": true,
  "groupNotice": true,
  "specialCare": true,
  "sendShortcut": "enter",
  "historyDays": "30",
  "autoDownload": false,
  "imagePreview": true,
  "emojiRecommend": true,
  "profileVisible": "everyone",
  "friendVerify": false,
  "deviceCount": 1,
  "cacheUsed": 0,
  "storageUsed": 0
}
```

移动端适配：

- `desktopNotice` 改为 `pushNotice` 或沿用字段但文案显示“系统通知”。
- `sendShortcut` 在手机端意义不大，可隐藏或显示为“发送按钮/换行键行为”。
- `autoDownload` 在 App 端需请求存储权限；H5 端能力有限。
- `imagePreview`、`emojiRecommend` 保留。
- `theme` 支持清新绿、浅色、深色。
- `fontSize` 支持小、标准、大。

## 9. 页面详细功能

### 9.1 登录页

功能：

- 账号密码登录。
- 注册入口。
- 忘记密码入口可先做静态提示，后端暂未提供验证码找回接口。
- 显示服务地址设置入口，用于真机联调修改 API_BASE。
- 登录成功后跳转 Tab 首页。

校验：

- 账号非空。
- 密码非空。
- 登录失败显示后端 message。

### 9.2 注册页

功能：

- 输入账号、密码、确认密码、邮箱可选。
- 可选择默认头像。
- 注册成功自动登录。

校验：

- 密码至少 3 位，与后端一致。
- 账号不能为 `admin`。

### 9.3 会话列表

组成：

- 搜索框。
- 群聊天室固定置顶。
- 好友会话。
- 在线用户。
- 未读徽标。
- 最近一条消息。
- 连接状态提示。

点击会话进入 `pages/chat/room.vue`。

空状态：

- 没有好友时显示添加好友入口。
- 没有消息时显示小岛插画和快捷入口。

### 9.4 聊天页

功能：

- 文本消息。
- 表情消息。
- 图片消息。
- 文件消息。
- 群聊。
- 私聊。
- 历史群聊消息。
- 未读清零。
- 长按消息：复制、收藏、删除本地、转发预留。
- 图片点击预览。
- 文件点击下载/打开。

输入区：

- 左侧表情按钮。
- 图片按钮。
- 文件按钮。
- 文本输入框。
- 发送按钮。
- 适配安全区和键盘弹起。

表情：

- 使用现有 `[微笑]` 这种文本标记。
- 渲染时拆分文本，把匹配标记替换为 GIF。
- 发送到后端仍传文本，不直接传图片二进制。

### 9.5 好友页

入口可放在“我的”或会话页右上角。

功能：

- 好友列表。
- 收到的申请。
- 已发送申请。
- 添加好友。
- 删除好友。
- 通过申请。

移动端优先做 ID 添加，搜索用户接口当前后端没有，需要新增时再加。

### 9.6 新闻首页

功能：

- 顶部搜索。
- 分类横向滚动。
- 热门新闻横向区域。
- 新闻列表下拉刷新、触底加载。
- 按最新/热门排序。
- 点击进入详情。

数据：

- 分类：`GET /api/news/categories`
- 列表：`GET /api/news`
- 热门：`GET /api/news/hot`
- 最近：`GET /api/news/recent`

### 9.7 新闻详情

功能：

- 标题、作者、分类、时间、浏览量。
- 封面图。
- 正文。
- 附件。
- 评论列表。
- 评论发布。
- 作者本人或管理员显示编辑/删除。

进入详情后：

- 先 `GET /api/news/:id`
- 再 `POST /api/news/:id/views`
- 再 `GET /api/news/:id/comments`

### 9.8 发布/编辑新闻

功能：

- 标题。
- 分类选择或输入。
- 摘要。
- 正文。
- 封面上传。
- 附件上传。
- 保存草稿。
- 发布。

字段规则：

- 标题 5 到 80 字。
- 摘要 10 到 200 字。
- 正文不能为空。
- 分类必须选择或填写。

草稿：

- 本地草稿存在 `uni.setStorageSync('qxin_publish_draft', draft)`。
- AI 生成草稿可直接填入。

### 9.9 AI 助手

功能：

- 对话列表本地存储。
- 当前对话消息流。
- 快捷提示词：
  - 总结新闻
  - 写一篇活动策划
  - 推荐内容主题
  - 生成新闻中心文章
- 根据新闻中心数据库回答。
- 生成文章草稿。
- 一键填入发布页。
- 一键发布到新闻中心。

状态：

- loading 中显示“正在从新闻中心整理内容”。
- 返回 `newsReferences` 时显示引用文章。
- 返回 `articleDraft` 时显示草稿卡片。

### 9.10 我的与设置

我的页：

- 用户头像、昵称、账号、角色。
- 扫码登录电脑端。
- 好友管理。
- 消息设置。
- 外观设置。
- 数据与存储。
- 关于 Q信。
- 管理员入口。
- 退出登录。

资料页：

- 修改昵称。
- 修改头像地址或上传头像。
- 邮箱。

设置页：

- 主题：清新绿、浅色、深色。
- 字号：小、标准、大。
- 通知：消息通知、声音、群聊提醒、特别关注。
- 消息：图片预览、表情推荐、自动下载。
- 隐私：谁可以看资料、好友验证。

数据与存储：

- 缓存占用估算。
- 清理 AI 对话本地缓存。
- 清理本地聊天缓存。
- 导出聊天记录 JSON。
- 导入聊天记录 JSON。

### 9.11 管理员轻量后台

只对 `role === 'admin'` 显示。

页面：

- 管理首页：统计卡片、用户增长、分类占比、热门内容。
- 文章管理：列表、搜索、编辑、删除。
- 分类管理：增删改。
- 审核日志：只读。
- 数据备份：备份、恢复。

删除弹窗：

- 使用自定义海岛风格弹窗。
- 明确显示文章标题。
- 二次确认。
- 删除成功后本地列表乐观更新，再后台刷新。

## 10. 状态管理设计

### auth store

字段：

```js
{
  token: '',
  user: null,
  isLoggedIn: false,
  isAdmin: false,
  apiBase: ''
}
```

动作：

- `login(payload)`
- `register(payload)`
- `loadMe()`
- `updateProfile(payload)`
- `changePassword(payload)`
- `logout()`
- `restoreSession()`

### chat store

字段：

```js
{
  socket: null,
  connected: false,
  sessions: [],
  messages: {},
  currentSessionId: '',
  onlineUsers: [],
  friends: { accepted: [], sent: [], received: [] },
  unreadMap: {}
}
```

动作：

- `connectSocket()`
- `disconnectSocket()`
- `sendMessage({ session, content, type })`
- `receiveMessage(from, to, message, type)`
- `loadFriends()`
- `requestFriend(id)`
- `acceptFriend(id)`
- `deleteFriend(id)`
- `markRead(sessionId)`

### news store

字段：

```js
{
  categories: [],
  list: [],
  page: 1,
  pageSize: 10,
  total: 0,
  keyword: '',
  activeCategoryId: '',
  current: null,
  comments: []
}
```

动作：

- `loadCategories()`
- `loadNews({ reset })`
- `loadDetail(id)`
- `incrementView(id)`
- `loadComments(id)`
- `createComment(id, content)`
- `createNews(payload)`
- `updateNews(id, payload)`
- `deleteNews(id)`

### ai store

字段：

```js
{
  threads: [],
  activeThreadId: '',
  messagesByThread: {},
  loading: false,
  config: null
}
```

动作：

- `ask(prompt)`
- `newThread()`
- `deleteThread(id)`
- `useDraft(draft)`
- `publishDraft(draft)`

### settings store

字段：

```js
{
  settings: {},
  storageUsage: {},
  uploadedFiles: []
}
```

动作：

- `loadSettings()`
- `saveSettings(partial)`
- `applyTheme()`
- `clearCache()`
- `exportMessages()`
- `importMessages(file)`

## 11. 与现有后端的差异和需要补充的接口

首期尽量不改后端即可完成主要功能。但以下能力如果要做得更完整，建议新增接口：

### 11.1 用户搜索

当前只能通过已知用户 ID 添加好友。建议新增：

`GET /api/auth/users?keyword=xxx`

返回：

```json
{
  "data": [
    {
      "id": 2,
      "username": "user2",
      "name": "user2",
      "avatarUrl": "",
      "role": "user"
    }
  ]
}
```

用途：

- 手机端添加好友搜索。
- 不返回密码、邮箱等敏感信息。

### 11.2 聊天历史按会话分页

当前群聊历史通过 Socket `history-message` 返回，私聊历史不完整。建议新增：

`GET /api/messages?sessionId=group_001&page=1&pageSize=30`

返回：

```json
{
  "data": [],
  "page": 1,
  "pageSize": 30,
  "total": 0
}
```

用途：

- 聊天页上拉加载历史。
- 私聊持久化。

### 11.3 收藏消息与提到我的

当前桌面端有入口概念，但后端没有完整持久化。建议新增：

- `POST /api/messages/:id/favorite`
- `DELETE /api/messages/:id/favorite`
- `GET /api/messages/favorites`
- `GET /api/messages/mentions`

首期手机端可以先做本地收藏。

### 11.4 移动端推送

如果做 App 推送，需接入 uni-push 或厂商推送。后端需要保存设备 token：

`PUT /api/devices/push-token`

请求：

```json
{
  "platform": "android",
  "pushToken": "token"
}
```

首期可以只做应用内通知和未读数。

## 12. 联调注意事项

### 12.1 真机访问后端

不要在真机 App 中使用 `127.0.0.1` 访问电脑后端。应使用电脑局域网 IP：

```text
http://192.168.x.x:3000
```

确保：

- 手机和电脑在同一网络。
- Windows 防火墙允许 Node 服务端口。
- 后端启动端口为 3000。

### 12.2 H5 跨域

当前后端 Socket.IO CORS 已允许 `*`。Express REST 如果 H5 跨域遇到问题，需要新增 CORS 中间件：

```js
const cors = require('cors')
app.use(cors())
```

如果 uni-app H5 通过 dev server 代理，也可配置代理。

### 12.3 Socket.IO 版本

当前后端：

- `socket.io` `^4.4.0`

手机端 `socket.io-client` 建议：

- 使用兼容的 `^4.4.0` 或同大版本。

### 12.4 图片和文件地址

后端返回的文件地址通常是相对路径：

```text
/assets/files/xxx.png
```

手机端渲染前必须拼接：

```js
function normalizeAssetUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return API_BASE + url
}
```

### 12.5 时间格式

后端会返回 ISO 时间或时间戳。手机端统一格式：

- 刚刚：小于 1 分钟。
- 分钟前：小于 1 小时。
- 今天 HH:mm。
- 昨天 HH:mm。
- 更早：MM-DD HH:mm。

## 13. 开发阶段计划

### 阶段 0：项目初始化

目标：

- 创建 `mobile` uni-app 项目。
- 配置 SCSS、Pinia、请求封装、基础路由、静态资源。
- 跑通 H5。

验收：

- H5 能打开登录页。
- 能配置 API_BASE。
- `GET /api/system/about` 可请求成功。

### 阶段 1：认证与框架

目标：

- 登录、注册、退出。
- token 持久化。
- Tab 首页框架。
- 我的页展示用户信息。

验收：

- `admin/1234` 能登录。
- 普通用户注册后能登录。
- 关闭重开仍保持登录。
- 401 自动回登录。

### 阶段 2：聊天与好友

目标：

- Socket.IO 连接。
- 群聊收发。
- 会话列表。
- 表情。
- 图片/文件上传发送。
- 好友列表、申请、通过、删除。

验收：

- 两个浏览器/手机用户能互发群聊消息。
- 发送表情能显示 GIF。
- 上传图片后聊天中可预览。
- 好友申请能实时通知。

### 阶段 3：新闻中心

目标：

- 新闻首页。
- 分类筛选。
- 搜索。
- 详情。
- 浏览量。
- 评论。

验收：

- 新闻列表来自数据库。
- 搜索和分类有效。
- 进入详情浏览量增加。
- 登录用户可评论。

### 阶段 4：发布与 AI

目标：

- 发布/编辑新闻。
- 封面和附件上传。
- AI 对话。
- AI 草稿填入发布页。
- AI 草稿一键发布。

验收：

- 手机端发布后桌面新闻中心可看到。
- AI 能根据新闻中心内容回答。
- 文章生成返回草稿卡片。
- 草稿发布后进入新闻详情。

### 阶段 5：设置与管理员

目标：

- 外观、通知、消息、数据与存储设置。
- 管理员统计。
- 文章管理。
- 分类管理。
- 审核日志。

验收：

- 设置能保存到后端。
- 主题/字号本地立即生效。
- 管理员能删除文章并刷新列表。
- 统计数据来自真实接口。

### 阶段 6：真机适配与打包

目标：

- Android 真机调试。
- 键盘、安全区、上传、扫码。
- 图标和启动图。
- 性能优化。

验收：

- 真机能登录、聊天、发图片、看新闻、扫码确认桌面登录。
- 页面无明显遮挡。
- 弱网时有 loading 和错误提示。

## 14. 关键验收清单

功能：

- 登录注册可用。
- token 持久化可用。
- 群聊可实时收发。
- 私聊可用。
- 好友申请完整闭环。
- 图片和文件上传可用。
- 表情可显示。
- 新闻列表来自数据库。
- 发布后新闻中心和管理员列表同步。
- AI 能结合新闻中心回答。
- AI 草稿可发布。
- 设置可保存。
- 管理员统计是真实数据。

体验：

- 手机端没有桌面侧栏。
- 底部 Tab 清晰。
- 输入栏不被键盘遮挡。
- 删除确认是海岛风格。
- 深色模式可用。
- 大字号不溢出。
- 空状态有明确行动入口。

技术：

- API 请求统一封装。
- Socket 断线重连。
- 资源 URL 统一拼接。
- 错误统一 toast。
- 不修改 `db/config.json`。
- 保持 UTF-8，中文不乱码。

## 15. 推荐给下一个对话的开场提示

可以把下面这段发给另一个对话：

```text
请在 D:\数据库实验\课程设计\03_项目源码\mychat 这个现有 Q信 MyChat 项目中新增 uni-app 手机端，放在 mobile 目录。不要重写后端，不要修改 db/config.json。请严格阅读并执行 UNIAPP_MOBILE_DEVELOPMENT_PLAN.md。

手机端必须复用现有 Express + Socket.IO + MySQL 后端接口，保持 Q信清新岛屿风格，覆盖登录注册、会话列表、群聊/私聊、好友申请、新闻中心、新闻详情评论、发布/编辑新闻、AI 助手、设置、扫码确认桌面登录和管理员轻量后台。

优先完成 H5 可运行版本，然后适配 Android 真机。所有中文文件保持 UTF-8，不要用会导致中文乱码的写入方式。开发完成后请给出启动命令、联调地址、已完成页面、未完成事项和验证结果。
```

## 16. 首次开发建议命令

如果使用 HBuilderX 创建项目，可直接创建到：

```text
D:\数据库实验\课程设计\03_项目源码\mychat\mobile
```

如果使用命令行创建，需要按当前机器环境选择已安装的 uni-app 脚手架。创建后第一批文件至少包括：

```text
mobile/pages.json
mobile/manifest.json
mobile/App.vue
mobile/main.js
mobile/src/api/request.js
mobile/src/store/auth.js
mobile/src/styles/tokens.scss
mobile/pages/auth/login.vue
mobile/pages/chat/index.vue
mobile/pages/news/index.vue
mobile/pages/ai/index.vue
mobile/pages/mine/index.vue
```

不要一开始就追求所有页面完成。先跑通登录、请求封装和 Tab，再接 Socket 和新闻。
