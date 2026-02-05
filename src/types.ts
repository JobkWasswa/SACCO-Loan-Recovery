export interface Client {
  id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  national_id: string;
  date_of_birth: string;
  address?: string;
  employer?: string;
  monthly_income: number;
  status: 'active' | 'inactive' | 'suspended';
  joined_date: string;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  client_id: string;
  loan_number: string;
  loan_product: string;
  principal_amount: number;
  interest_rate: number;
  loan_term_months: number;
  disbursement_date?: string;
  maturity_date?: string;
  purpose?: string;
  status: 'pending' | 'approved' | 'active' | 'closed' | 'written_off';
  outstanding_balance: number;
  total_paid: number;
  arrears_amount: number;
  days_in_arrears: number;
  loan_officer_id?: string;
  approved_by?: string;
  approved_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Repayment {
  id: string;
  loan_id: string;
  transaction_date: string;
  amount: number;
  principal_amount: number;
  interest_amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'mobile_money' | 'salary_deduction';
  receipt_number?: string;
  recorded_by?: string;
  notes?: string;
  created_at: string;
}

export interface Guarantor {
  id: string;
  loan_id: string;
  guarantor_client_id?: string;
  guarantor_name: string;
  guarantor_phone: string;
  guarantor_relationship?: string;
  guaranteed_amount: number;
  created_at: string;
}

export interface RiskScore {
  id: string;
  client_id: string;
  loan_id?: string;
  score: number;
  risk_category: 'low' | 'medium' | 'high' | 'very_high';
  payment_history_score: number;
  debt_to_income_ratio: number;
  loan_amount_score: number;
  guarantor_score: number;
  days_in_arrears_score: number;
  calculated_at: string;
  factors: Record<string, any>;
}

export interface LoanSchedule {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  principal_due: number;
  interest_due: number;
  total_due: number;
  principal_paid: number;
  interest_paid: number;
  total_paid: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
}
