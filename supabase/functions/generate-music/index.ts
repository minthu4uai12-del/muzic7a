import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GenerateRequest {
  prompt: string
  options?: {
    customMode?: boolean
    instrumental?: boolean
    model?: string
    style?: string
    title?: string
    negativeTags?: string
  }
}

interface KieAIResponse {
  code: number
  msg: string
  data: {
    taskId?: string
    sunoData?: Array<{
      id: string
      title: string
      audioUrl: string
      duration: number
      tags: string
    }>
    status?: string
    errorMessage?: string
  }
}

class MultiKeyManager {
  private apiKeys: string[] = []
  private currentKeyIndex: number = 0
  private keyUsage: Map<string, { count: number; resetTime: number; lastUsed: number; isBlocked: boolean }> = new Map()
  private maxRequestsPerKey: number = 50 // Conservative limit per hour per key
  private resetInterval: number = 60 * 60 * 1000 // 1 hour
  private keyRotationDelay: number = 1000 // 1 second between key switches
  private blockDuration: number = 5 * 60 * 1000 // 5 minutes block after rate limit

  constructor() {
    this.loadApiKeysFromSecrets()
    this.initializeKeyUsageTracking()
    console.log(`🔑 MultiKeyManager initialized with ${this.apiKeys.length} API keys`)
    this.logKeyStatus()
  }

  private loadApiKeysFromSecrets(): void {
    const keys: string[] = []
    
    console.log('🔍 Loading API keys from Supabase Edge Function secrets...')
    
    // Load all possible API keys from secrets
    for (let i = 1; i <= 20; i++) {
      const keyName = `MUSIC_AI_API_KEY_${i}`
      const key = Deno.env.get(keyName)
      
      if (key && key.trim() && key !== 'your_api_key_here' && key.length > 10) {
        keys.push(key.trim())
        console.log(`✅ Loaded API key ${i}: ${key.substring(0, 8)}...${key.substring(key.length - 4)}`)
      } else {
        console.log(`❌ API key ${i} not found or invalid`)
      }
    }
    
    // Fallback to single key if no numbered keys found
    if (keys.length === 0) {
      const singleKey = Deno.env.get('MUSIC_AI_API_KEY')
      if (singleKey && singleKey.trim() && singleKey !== 'your_api_key_here' && singleKey.length > 10) {
        keys.push(singleKey.trim())
        console.log(`✅ Loaded fallback API key: ${singleKey.substring(0, 8)}...${singleKey.substring(singleKey.length - 4)}`)
      }
    }
    
    if (keys.length === 0) {
      console.error('❌ No valid API keys found in secrets!')
      throw new Error('No API keys configured. Please add MUSIC_AI_API_KEY_1, MUSIC_AI_API_KEY_2, etc. to your Supabase Edge Function secrets.')
    }
    
    this.apiKeys = keys
    console.log(`📊 Successfully loaded ${this.apiKeys.length} API keys`)
  }

  private initializeKeyUsageTracking(): void {
    const now = Date.now()
    this.apiKeys.forEach((key, index) => {
      this.keyUsage.set(key, { 
        count: 0, 
        resetTime: now + this.resetInterval,
        lastUsed: 0,
        isBlocked: false
      })
      console.log(`🔧 Initialized tracking for key ${index + 1}`)
    })
  }

  private logKeyStatus(): void {
    console.log('📊 Current API Key Status:')
    this.apiKeys.forEach((key, index) => {
      const usage = this.keyUsage.get(key)!
      console.log(`Key ${index + 1}: Usage ${usage.count}/${this.maxRequestsPerKey}, Active: ${!usage.isBlocked}`)
    })
  }

  private resetExpiredKeys(): void {
    const now = Date.now()
    let resetCount = 0
    
    this.keyUsage.forEach((usage, key) => {
      // Reset usage counter if reset time has passed
      if (now >= usage.resetTime) {
        usage.count = 0
        usage.resetTime = now + this.resetInterval
        usage.isBlocked = false
        resetCount++
      }
      
      // Unblock keys after block duration
      if (usage.isBlocked && (now - usage.lastUsed) >= this.blockDuration) {
        usage.isBlocked = false
        console.log(`🔓 Unblocked API key after cooldown period`)
      }
    })
    
    if (resetCount > 0) {
      console.log(`🔄 Reset ${resetCount} API keys for new hour`)
    }
  }

