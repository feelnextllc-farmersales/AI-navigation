// action-self.js — AI ACTION SELF questionnaire
// In-memory state only; nothing persisted.

(function(){
  const state = { i:0, answers:{} };

  const STEPS = [
    { id:'what', type:'single', title:'何を作りたいですか？', explain:'まずは大まかな方向性を確認します。',
      options:['資料作成の仕組み','営業文章の作成','SNS投稿の作成','業務効率化の仕組み','社内業務ツール','顧客対応の下書き','データ整理の仕組み','簡易Webツール','その他'] },
    { id:'who', type:'text', title:'誰が使いますか？', placeholder:'例：営業担当2名', explain:'利用者を具体的にすることで、内容を使いやすく整理します。' },
    { id:'input', type:'text', title:'AIに何を入力しますか？', placeholder:'例：商品名、価格、特徴のメモ' },
    { id:'output', type:'text', title:'AIにどんな結果を出してほしいですか？', placeholder:'例：SNS投稿用の文章3案' },
    { id:'current', type:'text', title:'今は、どうやって行っていますか？', placeholder:'例：担当者が都度ゼロから作成している' },
    { id:'problem', type:'text', title:'何が問題だと感じていますか？', placeholder:'例：時間がかかる、表現がばらつく' },
    { id:'ideal', type:'text', title:'理想の状態を教えてください', placeholder:'例：5分程度でたたき台ができる状態' },
    { id:'features', type:'text', title:'必要だと思う機能があれば教えてください（なければ「特になし」で構いません）' },
    { id:'env', type:'single', title:'どこで使う予定ですか？', options:['パソコンのみ','スマートフォンのみ','パソコン・スマートフォン両方'] },
    { id:'storage', type:'single', title:'作成した内容をデータとして保存しておく必要はありますか？', options:['必要','不要','わからない'] },
    { id:'integration', type:'text', title:'外部サービスとの連携が必要であれば教えてください（例：メール、スプレッドシート等／なければ「なし」）' },
    { id:'reference', type:'text', title:'参考にしたいサービスやイメージがあれば教えてください（なければ「なし」）' },
    { id:'design', type:'text', title:'デザインの希望があれば教えてください（なければ「特になし」）' },
    { id:'frequency', type:'single', title:'どのくらいの頻度で使う予定ですか？', options:['ほぼ毎日','週に数回','月に数回','たまに'] },
    { id:'users', type:'single', title:'何人くらいで使う予定ですか？', options:['1人','2〜5人','6〜20人','21人以上'] },
  ];
  const TOTAL = STEPS.length;

  function renderStep(){
    const app = document.getElementById('wizard-app');
    const step = STEPS[state.i];
    const pct = Math.round((state.i/TOTAL)*100);
    let html = `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="step-label">STEP ${state.i+1} / ${TOTAL}</div>`;
    if(step.explain) html += `<div class="q-explain">${step.explain}</div>`;
    html += `<div class="q-title">${step.title}</div>`;

    if(step.type==='single'){
      const saved = state.answers[step.id];
      html += `<div class="choice-list" id="choiceList">`;
      step.options.forEach(opt=>{
        const checked = saved===opt;
        html += `<label class="choice ${checked?'selected':''}" data-opt="${escapeHtml(opt)}">
          <input type="radio" name="q" ${checked?'checked':''}><span>${escapeHtml(opt)}</span></label>`;
      });
      html += `</div>`;
    } else {
      const val = state.answers[step.id] || '';
      html += `<textarea id="textInput" aria-label="${escapeHtml(step.title)}" placeholder="${escapeHtml(step.placeholder||'')}">${escapeHtml(val)}</textarea>`;
    }

    html += `<div class="nav-buttons">
      ${state.i>0 ? '<button class="btn btn-ghost" id="backBtn">戻る</button>' : ''}
      <button class="btn btn-primary" id="nextBtn">次へ</button>
    </div>`;

    app.innerHTML = html;
    document.getElementById('nextBtn').addEventListener('click', ()=>onNext(step));
    const backBtn = document.getElementById('backBtn');
    if(backBtn) backBtn.addEventListener('click', ()=>{ state.i--; renderStep(); });
    if(step.type==='single'){
      document.querySelectorAll('#choiceList .choice').forEach(node=>{
        node.addEventListener('click', e=>{
          e.preventDefault();
          document.querySelectorAll('#choiceList .choice').forEach(n=>{ n.classList.remove('selected'); n.querySelector('input').checked=false; });
          node.classList.add('selected'); node.querySelector('input').checked=true;
          state.answers[step.id] = node.getAttribute('data-opt');
        });
      });
    }
    window.scrollTo({top: app.offsetTop-70, behavior:'smooth'});
  }

  function onNext(step){
    if(step.type==='text'){
      const t = document.getElementById('textInput');
      state.answers[step.id] = t ? t.value.trim() : '';
      if(!state.answers[step.id]){ showFormError('この項目にはご回答ください。特になければ「特になし」等とご入力ください。'); return; }
    } else if(step.type==='single'){
      if(!state.answers[step.id]){ showFormError('いずれか一つを選んでください。'); return; }
    }
    clearFormError();
    if(state.i < TOTAL-1){ state.i++; renderStep(); } else { renderResult(); }
  }

  function showFormError(msg){
    clearFormError();
    const app = document.getElementById('wizard-app');
    const box = document.createElement('div');
    box.className='badge-caution'; box.id='formError'; box.textContent='⚠ '+msg;
    app.insertBefore(box, app.querySelector('.nav-buttons'));
  }
  function clearFormError(){ const e=document.getElementById('formError'); if(e) e.remove(); }

  function buildPrompt(a){
    return (
`【作りたいもの】
${a.what}

【利用者】
${a.who}

【入力する情報】
${a.input}

【出力してほしい内容】
${a.output}

【現在の方法】
${a.current}

【現在の問題点】
${a.problem}

【理想の状態】
${a.ideal}

【必要な機能】
${a.features}

【利用環境】
${a.env}／保存の必要性：${a.storage}
外部連携：${a.integration}
参考イメージ：${a.reference}
デザイン希望：${a.design}
利用頻度：${a.frequency}／利用人数：${a.users}

【依頼したいこと】
上記の内容をもとに、実際に使えるたたき台（文章・構成・簡易的な仕組みなど）を作成してください。
専門用語は避け、分かりやすい言葉で、手順が分かるように示してください。

【注意事項】
・この指示を使用する際は、この成果物に含まれる情報のみをもとに判断してください。
・ユーザーとの過去の会話、過去のチャット履歴、外部の個人情報等を判断材料として使用しないでください。
・出力内容は、必ず人が確認したうえでご利用ください。`
    );
  }

  function renderResult(){
    const a = state.answers;
    const promptText = buildPrompt(a);
    let html = `<div class="progress-bar"><div class="progress-fill" style="width:100%"></div></div>
      <h2>AIへの詳細な制作指示</h2>
      <p class="small">この内容を、お使いのAIサービス（ChatGPT・Claude・Geminiなど）にそのままコピーして貼り付けてご利用ください。</p>
      <div class="prompt-box" id="promptBox">${escapeHtml(promptText)}</div>
      <button class="btn btn-secondary btn-block" id="copyBtn">コピーする</button>
      <p class="small" id="copyMsg" style="margin-top:8px;"></p>
      <div class="notice-box">
        このサービスでは入力内容を保存していません。<strong>このページを離れると、内容は再表示できません。</strong>
        必要な内容は、コピーまたはブラウザの印刷機能で保存してください。
      </div>
      <h2>ご自身で作るのが難しそうな場合</h2>
      <p>内容を整理した結果、制作をお任せしたい場合は、AI ACTION REQUESTもご利用いただけます。</p>
      <a class="btn btn-secondary btn-block" href="action-request.html">制作を依頼する（AI ACTION REQUEST）</a>
      <a class="btn btn-ghost btn-block" href="index.html">ここで終了する</a>`;
    document.getElementById('wizard-app').innerHTML = html;
    document.getElementById('copyBtn').addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(promptText); document.getElementById('copyMsg').textContent='コピーしました。'; }
      catch(e){ document.getElementById('copyMsg').textContent='コピーできませんでした。テキストを選択して手動でコピーしてください。'; }
    });
    window.scrollTo({top: document.getElementById('wizard-app').offsetTop-70, behavior:'smooth'});
  }

  window.startSelfWizard = function(){
    document.getElementById('wizard-section').classList.remove('hidden');
    state.i=0; state.answers={};
    renderStep();
  };
})();
