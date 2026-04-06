import { useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const mockSimilar = [
  { title: "Ram Kumar vs. State of UP", relevance: 92, section: "IPC 420" },
  { title: "Sharma & Co. vs. Municipal Corp.", relevance: 87, section: "CPC 151" },
  { title: "State of Bihar vs. Radha Mohan", relevance: 78, section: "IPC 406" },
];

export default function UploadCase() {
  const [caseText, setCaseText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = () => {
    if (!caseText.trim() && !file) return;
    setAnalyzed(true);
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl font-bold mb-3">
          Upload Case & <span className="text-gradient">Find Similar Judgments</span>
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Upload your FIR, petition, or case facts. The system extracts key legal issues and finds similar past cases.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Paste Case Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste your FIR, petition text, or describe the case facts..."
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              className="min-h-[200px] bg-secondary border-border text-foreground placeholder:text-muted-foreground resize-none"
            />
          </CardContent>
        </Card>

        <Card className="card-gradient border-border">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Upload Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="w-10 h-10 text-muted-foreground mb-3" />
              <span className="text-sm text-muted-foreground">
                {file ? file.name : "Click to upload PDF, DOCX"}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </CardContent>
        </Card>
      </div>

      <div className="text-center mb-10">
        <Button onClick={handleAnalyze} size="lg" className="gap-2 px-8">
          <AlertCircle className="w-4 h-4" /> Analyze & Find Similar Cases
        </Button>
      </div>

      {analyzed && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" /> Similar Judgments Found
          </h2>
          <div className="space-y-3">
            {mockSimilar.map((c, i) => (
              <Card key={i} className="card-gradient border-border">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-display font-medium">{c.title}</p>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs mt-1">
                      {c.section}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-display font-bold text-gradient">{c.relevance}%</span>
                    <p className="text-xs text-muted-foreground">relevance</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
