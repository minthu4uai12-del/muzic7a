import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

class MultiKeyManager {
  private apiKeys: string[] = []
  private keyUsage: Map<string, { count: number; resetTime: number; lastUsed: number; isBlocked: boolean }> = new Map()
  private maxRequestsPerKey: number = 50
  private resetInterval: number = 60 * 60 * 1000

  constructor() {
    this.loadApiKeysFromSecrets()
    this.initializeKeyUsageTracking()
    console.log(`🔑 Get-Usage: Initialized with ${this.apiKeys.length} API keys`)
  }

  private loadApiKeysFromSecrets(): void {
    const keys: string[] = []
    
    console.log('🔍 Get-Usage: Loading API keys from Supabase secrets...')
    
    // Load all possible API keys from secrets
    for (let i = 1; i <= 20; i++) {
      const keyName = `MUSIC_AI_API_KEY_${i}`
      const key = Deno.env.get(keyName)
      
      if (key && key.trim() && key !== 'your_api_key_here' && key.length > 10) {
        keys.push(key.trim())
        console.log(`✅ Get-Usage: Found API key ${i}: ${key.substring(0, 8)}...${key.substring(key.length - 4)}`)
      } else {
        console.log(`❌ Get-Usage: API key ${i} not found or invalid`)
      }
    }
    
    // Fallback to single key
    if (keys.length === 0) {
      const singleKey = Deno.env.get('MUSIC_AI_API_KEY')
      if (singleKey && singleKey.trim() && singleKey !== 'your_api_key_here' && singleKey.length > 10) {
        keys.push(singleKey.trim())
        console.log('✅ Get-Usage: Found fallback API key')
      }
    }
    
    if (keys.length === 0) {
      console.error('❌ Get-Usage: No valid API keys found in secrets!')
      // Don't throw error here, just log warning
      console.warn('⚠️ API key statistics will not be available')
    }
    
    this.apiKeys = keys
    console.log(`📊 Get-Usage: Total API keys loaded: ${this.apiKeys.length}`)
  }

  private initializeKeyUsageTracking(): void {
    const now = Date.now()
    this.apiKeys.forEach((key, index) => {
      this.keyUsage.set(key, { 
        count: Math.floor(Math.random() * 10), // Simulate some usage for demo
        resetTime: now + this.resetInterval,
        lastUsed: now - Math.floor(Math.random() * 60000), // Random last used time
        isBlocked: false
      })
      console.log(`🔧 Get-Usage: Initialized tracking for key ${index + 1}`)
    })
  }

  getKeyStats() {
    const now = Date.now()
    return this.apiKeys.map((key, index) => {
      const usage = this.keyUsage.get(key)!
      const isActive = !usage.isBlocked && usage.count < this.maxRequestsPerKey
      
      // Reset if time has passed
      if (now >= usage.resetTime) {
        usage.count = 0
        usage.resetTime = now + this.resetInterval
        usage.isBlocked = false
      }
      
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

const keyManager = new MultiKeyManager()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('📊 Get User Usage Function Called')
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error: Missing environment variables'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ No authorization header')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No authorization header provided'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid authentication'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`👤 User authenticated: ${user.email}`)

    // Get user subscription info
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      console.error('❌ Database error:', subError)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${subError.message}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create default subscription if none exists
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
        throw createError
      }

      console.log('✅ Created new subscription')
      return new Response(
        JSON.stringify({
          success: true,
          usage: {
            current: 0,
            limit: 1,
            planType: 'free',
            resetDate: newSub.reset_date,
            remaining: 1
          },
          apiKeyStats: keyManager.getKeyStats(),
          totalAvailableGenerations: keyManager.getTotalAvailableGenerations(),
          activeKeys: keyManager.getActiveKeyCount()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if we need to reset usage
    const now = new Date()
    const resetDate = new Date(subscription.reset_date)
    
    if (now >= resetDate) {
      console.log('🔄 Resetting usage for new period...')
      const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      
      const { data: updatedSub, error: updateError } = await supabaseClient
        .from('user_subscriptions')
        .update({
          current_usage: 0,
          reset_date: nextResetDate.toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error updating subscription:', updateError)
        throw updateError
      }

      console.log('✅ Usage reset successfully')
      return new Response(
        JSON.stringify({
          success: true,
          usage: {
            current: 0,
            limit: updatedSub.monthly_limit,
            planType: updatedSub.plan_type,
            resetDate: updatedSub.reset_date,
            remaining: updatedSub.monthly_limit
          },
          apiKeyStats: keyManager.getKeyStats(),
          totalAvailableGenerations: keyManager.getTotalAvailableGenerations(),
          activeKeys: keyManager.getActiveKeyCount()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('📊 Returning current usage data')
    return new Response(
      JSON.stringify({
        success: true,
        usage: {
          current: subscription.current_usage,
          limit: subscription.monthly_limit,
          planType: subscription.plan_type,
          resetDate: subscription.reset_date,
          remaining: subscription.monthly_limit - subscription.current_usage
        },
        apiKeyStats: keyManager.getKeyStats(),
        totalAvailableGenerations: keyManager.getTotalAvailableGenerations(),
        activeKeys: keyManager.getActiveKeyCount()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Usage check error:', error)
    
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