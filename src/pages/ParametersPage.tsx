import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, SlidersHorizontal, Wand2 } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeader from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiDelete, apiGet, apiPost, authStore } from "@/lib/api";
import { Link } from "react-router-dom";

type Parameter = { id: number; name: string; description?: string; percentage: number };
type SuggestedParameter = { name: string; description: string; percentage: number };

const suggestedParameters: SuggestedParameter[] = [
  { name: "Job Description Match", description: "Checks how closely the CV matches the job description and responsibilities.", percentage: 35 },
  { name: "Technical Skills", description: "Checks preferred tools, technologies, and key hard skills.", percentage: 30 },
  { name: "Relevant Experience", description: "Checks years of experience and seniority match.", percentage: 20 },
  { name: "Education and Certifications", description: "Checks degrees, certificates, and education-related keywords.", percentage: 10 },
  { name: "Soft Skills", description: "Checks communication, teamwork, leadership, and collaboration signals.", percentage: 5 },
];

const ParametersPage = () => {
  const [items, setItems] = useState<Parameter[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [percentage, setPercentage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const loggedIn = Boolean(authStore.token);
  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.percentage || 0), 0), [items]);
  const remaining = Math.max(0, 100 - total);

  const load = async () => {
    const data = await apiGet("/api/parameters");
    setItems(data);
  };

  useEffect(() => { load().catch(() => setError("Could not load parameters.")); }, []);

  const addParameterFromValues = async (values: SuggestedParameter | { name: string; description: string; percentage: number }) => {
    setError("");
    if (!loggedIn) return setError("Please login first to add parameters.");
    if (!values.name.trim()) return setError("Parameter name is required.");
    if (Number.isNaN(values.percentage) || values.percentage <= 0) return setError("Percentage must be greater than 0.");
    if (total + values.percentage > 100) return setError(`The total percentage of all parameters cannot exceed 100%. Remaining: ${remaining}%.`);

    setLoading(true);
    try {
      const created = await apiPost("/api/parameters", values, true);
      setItems([...items, created]);
      setName(""); setDescription(""); setPercentage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add parameter.");
    } finally { setLoading(false); }
  };

  const addParameter = async (e: React.FormEvent) => {
    e.preventDefault();
    await addParameterFromValues({ name, description, percentage: Number(percentage) });
  };

  const addSuggested = async (item: SuggestedParameter) => {
    if (items.some((existing) => existing.name.toLowerCase() === item.name.toLowerCase())) {
      return setError("This suggested parameter is already added.");
    }
    await addParameterFromValues(item);
  };

  const remove = async (id: number) => {
    if (!loggedIn) return setError("Please login first to delete parameters.");
    await apiDelete(`/api/parameters/${id}`, true);
    setItems(items.filter((item) => item.id !== id));
  };

  return (
    <Layout>
      <div className="container py-12 md:py-16">
        <SectionHeader
          badge="Analysis Criteria"
          title="Custom Scoring Parameters"
          subtitle="Add scoring parameters used by backend logic. Total weight cannot exceed 100%."
        />

        <div className="mx-auto mb-8 max-w-6xl rounded-2xl border border-primary/20 bg-accent p-5">
          <div className="mb-4 flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /><h3 className="font-semibold">Suggested parameter list</h3></div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {suggestedParameters.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => addSuggested(item)}
                className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-card"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{item.percentage}%</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Tip: these five parameters equal 100%. Add them one by one, or create your own custom mix.</p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          <form onSubmit={addParameter} className="rounded-2xl border border-border bg-card p-6 shadow-card lg:col-span-1">
            <div className="mb-5 flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" /><h3 className="font-semibold">Add Parameter</h3></div>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Technical Skills" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should this parameter check?" className="min-h-[90px]" /></div>
              <div className="space-y-2"><Label>Percentage</Label><Input value={percentage} onChange={(e) => setPercentage(e.target.value)} type="number" min="0" max="100" placeholder="25" /></div>
              <div className="rounded-xl bg-secondary p-4 text-sm"><div className="flex justify-between"><span>Total used</span><b>{total}%</b></div><div className="flex justify-between"><span>Remaining</span><b>{remaining}%</b></div></div>
              {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              {!loggedIn && <Link to="/auth" className="block text-sm font-medium text-primary">Login / Sign up to save parameters</Link>}
              <Button disabled={loading || total >= 100} className="w-full gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Add Parameter</Button>
            </div>
          </form>

          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-card">
              <b className="text-foreground">Backend usage:</b> during analysis, saved parameters are loaded from the database and used as score weights. If the total is below 100%, the remaining percentage uses the default CV/job-description score.
            </div>
            {items.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">No parameters yet. Add your first one or use the suggested list.</div> : items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{item.name}</h3><p className="mt-1 text-sm text-muted-foreground">{item.description || "No description"}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{item.percentage}%</span><button onClick={() => remove(item.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default ParametersPage;
