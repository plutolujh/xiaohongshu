import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
dotenv.config()

// Supabase客户端
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function updateBucketPublic() {
  console.log('更新存储桶访问权限...')
  
  try {
    // 更新存储桶为公开
    console.log('将 xiaohongbucket 设置为公开...')
    const { data, error } = await supabase.storage
      .updateBucket('xiaohongbucket', {
        public: true
      })
    
    if (error) {
      console.error('更新存储桶失败:', error)
      return
    }
    
    console.log('存储桶更新成功:', data)
    
    // 验证更新结果
    console.log('验证存储桶状态...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('列出存储桶失败:', bucketsError)
      return
    }
    
    const xiaohongbucket = buckets.find(bucket => bucket.name === 'xiaohongbucket')
    console.log('更新后的存储桶状态:', xiaohongbucket)
    console.log('存储桶访问权限:', xiaohongbucket.public ? '公开' : '私有')
    
  } catch (error) {
    console.error('更新存储桶失败:', error)
  }
}

// 运行更新
updateBucketPublic()
