# ─────────────────────────────────────────────────────────────────
# Dockerfile for NeoBank Account Service (Python + FastAPI)
# ─────────────────────────────────────────────────────────────────
#
# Two-stage build — same concept as the Node.js service:
#   Stage 1: Install dependencies
#   Stage 2: Copy only what's needed into a clean image
#
# python:3.12-slim is a minimal Python image (~130MB vs ~1GB for full)
# ─────────────────────────────────────────────────────────────────

FROM python:3.12-slim AS builder

WORKDIR /app

# Install dependencies first (cached layer — rebuilds only if requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ─────────────────────────────────────────────────────────────────
# Production stage
# ─────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS production

# Create non-root user for security
RUN useradd -m -u 1001 appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application source
COPY app/ ./app/

# Set ownership
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3002/api/accounts/health')"

# Start with uvicorn — Python's production ASGI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3002"]
