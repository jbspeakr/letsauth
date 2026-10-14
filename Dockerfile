# The on-demand scanner service (specs/004-scanner/contracts/service.md), built for Scaleway
# Serverless Containers in an EU region. The same image runs the nightly command:
#   docker run --rm letsauth-scanner pnpm scan --all
FROM node:22-alpine
ENV NODE_ENV=production PORT=8080
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc* ./
# dev dependencies are needed: the service runs TypeScript through tsx
RUN pnpm install --frozen-lockfile --prod=false
COPY . .
EXPOSE 8080
USER node
CMD ["pnpm", "scan:serve"]
