import { useState } from "react";
import { Upload, FileText, X, Plus, Sparkles, Lightbulb, BriefcaseBusiness } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import SectionHeader from "@/components/SectionHeader";
import { Link, useNavigate } from "react-router-dom";
import { analyzeCVs, authStore } from "@/lib/api";

const AnalyzePage = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [approvalThreshold, setApprovalThreshold] = useState("70");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const next = [...files];
    Array.from(selected).forEach((file) => {
      if (!next.some((existing) => existing.name === file.name)) next.push(file);
    });
    setFiles(next);
  };

  const removeFile = (name: string) => setFiles(files.filter((f) => f.name !== name));

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const submit = async () => {
    setError("");
    const threshold = Number(approvalThreshold);

    if (!authStore.token) return setError("Please login first before analyzing CVs.");
    if (files.length === 0) return setError("Please upload at least one CV.");
    if (!jobTitle.trim()) return setError("Job title is required.");
    if (!jobDesc.trim()) return setError("Job description is required.");
    if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
      return setError("Approval threshold must be between 0 and 100%.");
    }

    const form = new FormData();
    form.append("job_title", jobTitle);
    form.append("job_description", jobDesc);
    form.append("approval_threshold", String(threshold));
    form.append("preferred_skills", skills.join(","));
    files.forEach((file) => form.append("files", file));

    setLoading(true);
    try {
      const data = await analyzeCVs(form);
      localStorage.setItem("latest_analysis", JSON.stringify(data));
      navigate("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container py-12 md:py-16">
        <SectionHeader
          badge="Resume Analysis"
          title="Upload & Analyze CVs"
          subtitle="Upload resumes, define job requirements, set an approval threshold, and get ranked candidates."
        />

        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="mb-3 text-sm font-semibold">Upload Resumes</h3>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); addFiles(e.dataTransfer.files); }}
                className={`block cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${dragActive ? "border-primary bg-accent" : "border-border hover:border-primary/50 hover:bg-accent/50"}`}
              >
                <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Drag & drop your resumes here</p>
                <p className="mt-1 text-sm text-muted-foreground">or click to browse files (PDF, DOCX, TXT)</p>
                <input type="file" multiple accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => addFiles(e.target.files)} />
              </label>
            </motion.div>

            {files.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h3 className="mb-3 text-sm font-semibold">Uploaded Files ({files.length})</h3>
                <div className="space-y-2">
                  {files.map((f) => (
                    <div key={f.name} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-card">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">{f.name}</span>
                      </div>
                      <button onClick={() => removeFile(f.name)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h3 className="mb-3 text-sm font-semibold">Job Title</h3>
              <Input
                placeholder="e.g. Backend Developer, Business Analyst"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="bg-card"
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Approval Threshold</h3>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{approvalThreshold || 0}%</span>
              </div>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="70"
                value={approvalThreshold}
                onChange={(e) => setApprovalThreshold(e.target.value)}
                className="bg-card"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Candidates with score equal to or above this value will get an interview invitation action.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h3 className="mb-3 text-sm font-semibold">Job Description</h3>
              <Textarea
                placeholder="Paste the job description here..."
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
                className="min-h-[160px] resize-none bg-card"
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <h3 className="mb-3 text-sm font-semibold">Preferred Skills (optional)</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. React, Python, Leadership"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  className="bg-card"
                />
                <Button variant="outline" onClick={addSkill} className="shrink-0"><Plus className="h-4 w-4" /></Button>
              </div>
              {skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                      {s}<button onClick={() => setSkills(skills.filter((x) => x !== s))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-3 font-semibold">Analysis Summary</h3>
              <div className="grid gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-lg bg-secondary p-3"><p className="text-muted-foreground">Job Title</p><p className="truncate text-lg font-bold">{jobTitle || "Missing"}</p></div>
                <div className="rounded-lg bg-secondary p-3"><p className="text-muted-foreground">Resumes</p><p className="text-lg font-bold">{files.length}</p></div>
                <div className="rounded-lg bg-secondary p-3"><p className="text-muted-foreground">Threshold</p><p className="text-lg font-bold">{approvalThreshold || 0}%</p></div>
                <div className="rounded-lg bg-secondary p-3"><p className="text-muted-foreground">Custom Skills</p><p className="text-lg font-bold">{skills.length}</p></div>
              </div>
              {error && <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error} {!authStore.token && <Link to="/auth" className="ml-1 underline">Login here</Link>}</div>}
              <Button size="lg" className="mt-5 w-full gradient-primary text-primary-foreground shadow-glow hover:opacity-90" onClick={submit} disabled={loading}>
                <Sparkles className="mr-2 h-4 w-4" />{loading ? "Analyzing..." : "Analyze Resumes"}
              </Button>
            </motion.div>
          </div>

          <motion.aside initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3 flex items-center gap-2 text-primary"><Lightbulb className="h-5 w-5" /><h3 className="font-semibold text-foreground">Tips</h3></div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>Use Job Title to group analysis history by open position.</li>
                <li>Set the threshold based on how strict the screening should be.</li>
                <li>Custom parameters from the Parameters page are used by backend scoring.</li>
                <li>Supported formats: PDF, DOCX, TXT.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-primary/20 bg-accent p-5">
              <div className="mb-2 flex items-center gap-2 text-primary"><BriefcaseBusiness className="h-5 w-5" /><h3 className="font-semibold text-foreground">Workflow</h3></div>
              <p className="text-sm text-muted-foreground">After analysis, candidates above threshold can be invited to interview. Others get a ready rejection text.</p>
            </div>
          </motion.aside>
        </div>
      </div>
    </Layout>
  );
};
export default AnalyzePage;
