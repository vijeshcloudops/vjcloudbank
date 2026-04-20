# ─────────────────────────────────────────────────────────────────
# Dockerfile for NeoBank Transaction Service (Java + Spring Boot)
# ─────────────────────────────────────────────────────────────────
#
# Java apps need to be COMPILED first (unlike Node.js/Python).
# Maven compiles Java source → .class files → packages into a .jar
# A .jar is a single executable file containing the entire app.
#
# Stage 1: Build  — use Maven to compile and package
# Stage 2: Run    — use a minimal JRE to run the .jar
# ─────────────────────────────────────────────────────────────────

FROM maven:3.9.6-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy pom.xml first — download dependencies (cached layer)
COPY pom.xml .
RUN mvn dependency:resolve -q

# Copy source and build the jar
COPY src ./src
RUN mvn clean package -DskipTests -q

# ─────────────────────────────────────────────────────────────────
# Stage 2: Production — tiny JRE image (~200MB vs 500MB for full JDK)
# ─────────────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S javagroup && \
    adduser -S javauser -u 1001 -G javagroup

WORKDIR /app

# Copy the built jar from builder stage
COPY --from=builder /app/target/transaction-service-1.0.0.jar app.jar

RUN chown javauser:javagroup app.jar

USER javauser

EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -q --spider http://localhost:3003/api/transactions/health || exit 1

# JVM flags for containers:
# -XX:+UseContainerSupport = respect Docker memory limits
# -XX:MaxRAMPercentage=75  = use max 75% of container memory
CMD ["java", \
     "-XX:+UseContainerSupport", \
     "-XX:MaxRAMPercentage=75.0", \
     "-jar", "app.jar"]
