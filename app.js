const {
  useState,
  useEffect,
  useCallback,
  useRef
} = React;

/* ════════════════════════════════════════════════════════════
   구조화 면접 키트  (인재개발팀 가이드 기반)
   STEP1  JD → 핵심업무 2~3개 → 행동지표 (AI도출/예시적용/직접작성)
   STEP2  도입질문 + 탐침질문 (6원칙 실시간 검사)
   STEP3  검증포인트 STAR 설계 → 실시간 S~D 평가
   CAL    연간 면접 캘린더 (날짜·시간·가능 인원 체크 → 수요 집계)
   ════════════════════════════════════════════════════════════ */

const SCORE = {
  S: 5,
  A: 4,
  B: 3,
  C: 2,
  D: 1
};
const WEIGHT = {
  S: 1,
  T: 1,
  A: 3,
  R: 3
};
const GRADES = ["S", "A", "B", "C", "D"];
const STAR = [{
  k: "S",
  name: "상황",
  q: "어떤 맥락·문제였나 — 경험의 배경",
  design: "이 경험이 인정될 맥락인지 무엇으로 판단할지 정합니다.",
  ph: "예) 시기·규모·제약이 구체적으로 나오는가"
}, {
  k: "T",
  name: "과제",
  q: "무엇을 해결해야 했나 — 본인이 맡은 역할",
  design: "본인이 맡은 범위를 어떻게 가려낼지 정합니다.",
  ph: "예) 본인 목표와 팀이 한 일의 경계가 구분되는가"
}, {
  k: "A",
  name: "행동",
  q: "실제로 무엇을 했나 — 직접 한 행동, 대안 비교가 핵심",
  key: true,
  design: "행동지표의 동사가 실제로 나타났는지 볼 근거를 정합니다.",
  ph: "예) 대안을 실제로 비교했는가 · 탈락 기준을 대는가"
}, {
  k: "R",
  name: "결과",
  q: "그래서 무엇이 달라졌나 — 정량 성과나 배운 점",
  key: true,
  design: "성과가 검증되는 기준을 정합니다.",
  ph: "예) 개선 폭을 수치로 대는가 · 실패했다면 무엇을 바꿨는가"
}];
const PROBES = ["왜 그렇게 했는지?", "어떻게 했는지?", "대안은 비교했는지?", "결과는 어땠는지?"];
const TRACK = {
  new: {
    label: "신입",
    focus: "잠재 역량 · 학습 능력 · 태도 · 협업",
    base: "학교 프로젝트, 캡스톤, 동아리, 대외활동, 아르바이트, 인턴 경험에서 근거를 찾습니다.",
    probes: ["본인이 직접 맡은 부분은?", "왜 그 방법을 골랐는지?", "다른 방법도 검토했는지?", "무엇을 배웠는지?"],
    tpl: ["학교 프로젝트나 대외활동에서 그렇게 해봤던 경험을 하나만 말씀해 주세요.", "팀에서 의견이 갈렸을 때 실제로 어떻게 했는지 경험 하나를 말씀해 주세요.", "처음 접한 도구·이론을 실제 결과물로 만들어본 경험을 말씀해 주세요."]
  },
  exp: {
    label: "경력",
    focus: "직무 전문성 · 정량 성과(KPI) · 문제 해결 · 비즈니스 임팩트",
    base: "이전 직장의 담당 업무, 프로젝트 성과, 실패 극복, 이해관계자 조율 경험에서 근거를 찾습니다.",
    probes: ["그 판단의 근거 데이터는?", "검토했다 접은 대안과 이유는?", "본인이 한 일과 팀이 한 일의 경계는?", "숫자로 어떤 변화가 있었는지?"],
    tpl: ["이전 회사에서 실제로 그렇게 했던 경험을 하나 구체적으로 말씀해 주세요.", "담당 지표를 실제로 개선했던 사례를 하나 말씀해 주세요.", "이해관계가 충돌하는 부서를 설득해 결론을 낸 경험을 말씀해 주세요."]
  }
};
const SAMPLE = {
  new: ["임직원 건강증진 프로그램 기획", "사내 설문·참여 데이터 분석", "온보딩 프로그램 개선"],
  exp: ["유럽 시장 트렌드·경쟁사 분석 기반 진입 전략 수립", "신규 판매 채널 발굴·검증", "현지 파트너사·유관부서 협업 리딩"]
};
const GUIDE_EXAMPLE = {
  task: "유럽 시장 트렌드 분석·전략 수립",
  indicator: "시장 데이터를 분석해 과제를 스스로 정의하고, 채널을 검증해 전략으로 연결한다"
};

/* ---------- 검사기 ---------- */
const ADJ = ["꼼꼼", "적극", "성실", "열정", "책임감", "원활", "뛰어난", "우수", "친화", "긍정", "능동", "창의적인", "도전적인"];
const GENERIC = ["대안을 비교해 방향을 정하고", "피드백을 반영해 다듬는다", "결과를 점검해 보완한다", "업무를 원활하게 수행한다", "효율적으로 처리한다"];
function lintIndicator(v, title) {
  const out = [];
  v = (v || "").trim();
  if (!v) return out;
  const g = GENERIC.find(x => v.includes(x));
  if (g) out.push({
    lv: "err",
    msg: `“${g}…”는 어느 직무에나 붙는 빈 문장입니다.`
  });
  const adj = ADJ.filter(a => v.includes(a));
  if (adj.length) out.push({
    lv: "err",
    msg: `형용사(${adj.join(", ")})는 채점이 안 됩니다. 동사로 바꾸세요.`
  });
  const words = (title || "").replace(/^\[.*?\]\s*/, "").split(/[\s·,/]+/).filter(w => w.length > 1);
  if (words.length && !words.some(w => v.includes(w))) out.push({
    lv: "warn",
    msg: "업무명 단어가 하나도 없습니다. 다른 직무에 붙여도 말이 되는 문장일 수 있습니다."
  });
  if (!/(한다|된다|낸다|든다|린다|친다|본다|간다|킨다)\.?$/.test(v)) out.push({
    lv: "warn",
    msg: "“분석한다 / 설계한다 / 증명한다”처럼 동사 현재형으로 끝내세요."
  });
  return out;
}
function lintQuestion(v) {
  const out = [];
  v = (v || "").trim();
  if (!v) return out;
  if (/그리고|및/.test(v) || (v.match(/\?/g) || []).length > 1) out.push({
    lv: "err",
    msg: "이중질문입니다. 한 번에 하나만 물으세요."
  });
  if (/(라면|다면|가정|만약|하시겠|겠어요|겠습니까)/.test(v)) out.push({
    lv: "err",
    msg: "가정형입니다. “실제로 ~했던 경험”으로."
  });
  if (/(당연히|보통은|하셨죠|보셨죠|그렇죠|맞죠)/.test(v)) out.push({
    lv: "err",
    msg: "정답을 암시하는 유도질문입니다."
  });
  if (/(있나요|있습니까|였나요|인가요|했나요|합니까|맞나요)\s*\??$/.test(v)) out.push({
    lv: "warn",
    msg: "예/아니오로 끝나는 폐쇄형입니다."
  });
  if (!/(경험|사례|말씀|이야기)/.test(v)) out.push({
    lv: "warn",
    msg: "과거의 구체적 경험 하나를 요구하는 표현이 없습니다."
  });
  return out;
}
const lintAnswer = v => /(하겠습니다|열심히|최선을|노력하겠|자신있|각오|다짐|배우겠|임하겠)/.test(v || "") ? [{
  lv: "nudge",
  msg: "각오·다짐으로 흐릅니다 → “실제로 그렇게 했던 경험이 있을까요?”로 되돌리세요."
}] : [];

/* ---------- 구글 Apps Script 중계 서버 URL ----------
   JD·캘린더 저장과 AI 행동지표 생성을 모두 이 URL로 중계한다.
   재배포로 URL이 바뀌면 이 한 줄만 교체하면 된다.
   Claude API 키는 Apps Script의 Script Property에만 있고 여기엔 노출되지 않는다. */
const GS_URL = "https://script.google.com/macros/s/AKfycbyeabo9ID7XLqSHoe_2DG4CwzubwAyot08GBl_MNTtxuVtb3Z6cbtJ7PZZOSqaY9LNI/exec";

// Claude 호출: Apps Script 중계를 거쳐 API 키를 숨긴 채 요청한다.
async function askClaude(prompt, maxTokens = 1400) {
  const res = await fetch(GS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    // 단순 요청(프리플라이트 회피)
    body: JSON.stringify({
      type: "ai",
      prompt,
      max_tokens: maxTokens
    })
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("").replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}
const uid = () => Math.random().toString(36).slice(2, 9);

// 시트에서 목록 읽기 (type: 'jd' | 'calendar')
async function gsLoad(type) {
  const res = await fetch(`${GS_URL}?type=${type}`);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  return data.rows || [];
}
// 한 건 저장/수정 (record.id를 키로 사용)
async function gsUpsert(type, record) {
  // Apps Script는 프리플라이트를 막으므로 text/plain으로 보냄(단순 요청)
  await fetch(GS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      type,
      action: "upsert",
      record
    })
  });
}
// 한 건 삭제
async function gsDelete(type, key) {
  await fetch(GS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      type,
      action: "delete",
      key
    })
  });
}
const emptyEval = () => ({
  S: {
    check: "",
    grade: "",
    note: ""
  },
  T: {
    check: "",
    grade: "",
    note: ""
  },
  A: {
    check: "",
    grade: "",
    note: ""
  },
  R: {
    check: "",
    grade: "",
    note: ""
  }
});
const newTask = (title = "", indicator = "") => ({
  id: uid(),
  title,
  indicator,
  intro: "",
  probes: [...PROBES],
  eval: emptyEval()
});

