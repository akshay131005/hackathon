import React from "react";
import { HeroSection } from "../sections/HeroSection";
import { FeatureSection } from "../sections/FeatureSection";
import { HowItWorksSection } from "../sections/HowItWorksSection";
import { TeamSection } from "../sections/TeamSection";
import { ParticleBackground } from "../components/ParticleBackground";

export const LandingPage: React.FC = () => {
  return (
    <div className="relative">
      <ParticleBackground />
      <div className="relative z-10 space-y-8 sm:space-y-12 lg:space-y-16">
        <HeroSection />
        <FeatureSection />
        <HowItWorksSection />
        <TeamSection />
      </div>
    </div>
  );
};
