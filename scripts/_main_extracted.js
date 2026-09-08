

const CHIPS = ["全部","典型抗精神病药","非典型抗精神病药","抗抑郁药","心境稳定剂","抗焦虑药","催眠药","兴奋剂","抗帕金森药","抗痴呆药","β受体阻滞剂","相关药物"];
let activeChip = "全部";
let detailFrom = "library";

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on', t.dataset.tab===id));
  if(id==='library'){ GAM.visitedLib=true; saveGam(); renderLibrary(); renderChips(); checkBadges(); }
  if(id==='home'){ renderHomePills(); updateSRSHomeUI(); }
  if(id==='study'){ renderStudy(); updateSRSHomeUI(); }
  if(id==='interact'){ ensureInteractOptions(); }
  updateGamUI();
  document.getElementById(id).scrollTop = 0;
}

function renderHomePills(){
  const counts = {};
  DRUGS.forEach(d=>counts[d.cls]=(counts[d.cls]||0)+1);
  const map = {
    "抗抑郁药":{e:"🟦",c:"var(--c-anti-soft)"},
    "抗精神病药":{e:"🟪",c:"var(--c-psy-soft)"},
    "心境稳定剂":{e:"🟧",c:"var(--c-mood-soft)"},
    "抗焦虑药":{e:"🟩",c:"var(--c-anx-soft)"},
    "催眠药":{e:"🟣",c:"var(--c-hyp-soft)"},
    "兴奋剂":{e:"🟥",c:"var(--c-stim-soft)"},
    "抗帕金森药":{e:"⬜",c:"var(--c-other-soft)"},
    "抗痴呆药":{e:"⬜",c:"var(--c-other-soft)"},
    "β受体阻滞剂":{e:"⬜",c:"var(--c-other-soft)"},
    "相关药物":{e:"⬜",c:"var(--c-other-soft)"}
  };
  const wrap = document.getElementById('homePills');
  wrap.innerHTML='';
  Object.keys(map).forEach(k=>{
    const d=map[k];
    const el=document.createElement('div');
    el.className='pill';
    el.innerHTML=`<div class="ic" style="background:${d.c}">${d.e}</div><div class="nm">${k.replace('药','')}</div><div class="ct">${counts[k]||0} 种</div>`;
    el.onclick=()=>{activeChip=k;showScreen('library');};
    wrap.appendChild(el);
  });
}

function homeSearchGo(){
  const q=document.getElementById('homeSearch').value.trim();
  if(!q) return;
  document.getElementById('searchInput').value=q;
  activeChip='全部';
  showScreen('library');
}
function homeSearchFocus(){
  document.getElementById('homeSearch').focus();
}

function renderChips(){
  const wrap=document.getElementById('chips');
  wrap.innerHTML='';
  CHIPS.forEach(c=>{
    const el=document.createElement('div');
    el.className='chip'+(c===activeChip?' on':'');
    el.textContent=c;
    el.onclick=()=>{activeChip=c;renderChips();renderLibrary();};
    wrap.appendChild(el);
  });
}

function renderLibrary(){
  const q=(document.getElementById('searchInput').value||'').toLowerCase();
  const list=document.getElementById('drugList');
  list.innerHTML='';
  const filtered=DRUGS.filter(d=>{
    const matchChip = activeChip==='全部' || d.tag===activeChip || d.cls===activeChip;
    const matchQ = !q || (d.zh+d.en+d.cls+d.sub+d.ind.join('')).toLowerCase().includes(q);
    return matchChip && matchQ;
  });
  if(filtered.length===0){
    list.innerHTML='<div style="text-align:center;color:var(--text-3);padding:40px 0;font-size:13px;">未找到匹配的药物</div>';
    return;
  }
  filtered.forEach(d=>{
    const el=document.createElement('div');
    el.className='drug';
    el.innerHTML=`
      <div class="dot" style="background:${d.color}">${d.emoji}</div>
      <div class="info">
        <div class="zh">${d.zh}</div>
        <div class="en">${d.en}</div>
        <span class="cls" style="background:${d.soft};color:${d.color}">${d.cls} · ${d.sub}</span>
      </div>
      <div class="chev">›</div>`;
    el.onclick=()=>openDrug(d.zh);
    list.appendChild(el);
  });
}

function openDrug(zh){
  const d=DRUGS.find(x=>x.zh===zh);
  if(!d) return;
  detailFrom='library';
  document.getElementById('dName').textContent=d.zh;
  document.getElementById('dEn').textContent=d.en;
  const badge=document.getElementById('dBadge');
  badge.textContent=`${d.cls} · ${d.sub}`;
  badge.style.background=d.soft; badge.style.color=d.color;
  document.getElementById('fCat').textContent=d.sub;
  document.getElementById('fHalf').textContent=d.half;
  document.getElementById('fPreg').textContent=d.preg;
  document.getElementById('dMech').textContent=d.mech;
  document.getElementById('dInd').innerHTML=d.ind.map(i=>`<li>${i}</li>`).join('');
  document.getElementById('dSide').innerHTML=d.side.map(i=>`<li>${i}</li>`).join('');
  document.getElementById('dDose').textContent=d.dose;
  document.getElementById('dWarn').textContent=d.warn;
  const nb=document.getElementById('noteBlock');
  if(d.note){ nb.style.display='block'; document.getElementById('dNote').textContent=d.note; } else { nb.style.display='none'; }
  showScreen('detail');
}

function historyBack(){ showScreen(detailFrom); }

