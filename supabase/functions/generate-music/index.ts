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
  private blockDuration = 5 * 60 * 1000 // 5 minutes
  private rotationDelay = 1000 // 1 second between key switches
  private hourlyResetInterval = 60 * 60 * 1000 // 1 hour

  constructor() {
    this.loadApiKeysFromSecrets()
    this.initializeKeyTracking()
    this.startHourlyReset()
    console.log(`🔑 MultiKeyRotationManager initialized with ${this.apiKeys.length} API keys`)
  }

  private loadApiKeysFromSecrets(): void {
    const keys: string[] = []
    
    console.log('🔍 Loading API keys from Supabase Edge Function secrets...')
    
    // Load multiple keys from secrets: MUSIC_AI_API_KEY_1, MUSIC_AI_API_KEY_2, etc.
    for (let i = 1; i <= 50; i++) {
      const key = Deno.env.get(`MUSIC_AI_API_KEY_${i}`)
      if (key && key.trim() && key.length > 10 && !key.includes('your_') && !key.includes('placeholder')) {
        keys.push(key.trim())
        console.log(`✅ Loaded API key ${i} (${key.substring(0, 8)}...)`)
      }
    }
    
    // Fallback to single key if no numbered keys found
    if (keys.length === 0) {
      const singleKey = Deno.env.get('MUSIC_AI_API_KEY')
      if (singleKey && singleKey.trim() && singleKey.length > 10) {
        keys.push(singleKey.trim())
        console.log(`✅ Loaded fallback API key (${singleKey.substring(0, 8)}...)`)
      }
    }
    
    if (keys.length === 0) {
      console.error('❌ No valid API keys found in secrets!')
      throw new Error('No API keys configured in Supabase Edge Function secrets')
    }
    
    this.apiKeys = keys
    console.log(`📊 Successfully loaded ${this.apiKeys.length} API keys`)
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

  private startHourlyReset(): void {
    setInterval(() => {
      console.log('🔄 Resetting hourly API key usage counters...')
      this.keyStats.forEach((stats, key) => {
        stats.usage = 0
        console.log(`Reset usage for key ${key.substring(0, 8)}...`)
      })
    }, this.hourlyResetInterval)
  }

  private getNextAvailableKey(): { key: string; index: number } | null {
    const now = Date.now()
    
    // First, unblock any keys whose block period has expired
    this.keyStats.forEach((stats, key) => {
      if (stats.isBlocked && now >= stats.blockUntil) {
        stats.isBlocked = false
        console.log(`🔓 Unblocked API key ${key.substring(0, 8)}...`)
      }
    })
    
    // Find available keys (not blocked, under rate limit, and respecting rotation delay)
    const availableKeys = this.apiKeys
      .map((key, index) => ({ key, index, stats: this.keyStats.get(key)! }))
      .filter(({ stats }) => 
        !stats.isBlocked && 
        stats.usage < this.maxRequestsPerHour &&
        (now - stats.lastUsed) >= this.rotationDelay
      )
      .sort((a, b) => {
        // Prioritize keys with lower usage, then by last used time
        if (a.stats.usage !== b.stats.usage) {
          return a.stats.usage - b.stats.usage
        }
        return a.stats.lastUsed - b.stats.lastUsed
      })

    if (availableKeys.length === 0) {
      // If no keys are available with delay, find the least used non-blocked key
      const nonBlockedKeys = this.apiKeys
        .map((key, index) => ({ key, index, stats: this.keyStats.get(key)! }))
        .filter(({ stats }) => !stats.isBlocked && stats.usage < this.maxRequestsPerHour)
        .sort((a, b) => a.stats.usage - b.stats.usage)

      if (nonBlockedKeys.length > 0) {
        const selected = nonBlockedKeys[0]
        console.log(`⚡ Using least-used key ${selected.index + 1} (usage: ${selected.stats.usage}/${this.maxRequestsPerHour})`)
        return { key: selected.key, index: selected.index }
      }
      
      console.error('❌ All API keys are blocked or rate limited!')
      return null
    }

    const selected = availableKeys[0]
    console.log(`🔄 Selected API key ${selected.index + 1} (usage: ${selected.stats.usage}/${this.maxRequestsPerHour})`)
    return { key: selected.key, index: selected.index }
  }

  private updateKeyStats(key: string, success: boolean): void {
    const stats = this.keyStats.get(key)
    if (!stats) return

    const now = Date.now()
    stats.usage++
    stats.lastUsed = now

    if (success) {
      stats.successCount++
      console.log(`✅ Key ${key.substring(0, 8)}... success (${stats.successCount} total)`)
    } else {
      stats.failureCount++
      // Block key temporarily after failure
      stats.isBlocked = true
      stats.blockUntil = now + this.blockDuration
      console.log(`❌ Key ${key.substring(0, 8)}... failed, blocked for ${this.blockDuration / 1000}s`)
    }

    // Auto-block if usage hits limit
    if (stats.usage >= this.maxRequestsPerHour) {
      stats.isBlocked = true
      stats.blockUntil = now + this.hourlyResetInterval
      console.log(`🚫 Key ${key.substring(0, 8)}... rate limited, blocked until next hour`)
    }
  }

  async makeRequestWithRotation(url: string, options: RequestInit): Promise<Response> {
    const maxAttempts = Math.min(this.apiKeys.length, 5) // Try up to 5 keys or all available keys
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const keyInfo = this.getNextAvailableKey()
      
      if (!keyInfo) {
        throw new Error('No available API keys - all are blocked or rate limited')
      }

      const { key, index } = keyInfo

      try {
        console.log(`🌐 Attempt ${attempt + 1}: Making request with key ${index + 1}`)
        
        const headers = {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'User-Agent': 'MuzAI-EdgeFunction/1.0',
          ...options.headers
        }

        const response = await fetch(url, { ...options, headers })

        // Handle rate limiting
        if (response.status === 429) {
          console.warn(`⚠️ Rate limited on key ${index + 1}`)
          this.updateKeyStats(key, false)
          continue
        }

        // Handle other HTTP errors
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ HTTP ${response.status} on key ${index + 1}: ${errorText}`)
          this.updateKeyStats(key, false)
          
          // Don't retry on client errors (4xx), only server errors (5xx)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`API Error ${response.status}: ${errorText}`)
          }
          continue
        }

        // Success!
        this.updateKeyStats(key, true)
        console.log(`✅ Request successful with key ${index + 1}`)
        return response

      } catch (error) {
        lastError = error as Error
        console.error(`❌ Request failed with key ${index + 1}:`, error.message)
        this.updateKeyStats(key, false)
        
        // Wait before trying next key
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    throw lastError || new Error('All API key attempts failed')
  }

  getKeyStatistics() {
    const now = Date.now()
    return this.apiKeys.map((key, index) => {
      const stats = this.keyStats.get(key)!
      return {
        index: index + 1,
        usage: stats.usage,
        maxUsage: this.maxRequestsPerHour,
        isActive: !stats.isBlocked && stats.usage < this.maxRequestsPerHour,
        isBlocked: stats.isBlocked,
        blockUntil: stats.isBlocked ? new Date(stats.blockUntil) : null,
        successCount: stats.successCount,
        failureCount: stats.failureCount,
        lastUsed: stats.lastUsed > 0 ? new Date(stats.lastUsed) : null
      }
    })
  }

  getTotalAvailableGenerations(): number {
    const now = Date.now()
    let total = 0
    
    this.keyStats.forEach((stats) => {
      if (!stats.isBlocked || now >= stats.blockUntil) {
        total += Math.max(0, this.maxRequestsPerHour - stats.usage)
      }
    })
    
    return total
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

    console.log(`🎵 Generation request from user: ${user.email}`)

    // Check if user is admin
    const { data: adminUser } = await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    const isAdmin = !!adminUser

    // Check user's current usage and limits
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      console.error('Subscription check error:', subError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check user subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If no subscription exists, create default free plan
    let userSubscription = subscription
    if (!subscription) {
      console.log('Creating default subscription for new user')
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
        console.error('Error creating subscription:', createError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create user subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      userSubscription = newSub
    }

    // Check if user has remaining generations
    const remaining = userSubscription.monthly_limit - userSubscription.current_usage
    console.log(`User has ${remaining} generations remaining (${userSubscription.current_usage}/${userSubscription.monthly_limit})`)
    
    if (remaining <= 0) {
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
      return new Response(
        JSON.stringify({ success: false, error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🎯 Starting generation with prompt: "${prompt.substring(0, 50)}..."`)

    try {
      // Make request using the multi-key rotation manager
      const kieResponse = await keyManager.makeRequestWithRotation('https://api.kie.ai/api/v1/generate', {
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
      console.log('🎵 Kie AI Response:', { code: result.code, msg: result.msg, hasTaskId: !!result.data.taskId })

      if (result.code !== 200 || !result.data.taskId) {
        console.error('❌ Generation failed:', result.msg)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Generation failed: ${result.msg}`,
            shouldRetry: true
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
        console.error('❌ Failed to update usage after successful generation:', updateError)
      } else {
        console.log(`📊 Usage updated successfully. New usage: ${userSubscription.current_usage + 1}`)
      }

      // Prepare response - include API stats only for admins
      const responseData: any = {
        success: true,
        taskId: result.data.taskId,
        message: 'Generation started successfully',
        remainingGenerations: remaining - 1
      }

      // Only include API key statistics for admin users
      if (isAdmin) {
        responseData.apiKeyStats = keyManager.getKeyStatistics()
        responseData.totalAvailableGenerations = keyManager.getTotalAvailableGenerations()
        console.log(`👑 Admin user - including API key statistics`)
      }

      return new Response(
        JSON.stringify(responseData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (apiError) {
      console.error('❌ API call failed:', apiError)
      return new Response(
        JSON.stringify({
          success: false, 
          error: `Generation failed: ${apiError.message}`,
          shouldRetry: true
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