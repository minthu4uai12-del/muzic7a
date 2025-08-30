import React, { useState } from 'react';
import { Shield, Users, CreditCard, TrendingUp, CheckCircle, XCircle, Clock, Eye, MessageSquare, FileText } from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { PaymentOrder } from '../types/payment';

export default function AdminPanel() {
  const { isAdmin, allOrders, loading, approveOrder, rejectOrder, getOrderStats } = useAdmin();
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrder | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'approved' | 'rejected'>('all');

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Shield className="w-16 h-16 text-red-400" />
        <h3 className="text-2xl font-bold text-white">Access Denied</h3>
        <p className="text-gray-400">You don't have admin privileges to access this panel.</p>
      </div>
    );
  }

  const stats = getOrderStats();
  const filteredOrders = filter === 'all' ? allOrders : allOrders.filter(order => order.status === filter);

  const handleApprove = async (orderId: string) => {
    setActionLoading(true);
    const success = await approveOrder(orderId, adminNotes);
    if (success) {
      setSelectedOrder(null);
      setAdminNotes('');
    }
    setActionLoading(false);
  };

  const handleReject = async (orderId: string) => {
    setActionLoading(true);
    const success = await rejectOrder(orderId, adminNotes);
    if (success) {
      setSelectedOrder(null);
      setAdminNotes('');
    }
    setActionLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'paid': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatMMK = (amount: number) => {
    return new Intl.NumberFormat('my-MM', {
      style: 'currency',
      currency: 'MMK',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center">
            <Shield className="w-8 h-8 mr-3 text-purple-400" />
            Admin Panel
          </h2>
          <p className="text-gray-400">Payment Management System</p>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white/10 rounded-xl p-4 border border-white/20">
          <div className="flex items-center space-x-2 mb-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            <span className="text-gray-400 text-sm">Total Orders</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-400 text-sm">Pending</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
        </div>
        <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center space-x-2 mb-2">
            <Eye className="w-5 h-5 text-blue-400" />
            <span className="text-gray-400 text-sm">Paid</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{stats.paid}</p>
        </div>
        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-gray-400 text-sm">Approved</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
        </div>
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
          <div className="flex items-center space-x-2 mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-gray-400 text-sm">Rejected</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
        </div>
        <div className="bg-green-600/10 rounded-xl p-4 border border-green-600/30">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-gray-400 text-sm">Revenue</span>
          </div>
          <p className="text-lg font-bold text-green-600">{formatMMK(stats.totalRevenue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <span className="text-gray-400">Filter by status:</span>
        {['all', 'pending', 'paid', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-semibold text-white">Payment Orders</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400">No orders found for the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-4 text-gray-400 font-medium">Order</th>
                  <th className="text-left p-4 text-gray-400 font-medium">User</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Package</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Transaction ID</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Date</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5">
                    <td className="p-4">
                      <div>
                        <p className="text-white font-mono text-sm">{order.order_reference}</p>
                        <p className="text-gray-500 text-xs">{order.id.slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-white">{order.user_email}</p>
                        <p className="text-gray-500 text-xs">{order.user_id.slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-white">{order.package?.name}</p>
                        <p className="text-gray-400 text-sm">{order.generations} generations</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-green-400 font-medium">{formatMMK(order.amount_mmk)}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-white font-mono text-sm break-all">
                        {order.transaction_id || 'N/A'}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-gray-300 text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                      <p className="text-gray-500 text-xs">{new Date(order.created_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-md border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Order Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Order Reference</p>
                  <p className="text-white font-mono">{selectedOrder.order_reference}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.toUpperCase()}
                  </span>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">User Email</p>
                  <p className="text-white">{selectedOrder.user_email}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Package</p>
                  <p className="text-white">{selectedOrder.package?.name}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Amount</p>
                  <p className="text-green-400 font-bold">{formatMMK(selectedOrder.amount_mmk)}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Generations</p>
                  <p className="text-white">{selectedOrder.generations}</p>
                </div>
              </div>

              {/* Transaction ID */}
              {selectedOrder.transaction_id && (
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Transaction ID</p>
                  <p className="text-white font-mono break-all">{selectedOrder.transaction_id}</p>
                </div>
              )}

              {/* Payment Proof (Optional) */}
              {selectedOrder.payment_proof_url && (
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Payment Proof</p>
                  <a
                    href={selectedOrder.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    View Payment Screenshot
                  </a>
                </div>
              )}

              {/* Payment Notes */}
              {selectedOrder.payment_notes && (
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Payment Notes</p>
                  <p className="text-white">{selectedOrder.payment_notes}</p>
                </div>
              )}

              {/* Admin Notes */}
              <div className="bg-white/10 rounded-lg p-4">
                <label className="block text-gray-400 text-sm mb-2">Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this order..."
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Actions */}
              {selectedOrder.status === 'paid' && (
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleApprove(selectedOrder.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>{actionLoading ? 'Approving...' : 'Approve Order'}</span>
                  </button>
                  <button
                    onClick={() => handleReject(selectedOrder.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
                  >
                    <XCircle className="w-5 h-5" />
                    <span>{actionLoading ? 'Rejecting...' : 'Reject Order'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
