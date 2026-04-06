# 小红书美食分享平台

一个基于React和Express的美食分享平台，用户可以发布、查看和分享美食笔记。

## 技术栈

### 前端
- React 18.2.0
- React Router 6.20.0
- Vite 5.0.0

### 后端
- Express 4.18.2
- sql.js (SQLite数据库)
- bcrypt (密码加密)
- jsonwebtoken (JWT认证)
- cors (跨域处理)

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

### 安全特性
- 密码bcrypt加密存储
- SQL注入防护（参数化查询）
- JWT token认证
- CORS跨域配置
- 全局错误处理

### 其他特性
- 图片上传和压缩
- 响应式设计

## 安装和运行

### 前提条件
- Node.js 18.0.0或更高版本
- npm 9.0.0或更高版本

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd xiaohongshu
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
# 同时启动前端和后端服务器（推荐）
npm run dev:full

# 或者分别启动
# 启动后端服务器
npm run server
# 启动前端开发服务器
npm run dev
```

4. 访问应用
- 前端：http://localhost:3000
- 后端API：http://localhost:3001

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
│   │   ├── ErrorBoundary.jsx    # 错误边界组件
│   │   ├── Navbar.jsx           # 导航栏组件
│   │   ├── NoteCard.jsx         # 笔记卡片组件
│   │   └── ProtectedRoute.jsx   # 受保护路由组件
│   ├── context/         # 上下文
│   │   └── AuthContext.jsx      # 认证上下文
│   ├── pages/           # 页面
│   │   ├── Home.jsx             # 首页
│   │   ├── Login.jsx            # 登录页
│   │   ├── Register.jsx         # 注册页
│   │   ├── Publish.jsx          # 发布笔记页
│   │   ├── EditNote.jsx         # 编辑笔记页
│   │   ├── NoteDetail.jsx       # 笔记详情页
│   │   └── Profile.jsx          # 个人资料页
│   ├── utils/           # 工具函数
│   │   └── db.js                # API调用工具
│   ├── App.jsx          # 应用主组件
│   └── main.jsx         # 应用入口
├── server.js            # 后端服务器
├── xiaohongshu.db       # SQLite数据库
├── package.json         # 项目配置
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

### 评论API

#### GET /api/comments/:noteId
- 获取笔记评论
- 响应：`[{"id": "...", "note_id": "...", "user_id": "...", "user_name": "...", "content": "...", "created_at": "..."}]`

#### POST /api/comments
- 添加评论
- 请求体：`{"note_id": "...", "content": "..."}`
- 响应：`{"success": true, "comment": {...}}`

#### DELETE /api/comments/:id
- 删除评论
- 响应：`{"success": true}`

## 安全措施

1. **密码安全**：使用bcrypt对密码进行加密存储
2. **SQL注入防护**：所有数据库查询使用参数化查询
3. **JWT认证**：使用JSON Web Token进行用户认证
4. **CORS配置**：限制跨域请求为特定域名
5. **API请求验证**：验证请求方法、路径和请求体
6. **全局错误处理**：捕获和处理服务器端错误
7. **前端错误边界**：捕获和处理React组件错误

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
5. 点击部署

### 环境变量说明

| 变量名 | 说明 | 是否必需 | 默认值 |
|--------|------|----------|--------|
| `NODE_ENV` | 运行环境 | 是 | `development` |
| `PORT` | 服务器端口 | 否 | `3001` |
| `JWT_SECRET` | JWT密钥 | 生产环境必需 | - |

### 部署注意事项

1. **数据库**：生产环境使用SQLite数据库，数据存储在`database.sqlite`文件中
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

访问 http://localhost:3001 即可查看生产版本。
