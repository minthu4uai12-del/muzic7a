import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PaymentOrder, AdminUser } from '../types/payment';
import { useAuth } from './useAuth';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [allOrders, setAllOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    } else {
      setIsAdmin(false);
      setAdminUser(null);
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadAllOrders();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      // Check if Supabase is properly configured
      if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'your_supabase_project_url') {
        console.warn('Supabase not configured - admin features disabled');
        setIsAdmin(false);
        setAdminUser(null);
        return;
      }

      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        // Handle specific Supabase configuration errors
        if (error.message?.includes('Supabase not configured')) {
          console.warn('Supabase not configured - admin features disabled');
          setIsAdmin(false);
          setAdminUser(null);
          return;
        }
        throw error;
      }

      if (data) {
        setIsAdmin(true);
        setAdminUser(data);
      } else {
        setIsAdmin(false);
        setAdminUser(null);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
      setAdminUser(null);
    }
  };

  const loadAllOrders = async () => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_orders')
        .select(`
          *,
          payment_packages (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllOrders(data || []);
    } catch (err) {
      console.error('Error loading all orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const approveOrder = async (orderId: string, adminNotes?: string): Promise<boolean> => {
    if (!isAdmin || !user) return false;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('payment_orders')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      await loadAllOrders();
      return true;
    } catch (err) {
      console.error('Error approving order:', err);
      setError('Failed to approve order');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const rejectOrder = async (orderId: string, adminNotes?: string): Promise<boolean> => {
    if (!isAdmin || !user) return false;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('payment_orders')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      await loadAllOrders();
      return true;
    } catch (err) {
      console.error('Error rejecting order:', err);
      setError('Failed to reject order');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getOrderStats = () => {
    const stats = {
      total: allOrders.length,
      pending: allOrders.filter(o => o.status === 'pending').length,
      paid: allOrders.filter(o => o.status === 'paid').length,
      approved: allOrders.filter(o => o.status === 'approved').length,
      rejected: allOrders.filter(o => o.status === 'rejected').length,
      totalRevenue: allOrders
        .filter(o => o.status === 'approved')
        .reduce((sum, o) => sum + o.amount_mmk, 0)
    };
    return stats;
  };

  return {
    isAdmin,
    adminUser,
    allOrders,
    loading,
    error,
    approveOrder,
    rejectOrder,
    refreshOrders: loadAllOrders,
    getOrderStats
  };
}