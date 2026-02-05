import { useEffect, useState } from 'react';
import { supabase, calculateRiskScore } from '../lib/supabase';
import { Loan, Client, RiskScore } from '../types';
import { Plus, Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function Loans() {
  const [loans, setLoans] = useState<(Loan & { client?: Client; risk?: RiskScore })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loansRes, clientsRes] = await Promise.all([
        supabase.from('loans').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*'),
      ]);

      const loansData = loansRes.data || [];
      const clientsData = clientsRes.data || [];
      setClients(clientsData);

      const loansWithClients = await Promise.all(
        loansData.map(async (loan) => {
          const client = clientsData.find((c) => c.id === loan.client_id);

          const riskRes = await supabase
            .from('risk_scores')
            .select('*')
            .eq('loan_id', loan.id)
            .order('calculated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...loan,
            client,
            risk: riskRes.data || undefined,
          };
        })
      );

      setLoans(loansWithClients);
    } catch (error) {
      console.error('Error loading loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLoan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const principalAmount = parseFloat(formData.get('principal_amount') as string);
    const interestRate = parseFloat(formData.get('interest_rate') as string);
    const loanTermMonths = parseInt(formData.get('loan_term_months') as string);

    const disbursementDate = new Date();
    const maturityDate = new Date(disbursementDate);
    maturityDate.setMonth(maturityDate.getMonth() + loanTermMonths);

    const loanData = {
      client_id: formData.get('client_id') as string,
      loan_number: `LN-${Date.now()}`,
      loan_product: formData.get('loan_product') as string,
      principal_amount: principalAmount,
      interest_rate: interestRate,
      loan_term_months: loanTermMonths,
      disbursement_date: disbursementDate.toISOString().split('T')[0],
      maturity_date: maturityDate.toISOString().split('T')[0],
      purpose: formData.get('purpose') as string,
      status: 'active',
      outstanding_balance: principalAmount,
      total_paid: 0,
      arrears_amount: 0,
      days_in_arrears: 0,
    };

    try {
      const { data, error } = await supabase.from('loans').insert([loanData]).select().single();
      if (error) throw error;

      await calculateRiskScore(loanData.client_id, data.id);

      setShowAddModal(false);
      loadData();
    } catch (error) {
      console.error('Error adding loan:', error);
      alert('Error adding loan');
    }
  };

  const getRiskBadge = (risk?: RiskScore) => {
    if (!risk) return null;

    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      very_high: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[risk.risk_category]}`}>
        Risk: {risk.risk_category.replace('_', ' ')} ({risk.score.toFixed(0)})
      </span>
    );
  };

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.loan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.client?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.client?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.client?.member_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'all' || loan.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loans</h1>
          <p className="mt-1 text-sm text-gray-600">Manage loan applications and active loans</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Loan
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by loan number, client name, or member number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'active', 'closed', 'written_off'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loan Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outstanding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{loan.loan_number}</div>
                      <div className="text-sm text-gray-500">{loan.loan_product}</div>
                      {loan.days_in_arrears > 0 && (
                        <div className="flex items-center text-xs text-red-600 mt-1">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {loan.days_in_arrears} days overdue
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {loan.client && (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {loan.client.first_name} {loan.client.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{loan.client.member_number}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${loan.principal_amount.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">{loan.interest_rate}% / {loan.loan_term_months}m</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${loan.outstanding_balance.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Paid: ${loan.total_paid.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        loan.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : loan.status === 'closed'
                          ? 'bg-blue-100 text-blue-800'
                          : loan.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getRiskBadge(loan.risk)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">New Loan Application</h2>
              <form onSubmit={handleAddLoan} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select
                    name="client_id"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.first_name} {client.last_name} ({client.member_number})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loan Product</label>
                    <select
                      name="loan_product"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="emergency">Emergency Loan</option>
                      <option value="business">Business Loan</option>
                      <option value="education">Education Loan</option>
                      <option value="agriculture">Agriculture Loan</option>
                      <option value="personal">Personal Loan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Principal Amount</label>
                    <input
                      type="number"
                      name="principal_amount"
                      step="0.01"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                    <input
                      type="number"
                      name="interest_rate"
                      step="0.01"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loan Term (months)</label>
                    <input
                      type="number"
                      name="loan_term_months"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                  <textarea
                    name="purpose"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Loan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
