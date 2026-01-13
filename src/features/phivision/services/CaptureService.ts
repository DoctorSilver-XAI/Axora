import { supabase } from '@shared/lib/supabase'

export interface DBCapture {
  id: string
  user_id: string
  image_url: string | null
  thumbnail_url: string | null
  image_hash: string | null
  raw_text: string | null
  ocr_confidence: number | null
  ocr_provider: string
  entities: Array<Record<string, unknown>>
  enrichment: Record<string, unknown>
  source_app: string | null
  capture_region: Record<string, unknown> | null
  conversation_id: string | null
  is_favorite: boolean
  tags: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Capture {
  id: string
  imageUrl: string | null
  thumbnailUrl: string | null
  rawText: string | null
  ocrConfidence: number | null
  entities: Array<Record<string, unknown>>
  enrichment: Record<string, unknown>
  isFavorite: boolean
  tags: string[]
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

function toAppCapture(dbCapture: DBCapture): Capture {
  return {
    id: dbCapture.id,
    imageUrl: dbCapture.image_url,
    thumbnailUrl: dbCapture.thumbnail_url,
    rawText: dbCapture.raw_text,
    ocrConfidence: dbCapture.ocr_confidence,
    entities: dbCapture.entities || [],
    enrichment: dbCapture.enrichment || {},
    isFavorite: dbCapture.is_favorite,
    tags: dbCapture.tags || [],
    notes: dbCapture.notes,
    createdAt: new Date(dbCapture.created_at),
    updatedAt: new Date(dbCapture.updated_at),
  }
}

export const CaptureService = {
  // Fetch all captures for the current user
  async getAll(limit = 50): Promise<Capture[]> {
    const { data, error } = await supabase
      .from('captures')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching captures:', error)
      throw error
    }

    return (data || []).map((c) => toAppCapture(c as DBCapture))
  },

  // Fetch a single capture
  async getById(id: string): Promise<Capture | null> {
    const { data, error } = await supabase
      .from('captures')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching capture:', error)
      return null
    }

    return toAppCapture(data as DBCapture)
  },

  // Upload image to storage and create capture record
  async create(
    imageBase64: string,
    rawText: string | null,
    entities: Array<Record<string, unknown>> = [],
    enrichment: Record<string, unknown> = {}
  ): Promise<Capture> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Convert base64 to blob
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/png' })

    // Upload to storage
    const fileName = `${user.id}/${Date.now()}.png`
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('captures')
      .upload(fileName, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('captures')
      .getPublicUrl(fileName)

    // Create capture record
    const { data, error } = await supabase
      .from('captures')
      .insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        raw_text: rawText,
        entities,
        enrichment,
        ocr_provider: 'mistral',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating capture:', error)
      throw error
    }

    return toAppCapture(data as DBCapture)
  },

  // Toggle favorite status
  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    const { error } = await supabase
      .from('captures')
      .update({ is_favorite: isFavorite })
      .eq('id', id)

    if (error) {
      console.error('Error toggling favorite:', error)
      throw error
    }
  },

  // Update notes
  async updateNotes(id: string, notes: string): Promise<void> {
    const { error } = await supabase
      .from('captures')
      .update({ notes })
      .eq('id', id)

    if (error) {
      console.error('Error updating notes:', error)
      throw error
    }
  },

  // Update tags
  async updateTags(id: string, tags: string[]): Promise<void> {
    const { error } = await supabase
      .from('captures')
      .update({ tags })
      .eq('id', id)

    if (error) {
      console.error('Error updating tags:', error)
      throw error
    }
  },

  // Delete a capture
  async delete(id: string): Promise<void> {
    // First get the capture to delete the image
    const capture = await this.getById(id)
    if (capture?.imageUrl) {
      // Extract file path from URL
      const urlParts = capture.imageUrl.split('/captures/')
      if (urlParts.length > 1) {
        await supabase.storage.from('captures').remove([urlParts[1]])
      }
    }

    const { error } = await supabase
      .from('captures')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting capture:', error)
      throw error
    }
  },

  // Search captures by text
  async search(query: string): Promise<Capture[]> {
    const { data, error } = await supabase
      .from('captures')
      .select('*')
      .or(`raw_text.ilike.%${query}%,notes.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching captures:', error)
      throw error
    }

    return (data || []).map((c) => toAppCapture(c as DBCapture))
  },
}
