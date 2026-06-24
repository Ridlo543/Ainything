# Load Testing Container for Lingua
# Uses Grafana K6 with Docker/Podman support

FROM grafana/k6:latest

# Set working directory
WORKDIR /tests

# Copy test script
COPY tests/load/lingua-load-test.js ./lingua-load-test.js

# Install additional tools if needed
# RUN apk add --no-cache curl

# Default command
CMD ["run", "lingua-load-test.js"]
