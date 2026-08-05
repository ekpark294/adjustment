import { get, isConfigured } from "./_storage.js";

export default async function handler(request, response) {
  const id = String(request.query?.id || "");

  if (!/^[0-9a-zA-Z]{4,32}$/.test(id)) {
    return response.status(400).json({ error: "잘못된 주소입니다." });
  }
  if (!isConfigured()) {
    return response.status(503).json({ error: "저장소가 설정되지 않았습니다." });
  }

  try {
    const data = await get(`share:${id}`);
    if (!data) {
      return response
        .status(404)
        .json({ error: "만료되었거나 없는 정산 내역입니다." });
    }

    // 내용이 바뀌지 않는 항목이라 캐시를 길게 둔다.
    response.setHeader("Cache-Control", "public, max-age=300, s-maxage=86400");
    return response.status(200).json({ data });
  } catch (error) {
    console.error("공유 조회 실패", error);
    return response.status(500).json({ error: "불러오지 못했습니다." });
  }
}
