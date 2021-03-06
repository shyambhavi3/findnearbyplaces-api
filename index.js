const express = require('express');
const { store } = require('./data_access/store');
const app = express();
const port = process.env.PORT || 4000;
const cors = require('cors');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var session = require('express-session');
var SQLiteStore = require('connect-sqlite3')(session);
const fileUpload = require('express-fileupload');


//middleware
app.use(cors({
    origin: " https://shyambhavi3.github.io",
    credentials: true
  }));
app.use(express.json());
app.use(fileUpload());

app.use((request, response, next) => {
    console.log(`request url: ${request.url}`);
    console.log(`request method: ${request.method}`);
    //only for development. Remove this line when you deploy your final version.
    console.log(`request body: ${request.body}`);
    next();
})

passport.use(new LocalStrategy({ usernameField: 'email' }, function verify(username, password, cb) {
    store.login(username, password)
        .then(x => {

            if (x.valid) {
                return cb(null, x.user);
            } else {
                return cb(null, false, { message: 'Incorrect username or password.' });

            }


        })
        .catch(e => {
            console.log(e);
            cb('Something went wrong');
        })



}));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStore({ db: 'sessions.db', dir: './sessions' })
}));
app.use(passport.authenticate('session'));

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, { id: user.id, username: user.username });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/login/succeeded',
    failureRedirect: '/login/failed'
}));

app.get('/login/succeeded', (request, response) => {
    response.status(200).json({ done: true, message: 'The customer logged in successfully!' });
});

app.get('/login/failed', (request, response) => {
    response.status(401).json({ done: false, message: 'Credentials not valid.' });
});

app.post('/logout', function (request, response) {
    request.logout();
    response.json({ done: true, message: 'The customer signed out successfully.' });
  });

app.post('/register', (req, res) => {

    let email = req.body.email;
    let password = req.body.password;


    store.addCustomer(email, password)
        .then(x => res.status(200).json({ done: true, message: 'The customer was added successfully!' }))
        .catch(e => {
            console.log(e);
            res.status(500).json({ done: false, message: 'The email already exists.' });
        });





})

app.get('/search/:search_term/:user_location/:radius_filter/:maximum_results_to_return/:category_filter/:sortby', (req,res)=>{
    let search_term = req.params.search_term;
    let user_location=req.params.user_location;
    let radius_filter=req.params.radius_filter;
    let maximum_results_to_return=req.params.maximum_results_to_return;
    let category_filter=req.params.category_filter;
    let sortby = req.params.sortby;
    console.log(search_term,user_location,radius_filter, maximum_results_to_return, category_filter, sortby);

    store.search(search_term,user_location, radius_filter, maximum_results_to_return, category_filter, sortby)
    .then(x=>{
        
        res.status(200).json({ done: true, result: x});
    })
    .catch(e => {
        console.log(e);
        res.status(500).json({ done: false, result: 'Something went wrong' });
    });





})

app.get('/review/:id', (req,res)=>{
    let location_id = req.params.id;

    store.getReview(location_id)
    .then(x=>{
        
        res.status(200).json({ done: true, result: x.rows});
    })
    .catch(e => {
        console.log(e);
        res.status(500).json({ done: false, result: 'Something went wrong' });
    });
})

app.get('/image/:id', (request, response) =>{
    
    let imageId = request.params.id;
    
    store.getPhotobyId(imageId)
      .then(data => {
        response.set('Cache-Control', 'no-cache');
        response.contentType('image/jpg');
        response.send(data.rows[0].file);
      })
      .catch(e => response.status(404).json({ error: `Image ${imageId} was not found.` }));
  }) 

app.get('/category/',(req,res)=>{
    store.getCategory()
    .then(x=>{
        res.status(200).json({ done: true, category: x.rows})


    })
    .catch(e => {
        console.log(e);
        res.status(500).json({ done: false, message: 'Something went wrong' });
    });
})

app.post('/category', (req, res) => {
    let name = req.body.name;

    store.addCategory(name)
        .then(x => {
            store.getCategoryId(name)
                .then(x => {

                    res.status(200).json({ done: true, id: x.rows[0].id, message: 'The category was added successfully!' })

                })
        })
        .catch(e => {
            console.log(e);
            res.status(500).json({ done: false, message: 'The category already exists.' });
        });
})



app.post('/place', (req, res) => {

    if (!req.isAuthenticated()) {
        res.status(401).json({ done: false, message: 'Please sign in first.' });
        return;
    }


    let name = req.body.name;
    let category_id = req.body.category_id;
    let latitude = req.body.latitude;
    let longitude = req.body.longitude;
    let description = req.body.description;
    let id = req.user.id;

    

    store.addPlace(name, category_id, latitude, longitude, description, id)
        .then(x => {
            store.getPlaceId(name)
                .then(x => {

                    res.status(200).json({ done: true, id: x.rows[0].id, message: 'The place was added successfully!' })

                })
        })
        .catch(e => {
            console.log(e);
            res.status(500).json({ done: false, message: 'Something went wrong' });
        });
})

