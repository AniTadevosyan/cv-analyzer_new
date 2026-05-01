import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BriefcaseBusiness, Calendar, Eye, Loader2, Users } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeader from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAnalyses } from "@/lib/api";

type Candidate = { file_name: string; score: number; decision?: string };
type Analysis = {
  id: number;
  job_title: string;
  created_at: string;
  approval_threshold: number;
  candidates: Candidate[];
};

const HistoryPage = () => {
  const [items, setItems] = useState<Analysis[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyses()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load history."))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const filtered = items.filter((item) => item.job_title.toLowerCase().includes(query.toLowerCase()));
    return filtered.reduce<Record<string, Analysis[]>>((acc, item) => {
      const key = item.job_title || "General Position";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [items, query]);

  const openAnalysis = (analysis: Analysis) => {
    localStorage.setItem("latest_analysis", JSON.stringify(analysis));
  };

  return (
    <Layout>
      <div className="container py-12 md:py-16">
        <SectionHeader
          badge="Analysis History"
          title="CV Analysis History"
          subtitle="Review previous analysis runs grouped by job title."
        />

        <div className="mx-auto mb-6 max-w-6xl rounded-2xl border border-border bg-card p-4 shadow-card">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by job title..." />
        </div>

        {loading && <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading history...</div>}
        {error && <div className="mx-auto max-w-6xl rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">{error}</div>}

        {!loading && !error && (
          <div className="mx-auto max-w-6xl space-y-8">
            {Object.keys(grouped).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
                No analysis history found.
              </div>
            ) : Object.entries(grouped).map(([jobTitle, analyses]) => (
              <section key={jobTitle} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary"><BriefcaseBusiness className="h-5 w-5" /></div>
                    <div>
                      <h2 className="text-xl font-bold">{jobTitle}</h2>
                      <p className="text-sm text-muted-foreground">{analyses.length} analysis run(s)</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {analyses.map((analysis) => {
                    const top = [...analysis.candidates].sort((a, b) => b.score - a.score)[0];
                    const interviewCount = analysis.candidates.filter((c) => (c.decision || (c.score >= analysis.approval_threshold ? "interview" : "reject")) === "interview").length;
                    return (
                      <div key={analysis.id} className="rounded-xl border border-border bg-background p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> {new Date(analysis.created_at).toLocaleString()}</div>
                          <span className="rounded-full bg-accent px-2 py-1 text-xs font-semibold">Threshold {analysis.approval_threshold}%</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div><p className="text-xs text-muted-foreground">Candidates</p><p className="text-lg font-bold">{analysis.candidates.length}</p></div>
                          <div><p className="text-xs text-muted-foreground">Interview</p><p className="text-lg font-bold">{interviewCount}</p></div>
                          <div><p className="text-xs text-muted-foreground">Top score</p><p className="text-lg font-bold">{top ? Math.round(top.score) : 0}%</p></div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <p className="truncate text-sm text-muted-foreground"><Users className="mr-1 inline h-4 w-4" /> Top: {top?.file_name || "N/A"}</p>
                          <Link to="/results" onClick={() => openAnalysis(analysis)}>
                            <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" /> Open</Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HistoryPage;
