import express from 'express';

const app = express();
const PORT = 3004;

// 健康检查API
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
