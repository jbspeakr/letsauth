# The scanner image (specs/004-scanner): the nightly run as a Scaleway Serverless Job
# (docs/scanner.md). It has no network listener; the job clones the repository, scans every
# listed server's public metadata and opens one pull request.
FROM node:22-alpine
ENV NODE_ENV=production
# git: the nightly job clones the repository, commits and pushes the observations
RUN apk add --no-cache git && corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc* ./
# dev dependencies are needed: the job runs TypeScript through tsx
RUN pnpm install --frozen-lockfile --prod=false
COPY . .
USER node
CMD ["pnpm", "scan:nightly"]
