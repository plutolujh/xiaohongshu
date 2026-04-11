import { BaseRepository } from './BaseRepository.js'

export class UserRepository extends BaseRepository {
  constructor(supabase) {
    super(supabase, 'users')
  }

  async findByUsername(username) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }

  async findByEmail(email) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }

  async createWithPassword(userData) {
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        id: userData.id || crypto.randomUUID(),
        username: userData.username,
        password: userData.password,
        nickname: userData.nickname || userData.username,
        avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`,
        role: userData.role || 'user',
        status: userData.status || 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updatePassword(id, newPassword) {
    const { error } = await this.supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', id)

    if (error) throw error
    return true
  }

  async updateRole(id, role) {
    const { error } = await this.supabase
      .from('users')
      .update({ role })
      .eq('id', id)

    if (error) throw error
    return true
  }

  async updateStatus(id, status) {
    const { error } = await this.supabase
      .from('users')
      .update({ status })
      .eq('id', id)

    if (error) throw error
    return true
  }

  async updateProfile(id, updates) {
    const allowedFields = ['nickname', 'avatar', 'bio']
    const filteredUpdates = {}
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return this.findById(id)
    }

    const { data, error } = await this.supabase
      .from('users')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async follow(followerId, followingId) {
    const { error } = await this.supabase
      .from('follows')
      .insert({
        id: crypto.randomUUID(),
        follower_id: followerId,
        following_id: followingId
      })

    if (error) throw error
    return true
  }

  async unfollow(followerId, followingId) {
    const { error } = await this.supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)

    if (error) throw error
    return true
  }

  async isFollowing(followerId, followingId) {
    const { data, error } = await this.supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return !!data
  }

  async getFollowers(userId, options = {}) {
    let query = this.supabase
      .from('follows')
      .select(`
        follower:users!followers_follower_id_fkey(*)
      `)
      .eq('following_id', userId)

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data.map(item => item.follower)
  }

  async getFollowing(userId, options = {}) {
    let query = this.supabase
      .from('follows')
      .select(`
        following:users!follows_following_id_fkey(*)
      `)
      .eq('follower_id', userId)

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data.map(item => item.following)
  }

  async getFollowCounts(userId) {
    const { count: followers, error: err1 } = await this.supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)

    const { count: following, error: err2 } = await this.supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId)

    if (err1) throw err1
    if (err2) throw err2

    return { followers, following }
  }

  async addLikedTag(userId, tagId) {
    const { error } = await this.supabase
      .from('user_likes')
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        tag_id: tagId
      })

    if (error) throw error
    return true
  }

  async removeLikedTag(userId, tagId) {
    const { error } = await this.supabase
      .from('user_likes')
      .delete()
      .eq('user_id', userId)
      .eq('tag_id', tagId)

    if (error) throw error
    return true
  }

  async getLikedTags(userId) {
    const { data, error } = await this.supabase
      .from('user_likes')
      .select(`
        tag:tags(*)
      `)
      .eq('user_id', userId)

    if (error) throw error
    return data.map(item => item.tag)
  }
}