/* Interaction */
/* 药物分类映射（用于 class-based 相互作用查询） */
const CLASS_MAP = {
  "SSRI":       ["草酸艾司西酞普兰","氟西汀","舍曲林","帕罗西汀","西酞普兰"],
  "SNRI":       ["度洛西汀","文拉法辛"],
  "TCA":        ["阿米替林","丙米嗪"],
  "苯二氮䓬":   ["阿普唑仑","艾司唑仑","地西泮","劳拉西泮"],
  "Z类":        ["思诺思","佐匹克隆"],
  "非典型AP":   ["阿立哌唑","氨磺必利","奥氮平","喹硫平","利培酮","氯氮平","帕利哌酮","齐拉西酮","布南色林","舒必利"],
  "典型AP":     ["氯丙嗪","氟哌啶醇","氟哌噻吨"],
  "抗帕金森":   ["苯海索"],
  "β阻滞":      ["普萘洛尔"]
};
function getClassKeys(drug){
  const out=[drug];
  for(const [cls,drugs] of Object.entries(CLASS_MAP)){
    if(drugs.includes(drug)) out.push(cls);
  }
  return out;
}
const SEV = {
  "禁忌":{bg:"var(--warn-soft)",color:"var(--warn)"},
  "严重":{bg:"#FCE9D9",color:"#B5611E"},
  "中等":{bg:"#F8F0DC",color:"#8A6212"},
  "轻微":{bg:"var(--surface-2)",color:"var(--text-2)"},
  "无明显":{bg:"var(--accent-soft)",color:"var(--accent)"}
};
const PAIRS = {
  /* ═══ SSRI + 其他 ═══ */
  "阿普唑仑|舍曲林":["中等","SSRI 与苯二氮䓬类联用较常见，注意叠加镇静及 5-HT 相关风险，老年尤须防跌倒。"],
  "地西泮|舍曲林":["中等","同上，联用关注镇静叠加与跌倒风险。"],
  "舍曲林|碳酸锂":["中等","联用监测 5-羟色胺综合征与血锂浓度。"],
  "文拉法辛|舍曲林":["严重","两药均作用于 5-HT，避免联用以免 5-羟色胺综合征。"],
  "文拉法辛|氟西汀":["严重","同上，SSRI 与 SNRI 避免联用。"],
  "文拉法辛|碳酸锂":["中等","监测 5-羟色胺综合征与神经毒性。"],
  "卡马西平|舍曲林":["轻微","卡马西平可能轻度降低 SSRI 血药浓度。"],
  "氟西汀|碳酸锂":["严重","SSRI 可升高血锂并增加 5-羟色胺综合征风险，联用须监测血锂与神经毒性。"],
  "氟西汀|奥氮平":["轻微","常联用增效，监测代谢与体重。"],
  "舍曲林|奥氮平":["轻微","常联用，监测代谢。"],
  /* ═══ 帕罗西汀新增 ═══ */
  "帕罗西汀|阿米替林":["严重","帕罗西汀强效抑制 CYP2D6，显著升高 TCA 血浓度至中毒风险，避免联用或大幅减量 TCA。"],
  "帕罗西汀|丙米嗪":["严重","同上，CYP2D6 抑制致 TCA 血浓度升高，注意中毒风险（QT 延长、抗胆碱）。"],
  "帕罗西汀|阿立哌唑":["中等","帕罗西汀通过 CYP2D6 抑制升高阿立哌唑血浓度，需减量约 50%。"],
  "帕罗西汀|利培酮":["中等","CYP2D6 抑制导致利培酮浓度升高，监测 EPS 与催乳素。"],
  "帕罗西汀|安非他酮":["中等","两药均经 CYP2D6 代谢，帕罗西汀可升高安非他酮浓度，增加癫痫风险。"],
  "帕罗西汀|地西泮":["轻微","叠加镇静作用，初期防跌倒。"],
  "帕罗西汀|华法林":["中等","SSRI 抑制血小板聚集 + CYP2D6 抑制，增加出血风险，监测 INR。"],
  /* ═══ 西酞普兰新增 ═══ */
  "西酞普兰|阿米替林":["中等","两药均有 QT 延长风险，叠加致心律失常概率升高，监测 ECG。"],
  "西酞普兰|齐拉西酮":["严重","两药均有显著 QT 延长风险，禁忌联用。"],
  "西酞普兰|碳酸锂":["中等","联用增加 5-羟色胺综合征及 QT 延长风险。"],
  "西酞普兰|氟哌啶醇":["中等","QT 延长叠加，监测 ECG。"],
  /* ═══ 安非他酮新增 ═══ */
  "安非他酮|卡马西平":["中等","卡马西平诱导 CYP2B6，降低安非他酮血药浓度。"],
  "安非他酮|氯氮平":["严重","两药均降低癫痫阈，叠加致痫风险显著，避免联用。"],
  "安非他酮|MAOI":["禁忌","安非他酮与 MAOI 联用增加高血压危象与癫痫风险，需 14 天洗脱期。"],
  "安非他酮|氟西汀":["中等","CYP2D6 相互作用，监测血药浓度。"],
  "安非他酮|碳酸锂":["轻微","可联用，注意癫痫阈变化。"],
  /* ═══ TCA 类新增 ═══ */
  "阿米替林|MAOI":["禁忌","TCA 与 MAOI 联用可致 5-羟色胺综合征与高血压危象，需要 14 天洗脱期。"],
  "丙米嗪|MAOI":["禁忌","同上，禁忌联用。"],
  "阿米替林|氟西汀":["中等","氟西汀抑制 CYP2D6 升高 TCA 血药浓度，监测 TCA 毒性（QT、抗胆碱）。"],
  "丙米嗪|卡马西平":["中等","卡马西平诱导 CYP3A4，降低丙米嗪血药浓度，需调整剂量。"],
  "阿米替林|氯丙嗪":["中等","两药均有抗胆碱作用，叠加口干、便秘、视力模糊；QT 延长风险。"],
  "阿米替林|普萘洛尔":["轻微","β 受体阻滞可加重 TCA 的心脏传导抑制。"],
  "丙米嗪|舍曲林":["中等","SSRI 轻度升高 TCA 浓度，注意毒性反应。"],
  /* ═══ 抗精神病药 ═══ */
  "齐拉西酮|氟哌啶醇":["严重","两药均有 QT 延长风险，避免联用或密切监测 QTc。"],
  "齐拉西酮|西酞普兰":["严重","同上，QT 延长叠加，禁忌。"],
  "齐拉西酮|卡马西平":["中等","卡马西平诱导 CYP3A4，降低齐拉西酮血药浓度。"],
  "齐拉西酮|利尿剂":["中等","利尿剂致低钾血症，加重 QT 延长风险。"],
  "布南色林|卡马西平":["中等","CYP3A4 诱导降低布南色林血药浓度。"],
  "布南色林|帕罗西汀":["轻微","CYP3A4 轻度抑制，注意浓度波动。"],
  "舒必利|左旋多巴":["中等","舒必利阻断 D2 受体，对抗左旋多巴效果。"],
  "舒必利|碳酸锂":["中等","联用增加神经毒性风险（震颤、共济失调）。"],
  "舒必利|QT延长药":["中等","舒必利可延长 QT，与西酞普兰/齐拉西酮/氟哌啶醇联用叠加风险。"],
  "氟哌噻吨|左旋多巴":["中等","D2 拮抗对抗左旋多巴效果。"],
  "氟哌噻吨|卡马西平":["中等","酶诱导降低氟哌噻吨血药浓度。"],
  "氟哌噻吨|氟西汀":["中等","CYP2D6 抑制可能升高氟哌噻吨浓度。"],
  /* ═══ 心境稳定剂 ═══ */
  "碳酸锂|丙戊酸钠":["中等","联用常见但需监测神经毒性、甲状腺功能与肾功能。"],
  "碳酸锂|卡马西平":["中等","均影响认知/肾脏，联用监测毒性。"],
  "丙戊酸钠|卡马西平":["中等","酶诱导相互降低血药浓度，且叠加肝毒性，监测肝功能与浓度。"],
  "卡马西平|奥氮平":["中等","卡马西平诱导肝酶，降低奥氮平血药浓度。"],
  "卡马西平|氯氮平":["禁忌","卡马西平显著降低氯氮平浓度并增加粒细胞缺乏风险，避免联用。"],
  "卡马西平|阿立哌唑":["中等","降低阿立哌唑血药浓度，需调整剂量。"],
  "碳酸锂|NSAIDs":["严重","NSAIDs（布洛芬/吲哚美辛/双氯芬酸等）减少锂排泄，血锂升高至中毒水平。"],
  "碳酸锂|噻嗪利尿剂":["严重","噻嗪类利尿剂显著升高血锂，避免联用或极密切监测。"],
  "碳酸锂|ACEI/ARB":["严重","ACEI/ARB 可升高血锂，联用监测血锂浓度。"],
  "托吡酯|丙戊酸钠":["中等","联用增加高氨血症风险（即使肝功能正常），注意意识改变。"],
  "托吡酯|卡马西平":["中等","酶诱导降低托吡酯血药浓度 50%，需调整剂量。"],
  "托吡酯|碳酸锂":["轻微","可联用，注意肾结石风险叠加。"],
  /* ═══ 镇静/呼吸 ═══ */
  "地西泮|奥氮平":["中等","叠加镇静、呼吸抑制与跌倒风险。"],
  "地西泮|喹硫平":["中等","同上，镇静与呼吸抑制风险叠加。"],
  "阿普唑仑|奥氮平":["中等","同上。"],
  "阿普唑仑|喹硫平":["中等","同上。"],
  "米氮平|地西泮":["中等","叠加镇静，注意跌倒。"],
  "氯氮平|苯二氮䓬":["严重","氯氮平与苯二氮䓬类联用增加呼吸抑制/循环虚脱罕见但致命风险。"],
  /* ═══ 抗痴呆药 ═══ */
  "多奈哌齐|抗胆碱药":["中等","抗胆碱药（苯海索、TCA）对抗胆碱酯酶抑制效果，降低疗效。"],
  "加兰他敏|抗胆碱药":["中等","同上，机制拮抗。"],
  "多奈哌齐|NSAIDs":["中等","增加消化道出血风险（胃酸分泌增多 + 血小板抑制）。"],
  "加兰他敏|NSAIDs":["中等","同上。"],
  "美金刚|金刚烷胺":["中等","NMDA 拮抗叠加，增加头晕/精神错乱风险。"],
  /* ═══ 纳曲酮 ═══ */
  "纳曲酮|阿片类":["严重","纳曲酮阻断阿片受体，可诱发急性阿片戒断（危重），必须在阿片完全清除后方可启动。"],
  "纳曲酮|肝毒性药":["中等","纳曲酮具肝毒性，与肝毒性药联用监测肝功能。"],
  /* ═══ 其他交叉 ═══ */
  "阿立哌唑|奥氮平":["轻微","可联用，注意叠加代谢风险。"],
  "卡马西平|激素避孕":["严重","卡马西平诱导 CYP3A4 降低激素浓度，导致避孕失败，推荐非激素屏障法。"],
  "卡马西平|华法林":["严重","酶诱导显著降低华法林抗凝效果，需监测 INR 并上调剂量。"],
  "丙戊酸钠|阿司匹林":["中等","阿司匹林置换蛋白结合丙戊酸，升高游离丙戊酸浓度，监测毒性。"],
  "文拉法辛|MAOI":["禁忌","SNRI 与 MAOI 联用可致致命性 5-羟色胺综合征，需 14 天洗脱期。"]
};
function getInteraction(a,b){
  if(a===b) return ["轻微","选择了同一种药物，无需评估相互作用；但注意单药过量与停药反应。"];
  const k=keyOf(a,b);
  if(PAIRS[k]) return PAIRS[k];
  // Fallback: class-based matching
  const ca=getClassKeys(a), cb=getClassKeys(b);
  for(const caa of ca) for(const cbb of cb){
    const ck=keyOf(caa,cbb);
    if(PAIRS[ck] && ck!==k) return PAIRS[ck];
  }
  return ["无明显","当前库内未记录两药明确严重相互作用；但联用仍须以说明书与指南为准，注意个体差异与酶诱导/抑制。"];
}
function keyOf(a,b){return [a,b].sort().join('|');}
function ensureInteractOptions(){
  const ia=document.getElementById('ia'), ib=document.getElementById('ib');
  if(ia.options.length) return;
  DRUGS.forEach(d=>{
    ia.add(new Option(d.zh,d.zh));
    ib.add(new Option(d.zh,d.zh));
  });
  ia.value="舍曲林"; ib.value="碳酸锂";
}
function queryInteraction(){
  ensureInteractOptions();
  const a=document.getElementById('ia').value, b=document.getElementById('ib').value;
  const [lvl,txt]=getInteraction(a,b);
  const s=SEV[lvl];
  const box=document.getElementById('interactResult');
  box.innerHTML=`<div class="continue" style="margin-top:16px;">
      <div class="ihead">
        <span class="ibadge" style="background:${s.bg};color:${s.color}">${lvl}</span>
        <span class="inames">${a} × ${b}</span>
      </div>
      <div class="ibody">${txt}</div>
    </div>`;
}
function openInteract(zh){
  ensureInteractOptions();
  document.getElementById('ia').value = DRUGS.some(d=>d.zh===zh)?zh:"舍曲林";
  document.getElementById('interactResult').innerHTML='';
  showScreen('interact');
}

