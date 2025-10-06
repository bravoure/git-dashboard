# GitHub PR Dashboard

A modern, responsive dashboard for monitoring pull requests across all repositories in the Bravoure organization. Built with React, TypeScript, and Vite, this application provides real-time insights into PR status, assignments, and review progress.

## 🛠️ Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Inline CSS with modern design system
- **API**: GitHub REST API v3
- **Deployment**: GitHub Pages
- **Package Manager**: pnpm

## 📋 Prerequisites

- **Node.js** (version 18 or higher)
- **pnpm** package manager
- **GitHub Account** with access to the Bravoure organization

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd git-dashbaord
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Add your GitHub token to the `.env` file:

```env
VITE_GITHUB_TOKEN=your_github_token_here
```

#### 🔑 Creating a GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select the following scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org and team membership)
4. Copy the generated token and add it to your `.env` file

### 4. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

## 🚀 Build Pipeline

### Local Development

- **Hot Reload**: Instant hot module replacement
- **Type Checking**: TypeScript compilation in watch mode
- **Environment Variables**: Automatic `.env` loading

### Production Build

```bash
pnpm build
```

Output: `build/` directory

### GitHub Actions CI/CD

**Triggers:** Push to `main` branch

**Process:**

1. Install Node.js 20 + pnpm 10
2. Install dependencies: `pnpm install --frozen-lockfile`
3. Build: `pnpm run build`
4. Deploy to GitHub Pages

**Configuration:**

```typescript
// vite.config.ts
export default defineConfig({
  base: "./", // GitHub Pages compatible
  plugins: [react()],
  build: { outDir: "build" },
});
```

## 🔧 Configuration

### Environment Variables

| Variable            | Description                  | Required |
| ------------------- | ---------------------------- | -------- |
| `VITE_GITHUB_TOKEN` | GitHub personal access token | Yes      |

### Build Configuration

- **Base Path**: `./` (GitHub Pages compatible)
- **Output Directory**: `build/`
- **Asset Optimization**: Enabled

## 🐛 Troubleshooting

### Common Issues

**GitHub Token Issues**

```
Error: GITHUB_TOKEN environment variable is required
```

→ Ensure `.env` file contains valid GitHub token

**API Rate Limiting**

```
Error: API rate limit exceeded
```

→ Application includes intelligent 30-minute caching with background refresh to minimize API calls

**Build Failures**

```
Error: Build failed
```

→ Check Node.js version (18+), clear `node_modules`, reinstall dependencies

## 📚 API Documentation

**GitHub API Endpoints:**

- `GET /orgs/{org}/repos` - Organization repositories
- `GET /repos/{owner}/{repo}/pulls` - Repository pull requests
- `GET /repos/{owner}/{repo}/pulls/{pull_number}` - PR review status

**Rate Limits:** 5,000 requests/hour (with intelligent 30-minute caching)

## 🤝 Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

**Guidelines:**

- Follow TypeScript best practices
- Test changes locally before pushing
- Ensure build passes before creating PR

---

**Built with ❤️ for the Bravoure team**
