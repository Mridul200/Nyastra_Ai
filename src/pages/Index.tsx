import { Link } from "react-router-dom";
import { Search, Upload, MessageSquare, FileText, ArrowRight, Scale, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { TestimonialsSection } from "@/components/ui/testimonials-with-marquee";

const testimonials = [
  {
    author: {
      name: "Adv. Rajesh Kumar",
      handle: "High Court of Delhi",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    text: "Nyastra AI has completely changed my research workflow. Finding relevant precedents now takes minutes instead of hours.",
  },
  {
    author: {
      name: "Adv. Sneha Sharma",
      handle: "Supreme Court of India",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
    },
    text: "The document generator is a lifesaver. It creates accurate drafts that I can quickly refine for my clients.",
  },
  {
    author: {
      name: "Adv. Vikram Malhotra",
      handle: "Bombay High Court",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    text: "The AI Chatbot's ability to cite specific IPC and CrPC sections accurately is truly impressive for an automated tool.",
  },
  {
    author: {
      name: "Adv. Priya Iyer",
      handle: "Madras High Court",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
    },
    text: "Finally, a technology that understands the nuances of Indian Law. A must-have for every modern advocate.",
  }
];

const features = [
  {
    icon: Search,
    title: "Smart Case Search",
    description: "Search by keyword, act or section. Get relevant past judgments with AI summaries.",
    to: "/search",
  },
  {
    icon: Upload,
    title: "Upload & Match Cases",
    description: "Upload FIR, petition or case facts. Get similar past cases ranked automatically.",
    to: "/upload",
  },
  {
    icon: MessageSquare,
    title: "AI Chatbot",
    description: "Ask legal questions and get answers based on retrieved judgments and legal context.",
    to: "/chatbot",
  },
  {
    icon: FileText,
    title: "Document Generator",
    description: "Generate Rent Agreements, Affidavits, Legal Notices and Undertakings instantly.",
    to: "/documents",
  },
];

const stats = [
  { icon: Scale, value: "10,000+", label: "Judgments Indexed" },
  { icon: Zap, value: "< 2s", label: "Search Speed" },
  { icon: Shield, value: "4", label: "Document Types" },
];

export default function Index() {
  return (
    <div>
      {/* Geometric Hero */}
      <HeroGeometric
        badge="Nyastra AI — Intelligent Legal Solutions"
        title1="From Case Search to"
        title2="Courtroom Ready"
      />

      {/* CTA Buttons */}
      <section className="relative -mt-32 z-20 pb-16">
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/search">
            <Button size="lg" className="gap-2 px-8 h-12 text-base">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/documents">
            <Button size="lg" variant="outline" className="gap-2 px-8 h-12 text-base border-border text-foreground hover:bg-secondary">
              Generate Documents
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/50">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-3 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <s.icon className="w-6 h-6 mx-auto text-primary mb-2" />
                <p className="font-display text-2xl md:text-3xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scroll Animation Feature Showcase */}
      <ContainerScroll
        titleComponent={
          <div className="mb-8">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-center">
              Everything Advocates{" "}
              <span className="text-gradient">Need</span>
            </h2>
            <p className="text-muted-foreground text-center mt-4 max-w-lg mx-auto">
              From case research to document generation — powered by AI.
            </p>
          </div>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4 p-4 h-full overflow-y-auto">
          {features.map((f) => (
            <Link key={f.to} to={f.to}>
              <div className="card-gradient border border-border rounded-xl p-6 h-full hover:glow-border transition-all duration-300 group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
                <span className="inline-flex items-center gap-1 text-sm text-primary mt-4 group-hover:gap-2 transition-all">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </ContainerScroll>

      <TestimonialsSection
        title="Trusted by India's Top Advocates"
        description="Join leading advocates and law firms who are already leveraging Nyastra AI to win cases."
        testimonials={testimonials}
      />
    </div>
  );
}
