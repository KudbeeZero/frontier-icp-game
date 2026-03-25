import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import Navbar from "../components/Navbar";

const SECTIONS = [
  {
    title: "Globe & Biomes",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          The Frontier universe is a 3D planet with{" "}
          <strong className="text-foreground">10,000 hexagonal plots</strong>{" "}
          distributed across its surface using a Fibonacci sphere algorithm.
          Each plot belongs to one of 8 biomes.
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-1 text-muted-foreground">Biome</th>
              <th className="text-right py-1">Iron</th>
              <th className="text-right py-1">Fuel</th>
              <th className="text-right py-1">Crystal</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Arctic", 1, 0, 2],
              ["Desert", 2, 3, 0],
              ["Forest", 1, 1, 1],
              ["Ocean", 0, 2, 3],
              ["Mountain", 3, 0, 2],
              ["Volcanic", 2, 4, 1],
              ["Grassland", 2, 1, 1],
              ["Toxic", 0, 1, 4],
            ].map(([b, i, f, c]) => (
              <tr key={String(b)} className="border-b border-border/20">
                <td className="py-1 text-foreground">{b}</td>
                <td className="text-right py-1 text-gray-400">{i}</td>
                <td className="text-right py-1 text-yellow-500">{f}</td>
                <td className="text-right py-1 text-purple-400">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    title: "Resources",
    content: (
      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          Three resources power the economy:{" "}
          <strong className="text-foreground">Iron</strong> (construction),{" "}
          <strong className="text-foreground">Fuel</strong> (operations), and{" "}
          <strong className="text-foreground">Crystal</strong> (advanced tech).
        </p>
        <p>
          Resources accumulate passively on your plots every ~60 seconds. Claim
          them via the plot panel or the Claim All button. Biome richness
          multiplies yield — higher richness plots generate more.
        </p>
      </div>
    ),
  },
  {
    title: "FRONTIER Token (FRNTR)",
    content: (
      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          FRNTR is the native ICRC-1/ICRC-2 fungible token. You earn it
          passively by owning plots with Blockchain Nodes or Data Centres. It\'s
          used to:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Purchase unclaimed plots (100 FRNTR)</li>
          <li>Build facilities and defenses</li>
          <li>Hire Commanders</li>
          <li>Use special abilities</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Combat System",
    content: (
      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          Attack adjacent plots to capture them. Combat is resolved server-side
          in the game canister.
        </p>
        <p>
          <strong className="text-foreground">Attack Power</strong> = 10 +
          Commander ATK bonus + Orbital Satellite bonus (if active)
        </p>
        <p>
          <strong className="text-foreground">Defense Power</strong> = Turrets×3
          + Shields×5 + Walls×2 + 5
        </p>
        <p>
          Win condition: ATK × 10 &gt; DEF × 7. On victory, the plot NFT
          transfers to you. Attacking plots have a 5-minute cooldown.
        </p>
      </div>
    ),
  },
  {
    title: "Buildings & Facilities",
    content: (
      <div className="text-sm text-muted-foreground">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-1">Building</th>
              <th className="text-right py-1">Cost</th>
              <th className="text-left py-1 pl-4">Effect</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Turret", "50 Fe + 10 FRNTR", "+3 DEF"],
              ["Shield", "50 Cr + 25 FRNTR", "+5 DEF"],
              ["Wall", "80 Fe + 5 FRNTR", "+2 DEF"],
              ["Electricity Plant", "100 Fe/Fu + 50 FRNTR", "+20% yield"],
              [
                "Blockchain Node",
                "50 Fe/Fu + 100 Cr + 100 FRNTR",
                "+50% FRNTR",
              ],
              ["Data Centre", "200 Cr + 150 FRNTR", "+100% FRNTR"],
              ["AI Lab", "100 Fe/Fu + 200 Cr + 500 FRNTR", "+50% all"],
            ].map(([b, c, e]) => (
              <tr key={String(b)} className="border-b border-border/20">
                <td className="py-1 text-foreground">{b}</td>
                <td className="text-right py-1">{c}</td>
                <td className="pl-4 py-1 text-primary">{e}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    title: "AI Factions",
    content: (
      <div className="text-sm text-muted-foreground space-y-2">
        {[
          {
            name: "NEXUS-7",
            color: "#EF4444",
            desc: "Aggressive expansion — attacks frequently and captures neighboring plots every 5 minutes.",
          },
          {
            name: "KRONOS",
            color: "#8B5CF6",
            desc: "Defensive fortress — fortifies its highest-richness plots with turrets and shields.",
          },
          {
            name: "VANGUARD",
            color: "#22C3C9",
            desc: "Resource master — prioritizes claiming unclaimed plots near resource-rich biomes.",
          },
          {
            name: "SPECTRE",
            color: "#F59E0B",
            desc: "Shadow ops — uses EMP blasts and recon drones to weaken player positions.",
          },
        ].map((f) => (
          <div key={f.name} className="flex gap-3">
            <span className="font-bold w-24" style={{ color: f.color }}>
              {f.name}
            </span>
            <span>{f.desc}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Special Abilities",
    content: (
      <div className="text-sm text-muted-foreground">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-1">Ability</th>
              <th className="text-right py-1">Cost</th>
              <th className="text-left py-1 pl-4">Effect</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                "Recon Drone",
                "20 FRNTR",
                "Reveals enemy plot stats for 10 min",
              ],
              [
                "Orbital Satellite",
                "50 FRNTR",
                "+5 ATK on all your plots for 1 hour",
              ],
              [
                "Orbital Strike",
                "100 FRNTR",
                "Deals 50 damage to target plot defenses",
              ],
              [
                "EMP Blast",
                "75 FRNTR",
                "Disables target plot defenses for 30 min",
              ],
            ].map(([a, c, e]) => (
              <tr key={String(a)} className="border-b border-border/20">
                <td className="py-1 text-foreground">{a}</td>
                <td className="text-right py-1">{c}</td>
                <td className="pl-4 py-1 text-accent">{e}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    title: "Orbital Events",
    content: (
      <div className="text-sm text-muted-foreground space-y-2">
        <p>Every ~2 hours, a random orbital event impacts specific biomes:</p>
        {[
          ["Meteor Shower", "Volcanic + Mountain", "+50% Iron yield"],
          [
            "Solar Flare",
            "Desert + Arctic",
            "+100% Fuel yield, -20% combat accuracy",
          ],
          ["Void Rift", "Ocean + Toxic", "+75% Crystal yield"],
          [
            "Cosmic Storm",
            "All biomes",
            "+25% all yields, increased combat damage",
          ],
        ].map(([e, b, ef]) => (
          <div key={String(e)} className="flex gap-3">
            <span className="font-bold text-primary w-32">{e}</span>
            <span className="text-muted-foreground/70 w-32">{b}</span>
            <span className="text-accent">{ef}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export default function Manual() {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #0a1628 0%, #04070d 70%)",
      }}
    >
      <Navbar />
      <div
        className="pt-20 pb-8 px-6 max-w-3xl mx-auto overflow-y-auto"
        style={{ maxHeight: "100vh" }}
      >
        <h2 className="font-display font-bold text-3xl tracking-widest text-primary uppercase mb-6">
          Game Manual
        </h2>
        <p className="text-muted-foreground mb-6">
          Everything you need to know about conquering the Frontier universe.
        </p>

        <Accordion.Root type="multiple" className="space-y-2">
          {SECTIONS.map((section) => (
            <Accordion.Item
              key={section.title}
              value={section.title}
              className="glass rounded-xl overflow-hidden"
            >
              <Accordion.Trigger className="flex w-full items-center justify-between px-5 py-4 text-left font-bold uppercase tracking-wider text-sm text-foreground hover:text-primary transition-colors group">
                {section.title}
                <ChevronDown
                  size={16}
                  className="text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                />
              </Accordion.Trigger>
              <Accordion.Content className="px-5 pb-4">
                {section.content}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </div>
  );
}
