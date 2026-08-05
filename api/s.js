import { inflateSync } from "node:zlib";
import { get, isConfigured } from "./_storage.js";

/**
 * 공유 링크 전용 HTML을 돌려준다.
 * 정적 index.html의 OG 태그를 이 정산의 요약으로 바꿔 넣어, 메신저 미리보기 카드에
 * 참여자와 금액이 보이게 한다. 앱 자체는 평소처럼 번들이 로드되며 그려진다.
 */

const money = new Intl.NumberFormat("ko-KR");

const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const decodeToken = (token) => {
  const compressed = token.startsWith("z");
  const body = compressed ? token.slice(1) : token;
  const base64 = body.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const bytes = Buffer.from(padded, "base64");

  return JSON.parse(
    (compressed ? inflateSync(bytes) : bytes).toString("utf8"),
  );
};

/** 클라이언트의 계산 규칙과 같아야 한다. 개별 수량 모드는 각자 수량의 합이 총 수량이다. */
const summarize = (payload) => {
  const people = Array.isArray(payload.p) ? payload.p : [];
  const items = Array.isArray(payload.i) ? payload.i : [];

  const total = items.reduce((sum, item) => {
    const quantity =
      item.d === 1
        ? Object.values(item.o || {}).reduce(
            (count, value) => count + (Number(value) || 0),
            0,
          )
        : Number(item.q) || 1;

    return sum + (Number(item.c) || 0) * quantity;
  }, 0);

  const rounds = new Set(items.map((item) => Number(item.u) || 1));

  return {
    people,
    menuCount: items.filter((item) => item.n).length,
    total,
    maxRound: Math.max(1, ...rounds),
    usesRounds: payload.r === 1 && rounds.size > 1,
  };
};

const describe = ({ people, menuCount, total, maxRound, usesRounds }) => {
  const names =
    people.length > 2
      ? `${people.slice(0, 2).join(", ")} 외 ${people.length - 2}명`
      : people.join(", ");
  const parts = [`총 ${money.format(total)}원`, `${menuCount}개 메뉴`];
  if (usesRounds) parts.push(`${maxRound}차까지`);

  return { title: `한입정산 · ${names}`, description: parts.join(" · ") };
};

export default async function handler(request, response) {
  const id = String(request.query?.id || "");
  const origin = `https://${request.headers.host}`;

  const shell = await fetch(`${origin}/`).then((result) => result.text());
  const send = (html) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "public, max-age=60, s-maxage=600");
    return response.status(200).send(html);
  };

  if (!/^[0-9a-zA-Z]{4,32}$/.test(id) || !isConfigured()) return send(shell);

  try {
    const token = await get(`share:${id}`);
    if (!token) return send(shell);

    const { title, description } = describe(summarize(decodeToken(token)));
    const url = `${origin}/s/${id}`;

    // 기존 태그를 지우고 다시 넣는다. 남겨두면 크롤러가 어느 쪽을 쓸지 알 수 없다.
    const stripped = shell
      .replace(/<meta\s+property="og:(title|description|url)"[\s\S]*?\/>/g, "")
      .replace(/<meta\s+name="twitter:(title|description)"[\s\S]*?\/>/g, "")
      .replace(/<title>[\s\S]*?<\/title>/, "");

    const injected = `<title>${escapeHtml(title)}</title>
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />`;

    return send(stripped.replace("<head>", `<head>\n    ${injected}`));
  } catch (error) {
    console.error("공유 페이지 생성 실패", error);
    return send(shell);
  }
}
