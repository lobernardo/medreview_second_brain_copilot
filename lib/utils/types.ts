export interface Profile {
  id: string
  name: string
  role: 'closer' | 'gestor' | 'onboarding'
  vertical_focus?: string | null
  phone?: string | null
  whatsapp_link?: string | null
  default_greeting?: string | null
  style_notes?: string | null
  created_at?: string
  updated_at?: string
}
