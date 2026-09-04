"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowUpRight, Bot, Check, CircleGauge, Globe2, Inbox, Radar, Search, Send, Settings2, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";
import { demoLeads, demoProduct } from "@/lib/mock-data";
import { scoreBand } from "@/lib/scoring";
import type { Lead, ProductProfile } from "@/lib/types";

const nav = [
  [Radar, "Intent Radar"],
  [Inbox, "Lead Queue"],
  [Target, "Competitors"],
  [Globe2, "Communities"],
  [Bot, "AI Agents"],
  [CircleGauge, "Analytics"],
] as const;

function Score({ value }: { value: number }) {
  const band = scoreBand(value);
  const tone = band === "hot" ? "score hot" : band === "strong" ? "score strong" : band === "watch" ? "score watch" : "score";
  return <div className={tone}>{value}</div>;
}

export function IntentDashboard() {
  const [selectedId, setSelectedId] = useState(demoLeads[0].id);
  const [leads, setLeads] = useState(demoLeads);
  const [query, setQuery] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [product, setProduct] = useState<ProductProfile>(demoProduct);
  const [analyzing, setAnalyzing] = useState(false);
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return leads;
    return leads.filter((item) => `${item.title} ${item.body} ${item.community}`.toLowerCase().includes(normalized));
  }, [leads, query]);

  const selected = leads.find((item) => item.id === selectedId) ?? leads[0];
  const hot = leads.filter((item) => item.score >= 90).length;

  function updateStatus(id: string, status: Lead["status"]) {
    setLeads((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    setNotice(status === "approved" ? "Reply approved for the execution queue." : "Lead status updated.");
  }

  async function analyzeSite() {
    if (!siteUrl.trim()) return;
    setAnalyzing(true);
    setNotice("");
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: siteUrl }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to analyze site");
      setProduct(payload.data);
      setNotice("Product intelligence profile created in demo mode.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to analyze site");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Zap size={17} /></div><div><strong>SignalOS</strong><span>Intent Revenue OS</span></div></div>
        <nav>{nav.map(([Icon, label], index) => <button className={index === 0 ? "nav-item active" : "nav-item"} key={label}><Icon size={17}/><span>{label}</span></button>)}</nav>
        <div className="sidebar-bottom"><button className="nav-item"><Settings2 size={17}/><span>Settings</span></button><div className="workspace"><span>RS</span><div><strong>Founder workspace</strong><small>Demo mode</small></div></div></div>
      </aside>

      <section className="workspace-main">
        <header className="topbar">
          <div><p className="eyebrow">REAL-TIME BUYING SIGNALS</p><h1>Intent Radar</h1></div>
          <div className="top-actions"><span className="live"><i/> Ingestion live</span><button className="secondary"><ShieldCheck size={15}/> Safe execution</button></div>
        </header>

        <section className="product-strip">
          <div className="product-copy"><span className="product-icon"><Sparkles size={18}/></span><div><small>Active product intelligence</small><strong>{product.name}</strong><p>{product.summary}</p></div></div>
          <div className="analyze-form"><input value={siteUrl} onChange={(e)=>setSiteUrl(e.target.value)} placeholder="https://yourproduct.com"/><button onClick={analyzeSite} disabled={analyzing}>{analyzing ? "Analyzing…" : "Analyze website"}</button></div>
        </section>
        {notice && <div className="notice">{notice}</div>}

        <section className="metrics">
          <article><span><Activity size={16}/> Opportunities</span><strong>{leads.length}</strong><small>Qualified from monitored conversations</small></article>
          <article><span><Zap size={16}/> Hot intent</span><strong>{hot}</strong><small>Score 90+ and ready to act</small></article>
          <article><span><Check size={16}/> Approved</span><strong>{leads.filter((l)=>l.status === "approved").length}</strong><small>Human-approved execution queue</small></article>
          <article><span><CircleGauge size={16}/> Avg. score</span><strong>{Math.round(leads.reduce((a,b)=>a+b.score,0)/leads.length)}</strong><small>Explainable weighted ranking</small></article>
        </section>

        <section className="radar-grid">
          <div className="feed-panel">
            <div className="panel-heading"><div><strong>Opportunity feed</strong><span>{filtered.length} surfaced signals</span></div><div className="search"><Search size={15}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search signals"/></div></div>
            <div className="lead-list">
              {filtered.map((item) => <button key={item.id} onClick={()=>setSelectedId(item.id)} className={selected?.id === item.id ? "lead-row selected" : "lead-row"}>
                <Score value={item.score}/>
                <div className="lead-copy"><div className="lead-meta"><span className={`platform ${item.platform}`}>{item.platform}</span><span>{item.community}</span><span>{item.status}</span></div><strong>{item.title}</strong><p>{item.body}</p></div>
                <ArrowUpRight size={16}/>
              </button>)}
            </div>
          </div>

          {selected && <aside className="detail-panel">
            <div className="detail-head"><div><span className={`platform ${selected.platform}`}>{selected.platform}</span><span>{selected.community}</span></div><Score value={selected.score}/></div>
            <h2>{selected.title}</h2><p className="post-body">{selected.body}</p>
            <div className="intel-card"><span>WHY THIS MATTERS</span><p>{selected.rationale}</p></div>
            <div className="intel-card evidence"><span>EVIDENCE</span><p>“{selected.evidence}”</p></div>
            <div className="signal-bars">{Object.entries(selected.breakdown).map(([key,value]) => <div key={key}><div><span>{key.replace(/([A-Z])/g," $1")}</span><strong>{value}</strong></div><div className="bar"><i style={{width:`${value}%`}}/></div></div>)}</div>
            <div className="draft"><div><span>AI RECOMMENDED ACTION</span><strong>{selected.recommendedAction.replace("_", " ")}</strong></div><textarea value={selected.draftReply} readOnly/></div>
            <div className="actions"><button className="primary" onClick={()=>updateStatus(selected.id,"approved")}><Check size={16}/> Approve</button><button className="secondary" onClick={()=>updateStatus(selected.id,"ignored")}>Ignore</button><button className="icon-btn" title="Send"><Send size={16}/></button></div>
          </aside>}
        </section>
      </section>
    </main>
  );
}
