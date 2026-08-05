/**
 * 함수 인스턴스 메모리에 두는 호출 제한.
 *
 * 저장소로 제한을 구현하면 검사 자체가 저장소 명령을 쓰기 때문에,
 * 사용량을 아끼려는 목적과 어긋난다. 메모리 방식은 검사에 비용이 들지 않는다.
 *
 * 인스턴스마다 따로 세므로 전역적으로 정확하지는 않다.
 * 한 곳에서 몰아치는 호출을 막는 것이 목적이고, 그 상황에서는 같은 인스턴스가
 * 재사용되므로 실제로 걸러진다.
 */

const buckets = new Map();
const MAX_TRACKED_KEYS = 5000;

export const allow = (key, limit, windowMs) => {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    // 오래된 항목이 쌓여 메모리를 잠식하지 않도록 상한에서 비운다.
    if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
};

/**
 * x-forwarded-for의 맨 앞 값은 요청자가 직접 넣을 수 있어 제한을 우회할 수 있다.
 * Vercel이 직접 채우는 x-real-ip를 먼저 쓰고, 없으면 맨 뒤 값을 쓴다.
 */
export const clientIp = (request) => {
  const real = String(request.headers["x-real-ip"] || "").trim();
  if (real) return real;

  const chain = String(request.headers["x-forwarded-for"] || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return chain[chain.length - 1] || "unknown";
};
