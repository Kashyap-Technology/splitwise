export interface SettlementCreate {
  to_user_id: number
  amount: number
}

export interface SettlementCreateResponse {
  id: number
  from_user: number
  to_user: number
  amount: string
}