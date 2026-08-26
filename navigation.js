// navigation.js — AI NAVIGATION questionnaire engine
// All state lives in memory only (the `state` object below). Nothing is written
// to localStorage/sessionStorage or sent to any server. Leaving/reloading the
// page clears everything, by design (see spec: no data persistence).

(function(){

  const state = { i: 0, answers: {} };

  // ---------- Step definitions ----------
  // type: 'info' | 'single' | 'multi' | 'text'
  const STEPS = [
    { type:'info', title:'AIとは？', body:
      `AIは、文章を書いたり、情報を整理したり、アイデアを出したり、決められた条件に沿って作業を手伝ってくれる、コンピューター上の仕組みです。<br><br>
       「AI＝ChatGPT」ではありません。ChatGPT・Claude・Geminiなど、それぞれ得意分野の異なる複数のサービスがあります。` },
    { type:'info', title:'AIでできること（例）', body:
      `文章作成／資料作成／情報整理／アイデア整理／データ処理／顧客対応の下書き／営業資料の作成／SNS投稿の作成／業務効率化／簡易なツール作成　など。<br><br>
       まずは、あなたの事業について簡単に教えてください。` , explain:'ここからは、あなたの事業について確認する質問です。'},
    { id:'industry', type:'single', title:'業種を教えてください', explain:'業種によって、AIが得意な作業が変わるため確認します。',
      options:['製造業','小売・EC','飲食','建設・工事','医療・福祉','士業・専門サービス','IT・Web','教育','その他サービス業','その他（自由記入）'], other:true },
    { id:'size', type:'single', title:'会社の規模を教えてください', explain:'規模によって、現実的に使える方法が変わるため確認します。',
      options:['個人事業主','2〜5名','6〜20名','21〜50名','51名以上'] },
    { id:'main_work', type:'text', title:'主な仕事内容を教えてください', explain:'どんな業務をされているかを把握するための質問です。', placeholder:'例：注文住宅の設計・施工管理', optional:false },
    { id:'pain_areas', type:'multi', title:'現在、困っていること・時間がかかっていることはどれですか？', explain:'複数選んでいただいて構いません。',
      options:['資料作成','営業','顧客対応','社内業務（事務・管理）','データ管理','人手が足りない','その他'] },
    { id:'pain_detail', type:'text', title:'その中で、一番時間がかかっている業務を具体的に教えてください', explain:'一番負担になっている業務を具体的にイメージするための質問です。分からなければ「わからない」で構いません。', placeholder:'例：毎週の見積書と提案資料の作成' },
    { id:'goal', type:'multi', title:'AIを使って改善したいことは何ですか？', explain:'ここからは、AI活用について確認する質問です。複数選んでいただいて構いません。',
      options:['時間を削減したい','資料作成を楽にしたい','文章作成を楽にしたい','営業を効率化したい','顧客対応を効率化したい','社内業務を効率化したい','データを整理したい','社内業務ツールを作りたい','アイデアを整理したい','その他'] },
    { id:'goal_detail', type:'text', title:'具体的に、どの業務を改善したいですか？', explain:'できるだけ具体的に教えてください。分からない場合は、思いつく範囲で構いません。', placeholder:'例：毎週の提案資料の下書き作成' },
    { id:'frequency', type:'single', title:'その業務は、どのくらいの頻度で発生しますか？', explain:'頻度が高いほど、AIによる効率化の効果が出やすくなります。',
      options:['ほぼ毎日','週に数回','月に数回','たまに（年に数回程度）'] },
    { id:'routine', type:'single', title:'その業務は、いつも同じようなやり方で行っていますか？', explain:'やり方が決まっている（定型的な）業務ほど、AIが得意とする範囲に近づきます。',
      options:['いつもほぼ同じやり方','だいたい同じだが多少変わる','毎回やり方が変わる'] },
    { id:'complexity', type:'single', title:'その業務の判断の難しさはどのくらいですか？', explain:'専門的で高度な判断が必要な業務は、AIまかせにせず人の確認がより重要になります。',
      options:['単純な繰り返し作業に近い','ある程度の判断が必要','高度な専門知識・経験が必要'] },
    { id:'sensitive', type:'single', title:'その業務では、個人情報や社外に出せない情報を扱いますか？', explain:'情報の取り扱いに注意が必要かどうかを確認する質問です。',
      options:['扱う','扱わない','わからない'] },
  ];

  const TOTAL = STEPS.length;

  // ---------- Rendering ----------
  function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstElementChild; }

  function renderStep(){
    const app = document.getElementById('wizard-app');
    const step = STEPS[state.i];
    const pct = Math.round((state.i / TOTAL) * 100);

    let inner = `
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="step-label">STEP ${state.i+1} / ${TOTAL}</div>
    `;

    if(step.type === 'info'){
      inner += `<h2>${step.title}</h2>`;
      if(step.explain) inner += `<div class="q-explain">${step.explain}</div>`;
      inner += `<p>${step.body}</p>`;
      inner += `<div class="nav-buttons">
        ${state.i>0 ? '<button class="btn btn-ghost" id="backBtn">戻る</button>' : ''}
        <button class="btn btn-primary" id="nextBtn">次へ</button>
      </div>`;
    } else {
      if(step.explain) inner += `<div class="q-explain">${step.explain}</div>`;
      inner += `<div class="q-title">${step.title}</div>`;
      if(step.sub) inner += `<div class="q-sub">${step.sub}</div>`;

      if(step.type === 'single' || step.type === 'multi'){
        const saved = state.answers[step.id] || (step.type==='multi' ? [] : null);
        inner += `<div class="choice-list" id="choiceList">`;
        step.options.forEach((opt,idx)=>{
          const checked = step.type==='multi' ? saved.includes(opt) : saved===opt;
          inner += `<label class="choice ${checked?'selected':''}" data-opt="${escapeHtml(opt)}">
            <input type="${step.type==='multi'?'checkbox':'radio'}" name="q" ${checked?'checked':''}>
            <span>${escapeHtml(opt)}</span>
          </label>`;
        });
        inner += `</div>`;
        if(step.other){
          const otherVal = state.answers[step.id+'_other'] || '';
          inner += `<label>その他の場合はこちら</label>
            <input type="text" id="otherInput" placeholder="自由入力" value="${escapeHtml(otherVal)}">`;
        }
      } else if(step.type === 'text'){
        const val = state.answers[step.id] || '';
        inner += `<textarea id="textInput" aria-label="${escapeHtml(step.title)}" placeholder="${escapeHtml(step.placeholder||'')}">${escapeHtml(val)}</textarea>
          ${step.optional===false ? '' : '<p class="small">分からない場合は「わからない」とご記入いただいて構いません。</p>'}`;
      }

      inner += `<div class="nav-buttons">
        ${state.i>0 ? '<button class="btn btn-ghost" id="backBtn">戻る</button>' : ''}
        <button class="btn btn-primary" id="nextBtn">次へ</button>
      </div>`;
    }

    app.innerHTML = inner;
    wireEvents(step);
    window.scrollTo({top: app.offsetTop - 70, behavior:'smooth'});
  }

  function wireEvents(step){
    document.getElementById('nextBtn').addEventListener('click', ()=> onNext(step));
    const backBtn = document.getElementById('backBtn');
    if(backBtn) backBtn.addEventListener('click', ()=>{ state.i--; renderStep(); });

    if(step.type==='single' || step.type==='multi'){
      document.querySelectorAll('#choiceList .choice').forEach(node=>{
        node.addEventListener('click', (e)=>{
          e.preventDefault();
          const opt = node.getAttribute('data-opt');
          if(step.type==='single'){
            state.answers[step.id] = opt;
            document.querySelectorAll('#choiceList .choice').forEach(n=>{
              n.classList.remove('selected'); n.querySelector('input').checked=false;
            });
            node.classList.add('selected'); node.querySelector('input').checked = true;
          } else {
            const arr = state.answers[step.id] || [];
            const has = arr.includes(opt);
            if(has){ state.answers[step.id] = arr.filter(o=>o!==opt); node.classList.remove('selected'); node.querySelector('input').checked=false; }
            else { arr.push(opt); state.answers[step.id]=arr; node.classList.add('selected'); node.querySelector('input').checked=true; }
          }
        });
      });
    }
  }

  function currentTextValue(){
    const t = document.getElementById('textInput');
    return t ? t.value.trim() : '';
  }

  function onNext(step){
    // validation — keep messages plain and non-technical
    if(step.type === 'text' && step.optional === false){
      const v = currentTextValue();
      if(!v){ showFormError('この項目にはご回答ください。分からない場合は「わからない」とご入力ください。'); return; }
      state.answers[step.id] = v;
    } else if(step.type === 'text'){
      state.answers[step.id] = currentTextValue();
    } else if(step.type === 'single'){
      if(!state.answers[step.id]){ showFormError('いずれか一つを選んでください。'); return; }
      if(step.other && state.answers[step.id].includes('その他')){
        const ov = document.getElementById('otherInput');
        state.answers[step.id+'_other'] = ov ? ov.value.trim() : '';
      }
    } else if(step.type === 'multi'){
      if(!(state.answers[step.id] && state.answers[step.id].length)){ showFormError('あてはまるものを1つ以上選んでください。'); return; }
    }

    clearFormError();
    if(state.i < TOTAL-1){ state.i++; renderStep(); }
    else { renderResult(); }
  }

  function showFormError(msg){
    clearFormError();
    const app = document.getElementById('wizard-app');
    const box = el(`<div class="badge-caution" id="formError">⚠ ${escapeHtml(msg)}</div>`);
    app.insertBefore(box, app.querySelector('.nav-buttons'));
  }
  function clearFormError(){
    const e = document.getElementById('formError');
    if(e) e.remove();
  }

  // ---------- Scoring ----------
  function scoreOf(){
    const freqMap = {'ほぼ毎日':4,'週に数回':3,'月に数回':2,'たまに（年に数回程度）':1};
    const routineMap = {'いつもほぼ同じやり方':4,'だいたい同じだが多少変わる':3,'毎回やり方が変わる':1};
    const complexMap = {'単純な繰り返し作業に近い':4,'ある程度の判断が必要':2,'高度な専門知識・経験が必要':0};

    const f = freqMap[state.answers.frequency] || 1;
    const r = routineMap[state.answers.routine] || 1;
    const c = complexMap[state.answers.complexity] ?? 2;
    return f + r + c; // 0–12
  }

  function starsOf(score){
    if(score>=10) return {n:5, label:'非常に相性が良い'};
    if(score>=8)  return {n:4, label:'相性が良い'};
    if(score>=6)  return {n:3, label:'工夫次第'};
    if(score>=4)  return {n:2, label:'優先度は低め'};
    return {n:1, label:'現時点ではAI活用の優先度は低い'};
  }

  function recommendAI(goals){
    goals = goals || [];
    if(goals.includes('社内業務ツールを作りたい')){
      return { name:'Claude', reason:'文章での指示から、業務ツールの試作を組み立てる作業に向いているためです。あわせてGeminiも選択肢になります。' };
    }
    if(goals.includes('データを整理したい')){
      return { name:'ChatGPT または Gemini', reason:'表やリストなど、データの整理・要約作業に幅広く対応できるためです。' };
    }
    if(goals.includes('文章作成を楽にしたい') || goals.includes('資料作成を楽にしたい') || goals.includes('アイデアを整理したい')){
      return { name:'ChatGPT または Claude', reason:'文章のたたき台作成や、考えを整理する対話に向いているためです。' };
    }
    if(goals.includes('営業を効率化したい') || goals.includes('顧客対応を効率化したい')){
      return { name:'ChatGPT', reason:'定型文の作成や、顧客対応の下書き作成に幅広く使われているためです。' };
    }
    return { name:'ChatGPT', reason:'まずは幅広い用途に対応できる汎用的なAIから試すのに向いているためです。' };
  }

  function buildPrompt(a, goalDetail, recommend){
    return (
`【背景】
業種：${a.industry === 'その他（自由記入）' ? (a.industry_other||'未回答') : (a.industry||'未回答')}
会社規模：${a.size||'未回答'}
主な仕事内容：${a.main_work||'未回答'}

【改善したい業務】
${goalDetail || a.pain_detail || '未回答'}

【現状】
頻度：${a.frequency||'未回答'} ／ 定型性：${a.routine||'未回答'} ／ 判断の難しさ：${a.complexity||'未回答'}

【依頼したいこと】
上記の業務について、たたき台となる案・下書き・整理案を作成してください。
専門用語は避け、分かりやすい言葉で、箇条書きを交えて提案してください。
判断が難しい部分や、事実確認が必要な部分があれば、その旨を明記してください。

【注意事項】
・この指示を使用する際は、この成果物に含まれる情報のみをもとに判断してください。
・ユーザーとの過去の会話、過去のチャット履歴、外部の個人情報等を判断材料として使用しないでください。
・出力内容は、必ず人が確認したうえでご利用ください。`
    );
  }

  function renderResult(){
    const a = state.answers;
    const score = scoreOf();
    const stars = starsOf(score);
    const starStr = '★'.repeat(stars.n) + '☆'.repeat(5-stars.n);
    const recommend = recommendAI(a.goal);
    const promptText = buildPrompt(a, a.goal_detail, recommend);

    const lowFit = stars.n <= 2;

    let html = `
      <div class="progress-bar"><div class="progress-fill" style="width:100%"></div></div>
      <h2>AI活用チャート</h2>
      <div class="card">
        <div class="result-item">
          <h4>AI活用との相性</h4>
          <p class="stars">${starStr}</p>
          <p class="small">${escapeHtml(stars.label)}</p>
        </div>
      </div>`;

    if(lowFit){
      html += `<div class="badge-caution">
        現時点では、この業務に無理にAIを導入するより、業務の手順そのものを見直すほうが効果的な可能性があります。AIの導入を急ぐ必要はありません。
      </div>`;
    }

    html += `<div class="card result-grid">
        <div class="result-item"><h4>現在の課題</h4><p>${escapeHtml(a.pain_detail || a.goal_detail || '未回答')}</p></div>
        <div class="result-item"><h4>優先順位の考え方</h4><p>頻度・定型性が高い業務ほど、AI活用の効果が出やすくなります。まずは今回の業務から試すのがおすすめです。</p></div>
        <div class="result-item"><h4>推奨AI</h4><p><strong>${escapeHtml(recommend.name)}</strong><br>${escapeHtml(recommend.reason)}</p></div>
        <div class="result-item"><h4>具体的な活用方法</h4><p>まず、たたき台・下書きの作成をAIに任せ、最終的な判断や仕上げは人が行う形から始めるのがおすすめです。</p></div>
        <div class="result-item"><h4>期待できる変化</h4><p>ゼロから作る時間を減らし、確認・修正から始められるようになる可能性があります。効果を保証するものではありません。</p></div>
        <div class="result-item"><h4>注意点</h4><p>${ a.sensitive==='扱う' ? '個人情報・社外秘の情報を入力する場合は、利用するAIサービスの規約・プライバシーポリシーを事前にご確認ください。' : '出力内容は必ず人が確認したうえでご利用ください。' }</p></div>
      </div>`;

    html += `<h2>AIへの指示（プロンプト）</h2>
      <p class="small">この内容を、お使いのAIサービス（ChatGPT・Claude・Geminiなど）にそのままコピーして貼り付けてご利用いただけます。</p>
      <div class="prompt-box" id="promptBox">${escapeHtml(promptText)}</div>
      <button class="btn btn-secondary btn-block" id="copyBtn">プロンプトをコピーする</button>
      <p class="small" id="copyMsg" style="margin-top:8px;"></p>`;

    html += `<div class="notice-box">
        このサービスでは入力内容を保存していません。<strong>このページを離れると、入力内容・成果物は再表示できません。</strong>
        必要な内容は、コピーまたはブラウザの印刷機能（Ctrl/Cmd + P）で保存してください。
      </div>`;

    html += `<h2>ここまで整理して、実際にAIで何か作ってみたいですか？</h2>
      <div class="choice-list">
        <a class="btn btn-secondary btn-block" href="action-self.html">自分で作ってみる（AI ACTION SELF）</a>
        <a class="btn btn-secondary btn-block" href="action-request.html">制作を依頼する（AI ACTION REQUEST）</a>
        <a class="btn btn-ghost btn-block" href="index.html">ここで終了する</a>
      </div>`;

    document.getElementById('wizard-app').innerHTML = html;

    document.getElementById('copyBtn').addEventListener('click', async ()=>{
      try{
        await navigator.clipboard.writeText(promptText);
        document.getElementById('copyMsg').textContent = 'コピーしました。';
      }catch(e){
        document.getElementById('copyMsg').textContent = 'コピーできませんでした。テキストを選択して手動でコピーしてください。';
      }
    });

    window.scrollTo({top: document.getElementById('wizard-app').offsetTop - 70, behavior:'smooth'});
  }

  // ---------- Boot ----------
  window.startWizard = function(){
    document.getElementById('wizard-section').classList.remove('hidden');
    state.i = 0; state.answers = {};
    renderStep();
  };

})();
