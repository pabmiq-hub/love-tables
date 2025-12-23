import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ForWho } from "@/components/landing/ForWho";
import { Features } from "@/components/landing/Features";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { CallToAction } from "@/components/landing/CallToAction";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <main>
      <Navbar />
      <Hero />
      <HowItWorks />
      <ForWho />
      <Features />
      <Testimonials />
      <Pricing />
      <CallToAction />
      <Footer />
    </main>
  );
};

export default Index;
