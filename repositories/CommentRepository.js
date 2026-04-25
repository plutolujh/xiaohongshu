import { BaseRepository } from './BaseRepository.js'

export class CommentRepository extends BaseRepository {
  constructor(supabase) {
    super(supabase, 'comments')
  }

  async findByNoteId(noteId, options = {}) {
    let query = this.supabase
      .from('comments')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: options.ascending ?? true })

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  async findByUserId(userId) {
    return this.findWhere('user_id', userId, {
      orderBy: { column: 'created_at', ascending: false }
    })
  }

  async createComment(commentData) {
    const { data, error } = await this.supabase
      .from('comments')
      .insert({
        id: commentData.id || crypto.randomUUID(),
        note_id: commentData.noteId || commentData.note_id,
        user_id: commentData.userId || commentData.user_id,
        content: commentData.content,
        user_name: commentData.userName || commentData.user_name,
        user_avatar: commentData.userAvatar || commentData.user_avatar
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteByNoteId(noteId) {
    const { error } = await this.supabase
      .from('comments')
      .delete()
      .eq('note_id', noteId)

    if (error) throw error
    return true
  }
}
