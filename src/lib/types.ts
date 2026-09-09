export interface AccountType {
  id: string;
  name: string;
  required: number;
  assigned: number;
  open: boolean;
  createdAt: string;
}

export interface PublicAccountType {
  id: string;
  name: string;
  remaining: number;
}

export interface Submission {
  id: string;
  discordUsername: string;
  accountTypeId: string;
  accountTypeName: string;
  quantity: number;
  timestamp: string;
}
