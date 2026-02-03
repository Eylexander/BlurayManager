import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-200/50 dark:bg-gray-800/50 border ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-600/50 dark:border-gray-700/50 focus:ring-blue-500/50 dark:focus:ring-blue-400/50"
          } rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:border-blue-500/50 dark:focus:border-blue-400/50 focus:bg-gray-200 dark:focus:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-400 dark:text-red-300">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