/* Study */
let studyMode='cards';
let cardIdx=0;
let cardOrder; // shuffled index order
function renderStudy(){
  if(studyMode==='cards'){
    // SRS 间隔重复：到期卡片优先，然后新卡，再复习少量已学卡片
    cardOrder=getSRSQueue();
    cardIdx=0;
  }
  if(studyMode==='cards') renderCard();
  else { if(quizQueue.length) renderQuiz(); else startQuiz(); }
}
function renderCard(){
  document.getElementById('cardWrap').style.display='';
  document.getElementById('quizWrap').style.display='none';
  const sp=document.getElementById('studyProgress'); if(sp) sp.style.display='';
  document.getElementById('studyModeLabel').textContent='记忆卡片';
  const d=DRUGS[cardOrder[cardIdx]];
  const fc=document.getElementById('flashcard');
  fc.classList.remove('flip');
  document.getElementById('fcZh').textContent=d.zh;
  document.getElementById('fcEn').textContent=d.en;
  document.getElementById('fcCls').textContent=`${d.cls} · ${d.sub}`;
  document.getElementById('fcName').textContent=`${d.zh} ${d.en}`;
  document.getElementById('fcMech').textContent=d.mech;
  document.getElementById('fcInd').innerHTML=d.ind.map(x=>`<span class="chip">${x}</span>`).join('');
  document.getElementById('fcSide').innerHTML=d.side.map(x=>`<span class="chip">${x}</span>`).join('');
  document.getElementById('fcWarn').textContent=d.warn;
  document.getElementById('fcDose').textContent=d.dose;
  document.getElementById('fcCls2').textContent=`${d.cls} · ${d.sub}`;
  // 进度以实际队列长度为准（SRS 队列含复习卡，长度可能不等于 DRUGS.length）
  document.getElementById('studyProgress').textContent=`${cardIdx+1} / ${cardOrder.length}`;
  // SRS 状态提示
  const dIdx=cardOrder[cardIdx];
  const sD=DRUGS[dIdx];
  const sS=SRS[sD.zh];
  const sHint=document.getElementById('srsStudyHint');
  if(sHint && sS){
    if(sS.reps===0) sHint.textContent='🆕 新卡片 · 首次学习';
    else {
      const next=new Date(sS.nextReview);
      const d=Math.round((sS.nextReview-todayMS())/86400000);
      sHint.textContent='📊 已学 '+sS.reps+' 次 · 下次 '+(d<=0?'今天':d+' 天后')+' ('+(next.getMonth()+1)+'/'+next.getDate()+')';
    }
  }
  fitCardHeight();
}
function fitCardHeight(){
  // Card height is now driven by the study screen's flex layout;
  // just clear any stale inline heights so CSS (flex:1) takes over.
  const fc=document.getElementById('flashcard'); if(!fc) return;
  const inner=fc.querySelector('.card-inner');
  const front=fc.querySelector('.face.front');
  const back=fc.querySelector('.face.back');
  if(inner) inner.style.height='';
  if(front) front.style.height='';
  if(back) back.style.height='';
}
function flipCard(){ document.getElementById('flashcard').classList.toggle('flip'); }
function nextCard(remembered){
  const jb=document.querySelectorAll('.judge button');
  if(jb[0] && jb[0].dataset.locked) return;
  jb.forEach(x=>x.dataset.locked='1');
  const d=DRUGS[cardOrder[cardIdx]];
  GAM.seen[d.zh]=true;
  touchStreak();
  recordSRS(d.zh,remembered);
  if(remembered){ GAM.remembered=(GAM.remembered||0)+1; addPoints(10); showToast('记住了 · +10 🪙'); }
  else { addPoints(3); showToast('再看看 · +3 🪙'); }
  saveGam(); checkBadges(); updateGamUI();
  cardIdx++;
  // 队列耗尽时按最新 SRS 状态重新排队，避免 cardOrder[cardIdx] 越界导致 d.zh 抛错卡死
  if(cardIdx>=cardOrder.length){
    cardOrder=getSRSQueue(); cardIdx=0;
    showToast('🎉 本轮完成 · 已按掌握情况重新排队');
  }
  renderCard();
  jb.forEach(x=>delete x.dataset.locked);
}
function setStudyMode(m){
  studyMode=m;
  document.querySelectorAll('#studySeg button').forEach(b=>b.classList.toggle('on', b.textContent===(m==='cards'?'闪卡':'自测')));
  if(m==='quiz'){ startQuiz(); } else { renderStudy(); }
}
/* 自测小考：稳定题库 + 上一题/下一题 + 结果页 */
let quizQueue=[], quizPos=0, quizResult=[];
const QUIZ_SIZE=25;
const CURATED=[
  /* ——— 基础 / 跨类别 ——— */
  {q:"下列哪种药物属于苯二氮䓬类抗焦虑药？",opts:["舍曲林","地西泮","奥氮平","碳酸锂"],ans:1},
  {q:"舍曲林（Sertraline）的主要作用机制是？",opts:["阻断 D2 受体","抑制 5-HT 再摄取","增强 GABA 能","阻断钠通道"],ans:1},
  {q:"需要定期监测血锂浓度的药物是？",opts:["丙戊酸钠","氟西汀","碳酸锂","哌甲酯"],ans:2},
  {q:"下列哪种属于第一代（典型）抗精神病药？",opts:["氯丙嗪","利培酮","地西泮","舍曲林"],ans:0},
  {q:"哌甲酯（Methylphenidate）主要用于？",opts:["抑郁症","ADHD","双相躁狂","强迫症"],ans:1},
  {q:"氯氮平（Clozapine）最需警惕的严重不良反应是？",opts:["体重增加","粒细胞缺乏","流涎","镇静"],ans:1},
  {q:"阿立哌唑的作用特点更接近？",opts:["D2 完全阻断","D2 部分激动","纯抗组胺","MAOI"],ans:1},

  /* ——— 抗抑郁药 ——— */
  {q:"具有双重 5-HT 和 NE 再摄取抑制作用的药物是？",opts:["氟西汀","文拉法辛","曲唑酮","米氮平"],ans:1},
  {q:"度洛西汀除抗抑郁外，还获批用于哪种疼痛？",opts:["偏头痛","糖尿病周围神经痛","骨关节炎","纤维肌痛"],ans:1},
  {q:"米氮平（Mirtazapine）的特点包括？",opts:["激活为主","镇静+食欲增加","纯 5-HT 再摄取抑制","D2 阻断"],ans:1},
  {q:"阿戈美拉汀（Agomelatine）的独特机制是？",opts:["褪黑素受体激动","5-HT 再摄取抑制","NE 再摄取抑制","MAO 抑制"],ans:0},
  {q:"曲唑酮（Trazodone）在低剂量（25-50 mg）时常用作？",opts:["抗抑郁","催眠","抗焦虑","抗强迫"],ans:1},
  {q:"伏硫西汀（Vortioxetine）的作用特点包括？",opts:["纯 SSRI","5-HT 调质 + 多受体调节","D2 部分激动","GABA 增强"],ans:1},
  {q:"SSRI 类药物最常见的初期不良反应是？",opts:["粒细胞缺乏","恶心/胃肠不适","体重急剧下降","锥体外系反应"],ans:1},

  /* ——— 抗精神病药 ——— */
  {q:"哪种非典型抗精神病药引起体重增加和代谢综合征风险最高？",opts:["利培酮","奥氮平","阿立哌唑","氨磺必利"],ans:1},
  {q:"利培酮需要重点监测的不良反应是？",opts:["肝功能","泌乳素升高","粒细胞缺乏","甲状腺功能"],ans:1},
  {q:"氟哌啶醇属于哪一类抗精神病药？",opts:["非典型","典型(第一代)","非典型(部分激动)","苯甲酰胺类"],ans:1},
  {q:"FGA 的典型不良反应是？",opts:["体重增加","锥体外系反应(EPS)","镇静","高泌乳素"],ans:1},
  {q:"喹硫平（Quetiapine）低剂量（25-100 mg）常用于？",opts:["抗精神病","助眠/焦虑","躁狂","强迫症"],ans:1},
  {q:"氨磺必利（Amisulpride）低剂量时主要作用机制是？",opts:["D2 阻断","5-HT2A 阻断","突触前 D2/D3 阻断→前额叶多巴胺增加","H1 阻断"],ans:2},

  /* ——— 心境稳定剂 ——— */
  {q:"丙戊酸钠常见但需监控的副作用是？",opts:["肾毒性","肝功能异常+体重增加","QT 延长","甲状腺功能减退"],ans:1},
  {q:"拉莫三嗪最需要关注的严重不良反应是？",opts:["肝功能衰竭","Stevens-Johnson 综合征","粒细胞缺乏","胰腺炎"],ans:1},
  {q:"卡马西平因其酶诱导特性会影响？",opts:["其他药物代谢(降低血药浓度)","自身吸收","肾脏排泄","蛋白结合"],ans:0},
  {q:"碳酸锂的中毒浓度参考值是？",opts:[">0.6 mmol/L",">1.2 mmol/L",">2.0 mmol/L",">0.3 mmol/L"],ans:1},

  /* ——— 抗焦虑 / 催眠 ——— */
  {q:"哪种 Z 类药物主要用于入睡困难？",opts:["艾司唑仑","思诺思(酒石酸唑吡坦)","地西泮","劳拉西泮"],ans:1},
  {q:"莱博雷生（Lemborexant）的作用机制是？",opts:["GABA 增强","褪黑素受体激动","食欲素受体拮抗","5-HT 再摄取抑制"],ans:2},
  {q:"长期使用苯二氮䓬类药物应警惕？",opts:["肝功能损害","依赖与戒断反应","肾毒性","粒细胞缺乏"],ans:1},

  /* ——— 新增类别 ——— */
  {q:"苯海索用于处理抗精神病药的哪种副作用？",opts:["体重增加","锥体外系反应(EPS)","便秘","流涎"],ans:1},
  {q:"普萘洛尔在精神科常用于？",opts:["惊恐发作","静坐不能/表演性焦虑","抑郁","狂躁"],ans:1},
  {q:"多奈哌齐和卡巴拉汀共同的作用机制是？",opts:["NMDA 拮抗","胆碱酯酶抑制","MAO-B 抑制","多巴胺激动"],ans:1},
  {q:"美金刚（Memantine）在阿尔茨海默病中的定位是？",opts:["轻中度一线","中重度","预防","全部阶段"],ans:1}
];
function sampleExcept(pool, exclude, n){
  const cand=[...new Set(pool.filter(x=>x!==exclude))];
  shuffle(cand);
  return cand.slice(0,n);
}
function makeQ(qText, correct, pool){
  const opts=shuffle([correct, ...sampleExcept(pool, correct, 3)]);
  return {q:qText, opts, ans:opts.indexOf(correct)};
}
function buildQuizBank(){
  const bank=[];
  const classLabels=[...new Set(DRUGS.map(d=>d.cls+(d.sub?'·'+d.sub:'')))];
  const names=DRUGS.map(d=>d.zh);
  const inds=DRUGS.flatMap(d=>d.ind||[]);
  const sides=DRUGS.flatMap(d=>d.side||[]);
  DRUGS.forEach(d=>{
    const cls=d.cls+(d.sub?'·'+d.sub:'');
    bank.push(makeQ(`「${d.zh}」属于哪一类精神药物？`, cls, classLabels));
    if(d.ind && d.ind.length){ bank.push(makeQ(`「${d.zh}」常用于治疗下列哪种情况？`, d.ind[0], inds)); }
    if(d.side && d.side.length){ bank.push(makeQ(`「${d.zh}」的常见不良反应包括？`, d.side[0], sides)); }
    bank.push(makeQ(`下列哪种药物属于「${cls}」？`, d.zh, names));
  });
  CURATED.forEach(q=>bank.push(q));
  return bank;
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i];a[i]=a[j];a[j]=t; } return a; }
function startQuiz(){
  const bank=buildQuizBank();
  shuffle(bank);
  quizQueue=bank.slice(0, Math.min(QUIZ_SIZE, bank.length));
  quizPos=0; quizResult=new Array(quizQueue.length).fill(null);
  const r=document.getElementById('quizResult'); if(r) r.style.display='none';
  const opts=document.getElementById('quizOpts'); if(opts) opts.style.opacity='1';
  renderQuiz();
}
function renderQuiz(){
  document.getElementById('cardWrap').style.display='none';
  document.getElementById('quizWrap').style.display='';
  const sp=document.getElementById('studyProgress'); if(sp) sp.style.display='none';
  document.getElementById('studyModeLabel').textContent='自测小考';
  const optsBox=document.getElementById('quizOpts'); if(optsBox) optsBox.style.opacity='1';
  const item=quizQueue[quizPos];
  document.getElementById('quizQ').textContent=item.q;
  const wrap=document.getElementById('quizOpts');
  wrap.innerHTML='';
  const rec=quizResult[quizPos];
  item.opts.forEach((o,i)=>{
    const b=document.createElement('button');
    b.className='quiz-opt';
    b.textContent=o;
    if(rec){
      b.dataset.done='1';
      if(i===item.ans){ b.style.borderColor='var(--accent)'; b.style.background='var(--accent-soft)'; }
      else if(i===rec.picked){ b.style.borderColor='var(--warn)'; b.style.background='var(--warn-soft)'; }
    }
    b.onclick=()=>{
      if(b.dataset.done) return;
      Array.from(wrap.children).forEach(c=>c.dataset.done='1');
      const correct=i===item.ans;
      GAM.quizTotal=(GAM.quizTotal||0)+1;
      if(correct){
        GAM.quizCorrect=(GAM.quizCorrect||0)+1;
        GAM.quizStreak=(GAM.quizStreak||0)+1;
        GAM.quizMax=Math.max(GAM.quizMax||0,GAM.quizStreak);
        b.style.borderColor='var(--accent)'; b.style.background='var(--accent-soft)';
        addPoints(15); showToast('答对了 · +15 🪙');
      } else {
        GAM.quizStreak=0;
        b.style.borderColor='var(--warn)'; b.style.background='var(--warn-soft)';
        const cb=wrap.children[item.ans];
        if(cb){ cb.style.borderColor='var(--accent)'; cb.style.background='var(--accent-soft)'; }
        addPoints(5); showToast('再想想 · +5 🪙');
      }
      quizResult[quizPos]={picked:i,correct:correct,earned:correct?15:5};
      saveGam(); checkBadges(); updateGamUI();
    };
    wrap.appendChild(b);
  });
  const prev=document.getElementById('quizPrev');
  const next=document.getElementById('quizNext');
  const last=quizPos===quizQueue.length-1;
  prev.classList.toggle('disabled', quizPos===0);
  prev.disabled=quizPos===0;
  next.textContent= last ? '查看结果 ›' : '下一题 ›';
  next.classList.toggle('finish', last);
  document.getElementById('quizProg').textContent=`第 ${quizPos+1} / ${quizQueue.length} 题`;
  const res=document.getElementById('quizResult'); if(res) res.style.display='none';
}
function quizPrev(){ if(quizPos>0){ quizPos--; renderQuiz(); } }
function quizNext(){
  if(quizPos<quizQueue.length-1){ quizPos++; renderQuiz(); }
  else { showQuizResult(); }
}
function showQuizResult(){
  const total=quizQueue.length;
  const answered=quizResult.filter(Boolean).length;
  const correct=quizResult.filter(r=>r&&r.correct).length;
  const earned=quizResult.reduce((s,r)=>s+(r?r.earned:0),0);
  const acc= answered ? Math.round(correct/answered*100) : 0;
  const opts=document.getElementById('quizOpts'); if(opts) opts.style.opacity='0.35';
  const r=document.getElementById('quizResult'); if(r) r.style.display='block';
  document.getElementById('qrEmoji').textContent= answered<total ? '📝' : (acc>=80?'🏆':acc>=60?'🎉':'💪');
  document.getElementById('qrTitle').textContent= answered<total ? `已答 ${answered} / ${total} 题` : '自测完成';
  document.getElementById('qrScore').textContent=`${correct} / ${total} 正确`;
  document.getElementById('qrSub').textContent=`正确率 ${acc}% · 本次 +${earned} 🪙`;
  if(r) r.scrollIntoView({behavior:'smooth',block:'nearest'});
}

