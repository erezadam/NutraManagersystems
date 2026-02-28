# Supplements App Rebuild

## Purpose
Rewrite of the supplements system while preserving existing behavior and data contracts.

## Setup
```bash
npm install
cp .env.example .env
```

## Data Provider
The app is Firebase-only.
Set all `VITE_FIREBASE_*` vars from your Firebase project settings.

## Run
```bash
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Firebase Deploy
1. Update `.firebaserc` with your Firebase project id.
2. Fill Firebase env vars in `.env`.
3. Login and deploy:
```bash
npx firebase-tools login
npm run deploy:firebase
```

## GitHub Actions Deploy
Workflow file: `.github/workflows/firebase-deploy.yml`

Required repository secrets:
- `FIREBASE_TOKEN`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)
- `VITE_AI_ENDPOINT_URL` (optional)
- `VITE_AI_ENDPOINT_TOKEN` (optional)

## Firebase Local Emulators
```bash
npm run firebase:emulators
```

## Quality Gates
```bash
npm run lint
npm run format:check
npm run test
npm run test:ui
```

## Conventions
- TypeScript strict
- Small tasks with measurable acceptance
- Every change updates relevant docs under `docs/`
- Do not change entity/field names without ADR in `docs/decisions.md`

## Documentation
- `docs/overview.md`
- `docs/screens.md`
- `docs/navigation.md`
- `docs/data-model.md`
- `docs/permissions.md`
- `docs/workflows.md`
- `docs/ai.md`
- `docs/import-export.md`
- `docs/operations.md`
- `docs/decisions.md`

## Skill
- `skills/rebuild-supplements-app.md`
