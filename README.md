<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1FoqqToGAWm35SA_a7AnAjjeXQJDnSqRb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Tests

Tests use [Vitest](https://vitest.dev/) with jsdom and React Testing Library.

```bash
npm test            # run once
npm run test:watch  # watch mode
npm run typecheck   # tsc --noEmit
```

No API key or network access is needed to run the tests: the `@google/genai` SDK / service layer is mocked and a dummy `API_KEY` is injected by `vitest.config.ts`. You only need a real `GEMINI_API_KEY` to run the app itself.

CI (`.github/workflows/ci.yml`) runs typecheck, tests and a production build on every push to `main` and on pull requests.
