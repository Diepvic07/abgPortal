import { createServerSupabaseClient } from './supabase/server';
import { FinancialTransaction, FinancialSettings, MonthlyPnLRow, ExpenseCategory } from '@/types';
import { generateId, formatDate } from '@/lib/utils';

const ALL_EXPENSE_CATEGORIES: ExpenseCategory[] = ['hosting', 'cloud_server', 'ai', 'event', 'operational', 'other'];

function emptyExpenseMap(): Record<ExpenseCategory, number> {
  return { hosting: 0, cloud_server: 0, ai: 0, event: 0, operational: 0, other: 0 };
}

// ==================== Settings ====================

export async function getFinancialSettings(): Promise<FinancialSettings> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('financial_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (error) {
    console.error('Error fetching financial settings:', error);
  }

  if (row) {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      opening_balance_vnd: r.opening_balance_vnd as number,
      opening_balance_date: r.opening_balance_date as string,
      updated_by_admin_id: (r.updated_by_admin_id as string) || undefined,
      updated_at: r.updated_at as string,
    };
  }

  // Create default if doesn't exist
  const now = formatDate();
  const { data: newRow } = await supabase
    .from('financial_settings')
    .upsert({ id: 'default', opening_balance_vnd: 0, opening_balance_date: '2026-01-01', updated_at: now })
    .select()
    .single();

  const nr = (newRow || {}) as Record<string, unknown>;
  return {
    id: 'default',
    opening_balance_vnd: (nr.opening_balance_vnd as number) || 0,
    opening_balance_date: (nr.opening_balance_date as string) || '2026-01-01',
    updated_at: now,
  };
}

export async function updateFinancialSettings(data: {
  opening_balance_vnd: number;
  opening_balance_date: string;
  admin_id: string;
}): Promise<FinancialSettings> {
  const supabase = createServerSupabaseClient();
  const now = formatDate();

  const { data: row, error } = await supabase
    .from('financial_settings')
    .upsert({
      id: 'default',
      opening_balance_vnd: data.opening_balance_vnd,
      opening_balance_date: data.opening_balance_date,
      updated_by_admin_id: data.admin_id,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating financial settings:', error);
    throw new Error('Failed to update settings');
  }

  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    opening_balance_vnd: r.opening_balance_vnd as number,
    opening_balance_date: r.opening_balance_date as string,
    updated_by_admin_id: (r.updated_by_admin_id as string) || undefined,
    updated_at: r.updated_at as string,
  };
}

// ==================== Transactions ====================

export async function getFinancialTransactions(year?: number): Promise<FinancialTransaction[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('financial_transactions')
    .select('*')
    .order('transaction_date', { ascending: false });

  if (year) {
    query = query.gte('transaction_date', `${year}-01-01`).lte('transaction_date', `${year}-12-31`);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('Error fetching transactions:', error);
    throw new Error('Failed to fetch transactions');
  }

  return (rows || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    type: 'expense' as const,
    category: r.category as ExpenseCategory,
    amount_vnd: r.amount_vnd as number,
    description: r.description as string,
    transaction_date: r.transaction_date as string,
    event_id: (r.event_id as string) || undefined,
    created_by_admin_id: r.created_by_admin_id as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}

export async function createFinancialTransaction(data: {
  category: ExpenseCategory;
  amount_vnd: number;
  description: string;
  transaction_date: string;
  event_id?: string;
  created_by_admin_id: string;
}): Promise<FinancialTransaction> {
  const supabase = createServerSupabaseClient();
  const id = generateId();
  const now = formatDate();

  const { data: row, error } = await supabase
    .from('financial_transactions')
    .insert({
      id,
      type: 'expense',
      category: data.category,
      amount_vnd: data.amount_vnd,
      description: data.description,
      transaction_date: data.transaction_date,
      event_id: data.event_id || null,
      created_by_admin_id: data.created_by_admin_id,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating transaction:', error);
    throw new Error('Failed to create transaction');
  }

  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    type: 'expense' as const,
    category: r.category as ExpenseCategory,
    amount_vnd: r.amount_vnd as number,
    description: r.description as string,
    transaction_date: r.transaction_date as string,
    event_id: (r.event_id as string) || undefined,
    created_by_admin_id: r.created_by_admin_id as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export async function deleteFinancialTransaction(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from('financial_transactions').delete().eq('id', id);

  if (error) {
    console.error('Error deleting transaction:', error);
    throw new Error('Failed to delete transaction');
  }
}

// ==================== PnL Aggregation ====================

export async function getMonthlyPnL(year: number): Promise<{ months: MonthlyPnLRow[]; settings: FinancialSettings }> {
  const supabase = createServerSupabaseClient();
  const settings = await getFinancialSettings();

  // Fetch membership revenue (payment_records)
  const { data: membershipRows } = await supabase
    .from('payment_records')
    .select('amount_vnd, created_at')
    .gte('created_at', `${year}-01-01`)
    .lte('created_at', `${year}-12-31T23:59:59Z`);

  // Fetch event revenue (confirmed event_payments)
  const { data: eventPaymentRows } = await supabase
    .from('event_payments')
    .select('amount_vnd, created_at')
    .eq('status', 'confirmed')
    .gte('created_at', `${year}-01-01`)
    .lte('created_at', `${year}-12-31T23:59:59Z`);

  // Fetch expenses
  const { data: expenseRows } = await supabase
    .from('financial_transactions')
    .select('amount_vnd, category, transaction_date')
    .gte('transaction_date', `${year}-01-01`)
    .lte('transaction_date', `${year}-12-31`);

  // Build 12-month structure
  const months: MonthlyPnLRow[] = [];
  let ytdRevenue = 0;
  let ytdExpenses = 0;
  let runningBalance = settings.opening_balance_vnd;

  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, '0')}`;

    // Membership revenue for this month
    const membershipRevenue = (membershipRows || [])
      .filter((r: Record<string, unknown>) => (r.created_at as string).startsWith(monthStr))
      .reduce((sum: number, r: Record<string, unknown>) => sum + (r.amount_vnd as number), 0);

    // Event revenue for this month
    const eventRevenue = (eventPaymentRows || [])
      .filter((r: Record<string, unknown>) => (r.created_at as string).startsWith(monthStr))
      .reduce((sum: number, r: Record<string, unknown>) => sum + (r.amount_vnd as number), 0);

    const totalRevenue = membershipRevenue + eventRevenue;

    // Expenses by category for this month
    const expensesByCategory = emptyExpenseMap();
    let totalExpenses = 0;
    for (const row of (expenseRows || [])) {
      const r = row as Record<string, unknown>;
      if ((r.transaction_date as string).startsWith(monthStr)) {
        const cat = r.category as ExpenseCategory;
        const amt = r.amount_vnd as number;
        if (ALL_EXPENSE_CATEGORIES.includes(cat)) {
          expensesByCategory[cat] += amt;
        }
        totalExpenses += amt;
      }
    }

    const net = totalRevenue - totalExpenses;
    ytdRevenue += totalRevenue;
    ytdExpenses += totalExpenses;
    runningBalance += net;

    months.push({
      month: monthStr,
      membership_revenue: membershipRevenue,
      event_revenue: eventRevenue,
      total_revenue: totalRevenue,
      expenses_by_category: expensesByCategory,
      total_expenses: totalExpenses,
      net,
      ytd_revenue: ytdRevenue,
      ytd_expenses: ytdExpenses,
      ytd_net: ytdRevenue - ytdExpenses,
      running_balance: runningBalance,
    });
  }

  return { months, settings };
}
