import { createClient } from 'npm:@supabase/supabase-js@2'

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
  private keyUsage: Map<string, { count: number; resetTime: number; lastUsed: number; isBlocked: boolean }> = new Map()
  private maxRequestsPerKey: number = 50
  private resetInterval: number = 60 * 60 * 1000
  private keyRotationDelay: number = 500
  private blockDuration: number = 5 * 60 * 1000

  constructor() {
    this.loadApiKeysFromSecrets()
    this.initializeKeyUsageTracking()
    console.log(`🔑 Check-Generation: Initialized with ${this.apiKeys.length} API keys`)
  }

  private loadApiKeysFromSecrets(): void {
    const keys: string[] = []
    
    console.log('🔍 Check-Generation: Loading API keys from secrets...')
    
    // Load all possible API keys from secrets
    for (let i = 1; i <= 20; i++) {
      const keyName = `MUSIC_AI_API_KEY_${i}`
      const key = Deno.env.get(keyName)
      
      if (key && key.trim() && key !== 'your_api_key_here' && key.length > 10) {
        keys.push(key.trim())
        console.log(`✅ Check-Generation: Loaded API key ${i}`)
      }
    }
    
    // Fallback to single key
    if (keys.length === 0) {
      const singleKey = Deno.env.get('MUSIC_AI_API_KEY')
      if (singleKey && singleKey.trim() && singleKey !== 'your_api_key_here' && singleKey.length > 10) {
        keys.push(singleKey.trim())
        console.log('✅ Check-Generation: Loaded fallback API key')
      }
    }
    
    if (keys.length === 0) {
      console.error('❌ Check-Generation: No valid API keys found!')
      throw new Error('No API keys configured for status checking')
    }
    
    this.apiKeys = keys
    console.log(`📊 Check-Generation: Successfully loaded ${this.apiKeys.length} API keys`)
  }

  private initializeKeyUsageTracking(): void {
    const now = Date.now()
    this.apiKeys.forEach((key) => {
      this.keyUsage.set(key, { 
        count: 0, 
        resetTime: now + this.resetInterval,
        lastUsed: 0,
        isBlocked: false
      })
    })
  }

  private resetExpiredKeys(): void {
    const now = Date.now()
    this.keyUsage.forEach((usage, key) => {
      if (now >= usage.resetTime) {
        usage.count = 0
        usage.resetTime = now + this.resetInterval
        usage.isBlocked = false
      }
      
      if (usage.isBlocked && (now - usage.lastUsed) >= this.blockDuration) {
        usage.isBlocked = false
      }
    })
  }

  private getNextAvailableKey(): { key: string; index: number } | null {
    this.resetExpiredKeys()
    
    const now = Date.now()
    
    // Find available keys
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length
      const key = this.apiKeys[keyIndex]
      const usage = this.keyUsage.get(key)!
      
      const isAvailable = !usage.isBlocked && 
                         usage.count < this.maxRequestsPerKey && 
                         (now - usage.lastUsed) >= this.keyRotationDelay
      
      if (isAvailable) {
        this.currentKeyIndex = keyIndex
        return { key, index: keyIndex }
      }
    }
    
    return null
  }

  private incrementKeyUsage(apiKey: string): void {
    const usage = this.keyUsage.get(apiKey)
    if (usage) {
      usage.count++
      usage.lastUsed = Date.now()
    }
  }

  private blockKey(apiKey: string, reason: string): void {
    const usage = this.keyUsage.get(apiKey)
    if (usage) {
      usage.isBlocked = true
      usage.lastUsed = Date.now()
      console.log(`🚫 Check-Generation: Blocked key - ${reason}`)
    }
  }

  async makeRequest(url: string, options: RequestInit, maxRetries: number = 3): Promise<Response> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const keyInfo = this.getNextAvailableKey()
      
      if (!keyInfo) {
        console.warn('⚠️ Check-Generation: No available API keys')
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }
      
      try {
        const headers = {
          'Authorization': `Bearer ${keyInfo.key}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
        
        console.log(`🔍 Check-Generation: Using key ${keyInfo.index + 1} for status check`)
        
        const response = await fetch(url, { 
          ...options, 
          headers,
          signal: AbortSignal.timeout(15000) // 15 second timeout for status checks
        })
        
        this.incrementKeyUsage(keyInfo.key)
        
        if (response.status === 429) {
          console.warn(`⚠️ Check-Generation: Rate limited on key ${keyInfo.index + 1}`)
          this.blockKey(keyInfo.key, 'Rate limited')
          continue
        }
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ Check-Generation: HTTP ${response.status}: ${errorText}`)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        console.log(`✅ Check-Generation: Status check successful with key ${keyInfo.index + 1}`)
        return response
        
      } catch (error) {
        lastError = error as Error
        console.error(`❌ Check-Generation: Request failed on attempt ${attempt + 1}:`, error.message)
        
        if (keyInfo && (error.name === 'TimeoutError' || error.message.includes('fetch'))) {
          this.blockKey(keyInfo.key, `Network error: ${error.message}`)
        }
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }
    
    throw lastError || new Error('All status check attempts failed')
  }
}

const keyManager = new MultiKeyManager()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔍 Check Generation Status Function Called')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get task ID from request
    let taskId: string | null = null
    
    if (req.method === 'POST') {
      const body = await req.json()
      taskId = body.taskId
    } else {
      const url = new URL(req.url)
      taskId = url.searchParams.get('taskId')
    }

    if (!taskId) {
      console.error('❌ No task ID provided')
      return new Response(
        JSON.stringify({ success: false, error: 'Task ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔍 Checking status for task: ${taskId}`)

    try {
      // Check generation status using multi-key manager
      const kieResponse = await keyManager.makeRequest(
        `https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`,
        { method: 'GET' }
      )

      const result: KieAIStatusResponse = await kieResponse.json()
      console.log('📊 Status check result:', { 
        code: result.code, 
        status: result.data.status, 
        hasData: !!result.data.response?.sunoData?.length,
        errorMessage: result.data.errorMessage
      })

      // Handle failed generation - revert usage if needed
      if (result.data.status?.includes('FAILED') || 
          result.data.status === 'SENSITIVE_WORD_ERROR' || 
          result.data.errorMessage) {
        
        console.log('❌ Generation failed, reverting usage deduction...')
        
        try {
          const { data: currentSub } = await supabaseClient
            .from('user_subscriptions')
            .select('current_usage, monthly_limit')
            .eq('user_id', user.id)
            .single()

          if (currentSub && currentSub.current_usage > 0) {
            const { error: revertError } = await supabaseClient
              .from('user_subscriptions')
              .update({
                current_usage: Math.max(0, currentSub.current_usage - 1)
              })
              .eq('user_id', user.id)
            
            if (revertError) {
              console.error('⚠️ Failed to revert usage:', revertError)
            } else {
              console.log('✅ Successfully reverted usage deduction')
            }
          }
        } catch (revertError) {
          console.error('⚠️ Error during usage reversion:', revertError)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: result.data.status,
          data: result.data.response?.sunoData || [],
          error: result.data.errorMessage,
          apiKeyStats: keyManager.getKeyStats(),
          totalAvailableGenerations: keyManager.getTotalAvailableGenerations()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (apiError) {
      console.error('❌ Status check API error:', apiError.message)
      
      return new Response(
        JSON.stringify({
          success: false, 
          error: `Failed to check generation status: ${apiError.message}`,
          shouldRetry: true
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('❌ Status check error:', error)
    
    return new Response(
      JSON.stringify({
        success: false, 
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})