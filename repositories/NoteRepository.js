import { BaseRepository } from './BaseRepository.js'

export class NoteRepository extends BaseRepository {
  constructor(supabase) {
    super(supabase, 'notes')
  }

  async findAll(options = {}) {
    let query = this.supabase
      .from('notes')
      .select('*', { count: 'exact' })

    if (options.authorId) {
      query = query.eq('author_id', options.authorId)
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data, count }
  }

  async findByAuthor(authorId, options = {}) {
    return this.findWhere('author_id', authorId, {
      orderBy: { column: options.orderBy || 'created_at', ascending: false },
      limit: options.limit,
      ...options
    })
  }

  async findPopular(limit = 10) {
    const { data, error } = await this.supabase
      .from('notes')
      .select('*')
      .order('likes', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  async updateLikes(id, delta) {
    const note = await this.findById(id)
    const newLikes = (note.likes || 0) + delta
    return this.update(id, { likes: Math.max(0, newLikes) })
  }

  async search(keyword, options = {}) {
    let query = this.supabase
      .from('notes')
      .select('*', { count: 'exact' })
      .or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`)
      .order('created_at', { ascending: false })

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data, count }
  }
}
