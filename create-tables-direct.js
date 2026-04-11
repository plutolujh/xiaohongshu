import { Pool } from 'pg';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 从 DATABASE_URL 中提取连接信息
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL 环境变量未设置');
  process.exit(1);
}

// 创建 PostgreSQL 连接池
const pool = new Pool({ connectionString: databaseUrl });

async function createMessageTables() {
  let client;
  try {
    console.log('开始创建私信功能表结构...');
    
    // 获取数据库连接
    client = await pool.connect();
    
    // 创建对话表
    console.log('创建 conversations 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        is_group BOOLEAN DEFAULT false,
        last_message TEXT,
        last_message_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('conversations 表创建成功');
    
    // 创建对话成员表
    console.log('创建 conversation_members 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversation_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        last_read TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(conversation_id, user_id)
      )
    `);
    console.log('conversation_members 表创建成功');
    
    // 创建消息表
    console.log('创建 messages 表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        status TEXT DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('messages 表创建成功');
    
    // 创建索引
    console.log('创建索引...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON conversation_members(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    `);
    console.log('索引创建成功');
    
    console.log('私信功能表结构创建完成！');
    
  } catch (error) {
    console.error('创建表结构时出错:', error);
  } finally {
    // 释放连接
    if (client) {
      client.release();
    }
    // 关闭连接池
    await pool.end();
  }
}

// 执行创建表操作
createMessageTables();
