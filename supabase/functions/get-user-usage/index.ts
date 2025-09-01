import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

class MultiKeyManager {
  private apiKeys: string[] = []

  constructor() {
    this.loadApiKeysFromEnvironment()
    console.log(`🔑 Get-Usage: Initialized with ${this.apiKeys.length} API keys`)
  }

  private loadApiKeysFromEnvironment(): void {
    const keys: string[] = []
    
    console.log('🔍 Get-Usage: Loading API keys from environment...')
    
    // Check for multiple key format: MUSIC_AI_API_KEY_1, MUSIC_AI_API_KEY_2, etc.
    for (let i = 1; i <= 20; i++) {
      const key = Deno.env.get(`MUSIC_AI_API_KEY_${i}`)
      if (key && key.trim() && key !== 'your_api_key_here') {
        keys.push(key.trim())
        console.log(`✅ Get-Usage: Found API key ${i}`)
      }
    }
    
    // Fallback to single key
    if (keys.length === 0) {
      const singleKey = Deno.env.get('MUSIC_AI_API_KEY')
      if (singleKey && singleKey.trim() && singleKey !== 'your_api_key_here') {
        keys.push(singleKey.trim())
        console.log('✅ Get-Usage: Found fallback API key')
      }
    }
    
    this.apiKeys = keys
    console.log(`📊 Get-Usage: Total API keys loaded: ${this.apiKeys.length}`)
  }

  getKeyStats() {
    const now = Date.now()
    return this.apiKeys.map((key, index) => ({
      index: index + 1,
      usage: 0, // Reset for demo purposes
      maxUsage: 100,
      resetTime: new Date(now + 60 * 60 * 1000), // 1 hour from now
      isActive: true,
      lastUsed: null
    }))
  }

  getTotalAvailableGenerations(): number {
    return this.apiKeys.length * 100 // 100 requests per key per hour
  }
}

const keyManager = new MultiKeyManager()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get environment variables with fallbacks
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlValue: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'missing'
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables:', {
        SUPABASE_URL: !!supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error: Missing environment variables',
          details: {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Creating Supabase client...');
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No authorization header provided'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Attempting to get user with token...');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid authentication',
          details: authError?.message
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('User authenticated:', user.id);

    // Get user subscription info
    console.log('Fetching user subscription...');
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      console.error('Database error:', subError.message, subError.code);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${subError.message}`,
          details: subError
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // If no subscription exists, create default free plan
    if (!subscription) {
      console.log('No subscription found, creating default...');
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
        console.error('Error creating subscription:', createError);
        throw createError
      }

      console.log('Created new subscription:', newSub.id);
      return new Response(
        JSON.stringify({
          success: true,
          usage: {
            current: 0,
            limit: 1,
            planType: 'free',
            resetDate: newSub.reset_date,
            remaining: 1
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Found existing subscription:', subscription.id);

    // Check if we need to reset usage
    const now = new Date()
    const resetDate = new Date(subscription.reset_date)
    
    if (now >= resetDate) {
      console.log('Resetting usage for new period...');
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
        console.error('Error updating subscription:', updateError);
        throw updateError
      }

      console.log('Usage reset successfully');
      return new Response(
        JSON.stringify({
          success: true,
          usage: {
            current: 0,
            limit: updatedSub.monthly_limit,
            planType: updatedSub.plan_type,
            resetDate: updatedSub.reset_date,
            remaining: updatedSub.monthly_limit
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Returning current usage data');
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
        totalAvailableGenerations: keyManager.getTotalAvailableGenerations()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Usage check error:', error.message || error)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})