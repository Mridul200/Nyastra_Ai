import { useState, useEffect, useRef } from "react";
import { 
  FileText, MessageSquare, History, FileUp, Download, 
  ExternalLink, Trash2, Calendar, Search, LayoutDashboard,
  Clock, Shield, User, ChevronRight, BarChart3, Loader2,
  Phone, Mail, MapPin, Gavel, Save, Upload, Briefcase, Camera
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type ChatSession = { id: string; title: string; updatedAt: number; messages: any[] };
type DocHistory = { id: string; name: string; type: string; date: number; preview?: string };
type CaseHistory = { id: string; title: string; date: number; relevance: number; topSection: string };

export default function UserDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const chatsRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [docs, setDocs] = useState<DocHistory[]>([]);
  const [cases, setCases] = useState<CaseHistory[]>([]);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Profile States
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    court_name: "",
    specialization: "",
    location: "",
    bar_council_id: "",
    avatar_url: ""
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      // Fetch profile from Supabase
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (data) {
          const profileData = data as any;
          setProfile({
            full_name: profileData.full_name || "",
            email: profileData.email || user.email || "",
            phone_number: profileData.phone_number || "",
            court_name: profileData.court_name || "",
            specialization: profileData.specialization || "",
            location: profileData.location || "",
            bar_council_id: profileData.bar_council_id || "",
            avatar_url: profileData.avatar_url || ""
          });
        }
      };
      fetchProfile();
    }

    // Load Chat History
    const savedChats = localStorage.getItem("legal_chat_history");
    if (savedChats) setChats(JSON.parse(savedChats));

    // Load Document History (Mocking for now until we update the pages)
    const savedDocs = localStorage.getItem("legal_documents_history");
    if (savedDocs) setDocs(JSON.parse(savedDocs));

    // Load Case History (Mocking for now until we update the pages)
    const savedCases = localStorage.getItem("legal_cases_history");
    if (savedCases) setCases(JSON.parse(savedCases));
  }, [user, authLoading, navigate]);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update local profile and Supabase record
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success("Profile photo updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteChat = (id: string) => {
    const updated = chats.filter(c => c.id !== id);
    setChats(updated);
    localStorage.setItem("legal_chat_history", JSON.stringify(updated));
    toast.success("Chat deleted");
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          court_name: profile.court_name,
          specialization: profile.specialization,
          location: profile.location,
          bar_council_id: profile.bar_council_id,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredChats = chats.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));
  const filteredDocs = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  const filteredCases = cases.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            User <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-1">Manage your legal research, documents, and case history.</p>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border p-2 rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="pr-2">
            <p className="text-sm font-semibold">{profile.full_name || "Advocate"}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] h-4 py-0 border-emerald-500/30 text-emerald-400 bg-emerald-500/5 uppercase font-bold">PRO ACCOUNT</Badge>
              {profile.court_name && <span className="text-[10px] text-muted-foreground uppercase font-medium truncate max-w-[100px]">{profile.court_name}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* --- Stats Summary --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="card-gradient border-border overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">+12%</Badge>
            </div>
            <p className="text-3xl font-display font-bold">{chats.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total AI Legal Consultations</p>
          </CardContent>
        </Card>
        <Card className="card-gradient border-border overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">+5</Badge>
            </div>
            <p className="text-3xl font-display font-bold">{docs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">AI Generated Documents</p>
          </CardContent>
        </Card>
        <Card className="card-gradient border-border overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <FileUp className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">New</Badge>
            </div>
            <p className="text-3xl font-display font-bold">{cases.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Cases Analyzed & Matched</p>
          </CardContent>
        </Card>
        <Card className="card-gradient border-border overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Sync</Badge>
            </div>
            <p className="text-3xl font-display font-bold">Secure</p>
            <p className="text-xs text-muted-foreground mt-1">End-to-End Encryption Active</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        {/* --- Search and Filter --- */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search history by keyword or case title..." 
            className="pl-10 h-12 bg-card border-border shadow-sm focus:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Tabs defaultValue="chats" className="w-full">
          <TabsList className="bg-muted/50 border border-border p-1 gap-1 h-12 mb-6">
            <TabsTrigger value="chats" className="gap-2 px-4 h-full rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageSquare className="w-4 h-4" /> AI Chats
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2 px-4 h-full rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="w-4 h-4" /> Documents
            </TabsTrigger>
            <TabsTrigger value="cases" className="gap-2 px-4 h-full rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="w-4 h-4" /> Case History
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2 px-4 h-full rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ml-auto bg-secondary/50">
              <User className="w-4 h-4" /> Profile Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="space-y-4">
            {filteredChats.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card/50">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No chat history found.</p>
                <Link to="/chatbot"><Button variant="link" className="text-primary mt-2">Start a new legal chat</Button></Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredChats.map(chat => (
                  <Card key={chat.id} className="card-gradient border-border hover:glow-border transition-all group overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-5 h-5 text-primary" />
                        </div>
                        <div className="truncate">
                          <h4 className="font-semibold text-foreground truncate">{chat.title || "New Consultation"}</h4>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(chat.updatedAt).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {chat.messages.length} messages</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link to="/chatbot">
                          <Button variant="ghost" size="icon" className="hover:bg-primary/20 hover:text-primary">
                            <ChevronRight className="w-5 h-5" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="hover:bg-red-500/10 hover:text-red-400"
                          onClick={() => deleteChat(chat.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="docs" className="space-y-4">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card/50">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No generated documents history found.</p>
                <Link to="/legal-generator"><Button variant="link" className="text-primary mt-2">Generate a legal document</Button></Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocs.map(doc => (
                  <Card key={doc.id} className="card-gradient border-border group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3">
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-bold">{doc.type}</Badge>
                    </div>
                    <CardHeader className="pb-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-base truncate">{doc.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3 h-3" /> {new Date(doc.date).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs gap-2 border-border">
                        <ExternalLink className="w-3 h-3" /> View
                      </Button>
                      <Button size="sm" className="flex-1 text-xs gap-2">
                        <Download className="w-3 h-3" /> Download
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cases" className="space-y-4">
            {filteredCases.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card/50">
                <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No case analysis history found.</p>
                <Link to="/upload-case"><Button variant="link" className="text-primary mt-2">Upload a case factuals</Button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCases.map(c => (
                  <Card key={c.id} className="card-gradient border-border group overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center font-bold text-gradient shrink-0">
                          {c.relevance}%
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold truncate">{c.title}</h4>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium bg-primary/5 text-primary px-2 py-0.5 rounded border border-primary/10 leading-none">{c.topSection}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(c.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Link to="/upload-case">
                        <Button variant="ghost" size="icon" className="hover:bg-primary/20 hover:text-primary shrink-0 ml-2">
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="animate-in slide-in-from-bottom-2 duration-300">
            <Card className="card-gradient border-border overflow-hidden">
              <CardHeader className="border-b border-border bg-secondary/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Professional Identity</CardTitle>
                    <CardDescription>Update your contact details and courtroom credentials.</CardDescription>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20">Active Profile</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleProfileSave} className="space-y-8">
                  {/* Avatar Section */}
                  <div className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-border/50">
                    <div className="relative group">
                      <div className="w-28 h-28 rounded-2xl bg-secondary border-2 border-dashed border-border flex items-center justify-center overflow-hidden shadow-inner">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : profile.full_name ? (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary italic">
                            {profile.full_name.charAt(0)}
                          </div>
                        ) : (
                          <User className="w-10 h-10 text-muted-foreground" />
                        )}
                        {isUploading && (
                          <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 p-2 rounded-lg bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all scale-75 group-hover:scale-100 ring-4 ring-background"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                      />
                    </div>
                    <div className="text-center md:text-left space-y-1">
                      <h4 className="font-semibold text-lg">Your Profile Photo</h4>
                      <p className="text-sm text-muted-foreground">Used for AI-generated legal documents and formal correspondence.</p>
                      <div className="pt-2 flex gap-2 justify-center md:justify-start">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          type="button" 
                          className="h-8 text-xs border-border gap-2"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          <Upload className="w-3 h-3" /> {isUploading ? "Uploading..." : "Upload New"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          type="button" 
                          className="h-8 text-xs text-red-400 hover:text-red-500 hover:bg-red-500/5"
                          onClick={async () => {
                            if (!user) return;
                            await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
                            setProfile({ ...profile, avatar_url: "" });
                            toast.info("Profile photo removed");
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Basic Information</h3>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Full Name</label>
                        <Input 
                          value={profile.full_name}
                          onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                          placeholder="Adv. Mridul Mani Tripathi" 
                          className="bg-secondary/50 border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> Email Address</label>
                        <Input 
                          value={profile.email}
                          disabled
                          className="bg-secondary/50 border-border opacity-60 cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> Phone Number</label>
                        <Input 
                          value={profile.phone_number}
                          onChange={(e) => setProfile({...profile, phone_number: e.target.value})}
                          placeholder="+91 XXXXX-XXXXX" 
                          className="bg-secondary/50 border-border"
                        />
                      </div>
                    </div>

                    {/* Professional info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Courtroom Credentials</h3>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><Gavel className="w-4 h-4 text-primary" /> Primary Court</label>
                        <Input 
                          value={profile.court_name}
                          onChange={(e) => setProfile({...profile, court_name: e.target.value})}
                          placeholder="e.g. Supreme Court of India" 
                          className="bg-secondary/50 border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /> Specialization</label>
                        <Input 
                          value={profile.specialization}
                          onChange={(e) => setProfile({...profile, specialization: e.target.value})}
                          placeholder="e.g. Criminal, Corporate, Civil" 
                          className="bg-secondary/50 border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Office Location</label>
                        <Input 
                          value={profile.location}
                          onChange={(e) => setProfile({...profile, location: e.target.value})}
                          placeholder="City, State" 
                          className="bg-secondary/50 border-border"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border flex justify-end gap-3">
                    <Button variant="ghost" type="button">Discard Changes</Button>
                    <Button type="submit" disabled={isSaving} className="gap-2 px-8">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Professional Profile
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-12 p-6 rounded-2xl border border-primary/20 bg-primary/5 text-center flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl -z-10" />
        <div className="text-left">
          <h3 className="font-display font-bold text-xl mb-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Professional Privacy
          </h3>
          <p className="text-muted-foreground text-sm max-w-lg">Your professional credentials are encrypted and used solely for generating formal legal documents. We never share your contact information with 3rd parties.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Button variant="outline" className="border-border">Export Data</Button>
          <Button variant="destructive" onClick={() => localStorage.clear()} className="gap-2">
            <Trash2 className="w-4 h-4" /> Clear All History
          </Button>
        </div>
      </div>
    </div>
  );
}
