export class BaseRepository {
  constructor(supabase, tableName) {
    this.supabase = supabase
    this.tableName = tableName
  }

  async findAll(options = {}) {
    let query = this.supabase.from(this.tableName).select('*', { count: 'exact' })

    if (options.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true })
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

  async findById(id) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async findWhere(column, value, options = {}) {
    let query = this.supabase
      .from(this.tableName)
      .select(options.select || '*', { count: options.count ? 'exact' : 'planned' })

    if (typeof value === 'object' && value !== null) {
      for (const [key, val] of Object.entries(value)) {
        query = query.eq(key, val)
      }
    } else {
      query = query.eq(column, value)
    }

    if (options.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true })
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.single) {
      query = query.single()
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data, count }
  }

  async create(record) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(record)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async createMany(records) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(records)
      .select()

    if (error) throw error
    return data
  }

  async update(id, updates) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateWhere(column, value, updates) {
    let query = this.supabase
      .from(this.tableName)
      .update(updates)

    if (typeof value === 'object' && value !== null) {
      for (const [key, val] of Object.entries(value)) {
        query = query.eq(key, val)
      }
    } else {
      query = query.eq(column, value)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, count: data?.length || 0 }
  }

  async delete(id) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }

  async deleteWhere(column, value) {
    let query = this.supabase.from(this.tableName).delete()

    if (typeof value === 'object' && value !== null) {
      for (const [key, val] of Object.entries(value)) {
        query = query.eq(key, val)
      }
    } else {
      query = query.eq(column, value)
    }

    const { error } = await query

    if (error) throw error
    return true
  }

  async count(column, value) {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    if (column && value !== undefined) {
      query = query.eq(column, value)
    }

    const { count, error } = await query

    if (error) throw error
    return count
  }
}
