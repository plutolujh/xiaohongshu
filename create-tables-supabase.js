import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSql(sql) {
  try {
    // 尝试使用 rpc 执行 SQL
    const { data, error } = await supabase.rpc('pg_catalog.pg_stat_statements_reset');
    console.log('RPC 测试结果:', { data, error });
    
    // 直接尝试创建表
    console.log('尝试直接创建表...');
    
    // 使用 insert 操作来测试表是否存在
    const { error: testError } = await supabase
      .from('conversations')
      .insert({ id: 'test', name: 'test' })
      .select();
    
    console.log('测试插入结果:', { testError });
    
  } catch (error) {
    console.error('执行 SQL 时出错:', error);
  }
}

async function main() {
  console.log('开始执行 SQL 语句...');
  
  // 执行测试
  await executeSql('SELECT 1');
  
  console.log('执行完成');
}

// 执行主函数
main();
