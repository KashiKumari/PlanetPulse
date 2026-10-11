import { useState } from "react";
import { Search, Loader2, MapPin, X } from "lucide-react";

export default function MapSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setShowResults(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (r) => {
    onSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), name: r.display_name, zoom: 7 });
    setShowResults(false);
    setQuery(r.display_name.split(",")[0]);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a location..."
            className="w-full rounded-lg border border-border bg-background/60 pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
        </button>
      </form>

      {showResults && (
        <div className="absolute top-full mt-2 w-full rounded-lg border border-border bg-popover shadow-xl z-[1000] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">Search results</span>
            <button onClick={() => setShowResults(false)}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          {loading ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">No results found</div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(r)}
                  className="flex items-start gap-2 w-full px-3 py-2 text-left hover:bg-muted/50 text-sm border-b border-border/50 last:border-0"
                >
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground line-clamp-2">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}