/* ---------- 공통 소품 ---------- */
function Lint({
  items
}) {
  if (!items || !items.length) return null;
  const C = {
    err: "k-text-err bg-red-50 border-red-200",
    warn: "k-text-warn bg-amber-50 border-amber-200",
    nudge: "k-text-terra k-bg-peach k-border-amber-o30"
  };
  const T = {
    err: "수정",
    warn: "점검",
    nudge: "되돌리기"
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 mt-1.5"
  }, items.map((i, n) => /*#__PURE__*/React.createElement("p", {
    key: n,
    className: `flex gap-2 items-start k-fs12 leading-relaxed border rounded px-2.5 py-1.5 ${C[i.lv]}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono k-fs10 uppercase tracking-wider pt-px shrink-0"
  }, T[i.lv]), /*#__PURE__*/React.createElement("span", null, i.msg))));
}
function Toast({
  msg
}) {
  if (!msg) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed bottom-6 left-1/2 -translate-x-1/2 k-bg-ink k-white text-sm px-5 py-3 rounded-md shadow-lg z-50"
  }, msg);
}

/* ══════════════════ 다음 파트에서 이어짐 ══════════════════ */

/* ══════════════════ STEP 1 : JD → 핵심업무 → 행동지표 ══════════════════ */
function Step1({
  track,
  data,
  setData,
  toast
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busyTask, setBusyTask] = useState(null);
  const [swap, setSwap] = useState({}); // taskId -> {job, text, bad}
  const tk = TRACK[track];
  const setTasks = fn => setData(d => ({
    ...d,
    tasks: fn(d.tasks)
  }));

  // 부서장이 적은 핵심 업무들 → 각각 행동지표 + 도입질문 일괄 생성
  const derive = async () => {
    const filled = data.tasks.filter(t => t.title.trim());
    if (!filled.length) return toast("먼저 핵심 업무를 하나 이상 적으세요.");
    setBusy(true);
    setMsg({
      t: "run",
      v: `핵심 업무 ${filled.length}개를 행동지표로 바꾸는 중…`
    });
    const prompt = `당신은 한국 기업 인사팀의 구조화 면접 설계 전문가입니다.
${tk.label} 채용 면접에서, 아래 각 핵심 업무를 '어떤 행동을 하면 잘하는 것인가'인 행동지표와 도입질문으로 바꾸세요.

[검증 초점] ${tk.focus}
[경험 근거] ${tk.base}

■ 행동지표는 눈으로 확인·평가할 수 있는 '행동'이어야 합니다. 형용사(꼼꼼한·적극적인) 금지, 동사 현재형("~한다")으로 종결.
■ 문장 안에 (1)무엇을 보고 판단하는가 (2)무엇을 가려내고 무엇을 만드는가 (3)무엇이 나오면 잘한 것인가 가 드러나야 합니다.
■ 절대 금지 — 다른 직무에 그대로 붙여도 말이 되는 문장. 예: "관련 대안을 비교해 방향을 정하고 다듬는다" (건강증진·재고관리·어디에나 붙음 → 실패).
■ 좋은 예(가이드 원문): 핵심업무 "${GUIDE_EXAMPLE.task}" → 행동지표 "${GUIDE_EXAMPLE.indicator}"
■ 도입질문: 가정형 금지, 이중질문 금지. 과거의 구체적 경험 1개를 묻는 열린 질문.

핵심 업무 (순서 유지):
${filled.map((t, i) => `${i + 1}. ${t.title.trim()}`).join("\n")}

JSON만 출력(코드펜스·설명 금지). indicators 배열은 위 순서와 동일하게:
{"indicators":[{"indicator":"행동지표 한 문장","intro":"과거 경험 1개를 묻는 도입질문"}]}`;
    try {
      const r = await askClaude(prompt);
      if (!r.indicators || !r.indicators.length) throw new Error("빈 응답");
      setTasks(ts => {
        let n = 0;
        return ts.map(t => {
          if (!t.title.trim()) return t;
          const g = r.indicators[n++];
          if (!g) return t;
          return {
            ...t,
            indicator: g.indicator || t.indicator,
            intro: g.intro || t.intro
          };
        });
      });
      setMsg({
        t: "ok",
        v: "변환 완료. 각 카드의 ‘문장 검사’로 다른 직무에 붙여도 말이 되는지 확인하세요 — 어색해야 정상입니다."
      });
    } catch (e) {
      setMsg({
        t: "err",
        v: `AI 변환 실패 (${e.message}). 행동지표를 임의로 지어내지 않습니다. 각 카드에 직접 쓰거나 다시 시도하세요.`
      });
    }
    setBusy(false);
  };

  // 업무 1개만 행동지표 재생성
  const reIndicator = async t => {
    if (!t.title.trim()) return toast("업무명을 먼저 적으세요.");
    setBusyTask(t.id);
    const prompt = `핵심 업무: "${t.title}"
이 업무를 ${tk.label} 채용에서 '어떤 행동을 하면 잘하는 것인가'인 행동지표 한 문장으로 바꾸세요.
문장 안에 (1)무엇을 보고 판단하는가 (2)무엇을 가려내고 무엇을 만드는가 (3)무엇이 나오면 잘한 것인가 가 들어가야 합니다.
형용사 금지, 동사 현재형 종결. 다른 직무에 붙여도 되는 일반 문장이면 실패.
검증 초점: ${tk.focus}
JSON만: {"indicator":"..."}`;
    try {
      const r = await askClaude(prompt, 400);
      setTasks(ts => ts.map(x => x.id === t.id ? {
        ...x,
        indicator: r.indicator || x.indicator
      } : x));
    } catch (e) {
      toast("생성 실패 (" + e.message + "). 직접 작성하거나 다시 시도하세요.");
    }
    setBusyTask(null);
  };

  // 문장 검사(치환 테스트)
  const SWAP = ["치킨 튀기기", "창고 재고 정리", "급여 정산"];
  const swapTest = t => {
    if (!t.indicator.trim()) return toast("행동지표를 먼저 쓰세요.");
    const words = t.title.split(/[\s·,/]+/).filter(w => w.length > 1);
    const job = SWAP[Math.floor(Math.random() * SWAP.length)];
    let sw = t.indicator;
    words.forEach(w => {
      sw = sw.split(w).join("\u0000");
    });
    sw = sw.replace(/\u0000+\s*/g, job + " ");
    const bad = !words.some(w => t.indicator.includes(w)) || GENERIC.some(x => t.indicator.includes(x));
    setSwap(s => ({
      ...s,
      [t.id]: {
        job,
        text: sw,
        bad
      }
    }));
  };
  const applyGuide = () => setTasks(ts => [...ts, newTask(GUIDE_EXAMPLE.task, GUIDE_EXAMPLE.indicator)]);
  const upd = (id, patch) => setTasks(ts => ts.map(x => x.id === id ? {
    ...x,
    ...patch
  } : x));
  const del = id => setTasks(ts => ts.filter(x => x.id !== id));
  const msgColor = msg ? {
    run: "k-text-muted",
    ok: "k-text-terra",
    err: "k-text-err"
  }[msg.t] : "";
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "grid lg:k-g-125 gap-6 items-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white border k-border-line rounded-lg p-6"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-serif text-lg k-text-ink"
  }, "성과를 가르는 핵심 업무 2~3개"), /*#__PURE__*/React.createElement("p", {
    className: "k-fs13 k-text-muted mt-1 mb-4"
  }, "부서장이 ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "이 직무에서 성과를 가르는 핵심 업무"), "를 직접 적습니다. 이것이 JD입니다. 다 적고 아래 버튼을 누르면 각각이 ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "행동지표"), "로 바뀝니다."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2.5"
  }, data.tasks.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono k-fs11 k-text-amber k-bg-peach rounded px-2 py-1.5 shrink-0"
  }, i + 1), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: t.title,
    onChange: e => upd(t.id, {
      title: e.target.value
    }),
    onKeyDown: e => {
      if (e.key === "Enter" && data.tasks.length < 5 && i === data.tasks.length - 1) setTasks(ts => [...ts, newTask()]);
    },
    className: "flex-1 k-fs14 border k-border-line rounded-md px-3 py-2.5 k-bg-cream-o60 focus:outline-none focus:k-border-amber focus:ring-2 focus:k-ring-amber-o15",
    placeholder: i === 0 ? "예) 임직원 건강증진 프로그램 기획" : i === 1 ? "예) 사내 설문·참여 데이터 분석" : "예) 온보딩 프로그램 개선"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => del(t.id),
    className: "k-text-muted hover:k-text-err text-sm px-1 shrink-0"
  }, "✕")))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2 mt-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setTasks(ts => ts.length >= 5 ? (toast("최대 5개입니다. 2~3개를 권장합니다."), ts) : [...ts, newTask()]),
    className: "px-3 py-2 k-fs13 border k-border-line rounded-md hover:k-border-amber k-text-muted"
  }, "+ 업무 추가"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTasks(() => SAMPLE[track].map(s => newTask(s))),
    className: "px-3 py-2 k-fs13 k-text-amber hover:underline"
  }, "샘플 채우기")), /*#__PURE__*/React.createElement("div", {
    className: "my-4 border-t border-dashed k-border-line"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: derive,
    disabled: busy,
    className: "w-full px-5 py-3 k-bg-terra k-white text-sm font-medium rounded-md hover:k-bg-ink disabled:opacity-50"
  }, busy ? "변환 중…" : "↓ 핵심 업무를 행동지표로 변환"), msg && /*#__PURE__*/React.createElement("p", {
    className: `k-fs12 mt-2.5 leading-relaxed ${msgColor}`
  }, msg.v, " ", msg.t === "err" && /*#__PURE__*/React.createElement("button", {
    onClick: derive,
    className: "k-text-amber hover:underline ml-1"
  }, "다시 시도"))), /*#__PURE__*/React.createElement("aside", {
    className: "k-bg-brown k-white rounded-lg p-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-mono k-fs10 k-tr018 k-am70 uppercase"
  }, "행동지표란"), /*#__PURE__*/React.createElement("h3", {
    className: "font-serif text-xl mt-1.5 leading-snug"
  }, "“이 일을 ", /*#__PURE__*/React.createElement("span", {
    className: "k-text-gold"
  }, "잘하는 사람"), "은", /*#__PURE__*/React.createElement("br", null), "무엇을 하는가”"), /*#__PURE__*/React.createElement("p", {
    className: "k-fs13 k-am50 mt-3 leading-relaxed"
  }, "선정한 핵심 업무를 ", /*#__PURE__*/React.createElement("b", {
    className: "k-white"
  }, "‘어떤 행동을 하면 잘하는 것인가’"), "로 바꿔 쓴 한 문장입니다. 눈으로 확인·평가할 수 있는 ", /*#__PURE__*/React.createElement("b", {
    className: "k-white"
  }, "행동"), "이어야 합니다."), /*#__PURE__*/React.createElement("div", {
    className: "my-5 border-t k-brw15"
  }), /*#__PURE__*/React.createElement("p", {
    className: "font-mono k-fs10 k-tr018 k-am70 uppercase mb-2"
  }, "규칙은 두 개뿐"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 k-fs13 leading-relaxed"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "k-text-gold font-medium"
  }, "① 형용사 말고 동사로"), /*#__PURE__*/React.createElement("p", {
    className: "k-am50"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k-orange"
  }, "꼼꼼한·적극적인 ✕"), " → ", /*#__PURE__*/React.createElement("span", {
    className: "k-lime"
  }, "분석한다·비교한다·정의한다 ○"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "k-text-gold font-medium"
  }, "② 다른 직무에 붙이면 어색해야"), /*#__PURE__*/React.createElement("p", {
    className: "k-am50"
  }, "아무 데나 붙는 문장은 지표가 아닙니다. 각 카드 ", /*#__PURE__*/React.createElement("b", {
    className: "k-white"
  }, "‘문장 검사’"), "가 잡아냅니다."))), /*#__PURE__*/React.createElement("div", {
    className: "my-5 border-t k-brw15"
  }), /*#__PURE__*/React.createElement("p", {
    className: "font-mono k-fs10 k-tr018 k-am70 uppercase mb-2"
  }, "가이드 원문 예시"), /*#__PURE__*/React.createElement("p", {
    className: "k-fs12 k-am50 leading-relaxed"
  }, "핵심 업무 「", GUIDE_EXAMPLE.task, "」"), /*#__PURE__*/React.createElement("p", {
    className: "k-fs13 k-lime leading-relaxed mt-1"
  }, "→ 「", GUIDE_EXAMPLE.indicator, "」"), /*#__PURE__*/React.createElement("button", {
    onClick: applyGuide,
    className: "mt-3 k-fs12 px-3 py-1.5 rounded-md k-bgw10 hover:k-bgw20 k-white"
  }, "이 예시를 업무로 추가"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-serif text-lg k-text-ink"
  }, "행동지표"), /*#__PURE__*/React.createElement("p", {
    className: "font-mono k-fs11 k-text-muted"
  }, data.tasks.filter(t => t.title.trim()).length, "개 · 2~3개 권장")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, data.tasks.filter(t => t.title.trim()).length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "k-fs13 k-text-muted bg-white border border-dashed k-border-line rounded-lg p-8 text-center"
  }, "위에 ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "핵심 업무"), "를 적고 ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "‘행동지표로 변환’"), "을 누르면 여기에 나타납니다."), data.tasks.filter(t => t.title.trim()).map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: "bg-white border k-border-line rounded-lg p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono k-fs11 k-text-amber k-bg-peach rounded px-2 py-1 shrink-0"
  }, "업무 ", i + 1), /*#__PURE__*/React.createElement("p", {
    className: "k-fs15 font-medium k-text-ink"
  }, t.title)), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-mono k-fs10 tracking-widest k-text-muted uppercase block mb-1.5"
  }, "행동지표 · 어떤 행동을 하면 잘하는가"), /*#__PURE__*/React.createElement("textarea", {
    rows: 2,
    value: t.indicator,
    onChange: e => upd(t.id, {
      indicator: e.target.value
    }),
    className: "w-full k-fs14 leading-relaxed border k-border-line rounded-md p-3 k-bg-cream-o60 focus:outline-none focus:k-border-amber focus:ring-2 focus:k-ring-amber-o15",
    placeholder: "이 업무를 잘하는 사람이 무엇을 보고, 무엇을 가려내고, 무엇으로 성과를 증명하는지 한 문장으로."
  }), /*#__PURE__*/React.createElement(Lint, {
    items: lintIndicator(t.indicator, t.title)
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-3 mt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => reIndicator(t),
    disabled: busyTask === t.id,
    className: "k-fs12 k-text-amber hover:underline disabled:opacity-50"
  }, busyTask === t.id ? "생성 중…" : "행동지표 다시 뽑기"), /*#__PURE__*/React.createElement("button", {
    onClick: () => swapTest(t),
    className: "k-fs12 k-text-muted hover:k-text-amber hover:underline"
  }, "문장 검사 (다른 직무에 붙여보기)")), swap[t.id] && /*#__PURE__*/React.createElement("div", {
    className: `mt-3 border rounded-md p-3.5 ${swap[t.id].bad ? "bg-red-50 border-red-200" : "k-bg-peach k-border-amber-o30"}`
  }, /*#__PURE__*/React.createElement("p", {
    className: `font-mono k-fs10 tracking-widest uppercase ${swap[t.id].bad ? "k-text-err" : "k-text-terra"}`
  }, "직무명을 “", swap[t.id].job, "”로 바꿔봤습니다"), /*#__PURE__*/React.createElement("p", {
    className: `font-serif k-fs15 mt-1.5 leading-relaxed ${swap[t.id].bad ? "k-text-err" : "k-text-terra"}`
  }, "“", swap[t.id].text, "”"), /*#__PURE__*/React.createElement("p", {
    className: `k-fs12 mt-2 ${swap[t.id].bad ? "k-text-err" : "k-text-muted"}`
  }, swap[t.id].bad ? "이래도 말이 됩니다 → 행동지표가 아닙니다. 다시 뽑거나 고쳐 쓰세요." : "어색하게 들리면 합격입니다. 이 직무에만 붙는 문장이라는 뜻입니다."))))))));
}

/* ══════════════════ STEP 2 : 도입질문 + 탐침질문 ══════════════════ */
function Step2({
  track,
  data,
  setData
}) {
  const tk = TRACK[track];
  const setTasks = fn => setData(d => ({
    ...d,
    tasks: fn(d.tasks)
  }));
  const upd = (id, patch) => setTasks(ts => ts.map(x => x.id === id ? {
    ...x,
    ...patch
  } : x));
  const toggleProbe = (id, p) => setTasks(ts => ts.map(x => x.id === id ? {
    ...x,
    probes: x.probes.includes(p) ? x.probes.filter(q => q !== p) : [...x.probes, p]
  } : x));
  return /*#__PURE__*/React.createElement("div", {
    className: "grid lg:k-g-14 gap-6 items-start"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "font-serif text-lg k-text-ink"
  }, "도입질문 · 탐침질문"), /*#__PURE__*/React.createElement("p", {
    className: "k-fs13 k-text-muted mt-1 mb-4"
  }, "행동지표 하나당 ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "과거 경험 1개"), "를 묻습니다. 입력하는 즉시 이중질문·가정형·유도·폐쇄형을 검사합니다."), data.tasks.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "k-fs13 k-text-muted bg-white border border-dashed k-border-line rounded-lg p-6 text-center"
  }, "STEP 1에서 핵심 업무를 먼저 만드세요."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, data.tasks.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: "bg-white border k-border-line rounded-lg p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline gap-3 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono k-fs11 k-text-amber k-bg-peach rounded px-2 py-1"
  }, "업무 ", i + 1), /*#__PURE__*/React.createElement("p", {
    className: "k-fs15 font-medium k-text-ink"
  }, t.title || /*#__PURE__*/React.createElement("span", {
    className: "k-text-muted"
  }, "제목 없음"))), /*#__PURE__*/React.createElement("p", {
    className: "k-fs12 k-text-terra mb-4 pl-2 border-l-2 k-border-amber-o40 leading-relaxed"
  }, t.indicator || /*#__PURE__*/React.createElement("span", {
    className: "k-text-muted"
  }, "행동지표가 비었습니다.")), /*#__PURE__*/React.createElement("label", {
    className: "font-mono k-fs10 tracking-widest k-text-muted uppercase block mb-1.5"
  }, "도입질문 · 과거 경험 1개"), /*#__PURE__*/React.createElement("textarea", {
    rows: 2,
    value: t.intro,
    onChange: e => upd(t.id, {
      intro: e.target.value
    }),
    className: "w-full k-fs14 leading-relaxed border k-border-line rounded-md p-3 k-bg-cream-o60 focus:outline-none focus:k-border-amber focus:ring-2 focus:k-ring-amber-o15",
    placeholder: "~했던 경험을 하나 말씀해 주세요."
  }), /*#__PURE__*/React.createElement(Lint, {
    items: lintQuestion(t.intro)
  }), /*#__PURE__*/React.createElement("details", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "k-fs12 k-text-amber hover:underline cursor-pointer list-none"
  }, "템플릿에서 고르기"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 mt-2"
  }, tk.tpl.map((s, n) => /*#__PURE__*/React.createElement("button", {
    key: n,
    onClick: () => upd(t.id, {
      intro: s
    }),
    className: "k-fs12 border k-border-line rounded-full px-3 py-1.5 hover:k-border-amber hover:k-bg-peach text-left"
  }, s)))), /*#__PURE__*/React.createElement("div", {
    className: "my-4 border-t border-dashed k-border-line"
  }), /*#__PURE__*/React.createElement("label", {
    className: "font-mono k-fs10 tracking-widest k-text-muted uppercase block mb-2"
  }, "탐침질문 · 꼬리질문"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, [...PROBES, ...tk.probes].map((p, n) => {
    const on = t.probes.includes(p);
    return /*#__PURE__*/React.createElement("button", {
      key: n,
      onClick: () => toggleProbe(t.id, p),
      className: `k-fs12 rounded-full px-3 py-1.5 border ${on ? "k-bg-terra k-white k-border-terra" : "k-border-line hover:k-border-amber"}`
    }, on ? "✓ " : "", p);
  })), t.probes.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "k-fs12 k-text-muted mt-3"
  }, "이 순서로 ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "모든 지원자에게 동일하게"), ": ", t.probes.map((p, n) => /*#__PURE__*/React.createElement("span", {
    key: n
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono k-fs11 k-text-amber"
  }, n + 1, "."), " ", p, " "))))))), /*#__PURE__*/React.createElement("aside", {
    className: "lg:sticky lg:top-20 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white border k-border-line rounded-lg p-5"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-mono k-fs10 tracking-widest k-text-err uppercase"
  }, "질문 설계 6원칙"), /*#__PURE__*/React.createElement("ol", {
    className: "mt-3 space-y-2.5 k-fs13 leading-relaxed"
  }, [["01", "한 번에 하나만 묻는다.", "이중질문 금지"], ["02", "가정형 대신 경험형.", "“~라면?” ✕"], ["03", "유도·정답 암시 금지.", "“당연히 보셨죠?” ✕"], ["04", "열린 질문.", "예/아니오로 안 끝나게"], ["05", "동일 문구·동일 순서.", "모든 지원자에게"], ["06", "각오·다짐이면 되돌린다.", "“실제로 그렇게 했던 경험이?”"]].map(([n, a, b]) => /*#__PURE__*/React.createElement("li", {
    key: n,
    className: "flex gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono k-fs11 k-text-muted"
  }, n), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, a), " ", /*#__PURE__*/React.createElement("span", {
    className: "k-text-muted"
  }, b)))))), /*#__PURE__*/React.createElement("div", {
    className: "k-bg-peach border k-border-amber-o30 rounded-lg p-5"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-mono k-fs10 tracking-widest k-text-terra uppercase"
  }, "되돌리기 멘트"), /*#__PURE__*/React.createElement("p", {
    className: "font-serif k-fs15 k-text-terra mt-2 leading-relaxed"
  }, "“그건 앞으로의 각오에 가까운데요, ", /*#__PURE__*/React.createElement("b", null, "실제로 그렇게 했던 경험"), "이 있을까요?”"))));
}

/* ══════════════════ STEP 3 : 검증포인트 설계 → 실시간 평가 ══════════════════ */
function gradeOf(tasks) {
  let sum = 0,
    w = 0;
  tasks.forEach(t => STAR.forEach(m => {
    const g = t.eval[m.k].grade;
    if (g) {
      sum += SCORE[g] * WEIGHT[m.k];
      w += WEIGHT[m.k];
    }
  }));
  if (!w) return {
    g: "–",
    avg: null
  };
  const avg = sum / w;
  const g = avg >= 4.6 ? "S" : avg >= 3.8 ? "A" : avg >= 2.9 ? "B" : avg >= 2.0 ? "C" : "D";
  return {
    g,
    avg
  };
}
function Step3({
  track,
  data,
  setData,
  mode,
  setMode,
  toast
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const tk = TRACK[track];
  const setTasks = fn => setData(d => ({
    ...d,
    tasks: fn(d.tasks)
  }));
  const setField = (k, v) => setData(d => ({
    ...d,
    [k]: v
  }));
  const updEval = (id, sk, patch) => setTasks(ts => ts.map(x => x.id === id ? {
    ...x,
    eval: {
      ...x.eval,
      [sk]: {
        ...x.eval[sk],
        ...patch
      }
    }
  } : x));
  const design = async () => {
    if (!data.tasks.length) return toast("STEP 1에서 핵심 업무를 먼저 만드세요.");
    if (data.tasks.every(t => !t.indicator.trim())) return toast("행동지표가 비었습니다.");
    setBusy(true);
    setMsg({
      t: "run",
      v: "행동지표를 S·T·A·R 검증포인트로 쪼개는 중…"
    });
    const prompt = `${tk.label} 채용 면접에서 아래 행동지표들을 STAR 4단계 "검증포인트"로 설계하세요.
검증포인트 = 면접 전에 정해두는 "무엇이 확인되면 이 지표가 충족된 것인가"의 기준. 지원자 답변이나 모범답안이 아닙니다.
- S(상황): 경험의 맥락이 인정될 조건
- T(과제): 본인이 맡은 범위가 팀의 일과 구분되는가
- A(행동)★: 지표의 동사가 실제 행동으로 나타났는가. 대안 비교 여부 반드시 포함
- R(결과)★: 정량 성과 또는 검증 가능한 변화·배움이 확인되는가
각 항목은 "~하는가 / ~를 대는가" 형태의 관찰 가능한 확인 기준 한 문장. 형용사 평가어 금지.

행동지표:
${data.tasks.map((x, i) => `${i + 1}. [${x.title}] ${x.indicator}`).join("\n")}

JSON만(위 순서대로): {"checks":[{"S":"...","T":"...","A":"...","R":"..."}]}`;
    try {
      const r = await askClaude(prompt);
      if (!r.checks || !r.checks.length) throw new Error("빈 응답");
      setTasks(ts => ts.map((x, i) => {
        const c = r.checks[i];
        if (!c) return x;
        const ev = {
          ...x.eval
        };
        STAR.forEach(m => {
          if (c[m.k]) ev[m.k] = {
            ...ev[m.k],
            check: c[m.k]
          };
        });
        return {
          ...x,
          eval: ev
        };
      }));
      setMsg({
        t: "ok",
        v: "설계 완료. A·R 두 칸을 특히 손보세요 — 등급의 6/8을 결정합니다."
      });
    } catch (e) {
      setMsg({
        t: "err",
        v: `설계 실패 (${e.message}). 각 칸을 직접 채우거나 다시 시도하세요.`
      });
    }
    setBusy(false);
  };
  const {
    g,
    avg
  } = gradeOf(data.tasks);
  const gColor = {
    S: "k-text-brassd",
    A: "k-text-amber",
    B: "k-text-terra",
    C: "k-text-warn",
    D: "k-text-err",
    "–": "k-text-ink-o30"
  }[g];
  const missing = data.tasks.some(t => STAR.some(m => !t.eval[m.k].check.trim()));
  const msgColor = msg ? {
    run: "k-text-muted",
    ok: "k-text-terra",
    err: "k-text-err"
  }[msg.t] : "";
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "bg-white border k-border-line rounded-lg p-2 mb-6 flex flex-col sm:flex-row gap-2"
  }, [["design", "면접 전", "검증포인트를 STAR로 설계", "무엇이 확인되면 충족인가를 미리 못 박습니다"], ["live", "면접 중", "그 기준으로 실시간 평가", "답변을 검증포인트에 대고 S~D를 매깁니다"]].map(([m, tag, title, sub]) => /*#__PURE__*/React.createElement("button", {
    key: m,
    onClick: () => setMode(m),
    className: `flex-1 text-left px-4 py-3 rounded-md ${mode === m ? "k-bg-terra k-white" : "k-text-muted hover:k-bg-cream"}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono k-fs10 tracking-widest"
  }, tag), /*#__PURE__*/React.createElement("span", {
    className: "block k-fs15 font-medium mt-0.5"
  }, title), /*#__PURE__*/React.createElement("span", {
    className: "block k-fs12 opacity-70"
  }, sub)))), mode === "design" ? /*#__PURE__*/React.createElement("div", {
    className: "bg-white border k-border-line rounded-lg p-6 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-start justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-2xl"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-serif text-lg k-text-ink"
  }, "검증포인트 설계"), /*#__PURE__*/React.createElement("p", {
    className: "k-fs13 k-text-muted mt-1.5 leading-relaxed"
  }, "지원자 답변을 적는 칸이 아닙니다. 면접 ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "전에"), ", 행동지표별로 ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "“무엇이 확인되면 충족인가”"), "를 S·T·A·R 네 칸에 못 박아 둡니다. ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "특히 A·R에서 진짜 역량이 드러납니다."))), /*#__PURE__*/React.createElement("button", {
    onClick: design,
    disabled: busy,
    className: "px-4 py-2.5 k-bg-terra k-white text-sm font-medium rounded-md hover:k-bg-ink shrink-0 disabled:opacity-50"
  }, busy ? "설계 중…" : "행동지표 → 검증포인트 설계")), msg && /*#__PURE__*/React.createElement("p", {
    className: `k-fs12 mt-2.5 ${msgColor}`
  }, msg.v), /*#__PURE__*/React.createElement("div", {
    className: "my-5 h-px k-bg-line"
  }), /*#__PURE__*/React.createElement("p", {
    className: "k-fs12 k-text-muted"
  }, /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "가중치"), " S·T 각 1 · ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "A(행동) 3 · R(결과) 3"), ". A·R의 검증포인트가 헐거우면 면접 전체가 헐거워집니다.")) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white border k-border-line rounded-lg p-6 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid sm:k-g-11a gap-4 items-end"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-mono k-fs10 tracking-widest k-text-muted uppercase block mb-1.5"
  }, "지원자"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: data.candidate,
    onChange: e => setField("candidate", e.target.value),
    className: "w-full border k-border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:k-border-amber",
    placeholder: "이름 / 지원번호"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-mono k-fs10 tracking-widest k-text-muted uppercase block mb-1.5"
  }, "면접관"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: data.interviewer,
    onChange: e => setField("interviewer", e.target.value),
    className: "w-full border k-border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:k-border-amber",
    placeholder: "이름 / 부서"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-center k-bg-cream border k-border-line rounded-md px-6 py-2.5"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-mono k-fs10 tracking-widest k-text-muted uppercase"
  }, "최종 등급"), /*#__PURE__*/React.createElement("p", {
    className: `font-serif text-3xl leading-none mt-1 ${gColor}`
  }, g))), /*#__PURE__*/React.createElement("div", {
    className: "my-5 h-px k-bg-line"
  }), missing && /*#__PURE__*/React.createElement("p", {
    className: "k-fs12 k-text-err bg-red-50 border border-red-200 rounded px-3 py-2 mb-3"
  }, "검증포인트가 빈 항목이 있습니다. 무엇을 볼지 안 정하고 매기는 점수가 곧 인상 평가입니다."), /*#__PURE__*/React.createElement("p", {
    className: "k-fs12 k-text-muted"
  }, /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "S"), " 기대 크게 상회 · ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "A"), " 상회 · ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "B"), " 충족 · ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "C"), " 부분 미달 · ", /*#__PURE__*/React.createElement("b", {
    className: "k-text-ink"
  }, "D"), " 미달·확인 불가", avg !== null && /*#__PURE__*/React.createElement("span", null, " \xA0|\xA0 가중평균 ", avg.toFixed(2), "/5.00"))), data.tasks.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "k-fs13 k-text-muted bg-white border border-dashed k-border-line rounded-lg p-6 text-center"
  }, "STEP 1에서 핵심 업무를 먼저 만드세요."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, data.tasks.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    className: "bg-white border k-border-line rounded-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k-bg-cream border-b k-border-line px-5 py-3.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-baseline gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono k-fs11 k-text-amber k-bg-peach rounded px-2 py-1"
  }, "업무 ", i + 1), /*#__PURE__*/React.createElement("p", {
    className: "k-fs15 font-medium k-text-ink"
  }, t.title || "제목 없음"), mode === "live" && /*#__PURE__*/React.createElement("p", {
    className: "k-fs12 k-text-muted ml-auto"
  }, t.intro || "도입질문 미작성")), mode === "design" && /*#__PURE__*/React.createElement("p", {
    className: "k-fs12 k-text-terra mt-2 pl-2 border-l-2 k-border-amber-o40"
  }, t.indicator || /*#__PURE__*/React.createElement("span", {
    className: "k-text-err"
  }, "행동지표 없음"))), /*#__PURE__*/React.createElement("div", {
    className: "divide-y k-divide-line"
  }, STAR.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.k,
    className: `px-5 py-4 grid gap-4 items-start ${mode === "live" ? "md:k-g-19a" : "md:k-g-19"} ${m.key ? "k-bg-peach-o40" : ""}`
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-serif text-lg k-text-ink"
  }, m.k, " ", /*#__PURE__*/React.createElement("span", {
    className: "k-fs13 font-sans font-medium"
  }, m.name), " ", m.key && /*#__PURE__*/React.createElement("span", {
    className: "k-text-brassd text-xs align-top"
  }, "★핵심")), mode === "design" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "k-fs11 k-text-muted mt-0.5"
  }, m.q), /*#__PURE__*/React.createElement("p", {
    className: "k-fs11 k-text-amber mt-1.5 leading-snug"
  }, m.design)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "font-mono k-fs10 tracking-widest k-text-muted uppercase mt-2 mb-1"
  }, "검증포인트"), t.eval[m.k].check.trim() ? /*#__PURE__*/React.createElement("p", {
    className: "k-fs12 k-text-terra leading-snug border-l-2 k-border-amber-o40 pl-2"
  }, t.eval[m.k].check) : /*#__PURE__*/React.createElement("p", {
    className: "k-fs12 k-text-err"
  }, "미설계"))), mode === "design" ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-mono k-fs10 tracking-widest k-text-muted uppercase block mb-1.5"
  }, "검증포인트 · 무엇이 확인되면 충족인가"), /*#__PURE__*/React.createElement("textarea", {
    rows: 2,
    value: t.eval[m.k].check,
    onChange: e => updEval(t.id, m.k, {
      check: e.target.value
    }),
    className: "w-full k-fs13 leading-relaxed border k-border-line rounded-md p-2.5 bg-white focus:outline-none focus:k-border-amber focus:ring-2 focus:k-ring-amber-o15",
    placeholder: m.ph
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "font-mono k-fs10 tracking-widest k-text-muted uppercase block mb-1.5"
  }, "답변 근거 · 들은 사실만"), /*#__PURE__*/React.createElement("textarea", {
    rows: 2,
    value: t.eval[m.k].note,
    onChange: e => updEval(t.id, m.k, {
      note: e.target.value
    }),
    className: "w-full k-fs13 leading-relaxed border k-border-line rounded-md p-2.5 bg-white focus:outline-none focus:k-border-amber focus:ring-2 focus:k-ring-amber-o15",
    placeholder: "검증포인트가 확인됐는지, 지원자가 말한 그대로"
  }), /*#__PURE__*/React.createElement(Lint, {
    items: lintAnswer(t.eval[m.k].note)
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1"
  }, GRADES.map(gr => {
    const on = t.eval[m.k].grade === gr;
    return /*#__PURE__*/React.createElement("button", {
      key: gr,
      onClick: () => updEval(t.id, m.k, {
        grade: on ? "" : gr
      }),
      className: `w-9 h-9 rounded-md border k-fs13 font-mono font-medium ${on ? "k-bg-terra k-white k-border-terra" : "k-border-line k-text-muted hover:k-border-amber"}`
    }, gr);
  }))))))))), mode === "live" && data.tasks.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white border k-border-line rounded-lg p-6 mt-6"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-serif text-lg block mb-1 k-text-ink"
  }, "총평"), /*#__PURE__*/React.createElement("p", {
    className: "k-fs12 k-text-muted mb-3"
  }, "등급의 근거가 된 ", /*#__PURE__*/React.createElement("b", null, "행동과 결과"), "를 사실 위주로. 인상은 근거가 아닙니다."), /*#__PURE__*/React.createElement("textarea", {
    rows: 4,
    value: data.overall,
    onChange: e => setField("overall", e.target.value),
    className: "w-full k-fs14 leading-relaxed border k-border-line rounded-md p-3.5 k-bg-cream-o60 focus:outline-none focus:k-border-amber focus:ring-2 focus:k-ring-amber-o15",
    placeholder: "예) 채널 후보 3개를 CAC 기준으로 비교해 1개를 접었고, 그 판단으로 분기 CAC 18% 절감."
  }), /*#__PURE__*/React.createElement(Lint, {
    items: lintAnswer(data.overall)
  })));
}

