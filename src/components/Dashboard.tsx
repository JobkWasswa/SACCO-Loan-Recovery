import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, Client, Repayment } from '../types';
import { TrendingUp, Users, DollarSign, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeLoans: 0,
    totalDisbursed: 0,
    totalOutstanding: 0,
    loansInArrears: 0,
    totalArrears: 0,
    recentRepayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [clientsRes, loansRes, repaymentsRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }),
        supabase.from('loans').select('*'),
        supabase
          .from('repayments')
          .select('amount')
          .gte('transaction_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      ]);

      const loans = loansRes.data || [];
      const activeLoans = loans.filter((l) => l.status === 'active');
      const loansInArrears = activeLoans.filter((l) => l.days_in_arrears > 0);

      const totalDisbursed = loans.reduce((sum, l) => sum + parseFloat(l.principal_amount || '0'), 0);
      const totalOutstanding = activeLoans.reduce((sum, l) => sum + parseFloat(l.outstanding_balance || '0'), 0);
      const totalArrears = loansInArrears.reduce((sum, l) => sum + parseFloat(l.arrears_amount || '0'), 0);
      const recentRepayments = (repaymentsRes.data || []).reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);

      setStats({
        totalClients: clientsRes.count || 0,
        activeLoans: activeLoans.length,
        totalDisbursed,
        totalOutstanding,
        loansInArrears: loansInArrears.length,
        totalArrears,
        recentRepayments,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Overview of SACCO loan portfolio and recovery status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Loans</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeLoans}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ${stats.totalOutstanding.toLocaleString()}
              </p>
            </div>
            <div className="bg-teal-100 rounded-full p-3">
              <DollarSign className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Loans in Arrears</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.loansInArrears}</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Disbursed</span>
              <span className="text-sm font-semibold text-gray-900">
                ${stats.totalDisbursed.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Outstanding</span>
              <span className="text-sm font-semibold text-gray-900">
                ${stats.totalOutstanding.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Arrears</span>
              <span className="text-sm font-semibold text-red-600">
                ${stats.totalArrears.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Recent Repayments (30 days)</span>
              <span className="text-sm font-semibold text-green-600">
                ${stats.recentRepayments.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Health</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Arrears Rate</span>
                <span className="text-sm font-semibold text-gray-900">
                  {stats.activeLoans > 0
                    ? ((stats.loansInArrears / stats.activeLoans) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{
                    width: `${stats.activeLoans > 0 ? (stats.loansInArrears / stats.activeLoans) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Collection Rate</span>
                <span className="text-sm font-semibold text-gray-900">
                  {stats.totalDisbursed > 0
                    ? (((stats.totalDisbursed - stats.totalOutstanding) / stats.totalDisbursed) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.totalDisbursed > 0
                        ? ((stats.totalDisbursed - stats.totalOutstanding) / stats.totalDisbursed) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
