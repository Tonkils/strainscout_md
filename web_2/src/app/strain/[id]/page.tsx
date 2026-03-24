import fs from "fs";
import path from "path";
import StrainDetailClient from "./StrainDetailClient";

export async function generateStaticParams() {
  const catalogPath = path.join(process.cwd(), "public", "data", "strainscout_catalog_v10.min.json");
  const raw = fs.readFileSync(catalogPath, "utf8");
  const data = JSON.parse(raw);
  const strains: { id: string }[] = Array.isArray(data) ? data : (data.strains ?? []);
  return strains.map((s) => ({ id: s.id }));
}

export default async function StrainPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StrainDetailClient id={id} />;
}
