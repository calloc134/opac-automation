import { password, user_id } from "./env";
import { initOpacClient } from "./class/OpacClient";
import { initMessageClient } from "./class/MessageClient";

// 図書館を延長するためのスクリプト
const main = async () => {
  // 図書館システムにログインする
  const OpacClientMaybe = await initOpacClient({
    user_id: user_id,
    password: password,
  });

  if (OpacClientMaybe.isErr()) {
    console.error("[!] エラーが発生しました");
    console.error("[*] レスポンスのテキストを表示します");
    console.error(OpacClientMaybe.error.statusText);
    console.error("[*] プログラムを終了します");
    return;
  }

  const OpacClient = OpacClientMaybe.value;

  const lental_list_maybe = await OpacClient.get_lental_list();

  if (lental_list_maybe.isErr()) {
    console.error("[!] エラーが発生しました");
    console.error("[*] レスポンスのテキストを表示します");
    console.error(lental_list_maybe.error.statusText);
    console.error("[*] プログラムを終了します");
    return;
  }

  console.log("[*] 現在借りている本の一覧を表示します\n");

  for (const book of lental_list_maybe.value) {
    console.log(`${book.detail}`);
    console.log(`├── 書籍番号: ${book.book_id}`);
    console.log(`├── キャンパス: ${book.campus}`);
    console.log(`├── 貸出日: ${book.lend_date}`);
    console.log(`└── 返却期限: ${book.return_date}`);

    if (book.status === "延滞") {
      console.log("[*] この本は延滞しています");
      console.log("[*] 速やかに返却してください");
    } else if (book.status === "確認") {
      console.log("[*] この本は本日が返却期限です");
      console.log("[*] 延長処理を行います");
    }
  }
  console.log("延長テスト");
  const result = await OpacClient.extend_book({
    book_id: "1410856",
  });

  if (result.isErr()) {
    console.error("[!] エラーが発生しました");
    console.error("[*] レスポンスのテキストを表示します");
    console.error(result.error.statusText);
    console.error("[*] プログラムを終了します");
    return;
  }
};

main();
