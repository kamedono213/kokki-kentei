# 国旗検定

世界197か国(日本が承認する195か国 + 日本 + 北朝鮮)の国旗クイズ。スマホ向けWebアプリ。

- ① 国旗あて: 地域を選び、イージー(国旗→国名を4択)/ノーマル(国名→国旗を4択)/ハード(国旗→国名を入力)。全問 or ランダム10問
- ② 由来クイズ: 国旗を見て由来を4択
- ③ 場所あて: 国旗を見て、拡大縮小できる白地図で国をタップ→OKで答え合わせ

## データの出典
- 国名: 外務省「国・地域」(2026-10-13取得)。`data/countries-master.js`
- 国旗画像: 英語版Wikipedia「Flag of 〇〇」記事が現在使っている Wikimedia Commons のSVG(`research/flag-sources.json`)。
  アフガニスタンだけ国連・五輪で使われている三色旗に差し替え
- 由来: 英語版Wikipedia各記事(版番号は `research/flagfiles.json`)。ボリビアのみ日本語版。`data/origins.js`
- 地図: Natural Earth 50m(world-atlas 2.0.2)。ツバルは地図に無いため首都の座標に点を置く

## 作り方
- `node data/build.js` … `app/data/countries.json` と `app/data/world.json` を作る
- `node serve.js` … http://localhost:5390 でローカル確認
- PWA版(GitHub Pages): https://kamedono213.github.io/kokki-kentei/ … `node tools/build-pages.js` で docs/ を作り直して push すると更新される
- Artifact版: https://claude.ai/artifact/9qb3q4wnmKjc7XjbWXF2vS
