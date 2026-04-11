import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
dotenv.config()

// Supabase客户端
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAllImages() {
  console.log('检查所有图片状态...')
  
  try {
    // 列出files目录下的所有文件
    console.log('列出files目录下的所有文件...')
    const { data: files, error: filesError } = await supabase.storage
      .from('xiaohongbucket')
      .list('files', {
        limit: 100
      })
    
    if (filesError) {
      console.error('列出文件失败:', filesError)
      return
    }
    
    console.log(`找到 ${files.length} 个文件`)
    
    if (files.length === 0) {
      console.log('没有找到文件')
      return
    }
    
    let successCount = 0
    let errorCount = 0
    
    for (const file of files) {
      const fileName = file.name
      const fileUrl = `https://fzxuotfihpbzozjoplim.supabase.co/storage/v1/object/public/xiaohongbucket/files/${fileName}`
      
      console.log(`\n检查文件: ${fileName}`)
      console.log(`URL: ${fileUrl}`)
      
      try {
        // 测试文件访问
        const response = await fetch(fileUrl, {
          method: 'HEAD'
        })
        
        if (response.ok) {
          console.log(`✓ 访问成功 (${response.status})`)
          successCount++
        } else {
          console.error(`✗ 访问失败 (${response.status})`)
          errorCount++
        }
      } catch (error) {
        console.error(`✗ 访问失败:`, error.message)
        errorCount++
      }
    }
    
    console.log('\n检查完成:')
    console.log(`成功: ${successCount} 个文件`)
    console.log(`失败: ${errorCount} 个文件`)
    console.log(`总计: ${files.length} 个文件`)
    
  } catch (error) {
    console.error('检查图片失败:', error)
  }
}

// 运行检查
checkAllImages()