/* ══════════════════ 연간 면접 캘린더 ══════════════════
   부서장이 면접 가능한 날짜를 고르고, 그 날의 가능 시간대를 체크.
   구글 시트(공유)에 저장 → 모든 부서가 전체 수요를 한눈에.        */

const SLOTS = ["10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const ymd = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
function Calendar({
  toast
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [dept, setDept] = useState("");
  const [avail, setAvail] = useState({}); // 내 입력: { "2026-03-14": ["10:00","11:00"] }
  const [all, setAll] = useState([]); // 전체 공유 데이터 [{dept, slots:{date:[...]}, ts}]
  const [view, setView] = useState("mine"); // mine | demand
  const [selDate, setSelDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 전체 공유 일정 로드 + 내가 이미 올린 부서 데이터 복원
  useEffect(() => {
    gsLoad("calendar").then(rows => {
      setAll(rows);
      // 이전에 저장한 내 부서명이 있으면 그 입력을 복원 (localStorage 대체: sessionue)
      const savedDept = typeof window !== "undefined" && window.__calDept || "";
      if (savedDept) {
        const mine = rows.find(r => r.dept === savedDept);
        if (mine) {
          setDept(savedDept);
          setAvail(mine.avail || {});
        }
      }
    }).catch(() => toast("공유 일정을 불러오지 못했습니다. 네트워크나 시트 URL을 확인하세요.")).finally(() => setLoading(false));
  }, [toast]);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const toggleSlot = (dateStr, slot) => {
    setAvail(a => {
      const cur = a[dateStr] || [];
      const next = cur.includes(slot) ? cur.filter(s => s !== slot) : [...cur, slot];
      const copy = {
        ...a
      };
      if (next.length) copy[dateStr] = next.sort();else delete copy[dateStr];
      return copy;
    });
  };
  const saveMine = async () => {
    if (!dept.trim()) return toast("먼저 부서/이름을 입력하세요.");
    setSaving(true);
    const record = {
      id: dept.trim(),
      dept: dept.trim(),
      avail,
      ts: Date.now()
    };
    try {
      await gsUpsert("calendar", record);
      if (typeof window !== "undefined") window.__calDept = dept.trim();
      // 화면의 전체 목록도 즉시 갱신(내 부서 덮어쓰기)
      setAll(rows => {
        const others = rows.filter(r => r.dept !== record.dept);
        return [...others, record];
      });
      toast("저장했습니다. 모든 부서의 ‘수요 집계’에 반영됩니다.");
    } catch (e) {
      toast("저장 실패: " + e.message);
    }
    setSaving(false);
  };
  const exportMine = () => {
    const lines = [`면접 가능 일정 — ${dept || "(부서 미입력)"}`, "=".repeat(40)];
    Object.keys(avail).sort().forEach(d => lines.push(`${d}  ${avail[d].join(", ")}`));
    if (Object.keys(avail).length === 0) lines.push("(선택한 날짜 없음)");
    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `면접일정_${dept || "부서"}_${ymd(year, month, 1).slice(0, 7)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // 수요 집계: 날짜별 { slot: [dept...] }
  const demand = {};
  all.forEach(row => {
    Object.entries(row.avail || {}).forEach(([date, slots]) => {
      demand[date] = demand[date] || {};
      slots.forEach(s => {
        (demand[date][s] = demand[date][s] || []).push(row.dept);
      });
    });
  });
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthDemandDates = Object.keys(view === "demand" ? demand : avail).filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).sort();
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-3 mb-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex bg-white border k-border-line rounded-md overflow-hidden"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setView("mine"),
    className: `px-4 py-2 text-sm ${view === "mine" ? "k-bg-terra k-white" : "k-text-muted"}`
  }, "부서장 · 내 가능 일정"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setView("demand"),
    className: `px-4 py-2 text-sm ${view === "demand" ? "k-bg-terra k-white" : "k-text-muted"}`
  }, "인재개발팀 · 수요 집계")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 ml-auto"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (month === 0) {
        setYear(year - 1);
        setMonth(11);
      } else setMonth(month - 1);
    },
    className: "w-9 h-9 rounded-md border k-border-line bg-white hover:k-border-amber k-text-muted"
  }, "‹"), /*#__PURE__*/React.createElement("span", {
    className: "font-serif text-lg px-3 k-text-ink"
  }, year, "년 ", MONTHS[month]), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (month === 11) {
        setYear(year + 1);
        setMonth(0);
      } else setMonth(month + 1);
    },
    className: "w-9 h-9 rounded-md border k-border-line bg-white hover:k-border-amber k-text-muted"
  }, "›"))), view === "mine" && /*#__PURE__*/React.createElement("div", {
    className: "bg-white border k-border-line rounded-lg p-4 mb-5 flex flex-wrap items-end gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-k-w200"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-mono k-fs10 tracking-widest k-text-muted uppercase block mb-1.5"
  }, "부서 / 이름"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: dept,
    onChange: e => setDept(e.target.value),
    className: "w-full border k-border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:k-border-amber",
    placeholder: "예) 마케팅본부 김부장"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: saveMine,
    disabled: saving,
    className: "px-4 py-2.5 k-bg-terra k-white text-sm font-medium rounded-md hover:k-bg-ink disabled:opacity-50"
  }, saving ? "저장 중…" : "일정 저장"), /*#__PURE__*/React.createElement("button", {
    onClick: exportMine,
    className: "px-4 py-2.5 border k-border-line bg-white text-sm rounded-md hover:k-border-amber"
  }, ".txt 내보내기")), loading && /*#__PURE__*/React.createElement("p", {
    className: "k-fs12 k-text-muted bg-white border k-border-line rounded px-3 py-2 mb-4"
  }, "공유 일정을 불러오는 중…"), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border k-border-line rounded-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-7 border-b k-border-line"
  }, DOW.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: d,
    className: `py-2 text-center k-fs12 font-medium ${i === 0 ? "k-text-err" : i === 6 ? "k-text-amber" : "k-text-muted"}`
  }, d))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-7"
  }, cells.map((d, i) => {
    if (d === null) return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "k-minh76 border-b border-r k-border-line3"
    });
    const dateStr = ymd(year, month, d);
    const dow = new Date(year, month, d).getDay();
    const isToday = dateStr === ymd(today.getFullYear(), today.getMonth(), today.getDate());
    const mine = avail[dateStr] || [];
    const dem = demand[dateStr] || {};
    const demCount = Object.values(dem).reduce((a, arr) => Math.max(a, arr.length), 0);
    const active = view === "mine" ? mine.length > 0 : Object.keys(dem).length > 0;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => setSelDate(selDate === dateStr ? null : dateStr),
      className: `k-minh76 border-b border-r k-border-line3 p-1.5 text-left align-top hover:k-bg-cream relative ${selDate === dateStr ? "ring-2 k-ring-amber ring-inset z-10" : ""}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `k-fs13 ${dow === 0 ? "k-text-err" : dow === 6 ? "k-text-amber" : "k-text-ink"} ${isToday ? "font-bold" : ""}`
    }, d, isToday && /*#__PURE__*/React.createElement("span", {
      className: "ml-1 k-fs9 k-text-amber"
    }, "오늘")), view === "mine" && mine.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mt-1 flex flex-wrap gap-0.5"
    }, mine.slice(0, 3).map(s => /*#__PURE__*/React.createElement("span", {
      key: s,
      className: "k-fs9 k-bg-peach k-text-terra rounded px-1"
    }, s)), mine.length > 3 && /*#__PURE__*/React.createElement("span", {
      className: "k-fs9 k-text-muted"
    }, "+", mine.length - 3)), view === "demand" && demCount > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mt-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: `inline-block k-fs10 rounded px-1.5 py-0.5 ${demCount >= 3 ? "k-bg-terra k-white" : "k-bg-peach k-text-terra"}`
    }, "가능 ", demCount, "명")));
  }))), selDate && /*#__PURE__*/React.createElement("div", {
    className: "bg-white border k-border-line rounded-lg p-5 mt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif text-lg k-text-ink"
  }, selDate, " (", DOW[new Date(selDate).getDay()], ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelDate(null),
    className: "k-text-muted hover:k-text-ink text-sm"
  }, "닫기 ✕")), view === "mine" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "k-fs12 k-text-muted mb-2.5"
  }, "가능한 시간대를 모두 누르세요."), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, SLOTS.map(s => {
    const on = (avail[selDate] || []).includes(s);
    return /*#__PURE__*/React.createElement("button", {
      key: s,
      onClick: () => toggleSlot(selDate, s),
      className: `k-fs13 rounded-md px-3.5 py-2 border ${on ? "k-bg-terra k-white k-border-terra" : "k-border-line hover:k-border-amber"}`
    }, s);
  })), /*#__PURE__*/React.createElement("p", {
    className: "k-fs11 k-text-muted mt-3"
  }, "저장을 눌러야 인재개발팀 수요 집계에 반영됩니다.")) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, Object.keys(demand[selDate] || {}).length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "k-fs13 k-text-muted"
  }, "이 날짜에 가능하다고 표시한 부서가 없습니다."), SLOTS.filter(s => (demand[selDate] || {})[s]).map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono k-fs13 k-text-terra w-14"
  }, s), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, demand[selDate][s].map((d, n) => /*#__PURE__*/React.createElement("span", {
    key: n,
    className: "k-fs12 k-bg-peach k-text-terra rounded px-2 py-0.5"
  }, d))))))), monthDemandDates.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 bg-white border k-border-line rounded-lg p-5"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-mono k-fs10 tracking-widest k-text-muted uppercase mb-3"
  }, MONTHS[month], " ", view === "mine" ? "내 가능 일정" : "부서별 수요 요약"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1.5 k-fs13"
  }, monthDemandDates.map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono k-text-terra w-24 shrink-0"
  }, d.slice(5), " (", DOW[new Date(d).getDay()], ")"), /*#__PURE__*/React.createElement("span", {
    className: "k-text-muted"
  }, view === "mine" ? avail[d].join(", ") : SLOTS.filter(s => demand[d][s]).map(s => `${s}(${demand[d][s].length})`).join("  ")))))));
}

