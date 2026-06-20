export interface Profile {
  id: string
  name: string
  color: string
  avatar_url: string | null
  created_at: string
}

export interface Hero {
  id: string
  profile_id: string
  tag: string
  title: string
  description: string | null
  background_url: string | null
  updated_at: string
}

export interface MemoryRow {
  id: string
  profile_id: string
  title: string
  position: number
  created_at: string
  cards?: Card[]
}

export interface Card {
  id: string
  row_id: string
  title: string
  year: string | null
  match_text: string
  message: string | null
  media_url: string | null
  media_type: 'image' | 'video'
  thumbnail_url: string | null
  position: number
  created_at: string
}
