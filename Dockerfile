FROM binxio/gcp-get-secret

FROM metabase/metabase:v0.37.0.2

COPY --from=0 /gcp-get-secret /usr/local/bin/

WORKDIR /app

RUN sed -i '/^#!.*/a export MB_JETTY_PORT=${PORT}' run_metabase.sh

ENTRYPOINT ["/usr/local/bin/gcp-get-secret"]
CMD ["./run_metabase.sh"]
