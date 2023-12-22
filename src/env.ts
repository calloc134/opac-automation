// 大学のシステムにログインするOPENAMのURL
const openam_url = process.env.OPENAM_URL || "";
// 大学の図書館システムであるiLisWaveのエンドポイント
const iliswave_url = process.env.ILISWAVE_URL || "";

const user_id = process.env.USER_ID || "";
const password = process.env.PASSWORD || "";

export { openam_url, iliswave_url, user_id, password };
