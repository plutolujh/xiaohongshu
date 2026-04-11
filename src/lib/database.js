import { createClient } from '@supabase/supabase-js'
import {
  BaseRepository,
  TagRepository,
  NoteRepository,
  UserRepository,
  CommentRepository,
  FeedbackRepository
} from './repositories/index.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const repos = createRepositories(supabase)

export { supabase, repos }

export const tagRepo = new TagRepository(supabase)
export const noteRepo = new NoteRepository(supabase)
export const userRepo = new UserRepository(supabase)
export const commentRepo = new CommentRepository(supabase)
export const feedbackRepo = new FeedbackRepository(supabase)
