import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
dotenv.config()

// Supabase客户端
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixNoteTags() {
  console.log('修复 note_tags 表...')
  
  try {
    // 1. 清理 tag_id 为 null 的记录
    console.log('1. 清理 tag_id 为 null 的记录...')
    const { error: deleteError } = await supabase
      .from('note_tags')
      .delete()
      .is('tag_id', null)
    
    if (deleteError) {
      console.error('清理无效记录失败:', deleteError)
      return
    }
    console.log('清理完成')
    
    // 2. 获取所有标签
    console.log('2. 获取所有标签...')
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('id, name')
    
    if (tagsError) {
      console.error('获取标签失败:', tagsError)
      return
    }
    
    if (tags.length === 0) {
      console.error('没有标签可用')
      return
    }
    
    console.log('可用标签:', tags)
    
    // 3. 获取所有笔记
    console.log('3. 获取所有笔记...')
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('id, title')
    
    if (notesError) {
      console.error('获取笔记失败:', notesError)
      return
    }
    
    if (notes.length === 0) {
      console.error('没有笔记可用')
      return
    }
    
    console.log(`找到 ${notes.length} 条笔记`)
    
    // 4. 为笔记添加标签关联
    console.log('4. 为笔记添加标签关联...')
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i]
      // 为每条笔记随机分配1-2个标签
      const tagCount = Math.floor(Math.random() * 2) + 1
      const selectedTags = []
      
      // 随机选择标签
      while (selectedTags.length < tagCount) {
        const randomTag = tags[Math.floor(Math.random() * tags.length)]
        if (!selectedTags.includes(randomTag.id)) {
          selectedTags.push(randomTag.id)
        }
      }
      
      // 添加标签关联
      for (const tagId of selectedTags) {
        const { error: insertError } = await supabase
          .from('note_tags')
          .insert({
            id: crypto.randomUUID(),
            note_id: note.id,
            tag_id: tagId,
            created_at: new Date().toISOString()
          })
        
        if (insertError) {
          console.error(`为笔记 ${note.id} 添加标签 ${tagId} 失败:`, insertError)
          errorCount++
        } else {
          successCount++
        }
      }
    }
    
    console.log(`\n标签关联添加完成:`)
    console.log(`成功: ${successCount} 个标签关联`)
    console.log(`失败: ${errorCount} 个标签关联`)
    
    // 5. 验证热门标签
    console.log('\n5. 验证热门标签...')
    const { data: popularTags, error: popularTagsError } = await supabase
      .from('tags')
      .select('id, name, count(note_tags.note_id) as note_count')
      .leftJoin('note_tags', 'tags.id', 'note_tags.tag_id')
      .group('tags.id, tags.name')
      .order('note_count', { ascending: false })
      .limit(10)
    
    if (popularTagsError) {
      console.error('获取热门标签失败:', popularTagsError)
    } else {
      console.log('热门标签:', popularTags)
    }
    
  } catch (error) {
    console.error('修复过程出错:', error)
  }
}

// 运行修复
fixNoteTags()