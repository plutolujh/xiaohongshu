import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// 加载环境变量
dotenv.config()

// Supabase客户端
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function migrateImages() {
  console.log('开始迁移图片...')
  
  try {
    // 测试Supabase连接
    console.log('测试Supabase连接...')
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error('Supabase连接失败:', sessionError)
      return
    }
    console.log('Supabase连接成功')
    
    // 查询所有笔记
    console.log('查询所有笔记...')
    const { data: notes, error: queryError } = await supabase
      .from('notes')
      .select('id, images')
    
    if (queryError) {
      console.error('查询笔记失败:', queryError)
      return
    }
    
    console.log(`找到 ${notes.length} 条笔记`)
    
    if (notes.length === 0) {
      console.log('没有找到笔记，迁移完成')
      return
    }
    
    let successCount = 0
    let errorCount = 0
    
    for (const note of notes) {
      const noteId = note.id
      const imagesJson = note.images
      
      if (!imagesJson) {
        console.log(`笔记 ${noteId} 没有图片，跳过`)
        continue
      }
      
      try {
        console.log(`处理笔记 ${noteId}...`)
        const images = JSON.parse(imagesJson)
        
        if (!Array.isArray(images) || images.length === 0) {
          console.log(`笔记 ${noteId} 图片数组为空，跳过`)
          continue
        }
        
        console.log(`笔记 ${noteId} 有 ${images.length} 张图片`)
        const newImages = []
        let imageError = false
        
        for (let i = 0; i < images.length; i++) {
          const image = images[i]
          // 检查是否已经是URL
          if (image.startsWith('http://') || image.startsWith('https://')) {
            console.log(`图片 ${i+1} 已经是URL，直接使用`)
            newImages.push(image)
            continue
          }
          
          // 处理Base64图片
          try {
            console.log(`处理图片 ${i+1} (Base64)...`)
            const base64Data = image.split(';base64,').pop()
            const buffer = Buffer.from(base64Data, 'base64')
            
            // 生成唯一文件名
            const uniqueFilename = `${Date.now()}_${crypto.randomUUID()}.jpg`
            const filePath = `files/${uniqueFilename}`
            
            // 上传到Supabase Storage（带重试机制）
            let uploadResult = null
            let uploadError = null
            const maxRetries = 3
            
            for (let retry = 0; retry < maxRetries; retry++) {
              console.log(`上传图片到Supabase Storage (尝试 ${retry+1}/${maxRetries})...`)
              const { data, error } = await supabase.storage
                .from('xiaohongbucket')
                .upload(filePath, buffer, {
                  cacheControl: '3600',
                  upsert: false,
                  contentType: 'image/jpeg'
                })
              
              if (!error) {
                uploadResult = data
                break
              }
              
              uploadError = error
              console.error(`笔记 ${noteId} 上传失败 (尝试 ${retry+1}/${maxRetries}):`, error)
              // 等待1秒后重试
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            
            if (uploadError) {
              console.error(`笔记 ${noteId} 上传失败 (已达到最大重试次数):`, uploadError)
              imageError = true
              break
            }
            
            // 验证文件是否存在
            console.log(`验证文件是否存在...`)
            const { data: existsData, error: existsError } = await supabase.storage
              .from('xiaohongbucket')
              .list('files', {
                search: uniqueFilename
              })
            
            if (existsError) {
              console.error(`笔记 ${noteId} 验证文件存在失败:`, existsError)
              imageError = true
              break
            }
            
            if (!existsData || existsData.length === 0) {
              console.error(`笔记 ${noteId} 上传失败：文件不存在`)
              imageError = true
              break
            }
            
            // 获取公共URL
            const { data: { publicUrl } } = supabase.storage
              .from('xiaohongbucket')
              .getPublicUrl(filePath)
            
            console.log(`图片上传成功，URL: ${publicUrl}`)
            newImages.push(publicUrl)
          } catch (error) {
            console.error(`笔记 ${noteId} 处理图片失败:`, error)
            imageError = true
            break
          }
        }
        
        if (!imageError && newImages.length > 0) {
          // 更新数据库
          console.log(`更新笔记 ${noteId} 的图片URL...`)
          const { error: updateError } = await supabase
            .from('notes')
            .update({ images: JSON.stringify(newImages) })
            .eq('id', noteId)
          
          if (updateError) {
            console.error(`笔记 ${noteId} 更新失败:`, updateError)
            errorCount++
          } else {
            successCount++
            console.log(`笔记 ${noteId} 迁移成功`)
          }
        } else {
          errorCount++
          console.log(`笔记 ${noteId} 迁移失败`)
        }
      } catch (error) {
        errorCount++
        console.error(`笔记 ${noteId} 处理失败:`, error)
      }
    }
    
    console.log('\n迁移完成:')
    console.log(`成功: ${successCount} 条笔记`)
    console.log(`失败: ${errorCount} 条笔记`)
    console.log(`总计: ${notes.length} 条笔记`)
    
  } catch (error) {
    console.error('迁移过程出错:', error)
    console.error('错误堆栈:', error.stack)
  }
}

// 运行迁移
migrateImages()