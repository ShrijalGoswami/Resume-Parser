# 💼 Portfolio Showcase & Job Application Kit
## AI Resume Intelligence Platform

This document contains high-impact marketing, showcasing, and application assets designed for software engineering portfolios, LinkedIn posts, recruiter reviews, and internship/job resumes.

---

## 🛠️ 1. GitHub Repository Polish Checklist

Follow this checklist before sharing the project link with recruiters, hiring managers, or posting on social media:

### 📄 README Polish
- [ ] **Valid Image Paths:** Double-check that all links to screenshots (e.g., `docs/assets/dashboard_preview.png`) are correct and load properly on GitHub.
- [ ] **Badges:** Keep build, test, and license badges up-to-date.
- [ ] **Prerequisites:** Ensure the required Python version (3.10+) is listed clearly.

### 📸 Screenshots & Demo GIFs
- [ ] **High-Resolution Mockups:** Use clean browser screenshots without desktop icons or extra tabs.
- [ ] **Interactive Demo GIF:** Record a 15-second loop of the uploading and analyzing process.
  * *Recommended Tool:* Use **ScreenToGif** (Windows) or **Giphy Capture** (macOS).
  * *Settings:* Record at 1080p, scale down to 800px width, set frame rate to 15 FPS, and compress to keep it under 5MB.
  * *Placement:* Place the GIF directly under the **Problem Statement** or **Features** section in the `README.md`.

### 📄 License & Metadata
- [ ] **License File:** Ensure there is a dedicated `LICENSE` file in the root directory containing the MIT license terms.
- [ ] **Repository Description:** Write a short, keyword-dense description in the GitHub sidebar:
  > "A hybrid AI Resume Intelligence Platform built with FastAPI, Streamlit, and Groq Llama-3. Features high-fidelity PDF/DOCX parsing, deterministic ATS scoring, and LLM recruiter analysis."
- [ ] **Topics/Tags:** Add the following topics in the GitHub settings to increase organic visibility:
  `python`, `fastapi`, `streamlit`, `groq`, `llm`, `resume-parser`, `ats-scorer`, `nlp`, `pydantic-validation`, `pdf-parser`, `word-parser`.

### 🚀 Release Strategy
- [ ] **Tag Version:** Create a release tagged `v1.0.0` on GitHub.
- [ ] **Release Notes:** Write brief release notes detailing the initial rollout:
  * "Ingestion engine supporting high-fidelity PDF and Word documents."
  * "Deterministic 100-point ATS scorer based on skills, project detail, experience, and quantified metrics."
  * "AI explanation layer via Groq API with robust schema validation."
  * "Clean 3-column light-theme recruiter dashboard."

---

## 🔗 2. LinkedIn Project Descriptions

Use these copy-paste templates to share your project on LinkedIn. Select the version that best matches your target audience.

### 🔹 Version A: The 100-Word Pitch (High Engagement)
> I've just launched a new open-source project: **AI Resume Intelligence Platform**! 🚀
> 
> Recruiting teams are overwhelmed by resume volume, while typical AI screeners suffer from scoring hallucinations. I solved this by building a **hybrid parser-scoring architecture**. 
> 
> A fast Python NLP engine handles raw PDF/DOCX ingestion and computes a deterministic, rule-based 100-point ATS score (skills, projects, experiences, and metrics). Then, a Groq Llama-3 LLM generates contextual recruiter summaries and career recommendation paths.
> 
> Check out the live demo and codebase on GitHub: [Insert GitHub Link]
> 
> #Python #FastAPI #Streamlit #LLM #Groq #OpenSource #SoftwareEngineering

---

