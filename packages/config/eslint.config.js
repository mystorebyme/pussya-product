// Shared eslint baseline. App-level config isi ko extend karta hai.
export default [
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
    },
  },
];
