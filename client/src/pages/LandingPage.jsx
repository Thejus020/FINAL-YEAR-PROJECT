import { useNavigate } from "react-router-dom";
import API from "../config";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#040814] text-slate-100 flex flex-col font-['Outfit'] selection:bg-cyan-500/30 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent leading-none">
            InfraFlow
          </span>
        </div>
        <a
          href={`${API}/auth/github`}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] text-white"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Sign in with GitHub
        </a>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative z-10">
        <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-5 py-2 text-sm font-bold text-cyan-300 mb-8 shadow-sm">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          Automated CI/CD pipelines, zero config
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight drop-shadow-sm">
          Push code.{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            Ship automatically.
          </span>
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mb-12 font-medium">
          InfraFlow creates and runs your entire deployment pipeline automatically — build, test, containerize, and deploy without touching a single config file.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-stretch justify-center">
          <a
            href={`${API}/auth/github`}
            className="flex items-center justify-center bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-black px-8 py-4 rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] leading-none h-[56px]"
          >
            Get started free →
          </a>
          <a
            href="https://github.com"
            className="flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold px-8 py-4 rounded-xl text-lg transition-all leading-none h-[56px]"
          >
            View on GitHub
          </a>
        </div>

        {/* Feature cards */}
        <div className="grid sm:grid-cols-3 gap-6 mt-24 max-w-5xl w-full">
          {[
            { icon: "⚡", title: "Auto-detect", desc: "Detects your project type and builds the pipeline automatically." },
            { icon: "🐳", title: "Dockerized", desc: "Every build is containerized and isolated — production-ready from day one." },
            { icon: "📡", title: "Real-time logs", desc: "Watch your build stream live, line by line, in a terminal view." },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 text-left shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:bg-white/10 transition-colors">
              <div className="text-4xl mb-4 drop-shadow-md">{f.icon}</div>
              <h3 className="font-black text-xl mb-2 text-slate-100">{f.title}</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-8 text-slate-500 text-sm border-t border-white/5 font-medium bg-black/20">
        Built with ❤️ — InfraFlow © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
