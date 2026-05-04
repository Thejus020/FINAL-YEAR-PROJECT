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
            className="group flex items-center gap-2.5 text-gray-400 hover:text-white text-sm font-medium mb-6 md:mb-8 transition-colors w-fit"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900/50 border border-gray-800/80 group-hover:bg-gray-800 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            </div>
            Back
          </button>
          <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Create new pipeline</h1>

          <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Pipeline name *</label>
              <input
                type="text"
                placeholder="my-awesome-app"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-950/50 border border-gray-700/80 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">GitHub repository URL *</label>
              <input
                type="text"
                placeholder="https://github.com/username/repo"
                value={form.repo}
                onChange={(e) => setForm({ ...form, repo: e.target.value })}
                className="w-full bg-gray-950/50 border border-gray-700/80 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Branch</label>
              <input
                type="text"
                placeholder="main"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                className="w-full bg-gray-950/50 border border-gray-700/80 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition shadow-inner"
              />
            </div>

            <div className="pt-4 border-t border-gray-800/80">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-300">Environment Variables (Optional)</label>
                <button 
                  type="button"
                  onClick={addEnvVar}
                  className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition"
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
                      className="flex-1 bg-gray-950/50 border border-gray-700/80 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition"
                    />
                    <input
                      type="text"
                      placeholder="VALUE"
                      value={ev.value}
                      onChange={(e) => handleEnvChange(idx, "value", e.target.value)}
                      className="flex-1 bg-gray-950/50 border border-gray-700/80 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition"
                    />
                    {envVars.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeEnvVar(idx)}
                        className="text-gray-500 hover:text-red-400 transition p-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/40 rounded-xl px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 py-3 mt-4 rounded-xl font-semibold transition shadow-sm"
            >
              {loading ? "Creating..." : "Create pipeline →"}
            </button>
          </div>
        </div>

        {/* Right Side: YAML Preview */}
        <div className="flex-1 hidden lg:block sticky top-8 h-[calc(100vh-6rem)]">
          <div className="h-full bg-[#0d1117] border border-gray-800/80 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            {/* macOS-style chrome */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="w-3 h-3 bg-green-500 rounded-full" />
              </div>
              <span className="text-xs text-gray-500 font-mono">infraflow.yml preview</span>
            </div>
            
            <div className="flex-1 p-6 overflow-auto">
              <pre className="text-sm font-mono leading-relaxed">
                <code className="text-gray-300">
                  {generateYaml().split('\n').map((line, i) => (
                    <div key={i} className="table-row">
                      <span className="table-cell select-none text-right pr-4 text-gray-700">{i + 1}</span>
                      <span className="table-cell whitespace-pre">
                        {line.replace(/(name|on|push|branches|jobs|build|runs-on|steps|uses|env|run):/g, '<span class="text-violet-400">$1</span>:')
                             .replace(/(- )/g, '<span class="text-blue-400">$1</span>')}
                      </span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
            <div className="px-6 py-4 bg-[#161b22] border-t border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-500">Live preview of generated config</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
