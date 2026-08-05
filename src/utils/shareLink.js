import { getItemRound, isIndividualQuantityItem, parseCount } from "./settlement";

const SHARE_KEY = "s";
const SHARE_VERSION = 1;

/**
 * 정산 내역을 URL 해시에 담아 공유한다.
 * 해시는 서버로 전송되지 않으므로 참여자 이름이 서버 기록에 남지 않는다.
 * 링크 길이를 줄이려고 키를 한 글자로 쓰고, 참여자는 이름 대신 순번으로 저장한 뒤 압축한다.
 */

/**
 * 압축한 링크임을 알리는 표시.
 * 압축하지 않은 링크는 `{`로 시작하는 JSON을 인코딩한 값이라 항상 `e`로 시작하므로,
 * 다른 글자를 앞에 붙이면 두 형식을 확실히 구분할 수 있다.
 */
const COMPRESSED_PREFIX = "z";

const bytesToBase64Url = (bytes) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const base64UrlToBytes = (token) => {
  const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

const toBase64Url = (text) => bytesToBase64Url(new TextEncoder().encode(text));

const fromBase64Url = (token) =>
  new TextDecoder().decode(base64UrlToBytes(token));

const canCompress = () =>
  typeof CompressionStream === "function" &&
  typeof DecompressionStream === "function";

const compress = async (text) => {
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));

  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const decompress = async (bytes) => {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));

  return new Response(stream).text();
};

/**
 * 총 주문 금액은 메뉴명이 없어도 가격이 있으면 합산된다.
 * 보낸 사람과 받은 사람의 금액이 어긋나지 않도록, 이름 없이 가격만 있는 항목도 함께 담는다.
 */
const isShareableItem = (item) => Boolean(item.menu) || Number(item.price) > 0;

export const encodeSettlement = async (people, items, roundsEnabled) => {
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

  const json = JSON.stringify({
    v: SHARE_VERSION,
    r: roundsEnabled ? 1 : 0,
    p: people,
    i: encodedItems,
  });

  // 압축을 지원하지 않는 브라우저에서는 압축 없이 만든다. 링크는 길지만 그대로 동작한다.
  if (!canCompress()) return toBase64Url(json);

  try {
    return COMPRESSED_PREFIX + bytesToBase64Url(await compress(json));
  } catch (error) {
    console.error("공유 링크를 압축하지 못했습니다.", error);
    return toBase64Url(json);
  }
};

const readPayload = async (token) => {
  if (!token.startsWith(COMPRESSED_PREFIX)) return fromBase64Url(token);

  return decompress(base64UrlToBytes(token.slice(COMPRESSED_PREFIX.length)));
};

export const decodeSettlement = async (token) => {
  if (!token) return null;

  try {
    const payload = JSON.parse(await readPayload(token));
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

const hashUrl = (token) =>
  `${window.location.origin}/#${SHARE_KEY}=${token}`;

/**
 * 짧은 링크를 우선 시도한다.
 * 저장소가 없거나 요청이 실패하면 내역을 그대로 담은 해시 링크로 되돌아간다.
 * 링크는 길어지지만 공유 기능이 멈추지는 않는다.
 */
export const buildShareUrl = async (people, items, roundsEnabled) => {
  const token = await encodeSettlement(people, items, roundsEnabled);

  try {
    const response = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: token }),
    });
    if (!response.ok) return hashUrl(token);

    const { id } = await response.json();
    return id ? `${window.location.origin}/s/${id}` : hashUrl(token);
  } catch (error) {
    console.error("짧은 공유 링크를 만들지 못했습니다.", error);
    return hashUrl(token);
  }
};

/** 주소가 `/s/{id}` 형태면 그 id를 돌려준다. */
export const readShareId = () => {
  const match = window.location.pathname.match(/^\/s\/([0-9a-zA-Z]{4,32})$/);
  return match ? match[1] : "";
};

/** 보관 기간이 지난 링크임을 알리는 표시. 단순 실패와 구분해 안내 문구를 다르게 보여준다. */
export const EXPIRED = "expired";

export const fetchSharedSettlement = async (id) => {
  const response = await fetch(`/api/settlement?id=${encodeURIComponent(id)}`);
  if (response.status === 404 || response.status === 410) return EXPIRED;
  if (!response.ok) return null;

  const { data } = await response.json();
  return decodeSettlement(data);
};

/** 공유 화면을 벗어날 때 주소를 앱 첫 화면으로 되돌린다. */
export const clearShareHash = () => {
  window.history.replaceState({}, "", "/");
};
