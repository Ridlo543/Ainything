# Load Testing Container for Ainything
# Uses Grafana K6 with Docker/Podman support

FROM grafana/k6:latest

# Set working directory
WORKDIR /tests

# Copy test script
COPY tests/load/ainything-load-test.js ./ainything-load-test.js

# Install additional tools if needed
# RUN apk add --no-cache curl

# Default command
CMD ["run", "ainything-load-test.js"]
