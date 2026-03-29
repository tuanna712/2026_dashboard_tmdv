FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Internal container port; map host port 3894 → 80 in docker-compose.yaml.
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
