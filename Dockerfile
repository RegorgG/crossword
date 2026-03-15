# Stage 1: Build React frontend
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY snap-app/package*.json ./
RUN npm ci
COPY snap-app/ ./
RUN BUILD_PATH=/frontend-dist npm run build

# Stage 2: Build Java backend with embedded frontend
FROM gradle:8.5-jdk17 AS backend-build
WORKDIR /app
COPY snap-server/ .
COPY --from=frontend-build /frontend-dist ./src/main/resources/assets/
RUN gradle shadowJar -x test --no-daemon

# Stage 3: Runtime
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=backend-build /app/build/libs/*-all.jar ./app.jar
RUN mkdir -p data/store
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
