import {
  encrypt,
  isConfigured as isEncryptionConfigured,
} from "./_crypto.js";
import { decodeToken, isSettlementPayload } from "./_payload.js";
import { allow, clientIp } from "./_ratelimit.js";
import { countWithin, isConfigured, setWithTtl } from "./_storage.js";

/** 공유 링크 보관 기간. 지나면 Redis가 알아서 지운다. 개인정보처리방침의 안내와 같아야 한다. */
const RETENTION_SECONDS = 60 * 60 * 24 * 14;
/** 12명 13개 메뉴가 약 500자다. 8KB면 매우 큰 정산도 들어가면서 낭비를 막는다. */
const MAX_TOKEN_LENGTH = 8 * 1024;
const RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 60 * 10;
const ID_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** 이름이 담긴 링크라 추측할 수 없어야 한다. 8자면 약 47비트. */
const createId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
};


export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "POST만 허용합니다." });
  }

  // 다른 사이트가 방문자 브라우저를 통해 호출하는 것을 막는다.
  // 브라우저는 교차 출처 요청에 Origin을 반드시 붙이므로, 값이 있으면 우리 도메인이어야 한다.
  const origin = String(request.headers.origin || "");
  if (origin && origin !== `https://${request.headers.host}`) {
    return response.status(403).json({ error: "허용되지 않은 요청입니다." });
  }

  // 저장소를 건드리기 전에 메모리로 먼저 거른다.
  // Redis로만 제한하면 거절하는 요청도 저장소 사용량을 쓴다.
  if (!allow(`write:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_SECONDS * 1000)) {
    return response.status(429).json({ error: "잠시 후 다시 시도해주세요." });
  }
  // 암호화 열쇠가 없으면 저장하지 않는다. 평문으로 남기느니 긴 링크로 되돌리는 편이 낫다.
  if (!isConfigured() || !isEncryptionConfigured()) {
    return response.status(503).json({ error: "저장소가 설정되지 않았습니다." });
  }

  const body =
    typeof request.body === "string" ? safeParse(request.body) : request.body;
  const data = body?.data;

  if (typeof data !== "string" || !data) {
    return response.status(400).json({ error: "공유할 내역이 없습니다." });
  }
  if (data.length > MAX_TOKEN_LENGTH) {
    return response.status(413).json({ error: "내역이 너무 큽니다." });
  }

  // 실제 정산 내역만 저장한다. 검증하지 않으면 아무 데이터나 보관하는 저장소로 쓰일 수 있다.
  try {
    if (!isSettlementPayload(decodeToken(data))) {
      return response.status(400).json({ error: "정산 내역이 아닙니다." });
    }
  } catch {
    return response.status(400).json({ error: "정산 내역이 아닙니다." });
  }

  try {
    const used = await countWithin(
      `rate:${clientIp(request)}`,
      RATE_WINDOW_SECONDS,
    );
    if (used > RATE_LIMIT) {
      return response
        .status(429)
        .json({ error: "잠시 후 다시 시도해주세요." });
    }

    const encrypted = encrypt(data);

    // NX 옵션이라 이미 쓰인 id면 null이 돌아온다. 그때만 다시 뽑는다.
    let id = "";
    for (let attempt = 0; attempt < 5 && !id; attempt++) {
      const candidate = createId();
      const stored = await setWithTtl(
        `share:${candidate}`,
        encrypted,
        RETENTION_SECONDS,
      );
      if (stored) id = candidate;
    }

    if (!id) {
      return response.status(500).json({ error: "링크를 만들지 못했습니다." });
    }

    return response.status(200).json({ id });
  } catch (error) {
    console.error("공유 저장 실패", error);
    return response.status(500).json({ error: "링크를 만들지 못했습니다." });
  }
}

const safeParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
