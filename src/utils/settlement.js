export const money = new Intl.NumberFormat("ko-KR");

export const parseCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

export const isIndividualQuantityItem = (item) =>
  item.quantityMode === "individual";

export const getItemParticipantQuantities = (item) => {
  if (!isIndividualQuantityItem(item)) {
    return Object.fromEntries((item.members || []).map((person) => [person, 1]));
  }

  return Object.fromEntries(
    (item.members || []).map((person) => [
      person,
      parseCount(item.memberQuantities?.[person]) || 1,
    ]),
  );
};

export const getItemTotalQuantity = (item) => {
  if (!isIndividualQuantityItem(item)) return parseCount(item.quantity);

  return Object.values(getItemParticipantQuantities(item)).reduce(
    (sum, quantity) => sum + parseCount(quantity),
    0,
  );
};

export const getItemParticipants = (item) =>
  Object.keys(getItemParticipantQuantities(item));

export const getItemNote = (item) => {
  const participantQuantities = getItemParticipantQuantities(item);
  const people = Object.keys(participantQuantities);

  if (!people.length) return "선택된 사람 없음";
  if (!isIndividualQuantityItem(item)) return people.join(", ");

  return people
    .map((person) => `${person} ${parseCount(participantQuantities[person])}개`)
    .join(", ");
};

export const getItemSplitAmount = (item) => {
  const participants = getItemParticipants(item);
  if (!participants.length) return 0;

  if (isIndividualQuantityItem(item)) {
    return Number(item.price || 0) * getItemTotalQuantity(item);
  }

  return (Number(item.price) * getItemTotalQuantity(item)) / participants.length;
};

export const calculateTotals = (people, items) => {
  const totals = Object.fromEntries(people.map((person) => [person, 0]));

  items.forEach((item) => {
    if (isIndividualQuantityItem(item)) {
      Object.entries(getItemParticipantQuantities(item)).forEach(
        ([person, quantity]) => {
          if (person in totals) totals[person] += Number(item.price || 0) * parseCount(quantity);
        },
      );
      return;
    }

    const participants = getItemParticipants(item);
    if (!participants.length) return;

    const share =
      (Number(item.price) * getItemTotalQuantity(item)) / participants.length;
    participants.forEach((person) => {
      if (person in totals) totals[person] += share;
    });
  });

  return totals;
};

export const calculateGrandTotal = (items) =>
  items.reduce(
    (sum, item) => sum + Number(item.price || 0) * getItemTotalQuantity(item),
    0,
  );
