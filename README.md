# 小红书美食分享平台

一个基于React和Express的美食分享平台，用户可以发布、查看和分享美食笔记。

## 技术栈

### 前端
- React 18.2.0
- React Router 6.20.0
- Vite 5.0.0
- Chart.js 4.5.1 (数据可视化)
- React Chart.js 2 5.3.1 (图表组件)
- heic2any 0.0.4 (图片格式转换)

### 后端
- Express 4.18.2
- PostgreSQL (数据库)
- bcrypt (密码加密)
- jsonwebtoken (JWT认证)
- cors (跨域处理)
- dotenv (环境变量管理)

## 功能特性

### 用户功能
- 用户注册和登录
- JWT认证
- 个人资料查看

### 笔记功能
- 发布美食笔记（支持标题、内容、食材、步骤、图片）
- 编辑已发布的笔记
- 查看笔记详情
- 分页浏览笔记
- 按标签筛选笔记

### 管理员功能
- 用户管理（查看、编辑、删除用户）
- 笔记管理（查看、删除笔记）
- 反馈管理（查看、回复用户反馈）
- 数据库管理（备份、恢复数据库）
- 系统状态监控（CPU、内存使用情况）

### 国际化
- 支持中英文双语切换
- 响应式语言切换控件
- 语言偏好持久化

### 主题管理
- 支持浅色/深色主题切换
- 主题偏好持久化

### 安全特性
- 密码bcrypt加密存储
- SQL注入防护（参数化查询）
- JWT token认证
- CORS跨域配置
- 全局错误处理

### 其他特性
- 图片上传和压缩
- 响应式设计
- 系统日志和监控
- 数据库自动初始化

## 安装和运行

### 前提条件
- Node.js 18.0.0或更高版本
- npm 9.0.0或更高版本
- PostgreSQL数据库

### 安装步骤

1. 克隆项目
```bash
git clone https://github.com/plutolujh/xiaohongshu.git
cd xiaohongshu
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
创建 `.env` 文件，添加以下内容：
```
NODE_ENV=development
PORT=3004
JWT_SECRET=your-jwt-secret-key
DATABASE_URL=postgresql://username:password@localhost:5432/database-name
```

4. 启动开发服务器
```bash
# 同时启动前端和后端服务器（推荐）
npm run dev:full

