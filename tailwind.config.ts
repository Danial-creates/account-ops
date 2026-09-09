import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F1117",
        surface: "#171A24",
        raised: "#1E2230",
        line: "#2B3042",
        parch: "#EDE7D9",
        mute: "#9AA0B4",
        gold: "#C9A24B",
        goldDim: "#8E7638",
        moss: "#5C9A72",
        rust: "#C1594D",
      },
      fontFamily: {
        display: ["var(--font-sora)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