/* ══════════════════ JD 작성·관리 ══════════════════
   현업 리더가 채용 공고(JD)를 작성·관리하고,
   '담당 업무'를 면접 설계 STEP1로 바로 넘긴다.                        */

const JD_FIELDS = [{
  k: "teamIntro",
  label: "팀 소개 + 동료의 한마디",
  ph: "우리 팀은 어떤 팀인지, 함께 일하는 동료의 목소리로 소개해 주세요."
}, {
  k: "duties",
  label: "우리 팀에 합류하시면 이런 일을 함께해요 (담당 업무)",
  ph: "한 줄에 하나씩. 이 줄들이 면접 설계의 핵심 업무로 넘어갑니다.\n예) 임직원 건강증진 프로그램 기획\n사내 설문·참여 데이터 분석",
  duties: true
}, {
  k: "qualifications",
  label: "우리 팀에서는 이런 분을 찾고 있어요 (자격 요건)",
  ph: "필수로 갖춰야 할 역량·경험."
}, {
  k: "preferred",
  label: "이런 분이라면 더욱 좋아요 (우대 사항)",
  ph: "있으면 좋은 역량·경험."
}, {
  k: "growth",
  label: "우리 팀에서는 이런 경험을 하며 성장할 수 있어요",
  ph: "합류 후 얻게 될 경험·성장 기회."
}, {
  k: "notes",
  label: "함께 참고하시면 더욱 좋아요",
  ph: "지원 전 고려사항, 자기소개서/면접 평가 포인트 등."
}];
const newJD = () => ({
  id: uid(),
  title: "",
  track: "new",
  dept: "",
  author: "",
  headcount: "",
  teamIntro: "",
  duties: "",
  qualifications: "",
  preferred: "",
  growth: "",
  notes: "",
  postLink: "",
  videoLink: "",
  review: "작성중",
  posted: false,
  ts: Date.now()
});
const REVIEW_STATES = ["작성중", "검토요청", "검토완료"];
function JDManager({
  jds,
  saveJd,
  deleteJd,
  loading,
  onSendToInterview,
  toast
}) {
  const [editing, setEditing] = useState(null); // jd id | "new" | null(목록)
  const [draft, setDraft] = useState(null);
  const openNew = () => {
    const d = newJD();
    setDraft(d);
    setEditing("new");
  };
  const openEdit = jd => {
    setDraft({
      ...jd
    });
    setEditing(jd.id);
  };
  const cancel = () => {
    setEditing(null);
    setDraft(null);
  };
  const save = () => {
    if (!draft.title.trim()) return toast("직무명을 입력하세요.");
    const d = {
      ...draft,
      ts: Date.now()
    };
    saveJd(d);
    setEditing(null);
    setDraft(null);
    toast("JD를 저장했습니다. (모든 부서가 공유)");
    return d;
  };
  const remove = id => {
    if (confirm("이 JD를 삭제합니다. 공유 목록에서도 사라집니다.")) deleteJd(id);
  };
  const upd = patch => setDraft(d => ({
    ...d,
    ...patch
  }));
  const dutyCount = jd => jd.duties.split("\n").map(s => s.trim()).filter(Boolean).length;
  const sendToInterview = jd => {
    const duties = jd.duties.split("\n").map(s => s.trim()).filter(Boolean);
    if (!duties.length) return toast("담당 업무가 비어 있습니다. 먼저 담당 업무를 한 줄에 하나씩 적어 주세요.");
    onSendToInterview(jd.track, duties);
  };

  /* ---------- 작성/수정 폼 ---------- */
  if (editing && draft) {
    const badgeReview = {
      "작성중": "k-bg-sand k-text-muted",
      "검토요청": "k-bg-peach k-text-amber",
      "검토완료": "k-bg-terra k-white"
    }[draft.review];
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-3 mb-5"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: cancel,
      className: "k-fs13 k-text-muted hover:k-text-amber"
    }, "← 목록"), /*#__PURE__*/React.createElement("h2", {
      className: "font-serif text-xl k-text-ink"
    }, editing === "new" ? "새 JD 작성" : "JD 수정")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white border k-border-line rounded-lg p-6 mb-5"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-mono k-fs10 tracking-widest k-text-muted uppercase mb-3"
    }, "기본 정보"), /*#__PURE__*/React.createElement("div", {
      className: "grid sm:grid-cols-2 gap-4"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "k-fs12 k-text-muted block mb-1.5"
    }, "직무명"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: draft.title,
      onChange: e => upd({
        title: e.target.value
      }),
      className: "w-full k-fs14 border k-border-line rounded-md px-3 py-2.5 k-bg-cream-o60 focus:outline-none focus:k-border-amber focus:ring-2 focus:k-ring-amber-o15",
      placeholder: "예) 사내 HRD 담당자"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "k-fs12 k-text-muted block mb-1.5"
    }, "경력 구분"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-1"
    }, ["new", "exp"].map(t => /*#__PURE__*/React.createElement("button", {
      key: t,
      onClick: () => upd({
        track: t
      }),
      className: `flex-1 py-2.5 k-fs13 rounded-md border ${draft.track === t ? "k-bg-terra k-white k-border-terra" : "k-border-line k-text-muted hover:k-border-amber"}`
    }, TRACK[t].label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "k-fs12 k-text-muted block mb-1.5"
    }, "채용부서"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: draft.dept,
      onChange: e => upd({
        dept: e.target.value
      }),
      className: "w-full k-fs14 border k-border-line rounded-md px-3 py-2.5 k-bg-cream-o60 focus:outline-none focus:k-border-amber focus:ring-2 focus:k-ring-amber-o15",
      placeholder: "예) 인재개발팀"
    })), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 gap-4"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "k-fs12 k-text-muted block mb-1.5"
    }, "작성자"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: draft.author,
      onChange: e => upd({
        author: e.target.value
      }),
      className: "w-full k-fs14 border k-border-line rounded-md px-3 py-2.5 k-bg-cream-o60 focus:outline-none focus:k-border-amber focus:ring-2 focus:k-ring-amber-o15",
      placeholder: "이름"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "k-fs12 k-text-muted block mb-1.5"
    }, "채용인원"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: draft.headcount,
      onChange: e => upd({
        headcount: e.target.value
      }),
      className: "w-full k-fs14 border k-border-line rounded-md px-3 py-2.5 k-bg-cream-o60 focus:outline-none focus:k-border-amber focus:ring-2 focus:k-ring-amber-o15",
      placeholder: "예) 1명"
    }))))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white border k-border-line rounded-lg p-6 mb-5"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-mono k-fs10 tracking-widest k-text-muted uppercase mb-3"
    }, "공고 본문"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, JD_FIELDS.map(f => /*#__PURE__*/React.createElement("div", {
      key: f.k
    }, /*#__PURE__*/React.createElement("label", {
      className: "k-fs13 font-medium k-text-ink block mb-1.5"
    }, f.label, f.duties && /*#__PURE__*/React.createElement("span", {
      className: "ml-2 k-fs11 k-text-amber font-normal"
    }, "면접 설계로 넘어가는 항목 · 한 줄에 하나씩")), /*#__PURE__*/React.createElement("textarea", {
      rows: f.duties ? 4 : 3,
      value: draft[f.k],
      onChange: e => upd({
        [f.k]: e.target.value
      }),
      className: `w-full k-fs14 leading-relaxed border rounded-md p-3 k-bg-cream-o60 focus:outline-none focus:k-border-amber focus:ring-2 focus:k-ring-amber-o15 ${f.duties ? "k-border-amber-o40" : "k-border-line"}`,
      placeholder: f.ph
    }), f.duties && /*#__PURE__*/React.createElement("p", {
      className: "k-fs11 k-text-muted mt-1"
    }, "현재 ", draft.duties.split("\n").map(s => s.trim()).filter(Boolean).length, "개 업무 · 이 줄들이 STEP 1 핵심 업무로 자동 입력됩니다."))))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white border k-border-line rounded-lg p-6 mb-5"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-mono k-fs10 tracking-widest k-text-muted uppercase mb-3"
    }, "링크 및 상태 관리"), /*#__PURE__*/React.createElement("div", {
      className: "grid sm:grid-cols-2 gap-4"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "k-fs12 k-text-muted block mb-1.5"
    }, "포스트 링크"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: draft.postLink,
      onChange: e => upd({
        postLink: e.target.value
      }),
      className: "w-full k-fs14 border k-border-line rounded-md px-3 py-2.5 k-bg-cream-o60 focus:outline-none focus:k-border-amber focus:ring-2 focus:k-ring-amber-o15",
      placeholder: "https://"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "k-fs12 k-text-muted block mb-1.5"
    }, "영상 자료 링크"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: draft.videoLink,
      onChange: e => upd({
        videoLink: e.target.value
      }),
      className: "w-full k-fs14 border k-border-line rounded-md px-3 py-2.5 k-bg-cream-o60 focus:outline-none focus:k-border-amber focus:ring-2 focus:k-ring-amber-o15",
      placeholder: "https://"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "k-fs12 k-text-muted block mb-1.5"
    }, "담당자검토 상태"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-1"
    }, REVIEW_STATES.map(r => /*#__PURE__*/React.createElement("button", {
      key: r,
      onClick: () => upd({
        review: r
      }),
      className: `flex-1 py-2.5 k-fs12 rounded-md border ${draft.review === r ? "k-bg-terra k-white k-border-terra" : "k-border-line k-text-muted hover:k-border-amber"}`
    }, r)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "k-fs12 k-text-muted block mb-1.5"
    }, "공고 등록 여부"), /*#__PURE__*/React.createElement("button", {
      onClick: () => upd({
        posted: !draft.posted
      }),
      className: `w-full py-2.5 k-fs13 rounded-md border ${draft.posted ? "k-bg-terra k-white k-border-terra" : "k-border-line k-text-muted hover:k-border-amber"}`
    }, draft.posted ? "✓ 등록됨" : "미등록")))), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: save,
      className: "px-5 py-2.5 k-bg-terra k-white text-sm font-medium rounded-md hover:k-bg-ink"
    }, "JD 저장"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const d = save();
        if (d) sendToInterview(d);
      },
      className: "px-5 py-2.5 bg-white border k-border-amber k-text-amber text-sm font-medium rounded-md hover:k-bg-peach"
    }, "저장하고 면접 질문 설계하기 →"), /*#__PURE__*/React.createElement("button", {
      onClick: cancel,
      className: "px-4 py-2.5 text-sm k-text-muted hover:underline ml-auto"
    }, "취소")));
  }

  /* ---------- 목록/대시보드 ---------- */
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "font-serif text-xl k-text-ink"
  }, "JD 작성·관리"), /*#__PURE__*/React.createElement("p", {
    className: "k-fs13 k-text-muted mt-1"
  }, "채용 공고를 작성하고, 담당 업무를 면접 설계로 바로 넘깁니다. ", /*#__PURE__*/React.createElement("span", {
    className: "k-text-amber"
  }, "모든 부서가 같은 목록을 공유합니다."))), /*#__PURE__*/React.createElement("button", {
    onClick: openNew,
    className: "px-5 py-2.5 k-bg-terra k-white text-sm font-medium rounded-md hover:k-bg-ink"
  }, "+ 새 JD 작성")), loading ? /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-dashed k-border-line rounded-lg p-12 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "k-fs14 k-text-muted"
  }, "공유 JD 목록을 불러오는 중…")) : jds.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-dashed k-border-line rounded-lg p-12 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "k-fs14 k-text-muted"
  }, "아직 작성한 JD가 없습니다."), /*#__PURE__*/React.createElement("button", {
    onClick: openNew,
    className: "mt-3 px-4 py-2 k-bg-terra k-white k-fs13 rounded-md hover:k-bg-ink"
  }, "첫 JD 작성하기")) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white border k-border-line rounded-lg overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden sm:grid grid-cols-[1.6fr_1fr_0.8fr_0.9fr_0.7fr_auto] gap-3 px-5 py-3 k-bg-sand border-b k-border-line font-mono k-fs10 tracking-widest k-text-muted uppercase"
  }, /*#__PURE__*/React.createElement("span", null, "직무명"), /*#__PURE__*/React.createElement("span", null, "채용부서"), /*#__PURE__*/React.createElement("span", null, "작성자"), /*#__PURE__*/React.createElement("span", null, "검토 상태"), /*#__PURE__*/React.createElement("span", null, "공고"), /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement("div", {
    className: "k-divide-line"
  }, jds.map(jd => {
    const badge = {
      "작성중": "k-bg-sand k-text-muted",
      "검토요청": "k-bg-peach k-text-amber",
      "검토완료": "k-bg-terra k-white"
    }[jd.review];
    return /*#__PURE__*/React.createElement("div", {
      key: jd.id,
      className: "grid sm:grid-cols-[1.6fr_1fr_0.8fr_0.9fr_0.7fr_auto] gap-2 sm:gap-3 px-5 py-4 items-center"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "k-fs15 font-medium k-text-ink"
    }, jd.title || "제목 없음"), /*#__PURE__*/React.createElement("span", {
      className: "font-mono k-fs10 k-text-amber k-bg-peach rounded px-1.5 py-0.5"
    }, TRACK[jd.track].label)), /*#__PURE__*/React.createElement("span", {
      className: "k-fs11 k-text-muted"
    }, "담당 업무 ", dutyCount(jd), "개")), /*#__PURE__*/React.createElement("span", {
      className: "k-fs13 k-text-muted"
    }, jd.dept || "-"), /*#__PURE__*/React.createElement("span", {
      className: "k-fs13 k-text-muted"
    }, jd.author || "-"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      className: `k-fs11 rounded px-2 py-1 ${badge}`
    }, jd.review)), /*#__PURE__*/React.createElement("span", null, jd.posted ? /*#__PURE__*/React.createElement("span", {
      className: "k-fs11 k-text-terra font-medium"
    }, "✓ 등록") : /*#__PURE__*/React.createElement("span", {
      className: "k-fs11 k-text-muted"
    }, "미등록")), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-1.5 justify-end"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => sendToInterview(jd),
      title: "면접 설계로 담당 업무 보내기",
      className: "k-fs12 px-2.5 py-1.5 k-bg-terra k-white rounded hover:k-bg-ink whitespace-nowrap"
    }, "면접 설계 →"), /*#__PURE__*/React.createElement("button", {
      onClick: () => openEdit(jd),
      className: "k-fs12 px-2.5 py-1.5 border k-border-line rounded hover:k-border-amber k-text-muted"
    }, "수정"), /*#__PURE__*/React.createElement("button", {
      onClick: () => remove(jd.id),
      className: "k-fs12 px-2 py-1.5 k-text-muted hover:k-text-err"
    }, "✕")));
  }))));
}

