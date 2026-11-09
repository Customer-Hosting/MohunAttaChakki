import { content } from "@/content/en";
import slider1 from "../../../public/images/slider1.jpg";
import slider2 from "../../../public/images/slider2.jpg";
import HeroSlider from "./HeroSlider";

// Static imports give next/image the dimensions + blur placeholders (no layout shift).
const IMAGES = {
  "/images/slider1.jpg": slider1,
  "/images/slider2.jpg": slider2,
};

export default function Hero() {
  const slides = content.hero.slides.map((s) => ({ image: IMAGES[s.image], alt: s.alt, href: s.href }));
  return (
    <>
      <h1 className="sr-only">Mohan Atta Chakki: fresh chakki atta, besan, sattu and pulses from Burdwan</h1>
      <HeroSlider slides={slides} label={content.hero.label} />
    </>
  );
}