### 🔸 Version B: The 250-Word Deep Dive (Technical & Detailed)
> I'm excited to share my latest software engineering project: **AI Resume Intelligence Platform**, an enterprise-ready system designed to automate resume parsing, scoring, and analysis. 
> 
> **Why build it?** Traditional ATS systems filter resumes using brittle keyword matching, while fully LLM-based screeners are slow, expensive, and introduce scoring hallucinations.
> 
> **The Architecture:**
> I developed a **hybrid system** that separates deterministic mathematics from qualitative analysis:
> 1. **High-Fidelity Ingestion:** Custom PDF (`PyMuPDF`) and DOCX (`python-docx`) parsers extract raw text structures.
> 2. **Deterministic Rules Scorer:** A custom python NLP module evaluates resumes against a strict 100-point rubric, ensuring consistent scoring. It also computes a completeness/confidence metric.
> 3. **Generative LLM Layer:** Leverages Llama-3 via Groq API to construct natural language recruiter notes, candidate strengths, improvements, and interview readiness evaluations.
> 4. **Self-Healing Schema Enforcement:** Built with Pydantic v2 validation models, featuring automated retries for API, JSON parsing, and schema errors.
> 5. **Modern Dashboard:** A 3-column light-themed Streamlit UI inspired by Notion and Stripe for a clean recruiting workflow.
> 
> This project has helped me deepen my skills in API design (FastAPI), web interfaces (Streamlit), NLP heuristics, and orchestrating LLMs with strict output schemas.
> 
> 💻 View the code, setup guide, and documentation on GitHub: [Insert GitHub Link]
> 
> #Python #FastAPI #Streamlit #Groq #AI #SoftwareArchitect #NLP #Pydantic

---

### 💼 Version C: Recruiter-Friendly (Focus on Business Value)
> How can we make resume screening fast, fair, and highly structured?
> 
> I built the **AI Resume Intelligence Platform** to bridge the gap between deterministic document analysis and qualitative artificial intelligence.
> 
> **Key Business Outcomes & Highlights:**
> * **Zero Hallucination Scoring:** The overall ATS score (0-100) is calculated mathematically, ensuring candidate comparisons are fair and consistent.
> * **Recruiter-Grade AI Briefings:** Generates contextual candidate summaries, lists key strengths, flags career gaps, and estimates interview preparedness.
> * **Ingestion Integrity:** Handles complex PDF layout extractions and Word documents.
> * **High-Performant Stack:** Powered by FastAPI for async request routing, Streamlit for responsive interfaces, and Groq for sub-second LLM responses.
> 
> If you are building AI platforms or hiring software engineering talent, I'd love to connect!
> 
> 🔗 Code and documentation: [Insert GitHub Link]
> 
> #HRTech #Recruiting #AIScreening #FastAPI #PythonDeveloper #Streamlit

---

## 📄 3. Resume Project Entries

Add these bullet points to your resume. Choose the version that fits your space requirements.

### 🔹 Option 1: 3-Bullet Version (Compact & High-Impact)
* **AI Resume Intelligence Platform** | *Python, FastAPI, Streamlit, Groq Llama-3, Pydantic, NLP*
  * Architected and built a hybrid parser-scoring platform that parses PDF/DOCX resumes (via PyMuPDF and python-docx) and extracts structured profiles into validated Pydantic v2 schemas.
  * Designed a deterministic 100-point ATS scoring engine based on technical skills, project detail, experience, and quantified impact metrics, eliminating LLM scoring hallucinations.
  * Integrated Llama-3 via Groq API to provide qualitative candidate briefs and interview readiness assessments, featuring self-healing API retry pipelines.

---

### 🔸 Option 2: 4-Bullet Version (Comprehensive & Structural)
* **AI Resume Intelligence Platform** | *Python, FastAPI, Streamlit, Groq Llama-3, Pydantic, PyMuPDF, git*
  * Developed a dual-engine candidate ingestion platform, parsing documents into structured data using pattern-matching regex and layout-aware NLP heuristics.
  * Created a deterministic scoring rules engine evaluating resumes across a 100-point ATS rubric, achieving 100% scoring consistency across runs.
  * Built a resilient integration with the Groq LLM API, implementing custom retry-policies for API timeouts (3x), JSON parsing (3x), and Pydantic schema validation failures (2x).
  * Designed and deployed a responsive, 3-column Streamlit recruiter dashboard styled with Stripe/Notion light aesthetics, providing progress rings, timelines, and insight panels.