/* ===== Gamification (参考「不背单词」) ===== */
const LS_KEY='neuropharm_gam_v1';
const LEVELS=[0,80,200,380,600,880,1200,1600,2100,2700,3400,4200,5100,6100,7200,8500,10000,12000,15000,20000];
const LEVEL_NAMES=['萌新','学徒','药童','药师','药剂师','临床药师','药理专家','资深专家','主任医师','药枢大师',
  '药王','药圣','太上药王','丹青妙手','百草通灵','万药归宗','药理宗师','药道天师','药帝','药神'];
const BADGES=[
  {id:'first',  icon:'🌱', name:'初出茅庐', desc:'完成第一次学习'},
  {id:'rem10',  icon:'📖', name:'小有心得', desc:'累计记住 10 次'},
  {id:'rem50',  icon:'🧠', name:'药理学徒', desc:'累计记住 50 次'},
  {id:'rem100', icon:'🏆', name:'药理学徒毕业', desc:'累计记住 100 次'},
  {id:'rem500', icon:'👑', name:'药理学霸', desc:'累计记住 500 次'},
  {id:'streak3',icon:'🔥', name:'坚持不懈', desc:'连续学习 3 天'},
  {id:'streak7',icon:'⚡', name:'一周不辍', desc:'连续学习 7 天'},
  {id:'streak30',icon:'💎',name:'初心如磐', desc:'连续学习 30 天'},
  {id:'streak100',icon:'🌟',name:'百日筑基', desc:'连续学习 100 天'},
  {id:'quiz10', icon:'✅', name:'自测达人', desc:'完成 10 道自测'},
  {id:'quiz5',  icon:'🎯', name:'满分学霸', desc:'自测连对 5 题'},
  {id:'pts1000',icon:'💫',name:'千分俱乐部', desc:'累计积分达到 1000'},
  {id:'pts5000',icon:'✨',name:'万分预备', desc:'累计积分达到 5000'},
  {id:'allseen',icon:'📚',name:'药库通览', desc:'浏览过全部 50 味药'},
  {id:'srs10',  icon:'🔄',name:'间隔达人', desc:'SRS 累计复习 10 张到期卡片'},
  {id:'lib',    icon:'🗂️',name:'百宝箱', desc:'浏览全部药库'}
];
function defaultGam(){return{points:0,todayPts:0,streak:0,lastDate:'',remembered:0,seen:{},quizTotal:0,quizCorrect:0,quizStreak:0,quizMax:0,visitedLib:false,badges:{},lastLevel:1,srsReviewed:0,goalSetCards:30,goalSetPts:150,srs:{}};}
function loadGam(){ try{const raw=localStorage.getItem(LS_KEY);if(raw){const o=JSON.parse(raw);return Object.assign(defaultGam(),o);}}catch(e){} return defaultGam(); }
function saveGam(){ try{localStorage.setItem(LS_KEY,JSON.stringify(GAM));}catch(e){} }
let GAM=loadGam();
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function dayDiffFromLast(){ if(!GAM.lastDate) return null; const a=new Date(GAM.lastDate),b=new Date(todayStr()); return Math.round((b-a)/86400000); }
function touchStreak(){
  const t=todayStr();
  if(GAM.lastDate===t) return;
  if(GAM.lastDate){ GAM.streak = dayDiffFromLast()===1 ? (GAM.streak||0)+1 : 1; }
  else { GAM.streak=1; }
  GAM.lastDate=t; GAM.todayPts=0;
}
function levelInfo(){
  let lv=1;
  for(let i=0;i<LEVELS.length;i++){ if(GAM.points>=LEVELS[i]) lv=i+1; }
  const cur=LEVELS[lv-1];
  const next=LEVELS[lv]!==undefined?LEVELS[lv]:null;
  const span=next!==null?next-cur:1;
  const prog=next!==null?Math.min(100,Math.round((GAM.points-cur)/span*100)):100;
  const name=LEVEL_NAMES[lv-1]||'药枢大师';
  const need=next!==null?next-GAM.points:0;
  return {lv,name,prog,need};
}
function addPoints(n){
  GAM.points+=n; GAM.todayPts=(GAM.todayPts||0)+n;
  const oldLv=GAM.lastLevel||1;
  const newLv=levelInfo().lv;
  if(newLv>oldLv){ GAM.lastLevel=newLv; showLevelUp(oldLv,newLv); saveGam(); }
}
function showLevelUp(oldLv,newLv){
  const oldName=LEVEL_NAMES[oldLv-1]||'';
  const newName=LEVEL_NAMES[newLv-1]||'';
  const el=document.createElement('div');
  el.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);opacity:0;transition:opacity .3s ease;';
  el.innerHTML='<div style="background:var(--surface);border-radius:28px;padding:32px 24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2);transform:scale(.7);transition:transform .4s cubic-bezier(.34,1.56,.64,1);"><div style="font-size:56px;line-height:1;">🎊</div><div style="font-size:20px;font-weight:800;margin-top:16px;">恭喜升级！</div><div style="font-size:15px;color:var(--text-2);margin-top:8px;">Lv.'+oldLv+' '+oldName+' → <b style="color:var(--accent);">Lv.'+newLv+' '+newName+'</b></div><div style="font-size:13px;color:var(--text-3);margin-top:4px;">升级奖励 +50 🪙</div><button onclick="this.closest(\'div[style]\').remove()" style="margin-top:18px;border:none;background:var(--accent);color:#fff;font-family:var(--font);font-size:14px;font-weight:700;padding:11px 28px;border-radius:12px;cursor:pointer;">太棒了</button></div>';
  document.body.appendChild(el);
  requestAnimationFrame(()=>{
    el.style.opacity='1';
    const card=el.firstElementChild;
    if(card) requestAnimationFrame(()=>{ card.style.transform='scale(1)'; });
  });
  GAM.points+=50;
  updateGamUI();
}
function checkGoal(){
  const todayCards=Object.keys(GAM.seen||{}).filter(zh=>{
    const s=SRS[zh]; return s&&s.reps>0;
  }).length;
  const todayPts=GAM.todayPts||0;
  const cDone=todayCards>=GAM.goalSetCards;
  const pDone=todayPts>=GAM.goalSetPts;
  if(cDone && pDone && !GAM._goalDoneToday){
    GAM._goalDoneToday=true;
    const el=document.createElement('div');
    el.style.cssText='position:fixed;z-index:9998;top:50%;left:50%;transform:translate(-50%,-50%) scale(.8);background:var(--surface);border-radius:24px;padding:28px 22px;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,.15);opacity:0;transition:all .3s ease;';
    el.innerHTML='<div style="font-size:48px;">🏅</div><div style="font-size:18px;font-weight:800;margin-top:12px;">今日目标达成！</div><div style="font-size:13px;color:var(--text-2);margin-top:6px;">完成 '+GAM.goalSetCards+' 张卡片 · '+GAM.goalSetPts+' 积分</div><button onclick="this.parentElement.remove()" style="margin-top:16px;border:none;background:var(--accent);color:#fff;font-family:var(--font);font-size:14px;font-weight:700;padding:10px 24px;border-radius:12px;cursor:pointer;">继续加油</button></div>';
    document.body.appendChild(el);
    requestAnimationFrame(()=>{ el.style.opacity='1'; el.style.transform='translate(-50%,-50%) scale(1)'; });
  }
}
function checkBadges(){
  const u=[];
  const unlock=id=>{ if(!GAM.badges[id]){ GAM.badges[id]=true; u.push(id); } };
  if((GAM.remembered||0)>=1||(GAM.quizTotal||0)>=1) unlock('first');
  if((GAM.remembered||0)>=10) unlock('rem10');
  if((GAM.remembered||0)>=50) unlock('rem50');
  if((GAM.remembered||0)>=100) unlock('rem100');
  if((GAM.remembered||0)>=500) unlock('rem500');
  if((GAM.streak||0)>=3) unlock('streak3');
  if((GAM.streak||0)>=7) unlock('streak7');
  if((GAM.streak||0)>=30) unlock('streak30');
  if((GAM.streak||0)>=100) unlock('streak100');
  if((GAM.quizTotal||0)>=10) unlock('quiz10');
  if((GAM.quizMax||0)>=5) unlock('quiz5');
  if((GAM.points||0)>=1000) unlock('pts1000');
  if((GAM.points||0)>=5000) unlock('pts5000');
  if(Object.keys(GAM.seen||{}).length>=DRUGS.length) unlock('allseen');
  if((GAM.srsReviewed||0)>=10) unlock('srs10');
  if(GAM.visitedLib) unlock('lib');
  if(u.length){
    saveGam();
    u.forEach((id,i)=>{ const b=BADGES.find(x=>x.id===id); if(b) setTimeout(()=>showToast('🎉 解锁徽章 · '+b.name),600+i*900); });
  }
}
function showToast(msg){
  let t=document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('show'),1800);
}
function renderBadges(){
  const wrap=document.getElementById('pBadges'); if(!wrap) return;
  wrap.innerHTML='';
  BADGES.forEach(b=>{
    const got=!!GAM.badges[b.id];
    const el=document.createElement('div');
    el.className='badge'+(got?'':' locked');
    el.innerHTML='<div class="bi">'+(got?b.icon:'🔒')+'</div><div class="bn">'+b.name+'</div><div class="bd">'+b.desc+'</div>';
    wrap.appendChild(el);
  });
  syncBadgeBtn();
}
function toggleBadges(){
  const wrap=document.getElementById('pBadges');
  const btn=document.getElementById('badgeExpand');
  if(!wrap||!btn) return;
  const expanded=wrap.classList.toggle('expanded');
  btn.setAttribute('aria-expanded', expanded?'true':'false');
  syncBadgeBtn();
}
function syncBadgeBtn(){
  const wrap=document.getElementById('pBadges');
  const btn=document.getElementById('badgeExpand');
  if(!wrap||!btn) return;
  const expanded=wrap.classList.contains('expanded');
  btn.textContent=expanded?'收起 ‹':'展开 ›';
  btn.setAttribute('aria-expanded', expanded?'true':'false');
}
function renderProfileGam(li){
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  set('pLvBadge','Lv.'+li.lv+' '+li.name);
  const bar=document.getElementById('pLvBar'); if(bar) bar.style.width=li.prog+'%';
  set('pLvTxt', li.need>0 ? '距离 Lv.'+(li.lv+1)+' 还需 '+li.need+' 积分' : '已达最高等级 · 药枢大师');
  set('pPts', GAM.points||0);
  set('pStreak',(GAM.streak||0)+' 天');
  set('pLearned', Object.keys(GAM.seen||{}).length);
  set('pRole',(GAM.points||0)>0 ? '已学习 · 累计 '+GAM.points+' 积分' : '刚注册 · 准备出发');
  renderBadges();
}
function updateGamUI(){
  const li=levelInfo();
  const diff=dayDiffFromLast();
  const big=document.getElementById('homeStreakBig');
  const lab=document.getElementById('homeStreakLab');
  const sub=document.getElementById('homeStreakSub');
  const ptag=document.getElementById('homePtag');
  const pts=document.getElementById('homePts');
  const flame=document.getElementById('homeFlame');
  if(GAM.streak>0){
    big.textContent=GAM.streak+' 天';
    lab.textContent='连续学习 · Lv.'+li.lv+' '+li.name;
    if(diff===0){ sub.textContent=(GAM.todayPts>0?'今日已得 '+GAM.todayPts+' 积分 · 再翻一张':'今天已学习 · 翻一张卡巩固'); }
    else if(diff===1){ sub.textContent='昨天坚持了 · 今天翻一张续上'; }
    else { sub.textContent='休息了几天 · 翻一张卡重新连'; }
    ptag.style.display='inline-flex'; pts.textContent=GAM.todayPts||0;
    flame.textContent=GAM.streak>=7?'🔥':GAM.streak>=3?'⚡':'🌱';
  } else {
    big.textContent='开始';
    lab.textContent='你的精神药理学习';
    sub.textContent='还没有学习记录 · 从「今日药物」或药库起步';
    ptag.style.display='none'; flame.textContent='🌱';
  }
  const cont=document.getElementById('contTtl');
  if(cont){
    const learned=Object.keys(GAM.seen||{}).length;
    if(learned===0){ cont.textContent='还没有学习记录'; document.getElementById('contMeta').textContent='选一个药物类别，开始你的第一天'; document.getElementById('contBar').style.width='0%'; }
    else { cont.textContent='已学 '+learned+' 种药'; document.getElementById('contMeta').textContent='累计记住 '+(GAM.remembered||0)+' 次 · 继续巩固'; document.getElementById('contBar').style.width=Math.min(100,learned/DRUGS.length*100)+'%'; }
  }
  renderProfileGam(li);
  // render daily goal section
  const goalRow=document.getElementById('goalRow');
  const goalText=document.getElementById('goalText');
  const goalBar=document.getElementById('goalBar');
  const goalPct=document.getElementById('goalPct');
  if(goalRow && goalText && goalBar && goalPct){
    const todayCards=Object.keys(GAM.seen||{}).filter(zh=>{ const s=SRS[zh]; return s&&s.reps>0; }).length;
    const todayPts=GAM.todayPts||0;
    const cDone=todayCards>=GAM.goalSetCards;
    const pDone=todayPts>=GAM.goalSetPts;
    const cardPct=Math.min(100,Math.round(todayCards/GAM.goalSetCards*100));
    const ptsPct=Math.min(100,Math.round(todayPts/GAM.goalSetPts*100));
    const avgPct=Math.round((cardPct+ptsPct)/2);
    if(avgPct>0){
      goalRow.style.display='flex';
      goalText.textContent='卡片 '+todayCards+'/'+GAM.goalSetCards+' · 积分 '+todayPts+'/'+GAM.goalSetPts;
      goalBar.style.width=avgPct+'%';
      goalPct.textContent=avgPct+'%';
    } else { goalRow.style.display='none'; }
    GAM._goalDoneToday=(cDone && pDone);
  }
}

