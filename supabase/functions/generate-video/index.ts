import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GenerateVideoRequest {
  audioUrl: string
  imageUrl: string
  prompt?: string
  resolution?: '480p' | '720p'
  trackId?: string
  trackTitle?: string
}

interface WavespeedResponse {
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

    console.log(`🎬 Video generation request from user: ${user.email}`)

    // Check user's video subscription
    const { data: videoSub, error: subError } = await supabaseClient
      .from('video_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      console.error('Video subscription check error:', subError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check video subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If no subscription exists, create default
    let videoSubscription = videoSub
    if (!videoSub) {
      console.log('Creating default video subscription for user')
      const { data: newSub, error: createError } = await supabaseClient
        .from('video_subscriptions')
        .insert({
          user_id: user.id,
          current_usage: 0,
          monthly_limit: 0
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating video subscription:', createError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create video subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      videoSubscription = newSub
    }

    // Check if user has remaining video generations
    const remaining = videoSubscription.monthly_limit - videoSubscription.current_usage
    console.log(`User has ${remaining} video generations remaining (${videoSubscription.current_usage}/${videoSubscription.monthly_limit})`)
    
    if (remaining <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No video generations remaining. Please purchase a video pack.',
          usage: {
            current: videoSubscription.current_usage,
            limit: videoSubscription.monthly_limit,
            remaining: 0
          }
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { audioUrl, imageUrl, prompt = '', resolution = '480p', trackId, trackTitle }: GenerateVideoRequest = await req.json()

    if (!audioUrl?.trim() || !imageUrl?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Audio URL and image URL are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🎯 Starting video generation with audio: ${audioUrl.substring(0, 50)}...`)

    try {
      // Get Wavespeed API key
      const wavespeedApiKey = Deno.env.get('WAVESPEED_API_KEY')
      if (!wavespeedApiKey) {
        throw new Error('Wavespeed API key not configured')
      }

      // Make request to Wavespeed AI
      const wavespeedResponse = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/infinitetalk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${wavespeedApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: audioUrl,
          image: imageUrl,
          prompt: prompt || '',
          resolution: resolution,
          seed: -1
        })
      })

      if (!wavespeedResponse.ok) {
        const errorText = await wavespeedResponse.text()
        console.error('Wavespeed API error:', wavespeedResponse.status, errorText)
        throw new Error(`Wavespeed API error: ${wavespeedResponse.status}`)
      }

      const result: WavespeedResponse = await wavespeedResponse.json()
      console.log('🎬 Wavespeed Response:', { id: result.id, status: result.status, model: result.model })

      if (!result.id) {
        console.error('❌ Video generation failed: No task ID returned')
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Video generation failed: No task ID returned',
            shouldRetry: true
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Store video generation task in database
      const { error: insertError } = await supabaseClient
        .from('video_generation_tasks')
        .insert({
          id: result.id,
          user_id: user.id,
          status: result.status,
          audio_url: audioUrl,
          image_url: imageUrl,
          prompt: prompt,
          resolution: resolution,
          track_id: trackId,
          track_title: trackTitle,
          outputs: result.outputs || [],
          has_nsfw_contents: result.has_nsfw_contents || []
        })

      if (insertError) {
        console.error('Failed to store video task:', insertError)
        // Continue anyway, don't fail the generation
      }

      // ONLY deduct usage AFTER successful API call
      console.log(`✅ Video generation started successfully, deducting 1 generation for user ${user.id}`)
      
      const { error: updateError } = await supabaseClient
        .from('video_subscriptions')
        .update({
          current_usage: videoSubscription.current_usage + 1
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('❌ Failed to update video usage after successful generation:', updateError)
        // Even if usage update fails, we still return success since the generation started
      } else {
        console.log(`📊 Video usage updated successfully. New usage: ${videoSubscription.current_usage + 1}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          taskId: result.id,
          status: result.status,
          message: 'Video generation started successfully',
          remainingGenerations: remaining - 1
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (apiError) {
      console.error('❌ Video API call failed:', apiError)
      // DO NOT deduct usage if API call failed
      return new Response(
        JSON.stringify({
          success: false, 
          error: `Video generation failed: ${apiError.message}`,
          shouldRetry: true
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('❌ Video generation error:', error)
    
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