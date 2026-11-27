FROM node:20-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV TRANSFORMERS_CACHE=/app/.transformers-cache
RUN node scripts/predownload.mjs
RUN pnpm build
ENV PORT=7860
EXPOSE 7860
CMD ["pnpm", "start"]
