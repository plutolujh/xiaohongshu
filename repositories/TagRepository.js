import { BaseRepository } from './BaseRepository.js'

export class TagRepository extends BaseRepository {
  constructor(supabase) {
    super(supabase, 'tags')
  }

  async findPopular(limit = 10) {
    const { data, error } = await this.supabase
      .from('tags')
      .select(`
        id,
        name,
        created_at,
        note_count:note_tags(count)
      `)
      .order('name')
      .limit(limit)

    if (error) throw error
    return data
  }

  async findWithNoteCount(limit) {
    const { data, error } = await this.supabase
      .from('tags')
      .select('*, note_tags(count)')
      .order('name')

    if (error) throw error

    const tagsWithCount = data.map(tag => ({
      id: tag.id,
      name: tag.name,
      created_at: tag.created_at,
      note_count: tag.note_tags?.[0]?.count || 0
    }))

    const sorted = tagsWithCount.sort((a, b) => {
      if (b.note_count !== a.note_count) return b.note_count - a.note_count
      return a.name.localeCompare(b.name)
    })

    return limit ? sorted.slice(0, limit) : sorted
  }

  async findByName(name) {
    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .eq('name', name)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }

  async findOrCreate(name) {
    const existing = await this.findByName(name)
    if (existing) return existing

    const { data, error } = await this.supabase
      .from('tags')
      .insert({ id: crypto.randomUUID(), name, created_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async addNoteTag(noteId, tagId) {
    const { error } = await this.supabase
      .from('note_tags')
      .insert({
        id: crypto.randomUUID(),
        note_id: noteId,
        tag_id: tagId
      })

    if (error) throw error
    return true
  }

  async removeNoteTag(noteId, tagId) {
    const { error } = await this.supabase
      .from('note_tags')
      .delete()
      .eq('note_id', noteId)
      .eq('tag_id', tagId)

    if (error) throw error
    return true
  }

  async removeAllNoteTags(noteId) {
    const { error } = await this.supabase
      .from('note_tags')
      .delete()
      .eq('note_id', noteId)

    if (error) throw error
    return true
  }

  async getNoteTags(noteId) {
    const { data, error } = await this.supabase
      .from('note_tags')
      .select(`
        tag:tags(*)
      `)
      .eq('note_id', noteId)

    if (error) throw error
    return data.map(item => item.tag)
  }

  async getTagNotes(tagId) {
    const { data, error } = await this.supabase
      .from('note_tags')
      .select(`
        note:notes(*)
      `)
      .eq('tag_id', tagId)

    if (error) throw error
    return data.map(item => item.note)
  }
}
