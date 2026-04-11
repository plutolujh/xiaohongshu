import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
dotenv.config()

// Supabase客户端
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkNoteTags() {
  console.log('检查 note_tags 表内容...')
  
  try {
    // 查询 note_tags 表
    const { data: noteTags, error: noteTagsError } = await supabase
      .from('note_tags')
      .select('*')
    
    if (noteTagsError) {
      console.error('查询 note_tags 表失败:', noteTagsError)
      return
    }
    
    console.log(`note_tags 表共有 ${noteTags.length} 条记录:`)
    console.log(noteTags)
    
    // 查询笔记的标签
    if (noteTags.length > 0) {
      const noteId = noteTags[0].note_id
      console.log(`\n测试获取笔记 ${noteId} 的标签:`)
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('id, name')
        .join('note_tags', 'tags.id', 'note_tags.tag_id')
        .eq('note_tags.note_id', noteId)
      
      if (tagsError) {
        console.error('查询笔记标签失败:', tagsError)
      } else {
        console.log('笔记标签:', tags)
      }
    }
    
  } catch (error) {
    console.error('检查过程出错:', error)
  }
}

// 运行检查
checkNoteTags()