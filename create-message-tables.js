import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createMessageTables() {
  try {
    console.log('开始创建私信功能表结构...');
    
    // 直接创建对话表
    console.log('创建 conversations 表...');
    const { error: createConvError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT,
          is_group BOOLEAN DEFAULT false,
          last_message TEXT,
          last_message_time TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `
    });
    
    if (createConvError) {
      console.error('创建 conversations 表失败:', createConvError);
      return;
    }
    console.log('conversations 表创建成功');
    
    // 直接创建对话成员表
    console.log('创建 conversation_members 表...');
    const { error: createMemberError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversation_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          last_read TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(conversation_id, user_id)
        )
      `
    });
    
    if (createMemberError) {
      console.error('创建 conversation_members 表失败:', createMemberError);
      return;
    }
    console.log('conversation_members 表创建成功');
    
    // 直接创建消息表
    console.log('创建 messages 表...');
    const { error: createMessageError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL,
          content TEXT NOT NULL,
          type TEXT DEFAULT 'text',
          status TEXT DEFAULT 'sent',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `
    });
    
    if (createMessageError) {
      console.error('创建 messages 表失败:', createMessageError);
      return;
    }
    console.log('messages 表创建成功');
    
    // 创建索引
    console.log('创建索引...');
    const { error: indexError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON conversation_members(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      `
    });
    
    if (indexError) {
      console.error('创建索引失败:', indexError);
      return;
    }
    
    console.log('索引创建成功');
    console.log('私信功能表结构创建完成！');
    
  } catch (error) {
    console.error('创建表结构时出错:', error);
  }
}

// 执行创建表操作
createMessageTables();
