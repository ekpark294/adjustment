export const money = new Intl.NumberFormat("ko-KR");

export const calculateTotals = (people, items) => {
  const totals = Object.fromEntries(people.map((person) => [person, 0]));

  items.forEach((item) => {
    if (!item.members.length) return;
    const share =
      (Number(item.price) * Number(item.quantity)) / item.members.length;
    item.members.forEach((person) => {
      totals[person] += share;
    });
  });

  return totals;
};

export const calculateGrandTotal = (items) =>
  items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );
