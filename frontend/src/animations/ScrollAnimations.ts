import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

let registered = false;

export const registerScrollAnimations = () => {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
};

export const fadeInSection = (sectionSelector: string) => {
  registerScrollAnimations();
  gsap.fromTo(
    sectionSelector,
    { opacity: 0, y: 40 },
    {
      opacity: 1,
      y: 0,
      stagger: 0.1,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: {
        trigger: sectionSelector,
        start: "top 80%",
        toggleActions: "play none none reverse"
      }
    }
  );
};