# 或者分别启动
# 启动后端服务器
npm run server
# 启动前端开发服务器
npm run dev
```

5. 访问应用
- 前端：http://localhost:3003
- 后端API：http://localhost:3004

### 启动后状态
- 数据库会自动初始化
- 默认创建管理员账号：`lujh`（密码：`123456`）
- 前端开发服务器支持热重载
- 后端服务器提供API接口服务

### 构建生产版本
```bash
npm run build
```
构建产物将生成在 `dist` 目录中。

## 项目结构

```
xiaohongshu/
├── src/                 # 前端源代码
│   ├── components/      # 组件
│   │   ├── AdminRoute.jsx        # 管理员路由组件
│   │   ├── ErrorBoundary.jsx     # 错误边界组件
│   │   ├── Footer.jsx            # 页脚组件
│   │   ├── Loading.jsx           # 加载组件
│   │   ├── Navbar.jsx            # 导航栏组件
│   │   ├── NoteCard.jsx          # 笔记卡片组件
│   │   ├── ProtectedRoute.jsx    # 受保护路由组件
│   │   ├── TagInput.jsx          # 标签输入组件
│   │   └── ThemeManager.jsx      # 主题管理组件
│   ├── context/         # 上下文
│   │   ├── AuthContext.jsx       # 认证上下文
│   │   ├── I18nContext.jsx       # 国际化上下文
│   │   └── ThemeContext.jsx      # 主题上下文
│   ├── i18n/            # 国际化
│   │   ├── en-US.js              # 英文翻译
│   │   ├── i18n.js               # 国际化配置
│   │   └── zh-CN.js              # 中文翻译
│   ├── pages/           # 页面
│   │   ├── Home.jsx              # 首页
│   │   ├── Login.jsx             # 登录页
│   │   ├── Register.jsx          # 注册页
│   │   ├── Publish.jsx           # 发布笔记页
│   │   ├── EditNote.jsx          # 编辑笔记页
│   │   ├── NoteDetail.jsx        # 笔记详情页
│   │   ├── Profile.jsx           # 个人资料页
│   │   ├── Feedback.jsx          # 反馈页
│   │   ├── Changelog.jsx         # 更新日志页
│   │   ├── SystemStatus.jsx      # 系统状态页
│   │   ├── UserManagement.jsx    # 用户管理页
│   │   ├── NoteManagement.jsx    # 笔记管理页
│   │   ├── FeedbackManagement.jsx # 反馈管理页
│   │   └── DatabaseManagement.jsx # 数据库管理页
│   ├── styles/          # 样式
│   │   └── theme.css             # 主题样式
│   ├── utils/           # 工具函数
│   │   ├── db.js                 # API调用工具
│   │   ├── logger.js             # 日志工具
│   │   └── monitor.js            # 监控工具
│   ├── App.jsx          # 应用主组件
│   └── main.jsx         # 应用入口
├── server.js            # 后端服务器
├── render.yaml          # Render部署配置
├── package.json         # 项目配置
├── package-lock.json    # 依赖锁定文件
├── CHANGELOG.md         # 更新日志
└── README.md            # 项目说明
```

## API文档

### 认证API

#### POST /api/login
- 登录
- 请求体：`{"username": "...", "password": "..."}`
- 响应：`{"success": true, "user": {...}, "token": "..."}`

#### POST /api/register
- 注册
- 请求体：`{"username": "...", "password": "...", "nickname": "..."}`
- 响应：`{"success": true, "user": {...}}`

### 用户API

#### GET /api/users/:username
- 获取用户信息
- 响应：`{"id": "...", "username": "...", "nickname": "...", "avatar": "...", "created_at": "..."}`

#### GET /api/users/:id/notes
- 获取用户发布的笔记
- 响应：`{"notes": [...], "total": 100}`

### 笔记API

#### GET /api/notes
- 获取笔记列表（支持分页）
- 查询参数：`page`（页码），`limit`（每页数量）
- 响应：`{"notes": [...], "total": 100}`

#### GET /api/notes/:id
- 获取笔记详情
- 响应：`{"id": "...", "title": "...", "content": "...", "ingredients": "...", "steps": "...", "images": [...], "author_id": "...", "author_name": "...", "likes": 0, "created_at": "..."}`

#### POST /api/notes
- 发布笔记
- 请求体：`{"title": "...", "content": "...", "ingredients": "...", "steps": "...", "images": [...]}`
- 响应：`{"success": true, "note": {...}}`

#### PUT /api/notes/:id
- 更新笔记
- 请求体：`{"title": "...", "content": "...", "ingredients": "...", "steps": "...", "images": [...]}`
- 响应：`{"success": true, "note": {...}}`

#### DELETE /api/notes/:id
- 删除笔记
- 响应：`{"success": true}`

### 标签API

#### GET /api/tags
- 获取所有标签
- 响应：`[{"id": "...", "name": "...", "count": 10}]`

#### GET /api/tags/popular
- 获取热门标签
- 查询参数：`limit`（数量限制）
- 响应：`[{"id": "...", "name": "...", "count": 10}]`

#### GET /api/tags/:id/notes
- 获取标签相关的笔记
- 查询参数：`page`（页码），`limit`（每页数量）
- 响应：`{"notes": [...], "total": 100}`

### 反馈API

#### POST /api/feedback
- 提交反馈
- 请求体：`{"content": "...", "type": "..."}`
- 响应：`{"success": true, "feedback": {...}}`

#### GET /api/feedback
- 获取反馈列表（管理员）
- 响应：`[{"id": "...", "content": "...", "type": "...", "user_id": "...", "user_name": "...", "created_at": "..."}]`

### 系统API

#### GET /api/system/status
- 获取系统状态
- 响应：`{"cpu": {...}, "memory": {...}, "disk": {...}}`

#### GET /api/system/backup
- 备份数据库（管理员）
- 响应：`{"success": true, "file": "..."}`

## 安全措施

1. **密码安全**：使用bcrypt对密码进行加密存储
2. **SQL注入防护**：所有数据库查询使用参数化查询
3. **JWT认证**：使用JSON Web Token进行用户认证
4. **CORS配置**：限制跨域请求为特定域名
5. **API请求验证**：验证请求方法、路径和请求体
6. **全局错误处理**：捕获和处理服务器端错误
7. **前端错误边界**：捕获和处理React组件错误
8. **环境变量管理**：敏感信息通过环境变量配置

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 部署

### Render部署

本项目支持一键部署到Render平台。

#### 方式一：使用render.yaml配置文件

1. Fork本项目到你的GitHub账号
2. 在Render中创建新的Web Service
3. 连接你的GitHub仓库
4. Render会自动检测`render.yaml`配置文件
5. 点击部署即可

#### 方式二：手动配置

1. 在Render中创建新的Web Service
2. 连接GitHub仓库
3. 配置以下设置：
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. 添加环境变量：
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: （点击Generate生成随机值）
   - `DATABASE_URL`: （从Render PostgreSQL数据库获取）
5. 点击部署

### 环境变量说明

| 变量名 | 说明 | 是否必需 | 默认值 |
|--------|------|----------|--------|
| `NODE_ENV` | 运行环境 | 是 | `development` |
| `PORT` | 服务器端口 | 否 | `3004` |
| `JWT_SECRET` | JWT密钥 | 生产环境必需 | - |
| `DATABASE_URL` | PostgreSQL连接URL | 是 | - |

### 部署注意事项

1. **数据库**：生产环境使用PostgreSQL数据库
2. **静态文件**：生产环境下，Express会自动提供前端静态文件服务
3. **图片上传**：图片以Base64格式存储在数据库中，注意数据库大小限制
4. **内存限制**：Render免费版有内存限制，建议升级到付费版本以获得更好的性能

### 本地生产环境测试

```bash
# 构建前端
npm run build

# 启动生产服务器
NODE_ENV=production npm start
```

访问 http://localhost:3004 即可查看生产版本。

## 版本历史

- v1.8.0：新增国际化、主题管理、系统监控等功能
- v1.7.0：新增管理员功能、反馈系统
- v1.6.0：新增标签系统、按标签筛选笔记
- v1.5.0：新增图片上传功能
- v1.0.0：初始版本，基本功能实现