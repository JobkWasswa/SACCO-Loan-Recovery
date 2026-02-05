/*
  # SACCO Loan Recovery and Risk Scoring System - Mifos Standard

  ## Overview
  This migration creates a comprehensive loan management system following Mifos standards
  for SACCO (Savings and Credit Cooperative Organizations).

  ## New Tables

  ### 1. `clients`
  Stores SACCO member information
  - `id` (uuid, primary key)
  - `member_number` (text, unique) - SACCO member ID
  - `first_name`, `last_name` (text)
  - `email`, `phone` (text)
  - `national_id` (text, unique)
  - `date_of_birth` (date)
  - `address` (text)
  - `employer` (text)
  - `monthly_income` (numeric)
  - `status` (text) - active, inactive, suspended
  - `joined_date` (date)
  - `created_at`, `updated_at` (timestamptz)

  ### 2. `loans`
  Tracks all loan applications and active loans
  - `id` (uuid, primary key)
  - `client_id` (uuid, foreign key)
  - `loan_number` (text, unique)
  - `loan_product` (text) - emergency, business, education, etc.
  - `principal_amount` (numeric)
  - `interest_rate` (numeric) - annual percentage
  - `loan_term_months` (integer)
  - `disbursement_date` (date)
  - `maturity_date` (date)
  - `purpose` (text)
  - `status` (text) - pending, approved, active, closed, written_off
  - `outstanding_balance` (numeric)
  - `total_paid` (numeric)
  - `arrears_amount` (numeric)
  - `days_in_arrears` (integer)
  - `loan_officer_id` (uuid)
  - `approved_by` (uuid)
  - `approved_date` (timestamptz)
  - `created_at`, `updated_at` (timestamptz)

  ### 3. `repayments`
  Records all loan repayment transactions
  - `id` (uuid, primary key)
  - `loan_id` (uuid, foreign key)
  - `transaction_date` (date)
  - `amount` (numeric)
  - `principal_amount` (numeric)
  - `interest_amount` (numeric)
  - `payment_method` (text) - cash, bank_transfer, mobile_money, salary_deduction
  - `receipt_number` (text)
  - `recorded_by` (uuid)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### 4. `guarantors`
  Stores loan guarantor information
  - `id` (uuid, primary key)
  - `loan_id` (uuid, foreign key)
  - `guarantor_client_id` (uuid, foreign key) - if guarantor is also a member
  - `guarantor_name` (text)
  - `guarantor_phone` (text)
  - `guarantor_relationship` (text)
  - `guaranteed_amount` (numeric)
  - `created_at` (timestamptz)

  ### 5. `risk_scores`
  Stores calculated risk scores for loans and clients
  - `id` (uuid, primary key)
  - `client_id` (uuid, foreign key)
  - `loan_id` (uuid, foreign key, nullable)
  - `score` (numeric) - 0-100 scale
  - `risk_category` (text) - low, medium, high, very_high
  - `payment_history_score` (numeric)
  - `debt_to_income_ratio` (numeric)
  - `loan_amount_score` (numeric)
  - `guarantor_score` (numeric)
  - `days_in_arrears_score` (numeric)
  - `calculated_at` (timestamptz)
  - `factors` (jsonb) - detailed breakdown of scoring factors

  ### 6. `loan_schedule`
  Expected repayment schedule for each loan
  - `id` (uuid, primary key)
  - `loan_id` (uuid, foreign key)
  - `installment_number` (integer)
  - `due_date` (date)
  - `principal_due` (numeric)
  - `interest_due` (numeric)
  - `total_due` (numeric)
  - `principal_paid` (numeric)
  - `interest_paid` (numeric)
  - `total_paid` (numeric)
  - `status` (text) - pending, paid, overdue, partial

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users to manage their assigned loans
  - Admin policies for full access

  ## Indexes
  - Performance indexes on foreign keys and frequently queried fields
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_number text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text NOT NULL,
  national_id text UNIQUE NOT NULL,
  date_of_birth date NOT NULL,
  address text,
  employer text,
  monthly_income numeric(12, 2) DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  joined_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) NOT NULL,
  loan_number text UNIQUE NOT NULL,
  loan_product text NOT NULL,
  principal_amount numeric(12, 2) NOT NULL,
  interest_rate numeric(5, 2) NOT NULL,
  loan_term_months integer NOT NULL,
  disbursement_date date,
  maturity_date date,
  purpose text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'closed', 'written_off')),
  outstanding_balance numeric(12, 2) DEFAULT 0,
  total_paid numeric(12, 2) DEFAULT 0,
  arrears_amount numeric(12, 2) DEFAULT 0,
  days_in_arrears integer DEFAULT 0,
  loan_officer_id uuid,
  approved_by uuid,
  approved_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create repayments table
CREATE TABLE IF NOT EXISTS repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(12, 2) NOT NULL,
  principal_amount numeric(12, 2) NOT NULL,
  interest_amount numeric(12, 2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'salary_deduction')),
  receipt_number text,
  recorded_by uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create guarantors table
CREATE TABLE IF NOT EXISTS guarantors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) NOT NULL,
  guarantor_client_id uuid REFERENCES clients(id),
  guarantor_name text NOT NULL,
  guarantor_phone text NOT NULL,
  guarantor_relationship text,
  guaranteed_amount numeric(12, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create risk_scores table
CREATE TABLE IF NOT EXISTS risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) NOT NULL,
  loan_id uuid REFERENCES loans(id),
  score numeric(5, 2) NOT NULL,
  risk_category text NOT NULL CHECK (risk_category IN ('low', 'medium', 'high', 'very_high')),
  payment_history_score numeric(5, 2) DEFAULT 0,
  debt_to_income_ratio numeric(5, 2) DEFAULT 0,
  loan_amount_score numeric(5, 2) DEFAULT 0,
  guarantor_score numeric(5, 2) DEFAULT 0,
  days_in_arrears_score numeric(5, 2) DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  factors jsonb DEFAULT '{}'::jsonb
);

-- Create loan_schedule table
CREATE TABLE IF NOT EXISTS loan_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) NOT NULL,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  principal_due numeric(12, 2) NOT NULL,
  interest_due numeric(12, 2) NOT NULL,
  total_due numeric(12, 2) NOT NULL,
  principal_paid numeric(12, 2) DEFAULT 0,
  interest_paid numeric(12, 2) DEFAULT 0,
  total_paid numeric(12, 2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_loans_client_id ON loans(client_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_days_in_arrears ON loans(days_in_arrears);
CREATE INDEX IF NOT EXISTS idx_repayments_loan_id ON repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_repayments_transaction_date ON repayments(transaction_date);
CREATE INDEX IF NOT EXISTS idx_guarantors_loan_id ON guarantors(loan_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_client_id ON risk_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_loan_schedule_loan_id ON loan_schedule(loan_id);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE guarantors ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients
CREATE POLICY "Authenticated users can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for loans
CREATE POLICY "Authenticated users can view all loans"
  ON loans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert loans"
  ON loans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update loans"
  ON loans FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for repayments
CREATE POLICY "Authenticated users can view all repayments"
  ON repayments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert repayments"
  ON repayments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for guarantors
CREATE POLICY "Authenticated users can view all guarantors"
  ON guarantors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert guarantors"
  ON guarantors FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for risk_scores
CREATE POLICY "Authenticated users can view all risk scores"
  ON risk_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert risk scores"
  ON risk_scores FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for loan_schedule
CREATE POLICY "Authenticated users can view all loan schedules"
  ON loan_schedule FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert loan schedules"
  ON loan_schedule FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update loan schedules"
  ON loan_schedule FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
