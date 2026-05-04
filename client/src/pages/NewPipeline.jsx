import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import API from "../config";
import { useAuth } from "../context/AuthContext";

export default function NewPipeline() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", repo: "", branch: "main" });
  const [envVars, setEnvVars] = useState([{ key: "", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addEnvVar = () => setEnvVars([...envVars, { key: "", value: "" }]);
  const removeEnvVar = (index) => {
    const list = [...envVars];
    list.splice(index, 1);
    setEnvVars(list);
  };
  const handleEnvChange = (index, field, val) => {
    const list = [...envVars];
    list[index][field] = val;
    setEnvVars(list);
  };

  const handleSubmit = async () => {
    setError("");
    const { name, repo, branch } = form;
    if (!name.trim() || !repo.trim()) {
      setError("Pipeline name and repository URL are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/pipelines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          ...form, 
          envVars: envVars.filter(ev => ev.key.trim() !== "") 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create pipeline");
      navigate(`/pipeline/${data._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate YAML string based on form state
  const generateYaml = () => {
    let yaml = `name: ${form.name || "pipeline"}
on:
  push:
    branches:
      - ${form.branch || "main"}

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3`;
      
    if (envVars.some(ev => ev.key.trim() !== "")) {
      yaml += `\n      - name: Set environment variables\n        env:`;
      envVars.forEach(ev => {
        if (ev.key.trim() !== "") {
          yaml += `\n          ${ev.key}: ${ev.value || "''"}`;
        }
      });
    }

    yaml += `\n      - name: Install Dependencies
        run: npm ci
      - name: Build
        run: npm run build`;
        
    return yaml;
  };

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-8 pb-12 h-full min-h-[calc(100vh-8rem)]">
        {/* Left Side: Form */}
        <div className="flex-1 max-w-2xl min-w-0">
          <button 
          onClick={() => navigate(-1)} 
          className="group flex items-center gap-2.5 text-slate-400 hover:text-slate-100 text-sm font-bold mb-6 md:mb-8 transition-colors w-fit"
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </div>
          Back
        </button>
        <h1 className="text-3xl font-black mb-8 bg-gradient-to-r from-cyan-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm">Create new pipeline</h1>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-8 space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Pipeline name *</label>
            <input
              type="text"
              placeholder="my-awesome-app"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#040814]/50 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition shadow-inner"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">GitHub repository URL *</label>
            <input
              type="text"
              placeholder="https://github.com/username/repo"
              value={form.repo}
              onChange={(e) => setForm({ ...form, repo: e.target.value })}
              className="w-full bg-[#040814]/50 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition shadow-inner"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Branch</label>
            <input
              type="text"
              placeholder="main"
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
              className="w-full bg-[#040814]/50 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition shadow-inner"
            />
          </div>

          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-bold text-slate-300">Environment Variables (Optional)</label>
              <button 
                type="button"
                onClick={addEnvVar}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
              >
                + Add Variable
              </button>
            </div>
            
            <div className="space-y-3">
              {envVars.map((ev, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="KEY (e.g. VITE_API_URL)"
                    value={ev.key}
                    onChange={(e) => handleEnvChange(idx, "key", e.target.value)}
                    className="flex-1 bg-[#040814]/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                  <input
                    type="text"
                    placeholder="VALUE"
                    value={ev.value}
                    onChange={(e) => handleEnvChange(idx, "value", e.target.value)}
                    className="flex-1 bg-[#040814]/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                  {envVars.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => removeEnvVar(idx)}
                      className="text-slate-500 hover:text-rose-400 transition p-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
              <p className="text-[11px] text-slate-500 mt-2 font-medium">
                These will be injected into the build process (e.g. <code>npm run build</code>).
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-rose-900/30 border border-rose-700/40 rounded-xl px-4 py-3 text-rose-300 text-sm font-bold">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 disabled:opacity-50 py-3.5 mt-4 rounded-xl font-black text-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
          >
            {loading ? "Creating..." : "Create pipeline →"}
          </button>
        </div>
      </div>

      {/* Right Side: YAML Preview */}
      <div className="flex-1 hidden lg:block sticky top-8 h-[calc(100vh-6rem)]">
        <div className="h-full bg-[#0a0f1c]/90 border border-white/10 rounded-[2rem] overflow-hidden flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.6)] backdrop-blur-xl">
          {/* macOS-style chrome */}
          <div className="flex items-center justify-between px-5 py-4 bg-white/5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-rose-500 rounded-full" />
              <span className="w-3 h-3 bg-amber-500 rounded-full" />
              <span className="w-3 h-3 bg-emerald-500 rounded-full" />
            </div>
            <span className="text-xs text-slate-400 font-mono font-bold tracking-wider">infraflow.yml preview</span>
          </div>
          
          <div className="flex-1 p-6 overflow-auto custom-scrollbar">
            <pre className="text-sm font-mono leading-relaxed">
              <code className="text-slate-300">
                {generateYaml().split('\n').map((line, i) => (
                  <div key={i} className="table-row hover:bg-white/5 transition-colors">
                    <span className="table-cell select-none text-right pr-4 text-slate-600 border-r border-white/5 mr-4">{i + 1}</span>
                    <span 
                      className="table-cell whitespace-pre pl-4"
                      dangerouslySetInnerHTML={{
                        __html: line.replace(/(name|on|push|branches|jobs|build|runs-on|steps|uses|env|run):/g, '<span class="text-cyan-400 font-bold">$1</span>:')
                                    .replace(/(- )/g, '<span class="text-indigo-400 font-bold">$1</span>')
                      }}
                    />
                  </div>
                ))}
              </code>
            </pre>
          </div>
          <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Live preview of generated config</span>
          </div>
        </div>
      </div>
      </div>
    </Layout>
  );
}
