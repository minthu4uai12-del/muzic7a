/*
  # Add User Email to Payment Orders

  1. Add user_email column to payment_orders table
     - Store user email for admin visibility without additional joins
     - Denormalized for performance and simplicity

  2. Create trigger to auto-populate user_email from auth.users when order is created
*/

-- Add user_email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_orders' AND column_name = 'user_email'
  ) THEN
    ALTER TABLE payment_orders ADD COLUMN user_email text;
  END IF;
END $$;

-- Create or replace function to populate user_email
CREATE OR REPLACE FUNCTION populate_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Get user email from auth.users table
  SELECT email INTO NEW.user_email FROM auth.users WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_user_email_on_payment_order ON payment_orders;

-- Create trigger to populate email on insert
CREATE TRIGGER set_user_email_on_payment_order
BEFORE INSERT ON payment_orders
FOR EACH ROW
EXECUTE FUNCTION populate_user_email();