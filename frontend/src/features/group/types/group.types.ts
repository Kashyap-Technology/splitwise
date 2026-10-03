// ==========================================
// Base & Creation Interfaces
// ==========================================

export interface GroupCreate {
  name: string;
  description: string;
  group_image: File;
}

export interface GroupUser {
  id: number;
  email: string;
  name: string;
}

export interface GroupCreateResponse {
  id: number;
  name: string;
  description: string;
  group_imagekey: string;
}

export interface GroupListResponse {
  id: number;
  name: string;
  description?: string;
  // group_imagekey?: string | null
  group_image_url?: string | null;
  created_by: {
    id: number;
    email: string;
    name: string;
  };
}

export interface UserGroupResponse {
  id: number;
  name: string;
  description?: string;
  group_image_url?: string | null;
  member_count?: number;
  total_expenses?: number;
  your_balance?: number;
  balance_status?: 'credit' | 'settled' | 'debt';
}

export interface GroupMemberResponse {
  id: number;
  name: string;
  email: string;
  profile_image_url?: string | null;
  role: string;
}

export interface GroupBalanceResponse {
  success: boolean;
  message: string;
  data: GroupBalances;
}

export type GroupBalances = Record<string, number>;


// Group Detail Response Interfaces


export interface GroupDetailResponse {
  success: boolean;
  message: string;
  data: GroupDetailData;
}

export interface GroupDetailData {
  id: number;
  name: string;
  description: string;
  group_imagekey: string;
  group_image_url: string;
  created_at: string;
  members: GroupMemberResponse[];
  expenses: GroupExpense[];
  settlements: GroupSettlementRecord[];
  settlement_suggestions: GroupSettlementSuggestion[];
  balances: GroupDetailBalance[];
  summary: GroupDetailSummary;
}

export interface GroupExpenseUser {
  id: number;
  name: string;
  email: string;
  profile_image_url: string;
}

export interface GroupExpensePayer {
  user: GroupExpenseUser;
  amount_paid: string;
}

export interface GroupExpenseParticipant {
  user: GroupExpenseUser;
  amount_to_pay: string;
}

export interface GroupExpense {
  id: number;
  title: string;
  amount: string;
  split_type: string;
  category_id: number;
  category_name: string;
  created_at: string;
  payers: GroupExpensePayer[];
  participants: GroupExpenseParticipant[];
}

export interface GroupSettlementSuggestion {
  // Ids alongside names so a suggestion can be turned into a real settlement:
  // names alone cannot be submitted, and cannot be matched to the viewer.
  from_user_id: number;
  to_user_id: number;
  from_user: string;
  to_user: string;
  amount: string;
}

export interface GroupSettlementRecordUser {
  id: number;
  name: string;
  email: string;
  profile_image_url?: string | null;
}

export interface GroupSettlementRecord {
  id: number;
  from_user: GroupSettlementRecordUser;
  to_user: GroupSettlementRecordUser;
  amount: string;
  created_at: string;
}

export interface GroupDetailBalance {
  user_id: number;
  user_name: string;
  balance: string;
}

export interface GroupDetailSummary {
  member_count: number;
  expense_count: number;
  total_expenses: number;
  total_paid: number;
  total_owed: number;
  total_settled: number;
  your_balance: number;
}

export interface GroupSettlementResponse{
    from_user_id:number
    to_user_id:number
    from_user:string
    to_user:string;
    amount:string
}

export interface UserSettlementUser {
  id: number
  name: string
  email: string
  profile_image_url?: string | null
}

export interface UserSettlementGroup {
  id: number
  name: string
}

export interface UserSettlement {
  id: number | null
  group: UserSettlementGroup
  from_user: UserSettlementUser
  to_user: UserSettlementUser
  amount: string
  direction: 'paid' | 'received'
  status: 'recorded' | 'suggested'
  created_at: string | null
}

export interface UserSettlementResponse {
  current_settlements: UserSettlement[]
  settlement_history: UserSettlement[]
  summary: {
    current_settlement_count: number
    history_count: number
    total_to_pay: string
    total_to_receive: string
  }
}