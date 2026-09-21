import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import "./App.css";

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

const FORMATS: Format[] = ["webp", "jpeg", "png", "avif"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [fit, setFit] = useState<Fit>("cover");
  const [format, setFormat] = useState<Format>("webp");

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local preview only — never sent anywhere, purely so you can see what
  // you picked before running a transform.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  function handleFile(next: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
    setResultUrl(null);
    setMetadata(null);
    setError(null);
  }

  function reset() {
    handleFile(null);
    setWidth("");
    setHeight("");
    setFit("cover");
    setFormat("webp");
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  }

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
      if (resultUrl) URL.revokeObjectURL(resultUrl);
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
    <div className="page">
      <div className="frame">
        <header className="masthead">
          <span className="mark">Image Lab</span>
          <h1>Transform an image</h1>
          <p className="sub">
            Resize, crop, and convert an image, then inspect the exact
            dimensions and format that came back.
          </p>
        </header>

        <form className="bench" onSubmit={handleSubmit}>
          <section className="panel">
            <h2>Source</h2>

            <label
              className={
                "drop" +
                (dragActive ? " drop--active" : "") +
                (file ? " drop--filled" : "")
              }
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <input
                className="drop__input"
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              {previewUrl ? (
                <img className="drop__preview" src={previewUrl} alt="" />
              ) : (
                <div className="drop__empty">
                  <span>Drop an image here</span>
                  <span className="drop__or">or click to browse</span>
                </div>
              )}
            </label>

            {file && (
              <div className="filerow">
                <span className="filerow__name">{file.name}</span>
                <span className="filerow__size">{formatBytes(file.size)}</span>
                <button type="button" className="linkbtn" onClick={reset}>
                  Remove
                </button>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Dimensions</h2>
            <div className="field-row">
              <label className="field">
                <span>Width</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="auto"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Height</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="auto"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Fit</span>
                <select value={fit} onChange={(e) => setFit(e.target.value as Fit)}>
                  <option value="cover">cover</option>
                  <option value="contain">contain</option>
                  <option value="fill">fill</option>
                  <option value="inside">inside</option>
                  <option value="outside">outside</option>
                </select>
              </label>
            </div>

            <h2>Format</h2>
            <div className="chips" role="radiogroup" aria-label="Output format">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={"chip" + (format === f ? " chip--active" : "")}
                  aria-pressed={format === f}
                  onClick={() => setFormat(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            <button className="run" type="submit" disabled={loading || !file}>
              {loading ? "Processing…" : "Run transform"}
            </button>
          </section>
        </form>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <section className="output">
          <h2>Output</h2>

          {loading && <div className="scan" aria-hidden="true" />}

          {!loading && !resultUrl && (
            <p className="output__empty">
              Choose an image and run a transform to see the result here.
            </p>
          )}

          {!loading && resultUrl && (
            <>
              <div className="print">
                <img className="print__image" src={resultUrl} alt="Transformed output" />
              </div>
              {metadata && (
                <dl className="specs">
                  <div>
                    <dt>Dimensions</dt>
                    <dd>
                      {metadata.width} × {metadata.height}
                    </dd>
                  </div>
                  <div>
                    <dt>Format</dt>
                    <dd>{metadata.format}</dd>
                  </div>
                  {metadata.orientation !== undefined && (
                    <div>
                      <dt>Orientation</dt>
                      <dd>{metadata.orientation}</dd>
                    </div>
                  )}
                </dl>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}