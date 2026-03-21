FROM caddy:2-alpine
COPY frontend/Caddyfile /etc/caddy/Caddyfile
COPY frontend/ /srv/
EXPOSE 8080
