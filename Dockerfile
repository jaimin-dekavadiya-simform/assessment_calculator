FROM nginx:1.30-alpine

# Serve the static app from nginx's default document root.
COPY index.html /usr/share/nginx/html/
COPY styles/ /usr/share/nginx/html/styles/
COPY src/ /usr/share/nginx/html/src/

EXPOSE 80

HEALTHCHECK --interval=10s --start-period=5s --timeout=3s --retries=3 CMD wget -q --spider http://localhost/ || exit 1