/* ══════════════════ 메인 앱 ══════════════════ */
const blankTrack = () => ({
  tasks: [newTask(), newTask()],
  candidate: "",
  interviewer: "",
  overall: ""
});
function App() {
  const [track, setTrack] = useState("new");
  const [section, setSection] = useState("jd"); // jd | interview | calendar
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("design");
  const [store, setStore] = useState({
    new: blankTrack(),
    exp: blankTrack()
  });
  const [jds, setJdsRaw] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);
  const toast = useCallback(m => {
    setToastMsg(m);
    setTimeout(() => setToastMsg(null), 2600);
  }, []);
  const data = store[track];
  const setData = useCallback(fn => setStore(s => ({
    ...s,
    [track]: typeof fn === "function" ? fn(s[track]) : fn
  })), [track]);

  // JD 저장소: 구글 시트에서 로드
  const [jdLoading, setJdLoading] = useState(true);
  useEffect(() => {
    gsLoad("jd").then(rows => {
      setJdsRaw(rows.sort((a, b) => (b.ts || 0) - (a.ts || 0)));
    }).catch(() => {
      toast("JD 목록을 불러오지 못했습니다. 네트워크나 시트 URL을 확인하세요.");
    }).finally(() => setJdLoading(false));
  }, [toast]);

  // JD 저장(추가/수정): 화면 먼저 갱신 → 시트에 반영
  const saveJd = useCallback(record => {
    setJdsRaw(list => {
      const exists = list.some(x => x.id === record.id);
      const next = exists ? list.map(x => x.id === record.id ? record : x) : [record, ...list];
      return next.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    });
    gsUpsert("jd", record).catch(() => toast("시트 저장 실패 — 잠시 후 다시 시도하세요."));
  }, [toast]);

  // JD 삭제
  const deleteJd = useCallback(id => {
    setJdsRaw(list => list.filter(x => x.id !== id));
    gsDelete("jd", id).catch(() => toast("시트 삭제 실패 — 잠시 후 다시 시도하세요."));
  }, [toast]);

  // JD 담당 업무 → 면접 설계 STEP1 핵심 업무로 연동
  const sendToInterview = useCallback((jdTrack, duties) => {
    setTrack(jdTrack);
    setStore(s => ({
      ...s,
      [jdTrack]: {
        ...s[jdTrack],
        tasks: duties.map(d => newTask(d))
      }
    }));
    setSection("interview");
    setStep(1);
    toast(`담당 업무 ${duties.length}개를 ${TRACK[jdTrack].label} 면접 설계로 보냈습니다.`);
  }, [toast]);
  const {
    g,
    avg
  } = gradeOf(data.tasks);
  const exportEval = () => {
    const tk = TRACK[track];
    let o = `구조화 면접 평가 기록 (${tk.label})\n지원자: ${data.candidate || "-"}\n면접관: ${data.interviewer || "-"}\n일시: ${new Date().toLocaleString("ko-KR")}\n최종 등급: ${g}${avg !== null ? ` (가중평균 ${avg.toFixed(2)}/5.00)` : ""}\n${"=".repeat(50)}\n`;
    data.tasks.forEach((x, i) => {
      o += `\n[업무 ${i + 1}] ${x.title}\n행동지표: ${x.indicator}\n도입질문: ${x.intro}\n탐침질문: ${x.probes.map((p, n) => `${n + 1}) ${p}`).join(" ")}\n`;
      STAR.forEach(m => {
        o += `  ${m.k}(${m.name})${m.key ? "★" : " "} [${x.eval[m.k].grade || "-"}]\n     검증포인트: ${x.eval[m.k].check || "-"}\n     답변 근거 : ${x.eval[m.k].note || "-"}\n`;
      });
    });
    o += `\n총평\n${data.overall || "-"}\n`;
    const blob = new Blob([o], {
      type: "text/plain;charset=utf-8"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `면접평가_${data.candidate || "지원자"}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const steps = [{
    n: 1,
    t: "핵심 업무 → 행동지표",
    d: "무엇을 볼 것인가"
  }, {
    n: 2,
    t: "질문 설계",
    d: "어떻게 물을 것인가"
  }, {
    n: 3,
    t: "검증포인트 → 평가",
    d: "무엇이 확인되면 합격인가"
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen k-bg-cream font-sans k-text-ink",
    style: {
      fontFamily: '"IBM Plex Sans KR", system-ui, sans-serif'
    }
  }, /*#__PURE__*/React.createElement("style", null, `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&family=Noto+Serif+KR:wght@500;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .font-serif{font-family:"Noto Serif KR",serif}.font-mono{font-family:"IBM Plex Mono",monospace}
.k-bg-ink{background-color:#2E2119}
.k-bg-coffee{background-color:#3B2A1E}
.k-bg-brown{background-color:#4A3628}
.k-bg-terra{background-color:#9C4A2E}
.k-bg-line{background-color:#E4DACB}
.k-bg-line2{background-color:#E7DBC9}
.k-bg-sand{background-color:#EFE6D8}
.k-bg-peach{background-color:#F3E4D6}
.k-bg-peach-o40{background-color:rgba(243,228,214,0.4)}
.k-bg-cream{background-color:#F7F1E7}
.k-bg-cream-o60{background-color:rgba(247,241,231,0.6)}
.k-bg-cream-o95{background-color:rgba(247,241,231,0.95)}
.k-border-terra{border-color:#9C4A2E}
.k-border-amber{border-color:#B25A34}
.k-border-amber-o30{border-color:rgba(178,90,52,0.3)}
.k-border-amber-o40{border-color:rgba(178,90,52,0.4)}
.k-border-line{border-color:#E4DACB}
.k-border-line3{border-color:#F1EADF}
.k-divide-line>*+*{border-top-width:1px;border-color:#E4DACB}
.k-ring-amber{--tw-ring-color:#B25A34}
.k-ring-amber-o15{--tw-ring-color:rgba(178,90,52,0.15)}
.k-text-ink{color:#2E2119}
.k-text-ink-o30{color:rgba(46,33,25,0.3)}
.k-text-muted{color:#7A6A5D}
.k-text-warn{color:#8A5A00}
.k-text-terra{color:#9C4A2E}
.k-text-brassd{color:#A8792B}
.k-text-err{color:#B23A26}
.k-text-amber{color:#B25A34}
.k-text-gold{color:#D9A441}
.k-fs9{font-size:9px;line-height:1.45}
.k-fs10{font-size:10px;line-height:1.45}
.k-fs11{font-size:11px;line-height:1.45}
.k-fs12{font-size:12px;line-height:1.45}
.k-fs13{font-size:13px;line-height:1.45}
.k-fs14{font-size:14px;line-height:1.45}
.k-fs15{font-size:15px;line-height:1.45}
.k-tr018{letter-spacing:0.18em}
.k-tr022{letter-spacing:0.22em}
.k-minh76{min-height:76px}
.k-w200{width:200px}
.k-g-125{display:grid;grid-template-columns:1.25fr 1fr}
@media(min-width:768px){.md\:k-g-125{display:grid;grid-template-columns:1.25fr 1fr}}
.k-g-14{display:grid;grid-template-columns:1.4fr 1fr}
@media(min-width:768px){.md\:k-g-14{display:grid;grid-template-columns:1.4fr 1fr}}
.k-g-19a{display:grid;grid-template-columns:190px 1fr auto}
@media(min-width:768px){.md\:k-g-19a{display:grid;grid-template-columns:190px 1fr auto}}
.k-g-19{display:grid;grid-template-columns:190px 1fr}
@media(min-width:768px){.md\:k-g-19{display:grid;grid-template-columns:190px 1fr}}
.k-g-11a{display:grid;grid-template-columns:1fr 1fr auto}
@media(min-width:768px){.md\:k-g-11a{display:grid;grid-template-columns:1fr 1fr auto}}
@media(min-width:1024px){.lg\:k-g-125{display:grid;grid-template-columns:1.25fr 1fr}}
@media(min-width:1024px){.lg\:k-g-14{display:grid;grid-template-columns:1.4fr 1fr}}
@media(min-width:640px){.sm\:k-g-11a{display:grid;grid-template-columns:1fr 1fr auto}}
.k-white{color:#ffffff}
.k-white40{color:rgba(255,255,255,.40)}
.k-am50{color:rgba(253,246,233,.82)}
.k-am70{color:rgba(245,225,190,.72)}
.k-am50b{color:rgba(245,225,190,.52)}
.k-am200{color:rgba(240,205,150,.75)}
.k-lime{color:#d7e8a8}
.k-orange{color:#f0c090}
.k-bgw10{background-color:rgba(255,255,255,.10)}
.k-bgw20{background-color:rgba(255,255,255,.20)}
.k-brw15{border-color:rgba(255,255,255,.15)}
.hover\:k-bgw20:hover{background-color:rgba(255,255,255,.20)}`), /*#__PURE__*/React.createElement("header", {
    className: "k-bg-coffee k-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto px-5 pt-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-end justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-mono k-fs11 k-tr022 k-am200 uppercase"
  }, "Structured Interview Kit"), /*#__PURE__*/React.createElement("h1", {
    className: "font-serif text-2xl sm:text-3xl mt-1.5"
  }, "같은 질문, 같은 기준, 같은 순서"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm k-am50 mt-2 max-w-2xl leading-relaxed"
  }, /*#__PURE__*/React.createElement("b", {
    className: "k-white"
  }, "JD 작성"), "부터 담당 업무를 ", /*#__PURE__*/React.createElement("b", {
    className: "k-white"
  }, "행동지표·질문·평가표"), "로 잇고, 면접 ", /*#__PURE__*/React.createElement("b", {
    className: "k-white"
  }, "가능 일정"), "까지 한곳에서 관리합니다.")), section === "interview" && /*#__PURE__*/React.createElement("div", {
    className: "hidden sm:block text-right"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-mono k-fs11 k-am50b"
  }, "최종 등급"), /*#__PURE__*/React.createElement("p", {
    className: `font-serif text-4xl leading-none mt-1 ${g === "–" ? "k-white40" : "k-white"}`
  }, g), /*#__PURE__*/React.createElement("p", {
    className: "font-mono k-fs10 k-am50b mt-1"
  }, avg !== null ? `가중평균 ${avg.toFixed(2)}/5.00` : "STEP 3에서 산출"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 flex gap-1"
  }, [["jd", "JD 작성·관리"], ["interview", "면접 설계·평가"], ["calendar", "면접 일정 캘린더"]].map(([k, label]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setSection(k),
    className: `px-5 py-2.5 text-sm font-medium rounded-t-md ${section === k ? "k-bg-cream k-text-ink" : "k-bgw10 k-am50 hover:k-bgw20"}`
  }, label)))), section === "interview" && /*#__PURE__*/React.createElement("div", {
    className: "k-bg-cream"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto px-5 pt-4 flex gap-1"
  }, ["new", "exp"].map(k => /*#__PURE__*/React.createElement("button", {
    key: k,
    onClick: () => setTrack(k),
    className: `px-5 py-2.5 text-sm font-medium rounded-t-md ${track === k ? "bg-white k-text-ink border-t border-x k-border-line" : "k-bg-sand k-text-muted hover:k-bg-line2"}`
  }, TRACK[k].label, " ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono k-fs10 opacity-60"
  }, k === "new" ? "NEW GRAD" : "EXPERIENCED")))))), section === "interview" && /*#__PURE__*/React.createElement("div", {
    className: "bg-white border-b k-border-line"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 k-fs13"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono k-fs10 tracking-widest k-text-muted uppercase"
  }, "검증 초점"), /*#__PURE__*/React.createElement("span", {
    className: "k-text-terra font-medium"
  }, TRACK[track].focus), /*#__PURE__*/React.createElement("span", {
    className: "k-text-muted"
  }, TRACK[track].base))), section === "interview" && /*#__PURE__*/React.createElement("nav", {
    className: "sticky top-0 z-30 k-bg-cream-o95 backdrop-blur border-b k-border-line"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto px-5 flex"
  }, steps.map(s => {
    const on = step === s.n;
    return /*#__PURE__*/React.createElement("button", {
      key: s.n,
      onClick: () => setStep(s.n),
      className: `flex-1 text-left px-4 py-3.5 border-b-2 ${on ? "k-border-terra" : "border-transparent hover:k-border-line"}`
    }, /*#__PURE__*/React.createElement("span", {
      className: `font-mono k-fs10 tracking-widest ${on ? "k-text-amber" : "k-text-muted"}`
    }, "STEP ", s.n), /*#__PURE__*/React.createElement("span", {
      className: `block k-fs14 font-medium ${on ? "k-text-ink" : "k-text-muted"}`
    }, s.t), /*#__PURE__*/React.createElement("span", {
      className: "hidden sm:block k-fs11 k-text-muted mt-0.5"
    }, s.d));
  }))), /*#__PURE__*/React.createElement("main", {
    className: "max-w-6xl mx-auto px-5 py-8 pb-24"
  }, section === "jd" ? /*#__PURE__*/React.createElement(JDManager, {
    jds: jds,
    saveJd: saveJd,
    deleteJd: deleteJd,
    loading: jdLoading,
    onSendToInterview: sendToInterview,
    toast: toast
  }) : section === "calendar" ? /*#__PURE__*/React.createElement(Calendar, {
    toast: toast
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, step === 1 && /*#__PURE__*/React.createElement(Step1, {
    track: track,
    data: data,
    setData: setData,
    toast: toast
  }), step === 2 && /*#__PURE__*/React.createElement(Step2, {
    track: track,
    data: data,
    setData: setData
  }), step === 3 && /*#__PURE__*/React.createElement(Step3, {
    track: track,
    data: data,
    setData: setData,
    mode: mode,
    setMode: setMode,
    toast: toast
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2 mt-8 pt-6 border-t k-border-line"
  }, step > 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(step - 1),
    className: "px-4 py-2.5 border k-border-line bg-white text-sm rounded-md hover:k-border-amber"
  }, "← STEP ", step - 1), step < 3 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(step + 1),
    className: "px-4 py-2.5 k-bg-terra k-white text-sm font-medium rounded-md hover:k-bg-ink"
  }, "STEP ", step + 1, " →"), step === 3 && mode === "live" && data.tasks.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: exportEval,
    className: "px-4 py-2.5 k-bg-terra k-white text-sm font-medium rounded-md hover:k-bg-ink"
  }, "평가 결과 .txt 저장"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (confirm("이 탭(" + TRACK[track].label + ")의 내용을 모두 지웁니다.")) setStore(s => ({
        ...s,
        [track]: blankTrack()
      }));
    },
    className: "px-4 py-2.5 text-sm k-text-err hover:underline ml-auto"
  }, "이 탭 초기화")))), /*#__PURE__*/React.createElement(Toast, {
    msg: toastMsg
  }));
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
