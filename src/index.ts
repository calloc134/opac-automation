import { webhook_url, password, user_id } from "./env";
import { initOpacClient } from "./class/OpacClient";
import { initMessageClient } from "./class/MessageClient";
import { Book } from "./types/Book";
// @ts-expect-error
import fs from "node:fs";

// 図書館を延長するためのスクリプト
const main = async () => {
  // メッセージクライアントを初期化する
  const MessageClient = initMessageClient({
    webhook_url,
  });

  await MessageClient.send("┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯┯");
  await MessageClient.send("┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷┷");
  await MessageClient.send(":bell: │ ジリリリリリリリリ！:bell:");
  await MessageClient.send(
    ":sunrise: │ おはようございます。かろ噴水が朝7:30をお知らせします。"
  );
  await MessageClient.send(":books: │ 貸出図書通知botのお時間です。");
  await MessageClient.send(
    `:bell: │ 本日 ${new Date().toLocaleDateString()} の図書館貸出状況をお知らせします`
  );

  // 図書館システムにログインする
  const OpacClientMaybe = await initOpacClient({
    user_id: user_id,
    password: password,
  });

  if (OpacClientMaybe.isErr()) {
    console.error("[!] エラーが発生しました");
    await MessageClient.send(
      `:warning: │ エラーが発生しました: ${OpacClientMaybe.error.statusText}`
    );

    console.error("[*] レスポンスのテキストを表示します");
    console.error(OpacClientMaybe.error.statusText);
    console.error("[*] プログラムを終了します");
    return;
  }

  const OpacClient = OpacClientMaybe.value;

  console.log("[*] 図書館システムにログインしました");
  await MessageClient.send(
    ":white_check_mark: │ 図書館システムにログインしました"
  );
  console.log("[*] 延長が必要な本が存在するか確認します");
  await MessageClient.send(":books: │ 延長が必要な本が存在するか確認します");

  const lental_list_maybe = await OpacClient.get_lental_list();

  if (lental_list_maybe.isErr()) {
    console.error("[!] エラーが発生しました");
    await MessageClient.send(
      `:warning: │ エラーが発生しました: ${lental_list_maybe.error.statusText}`
    );
    console.error("[*] レスポンスのテキストを表示します");
    console.error(lental_list_maybe.error.statusText);
    console.error("[*] プログラムを終了します");
    return;
  }

  // 延長するための本を格納する配列
  const extend_list: Book[] = lental_list_maybe.value.filter(
    (book) => book.status === "確認"
  );

  // 延長する本があれば延長処理を行う
  if (extend_list.length !== 0) {
    console.log("[*] ${extend_list.length}冊の延長処理を開始します");
    await MessageClient.send(
      ":books: │ ${extend_list.length}冊の延長処理を開始します"
    );

    for (const book_id of extend_list) {
      console.log(`[*] ${book_id.detail} の延長処理を開始します`);
      await MessageClient.send(
        `:book: │ ${book_id.detail} の延長処理を開始します`
      );
      const result = await OpacClient.extend_book({ book_id: book_id.book_id });

      if (result.isErr()) {
        console.error("[!] エラーが発生しました");
        console.error("[*] プログラムを終了します");
        await MessageClient.send(
          ":warning: │ エラーが発生しました。プログラムを終了します"
        );
        return;
      }
    }

    console.log("[*] 延長処理が完了しました");
    await MessageClient.send(":books: │ 延長処理が完了しました");
  } else {
    await MessageClient.send(":books: │ 延長の必要な本はありません");
    console.log("[*] 延長の必要な本はありません");
  }

  console.log("[*] 現在借りている本の詳細を含めた一覧を表示します\n");
  await MessageClient.send(
    ":books: │ 現在借りている本の詳細を含めた一覧を表示します"
  );

  const lental_list_with_details_maybe =
    await OpacClient.get_lental_list_with_details();

  if (lental_list_with_details_maybe.isErr()) {
    console.error("[!] エラーが発生しました");
    await MessageClient.send(
      `:warning: │ エラーが発生しました: ${lental_list_with_details_maybe.error.statusText}`
    );
    console.error("[*] レスポンスのテキストを表示します");
    console.error(lental_list_with_details_maybe.error.statusText);
    console.error("[*] プログラムを終了します");
    return;
  }

  for (const book of lental_list_with_details_maybe.value) {
    console.log(
      `${book.detail}\n├── 書籍番号: ${book.book_id}\n├── キャンパス: ${book.campus}\n├── 貸出日: ${book.lend_date}\n└── 返却期限: ${book.return_date}\n${book.image_url}`
    );

    await MessageClient.send(
      `:book: ${book.detail}\n├── 書籍番号: ${book.book_id}\n├── キャンパス: ${book.campus}\n├── 貸出日: ${book.lend_date}\n└── 返却期限: ${book.return_date}\n${book.image_url}`
    );

    if (book.status === "延滞") {
      console.log("[*] この本は延滞しています");
      console.log("[*] 速やかに返却してください");
      await MessageClient.send(
        ":exclamation: │ この本は延滞しています。速やかに返却してください。"
      );
    } else if (book.status === "確認") {
      console.log("[*] この本は本日が返却期限です");
      await MessageClient.send(
        ":white_check_mark: │ この本は本日が返却期限です。"
      );
    }

    // 少し待機
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log("[*] 貸出図書の詳細を含めた一覧を表示しました");
  await MessageClient.send(
    ":books: │ 貸出図書の詳細を含めた一覧を表示しました"
  );

  console.log("[*] JSONファイルを出力します");

  // JSONとして出力する
  fs.writeFileSync(
    "./output.json",
    JSON.stringify(lental_list_with_details_maybe.value, null, 2),
    "utf-8"
  );

  console.log("[*] JSONファイルを出力しました");

  console.log("[*] プログラムを終了します");
  await MessageClient.send(":man_gesturing_ok: │ プログラムを終了します");
};

main();
