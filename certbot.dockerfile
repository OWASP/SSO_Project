FROM certbot/certbot

COPY nginx/certbot-entrypoint.sh /opt/certbot/custom-entrypoint.sh
ENTRYPOINT ["/opt/certbot/custom-entrypoint.sh"]