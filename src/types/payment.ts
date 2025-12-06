export interface PaymentPackage {
  id: string;
  name: string;
  name_mm: string;
  generations: number;
  price_mmk: number;
  description: string;
  description_mm: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentOrder {
  id: string;
  user_id: string;
  package_id: string;
  order_reference: string;
  status: 'pending' | 'paid' | 'approved' | 'rejected' | 'expired';
  payment_method: 'bank_transfer' | 'mobile_money' | 'cash';
  amount_mmk: number;
  generations: number;
  payment_proof_url?: string;
  payment_notes?: string;
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  
  // Joined data
  package?: PaymentPackage;
  user_email?: string;
}

export interface PaymentTransaction {
  id: string;
  order_id: string;
  user_id: string;
  type: 'purchase' | 'refund' | 'bonus';
  generations_added: number;
  amount_mmk?: number;
  description: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  role: 'admin' | 'moderator';
  is_active: boolean;
  created_at: string;
}