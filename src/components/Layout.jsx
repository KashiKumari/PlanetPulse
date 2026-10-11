import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";

export default function Layout() {
  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "hsl(222,47%,6%)", color: "hsl(160,20%,96%)" }}>
      {/* Ambient glow background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(to right,hsl(152,56%,48%,0.05) 1px,transparent 1px),linear-gradient(to bottom,hsl(152,56%,48%,0.05) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%,black 20%,transparent 75%)",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%,black 20%,transparent 75%)",
        }} />
        <div style={{ position: "absolute", top: "-10%", left: "15%", width: 500, height: 500, borderRadius: "50%", background: "hsl(152,56%,48%,0.07)", filter: "blur(150px)", animation: "float-slow 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "15%", width: 500, height: 500, borderRadius: "50%", background: "hsl(190,85%,50%,0.07)", filter: "blur(150px)", animation: "float-slow 8s ease-in-out infinite", animationDelay: "3s" }} />
      </div>

      <Navbar />
      <main style={{ paddingTop: 64, position: "relative", zIndex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
