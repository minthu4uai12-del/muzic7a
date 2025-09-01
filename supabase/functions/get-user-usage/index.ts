import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  constructor() {
    this.loadApiKeysFromSecrets()
    this.initializeKeyTracking()
    console.log(`🔑 Get-Usage: MultiKeyRotationManager initialized with ${this.apiKeys.length} API keys`)
  }

  private loadApiKeysFromSecrets(): void {
    const keys: string[] = []
    
    console.log('🔍 Get-Usage: Loading API keys from Supabase Edge Function secrets...')
    
    // Load multiple keys from secrets: MUSIC_AI_API_KEY_1, MUSIC_AI_API_KEY_2, etc.
    for (let i = 1; i <= 50; i++) {
      const key = Deno.env.get(`MUSIC_AI_API_KEY_${i}`)
      if (key && key.trim() && key.length > 10 && !key.includes('your_') && !key.includes('placeholder')) {
        keys.push(key.trim())
        console.log(`✅ Get-Usage: Loaded API key ${i}`)
      }
    }
    
    // Fallback to single key if no numbered keys found
    if (keys.length === 0) {
      const singleKey = Deno.env.get('MUSIC_AI_API_KEY')
      if (singleKey && singleKey.trim() && singleKey.length > 10) {
        keys.push(singleKey.trim())
        console.log(`✅ Get-Usage: Loaded fallback API key`)
      }
    }
    
    this.apiKeys = keys
    console.log(`📊 Get-Usage: Successfully loaded ${this.apiKeys.length} API keys`)
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

  getKeyStatistics() {
    return this.apiKeys.map((key, index) => {
      const stats = this.keyStats.get(key)!
      return {
        index: index + 1,
        usage: stats.usage,
        maxUsage: 50, // 50 requests per hour
        isActive: !stats.isBlocked && stats.usage < 50,
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
        total += Math.max(0, 50 - stats.usage)
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

    console.log('Get-Usage: User authenticated:', user.id)

    // Check if user is admin
    const { data: adminUser } = await supabaseClient
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    const isAdmin = !!adminUser

    // Get user subscription info
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      console.error('Get-Usage: Database error:', subError)
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

    // If no subscription exists, create default free plan
    if (!subscription) {
      console.log('Get-Usage: Creating default subscription...')
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
        console.error('Get-Usage: Error creating subscription:', createError)
        throw createError
      }

      const responseData: any = {
        success: true,
        usage: {
          current: 0,
          limit: 1,
          planType: 'free',
          resetDate: newSub.reset_date,
          remaining: 1
        }
      }

      // Only include API key statistics for admin users
      if (isAdmin) {
        responseData.apiKeyStats = keyManager.getKeyStatistics()
        responseData.totalAvailableGenerations = keyManager.getTotalAvailableGenerations()
      }

      return new Response(
        JSON.stringify(responseData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if we need to reset usage
    const now = new Date()
    const resetDate = new Date(subscription.reset_date)
    
    if (now >= resetDate) {
      console.log('Get-Usage: Resetting usage for new period...')
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
        console.error('Get-Usage: Error updating subscription:', updateError)
        throw updateError
      }

      const responseData: any = {
        success: true,
        usage: {
          current: 0,
          limit: updatedSub.monthly_limit,
          planType: updatedSub.plan_type,
          resetDate: updatedSub.reset_date,
          remaining: updatedSub.monthly_limit
        }
      }

      // Only include API key statistics for admin users
      if (isAdmin) {
        responseData.apiKeyStats = keyManager.getKeyStatistics()
        responseData.totalAvailableGenerations = keyManager.getTotalAvailableGenerations()
      }

      return new Response(
        JSON.stringify(responseData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Get-Usage: Returning current usage data')
    
    const responseData: any = {
      success: true,
      usage: {
        current: subscription.current_usage,
        limit: subscription.monthly_limit,
        planType: subscription.plan_type,
        resetDate: subscription.reset_date,
        remaining: subscription.monthly_limit - subscription.current_usage
      }
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

  } catch (error) {
    console.error('Get-Usage: Error:', error)
    
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