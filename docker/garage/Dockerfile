# syntax=docker/dockerfile:1
# The Garage image is distroless: it holds the binary and nothing else, not even
# a shell. The bootstrap needs one, so the binary is copied onto a base that has
# it rather than the sequence being rewritten as raw admin-API calls.
FROM dxflrs/garage:v2.3.0 AS garage

FROM alpine:3.22
COPY --from=garage /garage /usr/local/bin/garage
COPY init.sh /init.sh
ENTRYPOINT ["/bin/sh", "/init.sh"]
