const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();


const connectionString =
    `postgres://${process.env.USERNAME}:${process.env.PASSWORD}@${process.env.HOST}:${process.env.DATABASEPORT}/${process.env.DATABASE}`;


console.log(connectionString);
const connection = {
    connectionString: process.env.DATABASE_URL ? process.env.DATABASE_URL : connectionString,
    ssl: { rejectUnauthorized: false }
}
const pool = new Pool(connection);

let store = {

    search :(search_term, user_location, radius_filter, maximum_results_to_return, category_filter, sort)=>{
        
        if(category_filter!='null'){
            queryString=`select 

            findnearbyplaces.location.name as location_name,
            findnearbyplaces.location.latitude,
            findnearbyplaces.location.longitude,
            findnearbyplaces.category.name as category_name,
            findnearbyplaces.photo.file,
            avg(cast (findnearbyplaces.review.rating as int))
            
            from findnearbyplaces.category 
            inner join findnearbyplaces.location 
            on findnearbyplaces.category.id = findnearbyplaces.location.category_id 
            full join findnearbyplaces.review 
            on findnearbyplaces.location.id = findnearbyplaces.review.location_id
            full join findnearbyplaces.place_photo   
            on findnearbyplaces.place_photo.location_id = findnearbyplaces.location.id
            full join findnearbyplaces.photo   
            on findnearbyplaces.place_photo.photo_id = findnearbyplaces.photo.id
            where findnearbyplaces.location.name like '%`+search_term+`%' or findnearbyplaces.category.name ='`+category_filter+`' 
            group by location_name, findnearbyplaces.location.latitude,
            findnearbyplaces.location.longitude,category_name,findnearbyplaces.photo.file 
            `
        }else{
            queryString=`select 

            findnearbyplaces.location.name as location_name,
            findnearbyplaces.location.latitude,
            findnearbyplaces.location.longitude,
            findnearbyplaces.category.name as category_name,
            findnearbyplaces.photo.file,
            avg(cast (findnearbyplaces.review.rating as int))
            
            from findnearbyplaces.category 
            inner join findnearbyplaces.location 
            on findnearbyplaces.category.id = findnearbyplaces.location.category_id 
            full join findnearbyplaces.review 
            on findnearbyplaces.location.id = findnearbyplaces.review.location_id
            full join findnearbyplaces.place_photo   
            on findnearbyplaces.place_photo.location_id = findnearbyplaces.location.id
            full join findnearbyplaces.photo   
            on findnearbyplaces.place_photo.photo_id = findnearbyplaces.photo.id
            where findnearbyplaces.location.name like '%`+search_term+`%' or findnearbyplaces.category.name like '%`+search_term+`%' 
            group by location_name, findnearbyplaces.location.latitude,
            findnearbyplaces.location.longitude,category_name,findnearbyplaces.photo.file 
            `
        }   
        console.log(queryString);
        return pool.query(queryString)
        .then(x=>{
            result = x.rows
            

            //user location will be in form of latitude:::longitude
             //saving distance for each location
            let user_latitiude = user_location.split(":::")[0];
            let user_longitude = user_location.split(":::")[1];
            for(let i=0;i<result.length;i++){
                x=result[i].longitude-user_longitude;
                y=result[i].latitude-user_latitiude;
                distance = Math.sqrt(x * x + y * y);
                result[i].distance=distance

            }
            
            //applying radius filter
            if(radius_filter!='null'){
                var filtered = result.filter(function(value, index, arr){ 
                    return value.distance <= radius_filter;
                });

                result =filtered;

            }

            
            
            //applying maximum result filter
            result = result.slice(0,maximum_results_to_return);
            
            //sorting
            if(sort!='null'){
                if(sort==0){
                    return result;
                }if(sort==1){
                     result.sort(function(a, b){return a.distance - b.distance});
                     return result;
                }if(sort==2){
                    result.sort(function(a, b){return b.rating - a.rating});
                     return result;
                }
            }
           
           
        })

    },
    addCustomer: (email, password) => {

        const hash = bcrypt.hashSync(password, 10);
        return pool.query('insert into findnearbyplaces.customer (email, password) values ($1 , $2)', [ email, hash]);



    },

    login: (email, password) => {
        return pool.query('select id, email, password from findnearbyplaces.customer where email = $1', [email])
            .then(x => {
                if (x.rows.length == 1) {
                    let valid = bcrypt.compareSync(password, x.rows[0].password);
                    if (valid) {
                        return { valid: true, user: {id: x.rows[0].id, username: x.rows[0].email } };
                    } else {
                        return { valid: false, message: 'Credentials are not valid.' }
                    }
                } else {
                    return { valid: false, message: 'Email not found.' }
                }
            });


    },

    addCategory: (name)=>{


        return pool.query('insert into findnearbyplaces.category (name) values ($1)',[name]);

    },

    getCategoryId: (name)=>{
        return pool.query('select id from findnearbyplaces.category where name = $1',[name]);
    },

    addPlace: (name, category_id, latitude, longitude, description, customer_id)=>{
        return pool.query('insert into findnearbyplaces.location (name,category_id, latitude, longitude, description, customer_id) values ($1,$2,$3,$4,$5,$6)',[name,category_id, latitude, longitude, description, customer_id]);
    },

    updatePlace: (id, name, category_id, latitude, longitude, description,user_id) => {
        let queryString="update findnearbyplaces.location set ";
        let array = [id, name, category_id, latitude, longitude, description,user_id];
        for(let i =0;i<array.length;i++){
            if(array[i]!=undefined){
                queryString+=array[i]
                if(i<array.length-1){
                    queryString+=',';
                }
            }
            

        }
        queryString+='where '+id+ " and "+ user_id;
        return pool.query(queryString); 

    },

    deletePlace : (place_id,user_id) =>{
        return pool.query ('delete from findnearbyplaces.location where id=$1 and customer_id =$2',[place_id,user_id])

    },

    getPlaceId: (name)=>{
        return pool.query('select id from findnearbyplaces.location where name = $1',[name]);
    },

    addReview: (location_id,text,rating,customer_id)=>{
        return pool.query('insert into findnearbyplaces.review (location_id,text,rating,customer_id) values ($1,$2,$3,$4)',[location_id,text,rating,customer_id]);

    },

    deleteReview : (review_id,user_id) =>{
        return pool.query ('delete from findnearbyplaces.review where id=$1 and customer_id =$2',[review_id,user_id])

    },
    getReviewId: (location_id,text,rating,customer_id)=>{
        return pool.query('select id from findnearbyplaces.review where location_id = $1 and text= $2 and rating = $3 and customer_id = $4',[location_id,text,rating,customer_id]);
    },
    updateReview: (id, text, rating ,user_id) => {
        let queryString="update findnearbyplaces.review set ";
        let array = [ id, text, rating ,user_id];
        for(let i =0;i<array.length;i++){
            if(array[i]!=undefined){
                queryString+=array[i]
                if(i<array.length-1){
                    queryString+=',';
                }
            }
        }
        queryString+='where '+id+ " and "+ user_id;
        return pool.query(queryString); 

    },

    addPhoto: (photo, place_id, review_id)=>{
        return pool.query('insert into findnearbyplaces.photo (file) values ($1)',[photo])
        .then(x=>{
            return pool.query('select id from findnearbyplaces.photo where file= $1',[photo])})
        .then(x=>{
            if(place_id){
                return pool.query('insert into findnearbyplaces.place_photo (location_id,photo_id) values ($1,$2)',[place_id,x.rows[0].id])
            }if(review_id){
                return pool.query('insert into findnearbyplaces.review_photo (review_id,photo_id) values ($1,$2)',[review_id,x.rows[0].id])
            }
        })
    },
    updatePhoto: (id, file) => {
        let queryString="update findnearbyplaces.photo set "+file;
        queryString+='where '+id;
        console.log(queryString);
        return pool.query(queryString); 

    },

    deletePhoto : (photo_id) =>{
        return pool.query ('delete from findnearbyplaces.photo where id=$1',[photo_id])

    },

    getPhotoId: (photo)=>{

        return pool.query('select id from findnearbyplaces.photo where file= $1',[photo]);

    }




}

module.exports = { store };