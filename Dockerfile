FROM node:16-slim


WORKDIR /usr/src/app

#ENV
ENV PORT=3001
ENV CONNECTION_STRING="mongodb://mongo:27017"
ENV ALLOWED_ORIGIN="http://localhost:3000"
ENV DATABASE="auac"
ENV HOSTNAME="Manny"

ENV ETHEREAL_EMAIL="dan10@ethereal.email"
ENV ETHEREAL_USERNAME="Dan Kub"
ENV ETHEREAL_PASSWORD="eFDRDSNcs4WAED1kBy"

ENV GMAIL_EMAIL="systems.ncr@deped.gov.ph"
ENV GMAIL_ID="709014817156-qi2eb56uag5hg6s82rb64rkd9iltk36f.apps.googleusercontent.com"
ENV GMAIL_REFRESH_TOKEN="1//041h67w_ixglXCgYIARAAGAQSNwF-L9IrPHBHcCamm2DShjAfETfo_L98Ss_hkgIJZPX-J1-Lp_hEp3k5Xc_1RtufCaK2I5DiwQw"
ENV GMAIL_SECRET="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"

ENV PUBLIC_VAPID_KEY="BOyiGkgEAMs738ocytuxBfKOQODLBe75x0xMnP3W3dQuVUZQJq3i12g00Sr-11g8LYtWZt0TKYaDNyjqeNx9YKo"
ENV PRIVATE_VAPID_KEY="b0bMY9mhRb8EQ6FAcqI1aPDgQiZNLFwIWYfC0p4c3MY"

ENV PUBLIC_FCM_KEY="BMeCW7wZuRTOdziO-owjJJgtewKzvE0sMns3IlwqomdaGowb8tNsrnFVZG-2-e27Cqnq6ufcRE6S6afl5zlkLJI"
ENV PRIVATE_FCM_KEY="l_yEmzhPqaz53IjnTDJkgkD63TyKRtDizgHuLQMluNc"

ENV DEVELOPMENT_LOG_LEVEL="verbose"
ENV PRODUCTION_LOG_LEVEL="warn"


COPY package.json ./

# Install dependencies
RUN npm i

# Copy src
COPY src ./src
COPY tsconfig.json ./tsconfig.json

# Build dist
RUN yarn build

# Expose and Run
EXPOSE 3000
CMD ["build/index.mjs"]