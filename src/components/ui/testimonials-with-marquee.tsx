import { cn } from "@/lib/utils"
import { TestimonialCard, TestimonialAuthor } from "@/components/ui/testimonial-card"

interface TestimonialsSectionProps {
  title: string
  description: string
  testimonials: Array<{
    author: TestimonialAuthor
    text: string
    href?: string
  }>
  className?: string
}

export function TestimonialsSection({ 
  title,
  description,
  testimonials,
  className 
}: TestimonialsSectionProps) {
  return (
    <section className={cn("py-24 overflow-hidden bg-background", className)}>
      <div className="container mx-auto px-4 mb-16 text-center">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-4">
          Testimonials
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
          {title}
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {description}
        </p>
      </div>

      <div className="relative flex flex-col gap-8">
        {/* First Row */}
        <div className="flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
          <div className="flex animate-marquee gap-8 [--duration:40s] [--gap:2rem] py-4">
            {[...Array(4)].map((_, setIndex) => (
              <div key={setIndex} className="flex gap-8">
                {testimonials.map((testimonial, i) => (
                  <TestimonialCard 
                    key={`${setIndex}-${i}`} 
                    {...testimonial} 
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Second Row (Reverse) */}
        <div className="flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
          <div className="flex animate-marquee gap-8 [--duration:40s] [--gap:2rem] py-4 [animation-direction:reverse]">
            {[...Array(4)].map((_, setIndex) => (
              <div key={setIndex} className="flex gap-8">
                {testimonials.map((testimonial, i) => (
                  <TestimonialCard 
                    key={`${setIndex}-${i}`} 
                    {...testimonial} 
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Gradient Overlays */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background"></div>
      </div>
    </section>
  )
}
