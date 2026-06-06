import { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/Button";
import { 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Eye, 
  User, 
  Sliders, 
  Layers,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

interface Submission {
  id: string;
  name: string;
  author: string;
  supplier: string;
  archetype: string;
  submittedAt: string;
  variablesCount: number;
  rulesCount: number;
  testStatus: "passed" | "failed";
  variables: string[];
  rules: string[];
}

export function AdminModerationPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([
    {
      id: "sub-1",
      name: "Modern Double Swing Gate",
      author: "John Doe (Contractor #402)",
      supplier: "Discount Fencing",
      archetype: "Swing Gate (QS_GATE)",
      submittedAt: "2 days ago",
      variablesCount: 4,
      rulesCount: 5,
      testStatus: "passed",
      variables: ["gate_width_mm", "latch_gap_mm", "hinge_type", "latch_type"],
      rules: [
        "gate_opening = gate_width_mm - 2*50",
        "hinge_gap = 12",
        "clear_opening = gate_opening - hinge_gap - 10"
      ]
    },
    {
      id: "sub-2",
      name: "Treated Pine Timber Infill",
      author: "Jane Smith (Amazing Fences)",
      supplier: "Amazing Fencing",
      archetype: "Horizontal Slat (QSHS)",
      submittedAt: "5 days ago",
      variablesCount: 3,
      rulesCount: 3,
      testStatus: "passed",
      variables: ["timber_width_mm", "post_type", "rail_gap_mm"],
      rules: [
        "timber_count = ceil(run_length / (timber_width_mm + rail_gap_mm))",
        "total_cost = timber_count * 4.50"
      ]
    }
  ]);

  const [auditingItem, setAuditingItem] = useState<Submission | null>(null);

  const handleApprove = (sub: Submission) => {
    toast.loading(`Promoting ${sub.name} to National Network...`, { id: "mod" });
    
    setTimeout(() => {
      setSubmissions(prev => prev.filter(item => item.id !== sub.id));
      if (auditingItem?.id === sub.id) setAuditingItem(null);
      toast.success(`Successfully approved and published ${sub.name}!`, { id: "mod" });
    }, 1000);
  };

  const handleReject = (sub: Submission) => {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return;
    
    toast.loading(`Rejecting submission...`, { id: "mod" });
    setTimeout(() => {
      setSubmissions(prev => prev.filter(item => item.id !== sub.id));
      if (auditingItem?.id === sub.id) setAuditingItem(null);
      toast.error(`Rejected submission: ${sub.name}. Contractor will be notified.`, { id: "mod" });
    }, 800);
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-brand-bg text-brand-text p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
          
          {/* Header */}
          <div className="border-b border-brand-border/60 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black flex items-center gap-3">
                <ShieldAlert className="text-brand-primary animate-pulse" size={32} />
                Calculator Moderation Queue
              </h1>
              <p className="text-brand-muted text-sm mt-1">
                Audit community contributions, inspect custom math.js rulesets, verify unit test coverage, and promote to the National Calculator Network.
              </p>
            </div>
            
            <div className="text-xs bg-brand-card p-3 rounded-xl border border-brand-border/60 flex items-center gap-2 shrink-0">
              <ShieldCheck className="text-brand-accent animate-pulse" size={16} />
              <span>Security Access: Platform Admin</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Submissions Queue Table */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-brand-border/40 flex items-center justify-between">
                  <h3 className="font-bold text-sm">Review Queue</h3>
                  <span className="text-xs px-2.5 py-1 rounded bg-brand-primary/15 text-brand-primary border border-brand-primary/20 font-bold">
                    {submissions.length} Pending Review
                  </span>
                </div>
                
                {submissions.length === 0 ? (
                  <div className="text-center py-16 text-brand-muted text-sm">
                    No submissions currently awaiting moderation. Queue is clear!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-brand-bg border-b border-brand-border/60 text-[10px] font-black uppercase text-brand-muted">
                          <th className="p-4">Calculator</th>
                          <th className="p-4">Author</th>
                          <th className="p-4">Archetype</th>
                          <th className="p-4">Regression</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border/40">
                        {submissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-brand-bg/5 transition-colors">
                            <td className="p-4">
                              <span className="font-bold text-sm text-brand-text block">{sub.name}</span>
                              <span className="text-[10px] text-brand-muted mt-0.5 block">Supplier: {sub.supplier} · {sub.submittedAt}</span>
                            </td>
                            <td className="p-4 font-semibold text-brand-muted">
                              <span className="flex items-center gap-1">
                                <User size={12} />
                                {sub.author.split(" (")[0]}
                              </span>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded font-bold uppercase text-[9px]">
                                {sub.archetype.split(" (")[0]}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-brand-success font-bold flex items-center gap-1">
                                <CheckCircle size={12} />
                                Passed
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setAuditingItem(sub)}
                                  className="p-1.5 bg-brand-bg border border-brand-border rounded-lg text-brand-text hover:text-brand-primary"
                                  title="Audit Formulas"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => handleReject(sub)}
                                  className="p-1.5 bg-brand-bg border border-brand-border rounded-lg text-brand-danger hover:bg-brand-danger/10"
                                  title="Reject Submission"
                                >
                                  <XCircle size={14} />
                                </button>
                                <button
                                  onClick={() => handleApprove(sub)}
                                  className="p-1.5 bg-brand-primary rounded-lg text-white hover:opacity-90"
                                  title="Approve & Promote"
                                >
                                  <CheckCircle size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Inspector Panel */}
            <div className="bg-brand-card border border-brand-border rounded-3xl p-6 h-fit space-y-6">
              {auditingItem ? (
                <div className="space-y-6 animate-fade-in">
                  <div className="border-b border-brand-border/40 pb-4">
                    <span className="text-[9px] px-2 py-0.5 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded font-black uppercase tracking-wider">
                      Audit Inspector
                    </span>
                    <h3 className="text-lg font-black text-brand-text mt-2">{auditingItem.name}</h3>
                    <p className="text-xs text-brand-muted mt-1">Submitted by {auditingItem.author}</p>
                  </div>

                  {/* Variables */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted flex items-center gap-1">
                      <Sliders size={12} />
                      Custom Variables ({auditingItem.variables.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {auditingItem.variables.map(v => (
                        <span key={v} className="px-2 py-0.5 bg-brand-bg border border-brand-border/80 text-[10px] font-mono rounded text-brand-accent">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Rules */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted flex items-center gap-1">
                      <Layers size={12} />
                      Derivation Formulas ({auditingItem.rules.length})
                    </span>
                    <div className="space-y-1.5 font-mono text-[10px] text-brand-text bg-brand-bg p-3 border border-brand-border/60 rounded-xl max-h-48 overflow-y-auto">
                      {auditingItem.rules.map((rule, idx) => (
                        <div key={idx} className="border-b border-brand-border/30 last:border-0 pb-1.5 last:pb-0">
                          <span className="text-brand-muted">{idx+1}:</span> {rule}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Decision actions */}
                  <div className="grid grid-cols-2 gap-3 border-t border-brand-border/40 pt-4">
                    <Button variant="danger" className="justify-center" onClick={() => handleReject(auditingItem)}>
                      Reject Submission
                    </Button>
                    <Button variant="primary" className="justify-center font-bold" onClick={() => handleApprove(auditingItem)}>
                      Approve & Promt
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 space-y-3">
                  <Eye size={40} className="text-brand-muted mx-auto animate-pulse" />
                  <h4 className="font-bold text-sm text-brand-text">Audit Panel Idle</h4>
                  <p className="text-xs text-brand-muted max-w-[200px] mx-auto leading-relaxed">
                    Select the eye audit icon on any pending submission to inspect variable settings and math.js formulas.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </AppShell>
  );
}
