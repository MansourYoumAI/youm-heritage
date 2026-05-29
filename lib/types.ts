export type Gender = 'homme' | 'femme' | 'inconnu'
export type RelationshipType = 'parent-enfant' | 'mariage' | 'union' | 'fratrie'
export type MediaType = 'photo' | 'document'
export type SourceType = 'oral' | 'document' | 'livre' | 'archive' | 'autre'

export interface Dynasty {
  id: string
  name: string
  kingdom: string
  description: string | null
  period: string | null
  color: string
  created_at: string
  updated_at: string
}

export interface Title {
  id: string
  person_id: string
  title: string
  dynasty_id: string | null
  period: string | null
  notes: string | null
  created_at: string
  dynasty?: Dynasty
}

export interface Person {
  id: string
  first_name: string
  last_name: string
  nickname: string | null
  maiden_name: string | null
  gender: Gender
  birth_date: string | null
  death_date: string | null
  birth_place: string | null
  birth_place_other: string | null
  death_place: string | null
  biography: string | null
  historical_notes: string | null
  royal_title: string | null
  profile_picture_url: string | null
  is_royal: boolean
  dynasty_id: string | null
  display_order: number
  created_at: string
  updated_at: string
  dynasty?: Dynasty
  titles?: Title[]
  media?: Media[]
  audio_memories?: AudioMemory[]
  souvenirs?: Souvenir[]
}

export interface Relationship {
  id: string
  person1_id: string
  person2_id: string
  type: RelationshipType
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  person1?: Person
  person2?: Person
}

export interface Media {
  id: string
  person_id: string | null
  url: string
  storage_path: string | null
  type: MediaType
  caption: string | null
  year: string | null
  is_profile_picture: boolean
  display_order: number
  created_at: string
  person?: Person
}

export interface AudioMemory {
  id: string
  about_person_id: string | null
  recorded_by: string | null
  title: string
  description: string | null
  url: string
  storage_path: string | null
  duration_seconds: number | null
  language: string
  transcript: string | null
  tags: string[] | null
  created_at: string
  about_person?: Person
}

export interface KingdomKeyFact {
  label: string
  value: string
}

export interface KingdomDetail {
  title: string
  body: string
}

export type KingdomSlug = 'cayor' | 'baol' | 'fouta-toro'

export interface Kingdom {
  slug: KingdomSlug
  name: string
  period: string
  location: string
  emblem: string
  tldr: string
  key_facts: KingdomKeyFact[]
  details: KingdomDetail[]
  map_image_url: string | null
  updated_at: string
}

export interface Souvenir {
  id: string
  person_id: string | null
  kingdom_slug: string | null
  title: string
  detail: string | null
  souvenir_date: string | null
  image_url: string | null
  image_storage_path: string | null
  audio_url: string | null
  audio_storage_path: string | null
  audio_duration_seconds: number | null
  created_at: string
}

export const BIRTH_PLACES = [
  'Dakar, Sénégal',
  'Thiès, Sénégal',
  'Saint-Louis, Sénégal',
  'Kaolack, Sénégal',
  'Ziguinchor, Sénégal',
  'Diourbel, Sénégal',
  'Touba, Sénégal',
  'Mbour, Sénégal',
  'Thionville, France',
  'Paris, France',
] as const

export const BIRTH_PLACE_OTHER = 'Autre'
