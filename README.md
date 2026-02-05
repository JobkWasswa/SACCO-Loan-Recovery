# SACCO Loan Management System

A comprehensive loan recovery and risk scoring platform designed for SACCO (Savings and Credit Cooperative Organizations) following Mifos standards. This system provides end-to-end loan management, member tracking, and automated risk assessment.

## Features

### Dashboard & Analytics
- Real-time portfolio overview with key metrics
- Active loans tracking and performance indicators
- Arrears monitoring and collection rate analysis
- Portfolio health indicators with visual progress bars
- 30-day repayment trending

### Client Management
- Complete member registration and profile management
- Employment and income tracking
- Member status management (active, inactive, suspended)
- Quick search and filtering capabilities
- Unique member identification system

### Loan Management
- Multiple loan products (Emergency, Business, Education, Agriculture, Personal)
- Automated loan scheduling
- Loan term flexibility (1-60+ months)
- Customizable interest rates
- Loan status tracking (pending, approved, active, closed, written_off)
- Outstanding balance and payment tracking

### Risk Scoring & Assessment
- Automated risk calculation using Mifos-compliant algorithms
- Risk categories: Low, Medium, High, Very High
- Multi-factor scoring system:
  - Payment history (30% weight)
  - Debt-to-income ratio (25%)
  - Loan amount relative to income (20%)
  - Guarantor coverage (15%)
  - Days in arrears (10%)
- Risk scores stored and tracked over time
- Detailed scoring factor breakdowns

### Loan Recovery
- Dedicated arrears management dashboard
- Color-coded severity levels (Critical, Severe, High, Moderate)
- Member contact information (phone, email)
- Payment history timeline
- Quick payment recording
- Multiple payment methods support (Cash, Bank Transfer, Mobile Money, Salary Deduction)
- Receipt tracking and payment notes

### Repayment Management
- Payment recording and tracking
- Automatic principal/interest calculation
- Multiple payment method support
- Receipt generation
- Transaction date and notes
- Real-time balance updates

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React Icons
- **Database**: Supabase PostgreSQL
- **Backend**: Supabase Edge Functions
- **Build Tool**: Vite
- **Package Manager**: npm

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/sacco-loan-management.git
   cd sacco-loan-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the project root:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Database Schema

### Core Tables

- **clients** - SACCO member information and profiles
- **loans** - Loan applications and active loans
- **repayments** - Payment transaction history
- **guarantors** - Loan guarantor information
- **risk_scores** - Calculated risk assessments
- **loan_schedule** - Expected repayment schedules

### Key Features
- Row Level Security (RLS) policies for data protection
- Automatic timestamp tracking (created_at, updated_at)
- Foreign key relationships for data integrity
- Performance indexes on frequently queried fields
- JSONB support for flexible risk factor storage

## API Endpoints

### Risk Scoring Edge Function
- **Endpoint**: `/functions/v1/calculate-risk-score`
- **Method**: POST
- **Auth**: JWT required
- **Payload**:
  ```json
  {
    "clientId": "uuid",
    "loanId": "uuid" (optional)
  }
  ```
- **Response**:
  ```json
  {
    "score": 75.5,
    "riskCategory": "medium",
    "paymentHistoryScore": 80,
    "debtToIncomeRatio": 35.2,
    "loanAmountScore": 75,
    "guarantorScore": 100,
    "daysInArrearsScore": 90,
    "factors": { ... }
  }
  ```

## Usage Guide

### Adding a New Client
1. Navigate to **Clients** section
2. Click **Add Client** button
3. Fill in member information:
   - Personal details (name, DOB, national ID)
   - Contact information (phone, email)
   - Employment details (employer, monthly income)
   - Address
4. Click **Add Client** to save

### Creating a Loan
1. Navigate to **Loans** section
2. Click **New Loan** button
3. Select the client from the dropdown
4. Choose loan product type
5. Enter loan details:
   - Principal amount
   - Interest rate (annual %)
   - Loan term in months
   - Loan purpose
6. Click **Create Loan**
   - System automatically calculates maturity date
   - Risk assessment runs automatically
   - Loan scheduling is generated

### Recording Payments
1. Navigate to **Recovery** section
2. Select a loan in arrears
3. Click **Record Payment**
4. Enter payment details:
   - Payment date
   - Payment amount
   - Payment method
   - Receipt number (optional)
   - Notes
5. Click **Record Payment**
   - Outstanding balance updates automatically
   - Arrears calculation updates
   - Loan status may change to "closed" if fully paid

### Monitoring Portfolio
1. View **Dashboard** for real-time metrics:
   - Total clients and active loans
   - Outstanding balance and arrears amount
   - Collection and arrears rates
   - Recent repayment activity

## Security

- All tables have Row Level Security enabled
- Authentication required for all operations
- Secure Supabase authentication integration
- No sensitive data exposed in client-side code
- Environment variables for configuration

## Project Structure

```
src/
├── components/
│   ├── Dashboard.tsx      # Portfolio overview and metrics
│   ├── Clients.tsx        # Client management interface
│   ├── Loans.tsx          # Loan management and creation
│   └── Recovery.tsx       # Arrears tracking and recovery
├── lib/
│   └── supabase.ts        # Supabase client and API calls
├── App.tsx                # Main application shell
├── types.ts               # TypeScript type definitions
├── main.tsx               # React entry point
├── index.css              # Global styles
└── vite-env.d.ts          # Vite environment types

supabase/
├── functions/
│   └── calculate-risk-score/
│       └── index.ts       # Risk scoring algorithm
└── migrations/
    └── [migration-files]  # Database schema migrations
```

## Key Metrics

The dashboard displays:
- **Total Clients**: Number of active SACCO members
- **Active Loans**: Number of loans in active status
- **Total Disbursed**: Sum of all principal amounts
- **Total Outstanding**: Current loan portfolio balance
- **Loans in Arrears**: Count of overdue loans
- **Total Arrears**: Sum of all overdue amounts
- **Arrears Rate**: Percentage of active loans in arrears
- **Collection Rate**: Percentage of disbursed amount collected

## Risk Assessment Methodology

The system uses a weighted multi-factor approach:

1. **Payment History (30%)** - Analyzes on-time payment performance
2. **Debt-to-Income Ratio (25%)** - Evaluates loan affordability
3. **Loan Amount Score (20%)** - Assesses loan size relative to income
4. **Guarantor Coverage (15%)** - Scores based on guarantor count and quality
5. **Days in Arrears (10%)** - Penalizes existing payment delays

Risk Categories:
- **Low**: Score 75-100 (Minimal default risk)
- **Medium**: Score 60-74 (Manageable risk)
- **High**: Score 40-59 (Elevated risk)
- **Very High**: Score 0-39 (Critical risk)

## Mifos Compliance

This system follows Mifos best practices for:
- Client lifecycle management
- Loan product definitions
- Repayment scheduling
- Portfolio at risk (PAR) calculations
- Risk-based pricing
- Member relationship management

## Support & Contribution

For issues, feature requests, or contributions:
1. Create an issue on GitHub
2. Fork the repository
3. Create a feature branch
4. Submit a pull request with clear descriptions

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Roadmap

Planned features:
- Member savings accounts integration
- Automated SMS/Email notifications
- Advanced analytics and reporting
- Member portal for self-service
- Multi-currency support
- Bulk loan processing
- Integration with payment gateways
- Mobile app version

## Support

For support, contact the development team or create an issue in the repository.

---

**Version**: 1.0.0
**Last Updated**: February 2026
**Status**: Production Ready
