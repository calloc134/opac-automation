// 大学のシステムにログインするOPENAMのURL
const openam_url = process.env.OPENAM_URL || "";

const user_id = process.env.USER_ID || "";
const password = process.env.PASSWORD || "";

export { openam_url, user_id, password };
