import { password, user_id } from "./env";
import { useOPAC } from "./hooks/useOPAC";

// 図書館を延長するためのスクリプト
const main = async () => {
  // 図書館システムにログインする
  const { get_lental_list } = await useOPAC({
    user_id: user_id,
    password: password,
  });

  const lental_list = await get_lental_list();

  console.log("[*] 延長可能な本のリストを取得しました");

  console.log(lental_list);
};

main();
