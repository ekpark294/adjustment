export const money = new Intl.NumberFormat("ko-KR");

export const parseCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

export const isIndividualQuantityItem = (item) =>
  item.quantityMode === "individual";

export const getItemRound = (item) => {
  const round = Number(item?.round);
  return Number.isInteger(round) && round >= 1 ? round : 1;
};

export const getMaxSelectedRound = (items) =>
  items.reduce((max, item) => Math.max(max, getItemRound(item)), 1);

/** 1차·2차는 항상 노출하고, 마지막 차수가 선택되면 다음 차수를 하나 더 열어준다. */
export const getRoundOptions = (items) =>
  Array.from(
    { length: Math.max(2, getMaxSelectedRound(items) + 1) },
    (_, index) => index + 1,
  );

export const getUsedRounds = (items) =>
  [...new Set(items.map((item) => getItemRound(item)))].sort((a, b) => a - b);

const sortByParticipantOrder = (entries, participantOrder = []) => {
  if (!participantOrder.length) return entries;

  const orderMap = new Map(
    participantOrder.map((person, index) => [person, index]),
  );

  return entries.slice().sort(([personA], [personB]) => {
    const indexA = orderMap.has(personA)
      ? orderMap.get(personA)
      : Number.MAX_SAFE_INTEGER;
    const indexB = orderMap.has(personB)
      ? orderMap.get(personB)
      : Number.MAX_SAFE_INTEGER;

    return indexA - indexB;
  });
};

export const getItemParticipantQuantities = (item, participantOrder = []) => {
  if (!isIndividualQuantityItem(item)) {
    return Object.fromEntries(
      sortByParticipantOrder(
        (item.members || []).map((person) => [person, 1]),
        participantOrder,
      ),
    );
  }

  return Object.fromEntries(
    sortByParticipantOrder(
      (item.members || []).map((person) => [
        person,
        parseCount(item.memberQuantities?.[person]) || 1,
      ]),
      participantOrder,
    ),
  );
};

export const getItemTotalQuantity = (item) => {
  if (!isIndividualQuantityItem(item)) return parseCount(item.quantity);

  return Object.values(getItemParticipantQuantities(item)).reduce(
    (sum, quantity) => sum + parseCount(quantity),
    0,
  );
};

export const getItemParticipants = (item, participantOrder = []) =>
  Object.keys(getItemParticipantQuantities(item, participantOrder));

export const getItemNoteParts = (item, participantOrder = []) => {
  const participantQuantities = getItemParticipantQuantities(
    item,
    participantOrder,
  );

  return Object.entries(participantQuantities).map(([person, quantity]) => ({
    person,
    quantity,
  }));
};

export const getItemNote = (item, participantOrder = []) => {
  const noteParts = getItemNoteParts(item, participantOrder);

  if (!noteParts.length) return "선택된 사람 없음";
  if (!isIndividualQuantityItem(item)) {
    return noteParts.map(({ person }) => person).join(", ");
  }

  return noteParts
    .map(({ person, quantity }) => `${person} ${parseCount(quantity)}개`)
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
