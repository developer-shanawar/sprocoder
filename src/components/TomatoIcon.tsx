import React from "react";

interface TomatoIconProps {
  className?: string;
  size?: number;
}

export default function TomatoIcon({ className = "w-5 h-5", size = 20 }: TomatoIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      aria-label="Tomato"
    >
      {/* Leaves and Stem on top */}
      <path
        d="M12 2v3.5"
        stroke="#15803d"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Left leaf */}
      <path
        d="M12 5.5C9.5 3.5 7 4 6 5c1.5 1.5 3.5 1.5 6 .5z"
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right leaf */}
      <path
        d="M12 5.5C14.5 3.5 17 4 18 5c-1.5 1.5-3.5 1.5-6 .5z"
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center mini sepals */}
      <path
        d="M12 5.5C11 7 10 7.5 9 8c1-.2 2-.5 3-2.5z"
        fill="#16a34a"
      />
      <path
        d="M12 5.5C13 7 14 7.5 15 8c-1-.2-2-.5-3-2.5z"
        fill="#16a34a"
      />
      {/* Tomato juicy body */}
      <path
        d="M12 21.5c-4.8 0-8.5-3.4-8.5-8 0-4.2 3.6-7.5 8.5-7.5s8.5 3.3 8.5 7.5c0 4.6-3.7 8-8.5 8z"
        fill="#ef4444"
        stroke="#b91c1c"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Specular highlight */}
      <path
        d="M8.5 9.5c-1.5 1-2 2.8-1.8 4.2"
        stroke="#fca5a5"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="9" cy="8.8" r="0.8" fill="#ffffff" />
    </svg>
  );
}
