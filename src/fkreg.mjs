// 「深掘り」記事の一覧を、ほかのページ（元のニュース・トップ）から参照するための置き場
let LIST = [];
export const setFukabori = (l) => { LIST = l; };
export const getFukabori = () => LIST;
export const fukaboriFor = (date, n) => LIST.filter((f) => f.from?.date === date && f.from?.n === n);
