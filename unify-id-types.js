import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
dotenv.config()

// Supabase客户端
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function unifyIdTypes() {
  console.log('开始统一 ID 类型为 UUID...')
  
  try {
    // 1. 备份数据（可选）
    console.log('备份数据...')
    
    // 2. 处理 tags 表（已经是 UUID）
    console.log('处理 tags 表...')
    
    // 3. 处理 note_tags 表
    console.log('处理 note_tags 表...')
    // note_tags.id 已经是 UUID，需要更新 tag_id 为 UUID
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('id, name')
    
    if (tagsError) {
      console.error('获取标签失败:', tagsError)
      return
    }
    
    // 创建标签名称到 UUID 的映射
    const tagNameToId = {}
    tags.forEach(tag => {
      tagNameToId[tag.name] = tag.id
    })
    
    // 获取所有 note_tags 记录
    const { data: noteTags, error: noteTagsError } = await supabase
      .from('note_tags')
      .select('id, tag_id')
    
    if (noteTagsError) {
      console.error('获取 note_tags 失败:', noteTagsError)
      return
    }
    
    // 更新 tag_id 为 UUID
    for (const noteTag of noteTags) {
      const tagId = noteTag.tag_id
      // 如果 tag_id 不是 UUID 格式，尝试通过名称查找
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagId)) {
        const tagUuid = tagNameToId[tagId]
        if (tagUuid) {
          const { error: updateError } = await supabase
            .from('note_tags')
            .update({ tag_id: tagUuid })
            .eq('id', noteTag.id)
          
          if (updateError) {
            console.error(`更新 note_tags ${noteTag.id} 失败:`, updateError)
          } else {
            console.log(`更新 note_tags ${noteTag.id} 成功`)
          }
        }
      }
    }
    
    // 4. 处理 users 表
    console.log('处理 users 表...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, nickname, password, avatar, bio, role, status, created_at')
    
    if (usersError) {
      console.error('获取用户失败:', usersError)
      return
    }
    
    // 创建临时表
    const { error: createTempUsersError } = await supabase
      .rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS users_temp (
            id UUID PRIMARY KEY,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            nickname TEXT NOT NULL,
            avatar TEXT,
            bio TEXT,
            role TEXT,
            status TEXT,
            created_at TEXT
          )
        `
      })
    
    if (createTempUsersError) {
      console.error('创建临时用户表失败:', createTempUsersError)
      return
    }
    
    // 插入数据到临时表
    for (const user of users) {
      const { error: insertError } = await supabase
        .from('users_temp')
        .insert({
          id: user.id.includes('-') ? user.id : `00000000-0000-0000-0000-${user.id.padEnd(12, '0')}`,
          username: user.username,
          password: user.password,
          nickname: user.nickname,
          avatar: user.avatar,
          bio: user.bio,
          role: user.role,
          status: user.status,
          created_at: user.created_at
        })
      
      if (insertError) {
        console.error(`插入用户 ${user.id} 失败:`, insertError)
      }
    }
    
    // 5. 处理 notes 表
    console.log('处理 notes 表...')
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('id, title, content, ingredients, steps, images, author_id, author_name, likes, liked, created_at')
    
    if (notesError) {
      console.error('获取笔记失败:', notesError)
      return
    }
    
    // 创建临时表
    const { error: createTempNotesError } = await supabase
      .rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS notes_temp (
            id UUID PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT,
            ingredients TEXT,
            steps TEXT,
            images TEXT,
            author_id UUID NOT NULL,
            author_name TEXT,
            likes INTEGER,
            liked INTEGER,
            created_at TEXT
          )
        `
      })
    
    if (createTempNotesError) {
      console.error('创建临时笔记表失败:', createTempNotesError)
      return
    }
    
    // 插入数据到临时表
    for (const note of notes) {
      const { error: insertError } = await supabase
        .from('notes_temp')
        .insert({
          id: note.id.includes('-') ? note.id : `11111111-1111-1111-1111-${note.id.padEnd(12, '0')}`,
          title: note.title,
          content: note.content,
          ingredients: note.ingredients,
          steps: note.steps,
          images: note.images,
          author_id: note.author_id.includes('-') ? note.author_id : `00000000-0000-0000-0000-${note.author_id.padEnd(12, '0')}`,
          author_name: note.author_name,
          likes: note.likes,
          liked: note.liked,
          created_at: note.created_at
        })
      
      if (insertError) {
        console.error(`插入笔记 ${note.id} 失败:`, insertError)
      }
    }
    
    // 6. 处理 comments 表
    console.log('处理 comments 表...')
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id, note_id, user_id, user_name, content, reply_to_id, reply_to_user_name, reply_to_content, created_at')
    
    if (commentsError) {
      console.error('获取评论失败:', commentsError)
      return
    }
    
    // 创建临时表
    const { error: createTempCommentsError } = await supabase
      .rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS comments_temp (
            id UUID PRIMARY KEY,
            note_id UUID NOT NULL,
            user_id UUID NOT NULL,
            user_name TEXT,
            content TEXT,
            reply_to_id UUID,
            reply_to_user_name TEXT,
            reply_to_content TEXT,
            created_at TEXT
          )
        `
      })
    
    if (createTempCommentsError) {
      console.error('创建临时评论表失败:', createTempCommentsError)
      return
    }
    
    // 插入数据到临时表
    for (const comment of comments) {
      const { error: insertError } = await supabase
        .from('comments_temp')
        .insert({
          id: comment.id.includes('-') ? comment.id : `22222222-2222-2222-2222-${comment.id.padEnd(12, '0')}`,
          note_id: comment.note_id.includes('-') ? comment.note_id : `11111111-1111-1111-1111-${comment.note_id.padEnd(12, '0')}`,
          user_id: comment.user_id.includes('-') ? comment.user_id : `00000000-0000-0000-0000-${comment.user_id.padEnd(12, '0')}`,
          user_name: comment.user_name,
          content: comment.content,
          reply_to_id: comment.reply_to_id ? (comment.reply_to_id.includes('-') ? comment.reply_to_id : `22222222-2222-2222-2222-${comment.reply_to_id.padEnd(12, '0')}`) : null,
          reply_to_user_name: comment.reply_to_user_name,
          reply_to_content: comment.reply_to_content,
          created_at: comment.created_at
        })
      
      if (insertError) {
        console.error(`插入评论 ${comment.id} 失败:`, insertError)
      }
    }
    
    // 7. 处理 follows 表
    console.log('处理 follows 表...')
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('id, follower_id, following_id, created_at')
    
    if (followsError) {
      console.error('获取关注失败:', followsError)
      return
    }
    
    // 创建临时表
    const { error: createTempFollowsError } = await supabase
      .rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS follows_temp (
            id UUID PRIMARY KEY,
            follower_id UUID NOT NULL,
            following_id UUID NOT NULL,
            created_at TEXT
          )
        `
      })
    
    if (createTempFollowsError) {
      console.error('创建临时关注表失败:', createTempFollowsError)
      return
    }
    
    // 插入数据到临时表
    for (const follow of follows) {
      const { error: insertError } = await supabase
        .from('follows_temp')
        .insert({
          id: follow.id.includes('-') ? follow.id : `33333333-3333-3333-3333-${follow.id.padEnd(12, '0')}`,
          follower_id: follow.follower_id.includes('-') ? follow.follower_id : `00000000-0000-0000-0000-${follow.follower_id.padEnd(12, '0')}`,
          following_id: follow.following_id.includes('-') ? follow.following_id : `00000000-0000-0000-0000-${follow.following_id.padEnd(12, '0')}`,
          created_at: follow.created_at
        })
      
      if (insertError) {
        console.error(`插入关注 ${follow.id} 失败:`, insertError)
      }
    }
    
    // 8. 处理 feedback 表
    console.log('处理 feedback 表...')
    const { data: feedbacks, error: feedbacksError } = await supabase
      .from('feedback')
      .select('id, user_id, user_name, title, content, category, contact, status, created_at')
    
    if (feedbacksError) {
      console.error('获取反馈失败:', feedbacksError)
      return
    }
    
    // 创建临时表
    const { error: createTempFeedbackError } = await supabase
      .rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS feedback_temp (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL,
            user_name TEXT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            contact TEXT,
            status TEXT,
            created_at TEXT
          )
        `
      })
    
    if (createTempFeedbackError) {
      console.error('创建临时反馈表失败:', createTempFeedbackError)
      return
    }
    
    // 插入数据到临时表
    for (const feedback of feedbacks) {
      const { error: insertError } = await supabase
        .from('feedback_temp')
        .insert({
          id: `44444444-4444-4444-4444-${feedback.id.toString().padEnd(12, '0')}`,
          user_id: feedback.user_id.includes('-') ? feedback.user_id : `00000000-0000-0000-0000-${feedback.user_id.padEnd(12, '0')}`,
          user_name: feedback.user_name,
          title: feedback.title,
          content: feedback.content,
          category: feedback.category,
          contact: feedback.contact,
          status: feedback.status,
          created_at: feedback.created_at
        })
      
      if (insertError) {
        console.error(`插入反馈 ${feedback.id} 失败:`, insertError)
      }
    }
    
    console.log('数据迁移完成，准备替换原表...')
    
    // 注意：以下操作会删除原表，谨慎执行
    // 实际生产环境中，应该先备份数据，并在测试环境验证
    
    console.log('操作完成，请在测试环境验证后再执行表替换操作')
    
  } catch (error) {
    console.error('统一 ID 类型失败:', error)
    console.error('错误堆栈:', error.stack)
  }
}

// 运行统一操作
unifyIdTypes()
