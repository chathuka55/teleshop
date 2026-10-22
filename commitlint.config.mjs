// Conventional Commits with the task ID, e.g. `feat(orders): add tracking code [P5-T03]`.
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "subject-case": [0],
    "header-max-length": [2, "always", 120],
  },
};

export default config;
