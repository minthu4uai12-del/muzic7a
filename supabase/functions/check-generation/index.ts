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
  private keyUsage: Map<string, { count: number; resetTime: number; lastUsed: number }> = new Map()
  private maxRequestsPerKey: number = 100
  private resetInterval: number = 60 * 60 * 1000
  private keyRotationDelay: number = 1000

  constructor() {
    this.loadApiKeysFromEnvironment()
    this.initializeKeyUsageTracking()
    console.log(`🔑 Check-Generation: Initialized with ${this.apiKeys.length} API keys`)
  }

  private loadApiKeysFromEnvironment(): void {
    const keys: string[] = []
    
    console.log('🔍 Check-Generation: Loading API keys from environment...')
    
    // Check for multiple key format: MUSIC_AI_API_KEY_1, MUSIC_AI_API_KEY_2, etc.
    for (let i = 1; i <= 20; i++) {
      const key = Deno.env.get(`MUSIC_AI_API_KEY_${i}`)
      if (key && key.trim() && key !== 'your_api_key_here') {
        keys.push(key.trim())
        console.log(`✅ Check-Generation: Added API key ${i}`)
      }
    }
    
    // Fallback to single key
    if (keys.length === 0) {
      const singleKey = Deno.env.get('MUSIC_AI_API_KEY')
      if (singleKey && singleKey.trim() && singleKey !== 'your_api_key_here') {
        keys.push(singleKey.trim())
        console.log('✅ Check-Generation: Added fallback API key')
      }
    }
    
    // Default fallback key if no environment variables
    if (keys.length === 0) {
      console.log('⚠️ Check-Generation: No API keys found, using fallback')
      keys.push('4f52e3f37a67bb5aed649a471e9989b9')
    }
    
    this.apiKeys = keys
    console.log(`📊 Check-Generation: Total API keys loaded: ${this.apiKeys.length}`)
  }

  private initializeKeyUsageTracking(): void {
    this.apiKeys.forEach((key) => {
      this.keyUsage.set(key, { 
        count: 0, 
        resetTime: Date.now() + this.resetInterval,
        lastUsed: 0
      })
    })
  }

  private getNextAvailableKey(): { key: string; index: number } {
    const now = Date.now()
    
    // Reset usage counters for keys whose reset time has passed
    this.keyUsage.forEach((usage, key) => {
      if (now >= usage.resetTime) {
        this.keyUsage.set(key, { 
          count: 0, 
          resetTime: now + this.resetInterval,
          lastUsed: usage.lastUsed
        })
      }
    })
    
    // Find the least recently used key that's under the rate limit
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length
      const key = this.apiKeys[keyIndex]
      const usage = this.keyUsage.get(key)!
      
      const isUnderRateLimit = usage.count < this.maxRequestsPerKey
      const hasDelayPassed = (now - usage.lastUsed) >= this.keyRotationDelay
      
      if (isUnderRateLimit && hasDelayPassed) {
        this.currentKeyIndex = keyIndex
        return { key, index: keyIndex }
      }
    }
    
    // If all keys are recently used, use the one with lowest usage
    let bestKey = this.apiKeys[0]
    let bestIndex = 0
    let lowestUsage = this.keyUsage.get(bestKey)!.count
    
    this.apiKeys.forEach((key, index) => {
      const usage = this.keyUsage.get(key)!
      if (usage.count < lowestUsage) {
        bestKey = key
        bestIndex = index
        lowestUsage = usage.count
      }
    })
    
    this.currentKeyIndex = bestIndex
    return { key: bestKey, index: bestIndex }
  }

  private incrementKeyUsage(apiKey: string): void {
    const usage = this.keyUsage.get(apiKey)
    if (usage) {
      usage.count++
      usage.lastUsed = Date.now()
    }
  }

  async makeRequest(url: string, options: RequestInit, maxRetries: number = 3): Promise<Response> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { key, index } = this.getNextAvailableKey()
        
        const headers = {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
        
        console.log(`🔍 Check-Generation: Using API key ${index + 1} for status check`)
        const response = await fetch(url, { ...options, headers })
        
        this.incrementKeyUsage(key)
        
        if (response.status === 429) {
          console.warn(`⚠️ Check-Generation: Rate limited on key ${index + 1}`)
          const usage = this.keyUsage.get(key)!
          usage.count = this.maxRequestsPerKey
          continue
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        return response
        
      } catch (error) {
        lastError = error as Error
        console.error(`❌ Check-Generation: Request failed on attempt ${attempt + 1}:`, error)
        
        if (attempt === maxRetries - 1) {
          break
        }
        
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
      // Check generation status using multi-key manager
      const kieResponse = await keyManager.makeRequest(
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
        console.log('❌ Generation failed, checking if we need to revert usage...')
        
        // Try to revert usage for this user if generation failed
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