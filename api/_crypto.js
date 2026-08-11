import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

/**
 * 저장 전 암호화.
 *
 * 저장소에 참여자 이름이 평문으로 남지 않게 한다.
 *
 * 열쇠는 두 곳에서 온다.
 *  v1 — SHARE_SECRET. 전용 열쇠이고 이쪽이 더 안전하다. 있으면 항상 이걸 쓴다.
 *  k1 — 저장소 토큰에서 파생. 별도 설정 없이도 암호화가 되도록 두는 대비책이다.
 *
 * k1은 저장소 토큰을 가진 쪽이면 풀 수 있으므로 v1보다 약하다. 다만 저장된 값 자체가
 * 유출되는 경우는 똑같이 막아 주고, 무엇보다 설정을 빠뜨려도 기능이 멈추지 않는다.
 * SHARE_SECRET을 나중에 넣으면 그때부터 v1으로 저장되고, 먼저 저장된 k1 값도 계속 읽힌다.
 */

const SOURCES = {
  v1: process.env.SHARE_SECRET || "",
  k1:
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
};

const MIN_LENGTH = { v1: 32, k1: 20 };
const IV_BYTES = 12;
const TAG_BYTES = 16;

const usable = (id) => SOURCES[id].length >= MIN_LENGTH[id];

/** 저장할 때 쓸 열쇠. 전용 열쇠가 있으면 그쪽이 우선이다. */
const preferredId = () => (usable("v1") ? "v1" : usable("k1") ? "k1" : "");

export const isConfigured = () => Boolean(preferredId());

const cache = new Map();

const keyFor = (id) => {
  if (!usable(id)) throw new Error(`열쇠(${id})가 설정되지 않았습니다.`);
  if (!cache.has(id)) {
    cache.set(
      id,
      Buffer.from(
        hkdfSync("sha256", SOURCES[id], "hanip-share-v1", `token-${id}`, 32),
      ),
    );
  }

  return cache.get(id);
};

export const encrypt = (text) => {
  const id = preferredId();
  if (!id) throw new Error("암호화 열쇠가 없습니다.");

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyFor(id), iv);
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

  return `${id}:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64")}`;
};

export const decrypt = (stored) => {
  const separator = stored.indexOf(":");
  const id = separator > 0 ? stored.slice(0, separator) : "";
  if (!SOURCES[id]) throw new Error("알 수 없는 저장 형식입니다.");

  const raw = Buffer.from(stored.slice(separator + 1), "base64");
  if (raw.length <= IV_BYTES + TAG_BYTES) {
    throw new Error("저장된 값이 손상되었습니다.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyFor(id),
    raw.subarray(0, IV_BYTES),
  );
  // 인증 태그가 맞지 않으면 final()에서 예외가 난다. 변조된 값은 복호화되지 않는다.
  decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));

  return Buffer.concat([
    decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
    decipher.final(),
  ]).toString("utf8");
};

/**
 * 저장된 값을 읽는다.
 * 암호화를 넣기 전에 저장된 값은 접두사가 없다. 그 값들은 이미 평문으로 들어가 있으므로
 * 그대로 돌려준다. 새로 저장하는 값은 항상 암호화되므로 평문이 늘어나지는 않는다.
 */
export const readStored = (stored) => {
  if (typeof stored !== "string") throw new Error("저장된 값이 없습니다.");

  const separator = stored.indexOf(":");
  const id = separator > 0 ? stored.slice(0, separator) : "";

  return id in SOURCES ? decrypt(stored) : stored;
};
