const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface KieAIStatusResponse {
  code: number
  msg: string
  data: {
    status?: string
    errorMessage?: string
    response?: {
      sunoData: Array<{
        id: string
        title: string
        audioUrl: string
        duration: number
        tags: string
      }>
    }
  }
}

class MultiKeyManager {
  private apiKeys: string[] = []
  private currentKeyIndex: number = 0

  constructor() {
    this.loadApiKeysFromEnvironment()
    console.log(`🔑 Initialized MultiKeyManager with ${this.apiKeys.length} API keys`)
  }

  private loadApiKeysFromEnvironment(): void {
    const keys: string[] = []
    
    // Check for multiple key format: MUSIC_AI_API_KEY_1, MUSIC_AI_API_KEY_2, etc.
    for (let i = 1; i <= 20; i++) {
      const key = Deno.env.get(`MUSIC_AI_API_KEY_${i}`)
      if (key && key.trim()) {
        keys.push(key.trim())
      }
    }
    
    // Fallback to single key
    if (keys.length === 0) {
      const singleKey = Deno.env.get('MUSIC_AI_API_KEY')
      if (singleKey && singleKey.trim()) {
        keys.push(singleKey.trim())
      }
    }
    
    // Default fallback key if no environment variables
    if (keys.length === 0) {
      keys.push('4f52e3f37a67bb5aed649a471e9989b9') // Fallback key
    }
    
    this.apiKeys = keys
  }

  getNextKey(): string {
    const key = this.apiKeys[this.currentKeyIndex]
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length
    return key
  }

  async makeRequest(url: string, options: RequestInit, maxRetries: number = 3): Promise<Response> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const apiKey = this.getNextKey()
        
        const headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
        
        const response = await fetch(url, { ...options, headers })
        
        // Check for rate limiting
        if (response.status === 429) {
          console.warn(`⚠️ Rate limited, trying next key...`)
          continue
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        return response
        
      } catch (error) {
        lastError = error as Error
        console.error(`❌ Request failed on attempt ${attempt + 1}:`, error)
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          break
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
    
    throw lastError || new Error('All retry attempts failed')
  }
}

const keyManager = new MultiKeyManager()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body for POST requests
    let taskId: string | null = null
    
    if (req.method === 'POST') {
      const body = await req.json()
      taskId = body.taskId
    } else {
      const url = new URL(req.url)
      taskId = url.searchParams.get('taskId')
    }

    if (!taskId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Task ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check generation status using multi-key manager
    const kieResponse = await keyManager.makeRequest(
      `https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`,
      {
        method: 'GET'
      }
    )

    const result: KieAIStatusResponse = await kieResponse.json()

    return new Response(
      JSON.stringify({
        success: true,
        status: result.data.status,
        data: result.data.response?.sunoData || [],
        error: result.data.errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Status check error:', error)
    
    return new Response(
      JSON.stringify({
        success: false, error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})