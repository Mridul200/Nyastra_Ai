import { useState } from "react";
import { FileText, Download, ChevronRight, ArrowLeft, Eye, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config";

import ReactMarkdown from "react-markdown";

type DocType = {
  id: string;
  label: string;
  icon: string;
  description: string;
  fields: string[];
};

const docTypes: DocType[] = [
  {
    id: "rent",
    label: "Rent Agreement",
    icon: "🏠",
    description: "Residential/commercial tenancy agreement under Transfer of Property Act",
    fields: ["landlordName", "tenantName", "address", "rentAmount", "duration", "depositAmount"],
  },
  {
    id: "affidavit",
    label: "Affidavit",
    icon: "📜",
    description: "Sworn statement of facts for courts and government offices",
    fields: ["deponentName", "fatherName", "address", "age", "purpose"],
  },
  {
    id: "notice",
    label: "Legal Notice",
    icon: "⚖️",
    description: "Formal legal notice under Section 80 CPC or for demand/recovery",
    fields: ["senderName", "senderAddress", "recipientName", "recipientAddress", "subject", "noticeBody"],
  },
  {
    id: "undertaking",
    label: "Undertaking",
    icon: "✍️",
    description: "Written undertaking/declaration submitted to courts or authorities",
    fields: ["personName", "fatherName", "address", "purpose", "undertakingBody"],
  },
  {
    id: "vakalatnama",
    label: "Vakalatnama",
    icon: "🧑‍⚖️",
    description: "Authority letter appointing an Advocate to represent a client in court",
    fields: ["clientName", "clientAddress", "advocateName", "barNumber", "courtName", "caseNumber", "caseTitle"],
  },
  {
    id: "bail",
    label: "Bail Application",
    icon: "🔓",
    description: "Anticipatory or regular bail application under CrPC 437/438/439",
    fields: ["applicantName", "fatherName", "address", "fir_number", "policeStation", "sections", "accusation", "grounds"],
  },
];

const fieldLabels: Record<string, string> = {
  landlordName: "Landlord Full Name",
  tenantName: "Tenant Full Name",
  address: "Property / Residential Address",
  rentAmount: "Monthly Rent (₹)",
  duration: "Agreement Duration (e.g. 11 months)",
  depositAmount: "Security Deposit (₹)",
  deponentName: "Deponent's Full Name",
  fatherName: "Father's Name",
  age: "Age",
  purpose: "Purpose / Subject Matter",
  senderName: "Sender's Full Name",
  senderAddress: "Sender's Address",
  recipientName: "Recipient's Full Name",
  recipientAddress: "Recipient's Address",
  subject: "Subject of Notice",
  noticeBody: "Notice Content / Facts",
  personName: "Person's Full Name",
  undertakingBody: "Undertaking Content",
  clientName: "Client's Full Name",
  clientAddress: "Client's Address",
  advocateName: "Advocate's Full Name",
  barNumber: "Bar Council Enrollment No.",
  courtName: "Court Name",
  caseNumber: "Case / Petition Number",
  caseTitle: "Case Title (vs.)",
  applicantName: "Applicant's Full Name",
  fir_number: "FIR Number",
  policeStation: "Police Station",
  sections: "IPC/CrPC Sections (e.g. IPC 302, 120B)",
  accusation: "Brief Facts of Accusation",
  grounds: "Grounds for Bail",
};

const textareaFields = ["noticeBody", "undertakingBody", "purpose", "grounds", "accusation"];

export default function DocumentGenerator() {
  const [selected, setSelected] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const selectedDoc = docTypes.find(d => d.id === selected);

  // ── AI Preview ─────────────────────────────────────────────────────────────
  const handlePreview = async () => {
    if (!selectedDoc) return;
    setIsPreviewLoading(true);
    setPreview(null);

    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

    const fieldsText = Object.entries(formData)
      .map(([k, v]) => `${fieldLabels[k] ?? k}: ${v || "(not provided)"}`)
      .join("\n");

    const prompt = `Draft a professional Indian ${selectedDoc.label} with the following details:\n${fieldsText}\n\nUse formal Indian legal language. Include all standard clauses. Return the complete document text only.`;

    try {
      // Try backend first
      const res = await fetch(`${API_BASE_URL}/chat`, {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, provider: "groq", use_rag: false }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data.response);
        setIsPreviewLoading(false);
        return;
      }
    } catch { /* fall through */ }

    // Fallback: Gemini direct
    if (!GEMINI_API_KEY) {
      setPreview(`# ${selectedDoc.label.toUpperCase()}\n\n*Preview requires a Gemini API key or running backend.*\n\nAdd VITE_GEMINI_API_KEY to your .env file to enable AI preview.`);
      setIsPreviewLoading(false);
      return;
    }

    try {
      const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
      const resp = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      setPreview(text || "Could not generate preview.");
    } catch {
      toast.error("Preview failed. Please check your API key or backend.");
      setPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // ── Download ───────────────────────────────────────────────────────────────
  const handleGenerate = async (format: "pdf" | "docx") => {
    if (!selectedDoc) return;
    setIsGenerating(true);

    const docContent = preview || Object.entries(formData)
      .map(([k, v]) => `${fieldLabels[k] ?? k}: ${v}`)
      .join("\n");

    const promise = new Promise<void>(async (resolve, reject) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/draft-legal-document?doc_type=${encodeURIComponent(selectedDoc.label)}&format=${format}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          }
        );

        if (!response.ok) {
          // Fallback: generate from preview content
          if (preview) {
            const genRes = await fetch(`${API_BASE_URL}/generate-document`, {

              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ doc_type: selectedDoc.label, content: preview, title: selectedDoc.label, format }),
            });
            if (!genRes.ok) throw new Error("Document generation failed.");
            const { filename } = await genRes.json();
            window.open(`${API_BASE_URL}/output/${filename}`, "_blank");

            resolve();
            return;
          }
          throw new Error("Backend error. Please start the server.");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedDoc.label.replace(/\s+/g, "_")}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // --- SAVE TO HISTORY ---
        const saved = localStorage.getItem("legal_documents_history");
        const historyDocs = saved ? JSON.parse(saved) : [];
        const newDoc = {
          id: crypto.randomUUID(),
          name: `${selectedDoc.label} - ${Object.values(formData)[0] || 'Draft'}`,
          type: format.toUpperCase(),
          date: Date.now(),
        };
        localStorage.setItem("legal_documents_history", JSON.stringify([newDoc, ...historyDocs].slice(0, 20)));
        // -----------------------

        resolve();
      } catch (error) {
        reject(error);
      } finally {
        setIsGenerating(false);
      }
    });

    toast.promise(promise, {
      loading: "Nyastra AI is drafting your document...",
      success: `${selectedDoc.label} downloaded!`,
      error: (err) => err?.message || "Error generating document. Ensure the backend is running.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl font-bold mb-3">
          Legal Document <span className="text-gradient">Generator</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          AI-drafted, court-ready legal documents in Word or PDF format.
        </p>
      </div>

      {/* ── Doc Type Selection ── */}
      {!selected ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docTypes.map(doc => (
            <Card
              key={doc.id}
              className="card-gradient border-border cursor-pointer hover:glow-border transition-all duration-300 group"
              onClick={() => { setSelected(doc.id); setFormData({}); setPreview(null); }}
            >
              <CardContent className="pt-6 pb-5">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{doc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-foreground">{doc.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{doc.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Form Panel ── */}
          <div>
            <button
              onClick={() => { setSelected(null); setPreview(null); setFormData({}); }}
              className="text-sm text-muted-foreground hover:text-foreground mb-5 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to document types
            </button>

            <Card className="card-gradient border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  {selectedDoc?.label}
                  <Badge variant="outline" className="text-[10px] h-5 border-primary/20 text-primary bg-primary/5 ml-auto">
                    {selectedDoc?.icon}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedDoc?.fields.map(field => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">{fieldLabels[field] ?? field}</Label>
                    {textareaFields.includes(field) ? (
                      <Textarea
                        value={formData[field] || ""}
                        onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                        className="bg-secondary border-border text-foreground min-h-[100px] text-sm"
                        placeholder={`Enter ${(fieldLabels[field] ?? field).toLowerCase()}...`}
                      />
                    ) : (
                      <Input
                        value={formData[field] || ""}
                        onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                        className="bg-secondary border-border text-foreground text-sm"
                        placeholder={`Enter ${(fieldLabels[field] ?? field).toLowerCase()}...`}
                      />
                    )}
                  </div>
                ))}

                <div className="pt-3 space-y-3">
                  {/* AI Preview */}
                  <Button
                    onClick={handlePreview}
                    variant="outline"
                    className="w-full gap-2 border-border text-foreground hover:bg-secondary"
                    disabled={isPreviewLoading || isGenerating}
                  >
                    {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 text-primary" />}
                    {isPreviewLoading ? "Generating Preview..." : "AI Preview"}
                  </Button>

                  {/* Download buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleGenerate("pdf")}
                      disabled={isGenerating || isPreviewLoading}
                      className="gap-2 flex-1"
                    >
                      <Download className="w-4 h-4" />
                      {isGenerating ? "Drafting..." : "PDF"}
                    </Button>
                    <Button
                      onClick={() => handleGenerate("docx")}
                      disabled={isGenerating || isPreviewLoading}
                      variant="outline"
                      className="gap-2 flex-1 border-border text-foreground hover:bg-secondary"
                    >
                      <Download className="w-4 h-4" />
                      {isGenerating ? "Drafting..." : "Word"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Preview Panel ── */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-base text-muted-foreground">Document Preview</h2>
              {preview && (
                <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex-1 min-h-[400px] rounded-xl border border-border bg-card p-5 overflow-y-auto">
              {isPreviewLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm">Nyastra AI is drafting your document...</p>
                </div>
              ) : preview ? (
                <div className="prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-p:leading-relaxed prose-strong:text-foreground text-foreground/90">
                  <ReactMarkdown>{preview}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3">
                  <FileText className="w-12 h-12 opacity-20" />
                  <p className="text-sm">Click <strong className="text-foreground">AI Preview</strong> to see your document before downloading.</p>
                  <p className="text-xs opacity-60">Fill in the form fields for best results.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
