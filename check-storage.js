import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
dotenv.config()

// Supabase客户端
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkStorage() {
  console.log('检查Supabase Storage状态...')
  
  try {
    // 列出所有存储桶
    console.log('列出所有存储桶...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('列出存储桶失败:', bucketsError)
      return
    }
    
    console.log('存储桶列表:', buckets)
    
    // 检查xiaohongbucket是否存在
    const xiaohongbucket = buckets.find(bucket => bucket.name === 'xiaohongbucket')
    if (!xiaohongbucket) {
      console.error('存储桶 xiaohongbucket 不存在')
      return
    }
    
    console.log('xiaohongbucket 详情:', xiaohongbucket)
    
    // 检查存储桶的访问权限
    console.log('存储桶访问权限:', xiaohongbucket.public ? '公开' : '私有')
    
    // 列出files目录下的文件
    console.log('列出files目录下的文件...')
    const { data: files, error: filesError } = await supabase.storage
      .from('xiaohongbucket')
      .list('files', {
        limit: 10
      })
    
    if (filesError) {
      console.error('列出文件失败:', filesError)
      return
    }
    
    console.log('files目录下的文件:', files)
    
  } catch (error) {
    console.error('检查存储失败:', error)
  }
}

// 运行检查
checkStorage()
