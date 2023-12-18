import { password, user_id } from "./env";
import { getTokenId } from "./utils/getTokenId";

// 図書館を延長するためのスクリプト
const main = async () => {
  const tokenId = await getTokenId({
    id: user_id,
    password: password,
  });

  console.log(tokenId);
};

main();
