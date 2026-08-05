import { readStored } from "./_crypto.js";
import { allow, clientIp } from "./_ratelimit.js";
import { get, isConfigured } from "./_storage.js";

const READ_LIMIT = 120;
const READ_WINDOW_MS = 60 * 1000 * 10;

export default async function handler(request, response) {
  const id = String(request.query?.id || "");

  if (!/^[0-9a-zA-Z]{4,32}$/.test(id)) {
    return response.status(400).json({ error: "잘못된 주소입니다." });
  }

  // 저장소를 건드리기 전에 막아야 사용량이 소모되지 않는다.
  if (!allow(`read:${clientIp(request)}`, READ_LIMIT, READ_WINDOW_MS)) {
    response.setHeader("Retry-After", "600");
    return response.status(429).json({ error: "잠시 후 다시 시도해주세요." });
  }

  // 읽기는 열쇠 설정과 무관하게 동작해야 한다. 암호화 이전에 저장된 링크도 계속 열려야 하고,
  // 열쇠가 빠진 배포에서 기존 링크가 한꺼번에 죽는 일을 막는다.
  if (!isConfigured()) {
    return response.status(503).json({ error: "저장소가 설정되지 않았습니다." });
  }

  try {
    const stored = await get(`share:${id}`);
    if (!stored) {
      // 없는 주소도 짧게 캐시해, 같은 주소를 반복 요청해도 저장소까지 가지 않게 한다.
      response.setHeader("Cache-Control", "public, max-age=60, s-maxage=600");
      return response
        .status(404)
        .json({ error: "만료되었거나 없는 정산 내역입니다." });
    }

    const data = readStored(stored);

    // 내용이 바뀌지 않는 항목이라 캐시를 길게 둔다. 반복 조회가 저장소로 가지 않는다.
    response.setHeader("Cache-Control", "public, max-age=300, s-maxage=86400");
    return response.status(200).json({ data });
  } catch (error) {
    console.error("공유 조회 실패", error);
    return response.status(500).json({ error: "불러오지 못했습니다." });
  }
}