  private getNextAvailableKey(): { key: string; index: number } | null {
    this.resetExpiredKeys()
    
    const now = Date.now()
    const availableKeys: Array<{ key: string; index: number; usage: any }> = []
    
    // Find all available keys
    this.apiKeys.forEach((key, index) => {
      const usage = this.keyUsage.get(key)!
      const isAvailable = !usage.isBlocked && 
                         usage.count < this.maxRequestsPerKey && 
                         (now - usage.lastUsed) >= this.keyRotationDelay
      
      if (isAvailable) {
        availableKeys.push({ key, index, usage })
      }
    })
    
    if (availableKeys.length === 0) {
      console.warn('⚠️ No available API keys found!')
      this.logKeyStatus()
      return null
    }
    
    // Sort by usage count (ascending) and last used time (ascending)
    availableKeys.sort((a, b) => {
      if (a.usage.count !== b.usage.count) {
        return a.usage.count - b.usage.count
      }
      return a.usage.lastUsed - b.usage.lastUsed
    })
    
    const selected = availableKeys[0]
    this.currentKeyIndex = selected.index
    
    console.log(`🎯 Selected API key ${selected.index + 1}/${this.apiKeys.length} (Usage: ${selected.usage.count}/${this.maxRequestsPerKey})`)
    return { key: selected.key, index: selected.index }
  }

  private incrementKeyUsage(apiKey: string, success: boolean = true): void {
    const usage = this.keyUsage.get(apiKey)
    if (usage) {
      if (success) {
        usage.count++
      }
      usage.lastUsed = Date.now()
      console.log(`📊 Updated key usage: ${usage.count}/${this.maxRequestsPerKey}`)
    }
  }

  private blockKey(apiKey: string, reason: string): void {
    const usage = this.keyUsage.get(apiKey)
    if (usage) {
      usage.isBlocked = true
      usage.lastUsed = Date.now()
      console.log(`🚫 Blocked API key: ${reason}`)
    }
  }

