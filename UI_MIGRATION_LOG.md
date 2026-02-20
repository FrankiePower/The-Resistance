# UI Migration Log

## Step 1: Branch Creation
- Checked out to a new branch `3d-ui-integration` to safely experiment with the Three.js merge without affecting the `main` branch.

## Step 2: Install Dependencies
- Installed Three.js dependencies in `the-resistance-frontend`:
  - `three`
  - `@react-three/fiber`
  - `@react-three/drei`
  - `@react-three/postprocessing`
  - `@types/three`

## Step 3: Component Migration Planning
We have successfully ported the 3D components from the Next.js project to the Vite project:
1. Copied `galaxy.tsx` -> `src/games/the-resistance/components/Galaxy3D.tsx`
   - Removed `"use client"`.
   - Updated the import to reference `./StarSystem3D`.
   - Removed Next.js specific dependencies.
2. Copied `star-system.tsx` -> `src/games/the-resistance/components/StarSystem3D.tsx`
   - Removed `"use client"`.
   - Replaced `<Button>` component with standard `<button>` styled using Tailwind.
3. Copied `loader.tsx` -> `src/games/the-resistance/components/Loader3D.tsx`
   - Removed `"use client"`.

## Step 4: Refactoring TheResistanceGame.tsx (Upcoming)
- We will integrate the Three.js Canvas and `<Galaxy3D />` into `TheResistanceGame.tsx` or create a wrapper component to replace `GalaxyGrid`.
