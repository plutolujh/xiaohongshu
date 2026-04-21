import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixBase64Images() {
  console.log('=== 修复笔记中的 Base64 图片 ===\n')

  // 1. 查询所有笔记
  console.log('1. 查询所有笔记...')
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('id, images')

  if (notesError) {
    console.error('查询笔记失败:', notesError)
    return
  }

  console.log(`   找到 ${notes.length} 条笔记`)

  let fixedNotes = 0
  let totalBase64Fixed = 0

  for (const note of notes) {
    if (!note.images) continue

    let images
    try {
      images = JSON.parse(note.images)
    } catch {
      continue
    }

    if (!Array.isArray(images)) continue

    // 检查是否有 Base64 数据
    const base64Images = images.filter(img => img.startsWith('data:'))
    if (base64Images.length === 0) continue

    console.log(`\n   笔记 ${note.id} 有 ${base64Images.length} 个 Base64 图片`)

    const newImages = []
    let hasBase64 = false

    for (let i = 0; i < images.length; i++) {
      const img = images[i]

      if (img.startsWith('data:')) {
        hasBase64 = true
        console.log(`   处理 Base64 图片 ${i + 1}...`)

        try {
          // 解析 Base64 数据
          const base64Data = img.split(';base64,').pop()
          const buffer = Buffer.from(base64Data, 'base64')

          // 生成唯一文件名
          const uniqueFilename = `${Date.now()}_${crypto.randomUUID()}.jpg`
          const filePath = `files/${uniqueFilename}`

          // 上传到 Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('xiaohongbucket')
            .upload(filePath, buffer, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg'
            })

          if (uploadError) {
            console.error(`   上传失败: ${uploadError.message}`)
            // 保留原数据
            newImages.push(img)
          } else {
            // 获取公共 URL
            const { data: { publicUrl } } = supabase.storage
              .from('xiaohongbucket')
              .getPublicUrl(filePath)

            console.log(`   上传成功: ${uniqueFilename}`)
            newImages.push(publicUrl)
            totalBase64Fixed++
          }
        } catch (err) {
          console.error(`   处理失败: ${err.message}`)
          newImages.push(img)
        }
      } else {
        // 已经是 URL，直接使用
        newImages.push(img)
      }
    }

    if (hasBase64) {
      // 更新数据库
      const { error: updateError } = await supabase
        .from('notes')
        .update({ images: JSON.stringify(newImages) })
        .eq('id', note.id)

      if (updateError) {
        console.error(`   更新笔记失败: ${updateError.message}`)
      } else {
        console.log(`   笔记 ${note.id} 更新成功`)
        fixedNotes++
      }
    }
  }

  console.log(`\n=== 完成！修复了 ${fixedNotes} 条笔记，共 ${totalBase64Fixed} 个 Base64 图片 ===`)
}

fixBase64Images().catch(console.error)
