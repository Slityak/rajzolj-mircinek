# Training toolchain for the sketch classifier (CPU only). Used via `make train`.
FROM python:3.12-slim
RUN pip install --no-cache-dir numpy torch --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple
WORKDIR /app
