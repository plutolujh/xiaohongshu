import { BaseRepository } from './BaseRepository.js'

export class FeedbackRepository extends BaseRepository {
  constructor(supabase) {
    super(supabase, 'feedback')
  }

  async findByUserId(userId) {
    return this.findWhere('user_id', userId, {
      orderBy: { column: 'created_at', ascending: false }
    })
  }

  async createFeedback(feedbackData) {
    const { data, error } = await this.supabase
      .from('feedback')
      .insert({
        id: feedbackData.id || crypto.randomUUID(),
        user_id: feedbackData.userId || feedbackData.user_id,
        user_name: feedbackData.userName || feedbackData.user_name,
        content: feedbackData.content,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateStatus(id, status) {
    const { error } = await this.supabase
      .from('feedback')
      .update({ status })
      .eq('id', id)

    if (error) throw error
    return true
  }

  async findPending() {
    return this.findWhere('status', 'pending', {
      orderBy: { column: 'created_at', ascending: false }
    })
  }
}
