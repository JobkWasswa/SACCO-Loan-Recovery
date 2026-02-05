import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RiskScoreRequest {
  clientId: string;
  loanId?: string;
}

interface RiskScoreResult {
  score: number;
  riskCategory: string;
  paymentHistoryScore: number;
  debtToIncomeRatio: number;
  loanAmountScore: number;
  guarantorScore: number;
  daysInArrearsScore: number;
  factors: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { clientId, loanId }: RiskScoreRequest = await req.json();

    const client = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .maybeSingle();

    if (!client.data) {
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const loans = await supabase
      .from("loans")
      .select("*")
      .eq("client_id", clientId);

    const specificLoan = loanId
      ? loans.data?.find((l) => l.id === loanId)
      : null;

    const repayments = await supabase
      .from("repayments")
      .select("*")
      .in(
        "loan_id",
        loans.data?.map((l) => l.id) || []
      )
      .order("transaction_date", { ascending: false });

    const guarantors = loanId
      ? await supabase.from("guarantors").select("*").eq("loan_id", loanId)
      : null;

    let paymentHistoryScore = 100;
    const totalLoans = loans.data?.length || 0;
    const activeLoans = loans.data?.filter((l) => l.status === "active") || [];
    const closedLoans = loans.data?.filter((l) => l.status === "closed") || [];

    if (repayments.data && repayments.data.length > 0) {
      const latePayments = activeLoans.reduce((sum, loan) => {
        return sum + (loan.days_in_arrears > 0 ? 1 : 0);
      }, 0);

      const totalRepayments = repayments.data.length;
      const latePaymentRatio = totalRepayments > 0 ? latePayments / totalRepayments : 0;

      paymentHistoryScore = Math.max(0, 100 - latePaymentRatio * 100);
    }

    const totalOutstanding = activeLoans.reduce(
      (sum, loan) => sum + parseFloat(loan.outstanding_balance || "0"),
      0
    );
    const monthlyIncome = parseFloat(client.data.monthly_income || "0");
    const debtToIncomeRatio = monthlyIncome > 0 ? (totalOutstanding / monthlyIncome) * 100 : 100;

    const debtToIncomeScore = Math.max(0, 100 - debtToIncomeRatio);

    let loanAmountScore = 100;
    if (specificLoan) {
      const loanAmount = parseFloat(specificLoan.principal_amount || "0");
      const incomeMultiple = monthlyIncome > 0 ? loanAmount / (monthlyIncome * 12) : 10;

      if (incomeMultiple > 3) loanAmountScore = 20;
      else if (incomeMultiple > 2) loanAmountScore = 40;
      else if (incomeMultiple > 1) loanAmountScore = 60;
      else if (incomeMultiple > 0.5) loanAmountScore = 80;
    }

    let guarantorScore = 0;
    if (guarantors?.data) {
      const guarantorCount = guarantors.data.length;
      if (guarantorCount >= 3) guarantorScore = 100;
      else if (guarantorCount === 2) guarantorScore = 70;
      else if (guarantorCount === 1) guarantorScore = 40;
    }

    let daysInArrearsScore = 100;
    if (specificLoan) {
      const daysInArrears = specificLoan.days_in_arrears || 0;
      if (daysInArrears > 90) daysInArrearsScore = 0;
      else if (daysInArrears > 60) daysInArrearsScore = 20;
      else if (daysInArrears > 30) daysInArrearsScore = 40;
      else if (daysInArrears > 7) daysInArrearsScore = 60;
      else if (daysInArrears > 0) daysInArrearsScore = 80;
    }

    const weights = {
      paymentHistory: 0.30,
      debtToIncome: 0.25,
      loanAmount: 0.20,
      guarantor: 0.15,
      arrears: 0.10,
    };

    const finalScore =
      paymentHistoryScore * weights.paymentHistory +
      debtToIncomeScore * weights.debtToIncome +
      loanAmountScore * weights.loanAmount +
      guarantorScore * weights.guarantor +
      daysInArrearsScore * weights.arrears;

    let riskCategory = "low";
    if (finalScore < 40) riskCategory = "very_high";
    else if (finalScore < 60) riskCategory = "high";
    else if (finalScore < 75) riskCategory = "medium";

    const result: RiskScoreResult = {
      score: Math.round(finalScore * 100) / 100,
      riskCategory,
      paymentHistoryScore: Math.round(paymentHistoryScore * 100) / 100,
      debtToIncomeRatio: Math.round(debtToIncomeRatio * 100) / 100,
      loanAmountScore: Math.round(loanAmountScore * 100) / 100,
      guarantorScore: Math.round(guarantorScore * 100) / 100,
      daysInArrearsScore: Math.round(daysInArrearsScore * 100) / 100,
      factors: {
        totalLoans,
        activeLoans: activeLoans.length,
        closedLoans: closedLoans.length,
        totalOutstanding,
        monthlyIncome,
        guarantorCount: guarantors?.data?.length || 0,
      },
    };

    await supabase.from("risk_scores").insert({
      client_id: clientId,
      loan_id: loanId || null,
      score: result.score,
      risk_category: result.riskCategory,
      payment_history_score: result.paymentHistoryScore,
      debt_to_income_ratio: result.debtToIncomeRatio,
      loan_amount_score: result.loanAmountScore,
      guarantor_score: result.guarantorScore,
      days_in_arrears_score: result.daysInArrearsScore,
      calculated_at: new Date().toISOString(),
      factors: result.factors,
    });

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