/* ===== SRS 间隔重复系统 (SM-2 简化版) ===== */
const SRS_KEY='neuropharm_srs_v1';
const SRS_DEFAULTS={interval:0,nextReview:0,reps:0,ease:2.5};
function defaultSRS(){
  const o={};
  DRUGS.forEach(d=>{o[d.zh]={...SRS_DEFAULTS};});
  return o;
}
function loadSRS(){
  try{
    const raw=localStorage.getItem(SRS_KEY);
    if(raw){
      const o=JSON.parse(raw);
      DRUGS.forEach(d=>{if(!o[d.zh])o[d.zh]={...SRS_DEFAULTS};});
      return o;
    }
  }catch(e){}
  return defaultSRS();
}
/* SRS 并入 GAM 以实现云同步；兼容旧版独立 localStorage 数据（迁移后清除） */
(function migrateSRS(){
  try{
    const raw=localStorage.getItem(SRS_KEY);
    if(raw){
      if(!GAM.srs||!Object.keys(GAM.srs).length){ GAM.srs=JSON.parse(raw); saveGam(); }
      localStorage.removeItem(SRS_KEY);
    }
  }catch(e){}
})();
function ensureSRS(){
  if(!GAM.srs||typeof GAM.srs!=='object')GAM.srs={};
  DRUGS.forEach(d=>{if(!GAM.srs[d.zh])GAM.srs[d.zh]={...SRS_DEFAULTS};});
  return GAM.srs;
}
let SRS=ensureSRS();
/* 远程同步覆盖 GAM 后需重绑 SRS 引用 */
function bindSRS(){ SRS=ensureSRS(); if(typeof updateSRSHomeUI==='function')updateSRSHomeUI(); }
window.bindSRS=bindSRS;
function saveSRS(){ GAM.srs=ensureSRS(); saveGam(); }
function todayMS(){
  const d=new Date();d.setHours(0,0,0,0);return d.getTime();
}
function getDueCount(){
  const now=todayMS();
  return DRUGS.reduce((s,d)=>s+(SRS[d.zh].nextReview<=now?1:0),0);
}
function getSRSQueue(){
  const now=todayMS();
  const due=[],newC=[],learnt=[];
  DRUGS.forEach((d,i)=>{
    const s=SRS[d.zh];
    if(s.reps===0) newC.push(i);
    else if(s.nextReview<=now) due.push({idx:i,next:s.nextReview});
    else learnt.push({idx:i,next:s.nextReview});
  });
  due.sort((a,b)=>a.next-b.next);
  const out=due.map(x=>x.idx);
  shuffle(newC); out.push(...newC);
  // learnt 存的是 {idx,next} 对象，必须映射为索引，否则队列混入对象导致取药为 undefined
  shuffle(learnt); out.push(...learnt.slice(0,5).map(x=>x.idx));
  return out;
}
function recordSRS(zh,remembered){
  const s=SRS[zh];
  if(!s) return;
  if(s.reps>0){ GAM.srsReviewed=(GAM.srsReviewed||0)+1; }
  if(remembered){
    s.reps++;
    s.ease=Math.min(3.0,Math.max(1.3,s.ease+0.15));
    const intervals=[1,3,7,14,30,60,90,180];
    s.interval=intervals[Math.min(s.reps-1,intervals.length-1)];
    const d=new Date();d.setDate(d.getDate()+Math.round(s.interval));
    s.nextReview=d.getTime();
  } else {
    s.reps=0;s.ease=Math.max(1.3,s.ease-0.3);s.interval=1;
    const d=new Date();d.setDate(d.getDate()+1);
    s.nextReview=d.getTime();
  }
  saveSRS();
  updateSRSHomeUI();
  checkGoal();
}
function updateSRSHomeUI(){
  const due=getDueCount();
  const el=document.getElementById('srsCount');
  if(!el) return;
  if(due>0){
    el.innerHTML='<span style="color:var(--warn);font-weight:800;">'+due+'</span> 张卡片待复习';
    el.style.display='';
  } else {
    el.style.display='none';
  }
}

/* init */
renderHomePills();
renderChips();
renderLibrary();
renderStudy();
ensureInteractOptions();
updateGamUI();
updateSRSHomeUI();
// 初始化今日目标状态
GAM._goalDoneToday=(()=>{
  const todayCards=Object.keys(GAM.seen||{}).filter(zh=>{const s=SRS[zh];return s&&s.reps>0;}).length;
  const todayPts=GAM.todayPts||0;
  return todayCards>=GAM.goalSetCards && todayPts>=GAM.goalSetPts;
})();