FROM nginx:alpine

# remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# copy your project files
COPY . /usr/share/nginx/html

# fix port to 8080
RUN sed -i 's/listen       80;/listen       8080;/' /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
