import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Award, BarChart3, CheckCircle2, Download, Filter, Search, Sparkles, Users, XCircle, BriefcaseBusiness } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeader from "@/components/SectionHeader";
import CandidateCard from "@/components/CandidateCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";

type Candidate = {
  id?: number;
  file_name: string;
  rank?: number;
  score: number;
  recommendation: string;
  decision?: string;
  matched_skills: string[];
  missing_skills: string[];
};

type Analysis = {
  id?: number;
  job_title?: string;
  approval_threshold?: number;
  applied_parameters?: { name: string; percentage: number }[];
  candidates: Candidate[];
};

type SortOption = "score-desc" | "score-asc" | "name";
type FilterOption = "all" | "strong" | "good" | "review" | "interview" | "not-selected" | "shortlisted";

const getAnalysis = (): Analysis | null => {
  const raw = localStorage.getItem("latest_analysis");
  return raw ? JSON.parse(raw) : null;
};

const getStoredShortlist = () => {
  const raw = localStorage.getItem("shortlisted_candidates");
  return raw ? JSON.parse(raw) : [];
};

const ResultsPage = () => {
  const analysis = getAnalysis();
  const candidates: Candidate[] = analysis?.candidates || [];
  const jobTitle = analysis?.job_title || "General Position";
  const threshold = analysis?.approval_threshold || 70;
  const appliedParameters = analysis?.applied_parameters || [];
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("score-desc");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [shortlisted, setShortlisted] = useState<string[]>(getStoredShortlist());

  const rankedCandidates = useMemo(() => [...candidates].sort((a, b) => b.score - a.score), [candidates]);

  const filteredCandidates = useMemo(() => {
    let list = [...rankedCandidates];
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery) {
      list = list.filter((candidate) => {
        const searchable = [
          candidate.file_name,
          candidate.recommendation,
          candidate.decision || "",
          ...candidate.matched_skills,
          ...candidate.missing_skills,
        ].join(" ").toLowerCase();
        return searchable.includes(normalizedQuery);
      });
    }

    if (filterBy === "strong") list = list.filter((candidate) => candidate.score >= 80);
    if (filterBy === "good") list = list.filter((candidate) => candidate.score >= 60 && candidate.score < 80);
    if (filterBy === "review") list = list.filter((candidate) => candidate.score < 60);
    if (filterBy === "interview") list = list.filter((candidate) => (candidate.decision || (candidate.score >= threshold ? "interview" : "reject")) === "interview");
    if (filterBy === "not-selected") list = list.filter((candidate) => (candidate.decision || (candidate.score >= threshold ? "interview" : "reject")) === "reject");
    if (filterBy === "shortlisted") list = list.filter((candidate) => shortlisted.includes(candidate.file_name));

    if (sortBy === "score-asc") list.sort((a, b) => a.score - b.score);
    if (sortBy === "score-desc") list.sort((a, b) => b.score - a.score);
    if (sortBy === "name") list.sort((a, b) => a.file_name.localeCompare(b.file_name));

    return list;
  }, [rankedCandidates, query, sortBy, filterBy, shortlisted, threshold]);

  const overallScore = candidates.length
    ? Math.round(candidates.reduce((sum, candidate) => sum + candidate.score, 0) / candidates.length)
    : 0;
  const top = rankedCandidates[0];
  const interviewCount = candidates.filter((candidate) => (candidate.decision || (candidate.score >= threshold ? "interview" : "reject")) === "interview").length;
  const notSelectedCount = candidates.filter((candidate) => (candidate.decision || (candidate.score >= threshold ? "interview" : "reject")) === "reject").length;
  const matchedSkills = [...new Set(candidates.flatMap((candidate) => candidate.matched_skills))].slice(0, 12);
  const missingSkills = [...new Set(candidates.flatMap((candidate) => candidate.missing_skills))].slice(0, 12);

  const toggleShortlist = (fileName: string) => {
    const next = shortlisted.includes(fileName)
      ? shortlisted.filter((item) => item !== fileName)
      : [...shortlisted, fileName];
    setShortlisted(next);
    localStorage.setItem("shortlisted_candidates", JSON.stringify(next));
  };

  const exportShortlist = () => {
    const selected = rankedCandidates
      .filter((candidate) => shortlisted.includes(candidate.file_name))
      .map((candidate, index) => `${index + 1}. ${candidate.file_name} - ${Math.round(candidate.score)}% - ${candidate.recommendation}`)
      .join("\n");

    const blob = new Blob([selected || "No shortlisted candidates yet."], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shortlisted-candidates.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!analysis) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <SectionHeader badge="No Results" title="No analysis yet" subtitle="Upload CVs and run an analysis first." />
          <Link to="/analyze"><Button className="gradient-primary text-primary-foreground">Start Analysis</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12 md:py-16">
        <SectionHeader
          badge="Analysis Complete"
          title="Candidate Ranking Dashboard"
          subtitle="Review candidates, filter the list, and send interview invitations or application updates."
        />

        <div className="mx-auto mb-6 max-w-6xl rounded-2xl border border-primary/20 bg-accent p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary"><BriefcaseBusiness className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Job Title</p>
                <h2 className="text-xl font-bold">{jobTitle}</h2>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Approval threshold: <b className="text-foreground">{threshold}%</b></div>
          </div>
        </div>

        <div className="mx-auto mb-8 grid max-w-6xl gap-4 md:grid-cols-4">
          {[
            { label: "Candidates", value: candidates.length, icon: <Users className="h-5 w-5" /> },
            { label: "Average score", value: `${overallScore}%`, icon: <BarChart3 className="h-5 w-5" /> },
            { label: "Interview", value: interviewCount, icon: <Award className="h-5 w-5" /> },
            { label: "Not selected", value: notSelectedCount, icon: <XCircle className="h-5 w-5" /> },
          ].map((item, index) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">{item.icon}</div>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold">{item.value}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mb-8 max-w-6xl rounded-2xl border border-primary/20 bg-accent p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary"><Sparkles className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold">Suggested action</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {top ? `Start with ${top.file_name}. This candidate has the highest score (${Math.round(top.score)}%) and is currently in the ${top.score >= threshold ? "interview stage" : "not selected group"}.` : "No candidate data found."}
                </p>
                {appliedParameters.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Parameters used: {appliedParameters.map((p) => `${p.name} ${p.percentage}%`).join(", ")}
                  </p>
                )}
              </div>
            </div>
            <Button type="button" variant="outline" onClick={exportShortlist}><Download className="mr-2 h-4 w-4" /> Export shortlist</Button>
          </div>
        </motion.div>

        <div className="mx-auto mb-8 grid max-w-6xl gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /><h3 className="font-semibold">Top matched skills</h3></div>
            <div className="flex flex-wrap gap-2">{matchedSkills.length ? matchedSkills.map((skill) => <span key={skill} className="rounded-full bg-success/10 px-3 py-1 text-sm text-success">{skill}</span>) : <span className="text-sm text-muted-foreground">No matched skills found.</span>}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2"><XCircle className="h-5 w-5 text-muted-foreground" /><h3 className="font-semibold">Common development areas</h3></div>
            <div className="flex flex-wrap gap-2">{missingSkills.length ? missingSkills.map((skill) => <span key={skill} className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">{skill}</span>) : <span className="text-sm text-muted-foreground">No major gaps.</span>}</div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="grid gap-3 md:grid-cols-[1fr_190px_190px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by candidate, skill, or recommendation" className="pl-9" />
              </div>
              <Select value={filterBy} onValueChange={(value) => setFilterBy(value as FilterOption)}>
                <SelectTrigger><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Filter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All candidates</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="not-selected">Not selected</SelectItem>
                  <SelectItem value="strong">Strong matches</SelectItem>
                  <SelectItem value="good">Good matches</SelectItem>
                  <SelectItem value="review">Needs review</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="score-desc">Highest score</SelectItem>
                  <SelectItem value="score-asc">Lowest score</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Candidate rankings</h3>
            <p className="text-sm text-muted-foreground">Showing {filteredCandidates.length} of {candidates.length}</p>
          </div>

          {filteredCandidates.length ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {filteredCandidates.map((candidate, index) => (
                <CandidateCard
                  key={candidate.file_name}
                  candidateId={candidate.id}
                  rank={rankedCandidates.findIndex((item) => item.file_name === candidate.file_name) + 1}
                  name={candidate.file_name}
                  score={Math.round(candidate.score)}
                  strengths={candidate.matched_skills}
                  missing={candidate.missing_skills}
                  recommendation={candidate.recommendation}
                  decision={candidate.decision}
                  jobTitle={jobTitle}
                  threshold={threshold}
                  shortlisted={shortlisted.includes(candidate.file_name)}
                  onToggleShortlist={() => toggleShortlist(candidate.file_name)}
                  delay={index * 0.04}
                />
              ))}
            </div>
          ) : <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">No candidates match the selected filters.</div>}
        </div>
      </div>
    </Layout>
  );
};

export default ResultsPage;
