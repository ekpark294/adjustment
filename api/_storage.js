/**
 * Upstash Redis REST API 래퍼.
 * Vercel 마켓플레이스로 스토리지를 연결하면 아래 환경변수가 자동으로 주입된다.
 * REST 방식이라 별도 패키지 설치 없이 fetch만으로 동작한다.
 */

const ENDPOINT =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const isConfigured = () => Boolean(ENDPOINT && TOKEN);

const run = async (command) => {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`저장소 응답 오류 ${response.status}`);
  }

  const { result, error } = await response.json();
  if (error) throw new Error(error);

  return result;
};

export const setWithTtl = (key, value, seconds) =>
  run(["SET", key, value, "EX", String(seconds), "NX"]);

export const get = (key) => run(["GET", key]);

/** 같은 IP의 짧은 시간 내 반복 생성을 막는다. 반환값이 한도를 넘으면 거절한다. */
export const countWithin = async (key, seconds) => {
  const count = await run(["INCR", key]);
  if (count === 1) await run(["EXPIRE", key, String(seconds)]);

  return count;
};
