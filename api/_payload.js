import { inflateSync } from "node:zlib";

/**
 * 공유 토큰을 신뢰하지 않고 푸는 도구.
 * 토큰은 외부에서 들어온 값이므로 압축 해제 크기를 반드시 제한해야 한다.
 * 제한이 없으면 작은 입력이 거대한 출력으로 부풀어 함수를 멈추게 할 수 있다.
 */

const MAX_INFLATED_BYTES = 256 * 1024;
const MAX_PEOPLE = 100;
const MAX_ITEMS = 300;
const MAX_NAME_LENGTH = 60;

export const decodeToken = (token) => {
  const compressed = token.startsWith("z");
  const body = compressed ? token.slice(1) : token;

  if (!/^[0-9A-Za-z_-]+$/.test(body)) {
    throw new Error("토큰에 허용되지 않는 문자가 있습니다.");
  }

  const base64 = body.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const bytes = Buffer.from(padded, "base64");
  const json = compressed
    ? inflateSync(bytes, { maxOutputLength: MAX_INFLATED_BYTES })
    : bytes;

  if (json.length > MAX_INFLATED_BYTES) {
    throw new Error("내역이 너무 큽니다.");
  }

  return JSON.parse(json.toString("utf8"));
};

/**
 * 실제 정산 내역인지 확인한다.
 * 이 검사가 없으면 누구나 임의의 문자열을 저장하고 다시 꺼낼 수 있어,
 * 공유 기능이 아무 데이터나 보관하는 저장소로 쓰일 수 있다.
 */
export const isSettlementPayload = (payload) => {
  if (!payload || typeof payload !== "object") return false;
  if (payload.v !== 1) return false;

  const people = payload.p;
  const items = payload.i;

  if (!Array.isArray(people) || !people.length || people.length > MAX_PEOPLE) {
    return false;
  }
  if (
    !people.every(
      (person) =>
        typeof person === "string" &&
        person.length > 0 &&
        person.length <= MAX_NAME_LENGTH,
    )
  ) {
    return false;
  }
  if (!Array.isArray(items) || !items.length || items.length > MAX_ITEMS) {
    return false;
  }

  return items.every(
    (item) =>
      item &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      (item.n === undefined ||
        (typeof item.n === "string" && item.n.length <= MAX_NAME_LENGTH)) &&
      (item.c === undefined || Number.isFinite(Number(item.c))),
  );
};
