# Stage 1: Build React frontend
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY snap-app/package*.json ./
RUN npm ci
COPY snap-app/ ./
RUN BUILD_PATH=/frontend-dist ./node_modules/.bin/react-scripts build

# Stage 2: Build Java backend with embedded frontend
FROM eclipse-temurin:17-jdk-jammy AS backend-build
WORKDIR /app
COPY snap-server/ .
COPY --from=frontend-build /frontend-dist ./src/main/resources/assets/
RUN chmod +x gradlew && ./gradlew jar copyDeps -x test --no-daemon

# Stage 3: Runtime
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=backend-build /app/build/libs/*.jar ./lib/
COPY --from=backend-build /app/build/deps/ ./lib/
RUN mkdir -p data/store
EXPOSE 8080
CMD ["java", "-cp", "lib/*", "com.kyc.snap.server.SnapServer"]
