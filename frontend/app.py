"""
AI Resume Intelligence Platform — v3.0
3-column SaaS dashboard matching the reference layout exactly.

Real backend endpoints — no mock data:
  POST /api/v1/upload
  GET  /api/v1/test-extraction
  GET  /api/v1/test-analysis
"""

import streamlit as st
import requests
import math
from pathlib import Path

# ─── Config ───────────────────────────────────────────────────────────────────

API_BASE = "http://127.0.0.1:8001/api/v1"
UPLOAD_EP   = f"{API_BASE}/upload"
EXTRACT_EP  = f"{API_BASE}/test-extraction"
ANALYSIS_EP = f"{API_BASE}/test-analysis"

SKILL_CATS = {
    "Languages": {"Python","C++","C","C#","Java","JavaScript","TypeScript","SQL","HTML","CSS","Rust","Go","Ruby","PHP","Swift","Kotlin"},
    "ML / AI": {"PyTorch","Scikit-Learn","XGBoost","RAG","BM25","Sentence Transformers","TensorFlow","Keras","LangChain","spaCy","NLTK","OpenAI","Groq","Llama","BERT","Hugging Face","ChromaDB","Milvus","Qdrant","Deep Learning","Machine Learning"},
    "Backend": {"FastAPI","Streamlit","Flask","Django","Node.js","Express","REST API"},
    "Data": {"Pandas","NumPy","Matplotlib","Seaborn","SciPy","Tableau","Power BI"},
    "Tools": {"Docker","Git","GitHub","GitLab","Vertex AI","AWS","GCP","Azure","Kubernetes","Linux","Bash","Nginx","VS Code","Postman"},
}

st.set_page_config(page_title="AI Resume Intelligence Platform", page_icon="✦", layout="wide", initial_sidebar_state="expanded")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  CSS — matches reference screenshot exactly
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

