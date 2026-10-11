import { Link } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";

export default function PageStub({ title, subtitle, phase }) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
          <Construction className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-3">{title}</h1>
        <p className="text-muted-foreground text-lg max-w-xl mb-2">{subtitle}</p>
        <p className="text-sm text-primary font-medium">{phase}</p>
      </div>
    </div>
  );
}