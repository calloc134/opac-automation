const decodeHTMLEntities = (text: string) => {
  // まず正規表現を利用
  const html_entities_pattern = /&#x([a-fA-F0-9]+);/g;

  // ここで、文字列を置換する
  const decoded_text = text.replace(html_entities_pattern, (_, hexCode) => {
    // 16進数から対応する文字コードへ変換し、文字として取得
    return String.fromCharCode(parseInt(hexCode, 16));
  });

  // デコードした文字列を返す
  return decoded_text;
};

export { decodeHTMLEntities };
