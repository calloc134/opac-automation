import { password, user_id } from "./env";
import { useOPAC } from "./hooks/useOPAC";

// 図書館を延長するためのスクリプト
const main = async () => {
  // 図書館システムにログインする
  const { get_lental_list, extend_book } = await useOPAC({
    user_id: user_id,
    password: password,
  });

  const lental_list = await get_lental_list();

  console.log("[*] 現在借りている本の一覧を表示します\n");

  for (const book of lental_list) {
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
  const result = await extend_book({
    book_id: "1392870",
  });
};

main();