---

### 🚀 Option 3: ATS-Optimized Version (Rich in Keywords and Quantified Metrics)
* **AI Resume Intelligence Platform** (FastAPI, Streamlit, Groq LLM, Python, NLP)
  * Architected an asynchronous backend in **FastAPI** utilizing **Pydantic v2** models to validate and serialize complex candidate resume datasets extracted from multi-format files.
  * Engineered a deterministic **ATS Scoring Engine** in Python, increasing evaluation consistency by evaluating technical skills, project depth, experience tenure, and quantified impact metrics (%, $, x).
  * Deployed a **Groq Llama-3 LLM** explanation pipeline with self-healing json parsers, reducing prompt failure rates using custom retry strategies.
  * Designed a responsive **Streamlit** user interface featuring structured timeline components and SVGs, reducing applicant review latency for technical recruiters.

---

## 📹 4. Product Demo Video Script (2-Minute Walkthrough)

*This script is structured for a screen recording demo of the running application. Prepare the workspace with a sample resume (e.g., `datasets/Shrijal_Goswami_Resume.pdf`) before recording.*

| Time | Visual Screen Action | Audio / Voiceover Narration |
| :--- | :--- | :--- |
| **0:00 - 0:15** | Show browser window showing the running Streamlit dashboard. Point cursor to the main title "✦ AI Resume Intelligence Platform ✦" and the sidebar. | "Hi everyone! Today, I’m excited to show you the AI Resume Intelligence Platform—a recruiter-focused dashboard designed to parse, score, and analyze candidate resumes using a hybrid NLP and LLM architecture." |
| **0:15 - 0:35** | Move to the left sidebar. Click on "Upload Resume," select `Shrijal_Goswami_Resume.pdf`, and click the "Analyze Resume" button. Let the loading spinner spin. | "Recruiting teams handle thousands of applications. Typical screeners rely on keyword-matching or slow, expensive LLMs that hallucinate scores. This platform solves that by separating deterministic parsing from qualitative evaluation." |
| **0:35 - 0:55** | The dashboard loads. Point to the **Center Content Panel** showing the circular ATS score progress ring (`88/100`) and the individual breakdown metrics (Skills, Projects, Experience, Education, Impact). | "Our analysis is complete. In the center, we see our deterministic ATS Scorer. The candidate scored 88 out of 100. This score is calculated mathematically on a custom Python rules engine, analyzing technical skills, experience tenure, and quantified metrics like percentages or dollar values. This guarantees 100% scoring consistency." |
| **0:55 - 1:15** | Scroll down the center panel to show the extracted project titles and short bullet descriptions, noting the compact SaaS styling. | "Below the score, we can review the candidate's projects. The parser automatically extracts project descriptions and parses them for quantified metrics, contributing to the impact score." |
| **1:15 - 1:35** | Scroll down the **Left Panel** showing the parsed profile details: Name, Email, Phone, Categorized Skills, and Education. Hover over the categorized skills pills. | "On the left, we have the extracted candidate profile. Our layout-aware parsing engine isolates contact information, normalizes raw text tokens into standard skill categories, and lists academic history. It also calculates a confidence score based on the completeness of this metadata." |
| **1:35 - 1:55** | Move the cursor to the **Right Insights Panel**. Show the Groq-powered sections: Candidate Summary, Strengths, Areas for Improvement, Career Recommendations, and Interview Readiness. | "Finally, on the right, we leverage Llama-3 via Groq for what LLMs do best: qualitative review. It provides a recruiter brief, highlights key strengths, details areas to improve, suggests career advice, and evaluates interview preparedness, returning structured JSON validated by Pydantic." |
| **1:55 - 2:00** | Scroll back up to show the whole dashboard. | "The application is built with FastAPI, Streamlit, Groq, and PyMuPDF. All code is open-source. Thank you for watching!" |

---
