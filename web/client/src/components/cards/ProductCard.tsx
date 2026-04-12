import type { CatalogStrain } from "@/hooks/useCatalog";
import { getProductCategory } from "@/lib/utils";
import FlowerCard from "./FlowerCard";
import EdibleCard from "./EdibleCard";
import ConcentrateCard from "./ConcentrateCard";
import VapeCard from "./VapeCard";
import PreRollCard from "./PreRollCard";
import OtherCard from "./OtherCard";

interface ProductCardProps {
  strain: CatalogStrain;
}

export default function ProductCard({ strain }: ProductCardProps) {
  const category = getProductCategory(strain.name);

  switch (category) {
    case "Flower":
      return <FlowerCard strain={strain} />;
    case "Edible":
      return <EdibleCard strain={strain} />;
    case "Concentrate":
      return <ConcentrateCard strain={strain} />;
    case "Vape":
      return <VapeCard strain={strain} />;
    case "Pre-Roll":
      return <PreRollCard strain={strain} />;
    case "Other":
      return <OtherCard strain={strain} />;
    default:
      return <FlowerCard strain={strain} />;
  }
}