  async makeRequest(url: string, options: RequestInit, maxRetries: number = this.apiKeys.length): Promise<Response> {
    let lastError: Error | null = null
    let attemptCount = 0
    
    while (attemptCount < maxRetries) {
      const keyInfo = this.getNextAvailableKey()
      
      if (!keyInfo) {
        console.error('❌ No available API keys for request')
        throw new Error('All API keys are currently rate limited or blocked. Please try again later.')
      }
      
      try {
        const headers = {
          'Authorization': `Bearer ${keyInfo.key}`,
          'Content-Type': 'application/json',
          'User-Agent': 'MuzAI-EdgeFunction/1.0',
          ...options.headers
        }
        
        console.log(`🌐 Making request to ${url} with key ${keyInfo.index + 1}`)
        
        const response = await fetch(url, { 
          ...options, 
          headers,
          signal: AbortSignal.timeout(30000) // 30 second timeout
        })
        
        // Handle different response statuses
        if (response.status === 429) {
          console.warn(`⚠️ Rate limited on key ${keyInfo.index + 1}`)
          this.blockKey(keyInfo.key, 'Rate limited (429)')
          attemptCount++
          continue
        }
        
        if (response.status === 401 || response.status === 403) {
          console.warn(`🔒 Authentication failed on key ${keyInfo.index + 1}`)
          this.blockKey(keyInfo.key, `Auth failed (${response.status})`)
          attemptCount++
          continue
        }
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ HTTP ${response.status} on key ${keyInfo.index + 1}: ${errorText}`)
          this.incrementKeyUsage(keyInfo.key, false)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        // Success - increment usage
        this.incrementKeyUsage(keyInfo.key, true)
        console.log(`✅ Request successful with key ${keyInfo.index + 1}`)
        return response
        
      } catch (error) {
        lastError = error as Error
        console.error(`❌ Request failed on key ${keyInfo.index + 1}:`, error.message)
        
        // Block key if it's a persistent error
        if (error.name === 'TimeoutError' || error.message.includes('fetch')) {
          this.blockKey(keyInfo.key, `Network error: ${error.message}`)
        }
        
        attemptCount++
        
        // Wait before trying next key
        if (attemptCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }
    
    console.error(`❌ All ${attemptCount} attempts failed`)
    this.logKeyStatus()
    throw lastError || new Error(`All ${maxRetries} API key attempts failed`)
  }

  getKeyStats() {
    const now = Date.now()
    return this.apiKeys.map((key, index) => {
      const usage = this.keyUsage.get(key)!
      const isActive = !usage.isBlocked && usage.count < this.maxRequestsPerKey
      
      return {
        index: index + 1,
        usage: usage.count,
        maxUsage: this.maxRequestsPerKey,
        resetTime: new Date(usage.resetTime),
        isActive,
        lastUsed: usage.lastUsed > 0 ? new Date(usage.lastUsed) : null,
        isBlocked: usage.isBlocked
      }
    })
  }

  getTotalAvailableGenerations(): number {
    const now = Date.now()
    let total = 0
    
    this.keyUsage.forEach((usage) => {
      if (usage.isBlocked) return
      
      if (now >= usage.resetTime) {
        total += this.maxRequestsPerKey
      } else {
        total += Math.max(0, this.maxRequestsPerKey - usage.count)
      }
    })
    
    return total
  }

  getActiveKeyCount(): number {
    return this.apiKeys.filter((key) => {
      const usage = this.keyUsage.get(key)!
      return !usage.isBlocked && usage.count < this.maxRequestsPerKey
    }).length
  }
}

// Create global instance
const keyManager = new MultiKeyManager()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🎵 Generate Music Function Called')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ No authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`👤 User authenticated: ${user.email}`)

    // Check user's current usage and limits
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      console.error('❌ Subscription check error:', subError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check user subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create default subscription if none exists
    let userSubscription = subscription
    if (!subscription) {
      console.log('📝 Creating default subscription for new user')
      const { data: newSub, error: createError } = await supabaseClient
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_type: 'free',
          monthly_limit: 1,
          current_usage: 0
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating subscription:', createError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create user subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      userSubscription = newSub
    }

    // Check if user has remaining generations
    const remaining = userSubscription.monthly_limit - userSubscription.current_usage
    console.log(`📊 User usage: ${userSubscription.current_usage}/${userSubscription.monthly_limit} (${remaining} remaining)`)
    
    if (remaining <= 0) {
      console.log('❌ User has no remaining generations')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No generations remaining. Please upgrade your plan or wait for next month.',
          usage: {
            current: userSubscription.current_usage,
            limit: userSubscription.monthly_limit,
            remaining: 0
          }
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { prompt, options = {} }: GenerateRequest = await req.json()

    if (!prompt?.trim()) {
      console.error('❌ No prompt provided')
      return new Response(
        JSON.stringify({ success: false, error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🎯 Starting generation with prompt: "${prompt.substring(0, 50)}..."`)
    console.log(`🔑 Available API keys: ${keyManager.getActiveKeyCount()}/${keyManager.apiKeys.length}`)

    try {
      // Make request to Kie AI using the multi-key manager
      const kieResponse = await keyManager.makeRequest('https://api.kie.ai/api/v1/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: prompt.trim(),
          customMode: options.customMode || false,
          instrumental: options.instrumental || false,
          model: options.model || 'V3_5',
          style: options.style || '',
          title: options.title || '',
          negativeTags: options.negativeTags || '',
          callBackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/music-callback`
        })
      })

      const result: KieAIResponse = await kieResponse.json()
      console.log('🎵 Kie AI Response:', { 
        code: result.code, 
        msg: result.msg, 
        hasTaskId: !!result.data.taskId,
        taskId: result.data.taskId 
      })

      if (result.code !== 200 || !result.data.taskId) {
        console.error('❌ Generation request failed:', result.msg)
        // DO NOT deduct usage if generation request failed
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Generation failed: ${result.msg}`,
            shouldRetry: true,
            apiKeyStats: keyManager.getKeyStats(),
            totalAvailableGenerations: keyManager.getTotalAvailableGenerations()
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ONLY deduct usage AFTER successful API call
      console.log(`✅ Generation started successfully, deducting 1 generation for user ${user.id}`)
      
      const { error: updateError } = await supabaseClient
        .from('user_subscriptions')
        .update({
          current_usage: userSubscription.current_usage + 1
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('❌ Failed to update usage:', updateError)
        // Still return success since generation started
      } else {
        console.log(`📊 Usage updated: ${userSubscription.current_usage + 1}/${userSubscription.monthly_limit}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          taskId: result.data.taskId,
          message: 'Generation started successfully',
          remainingGenerations: remaining - 1,
          apiKeyStats: keyManager.getKeyStats(),
          totalAvailableGenerations: keyManager.getTotalAvailableGenerations(),
          activeKeys: keyManager.getActiveKeyCount()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (apiError) {
      console.error('❌ API call failed:', apiError.message)
      // DO NOT deduct usage if API call failed
      return new Response(
        JSON.stringify({
          success: false, 
          error: `Generation failed: ${apiError.message}`,
          shouldRetry: true,
          apiKeyStats: keyManager.getKeyStats(),
          totalAvailableGenerations: keyManager.getTotalAvailableGenerations()
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('❌ Generation error:', error)
    
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