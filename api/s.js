import { readStored } from "./_crypto.js";
import { decodeToken, isSettlementPayload } from "./_payload.js";
import { allow, clientIp } from "./_ratelimit.js";
import { get, isConfigured } from "./_storage.js";

const READ_LIMIT = 120;
const READ_WINDOW_MS = 60 * 1000 * 10;

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

/**
 * 내용을 가져올 주소를 정한다.
 * Host 헤더는 요청자가 바꿀 수 있어 그대로 쓰면 임의의 외부 서버로 요청이 나간다.
 * 우리 도메인 형태일 때만 쓰고, 아니면 Vercel이 알려주는 배포 주소를 쓴다.
 */
const resolveOrigin = (request) => {
  const host = String(request.headers.host || "");
  const allowed =
    /^[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/.test(host) ||
    host === process.env.SITE_HOST;

  if (allowed) return `https://${host}`;

  const fallback =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "";
  return fallback ? `https://${fallback}` : "";
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
  const origin = resolveOrigin(request);

  if (!origin) {
    return response.status(500).send("페이지를 준비하지 못했습니다.");
  }

  let shell = "";
  try {
    shell = await fetch(`${origin}/`).then((result) => result.text());
  } catch (error) {
    // 감싸지 않으면 예외가 그대로 올라가 내부 정보가 응답에 실릴 수 있다.
    console.error("기본 페이지를 가져오지 못했습니다.", error);
    return response.status(502).send("페이지를 준비하지 못했습니다.");
  }

  const send = (html) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "public, max-age=60, s-maxage=600");
    return response.status(200).send(html);
  };

  const ready = isConfigured();
  if (!/^[0-9a-zA-Z]{4,32}$/.test(id) || !ready) return send(shell);

  // 요약을 못 만들어도 앱은 정상 동작하므로, 제한에 걸리면 일반 화면을 돌려준다.
  if (!allow(`card:${clientIp(request)}`, READ_LIMIT, READ_WINDOW_MS)) {
    return send(shell);
  }

  try {
    const stored = await get(`share:${id}`);
    if (!stored) return send(shell);

    const payload = decodeToken(readStored(stored));
    if (!isSettlementPayload(payload)) return send(shell);

    const { title, description } = describe(summarize(payload));
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
