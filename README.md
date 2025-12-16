# 聊天室项目启动方法

本项目是一个实时聊天应用程序，前端使用 Vue.js 构建，后端使用 Node.js 和 Socket.IO。

## 开始之前

请确保您的电脑上已安装以下软件：

*   **Node.js**: 推荐使用最新的 LTS (长期支持) 版本。您可以从 [nodejs.org](https://nodejs.org/) 下载并安装。Node.js 会自带 npm (Node 包管理器)。
*   **mysql**:确保端口未被占用
*   **redis** 确保端口未被占用

## 安装步骤

1.  **克隆项目仓库** (如果您尚未克隆):

    ```bash
    git clone <您的项目仓库地址>
    cd mychat
    ```

2.  **安装项目依赖**:

    进入 `mychat` 目录后，在命令行中运行以下命令，安装前端和后端所需的所有依赖：

    ```bash
    npm install
    ```

---

## 数据库与 Redis 配置

### 准备 MySQL 数据库

1. 启动 MySQL 服务。
2. 创建数据库（名称可自定义，需与配置一致）：

```sql
CREATE DATABASE mychat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. 使用项目中的建表脚本（ news_schema.sql 等）初始化表结构。
4. 确保可以从应用服务器访问 Redis，例如：

```
sudo systemctl status mysql
//如未启动使用
sudo systemctl start mysql
```



> 如果你在本机部署，请将上面的 IP 改为 `127.0.0.1` 或实际 MySQL 主机地址。

### 准备 Redis

1. 启动 Redis 服务，确认端口与密码（如有）。
2. 确保可以从应用服务器访问 Redis，例如：

```
sudo systemctl status redis
//如未启动使用
sudo systemctl start redis
```

###  配置文件 db/config.json

项目默认配置文件位于：`db/config.json`，示例（请根据实际环境修改）：

```json
{
	"mysql": {
		"host": "192.168.29.129",
		"port": 3306,
		"user": "root",
		"password": "Aa123456",
		"database": "mychat",
		"connectionLimit": 10,
		"timezone": "+08:00",
		"charset": "utf8mb4"
	},
	"redis": {
		"host": "192.168.29.129",
		"port": 6379,
		"password": "",
		"db": 0,
		"keyPrefix": "mychat:news:"
	},
	"upload": {
		"maxFileSizeMB": 10
	}
}
```

## 开发环境运行

开发阶段通常使用前端开发服务器 + 后端服务分开运行，体验更好、热更新更快。

### 启动后端服务（开发/测试）

后端入口为 `server/index.js`，默认监听端口：3000。

```powershell
cd mychat
npm run prod
```

如果希望修改后端监听端口，可在启动时设置环境变量：

```powershell
$env:PORT="4000";
npm run prod
```

### 启动前端开发服务器

前端通过 `vue-cli-service serve` 启动开发服务器（默认 8080），并通过代理转发到后端。

1. 在 PowerShell 中配置代理后端地址（与后端实际地址保持一致）：

```powershell
$env:PROXY_SERVER="http://localhost:3000";
npm run serve
```

2. 浏览器访问：

- 本机：<http://localhost:8080>

此时：

- 前端：8080 端口（Webpack 开发服务器）
- 后端 API / Socket.IO / 上传：通过 `vue.config.js` 中的代理转发到 `PROXY_SERVER`

---

## 一键启动（集成前后端）

如果不需要前端热更新，可以使用项目提供的一键启动脚本，它会：

1. 构建前端（生成 dist 静态文件）
2. 启动后端服务并托管静态资源

命令：

```powershell
cd mychat
npm start
```

默认情况下：

- 后端监听端口：3000（可通过 `PORT` 环境变量覆盖）

- 前端访问地址（通常，根据终端提示而定）：
	- 本机：<http://localhost:8080>
	
	  ![image-20251216194119026](C:\Users\Tenz\AppData\Roaming\Typora\typora-user-images\image-20251216194119026.png)

---

## Electron 桌面版打包与运行

项目内置 Electron 打包配置，可以构建 Windows 下的独立桌面应用，应用名为“Q信”。

###  打包命令

```powershell
cd mychat
npm run electron:build
```

构建完成后，会在 `dist_electron/` 或 `dist/` 下生成安装包/可执行文件（具体路径以构建日志为准）。

### 运行桌面版

1. 双击生成的 `.exe` 安装或直接运行便携版。
2. 首次启动时，Electron 主进程会在本机启动后端服务，并在内置浏览器窗口中加载前端页面。
3. 注意使用前需要前往配置数据库。
4. 关闭主窗口即会停止内置后端。

---

## AI 助手与 API 配置

项目内置 AI 助手（AiAssistant.vue），通过外部大模型 API（例如 SiliconFlow）实现智能推荐、总结和一键生成新闻文章并写入数据库。

### 前端 AI Key 配置

首次使用 AI 助手时：

1. 打开应用右侧/顶部的 AI 助手面板。
2. 进入“设置”或“配置”弹窗。
3. 填入你的大模型服务 API Key（例如 SiliconFlow 的 Key），并保存。

> API Key 会保存在本地浏览器或 Electron 本地存储中，不会上传到服务器。请妥善保管，避免泄露。

###  AI 典型用法

- “推荐热门”：AI 先调用后端接口获取当前热点新闻，再基于这些数据生成自然语言推荐；
- “总结动态”：AI 基于最新新闻流，自动生成汇总点评；
- “一键发文”：AI 根据你的提示撰写新闻内容，并通过调用后端 `createNews` API 写入 MySQL，直接出现在新闻中心列表中。

---

## 进阶用法



**目标：让 exe端 和浏览器都连到同一个服务器**

###  步骤

1. 不要再 `npm run prod` / `npm start`，把你自己开的 Node 后端关掉。
2. 先启动 exe

- 双击 Q信 的 exe，等它自己把内置后端启动好。
- 它会在本地起一个服务，地址大概是 `http://127.0.0.1:3123`（或日志里显示的 Local 地址）。

3. 浏览器访问内置服务

- 在浏览器地址栏直接输入：`http://127.0.0.1:3123`，这样就完成互通了。

  

---



## 常见问题与排查

### 1. 启动时报 MySQL 相关错误

- 检查 `db/config.json` 中的 `mysql` 配置是否正确（host/port/user/password/database）。
- 确认 MySQL 已启动，并且可以从命令行连接：

```powershell
mysql -h 127.0.0.1 -P 3306 -u root -p
```

###  启动时报 Redis 相关错误

- 检查 `db/config.json` 中的 `redis` 配置是否正确。
- 确认 Redis 已启动并且可访问：

```powershell
redis-cli -h 127.0.0.1 -p 6379 ping
```

### 前端可以打开，但新闻/聊天功能无法使用

- 检查后端是否运行在预期端口（默认 3000）。
- 开发模式下确认 `PROXY_SERVER` 环境变量是否指向正确的后端地址。
- 查看浏览器控制台和 Network 面板中接口报错信息。

###  Electron 桌面版无法启动

- 确认系统已安装所需运行库（如 VC++ 运行时，通常 electron-builder 会集成）。
- 确认当前电脑的端口（默认 3000）未被其他进程占用。
- 如有杀毒软件拦截，请将 Q信 添加到信任列表。

## 附录：关键脚本速查

- `npm run serve`：仅启动前端开发服务器（需单独启动后端）。
- `npm run prod`：仅启动后端服务器，使用 dist 中已构建好的前端资源。
- `npm start`：一键构建前端并启动后端（常用于本地一体化运行）。
- `npm run build`：构建前端静态资源（生产环境）。
- `npm run electron:build`：打包生成 Q信 Windows 桌面应用。

