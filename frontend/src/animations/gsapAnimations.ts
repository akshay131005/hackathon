import gsap from "gsap";

export const animateSidebarWidth = (
  element: HTMLElement | null,
  expanded: boolean
) => {
  if (!element) return;
  gsap.to(element, {
    width: expanded ? 220 : 72,
    duration: 0.4,
    ease: "power3.inOut"
  });
};

export const animateCardAppear = (selector: string) => {
  gsap.fromTo(
    selector,
    { y: 24, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.08
    }
  );
};

