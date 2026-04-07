export default {
  // 导航栏
  navbar: {
    home: '首页',
    publish: '发布笔记',
    login: '登录',
    register: '注册',
    profile: '个人中心',
    logout: '退出登录',
    systemStatus: '系统状态',
    userManagement: '用户管理',
    noteManagement: '笔记管理',
    feedback: '意见反馈',
    feedbackManagement: '意见管理',
    databaseManagement: '数据库管理'
  },
  
  // 首页
  home: {
    title: '美食笔记',
    subtitle: '分享美食，记录生活',
    popularTags: '热门标签',
    noNotes: '暂无笔记',
    loadMore: '加载更多',
    loading: '加载中...',
    searchPlaceholder: '搜索笔记...',
    all: '全部',
    noTags: '暂无标签',
    pageSize: '每页显示：',
    prevPage: '上一页',
    nextPage: '下一页',
    pageInfo: '第 {page} 页，共 {totalPages} 页'
  },
  
  // 登录
  login: {
    title: '登录',
    username: '用户名',
    password: '密码',
    remember: '记住我',
    forgotPassword: '忘记密码？',
    login: '登录',
    noAccount: '还没有账号？',
    register: '立即注册',
    error: '用户名或密码错误'
  },
  
  // 注册
  register: {
    title: '注册',
    username: '用户名',
    nickname: '昵称',
    password: '密码',
    confirmPassword: '确认密码',
    register: '注册',
    hasAccount: '已有账号？',
    login: '立即登录',
    error: '注册失败',
    success: '注册成功'
  },
  
  // 发布笔记
  publish: {
    title: '发布笔记',
    noteTitle: '笔记标题',
    content: '简介',
    ingredients: '食材',
    steps: '做法',
    tags: '标签',
    addTag: '添加标签',
    uploadImage: '上传图片',
    publish: '发布',
    success: '发布成功',
    error: '发布失败'
  },
  
  // 笔记详情
  noteDetail: {
    back: '返回首页',
    edit: '编辑',
    like: '点赞',
    likes: '点赞',
    comments: '评论',
    addComment: '添加评论...',
    reply: '回复',
    delete: '删除',
    noComments: '还没有评论，快来抢沙发吧~',
    loginToComment: '登录后可以评论',
    publishing: '发布中...',
    confirmDelete: '确定删除这条评论？',
    tags: '标签'
  },
  
  // 个人中心
  profile: {
    title: '个人中心',
    myNotes: '我的笔记',
    likedNotes: '我点赞的笔记',
    noNotes: '暂无笔记',
    editProfile: '编辑资料',
    save: '保存',
    success: '保存成功',
    error: '保存失败'
  },
  
  // 系统状态
  systemStatus: {
    title: '系统状态',
    server: '服务器状态',
    database: '数据库状态',
    memory: '内存使用',
    cpu: 'CPU使用',
    uptime: '运行时间',
    version: '版本',
    lastPublish: '最后发布时间',
    loading: '加载中...'
  },
  
  // 用户管理
  userManagement: {
    title: '用户管理',
    id: 'ID',
    username: '用户名',
    nickname: '昵称',
    role: '角色',
    status: '状态',
    created: '创建时间',
    actions: '操作',
    edit: '编辑',
    delete: '删除',
    activate: '激活',
    deactivate: '禁用',
    admin: '管理员',
    user: '用户',
    active: '活跃',
    inactive: '禁用',
    confirmDelete: '确定删除用户？',
    loading: '加载中...'
  },
  
  // 笔记管理
  noteManagement: {
    title: '笔记管理',
    id: 'ID',
    title: '标题',
    author: '作者',
    likes: '点赞',
    comments: '评论',
    created: '创建时间',
    tags: '标签',
    actions: '操作',
    delete: '删除',
    loading: '加载中...',
    noNotes: '暂无笔记'
  },
  
  // 意见反馈
  feedback: {
    title: '意见反馈',
    category: '反馈类型',
    title: '标题',
    content: '反馈内容',
    contact: '联系方式',
    submit: '提交',
    success: '意见提交成功！我们会尽快处理您的反馈。',
    error: '提交失败，请稍后重试'
  },
  
  // 意见管理
  feedbackManagement: {
    title: '意见反馈管理',
    id: 'ID',
    user: '用户',
    title: '标题',
    category: '分类',
    status: '状态',
    created: '提交时间',
    actions: '操作',
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭',
    feature: '功能建议',
    bug: 'Bug报告',
    ui: '界面优化',
    other: '其他',
    loading: '加载中...',
    noFeedback: '暂无意见反馈'
  },
  
  // 数据库管理
  databaseManagement: {
    title: '数据库管理',
    info: '数据库信息',
    type: '数据库类型',
    version: '版本',
    tables: '表数量',
    tablesList: '数据库表',
    tableData: '表数据',
    sqlQuery: 'SQL查询',
    execute: '执行',
    executing: '执行中...',
    emptyQuery: 'SQL语句不能为空',
    loading: '加载中...',
    emptyData: '表中暂无数据'
  },
  
  // 页脚
  footer: {
    copyright: '© 2026 美食笔记',
    version: '版本',
    lastPublish: '最后发布',
    changelog: '修改日志',
    feedback: '意见反馈',
    github: 'GitHub',
    language: '语言',
    themeMode: '主题模式',
    system: '随系统',
    light: '亮色',
    dark: '暗色'
  },
  
  // 通用
  common: {
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    submit: '提交',
    loading: '加载中...',
    error: '出错了',
    success: '成功',
    confirm: '确认',
    cancel: '取消',
    back: '返回'
  }
}
