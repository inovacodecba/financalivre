import { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ─── Utils ───────────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
const todayStr = () => new Date().toISOString().split("T")[0];
const uid = () => Math.random().toString(36).slice(2, 9);
const thisMonth = () => new Date().toISOString().slice(0, 7);

const CATS = ["Alimentação","Transporte","Lazer","Saúde","Educação","Assinatura","Moradia","Vestuário","Outros"];
const CARD_COLORS = ["#7c6af7","#e8645a","#4ecb8d","#f5c842","#5bc8f5","#f09b3a","#c76af7","#ff6b9d"];
const PIE_COLORS = ["#7c6af7","#4ecb8d","#f5c842","#e8645a","#5bc8f5","#f09b3a","#c76af7","#6af7c7","#ff6b9d"];

// ─── Storage per user ────────────────────────────────────────────────────────
const store = {
  get: (user, key, def) => { try { return JSON.parse(localStorage.getItem(`fl_${user}_${key}`)) ?? def; } catch { return def; } },
  set: (user, key, val) => localStorage.setItem(`fl_${user}_${key}`, JSON.stringify(val)),
  getUsers: () => { try { return JSON.parse(localStorage.getItem("fl_users")) ?? []; } catch { return []; } },
  setUsers: (u) => localStorage.setItem("fl_users", JSON.stringify(u)),
  isAdmin: (name) => { try { return (JSON.parse(localStorage.getItem("fl_users")) ?? []).find(u => u.name === name)?.role === "admin"; } catch { return false; } },
  wipeUser: (name) => ["txs","dreams","salary","fixed","cards"].forEach(k => localStorage.removeItem(`fl_${name}_${k}`)),
};

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const DARK = {
  bg: "#0c0e16", surface: "#131620", surface2: "#1a1f2e", surface3: "#202535",
  border: "#252c3d", text: "#e8eaf2", muted: "#5a6180", accent: "#7c6af7",
  green: "#4ecb8d", red: "#e8645a", yellow: "#f5c842", blue: "#5bc8f5",
};
const LIGHT = {
  bg: "#f0f2f8", surface: "#ffffff", surface2: "#f5f7fc", surface3: "#eaecf5",
  border: "#dde1ef", text: "#1a1d2e", muted: "#8890b0", accent: "#6254e8",
  green: "#27ae72", red: "#d94f45", yellow: "#d4a017", blue: "#2196c4",
};

// ─── Global CSS ───────────────────────────────────────────────────────────────
const makeCSS = (t) => `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Inter:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:${t.bg};color:${t.text};font-family:'Inter',sans-serif;min-height:100vh;transition:background .25s,color .25s}
  h1,h2,h3{font-family:'Syne',sans-serif}

  /* Layout */
  .root{display:flex;flex-direction:column;min-height:100vh}
  .topbar{position:sticky;top:0;z-index:100;background:${t.surface};border-bottom:1px solid ${t.border};padding:0 16px;display:flex;align-items:center;gap:12px;height:56px}
  .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:1.15rem;color:${t.accent};letter-spacing:-0.5px;flex-shrink:0}
  .logo em{color:${t.text};font-style:normal}
  .topbar-right{margin-left:auto;display:flex;align-items:center;gap:8px}
  .user-badge{background:${t.surface2};border:1px solid ${t.border};border-radius:50px;padding:5px 12px;font-size:.78rem;font-weight:600;color:${t.muted};display:flex;align-items:center;gap:6px}
  .avatar{width:24px;height:24px;border-radius:50%;background:${t.accent};color:#fff;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;flex-shrink:0}

  /* Desktop sidebar + mobile bottom nav */
  .layout{display:flex;flex:1}
  .sidebar{width:200px;flex-shrink:0;background:${t.surface};border-right:1px solid ${t.border};padding:16px 8px;display:flex;flex-direction:column;gap:2px;position:sticky;top:56px;height:calc(100vh - 56px);overflow-y:auto}
  .nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;border:none;background:none;color:${t.muted};font-family:'Inter',sans-serif;font-size:.85rem;font-weight:500;cursor:pointer;width:100%;text-align:left;transition:all .18s}
  .nav-item:hover{background:${t.surface2};color:${t.text}}
  .nav-item.active{background:${t.accent}18;color:${t.accent};font-weight:600}
  .nav-item .icon{font-size:1rem;width:22px;text-align:center}
  .main-content{flex:1;padding:20px 16px 80px;max-width:820px;margin:0 auto;width:100%}

  /* Mobile bottom nav */
  .bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:${t.surface};border-top:1px solid ${t.border};z-index:100;padding:6px 4px env(safe-area-inset-bottom)}
  .bottom-nav-inner{display:flex;justify-content:space-around}
  .bnav-btn{background:none;border:none;color:${t.muted};display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 10px;border-radius:12px;cursor:pointer;transition:all .18s;font-size:.62rem;font-weight:600;font-family:'Inter',sans-serif}
  .bnav-btn.active{color:${t.accent}}
  .bnav-btn .bicon{font-size:1.25rem}

  @media(max-width:640px){
    .sidebar{display:none}
    .bottom-nav{display:block}
    .main-content{padding:16px 12px 90px}
  }

  /* Cards & surfaces */
  .card{background:${t.surface};border:1px solid ${t.border};border-radius:10px;padding:18px}
  .card+.card{margin-top:12px}
  .card-sm{background:${t.surface2};border-radius:8px;padding:14px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  @media(max-width:560px){.grid2,.grid3{grid-template-columns:1fr}}

  /* Stat cards */
  .stat{background:${t.surface};border:1px solid ${t.border};border-radius:10px;padding:16px}
  .stat-label{font-size:.67rem;color:${t.muted};text-transform:uppercase;letter-spacing:1px;font-weight:600}
  .stat-val{font-family:'Syne',sans-serif;font-size:1.45rem;font-weight:800;margin-top:8px;line-height:1}
  .stat-sub{font-size:.7rem;color:${t.muted};margin-top:5px}

  /* Tags — smaller, squarer */
  .tag{display:inline-flex;align-items:center;gap:4px;font-size:.66rem;font-weight:700;padding:2px 8px;border-radius:4px;letter-spacing:.4px;white-space:nowrap}
  .tag-green{background:${t.green}18;color:${t.green}}
  .tag-red{background:${t.red}18;color:${t.red}}
  .tag-purple{background:${t.accent}18;color:${t.accent}}
  .tag-yellow{background:${t.yellow}18;color:${t.yellow}}
  .tag-blue{background:${t.blue}18;color:${t.blue}}

  /* Inputs */
  label{display:block;font-size:.72rem;color:${t.muted};margin-bottom:4px;font-weight:600;letter-spacing:.3px;text-transform:uppercase}
  input,select,textarea{width:100%;background:${t.surface2};border:1.5px solid ${t.border};border-radius:8px;color:${t.text};font-family:'Inter',sans-serif;font-size:.88rem;padding:10px 12px;outline:none;transition:border .2s;-webkit-appearance:none}
  input:focus,select:focus,textarea:focus{border-color:${t.accent}}
  select option{background:${t.surface2};color:${t.text}}
  .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media(max-width:480px){.form-grid{grid-template-columns:1fr}}
  .field{display:flex;flex-direction:column;gap:4px}

  /* Buttons */
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:none;border-radius:7px;font-family:'Inter',sans-serif;font-weight:600;font-size:.83rem;padding:10px 18px;cursor:pointer;transition:opacity .18s,transform .12s;white-space:nowrap}
  .btn:active{transform:scale(.97)}
  .btn-primary{background:${t.accent};color:#fff}
  .btn-primary:hover{opacity:.88}
  .btn-ghost{background:transparent;border:1.5px solid ${t.border};color:${t.muted}}
  .btn-ghost:hover{color:${t.text};border-color:${t.muted}}
  .btn-danger{background:${t.red}15;color:${t.red};border:1.5px solid ${t.red}35}
  .btn-danger:hover{background:${t.red}28}
  .btn-sm{padding:6px 12px;font-size:.76rem;border-radius:8px}
  .btn-icon{width:34px;height:34px;padding:0;border-radius:8px}

  /* List items */
  .list-item{display:flex;align-items:center;gap:10px;padding:11px 14px;background:${t.surface2};border-radius:8px;margin-bottom:5px;transition:background .15s}
  .list-item:hover{background:${t.surface3}}
  .item-main{flex:1;min-width:0}
  .item-name{font-size:.86rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .item-sub{font-size:.7rem;color:${t.muted};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .item-amount{font-family:'Syne',sans-serif;font-weight:700;font-size:.92rem;flex-shrink:0;color:${t.red}}

  /* Progress */
  .progress-bar{background:${t.surface3};border-radius:2px;height:5px;overflow:hidden}
  .progress-fill{height:100%;border-radius:2px;transition:width .5s cubic-bezier(.4,0,.2,1)}

  /* Alerts */
  .alert{border-radius:8px;padding:10px 14px;font-size:.8rem;font-weight:500;margin-bottom:12px;display:flex;align-items:flex-start;gap:8px;line-height:1.5}
  .alert-info{background:${t.accent}12;border:1px solid ${t.accent}30;color:${t.accent}}
  .alert-warn{background:${t.yellow}12;border:1px solid ${t.yellow}30;color:${t.yellow}}
  .alert-good{background:${t.green}12;border:1px solid ${t.green}30;color:${t.green}}
  .alert-bad{background:${t.red}12;border:1px solid ${t.red}30;color:${t.red}}

  /* Section headers */
  .sec-title{font-family:'Syne',sans-serif;font-size:.88rem;font-weight:700;margin-bottom:14px;color:${t.text};letter-spacing:-.1px}
  .sec-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;flex-wrap:wrap}
  hr{border:none;border-top:1px solid ${t.border};margin:14px 0}

  /* Filter pills */
  .pill-bar{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px}
  .pill{background:${t.surface2};border:1px solid ${t.border};border-radius:5px;color:${t.muted};font-size:.71rem;font-weight:600;padding:5px 11px;cursor:pointer;transition:all .15s;white-space:nowrap;letter-spacing:.2px}
  .pill.on{background:${t.accent};border-color:${t.accent};color:#fff}
  .pill:hover:not(.on){color:${t.text}}

  /* Card chip (credit card visual) */
  .cc-chip{border-radius:10px;padding:16px;color:#fff;position:relative;overflow:hidden;min-width:0}
  .cc-chip::after{content:'';position:absolute;right:-20px;top:-20px;width:100px;height:100px;border-radius:50%;background:#ffffff10}
  .cc-chip::before{content:'';position:absolute;right:20px;bottom:-30px;width:80px;height:80px;border-radius:50%;background:#ffffff08}
  .cc-name{font-family:'Syne',sans-serif;font-weight:700;font-size:.88rem;position:relative}
  .cc-owner{font-size:.68rem;opacity:.7;margin-top:2px;position:relative}
  .cc-limit{font-family:'Syne',sans-serif;font-size:1.15rem;font-weight:800;margin-top:12px;position:relative}
  .cc-used{font-size:.68rem;opacity:.7;position:relative}

  /* Dream card */
  .dream-card{background:${t.surface2};border-radius:10px;padding:16px;margin-bottom:8px;border:1px solid ${t.border}}
  .dream-name{font-family:'Syne',sans-serif;font-weight:700;font-size:.92rem}
  .dream-meta{font-size:.7rem;color:${t.muted};margin-top:3px}

  /* Login */
  .login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:${t.bg};padding:20px}
  .login-box{background:${t.surface};border:1px solid ${t.border};border-radius:20px;padding:32px 28px;width:100%;max-width:380px}
  .login-logo{font-family:'Syne',sans-serif;font-weight:800;font-size:1.6rem;color:${t.accent};text-align:center;margin-bottom:4px}
  .login-logo em{color:${t.text};font-style:normal}
  .login-sub{text-align:center;color:${t.muted};font-size:.82rem;margin-bottom:28px}
  .login-tabs{display:flex;background:${t.surface2};border-radius:10px;padding:3px;margin-bottom:20px}
  .login-tab{flex:1;background:none;border:none;border-radius:8px;padding:8px;font-family:'Inter',sans-serif;font-weight:600;font-size:.82rem;cursor:pointer;color:${t.muted};transition:all .18s}
  .login-tab.on{background:${t.surface};color:${t.text}}
  .login-err{color:${t.red};font-size:.78rem;margin-top:6px;text-align:center}
  .toggle-theme{background:${t.surface2};border:1.5px solid ${t.border};border-radius:50px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.95rem;color:${t.muted};transition:all .18s;flex-shrink:0}
  .toggle-theme:hover{border-color:${t.accent};color:${t.accent}}
  .empty-state{text-align:center;padding:32px 16px;color:${t.muted};font-size:.85rem}
  .empty-state .ei{font-size:2.5rem;margin-bottom:10px}

  /* Scrollbar */
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:${t.border};border-radius:4px}

  /* Toast */
  .toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:${t.text};color:${t.bg};border-radius:50px;padding:10px 20px;font-size:.82rem;font-weight:600;z-index:999;pointer-events:none;opacity:0;transition:opacity .3s}
  .toast.show{opacity:1}
`;

// ─── Pie chart ────────────────────────────────────────────────────────────────
function Pie({ data, size = 110 }) {
  const total = data.reduce((s, d) => s + d.v, 0);
  if (!total) return null;
  let ang = -90;
  const r = size / 2 - 10, cx = size / 2, cy = size / 2;
  const slices = data.map((d, i) => {
    const pct = d.v / total;
    const a1 = (ang * Math.PI) / 180;
    ang += pct * 360;
    const a2 = (ang * Math.PI) / 180;
    return { d: `M${cx},${cy} L${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} A${r},${r} 0 ${pct > .5 ? 1 : 0},1 ${cx + r * Math.cos(a2)},${cy + r * Math.sin(a2)} Z`, c: PIE_COLORS[i % PIE_COLORS.length], label: d.l, pct: (pct * 100).toFixed(0) };
  });
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => <path key={i} d={s.d} fill={s.c} stroke="var(--bg-stroke)" strokeWidth={2} />)}
        <circle cx={cx} cy={cy} r={r * .48} fill="var(--bg-inner)" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: ".73rem" }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: s.c, flexShrink: 0 }} />
            <span style={{ color: "var(--muted-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
            <span style={{ marginLeft: "auto", paddingLeft: 8, fontWeight: 700 }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bar({ pct, color }) {
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return <div className={`toast ${msg ? "show" : ""}`}>{msg}</div>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin, theme, toggleTheme, T }) {
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    if (!name.trim() || !pass.trim()) { setErr("Preencha todos os campos."); return; }
    const users = store.getUsers();
    if (tab === "login") {
      const u = users.find(u => u.name.toLowerCase() === name.toLowerCase() && u.pass === pass);
      if (!u) { setErr("Usuário ou senha incorretos."); return; }
      onLogin(u.name, u.role || "user");
    } else {
      if (users.find(u => u.name.toLowerCase() === name.toLowerCase())) { setErr("Nome já em uso. Escolha outro."); return; }
      const role = users.length === 0 ? "admin" : "user";
      const newUser = { name: name.trim(), pass, role };
      store.setUsers([...users, newUser]);
      onLogin(newUser.name, newUser.role);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button className="toggle-theme" onClick={toggleTheme}>{theme === "dark" ? "☀️" : "🌙"}</button>
        </div>
        <div className="login-logo">finança<em>livre</em></div>
        <div className="login-sub">Seu controle financeiro pessoal</div>
        <div className="login-tabs">
          <button className={`login-tab ${tab === "login" ? "on" : ""}`} onClick={() => { setTab("login"); setErr(""); }}>Entrar</button>
          <button className={`login-tab ${tab === "reg" ? "on" : ""}`} onClick={() => { setTab("reg"); setErr(""); }}>Criar conta</button>
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Usuário</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome ou apelido" onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Senha</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••" onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        {err && <div className="login-err">{err}</div>}
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={submit}>
          {tab === "login" ? "Entrar" : "Criar conta"}
        </button>
        <p style={{ textAlign: "center", fontSize: ".72rem", color: T.muted, marginTop: 16, lineHeight: 1.6 }}>
          Dados salvos localmente neste dispositivo.
          {tab === "reg" && store.getUsers().length === 0 && (
            <><br /><span style={{ color: T.accent, fontWeight: 600 }}>A primeira conta criada recebe acesso de Administrador.</span></>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ data, T, setTab }) {
  const { txs, salary, fixed, dreams, cards } = data;
  const m = thisMonth();
  const mTxs = txs.filter(t => t.date.startsWith(m));
  const mySpend = mTxs.filter(t => t.owner === "Eu").reduce((s, t) => s + t.amount, 0);
  const paiSpend = mTxs.filter(t => t.owner === "Pai").reduce((s, t) => s + t.amount, 0);
  const fixedTotal = fixed.reduce((s, f) => s + f.amount, 0);
  const dreamSavings = dreams.filter(d => !d.done).reduce((s, d) => s + (d.monthly || 0), 0);
  const available = salary - mySpend - fixedTotal - dreamSavings;
  const urgentDream = dreams.filter(d => !d.done).sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];

  const catData = CATS.map(c => ({ l: c, v: mTxs.filter(t => t.cat === c && t.owner === "Eu").reduce((s, t) => s + t.amount, 0) })).filter(d => d.v > 0);

  // Per-card spend
  const cardSpend = cards.map(c => ({
    ...c,
    spent: mTxs.filter(t => t.cardId === c.id).reduce((s, t) => s + t.amount, 0),
  }));

  return (
    <div>
      {available < 0 && (
        <div className="alert alert-bad">⚠️ Suas despesas superam a renda em <strong>{fmt(Math.abs(available))}</strong> este mês.{" "}<span style={{ textDecoration: "underline", cursor: "pointer", fontWeight: 700 }} onClick={() => setTab("action")}>Ver plano de ação →</span></div>
      )}
      {urgentDream && (() => {
        const weeksGone = Math.floor((Date.now() - urgentDream.createdAt) / 604800000);
        const expected = (urgentDream.monthly / 4) * weeksGone;
        const diff = (urgentDream.saved || 0) - expected;
        return (
          <div className={`alert ${diff >= 0 ? "alert-good" : "alert-warn"}`}>
            {diff >= 0 ? "✅" : "⏳"} Meta <strong>{urgentDream.name}</strong>: {diff >= 0 ? "adiantado" : "atrasado"} em {fmt(Math.abs(diff))} esta semana.
          </div>
        );
      })()}

      <div className="grid3" style={{ marginBottom: 12 }}>
        <div className="stat">
          <div className="stat-label">Saldo livre</div>
          <div className="stat-val" style={{ color: available >= 0 ? T.green : T.red }}>{fmt(available)}</div>
          <div className="stat-sub">após fixos e metas</div>
        </div>
        <div className="stat">
          <div className="stat-label">Meus gastos</div>
          <div className="stat-val" style={{ color: T.red }}>{fmt(mySpend)}</div>
          <div className="stat-sub">este mês</div>
        </div>
        <div className="stat">
          <div className="stat-label">Gastos do Pai</div>
          <div className="stat-val" style={{ color: T.yellow }}>{fmt(paiSpend)}</div>
          <div className="stat-sub">no cartão compartilhado</div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="sec-title">Saúde financeira</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".74rem", color: T.muted, marginBottom: 4 }}>
              <span>Gastos vs salário</span>
              <span>{salary > 0 ? Math.round((mySpend / salary) * 100) : 0}%</span>
            </div>
            <Bar pct={salary > 0 ? (mySpend / salary) * 100 : 0} color={mySpend > salary * 0.7 ? T.red : T.green} />
          </div>
          {[
            { l: "Salário", v: salary, c: "tag-green" },
            { l: "Fixos", v: fixedTotal, c: "tag-red" },
            { l: "Reserva metas", v: dreamSavings, c: "tag-purple" },
            { l: "Gastos variáveis", v: mySpend, c: "tag-red" },
          ].map(r => (
            <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: ".8rem" }}>
              <span style={{ color: T.muted }}>{r.l}</span>
              <span className={`tag ${r.c}`}>{fmt(r.v)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="sec-title">Por categoria</div>
          {catData.length > 0
            ? <Pie data={catData} />
            : <div className="empty-state"><div className="ei">📊</div>Nenhum gasto ainda</div>}
        </div>
      </div>

      {cardSpend.length > 0 && (
        <div className="card">
          <div className="sec-title">Gastos por cartão (mês)</div>
          <div className="grid2">
            {cardSpend.map(c => (
              <div key={c.id} className="cc-chip" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}99)` }}>
                <div className="cc-name">💳 {c.name}</div>
                <div className="cc-owner">{c.owner === "Pai" ? "👤 Pai" : "👤 Você"}</div>
                <div className="cc-limit">{fmt(c.spent)}</div>
                <div className="cc-used">{c.limit > 0 ? `${Math.round((c.spent / c.limit) * 100)}% do limite de ${fmt(c.limit)}` : "gasto este mês"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="sec-title">Últimas transações</div>
        {txs.length === 0
          ? <div className="empty-state"><div className="ei">💸</div>Nenhuma transação. Adicione na aba Transações.</div>
          : txs.slice(0, 7).map(t => {
            const card = cards.find(c => c.id === t.cardId);
            return (
              <div key={t.id} className="list-item">
                <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: card ? card.color : (t.owner === "Pai" ? T.yellow : T.accent) }} />
                <div className="item-main">
                  <div className="item-name">{t.desc}</div>
                  <div className="item-sub">{t.cat} · {t.date}{card ? ` · ${card.name}` : ""}</div>
                </div>
                <div className="item-amount">−{fmt(t.amount)}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── CARDS ────────────────────────────────────────────────────────────────────
function Cards({ data, setData, T, toast }) {
  const { cards, txs } = data;
  const [form, setForm] = useState({ name: "", limit: "", owner: "Eu", color: CARD_COLORS[0] });

  const add = () => {
    if (!form.name) return;
    const newCard = { ...form, limit: parseFloat(form.limit) || 0, id: uid() };
    setData(d => ({ ...d, cards: [...d.cards, newCard] }));
    setForm({ name: "", limit: "", owner: "Eu", color: CARD_COLORS[0] });
    toast("Cartão adicionado!");
  };

  const del = (id) => {
    if (txs.some(t => t.cardId === id)) { toast("Remova as transações deste cartão antes."); return; }
    setData(d => ({ ...d, cards: d.cards.filter(c => c.id !== id) }));
  };

  const m = thisMonth();

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="sec-title">Novo Cartão</div>
        <div className="form-grid">
          <div className="field"><label>Nome do cartão</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Nubank, Itaú..." /></div>
          <div className="field"><label>Limite (R$) — opcional</label><input type="number" value={form.limit} onChange={e => setForm(f => ({ ...f, limit: e.target.value }))} placeholder="0,00" /></div>
          <div className="field"><label>Titular</label>
            <select value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}>
              <option>Eu</option><option>Pai</option>
            </select>
          </div>
          <div className="field">
            <label>Cor do cartão</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CARD_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: form.color === c ? `3px solid ${T.text}` : "3px solid transparent", cursor: "pointer" }} />
              ))}
            </div>
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={add}>＋ Adicionar cartão</button>
      </div>

      {cards.length === 0 && (
        <div className="empty-state"><div className="ei">💳</div>Nenhum cartão cadastrado ainda.</div>
      )}

      <div className="grid2">
        {cards.map(c => {
          const spent = txs.filter(t => t.cardId === c.id && t.date.startsWith(m)).reduce((s, t) => s + t.amount, 0);
          const pct = c.limit > 0 ? (spent / c.limit) * 100 : 0;
          return (
            <div key={c.id}>
              <div className="cc-chip" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}88)`, marginBottom: 8 }}>
                <div className="cc-name">💳 {c.name}</div>
                <div className="cc-owner">{c.owner === "Pai" ? "👤 Pai" : "👤 Você"}</div>
                <div className="cc-limit">{fmt(spent)}</div>
                <div className="cc-used">{c.limit > 0 ? `limite: ${fmt(c.limit)}` : "sem limite cadastrado"}</div>
              </div>
              {c.limit > 0 && (
                <div style={{ padding: "0 4px 4px" }}>
                  <Bar pct={pct} color={pct > 80 ? T.red : pct > 60 ? T.yellow : T.green} />
                  <div style={{ fontSize: ".7rem", color: T.muted, marginTop: 3 }}>{pct.toFixed(0)}% usado este mês</div>
                </div>
              )}
              <button className="btn btn-danger btn-sm" style={{ width: "100%" }} onClick={() => del(c.id)}>Remover</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TRANSACTIONS ────────────────────────────────────────────────────────────
function Transactions({ data, setData, T, toast }) {
  const { txs, cards } = data;

  // ── Form state ──
  const [form, setForm] = useState({
    desc: "", amount: "", cat: CATS[0], owner: "Eu", cardId: "", date: todayStr(),
    installments: 1, totalAmount: "",
  });
  const [showInstall, setShowInstall] = useState(false);

  // ── Filters ──
  const [fOwner, setFOwner]   = useState("Todos");
  const [fCard, setFCard]     = useState("Todos");
  const [fCat, setFCat]       = useState("Todas");
  const [fPeriod, setFPeriod] = useState("mes_atual");   // mes_atual | ultimos_7 | ultimos_30 | mes_ant | trim | custom
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [groupBy, setGroupBy]   = useState("lista");      // lista | data | categoria

  // ── Add transaction(s) ──
  const add = () => {
    if (!form.desc || !form.amount) return;
    const n = parseInt(form.installments) || 1;
    const baseAmt = n > 1
      ? parseFloat(form.totalAmount || form.amount) / n
      : parseFloat(form.amount);
    if (isNaN(baseAmt)) return;

    const newTxs = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(form.date + "T12:00:00");
      d.setMonth(d.getMonth() + i);
      const dateStr = d.toISOString().split("T")[0];
      newTxs.push({
        ...form,
        amount: parseFloat(baseAmt.toFixed(2)),
        id: uid(),
        date: dateStr,
        installmentOf: n > 1 ? `${i + 1}/${n}` : undefined,
        installmentGroupId: n > 1 ? uid() : undefined,
      });
    }
    setData(d => ({ ...d, txs: [...newTxs, ...d.txs] }));
    setForm(f => ({ ...f, desc: "", amount: "", totalAmount: "", installments: 1 }));
    setShowInstall(false);
    toast(n > 1 ? `${n} parcelas registradas!` : "Transação registrada!");
  };

  const del = (id) => setData(d => ({ ...d, txs: d.txs.filter(t => t.id !== id) }));

  // ── Period filter logic ──
  const periodBounds = useMemo(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    if (fPeriod === "mes_atual") {
      const from = `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
      const to   = ymd(new Date(now.getFullYear(), now.getMonth()+1, 0));
      return { from, to };
    }
    if (fPeriod === "ultimos_7") {
      const from = new Date(now); from.setDate(from.getDate()-6);
      return { from: ymd(from), to: ymd(now) };
    }
    if (fPeriod === "ultimos_30") {
      const from = new Date(now); from.setDate(from.getDate()-29);
      return { from: ymd(from), to: ymd(now) };
    }
    if (fPeriod === "mes_ant") {
      const y = now.getMonth() === 0 ? now.getFullYear()-1 : now.getFullYear();
      const m = now.getMonth() === 0 ? 12 : now.getMonth();
      const from = `${y}-${pad(m)}-01`;
      const to   = ymd(new Date(y, m, 0));
      return { from, to };
    }
    if (fPeriod === "trim") {
      const from = new Date(now); from.setDate(from.getDate()-89);
      return { from: ymd(from), to: ymd(now) };
    }
    if (fPeriod === "tudo") return { from: "0000-01-01", to: "9999-12-31" };
    // custom
    return { from: dateFrom || "0000-01-01", to: dateTo || "9999-12-31" };
  }, [fPeriod, dateFrom, dateTo]);

  const filtered = useMemo(() => txs.filter(t => {
    const inPeriod = t.date >= periodBounds.from && t.date <= periodBounds.to;
    return (
      inPeriod &&
      (fOwner === "Todos" || t.owner === fOwner) &&
      (fCard  === "Todos" || t.cardId === fCard) &&
      (fCat   === "Todas" || t.cat === fCat)
    );
  }).sort((a, b) => b.date.localeCompare(a.date)), [txs, periodBounds, fOwner, fCard, fCat]);

  const total    = filtered.reduce((s, t) => s + t.amount, 0);
  const myTotal  = filtered.filter(t => t.owner === "Eu").reduce((s, t) => s + t.amount, 0);
  const paiTotal = filtered.filter(t => t.owner === "Pai").reduce((s, t) => s + t.amount, 0);

  // ── Group by date ──
  const grouped = useMemo(() => {
    if (groupBy === "lista") return null;
    if (groupBy === "data") {
      const map = {};
      filtered.forEach(t => { (map[t.date] = map[t.date] || []).push(t); });
      return Object.entries(map).sort(([a],[b]) => b.localeCompare(a));
    }
    if (groupBy === "categoria") {
      const map = {};
      filtered.forEach(t => { (map[t.cat] = map[t.cat] || []).push(t); });
      return Object.entries(map).sort(([,a],[,b]) => b.reduce((s,t)=>s+t.amount,0) - a.reduce((s,t)=>s+t.amount,0));
    }
  }, [filtered, groupBy]);

  const PERIODS = [
    { id: "mes_atual", label: "Este mês" },
    { id: "ultimos_7", label: "7 dias" },
    { id: "ultimos_30", label: "30 dias" },
    { id: "mes_ant",  label: "Mês anterior" },
    { id: "trim",     label: "Trimestre" },
    { id: "tudo",     label: "Tudo" },
    { id: "custom",   label: "Personalizado" },
  ];

  const TxRow = ({ t }) => {
    const card = cards.find(c => c.id === t.cardId);
    return (
      <div className="list-item">
        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: card ? card.color : (t.owner === "Pai" ? T.yellow : T.accent) }} />
        <div className="item-main">
          <div className="item-name">
            {t.desc}
            {t.installmentOf && (
              <span style={{ fontSize: ".66rem", background: T.accent + "22", color: T.accent, borderRadius: 4, padding: "1px 6px", marginLeft: 6, fontWeight: 700 }}>
                {t.installmentOf}
              </span>
            )}
          </div>
          <div className="item-sub">
            {t.cat} · {t.date} · {t.owner}{card ? ` · ${card.name}` : " · Pix/Dinheiro"}
          </div>
        </div>
        <div className="item-amount" style={{ marginRight: 6 }}>−{fmt(t.amount)}</div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => del(t.id)} style={{ flexShrink: 0 }}>✕</button>
      </div>
    );
  };

  const GroupHeader = ({ label, items }) => {
    const sub = items.reduce((s, t) => s + t.amount, 0);
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "14px 0 6px", padding: "0 2px" }}>
        <span style={{ fontSize: ".72rem", fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".6px" }}>{label}</span>
        <span style={{ fontSize: ".78rem", fontFamily: "Syne", fontWeight: 700, color: T.red }}>−{fmt(sub)}</span>
      </div>
    );
  };

  return (
    <div>
      {/* ── Add form ── */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="sec-title">Registrar gasto</div>
        <div className="form-grid">
          <div className="field"><label>Descrição</label>
            <input value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Ex: Mercado, Netflix..." />
          </div>
          <div className="field"><label>Valor {showInstall ? "por parcela (R$)" : "(R$)"}</label>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
          </div>
          <div className="field"><label>Categoria</label>
            <select value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field"><label>Pago por</label>
            <select value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value, cardId: "" }))}>
              <option>Eu</option><option>Pai</option>
            </select>
          </div>
          <div className="field"><label>Cartão</label>
            <select value={form.cardId} onChange={e => setForm(f => ({ ...f, cardId: e.target.value }))}>
              <option value="">— Pix / Dinheiro —</option>
              {cards.map(c => <option key={c.id} value={c.id}>{c.name} ({c.owner})</option>)}
            </select>
          </div>
          <div className="field"><label>Data {showInstall ? "da 1ª parcela" : ""}</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
        </div>

        {/* Installment toggle */}
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setShowInstall(s => !s)}
            style={{ background: "none", border: `1px solid ${showInstall ? T.accent : T.border}`, borderRadius: 6, color: showInstall ? T.accent : T.muted, fontSize: ".75rem", fontWeight: 600, padding: "5px 12px", cursor: "pointer", transition: "all .18s" }}
          >
            {showInstall ? "✕ Cancelar parcelamento" : "＋ Compra parcelada"}
          </button>
        </div>

        {showInstall && (
          <div className="form-grid" style={{ marginTop: 10, padding: "14px", background: T.surface2, borderRadius: 8, border: `1px solid ${T.accent}30` }}>
            <div className="field">
              <label>Número de parcelas</label>
              <input type="number" min={2} max={48} value={form.installments}
                onChange={e => setForm(f => ({ ...f, installments: parseInt(e.target.value)||1 }))} placeholder="Ex: 12" />
            </div>
            <div className="field">
              <label>Valor total (R$)</label>
              <input type="number" value={form.totalAmount}
                onChange={e => {
                  const total = parseFloat(e.target.value)||0;
                  const n = parseInt(form.installments)||1;
                  setForm(f => ({ ...f, totalAmount: e.target.value, amount: n > 0 ? (total/n).toFixed(2) : "" }));
                }}
                placeholder="Valor cheio da compra" />
            </div>
            {form.installments > 1 && parseFloat(form.totalAmount) > 0 && (
              <div style={{ gridColumn: "1/-1" }}>
                <div style={{ background: T.surface3, borderRadius: 6, padding: "10px 14px", fontSize: ".78rem", color: T.muted }}>
                  <strong style={{ color: T.text }}>{form.installments}×</strong> de{" "}
                  <strong style={{ color: T.accent }}>{fmt(parseFloat(form.totalAmount) / form.installments)}</strong>
                  {" "}· Total: <strong style={{ color: T.text }}>{fmt(parseFloat(form.totalAmount))}</strong>
                  {" "}· De <strong>{new Date(form.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}</strong>
                  {" "}até <strong>{(() => { const d = new Date(form.date + "T12:00:00"); d.setMonth(d.getMonth() + parseInt(form.installments) - 1); return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }); })()}</strong>
                </div>
              </div>
            )}
          </div>
        )}

        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={add}>
          {showInstall && form.installments > 1 ? `Registrar ${form.installments} parcelas` : "＋ Adicionar"}
        </button>
      </div>

      {/* ── Period filter ── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: ".68rem", color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 7 }}>Período</div>
        <div className="pill-bar">
          {PERIODS.map(p => (
            <button key={p.id} className={`pill ${fPeriod === p.id ? "on" : ""}`} onClick={() => setFPeriod(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        {fPeriod === "custom" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            <div className="field" style={{ flex: 1, minWidth: 140 }}>
              <label>De</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 140 }}>
              <label>Até</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* ── Owner + card filters ── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: ".68rem", color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 7 }}>Titular</div>
        <div className="pill-bar" style={{ marginBottom: 0 }}>
          {[
            { id: "Todos", label: "Ambos" },
            { id: "Eu",    label: "Somente meus" },
            { id: "Pai",   label: "Somente do Pai" },
          ].map(o => (
            <button key={o.id} className={`pill ${fOwner === o.id ? "on" : ""}`} onClick={() => setFOwner(o.id)}>{o.label}</button>
          ))}
        </div>
      </div>

      {cards.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: ".68rem", color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 7 }}>Cartão</div>
          <div className="pill-bar" style={{ marginBottom: 0 }}>
            <button className={`pill ${fCard === "Todos" ? "on" : ""}`} onClick={() => setFCard("Todos")}>Todos</button>
            {cards.map(c => (
              <button key={c.id} className={`pill ${fCard === c.id ? "on" : ""}`} onClick={() => setFCard(c.id)}
                style={fCard === c.id ? {} : {}}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: ".68rem", color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 7 }}>Categoria</div>
        <div className="pill-bar" style={{ marginBottom: 0 }}>
          <button className={`pill ${fCat === "Todas" ? "on" : ""}`} onClick={() => setFCat("Todas")}>Todas</button>
          {CATS.map(c => <button key={c} className={`pill ${fCat === c ? "on" : ""}`} onClick={() => setFCat(c)}>{c}</button>)}
        </div>
      </div>

      {/* ── View mode + summary ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ background: T.surface2, borderRadius: 7, padding: "7px 12px", fontSize: ".76rem" }}>
            <span style={{ color: T.muted }}>Total </span><strong style={{ color: T.red, fontFamily: "Syne" }}>{fmt(total)}</strong>
          </div>
          {fOwner === "Todos" && myTotal > 0 && (
            <div style={{ background: T.surface2, borderRadius: 7, padding: "7px 12px", fontSize: ".76rem" }}>
              <span style={{ color: T.muted }}>Meus </span><strong style={{ color: T.accent, fontFamily: "Syne" }}>{fmt(myTotal)}</strong>
            </div>
          )}
          {fOwner === "Todos" && paiTotal > 0 && (
            <div style={{ background: T.surface2, borderRadius: 7, padding: "7px 12px", fontSize: ".76rem" }}>
              <span style={{ color: T.muted }}>Pai </span><strong style={{ color: T.yellow, fontFamily: "Syne" }}>{fmt(paiTotal)}</strong>
            </div>
          )}
          <div style={{ background: T.surface2, borderRadius: 7, padding: "7px 12px", fontSize: ".76rem", color: T.muted }}>{filtered.length} transações</div>
        </div>

        {/* Group toggle */}
        <div style={{ display: "flex", background: T.surface2, borderRadius: 7, padding: 3, gap: 2, border: `1px solid ${T.border}` }}>
          {[{ id: "lista", icon: "☰" }, { id: "data", icon: "◫" }, { id: "categoria", icon: "▤" }].map(v => (
            <button key={v.id} onClick={() => setGroupBy(v.id)}
              title={v.id === "lista" ? "Lista" : v.id === "data" ? "Por data" : "Por categoria"}
              style={{ background: groupBy === v.id ? T.surface : "transparent", border: "none", borderRadius: 5, width: 30, height: 28, cursor: "pointer", color: groupBy === v.id ? T.text : T.muted, fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: T.muted, fontSize: ".85rem" }}>
          <div style={{ fontSize: "1.8rem", marginBottom: 10, opacity: .4 }}>◫</div>
          Nenhuma transação neste período.
        </div>
      )}

      {groupBy === "lista" && filtered.map(t => <TxRow key={t.id} t={t} />)}

      {grouped && grouped.map(([label, items]) => (
        <div key={label}>
          <GroupHeader label={groupBy === "data"
            ? new Date(label + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "long" })
            : label
          } items={items} />
          {items.map(t => <TxRow key={t.id} t={t} />)}
        </div>
      ))}
    </div>
  );
}

// ─── DREAMS ──────────────────────────────────────────────────────────────────
function Dreams({ data, setData, T, toast }) {
  const { dreams, salary, txs, fixed, cards } = data;
  const [form, setForm] = useState({ name: "", cost: "", deadline: "", emoji: "✨" });
  const [savingVal, setSavingVal] = useState({});

  const fixedTotal = fixed.reduce((s, f) => s + f.amount, 0);
  const m = thisMonth();
  const mySpend = txs.filter(t => t.date.startsWith(m) && t.owner === "Eu").reduce((s, t) => s + t.amount, 0);
  const totalDreamSavings = dreams.filter(d => !d.done).reduce((s, d) => s + (d.monthly || 0), 0);
  const spare = salary - fixedTotal - mySpend - totalDreamSavings;

  const EMOJIS = ["✨","🏠","🚗","💍","✈️","📱","💪","🎓","🎸","🐶","👶","💻","🎮","📷","🏋️","🌍"];

  const add = () => {
    if (!form.name || !form.cost || !form.deadline) return;
    const months = Math.max(1, Math.ceil((new Date(form.deadline) - Date.now()) / 2592000000));
    const monthly = parseFloat(form.cost) / months;
    setData(d => ({ ...d, dreams: [{ ...form, cost: parseFloat(form.cost), monthly, months, id: uid(), saved: 0, createdAt: Date.now(), done: false }, ...d.dreams] }));
    setForm({ name: "", cost: "", deadline: "", emoji: "✨" });
    toast("Meta criada!");
  };

  const addSaving = (id) => {
    const v = parseFloat(savingVal[id] || 0);
    if (!v) return;
    setData(d => ({ ...d, dreams: d.dreams.map(x => x.id === id ? { ...x, saved: (x.saved || 0) + v } : x) }));
    setSavingVal(s => ({ ...s, [id]: "" }));
    toast("Poupança registrada!");
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="sec-title">Nova meta / sonho</div>
        <div className="form-grid">
          <div className="field"><label>Nome</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Viagem, notebook..." /></div>
          <div className="field"><label>Custo total (R$)</label><input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0,00" /></div>
          <div className="field"><label>Prazo</label><input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
          <div className="field">
            <label>Emoji</label>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {EMOJIS.map(e => <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))} style={{ background: form.emoji === e ? T.accent : "var(--surface2-c)", border: form.emoji === e ? "none" : `1px solid ${T.border}`, borderRadius: 8, padding: "4px 7px", cursor: "pointer", fontSize: ".95rem" }}>{e}</button>)}
            </div>
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={add}>＋ Criar meta</button>
      </div>

      {spare < 0 && <div className="alert alert-bad">⚠️ Capacidade de poupança negativa ({fmt(spare)}). Reduza gastos antes de criar mais metas.</div>}

      {dreams.length === 0 && <div className="empty-state"><div className="ei">✨</div>Nenhuma meta ainda. Qual é o seu próximo sonho?</div>}

      {dreams.map(d => {
        const pct = d.cost > 0 ? Math.min(((d.saved || 0) / d.cost) * 100, 100) : 0;
        const weeksGone = Math.floor((Date.now() - d.createdAt) / 604800000);
        const expected = (d.monthly / 4) * weeksGone;
        const diff = (d.saved || 0) - expected;
        const viable = spare + (d.monthly || 0) >= d.monthly;
        const weeks = Math.ceil((new Date(d.deadline) - Date.now()) / 604800000);

        return (
          <div key={d.id} className="dream-card">
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div className="dream-emoji">{d.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="dream-name">{d.name}</div>
                <div className="dream-meta">{fmt(d.cost)} · até {new Date(d.deadline).toLocaleDateString("pt-BR")} · {weeks > 0 ? `${weeks} sem.` : "vencido"}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
                  <span className="tag tag-purple">Guardar {fmt(d.monthly)}/mês</span>
                  <span className={`tag ${viable ? "tag-green" : "tag-red"}`}>{viable ? "✓ Viável" : "✗ Inviável"}</span>
                  {!d.done && <span className={`tag ${diff >= 0 ? "tag-green" : "tag-yellow"}`}>{diff >= 0 ? "↑" : "↓"} {fmt(Math.abs(diff))}</span>}
                  {d.done && <span className="tag tag-green">✅ Concluído</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                {!d.done && <button className="btn btn-ghost btn-sm" onClick={() => setData(dd => ({ ...dd, dreams: dd.dreams.map(x => x.id === d.id ? { ...x, done: true } : x) }))}>✓</button>}
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setData(dd => ({ ...dd, dreams: dd.dreams.filter(x => x.id !== d.id) }))}>✕</button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".72rem", color: T.muted, marginBottom: 4 }}>
                <span>{fmt(d.saved || 0)} guardados</span><span>{pct.toFixed(0)}%</span>
              </div>
              <Bar pct={pct} color={d.done ? T.green : pct > 60 ? T.accent : T.yellow} />
            </div>

            {!d.done && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input type="number" placeholder="Registrar poupança (R$)" value={savingVal[d.id] || ""} onChange={e => setSavingVal(s => ({ ...s, [d.id]: e.target.value }))} style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={() => addSaving(d.id)}>＋</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── BAR CHART (evolução mensal) ─────────────────────────────────────────────
function BarChart({ months, values, salary, T }) {
  const max = Math.max(...values, salary, 1);
  const W = 480, H = 160, pad = { l: 52, r: 12, t: 16, b: 36 };
  const bW = Math.max(((W - pad.l - pad.r) / months.length) * 0.55, 8);
  const slot = (W - pad.l - pad.r) / months.length;

  const yTick = (v) => H - pad.b - ((v / max) * (H - pad.t - pad.b));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(max * f));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, display: "block" }}>
      {/* Grid lines */}
      {ticks.map(v => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={yTick(v)} y2={yTick(v)} stroke={T.border} strokeWidth={1} />
          <text x={pad.l - 6} y={yTick(v) + 4} textAnchor="end" fontSize={9} fill={T.muted}>
            {v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}
          </text>
        </g>
      ))}
      {/* Salary reference line */}
      <line x1={pad.l} x2={W - pad.r} y1={yTick(salary)} y2={yTick(salary)} stroke={T.green} strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
      <text x={W - pad.r - 2} y={yTick(salary) - 4} textAnchor="end" fontSize={8} fill={T.green} opacity={0.9}>salário</text>
      {/* Bars */}
      {months.map((m, i) => {
        const v = values[i];
        const x = pad.l + i * slot + slot / 2 - bW / 2;
        const barH = (v / max) * (H - pad.t - pad.b);
        const y = H - pad.b - barH;
        const over = v > salary;
        const label = new Date(m + "-15").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
        return (
          <g key={m}>
            <rect x={x} y={y} width={bW} height={barH} rx={3}
              fill={over ? T.red : T.accent} opacity={i === months.length - 1 ? 1 : 0.65} />
            <text x={x + bW / 2} y={H - pad.b + 14} textAnchor="middle" fontSize={9} fill={T.muted}>{label}</text>
            <text x={x + bW / 2} y={y - 4} textAnchor="middle" fontSize={8} fill={over ? T.red : T.muted}>
              {v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── HORIZONTAL BAR ROW ──────────────────────────────────────────────────────
function HBar({ label, value, max, color, T }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: ".78rem", color: T.muted, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: ".82rem", fontWeight: 600, color: T.text, fontFamily: "Syne" }}>{fmt(value)}</span>
      </div>
      <div style={{ background: T.surface3, borderRadius: 2, height: 5, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width .4s" }} />
      </div>
    </div>
  );
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────
function Reports({ data, T }) {
  const { txs, salary, fixed, cards } = data;
  const fixedTotal = fixed.reduce((s, f) => s + f.amount, 0);
  const [view, setView] = useState("overview"); // overview | month
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Build last 6 months with data
  const allMonths = [...new Set(txs.map(t => t.date.slice(0, 7)))].sort();
  const last6 = allMonths.slice(-6);

  const monthData = last6.map(m => {
    const mine = txs.filter(t => t.date.startsWith(m) && t.owner === "Eu");
    const pais = txs.filter(t => t.date.startsWith(m) && t.owner === "Pai");
    const mySpend = mine.reduce((s, t) => s + t.amount, 0);
    const paiSpend = pais.reduce((s, t) => s + t.amount, 0);
    const balance = salary - mySpend - fixedTotal;
    const byCat = CATS.map(c => ({ cat: c, v: mine.filter(t => t.cat === c).reduce((s, t) => s + t.amount, 0) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
    const byCard = cards.map(c => ({ ...c, v: mine.filter(t => t.cardId === c.id).reduce((s, t) => s + t.amount, 0) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
    return { m, mySpend, paiSpend, balance, byCat, byCard, txCount: mine.length };
  });

  const totalSpendAll = monthData.reduce((s, d) => s + d.mySpend, 0);
  const avgSpend = monthData.length > 0 ? totalSpendAll / monthData.length : 0;
  const bestMonth = monthData.reduce((best, d) => d.balance > (best?.balance ?? -Infinity) ? d : best, null);
  const worstMonth = monthData.reduce((worst, d) => d.balance < (worst?.balance ?? Infinity) ? d : worst, null);

  const fmtMonth = (m) => m ? new Date(m + "-15").toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "";
  const fmtMonthShort = (m) => m ? new Date(m + "-15").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(". de ", "/") : "";

  const detail = monthData.find(d => d.m === selectedMonth) || monthData[monthData.length - 1];

  if (last6.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: T.muted }}>
        <div style={{ fontSize: "2rem", marginBottom: 12, opacity: .4 }}>◫</div>
        <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: "1rem", marginBottom: 6 }}>Sem dados ainda</div>
        <div style={{ fontSize: ".82rem" }}>Registre transações para ver seus relatórios aqui.</div>
      </div>
    );
  }

  return (
    <div>
      {/* View toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, background: T.surface2, borderRadius: 8, padding: 3, width: "fit-content", border: `1px solid ${T.border}` }}>
        {[{ id: "overview", label: "Visão geral" }, { id: "month", label: "Por mês" }].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{ background: view === v.id ? T.surface : "transparent", border: "none", borderRadius: 6, padding: "7px 16px", fontFamily: "Inter", fontWeight: 600, fontSize: ".78rem", color: view === v.id ? T.text : T.muted, cursor: "pointer", transition: "all .18s" }}>
            {v.label}
          </button>
        ))}
      </div>

      {view === "overview" && (
        <div>
          {/* KPI row */}
          <div className="grid3" style={{ marginBottom: 16 }}>
            {[
              { label: "Média mensal de gastos", value: fmt(avgSpend), sub: "seus gastos variáveis", color: T.text },
              { label: "Melhor mês", value: bestMonth ? fmtMonthShort(bestMonth.m) : "—", sub: bestMonth ? `sobrou ${fmt(bestMonth.balance)}` : "", color: T.green },
              { label: "Mês mais pesado", value: worstMonth ? fmtMonthShort(worstMonth.m) : "—", sub: worstMonth ? `déficit ${fmt(Math.abs(worstMonth.balance))}` : "", color: worstMonth?.balance < 0 ? T.red : T.muted },
            ].map(k => (
              <div key={k.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: ".68rem", color: T.muted, textTransform: "uppercase", letterSpacing: ".8px", fontWeight: 600, marginBottom: 8 }}>{k.label}</div>
                <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.25rem", color: k.color }}>{k.value}</div>
                <div style={{ fontSize: ".72rem", color: T.muted, marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Evolution bar chart */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 18px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: ".88rem" }}>Evolução de gastos</div>
                <div style={{ fontSize: ".72rem", color: T.muted, marginTop: 3 }}>Seus gastos variáveis mensais vs salário</div>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: ".7rem", color: T.muted }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: T.accent }} />Gastos</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 16, height: 1, background: T.green, borderTop: `1px dashed ${T.green}` }} />Salário</div>
              </div>
            </div>
            <BarChart months={last6} values={monthData.map(d => d.mySpend)} salary={salary} T={T} />
          </div>

          {/* Balance trend */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 18px", marginBottom: 14 }}>
            <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: ".88rem", marginBottom: 4 }}>Saldo mensal (salário − fixos − variáveis)</div>
            <div style={{ fontSize: ".72rem", color: T.muted, marginBottom: 16 }}>Valores positivos indicam sobra, negativos indicam déficit</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {monthData.slice().reverse().map((d, i) => {
                const pct = Math.min(Math.abs(d.balance) / salary * 100, 100);
                return (
                  <div key={d.m} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < monthData.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ width: 72, fontSize: ".72rem", color: T.muted, fontWeight: 500, flexShrink: 0 }}>{fmtMonthShort(d.m)}</div>
                    <div style={{ flex: 1, background: T.surface3, borderRadius: 2, height: 6, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: d.balance >= 0 ? T.green : T.red, borderRadius: 2 }} />
                    </div>
                    <div style={{ width: 88, textAlign: "right", fontFamily: "Syne", fontWeight: 700, fontSize: ".82rem", color: d.balance >= 0 ? T.green : T.red, flexShrink: 0 }}>{fmt(d.balance)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top categories across all months */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px 18px" }}>
            <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: ".88rem", marginBottom: 4 }}>Categorias acumuladas</div>
            <div style={{ fontSize: ".72rem", color: T.muted, marginBottom: 16 }}>Total gasto por categoria nos últimos {last6.length} meses</div>
            {(() => {
              const catTotals = CATS.map(c => ({ cat: c, v: txs.filter(t => last6.includes(t.date.slice(0, 7)) && t.owner === "Eu" && t.cat === c).reduce((s, t) => s + t.amount, 0) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
              const maxV = catTotals[0]?.v || 1;
              return catTotals.map((c, i) => <HBar key={c.cat} label={c.cat} value={c.v} max={maxV} color={PIE_COLORS[i % PIE_COLORS.length]} T={T} />);
            })()}
          </div>
        </div>
      )}

      {view === "month" && (
        <div>
          {/* Month selector */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {monthData.slice().reverse().map(d => (
              <button key={d.m} onClick={() => setSelectedMonth(d.m)}
                style={{ background: (selectedMonth || monthData[monthData.length - 1]?.m) === d.m ? T.accent : T.surface2, border: `1px solid ${(selectedMonth || monthData[monthData.length - 1]?.m) === d.m ? T.accent : T.border}`, borderRadius: 8, padding: "7px 14px", fontFamily: "Inter", fontWeight: 600, fontSize: ".78rem", color: (selectedMonth || monthData[monthData.length - 1]?.m) === d.m ? "#fff" : T.muted, cursor: "pointer", transition: "all .18s" }}>
                {fmtMonthShort(d.m)}
              </button>
            ))}
          </div>

          {detail && (
            <div>
              {/* Month header */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.1rem" }}>{fmtMonth(detail.m)}</div>
                <div style={{ fontSize: ".78rem", color: T.muted, marginTop: 3 }}>{detail.txCount} transações registradas</div>
              </div>

              {/* KPIs */}
              <div className="grid3" style={{ marginBottom: 14 }}>
                {[
                  { l: "Salário", v: salary, c: T.green },
                  { l: "Gastos variáveis", v: detail.mySpend, c: T.red },
                  { l: fixedTotal > 0 ? "Fixos" : "Gastos do Pai", v: fixedTotal > 0 ? fixedTotal : detail.paiSpend, c: T.muted },
                ].map(k => (
                  <div key={k.l} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: ".68rem", color: T.muted, textTransform: "uppercase", letterSpacing: ".7px", fontWeight: 600, marginBottom: 6 }}>{k.l}</div>
                    <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.2rem", color: k.c }}>{fmt(k.v)}</div>
                  </div>
                ))}
              </div>

              {/* Balance highlight */}
              <div style={{ background: detail.balance >= 0 ? T.green + "14" : T.red + "14", border: `1px solid ${detail.balance >= 0 ? T.green : T.red}30`, borderRadius: 10, padding: "14px 18px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: ".7rem", color: detail.balance >= 0 ? T.green : T.red, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".7px" }}>{detail.balance >= 0 ? "Saldo positivo" : "Déficit"}</div>
                  <div style={{ fontSize: ".78rem", color: T.muted, marginTop: 3 }}>salário − fixos − variáveis</div>
                </div>
                <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.4rem", color: detail.balance >= 0 ? T.green : T.red }}>{fmt(Math.abs(detail.balance))}</div>
              </div>

              {/* Category breakdown */}
              {detail.byCat.length > 0 && (
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 18px", marginBottom: 14 }}>
                  <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: ".88rem", marginBottom: 16 }}>Gastos por categoria</div>
                  {detail.byCat.map((c, i) => (
                    <HBar key={c.cat} label={c.cat} value={c.v} max={detail.mySpend} color={PIE_COLORS[i % PIE_COLORS.length]} T={T} />
                  ))}
                </div>
              )}

              {/* Card breakdown */}
              {detail.byCard.length > 0 && (
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 18px", marginBottom: 14 }}>
                  <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: ".88rem", marginBottom: 16 }}>Gastos por cartão</div>
                  {detail.byCard.map(c => (
                    <HBar key={c.id} label={c.name} value={c.v} max={detail.mySpend} color={c.color} T={T} />
                  ))}
                  {detail.paiSpend > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".78rem" }}>
                        <span style={{ color: T.muted }}>Gastos do Pai (cartão compartilhado)</span>
                        <span style={{ fontFamily: "Syne", fontWeight: 700, color: T.yellow }}>{fmt(detail.paiSpend)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Transaction list */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "16px 18px", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: ".88rem" }}>Transações do mês</div>
                </div>
                {txs.filter(t => t.date.startsWith(detail.m) && t.owner === "Eu").sort((a, b) => b.date.localeCompare(a.date)).map((t, i, arr) => {
                  const card = cards.find(c => c.id === t.cardId);
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none", transition: "background .15s" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: card ? card.color : T.accent, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: ".85rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.desc}</div>
                        <div style={{ fontSize: ".7rem", color: T.muted, marginTop: 2 }}>{t.cat}{card ? ` · ${card.name}` : ""} · {new Date(t.date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}</div>
                      </div>
                      <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: ".88rem", color: T.red, flexShrink: 0 }}>{fmt(t.amount)}</div>
                    </div>
                  );
                })}
                {txs.filter(t => t.date.startsWith(detail.m) && t.owner === "Eu").length === 0 && (
                  <div style={{ padding: "24px", textAlign: "center", color: T.muted, fontSize: ".82rem" }}>Nenhuma transação registrada neste mês.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function Settings({ data, setData, T, user, role, onLogout, toast }) {
  const { salary, fixed } = data;
  const [nf, setNf] = useState({ name: "", amount: "", cat: CATS[0] });

  const addFixed = () => {
    if (!nf.name || !nf.amount) return;
    setData(d => ({ ...d, fixed: [...d.fixed, { ...nf, amount: parseFloat(nf.amount), id: uid() }] }));
    setNf({ name: "", amount: "", cat: CATS[0] });
    toast("Gasto fixo adicionado!");
  };

  return (
    <div>
      {/* ── Account card ── */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="sec-title">Minha conta</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne", fontWeight: 800, fontSize: "1.2rem", flexShrink: 0 }}>
            {user[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: "1rem" }}>{user}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: ".68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: role === "admin" ? T.accent + "22" : T.surface3, color: role === "admin" ? T.accent : T.muted, textTransform: "uppercase", letterSpacing: ".5px" }}>
                {role === "admin" ? "Administrador" : "Usuário"}
              </span>
              <span style={{ fontSize: ".7rem", color: T.muted }}>· dados locais</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
          <button
            className="btn btn-danger"
            style={{ flex: 1 }}
            onClick={onLogout}
          >
            Sair da conta
          </button>
        </div>
      </div>

      {/* ── Salary ── */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="sec-title">Renda mensal</div>
        <div className="field">
          <label>Salário / renda líquida (R$)</label>
          <input type="number" value={salary || ""} onChange={e => setData(d => ({ ...d, salary: parseFloat(e.target.value) || 0 }))} placeholder="Ex: 2500,00" />
        </div>
        <div className="alert alert-info" style={{ marginTop: 12 }}>Informe o valor líquido (após descontos) para cálculos precisos.</div>
      </div>

      {/* ── Fixed expenses ── */}
      <div className="card">
        <div className="sec-title">Gastos fixos mensais</div>
        <div className="form-grid">
          <div className="field"><label>Nome</label><input value={nf.name} onChange={e => setNf(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Aluguel, Internet..." /></div>
          <div className="field"><label>Valor (R$)</label><input type="number" value={nf.amount} onChange={e => setNf(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" /></div>
          <div className="field"><label>Categoria</label>
            <select value={nf.cat} onChange={e => setNf(f => ({ ...f, cat: e.target.value }))}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={addFixed}>＋ Adicionar fixo</button>
        <hr />
        {fixed.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px 0", color: T.muted, fontSize: ".82rem" }}>Nenhum gasto fixo cadastrado.</div>
        )}
        {fixed.map(f => (
          <div key={f.id} className="list-item">
            <div className="item-main">
              <div className="item-name">{f.name}</div>
              <div className="item-sub">{f.cat}</div>
            </div>
            <div className="item-amount" style={{ marginRight: 6 }}>−{fmt(f.amount)}/mês</div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setData(d => ({ ...d, fixed: d.fixed.filter(x => x.id !== f.id) }))}>✕</button>
          </div>
        ))}
        {fixed.length > 0 && (
          <div style={{ textAlign: "right", marginTop: 8, fontSize: ".78rem", color: T.muted }}>
            Total: <strong style={{ color: T.red }}>{fmt(fixed.reduce((s, f) => s + f.amount, 0))}/mês</strong>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────
function AdminPanel({ T, currentUser, toast }) {
  const [users, setUsersLocal] = useState(() => store.getUsers());
  const [editPass, setEditPass] = useState({});
  const [newPass, setNewPass] = useState({});
  const [confirmDel, setConfirmDel] = useState(null);

  const refresh = () => setUsersLocal(store.getUsers());

  const changeRole = (name, role) => {
    const updated = store.getUsers().map(u => u.name === name ? { ...u, role } : u);
    store.setUsers(updated);
    refresh();
    toast(`Papel de ${name} alterado para ${role === "admin" ? "Administrador" : "Usuário"}.`);
  };

  const resetPassword = (name) => {
    const np = newPass[name];
    if (!np || np.length < 3) { toast("Senha deve ter ao menos 3 caracteres."); return; }
    const updated = store.getUsers().map(u => u.name === name ? { ...u, pass: np } : u);
    store.setUsers(updated);
    setNewPass(p => ({ ...p, [name]: "" }));
    setEditPass(p => ({ ...p, [name]: false }));
    refresh();
    toast(`Senha de ${name} redefinida.`);
  };

  const deleteUser = (name) => {
    if (name === currentUser) { toast("Você não pode excluir sua própria conta."); return; }
    const updated = store.getUsers().filter(u => u.name !== name);
    store.setUsers(updated);
    // Clear user data
    ["txs","dreams","salary","fixed","cards"].forEach(k => localStorage.removeItem(`fl_${name}_${k}`));
    setConfirmDel(null);
    refresh();
    toast(`Conta de ${name} removida.`);
  };

  const admins = users.filter(u => u.role === "admin").length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.05rem", marginBottom: 4 }}>Painel de Administração</div>
        <div style={{ fontSize: ".78rem", color: T.muted }}>Gerencie os usuários desta instalação. Apenas administradores têm acesso a esta área.</div>
      </div>

      {/* Stats row */}
      <div className="grid3" style={{ marginBottom: 16 }}>
        {[
          { label: "Total de usuários", value: users.length },
          { label: "Administradores", value: admins },
          { label: "Usuários comuns", value: users.length - admins },
        ].map(s => (
          <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: ".67rem", color: T.muted, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: "1.6rem" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* User list */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: ".88rem" }}>Usuários cadastrados</div>
          <button className="btn btn-ghost btn-sm" onClick={refresh}>↻ Atualizar</button>
        </div>

        {users.map((u, i) => {
          const isMe = u.name === currentUser;
          const isLastAdmin = u.role === "admin" && admins === 1;
          const txCount = (store.get(u.name, "txs", [])).length;
          const salary  = store.get(u.name, "salary", 0);

          return (
            <div key={u.name} style={{ padding: "16px 18px", borderBottom: i < users.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                {/* Avatar + info */}
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: u.role === "admin" ? T.accent : T.surface3, color: u.role === "admin" ? "#fff" : T.muted, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne", fontWeight: 800, fontSize: ".95rem", flexShrink: 0 }}>
                  {u.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: ".9rem" }}>{u.name}</span>
                    {isMe && <span style={{ fontSize: ".65rem", background: T.green + "22", color: T.green, borderRadius: 4, padding: "2px 7px", fontWeight: 700 }}>VOCÊ</span>}
                    <span style={{ fontSize: ".65rem", background: u.role === "admin" ? T.accent + "22" : T.surface3, color: u.role === "admin" ? T.accent : T.muted, borderRadius: 4, padding: "2px 7px", fontWeight: 700, textTransform: "uppercase" }}>
                      {u.role === "admin" ? "Admin" : "Usuário"}
                    </span>
                  </div>
                  <div style={{ fontSize: ".7rem", color: T.muted, marginTop: 3 }}>
                    {txCount} transações · Salário: {salary > 0 ? fmt(salary) : "não informado"}
                  </div>
                </div>

                {/* Actions */}
                {!isMe && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={isLastAdmin && u.role === "admin"}
                      title={isLastAdmin ? "Não é possível remover o único admin" : ""}
                      onClick={() => changeRole(u.name, u.role === "admin" ? "user" : "admin")}
                      style={{ fontSize: ".72rem" }}
                    >
                      {u.role === "admin" ? "Tornar usuário" : "Tornar admin"}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditPass(p => ({ ...p, [u.name]: !p[u.name] }))}
                      style={{ fontSize: ".72rem" }}
                    >
                      {editPass[u.name] ? "Cancelar" : "Redefinir senha"}
                    </button>
                    {confirmDel === u.name ? (
                      <>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.name)} style={{ fontSize: ".72rem" }}>Confirmar exclusão</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)} style={{ fontSize: ".72rem" }}>Cancelar</button>
                      </>
                    ) : (
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(u.name)} style={{ fontSize: ".72rem" }}>Excluir</button>
                    )}
                  </div>
                )}
              </div>

              {/* Password reset form */}
              {editPass[u.name] && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                  <input
                    type="password"
                    placeholder="Nova senha"
                    value={newPass[u.name] || ""}
                    onChange={e => setNewPass(p => ({ ...p, [u.name]: e.target.value }))}
                    style={{ flex: 1 }}
                    onKeyDown={e => e.key === "Enter" && resetPassword(u.name)}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => resetPassword(u.name)}>Salvar</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="alert alert-warn" style={{ marginTop: 16 }}>
        Ao excluir um usuário, todos os dados financeiros dele são apagados permanentemente deste dispositivo.
      </div>
    </div>
  );
}

// ─── ACTION PLAN ─────────────────────────────────────────────────────────────
function ActionPlan({ data, T, apiKey }) {
  const { txs, salary, fixed, dreams, cards } = data;
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const m = thisMonth();
  const mTxs = txs.filter(t => t.date.startsWith(m) && t.owner === "Eu");
  const mySpend = mTxs.reduce((s, t) => s + t.amount, 0);
  const fixedTotal = fixed.reduce((s, f) => s + f.amount, 0);
  const dreamSavings = dreams.filter(d => !d.done).reduce((s, d) => s + (d.monthly || 0), 0);
  const deficit = mySpend + fixedTotal + dreamSavings - salary;
  const catBreakdown = CATS.map(c => ({ cat: c, v: mTxs.filter(t => t.cat === c).reduce((s, t) => s + t.amount, 0) })).filter(d => d.v > 0).sort((a, b) => b.v - a.v);

  const generate = async () => {
    if (!apiKey) { alert("Configure sua chave de API na aba 🤖 IA primeiro."); return; }
    setLoading(true); setPlan(null);
    const context = `Salário líquido: ${fmt(salary)}. Gastos fixos: ${fmt(fixedTotal)} (${fixed.map(f => f.name + ": " + fmt(f.amount)).join(", ") || "nenhum"}). Gastos variáveis este mês: ${fmt(mySpend)}. Reserva para metas: ${fmt(dreamSavings)}. Déficit atual: ${fmt(deficit)}. Maiores categorias: ${catBreakdown.slice(0, 4).map(c => c.cat + ": " + fmt(c.v)).join(", ")}. Sonhos ativos: ${dreams.filter(d => !d.done).map(d => d.name + " (" + fmt(d.monthly) + "/mês)").join(", ") || "nenhum"}.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: `Você é consultor financeiro pessoal. Responda APENAS com JSON válido sem markdown. Formato: {"diagnostico":"string","passos":[{"titulo":"string","descricao":"string","economia":"string"}],"meta_90dias":"string"}`, messages: [{ role: "user", content: "Crie um plano de ação para sair do negativo em 90 dias com base nesses dados: " + context }] }) });
      const d = await res.json();
      setPlan(JSON.parse((d.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim()));
    } catch { setPlan({ diagnostico: "Erro ao gerar plano. Verifique sua chave de API.", passos: [], meta_90dias: "" }); }
    setLoading(false);
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="sec-title">📋 Diagnóstico atual</div>
        <div className="grid3" style={{ marginBottom: 14 }}>
          <div style={{ background: T.surface2, borderRadius: 12, padding: 14 }}><div style={{ fontSize: ".72rem", color: T.muted, marginBottom: 4 }}>Salário</div><div style={{ fontFamily: "Syne", fontWeight: 800, color: T.green }}>{fmt(salary)}</div></div>
          <div style={{ background: T.surface2, borderRadius: 12, padding: 14 }}><div style={{ fontSize: ".72rem", color: T.muted, marginBottom: 4 }}>Total saídas</div><div style={{ fontFamily: "Syne", fontWeight: 800, color: T.red }}>{fmt(mySpend + fixedTotal + dreamSavings)}</div></div>
          <div style={{ background: T.surface2, borderRadius: 12, padding: 14 }}><div style={{ fontSize: ".72rem", color: T.muted, marginBottom: 4 }}>{deficit > 0 ? "Déficit" : "Sobra"}</div><div style={{ fontFamily: "Syne", fontWeight: 800, color: deficit > 0 ? T.red : T.green }}>{fmt(Math.abs(deficit))}</div></div>
        </div>
        {catBreakdown.length > 0 && (
          <div>
            <div style={{ fontSize: ".78rem", color: T.muted, marginBottom: 8 }}>Onde você mais gasta:</div>
            {catBreakdown.slice(0, 5).map(c => (
              <div key={c.cat} style={{ marginBottom: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".78rem", marginBottom: 3 }}><span>{c.cat}</span><span style={{ fontWeight: 600 }}>{fmt(c.v)}</span></div>
                <Bar pct={mySpend > 0 ? (c.v / mySpend) * 100 : 0} color={T.accent} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <div className="sec-title">🤖 Plano com IA</div>
        {!apiKey && <div className="alert alert-warn">⚠️ Configure sua chave da API na aba "🤖 IA" para gerar um plano personalizado.</div>}
        <button className="btn btn-primary" style={{ width: "100%", marginBottom: 14 }} onClick={generate} disabled={loading || !apiKey}>
          {loading ? "⏳ Analisando sua situação..." : "✨ Gerar plano personalizado"}
        </button>
        {plan && (
          <div>
            {plan.diagnostico && <div className="alert alert-info" style={{ marginBottom: 14 }}>💡 {plan.diagnostico}</div>}
            {(plan.passos || []).map((p, i) => (
              <div key={i} style={{ background: T.surface2, borderRadius: 12, padding: 14, marginBottom: 8, borderLeft: `3px solid ${T.accent}` }}>
                <div style={{ fontWeight: 700, color: T.accent, fontSize: ".8rem", marginBottom: 5 }}>Passo {i + 1}: {p.titulo}{p.economia ? ` · Economia: ${p.economia}` : ""}</div>
                <div style={{ fontSize: ".84rem", lineHeight: 1.55 }}>{p.descricao}</div>
              </div>
            ))}
            {plan.meta_90dias && <div className="alert alert-good" style={{ marginTop: 10 }}>🎯 Meta em 90 dias: {plan.meta_90dias}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI CHAT ─────────────────────────────────────────────────────────────────
function AIAssistant({ data, T, apiKey, setApiKey }) {
  const { txs, salary, fixed, dreams, cards } = data;
  const [msgs, setMsgs] = useState([{ role: "ai", text: "Olá! Sou o Claude, seu assistente financeiro pessoal. Tenho acesso aos seus dados e posso te ajudar a entender sua situação, sugerir cortes, simular cenários ou responder qualquer dúvida financeira. Como posso te ajudar?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey || "");
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const m = thisMonth();
  const mySpend = txs.filter(t => t.date.startsWith(m) && t.owner === "Eu").reduce((s, t) => s + t.amount, 0);
  const fixedTotal = fixed.reduce((s, f) => s + f.amount, 0);
  const systemPrompt = `Você é assistente financeiro pessoal no app FinançaLivre. Contexto do usuário: Salário: ${fmt(salary)}. Fixos: ${fmt(fixedTotal)}. Gastos variáveis este mês: ${fmt(mySpend)}. Sonhos: ${dreams.filter(d => !d.done).map(d => d.name + " (" + fmt(d.monthly) + "/mês)").join(", ") || "nenhum"}. Cartões: ${cards.map(c => c.name + " (" + c.owner + ")").join(", ") || "nenhum"}. Últimos gastos: ${txs.slice(0, 6).map(t => t.desc + ": " + fmt(t.amount)).join(", ") || "nenhum"}. Responda em português, de forma amigável e prática.`;

  const send = async () => {
    if (!input.trim() || loading || !apiKey) return;
    const history = [...msgs, { role: "user", text: input }];
    setMsgs(history); setInput(""); setLoading(true);
    try {
      const apiMsgs = history.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: systemPrompt, messages: apiMsgs }) });
      const d = await res.json();
      setMsgs(h => [...h, { role: "ai", text: d.content?.[0]?.text || "Erro ao obter resposta." }]);
    } catch { setMsgs(h => [...h, { role: "ai", text: "❌ Erro de conexão. Verifique sua chave de API." }]); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ background: T.surface2, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div className="sec-title" style={{ marginBottom: 8 }}>🔑 Chave de API do Claude</div>
        <p style={{ fontSize: ".78rem", color: T.muted, marginBottom: 10, lineHeight: 1.5 }}>Acesse <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: T.accent }}>console.anthropic.com</a>, crie uma conta e gere uma API key. A chave fica salva só no seu dispositivo.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="sk-ant-api03-..." style={{ flex: 1 }} onKeyDown={e => e.key === "Enter" && setApiKey(keyInput)} />
          <button className="btn btn-primary btn-sm" onClick={() => setApiKey(keyInput)}>Salvar</button>
        </div>
        {apiKey && <div style={{ fontSize: ".72rem", color: T.green, marginTop: 6 }}>✅ Chave configurada — você pode conversar abaixo.</div>}
      </div>

      <div className="card">
        <div className="sec-title">💬 Chat com o Claude</div>
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 320px)", minHeight: 380 }}>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 12 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ maxWidth: "82%", padding: "11px 14px", borderRadius: 16, fontSize: ".85rem", lineHeight: 1.55, wordBreak: "break-word", alignSelf: m.role === "user" ? "flex-end" : "flex-start", background: m.role === "user" ? T.accent : T.surface2, color: m.role === "user" ? "#fff" : T.text, border: m.role === "ai" ? `1px solid ${T.border}` : "none", borderBottomRightRadius: m.role === "user" ? 4 : 16, borderBottomLeftRadius: m.role === "ai" ? 4 : 16 }}
                dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>") }} />
            ))}
            {loading && <div style={{ alignSelf: "flex-start", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 16, borderBottomLeftRadius: 4, padding: "11px 14px", fontSize: ".85rem", opacity: .6 }}>⏳ Pensando...</div>}
            <div ref={bottomRef} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder={apiKey ? "Pergunte sobre suas finanças..." : "Configure a chave de API acima"} disabled={!apiKey || loading} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={send} disabled={!apiKey || loading || !input.trim()}>Enviar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
const INIT = { txs: [], dreams: [], salary: 0, fixed: [], cards: [] };

const makeTabs = (role) => [
  { id: "dash",    label: "Visão Geral",   icon: "◈" },
  { id: "txs",     label: "Transações",    icon: "↕" },
  { id: "cards",   label: "Cartões",       icon: "▣" },
  { id: "dreams",  label: "Metas",         icon: "◎" },
  { id: "action",  label: "Plano de Ação", icon: "▷" },
  { id: "ai",      label: "IA / Chat",     icon: "⬡" },
  { id: "reports", label: "Relatórios",    icon: "▦" },
  { id: "settings",label: "Configurações", icon: "◌" },
  ...(role === "admin" ? [{ id: "admin", label: "Administração", icon: "◆", adminOnly: true }] : []),
];

export default function App() {
  const [theme, setTheme]     = useState(() => localStorage.getItem("fl_theme") || "dark");
  const [user, setUser]       = useState(() => localStorage.getItem("fl_session") || null);
  const [role, setRole]       = useState(() => localStorage.getItem("fl_role") || "user");
  const [tab, setTab]         = useState("dash");
  const [data, setDataRaw]    = useState(INIT);
  const [toastMsg, setToastMsg] = useState("");
  const [apiKey, setApiKeyRaw]  = useState(() => localStorage.getItem("fl_apikey") || "");
  const [showUserMenu, setShowUserMenu] = useState(false);

  const setApiKey = (k) => { localStorage.setItem("fl_apikey", k); setApiKeyRaw(k); };
  const T = theme === "dark" ? DARK : LIGHT;
  const TABS = makeTabs(role);

  useEffect(() => { localStorage.setItem("fl_theme", theme); }, [theme]);

  useEffect(() => {
    if (!user) return;
    setDataRaw({
      txs:    store.get(user, "txs",    []),
      dreams: store.get(user, "dreams", []),
      salary: store.get(user, "salary", 0),
      fixed:  store.get(user, "fixed",  []),
      cards:  store.get(user, "cards",  []),
    });
  }, [user]);

  const setData = useCallback((fn) => {
    setDataRaw(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      if (user) {
        store.set(user, "txs",    next.txs);
        store.set(user, "dreams", next.dreams);
        store.set(user, "salary", next.salary);
        store.set(user, "fixed",  next.fixed);
        store.set(user, "cards",  next.cards);
      }
      return next;
    });
  }, [user]);

  const toast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 2400); };

  const onLogin = (name, userRole) => {
    localStorage.setItem("fl_session", name);
    localStorage.setItem("fl_role", userRole || "user");
    setUser(name);
    setRole(userRole || "user");
  };

  const onLogout = () => {
    localStorage.removeItem("fl_session");
    localStorage.removeItem("fl_role");
    setUser(null);
    setRole("user");
    setDataRaw(INIT);
    setTab("dash");
    setShowUserMenu(false);
  };

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");
  const dynCSS = makeCSS(T);

  if (!user) return (
    <>
      <style>{dynCSS}{`:root{--bg-stroke:${T.surface};--bg-inner:${T.surface};--muted-color:${T.muted}}`}</style>
      <Login onLogin={onLogin} theme={theme} toggleTheme={toggleTheme} T={T} />
    </>
  );

  return (
    <>
      <style>{dynCSS}{`
        :root{--bg-stroke:${T.surface};--bg-inner:${T.surface};--muted-color:${T.muted}}
        .user-menu{position:absolute;top:calc(100% + 8px);right:0;background:${T.surface};border:1px solid ${T.border};border-radius:10px;min-width:180px;z-index:200;box-shadow:0 8px 24px #00000030;overflow:hidden}
        .user-menu-item{display:flex;align-items:center;gap:10px;padding:11px 16px;font-size:.83rem;font-weight:500;cursor:pointer;transition:background .15s;border:none;background:none;color:${T.text};width:100%;text-align:left}
        .user-menu-item:hover{background:${T.surface2}}
        .user-menu-item.danger{color:${T.red}}
        .user-menu-sep{border:none;border-top:1px solid ${T.border};margin:4px 0}
        .sidebar-sep{border:none;border-top:1px solid ${T.border};margin:8px 0}
        .nav-item-admin{color:${T.accent} !important}
        .nav-item-admin.active{background:${T.accent}22 !important}
      `}</style>
      <div className="root" onClick={() => showUserMenu && setShowUserMenu(false)}>
        <header className="topbar">
          <div className="logo" onClick={() => setTab("dash")} style={{ cursor: "pointer" }}>finança<em>livre</em></div>
          <div className="topbar-right">
            <button className="toggle-theme" onClick={toggleTheme}>{theme === "dark" ? "☀️" : "🌙"}</button>

            {/* User menu trigger */}
            <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowUserMenu(s => !s)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: T.surface2, border: `1px solid ${showUserMenu ? T.accent : T.border}`, borderRadius: 8, padding: "5px 12px 5px 7px", cursor: "pointer", transition: "all .18s" }}
              >
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: T.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne", fontWeight: 800, fontSize: ".78rem", flexShrink: 0 }}>
                  {user[0].toUpperCase()}
                </div>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: T.text, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user}</span>
                {role === "admin" && (
                  <span style={{ fontSize: ".6rem", background: T.accent + "22", color: T.accent, borderRadius: 3, padding: "1px 5px", fontWeight: 700 }}>ADMIN</span>
                )}
                <span style={{ fontSize: ".7rem", color: T.muted, marginLeft: 2 }}>{showUserMenu ? "▲" : "▼"}</span>
              </button>

              {showUserMenu && (
                <div className="user-menu">
                  <div style={{ padding: "12px 16px 8px", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ fontWeight: 700, fontSize: ".88rem" }}>{user}</div>
                    <div style={{ fontSize: ".7rem", color: T.muted, marginTop: 2 }}>
                      {role === "admin" ? "Administrador" : "Usuário"}
                    </div>
                  </div>
                  <button className="user-menu-item" onClick={() => { setTab("settings"); setShowUserMenu(false); }}>
                    ◌ Configurações
                  </button>
                  {role === "admin" && (
                    <button className="user-menu-item" onClick={() => { setTab("admin"); setShowUserMenu(false); }}>
                      ◆ Administração
                    </button>
                  )}
                  <button className="user-menu-item" onClick={toggleTheme}>
                    {theme === "dark" ? "☀️ Modo claro" : "🌙 Modo escuro"}
                  </button>
                  <hr className="user-menu-sep" />
                  <button className="user-menu-item danger" onClick={onLogout}>
                    → Sair da conta
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="layout">
          <aside className="sidebar">
            {TABS.map(t => (
              t.adminOnly
                ? <><hr key="sep" className="sidebar-sep" /><button key={t.id} className={`nav-item nav-item-admin ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}><span className="icon">{t.icon}</span>{t.label}</button></>
                : <button key={t.id} className={`nav-item ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}><span className="icon">{t.icon}</span>{t.label}</button>
            ))}
            <div style={{ flex: 1 }} />
            {/* Logout at bottom of sidebar */}
            <button
              onClick={onLogout}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: "none", color: T.muted, fontFamily: "Inter", fontSize: ".84rem", fontWeight: 500, cursor: "pointer", width: "100%", textAlign: "left", marginTop: 8, transition: "all .18s" }}
              onMouseEnter={e => { e.currentTarget.style.background = T.red + "18"; e.currentTarget.style.color = T.red; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = T.muted; }}
            >
              <span style={{ fontSize: "1rem", width: 22, textAlign: "center" }}>→</span>
              Sair
            </button>
          </aside>

          <main className="main-content">
            {tab === "dash"     && <Dashboard data={data} T={T} setTab={setTab} />}
            {tab === "txs"      && <Transactions data={data} setData={setData} T={T} toast={toast} />}
            {tab === "cards"    && <Cards data={data} setData={setData} T={T} toast={toast} />}
            {tab === "dreams"   && <Dreams data={data} setData={setData} T={T} toast={toast} />}
            {tab === "action"   && <ActionPlan data={data} T={T} apiKey={apiKey} />}
            {tab === "ai"       && <AIAssistant data={data} T={T} apiKey={apiKey} setApiKey={setApiKey} />}
            {tab === "reports"  && <Reports data={data} T={T} />}
            {tab === "settings" && <Settings data={data} setData={setData} T={T} user={user} role={role} onLogout={onLogout} toast={toast} />}
            {tab === "admin" && role === "admin" && <AdminPanel T={T} currentUser={user} toast={toast} />}
            {tab === "admin" && role !== "admin" && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: T.muted }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 12, opacity: .4 }}>◆</div>
                <div style={{ fontFamily: "Syne", fontWeight: 700 }}>Acesso restrito</div>
                <div style={{ fontSize: ".82rem", marginTop: 6 }}>Esta área é exclusiva para administradores.</div>
              </div>
            )}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <nav className="bottom-nav">
          <div className="bottom-nav-inner">
            {TABS.filter(t => !t.adminOnly).map(t => (
              <button key={t.id} className={`bnav-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                <span className="bicon">{t.icon}</span>
                {t.label.split(" ")[0]}
              </button>
            ))}
            <button className="bnav-btn" onClick={onLogout} style={{ color: T.red }}>
              <span className="bicon">→</span>
              Sair
            </button>
          </div>
        </nav>
      </div>
      <Toast msg={toastMsg} />
    </>
  );
}
