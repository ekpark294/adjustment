import { countWithin, isConfigured, setWithTtl } from "./_storage.js";

/** 공유 링크 보관 기간. 지나면 Redis가 알아서 지운다. 개인정보처리방침의 안내와 같아야 한다. */
const RETENTION_SECONDS = 60 * 60 * 24 * 14;
const MAX_TOKEN_LENGTH = 32 * 1024;
const RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 60 * 10;
const ID_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** 이름이 담긴 링크라 추측할 수 없어야 한다. 8자면 약 47비트. */
const createId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
};

const clientIp = (request) =>
  (request.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "POST만 허용합니다." });
  }
  if (!isConfigured()) {
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

    // NX 옵션이라 이미 쓰인 id면 null이 돌아온다. 그때만 다시 뽑는다.
    let id = "";
    for (let attempt = 0; attempt < 5 && !id; attempt++) {
      const candidate = createId();
      const stored = await setWithTtl(
        `share:${candidate}`,
        data,
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