app.put('/place', (req, res) => {

    if (!req.isAuthenticated()) {
        res.status(401).json({ done: false, message: 'Please sign in first.' });
        return;
    }

    let id =req.body.place_id? "id = '"+req.body.place_id + "'" : undefined;
    let name = req.body.name? "name = '"+req.body.name+ "'": undefined;
    let category_id =req.body.category_id? "category_id = '"+req.body.category_id+ "'": undefined;
    let latitude = req.body.latitude?"latitude = '"+req.body.latitude+ "'": undefined;
    let longitude = req.body.longitude?"longitude = '"+req.body.longitude+ "'":undefined;
    let description = req.body.description?"description = '"+req.body.description+ "'": undefined;
    let user_id =req.user.id?"customer_id = '"+ req.user.id+ "'":undefined;

    store.updatePlace(id, name, category_id, latitude, longitude, description,user_id)
        .then(x => {
            if(x.rowCount==0){
                res.status(200).json({ done: false, message: 'You must be the customer who added the place in order to update it' })
            }
            else{
                store.getPhotoIdbylocation(id)
                .then(x=>{
                    res.status(200).json({ done: true, photo_id: x.rows[0].photo_id, message: 'The place was updated successfully!' })

                })
            }

            


        })
        .catch(e => {
            console.log(e);
            res.status(500).json({ done: false, message: 'Something went wrong' });
        });
})

app.delete('/place/:place_id', (req,res)=>{

    if (!req.isAuthenticated()) {
        res.status(401).json({ done: false, message: 'Please sign in first.' });
        return;
    }

    let place_id = req.params.place_id;
    let user_id =req.user.id;

    store.deletePlace(place_id,user_id)
    .then(x=> {
        if(x.rowCount==0){
            res.status(200).json({ done: false, message: 'You must be the customer who added the place in order to delete it' })
        }else{
            res.status(200).json({ done: true, message: 'The place was deleted successfully!' })

        }
        
    })
    .catch(e => {
        console.log(e);
        res.status(500).json({ done: false, message: 'Something went wrong' });
    });



})
app.post('/review', (req, res) => {

    if (!req.isAuthenticated()) {
        res.status(401).json({ done: false, message: 'Please sign in first.' });
        return;
    }

    let location_id = req.body.place_id;
    let text = req.body.comment;
    let rating = req.body.rating;
    let customer_id = req.user.id;

    store.addReview(location_id, text, rating, customer_id)
        .then(x => {
            store.getReviewId(location_id, text, rating, customer_id)
                .then(x => {

                    res.status(200).json({ done: true, id: x.rows[0].id, message: 'The review was added successfully!' })

                })
        })
        .catch(e => {
            console.log(e);
            res.status(500).json({ done: false, message: 'Something went wrong' });
        });



})

app.put('/review', (req, res) => {

    if (!req.isAuthenticated()) {
        res.status(401).json({ done: false, message: 'Please sign in first.' });
        return;
    }

    let id =req.body.review_id? "id = '"+req.body.review_id + "'" : undefined;
    let text = req.body.comment? "text = '"+req.body.comment+ "'": undefined;
    let rating =req.body.rating? "rating = '"+req.body.rating+ "'": undefined;
    let user_id =req.user.id?"customer_id = '"+ req.user.id+ "'":undefined;

    store.updateReview(id, text, rating ,user_id)
        .then(x => {
            
            if(x.rowCount==0){
                res.status(200).json({ done: false, message: 'You must be the customer who added the review in order to update it' })
            }
            else{
                res.status(200).json({ done: true, message: 'The place was updated successfully!' })
            }

            


        })
        .catch(e => {
            console.log(e);
            res.status(500).json({ done: false, message: 'Something went wrong' });
        });
})

app.delete('/review/:review_id', (req,res)=>{

    if (!req.isAuthenticated()) {
        res.status(401).json({ done: false, message: 'Please sign in first.' });
        return;
    }

    let review_id = req.params.review_id;
    let user_id =req.user.id;

    store.deleteReview(review_id,user_id)
    .then(x=> {
        if(x.rowCount==0){
            res.status(200).json({ done: false, message: 'You must be the customer who added the place in order to delete it' })
        }else{
            res.status(200).json({ done: true, message: 'The place was deleted successfully!' })

        }
        
    })
    .catch(e => {
        console.log(e);
        res.status(500).json({ done: false, message: 'Something went wrong' });
    });
})

app.post('/photo', (req, res) => {

    let photo = req.files.file.data; 
    let place_id = req.body.place_id;
    let review_id = req.body.review_id;

    console.log(photo);

    store.addPhoto(photo, place_id, review_id)
        .then(x => {
            store.getPhotoId(photo)
                .then(x => {

                    res.status(200).json({ done: true, id: x.rows[0].id, message: 'The photo was added successfully!' })

                })
        })
        .catch(e => {
            console.log(e);
            res.status(500).json({ done: false, message: 'Something went wrong' });
        });

})

app.put('/photo', (req, res) => {

    if (!req.isAuthenticated()) {
        res.status(401).json({ done: false, message: 'Please sign in first.' });
        return;
    }

    let id =req.body.photo_id;
    let file = req.files.file.data;

    store.updatePhoto(id, file)
        .then(x => {
                 
                res.status(200).json({ done: true, message: 'The photo was updated successfully!' })
        })
        .catch(e => {
            console.log(e);
            res.status(500).json({ done: false, message: 'Something went wrong' });
        });
})

app.delete('/photo/:photo_id', (req,res)=>{

    let photo_id = req.params.photo_id;

    store.deletePhoto(photo_id)
    .then(x=> {

            res.status(200).json({ done: true, message: 'The photo was deleted successfully!' })
        
    })
    .catch(e => {
        console.log(e);
        res.status(500).json({ done: false, message: 'Something went wrong' });
    });
})



app.get('/', (req, res) => {
    res.status(200).json({ done: true, message: 'Welcome' })
})
app.listen(port, () => {
    console.log('server has started');
})