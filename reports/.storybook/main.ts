import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  "stories": [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../components/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    "@storybook/addon-a11y"
  ],
  "framework": {
    "name": "@storybook/nextjs",
    "options": {
      "builder": {
        "useSWC": true
      }
    }
  },
  "staticDirs": ["../public"],
  "typescript": {
    "reactDocgen": "react-docgen-typescript"
  },
  "core": {
    "disableTelemetry": true
  }
};
export default config;