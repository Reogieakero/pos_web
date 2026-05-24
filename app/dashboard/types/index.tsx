export interface Transaction {
  id: string;
  name: string;
  icon: React.ReactNode;
  cardEnd: string;
  cardColor: string;
  amount: number;
  isPositive?: boolean;
  date: string;
}

export interface SpendingCategory {
  name: string;
  icon: React.ReactNode;
}