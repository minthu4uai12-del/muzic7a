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
  private keyUsage: Map<string, { count: number; resetTime: number; lastUsed: number }> = new Map()
  private maxRequestsPerKey: number = 100 // Requests per hour per key
  private resetInterval: number = 60 * 60 * 1000 // 1 hour
  private keyRotationDelay: number = 2000 // 2 seconds between key switches

  constructor() {
    this.loadApiKeysFromEnvironment()
    this.initializeKeyUsageTracking()
    console.log(`🔑 Initialized MultiKeyManager with ${this.apiKeys.length} API keys`)
  }

  private loadApiKeysFromEnvironment(): void {
    const keys: string[] = []
    
    console.log('🔍 Checking for API keys in environment...')
    
    // Check for multiple key format: MUSIC_AI_API_KEY_1, MUSIC_AI_API_KEY_2, etc.
    for (let i = 1; i <= 20; i++) {
      const key = Deno.env.get(`MUSIC_AI_API_KEY_${i}`)
      console.log(`Checking MUSIC_AI_API_KEY_${i}:`, key ? 'Found' : 'Not found')
      if (key && key.trim() && key !== 'your_api_key_here') {
        keys.push(key.trim())
        console.log(`✅ Added API key ${i}`)
      }
    }
    
    // Fallback to single key
    if (keys.length === 0) {
      const singleKey = Deno.env.get('MUSIC_AI_API_KEY')
      console.log('Checking fallback MUSIC_AI_API_KEY:', singleKey ? 'Found' : 'Not found')
      if (singleKey && singleKey.trim() && singleKey !== 'your_api_key_here') {
        keys.push(singleKey.trim())
        console.log('✅ Added fallback API key')
      }
    }
    
    // Default fallback key if no environment variables
    if (keys.length === 0) {
      console.log('⚠️ No API keys found in environment, using fallback')
      keys.push('4f52e3f37a67bb5aed649a471e9989b9') // Fallback key
    }
    
    this.apiKeys = keys
    console.log(`📊 Total API keys loaded: ${this.apiKeys.length}`)
    
    // Log first few characters of each key for debugging (without exposing full keys)
    this.apiKeys.forEach((key, index) => {
      console.log(`Key ${index + 1}: ${key.substring(0, 8)}...`)
    })
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
    
    // Strategy 1: Find a key that hasn't hit the rate limit and hasn't been used recently
    for (let i = 0; i < this.apiKeys.length; i++) {
      const keyIndex = (this.currentKeyIndex + i) % this.apiKeys.length
      const key = this.apiKeys[keyIndex]
      const usage = this.keyUsage.get(key)!
      
      // Check if key is available (under rate limit and not used recently)
      const isUnderRateLimit = usage.count < this.maxRequestsPerKey
      const hasDelayPassed = (now - usage.lastUsed) >= this.keyRotationDelay
      
      if (isUnderRateLimit && hasDelayPassed) {
        this.currentKeyIndex = keyIndex
        console.log(`🔄 Using API key ${keyIndex + 1}/${this.apiKeys.length} (Usage: ${usage.count}/${this.maxRequestsPerKey})`)
        return { key, index: keyIndex }
      }
    }
    
    // Strategy 2: If all keys are recently used, find the one with lowest usage
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
    console.log(`⚠️ All keys recently used, selecting key ${bestIndex + 1} with lowest usage: ${lowestUsage}`)
    return { key: bestKey, index: bestIndex }
  }

  private incrementKeyUsage(apiKey: string): void {
    const usage = this.keyUsage.get(apiKey)
    if (usage) {
      usage.count++
      usage.lastUsed = Date.now()
      console.log(`📊 API key usage updated: ${usage.count}/${this.maxRequestsPerKey}`)
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
          'User-Agent': 'MuzAI-Server/1.0',
          ...options.headers
        }
        
        console.log(`🌐 Making request to ${url} with key ${index + 1}`)
        const response = await fetch(url, { ...options, headers })
        
        // Increment usage on successful request
        this.incrementKeyUsage(key)
        
        // Check for rate limiting
        if (response.status === 429) {
          console.warn(`⚠️ Rate limited on key ${index + 1}, trying next key...`)
          // Mark this key as temporarily exhausted
          const usage = this.keyUsage.get(key)!
          usage.count = this.maxRequestsPerKey
          continue
        }
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`HTTP ${response.status}: ${errorText}`)
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

  getKeyStats() {
    return this.apiKeys.map((key, index) => {
      const usage = this.keyUsage.get(key)!
      return {
        index: index + 1,
        usage: usage.count,
        maxUsage: this.maxRequestsPerKey,
        resetTime: new Date(usage.resetTime),
        isActive: usage.count < this.maxRequestsPerKey,
        lastUsed: usage.lastUsed > 0 ? new Date(usage.lastUsed) : null
      }
    })
  }

  getTotalAvailableGenerations(): number {
    const now = Date.now()
    let total = 0
    
    this.keyUsage.forEach((usage) => {
      // Reset if time has passed
      if (now >= usage.resetTime) {
        total += this.maxRequestsPerKey
      } else {
        total += Math.max(0, this.maxRequestsPerKey - usage.count)
      }
    })
    
    return total
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

    console.log(`🎵 Generation request from user: ${user.email}`)

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
      console.log('🎵 Kie AI Response:', { code: result.code, msg: result.msg, hasTaskId: !!result.data.taskId })

      if (result.code !== 200 || !result.data.taskId) {
        console.error('❌ Generation failed:', result.msg)
        // DO NOT deduct usage if generation failed
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
        // Even if usage update fails, we still return success since the generation started
        // This prevents double-charging the user
      } else {
        console.log(`📊 Usage updated successfully. New usage: ${userSubscription.current_usage + 1}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          taskId: result.data.taskId,
          message: 'Generation started successfully',
          remainingGenerations: remaining - 1,
          apiKeyStats: keyManager.getKeyStats(),
          totalAvailableGenerations: keyManager.getTotalAvailableGenerations()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (apiError) {
      console.error('❌ API call failed:', apiError)
      // DO NOT deduct usage if API call failed
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