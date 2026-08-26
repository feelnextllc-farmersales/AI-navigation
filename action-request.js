// action-request.js — AI ACTION REQUEST questionnaire
// In-memory state only; nothing persisted. No payment is taken before the
// operator has reviewed the request and issued a quote (see spec section 6/7).

(function(){
  const state = { i:0, answers:{} };

  const STEPS = [
    { id:'purpose', type:'text', title:'作りたいものの目的を教えてください', placeholder:'例：見積書を自動的に整形するツールが欲しい' },
    { id:'users', type:'text', title:'誰が使いますか？', placeholder:'例：営業担当3名' },
    { id:'flow', type:'text', title:'現在の業務の流れを簡単に教えてください', placeholder:'例：Excelに入力→手作業でPDF化→メール送付' },
    { id:'input', type:'text', title:'入力する情報は何ですか？' },
    { id:'process', type:'text', title:'どのような処理をしてほしいですか？' },
    { id:'output', type:'text', title:'出力してほしい内容は何ですか？' },
    { id:'screens', type:'text', title:'必要な画面があれば教えてください（例：入力画面、一覧画面）' },
    { id:'features', type:'text', title:'必要な機能を教えてください' },
    { id:'data', type:'text', title:'扱うデータについて教えてください（種類・量など）' },
    { id:'permission', type:'text', title:'利用者ごとに権限（見られる範囲）を分ける必要はありますか？' },
    { id:'login', type:'single', title:'ログイン機能は必要ですか？', options:['必要','不要','わからない'] },
    { id:'storage', type:'single', title:'データの保存が必要ですか？', options:['必要','不要','わからない'] },
    { id:'integration', type:'text', title:'外部サービスとの連携は必要ですか？（なければ「なし」）' },
    { id:'design', type:'text', title:'デザインの希望があれば教えてください（なければ「特になし」）' },
    { id:'devices', type:'single', title:'対応させたい端末を教えてください', options:['パソコンのみ','スマートフォンのみ','パソコン・スマートフォン両方'] },
    { id:'publish', type:'single', title:'公開方法について教えてください', options:['社内のみで利用','一般公開する','わからない'] },
    { id:'operation', type:'text', title:'公開後の運用について、想定していることがあれば教えてください（なければ「特になし」）' },
    { id:'deadline', type:'text', title:'希望の納期があれば教えてください（なければ「特になし」）' },
    { id:'reference', type:'text', title:'参考にしたいサイトやサービスがあれば教えてください（なければ「なし」）' },
    { id:'quality', type:'text', title:'品質面で重視したいことがあれば教えてください（なければ「特になし」）' },
  ];
  const TOTAL = STEPS.length;

  function renderStep(){
    const app = document.getElementById('wizard-app');
    const step = STEPS[state.i];
    const pct = Math.round((state.i/TOTAL)*100);
    let html = `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="step-label">STEP ${state.i+1} / ${TOTAL}</div>
      <div class="q-title">${step.title}</div>`;

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
      html += `<textarea id="textInput" aria-label="${escapeHtml(step.title)}">${escapeHtml(val)}</textarea>`;
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

  // Internal feasibility classification (A/B/C/D) — never shown verbatim to the user.
  function classify(a){
    let score = 0;
    if(a.login==='必要') score++;
    if(a.storage==='必要') score++;
    if(a.devices==='パソコン・スマートフォン両方') score++;
    if(a.integration && a.integration!=='なし') score++;
    if(a.publish==='一般公開する') score++;
    if(score<=1) return 'A';
    if(score<=2) return 'B';
    if(score<=3) return 'C';
    return 'D';
  }

  function buildSpecSheet(a){
    return (
`■ 制作依頼用仕様書

【目的】 ${a.purpose}
【利用者】 ${a.users}
【現在の業務フロー】 ${a.flow}
【入力】 ${a.input}
【処理】 ${a.process}
【出力】 ${a.output}
【画面】 ${a.screens}
【機能】 ${a.features}
【データ】 ${a.data}
【権限】 ${a.permission}
【ログイン】 ${a.login}
【データ保存】 ${a.storage}
【外部連携】 ${a.integration}
【デザイン希望】 ${a.design}
【対応端末】 ${a.devices}
【公開方法】 ${a.publish}
【運用方法】 ${a.operation}
【希望納期】 ${a.deadline}
【参考サイト】 ${a.reference}
【品質面での重視点】 ${a.quality}`
    );
  }

  function buildImplPrompt(a){
    return (
`【実装用AIへの指示】
以下の仕様をもとに、実装方針・画面構成・必要な処理を分かりやすく提案してください。

${buildSpecSheet(a)}

【依頼したいこと】
上記をもとに、実装の進め方・必要な技術・画面構成の案を、専門用語をできるだけ避けて説明してください。
不明点がある場合は、その旨を明記してください。

【注意事項】
・この指示を使用する際は、この成果物に含まれる情報のみをもとに判断してください。
・ユーザーとの過去の会話、過去のチャット履歴、外部の個人情報等を判断材料として使用しないでください。
・出力内容は、必ず人が確認したうえでご利用ください。`
    );
  }

  function renderResult(){
    const a = state.answers;
    const spec = buildSpecSheet(a);
    const impl = buildImplPrompt(a);
    classify(a); // internal use only (e.g. for operator triage); intentionally not surfaced

    const subject = encodeURIComponent('AI ACTION REQUEST 制作依頼');
    const body = encodeURIComponent(spec + '\n\n---\nお名前・ご連絡先：\n');
    const mailto = `mailto:feelnext.llc@gmail.com?subject=${subject}&body=${body}`;

    let html = `<div class="progress-bar"><div class="progress-fill" style="width:100%"></div></div>
      <h2>制作依頼用仕様書</h2>
      <div class="prompt-box" id="specBox">${escapeHtml(spec)}</div>
      <button class="btn btn-secondary btn-block" id="copySpecBtn">仕様書をコピーする</button>
      <p class="small" id="copySpecMsg" style="margin-top:8px;"></p>

      <h2>実装用AIへの指示</h2>
      <p class="small">ご自身で実現方法を検討したい場合にご利用いただけます。</p>
      <div class="prompt-box" id="implBox">${escapeHtml(impl)}</div>
      <button class="btn btn-secondary btn-block" id="copyImplBtn">指示をコピーする</button>
      <p class="small" id="copyImplMsg" style="margin-top:8px;"></p>

      <div class="notice-box">
        このサービスでは入力内容を保存していません。<strong>このページを離れると、内容は再表示できません。</strong>
        必要な内容は、コピーまたはブラウザの印刷機能で保存してください。
      </div>

      <h2>制作を依頼する場合</h2>
      <p>下のボタンから、上記の仕様書を添えて依頼内容をお送りください。内容を確認のうえ、実現方法・制作可否・お見積もりを担当者よりご案内します。</p>
      <a class="btn btn-primary btn-block" href="${mailto}">仕様書を添えて依頼する（メールが開きます）</a>
      <p class="small" style="margin-top:10px;">
        お見積もりにご納得いただけましたら、制作着手・準備費（55,000円（税込）〜）のお支払いをご案内します。
        この費用は、ヒアリング内容の確認・要件整理・実現可能性の確認・制作環境の準備等に充てられる前受け費用であり、
        お客様都合によるキャンセルの場合、原則として返金いたしかねます。
      </p>
      <a class="btn btn-ghost btn-block" href="index.html">ここで終了する</a>`;

    document.getElementById('wizard-app').innerHTML = html;
    document.getElementById('copySpecBtn').addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(spec); document.getElementById('copySpecMsg').textContent='コピーしました。'; }
      catch(e){ document.getElementById('copySpecMsg').textContent='コピーできませんでした。テキストを選択して手動でコピーしてください。'; }
    });
    document.getElementById('copyImplBtn').addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(impl); document.getElementById('copyImplMsg').textContent='コピーしました。'; }
      catch(e){ document.getElementById('copyImplMsg').textContent='コピーできませんでした。テキストを選択して手動でコピーしてください。'; }
    });
    window.scrollTo({top: document.getElementById('wizard-app').offsetTop-70, behavior:'smooth'});
  }

  window.startRequestWizard = function(){
    document.getElementById('wizard-section').classList.remove('hidden');
    state.i=0; state.answers={};
    renderStep();
  };
})();
