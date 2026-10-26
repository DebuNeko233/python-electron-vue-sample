# Python backend

The backend is a regular Python package and can run without Electron.

From the repository root:

- \`pnpm dev:backend\`: start with automatic reload, port 8765.
- \`pnpm python:use 3.11\`: remove the previous .venv and install Python 3.11 plus dependencies.
- \`uv run --project backend pytest\`: execute backend tests.

The packaged app runs a separate uv-managed CPython distribution, not this development .venv.
