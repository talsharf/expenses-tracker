export const expenseData = Array.from({ length: 100 }, (_, index) => {
  const categories = [
    'Groceries', 'Entertainment', 'Traveling', 'Utilities', 'Rent',
    'Dining Out', 'Healthcare', 'Education', 'Shopping', 'Transportation'
  ];
  const category = categories[Math.floor(Math.random() * categories.length)];

  // Logic: Ensure some categories have smaller amounts
  let min = 10;
  let max = 500;

  if (['Dining Out', 'Entertainment', 'Shopping'].includes(category)) {
    max = 150; // Smaller amounts for frequent expenses
  } else if (['Rent', 'Traveling'].includes(category)) {
    min = 800;
    max = 2500; // Larger amounts for major expenses
  } else if (['Utilities', 'Healthcare', 'Education', 'Transportation', 'Groceries'].includes(category)) {
    min = 50;
    max = 400;
  }

  const amount = parseFloat((Math.random() * (max - min) + min).toFixed(2));

  // Random date between Jan 1, 2024 and Dec 30, 2025
  const start = new Date('2024-01-01').getTime();
  const end = new Date('2025-12-30').getTime();
  const dateObj = new Date(start + Math.random() * (end - start));
  const date = dateObj.toISOString().split('T')[0];

  return {
    id: index + 1,
    date,
    category,
    amount
  };
});
