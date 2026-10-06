# Image for unattended publishing: `md-term build --watch` next to a web server.
# Multi-arch (amd64/arm64): every dependency ships wheels for both.
FROM python:3.13-slim AS build
WORKDIR /src
COPY pyproject.toml README.md LICENSE ./
COPY src ./src
RUN pip install --no-cache-dir --prefix=/install .

FROM python:3.13-slim
COPY --from=build /install /usr/local
# An unprivileged user; the volumes it writes to must be writable by uid 1000.
RUN useradd --uid 1000 --create-home md-term
USER 1000
WORKDIR /work
ENV PYTHONUNBUFFERED=1 MD_TERM_CACHE=/tmp/md-term-cache
ENTRYPOINT ["md-term"]
CMD ["build", "--watch"]
