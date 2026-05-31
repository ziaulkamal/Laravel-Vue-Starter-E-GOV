export interface AuthUser {
    id: number
    name: string
    email: string
    roles: string[]
    permissions: string[]
    kontingen_id: number | null
    person_id: number | null
}

export interface Person {
    id: number
    nik: string
    nama_lengkap: string
    jenis_kelamin: 'male' | 'female'
    tempat_lahir: string
    tanggal_lahir: string
    agama: string
    wilayah_kode: string | null
    wilayah?: { kode: string; nama: string }
    alamat_detail: string | null
    no_hp: string | null
    email: string | null
    foto: string | null
}

export interface Contingent {
    id: number
    name: string
    short_name: string
    logo: string | null
    wilayah_kode: string
    contact_person: string
    contact_phone: string
    is_active: boolean
}

export interface Participant {
    id: number
    person_id: number
    person: Person
    contingent_id: number
    contingent: Contingent
    sport_id: number
    sport: Sport
    role: 'athlete' | 'coach' | 'official' | 'manager'
    is_active: boolean
}

export interface Sport {
    id: number
    name: string
    code: string
    icon: string | null
    is_active: boolean
    categories?: SportCategory[]
}

export interface SportCategory {
    id: number
    sport_id: number
    sport?: Sport
    name: string
    gender_rule: 'male' | 'female' | 'mixed'
    participant_type: 'individual' | 'pair' | 'team'
    min_players: number
    max_players: number
    scoring_type: string
    min_age: number | null
    max_age: number | null
    is_active: boolean
}

export interface GameMatch {
    id: number
    code: string
    sport_category_id: number
    sport_category: SportCategory
    venue_id: number
    venue: Venue
    start_time: string
    end_time: string | null
    status: 'scheduled' | 'ongoing' | 'finished' | 'postponed'
    notes: string | null
}

export interface Venue {
    id: number
    name: string
    address: string
    capacity: number | null
    is_active: boolean
}

export interface Lodging {
    id: number
    name: string
    address: string
    total_rooms: number
    capacity: number
    is_active: boolean
}

export interface LodgingAllocation {
    id: number
    lodging_id: number
    contingent_id: number
    contingent: Contingent
    room_number: string
    capacity: number
    check_in: string
    check_out: string
}

export interface Document {
    id: number
    participant_id: number
    participant: Participant
    type: string
    file_url: string | null
    status: 'pending' | 'approved' | 'rejected' | 'not_uploaded'
    notes: string | null
    verified_at: string | null
}

export interface CardTemplate {
    id: number
    name: string
    type: string
    description: string | null
    html_content: string
    is_active: boolean
    created_at: string
}

export interface Medal {
    id: number
    match_id: number
    contingent_id: number
    contingent: Contingent
    person_id: number | null
    person: Person | null
    type: 'gold' | 'silver' | 'bronze'
}

export interface LeaderboardEntry {
    rank: number
    contingent: Contingent
    gold: number
    silver: number
    bronze: number
    total: number
}

export interface JudgeScope {
    id: number
    user_id: number
    user: { id: number; name: string; email: string }
    sport_id: number
    sport: Sport
}

export interface AuditLog {
    id: number
    user_id: number
    user: { name: string; email: string }
    action: string
    model_type: string
    model_id: number
    old_values: Record<string, unknown> | null
    new_values: Record<string, unknown> | null
    created_at: string
}

export interface User {
    id: number
    name: string
    email: string
    roles: string[]
    kontingen_id: number | null
    kontingen: Contingent | null
    person_id: number | null
    is_active: boolean
    created_at: string
}

export type MedalType = 'gold' | 'silver' | 'bronze'

export interface Paginated<T> {
    data: T[]
    current_page: number
    last_page: number
    per_page: number
    total: number
}

export interface ApiResponse<T> {
    success: boolean
    message: string
    data: T
    meta?: Record<string, unknown>
}
