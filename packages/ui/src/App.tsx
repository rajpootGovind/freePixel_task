import { useState, type FormEvent } from "react";

// Hardcoded for now — the assignment explicitly allows this and asks us to
// document the choice. In a real deploy this would be an env var.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type Fit = "cover" | "contain" | "fill" | "inside" | "outside";
type Format = "jpeg" | "png" | "webp" | "avif";

interface Metadata {
  width: number;
  height: number;
  format: string;
  orientation?: number;
  exif?: Record<string, unknown>;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [fit, setFit] = useState<Fit>("cover");
  const [format, setFormat] = useState<Format>("webp");

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildFormData(): FormData {
    if (!file) throw new Error("no file selected");
    const formData = new FormData();
    formData.append("file", file);
    if (width) formData.append("width", width);
    if (height) formData.append("height", height);
    formData.append("fit", fit);
    formData.append("format", format);
    return formData;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultUrl(null);
    setMetadata(null);

    try {
      // /transform and /info both need their own FormData instance —
      // a FormData/its file stream can't be reused across two fetches.
      const transformRes = await fetch(`${API_URL}/transform`, {
        method: "POST",
        body: buildFormData(),
      });

      if (!transformRes.ok) {
        const body = await transformRes.json();
        throw new Error(body.error ?? "Transform failed.");
      }

      const blob = await transformRes.blob();
      setResultUrl(URL.createObjectURL(blob));

      const infoRes = await fetch(`${API_URL}/info`, {
        method: "POST",
        body: buildFormData(),
      });

      if (!infoRes.ok) {
        const body = await infoRes.json();
        throw new Error(body.error ?? "Fetching metadata failed.");
      }

      setMetadata(await infoRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Image Transform</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="number"
            placeholder="width"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />
          <input
            type="number"
            placeholder="height"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
          <select value={fit} onChange={(e) => setFit(e.target.value as Fit)}>
            <option value="cover">cover</option>
            <option value="contain">contain</option>
            <option value="fill">fill</option>
            <option value="inside">inside</option>
            <option value="outside">outside</option>
          </select>
          <select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
            <option value="webp">webp</option>
            <option value="jpeg">jpeg</option>
            <option value="png">png</option>
            <option value="avif">avif</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Processing..." : "Transform"}
        </button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {resultUrl && (
        <section style={{ marginTop: "1.5rem" }}>
          <h2>Result</h2>
          <img src={resultUrl} alt="Transformed" style={{ maxWidth: "100%" }} />
        </section>
      )}

      {metadata && (
        <section style={{ marginTop: "1rem" }}>
          <h2>Metadata</h2>
          <pre>{JSON.stringify(metadata, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}