import { AlertTriangle, CheckCircle2, Crown, Mail, Send, User, UserPlus, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { sendCandidateEmail } from "@/lib/api";

export type Recommendation = "Strong Match" | "Good Match" | "Moderate Match" | "Low Match" | string;

interface CandidateCardProps {
  candidateId?: number;
  rank: number;
  name: string;
  score: number;
  strengths: string[];
  missing: string[];
  recommendation: Recommendation;
  decision?: string;
  jobTitle?: string;
  threshold?: number;
  shortlisted?: boolean;
  onToggleShortlist?: () => void;
  delay?: number;
}

const getRecommendationStyle = (recommendation: string) => {
  if (recommendation === "Strong Match") return "bg-success/10 text-success border-success/20";
  if (recommendation === "Good Match") return "bg-primary/10 text-primary border-primary/20";
  if (recommendation === "Moderate Match") return "bg-warning/10 text-warning border-warning/20";
  return "bg-muted text-muted-foreground border-border";
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return "bg-primary text-primary-foreground";
  if (rank === 2) return "bg-accent text-primary";
  if (rank === 3) return "bg-secondary text-secondary-foreground";
  return "bg-muted text-muted-foreground";
};

const stripFileExtension = (fileName: string) => fileName.replace(/\.[^/.]+$/, "");

const CandidateCard = ({
  candidateId,
  rank,
  name,
  score,
  strengths,
  missing,
  recommendation,
  decision,
  threshold = 70,
  shortlisted = false,
  onToggleShortlist,
  delay = 0,
}: CandidateCardProps) => {
  const candidateName = stripFileExtension(name);
  const passesThreshold = decision ? decision === "interview" : score >= threshold;
  const statusLabel = passesThreshold ? "Interview stage" : "Not selected";

  const handleSendEmail = async () => {
    if (!candidateId) {
      alert("Candidate ID is missing. Please run a new analysis and try again.");
      return;
    }

    const recipientEmail = window.prompt(`Enter email address for ${candidateName}`);
    if (!recipientEmail) return;

    try {
      await sendCandidateEmail(candidateId, recipientEmail.trim());
      alert(`Email sent to ${recipientEmail}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Email could not be sent.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.35 }}
      className={`group rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated ${shortlisted ? "border-primary/50 ring-2 ring-primary/10" : "border-border"}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold ${getRankStyle(rank)}`}>
            {rank === 1 ? <Crown className="h-5 w-5" /> : `#${rank}`}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                <User className="h-4 w-4" />
              </div>
              <h3 className="truncate font-semibold" title={name}>{candidateName}</h3>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRecommendationStyle(recommendation)}`}>
                {recommendation}
              </span>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${passesThreshold ? "border-success/20 bg-success/10 text-success" : "border-muted bg-muted text-muted-foreground"}`}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold text-primary">{score}%</div>
          <div className="text-xs text-muted-foreground">match</div>
        </div>
      </div>

      <Progress value={score} className="mb-5 h-2" />

      <div className="mb-5 grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-3">
        <div><p className="text-xs text-muted-foreground">Matched skills</p><p className="text-lg font-semibold">{strengths.length}</p></div>
        <div><p className="text-xs text-muted-foreground">Skill gaps</p><p className="text-lg font-semibold">{missing.length}</p></div>
        <div><p className="text-xs text-muted-foreground">Threshold</p><p className="text-sm font-semibold">{threshold}%</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Strengths</div>
          <div className="flex flex-wrap gap-1.5">
            {strengths.length ? strengths.slice(0, 8).map((s) => <span key={s} className="rounded-md bg-success/10 px-2 py-1 text-xs text-success">{s}</span>) : <span className="text-xs text-muted-foreground">No matched skills found</span>}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> Development areas</div>
          <div className="flex flex-wrap gap-1.5">
            {missing.length ? missing.slice(0, 8).map((m) => <span key={m} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{m}</span>) : <span className="text-xs text-muted-foreground">No major gaps</span>}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
        <Button type="button" className="flex-1" variant={shortlisted ? "default" : "outline"} onClick={onToggleShortlist}>
          {shortlisted ? <UserCheck className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
          {shortlisted ? "Shortlisted" : "Shortlist"}
        </Button>
        <Button type="button" className="flex-1" variant={passesThreshold ? "default" : "secondary"} onClick={handleSendEmail}>
          {passesThreshold ? <Mail className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
          {passesThreshold ? "Send Interview Invite" : "Send Application Update"}
        </Button>
      </div>
    </motion.div>
  );
};

export default CandidateCard;
