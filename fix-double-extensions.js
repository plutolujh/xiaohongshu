import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import os from 'os'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const KNOWN_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif']

function getCleanExtension(filename) {
  const lower = filename.toLowerCase()
  for (const ext of KNOWN_EXTS) {
    if (lower.endsWith(ext)) {
      return ext
    }
  }
  return null
}

function hasDoubleExtension(filename) {
  const lower = filename.toLowerCase()
  for (const ext of KNOWN_EXTS) {
    if (ext === '.jpeg') {
      if (lower.endsWith('.jpeg.jpeg')) return true
    } else if (ext === '.jpg') {
      if (lower.endsWith('.jpg.jpg')) return true
    } else if (lower.endsWith(`${ext}${ext}`)) {
      return true
    }
  }
  return false
}

function fixDoubleExtension(filename) {
  const lower = filename.toLowerCase()
  // Find the last valid extension
  let ext = null
  let extIndex = -1
  for (const e of KNOWN_EXTS) {
    const idx = lower.lastIndexOf(e)
    if (idx > extIndex) {
      extIndex = idx
      ext = e
    }
  }

  if (!ext || extIndex === -1) return filename

  // Check if there's a duplicate extension before this one
  const beforeExt = filename.substring(0, extIndex)
  const lowerBeforeExt = beforeExt.toLowerCase()

  // If the part before the extension also ends with a known extension, remove it
  for (const e of KNOWN_EXTS) {
    if (lowerBeforeExt.endsWith(e)) {
      // Remove the duplicate extension part
      const cleanBase = beforeExt.substring(0, beforeExt.length - e.length)
      return cleanBase + ext
    }
  }

  // No duplicate found, just remove the extension and add it back
  const baseName = filename.substring(0, extIndex)
  return baseName + ext
}

async function renameFile(bucketName, oldPath, newPath) {
  const tmpDir = os.tmpdir()

  try {
    // 1. Download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(oldPath)

    if (downloadError) {
      return { error: downloadError }
    }

    // 2. Upload with new name
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(newPath, fileData, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      return { error: uploadError }
    }

    // 3. Delete old file
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([oldPath])

    if (deleteError) {
      console.log(`   警告: 删除旧文件失败: ${deleteError.message}`)
    }

    return { error: null }
  } catch (err) {
    return { error: err }
  }
}

async function fixDoubleExtensions() {
  console.log('=== 修复双扩展名问题 ===\n')

  const fileMapping = []
  let fixedCount = 0

  // 1. 处理 files 文件夹
  console.log('1. 扫描 files 文件夹...')
  const { data: files, error: filesError } = await supabase.storage
    .from('xiaohongbucket')
    .list('files', { limit: 500 })

  if (filesError) {
    console.error('列出文件失败:', filesError)
    return
  }

  console.log(`   找到 ${files.length} 个文件`)

  for (const file of files) {
    const oldName = file.name
    if (hasDoubleExtension(oldName)) {
      const newName = fixDoubleExtension(oldName)
      console.log(`\n   发现双扩展名: ${oldName}`)
      console.log(`   新名称: ${newName}`)

      const result = await renameFile('xiaohongbucket', `files/${oldName}`, `files/${newName}`)

      if (result.error) {
        console.error(`   重命名失败: ${result.error.message}`)
      } else {
        console.log(`   重命名成功`)
        fileMapping.push({
          oldUrl: `https://fzxuotfihpbzozjoplim.supabase.co/storage/v1/object/public/xiaohongbucket/files/${oldName}`,
          newUrl: `https://fzxuotfihpbzozjoplim.supabase.co/storage/v1/object/public/xiaohongbucket/files/${newName}`
        })
        fixedCount++
      }
    }
  }

  // 2. 处理 avatars 文件夹
  console.log('\n\n2. 扫描 avatars 文件夹...')
  const { data: avatars, error: avatarsError } = await supabase.storage
    .from('xiaohongbucket')
    .list('avatars', { limit: 500 })

  if (avatarsError) {
    console.error('列出头像文件失败:', avatarsError)
  } else {
    console.log(`   找到 ${avatars.length} 个头像文件`)
    for (const file of avatars) {
      const oldName = file.name
      if (hasDoubleExtension(oldName)) {
        const newName = fixDoubleExtension(oldName)
        console.log(`\n   发现双扩展名: ${oldName}`)
        console.log(`   新名称: ${newName}`)

        const result = await renameFile('xiaohongbucket', `avatars/${oldName}`, `avatars/${newName}`)

        if (result.error) {
          console.error(`   重命名失败: ${result.error.message}`)
        } else {
          console.log(`   重命名成功`)
          fileMapping.push({
            oldUrl: `https://fzxuotfihpbzozjoplim.supabase.co/storage/v1/object/public/xiaohongbucket/avatars/${oldName}`,
            newUrl: `https://fzxuotfihpbzozjoplim.supabase.co/storage/v1/object/public/xiaohongbucket/avatars/${newName}`
          })
          fixedCount++
        }
      }
    }
  }

  if (fixedCount === 0) {
    console.log('\n没有发现双扩展名的文件')
  }

  // 3. 更新数据库中的笔记图片URL
  console.log('\n\n3. 更新数据库中的笔记图片URL...')

  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('id, images')

  if (notesError) {
    console.error('查询笔记失败:', notesError)
  } else {
    let dbUpdated = 0
    for (const note of notes) {
      if (!note.images) continue

      let images
      try {
        images = JSON.parse(note.images)
      } catch {
        continue
      }

      if (!Array.isArray(images)) continue

      let needUpdate = false
      const newImages = images.map(url => {
        for (const mapping of fileMapping) {
          if (url === mapping.oldUrl) {
            console.log(`   笔记 ${note.id}: ${url.split('/').pop()} → ${mapping.newUrl.split('/').pop()}`)
            needUpdate = true
            return mapping.newUrl
          }
        }
        return url
      })

      if (needUpdate) {
        const { error: updateError } = await supabase
          .from('notes')
          .update({ images: JSON.stringify(newImages) })
          .eq('id', note.id)

        if (updateError) {
          console.error(`   更新笔记 ${note.id} 失败: ${updateError.message}`)
        } else {
          dbUpdated++
        }
      }
    }
    console.log(`   更新了 ${dbUpdated} 条笔记的图片URL`)
  }

  // 4. 更新 user_uploads 表
  console.log('\n4. 更新 user_uploads 表...')
  const { data: uploads, error: uploadsError } = await supabase
    .from('user_uploads')
    .select('id, url')

  if (uploadsError) {
    console.log('   user_uploads 表不存在或查询失败，跳过')
  } else {
    let uploadsUpdated = 0
    for (const upload of uploads) {
      for (const mapping of fileMapping) {
        if (upload.url === mapping.oldUrl) {
          console.log(`   user_upload ${upload.id}: ${upload.url.split('/').pop()} → ${mapping.newUrl.split('/').pop()}`)
          await supabase
            .from('user_uploads')
            .update({ url: mapping.newUrl })
            .eq('id', upload.id)
          uploadsUpdated++
          break
        }
      }
    }
    console.log(`   更新了 ${uploadsUpdated} 条 user_uploads 记录`)
  }

  console.log(`\n\n=== 完成！修复了 ${fixedCount} 个文件的扩展名 ===`)
}

fixDoubleExtensions().catch(console.error)
