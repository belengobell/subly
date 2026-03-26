import { useState, useCallback, useEffect } from "react";

// ============================================================
//  SUPABASE CONFIG
// ============================================================
const SUPABASE_URL = "https://nlhkxdbopmckkqydtnbx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5saGt4ZGJvcG1ja2txeWR0bmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NzUxMjEsImV4cCI6MjA5MDA1MTEyMX0.AhSmmNkW-EYli1xlCFucLeIgi2Zf7xjilru7bEwf_88";

// Minimal Supabase client (no npm needed)
const sb = {
  headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },

  async signUp(email, password, name) {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST", headers: this.headers,
        body: JSON.stringify({ email, password, data: { name } })
      });
      const data = await r.json();
      if (!r.ok) return { error: { message: data.msg || data.error_description || data.message || "Errore registrazione ("+r.status+")" } };
      return data;
    } catch(e) { return { error: { message: "Errore di rete: " + e.message } }; }
  },

  async signIn(email, password) {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: this.headers,
        body: JSON.stringify({ email, password })
      });
      const data = await r.json();
      if (!r.ok) return { error: { message: data.error_description || data.message || data.msg || "Credenziali non valide ("+r.status+")" } };
      return data;
    } catch(e) { return { error: { message: "Errore di rete: " + e.message } }; }
  },

  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST", headers: { ...this.headers, "Authorization": `Bearer ${token}` }
    });
  },

  async getUser(token) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { ...this.headers, "Authorization": `Bearer ${token}` }
    });
    return r.json();
  },

  async select(table, query = "", token = null) {
    const h = token ? { ...this.headers, "Authorization": `Bearer ${token}` } : this.headers;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: h });
    return r.json();
  },

  async insert(table, data, token = null) {
    const h = { ...(token ? { ...this.headers, "Authorization": `Bearer ${token}` } : this.headers), "Prefer": "return=representation" };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST", headers: h, body: JSON.stringify(data)
    });
    return r.json();
  },

  async update(table, data, match, token = null) {
    const h = { ...(token ? { ...this.headers, "Authorization": `Bearer ${token}` } : this.headers), "Prefer": "return=representation" };
    const q = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join("&");
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
      method: "PATCH", headers: h, body: JSON.stringify(data)
    });
    return r.json();
  },

  async delete(table, match, token = null) {
    const h = token ? { ...this.headers, "Authorization": `Bearer ${token}` } : this.headers;
    const q = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join("&");
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, { method: "DELETE", headers: h });
  },
};

// ─── STATIC DATA ─────────────────────────────────────────────

const CATEGORIES = [
  { id:"entertainment", label:"Intrattenimento", icon:"🎬" },
  { id:"news",          label:"Giornali & Media", icon:"📰" },
  { id:"apps",          label:"App & Software",   icon:"📱" },
  { id:"utilities",     label:"Utenze",           icon:"⚡" },
  { id:"insurance",     label:"Assicurazioni",    icon:"🛡️" },
  { id:"other",         label:"Altro",            icon:"📦" },
];

const FREQUENCIES = [
  { id:"monthly",   label:"Mensile",     months:1  },
  { id:"quarterly", label:"Trimestrale", months:3  },
  { id:"yearly",    label:"Annuale",     months:12 },
];

const PAYMENT_METHODS = ["Carta di credito","Carta di debito","PayPal","Bonifico","Contanti","Altro"];

const CAT_COLORS = {
  entertainment:{ bg:"#FFF7E6", accent:"#F59E0B", text:"#92400E" },
  news:         { bg:"#EFF6FF", accent:"#3B82F6", text:"#1E40AF" },
  apps:         { bg:"#E8F7FD", accent:"#29ABE2", text:"#0E6A8A" },
  utilities:    { bg:"#ECFDF5", accent:"#10B981", text:"#065F46" },
  insurance:    { bg:"#FFF1F2", accent:"#F43F5E", text:"#9F1239" },
  other:        { bg:"#F8FAFC", accent:"#64748B", text:"#334155" },
};

const POPULAR_SERVICES = [
  { name:"Netflix",            category:"entertainment", cost:17.99, frequency:"monthly",  emoji:"🎬" },
  { name:"Disney+",            category:"entertainment", cost:13.99, frequency:"monthly",  emoji:"✨" },
  { name:"Prime Video",        category:"entertainment", cost:49.90, frequency:"yearly",   emoji:"📦" },
  { name:"Spotify",            category:"entertainment", cost:10.99, frequency:"monthly",  emoji:"🎵" },
  { name:"Apple Music",        category:"entertainment", cost:10.99, frequency:"monthly",  emoji:"🎼" },
  { name:"YouTube Premium",    category:"entertainment", cost:13.99, frequency:"monthly",  emoji:"▶️" },
  { name:"DAZN",               category:"entertainment", cost:40.99, frequency:"monthly",  emoji:"⚽" },
  { name:"Sky",                category:"entertainment", cost:19.90, frequency:"monthly",  emoji:"📡" },
  { name:"NOW TV",             category:"entertainment", cost:14.99, frequency:"monthly",  emoji:"📺" },
  { name:"Audible",            category:"entertainment", cost:9.99,  frequency:"monthly",  emoji:"🎧" },
  { name:"Corriere della Sera",category:"news",          cost:9.99,  frequency:"monthly",  emoji:"📰" },
  { name:"La Repubblica",      category:"news",          cost:7.99,  frequency:"monthly",  emoji:"🗞️" },
  { name:"Il Sole 24 Ore",     category:"news",          cost:19.99, frequency:"monthly",  emoji:"💹" },
  { name:"La Stampa",          category:"news",          cost:6.99,  frequency:"monthly",  emoji:"📄" },
  { name:"iCloud+ 50GB",       category:"apps",          cost:0.99,  frequency:"monthly",  emoji:"☁️" },
  { name:"iCloud+ 200GB",      category:"apps",          cost:2.99,  frequency:"monthly",  emoji:"☁️" },
  { name:"Google One 100GB",   category:"apps",          cost:1.99,  frequency:"monthly",  emoji:"🔵" },
  { name:"Microsoft 365",      category:"apps",          cost:99.00, frequency:"yearly",   emoji:"💻" },
  { name:"Adobe Creative",     category:"apps",          cost:54.99, frequency:"monthly",  emoji:"🎨" },
  { name:"ChatGPT Plus",       category:"apps",          cost:20.00, frequency:"monthly",  emoji:"🤖" },
  { name:"Enel Energia",       category:"utilities",     cost:80.00, frequency:"monthly",  emoji:"⚡" },
  { name:"Fastweb Fibra",      category:"utilities",     cost:27.95, frequency:"monthly",  emoji:"🌐" },
  { name:"TIM Fibra",          category:"utilities",     cost:24.90, frequency:"monthly",  emoji:"🌐" },
  { name:"Iliad Mobile",       category:"utilities",     cost:9.99,  frequency:"monthly",  emoji:"📶" },
  { name:"Vodafone Mobile",    category:"utilities",     cost:12.99, frequency:"monthly",  emoji:"📱" },
  { name:"RC Auto",            category:"insurance",     cost:350.00,frequency:"yearly",   emoji:"🚗" },
  { name:"Assicurazione Casa", category:"insurance",     cost:200.00,frequency:"yearly",   emoji:"🏠" },
  { name:"Mutua Sanitaria",    category:"insurance",     cost:30.00, frequency:"monthly",  emoji:"🏥" },
];

const MEMBER_COLORS  = ["#29ABE2","#EC4899","#10B981","#F59E0B","#3B82F6","#8B5CF6"];
const MEMBER_AVATARS = ["👨","👩","🧒","👴","👵","🧑"];

const USAGE_LABELS = ["","Quasi mai","Poco","A volte","Spesso","Ogni giorno"];
const USAGE_CONFIG = [
  { val:1, emoji:"😴", short:"Quasi mai",  color:"#94A3B8", bg:"#F8FAFC" },
  { val:2, emoji:"🙂", short:"Poco",       color:"#F59E0B", bg:"#FFFBEB" },
  { val:3, emoji:"👍", short:"A volte",    color:"#29ABE2", bg:"#E8F7FD" },
  { val:4, emoji:"🔥", short:"Spesso",     color:"#10B981", bg:"#ECFDF5" },
  { val:5, emoji:"⚡", short:"Ogni giorno",color:"#6366F1", bg:"#EEF0FD" },
];
function getUsageCfg(v){ return USAGE_CONFIG.find(x=>x.val===v)||USAGE_CONFIG[2]; }

