CREATE SCHEMA IF NOT EXISTS findnearbyplaces;

create table findnearbyplaces.category
(
id bigserial primary key,
name varchar(30) not null
);

create table findnearbyplaces.customer
(
   id bigserial primary key,
   email varchar(256) not null unique,
   password varchar(8) not null   
);


create table findnearbyplaces.location
(
   id bigserial primary key,
   name varchar(256) not null,
   latitude varchar(8),
   longitude varchar(8),
   description varchar(512),
   category_id int references findnearbyplaces.category(id),
   customer_id int references findnearbyplaces.customer(id)
);

create table findnearbyplaces.photo
(
id bigserial primary key,
file bytea

);

create table findnearbyplaces.review
(

location_id int references findnearbyplaces.location(id),
customer_id int references findnearbyplaces.customer(id),
id bigserial primary key,
text varchar(512),
rating varchar(1)

);

create table findnearbyplaces.place_photo
(
location_id int references findnearbyplaces.location(id),
photo_id int references findnearbyplaces.photo(id)
);

create table findnearbyplaces.review_photo
(
review_id int references findnearbyplaces.review(id),
photo_id int references findnearbyplaces.photo(id)
);