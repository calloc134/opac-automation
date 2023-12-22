import { password, user_id } from "./env";
import { useOPAC } from "./hooks/useOPAC";

// 図書館を延長するためのスクリプト
const main = async () => {
  // 図書館システムにログインする
  const { get_lental_list_html } = await useOPAC({
    user_id: user_id,
    password: password,
  });

  // htmlを取得する
  const table_html = await get_lental_list_html();

  console.log(table_html);
};

main();
