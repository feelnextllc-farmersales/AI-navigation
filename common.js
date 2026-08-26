// common.js — shared header/footer injection + small helpers
// No data persistence of any kind lives in this file (per spec: no localStorage,
// no server storage). Anything stateful is kept in-memory inside each page's own script.

function renderHeader(active){
  const nav = [
    ['index.html','トップ'],
    ['guide.html','初めての方へ'],
    ['navigation.html','AI NAVIGATION'],
  ];
  document.write(`
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="index.html">AI NAVIGATION<small>AI相談所のように使えるナビゲーション</small></a>
    </div>
  </header>`);
}

function renderFooter(){
  document.write(`
  <footer>
    <div class="wrap">
      <div>
        <a href="guide.html">初めての方へ</a>
        <a href="terms.html">利用規約</a>
        <a href="tokushoho.html">特定商取引法に基づく表記</a>
        <a href="privacy.html">プライバシーポリシー</a>
      </div>
      <p class="copy">本サービスの利用によって、売上増加・業務時間削減・利益増加等の成果を保証するものではありません。<br>
      入力いただいた情報は当社サーバーに保存されません。ページを離れると内容は失われますので、必要な内容は事前に保存・コピーしてください。<br>
      運営：合同会社フィールネクスト</p>
    </div>
  </footer>`);
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[s]));
}
