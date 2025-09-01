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

class MultiKeyRotationManager {
  private apiKeys: string[] = []
  private keyStats: Map<string, {
    usage: number
    lastUsed: number
    isBlocked: boolean
    blockUntil: number
    successCount: number
    failureCount: number
  }> = new Map()
  
  private maxRequestsPerHour = 50
  private blockDuration = 3 * 60 * 1000 // 3 minutes
  private rotationDelay = 500 // 0.5 second between key switches

  constructor() {
    this.loadApiKeysFromSecrets()
    this.initializeKeyTracking()
    console.log(`🔑 Check-Generation: MultiKeyRotationManager initialized with ${this.apiKeys.length} API keys`)
  }

  private loadApiKeysFromSecrets(): void {
    const keys: string[] = []
    
    console.log('🔍 Check-Generation: Loading API keys from Supabase Edge Function secrets...')
    
    // Load multiple keys from secrets: MUSIC_AI_API_KEY_1, MUSIC_AI_API_KEY_2, etc.
    for (let i = 1; i <= 50; i++) {
      const key = Deno.env.get(`MUSIC_AI_API_KEY_${i}`)
      if (key && key.trim() && key.length > 10 && !key.includes('your_') && !key.includes('placeholder')) {
        keys.push(key.trim())
        console.log(`✅ Check-Generation: Loaded API key ${i}`)
      }
    }
    
    // Fallback to single key if no numbered keys found
    if (keys.length === 0) {
      const singleKey = Deno.env.get('MUSIC_AI_API_KEY')
      if (singleKey && singleKey.trim() && singleKey.length > 10) {
        keys.push(singleKey.trim())
        console.log(`✅ Check-Generation: Loaded fallback API key`)
      }
    }
    
    if (keys.length === 0) {
      console.error('❌ Check-Generation: No valid API keys found in secrets!')
      throw new Error('No API keys configured in Supabase Edge Function secrets')
    }
    
    this.apiKeys = keys
    console.log(`📊 Check-Generation: Successfully loaded ${this.apiKeys.length} API keys`)
  }

  private initializeKeyTracking(): void {
    this.apiKeys.forEach(key => {
      this.keyStats.set(key, {
        usage: 0,
        lastUsed: 0,
        isBlocked: false,
        blockUntil: 0,
        successCount: 0,
        failureCount: 0
      })
    })
  }

  private getNextAvailableKey(): { key: string; index: number } | null {
    const now = Date.now()
    
    // Unblock keys whose block period has expired
    this.keyStats.forEach((stats, key) => {
      if (stats.isBlocked && now >= stats.blockUntil) {
        stats.isBlocked = false
        console.log(`🔓 Check-Generation: Unblocked API key ${key.substring(0, 8)}...`)
      }
    })
    
    // Find available keys
    const availableKeys = this.apiKeys
      .map((key, index) => ({ key, index, stats: this.keyStats.get(key)! }))
      .filter(({ stats }) => 
        !stats.isBlocked && 
        stats.usage < this.maxRequestsPerHour &&
        (now - stats.lastUsed) >= this.rotationDelay
      )
      .sort((a, b) => a.stats.usage - b.stats.usage)

    if (availableKeys.length === 0) {
      // Try non-blocked keys without delay requirement
      const nonBlockedKeys = this.apiKeys
        .map((key, index) => ({ key, index, stats: this.keyStats.get(key)! }))
        .filter(({ stats }) => !stats.isBlocked && stats.usage < this.maxRequestsPerHour)
        .sort((a, b) => a.stats.usage - b.stats.usage)

      if (nonBlockedKeys.length > 0) {
        return { key: nonBlockedKeys[0].key, index: nonBlockedKeys[0].index }
      }
      
      return null
    }

    return { key: availableKeys[0].key, index: availableKeys[0].index }
  }

  private updateKeyStats(key: string, success: boolean): void {
    const stats = this.keyStats.get(key)
    if (!stats) return

    const now = Date.now()
    stats.usage++
    stats.lastUsed = now

    if (success) {
      stats.successCount++
    } else {
      stats.failureCount++
      stats.isBlocked = true
      stats.blockUntil = now + this.blockDuration
    }

    if (stats.usage >= this.maxRequestsPerHour) {
      stats.isBlocked = true
      stats.blockUntil = now + (60 * 60 * 1000) // Block for 1 hour
    }
  }

  async makeRequestWithRotation(url: string, options: RequestInit): Promise<Response> {
    const maxAttempts = Math.min(this.apiKeys.length, 3)
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const keyInfo = this.getNextAvailableKey()
      
      if (!keyInfo) {
        throw new Error('No available API keys for status check')
      }

      const { key, index } = keyInfo

      try {
        const headers = {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          ...options.headers
        }

        const response = await fetch(url, { ...options, headers })

        if (response.status === 429) {
          this.updateKeyStats(key, false)
          continue
        }

        if (!response.ok) {
          this.updateKeyStats(key, false)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        this.updateKeyStats(key, true)
        return response

      } catch (error) {
        lastError = error as Error
        this.updateKeyStats(key, false)
        
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }

    throw lastError || new Error('All API key attempts failed')
  }
}

const keyManager = new MultiKeyRotationManager()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    console.log(`🔍 Checking generation status for task: ${taskId}`)

    try {
      // Check generation status using multi-key rotation manager
      const kieResponse = await keyManager.makeRequestWithRotation(
        `https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`,
        {
          method: 'GET'
        }
      )

      const result: KieAIStatusResponse = await kieResponse.json()
      console.log('📊 Status check result:', { 
        code: result.code, 
        status: result.data.status, 
        hasData: !!result.data.response?.sunoData?.length 
      })

      // Handle failed generation - revert usage if needed
      if (result.data.status?.includes('FAILED') || result.data.status === 'SENSITIVE_WORD_ERROR') {
        console.log('❌ Generation failed, reverting usage...')
        
        try {
          const { data: currentSub } = await supabaseClient
            .from('user_subscriptions')
            .select('current_usage')
            .eq('user_id', user.id)
            .single()

          if (currentSub && currentSub.current_usage > 0) {
            await supabaseClient
              .from('user_subscriptions')
              .update({
                current_usage: currentSub.current_usage - 1
              })
              .eq('user_id', user.id)
            
            console.log('✅ Reverted usage deduction due to failed generation')
          }
        } catch (revertError) {
          console.error('⚠️ Failed to revert usage:', revertError)
        }
      }

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

    } catch (apiError) {
      console.error('❌ Status check API error:', apiError)
      
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