/* ── Reset ── */
*, html, body, [class*="css"] {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
}
.stApp, .main .block-container {
    background: #F8FAFC !important;
    padding-top: 1.5rem !important;
}
.block-container { max-width: 1400px !important; padding-left: 2rem !important; padding-right: 2rem !important; }
header[data-testid="stHeader"] { background: #F8FAFC !important; }

/* ── Sidebar ── */
section[data-testid="stSidebar"] {
    background: #FFFFFF !important;
    border-right: 1px solid #E2E8F0 !important;
    width: 260px !important;
}
section[data-testid="stSidebar"] > div { padding-top: 1.2rem !important; }
section[data-testid="stSidebar"] hr { border-color: #F1F5F9 !important; margin: 12px 0 !important; }
section[data-testid="stSidebar"] * { color: #475569 !important; }

/* Sidebar brand */
.sb-brand { display:flex; align-items:center; gap:12px; margin-bottom:4px; }
.sb-logo {
    width:38px; height:38px; border-radius:10px;
    background: linear-gradient(135deg, #2563EB, #7C3AED);
    display:flex; align-items:center; justify-content:center;
    font-size:18px; color:#fff !important; font-weight:800;
    box-shadow: 0 2px 8px rgba(37,99,235,0.3);
}
.sb-title { font-size:1rem !important; font-weight:700 !important; color:#0F172A !important; }
.sb-ver { font-size:0.72rem !important; color:#94A3B8 !important; }

/* Sidebar nav */
.nav-item {
    display:flex; align-items:center; gap:10px;
    padding:9px 14px; border-radius:10px; margin:2px 0;
    font-size:0.88rem; font-weight:500; color:#64748B !important;
    cursor:pointer; transition: all 0.15s;
}
.nav-item:hover { background:#F8FAFC; color:#0F172A !important; }
.nav-item.active {
    background:#EFF6FF; color:#2563EB !important;
    font-weight:600;
}
.nav-item .nav-icon { font-size:1rem; width:20px; text-align:center; }

/* Sidebar powered-by */
.pw-label {
    font-size:0.65rem; font-weight:700; color:#94A3B8 !important;
    text-transform:uppercase; letter-spacing:0.1em; margin-bottom:10px;
}
.pw-item {
    display:flex; align-items:center; gap:8px;
    font-size:0.82rem; color:#475569 !important;
    margin-bottom:7px; font-weight:500;
}
.pw-dot {
    width:8px; height:8px; border-radius:50%; flex-shrink:0;
}

/* Sidebar bottom CTA */
.sb-cta {
    background: linear-gradient(135deg, #FEF3C7, #FDE68A);
    border-radius:12px; padding:16px 18px; margin-top:16px;
}
.sb-cta-icon { font-size:1.2rem; margin-bottom:4px; }
.sb-cta-title { font-size:0.88rem; font-weight:700; color:#92400E !important; margin-bottom:2px; }
.sb-cta-sub { font-size:0.75rem; color:#A16207 !important; line-height:1.5; }

/* ── Top Header Bar ── */
.top-bar {
    display:flex; justify-content:space-between; align-items:flex-start;
    margin-bottom:24px;
}
.top-title {
    font-size:1.65rem; font-weight:800; color:#0F172A;
    letter-spacing:-0.03em; display:flex; align-items:center; gap:10px;
}
.top-sub { font-size:0.9rem; color:#64748B; margin-top:4px; }
.upload-btn {
    display:inline-flex; align-items:center; gap:8px;
    background:linear-gradient(135deg,#2563EB,#1D4ED8); color:#fff !important;
    border:none; border-radius:10px; padding:10px 22px;
    font-size:0.85rem; font-weight:600; cursor:pointer;
    box-shadow:0 2px 8px rgba(37,99,235,0.3);
    text-decoration:none;
}

/* ── ATS Hero Card ── */
.hero-card {
    background:#FFFFFF; border:1px solid #E2E8F0;
    border-radius:16px; padding:28px 32px;
    box-shadow:0 4px 12px rgba(0,0,0,0.06);
    margin-bottom:24px;
    display:flex; align-items:center; gap:32px;
}
.hero-ring-wrap {
    position:relative; width:140px; height:140px; flex-shrink:0;
}
.hero-ring-wrap svg { transform:rotate(-90deg); }
.hero-ring-bg { fill:none; stroke:#E2E8F0; stroke-width:12; }
.hero-ring-fg { fill:none; stroke-width:12; stroke-linecap:round; }
.hero-ring-fg.green  { stroke:#22C55E; }
.hero-ring-fg.yellow { stroke:#F59E0B; }
.hero-ring-fg.red    { stroke:#EF4444; }
.hero-center {
    position:absolute; top:50%; left:50%;
    transform:translate(-50%,-50%); text-align:center;
}
.hero-num { font-size:2.8rem; font-weight:900; color:#0F172A; line-height:1; letter-spacing:-0.03em; }
.hero-max { font-size:0.85rem; color:#94A3B8; font-weight:500; }

.hero-info { flex:1; }
.hero-title-row { display:flex; align-items:center; gap:12px; margin-bottom:6px; }
.hero-title { font-size:1.2rem; font-weight:700; color:#0F172A; }
.hero-badge {
    display:inline-flex; align-items:center; gap:5px;
    background:#F0FDF4; color:#15803D; border:1px solid #BBF7D0;
    border-radius:20px; padding:4px 14px; font-size:0.75rem; font-weight:600;
}
.hero-desc { font-size:0.85rem; color:#64748B; line-height:1.6; max-width:360px; }

.hero-metrics {
    display:flex; gap:28px; flex-shrink:0;
}
.hero-metric { text-align:center; }
.hero-metric-icon {
    width:42px; height:42px; border-radius:12px;
    background:#F8FAFC; border:1px solid #E2E8F0;
    display:flex; align-items:center; justify-content:center;
    margin:0 auto 8px auto; font-size:18px;
}
.hero-metric-label { font-size:0.68rem; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:0.06em; }
.hero-metric-val { font-size:1.5rem; font-weight:800; color:#0F172A; margin:2px 0; }
.hero-metric-sub { font-size:0.7rem; color:#94A3B8; }

/* ── Section Title ── */
.sec-t {
    font-size:1rem; font-weight:700; color:#0F172A;
    display:flex; align-items:center; gap:8px;
    margin-bottom:16px;
}
.sec-t .icon { font-size:1rem; }

/* ── Card ── */
.crd {
    background:#FFFFFF; border:1px solid #E2E8F0;
    border-radius:16px; padding:22px 24px;
    box-shadow:0 1px 4px rgba(0,0,0,0.04);
    margin-bottom:16px;
}
.crd-title {
    font-size:1rem; font-weight:700; color:#0F172A;
    margin-bottom:16px; display:flex; align-items:center; gap:8px;
}

/* Accent cards */
.crd.a-green  { border-left:4px solid #22C55E; }
.crd.a-amber  { border-left:4px solid #F59E0B; }
.crd.a-purple { border-left:4px solid #8B5CF6; }
.crd.a-blue   { border-left:4px solid #2563EB; }

/* ── Profile ── */
.prof-name { font-size:1.1rem; font-weight:700; color:#0F172A; margin-bottom:12px; }
.prof-row {
    display:flex; align-items:center; gap:10px;
    font-size:0.85rem; color:#475569; margin-bottom:8px;
}
.prof-icon {
    width:26px; height:26px; border-radius:7px;
    display:inline-flex; align-items:center; justify-content:center;
    font-size:12px; flex-shrink:0;
}
.prof-icon.person { background:#EFF6FF; }
.prof-icon.mail   { background:#FEF3C7; }
.prof-icon.phone  { background:#F0FDF4; }

/* ── Skills ── */
.sk-cat {
    font-size:0.72rem; font-weight:600; color:#94A3B8;
    margin-bottom:8px; margin-top:14px;
}
.sk-cat:first-child { margin-top:0; }
.sk-pill {
    display:inline-block; border-radius:8px;
    padding:4px 12px; font-size:0.78rem; font-weight:500;
    margin:2px 4px 2px 0;
}
.sk-pill.lang    { background:#EEF2FF; color:#4338CA; }
.sk-pill.ai      { background:#F5F3FF; color:#6D28D9; }
.sk-pill.backend { background:#EFF6FF; color:#1D4ED8; }
.sk-pill.data    { background:#F0FDF4; color:#15803D; }
.sk-pill.tools   { background:#F1F5F9; color:#475569; }
.sk-pill.other   { background:#FFF7ED; color:#9A3412; }

/* ── Education ── */
.edu-inst { font-size:0.92rem; font-weight:600; color:#0F172A; }
.edu-deg  { font-size:0.82rem; color:#475569; }
.edu-meta { font-size:0.78rem; color:#94A3B8; margin-top:2px; }

/* ── Experience ── */
.exp-role { font-size:0.92rem; font-weight:600; color:#0F172A; }
.exp-dur  { font-size:0.78rem; color:#94A3B8; margin-top:2px; }

/* ── Score Breakdown ── */
.bd-row { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
.bd-lbl { width:120px; font-size:0.82rem; color:#64748B; font-weight:500; flex-shrink:0; }
.bd-track { flex:1; height:8px; background:#F1F5F9; border-radius:4px; overflow:hidden; }
.bd-fill  { height:100%; border-radius:4px; transition:width 0.5s; }
.bd-fill.blue   { background:linear-gradient(90deg,#2563EB,#60A5FA); }
.bd-fill.green  { background:linear-gradient(90deg,#22C55E,#4ADE80); }
.bd-fill.amber  { background:linear-gradient(90deg,#F59E0B,#FBBF24); }
.bd-fill.purple { background:linear-gradient(90deg,#8B5CF6,#A78BFA); }
.bd-val { width:46px; text-align:right; font-size:0.82rem; font-weight:700; color:#0F172A; flex-shrink:0; }

/* ── Projects ── */
.proj-item {
    display:flex; justify-content:space-between; align-items:flex-start;
    padding:14px 0; border-bottom:1px solid #F1F5F9;
}
.proj-item:last-child { border-bottom:none; }
.proj-title { font-size:0.9rem; font-weight:600; color:#0F172A; margin-bottom:4px; }
.proj-desc  { font-size:0.8rem; color:#64748B; line-height:1.5; max-width:90%; }
.proj-arrow { color:#CBD5E1; font-size:1.1rem; margin-top:4px; }

/* ── Certifications ── */
.cert-item {
    display:flex; align-items:flex-start; gap:8px;
    font-size:0.82rem; color:#475569; margin-bottom:8px; line-height:1.5;
}
.cert-icon { color:#F59E0B; flex-shrink:0; margin-top:2px; }

/* ── Analysis bullets ── */
.ab {
    position:relative; padding-left:16px;
    font-size:0.85rem; color:#475569; line-height:1.65;
    margin-bottom:8px;
}
.ab::before {
    content:'•'; position:absolute; left:0; font-weight:700;
}
.ab.green::before  { color:#22C55E; }
.ab.amber::before  { color:#F59E0B; }
.ab.purple::before { color:#8B5CF6; }

/* ── Summary box ── */
.sum-box {
    font-size:0.85rem; color:#475569; line-height:1.7;
}

/* ── Role tags ── */
.rtag {
    display:inline-block;
    background:#EFF6FF; color:#1E40AF;
    border:1px solid #BFDBFE; border-radius:8px;
    padding:6px 14px; font-size:0.8rem; font-weight:500;
    margin:3px 5px 3px 0;
}

/* ── Status banners ── */
.st-ok   { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:10px 16px; color:#15803D; font-size:0.85rem; }
.st-err  { background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:10px 16px; color:#DC2626; font-size:0.85rem; }
.st-info { background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px; padding:10px 16px; color:#1D4ED8; font-size:0.85rem; }

/* ── Overrides ── */
[data-testid="stFileUploader"] label { color:#475569 !important; }
[data-testid="stFileUploaderDropzone"] { background:#F8FAFC !important; border:2px dashed #CBD5E1 !important; border-radius:10px !important; }
[data-testid="stFileUploaderDropzone"] span { color:#64748B !important; }
[data-testid="stFileUploaderDropzone"] small { color:#94A3B8 !important; }
[data-testid="stFileUploaderDropzone"] button { color:#2563EB !important; }
button[kind="primary"] {
    background:linear-gradient(135deg,#2563EB,#1D4ED8) !important;
    border:none !important; color:#fff !important;
    font-weight:600 !important; border-radius:10px !important;
    padding:10px 28px !important;
    box-shadow:0 2px 8px rgba(37,99,235,0.3) !important;
}
button[kind="primary"]:hover {
    background:linear-gradient(135deg,#3B82F6,#2563EB) !important;
}
[data-testid="stStatusWidget"] { background:#fff !important; border:1px solid #E2E8F0 !important; border-radius:12px !important; }
[data-testid="stStatusWidget"] * { color:#475569 !important; }
[data-testid="stExpander"] { background:#fff !important; border:1px solid #E2E8F0 !important; border-radius:12px !important; margin-bottom:8px !important; }
[data-testid="stExpander"] summary span { color:#0F172A !important; font-weight:600 !important; font-size:0.88rem !important; }
[data-testid="stExpander"] [data-testid="stExpanderDetails"] * { color:#475569 !important; }
hr { border-color:#E2E8F0 !important; }
.stMarkdown p, .stMarkdown li { color:#475569; }
.stMarkdown strong { color:#0F172A; }
.stMarkdown em { color:#64748B; }

#MainMenu, footer, [data-testid="stToolbar"] { visibility:hidden; }
</style>
""", unsafe_allow_html=True)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def s_color(s): return "green" if s >= 90 else "yellow" if s >= 75 else "red"

def mtype(fn, st_t):
    if st_t: return st_t
    return {".pdf":"application/pdf",".docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}.get(Path(fn).suffix.lower(),"application/octet-stream")

def cat_skills(skills):
    g, o = {}, []
    for s in skills:
        placed = False
        for c, m in SKILL_CATS.items():
            if s in m: g.setdefault(c,[]).append(s); placed=True; break
        if not placed: o.append(s)
    if o: g["Other"] = o
    return g

def hero_ring(score, color):
    r, c = 58, 2*math.pi*58
    off = c*(1-score/100)
    return f'<div class="hero-ring-wrap"><svg width="140" height="140" viewBox="0 0 140 140"><circle class="hero-ring-bg" cx="70" cy="70" r="{r}"/><circle class="hero-ring-fg {color}" cx="70" cy="70" r="{r}" stroke-dasharray="{c:.1f}" stroke-dashoffset="{off:.1f}"/></svg><div class="hero-center"><div class="hero-num">{score}</div><div class="hero-max">/ 100</div></div></div>'

def badge_text(s):
    if s >= 90: return "Excellent Match", "#F0FDF4", "#15803D", "#BBF7D0"
    if s >= 75: return "Good Match", "#FFFBEB", "#A16207", "#FDE68A"
    return "Needs Work", "#FEF2F2", "#DC2626", "#FECACA"

# ─── API ──────────────────────────────────────────────────────────────────────

def api_upload(fb, fn, mt):
    try:
        r = requests.post(UPLOAD_EP, files={"file":(fn,fb,mt)}, timeout=30)
        if r.status_code in (200,201):
            d=r.json(); return True, f"Saved as {d.get('filename',fn)} ({d.get('file_size_kb','?')} KB)"
        return False, f"Upload failed [{r.status_code}]: {r.json().get('detail',r.text)}"
    except requests.exceptions.ConnectionError: return False, "Cannot connect to backend (port 8001)."
    except Exception as e: return False, f"Upload error: {e}"

def api_extract():
    try:
        r = requests.get(EXTRACT_EP, timeout=30)
        if r.status_code == 200: return True, r.json()
        return False, f"Extraction failed [{r.status_code}]: {r.json().get('detail',r.text)}"
    except requests.exceptions.ConnectionError: return False, "Cannot connect to backend."
    except Exception as e: return False, f"Extraction error: {e}"

def api_analysis():
    try:
        r = requests.get(ANALYSIS_EP, timeout=90)
        if r.status_code == 200:
            p=r.json(); return True, {"analysis":p.get("analysis",p), "resume_data":p.get("resume_data")}
        return False, f"Analysis failed [{r.status_code}]: {r.json().get('detail',r.text)}"
    except requests.exceptions.ConnectionError: return False, "Cannot connect to backend."
    except Exception as e: return False, f"Analysis error: {e}"

# ─── Session state ────────────────────────────────────────────────────────────

for k in ("extraction","analysis","upload_info","errors"):
    if k not in st.session_state: st.session_state[k] = None

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  SIDEBAR — matches reference exactly
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

with st.sidebar:
    # Brand
    st.markdown(
        '<div class="sb-brand">'
        '<div class="sb-logo">✦</div>'
        '<div><div class="sb-title">AI Resume Parser</div><div class="sb-ver">Version 1.0</div></div>'
        '</div>',
        unsafe_allow_html=True,
    )
    st.markdown("---")

    # Navigation
    st.markdown(
        '<div class="nav-item active"><span class="nav-icon">🏠</span>Dashboard</div>'
        '<div class="nav-item"><span class="nav-icon">📄</span>Upload Resume</div>'
        '<div class="nav-item"><span class="nav-icon">🕒</span>Analysis History</div>'
        '<div class="nav-item"><span class="nav-icon">⬇</span>Export Report</div>',
        unsafe_allow_html=True,
    )
    st.markdown("---")

    # Powered By
    st.markdown('<div class="pw-label">Powered By</div>', unsafe_allow_html=True)
    tech_colors = [("#2563EB","FastAPI"),("#F59E0B","Groq LLM"),("#EF4444","PyMuPDF"),("#22C55E","Streamlit"),("#8B5CF6","Pydantic")]
    pw_html = ""
    for clr, name in tech_colors:
        pw_html += f'<div class="pw-item"><div class="pw-dot" style="background:{clr}"></div>{name}</div>'
    st.markdown(pw_html, unsafe_allow_html=True)
    st.markdown("---")

    # Bottom CTA
    st.markdown(
        '<div class="sb-cta">'
        '<div class="sb-cta-icon">⭐</div>'
        '<div class="sb-cta-title">AI-Powered Insights</div>'
        '<div class="sb-cta-sub">Smarter hiring decisions<br>with advanced AI analysis.</div>'
        '</div>',
        unsafe_allow_html=True,
    )

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  TOP HEADER — title + upload button
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

hdr_l, hdr_r = st.columns([4, 1])
with hdr_l:
    st.markdown(
        '<div style="margin-bottom:4px;">'
        '<div class="top-title">✦ AI Resume Intelligence Platform</div>'
        '<div class="top-sub">Upload a resume and get recruiter-grade ATS scoring powered by Groq LLM.</div>'
        '</div>',
        unsafe_allow_html=True,
    )
with hdr_r:
    uploaded_file = st.file_uploader("Upload", type=["pdf","docx"], label_visibility="collapsed", key="uploader")

# Upload button
if uploaded_file:
    st.markdown(f'<div class="st-ok" style="margin-bottom:12px;">✅ Ready: <strong>{uploaded_file.name}</strong> ({round(uploaded_file.size/1024,1)} KB)</div>', unsafe_allow_html=True)

analyse_btn = st.button("✦  Upload & Analyse Resume", disabled=(uploaded_file is None), type="primary")

# ─── Pipeline ─────────────────────────────────────────────────────────────────

if analyse_btn and uploaded_file:
    for k in ("extraction","analysis","upload_info"): st.session_state[k] = None
    st.session_state.errors = []
    errs = []
    with st.status("Running analysis pipeline…", expanded=True) as sb:
        st.write("📤  Uploading…")
        ok, msg = api_upload(uploaded_file.getvalue(), uploaded_file.name, mtype(uploaded_file.name, uploaded_file.type))
        if not ok:
            st.write(f"❌  {msg}"); sb.update(label="Failed", state="error"); errs.append(msg)
        else:
            st.write(f"✅  {msg}")
            st.write("🔎  Extracting…")
            ok2, r2 = api_extract()
            if not ok2:
                st.write(f"❌  {r2}"); sb.update(label="Failed", state="error"); errs.append(str(r2))
            else:
                st.write("✅  Extraction complete")
                st.session_state.extraction = r2
                st.write("🤖  Running ATS + Groq analysis…")
                ok3, r3 = api_analysis()
                if not ok3:
                    st.write(f"❌  {r3}"); sb.update(label="Failed", state="error"); errs.append(str(r3))
                else:
                    if r3.get("resume_data"): st.session_state.extraction = r3["resume_data"]
                    st.session_state.analysis = r3["analysis"]
                    st.write("✅  Complete"); sb.update(label="✅ Pipeline complete!", state="complete")
    st.session_state.errors = errs

if st.session_state.errors:
    for e in st.session_state.errors:
        st.markdown(f'<div class="st-err">❌  {e}</div>', unsafe_allow_html=True)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  RESULTS DASHBOARD
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if st.session_state.extraction and st.session_state.analysis:
    ext = st.session_state.extraction
    ana = st.session_state.analysis
    bd  = ana.get("score_breakdown", {})
    ats = ana.get("ats_score", 0)
    conf = ana.get("confidence_score", 0)
    ver = ana.get("analysis_version", "v1.0")
    clr = s_color(ats)
    btxt, bbg, bfg, bbd = badge_text(ats)

    # ══════════════════════════════════════════════════════════════════════════
    # HERO SECTION — ATS Score
    # ══════════════════════════════════════════════════════════════════════════

    st.markdown(
        f'<div class="hero-card">'
        # Ring
        f'{hero_ring(ats, clr)}'
        # Info
        f'<div class="hero-info">'
        f'  <div class="hero-title-row">'
        f'    <div class="hero-title">ATS Compatibility Score</div>'
        f'    <div class="hero-badge" style="background:{bbg};color:{bfg};border-color:{bbd};">● {btxt}</div>'
        f'  </div>'
        f'  <div class="hero-desc">This score reflects how well the resume matches industry standards and role expectations.</div>'
        f'</div>'
        # Metrics
        f'<div class="hero-metrics">'
        f'  <div class="hero-metric">'
        f'    <div class="hero-metric-icon">🎯</div>'
        f'    <div class="hero-metric-label">Confidence Score</div>'
        f'    <div class="hero-metric-val">{conf}%</div>'
        f'  </div>'
        f'  <div class="hero-metric">'
        f'    <div class="hero-metric-icon">⚙️</div>'
        f'    <div class="hero-metric-label">Analysis Engine</div>'
        f'    <div class="hero-metric-val">{ver}</div>'
        f'    <div class="hero-metric-sub">Latest Model</div>'
        f'  </div>'
        f'</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    # ══════════════════════════════════════════════════════════════════════════
    # 3-COLUMN GRID — matches reference
    # ══════════════════════════════════════════════════════════════════════════

    col1, col2, col3 = st.columns([1, 1, 1], gap="medium")

    # ── COLUMN 1: Candidate Profile ───────────────────────────────────────────
    with col1:
        name  = ext.get("name", "—")
        email = ext.get("email", "—")
        phone = ext.get("phone", "—")

        # Profile Card
        st.markdown(
            f'<div class="crd">'
            f'<div class="crd-title">👤 Candidate Profile</div>'
            f'<div class="prof-row"><span class="prof-icon person">👤</span><span class="prof-name" style="font-size:0.85rem;">{name}</span></div>'
            f'<div class="prof-row"><span class="prof-icon mail">✉️</span>{email}</div>'
            f'<div class="prof-row"><span class="prof-icon phone">📱</span>{phone}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        # Skills Card
        skills = ext.get("skills", [])
        if skills:
            grp = cat_skills(skills)
            css_map = {"Languages":"lang","ML / AI":"ai","Backend":"backend","Data":"data","Tools":"tools","Other":"other"}
            sk_html = '<div class="crd"><div class="crd-title">⚡ Skills</div>'
            for cat, items in grp.items():
                cc = css_map.get(cat, "other")
                sk_html += f'<div class="sk-cat">{cat}</div>'
                sk_html += "".join(f'<span class="sk-pill {cc}">{s}</span>' for s in items)
            sk_html += '</div>'
            st.markdown(sk_html, unsafe_allow_html=True)

        # Education Card
        edu_list = ext.get("education", [])
        if edu_list:
            edu_html = '<div class="crd"><div class="crd-title">🎓 Education</div>'
            for edu in edu_list:
                edu_html += f'<div class="edu-inst">{edu.get("institution","—")}</div>'
                edu_html += f'<div class="edu-deg">{edu.get("degree","")}</div>'
                edu_html += f'<div class="edu-meta">{edu.get("duration","")}'
                if edu.get("gpa"): edu_html += f' • {edu["gpa"]}'
                edu_html += '</div>'
            edu_html += '</div>'
            st.markdown(edu_html, unsafe_allow_html=True)

        # Experience Card
        exp_list = ext.get("experience", [])
        if exp_list:
            exp_html = '<div class="crd"><div class="crd-title">💼 Experience</div>'
            for exp in exp_list:
                exp_html += f'<div class="exp-role">{exp.get("role","—")} @ {exp.get("company","—")}</div>'
                exp_html += f'<div class="exp-dur">{exp.get("duration","")}</div>'
                for b in exp.get("description", []):
                    exp_html += f'<div style="font-size:0.82rem;color:#475569;margin:4px 0 4px 12px;">→ {b}</div>'
            exp_html += '</div>'
            st.markdown(exp_html, unsafe_allow_html=True)

    # ── COLUMN 2: Score Breakdown, Projects, Certifications ───────────────────
    with col2:
        # Score Breakdown
        bd_html = '<div class="crd"><div class="crd-title">📊 Score Breakdown</div>'
        bar_colors = ["blue","blue","green","green","amber"]
        for (lbl, key, mx), bc in zip([("Technical Skills","technical_skills",30),("Projects","projects",25),("Experience","experience",20),("Education","education",10),("Impact","impact",15)], bar_colors):
            v = bd.get(key, 0)
            pct = v/mx*100 if mx else 0
            bd_html += f'<div class="bd-row"><div class="bd-lbl">{lbl}</div><div class="bd-track"><div class="bd-fill {bc}" style="width:{pct}%"></div></div><div class="bd-val">{v}/{mx}</div></div>'
        bd_html += '</div>'
        st.markdown(bd_html, unsafe_allow_html=True)

        # Projects
        projects = ext.get("projects", [])
        if projects:
            proj_html = '<div class="crd"><div class="crd-title">🚀 Projects</div>'
            for p in projects:
                title = p.get("title", "Untitled")
                desc_lines = p.get("description", [])
                short_desc = desc_lines[1] if len(desc_lines) > 1 else (desc_lines[0] if desc_lines else "")
                # Truncate to ~100 chars
                if len(short_desc) > 120: short_desc = short_desc[:117] + "…"
                proj_html += f'<div class="proj-item"><div><div class="proj-title">{title}</div><div class="proj-desc">{short_desc}</div></div><div class="proj-arrow">›</div></div>'
            proj_html += '</div>'
            st.markdown(proj_html, unsafe_allow_html=True)

        # Certifications
        certs = ext.get("certifications", [])
        if certs:
            cert_html = '<div class="crd"><div class="crd-title">🏆 Certifications</div>'
            for c in certs:
                cert_html += f'<div class="cert-item"><span class="cert-icon">✦</span><span>{c}</span></div>'
            cert_html += '</div>'
            st.markdown(cert_html, unsafe_allow_html=True)

    # ── COLUMN 3: AI Intelligence ─────────────────────────────────────────────
    with col3:
        # Candidate Summary
        summary = ana.get("candidate_summary", "")
        if summary:
            st.markdown(
                f'<div class="crd a-blue">'
                f'<div class="crd-title" style="color:#2563EB;">💡 Candidate Summary</div>'
                f'<div class="sum-box">{summary}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

        # Strengths
        strengths = ana.get("strengths", [])
        if strengths:
            s_html = '<div class="crd a-green"><div class="crd-title" style="color:#16A34A;">✅ Strengths</div>'
            for s in strengths:
                s_html += f'<div class="ab green">{s}</div>'
            s_html += '</div>'
            st.markdown(s_html, unsafe_allow_html=True)

        # Areas for improvement
        areas = ana.get("areas_for_improvement", [])
        if areas:
            a_html = '<div class="crd a-amber"><div class="crd-title" style="color:#D97706;">⚠️ Areas for Improvement</div>'
            for a in areas:
                a_html += f'<div class="ab amber">{a}</div>'
            a_html += '</div>'
            st.markdown(a_html, unsafe_allow_html=True)

        # Career Recommendations
        recs = ana.get("career_recommendations", [])
        if recs:
            r_html = '<div class="crd a-purple"><div class="crd-title" style="color:#7C3AED;">🎯 Career Recommendations</div>'
            for r in recs:
                r_html += f'<div class="ab purple">{r}</div>'
            r_html += '</div>'
            st.markdown(r_html, unsafe_allow_html=True)

        # Recommended Roles
        roles = ana.get("recommended_roles", [])
        if roles:
            rt_html = '<div class="crd"><div class="crd-title">🎯 Recommended Roles</div>'
            rt_html += "".join(f'<span class="rtag">{r}</span>' for r in roles)
            rt_html += '</div>'
            st.markdown(rt_html, unsafe_allow_html=True)
