export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  SNIPER = 'SNIPER'
}

export enum OrderStatus {
  PENDING = 'pending',
  ROUTING = 'routing',
  BUILDING = 'building',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum DexName {
  RAYDIUM = 'RAYDIUM',
  METEORA = 'METEORA'
}
