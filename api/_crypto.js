import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

/**
 * 저장 전 암호화.
 *
 * 저장소에 참여자 이름이 평문으로 남지 않게 한다. 저장소 백업이 유출되거나
 * 저장소 쪽 접근이 있어도 내용을 읽을 수 없다.
 *
 * 다만 열쇠는 서버가 들고 있으므로, 서버 환경변수까지 함께 털리는 경우는 막지 못한다.
 * 열쇠를 링크에 담아 서버가 모르게 하는 방법도 있으나, 그러면 서버가 내용을 읽지 못해
 * 정산별 미리보기 카드를 만들 수 없다.
 */

const SECRET = process.env.SHARE_SECRET || "";
const FORMAT_PREFIX = "v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** 너무 짧은 값은 열쇠로 쓰지 않는다. 설정이 없으면 저장 자체를 하지 않는다. */
export const isConfigured = () => SECRET.length >= 32;

let cachedKey = null;

const key = () => {
  if (!cachedKey) {
    cachedKey = Buffer.from(
      hkdfSync("sha256", SECRET, "hanip-share-v1", "settlement-token", 32),
    );
  }

  return cachedKey;
};

export const encrypt = (text) => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

  return (
    FORMAT_PREFIX +
    Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64")
  );
};

/**
 * 저장된 값을 읽는다.
 * 암호화를 넣기 전에 저장된 값은 접두사가 없다. 그 값들은 이미 평문으로 들어가 있으므로
 * 그대로 돌려준다. 새로 저장하는 값은 항상 암호화되므로 평문이 늘어나지는 않는다.
 */
export const readStored = (stored) => {
  if (typeof stored !== "string") throw new Error("저장된 값이 없습니다.");
  if (!stored.startsWith(FORMAT_PREFIX)) return stored;
  if (!isConfigured()) {
    throw new Error("열쇠가 없어 저장된 내역을 읽을 수 없습니다.");
  }

  return decrypt(stored);
};

export const decrypt = (stored) => {
  if (typeof stored !== "string" || !stored.startsWith(FORMAT_PREFIX)) {
    throw new Error("알 수 없는 저장 형식입니다.");
  }

  const raw = Buffer.from(stored.slice(FORMAT_PREFIX.length), "base64");
  if (raw.length <= IV_BYTES + TAG_BYTES) {
    throw new Error("저장된 값이 손상되었습니다.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    raw.subarray(0, IV_BYTES),
  );
  // 인증 태그가 맞지 않으면 final()에서 예외가 난다. 변조된 값은 복호화되지 않는다.
  decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));

  return Buffer.concat([
    decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
    decipher.final(),
  ]).toString("utf8");
};
