import { useNavigate } from "react-router-dom";
import API from "../config";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            InfraFlow
          </span>
        </div>
        <a
          href={`${API}/auth/github`}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Sign in with GitHub
        </a>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-violet-950/50 border border-violet-700/40 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-8">
          <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
          Automated CI/CD pipelines, zero config
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
          Push code.{" "}
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Ship automatically.
          </span>
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mb-12">
          InfraFlow creates and runs your entire deployment pipeline automatically — build, test, containerize, and deploy without touching a single config file.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href={`${API}/auth/github`}
            className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition"
          >
            Get started free →
          </a>
          <a
            href="https://github.com"
            className="border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold px-8 py-4 rounded-xl text-lg transition"
          >
            View on GitHub
          </a>
        </div>

        {/* Feature cards */}
        <div className="grid sm:grid-cols-3 gap-6 mt-24 max-w-4xl w-full">
          {[
            { icon: "⚡", title: "Auto-detect", desc: "Detects your project type and builds the pipeline automatically." },
            { icon: "🐳", title: "Dockerized", desc: "Every build is containerized and isolated — production-ready from day one." },
            { icon: "📡", title: "Real-time logs", desc: "Watch your build stream live, line by line, in a terminal view." },
          ].map((f) => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-left">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-gray-600 text-sm border-t border-gray-800">
        Built with ❤️ — InfraFlow © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
