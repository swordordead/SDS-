# SDS 自动生成工具

将 Excel 产品数据快速转换为符合 **US GHS / OSHA HazCom 2012** 标准的 SDS 文档（PDF + Word）。

---

## 功能特性

- **拖拽上传** Excel (.xlsx/.xls/.csv) 文件
- **智能字段映射**：将 Excel 列名自动或手动映射到 SDS 16 Section 字段
- **映射方案持久化**：保存/加载常用映射方案（localStorage）
- **SDS 编辑器**：按 Section 导航，支持直接编辑所有 SDS 字段
- **AI 一键填充**：基于产品名称和成分，使用 Gemini AI 补全全部或单个字段
- **实时预览**：在线预览 SDS 排版
- **双格式导出**：支持 PDF、Word (.docx)，或同时下载两种
- **批量导出**：多产品一键批量生成，打包为 ZIP 下载
- **亮暗主题**：跟随系统偏好，支持手动切换

---

## 技术栈

| 层次 | 选型 |
|------|------|
| 前端 | Vue 3 + `<script setup>` + Vite 7 |
| 样式 | Tailwind CSS 4.x（@theme token）|
| 后端 | Node.js + Express |
| Excel 解析 | SheetJS（服务端）|
| PDF 生成 | Puppeteer（Headless Chrome）|
| Word 生成 | docx 库 |
| 批量打包 | archiver（ZIP 流式输出）|
| AI 补全 | Gemini API（密钥仅存服务端环境变量）|
| 部署 | Zeabur（单一 Node.js 服务）|

---

## 目录结构

```
sds-tool/
├── client/                    # Vue 3 前端源码
│   ├── src/
│   │   ├── data/sdsFields.js  # SDS 16 Section 字段定义（中英双语）
│   │   ├── components/
│   │   │   ├── FileUpload.vue      # 拖拽上传 Excel
│   │   │   ├── ColumnMapper.vue    # 字段映射 UI
│   │   │   ├── ProductList.vue     # 产品列表 + 批量选择
│   │   │   ├── SdsEditor.vue       # SDS 编辑器 + AI 填充 + 下载
│   │   │   └── BatchExport.vue     # 批量导出进度
│   │   ├── composables/
│   │   │   ├── useApi.js           # API 请求封装
│   │   │   ├── useColumnMapping.js # 映射配置持久化
│   │   │   └── useTheme.js         # 主题切换
│   │   └── App.vue                 # 主流程状态机
│   └── vite.config.js
│
├── server/                    # Express 后端
│   ├── public/                # Vite 构建输出（不提交 git）
│   ├── routes/
│   │   ├── upload.js          # POST /api/upload — Excel 解析
│   │   ├── generate.js        # POST /api/generate — 单份 PDF/Word
│   │   ├── batch.js           # POST /api/batch — 批量 ZIP
│   │   └── aiFill.js          # POST /api/ai-fill — AI 补全
│   ├── templates/
│   │   ├── sdsTemplate.js     # SDS HTML 模板（供 PDF 渲染）
│   │   └── sdsDocxTemplate.js # SDS Word 模板（docx 库）
│   ├── data/
│   │   └── sdsFields.js       # 字段定义（CommonJS）
│   └── app.js                 # Express 入口
│
├── package.json               # 根 package.json（统一脚本）
├── .env.example               # 环境变量示例
├── zbpack.json                # Zeabur 部署配置
├── start.bat                  # Windows 一键启动脚本
└── dev.bat                    # 开发模式启动脚本
```

---

## 快速启动

### 方式一：双击 `start.bat`（推荐）

脚本会自动检查 Node.js、安装依赖、构建前端、检测端口冲突，并打开浏览器。

### 方式二：手动启动

```bash
# 1. 安装依赖
npm install
cd client && npm install --legacy-peer-deps && cd ..

# 2. 构建前端
cd client && npx vite build && cd ..

# 3. 启动服务
node server/app.js
# 浏览器访问 http://localhost:3100
```

### 开发模式（热更新）

```bash
# 启动后端
node server/app.js

# 新开终端启动前端 Vite dev server
cd client && npx vite
# 浏览器访问 http://localhost:5173（代理到后端 3100）
```

---

## 环境变量

复制 `.env.example` 为 `.env`，配置以下变量：

| 变量 | 说明 | 必填 |
|------|------|------|
| `GEMINI_API_KEY` | Gemini AI API 密钥（AI 填充功能） | 否 |
| `PORT` | 服务端口（默认 3100） | 否 |
| `NODE_ENV` | 环境（development/production） | 否 |

---

## API 接口

| 方法 | 路径 | 功能 |
|------|------|------|
| `POST` | `/api/upload` | 上传 Excel，返回表头和数据行 |
| `POST` | `/api/generate` | 生成单份 SDS（`format: 'pdf'|'docx'`）|
| `POST` | `/api/generate/preview` | 返回 SDS HTML 预览 |
| `POST` | `/api/batch` | 批量生成 ZIP（`format: 'pdf'|'docx'|'both'`）|
| `POST` | `/api/ai-fill` | AI 补全单个字段 |
| `POST` | `/api/ai-fill/batch` | AI 批量补全多个字段 |
| `GET`  | `/api/health` | 健康检查 |
| `GET`  | `/*` | Vue SPA 静态文件 |

---

## Zeabur 部署

1. 将 `sds-tool/` 目录推送到 GitHub
2. 在 Zeabur 创建新项目，选择 Node.js 服务
3. 构建命令：`cd client && npm install --legacy-peer-deps && npx vite build`
4. 启动命令：`node server/app.js`
5. 在 Zeabur Dashboard 配置环境变量 `GEMINI_API_KEY`

---

## 使用流程

1. **上传** Excel 文件（每行一个产品，第一行为表头）
2. **映射** Excel 列名到 SDS 字段，可保存为命名方案复用
3. **选择** 产品，点击编辑
4. **填写** SDS 数据，使用 "AI 一键填充" 自动补全空字段
5. **选择** 导出格式（PDF / Word / 两种）
6. **下载** 或批量打包导出

---

## 安全说明

- AI API 密钥仅存于服务端环境变量，前端无法访问
- 文件处理完后不持久化存储，内存中处理完即释放
- 接口配置了 `express-rate-limit` 防止滥用
- 文件上传校验 MIME 类型及大小（≤10MB）
