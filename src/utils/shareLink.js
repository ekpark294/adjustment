import { getItemRound, isIndividualQuantityItem, parseCount } from "./settlement";

const SHARE_KEY = "s";
const SHARE_VERSION = 1;

/**
 * 정산 내역을 URL 해시에 담아 공유한다.
 * 해시는 서버로 전송되지 않으므로 참여자 이름이 서버 기록에 남지 않는다.
 * 링크 길이를 줄이려고 키를 한 글자로 쓰고, 참여자는 이름 대신 순번으로 저장한다.
 */

const toBase64Url = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const fromBase64Url = (token) => {
  const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (character) =>
    character.charCodeAt(0),
  );

  return new TextDecoder().decode(bytes);
};

/**
 * 총 주문 금액은 메뉴명이 없어도 가격이 있으면 합산된다.
 * 보낸 사람과 받은 사람의 금액이 어긋나지 않도록, 이름 없이 가격만 있는 항목도 함께 담는다.
 */
const isShareableItem = (item) => Boolean(item.menu) || Number(item.price) > 0;

export const encodeSettlement = (people, items, roundsEnabled) => {
  const orderOf = new Map(people.map((person, index) => [person, index]));

  const encodedItems = items
    .filter(isShareableItem)
    .map((item) => {
      const members = (item.members || [])
        .map((person) => orderOf.get(person))
        .filter((order) => order !== undefined);
      const entry = { n: item.menu, c: Number(item.price || 0), m: members };

      if (isIndividualQuantityItem(item)) {
        entry.d = 1;
        entry.o = Object.fromEntries(
          members.map((order) => [
            order,
            String(item.memberQuantities?.[people[order]] ?? "1"),
          ]),
        );
      } else {
        entry.q = parseCount(item.quantity) || 1;
      }

      const round = getItemRound(item);
      if (round > 1) entry.u = round;

      return entry;
    });

  return toBase64Url(
    JSON.stringify({
      v: SHARE_VERSION,
      r: roundsEnabled ? 1 : 0,
      p: people,
      i: encodedItems,
    }),
  );
};

export const decodeSettlement = (token) => {
  if (!token) return null;

  try {
    const payload = JSON.parse(fromBase64Url(token));
    if (!payload || payload.v !== SHARE_VERSION) return null;

    const people = (Array.isArray(payload.p) ? payload.p : []).filter(
      (person) => typeof person === "string" && person,
    );
    if (!people.length) return null;

    const items = (Array.isArray(payload.i) ? payload.i : [])
      .map((entry) => {
        const members = (Array.isArray(entry.m) ? entry.m : [])
          .map((order) => people[order])
          .filter(Boolean);
        const isIndividual = entry.d === 1;
        const memberQuantities = Object.entries(entry.o || {})
          .map(([order, quantity]) => [people[order], String(quantity)])
          .filter(([person]) => Boolean(person));

        return {
          id: crypto.randomUUID(),
          menu: String(entry.n ?? ""),
          price: String(Number(entry.c) || 0),
          quantity: isIndividual ? 1 : Number(entry.q) || 1,
          members,
          quantityMode: isIndividual ? "individual" : "total",
          memberQuantities: isIndividual
            ? Object.fromEntries(memberQuantities)
            : {},
          round: Number(entry.u) >= 1 ? Math.floor(Number(entry.u)) : 1,
        };
      })
      .filter(isShareableItem);

    if (!items.length) return null;

    return { people, items, roundsEnabled: payload.r === 1 };
  } catch (error) {
    console.error("공유 링크를 해석하지 못했습니다.", error);
    return null;
  }
};

export const readShareToken = () => {
  const hash = window.location.hash.replace(/^#/, "");
  return hash.startsWith(`${SHARE_KEY}=`) ? hash.slice(SHARE_KEY.length + 1) : "";
};

export const buildShareUrl = (people, items, roundsEnabled) =>
  `${window.location.origin}/#${SHARE_KEY}=${encodeSettlement(
    people,
    items,
    roundsEnabled,
  )}`;

export const clearShareHash = () => {
  window.history.replaceState(
    {},
    "",
    `${window.location.pathname}${window.location.search}`,
  );
};
