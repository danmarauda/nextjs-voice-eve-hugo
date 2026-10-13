import Image from "next/image";
import aliasMaterial from "@/public/images/alias-material.jpeg";

export function LandingArtwork() {
  return (
    <Image
      src={aliasMaterial}
      alt="Sculpted charcoal layers and silver-cut edges forming the ALIAS mark."
      fill
      sizes="100vw"
      preload
      placeholder="blur"
      className="pointer-events-none select-none object-cover"
    />
  );
}
