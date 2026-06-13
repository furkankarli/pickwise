import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The demo app uses a focused subset of the copied AI Elements kit.
    // Keep unused kit examples out of the hackathon lint gate until they are productized.
    "components/ai-elements/agent.tsx",
    "components/ai-elements/artifact.tsx",
    "components/ai-elements/attachments.tsx",
    "components/ai-elements/audio-player.tsx",
    "components/ai-elements/canvas.tsx",
    "components/ai-elements/checkpoint.tsx",
    "components/ai-elements/code-block.tsx",
    "components/ai-elements/commit.tsx",
    "components/ai-elements/confirmation.tsx",
    "components/ai-elements/connection.tsx",
    "components/ai-elements/context.tsx",
    "components/ai-elements/controls.tsx",
    "components/ai-elements/edge.tsx",
    "components/ai-elements/environment-variables.tsx",
    "components/ai-elements/file-tree.tsx",
    "components/ai-elements/image.tsx",
    "components/ai-elements/inline-citation.tsx",
    "components/ai-elements/jsx-preview.tsx",
    "components/ai-elements/mic-selector.tsx",
    "components/ai-elements/model-selector.tsx",
    "components/ai-elements/node.tsx",
    "components/ai-elements/open-in-chat.tsx",
    "components/ai-elements/package-info.tsx",
    "components/ai-elements/panel.tsx",
    "components/ai-elements/persona.tsx",
    "components/ai-elements/plan.tsx",
    "components/ai-elements/prompt-input.tsx",
    "components/ai-elements/queue.tsx",
    "components/ai-elements/reasoning.tsx",
    "components/ai-elements/sandbox.tsx",
    "components/ai-elements/schema-display.tsx",
    "components/ai-elements/shimmer.tsx",
    "components/ai-elements/snippet.tsx",
    "components/ai-elements/sources.tsx",
    "components/ai-elements/speech-input.tsx",
    "components/ai-elements/stack-trace.tsx",
    "components/ai-elements/suggestion.tsx",
    "components/ai-elements/task.tsx",
    "components/ai-elements/terminal.tsx",
    "components/ai-elements/test-results.tsx",
    "components/ai-elements/toolbar.tsx",
    "components/ai-elements/transcription.tsx",
    "components/ai-elements/voice-selector.tsx",
    "components/ai-elements/web-preview.tsx",
    "components/ui/carousel.tsx",
  ]),
]);

export default eslintConfig;
