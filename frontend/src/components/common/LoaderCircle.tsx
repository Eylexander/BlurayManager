/**
 * Spinning ring. Centered in the viewport by default; `inline` centers it in
 * its container instead.
 */
export const LoaderCircle = ({ inline = false }: { inline?: boolean }) => (
  <div
    role="status"
    aria-label="Loading"
    className={`flex items-center justify-center animate-fade-in ${inline ? "py-16" : "min-h-screen"}`}
  >
    <div className="w-10 h-10 rounded-full border-[3px] border-muted border-t-primary animate-spin" />
  </div>
);
