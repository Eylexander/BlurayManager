/**
 * Spinning disc. Centered in the viewport by default; `inline` centers it in
 * its container instead.
 */
export const LoaderCircle = ({ inline = false }: { inline?: boolean }) => (
  <div
    role="status"
    aria-label="Loading"
    className={`flex items-center justify-center animate-fade-in ${inline ? "py-16" : "min-h-screen"}`}
  >
    <div className="disc w-12 aspect-square animate-disc" />
  </div>
);
