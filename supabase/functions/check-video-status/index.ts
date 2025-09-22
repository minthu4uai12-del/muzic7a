import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface WavespeedStatusResponse {
  id: string
  model: string
  status: 'created' | 'processing' | 'completed' | 'failed'
  outputs: string[]
  has_nsfw_contents: boolean[]
  created_at: string
  urls?: {
    get?: string
    cancel?: string
  }
}

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

    console.log(`🔍 Checking video status for task: ${taskId}`)

    try {
      // Get Wavespeed API key
      const wavespeedApiKey = Deno.env.get('WAVESPEED_API_KEY')
      if (!wavespeedApiKey) {
        throw new Error('Wavespeed API key not configured')
      }

      // Check video status using Wavespeed API
      const wavespeedResponse = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${wavespeedApiKey}`,
          'Content-Type': 'application/json',
        }
      })

      if (!wavespeedResponse.ok) {
        const errorText = await wavespeedResponse.text()
        console.error('Wavespeed status check error:', wavespeedResponse.status, errorText)
        throw new Error(`Wavespeed API error: ${wavespeedResponse.status}`)
      }

      const result: WavespeedStatusResponse = await wavespeedResponse.json()
      console.log('📊 Video status check result:', { 
        id: result.id,
        status: result.status, 
        hasOutputs: !!result.outputs?.length 
      })

      // Update database with latest status
      const { error: updateError } = await supabaseClient
        .from('video_generation_tasks')
        .update({
          status: result.status,
          outputs: result.outputs || [],
          has_nsfw_contents: result.has_nsfw_contents || []
        })
        .eq('id', taskId)
        .eq('user_id', user.id)

      if (updateError) {
        console.warn('Failed to update video task status:', updateError)
      }

      // Handle failed generation - revert usage if needed
      if (result.status === 'failed') {
        console.log('❌ Video generation failed, checking if we need to revert usage...')
        
        try {
          const { data: currentSub } = await supabaseClient
            .from('video_subscriptions')
            .select('current_usage')
            .eq('user_id', user.id)
            .single()

          if (currentSub && currentSub.current_usage > 0) {
            await supabaseClient
              .from('video_subscriptions')
              .update({
                current_usage: currentSub.current_usage - 1
              })
              .eq('user_id', user.id)
            
            console.log('✅ Reverted video usage deduction due to failed generation')
          }
        } catch (revertError) {
          console.error('⚠️ Failed to revert video usage:', revertError)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: result.status,
          outputs: result.outputs || [],
          hasNsfwContents: result.has_nsfw_contents || [],
          error: result.status === 'failed' ? 'Video generation failed' : undefined
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (apiError) {
      console.error('❌ Video status check API error:', apiError)
      
      return new Response(
        JSON.stringify({
          success: false, 
          error: `Failed to check video status: ${apiError.message}`,
          shouldRetry: true
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('❌ Video status check error:', error)
    
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