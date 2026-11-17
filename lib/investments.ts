// Fictional sample data for the public demo. Prices are illustrative.
export type Op = {
  id: number;
  date: string;
  asset: string;
  type: string;
  quantity: number;
  price: number;
  total: number;
  fee: number;
};
export const operations: Op[] = [
  {
    id: 1,
    date: "2026-01-10",
    asset: "VanEck",
    type: "buy",
    quantity: 4,
    price: 20,
    total: 81,
    fee: 1,
  },
  {
    id: 2,
    date: "2026-04-10",
    asset: "VanEck",
    type: "sell",
    quantity: 4,
    price: 22,
    total: 87,
    fee: 1,
  },
  {
    id: 3,
    date: "2026-05-12",
    asset: "Verallia",
    type: "buy",
    quantity: 10,
    price: 15,
    total: 151,
    fee: 1,
  },
  {
    id: 4,
    date: "2026-06-15",
    asset: "Eli Lilly",
    type: "buy",
    quantity: 1,
    price: 100,
    total: 101,
    fee: 1,
  },
  {
    id: 5,
    date: "2026-07-15",
    asset: "Eli Lilly",
    type: "sell",
    quantity: 1,
    price: 105,
    total: 104,
    fee: 1,
  },
];
export const basePrices: Record<string, number> = {
  VanEck: 23,
  Verallia: 17,
  "Eli Lilly": 110,
};
