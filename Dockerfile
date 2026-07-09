# For reproducible builds, pin by digest in production, e.g.
# FROM python:3.12-slim@sha256:<digest>
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install the package (stdlib-only runtime; no external deps by default).
COPY pyproject.toml README.md ./
COPY touchstonecal/ touchstonecal/
RUN pip install --no-cache-dir .

# Drop root privileges.
RUN useradd --create-home --uid 10001 appuser
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=4).status == 200 else 1)"

CMD ["python", "-m", "touchstonecal", "serve", "--host", "0.0.0.0", "--port", "8080", "--refresh-seconds", "3600"]
