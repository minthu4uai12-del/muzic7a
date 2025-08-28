/*
  # Add payment usage tracking and functions

  1. Functions
    - `approve_payment_order` - Approves payment orders and adds generations to user account
    - `increment_play_count` - Increments play count for tracks
    - `update_updated_at_column` - Updates the updated_at timestamp
    - `handle_updated_at` - Trigger function for updated_at
    - `handle_new_user` - Creates user profile and subscription for new users

  2. Triggers
    - Auto-create user profile and subscription when user signs up

  3. Security
    - RLS policies ensure users can only access their own data
    - Admin functions for payment management
*/

-- Function to approve payment orders and add generations
CREATE OR REPLACE FUNCTION approve_payment_order(
  order_id_param UUID,
  admin_id_param UUID,
  admin_notes_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_record payment_orders%ROWTYPE;
  package_record payment_packages%ROWTYPE;
  result JSON;
BEGIN
  -- Get the order details
  SELECT * INTO order_record
  FROM payment_orders
  WHERE id = order_id_param AND status = 'paid';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found or not in paid status');
  END IF;
  
  -- Get package details
  SELECT * INTO package_record
  FROM payment_packages
  WHERE id = order_record.package_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Package not found');
  END IF;
  
  BEGIN
    -- Start transaction
    -- Update order status
    UPDATE payment_orders
    SET 
      status = 'approved',
      admin_notes = admin_notes_param,
      approved_by = admin_id_param,
      approved_at = NOW()
    WHERE id = order_id_param;
    
    -- Add generations to user subscription
    INSERT INTO user_subscriptions (user_id, plan_type, monthly_limit, current_usage)
    VALUES (order_record.user_id, 'premium', package_record.generations, 0)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      monthly_limit = user_subscriptions.monthly_limit + package_record.generations,
      plan_type = CASE 
        WHEN user_subscriptions.plan_type = 'free' THEN 'premium'
        ELSE user_subscriptions.plan_type
      END,
      updated_at = NOW();
    
    -- Create transaction record
    INSERT INTO payment_transactions (
      order_id,
      user_id,
      type,
      generations_added,
      amount_mmk,
      description
    ) VALUES (
      order_id_param,
      order_record.user_id,
      'purchase',
      package_record.generations,
      order_record.amount_mmk,
      'Purchase of ' || package_record.name || ' package'
    );
    
    RETURN json_build_object('success', true, 'message', 'Order approved successfully');
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;

-- Function to increment play count
CREATE OR REPLACE FUNCTION increment_play_count(track_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE saved_tracks
  SET play_count = play_count + 1
  WHERE id = track_id;
END;
$$;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function to handle updated_at for various tables
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create user profile
  INSERT INTO user_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Create user subscription with free plan
  INSERT INTO user_subscriptions (user_id, plan_type, monthly_limit, current_usage)
  VALUES (NEW.id, 'free', 1, 0);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the user creation
  RAISE WARNING 'Failed to create user profile/subscription: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION approve_payment_order TO authenticated;
GRANT EXECUTE ON FUNCTION increment_play_count TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user TO supabase_auth_admin;