// ─── HELPERS ─────────────────────────────────────────────────

function toMonthly(cost, freq) { const f=FREQUENCIES.find(x=>x.id===freq); return cost/(f?f.months:1); }
function toYearly(cost, freq)  { return toMonthly(cost,freq)*12; }
function getFreqLabel(f)       { const x=FREQUENCIES.find(v=>v.id===f); return x?x.label:f; }
function getCatInfo(id)        { return CATEGORIES.find(c=>c.id===id)||{icon:"📦",label:"Altro"}; }
function getInitials(name)     { return (name||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(); }
function fmtDate(d)            { return d?new Date(d).toLocaleDateString("it-IT"):"—"; }
const SLIDER_TABS = ["Tutti",...CATEGORIES.map(c=>c.label)];

// ─── CSV EXPORT ───────────────────────────────────────────────

function exportCSV(rows, filename) {
  const esc = v => { const s=String(v==null?"":v); return s.includes(",")||s.includes('"')||s.includes("\n")?`"${s.replace(/"/g,'""')}"`:s; };
  const csv = rows.map(r=>r.map(esc).join(",")).join("\n");
  const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

function exportUsersCSV(users, subs) {
  const header = ["ID","Nome","Email","Piano","Ruolo","Data Registrazione","N. Abbonamenti","Spesa Mensile (EUR)","Spesa Annuale (EUR)"];
  const rows = users.map(u => {
    const uSubs = subs.filter(s=>s.owner_id===u.id);
    const monthly = uSubs.reduce((a,s)=>a+toMonthly(s.cost,s.frequency),0);
    return [u.id,u.name,u.email,u.plan||"free",u.role,fmtDate(u.created_at),uSubs.length,monthly.toFixed(2),(monthly*12).toFixed(2)];
  });
  exportCSV([header,...rows],"subly_utenti_"+new Date().toISOString().slice(0,10)+".csv");
}

function exportSubsCSV(subs, users) {
  const header = ["ID","Servizio","Categoria","Costo","Frequenza","Costo Mensile (EUR)","Metodo Pagamento","Condiviso","Utilizzo","Intestato a (Nome)","Intestato a (Email)"];
  const rows = subs.map(s => {
    const owner = users.find(u=>u.id===s.owner_id);
    const cat = getCatInfo(s.category);
    return [s.id,s.name,cat.label,s.cost,getFreqLabel(s.frequency),toMonthly(s.cost,s.frequency).toFixed(2),s.payment||"—",s.shared?"Si":"No",USAGE_LABELS[s.usage_level]||"—",owner?owner.name:"—",owner?owner.email:"—"];
  });
  exportCSV([header,...rows],"subly_abbonamenti_"+new Date().toISOString().slice(0,10)+".csv");
}

// ─── STYLES ──────────────────────────────────────────────────

const S = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
:root {
  --bg:#F7F8FC; --white:#FFFFFF; --sur:#FFFFFF; --sur2:#F1F3F9;
  --bor:#E4E7F0; --bor2:#CDD2E1;
  --text:#1A1D2E; --text2:#4B5178; --text3:#9399B8;
  --indigo:#29ABE2; --indigo2:#1A8DC0; --indigo-l:#E8F7FD; --indigo-m:rgba(41,171,226,0.12);
  --green:#10B981; --red:#F43F5E; --amber:#F59E0B;
  --radius:14px;
  --shadow:0 1px 4px rgba(26,29,46,0.06),0 4px 16px rgba(26,29,46,0.06);
  --shadow-lg:0 8px 32px rgba(26,29,46,0.12);
}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}

/* AUTH */
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
  background:linear-gradient(135deg,#E8F7FD 0%,#F7F8FC 50%,#F0FDF9 100%);}
.auth-card{background:var(--white);border-radius:20px;padding:40px 36px;width:100%;max-width:420px;box-shadow:var(--shadow-lg);border:1px solid var(--bor);}
.auth-logo{font-size:26px;font-weight:700;color:var(--indigo);margin-bottom:4px;letter-spacing:-0.5px;}
.auth-logo span{color:var(--text);}
.auth-tag{font-size:13px;color:var(--text3);margin-bottom:32px;}
.auth-tabs{display:flex;background:var(--sur2);border-radius:10px;padding:3px;margin-bottom:28px;}
.auth-tab{flex:1;padding:9px;border-radius:8px;border:none;background:transparent;color:var(--text3);font-size:13px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;}
.auth-tab.on{background:var(--white);color:var(--text);box-shadow:0 1px 4px rgba(26,29,46,.1);}
.fg{margin-bottom:14px;}
.fl{display:block;font-size:11px;letter-spacing:.5px;text-transform:uppercase;color:var(--text3);margin-bottom:7px;font-weight:600;}
.fi{width:100%;background:var(--sur2);border:1.5px solid var(--bor);border-radius:10px;padding:11px 14px;color:var(--text);font-size:14px;font-family:'Inter',sans-serif;outline:none;transition:all .2s;}
.fi:focus{border-color:var(--indigo);background:var(--white);box-shadow:0 0 0 3px var(--indigo-m);}
.fi::placeholder{color:var(--text3);}
.btn-primary{width:100%;padding:13px;background:var(--indigo);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;margin-top:4px;}
.btn-primary:hover{background:var(--indigo2);transform:translateY(-1px);box-shadow:0 4px 16px rgba(41,171,226,.3);}
.btn-primary:disabled{background:var(--bor2);color:var(--text3);cursor:not-allowed;transform:none;box-shadow:none;}
.auth-err{font-size:12px;color:var(--red);margin-top:10px;text-align:center;font-weight:500;padding:8px;background:#FFF1F2;border-radius:8px;}
.auth-info{margin-top:16px;padding:12px 14px;background:var(--indigo-l);border:1px solid rgba(41,171,226,.2);border-radius:10px;font-size:12px;color:var(--text2);line-height:1.6;}
.auth-info strong{color:var(--indigo);font-weight:600;}

/* LOADING */
.loading-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;background:var(--bg);}
.spinner{width:40px;height:40px;border:3px solid var(--bor);border-top-color:var(--indigo);border-radius:50%;animation:spin .8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.loading-txt{font-size:14px;color:var(--text3);font-weight:500;}

/* SHELL */
.shell{display:flex;min-height:100vh;}
.sidebar{width:234px;flex-shrink:0;background:var(--white);border-right:1px solid var(--bor);display:flex;flex-direction:column;padding:24px 14px;position:sticky;top:0;height:100vh;overflow-y:auto;}
.s-logo{font-size:20px;font-weight:700;color:var(--indigo);padding:0 8px;margin-bottom:28px;letter-spacing:-0.5px;}
.s-logo span{color:var(--text);}
.s-sec{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);padding:0 8px;margin-bottom:8px;font-weight:600;}
.nav-btn{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;border:none;background:transparent;color:var(--text2);font-size:13px;font-weight:500;cursor:pointer;width:100%;text-align:left;font-family:'Inter',sans-serif;transition:all .15s;margin-bottom:2px;}
.nav-btn:hover{background:var(--sur2);color:var(--text);}
.nav-btn.on{background:var(--indigo-l);color:var(--indigo);font-weight:600;}
.nav-sep{height:1px;background:var(--bor);margin:14px 8px;}
.s-member{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:8px;cursor:pointer;transition:all .15s;}
.s-member:hover{background:var(--sur2);}
.m-av{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
.m-name{font-size:12px;color:var(--text2);font-weight:500;}
.m-role{font-size:10px;color:var(--text3);}
.s-user{margin-top:auto;padding:12px;background:var(--sur2);border-radius:12px;display:flex;align-items:center;gap:10px;}
.u-av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;color:#fff;}
.u-name{font-size:13px;font-weight:600;color:var(--text);}
.u-email{font-size:10px;color:var(--text3);}
.logout-btn{margin-left:auto;padding:5px 10px;border-radius:7px;border:1px solid var(--bor2);background:transparent;color:var(--text3);font-size:11px;cursor:pointer;font-family:'Inter',sans-serif;font-weight:500;transition:all .2s;white-space:nowrap;}
.logout-btn:hover{border-color:var(--red);color:var(--red);background:#FFF1F2;}

/* MAIN */
.main{flex:1;padding:36px 32px;overflow-y:auto;min-width:0;background:var(--bg);}
.pg-eye{font-size:12px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:var(--indigo);margin-bottom:6px;}
.pg-title{font-size:28px;font-weight:700;color:var(--text);letter-spacing:-0.5px;margin-bottom:28px;}

/* SUMMARY */
.sum-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px;}
.sum-card{background:var(--white);border:1px solid var(--bor);border-radius:var(--radius);padding:20px 18px;box-shadow:var(--shadow);transition:all .2s;}
.sum-card:hover{box-shadow:var(--shadow-lg);transform:translateY(-2px);}
.sc-icon{font-size:22px;margin-bottom:10px;}
.sc-lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:6px;}
.sc-val{font-size:26px;font-weight:700;color:var(--text);letter-spacing:-1px;line-height:1;}
.sc-sub{font-size:11px;color:var(--text3);margin-top:4px;}
.sc-val.accent{color:var(--indigo);}

/* FILTER */
.filter-row{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;align-items:center;}
.f-btn{padding:7px 16px;border-radius:100px;border:1.5px solid var(--bor);background:var(--white);color:var(--text2);font-size:12px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;}
.f-btn:hover{border-color:var(--indigo);color:var(--indigo);}
.f-btn.on{background:var(--indigo);border-color:var(--indigo);color:#fff;}
.f-count{font-size:12px;color:var(--text3);margin-left:4px;font-weight:500;}

/* SUB LIST */
.sub-list{display:flex;flex-direction:column;gap:10px;margin-bottom:20px;}
.sub-card{background:var(--white);border:1px solid var(--bor);border-radius:var(--radius);padding:16px 18px;display:grid;grid-template-columns:48px 1fr auto auto;align-items:center;gap:14px;box-shadow:var(--shadow);transition:all .2s;}
.sub-card:hover{box-shadow:var(--shadow-lg);border-color:var(--bor2);}
.sub-emoji-box{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
.sub-name{font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px;}
.sub-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.cat-pill{padding:2px 8px;border-radius:100px;font-size:11px;font-weight:500;display:inline-flex;align-items:center;gap:4px;}
.badge-shared{padding:2px 8px;border-radius:100px;font-size:10px;font-weight:600;background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0;}
.badge-priv{padding:2px 8px;border-radius:100px;font-size:10px;font-weight:600;background:#F5F3FF;color:#5B21B6;border:1px solid #DDD6FE;}
.owner-chip{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text3);font-weight:500;}
.o-dot{width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;}
.cost-block{text-align:right;min-width:80px;}
.sub-cost{font-size:17px;font-weight:700;color:var(--text);letter-spacing:-0.5px;}
.sub-freq{font-size:11px;color:var(--text3);margin-top:2px;font-weight:500;}
.sub-eq{font-size:10px;color:var(--indigo);margin-top:1px;font-weight:500;}
.acts{display:flex;gap:6px;}
.ic-btn{width:32px;height:32px;border-radius:8px;border:1px solid var(--bor);background:transparent;color:var(--text3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .2s;}
.ic-btn:hover{border-color:var(--indigo);color:var(--indigo);background:var(--indigo-l);}
.ic-btn.del:hover{border-color:var(--red);color:var(--red);background:#FFF1F2;}
.add-btn{width:100%;padding:14px;border-radius:12px;border:2px dashed var(--bor2);background:transparent;color:var(--text3);font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:'Inter',sans-serif;transition:all .2s;}
.add-btn:hover{border-color:var(--indigo);color:var(--indigo);background:var(--indigo-l);}

/* Usage bar */
.usage-bar-wrap{display:flex;align-items:center;gap:6px;margin-top:5px;}
.usage-bar-track{height:5px;background:var(--bor);border-radius:100px;overflow:hidden;width:60px;}
.usage-bar-fill{height:100%;border-radius:100px;transition:width .4s;}
.usage-bar-emoji{font-size:12px;line-height:1;}
.usage-bar-lbl{font-size:10px;font-weight:600;}

/* FAMILY */
.fam-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:28px;}
.fam-card{background:var(--white);border:1px solid var(--bor);border-radius:var(--radius);padding:22px 20px;box-shadow:var(--shadow);transition:all .2s;}
.fam-card:hover{box-shadow:var(--shadow-lg);transform:translateY(-2px);}
.fam-av{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:12px;}
.fam-role{display:inline-block;padding:3px 10px;border-radius:100px;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-bottom:10px;background:var(--indigo-l);color:var(--indigo);}
.fam-role.mem{background:#ECFDF5;color:#065F46;}
.fam-name{font-size:15px;font-weight:700;color:var(--text);margin-bottom:3px;}
.fam-email{font-size:12px;color:var(--text3);margin-bottom:14px;}
.fam-stats{display:flex;gap:16px;}
.fs-val{font-size:20px;font-weight:700;color:var(--text);letter-spacing:-0.5px;}
.fs-lbl{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;font-weight:600;}
.invite-card{background:transparent;border:2px dashed var(--bor2);border-radius:var(--radius);padding:22px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;min-height:175px;}
.invite-card:hover{border-color:var(--indigo);background:var(--indigo-l);}

/* PROFILE */
.prof-sec{background:var(--white);border:1px solid var(--bor);border-radius:var(--radius);padding:24px;margin-bottom:14px;box-shadow:var(--shadow);}
.prof-sec-title{font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--text3);margin-bottom:18px;}

/* EMPTY */
.empty{text-align:center;padding:48px 20px;color:var(--text3);}
.empty-ic{font-size:36px;margin-bottom:12px;opacity:.4;}
.empty-txt{font-size:13px;font-weight:500;}

/* ADMIN */
.admin-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:#FFF7E6;border:1px solid #FDE68A;border-radius:100px;font-size:11px;font-weight:700;color:#92400E;letter-spacing:.5px;text-transform:uppercase;margin-bottom:16px;}
.admin-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px;}
.admin-kpi{background:var(--white);border:1px solid var(--bor);border-radius:var(--radius);padding:20px 18px;box-shadow:var(--shadow);}
.ak-icon{font-size:24px;margin-bottom:8px;}
.ak-lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:6px;}
.ak-val{font-size:28px;font-weight:700;color:var(--text);letter-spacing:-1px;}
.ak-sub{font-size:11px;color:var(--text3);margin-top:3px;}
.export-row{display:flex;gap:10px;margin-bottom:28px;flex-wrap:wrap;}
.btn-export{display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px;border:1.5px solid var(--bor);background:var(--white);color:var(--text2);font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;box-shadow:var(--shadow);}
.btn-export:hover{border-color:var(--green);color:var(--green);background:#ECFDF5;}
.btn-export.bl:hover{border-color:var(--indigo);color:var(--indigo);background:var(--indigo-l);}
.admin-table-wrap{background:var(--white);border:1px solid var(--bor);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;margin-bottom:28px;}
.admin-table-header{padding:16px 20px;border-bottom:1px solid var(--bor);display:flex;align-items:center;justify-content:space-between;}
.admin-table-title{font-size:14px;font-weight:700;color:var(--text);}
.admin-table-count{font-size:12px;color:var(--text3);font-weight:500;}
table{width:100%;border-collapse:collapse;}
thead tr{background:var(--sur2);}
th{padding:11px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);white-space:nowrap;}
td{padding:12px 16px;font-size:13px;color:var(--text2);border-top:1px solid var(--bor);vertical-align:middle;}
tr:hover td{background:var(--sur2);}
.td-name{font-weight:600;color:var(--text);}
.plan-badge{padding:2px 9px;border-radius:100px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
.plan-free{background:#F1F3F9;color:var(--text3);}
.plan-pro{background:var(--indigo-l);color:var(--indigo);}
.role-sa{background:#FFF7E6;color:#92400E;border:1px solid #FDE68A;}
.u-chip{display:inline-flex;align-items:center;gap:6px;}
.u-av-sm{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;}

/* MODAL */
.overlay{position:fixed;inset:0;background:rgba(26,29,46,.5);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;}
.modal{background:var(--white);border:1px solid var(--bor);border-radius:20px;padding:28px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg);}
.modal-title{font-size:20px;font-weight:700;color:var(--text);margin-bottom:4px;letter-spacing:-0.3px;}
.modal-sub{font-size:13px;color:var(--text3);margin-bottom:22px;}
.steps{display:flex;gap:5px;align-items:center;margin-bottom:22px;}
.sdot{width:6px;height:6px;border-radius:50%;background:var(--bor2);transition:all .3s;}
.sdot.done{background:rgba(41,171,226,.4);}
.sdot.active{background:var(--indigo);width:18px;border-radius:3px;}
.slbl{margin-left:8px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);font-weight:600;}
.sl-lbl{font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:var(--text3);margin-bottom:10px;}
.s-tabs{display:flex;gap:5px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px;scrollbar-width:none;}
.s-tabs::-webkit-scrollbar{display:none;}
.s-tab{padding:5px 12px;border-radius:100px;border:1.5px solid var(--bor);background:var(--white);color:var(--text3);font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .2s;font-family:'Inter',sans-serif;}
.s-tab:hover{border-color:var(--indigo);color:var(--indigo);}
.s-tab.on{background:var(--indigo);border-color:var(--indigo);color:#fff;}
.svc-slider{display:flex;gap:8px;overflow-x:auto;padding-bottom:10px;scroll-snap-type:x mandatory;scrollbar-width:thin;scrollbar-color:var(--bor) transparent;}
.svc-slider::-webkit-scrollbar{height:3px;}
.svc-slider::-webkit-scrollbar-thumb{background:var(--bor2);border-radius:10px;}
.svc-card{flex-shrink:0;width:94px;scroll-snap-align:start;background:var(--sur2);border:1.5px solid var(--bor);border-radius:12px;padding:12px 8px;cursor:pointer;transition:all .18s;text-align:center;}
.svc-card:hover{border-color:var(--indigo);transform:translateY(-2px);background:var(--indigo-l);}
.svc-card.on{border-color:var(--indigo);background:var(--indigo-l);}
.svc-em{font-size:22px;margin-bottom:6px;display:block;}
.svc-nm{font-size:10px;color:var(--text2);font-weight:600;margin-bottom:3px;line-height:1.3;}
.svc-pr{font-size:9px;color:var(--text3);}
.svc-card.on .svc-nm{color:var(--indigo);}
.other-card{flex-shrink:0;width:94px;scroll-snap-align:start;background:transparent;border:1.5px dashed var(--bor2);border-radius:12px;padding:12px 8px;cursor:pointer;transition:all .18s;text-align:center;}
.other-card:hover{border-color:var(--indigo);transform:translateY(-2px);}
.other-card.on{border-style:solid;border-color:var(--indigo);background:var(--indigo-l);}
.sel-banner{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--indigo-l);border:1.5px solid rgba(41,171,226,.2);border-radius:11px;margin-bottom:16px;}
.sb-em{font-size:20px;}
.sb-nm{font-size:13px;font-weight:600;color:var(--text);}
.sb-hint{font-size:11px;color:var(--indigo);margin-top:1px;}
.ch-link{margin-left:auto;font-size:11px;color:var(--text3);cursor:pointer;text-decoration:underline;text-underline-offset:3px;white-space:nowrap;font-weight:500;}
.ch-link:hover{color:var(--indigo);}
.mfi{width:100%;background:var(--sur2);border:1.5px solid var(--bor);border-radius:9px;padding:10px 13px;color:var(--text);font-size:13px;font-family:'Inter',sans-serif;outline:none;transition:all .2s;}
.mfi:focus{border-color:var(--indigo);background:var(--white);box-shadow:0 0 0 3px var(--indigo-m);}
.mfi::placeholder{color:var(--text3);}
.msel{width:100%;background:var(--sur2);border:1.5px solid var(--bor);border-radius:9px;padding:10px 13px;color:var(--text);font-size:13px;font-family:'Inter',sans-serif;outline:none;transition:all .2s;}
.msel:focus{border-color:var(--indigo);background:var(--white);box-shadow:0 0 0 3px var(--indigo-m);}
.msel option{background:var(--white);}
.form-2col{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.mb{margin-bottom:14px;}
.cat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}
.cat-opt{padding:9px 6px;border-radius:9px;border:1.5px solid var(--bor);background:var(--sur2);color:var(--text2);font-size:10px;font-weight:500;cursor:pointer;text-align:center;transition:all .2s;font-family:'Inter',sans-serif;}
.cat-opt:hover{border-color:var(--indigo);background:var(--indigo-l);color:var(--indigo);}
.cat-opt.on{border-color:var(--indigo);background:var(--indigo-l);color:var(--indigo);}
.cat-opt .ci{font-size:16px;display:block;margin-bottom:3px;}
.freq-row{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}
.freq-opt{padding:9px 4px;border-radius:9px;border:1.5px solid var(--bor);background:var(--sur2);color:var(--text2);font-size:11px;font-weight:500;cursor:pointer;text-align:center;transition:all .2s;font-family:'Inter',sans-serif;}
.freq-opt:hover{border-color:var(--indigo);background:var(--indigo-l);color:var(--indigo);}
.freq-opt.on{border-color:var(--indigo);background:var(--indigo-l);color:var(--indigo);font-weight:600;}
.sh-toggle{display:flex;align-items:center;justify-content:space-between;padding:13px 14px;background:var(--sur2);border-radius:10px;border:1.5px solid var(--bor);cursor:pointer;transition:all .2s;}
.sh-toggle.on{border-color:rgba(16,185,129,.4);background:#ECFDF5;}
.st-lbl{font-size:13px;font-weight:600;color:var(--text);}
.st-hint{font-size:11px;color:var(--text3);margin-top:2px;}
.pill{width:40px;height:22px;border-radius:11px;background:var(--bor2);position:relative;transition:background .2s;flex-shrink:0;}
.pill.on{background:var(--green);}
.pill::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:white;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2);}
.pill.on::after{transform:translateX(18px);}
.cost-prev{padding:10px 13px;background:var(--indigo-l);border-radius:9px;font-size:12px;color:var(--indigo);margin:10px 0 14px;font-weight:600;border:1px solid rgba(41,171,226,.15);}
.usage-picker{display:flex;gap:8px;}
.usage-opt{flex:1;padding:10px 4px;border-radius:12px;border:1.5px solid var(--bor);background:var(--sur2);cursor:pointer;transition:all .2s;text-align:center;font-family:'Inter',sans-serif;}
.usage-opt:hover{border-color:var(--indigo);background:var(--indigo-l);transform:translateY(-2px);}
.usage-opt.on{border-color:var(--indigo);background:var(--indigo);transform:translateY(-2px);box-shadow:0 4px 12px rgba(41,171,226,.3);}
.usage-opt .uo-emoji{font-size:20px;display:block;margin-bottom:4px;}
.usage-opt .uo-num{font-size:16px;font-weight:700;color:var(--text);display:block;line-height:1;}
.usage-opt .uo-lbl{font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-top:3px;display:block;}
.usage-opt.on .uo-num,.usage-opt.on .uo-lbl{color:#fff;}
.owner-picker{display:flex;gap:8px;flex-wrap:wrap;}
.owner-opt{display:flex;align-items:center;gap:7px;padding:8px 12px;border-radius:9px;border:1.5px solid var(--bor);background:var(--sur2);cursor:pointer;transition:all .2s;font-size:12px;font-weight:500;color:var(--text2);font-family:'Inter',sans-serif;}
.owner-opt:hover{border-color:var(--indigo);color:var(--indigo);background:var(--indigo-l);}
.owner-opt.on{border-color:var(--indigo);background:var(--indigo-l);color:var(--indigo);font-weight:600;}
.owner-av{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;}
.modal-acts{display:flex;gap:8px;margin-top:20px;}
.btn-m-pri{flex:1;padding:12px;background:var(--indigo);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;}
.btn-m-pri:hover{background:var(--indigo2);}
.btn-m-pri:disabled{background:var(--bor2);color:var(--text3);cursor:not-allowed;}
.btn-m-sec{padding:12px 18px;background:transparent;color:var(--text2);border:1.5px solid var(--bor);border-radius:9px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;}
.btn-m-sec:hover{border-color:var(--bor2);color:var(--text);}
.confirm-box{background:#FFF1F2;border:1.5px solid #FECDD3;border-radius:12px;padding:16px;margin-bottom:16px;text-align:center;}
.confirm-box p{font-size:13px;color:#9F1239;font-weight:500;margin-bottom:12px;}
.confirm-row{display:flex;gap:8px;justify-content:center;}
.btn-danger{padding:9px 20px;background:var(--red);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;}
.btn-danger:hover{background:#E11D48;}
.toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(80px);background:var(--text);border-radius:12px;padding:12px 20px;font-size:13px;font-weight:500;color:#fff;z-index:999;transition:transform .3s cubic-bezier(.34,1.56,.64,1);white-space:nowrap;box-shadow:var(--shadow-lg);}
.toast.show{transform:translateX(-50%) translateY(0);}
@media(max-width:720px){
  .shell{flex-direction:column;}
  .sidebar{width:100%;height:auto;position:static;padding:16px;}
  .s-user{display:none;}
  .main{padding:20px 16px;}
  .sum-row,.admin-kpi-row{grid-template-columns:1fr 1fr;}
  .sub-card{grid-template-columns:40px 1fr auto auto;}
  .fam-grid{grid-template-columns:1fr;}
  .admin-table-wrap{overflow-x:auto;}
}
`;

// ─── SERVICE SLIDER ───────────────────────────────────────────

function ServiceSlider({ onSelect, selectedName }) {
  const [tab, setTab] = useState("Tutti");
  const filtered = tab==="Tutti" ? POPULAR_SERVICES : POPULAR_SERVICES.filter(s=>{const c=CATEGORIES.find(x=>x.label===tab);return c&&s.category===c.id;});
  const fs = f => f==="monthly"?"/mes":f==="yearly"?"/anno":"/trim";
  return (
    <div>
      <div className="sl-lbl">Servizi popolari in Italia</div>
      <div className="s-tabs">{SLIDER_TABS.map(t=><button key={t} className={"s-tab"+(tab===t?" on":"")} onClick={()=>setTab(t)}>{t}</button>)}</div>
      <div className="svc-slider">
        {filtered.map(s=>(
          <div key={s.name} className={"svc-card"+(selectedName===s.name?" on":"")} onClick={()=>onSelect(s)}>
            <span className="svc-em">{s.emoji}</span><div className="svc-nm">{s.name}</div><div className="svc-pr">€{s.cost}{fs(s.frequency)}</div>
          </div>
        ))}
        <div className={"other-card"+(selectedName==="__altro__"?" on":"")} onClick={()=>onSelect({name:"__altro__"})}>
          <span className="svc-em">✏️</span><div className="svc-nm" style={{color:selectedName==="__altro__"?"var(--indigo)":"var(--text3)"}}>Altro</div><div className="svc-pr">manuale</div>
        </div>
      </div>
    </div>
  );
}

// ─── SUB MODAL ───────────────────────────────────────────────

const EF = { name:"", category:"entertainment", cost:"", frequency:"monthly", payment:"", shared:true, ownerId:"", usage_level:3 };

function SubModal({ onClose, onSave, onDelete, editSub, currentUser, familyMembers }) {
  const [sel, setSel]           = useState(editSub?{name:editSub.name,emoji:editSub.emoji}:null);
  const [form, setForm]         = useState(editSub
    ?{name:editSub.name,category:editSub.category,cost:editSub.cost,frequency:editSub.frequency,payment:editSub.payment||"",shared:editSub.shared,ownerId:editSub.owner_id,usage_level:editSub.usage_level||3}
    :{...EF,ownerId:currentUser.id});
  const [confirmDel, setConfirmDel] = useState(false);
  const [saving, setSaving] = useState(false);

  const isManual=sel&&sel.name==="__altro__", hasSelected=sel!==null;
  const costNum=parseFloat(form.cost)||0, canSave=form.name.trim()!==""&&costNum>0;
  const setF=patch=>setForm(p=>({...p,...patch}));

  function pickService(s) {
    if(s.name==="__altro__"){setSel({name:"__altro__"});setForm({...EF,ownerId:currentUser.id});}
    else{setSel(s);setForm({name:s.name,category:s.category,cost:s.cost,frequency:s.frequency,payment:"",shared:true,ownerId:currentUser.id,usage_level:3});}
  }

  async function handleSave() {
    setSaving(true);
    await onSave({...form,cost:costNum,emoji:editSub?.emoji||POPULAR_SERVICES.find(p=>p.name===form.name)?.emoji||"📦"});
    setSaving(false);
  }

  return (
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal">
        <div className="modal-title">{editSub?"Modifica abbonamento":"Nuovo abbonamento"}</div>
        <div className="modal-sub">{editSub?"Aggiorna i dettagli":"Scegli tra i più popolari o aggiungi manualmente"}</div>
        {!editSub&&<div className="steps"><div className={"sdot"+(!hasSelected?" active":" done")}/><div className={"sdot"+(hasSelected?" active":"")}/><span className="slbl">{!hasSelected?"Scegli servizio":"Dettagli"}</span></div>}
        {!editSub&&!hasSelected&&<ServiceSlider onSelect={pickService} selectedName={sel?sel.name:null}/>}
        {(editSub||hasSelected)&&(
          <>
            {!editSub&&!isManual&&sel&&<div className="sel-banner"><span className="sb-em">{sel.emoji||"📦"}</span><div><div className="sb-nm">{sel.name}</div><div className="sb-hint">Dati precompilati — modificabili</div></div><span className="ch-link" onClick={()=>setSel(null)}>← Cambia</span></div>}
            {!editSub&&isManual&&<div style={{marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,color:"var(--text3)",fontWeight:500}}>Inserimento manuale</span><span className="ch-link" onClick={()=>setSel(null)}>← Torna ai servizi</span></div>}
            {(isManual||editSub)&&(
              <>
                <div className="mb"><div className="fl">Nome servizio</div><input className="mfi" placeholder="es. Palestra, Parking…" value={form.name} onChange={e=>setF({name:e.target.value})}/></div>
                <div className="mb"><div className="fl">Categoria</div><div className="cat-grid">{CATEGORIES.map(c=><button key={c.id} className={"cat-opt"+(form.category===c.id?" on":"")} onClick={()=>setF({category:c.id})}><span className="ci">{c.icon}</span>{c.label}</button>)}</div></div>
              </>
            )}
            <div className="form-2col mb">
              <div><div className="fl">Costo (€)</div><input className="mfi" type="number" placeholder="0.00" step="0.01" value={form.cost} onChange={e=>setF({cost:e.target.value})}/></div>
              <div><div className="fl">Frequenza</div><div className="freq-row">{FREQUENCIES.map(fr=><button key={fr.id} className={"freq-opt"+(form.frequency===fr.id?" on":"")} onClick={()=>setF({frequency:fr.id})}>{fr.label}</button>)}</div></div>
            </div>
            {costNum>0&&<div className="cost-prev">💶 €{toMonthly(costNum,form.frequency).toFixed(2)}/mese · €{toYearly(costNum,form.frequency).toFixed(2)}/anno</div>}
            <div className="mb">
              <div className="fl">Metodo di pagamento <span style={{textTransform:"none",letterSpacing:0,color:"var(--text3)",fontWeight:400}}>(opzionale)</span></div>
              <select className="msel" value={form.payment} onChange={e=>setF({payment:e.target.value})}><option value="">— Non specificato —</option>{PAYMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select>
            </div>
            {familyMembers.length>1&&<div className="mb"><div className="fl">Intestato a</div><div className="owner-picker">{familyMembers.map(m=><button key={m.id} className={"owner-opt"+(form.ownerId===m.id?" on":"")} onClick={()=>setF({ownerId:m.id})}><span className="owner-av" style={{background:m.color||"#29ABE2"}}>{m.avatar||"👤"}</span>{m.id===currentUser.id?"Tu":m.name?.split(" ")[0]}</button>)}</div></div>}
            <div className="mb">
              <div className="fl">Utilizzo <span style={{textTransform:"none",letterSpacing:0,color:"var(--text3)",fontWeight:400}}>— quanto lo usate?</span></div>
              <div className="usage-picker">{USAGE_CONFIG.map(u=><div key={u.val} className={"usage-opt"+(form.usage_level===u.val?" on":"")} onClick={()=>setF({usage_level:u.val})}><span className="uo-emoji">{u.emoji}</span><span className="uo-num">{u.val}</span><span className="uo-lbl">{u.short}</span></div>)}</div>
            </div>
            <div className={"sh-toggle"+(form.shared?" on":"")} onClick={()=>setF({shared:!form.shared})} style={{marginBottom:18}}>
              <div><div className="st-lbl">{form.shared?"Condiviso con la famiglia":"Privato — solo per me"}</div><div className="st-hint">{form.shared?"Tutti i membri possono vederlo":"Solo tu puoi vedere questo abbonamento"}</div></div>
              <div className={"pill"+(form.shared?" on":"")}/>
            </div>
            {editSub&&confirmDel&&<div className="confirm-box"><p>Eliminare <strong>{editSub.name}</strong>?</p><div className="confirm-row"><button className="btn-m-sec" onClick={()=>setConfirmDel(false)}>Annulla</button><button className="btn-danger" onClick={()=>{onDelete(editSub.id);onClose();}}>Elimina</button></div></div>}
            <div className="modal-acts">
              {editSub&&!confirmDel&&<button className="btn-m-sec" style={{color:"var(--red)",borderColor:"#FECDD3"}} onClick={()=>setConfirmDel(true)}>🗑 Elimina</button>}
              <button className="btn-m-sec" onClick={onClose}>Annulla</button>
              <button className="btn-m-pri" disabled={!canSave||saving} onClick={handleSave}>{saving?"Salvataggio…":editSub?"Salva modifiche":"Aggiungi"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────

function AuthScreen({ onLogin }) {
  const [tab, setTab]           = useState("login");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function doLogin() {
    setLoading(true); setError("");
    const res = await sb.signIn(email, password);
    if (res.error) { setError(res.error.message || "Email o password errati."); setLoading(false); return; }
    const token = res.access_token;
    // Check if superadmin
    const admins = await sb.select("super_admins", `email=eq.${email}`);
    const isSA = Array.isArray(admins) && admins.length > 0;
    // Get or create profile
    let profiles = await sb.select("profiles", `id=eq.${res.user.id}`, token);
    let profile = Array.isArray(profiles) && profiles[0];
    if (!profile) {
      const idx = Math.floor(Math.random() * MEMBER_COLORS.length);
      const inserted = await sb.insert("profiles", { id:res.user.id, name:res.user.user_metadata?.name||email.split("@")[0], email, role:isSA?"superadmin":"admin", color:MEMBER_COLORS[idx], avatar:MEMBER_AVATARS[idx], plan:"free" }, token);
      profile = Array.isArray(inserted) ? inserted[0] : inserted;
    }
    onLogin({ ...profile, token, isSuperAdmin: isSA });
    setLoading(false);
  }

  async function doRegister() {
    if (!name.trim()||!email.trim()||!password.trim()) { setError("Compila tutti i campi."); return; }
    if (password.length < 6) { setError("La password deve avere almeno 6 caratteri."); return; }
    setLoading(true); setError("");
    const res = await sb.signUp(email, password, name);
    if (res.error) { setError(res.error.message); setLoading(false); return; }
    // Auto-login right after signup (email confirm is disabled)
    const loginRes = await sb.signIn(email, password);
    if (loginRes.error) {
      setError("Account creato! Ora accedi con le tue credenziali.");
      setTab("login"); setLoading(false); return;
    }
    const token = loginRes.access_token;
    const admins = await sb.select("super_admins", `email=eq.${email}`);
    const isSA = Array.isArray(admins) && admins.length > 0;
    const idx = Math.floor(Math.random() * MEMBER_COLORS.length);
    const inserted = await sb.insert("profiles", {
      id: loginRes.user.id, name, email,
      role: isSA ? "superadmin" : "admin",
      color: MEMBER_COLORS[idx], avatar: MEMBER_AVATARS[idx], plan: "free"
    }, token);
    const profile = Array.isArray(inserted) ? inserted[0] : inserted;
    onLogin({ ...(profile || {}), id: loginRes.user.id, name, email, token, isSuperAdmin: isSA, color: MEMBER_COLORS[idx], avatar: MEMBER_AVATARS[idx] });
    setLoading(false);
  }

  const sw = t => { setTab(t); setError(""); };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Sub<span>ly</span></div>
        <div className="auth-tag">Gestisci gli abbonamenti tuoi e della tua famiglia</div>
        <div className="auth-tabs">
          <button className={"auth-tab"+(tab==="login"?" on":"")} onClick={()=>sw("login")}>Accedi</button>
          <button className={"auth-tab"+(tab==="register"?" on":"")} onClick={()=>sw("register")}>Registrati</button>
        </div>
        {tab==="register"&&<div className="fg"><label className="fl">Nome completo</label><input className="fi" placeholder="Mario Rossi" value={name} onChange={e=>setName(e.target.value)}/></div>}
        <div className="fg"><label className="fl">Email</label><input className="fi" type="email" placeholder="mario@esempio.it" value={email} onChange={e=>setEmail(e.target.value)}/></div>
        <div className="fg"><label className="fl">Password</label><input className="fi" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(tab==="login"?doLogin():doRegister())}/></div>
        {error&&<div className="auth-err">{error}</div>}
        <button className="btn-primary" disabled={loading} onClick={tab==="login"?doLogin:doRegister}>{loading?"Caricamento…":tab==="login"?"Accedi":"Crea account"}</button>
        <div className="auth-info"><strong>Account admin:</strong> belen_gobell@hotmail.com · lucaocean@hotmail.it<br/>Registrati con queste email per accedere al pannello Admin.</div>
      </div>
    </div>
  );
}

// ─── ADMIN PAGE ───────────────────────────────────────────────

function AdminPage({ allUsers, allSubs, token }) {
  const [tab, setTab] = useState("users");
  const totalMonthly = allSubs.reduce((a,s)=>a+toMonthly(s.cost,s.frequency),0);
  const topService = (() => { const f={}; allSubs.forEach(s=>{f[s.name]=(f[s.name]||0)+1;}); const t=Object.entries(f).sort((a,b)=>b[1]-a[1])[0]; return t?t[0]:"—"; })();

  return (
    <div>
      <div className="admin-badge">👑 Super Admin Dashboard</div>
      <div className="pg-title">Pannello di controllo</div>
      <div className="admin-kpi-row">
        <div className="admin-kpi"><div className="ak-icon">👥</div><div className="ak-lbl">Utenti totali</div><div className="ak-val">{allUsers.length}</div><div className="ak-sub">registrati</div></div>
        <div className="admin-kpi"><div className="ak-icon">📋</div><div className="ak-lbl">Abbonamenti</div><div className="ak-val">{allSubs.length}</div><div className="ak-sub">inseriti</div></div>
        <div className="admin-kpi"><div className="ak-icon">💶</div><div className="ak-lbl">Spesa totale</div><div className="ak-val" style={{color:"var(--indigo)"}}>€{totalMonthly.toFixed(0)}</div><div className="ak-sub">al mese (aggregato)</div></div>
        <div className="admin-kpi"><div className="ak-icon">⭐</div><div className="ak-lbl">Servizio top</div><div className="ak-val" style={{fontSize:16,letterSpacing:0}}>{topService}</div><div className="ak-sub">più usato</div></div>
      </div>
      <div className="export-row">
        <button className="btn-export" onClick={()=>exportUsersCSV(allUsers,allSubs)}>📥 Esporta Utenti (.csv)</button>
        <button className="btn-export bl" onClick={()=>exportSubsCSV(allSubs,allUsers)}>📥 Esporta Abbonamenti (.csv)</button>
      </div>
      <div className="filter-row" style={{marginBottom:16}}>
        <button className={"f-btn"+(tab==="users"?" on":"")} onClick={()=>setTab("users")}>👥 Utenti ({allUsers.length})</button>
        <button className={"f-btn"+(tab==="subs"?" on":"")} onClick={()=>setTab("subs")}>📋 Abbonamenti ({allSubs.length})</button>
      </div>
      {tab==="users"&&(
        <div className="admin-table-wrap">
          <div className="admin-table-header"><span className="admin-table-title">Utenti registrati</span><span className="admin-table-count">{allUsers.length} utenti</span></div>
          <div style={{overflowX:"auto"}}><table><thead><tr><th>Utente</th><th>Email</th><th>Piano</th><th>Ruolo</th><th>Registrato</th><th>Abbonamenti</th><th>€/mese</th></tr></thead>
          <tbody>{allUsers.map(u=>{const uS=allSubs.filter(s=>s.owner_id===u.id);const m=uS.reduce((a,s)=>a+toMonthly(s.cost,s.frequency),0);return(<tr key={u.id}><td><div className="u-chip"><div className="u-av-sm" style={{background:u.color||"#29ABE2",color:"#fff",fontSize:11,fontWeight:700}}>{getInitials(u.name)}</div><span className="td-name">{u.name}</span></div></td><td>{u.email}</td><td><span className={"plan-badge "+(u.plan==="pro"?"plan-pro":"plan-free")}>{u.plan||"free"}</span></td><td><span className={"plan-badge "+(u.role==="superadmin"?"role-sa":"plan-free")}>{u.role}</span></td><td>{fmtDate(u.created_at)}</td><td style={{fontWeight:600}}>{uS.length}</td><td style={{color:"var(--indigo)",fontWeight:600}}>€{m.toFixed(2)}</td></tr>);})}</tbody></table></div>
        </div>
      )}
      {tab==="subs"&&(
        <div className="admin-table-wrap">
          <div className="admin-table-header"><span className="admin-table-title">Tutti gli abbonamenti</span><span className="admin-table-count">{allSubs.length}</span></div>
          <div style={{overflowX:"auto"}}><table><thead><tr><th>Servizio</th><th>Categoria</th><th>Costo</th><th>Freq.</th><th>€/mese</th><th>Utilizzo</th><th>Intestato a</th></tr></thead>
          <tbody>{allSubs.map(s=>{const cat=getCatInfo(s.category);const cc=CAT_COLORS[s.category]||CAT_COLORS.other;const owner=allUsers.find(u=>u.id===s.owner_id);const uc=getUsageCfg(s.usage_level);return(<tr key={s.id}><td><div className="u-chip"><span style={{fontSize:16}}>{s.emoji||cat.icon}</span><span className="td-name">{s.name}</span></div></td><td><span className="cat-pill" style={{background:cc.bg,color:cc.text}}>{cat.icon} {cat.label}</span></td><td style={{fontWeight:600}}>€{Number(s.cost).toFixed(2)}</td><td>{getFreqLabel(s.frequency)}</td><td style={{color:"var(--indigo)",fontWeight:600}}>€{toMonthly(s.cost,s.frequency).toFixed(2)}</td><td><span style={{color:uc.color,fontWeight:600}}>{uc.emoji} {uc.short}</span></td><td>{owner?owner.name:"—"}</td></tr>);})}</tbody></table></div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────

export default function App() {
  const [user, setUser]         = useState(null);
  const [page, setPage]         = useState("dashboard");
  const [subs, setSubs]         = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allSubs, setAllSubs]   = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [filter, setFilter]     = useState("all");
  const [subModal, setSubModal] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [invName, setInvName]   = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [toast, setToast]       = useState({show:false,msg:""});
  const [loading, setLoading]   = useState(false);

  const showToast = useCallback(msg=>{setToast({show:true,msg});setTimeout(()=>setToast({show:false,msg:""}),2600);},[]);

  // Load subscriptions when user logs in
  useEffect(()=>{
    if(!user) return;
    loadData();
  },[user]);

  async function loadData() {
    setLoading(true);
    if (user.isSuperAdmin) {
      // Admin: load everything
      const [uRes, sRes] = await Promise.all([
        sb.select("profiles", "order=created_at.desc"),
        sb.select("subscriptions", "order=created_at.desc"),
      ]);
      setAllUsers(Array.isArray(uRes)?uRes:[]);
      setAllSubs(Array.isArray(sRes)?sRes:[]);
    } else {
      // Load user's own subs + shared family subs
      const mySubs = await sb.select("subscriptions", `owner_id=eq.${user.id}`, user.token);
      setSubs(Array.isArray(mySubs)?mySubs:[]);
      // Load family members if user has a family
      if (user.family_id) {
        const members = await sb.select("profiles", `family_id=eq.${user.family_id}`, user.token);
        setFamilyMembers(Array.isArray(members)?members:[user]);
        const sharedSubs = await sb.select("subscriptions", `family_id=eq.${user.family_id}&shared=eq.true`, user.token);
        // Merge own + shared (deduplicate)
        const merged = [...(Array.isArray(mySubs)?mySubs:[])];
        (Array.isArray(sharedSubs)?sharedSubs:[]).forEach(s=>{if(!merged.find(x=>x.id===s.id))merged.push(s);});
        setSubs(merged);
      } else {
        setFamilyMembers([user]);
      }
    }
    setLoading(false);
  }

  async function saveSub(form) {
    const editing = subModal && typeof subModal === "object";
    const data = {
      name: form.name, category: form.category, cost: form.cost,
      frequency: form.frequency, payment: form.payment, shared: form.shared,
      usage_level: form.usage_level, owner_id: form.ownerId || user.id,
      family_id: user.family_id || null, emoji: form.emoji || "📦",
    };
    if (editing) {
      await sb.update("subscriptions", data, {id: subModal.id}, user.token);
      showToast("✅ Abbonamento aggiornato");
    } else {
      await sb.insert("subscriptions", data, user.token);
      showToast("✅ Abbonamento aggiunto");
    }
    setSubModal(null);
    loadData();
  }

  async function deleteSub(id) {
    await sb.delete("subscriptions", {id}, user.token);
    showToast("🗑 Abbonamento eliminato");
    loadData();
  }

  function doLogout() { setUser(null); setSubs([]); setAllUsers([]); setAllSubs([]); setPage("dashboard"); }

  if (!user) return <><style>{S}</style><AuthScreen onLogin={u=>{setUser(u);setPage(u.isSuperAdmin?"admin":"dashboard");}}/></>;
  if (loading) return <><style>{S}</style><div className="loading-wrap"><div className="spinner"/><div className="loading-txt">Caricamento...</div></div></>;

  const visibleSubs = subs;
  const filteredSubs = filter==="all"?visibleSubs:filter==="shared"?visibleSubs.filter(s=>s.shared):visibleSubs.filter(s=>!s.shared&&s.owner_id===user.id);
  const totalMonthly = visibleSubs.reduce((a,s)=>a+toMonthly(s.cost,s.frequency),0);
  const myMonthly    = subs.filter(s=>s.owner_id===user.id).reduce((a,s)=>a+toMonthly(s.cost,s.frequency),0);
  const sharedCount  = visibleSubs.filter(s=>s.shared).length;
  const privateCount = subs.filter(s=>s.owner_id===user.id&&!s.shared).length;

  const navItems = user.isSuperAdmin
    ? [{id:"admin",icon:"👑",label:"Admin Dashboard"}]
    : [{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"family",icon:"👨‍👩‍👧",label:"Famiglia"},{id:"profile",icon:"👤",label:"Profilo"}];

  function SubRow({sub}) {
    const cat=getCatInfo(sub.category), cc=CAT_COLORS[sub.category]||CAT_COLORS.other;
    const owner=familyMembers.find(m=>m.id===sub.owner_id)||user;
    const isOwn=sub.owner_id===user.id;
    const editable=isOwn||(user.role==="admin"&&sub.family_id===user.family_id);
    const uc=getUsageCfg(sub.usage_level);
    return (
      <div className="sub-card" style={{cursor:editable?"pointer":"default"}} onClick={()=>{if(editable)setSubModal(sub);}}>
        <div className="sub-emoji-box" style={{background:cc.bg}}><span style={{fontSize:22}}>{sub.emoji||cat.icon}</span></div>
        <div>
          <div className="sub-name">{sub.name}</div>
          <div className="sub-meta">
            <span className="cat-pill" style={{background:cc.bg,color:cc.text}}>{cat.icon} {cat.label}</span>
            {sub.shared?<span className="badge-shared">Condiviso</span>:<span className="badge-priv">🔒 Privato</span>}
            {owner&&<span className="owner-chip"><span className="o-dot" style={{background:owner.color||"#29ABE2"}}>{owner.avatar||"👤"}</span>{isOwn?"Tu":owner.name?.split(" ")[0]}</span>}
            {sub.payment&&<span style={{color:"var(--text3)",fontSize:11}}>· {sub.payment}</span>}
          </div>
          {sub.usage_level&&<div className="usage-bar-wrap"><span className="usage-bar-emoji">{uc.emoji}</span><span className="usage-bar-track"><span className="usage-bar-fill" style={{width:(sub.usage_level/5*100)+"%",background:uc.color}}/></span><span className="usage-bar-lbl" style={{color:uc.color}}>{uc.short}</span></div>}
        </div>
        <div className="cost-block">
          <div className="sub-cost">€{Number(sub.cost).toFixed(2)}</div>
          <div className="sub-freq">{getFreqLabel(sub.frequency)}</div>
          {sub.frequency!=="monthly"&&<div className="sub-eq">€{toMonthly(sub.cost,sub.frequency).toFixed(2)}/mes</div>}
        </div>
        <div className="acts" onClick={e=>e.stopPropagation()}>
          {editable&&<><button className="ic-btn" onClick={()=>setSubModal(sub)}>✏️</button><button className="ic-btn del" onClick={()=>{if(window.confirm("Eliminare "+sub.name+"?"))deleteSub(sub.id);}}>🗑</button></>}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{S}</style>
      <div className="shell">
        <aside className="sidebar">
          <div className="s-logo">Sub<span>ly</span></div>
          <div className="s-sec" style={{marginBottom:10}}>Menu</div>
          {navItems.map(n=><button key={n.id} className={"nav-btn"+(page===n.id?" on":"")} onClick={()=>setPage(n.id)}><span style={{fontSize:16,width:22,textAlign:"center"}}>{n.icon}</span>{n.label}</button>)}
          {!user.isSuperAdmin&&familyMembers.length>1&&(
            <><div className="nav-sep"/><div className="s-sec">Famiglia</div>
            {familyMembers.map(m=><div key={m.id} className="s-member" onClick={()=>setPage("family")}><div className="m-av" style={{background:m.color||"#29ABE2"}}>{m.avatar||"👤"}</div><div><div className="m-name">{m.id===user.id?"Tu":m.name?.split(" ")[0]}</div><div className="m-role">{m.role==="admin"?"Admin":"Membro"}</div></div></div>)}</>
          )}
          <div className="nav-sep"/>
          <div className="s-user">
            <div className="u-av" style={{background:user.color||"#29ABE2"}}>{user.isSuperAdmin?"👑":getInitials(user.name)}</div>
            <div><div className="u-name">{user.name?.split(" ")[0]}</div><div className="u-email">{user.email}</div></div>
            <button className="logout-btn" onClick={doLogout}>Esci</button>
          </div>
        </aside>

        <main className="main">
          {page==="admin"&&<AdminPage allUsers={allUsers} allSubs={allSubs} token={user.token}/>}

          {page==="dashboard"&&!user.isSuperAdmin&&(
            <>
              <div className="pg-eye">Benvenuto, {user.name?.split(" ")[0]}</div>
              <div className="pg-title">I tuoi abbonamenti</div>
              <div className="sum-row">
                <div className="sum-card"><div className="sc-icon">💳</div><div className="sc-lbl">Famiglia/mese</div><div className="sc-val accent">€{totalMonthly.toFixed(0)}</div><div className="sc-sub">€{(totalMonthly*12).toFixed(0)}/anno</div></div>
                <div className="sum-card"><div className="sc-icon">👤</div><div className="sc-lbl">Miei costi</div><div className="sc-val">€{myMonthly.toFixed(0)}</div><div className="sc-sub">al mese</div></div>
                <div className="sum-card"><div className="sc-icon">🤝</div><div className="sc-lbl">Condivisi</div><div className="sc-val">{sharedCount}</div><div className="sc-sub">con la famiglia</div></div>
                <div className="sum-card"><div className="sc-icon">🔒</div><div className="sc-lbl">Privati</div><div className="sc-val">{privateCount}</div><div className="sc-sub">solo tuoi</div></div>
              </div>
              <div className="filter-row">
                {[["all","Tutti"],["shared","🤝 Condivisi"],["private","🔒 Privati"]].map(([id,lbl])=><button key={id} className={"f-btn"+(filter===id?" on":"")} onClick={()=>setFilter(id)}>{lbl}</button>)}
                <span className="f-count">{filteredSubs.length} abbonamenti</span>
              </div>
              <div className="sub-list">
                {filteredSubs.length===0&&<div className="empty"><div className="empty-ic">📭</div><div className="empty-txt">Nessun abbonamento — aggiungine uno!</div></div>}
                {filteredSubs.map(s=><SubRow key={s.id} sub={s}/>)}
              </div>
              <button className="add-btn" onClick={()=>setSubModal("new")}><span style={{fontSize:18}}>+</span> Aggiungi abbonamento</button>
            </>
          )}

          {page==="family"&&!user.isSuperAdmin&&(
            <>
              <div className="pg-eye">La tua famiglia</div>
              <div className="pg-title">Gestione famiglia</div>
              <div className="fam-grid">
                {familyMembers.map(m=>{
                  const mS=subs.filter(s=>s.owner_id===m.id);
                  const mM=mS.reduce((a,s)=>a+toMonthly(s.cost,s.frequency),0);
                  return <div key={m.id} className="fam-card"><div className="fam-av" style={{background:m.color||"#29ABE2"}}>{m.avatar||"👤"}</div><div className={"fam-role"+(m.role==="member"?" mem":"")}>{m.role==="admin"?"Admin":"Membro"}</div><div className="fam-name">{m.name}{m.id===user.id?" (tu)":""}</div><div className="fam-email">{m.email}</div><div className="fam-stats"><div><div className="fs-val">{mS.length}</div><div className="fs-lbl">abbonamenti</div></div><div><div className="fs-val">€{mM.toFixed(0)}</div><div className="fs-lbl">/mese</div></div></div></div>;
                })}
                <div className="invite-card" onClick={()=>setShowInvite(true)}><div style={{fontSize:28,marginBottom:10,opacity:.4}}>➕</div><div style={{fontSize:13,color:"var(--text3)",fontWeight:500}}>Invita un membro</div></div>
              </div>
              <div className="pg-eye" style={{marginBottom:12}}>Abbonamenti condivisi</div>
              <div className="sub-list">
                {subs.filter(s=>s.shared).length===0&&<div className="empty"><div className="empty-ic">🤝</div><div className="empty-txt">Nessun abbonamento condiviso</div></div>}
                {subs.filter(s=>s.shared).map(s=><SubRow key={s.id} sub={s}/>)}
              </div>
            </>
          )}

          {page==="profile"&&!user.isSuperAdmin&&(
            <>
              <div className="pg-eye">Il tuo account</div>
              <div className="pg-title">Profilo</div>
              <div className="prof-sec">
                <div className="prof-sec-title">Informazioni personali</div>
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
                  <div style={{width:56,height:56,borderRadius:"50%",background:user.color||"#29ABE2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"#fff",flexShrink:0}}>{getInitials(user.name)}</div>
                  <div><div style={{fontSize:20,fontWeight:700,color:"var(--text)",letterSpacing:"-0.3px"}}>{user.name}</div><div style={{fontSize:13,color:"var(--text3)"}}>{user.email}</div></div>
                </div>
              </div>
              <div className="prof-sec">
                <div className="prof-sec-title">Riepilogo abbonamenti</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                  {[["Totali",subs.filter(s=>s.owner_id===user.id).length],["Condivisi",subs.filter(s=>s.owner_id===user.id&&s.shared).length],["Privati",subs.filter(s=>s.owner_id===user.id&&!s.shared).length]].map(([l,v])=><div key={l} className="sum-card"><div className="sc-lbl">{l}</div><div className="sc-val">{v}</div></div>)}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {subModal!==null&&<SubModal onClose={()=>setSubModal(null)} onSave={saveSub} onDelete={deleteSub} editSub={typeof subModal==="object"?subModal:null} currentUser={user} familyMembers={familyMembers}/>}

      {showInvite&&(
        <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setShowInvite(false);}}>
          <div className="modal">
            <div className="modal-title">Invita un membro</div>
            <div className="modal-sub">Aggiungi un familiare. Si registrerà con questa email.</div>
            <div className="mb"><div className="fl">Nome</div><input className="mfi" placeholder="Nome Cognome" value={invName} onChange={e=>setInvName(e.target.value)}/></div>
            <div className="mb"><div className="fl">Email</div><input className="mfi" type="email" placeholder="familiare@esempio.it" value={invEmail} onChange={e=>setInvEmail(e.target.value)}/></div>
            <div className="modal-acts">
              <button className="btn-m-sec" onClick={()=>setShowInvite(false)}>Annulla</button>
              <button className="btn-m-pri" disabled={!invName.trim()||!invEmail.trim()} onClick={()=>{showToast("📨 Link invito copiato per "+invName);setShowInvite(false);}}>Invia invito</button>
            </div>
          </div>
        </div>
      )}

      <div className={"toast"+(toast.show?" show":"")}>{toast.msg}</div>
    </>
  );
}
