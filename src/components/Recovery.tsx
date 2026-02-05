import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loan, Client, Repayment } from '../types';
import { AlertTriangle, Phone, Mail, DollarSign, Calendar } from 'lucide-react';

export default function Recovery() {
  const [loansInArrears, setLoansInArrears] = useState<(Loan & { client?: Client; repayments?: Repayment[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadArrearsData();
  }, []);

  const loadArrearsData = async () => {
    try {
      const loansRes = await supabase
        .from('loans')
        .select('*')
        .eq('status', 'active')
        .gt('days_in_arrears', 0)
        .order('days_in_arrears', { ascending: false });

      const loans = loansRes.data || [];

      const loansWithDetails = await Promise.all(
        loans.map(async (loan) => {
          const [clientRes, repaymentsRes] = await Promise.all([
            supabase.from('clients').select('*').eq('id', loan.client_id).maybeSingle(),
            supabase
              .from('repayments')
              .select('*')
              .eq('loan_id', loan.id)
              .order('transaction_date', { ascending: false })
              .limit(5),
          ]);

          return {
            ...loan,
            client: clientRes.data || undefined,
            repayments: repaymentsRes.data || [],
          };
        })
      );

      setLoansInArrears(loansWithDetails);
    } catch (error) {
      console.error('Error loading arrears data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLoan) return;

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const loan = loansInArrears.find((l) => l.id === selectedLoan);

    if (!loan) return;

    const interestAmount = (amount * loan.interest_rate) / 100;
    const principalAmount = amount - interestAmount;

    const repaymentData = {
      loan_id: selectedLoan,
      transaction_date: formData.get('transaction_date') as string,
      amount,
      principal_amount: principalAmount,
      interest_amount: interestAmount,
      payment_method: formData.get('payment_method') as string,
      receipt_number: formData.get('receipt_number') as string,
      notes: formData.get('notes') as string,
    };

    try {
      await supabase.from('repayments').insert([repaymentData]);

      const newOutstanding = Math.max(0, loan.outstanding_balance - amount);
      const newTotalPaid = loan.total_paid + amount;
      const newArrears = Math.max(0, loan.arrears_amount - amount);

      await supabase
        .from('loans')
        .update({
          outstanding_balance: newOutstanding,
          total_paid: newTotalPaid,
          arrears_amount: newArrears,
          days_in_arrears: newArrears > 0 ? loan.days_in_arrears : 0,
          status: newOutstanding === 0 ? 'closed' : 'active',
        })
        .eq('id', selectedLoan);

      setShowPaymentModal(false);
      setSelectedLoan(null);
      loadArrearsData();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment');
    }
  };

  const getArrearsCategory = (days: number) => {
    if (days > 90) return { label: 'Critical', color: 'bg-red-600 text-white' };
    if (days > 60) return { label: 'Severe', color: 'bg-orange-600 text-white' };
    if (days > 30) return { label: 'High', color: 'bg-yellow-600 text-white' };
    return { label: 'Moderate', color: 'bg-blue-600 text-white' };
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
        <h1 className="text-3xl font-bold text-gray-900">Loan Recovery</h1>
        <p className="mt-1 text-sm text-gray-600">Track and manage loans in arrears</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Loans in Arrears</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{loansInArrears.length}</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Arrears Amount</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                ${loansInArrears.reduce((sum, l) => sum + l.arrears_amount, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Days Overdue</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {loansInArrears.length > 0
                  ? Math.round(
                      loansInArrears.reduce((sum, l) => sum + l.days_in_arrears, 0) / loansInArrears.length
                    )
                  : 0}
              </p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Loans Requiring Action</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {loansInArrears.map((loan) => {
            const category = getArrearsCategory(loan.days_in_arrears);

            return (
              <div key={loan.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{loan.loan_number}</h3>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${category.color}`}>
                        {category.label} - {loan.days_in_arrears} days
                      </span>
                    </div>

                    {loan.client && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Client Details</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {loan.client.first_name} {loan.client.last_name}
                          </p>
                          <p className="text-sm text-gray-600">{loan.client.member_number}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <a
                              href={`tel:${loan.client.phone}`}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <Phone className="w-4 h-4" />
                              {loan.client.phone}
                            </a>
                            {loan.client.email && (
                              <a
                                href={`mailto:${loan.client.email}`}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <Mail className="w-4 h-4" />
                                {loan.client.email}
                              </a>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-700">Loan Status</p>
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Outstanding:</span>
                              <span className="font-semibold text-gray-900">
                                ${loan.outstanding_balance.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Arrears:</span>
                              <span className="font-semibold text-red-600">
                                ${loan.arrears_amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Total Paid:</span>
                              <span className="font-semibold text-green-600">
                                ${loan.total_paid.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {loan.repayments && loan.repayments.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Recent Payments</p>
                        <div className="space-y-1">
                          {loan.repayments.slice(0, 3).map((repayment) => (
                            <div key={repayment.id} className="flex justify-between text-xs text-gray-600">
                              <span>{new Date(repayment.transaction_date).toLocaleDateString()}</span>
                              <span>${repayment.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <button
                      onClick={() => {
                        setSelectedLoan(loan.id);
                        setShowPaymentModal(true);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Record Payment
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {loansInArrears.length === 0 && (
            <div className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No loans in arrears. Great job on recovery!</p>
            </div>
          )}
        </div>
      </div>

      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Record Payment</h2>
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    name="transaction_date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    name="payment_method"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="salary_deduction">Salary Deduction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number</label>
                  <input
                    type="text"
                    name="receipt_number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedLoan(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Record Payment
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
